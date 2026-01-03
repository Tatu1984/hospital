# Drug Interaction System - Testing Guide

## Quick Start Testing

### 1. Setup & Migration

```bash
# Navigate to backend directory
cd /Users/sudipto/Desktop/projects/hospitalerp/backend

# Run the migration
npx prisma migrate dev --name add_drug_interactions

# Or deploy migration in production
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 2. Integration into server.ts

Add this import at the top of `server.ts`:
```typescript
import drugInteractionRoutes from './routes/drugInteractionRoutes';
```

Add this line where other routes are registered:
```typescript
// After other route registrations
app.use('/api', drugInteractionRoutes);
```

## Test Scenarios with cURL

### Scenario 1: Check Major Interaction (Warfarin + Aspirin)

```bash
curl -X POST http://localhost:3000/api/drugs/check-interactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "drugIds": ["warfarin", "aspirin"],
    "patientAllergies": null
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "result": {
    "hasContraindications": false,
    "hasMajorInteractions": true,
    "interactions": [
      {
        "drug1Name": "Warfarin",
        "drug2Name": "Aspirin",
        "severity": "major",
        "description": "Increased bleeding risk",
        "clinicalEffect": "Enhanced anticoagulation and GI bleeding risk",
        "management": "Avoid combination or monitor closely with INR checks"
      }
    ],
    "allergyWarnings": [],
    "canProceed": true,
    "requiresOverride": true
  },
  "message": "Major interactions found - requires careful monitoring"
}
```

### Scenario 2: Check Contraindicated Interaction (Sildenafil + Nitrates)

```bash
curl -X POST http://localhost:3000/api/drugs/check-interactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "drugIds": ["sildenafil", "nitroglycerin"]
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "result": {
    "hasContraindications": true,
    "hasMajorInteractions": false,
    "interactions": [
      {
        "severity": "contraindicated",
        "description": "Profound hypotension",
        "clinicalEffect": "Severe hypotension, cardiovascular collapse",
        "management": "Absolute contraindication. Do not use together."
      }
    ],
    "canProceed": false,
    "requiresOverride": true
  },
  "message": "Contraindicated interactions found - cannot proceed"
}
```

### Scenario 3: Check Allergy Conflict (Penicillin Allergy + Amoxicillin)

```bash
curl -X POST http://localhost:3000/api/drugs/check-interactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "drugIds": ["amoxicillin"],
    "patientAllergies": "Penicillin"
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "result": {
    "hasContraindications": true,
    "allergyWarnings": [
      {
        "drugName": "Amoxicillin",
        "allergen": "Penicillin",
        "severity": "high",
        "recommendation": "AVOID: Patient allergic to Penicillin. High cross-reactivity risk."
      }
    ],
    "canProceed": false
  }
}
```

### Scenario 4: Multiple Drug Interaction Check

```bash
curl -X POST http://localhost:3000/api/drugs/check-interactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "drugIds": ["warfarin", "aspirin", "ciprofloxacin"],
    "patientAllergies": "Sulfa"
  }'
```

**Expected Result:**
- Multiple interactions detected
- Warfarin + Aspirin (major)
- Warfarin + Ciprofloxacin (major)
- All warnings and recommendations returned

### Scenario 5: Get All Interactions for a Drug

```bash
curl -X GET http://localhost:3000/api/drugs/{drugId}/interactions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Result:**
```json
{
  "success": true,
  "drug": {
    "id": "drug-uuid",
    "name": "Warfarin",
    "genericName": "Warfarin Sodium"
  },
  "interactions": [
    {
      "drug1Name": "Warfarin",
      "drug2Name": "Aspirin",
      "severity": "major",
      ...
    },
    ...
  ],
  "count": 8,
  "summary": {
    "contraindicated": 0,
    "major": 6,
    "moderate": 2,
    "minor": 0
  }
}
```

### Scenario 6: Add Patient Allergy

```bash
curl -X POST http://localhost:3000/api/patients/{patientId}/allergies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "allergen": "Penicillin",
    "reaction": "Severe rash and difficulty breathing",
    "severity": "severe",
    "onsetDate": "2023-05-15",
    "notes": "Required emergency treatment with epinephrine"
  }'
```

### Scenario 7: Get Patient Allergies

```bash
curl -X GET http://localhost:3000/api/patients/{patientId}/allergies \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Postman Collection

### Environment Variables
```json
{
  "base_url": "http://localhost:3000",
  "token": "your-jwt-token-here",
  "patient_id": "patient-uuid-here"
}
```

### Collection Requests

#### 1. Check Drug Interactions
- **Method:** POST
- **URL:** `{{base_url}}/api/drugs/check-interactions`
- **Headers:**
  - `Authorization: Bearer {{token}}`
  - `Content-Type: application/json`
- **Body:**
```json
{
  "drugIds": ["{{drug1_id}}", "{{drug2_id}}"],
  "patientAllergies": "Penicillin, Sulfa"
}
```

## Integration Testing Script

Create `test/drugInteractions.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { checkDrugInteractions, checkAllergyConflicts } from '../src/services/drugInteraction';

describe('Drug Interaction Service', () => {
  it('should detect major interaction between Warfarin and Aspirin', async () => {
    const result = await checkDrugInteractions(['warfarin', 'aspirin']);

    expect(result.hasMajorInteractions).toBe(true);
    expect(result.interactions.length).toBeGreaterThan(0);
    expect(result.interactions[0].severity).toBe('major');
  });

  it('should detect contraindicated interaction', async () => {
    const result = await checkDrugInteractions(['sildenafil', 'nitroglycerin']);

    expect(result.hasContraindications).toBe(true);
    expect(result.canProceed).toBe(false);
    expect(result.interactions[0].severity).toBe('contraindicated');
  });

  it('should detect allergy conflict', async () => {
    const result = await checkDrugInteractions(['amoxicillin'], 'Penicillin');

    expect(result.allergyWarnings.length).toBeGreaterThan(0);
    expect(result.allergyWarnings[0].severity).toBe('high');
  });

  it('should return no interactions for safe combination', async () => {
    const result = await checkDrugInteractions(['acetaminophen', 'vitamin-c']);

    expect(result.hasInteractions).toBe(false);
    expect(result.canProceed).toBe(true);
  });

  it('should handle multiple drugs correctly', async () => {
    const result = await checkDrugInteractions([
      'warfarin',
      'aspirin',
      'ibuprofen'
    ]);

    // Should detect multiple interactions
    expect(result.interactions.length).toBeGreaterThan(1);
  });
});
```

Run tests:
```bash
npm test -- drugInteractions.test.ts
```

## Frontend Testing Examples

### React/Next.js Component

```typescript
import { useState } from 'react';

function PrescriptionForm({ patientId, patientAllergies }) {
  const [selectedDrugs, setSelectedDrugs] = useState([]);
  const [interactions, setInteractions] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkInteractions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/drugs/check-interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          drugIds: selectedDrugs.map(d => d.id),
          patientAllergies
        })
      });

      const data = await response.json();
      setInteractions(data.result);

      if (data.result.hasContraindications) {
        alert('CONTRAINDICATED: Cannot prescribe these drugs together!');
        return false;
      }

      if (data.result.requiresOverride) {
        const confirm = window.confirm(
          'Major interactions detected. Do you want to proceed?'
        );
        return confirm;
      }

      return true;
    } catch (error) {
      console.error('Error checking interactions:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const canProceed = await checkInteractions();
    if (canProceed) {
      // Submit prescription
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Drug selection UI */}

      {interactions && (
        <div className="interactions-panel">
          {interactions.interactions.map(interaction => (
            <div
              key={interaction.drug1Id + interaction.drug2Id}
              className={`alert alert-${interaction.severity}`}
            >
              <strong>{interaction.drug1Name} + {interaction.drug2Name}</strong>
              <p>{interaction.description}</p>
              <p><strong>Effect:</strong> {interaction.clinicalEffect}</p>
              <p><strong>Management:</strong> {interaction.management}</p>
            </div>
          ))}

          {interactions.allergyWarnings.map(warning => (
            <div key={warning.drugId} className="alert alert-danger">
              <strong>Allergy Warning: {warning.drugName}</strong>
              <p>{warning.recommendation}</p>
            </div>
          ))}
        </div>
      )}

      <button type="submit" disabled={loading}>
        {loading ? 'Checking...' : 'Submit Prescription'}
      </button>
    </form>
  );
}
```

## Performance Benchmarks

Expected response times:
- Single drug interaction check: < 50ms
- Multiple drugs (5 drugs): < 100ms
- Get drug interactions list: < 80ms
- Allergy check: < 30ms

## Common Issues & Troubleshooting

### Issue 1: Migration Fails
**Error:** `Table already exists`
**Solution:**
```bash
# Check existing tables
npx prisma db pull

# If tables exist, mark migration as applied
npx prisma migrate resolve --applied 20251231_add_drug_interactions
```

### Issue 2: No Interactions Found
**Cause:** Drug names don't match exactly
**Solution:** The service uses fuzzy matching, but ensure drug names/IDs are close to the names in KNOWN_INTERACTIONS array. For production, use actual drug IDs from database.

### Issue 3: PatientAllergy Table Not Found
**Cause:** Migration not run
**Solution:** The routes handle this gracefully and fall back to patient.allergies field

## Data Seeding (Optional)

To populate actual drug interaction records in database:

```typescript
// seed-interactions.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedInteractions() {
  // Get actual drug IDs from database
  const warfarin = await prisma.drug.findFirst({
    where: { name: { contains: 'Warfarin', mode: 'insensitive' } }
  });

  const aspirin = await prisma.drug.findFirst({
    where: { name: { contains: 'Aspirin', mode: 'insensitive' } }
  });

  if (warfarin && aspirin) {
    await prisma.drugInteraction.create({
      data: {
        drug1Id: warfarin.id,
        drug2Id: aspirin.id,
        severity: 'major',
        description: 'Increased bleeding risk',
        clinicalEffect: 'Enhanced anticoagulation and GI bleeding risk',
        management: 'Avoid combination or monitor closely with INR checks'
      }
    });
  }

  // Repeat for other interactions...
}

seedInteractions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run seeding:
```bash
npx tsx seed-interactions.ts
```

## Monitoring & Logging

Add logging for production:
```typescript
// In drugInteractionRoutes.ts
import logger from '../utils/logger';

router.post('/drugs/check-interactions', async (req, res) => {
  const { drugIds, patientAllergies } = req.body;

  logger.info('Drug interaction check', {
    userId: req.user?.userId,
    drugIds,
    hasAllergies: !!patientAllergies
  });

  // ... rest of code

  if (result.hasContraindications) {
    logger.warn('Contraindicated interaction detected', {
      userId: req.user?.userId,
      drugIds,
      interactions: result.interactions
    });
  }
});
```

## API Rate Limiting

Consider adding rate limiting for production:
```typescript
import rateLimit from 'express-rate-limit';

const interactionCheckLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many interaction checks, please try again later'
});

router.post('/drugs/check-interactions', interactionCheckLimiter, ...);
```

## Success Criteria

- ✅ All API endpoints return 200 for valid requests
- ✅ Contraindicated interactions block prescription creation
- ✅ Major interactions return warnings
- ✅ Allergy conflicts are detected correctly
- ✅ Response times < 100ms for typical requests
- ✅ No false positives for safe drug combinations
- ✅ Comprehensive error handling and logging
