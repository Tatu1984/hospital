# Appointment Module API Testing Examples

This document provides ready-to-use API requests for testing all appointment enhancement features.

## Prerequisites

1. **Get Authentication Token:**
```bash
# Login first to get JWT token
curl -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'

# Save the token from response
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

2. **Get Doctor ID:**
```bash
# List all doctors
curl -X GET "http://localhost:3001/api/users" \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | select(.roleIds | contains(["doctor"]))'
```

## 1. Doctor Availability APIs

### Get Doctor's Available Slots

```bash
# Get availability for a specific date
curl -X GET "http://localhost:3001/api/doctors/DOC_ID_HERE/availability?date=2026-01-15" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq

# Expected Response:
{
  "date": "2026-01-15",
  "dayOfWeek": "thursday",
  "slots": [
    {
      "start": "09:00",
      "end": "09:30",
      "isBooked": false,
      "isAvailable": true
    },
    {
      "start": "09:30",
      "end": "10:00",
      "isBooked": true,
      "isAvailable": false
    }
  ],
  "totalSlots": 16,
  "availableSlots": 12,
  "bookedSlots": 4
}
```

### Test Different Days

```bash
# Monday (full schedule)
curl -X GET "http://localhost:3001/api/doctors/DOC_ID/availability?date=2026-01-12" \
  -H "Authorization: Bearer $TOKEN" | jq '.totalSlots'

# Saturday (half day)
curl -X GET "http://localhost:3001/api/doctors/DOC_ID/availability?date=2026-01-17" \
  -H "Authorization: Bearer $TOKEN" | jq '.totalSlots'

# Sunday (no slots)
curl -X GET "http://localhost:3001/api/doctors/DOC_ID/availability?date=2026-01-18" \
  -H "Authorization: Bearer $TOKEN" | jq '.message'
```

### Set Doctor Availability (Future Feature)

```bash
curl -X POST "http://localhost:3001/api/doctors/DOC_ID/availability" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": {
      "monday": { "start": "08:00", "end": "16:00", "slotDuration": 20 },
      "tuesday": { "start": "09:00", "end": "17:00", "slotDuration": 30 }
    }
  }' | jq

# Expected Response:
{
  "message": "Doctor availability updated successfully",
  "doctorId": "...",
  "schedule": { ... }
}
```

## 2. Conflict Detection

### Check for Conflicts

```bash
# Check if a time slot is available
curl -X POST "http://localhost:3001/api/appointments/check-conflict" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "DOC_ID_HERE",
    "appointmentDate": "2026-01-15",
    "appointmentTime": "10:00",
    "duration": 30
  }' | jq

# Response (No Conflict):
{
  "hasConflict": false,
  "message": "No conflicts found. Time slot is available."
}

# Response (With Conflict):
{
  "hasConflict": true,
  "conflicts": [
    {
      "appointmentId": "apt-123",
      "patientName": "John Doe",
      "time": "10:00"
    }
  ],
  "nextAvailableSlot": "10:30",
  "message": "Time slot conflicts with 1 existing appointment(s)"
}
```

### Check Conflict for Rescheduling

```bash
# Exclude current appointment when checking
curl -X POST "http://localhost:3001/api/appointments/check-conflict" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "DOC_ID",
    "appointmentDate": "2026-01-15",
    "appointmentTime": "11:00",
    "duration": 30,
    "excludeAppointmentId": "CURRENT_APT_ID"
  }' | jq
```

## 3. Appointment Booking with Conflict Check

### Complete Booking Flow

```bash
# Step 1: Get available slots
SLOTS=$(curl -s -X GET "http://localhost:3001/api/doctors/DOC_ID/availability?date=2026-01-15" \
  -H "Authorization: Bearer $TOKEN")
echo "$SLOTS" | jq '.slots[] | select(.isAvailable == true) | .start'

# Step 2: Check conflict for selected slot
curl -X POST "http://localhost:3001/api/appointments/check-conflict" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "DOC_ID",
    "appointmentDate": "2026-01-15",
    "appointmentTime": "14:00",
    "duration": 30
  }' | jq '.hasConflict'

# Step 3: Create appointment (if no conflict)
curl -X POST "http://localhost:3001/api/appointments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PATIENT_ID",
    "doctorId": "DOC_ID",
    "appointmentDate": "2026-01-15",
    "appointmentTime": "14:00",
    "type": "consultation",
    "reason": "Regular checkup",
    "department": "Cardiology"
  }' | jq
```

## 4. Rescheduling

### Reschedule an Appointment

```bash
curl -X POST "http://localhost:3001/api/appointments/APT_ID/reschedule" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentDate": "2026-01-16",
    "appointmentTime": "15:00",
    "reason": "Patient requested time change"
  }' | jq

# Expected Response:
{
  "id": "apt-123",
  "appointmentDate": "2026-01-16T00:00:00.000Z",
  "appointmentTime": "15:00",
  "status": "scheduled",
  "notes": "Rescheduled on 12/31/2025 from 01/15/2026 14:00. Reason: Patient requested time change",
  ...
}
```

### Handle Rescheduling Conflict

```bash
# Try to reschedule to an occupied slot
curl -X POST "http://localhost:3001/api/appointments/APT_ID/reschedule" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentDate": "2026-01-15",
    "appointmentTime": "10:00",
    "reason": "Patient preference"
  }' | jq

# Expected Response (409 Conflict):
{
  "error": "Time slot is already booked",
  "hasConflict": true
}
```

## 5. Appointment Reminders

### Send Manual Reminder

```bash
curl -X POST "http://localhost:3001/api/appointments/APT_ID/send-reminder" \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected Response:
{
  "message": "Reminder sent successfully",
  "appointmentId": "apt-123",
  "sentTo": {
    "sms": "+91XXXXXXXXXX",
    "email": "patient@example.com"
  }
}
```

### Schedule Automatic Reminders

```bash
curl -X POST "http://localhost:3001/api/appointments/schedule-reminders" \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected Response:
{
  "message": "Reminders scheduled successfully",
  "totalAppointments": 25,
  "remindersSent": 8
}
```

## 6. Complete Workflow Examples

### Example 1: New Patient Appointment

```bash
#!/bin/bash
# Save as: book_appointment.sh

TOKEN="YOUR_TOKEN"
DOCTOR_ID="doc-123"
PATIENT_ID="pat-456"
DATE="2026-01-20"

echo "1. Fetching available slots..."
SLOTS=$(curl -s -X GET "http://localhost:3001/api/doctors/$DOCTOR_ID/availability?date=$DATE" \
  -H "Authorization: Bearer $TOKEN")

AVAILABLE=$(echo "$SLOTS" | jq -r '.slots[] | select(.isAvailable == true) | .start' | head -1)
echo "   First available slot: $AVAILABLE"

echo "2. Checking for conflicts..."
CONFLICT=$(curl -s -X POST "http://localhost:3001/api/appointments/check-conflict" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"doctorId\": \"$DOCTOR_ID\",
    \"appointmentDate\": \"$DATE\",
    \"appointmentTime\": \"$AVAILABLE\"
  }")

HAS_CONFLICT=$(echo "$CONFLICT" | jq -r '.hasConflict')

if [ "$HAS_CONFLICT" == "false" ]; then
  echo "   No conflicts found. Proceeding with booking..."

  APPOINTMENT=$(curl -s -X POST "http://localhost:3001/api/appointments" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"patientId\": \"$PATIENT_ID\",
      \"doctorId\": \"$DOCTOR_ID\",
      \"appointmentDate\": \"$DATE\",
      \"appointmentTime\": \"$AVAILABLE\",
      \"type\": \"consultation\",
      \"department\": \"General\"
    }")

  APT_ID=$(echo "$APPOINTMENT" | jq -r '.id')
  echo "   Appointment created: $APT_ID"

  echo "3. Sending confirmation reminder..."
  curl -s -X POST "http://localhost:3001/api/appointments/$APT_ID/send-reminder" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.message'
else
  echo "   Conflict detected! Next available: $(echo "$CONFLICT" | jq -r '.nextAvailableSlot')"
fi
```

### Example 2: Reschedule with Conflict Handling

```bash
#!/bin/bash
# Save as: reschedule_appointment.sh

TOKEN="YOUR_TOKEN"
APT_ID="apt-123"
NEW_DATE="2026-01-22"
NEW_TIME="14:00"

echo "Attempting to reschedule appointment $APT_ID to $NEW_DATE $NEW_TIME..."

RESULT=$(curl -s -X POST "http://localhost:3001/api/appointments/$APT_ID/reschedule" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"appointmentDate\": \"$NEW_DATE\",
    \"appointmentTime\": \"$NEW_TIME\",
    \"reason\": \"Patient requested change\"
  }")

if echo "$RESULT" | jq -e '.hasConflict' > /dev/null 2>&1; then
  echo "Conflict detected! Slot already booked."

  # Get doctor ID from original appointment
  DOCTOR_ID=$(curl -s -X GET "http://localhost:3001/api/appointments/$APT_ID" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.doctorId')

  # Find next available
  echo "Finding alternative slots..."
  curl -s -X GET "http://localhost:3001/api/doctors/$DOCTOR_ID/availability?date=$NEW_DATE" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.slots[] | select(.isAvailable == true) | .start'
else
  echo "Rescheduled successfully!"
  echo "$RESULT" | jq '{id, appointmentDate, appointmentTime, status}'
fi
```

### Example 3: Daily Reminder Cron Job

```bash
#!/bin/bash
# Save as: daily_reminders.sh
# Add to crontab: 0 * * * * /path/to/daily_reminders.sh

TOKEN="YOUR_TOKEN"
LOG_FILE="/var/log/appointment-reminders.log"

echo "[$(date)] Running appointment reminder job..." >> "$LOG_FILE"

RESULT=$(curl -s -X POST "http://localhost:3001/api/appointments/schedule-reminders" \
  -H "Authorization: Bearer $TOKEN")

echo "$RESULT" | jq '{message, totalAppointments, remindersSent}' >> "$LOG_FILE"

# Alert if failures
SENT=$(echo "$RESULT" | jq -r '.remindersSent')
TOTAL=$(echo "$RESULT" | jq -r '.totalAppointments')

if [ "$SENT" -lt "$TOTAL" ]; then
  echo "[WARN] Only $SENT out of $TOTAL reminders sent" >> "$LOG_FILE"
  # Send alert email
  echo "Reminder job incomplete. Check logs." | mail -s "Appointment Reminder Alert" admin@hospital.com
fi
```

## Testing Checklist

Use this checklist to verify all features:

**Doctor Availability:**
- [ ] GET slots for Monday (should have 16 slots)
- [ ] GET slots for Saturday (should have 8 slots)
- [ ] GET slots for Sunday (should have 0 slots)
- [ ] Verify booked slots are marked correctly
- [ ] POST custom schedule (should return success)

**Conflict Detection:**
- [ ] Check available slot (hasConflict: false)
- [ ] Check booked slot (hasConflict: true)
- [ ] Verify nextAvailableSlot is suggested
- [ ] Test with excludeAppointmentId parameter

**Appointment Booking:**
- [ ] Create appointment on available slot (success)
- [ ] Try to create on booked slot (should fail)
- [ ] Verify confirmation notification sent

**Rescheduling:**
- [ ] Reschedule to available slot (success)
- [ ] Try to reschedule to booked slot (409 error)
- [ ] Verify notes updated with reschedule history
- [ ] Confirm notification sent

**Reminders:**
- [ ] Send manual reminder (success)
- [ ] Verify SMS/Email logged in backend
- [ ] Run schedule-reminders (check remindersSent)
- [ ] Test with appointment without contact info (should skip)

## Monitoring & Debugging

### Check Backend Logs

```bash
# Watch logs in real-time
tail -f backend/logs/combined.log | grep -i appointment

# Check notification logs
tail -f backend/logs/combined.log | grep -i notification

# Filter by error
tail -f backend/logs/error.log
```

### Database Queries

```sql
-- Check appointments for a doctor
SELECT * FROM "Appointment"
WHERE "doctorId" = 'DOC_ID'
  AND "appointmentDate" >= CURRENT_DATE
ORDER BY "appointmentDate", "appointmentTime";

-- Find conflicts
SELECT a1.id, a1."appointmentTime", a2.id, a2."appointmentTime"
FROM "Appointment" a1
JOIN "Appointment" a2
  ON a1."doctorId" = a2."doctorId"
  AND a1."appointmentDate" = a2."appointmentDate"
  AND a1."appointmentTime" = a2."appointmentTime"
  AND a1.id < a2.id
WHERE a1.status NOT IN ('cancelled', 'no-show')
  AND a2.status NOT IN ('cancelled', 'no-show');

-- Count appointments by status
SELECT status, COUNT(*)
FROM "Appointment"
GROUP BY status;
```

## Performance Testing

### Load Test - Multiple Availability Checks

```bash
#!/bin/bash
# Simulate 100 concurrent availability checks

TOKEN="YOUR_TOKEN"
DOCTOR_ID="doc-123"

for i in {1..100}; do
  (curl -s -X GET "http://localhost:3001/api/doctors/$DOCTOR_ID/availability?date=2026-01-15" \
    -H "Authorization: Bearer $TOKEN" > /dev/null &)
done

wait
echo "Completed 100 concurrent requests"
```

### Benchmark Response Times

```bash
# Install apache bench: apt-get install apache2-utils

ab -n 100 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/doctors/DOC_ID/availability?date=2026-01-15"
```

## Common Issues & Solutions

**401 Unauthorized:**
```bash
# Token expired, login again
TOKEN=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')
```

**400 Bad Request - Invalid Date:**
```bash
# Ensure date format is YYYY-MM-DD
DATE=$(date -I -d "+7 days")  # Linux
DATE=$(date -v +7d +%Y-%m-%d) # macOS
```

**500 Internal Server Error:**
```bash
# Check backend logs
docker logs hospital-backend
# or
npm run logs
```

## Additional Resources

- Full Documentation: `/APPOINTMENT_MODULE_COMPLETION.md`
- Integration Guide: `/QUICK_INTEGRATION_GUIDE.md`
- Backend Code: `/backend/src/appointment-enhancements.ts`
- Frontend Code: `/frontend/src/pages/Appointment.tsx`

---

**Quick Test Command:**
```bash
# Test all endpoints in sequence
bash << 'EOF'
TOKEN="YOUR_TOKEN"
DOCTOR="doc-123"
DATE="2026-01-20"

echo "Testing Appointment Module APIs..."
echo "1. Doctor Availability" && \
curl -s "http://localhost:3001/api/doctors/$DOCTOR/availability?date=$DATE" -H "Authorization: Bearer $TOKEN" | jq -r '.totalSlots' && \
echo "2. Conflict Check" && \
curl -s -X POST "http://localhost:3001/api/appointments/check-conflict" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"doctorId\":\"$DOCTOR\",\"appointmentDate\":\"$DATE\",\"appointmentTime\":\"14:00\"}" | jq -r '.hasConflict' && \
echo "3. Schedule Reminders" && \
curl -s -X POST "http://localhost:3001/api/appointments/schedule-reminders" -H "Authorization: Bearer $TOKEN" | jq -r '.message'
echo "All tests completed!"
EOF
```
