# Testing IPD Charge Capture System

## Prerequisites

1. Start the server:
```bash
npm run dev
```

2. Get an authentication token by logging in
3. Have at least one active admission in the database

## API Endpoints to Test

### 1. Capture Charges for a Specific Admission

**Endpoint:** `POST /api/ipd/charges/capture`

**Request:**
```bash
curl -X POST http://localhost:4000/api/ipd/charges/capture \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "admissionId": "YOUR_ADMISSION_ID"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Captured X charges",
  "charges": [
    {
      "id": "...",
      "category": "bed",
      "description": "General Ward - Bed 101",
      "quantity": 1,
      "unitPrice": "1500.00",
      "amount": "1500.00",
      "chargeDate": "2025-12-31T00:00:00.000Z",
      "isAutomatic": true
    }
    // ... more charges
  ],
  "errors": []
}
```

---

### 2. Capture Charges for All Active Admissions

**Endpoint:** `POST /api/ipd/charges/capture`

**Request:**
```bash
curl -X POST http://localhost:4000/api/ipd/charges/capture \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "captureAll": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Captured charges for 5 admissions",
  "totalAdmissions": 5,
  "totalCharges": 47,
  "errors": []
}
```

---

### 3. Get All Charges for an Admission

**Endpoint:** `GET /api/ipd/charges/:admissionId`

**Request:**
```bash
curl http://localhost:4000/api/ipd/charges/YOUR_ADMISSION_ID \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Expected Response:**
```json
{
  "admissionId": "...",
  "charges": [
    {
      "id": "...",
      "tenantId": "...",
      "admissionId": "...",
      "category": "bed",
      "description": "General Ward - Bed 101",
      "quantity": 1,
      "unitPrice": 1500,
      "amount": 1500,
      "chargeDate": "2025-12-31T00:00:00.000Z",
      "orderId": null,
      "capturedBy": "user-id",
      "isAutomatic": true,
      "createdAt": "2025-12-31T08:00:00.000Z",
      "updatedAt": "2025-12-31T08:00:00.000Z"
    },
    {
      "id": "...",
      "category": "nursing",
      "description": "Nursing Care",
      "quantity": 1,
      "unitPrice": 300,
      "amount": 300,
      "chargeDate": "2025-12-31T00:00:00.000Z",
      "isAutomatic": true
    }
    // ... more charges
  ],
  "summary": {
    "totalCharges": 15,
    "subtotal": 24800,
    "chargesByCategory": {
      "bed": 9000,
      "nursing": 1800,
      "procedure": 5000,
      "lab": 3000,
      "radiology": 4000,
      "pharmacy": 2000,
      "consultation": 0,
      "consumable": 0,
      "other": 0
    }
  }
}
```

---

### 4. Add a Manual Charge

**Endpoint:** `POST /api/ipd/charges/add`

**Request:**
```bash
curl -X POST http://localhost:4000/api/ipd/charges/add \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "admissionId": "YOUR_ADMISSION_ID",
    "category": "consumable",
    "description": "IV Cannula (18G) x3, Medical Tape",
    "quantity": 3,
    "amount": 450,
    "date": "2025-12-31"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Charge added successfully",
  "charge": {
    "id": "...",
    "tenantId": "...",
    "admissionId": "...",
    "category": "consumable",
    "description": "IV Cannula (18G) x3, Medical Tape",
    "quantity": 3,
    "unitPrice": 150,
    "amount": 450,
    "chargeDate": "2025-12-31T00:00:00.000Z",
    "orderId": null,
    "capturedBy": "user-id",
    "isAutomatic": false,
    "createdAt": "2025-12-31T09:00:00.000Z",
    "updatedAt": "2025-12-31T09:00:00.000Z"
  }
}
```

**Valid Categories:**
- bed
- nursing
- procedure
- lab
- radiology
- pharmacy
- consumable
- consultation
- other

---

### 5. Get Billing Summary

**Endpoint:** `GET /api/ipd/billing/summary/:admissionId`

**Request:**
```bash
curl http://localhost:4000/api/ipd/billing/summary/YOUR_ADMISSION_ID \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Expected Response:**
```json
{
  "admission": {
    "id": "...",
    "patientName": "John Doe",
    "patientMRN": "MRN001",
    "admissionDate": "2025-12-25T10:00:00.000Z",
    "dischargeDate": null,
    "totalDays": 6,
    "status": "active",
    "diagnosis": "Pneumonia",
    "wardName": "General",
    "bedNumber": "101",
    "doctorName": "Dr. Smith"
  },
  "charges": {
    "charges": [
      // ... all charges
    ],
    "summary": {
      "totalCharges": 20,
      "subtotal": 30000,
      "chargesByCategory": {
        "bed": 9000,
        "nursing": 1800,
        "procedure": 5000,
        "lab": 4000,
        "radiology": 6000,
        "pharmacy": 3500,
        "consultation": 500,
        "consumable": 200,
        "other": 0
      }
    }
  },
  "invoice": null,  // or invoice object if bill has been generated
  "summary": {
    "totalCharges": 20,
    "subtotal": 30000,
    "chargesByCategory": {
      "bed": 9000,
      "nursing": 1800,
      "procedure": 5000,
      "lab": 4000,
      "radiology": 6000,
      "pharmacy": 3500,
      "consultation": 500,
      "consumable": 200,
      "other": 0
    },
    "insurance": null,  // or insurance details if applicable
    "balance": 30000
  }
}
```

---

## Testing Workflow

### Step 1: Create a Test Admission
Use the existing admission endpoint or create one via the UI.

### Step 2: Run Initial Charge Capture
```bash
curl -X POST http://localhost:4000/api/ipd/charges/capture \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"admissionId": "YOUR_ADMISSION_ID"}'
```

Expected: Should create bed and nursing charges for each day from admission to today.

### Step 3: Verify Charges Were Created
```bash
curl http://localhost:4000/api/ipd/charges/YOUR_ADMISSION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Should show itemized charges with bed and nursing categories.

### Step 4: Add Manual Charge
```bash
curl -X POST http://localhost:4000/api/ipd/charges/add \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "admissionId": "YOUR_ADMISSION_ID",
    "category": "consumable",
    "description": "Surgical Gloves",
    "quantity": 2,
    "amount": 100
  }'
```

Expected: Should add a manual charge successfully.

### Step 5: Create Some Orders
Create lab, pharmacy, or radiology orders for the admission using existing endpoints.

### Step 6: Run Charge Capture Again
```bash
curl -X POST http://localhost:4000/api/ipd/charges/capture \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"admissionId": "YOUR_ADMISSION_ID"}'
```

Expected: Should capture new charges from orders, but not duplicate bed/nursing charges.

### Step 7: Get Full Billing Summary
```bash
curl http://localhost:4000/api/ipd/billing/summary/YOUR_ADMISSION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Should show comprehensive summary with all charges, categories, and totals.

### Step 8: Test Batch Capture
```bash
curl -X POST http://localhost:4000/api/ipd/charges/capture \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"captureAll": true}'
```

Expected: Should process all active admissions and report total charges captured.

---

## Error Cases to Test

### 1. Missing Required Fields
```bash
curl -X POST http://localhost:4000/api/ipd/charges/add \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "admissionId": "YOUR_ADMISSION_ID",
    "category": "consumable"
  }'
```

Expected: 400 error with message about missing required fields.

### 2. Invalid Category
```bash
curl -X POST http://localhost:4000/api/ipd/charges/add \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "admissionId": "YOUR_ADMISSION_ID",
    "category": "invalid_category",
    "description": "Test",
    "quantity": 1,
    "amount": 100
  }'
```

Expected: 400 error with message about invalid category.

### 3. Non-existent Admission
```bash
curl http://localhost:4000/api/ipd/billing/summary/non-existent-id \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: 404 error with "Admission not found" message.

### 4. Neither admissionId nor captureAll Provided
```bash
curl -X POST http://localhost:4000/api/ipd/charges/capture \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: 400 error asking to provide either admissionId or set captureAll to true.

---

## Expected Behavior

1. **Duplicate Prevention**: Running charge capture multiple times should not create duplicate charges for the same day
2. **Daily Charges**: Bed and nursing charges should be created for each day from admission to today
3. **Order Integration**: Orders should only be captured once, linked via orderId
4. **Manual vs Automatic**: Manual charges should have isAutomatic = false
5. **Category Totals**: Summary should correctly aggregate charges by category
6. **Multi-tenant**: Charges should be filtered by tenantId

---

## Database Verification

You can also verify the data directly in the database:

```sql
-- Check captured charges for an admission
SELECT * FROM ipd_charges WHERE admission_id = 'YOUR_ADMISSION_ID' ORDER BY charge_date;

-- Check charges by category
SELECT category, COUNT(*), SUM(amount)
FROM ipd_charges
WHERE admission_id = 'YOUR_ADMISSION_ID'
GROUP BY category;

-- Check for duplicates (should return 0 rows)
SELECT charge_date, category, COUNT(*)
FROM ipd_charges
WHERE admission_id = 'YOUR_ADMISSION_ID' AND category IN ('bed', 'nursing')
GROUP BY charge_date, category
HAVING COUNT(*) > 1;
```

---

## Notes

- Replace `YOUR_AUTH_TOKEN` with a valid JWT token from login
- Replace `YOUR_ADMISSION_ID` with an actual admission UUID
- Make sure the server is running on `http://localhost:4000` (or adjust the URL)
- Check server logs for detailed error messages if something goes wrong
