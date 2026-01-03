# Billing Integration Quick Reference

## Quick Start

### 1. Apply Migration (One-time)
```bash
npx prisma migrate deploy  # Apply pending migrations first
npx prisma migrate dev --name add_billing_to_orders
```

### 2. Register Routes (server.ts)
```typescript
import billingRoutes from './routes/billing';
app.use('/api/billing', billingRoutes);
```

### 3. Update Radiology Endpoint (server.ts)
```typescript
import { createRadiologyOrderWithBilling } from './routes/orders-patch';

app.post('/api/radiology-orders',
  authenticateToken,
  validateBody(createRadiologyOrderSchema),
  createRadiologyOrderWithBilling
);
```

## API Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/lab-orders` | POST | Create lab order (auto-billing enabled) |
| `/api/radiology-orders` | POST | Create radiology order (auto-billing enabled) |
| `/api/billing/patient/:patientId/pending` | GET | Get unbilled OPD charges |
| `/api/billing/admission/:admissionId/pending` | GET | Get unbilled IPD charges |
| `/api/billing/generate-invoice` | POST | Generate invoice from charges |
| `/api/billing/orders/:orderId/billing-status` | GET | Check order billing status |

## Order Billing Status

| Status | Meaning |
|--------|---------|
| `unbilled` | Order created, no invoice yet (IPD) or awaiting invoice generation |
| `billed` | Order added to invoice |
| `paid` | Invoice fully paid |

## Workflow Cheat Sheet

### OPD Patient
```
Order Created → Auto-calculates charges → Creates/updates draft invoice → Order = 'billed'
Payment Made → Order = 'paid'
```

### IPD Patient
```
Order Created → Auto-calculates charges → Links to admission → Order = 'unbilled'
At Discharge → Generate invoice from all orders → Payment Made → Order = 'paid'
```

## Code Snippets

### Import Billing Service
```typescript
import {
  createLabOrderBilling,
  createRadiologyOrderBilling,
  getPendingCharges,
  getIPDPendingCharges,
  generateInvoiceFromCharges,
  markOrdersAsPaid
} from './services/billing';
```

### Get Pending Charges
```typescript
const charges = await getPendingCharges(patientId);
// charges.labOrders, charges.radiologyOrders, charges.totalPending
```

### Generate Invoice
```typescript
const invoice = await generateInvoiceFromCharges(
  patientId,
  ['order-id-1', 'order-id-2'],
  encounterId,   // optional
  admissionId,   // optional
  10             // discount percent
);
```

### Mark Orders as Paid (in payment handler)
```typescript
if (invoiceFullyPaid) {
  await markOrdersAsPaid(invoiceId);
}
```

## Request/Response Examples

### Create Lab Order (OPD)
```json
POST /api/lab-orders
{
  "patientId": "uuid",
  "encounterId": "uuid",
  "tests": [
    { "testId": "test-uuid", "priority": "ROUTINE" }
  ]
}

Response:
{
  "id": "order-uuid",
  "billingStatus": "billed",
  "chargeAmount": 800.00,
  "invoiceId": "invoice-uuid"
}
```

### Generate Invoice
```json
POST /api/billing/generate-invoice
{
  "patientId": "patient-uuid",
  "orderIds": ["order1", "order2"],
  "discountPercent": 10
}

Response:
{
  "message": "Invoice generated successfully",
  "invoice": {
    "id": "invoice-uuid",
    "total": 1170.00,
    "items": [...]
  }
}
```

## Permissions Required

- `billing:view` - View pending charges, billing status
- `billing:create` - Generate invoices
- `billing:payment` - Process payments

## Important Files

| File | Purpose |
|------|---------|
| `src/services/billing.ts` | Core billing logic |
| `src/routes/billing.ts` | Billing API endpoints |
| `src/routes/orders-patch.ts` | Radiology order update |
| `BILLING_INTEGRATION_GUIDE.md` | Complete documentation |

## Common Tasks

### View Pending OPD Charges
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/billing/patient/PATIENT_ID/pending
```

### View Pending IPD Charges
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/billing/admission/ADMISSION_ID/pending
```

### Generate Invoice
```bash
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"patientId":"ID","orderIds":["ID1","ID2"]}' \
  http://localhost:3000/api/billing/generate-invoice
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Migration fails | Apply pending migrations first |
| Billing not working | Check routes are registered in server.ts |
| Radiology not billing | Apply the orders-patch.ts update |
| Duplicate invoices | Check order billingStatus before creating invoice |

## Key Points

- ✅ Lab orders: Auto-billing already enabled in server.ts
- ⚠️ Radiology orders: Needs manual patch application
- 💰 Prices from: LabTestMaster & RadiologyTestMaster
- 📝 OPD: Draft invoices auto-created
- 🏥 IPD: Charges accumulate, invoice at discharge
- 🔒 Prevents double billing via status tracking
