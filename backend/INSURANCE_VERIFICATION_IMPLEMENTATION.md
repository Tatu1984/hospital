# Insurance Verification at Admission - Implementation Guide

## Overview

This implementation adds comprehensive insurance verification workflow to the Hospital ERP system. The system now supports:

1. **Insurance Verification** - Verify patient insurance policies before admission
2. **Pre-Authorization Management** - Request, approve, and track pre-authorizations
3. **Insurance-Linked Admissions** - Admissions can be linked to insurance policies and pre-authorizations
4. **TPA Integration** - Full integration with Third-Party Administrator (TPA) workflow

---

## Database Schema Changes

### Admission Model Updates

The `Admission` model has been enhanced with the following fields:

```prisma
model Admission {
  id                   String    @id @default(uuid())
  encounterId          String    @unique
  patientId            String
  admissionDate        DateTime  @default(now())
  dischargeDate        DateTime?
  bedId                String?
  admittingDoctorId    String?
  status               String    @default("active")
  diagnosis            String?

  // NEW INSURANCE FIELDS
  patientInsuranceId   String?     // Links to patient's insurance policy
  preAuthorizationId   String?     // Links to pre-authorization if applicable
  insuranceVerified    Boolean   @default(false)  // Whether insurance was verified
  insuranceVerifiedAt  DateTime?   // When insurance was verified

  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  // Relations...
}
```

### Existing Models Used

The implementation leverages these existing models:

1. **PatientInsurance** - Stores patient insurance policies
   - Fields: `policyNumber`, `policyHolderName`, `validFrom`, `validTill`, `sumInsured`, `tpaId`

2. **PreAuthorization** - Stores pre-authorization requests
   - Fields: `status`, `requestedAmount`, `approvedAmount`, `approvalNumber`, `validTill`

3. **TPAMaster** - Third-Party Administrator (insurance company) details
   - Fields: `name`, `type`, `contact`, `email`, `creditLimit`, `discountPercent`

4. **Claim** - Insurance claims (already supports `admissionId` field)
   - Can be linked to admissions for claim processing

---

## API Endpoints

### 1. Verify Patient Insurance

**Endpoint:** `POST /api/insurance/verify`

**Purpose:** Verify if a patient's insurance policy is valid and active.

**Request Body:**
```json
{
  "patientId": "uuid",
  "policyNumber": "POL123456",
  "tpaId": "uuid"
}
```

**Response:**
```json
{
  "verified": true,
  "coverageStatus": "valid",  // or "expired", "not_started"
  "message": "Insurance verified successfully",
  "insurance": {
    "id": "uuid",
    "policyNumber": "POL123456",
    "policyHolderName": "John Doe",
    "validFrom": "2024-01-01T00:00:00.000Z",
    "validTill": "2024-12-31T23:59:59.000Z",
    "sumInsured": "500000.00",
    "tpa": {
      "id": "uuid",
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

**Validation Checks:**
- Policy exists and is active
- Policy dates are valid (not expired, not future-dated)
- TPA is linked correctly

---

### 2. Get Patient's Insurance Policies

**Endpoint:** `GET /api/insurance/patient/:patientId`

**Purpose:** Retrieve all insurance policies for a patient.

**Response:**
```json
[
  {
    "id": "uuid",
    "patientId": "uuid",
    "tpaId": "uuid",
    "policyNumber": "POL123456",
    "policyHolderName": "John Doe",
    "validFrom": "2024-01-01T00:00:00.000Z",
    "validTill": "2024-12-31T23:59:59.000Z",
    "sumInsured": "500000.00",
    "isActive": true,
    "status": "active",  // active, expired, not_started, inactive
    "tpa": {
      "id": "uuid",
      "name": "Star Health Insurance",
      "type": "insurance"
    }
  }
]
```

---

### 3. Request Pre-Authorization

**Endpoint:** `POST /api/insurance/pre-auth/request`

**Purpose:** Create a pre-authorization request for a planned admission or procedure.

**Request Body:**
```json
{
  "patientId": "uuid",
  "tpaId": "uuid",
  "requestedAmount": 150000,
  "diagnosis": "Acute appendicitis",
  "procedurePlanned": "Laparoscopic appendectomy",
  "remarks": "Emergency surgery required"
}
```

**Response:**
```json
{
  "id": "uuid",
  "patientId": "uuid",
  "tpaId": "uuid",
  "requestDate": "2024-12-31T08:00:00.000Z",
  "status": "pending",
  "requestedAmount": "150000.00",
  "diagnosis": "Acute appendicitis",
  "procedurePlanned": "Laparoscopic appendectomy",
  "remarks": "Emergency surgery required",
  "patient": {
    "id": "uuid",
    "mrn": "MRN001",
    "name": "John Doe",
    "contact": "+91-9876543210"
  },
  "tpa": {
    "id": "uuid",
    "name": "Star Health Insurance",
    "type": "insurance",
    "contactPerson": "Jane Smith",
    "contact": "+91-9876543210",
    "email": "support@starhealth.com"
  }
}
```

**Validation:**
- Verifies patient has active insurance with the specified TPA
- Creates pre-auth in "pending" status

---

### 4. Get Pre-Authorization Details

**Endpoint:** `GET /api/insurance/pre-auth/:id`

**Purpose:** Get details of a specific pre-authorization.

**Response:**
```json
{
  "id": "uuid",
  "patientId": "uuid",
  "tpaId": "uuid",
  "requestDate": "2024-12-31T08:00:00.000Z",
  "approvalDate": "2024-12-31T10:00:00.000Z",
  "status": "approved",
  "requestedAmount": "150000.00",
  "approvedAmount": "125000.00",
  "approvalNumber": "AUTH123456",
  "validTill": "2025-01-15T23:59:59.000Z",
  "diagnosis": "Acute appendicitis",
  "procedurePlanned": "Laparoscopic appendectomy",
  "remarks": "Approved with reduced amount",
  "patient": { /* patient details */ },
  "tpa": { /* TPA details */ }
}
```

---

### 5. Approve Pre-Authorization

**Endpoint:** `PUT /api/insurance/pre-auth/:id/approve`

**Purpose:** Approve a pre-authorization request (TPA workflow).

**Request Body:**
```json
{
  "approvedAmount": 125000,
  "approvalNumber": "AUTH123456",
  "validTill": "2025-01-15T23:59:59.000Z",
  "remarks": "Approved with conditions"
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "approved",
  "approvedAmount": "125000.00",
  "approvalNumber": "AUTH123456",
  "approvalDate": "2024-12-31T10:00:00.000Z",
  "validTill": "2025-01-15T23:59:59.000Z",
  /* ... other fields ... */
}
```

**Validation:**
- Pre-auth must be in "pending" status
- Requires approval number and amount

---

### 6. Reject Pre-Authorization

**Endpoint:** `PUT /api/insurance/pre-auth/:id/reject`

**Purpose:** Reject a pre-authorization request.

**Request Body:**
```json
{
  "remarks": "Procedure not covered under policy"
}
```

---

### 7. List Pre-Authorizations

**Endpoint:** `GET /api/insurance/pre-auth`

**Query Parameters:**
- `status` - Filter by status (pending, approved, rejected)
- `patientId` - Filter by patient
- `tpaId` - Filter by TPA

**Response:** Array of pre-authorization objects

---

### 8. Enhanced Admission Creation

**Endpoint:** `POST /api/admissions` (Modified)

**Purpose:** Create admission with optional insurance verification.

**Request Body:**
```json
{
  "encounterId": "uuid",
  "patientId": "uuid",
  "bedId": "uuid",
  "diagnosis": "Acute appendicitis",

  // NEW INSURANCE FIELDS (optional)
  "patientInsuranceId": "uuid",        // Link to insurance policy
  "preAuthorizationId": "uuid",        // Link to pre-auth
  "requireInsurance": false             // Force insurance requirement
}
```

**Insurance Verification Logic:**

1. **If `requireInsurance` is true:**
   - `patientInsuranceId` becomes mandatory
   - Admission fails if insurance is not provided or invalid

2. **If `patientInsuranceId` is provided:**
   - System verifies the insurance is:
     - Valid (exists in database)
     - Active (`isActive = true`)
     - Not expired (current date is between `validFrom` and `validTill`)
   - Sets `insuranceVerified = true` and `insuranceVerifiedAt` on success

3. **If `preAuthorizationId` is provided:**
   - System verifies the pre-auth is:
     - Valid (exists in database)
     - Approved (`status = 'approved'`)
     - Not expired (if `validTill` is set)
     - For the same patient
   - Links pre-auth to admission

**Response:**
```json
{
  "id": "uuid",
  "encounterId": "uuid",
  "patientId": "uuid",
  "bedId": "uuid",
  "admittingDoctorId": "uuid",
  "diagnosis": "Acute appendicitis",
  "status": "active",
  "patientInsuranceId": "uuid",
  "preAuthorizationId": "uuid",
  "insuranceVerified": true,
  "insuranceVerifiedAt": "2024-12-31T08:00:00.000Z",
  "admissionDate": "2024-12-31T08:00:00.000Z",
  "patient": { /* patient details */ },
  "bed": { /* bed details */ }
}
```

---

## RBAC Permissions

The following permissions have been added for insurance operations:

- `insurance:verify` - Verify patient insurance
- `insurance:view` - View insurance policies and pre-authorizations
- `insurance:pre_auth` - Request pre-authorizations
- `insurance:approve` - Approve/reject pre-authorizations

These permissions are configured in:
- `/src/routes/index.ts` - Route permission mappings
- `/src/middleware/rbacMiddleware.ts` - RBAC middleware

---

## Implementation Files

### New Files Created

1. **`/src/routes/insurance.ts`**
   - Contains all insurance verification and pre-authorization endpoints
   - Implements business logic for insurance operations
   - Integrated as Express router

2. **`/src/routes/admissions-insurance.ts`**
   - Enhanced admission creation function with insurance verification
   - Can be used to replace the existing admission endpoint
   - Contains the `createAdmissionWithInsurance` function

3. **`INSURANCE_VERIFICATION_IMPLEMENTATION.md`** (this file)
   - Complete documentation of the implementation

### Modified Files

1. **`/prisma/schema.prisma`**
   - Updated `Admission` model with insurance fields
   - Already had `PatientInsurance`, `PreAuthorization`, `TPAMaster`, and `Claim` models

2. **`/src/server.ts`**
   - Added import for insurance routes
   - Mounted insurance router at `/api/insurance`

3. **`/src/routes/index.ts`**
   - Added permission mappings for insurance endpoints

4. **`/src/middleware/rbacMiddleware.ts`**
   - Added insurance route permissions

---

## Integration with Existing TPA Claim Workflow

The insurance verification system integrates seamlessly with the existing TPA claim workflow:

### Claim Model (Existing)
```prisma
model Claim {
  id                    String       @id @default(uuid())
  tenantId              String
  claimNumber           String       @unique
  patientId             String
  patientInsuranceId    String?      // Link to patient insurance
  insuranceCompanyId    String?      // Link to TPAMaster
  invoiceId             String?
  admissionId           String?      // Link to admission
  claimType             String       // cashless, reimbursement
  claimAmount           Decimal
  approvedAmount        Decimal
  rejectedAmount        Decimal
  status                String       // submitted, under_review, approved, rejected, settled
  // ... other fields
}
```

### Workflow Integration

1. **At Admission:**
   - Insurance is verified
   - Pre-authorization is linked
   - Admission records insurance and pre-auth IDs

2. **During Treatment:**
   - All charges are tracked against the admission
   - Pre-auth approved amount is reference for coverage limits

3. **At Discharge/Billing:**
   - Create claim using admission's insurance details
   - Link claim to admission via `admissionId`
   - Link to insurance via `patientInsuranceId`
   - Link to TPA via `insuranceCompanyId` (same as TPA)
   - Use pre-auth approved amount as reference

4. **Claim Processing:**
   - Submit claim to TPA
   - Track approval/rejection
   - Process settlement

---

## Usage Examples

### Example 1: Admission with Insurance Verification

```bash
# Step 1: Get patient's insurance policies
GET /api/insurance/patient/patient-uuid-123

# Step 2: Verify specific insurance
POST /api/insurance/verify
{
  "patientId": "patient-uuid-123",
  "policyNumber": "POL123456",
  "tpaId": "tpa-uuid-456"
}

# Step 3: Create admission with insurance
POST /api/admissions
{
  "encounterId": "encounter-uuid-789",
  "patientId": "patient-uuid-123",
  "bedId": "bed-uuid-012",
  "diagnosis": "Acute appendicitis",
  "patientInsuranceId": "insurance-uuid-345"
}
```

### Example 2: Admission with Pre-Authorization

```bash
# Step 1: Request pre-authorization
POST /api/insurance/pre-auth/request
{
  "patientId": "patient-uuid-123",
  "tpaId": "tpa-uuid-456",
  "requestedAmount": 150000,
  "diagnosis": "Acute appendicitis",
  "procedurePlanned": "Laparoscopic appendectomy"
}

# Step 2: TPA approves pre-auth (via TPA workflow or manual approval)
PUT /api/insurance/pre-auth/preauth-uuid-678/approve
{
  "approvedAmount": 125000,
  "approvalNumber": "AUTH123456",
  "validTill": "2025-01-15T23:59:59.000Z"
}

# Step 3: Create admission with pre-auth
POST /api/admissions
{
  "encounterId": "encounter-uuid-789",
  "patientId": "patient-uuid-123",
  "bedId": "bed-uuid-012",
  "diagnosis": "Acute appendicitis",
  "patientInsuranceId": "insurance-uuid-345",
  "preAuthorizationId": "preauth-uuid-678"
}
```

### Example 3: Mandatory Insurance Admission

```bash
# Create admission that REQUIRES insurance
POST /api/admissions
{
  "encounterId": "encounter-uuid-789",
  "patientId": "patient-uuid-123",
  "bedId": "bed-uuid-012",
  "diagnosis": "Acute appendicitis",
  "requireInsurance": true,
  "patientInsuranceId": "insurance-uuid-345"
}

# If insurance is not provided or invalid, returns error:
{
  "error": "Insurance is required for admission but no insurance policy was provided"
}
```

---

## Testing the Implementation

### 1. Test Insurance Verification

```bash
curl -X POST http://localhost:4000/api/insurance/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-uuid",
    "policyNumber": "POL123456",
    "tpaId": "tpa-uuid"
  }'
```

### 2. Test Pre-Authorization Request

```bash
curl -X POST http://localhost:4000/api/insurance/pre-auth/request \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-uuid",
    "tpaId": "tpa-uuid",
    "requestedAmount": 150000,
    "diagnosis": "Test diagnosis",
    "procedurePlanned": "Test procedure"
  }'
```

### 3. Test Admission with Insurance

```bash
curl -X POST http://localhost:4000/api/admissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "encounterId": "encounter-uuid",
    "patientId": "patient-uuid",
    "bedId": "bed-uuid",
    "diagnosis": "Test diagnosis",
    "patientInsuranceId": "insurance-uuid"
  }'
```

---

## Migration Instructions

The database schema changes have been applied using Prisma. The changes are backward compatible:

1. All new fields in `Admission` model are optional
2. Existing admissions will have `insuranceVerified = false` by default
3. New admissions can optionally include insurance information

No data migration is required.

---

## Security Considerations

1. **Authentication:** All endpoints require authentication via JWT token
2. **RBAC:** Proper role-based permissions are enforced
3. **Validation:**
   - All inputs are validated
   - Insurance dates are checked
   - Pre-auth status is verified
   - Patient-insurance matching is validated
4. **Audit Trail:** All insurance operations can be logged via existing audit system

---

## Next Steps / Future Enhancements

1. **Webhook Integration:**
   - Notify TPA on pre-auth requests
   - Receive approval/rejection from TPA systems

2. **Coverage Limits:**
   - Track utilized amount vs. approved amount
   - Alert when approaching limits

3. **Multi-Insurance Support:**
   - Support for multiple concurrent insurance policies
   - Primary/secondary insurance logic

4. **Document Management:**
   - Attach supporting documents to pre-auth requests
   - Store approval letters

5. **Reporting:**
   - Insurance utilization reports
   - Pre-auth approval rates
   - TPA performance metrics

---

## Support and Troubleshooting

### Common Issues

**Issue:** "Insurance policy not found or inactive"
- **Solution:** Verify the insurance policy exists and `isActive = true`

**Issue:** "Insurance policy has expired"
- **Solution:** Check `validTill` date and update policy if needed

**Issue:** "Pre-authorization already approved/rejected"
- **Solution:** Pre-auth can only be approved/rejected when in "pending" status

**Issue:** "No active insurance found for this patient with the specified TPA"
- **Solution:** Ensure patient has an active insurance policy with the TPA before requesting pre-auth

---

## Conclusion

This implementation provides a complete insurance verification workflow integrated with the Hospital ERP admission process. It supports:

- Real-time insurance verification
- Pre-authorization management
- Insurance-linked admissions
- Integration with existing TPA and claim workflows

The system is designed to be flexible, allowing both insurance-required and optional insurance workflows based on hospital policies.
