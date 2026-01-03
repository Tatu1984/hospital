# Lab and Radiology Billing Integration Guide

## Overview

This guide explains the automatic billing integration for Lab and Radiology orders in the Hospital ERP system. When a lab or radiology order is created, the system automatically handles billing based on whether the patient is OPD or IPD.

## Features Implemented

### 1. Automatic Billing for Lab Orders
- When a lab order is created, charges are automatically calculated from `LabTestMaster`
- For **OPD patients**: Creates or updates a draft invoice
- For **IPD patients**: Charges are accumulated and linked to the admission (no invoice created until discharge)

### 2. Automatic Billing for Radiology Orders
- When a radiology order is created, charges are automatically calculated from `RadiologyTestMaster`
- For **OPD patients**: Creates or updates a draft invoice
- For **IPD patients**: Charges are accumulated and linked to the admission

### 3. Billing Status Tracking
Orders now include the following billing-related fields:
- `billingStatus`: 'unbilled', 'billed', or 'paid'
- `invoiceId`: Reference to the invoice (if created)
- `chargeAmount`: Total charge amount for the order
- `admissionId`: Reference to admission (for IPD patients)

## Database Schema Changes

### Order Model Updates

```prisma
model Order {
  id            String     @id @default(uuid())
  patientId     String
  encounterId   String?
  admissionId   String?     // NEW: Link to admission for IPD
  orderType     String
  orderedBy     String
  orderedAt     DateTime   @default(now())
  status        String     @default("pending")
  details       Json
  priority      String     @default("routine")
  billingStatus String     @default("unbilled") // NEW: unbilled, billed, paid
  invoiceId     String?    // NEW: Link to invoice
  chargeAmount  Decimal?   @db.Decimal(10, 2) // NEW: Charge amount
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  // ... relations
}
```

## API Endpoints

### Modified Endpoints

#### 1. POST /api/lab-orders
**Already Updated** - Now includes automatic billing

Request body now accepts optional `admissionId`:
```json
{
  "patientId": "uuid",
  "encounterId": "uuid",
  "admissionId": "uuid", // Optional
  "tests": [
    {
      "testId": "uuid",
      "priority": "ROUTINE",
      "notes": "Optional notes"
    }
  ]
}
```

Response includes billing information:
```json
{
  "id": "order-uuid",
  "billingStatus": "billed",
  "chargeAmount": 1500.00,
  "invoiceId": "invoice-uuid",
  // ... other order fields
}
```

#### 2. POST /api/radiology-orders
**Needs Update** - Use the patch from `src/routes/orders-patch.ts`

To apply the radiology billing integration:

1. Import the handler in `server.ts`:
```typescript
import { createRadiologyOrderWithBilling } from './routes/orders-patch';
```

2. Replace the existing endpoint:
```typescript
// Replace this:
app.post('/api/radiology-orders', authenticateToken, validateBody(createRadiologyOrderSchema), async (req, res) => { ... });

// With this:
app.post('/api/radiology-orders', authenticateToken, validateBody(createRadiologyOrderSchema), createRadiologyOrderWithBilling);
```

### New Endpoints

#### 1. GET /api/billing/patient/:patientId/pending
Get all pending (unbilled) charges for a patient

**Response:**
```json
{
  "patientId": "uuid",
  "labOrders": [
    {
      "orderId": "uuid",
      "orderType": "lab",
      "testName": "CBC, Lipid Profile",
      "chargeAmount": 800.00,
      "orderedAt": "2024-01-15T10:30:00Z",
      "priority": "routine",
      "status": "pending"
    }
  ],
  "radiologyOrders": [
    {
      "orderId": "uuid",
      "orderType": "radiology",
      "testName": "Chest X-Ray",
      "chargeAmount": 500.00,
      "orderedAt": "2024-01-15T11:00:00Z",
      "priority": "routine",
      "status": "pending"
    }
  ],
  "totalPending": 1300.00,
  "summary": {
    "totalLabCharges": 800.00,
    "totalRadiologyCharges": 500.00,
    "totalPending": 1300.00
  }
}
```

#### 2. GET /api/billing/admission/:admissionId/pending
Get all pending charges for an IPD admission

**Response:** Similar to patient pending charges, but filtered by admission

#### 3. POST /api/billing/generate-invoice
Generate an invoice from selected pending charges

**Request:**
```json
{
  "patientId": "uuid",
  "orderIds": ["order-uuid-1", "order-uuid-2"],
  "encounterId": "uuid", // Optional
  "admissionId": "uuid", // Optional - for IPD
  "discountPercent": 10  // Optional, default 0
}
```

**Response:**
```json
{
  "message": "Invoice generated successfully",
  "invoice": {
    "id": "invoice-uuid",
    "patientId": "uuid",
    "type": "opd",
    "items": [
      {
        "description": "Lab Test: CBC",
        "code": "LAB001",
        "quantity": 1,
        "unitPrice": 400.00,
        "amount": 400.00
      }
    ],
    "subtotal": 1300.00,
    "discount": 130.00,
    "total": 1170.00,
    "balance": 1170.00,
    "status": "final"
  }
}
```

#### 4. GET /api/billing/orders/:orderId/billing-status
Get billing status for a specific order

**Response:**
```json
{
  "order": {
    "id": "uuid",
    "orderType": "lab",
    "billingStatus": "billed",
    "chargeAmount": 800.00,
    "invoiceId": "invoice-uuid",
    "patient": {
      "name": "John Doe",
      "mrn": "MRN001"
    }
  },
  "invoice": {
    "id": "invoice-uuid",
    "type": "opd",
    "total": 1300.00,
    "paid": 0.00,
    "balance": 1300.00,
    "status": "final"
  }
}
```

## Workflow

### OPD Workflow

1. **Order Creation**
   - Doctor creates lab/radiology order
   - System calculates charges from master data
   - Draft invoice is created or updated automatically
   - Order is marked as 'billed'

2. **Payment Collection**
   - Billing staff can view pending charges via GET `/api/billing/patient/:patientId/pending`
   - Can generate final invoice using POST `/api/billing/generate-invoice`
   - Can collect payment via existing payment endpoints
   - Orders are marked as 'paid' when invoice is fully paid

### IPD Workflow

1. **Order Creation During Admission**
   - Doctor creates lab/radiology orders during patient's stay
   - System links orders to admission
   - Charges are accumulated but no invoice is created
   - Order remains 'unbilled'

2. **Discharge/Billing**
   - At discharge or on-demand, billing staff retrieves all charges
   - Use GET `/api/billing/admission/:admissionId/pending` to see all unbilled orders
   - Generate consolidated invoice using POST `/api/billing/generate-invoice`
   - Include all accumulated charges (ward, procedures, lab, radiology, etc.)
   - Collect payment before discharge

## Service Module

The billing logic is centralized in `src/services/billing.ts`:

### Key Functions

- `createLabOrderBilling()` - Creates billing for lab orders
- `createRadiologyOrderBilling()` - Creates billing for radiology orders
- `getPendingCharges()` - Gets unbilled OPD charges
- `getIPDPendingCharges()` - Gets unbilled IPD charges
- `generateInvoiceFromCharges()` - Generates invoice from orders
- `markOrdersAsPaid()` - Marks orders as paid (called when invoice is paid)

## Migration Steps

### 1. Run Prisma Migration

```bash
cd /Users/sudipto/Desktop/projects/hospitalerp/backend
npx prisma migrate dev --name add_billing_to_orders
```

This will:
- Add `billingStatus`, `invoiceId`, `chargeAmount`, and `admissionId` fields to Order model
- Create migration files in `prisma/migrations/`

### 2. Update Server Configuration

In `src/server.ts`, add the billing routes:

```typescript
import billingRoutes from './routes/billing';

// Add after other route registrations
app.use('/api/billing', billingRoutes);
```

### 3. Apply Radiology Order Patch

Follow the instructions in `src/routes/orders-patch.ts` to update the radiology order endpoint.

### 4. Update Invoice Payment Handler

When an invoice is paid in full, mark the associated orders as paid:

```typescript
import { markOrdersAsPaid } from './services/billing';

// In your invoice payment handler, after updating invoice status:
if (newBalance <= 0) {
  await markOrdersAsPaid(invoiceId);
}
```

## Testing

### Test OPD Billing
1. Create a patient
2. Create an encounter
3. Create lab order with tests
4. Verify draft invoice is created
5. Get pending charges: GET `/api/billing/patient/:patientId/pending`
6. Generate invoice: POST `/api/billing/generate-invoice`
7. Process payment

### Test IPD Billing
1. Admit a patient
2. Create multiple lab/radiology orders during stay
3. Verify no invoices are created
4. Get IPD pending charges: GET `/api/billing/admission/:admissionId/pending`
5. At discharge, generate consolidated invoice
6. Process payment

## Permissions

The following permissions are required:
- `billing:view` - View pending charges and billing status
- `billing:create` - Generate invoices
- `billing:payment` - Process payments

## Notes

- Draft invoices can be updated multiple times before being finalized
- IPD charges accumulate throughout the stay
- All prices are fetched from master data tables (LabTestMaster, RadiologyTestMaster)
- Discounts can be applied when generating invoices
- The system prevents double billing by tracking order billing status

## Future Enhancements

1. Add bulk invoice generation for multiple patients
2. Support for modifying charges before invoicing
3. Integration with insurance/TPA systems
4. Automated reminders for unpaid invoices
5. Reporting on billing efficiency and revenue
