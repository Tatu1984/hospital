# Billing Integration Implementation Summary

## Overview

Successfully implemented automatic billing integration for Lab and Radiology orders in the Hospital ERP system. The implementation handles both OPD and IPD patients with appropriate billing workflows.

## What Was Implemented

### 1. Database Schema Changes

**File**: `/Users/sudipto/Desktop/projects/hospitalerp/backend/prisma/schema.prisma`

Added to `Order` model:
- `admissionId` - Links orders to IPD admissions
- `billingStatus` - Tracks billing state ('unbilled', 'billed', 'paid')
- `invoiceId` - Links orders to invoices
- `chargeAmount` - Stores the charge amount from test prices

### 2. Billing Service Module

**File**: `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/services/billing.ts`

Core functions:
- `createLabOrderBilling()` - Auto-creates billing for lab orders
- `createRadiologyOrderBilling()` - Auto-creates billing for radiology orders
- `getPendingCharges()` - Retrieves unbilled OPD charges for a patient
- `getIPDPendingCharges()` - Retrieves unbilled IPD charges for an admission
- `generateInvoiceFromCharges()` - Generates invoice from selected orders
- `markOrdersAsPaid()` - Updates order status when invoice is paid

### 3. API Endpoints

**File**: `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/routes/billing.ts`

New routes:
- `GET /api/billing/patient/:patientId/pending` - Get pending OPD charges
- `GET /api/billing/admission/:admissionId/pending` - Get pending IPD charges
- `POST /api/billing/generate-invoice` - Generate invoice from pending charges
- `GET /api/billing/orders/:orderId/billing-status` - Get billing status for an order

### 4. Modified Endpoints

**Lab Orders** - `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/server.ts`
- `POST /api/lab-orders` - Updated to include automatic billing
- Now detects OPD vs IPD and handles billing accordingly
- Creates/updates draft invoices for OPD patients
- Accumulates charges for IPD patients

**Radiology Orders** - `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/routes/orders-patch.ts`
- Created patch file with billing integration
- Needs to be manually applied in server.ts (see instructions in file)
- Same logic as lab orders

### 5. Validators Updated

**File**: `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/validators/index.ts`

Updated schemas:
- `createLabOrderSchema` - Added optional `admissionId` field
- `createRadiologyOrderSchema` - Added optional `admissionId` field, changed to support multiple tests

### 6. Route Permissions

**File**: `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/routes/index.ts`

Added permissions:
- `GET /api/billing/patient/:patientId/pending` - requires `billing:view`
- `GET /api/billing/admission/:admissionId/pending` - requires `billing:view`
- `POST /api/billing/generate-invoice` - requires `billing:create`
- `GET /api/billing/orders/:orderId/billing-status` - requires `billing:view`

## Key Features

### OPD Workflow
1. Order created → Charges calculated from master data
2. Draft invoice created/updated automatically
3. Order marked as 'billed'
4. Payment collected → Order marked as 'paid'

### IPD Workflow
1. Order created during admission → Charges calculated
2. Order linked to admission (no invoice yet)
3. Order remains 'unbilled'
4. At discharge: All charges retrieved, consolidated invoice generated
5. Payment collected → Orders marked as 'paid'

### Automatic Features
- Prices fetched from `LabTestMaster` and `RadiologyTestMaster`
- Draft invoices auto-created for OPD patients
- Multiple orders can be added to the same draft invoice
- IPD charges accumulate without creating invoices
- Supports discounts when generating invoices
- Prevents double billing via status tracking

## Files Created

1. `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/services/billing.ts` - Core billing logic
2. `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/routes/billing.ts` - Billing API routes
3. `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/routes/orders-patch.ts` - Radiology order patch
4. `/Users/sudipto/Desktop/projects/hospitalerp/backend/BILLING_INTEGRATION_GUIDE.md` - Complete guide
5. `/Users/sudipto/Desktop/projects/hospitalerp/backend/MIGRATION_INSTRUCTIONS.md` - Migration steps
6. `/Users/sudipto/Desktop/projects/hospitalerp/backend/BILLING_INTEGRATION_SUMMARY.md` - This file

## Files Modified

1. `/Users/sudipto/Desktop/projects/hospitalerp/backend/prisma/schema.prisma` - Added billing fields to Order model
2. `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/server.ts` - Updated lab order endpoint
3. `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/validators/index.ts` - Updated order validators
4. `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/routes/index.ts` - Added route permissions

## Next Steps (Manual Actions Required)

### 1. Apply Database Migration

**IMPORTANT**: There are pending migrations that must be applied first.

```bash
cd /Users/sudipto/Desktop/projects/hospitalerp/backend

# Apply pending migrations
npx prisma migrate deploy

# Then create and apply billing migration
npx prisma migrate dev --name add_billing_to_orders
```

See `MIGRATION_INSTRUCTIONS.md` for detailed steps.

### 2. Register Billing Routes

Add to `server.ts` (after other route imports):

```typescript
import billingRoutes from './routes/billing';

// Add after other route registrations
app.use('/api/billing', billingRoutes);
```

### 3. Apply Radiology Order Patch

Follow instructions in `src/routes/orders-patch.ts`:

```typescript
import { createRadiologyOrderWithBilling } from './routes/orders-patch';

// Replace existing endpoint with:
app.post('/api/radiology-orders',
  authenticateToken,
  validateBody(createRadiologyOrderSchema),
  createRadiologyOrderWithBilling
);
```

### 4. Update Invoice Payment Handler

When an invoice is fully paid, update associated orders:

```typescript
import { markOrdersAsPaid } from './services/billing';

// In your payment handler:
if (newBalance <= 0) {
  await markOrdersAsPaid(invoiceId);
}
```

### 5. Test the Integration

Follow testing procedures in `BILLING_INTEGRATION_GUIDE.md`:
- Test OPD order billing
- Test IPD order billing
- Test pending charges retrieval
- Test invoice generation
- Test payment flow

## API Usage Examples

### Get Pending Charges for OPD Patient
```bash
GET /api/billing/patient/patient-uuid/pending
```

### Get Pending Charges for IPD Patient
```bash
GET /api/billing/admission/admission-uuid/pending
```

### Generate Invoice from Pending Charges
```bash
POST /api/billing/generate-invoice
Content-Type: application/json

{
  "patientId": "patient-uuid",
  "orderIds": ["order-uuid-1", "order-uuid-2"],
  "discountPercent": 10
}
```

### Check Billing Status of an Order
```bash
GET /api/billing/orders/order-uuid/billing-status
```

## Architecture Decisions

1. **Service Layer Pattern**: Billing logic separated into service module for reusability
2. **Automatic vs Manual**: OPD invoices auto-created (draft), IPD requires manual generation at discharge
3. **Draft Invoices**: OPD patients get draft invoices that can be updated until payment
4. **Status Tracking**: Three-state billing status prevents double billing
5. **Master Data Integration**: Prices always fetched from master tables, ensuring consistency
6. **Flexible Discounts**: Discounts applied at invoice generation time, not at order creation

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] Billing routes registered in server.ts
- [ ] Radiology order patch applied
- [ ] Lab order creates draft invoice for OPD patient
- [ ] Radiology order creates draft invoice for OPD patient
- [ ] Lab order links to admission for IPD patient (no invoice)
- [ ] Radiology order links to admission for IPD patient (no invoice)
- [ ] Pending charges API returns correct data
- [ ] Invoice generation creates proper invoice with all items
- [ ] Discounts apply correctly
- [ ] Orders marked as paid when invoice is paid
- [ ] Cannot invoice the same order twice

## Troubleshooting

See `MIGRATION_INSTRUCTIONS.md` for common issues and solutions.

## Documentation

- **Complete Guide**: `BILLING_INTEGRATION_GUIDE.md`
- **Migration Steps**: `MIGRATION_INSTRUCTIONS.md`
- **This Summary**: `BILLING_INTEGRATION_SUMMARY.md`
- **Code Comments**: All new files have inline documentation

## Support

For questions or issues:
1. Check the integration guide
2. Review code comments in service and route files
3. Verify migration was applied correctly
4. Check route registrations in server.ts
