# Insurance Verification API - Quick Reference

## Base URL
All endpoints are prefixed with `/api/insurance`

## Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

---

## Endpoints Summary

### 1. Verify Insurance
```
POST /api/insurance/verify
```
**Body:**
```json
{
  "patientId": "uuid",
  "policyNumber": "string",
  "tpaId": "uuid"
}
```
**Returns:** Insurance verification status with policy details

---

### 2. Get Patient's Insurance Policies
```
GET /api/insurance/patient/:patientId
```
**Returns:** Array of all insurance policies for the patient

---

### 3. Request Pre-Authorization
```
POST /api/insurance/pre-auth/request
```
**Body:**
```json
{
  "patientId": "uuid",
  "tpaId": "uuid",
  "requestedAmount": 150000,
  "diagnosis": "string",
  "procedurePlanned": "string",
  "remarks": "string (optional)"
}
```
**Returns:** Created pre-authorization object

---

### 4. List Pre-Authorizations
```
GET /api/insurance/pre-auth?status=pending&patientId=uuid&tpaId=uuid
```
**Query Params (all optional):**
- `status` - Filter by status (pending, approved, rejected)
- `patientId` - Filter by patient
- `tpaId` - Filter by TPA

**Returns:** Array of pre-authorization objects

---

### 5. Get Pre-Authorization Details
```
GET /api/insurance/pre-auth/:id
```
**Returns:** Full pre-authorization details

---

### 6. Approve Pre-Authorization
```
PUT /api/insurance/pre-auth/:id/approve
```
**Body:**
```json
{
  "approvedAmount": 125000,
  "approvalNumber": "AUTH123456",
  "validTill": "2025-01-15T23:59:59.000Z",
  "remarks": "string (optional)"
}
```
**Returns:** Updated pre-authorization

---

### 7. Reject Pre-Authorization
```
PUT /api/insurance/pre-auth/:id/reject
```
**Body:**
```json
{
  "remarks": "string (optional)"
}
```
**Returns:** Updated pre-authorization

---

## Enhanced Admission Endpoint

### Create Admission with Insurance
```
POST /api/admissions
```
**Body:**
```json
{
  "encounterId": "uuid",
  "patientId": "uuid",
  "bedId": "uuid (optional)",
  "diagnosis": "string (optional)",

  // Insurance fields (all optional)
  "patientInsuranceId": "uuid",
  "preAuthorizationId": "uuid",
  "requireInsurance": false
}
```

**Insurance Logic:**
- If `requireInsurance: true`, insurance must be provided and valid
- If `patientInsuranceId` provided, it will be verified
- If `preAuthorizationId` provided, it will be verified and linked
- Returns admission with insurance verification status

---

## RBAC Permissions

Required permissions for insurance endpoints:

- `insurance:verify` - Verify patient insurance
- `insurance:view` - View insurance and pre-auth data
- `insurance:pre_auth` - Create pre-auth requests
- `insurance:approve` - Approve/reject pre-auth

---

## Common Response Codes

- `200` - Success
- `201` - Created (for POST requests)
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `500` - Internal server error

---

## Sample Workflow

```bash
# 1. Get patient's insurance policies
curl -X GET http://localhost:4000/api/insurance/patient/PATIENT_ID \
  -H "Authorization: Bearer TOKEN"

# 2. Verify insurance
curl -X POST http://localhost:4000/api/insurance/verify \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PATIENT_ID",
    "policyNumber": "POL123456",
    "tpaId": "TPA_ID"
  }'

# 3. Request pre-authorization
curl -X POST http://localhost:4000/api/insurance/pre-auth/request \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PATIENT_ID",
    "tpaId": "TPA_ID",
    "requestedAmount": 150000,
    "diagnosis": "Acute appendicitis",
    "procedurePlanned": "Laparoscopic appendectomy"
  }'

# 4. Approve pre-authorization (TPA workflow)
curl -X PUT http://localhost:4000/api/insurance/pre-auth/PREAUTH_ID/approve \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "approvedAmount": 125000,
    "approvalNumber": "AUTH123456",
    "validTill": "2025-01-15T23:59:59.000Z"
  }'

# 5. Create admission with insurance
curl -X POST http://localhost:4000/api/admissions \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "encounterId": "ENCOUNTER_ID",
    "patientId": "PATIENT_ID",
    "bedId": "BED_ID",
    "diagnosis": "Acute appendicitis",
    "patientInsuranceId": "INSURANCE_ID",
    "preAuthorizationId": "PREAUTH_ID"
  }'
```

---

## Files Modified/Created

**New Files:**
- `/src/routes/insurance.ts` - Insurance routes
- `/src/routes/admissions-insurance.ts` - Enhanced admission function
- `INSURANCE_VERIFICATION_IMPLEMENTATION.md` - Full documentation
- `INSURANCE_API_QUICK_REFERENCE.md` - This file

**Modified Files:**
- `/prisma/schema.prisma` - Added insurance fields to Admission model
- `/src/server.ts` - Imported and mounted insurance routes
- `/src/routes/index.ts` - Added insurance permissions
- `/src/middleware/rbacMiddleware.ts` - Added insurance permissions

---

For complete documentation, see `INSURANCE_VERIFICATION_IMPLEMENTATION.md`
