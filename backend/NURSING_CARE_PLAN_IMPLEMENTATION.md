# Nursing Care Plan Implementation

## Overview

This document describes the comprehensive nursing care plan system implemented for the Hospital ERP. The system provides complete functionality for creating, managing, and evaluating nursing care plans including diagnoses, interventions, goals, and standardized assessment scales.

## Files Created

### 1. Schema Models
**Location:** `prisma/nursing-care-plan-schema.txt`

Contains the following models:
- `NursingCarePlan` - Main care plan container
- `NursingDiagnosis` - NANDA nursing diagnoses
- `NursingGoal` - Patient-centered goals
- `NursingIntervention` - Nursing interventions
- `InterventionExecution` - Intervention execution records
- `NursingEvaluation` - Care plan evaluations
- `NursingAssessmentScale` - Standardized assessment scales

**Note:** These models need to be manually added to `prisma/schema.prisma` at the end of the file before running migrations.

### 2. Service Layer
**Location:** `src/services/nursingCarePlan.ts`

Provides comprehensive business logic including:

#### Core Functions
- `createCarePlan()` - Create new care plan with diagnoses and interventions
- `getCarePlanByAdmission()` - Retrieve care plan for admission
- `updateCarePlanStatus()` - Update care plan status (active/completed/discontinued)
- `addDiagnosis()` - Add nursing diagnosis to existing care plan
- `addIntervention()` - Add intervention to care plan
- `executeIntervention()` - Record intervention execution
- `evaluateCarePlan()` - Add evaluation to care plan
- `updateGoalOutcome()` - Update goal outcome (met/partially_met/not_met)

#### Assessment Scale Functions
- `calculateBradenScore()` - Calculate Braden Scale (pressure ulcer risk)
- `calculateMorseScore()` - Calculate Morse Fall Scale (fall risk)
- `calculateGlasgowScore()` - Calculate Glasgow Coma Scale (consciousness)
- `calculatePainScore()` - Calculate pain score (0-10 scale)
- `recordAssessmentScale()` - Record any assessment scale
- `getAssessmentScales()` - Get assessment history

#### Templates
- `INTERVENTION_TEMPLATES` - Pre-built intervention templates for common diagnoses:
  - Pressure ulcer risk
  - Fall risk
  - Pain management
  - Impaired mobility
  - Fluid volume deficit
  - Ineffective airway clearance

### 3. Validators
**Location:** `src/validators/nursingCarePlan.ts`

Zod validation schemas for all endpoints:
- `createCarePlanSchema` - Care plan creation
- `diagnosisSchema` - Nursing diagnosis
- `interventionSchema` - Nursing intervention
- `evaluationSchema` - Care plan evaluation
- `assessmentScaleSchema` - Assessment scales
- `executeInterventionSchema` - Intervention execution
- `updateGoalOutcomeSchema` - Goal outcome updates

### 4. Routes
**Location:** `src/routes/nursingCarePlan.ts`

Complete REST API endpoints (see API Reference below).

## Database Schema

### NursingCarePlan
```prisma
model NursingCarePlan {
  id              String   @id @default(uuid())
  admissionId     String
  patientId       String
  createdBy       String   // nurse who created
  status          String   @default("active") // active, completed, discontinued
  startDate       DateTime @default(now())
  endDate         DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  admission       Admission @relation(fields: [admissionId], references: [id])
  patient         Patient   @relation(fields: [patientId], references: [id])
  diagnoses       NursingDiagnosis[]
  interventions   NursingIntervention[]
  evaluations     NursingEvaluation[]
}
```

### NursingDiagnosis
```prisma
model NursingDiagnosis {
  id            String          @id @default(uuid())
  carePlanId    String
  code          String?         // NANDA code
  diagnosis     String
  relatedTo     String          // etiology
  evidencedBy   String[]        // signs/symptoms
  priority      Int             @default(1)
  status        String          @default("active")
  createdAt     DateTime        @default(now())
  carePlan      NursingCarePlan @relation(fields: [carePlanId], references: [id])
  goals         NursingGoal[]
}
```

### NursingGoal
```prisma
model NursingGoal {
  id            String           @id @default(uuid())
  diagnosisId   String
  description   String
  targetDate    DateTime
  outcome       String?          // met, partially_met, not_met
  evaluatedAt   DateTime?
  createdAt     DateTime         @default(now())
  diagnosis     NursingDiagnosis @relation(fields: [diagnosisId], references: [id])
}
```

### NursingIntervention
```prisma
model NursingIntervention {
  id            String          @id @default(uuid())
  carePlanId    String
  category      String          // assessment, therapeutic, teaching, referral
  intervention  String
  frequency     String          // Q4H, TID, PRN, etc.
  instructions  String?
  isActive      Boolean         @default(true)
  createdAt     DateTime        @default(now())
  carePlan      NursingCarePlan @relation(fields: [carePlanId], references: [id])
  executions    InterventionExecution[]
}
```

## API Reference

### Care Plan Management

#### Create Care Plan
```http
POST /api/nursing/care-plans
Authorization: Bearer <token>
Content-Type: application/json

{
  "admissionId": "uuid",
  "patientId": "uuid",
  "createdBy": "uuid",
  "diagnoses": [
    {
      "code": "00047",
      "diagnosis": "Risk for Impaired Skin Integrity",
      "relatedTo": "Prolonged immobility",
      "evidencedBy": ["Bedbound status", "Low Braden score"],
      "priority": 1,
      "goals": [
        {
          "description": "Patient will maintain intact skin throughout hospitalization",
          "targetDate": "2025-01-15T00:00:00Z"
        }
      ]
    }
  ],
  "interventions": [
    {
      "category": "therapeutic",
      "intervention": "Reposition patient every 2 hours",
      "frequency": "Q2H",
      "instructions": "Use positioning devices to maintain alignment"
    }
  ]
}
```

#### Get Care Plan by Admission
```http
GET /api/nursing/care-plans/:admissionId
Authorization: Bearer <token>
```

#### Update Care Plan Status
```http
PUT /api/nursing/care-plans/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed",
  "endDate": "2025-01-10T00:00:00Z"
}
```

### Diagnosis Management

#### Add Diagnosis
```http
POST /api/nursing/care-plans/:id/diagnoses
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "00155",
  "diagnosis": "Risk for Falls",
  "relatedTo": "History of falls and gait instability",
  "evidencedBy": ["High Morse score", "Unsteady gait"],
  "priority": 2,
  "goals": [
    {
      "description": "Patient will remain free from falls during hospitalization",
      "targetDate": "2025-01-15T00:00:00Z"
    }
  ]
}
```

#### Get Diagnosis Templates
```http
GET /api/nursing/diagnoses/templates
Authorization: Bearer <token>
```

Returns pre-built templates for common diagnoses with suggested interventions.

### Intervention Management

#### Add Intervention
```http
POST /api/nursing/care-plans/:id/interventions
Authorization: Bearer <token>
Content-Type: application/json

{
  "category": "assessment",
  "intervention": "Assess skin integrity every shift",
  "frequency": "Q8H",
  "instructions": "Document any redness or breakdown"
}
```

#### Execute Intervention
```http
POST /api/nursing/interventions/:id/execute
Authorization: Bearer <token>
Content-Type: application/json

{
  "executedBy": "nurse-uuid",
  "notes": "Patient repositioned to left side",
  "patientResponse": "Tolerated well, no discomfort reported"
}
```

#### Deactivate Intervention
```http
PUT /api/nursing/interventions/:id/deactivate
Authorization: Bearer <token>
```

### Goal Management

#### Update Goal Outcome
```http
PUT /api/nursing/goals/:id/outcome
Authorization: Bearer <token>
Content-Type: application/json

{
  "outcome": "met"
}
```

Possible outcomes: `met`, `partially_met`, `not_met`

### Evaluation

#### Add Evaluation
```http
POST /api/nursing/care-plans/:id/evaluate
Authorization: Bearer <token>
Content-Type: application/json

{
  "evaluatedBy": "nurse-uuid",
  "overallStatus": "improving",
  "notes": "Patient showing improvement in mobility. Pain levels decreasing.",
  "modifications": "Increased ambulation frequency to TID"
}
```

Status options: `improving`, `stable`, `deteriorating`

### Assessment Scales

#### Get Available Scales
```http
GET /api/nursing/assessment-scales
Authorization: Bearer <token>
```

Returns information about all available assessment scales (Braden, Morse, Glasgow, Pain).

#### Record Assessment
```http
POST /api/nursing/assessments
Authorization: Bearer <token>
Content-Type: application/json

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
  "assessedBy": "nurse-uuid"
}
```

#### Get Assessments for Admission
```http
GET /api/nursing/assessments/:admissionId?scaleType=braden
Authorization: Bearer <token>
```

#### Get Latest Assessments
```http
GET /api/nursing/assessments/:admissionId/latest
Authorization: Bearer <token>
```

Returns the most recent assessment of each type.

#### Get Assessment Trends
```http
GET /api/nursing/assessments/:admissionId/trends?scaleType=braden&days=7
Authorization: Bearer <token>
```

Returns assessment score trends over time.

### Summary

#### Get Care Plan Summary
```http
GET /api/nursing/care-plans/:id/summary
Authorization: Bearer <token>
```

Returns comprehensive summary including statistics, latest evaluation, and latest assessments.

## Assessment Scales

### 1. Braden Scale (Pressure Ulcer Risk)

**Score Range:** 6-23
- 19-23: No risk
- 15-18: Low risk
- 13-14: Moderate risk
- 10-12: High risk
- ≤9: Very high risk

**Components:**
- Sensory Perception (1-4)
- Moisture (1-4)
- Activity (1-4)
- Mobility (1-4)
- Nutrition (1-4)
- Friction & Shear (1-3)

### 2. Morse Fall Scale (Fall Risk)

**Score Range:** 0-125
- 0-24: No risk
- 25-50: Low risk
- ≥51: High risk

**Components:**
- History of falling (Yes=25, No=0)
- Secondary diagnosis (Yes=15, No=0)
- Ambulatory aid (None=0, Crutches/Cane=15, Furniture=30)
- IV Therapy (Yes=20, No=0)
- Gait (Normal=0, Weak=10, Impaired=20)
- Mental status (Oriented=0, Forgets limitations=15)

### 3. Glasgow Coma Scale (Consciousness)

**Score Range:** 3-15
- 13-15: Mild impairment
- 9-12: Moderate impairment
- 3-8: Severe impairment

**Components:**
- Eye Opening (1-4)
- Verbal Response (1-5)
- Motor Response (1-6)

### 4. Pain Scale

**Score Range:** 0-10
- 0: No pain
- 1-3: Mild pain
- 4-6: Moderate pain
- 7-10: Severe pain

**Additional Information:**
- Location
- Quality
- Onset
- Aggravating factors
- Relieving factors

## Intervention Templates

The system includes pre-built intervention templates for common nursing diagnoses:

### Pressure Ulcer Risk
- Skin integrity assessment Q8H
- Repositioning Q2H
- Pressure-relieving devices
- Skin care and moisture management
- Patient/family education

### Fall Risk
- Morse Fall Scale assessment daily
- Fall precautions (bed position, call bell, signage)
- Assistance with ambulation
- Patient education

### Pain Management
- Pain assessment Q4H and PRN
- Medication administration
- Comfort positioning
- Non-pharmacological interventions
- Effectiveness evaluation

### Impaired Mobility
- Range of motion assessment
- Passive/active exercises
- Progressive mobility program
- Antiembolic measures
- Physical therapy referral

### Fluid Volume Deficit
- Intake/output monitoring
- Dehydration assessment
- Oral fluid encouragement
- IV fluid administration
- Daily weight monitoring

### Ineffective Airway Clearance
- Respiratory assessment Q4H
- Positioning (semi-Fowler's)
- Deep breathing exercises
- Incentive spirometry
- Chest physiotherapy

## Integration Points

### Required Additions to schema.prisma

1. Add the models from `prisma/nursing-care-plan-schema.txt` to the end of `schema.prisma`
2. Add relations to existing models:

```prisma
model Admission {
  // ... existing fields ...
  nursingCarePlans NursingCarePlan[]
}

model Patient {
  // ... existing fields ...
  nursingCarePlans NursingCarePlan[]
}
```

### Run Migration

```bash
npx prisma migrate dev --name add_nursing_care_plans
npx prisma generate
```

### Register Routes

Add to your main server file (e.g., `server.ts`):

```typescript
import nursingCarePlanRoutes from './routes/nursingCarePlan';

// ... other route registrations ...
app.use('/api/nursing', nursingCarePlanRoutes);
```

## Usage Examples

### Creating a Complete Care Plan

```typescript
const carePlan = await createCarePlan({
  admissionId: "admission-uuid",
  patientId: "patient-uuid",
  createdBy: "nurse-uuid",
  diagnoses: [
    {
      code: "00047",
      diagnosis: "Risk for Impaired Skin Integrity",
      relatedTo: "Prolonged immobility and poor nutritional status",
      evidencedBy: [
        "Braden score of 12 (high risk)",
        "Bedbound status",
        "Limited mobility"
      ],
      priority: 1,
      goals: [
        {
          description: "Patient will maintain intact skin throughout hospitalization",
          targetDate: new Date("2025-01-15")
        },
        {
          description: "Patient will show no signs of redness over bony prominences",
          targetDate: new Date("2025-01-10")
        }
      ]
    }
  ],
  interventions: getInterventionTemplates('pressure_ulcer_risk')
});
```

### Recording Daily Assessments

```typescript
// Braden Scale
const bradenAssessment = await recordAssessmentScale({
  admissionId: "admission-uuid",
  patientId: "patient-uuid",
  scaleType: "braden",
  answers: {
    sensoryPerception: 3,
    moisture: 4,
    activity: 2,
    mobility: 2,
    nutrition: 3,
    frictionShear: 2
  },
  assessedBy: "nurse-uuid"
});

// Morse Fall Scale
const morseAssessment = await recordAssessmentScale({
  admissionId: "admission-uuid",
  patientId: "patient-uuid",
  scaleType: "morse",
  answers: {
    historyOfFalling: true,
    secondaryDiagnosis: true,
    ambulatoryAid: "crutches_cane_walker",
    ivTherapy: false,
    gait: "weak",
    mentalStatus: "oriented"
  },
  assessedBy: "nurse-uuid"
});
```

### Recording Intervention Execution

```typescript
const execution = await executeIntervention(
  "intervention-uuid",
  "nurse-uuid",
  "Patient repositioned to left side at 0800. Skin assessment completed - no areas of redness noted.",
  "Patient tolerated position change well. Reported comfort level improved."
);
```

### Evaluating Care Plan

```typescript
const evaluation = await evaluateCarePlan({
  carePlanId: "care-plan-uuid",
  evaluatedBy: "nurse-uuid",
  overallStatus: "improving",
  notes: "Patient showing steady improvement. Mobility increasing, pain decreasing. Braden score improved from 12 to 15. Patient actively participating in repositioning.",
  modifications: "Increased ambulation frequency from BID to TID. Continue current interventions."
});
```

## Best Practices

1. **Daily Assessments**: Record Braden and Morse scales daily for at-risk patients
2. **Timely Documentation**: Record intervention executions as they occur
3. **Regular Evaluations**: Evaluate care plans at least every 3 days or when patient condition changes
4. **Goal Review**: Review and update goal outcomes weekly
5. **Use Templates**: Start with intervention templates and customize as needed
6. **Priority Setting**: Assign appropriate priorities to diagnoses (1=highest)
7. **Evidence-Based**: Use NANDA codes when available for standardization

## Security Considerations

- All endpoints require authentication (Bearer token)
- Validate user has appropriate nursing role/permissions
- Audit all care plan modifications
- Protect patient health information (PHI)
- Implement role-based access control (RBAC)

## Future Enhancements

- Electronic signature for care plan approval
- Automated intervention scheduling
- Integration with medication administration records
- Care plan templates by diagnosis/condition
- Outcome trending and analytics
- Quality metrics dashboard
- Integration with vital signs monitoring
- Alert system for overdue interventions
- Family education tracking
- Discharge planning integration

## Testing

Comprehensive testing should include:
- Unit tests for assessment scale calculators
- Integration tests for care plan CRUD operations
- Validation tests for all schemas
- End-to-end tests for complete workflows
- Performance tests for concurrent operations

## Support

For questions or issues with the nursing care plan system, contact the development team or refer to the main Hospital ERP documentation.
