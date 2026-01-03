# Insurance Verification - Test Data Examples

This file contains sample data for testing the insurance verification workflow.

---

## Prerequisites

Before testing insurance verification, you need:
1. A test patient in the system
2. A TPA (insurance company) in TPAMaster
3. A patient insurance policy in PatientInsurance
4. An encounter for the patient
5. An available bed

---

## Sample Data for Testing

### 1. Create TPA (Insurance Company)

If you don't have a TPA, create one:

```sql
INSERT INTO tpa_master (id, name, type, contact_person, contact, email, credit_limit, discount_percent, is_active)
VALUES (
  'tpa-test-001',
  'Star Health Insurance',
  'insurance',
  'Jane Smith',
  '+91-9876543210',
  'support@starhealth.com',
  10000000.00,
  5.00,
  true
);
```

### 2. Create Patient Insurance Policy

```sql
INSERT INTO patient_insurances (
  id,
  patient_id,
  tpa_id,
  policy_number,
  policy_holder_name,
  valid_from,
  valid_till,
  sum_insured,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'insurance-test-001',
  'YOUR_PATIENT_ID',  -- Replace with actual patient ID
  'tpa-test-001',
  'POL123456',
  'John Doe',
  '2024-01-01 00:00:00',
  '2024-12-31 23:59:59',
  500000.00,
  true,
  NOW(),
  NOW()
);
```

---

## Test Scenarios

### Scenario 1: Verify Valid Insurance

**API Call:**
```bash
curl -X POST http://localhost:4000/api/insurance/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "YOUR_PATIENT_ID",
    "policyNumber": "POL123456",
    "tpaId": "tpa-test-001"
  }'
```

**Expected Result:**
```json
{
  "verified": true,
  "coverageStatus": "valid",
  "message": "Insurance verified successfully",
  "insurance": {
    "id": "insurance-test-001",
    "policyNumber": "POL123456",
    "policyHolderName": "John Doe",
    "validFrom": "2024-01-01T00:00:00.000Z",
    "validTill": "2024-12-31T23:59:59.000Z",
    "sumInsured": "500000.00",
    "tpa": {
      "id": "tpa-test-001",
      "name": "Star Health Insurance",
      "type": "insurance",
      "contactPerson": "Jane Smith",
      "contact": "+91-9876543210",
      "email": "support@starhealth.com",
      "creditLimit": "10000000.00",
      "discountPercent": "5.00"
    }
  }
}
```

---

### Scenario 2: Request Pre-Authorization

**API Call:**
```bash
curl -X POST http://localhost:4000/api/insurance/pre-auth/request \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "YOUR_PATIENT_ID",
    "tpaId": "tpa-test-001",
    "requestedAmount": 150000,
    "diagnosis": "Acute appendicitis",
    "procedurePlanned": "Laparoscopic appendectomy",
    "remarks": "Emergency surgery required within 24 hours"
  }'
```

**Expected Result:**
```json
{
  "id": "preauth-uuid-generated",
  "patientId": "YOUR_PATIENT_ID",
  "tpaId": "tpa-test-001",
  "requestDate": "2024-12-31T08:00:00.000Z",
  "status": "pending",
  "requestedAmount": "150000.00",
  "diagnosis": "Acute appendicitis",
  "procedurePlanned": "Laparoscopic appendectomy",
  "remarks": "Emergency surgery required within 24 hours",
  "patient": {
    "id": "YOUR_PATIENT_ID",
    "mrn": "MRN001",
    "name": "John Doe",
    "contact": "+91-9876543210"
  },
  "tpa": {
    "id": "tpa-test-001",
    "name": "Star Health Insurance",
    "type": "insurance",
    "contactPerson": "Jane Smith",
    "contact": "+91-9876543210",
    "email": "support@starhealth.com"
  }
}
```

---

### Scenario 3: Approve Pre-Authorization

**API Call:**
```bash
curl -X PUT http://localhost:4000/api/insurance/pre-auth/PREAUTH_ID/approve \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "approvedAmount": 125000,
    "approvalNumber": "AUTH123456",
    "validTill": "2025-01-15T23:59:59.000Z",
    "remarks": "Approved with reduced amount"
  }'
```

**Expected Result:**
```json
{
  "id": "PREAUTH_ID",
  "status": "approved",
  "approvedAmount": "125000.00",
  "approvalNumber": "AUTH123456",
  "approvalDate": "2024-12-31T10:00:00.000Z",
  "validTill": "2025-01-15T23:59:59.000Z",
  "remarks": "Approved with reduced amount",
  /* ... other fields ... */
}
```

---

### Scenario 4: Create Admission with Insurance

**Prerequisites:**
- Create an encounter first
- Have a bed available

**API Call:**
```bash
curl -X POST http://localhost:4000/api/admissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "encounterId": "YOUR_ENCOUNTER_ID",
    "patientId": "YOUR_PATIENT_ID",
    "bedId": "YOUR_BED_ID",
    "diagnosis": "Acute appendicitis",
    "patientInsuranceId": "insurance-test-001",
    "preAuthorizationId": "YOUR_PREAUTH_ID"
  }'
```

**Expected Result:**
```json
{
  "id": "admission-uuid-generated",
  "encounterId": "YOUR_ENCOUNTER_ID",
  "patientId": "YOUR_PATIENT_ID",
  "bedId": "YOUR_BED_ID",
  "admittingDoctorId": "DOCTOR_USER_ID",
  "diagnosis": "Acute appendicitis",
  "status": "active",
  "patientInsuranceId": "insurance-test-001",
  "preAuthorizationId": "YOUR_PREAUTH_ID",
  "insuranceVerified": true,
  "insuranceVerifiedAt": "2024-12-31T08:00:00.000Z",
  "admissionDate": "2024-12-31T08:00:00.000Z",
  "patient": {
    "name": "John Doe",
    "mrn": "MRN001"
  },
  "bed": {
    "bedNumber": "B101",
    "category": "general"
  }
}
```

---

## Error Scenarios

### 1. Expired Insurance

Create an expired insurance policy:

```sql
INSERT INTO patient_insurances (
  id, patient_id, tpa_id, policy_number, policy_holder_name,
  valid_from, valid_till, sum_insured, is_active, created_at, updated_at
)
VALUES (
  'insurance-expired-001',
  'YOUR_PATIENT_ID',
  'tpa-test-001',
  'POL999999',
  'John Doe',
  '2023-01-01 00:00:00',
  '2023-12-31 23:59:59',  -- Expired
  500000.00,
  true,
  NOW(),
  NOW()
);
```

**Test Verification:**
```bash
curl -X POST http://localhost:4000/api/insurance/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "YOUR_PATIENT_ID",
    "policyNumber": "POL999999",
    "tpaId": "tpa-test-001"
  }'
```

**Expected Result:**
```json
{
  "verified": false,
  "coverageStatus": "expired",
  "message": "Insurance policy has expired",
  "insurance": {
    /* policy details */
  }
}
```

### 2. Inactive Insurance

```sql
UPDATE patient_insurances
SET is_active = false
WHERE id = 'insurance-test-001';
```

**Expected Result:**
```json
{
  "verified": false,
  "message": "Insurance policy not found or inactive"
}
```

### 3. Admission Without Required Insurance

```bash
curl -X POST http://localhost:4000/api/admissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "encounterId": "YOUR_ENCOUNTER_ID",
    "patientId": "YOUR_PATIENT_ID",
    "bedId": "YOUR_BED_ID",
    "diagnosis": "Test",
    "requireInsurance": true
  }'
```

**Expected Result:**
```json
{
  "error": "Insurance is required for admission but no insurance policy was provided"
}
```

### 4. Pre-Auth for Different Patient

Create pre-auth for one patient, try to use it for another:

**Expected Result:**
```json
{
  "error": "Pre-authorization is for a different patient"
}
```

### 5. Using Pending Pre-Auth

Try to admit with pre-auth that's not approved:

**Expected Result:**
```json
{
  "error": "Pre-authorization is pending, not approved"
}
```

---

## Testing Checklist

- [ ] Create TPA in system
- [ ] Create patient insurance policy
- [ ] Test insurance verification (valid case)
- [ ] Test insurance verification (expired case)
- [ ] Test get patient insurances
- [ ] Test create pre-auth request
- [ ] Test list pre-auths with filters
- [ ] Test get pre-auth details
- [ ] Test approve pre-auth
- [ ] Test reject pre-auth
- [ ] Test admission with insurance
- [ ] Test admission with pre-auth
- [ ] Test admission with mandatory insurance
- [ ] Test all error scenarios

---

## Quick Test Script

Save this as `test-insurance.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:4000"
TOKEN="YOUR_JWT_TOKEN"

# 1. Verify Insurance
echo "1. Testing Insurance Verification..."
curl -X POST $BASE_URL/api/insurance/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "YOUR_PATIENT_ID",
    "policyNumber": "POL123456",
    "tpaId": "tpa-test-001"
  }'

echo -e "\n\n"

# 2. Get Patient Insurances
echo "2. Getting Patient Insurances..."
curl -X GET $BASE_URL/api/insurance/patient/YOUR_PATIENT_ID \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n"

# 3. Request Pre-Auth
echo "3. Requesting Pre-Authorization..."
curl -X POST $BASE_URL/api/insurance/pre-auth/request \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "YOUR_PATIENT_ID",
    "tpaId": "tpa-test-001",
    "requestedAmount": 150000,
    "diagnosis": "Test diagnosis",
    "procedurePlanned": "Test procedure"
  }'

echo -e "\n\n"

# 4. List Pre-Auths
echo "4. Listing Pre-Authorizations..."
curl -X GET "$BASE_URL/api/insurance/pre-auth?status=pending" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n"
```

---

## Postman Collection

Import this JSON into Postman for easy testing:

```json
{
  "info": {
    "name": "Insurance Verification API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Verify Insurance",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"patientId\": \"{{patientId}}\",\n  \"policyNumber\": \"POL123456\",\n  \"tpaId\": \"{{tpaId}}\"\n}",
          "options": {
            "raw": {
              "language": "json"
            }
          }
        },
        "url": {
          "raw": "{{baseUrl}}/api/insurance/verify",
          "host": ["{{baseUrl}}"],
          "path": ["api", "insurance", "verify"]
        }
      }
    },
    {
      "name": "Get Patient Insurances",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/api/insurance/patient/{{patientId}}",
          "host": ["{{baseUrl}}"],
          "path": ["api", "insurance", "patient", "{{patientId}}"]
        }
      }
    },
    {
      "name": "Request Pre-Auth",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"patientId\": \"{{patientId}}\",\n  \"tpaId\": \"{{tpaId}}\",\n  \"requestedAmount\": 150000,\n  \"diagnosis\": \"Acute appendicitis\",\n  \"procedurePlanned\": \"Laparoscopic appendectomy\"\n}",
          "options": {
            "raw": {
              "language": "json"
            }
          }
        },
        "url": {
          "raw": "{{baseUrl}}/api/insurance/pre-auth/request",
          "host": ["{{baseUrl}}"],
          "path": ["api", "insurance", "pre-auth", "request"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:4000"
    },
    {
      "key": "token",
      "value": "YOUR_JWT_TOKEN"
    },
    {
      "key": "patientId",
      "value": "YOUR_PATIENT_ID"
    },
    {
      "key": "tpaId",
      "value": "tpa-test-001"
    }
  ]
}
```

---

## Notes

- Replace `YOUR_PATIENT_ID`, `YOUR_TOKEN`, etc. with actual values
- Ensure you have proper RBAC permissions assigned
- Test in development environment first
- Check server logs for detailed error messages

---

For complete documentation, see:
- `INSURANCE_VERIFICATION_IMPLEMENTATION.md`
- `INSURANCE_API_QUICK_REFERENCE.md`
