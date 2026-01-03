# IPD Charge Capture Implementation

## Overview
This implementation provides an automated charge capture system for IPD (In-Patient Department) admissions in the Hospital ERP. It automatically tracks and captures daily charges including bed charges, nursing charges, and charges from various orders (lab, radiology, pharmacy, procedures).

## Components Implemented

### 1. Database Schema

#### IPDCharge Model
Location: `/prisma/schema.prisma`

```prisma
model IPDCharge {
  id            String   @id @default(uuid())
  tenantId      String
  admissionId   String
  category      String   // bed, nursing, procedure, lab, radiology, pharmacy, consumable, consultation, other
  description   String
  quantity      Int      @default(1)
  unitPrice     Decimal  @db.Decimal(10, 2)
  amount        Decimal  @db.Decimal(10, 2)
  chargeDate    DateTime @default(now())
  orderId       String?  // Link to Order if charge is from an order
  capturedBy    String?  // User who captured/added this charge
  isAutomatic   Boolean  @default(false) // true if auto-captured, false if manually added
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  admission     Admission @relation(fields: [admissionId], references: [id])

  @@index([admissionId])
  @@index([category])
  @@index([chargeDate])
  @@map("ipd_charges")
}
```

The Admission model was also updated to include the relation:
```prisma
model Admission {
  // ... existing fields
  ipdCharges           IPDCharge[]
}
```

### 2. IPD Charge Capture Service

Location: `/src/services/ipdChargeCapture.ts`

This service provides the core business logic for automatic charge capture. Key features:

#### Service Methods:

1. **captureChargesForAdmission(admissionId, tenantId, userId)**
   - Captures all charges for a specific admission
   - Automatically calculates bed charges for each day
   - Captures nursing charges daily
   - Captures charges from orders (lab, radiology, pharmacy, procedures)
   - Avoids duplicate charges by checking existing records
   - Returns captured charges and any errors

2. **captureChargesForAllActiveAdmissions(tenantId, userId)**
   - Batch processes all active admissions
   - Useful for scheduled daily charge capture
   - Returns summary with total admissions and charges captured

3. **getChargesByAdmission(admissionId)**
   - Retrieves all charges for an admission
   - Groups charges by category
   - Provides summary with totals and subtotals

4. **addManualCharge(tenantId, admissionId, category, description, quantity, unitPrice, chargeDate, userId)**
   - Allows manual addition of miscellaneous charges
   - Validates category
   - Marks charge as manually added (isAutomatic = false)

5. **getBillingSummary(admissionId)**
   - Comprehensive billing summary for an admission
   - Includes patient details, admission info, all charges, existing invoice
   - Insurance information if applicable
   - Totals by category and grand totals

#### Charge Categories:
- **bed**: Daily bed charges based on ward tariff
- **nursing**: Daily nursing care charges
- **procedure**: Surgical procedures and treatments
- **lab**: Laboratory tests
- **radiology**: Imaging tests (X-ray, CT, MRI, etc.)
- **pharmacy**: Medications and drugs
- **consumable**: Medical consumables
- **consultation**: Doctor consultations
- **other**: Miscellaneous charges

#### Automatic Charge Calculation:

1. **Bed Charges**:
   - Retrieves tariff from Ward master if bed has wardId
   - Falls back to default rates based on bed category:
     - General: Rs. 1,500/day
     - Semi-Private: Rs. 2,500/day
     - Private: Rs. 4,000/day
     - Deluxe: Rs. 6,000/day
     - ICU: Rs. 8,000/day
     - NICU: Rs. 10,000/day
   - Captures one charge per day from admission date to current date
   - Skips days already captured to avoid duplicates

2. **Nursing Charges**:
   - Fixed rate: Rs. 300/day
   - Captured daily from admission date to current date
   - Tracked separately from bed charges

3. **Order-Based Charges**:
   - Extracts charges from Order details (JSON field)
   - Handles various order types: lab, radiology, pharmacy, procedures
   - Supports both single items and arrays of items
   - Links charge to original order via orderId
   - Only captures each order once

### 3. API Endpoints

Location: `/src/server.ts` (lines 8841-8987)

#### POST /api/ipd/charges/capture
Automatically capture daily charges for IPD patients.

**Request Body:**
```json
{
  "admissionId": "uuid",  // Optional: specific admission
  "captureAll": true      // Optional: capture for all active admissions
}
```

**Response:**
```json
{
  "success": true,
  "message": "Captured 15 charges",
  "charges": [...],
  "errors": []
}
```

**Use Cases:**
- Capture charges for a specific admission: `{ "admissionId": "..." }`
- Batch capture for all active admissions: `{ "captureAll": true }`
- Can be scheduled to run daily via cron job

---

#### GET /api/ipd/charges/:admissionId
Get all charges for a specific admission with itemized breakdown.

**Response:**
```json
{
  "admissionId": "uuid",
  "charges": [
    {
      "id": "uuid",
      "category": "bed",
      "description": "General Ward - Bed 101",
      "quantity": 1,
      "unitPrice": 1500,
      "amount": 1500,
      "chargeDate": "2025-12-30T00:00:00Z",
      "isAutomatic": true,
      "createdAt": "2025-12-31T08:00:00Z"
    },
    // ... more charges
  ],
  "summary": {
    "totalCharges": 15,
    "subtotal": 45000,
    "chargesByCategory": {
      "bed": 12000,
      "nursing": 2400,
      "lab": 5000,
      "radiology": 8000,
      "pharmacy": 12000,
      "procedure": 5000,
      "consultation": 500,
      "other": 100
    }
  }
}
```

---

#### POST /api/ipd/charges/add
Manually add a miscellaneous charge.

**Request Body:**
```json
{
  "admissionId": "uuid",
  "category": "consumable",
  "description": "Medical Consumables",
  "quantity": 5,
  "amount": 2500,
  "date": "2025-12-31"  // Optional, defaults to now
}
```

**Validation:**
- Required fields: admissionId, category, description, quantity, amount
- Category must be one of: bed, nursing, procedure, lab, radiology, pharmacy, consumable, consultation, other

**Response:**
```json
{
  "success": true,
  "message": "Charge added successfully",
  "charge": {
    "id": "uuid",
    "category": "consumable",
    "description": "Medical Consumables",
    "quantity": 5,
    "unitPrice": 500,
    "amount": 2500,
    "isAutomatic": false,
    // ... other fields
  }
}
```

---

#### GET /api/ipd/billing/summary/:admissionId
Get comprehensive billing summary for an IPD admission.

**Response:**
```json
{
  "admission": {
    "id": "uuid",
    "patientName": "John Doe",
    "patientMRN": "MRN001",
    "admissionDate": "2025-12-25T10:00:00Z",
    "dischargeDate": null,
    "totalDays": 6,
    "status": "active",
    "diagnosis": "Pneumonia",
    "wardName": "General",
    "bedNumber": "101",
    "doctorName": "Dr. Smith"
  },
  "charges": {
    "charges": [...],  // All itemized charges
    "summary": {
      "totalCharges": 20,
      "subtotal": 50000,
      "chargesByCategory": {
        "bed": 9000,
        "nursing": 1800,
        "lab": 8000,
        "radiology": 12000,
        "pharmacy": 15000,
        "procedure": 3500,
        "consultation": 500,
        "other": 200
      }
    }
  },
  "invoice": {
    "id": "uuid",
    "subtotal": 50000,
    "discount": 2500,
    "tax": 2375,
    "total": 49875,
    "paid": 20000,
    "balance": 29875,
    "status": "partial",
    "payments": [...]
  },
  "summary": {
    "totalCharges": 20,
    "subtotal": 50000,
    "chargesByCategory": {...},
    "insurance": {
      "tpaName": "Star Health",
      "policyNumber": "POL123456",
      "sumInsured": 500000
    },
    "balance": 29875
  }
}
```

**Features:**
- Complete patient and admission details
- All captured charges with category breakdown
- Existing invoice details if bill has been generated
- Payment history
- Insurance information if applicable
- Current balance due

## Integration with Existing Billing

The charge capture system integrates seamlessly with the existing IPD billing:

1. **Invoice Generation**: When generating an IPD invoice, pull charges from the `ipd_charges` table instead of calculating on-the-fly
2. **Invoice Link**: Store the invoice ID in a future enhancement or use the existing `Invoice.encounterId` to link invoices to admissions
3. **Charge Verification**: Review captured charges before finalizing the bill
4. **Adjustments**: Use the manual charge addition endpoint to add or modify charges as needed

### Workflow:

```
1. Patient Admission → Create Admission record
2. Daily (automated) → Run charge capture for all active admissions
3. Orders placed → Charges automatically captured from orders
4. Manual charges → Staff can add miscellaneous charges
5. Patient Discharge → Review all charges via summary endpoint
6. Generate Bill → Use captured charges to create invoice
7. Process Payments → Update invoice paid amount
```

## Usage Examples

### Daily Automated Charge Capture
```bash
# Run this via cron job every night at midnight
curl -X POST http://localhost:4000/api/ipd/charges/capture \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"captureAll": true}'
```

### Capture Charges for Specific Admission
```bash
curl -X POST http://localhost:4000/api/ipd/charges/capture \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"admissionId": "admission-uuid"}'
```

### View All Charges for Admission
```bash
curl http://localhost:4000/api/ipd/charges/admission-uuid \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Add Manual Charge
```bash
curl -X POST http://localhost:4000/api/ipd/charges/add \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "admissionId": "admission-uuid",
    "category": "consumable",
    "description": "IV Cannula and Medical Tape",
    "quantity": 3,
    "amount": 450
  }'
```

### Get Billing Summary
```bash
curl http://localhost:4000/api/ipd/billing/summary/admission-uuid \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Scheduling Automated Capture

To set up daily automated charge capture, you can:

1. **Using Node-Cron** (add to server.ts):
```typescript
import cron from 'node-cron';

// Run every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily IPD charge capture...');
  // You'll need to get all tenants and run for each
  // This is a simplified example
  const result = await ipdChargeCaptureService.captureChargesForAllActiveAdmissions(
    'tenant-id',
    'system-user-id'
  );
  console.log(`Captured charges for ${result.totalAdmissions} admissions`);
});
```

2. **Using System Cron** (Linux/Unix):
```bash
# Add to crontab
0 0 * * * curl -X POST http://localhost:4000/api/ipd/charges/capture \
  -H "Authorization: Bearer SYSTEM_TOKEN" \
  -d '{"captureAll": true}'
```

## Error Handling

The service includes comprehensive error handling:

- Validates admission existence and status
- Checks for duplicate charges before creating
- Handles missing ward tariffs with fallback rates
- Returns detailed error messages for troubleshooting
- Continues processing other admissions even if one fails (batch mode)
- Logs all errors for debugging

## Future Enhancements

Possible improvements to consider:

1. **Charge Adjustments**: Add ability to modify or void charges
2. **Approval Workflow**: Require approval before charges are finalized
3. **Package Rates**: Support for package-based billing
4. **Tiered Pricing**: Different rates based on patient category
5. **Batch Corrections**: Bulk update capabilities
6. **Audit Trail**: Enhanced tracking of charge modifications
7. **Reporting**: Detailed charge analysis and reports
8. **Alerts**: Notifications for unusual charges or missing captures
9. **Integration**: Direct integration with invoice generation
10. **Mobile App**: Mobile interface for charge entry and review

## Testing

To test the implementation:

1. Create a test admission with an active status
2. Run charge capture for that admission
3. Verify bed and nursing charges are created for each day
4. Create some orders (lab, pharmacy, etc.)
5. Run charge capture again
6. Verify order-based charges are captured
7. Add a manual charge
8. Get the billing summary and verify all charges are present
9. Test the itemized charge list endpoint

## Files Modified/Created

### Created:
- `/src/services/ipdChargeCapture.ts` - Main service implementation

### Modified:
- `/prisma/schema.prisma` - Added IPDCharge model and relation to Admission
- `/src/server.ts` - Added import and 4 new API endpoints (lines 58-59, 8841-8987)

### Database:
- New table: `ipd_charges`
- Updated table: `admissions` (no schema change, just new relation)

## Summary

This implementation provides a robust, automated charge capture system for IPD patients that:
- Automatically captures daily bed and nursing charges
- Extracts charges from orders placed during admission
- Supports manual charge addition for miscellaneous items
- Provides detailed charge breakdowns by category
- Integrates with existing billing system
- Includes comprehensive error handling
- Offers flexible API for various use cases
- Can be scheduled for automated daily operation

The system ensures accurate, timely capture of all billable items, reducing billing errors and improving revenue cycle management for the hospital.
