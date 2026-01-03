# Visual Guide: ICU API Fixes

## File Location
`/Users/sudipto/Desktop/projects/hospitalerp/backend/src/server.ts`

## What to Replace

### Step-by-Step Instructions

#### 1. Open server.ts

Navigate to line **4339** (approximately)

#### 2. Find This Section Header
```typescript
// ===========================
// ICU & CRITICAL CARE APIs
// ===========================
```

#### 3. Select Everything From That Comment...

Through the END of this endpoint (around line 4449):

```typescript
app.post('/api/icu/ventilator', authenticateToken, async (req: any, res: Response) => {
  try {
    const { icuBedId, ventilatorMode, fio2, peep } = req.body;

    // Record as a vitals entry with ventilator params
    const vitals = await prisma.iCUVitals.create({
      data: {
        icuBedId,
        ventilatorMode,
        fio2: fio2 ? parseInt(fio2) : null,
        peep: peep ? parseInt(peep) : null,
        recordedBy: req.user.userId,
      },
    });

    res.status(201).json({ message: 'Ventilator settings updated', vitals });
  } catch (error) {
    console.error('Update ventilator error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});  // <-- SELECT UP TO AND INCLUDING THIS CLOSING BRACKET
```

#### 4. Replace With New Code

Replace the selected section with the ENTIRE contents from:
**`REPLACE-ICU-SECTION.txt`** (starting after the header comments)

#### 5. Verify Next Section

After replacement, the very next line should be:
```typescript
// ===========================
// OPERATION THEATRE APIs
// ===========================
```

If you see that comment, the replacement was successful!

## Visual Diagram

```
┌─────────────────────────────────────────────────┐
│  Line 4337: app.post('/api/emergency/...       │
│  Line 4338: ...                                 │
│  Line 4339: // === ICU & CRITICAL CARE === ◄─── START SELECTION HERE
│  Line 4340:                                     │
│  Line 4341: app.get('/api/icu/beds'...        │
│  Line 4342: ...                                 │
│  Line 4343: ...                                 │
│             [DELETE ALL OF THIS]                │
│             ...                                 │
│  Line 4447: ...                                 │
│  Line 4448: ...                                 │
│  Line 4449: });  ◄────────────────────────────── END SELECTION HERE (last line of /api/icu/ventilator)
│  Line 4450:                                     │
│  Line 4451: // === OPERATION THEATRE === ◄───── THIS SHOULD REMAIN
│  Line 4452: app.get('/api/surgeries'...       │
└─────────────────────────────────────────────────┘

REPLACE LINES 4339-4449 (inclusive) WITH NEW CODE
```

## What Changes

### Before (4 endpoints, 111 lines)
1. GET /api/icu/beds - Simple bed list
2. POST /api/icu/beds - Create bed
3. POST /api/icu/vitals - Basic vitals (with validator)
4. POST /api/icu/ventilator - Basic ventilator

### After (5 endpoints, ~320 lines)
1. GET /api/icu/beds - **Enhanced** with patient/admission data
2. POST /api/icu/beds - Unchanged
3. POST /api/icu/vitals - **Enhanced** with critical alerts
4. POST /api/icu/ventilator - **Enhanced** with all parameters
5. GET /api/icu/alerts - **NEW** endpoint

## Key Differences Highlighted

### GET /api/icu/beds
```diff
- res.json(beds.map(b => ({ ...b, latestVitals: {...} })))
+ const bedsWithDetails = await Promise.all(beds.map(async (bed) => {
+   // Fetch patient and admission details
+   let patient = null;
+   let admission = null;
+   if (bed.currentPatient && bed.admissionId) {
+     const admissionRecord = await prisma.admission.findUnique(...)
+     // Calculate age, format data
+   }
+   return { id, bedNumber, icuUnit, status, patient, admission, latestVitals }
+ }))
+ res.json(bedsWithDetails)
```

### POST /api/icu/vitals
```diff
- app.post('/api/icu/vitals', authenticateToken, validateBody(icuVitalsSchema), async...
+ app.post('/api/icu/vitals', authenticateToken, async...

- const { icuBedId, patientId, heartRate, systolicBP, diastolicBP, temperature, spo2... } = req.body;
+ const { bedId, hr, bp, spo2, temp, rr, gcs, cvp, uop, notes } = req.body;

+ // Get bed info to retrieve patient
+ const bed = await prisma.iCUBed.findUnique({ where: { id: bedId } })
+ if (!bed || !bed.currentPatient) return res.status(400)...

+ // Parse BP from "120/80" format
+ let systolicBP = null, diastolicBP = null;
+ if (bp && bp.includes('/')) {
+   const [sys, dia] = bp.split('/');
+   systolicBP = parseInt(sys);
+   diastolicBP = parseInt(dia);
+ }

  const vitals = await prisma.iCUVitals.create({
    data: {
-     icuBedId,
-     patientId,
-     heartRate: heartRate ? parseInt(heartRate) : null,
+     icuBedId: bedId,
+     patientId: bed.currentPatient,
+     heartRate: hr ? parseInt(hr) : null,
      ...
    }
  })

+ // Check for critical values and create alerts
+ const criticalAlerts = [];
+ if (spo2 && parseInt(spo2) < 90) {
+   const alert = await prisma.criticalAlert.create(...)
+   criticalAlerts.push(alert);
+   console.log(`CRITICAL ALERT: SpO2 ${spo2}%...`)
+ }
+ // Similar for HR and Temp...

- res.status(201).json(vitals);
+ res.status(201).json({
+   vitals,
+   criticalAlerts: criticalAlerts.length > 0 ? criticalAlerts : undefined,
+   message: criticalAlerts.length > 0 ? `...alert(s) generated.` : '...successfully'
+ });
```

### POST /api/icu/ventilator
```diff
- const { icuBedId, ventilatorMode, fio2, peep } = req.body;
+ const { bedId, mode, fiO2, peep, tidalVolume, respiratoryRate, pressureSupport, notes } = req.body;

+ // Get bed info
+ const bed = await prisma.iCUBed.findUnique({ where: { id: bedId } })
+ if (!bed || !bed.currentPatient) return res.status(400)...

  const vitals = await prisma.iCUVitals.create({
    data: {
-     icuBedId,
-     ventilatorMode,
+     icuBedId: bedId,
+     patientId: bed.currentPatient,
+     ventilatorMode: mode,
+     fio2: fiO2 ? parseInt(fiO2) : null,
      peep: peep ? parseInt(peep) : null,
+     respiratoryRate: respiratoryRate ? parseInt(respiratoryRate) : null,
      recordedBy: req.user.userId,
    }
  })
```

### NEW: GET /api/icu/alerts
```diff
+ app.get('/api/icu/alerts', authenticateToken, async (req: any, res: Response) => {
+   try {
+     const { status, patientId } = req.query;
+     const where: any = {};
+     if (status) where.status = status;
+     if (patientId) where.patientId = patientId;
+
+     const alerts = await prisma.criticalAlert.findMany({
+       where,
+       include: { patient: { select: { id, name, mrn } } },
+       orderBy: { alertedAt: 'desc' },
+       take: 100,
+     });
+
+     res.json(alerts);
+   } catch (error) {
+     console.error('Get ICU alerts error:', error);
+     res.status(500).json({ error: 'Internal server error' });
+   }
+ });
```

## Backup Before Editing!

```bash
cp src/server.ts src/server.ts.backup-$(date +%Y%m%d-%H%M%S)
```

## After Replacing

1. Save the file
2. Restart the backend server:
   ```bash
   npm run dev
   ```
3. Check console for errors
4. Test endpoints using the frontend or Postman

## Quick Test

```bash
# Test GET /api/icu/beds
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/icu/beds

# Test GET /api/icu/alerts
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/icu/alerts
```

## Reference Files

- **REPLACE-ICU-SECTION.txt** - Exact code to copy
- **README-ICU-FIXES.md** - Complete documentation
- **ICU-FIXES-IMPLEMENTATION.md** - Implementation guide with examples
- **icu-endpoints-fixed.ts** - Standalone reference

---

**That's it!** The replacement should take less than 2 minutes and will immediately enable all ICU features including critical alerts.
