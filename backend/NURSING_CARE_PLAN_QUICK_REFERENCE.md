# Nursing Care Plan - Quick Reference

## Setup Checklist

- [ ] Copy models from `prisma/nursing-care-plan-schema.txt` to end of `prisma/schema.prisma`
- [ ] Add relations to `Admission` and `Patient` models
- [ ] Run: `npx prisma migrate dev --name add_nursing_care_plans`
- [ ] Run: `npx prisma generate`
- [ ] Register routes in server.ts: `app.use('/api/nursing', nursingCarePlanRoutes);`
- [ ] Test endpoints with authentication

## Quick API Reference

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/nursing/care-plans` | Create care plan |
| GET | `/api/nursing/care-plans/:admissionId` | Get care plan |
| PUT | `/api/nursing/care-plans/:id` | Update status |
| POST | `/api/nursing/care-plans/:id/diagnoses` | Add diagnosis |
| POST | `/api/nursing/care-plans/:id/interventions` | Add intervention |
| POST | `/api/nursing/interventions/:id/execute` | Record execution |
| POST | `/api/nursing/care-plans/:id/evaluate` | Add evaluation |
| PUT | `/api/nursing/goals/:id/outcome` | Update goal |

### Assessment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/nursing/assessment-scales` | Get scale info |
| POST | `/api/nursing/assessments` | Record assessment |
| GET | `/api/nursing/assessments/:admissionId` | Get assessments |
| GET | `/api/nursing/assessments/:admissionId/latest` | Latest assessments |
| GET | `/api/nursing/assessments/:admissionId/trends` | Assessment trends |

## Assessment Scales Quick Reference

### Braden Scale (Pressure Ulcer)
- **Score 19-23**: No risk
- **Score 15-18**: Low risk
- **Score 13-14**: Moderate risk
- **Score 10-12**: High risk
- **Score ≤9**: Very high risk

### Morse Fall Scale
- **Score 0-24**: No risk
- **Score 25-50**: Low risk
- **Score ≥51**: High risk

### Glasgow Coma Scale
- **Score 13-15**: Mild impairment
- **Score 9-12**: Moderate impairment
- **Score 3-8**: Severe impairment

### Pain Scale
- **0**: No pain
- **1-3**: Mild pain
- **4-6**: Moderate pain
- **7-10**: Severe pain

## Common Intervention Frequencies

- **Q2H** - Every 2 hours
- **Q4H** - Every 4 hours
- **Q8H** - Every 8 hours (TID)
- **Q12H** - Every 12 hours (BID)
- **QD** - Once daily
- **BID** - Twice daily
- **TID** - Three times daily
- **QID** - Four times daily
- **PRN** - As needed
- **Continuous** - Ongoing

## Intervention Categories

1. **Assessment** - Monitoring and evaluation activities
2. **Therapeutic** - Treatment interventions
3. **Teaching** - Patient/family education
4. **Referral** - Specialist consultations

## Status Values

### Care Plan Status
- `active` - Currently in use
- `completed` - Successfully completed
- `discontinued` - Discontinued early

### Diagnosis Status
- `active` - Current diagnosis
- `resolved` - No longer applicable

### Goal Outcomes
- `met` - Goal achieved
- `partially_met` - Partial achievement
- `not_met` - Goal not achieved

### Evaluation Status
- `improving` - Patient improving
- `stable` - Patient stable
- `deteriorating` - Patient declining

## Sample Requests

### Create Care Plan
```json
POST /api/nursing/care-plans
{
  "admissionId": "uuid",
  "patientId": "uuid",
  "createdBy": "uuid",
  "diagnoses": [{
    "diagnosis": "Risk for Falls",
    "relatedTo": "History of falls",
    "evidencedBy": ["High Morse score"],
    "priority": 1,
    "goals": [{
      "description": "Remain fall-free",
      "targetDate": "2025-01-15"
    }]
  }],
  "interventions": [{
    "category": "therapeutic",
    "intervention": "Fall precautions",
    "frequency": "Continuous"
  }]
}
```

### Record Braden Assessment
```json
POST /api/nursing/assessments
{
  "admissionId": "uuid",
  "patientId": "uuid",
  "scaleType": "braden",
  "answers": {
    "sensoryPerception": 3,
    "moisture": 4,
    "activity": 2,
    "mobility": 2,
    "nutrition": 3,
    "frictionShear": 2
  },
  "assessedBy": "uuid"
}
```

### Execute Intervention
```json
POST /api/nursing/interventions/:id/execute
{
  "executedBy": "uuid",
  "notes": "Patient repositioned",
  "patientResponse": "Tolerated well"
}
```

### Evaluate Care Plan
```json
POST /api/nursing/care-plans/:id/evaluate
{
  "evaluatedBy": "uuid",
  "overallStatus": "improving",
  "notes": "Patient showing improvement",
  "modifications": "Increase frequency"
}
```

## Pre-built Templates

Use `GET /api/nursing/diagnoses/templates` to access templates for:

1. **pressure_ulcer_risk** - Pressure ulcer prevention
2. **fall_risk** - Fall prevention
3. **pain_management** - Pain control
4. **impaired_mobility** - Mobility improvement
5. **fluid_volume_deficit** - Hydration management
6. **ineffective_airway_clearance** - Respiratory care

## Common NANDA Codes

- **00047** - Risk for Impaired Skin Integrity
- **00155** - Risk for Falls
- **00132** - Acute Pain
- **00085** - Impaired Physical Mobility
- **00027** - Deficient Fluid Volume
- **00031** - Ineffective Airway Clearance

## Files Reference

- **Service**: `src/services/nursingCarePlan.ts`
- **Routes**: `src/routes/nursingCarePlan.ts`
- **Validators**: `src/validators/nursingCarePlan.ts`
- **Schema**: `prisma/nursing-care-plan-schema.txt`
- **Documentation**: `NURSING_CARE_PLAN_IMPLEMENTATION.md`

## Error Handling

All endpoints return:
- **200/201**: Success
- **400**: Validation error (check `details` field)
- **404**: Resource not found
- **500**: Server error (check logs)

Example error response:
```json
{
  "error": "Validation error",
  "details": [
    {
      "path": ["diagnosis"],
      "message": "Diagnosis must be at least 5 characters"
    }
  ]
}
```

## Tips

1. Always validate admission is active before creating care plan
2. Record assessments daily for at-risk patients
3. Document intervention executions immediately
4. Review and update goals weekly
5. Evaluate care plan every 3 days minimum
6. Use templates as starting points
7. Prioritize diagnoses appropriately (1 = highest priority)
8. Include specific, measurable goals
9. Document patient responses to interventions
10. Keep evaluation notes detailed and objective
