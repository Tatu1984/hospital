# IPD Billing - Quick Reference Card

## Integration Checklist

- [ ] Add 4 new routes to `backend/src/server.ts` (see INTEGRATION_INSTRUCTIONS.md)
- [ ] Ensure routes are in correct order (specific before parameterized)
- [ ] Restart backend server
- [ ] Test endpoints with curl or Postman
- [ ] Access IPD Billing page in frontend
- [ ] Test complete billing flow

## API Endpoints

### List Admissions
```
GET /api/ipd-billing/admissions?status=active
```

### Get Bill Details
```
GET /api/ipd-billing/:admissionId
```

### Get Detailed Charges
```
GET /api/ipd-billing/:admissionId/charges
```

### Get Quick Summary
```
GET /api/ipd-billing/:admissionId/summary
```

### Save Bill
```
POST /api/ipd-billing
Body: { admissionId, patientId, charges, subtotal, discount, tax, total }
```

### Record Payment
```
POST /api/ipd-billing/:admissionId/pay
Body: { invoiceId, amount, paymentMode, reference }
```

### Generate Bill
```
POST /api/ipd-billing/:admissionId/generate
```

## Charge Calculations

| Category | Formula | Default Rate |
|----------|---------|--------------|
| Bed | Days × Bed Rate | Rs. 1,500 - 10,000 |
| Nursing | Days × 300 | Rs. 300/day |
| Consultation | Visits × 500 | Rs. 500/visit |
| Lab | From orders | Variable |
| Radiology | From orders | Variable |
| Pharmacy | Qty × Price | Variable |
| Procedures | From orders | Variable |

## Bed Rates

```typescript
const categoryRates = {
  'general': 1500,
  'semi-private': 2500,
  'private': 4000,
  'deluxe': 6000,
  'icu': 8000,
  'nicu': 10000,
};
```

## Frontend Routes

**IPD Billing Page:**
```
http://localhost:5173/ipd-billing
```

## Database Models

- `Admission` - Patient admission record
- `Encounter` - Medical encounter
- `Order` - Service orders (lab, pharmacy, etc.)
- `Invoice` - IPD bill
- `Payment` - Payment transactions
- `Bed` - Bed information
- `Ward` - Ward with tariff

## Common Issues

### Routes not working?
- Check route order in server.ts
- Verify `authenticateToken` middleware
- Check Prisma client initialization

### Charges missing?
- Verify orders exist for admission
- Check order status (not cancelled)
- Verify bed/ward configuration

### Wrong calculations?
- Check date calculations
- Verify bed category rates
- Ensure prices are numbers

## Testing

### Quick Test Flow:
1. Create admission with bed
2. Add lab order
3. Add pharmacy order
4. Generate bill
5. Verify calculations
6. Record payment
7. Check balance
8. Print bill

### Sample curl Commands:

```bash
# List admissions
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/ipd-billing/admissions

# Get charges
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/ipd-billing/ADMISSION_ID/charges

# Save bill
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"admissionId":"ID","patientId":"PID","charges":[],"total":1000}' \
  http://localhost:5000/api/ipd-billing

# Record payment
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invoiceId":"IID","amount":500,"paymentMode":"cash"}' \
  http://localhost:5000/api/ipd-billing/ADMISSION_ID/pay
```

## Key Features

- Automated charge calculation
- Category-wise breakdown
- Multiple payment support
- Discount & tax handling
- Print-ready bills
- Discharge integration
- Manual charge addition
- Payment history tracking

## File Locations

**Frontend:**
```
/frontend/src/pages/IPDBilling.tsx
```

**Backend Routes:**
```
/backend/src/server.ts (main)
/backend/src/routes/ipd-billing-enhanced.ts (reference)
```

**Documentation:**
```
/IPD_BILLING_IMPLEMENTATION.md (detailed)
/IPD_BILLING_SUMMARY.md (overview)
/backend/INTEGRATION_INSTRUCTIONS.md (step-by-step)
/IPD_BILLING_QUICK_REFERENCE.md (this file)
```

## Support Files

All implementation files are at:
```
/Users/sudipto/Desktop/projects/hospitalerp/
```

## Status

✅ Frontend: Complete and functional
✅ Backend: Routes provided
✅ Documentation: Complete
⏳ Integration: Pending (add routes to server.ts)
⏳ Testing: Ready for QA

## Next Action

**Add routes from INTEGRATION_INSTRUCTIONS.md to server.ts and restart server**
