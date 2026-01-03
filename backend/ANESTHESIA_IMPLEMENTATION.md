# Operation Theatre Anesthesia Records Implementation

## Overview
This document outlines the comprehensive implementation of anesthesia records and surgical management features for the Hospital ERP system.

## Database Schema Changes

### 1. Updated Surgery Model
The existing `Surgery` model has been enhanced with:
- `preOpChecklistDetails` (Json): Detailed pre-operative checklist items
- Relations to `AnesthesiaRecord`, `SurgeryComplication[]`, and `SurgeryImplant[]`

### 2. New Models Added

#### AnesthesiaRecord
Comprehensive anesthesia documentation including:
- **Pre-operative Assessment**: ASA grade, airway assessment, NPO status, allergies, medications
- **Anesthesia Type**: general, spinal, epidural, local, regional, MAC, sedation
- **Agents**: Array of drugs with dosages, routes, and administration times
- **Vitals Log**: Periodic monitoring (HR, BP, SpO2, temp, EtCO2, RR)
- **Airway Management**: Intubation details, tube size, ventilator settings
- **Fluid Balance**: IV fluids, blood products, urine output, drains, blood loss
- **Complications**: Intraoperative anesthesia complications with management
- **Recovery Notes**: Post-anesthesia recovery observations
- **Post-op Instructions**: Instructions for post-operative care

#### SurgeryComplication
Track surgical complications:
- Type: intraoperative or postoperative
- Description, severity (minor/moderate/major/critical)
- Management done and outcome
- Reported by and timestamp

#### SurgeryImplant
Track implants used in surgery:
- Implant name, manufacturer
- Serial number, batch number
- Expiry date
- Quantity and cost
- Full traceability for regulatory compliance

## API Endpoints

### Anesthesia Record Management

#### POST /api/surgeries/:id/anesthesia
Create anesthesia record for a surgery.

**Request Body:**
```json
{
  "surgeryId": "uuid",
  "patientId": "uuid",
  "anesthetistId": "uuid",
  "anesthesiaType": "general",
  "preOpAssessment": {
    "asaGrade": "II",
    "airwayAssessment": {
      "mallamapati": "I",
      "thyromental": 7.5,
      "mouthOpening": "Adequate",
      "neckMobility": "Normal",
      "dentition": "Good"
    },
    "npoStatus": {
      "lastSolid": "2024-01-15T20:00:00Z",
      "lastFluid": "2024-01-16T06:00:00Z",
      "hoursNPO": 8
    },
    "preExistingConditions": ["Hypertension"],
    "currentMedications": ["Amlodipine 5mg OD"],
    "allergies": [],
    "labValues": {
      "hemoglobin": 13.5,
      "platelets": 250000,
      "inr": 1.1
    }
  },
  "startTime": "2024-01-16T08:30:00Z"
}
```

**Response:**
```json
{
  "message": "Anesthesia record created successfully",
  "record": { ... }
}
```

#### GET /api/surgeries/:id/anesthesia
Retrieve anesthesia record for a surgery.

**Response:**
```json
{
  "record": {
    "id": "uuid",
    "surgeryId": "uuid",
    "patientId": "uuid",
    "anesthetistId": "uuid",
    "anesthesiaType": "general",
    "preOpAssessment": { ... },
    "agents": [...],
    "vitalsLog": [...],
    "airwayManagement": {...},
    "fluidBalance": {...},
    "complications": [...],
    "recoveryNotes": "...",
    "postOpInstructions": "...",
    "startTime": "2024-01-16T08:30:00Z",
    "endTime": "2024-01-16T11:30:00Z",
    "surgery": {
      "id": "uuid",
      "procedureName": "Laparoscopic Cholecystectomy",
      "patientName": "John Doe",
      "patientMRN": "MRN12345"
    }
  }
}
```

#### PUT /api/surgeries/:id/anesthesia
Update anesthesia record with agents, airway management, fluids, etc.

**Request Body:**
```json
{
  "agents": [
    {
      "name": "Propofol",
      "dose": "120",
      "unit": "mg",
      "route": "IV",
      "time": "2024-01-16T08:30:00Z"
    },
    {
      "name": "Fentanyl",
      "dose": "100",
      "unit": "mcg",
      "route": "IV",
      "time": "2024-01-16T08:32:00Z"
    }
  ],
  "airwayManagement": {
    "technique": "ETT",
    "ettSize": "7.5",
    "ettDepth": "21 cm",
    "cuffPressure": 25,
    "intubationAttempts": 1,
    "difficulty": "easy",
    "ventilatorSettings": {
      "mode": "VCV",
      "tidalVolume": 450,
      "respiratoryRate": 12,
      "fio2": 40,
      "peep": 5,
      "pip": 18
    }
  },
  "fluidBalance": {
    "ivFluids": [
      {
        "fluid": "Ringer's Lactate",
        "volume": 1000,
        "time": "2024-01-16T08:30:00Z"
      }
    ],
    "bloodProducts": [],
    "urineOutput": 200,
    "bloodLoss": 50,
    "drains": []
  },
  "recoveryNotes": "Patient recovered smoothly, extubated in OT",
  "postOpInstructions": "Monitor vitals q15min, pain management as per protocol",
  "endTime": "2024-01-16T11:30:00Z"
}
```

### Intraoperative Monitoring

#### POST /api/surgeries/:id/vitals
Add vitals entry during surgery.

**Request Body:**
```json
{
  "heartRate": 72,
  "systolicBP": 120,
  "diastolicBP": 75,
  "meanBP": 90,
  "temperature": 36.8,
  "spo2": 99,
  "etco2": 38,
  "respiratoryRate": 12,
  "time": "2024-01-16T09:00:00Z",
  "notes": "Stable"
}
```

**Response:**
```json
{
  "message": "Vitals entry added successfully",
  "vitalsLog": [...]
}
```

#### POST /api/surgeries/:id/anesthesia/complications
Record anesthesia-related complication during surgery.

**Request Body:**
```json
{
  "type": "Hypotension",
  "description": "BP dropped to 85/50 mmHg",
  "management": "Fluid bolus 200ml, Phenylephrine 100mcg IV",
  "time": "2024-01-16T09:15:00Z"
}
```

### Surgery Complications

#### POST /api/surgeries/:id/complications
Report surgical complication (auto-captures reportedBy from auth token).

**Request Body:**
```json
{
  "type": "intraoperative",
  "description": "Minor bleeding from hepatic bed",
  "severity": "minor",
  "managementDone": "Controlled with diathermy and hemostatic agents",
  "outcome": "Successfully managed, no further issues"
}
```

**Response:**
```json
{
  "message": "Complication reported successfully",
  "complication": {
    "id": "uuid",
    "surgeryId": "uuid",
    "type": "intraoperative",
    "description": "...",
    "severity": "minor",
    "managementDone": "...",
    "outcome": "...",
    "reportedBy": "uuid",
    "reportedAt": "2024-01-16T10:00:00Z"
  }
}
```

#### GET /api/surgeries/:id/complications
Get all complications for a surgery.

**Response:**
```json
{
  "complications": [...],
  "count": 2
}
```

### Implant Tracking

#### POST /api/surgeries/:id/implants
Record implant used in surgery.

**Request Body:**
```json
{
  "implantName": "DePuy Synthes Proximal Femoral Nail",
  "manufacturer": "DePuy Synthes",
  "serialNumber": "SN123456789",
  "batchNumber": "BATCH2024-001",
  "expiryDate": "2026-12-31",
  "quantity": 1,
  "cost": 45000.00
}
```

**Response:**
```json
{
  "message": "Implant recorded successfully",
  "implant": { ... }
}
```

#### GET /api/surgeries/:id/implants
Get all implants used in surgery.

**Response:**
```json
{
  "implants": [...],
  "count": 2,
  "totalCost": 67500.00
}
```

## Validation Schemas

All endpoints use Zod validation schemas defined in `/src/validators/index.ts`:

- `createAnesthesiaRecordSchema`: Validates anesthesia record creation
- `updateAnesthesiaRecordSchema`: Validates updates to anesthesia record
- `addVitalsEntrySchema`: Validates vitals entry
- `addAnesthesiaComplicationSchema`: Validates anesthesia complications
- `reportSurgeryComplicationSchema`: Validates surgery complications
- `addSurgeryImplantSchema`: Validates implant tracking

## Database Migration

To apply these changes to your database:

```bash
# Generate Prisma migration
npx prisma migrate dev --name add_anesthesia_records

# Or for production
npx prisma migrate deploy
```

## Security & Audit Logging

All endpoints:
- Require authentication (`authenticateToken` middleware)
- Log operations using winston logger
- Include user ID in audit logs
- Use asyncHandler for consistent error handling

## Clinical Compliance Features

1. **ASA Classification**: Track patient's physical status
2. **NPO Status**: Document fasting status
3. **Drug Tracking**: Complete record of anesthetic agents
4. **Vitals Monitoring**: Periodic vital signs during surgery
5. **Airway Management**: Detailed intubation documentation
6. **Fluid Balance**: Input/output monitoring
7. **Complication Tracking**: Immediate documentation of issues
8. **Implant Traceability**: Complete device tracking for regulatory compliance

## Usage Example

### Complete Anesthesia Workflow

1. **Pre-operative**: Create anesthesia record with assessment
2. **Induction**: Update with agents used
3. **Maintenance**: Add periodic vitals (every 5-15 minutes)
4. **Monitor**: Record any complications immediately
5. **Recovery**: Update with recovery notes
6. **Documentation**: System maintains complete audit trail

### Frontend Integration

```typescript
// Create anesthesia record
const createRecord = async (surgeryId: string, data: AnesthesiaData) => {
  const response = await fetch(`/api/surgeries/${surgeryId}/anesthesia`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return response.json();
};

// Add vitals during surgery
const addVitals = async (surgeryId: string, vitals: VitalsData) => {
  const response = await fetch(`/api/surgeries/${surgeryId}/vitals`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(vitals)
  });
  return response.json();
};
```

## Testing

Test the endpoints using the provided examples:

```bash
# Create anesthesia record
curl -X POST http://localhost:4000/api/surgeries/{surgeryId}/anesthesia \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @anesthesia_record.json

# Add vitals
curl -X POST http://localhost:4000/api/surgeries/{surgeryId}/vitals \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @vitals.json
```

## File Structure

```
backend/
├── prisma/
│   └── schema.prisma              # Updated with new models
├── src/
│   ├── routes/
│   │   └── anesthesia.ts          # New anesthesia route handlers
│   ├── validators/
│   │   └── index.ts               # Updated with anesthesia validators
│   └── server.ts                  # Updated with route imports
└── ANESTHESIA_IMPLEMENTATION.md   # This file
```

## Future Enhancements

1. Real-time vitals monitoring dashboard
2. Anesthesia charting templates
3. Drug interaction warnings
4. Automated anesthesia record generation from monitoring equipment
5. Post-operative pain management tracking
6. Anesthesia performance metrics and analytics

## Support

For issues or questions, refer to the API documentation at `/api/docs` or contact the development team.
