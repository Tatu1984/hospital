# Nursing Module API Updates

## Summary of Changes

The following endpoints have been added or need to be updated in `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/server.ts`:

### ✅ COMPLETED - Added New Endpoints

1. **GET /api/nursing/patients** (Added at line ~9484)
   - Returns admitted patients with ward and bed information
   - Filters by active admissions only
   - Returns: id, name, mrn, wardName, bedNumber, admissionDate, admissionId

2. **GET /api/nursing/medications** (Added at line ~9537)
   - Returns medication administration tasks
   - Includes patient names
   - Filters by today and upcoming medications
   - Returns: id, patientId, patientName, medication, dosage, route, scheduledTime, status, administeredBy, administeredAt

3. **POST /api/nursing/medication-admin** (Updated at line ~9751)
   - NOW SUPPORTS: medicationId parameter for updating existing medication records
   - When medicationId is provided, it updates the existing record
   - When medicationId is not provided, it creates a new record
   - Handles both administeredAt and administeredTime parameters from frontend

### ⚠️ NEEDS MANUAL UPDATE - Patch Files Created

Due to file linter conflicts, the following endpoints need to be manually updated using the patch files:

4. **POST /api/nursing/vitals** (Line ~10055)
   - **Patch File**: `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/nursing-vitals-update.ts`
   - **Changes Needed**:
     - Add support for `pulse` parameter (maps to heartRate)
     - Add support for `bloodPressure` parameter (parses to systolicBP/diastolicBP)
     - Add support for `oxygenSaturation` parameter (maps to spo2)
     - Parse string values to appropriate numeric types

5. **GET /api/nursing/vitals** (Line ~9967)
   - **Patch File**: `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/nursing-vitals-get-update.ts`
   - **Changes Needed**:
     - Return data in frontend format
     - Combine systolicBP/diastolicBP into bloodPressure string
     - Map heartRate to pulse
     - Map spo2 to oxygenSaturation
     - Include patient names

6. **POST /api/nursing/handover** (Line ~9993)
   - **Patch File**: `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/nursing-handover-update.ts`
   - **Changes Needed**:
     - Add support for frontend parameters: criticalIssues, pendingTasks, medications
     - Map fromNurse to handoverFrom
     - Map toNurse to handoverTo
     - Combine criticalIssues, pendingTasks, medications into notes field
     - Support timestamp parameter as alternative to date

7. **GET /api/nursing/handover** (Line ~9958)
   - **Patch File**: `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/nursing-handover-get-update.ts`
   - **Changes Needed**:
     - Parse combined notes field back into criticalIssues, pendingTasks, medications
     - Map handoverFrom to fromNurse
     - Map handoverTo to toNurse
     - Return timestamp field

## Manual Update Instructions

For endpoints 4-7, please:

1. Open `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/server.ts`
2. Find the corresponding endpoint (line numbers provided above)
3. Open the corresponding patch file
4. Replace the existing endpoint code with the code from the patch file
5. Save the file

## Testing Recommendations

After applying all updates, test the following:

1. **Patient List**: Verify GET /api/nursing/patients returns admitted patients
2. **Medication Tasks**: Verify GET /api/nursing/medications returns pending medications
3. **Administer Medication**: Click "Administer" button and verify it updates the record
4. **Record Vitals**: Enter vitals with blood pressure as "120/80" and verify it saves correctly
5. **View Vitals**: Verify vitals display with correct blood pressure format
6. **Create Handover**: Fill all handover fields and verify they save
7. **View Handover**: Verify handover notes display with separate fields

## Database Schema Notes

The endpoints use these Prisma models:
- `Admission` - for patient admissions
- `Patient` - for patient information
- `Bed` - for bed assignments
- `MedicationAdministration` - for medication records
- `NursingVitals` - for vital signs
- `HandoverNote` - for shift handovers
- `DutyRoster` - for duty rosters (already working)

All endpoints include proper authentication via `authenticateToken` middleware and tenant/branch filtering.
