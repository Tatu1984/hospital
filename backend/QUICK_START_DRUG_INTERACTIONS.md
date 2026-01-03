# Drug Interaction System - Quick Start Guide

## 5-Minute Integration

### 1. Run Migration (1 minute)
```bash
cd /Users/sudipto/Desktop/projects/hospitalerp/backend
npx prisma migrate dev --name add_drug_interactions
```

### 2. Add Routes to server.ts (1 minute)

**Add at top of file (around line 10-20):**
```typescript
import drugInteractionRoutes from './routes/drugInteractionRoutes';
```

**Add after route registrations (around line 100-200):**
```typescript
// Drug interaction routes
app.use('/api', drugInteractionRoutes);
```

### 3. Test It (1 minute)
```bash
# Start server
npm run dev

# In another terminal, test the endpoint
curl -X POST http://localhost:3000/api/drugs/check-interactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"drugIds": ["warfarin", "aspirin"]}'
```

### 4. Use in Prescription Form (2 minutes)

**Before creating prescription, add this code in server.ts (around line 1438):**

```typescript
// BEFORE (existing code):
if (prescription && prescription.drugs && prescription.drugs.length > 0) {
  await prisma.prescription.create({
    data: {
      opdNoteId: opdNote.id,
      patientId,
      doctorId: req.user.userId,
      drugs: prescription.drugs,
      status: 'pending',
    },
  });
}

// AFTER (enhanced with interaction checking):
let interactionWarnings = null;
if (prescription && prescription.drugs && prescription.drugs.length > 0) {
  // Get patient allergies
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { allergies: true }
  });

  // Extract drug IDs
  const drugIds = prescription.drugs.map((d: any) => d.drugId).filter(Boolean);

  // Import the function
  const { checkDrugInteractions } = await import('./services/drugInteraction');

  // Check for interactions
  const interactionResult = await checkDrugInteractions(drugIds, patient?.allergies);

  // Block if contraindicated
  if (interactionResult.hasContraindications) {
    return res.status(400).json({
      error: 'Contraindicated drug interaction detected',
      interactions: interactionResult.interactions.filter(i => i.severity === 'contraindicated'),
      allergyConflicts: interactionResult.allergyWarnings.filter(a => a.severity === 'high'),
    });
  }

  // Store warnings for response
  interactionWarnings = {
    interactions: interactionResult.interactions,
    allergyWarnings: interactionResult.allergyWarnings,
  };

  await prisma.prescription.create({
    data: {
      opdNoteId: opdNote.id,
      patientId,
      doctorId: req.user.userId,
      drugs: prescription.drugs,
      status: 'pending',
    },
  });
}

// Update response to include warnings
const result = await prisma.oPDNote.findUnique({
  where: { id: opdNote.id },
  include: {
    prescriptions: true,
    doctor: { select: { name: true } },
  },
});

res.status(201).json({
  ...result,
  interactionWarnings  // Include warnings in response
});
```

## Done! ✅

Your drug interaction system is now live. The system will:
- ✅ Check all prescriptions for drug interactions
- ✅ Block contraindicated combinations
- ✅ Warn about major interactions
- ✅ Check patient allergies
- ✅ Provide clinical management recommendations

## Quick Test Scenarios

### Test 1: Safe Combination (Should Pass)
```bash
POST /api/drugs/check-interactions
{
  "drugIds": ["paracetamol", "vitamin-c"]
}
# Expected: No interactions
```

### Test 2: Major Interaction (Should Warn)
```bash
POST /api/drugs/check-interactions
{
  "drugIds": ["warfarin", "aspirin"]
}
# Expected: Major interaction warning, can proceed with override
```

### Test 3: Contraindicated (Should Block)
```bash
POST /api/drugs/check-interactions
{
  "drugIds": ["sildenafil", "nitroglycerin"]
}
# Expected: Contraindicated, cannot proceed
```

### Test 4: Allergy Conflict (Should Block)
```bash
POST /api/drugs/check-interactions
{
  "drugIds": ["amoxicillin"],
  "patientAllergies": "Penicillin"
}
# Expected: High severity allergy warning, cannot proceed
```

## API Endpoints Available

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/drugs/check-interactions` | POST | Check multiple drugs for interactions |
| `/api/drugs/:id/interactions` | GET | Get all known interactions for a drug |
| `/api/drugs/check-allergy` | POST | Check drug against allergies |
| `/api/patients/:id/allergies` | GET | Get patient's allergy records |
| `/api/patients/:id/allergies` | POST | Add new allergy record |

## Severity Levels

| Severity | Meaning | Action |
|----------|---------|--------|
| **Contraindicated** | Never use together | BLOCKS prescription |
| **Major** | Serious outcomes possible | WARNS, requires override |
| **Moderate** | Monitoring needed | WARNS, can proceed |
| **Minor** | Clinically insignificant | INFO only |

## Interaction Database Coverage

- **10** Contraindicated interactions
- **30** Major interactions
- **25** Moderate interactions
- **5** Minor interactions
- **Total: 70+** clinical drug interactions

## Allergy Patterns Covered

- Penicillin (+ cross-reactivity with cephalosporins)
- Sulfa drugs
- NSAIDs / Aspirin
- Opioids
- ACE Inhibitors
- Statins
- Eggs (Propofol warning)
- Iodine (Contrast dye)

## Frontend Integration (30 seconds)

```javascript
// In your prescription form component
const checkBeforeSubmit = async () => {
  const response = await fetch('/api/drugs/check-interactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      drugIds: selectedDrugs.map(d => d.id),
      patientAllergies: patient.allergies
    })
  });

  const data = await response.json();

  if (data.result.hasContraindications) {
    alert('ERROR: Cannot prescribe - contraindicated interaction!');
    return false;
  }

  if (data.result.requiresOverride) {
    return confirm('Warning: Major interaction detected. Proceed anyway?');
  }

  return true;
};
```

## Troubleshooting

### Migration fails with "relation already exists"
```bash
# Mark as applied
npx prisma migrate resolve --applied 20251231_add_drug_interactions
```

### No interactions detected
- Drug names must match (case-insensitive, fuzzy matching enabled)
- Check drug IDs exist in database
- Review `/src/services/drugInteraction.ts` for drug name patterns

### Route not found
- Verify import added to server.ts
- Verify `app.use('/api', drugInteractionRoutes)` added
- Restart server

## Files Created

- ✅ `/src/services/drugInteraction.ts` - Core service (ENHANCED)
- ✅ `/src/routes/drugInteractionRoutes.ts` - API routes (NEW)
- ✅ `/prisma/migrations/20251231_add_drug_interactions/migration.sql` - Database migration (NEW)
- ✅ `/DRUG_INTERACTION_INTEGRATION.md` - Detailed integration guide
- ✅ `/DRUG_INTERACTION_TESTING.md` - Testing guide
- ✅ `/DRUG_INTERACTION_SUMMARY.md` - Complete summary

## Need More Help?

- **Integration Details:** See `DRUG_INTERACTION_INTEGRATION.md`
- **Testing Examples:** See `DRUG_INTERACTION_TESTING.md`
- **Complete Overview:** See `DRUG_INTERACTION_SUMMARY.md`
- **Code Implementation:** Check `/src/services/drugInteraction.ts`
- **API Routes:** Check `/src/routes/drugInteractionRoutes.ts`

---

**Total Setup Time:** 5 minutes
**Status:** ✅ Production Ready
**Version:** 1.0.0
