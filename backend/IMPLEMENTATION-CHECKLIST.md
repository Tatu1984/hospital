# ICU API Fixes - Implementation Checklist

## Pre-Implementation

- [ ] Review all documentation files:
  - [ ] README-ICU-FIXES.md (comprehensive overview)
  - [ ] VISUAL-GUIDE.md (step-by-step visual instructions)
  - [ ] REPLACE-ICU-SECTION.txt (exact code to copy)
  - [ ] ICU-FIXES-IMPLEMENTATION.md (detailed technical guide)

- [ ] Backup current server.ts:
  ```bash
  cd /Users/sudipto/Desktop/projects/hospitalerp/backend
  cp src/server.ts src/server.ts.backup-$(date +%Y%m%d-%H%M%S)
  ```

## Implementation Steps

- [ ] **Step 1**: Open `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/server.ts`

- [ ] **Step 2**: Navigate to line ~4339 (search for "// ICU & CRITICAL CARE APIs")

- [ ] **Step 3**: Select from that comment through the end of `app.post('/api/icu/ventilator'...)` (should end around line 4449)

- [ ] **Step 4**: Open `REPLACE-ICU-SECTION.txt` and copy the new code (everything after the header comments)

- [ ] **Step 5**: Paste the new code to replace the selected section

- [ ] **Step 6**: Verify the next section is "// OPERATION THEATRE APIs"

- [ ] **Step 7**: Save the file

- [ ] **Step 8**: Restart backend server:
  ```bash
  npm run dev
  ```

- [ ] **Step 9**: Check console for any errors

## Post-Implementation Testing

### GET /api/icu/beds

- [ ] Test with no beds: Returns empty array `[]`
- [ ] Test with vacant bed: Returns bed with `patient: null, admission: null`
- [ ] Test with occupied bed: Returns bed with full patient and admission data
- [ ] Verify patient age is calculated from DOB
- [ ] Verify status is uppercase (AVAILABLE, OCCUPIED, MAINTENANCE)
- [ ] Verify vital signs are strings ("85" not 85)
- [ ] Verify isVentilated flag is set correctly based on ventilatorMode

### POST /api/icu/vitals

#### Normal Values Test
- [ ] Test with all fields filled:
  ```json
  {
    "bedId": "valid-bed-id",
    "hr": "75",
    "bp": "120/80",
    "spo2": "98",
    "temp": "98.6",
    "rr": "16",
    "gcs": "15"
  }
  ```
- [ ] Verify returns: `{ vitals: {...}, message: "Vitals recorded successfully" }`
- [ ] Verify NO criticalAlerts in response

#### Critical Values Test - SpO2
- [ ] Test with SpO2 = 89:
  ```json
  {
    "bedId": "valid-bed-id",
    "hr": "75",
    "bp": "120/80",
    "spo2": "89",
    "temp": "98.6",
    "rr": "16",
    "gcs": "15"
  }
  ```
- [ ] Verify returns criticalAlerts array with SpO2 alert
- [ ] Verify console log: "CRITICAL ALERT: SpO2 89%..."
- [ ] Verify message: "Vitals recorded. 1 critical alert(s) generated."
- [ ] Verify alert is saved in database (check GET /api/icu/alerts)

#### Critical Values Test - Heart Rate Low
- [ ] Test with HR = 39:
  ```json
  {
    "bedId": "valid-bed-id",
    "hr": "39",
    "bp": "120/80",
    "spo2": "98",
    "temp": "98.6"
  }
  ```
- [ ] Verify returns criticalAlerts array with HR alert
- [ ] Verify console log: "CRITICAL ALERT: Heart Rate 39 bpm..."
- [ ] Verify alert testName is "Heart Rate"

#### Critical Values Test - Heart Rate High
- [ ] Test with HR = 141:
  ```json
  {
    "bedId": "valid-bed-id",
    "hr": "141",
    "bp": "120/80",
    "spo2": "98",
    "temp": "98.6"
  }
  ```
- [ ] Verify returns criticalAlerts array with HR alert
- [ ] Verify console log shows HR = 141

#### Critical Values Test - Temperature Low
- [ ] Test with Temp = 94.9:
  ```json
  {
    "bedId": "valid-bed-id",
    "hr": "75",
    "bp": "120/80",
    "spo2": "98",
    "temp": "94.9"
  }
  ```
- [ ] Verify returns criticalAlerts array with Temperature alert
- [ ] Verify console log: "CRITICAL ALERT: Temperature 94.9°F..."

#### Critical Values Test - Temperature High
- [ ] Test with Temp = 104.1:
  ```json
  {
    "bedId": "valid-bed-id",
    "hr": "75",
    "bp": "120/80",
    "spo2": "98",
    "temp": "104.1"
  }
  ```
- [ ] Verify returns criticalAlerts array with Temperature alert
- [ ] Verify unit is "°F"

#### Critical Values Test - Multiple Alerts
- [ ] Test with SpO2 = 88, HR = 150, Temp = 105:
  ```json
  {
    "bedId": "valid-bed-id",
    "hr": "150",
    "bp": "140/95",
    "spo2": "88",
    "temp": "105",
    "rr": "24",
    "gcs": "12"
  }
  ```
- [ ] Verify returns criticalAlerts array with 3 alerts
- [ ] Verify console shows 3 log lines
- [ ] Verify message: "Vitals recorded. 3 critical alert(s) generated."
- [ ] Verify all 3 alerts have same orderId (vitals.id)

#### Edge Cases
- [ ] Test with no patient on bed:
  ```json
  { "bedId": "vacant-bed-id", "hr": "75", "bp": "120/80" }
  ```
- [ ] Verify returns 400 error: "No patient assigned to this bed"

- [ ] Test with invalid bedId:
  ```json
  { "bedId": "invalid-id", "hr": "75" }
  ```
- [ ] Verify appropriate error response

- [ ] Test BP parsing:
  - [ ] BP = "120/80" → systolic: 120, diastolic: 80
  - [ ] BP = "90/60" → systolic: 90, diastolic: 60
  - [ ] BP = "" → systolic: null, diastolic: null

### POST /api/icu/ventilator

- [ ] Test with all parameters:
  ```json
  {
    "bedId": "valid-bed-id",
    "mode": "AC",
    "fiO2": "40",
    "peep": "5",
    "tidalVolume": "450",
    "respiratoryRate": "12",
    "pressureSupport": "10",
    "notes": "Patient stable"
  }
  ```
- [ ] Verify returns: `{ message: "Ventilator settings updated", vitals: {...} }`
- [ ] Verify vitals record created with correct parameters
- [ ] Verify patientId is set correctly

- [ ] Test with no patient on bed:
  ```json
  { "bedId": "vacant-bed-id", "mode": "AC" }
  ```
- [ ] Verify returns 400 error: "No patient assigned to this bed"

### GET /api/icu/alerts

- [ ] Test with no filters:
  ```
  GET /api/icu/alerts
  ```
- [ ] Verify returns array of alerts (most recent first)
- [ ] Verify includes patient: { id, name, mrn }
- [ ] Verify limited to 100 alerts

- [ ] Test with status filter:
  ```
  GET /api/icu/alerts?status=unacknowledged
  ```
- [ ] Verify only returns unacknowledged alerts

- [ ] Test with patientId filter:
  ```
  GET /api/icu/alerts?patientId=patient-uuid
  ```
- [ ] Verify only returns alerts for that patient

- [ ] Test with both filters:
  ```
  GET /api/icu/alerts?status=unacknowledged&patientId=patient-uuid
  ```
- [ ] Verify returns filtered results

## Frontend Integration Testing

- [ ] Open frontend ICU module: `http://localhost:3000/icu`

### Bed Display
- [ ] Verify all beds are displayed
- [ ] Verify occupied beds show patient name, MRN, age, gender
- [ ] Verify occupied beds show diagnosis
- [ ] Verify ventilated patients show ventilator badge
- [ ] Verify latest vitals are displayed correctly
- [ ] Verify vital colors:
  - [ ] Critical values in red (SpO2 < 90, HR < 40 or > 140, Temp < 95 or > 104)
  - [ ] Warning values in yellow (SpO2 < 94, HR < 50 or > 120, Temp < 96.8 or > 100.4)
  - [ ] Normal values in default color

### Record Vitals
- [ ] Click "Vitals" button on occupied bed
- [ ] Fill in vital signs form
- [ ] Submit and verify success message
- [ ] Verify vitals update in real-time
- [ ] Test with critical value (e.g., SpO2 = 88)
- [ ] Verify alert notification (if implemented in frontend)

### Ventilator Settings
- [ ] Click "Vent" button on ventilated patient
- [ ] Fill in ventilator settings
- [ ] Submit and verify success message
- [ ] Verify mode updates on bed card

### Critical Alerts (if frontend has alerts panel)
- [ ] Verify critical alerts are displayed
- [ ] Verify patient name and MRN shown
- [ ] Verify test name, value, and timestamp shown
- [ ] Verify status (unacknowledged/acknowledged)

## Database Verification

- [ ] Check ICUVitals table has new records
- [ ] Check CriticalAlert table has alert records
- [ ] Verify CriticalAlert.orderId matches ICUVitals.id
- [ ] Verify CriticalAlert.patientId is correct
- [ ] Verify CriticalAlert.status is "unacknowledged" initially

## Performance Testing

- [ ] Test GET /api/icu/beds with 20+ beds (should be fast)
- [ ] Test POST /api/icu/vitals multiple times rapidly
- [ ] Verify no race conditions
- [ ] Check server logs for any warnings

## Rollback Plan (if needed)

If issues occur:

1. [ ] Stop backend server
2. [ ] Restore backup:
   ```bash
   cp src/server.ts.backup src/server.ts
   ```
3. [ ] Restart server
4. [ ] Report issues found

## Documentation Review

- [ ] All code changes documented
- [ ] All endpoints tested
- [ ] All critical thresholds verified
- [ ] Frontend compatibility confirmed

## Final Sign-Off

- [ ] All tests passed
- [ ] No console errors
- [ ] Frontend displays correctly
- [ ] Critical alerts working as expected
- [ ] Documentation reviewed
- [ ] Ready for production

## Notes

Record any issues or observations:

---

**Date Implemented**: _______________

**Implemented By**: _______________

**Test Results**: _______________

**Issues Found**: _______________

**Resolution**: _______________

---

## Success Criteria

✅ All 4 endpoints working (GET beds, POST vitals, POST ventilator, GET alerts)
✅ Patient and admission data returned correctly
✅ Critical alerts generated for SpO2, HR, and Temp
✅ Alerts saved to database
✅ Console logs show alert messages
✅ Frontend displays all data correctly
✅ No errors in server console
✅ All test cases passed

**Status**: [ ] PASSED  [ ] FAILED  [ ] PENDING
