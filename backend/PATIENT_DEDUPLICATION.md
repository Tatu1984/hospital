# Patient Deduplication System

## Overview

The Patient Deduplication System provides comprehensive duplicate detection and merging capabilities for patient records in the Hospital ERP. It uses advanced fuzzy matching algorithms to identify potential duplicates and allows authorized users to merge duplicate records.

## Features

1. **Automatic Duplicate Detection**: Checks for duplicates during patient registration
2. **Fuzzy Matching Algorithms**: Uses Levenshtein distance for intelligent name matching
3. **Multi-field Matching**: Considers name, DOB, phone, email, and address
4. **Confidence Scoring**: Provides 0-100 match scores with categorized confidence levels
5. **Safe Patient Merging**: Transfers all related records to the primary patient
6. **Database Indexing**: Optimized queries for efficient duplicate searching

## Architecture

### Components

1. **Service Layer** (`src/services/patientDeduplication.ts`)
   - Core deduplication logic
   - Fuzzy matching algorithms
   - Patient merging functionality

2. **API Endpoints** (`src/server.ts`)
   - POST `/api/patients/check-duplicates` - Check for duplicates before registration
   - GET `/api/patients/:id/potential-duplicates` - Find duplicates for existing patient
   - POST `/api/patients/merge` - Merge two patient records

3. **Database Indexes** (`prisma/schema.prisma`)
   - Composite indexes on tenantId + name, contact, email, dob
   - Enables fast duplicate searching

## Matching Algorithm

### Scoring System (0-100 points)

The matching algorithm uses a weighted scoring system:

1. **Name Similarity**: 40 points
   - Uses Levenshtein distance algorithm
   - Considers full name and partial name matches
   - Normalizes names (lowercase, removes special characters)

2. **Date of Birth**: 25 points
   - Exact match required for points
   - Day, month, and year must all match

3. **Phone Number**: 20 points
   - Normalizes phone numbers (removes non-digits)
   - Matches last 10 digits (handles country codes)
   - Exact match required for points

4. **Email**: 10 points
   - Case-insensitive exact match
   - Normalized (trimmed, lowercase)

5. **Address**: 5 points
   - Similarity score >= 80% required
   - Normalized comparison

### Confidence Levels

- **High Confidence**: Score >= 85
- **Medium Confidence**: Score >= 70 and < 85
- **Low Confidence**: Score >= 60 and < 70
- **Not Considered**: Score < 60

## API Usage

### 1. Check for Duplicates Before Registration

**Endpoint**: `POST /api/patients/check-duplicates`

**Permission Required**: `patients:view`

**Request Body**:
```json
{
  "name": "John Doe",
  "dob": "1990-05-15",
  "contact": "9876543210",
  "email": "john.doe@example.com",
  "address": "123 Main Street",
  "gender": "Male"
}
```

**Response** (200 OK):
```json
{
  "hasDuplicates": true,
  "count": 2,
  "duplicates": [
    {
      "id": "patient-uuid-1",
      "mrn": "MRN000123",
      "name": "John Doe",
      "dob": "1990-05-15T00:00:00.000Z",
      "contact": "9876543210",
      "email": "john.doe@example.com",
      "address": "123 Main St",
      "gender": "Male",
      "score": 95,
      "matchReasons": [
        "Name highly similar (100%)",
        "Date of birth matches",
        "Phone number matches",
        "Email matches"
      ],
      "confidenceLevel": "high"
    },
    {
      "id": "patient-uuid-2",
      "mrn": "MRN000456",
      "name": "Jon Doe",
      "dob": "1990-05-15T00:00:00.000Z",
      "contact": "9876543210",
      "email": null,
      "address": null,
      "gender": "Male",
      "score": 75,
      "matchReasons": [
        "Name similar (85%)",
        "Date of birth matches",
        "Phone number matches"
      ],
      "confidenceLevel": "medium"
    }
  ]
}
```

### 2. Patient Registration with Duplicate Detection

**Endpoint**: `POST /api/patients`

**Permission Required**: `patients:create`

**Behavior**:
- Automatically checks for duplicates before creating
- If high-confidence duplicates found (score >= 70), returns 409 Conflict
- To force creation despite duplicates, include `"forceCreate": true` in request body

**Request Body**:
```json
{
  "name": "John Doe",
  "dob": "1990-05-15",
  "contact": "9876543210",
  "email": "john.doe@example.com",
  "address": "123 Main Street",
  "gender": "Male",
  "bloodGroup": "O+",
  "forceCreate": false
}
```

**Response** (409 Conflict - Duplicates Found):
```json
{
  "error": "POTENTIAL_DUPLICATE",
  "message": "Potential duplicate patients found. Please review or use forceCreate option.",
  "duplicates": [
    {
      "id": "patient-uuid-1",
      "mrn": "MRN000123",
      "name": "John Doe",
      "dob": "1990-05-15T00:00:00.000Z",
      "contact": "9876543210",
      "email": "john.doe@example.com",
      "address": "123 Main St",
      "score": 95,
      "matchReasons": [
        "Name highly similar (100%)",
        "Date of birth matches",
        "Phone number matches",
        "Email matches"
      ]
    }
  ]
}
```

**To Force Create**:
```json
{
  "name": "John Doe",
  "dob": "1990-05-15",
  "contact": "9876543210",
  "forceCreate": true
}
```

### 3. Find Duplicates for Existing Patient

**Endpoint**: `GET /api/patients/:id/potential-duplicates`

**Permission Required**: `patients:view`

**Response** (200 OK):
```json
{
  "patient": {
    "id": "patient-uuid-1",
    "mrn": "MRN000123",
    "name": "John Doe",
    "dob": "1990-05-15T00:00:00.000Z",
    "contact": "9876543210",
    "email": "john.doe@example.com"
  },
  "stats": {
    "totalPotentialDuplicates": 3,
    "highConfidence": 1,
    "mediumConfidence": 1,
    "lowConfidence": 1
  },
  "duplicates": [
    {
      "id": "patient-uuid-2",
      "mrn": "MRN000456",
      "name": "Jon Doe",
      "dob": "1990-05-15T00:00:00.000Z",
      "contact": "9876543210",
      "email": null,
      "address": "123 Main St",
      "gender": "Male",
      "bloodGroup": "O+",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "score": 88,
      "matchReasons": [
        "Name similar (90%)",
        "Date of birth matches",
        "Phone number matches"
      ],
      "confidenceLevel": "high"
    }
  ]
}
```

### 4. Merge Patient Records

**Endpoint**: `POST /api/patients/merge`

**Permission Required**: `patients:edit` (Admin only)

**Request Body**:
```json
{
  "primaryId": "patient-uuid-1",
  "duplicateId": "patient-uuid-2"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Patients merged successfully",
  "primaryPatient": {
    "id": "patient-uuid-1",
    "mrn": "MRN000123",
    "name": "John Doe",
    "dob": "1990-05-15T00:00:00.000Z",
    "contact": "9876543210",
    "email": "john.doe@example.com"
  },
  "mergedData": {
    "duplicateId": "patient-uuid-2",
    "recordsTransferred": {
      "appointments": 5,
      "encounters": 3,
      "admissions": 1,
      "invoices": 4,
      "orders": 7,
      "documents": 2
    }
  }
}
```

## Merge Operation Details

### What Gets Merged

When merging patients, the following records are transferred from the duplicate to the primary patient:

1. **Clinical Records**
   - Appointments
   - Encounters
   - OPD Notes
   - Admissions
   - Prescriptions

2. **Billing Records**
   - Invoices
   - Orders

3. **Administrative Records**
   - Documents
   - Feedbacks
   - Incidents
   - Diet Orders
   - Pre-authorizations
   - Patient Insurances
   - Commissions
   - Critical Alerts

4. **Data Consolidation**
   - Missing fields in primary patient are filled from duplicate patient
   - Fields include: contact, email, address, DOB, gender, blood group, allergies, emergency contact

### Transaction Safety

- All merge operations are performed in a database transaction
- If any step fails, all changes are rolled back
- The duplicate patient record is deleted only after all transfers succeed

## Database Migration

After modifying the schema to add indexes, run the migration:

```bash
npx prisma migrate dev --name add_patient_deduplication_indexes
```

Or for production:

```bash
npx prisma migrate deploy
```

## Performance Considerations

### Indexing Strategy

The system creates composite indexes for efficient searching:

```prisma
@@index([tenantId, name])
@@index([tenantId, contact])
@@index([tenantId, email])
@@index([tenantId, dob])
```

### Query Optimization

1. **Candidate Selection**: Uses database ILIKE for initial filtering
2. **Limit Results**: Fetches maximum 100 candidates per strategy
3. **Multi-Strategy**: Combines name, contact, and email searches
4. **Score Filtering**: Only returns matches with score >= 60

### Cache Invalidation

After patient creation or merge, the system invalidates Redis cache:

```typescript
await redisService.deletePattern(`patients:*tenantId:${tenantId}*`);
```

## Best Practices

### For Frontend Integration

1. **Pre-Registration Check**
   - Always call `/api/patients/check-duplicates` before showing registration form
   - Display duplicate warnings to users with match scores

2. **Review Workflow**
   - Show high-confidence duplicates (>= 85) prominently
   - Allow users to select existing patient or force create new

3. **Merge Confirmation**
   - Always confirm before merging
   - Display what records will be transferred
   - Show both patient records side-by-side for comparison

4. **Audit Trail**
   - Log all merge operations
   - Store who performed the merge and when

### For Administrators

1. **Regular Cleanup**
   - Periodically review patients with low-confidence duplicates
   - Set up scheduled jobs to identify high-confidence duplicates

2. **Training**
   - Train staff to recognize and handle duplicates
   - Establish clear guidelines for when to merge vs. keep separate

3. **Monitoring**
   - Monitor duplicate creation rates
   - Track merge operations and their success rate

## Testing

### Unit Tests

Test the matching algorithms:

```typescript
import { calculateSimilarity, phoneNumbersMatch } from './patientDeduplication';

test('name similarity calculation', () => {
  expect(calculateSimilarity('John Doe', 'Jon Doe')).toBeGreaterThan(80);
  expect(calculateSimilarity('John', 'Jane')).toBeLessThan(50);
});

test('phone number matching', () => {
  expect(phoneNumbersMatch('9876543210', '+919876543210')).toBe(true);
  expect(phoneNumbersMatch('9876543210', '1234567890')).toBe(false);
});
```

### Integration Tests

Test the complete workflow:

1. Create patient
2. Attempt to create duplicate (should be blocked)
3. Force create duplicate
4. Find duplicates
5. Merge patients
6. Verify records transferred

## Security Considerations

1. **Permission Checks**
   - Check duplicates: Requires `patients:view`
   - Merge patients: Requires `patients:edit` (admin-level)

2. **Tenant Isolation**
   - All operations are tenant-scoped
   - Cannot merge patients from different tenants

3. **Audit Logging**
   - All merge operations should be logged to audit trail
   - Include who, when, what was merged

## Troubleshooting

### Common Issues

1. **No duplicates found when expected**
   - Check if patients belong to same tenant
   - Verify field values (name spelling, phone format)
   - Lower the threshold score if needed

2. **Too many false positives**
   - Increase the confidence threshold
   - Adjust scoring weights in the algorithm

3. **Performance issues**
   - Ensure database indexes are created
   - Check candidate selection limits
   - Monitor database query performance

## Future Enhancements

1. **Machine Learning**
   - Train ML models on confirmed matches/non-matches
   - Adaptive scoring based on historical data

2. **Batch Processing**
   - Bulk duplicate detection
   - Automated merge suggestions

3. **Enhanced UI**
   - Visual diff of patient records
   - Smart merge conflict resolution

4. **Advanced Matching**
   - Soundex/Metaphone for name matching
   - Location-based matching
   - Biometric matching if available

## Support

For issues or questions:
- Check logs: `logs/combined.log`, `logs/error.log`
- Review audit logs for merge operations
- Contact system administrator
