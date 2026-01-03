# Insurance Eligibility Verification System

## Overview

This document describes the real-time insurance eligibility verification system implemented for the Hospital ERP. The system provides comprehensive eligibility checking, coverage limit validation, utilization tracking, and automatic verification during admission workflows.

## Features

1. **Real-time Eligibility Verification**
   - Verify patient insurance validity and active status
   - Check policy dates (validFrom, validTill)
   - Calculate remaining coverage
   - Results cached in Redis for 1 hour

2. **Coverage Limit Checking**
   - Verify if requested amount can be covered
   - Check against remaining coverage
   - Apply TPA discounts if available

3. **Utilization Tracking**
   - Track cumulative insurance utilization
   - Maintain historical eligibility checks
   - Monitor coverage consumption against sum insured

4. **Automated Integration**
   - Auto-verify eligibility on IPD admission
   - Auto-verify on pre-authorization requests
   - Check coverage limits before approving claims

## Database Schema Changes

### New Model: `InsuranceEligibilityCheck`

```prisma
model InsuranceEligibilityCheck {
  id                   String            @id @default(uuid())
  tenantId             String
  patientInsuranceId   String
  checkedAt            DateTime          @default(now())
  checkedBy            String?           // User ID who triggered the check
  status               String            // eligible, not_eligible, expired, not_started, limit_exceeded, pending_verification
  coverageDetails      Json?             // Detailed coverage information
  sumInsured           Decimal           @db.Decimal(12, 2)
  usedAmount           Decimal           @db.Decimal(12, 2)
  remainingAmount      Decimal           @db.Decimal(12, 2)
  verificationSource   String            @default("manual") // manual, api, cached
  verificationResponse Json?             // Raw response from external API
  expiresAt            DateTime?         // Cache expiration time
  remarks              String?
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt
  patientInsurance     PatientInsurance  @relation(fields: [patientInsuranceId], references: [id])
}
```

### Updated Model: `PatientInsurance`

Added new field:
- `usedAmount` (Decimal, default 0): Tracks cumulative utilization against sum insured

## API Endpoints

### 1. Verify Eligibility

**Endpoint:** `POST /api/insurance/verify-eligibility`

**Description:** Real-time insurance eligibility check

**Request Body:**
```json
{
  "patientId": "string",
  "tpaId": "string",
  "serviceDate": "2025-01-15T10:00:00Z" // Optional, defaults to current date
}
```

**Response:**
```json
{
  "isEligible": true,
  "status": "eligible",
  "sumInsured": 500000.00,
  "usedAmount": 125000.00,
  "remainingAmount": 375000.00,
  "validFrom": "2024-01-01T00:00:00Z",
  "validTill": "2025-12-31T23:59:59Z",
  "policyNumber": "POL123456",
  "policyHolderName": "John Doe",
  "tpaName": "Star Health Insurance",
  "message": "Insurance is valid and active",
  "checkId": "uuid",
  "cachedResult": false
}
```

**Status Values:**
- `eligible`: Insurance is valid and active
- `not_eligible`: No active insurance found
- `expired`: Insurance policy has expired
- `not_started`: Insurance policy not yet active
- `limit_exceeded`: Coverage limit exceeded

### 2. Get Coverage Details

**Endpoint:** `GET /api/insurance/coverage/:patientInsuranceId`

**Description:** Get coverage details and remaining amount

**Response:**
```json
{
  "totalUsed": 125000.00,
  "sumInsured": 500000.00,
  "remainingCoverage": 375000.00,
  "utilizationPercentage": 25.00,
  "recentChecks": [
    {
      "id": "uuid",
      "checkedAt": "2025-01-15T10:00:00Z",
      "status": "eligible",
      "usedAmount": 125000.00,
      "remainingAmount": 375000.00
    }
  ]
}
```

### 3. Check Coverage Limit

**Endpoint:** `POST /api/insurance/coverage/:patientInsuranceId/check-limit`

**Description:** Check if a specific amount can be covered

**Request Body:**
```json
{
  "amount": 50000.00
}
```

**Response:**
```json
{
  "canCover": true,
  "requestedAmount": 50000.00,
  "remainingCoverage": 375000.00,
  "message": "Coverage is sufficient. 325000.00 remaining after this claim."
}
```

### 4. Get Utilization History

**Endpoint:** `GET /api/insurance/utilization/:patientInsuranceId?limit=20`

**Description:** Get utilization history with eligibility checks

**Response:**
```json
{
  "totalUsed": 125000.00,
  "sumInsured": 500000.00,
  "remainingCoverage": 375000.00,
  "utilizationPercentage": 25.00,
  "recentChecks": [...],
  "history": [
    {
      "id": "uuid",
      "checkedAt": "2025-01-15T10:00:00Z",
      "checkedBy": "user-uuid",
      "status": "eligible",
      "sumInsured": 500000.00,
      "usedAmount": 125000.00,
      "remainingAmount": 375000.00,
      "verificationSource": "manual",
      "policyNumber": "POL123456",
      "tpaName": "Star Health Insurance"
    }
  ]
}
```

### 5. Update Insurance Utilization

**Endpoint:** `POST /api/insurance/utilization/:patientInsuranceId/update`

**Description:** Update insurance utilization after a claim or charge

**Request Body:**
```json
{
  "amount": 25000.00,
  "description": "IPD Admission Charges"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Insurance utilization updated successfully",
  "coverage": {
    "totalUsed": 150000.00,
    "sumInsured": 500000.00,
    "remainingCoverage": 350000.00,
    "utilizationPercentage": 30.00,
    "recentChecks": [...]
  }
}
```

### 6. Get Eligibility History

**Endpoint:** `GET /api/insurance/eligibility-history/:patientInsuranceId?limit=20`

**Description:** Get eligibility check history for a policy

**Response:**
```json
[
  {
    "id": "uuid",
    "checkedAt": "2025-01-15T10:00:00Z",
    "checkedBy": "user-uuid",
    "status": "eligible",
    "sumInsured": 500000.00,
    "usedAmount": 125000.00,
    "remainingAmount": 375000.00,
    "verificationSource": "manual",
    "expiresAt": "2025-01-15T11:00:00Z",
    "remarks": null,
    "policyNumber": "POL123456",
    "tpaName": "Star Health Insurance"
  }
]
```

## Service Functions

The `insuranceEligibility.ts` service provides the following functions:

### `verifyEligibility()`

```typescript
async function verifyEligibility(
  patientId: string,
  tpaId: string,
  serviceDate: Date,
  tenantId: string,
  checkedBy?: string
): Promise<EligibilityResult>
```

- Verifies insurance eligibility for a patient and TPA
- Checks validity dates and active status
- Calculates remaining coverage
- Creates eligibility check record
- Caches result in Redis for 1 hour

### `checkCoverageLimit()`

```typescript
async function checkCoverageLimit(
  patientInsuranceId: string,
  amount: number
): Promise<CoverageCheck>
```

- Checks if requested amount can be covered
- Compares against remaining coverage
- Applies TPA discounts if available

### `getRemainingCoverage()`

```typescript
async function getRemainingCoverage(
  patientInsuranceId: string
): Promise<UtilizationHistory>
```

- Returns current coverage utilization
- Includes recent eligibility checks
- Calculates utilization percentage

### `updateInsuranceUtilization()`

```typescript
async function updateInsuranceUtilization(
  patientInsuranceId: string,
  amount: number,
  tenantId: string,
  description?: string
): Promise<void>
```

- Updates used amount for insurance policy
- Invalidates eligibility cache
- Should be called when processing claims or charges

### `invalidateEligibilityCache()`

```typescript
async function invalidateEligibilityCache(
  patientId: string,
  tpaId?: string
): Promise<void>
```

- Invalidates cached eligibility results
- Call when insurance details are updated

### `getEligibilityHistory()`

```typescript
async function getEligibilityHistory(
  patientInsuranceId: string,
  limit: number = 20
)
```

- Returns eligibility check history
- Includes check details and results

## Integration Points

### 1. Admission Workflow

The admission endpoint (`/api/admissions`) now automatically:
- Verifies insurance eligibility when `patientInsuranceId` is provided
- Checks coverage limit if `estimatedCharges` is provided
- Returns eligibility status in admission response
- Blocks admission if insurance is not eligible (unless override is allowed)

**Enhanced Admission Request:**
```json
{
  "encounterId": "uuid",
  "patientId": "uuid",
  "bedId": "uuid",
  "diagnosis": "Fever and cough",
  "patientInsuranceId": "uuid",
  "preAuthorizationId": "uuid",
  "estimatedCharges": 50000.00  // Optional
}
```

**Enhanced Admission Response:**
```json
{
  "id": "uuid",
  "encounterId": "uuid",
  "patientId": "uuid",
  "insuranceVerified": true,
  "insuranceVerifiedAt": "2025-01-15T10:00:00Z",
  "insuranceCoverage": {
    "canCover": true,
    "requestedAmount": 50000.00,
    "remainingCoverage": 375000.00,
    "message": "Coverage is sufficient. 325000.00 remaining after this claim."
  },
  "eligibilityCheckId": "uuid",
  ...
}
```

### 2. Pre-Authorization Workflow

The pre-authorization endpoint (`/api/insurance/pre-auth/request`) now:
- Auto-verifies eligibility before creating pre-auth request
- Checks coverage limit against requested amount
- Adds warning to remarks if coverage is insufficient
- Still allows pre-auth creation but with warnings

### 3. Claims Processing

When processing claims:
1. Check coverage limit before approval
2. Update insurance utilization after approval
3. Track against remaining coverage

**Example Integration:**
```typescript
// Before approving claim
const coverageCheck = await checkCoverageLimit(patientInsuranceId, claimAmount);
if (!coverageCheck.canCover) {
  // Handle insufficient coverage
  // Either reject or require patient co-payment
}

// After claim approval
await updateInsuranceUtilization(
  patientInsuranceId,
  approvedAmount,
  tenantId,
  'Claim approved'
);
```

## Redis Caching

Eligibility results are cached in Redis with:
- **TTL:** 1 hour (3600 seconds)
- **Key Format:** `insurance:eligibility:patientId:{id}|tpaId:{id}|date:{date}`
- **Auto-Invalidation:** Cache is cleared when insurance utilization is updated

**Benefits:**
- Reduces database load
- Faster response times for repeated checks
- Consistent results within cache window

## Error Handling

All endpoints include comprehensive error handling:

```typescript
try {
  // Operation
} catch (error) {
  console.error('Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error instanceof Error ? error.message : 'Unknown error'
  });
}
```

**Common Error Responses:**

1. **Missing Required Fields (400)**
```json
{
  "error": "Missing required fields: patientId, tpaId"
}
```

2. **Insurance Not Found (404)**
```json
{
  "error": "Insurance policy not found"
}
```

3. **Eligibility Failed (400)**
```json
{
  "error": "Insurance eligibility verification failed: Insurance policy has expired",
  "eligibility": { ... }
}
```

## Permissions

All endpoints require appropriate permissions:

- `insurance:verify` - Verify eligibility and check limits
- `insurance:view` - View coverage and utilization
- `insurance:approve` - Update utilization (manual adjustments)

## Testing

### Example Test Flow

1. **Create Test Insurance Policy:**
```sql
INSERT INTO patient_insurances (
  id, patient_id, tpa_id, policy_number,
  valid_from, valid_till, sum_insured, used_amount
) VALUES (
  'test-insurance-id',
  'test-patient-id',
  'test-tpa-id',
  'POL123456',
  '2024-01-01',
  '2025-12-31',
  500000.00,
  0.00
);
```

2. **Test Eligibility Verification:**
```bash
curl -X POST http://localhost:3000/api/insurance/verify-eligibility \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "patientId": "test-patient-id",
    "tpaId": "test-tpa-id"
  }'
```

3. **Test Coverage Check:**
```bash
curl -X POST http://localhost:3000/api/insurance/coverage/test-insurance-id/check-limit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"amount": 50000}'
```

4. **Test Admission with Insurance:**
```bash
curl -X POST http://localhost:3000/api/admissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "encounterId": "test-encounter-id",
    "patientId": "test-patient-id",
    "bedId": "test-bed-id",
    "diagnosis": "Test diagnosis",
    "patientInsuranceId": "test-insurance-id",
    "estimatedCharges": 50000
  }'
```

## Production Considerations

1. **External TPA API Integration:**
   - Currently using manual verification
   - Can be extended to integrate with TPA APIs
   - Update `verificationSource` to 'api' when using external APIs
   - Store API responses in `verificationResponse` field

2. **Monitoring:**
   - Monitor cache hit rates
   - Track eligibility check volumes
   - Alert on high rejection rates

3. **Performance:**
   - Redis caching reduces database load
   - Indexes on `patientInsuranceId`, `checkedAt`, `status`
   - Consider pagination for history endpoints

4. **Security:**
   - All endpoints require authentication
   - Role-based permissions enforced
   - Sensitive data logged securely

## Future Enhancements

1. **Real-time TPA API Integration:**
   - Integrate with insurance company APIs
   - Automatic eligibility verification
   - Real-time claim status updates

2. **Advanced Analytics:**
   - Utilization trends by TPA
   - Coverage exhaustion predictions
   - Denial rate analysis

3. **Automated Alerts:**
   - Alert when coverage drops below threshold
   - Notify when policy nearing expiration
   - Alert on high utilization patterns

4. **Mobile App Integration:**
   - Patient-facing eligibility check
   - Real-time coverage balance
   - Claim status tracking

## Support

For issues or questions:
- Review logs in `logs/` directory
- Check Redis connection status
- Verify database migrations applied
- Contact: support@hospitalerp.com
