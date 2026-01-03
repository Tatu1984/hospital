# Appointment Module - Complete Implementation

## Overview
This document describes the complete implementation of the Appointment module with doctor availability, conflict detection, and automated reminders.

## Backend Implementation

### Files Created/Modified

#### 1. `/backend/src/appointment-enhancements.ts`
New file containing all the appointment enhancement handlers:

**Doctor Availability APIs:**
- `getDoctorAvailability()` - GET /api/doctors/:id/availability?date=YYYY-MM-DD
- `setDoctorAvailability()` - POST /api/doctors/:id/availability

**Conflict Detection:**
- `checkAppointmentConflict()` - POST /api/appointments/check-conflict
- `rescheduleAppointment()` - POST /api/appointments/:id/reschedule

**Reminder Management:**
- `sendAppointmentReminder()` - POST /api/appointments/:id/send-reminder
- `scheduleAppointmentReminders()` - POST /api/appointments/schedule-reminders

#### 2. Integration with server.ts

Add the following import to `/backend/src/server.ts` (around line 40-55):

```typescript
import {
  getDoctorAvailability,
  setDoctorAvailability,
  checkAppointmentConflict,
  rescheduleAppointment,
  sendAppointmentReminder,
  scheduleAppointmentReminders
} from './appointment-enhancements';
```

Add the following routes after existing appointment routes (after line 2756):

```typescript
// Doctor availability APIs
app.get('/api/doctors/:id/availability', authenticateToken, getDoctorAvailability);
app.post('/api/doctors/:id/availability', authenticateToken, setDoctorAvailability);

// Conflict detection and rescheduling
app.post('/api/appointments/check-conflict', authenticateToken, checkAppointmentConflict);
app.post('/api/appointments/:id/reschedule', authenticateToken, rescheduleAppointment);

// Reminder APIs
app.post('/api/appointments/:id/send-reminder', authenticateToken, sendAppointmentReminder);
app.post('/api/appointments/schedule-reminders', authenticateToken, scheduleAppointmentReminders);
```

## API Endpoints

### 1. Doctor Availability

#### GET /api/doctors/:id/availability
Get doctor's available slots for a specific date.

**Query Parameters:**
- `date` (required): Date in YYYY-MM-DD format

**Response:**
```json
{
  "date": "2025-12-31",
  "dayOfWeek": "tuesday",
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

**Features:**
- Generates time slots based on doctor's working hours
- Default schedule: Mon-Fri 9 AM - 5 PM (30-min slots), Sat 9 AM - 1 PM
- Marks booked slots from existing appointments
- Excludes cancelled and no-show appointments

#### POST /api/doctors/:id/availability
Set custom availability schedule for a doctor.

**Request Body:**
```json
{
  "schedule": {
    "monday": { "start": "09:00", "end": "17:00", "slotDuration": 30 },
    "tuesday": { "start": "09:00", "end": "17:00", "slotDuration": 30 }
  }
}
```

**Note:** Currently returns success message. In production, this would update a DoctorSchedule table.

### 2. Conflict Detection

#### POST /api/appointments/check-conflict
Check if an appointment time conflicts with existing appointments.

**Request Body:**
```json
{
  "doctorId": "doc-123",
  "appointmentDate": "2025-12-31",
  "appointmentTime": "10:00",
  "duration": 30,
  "excludeAppointmentId": "apt-456" // optional, for rescheduling
}
```

**Response (No Conflict):**
```json
{
  "hasConflict": false,
  "message": "No conflicts found. Time slot is available."
}
```

**Response (With Conflict):**
```json
{
  "hasConflict": true,
  "conflicts": [
    {
      "appointmentId": "apt-789",
      "patientName": "John Doe",
      "time": "10:00"
    }
  ],
  "nextAvailableSlot": "10:30",
  "message": "Time slot conflicts with 1 existing appointment(s)"
}
```

**Features:**
- Detects overlapping time slots
- Suggests next available slot
- Handles appointment duration
- Excludes specific appointment ID (for rescheduling)

### 3. Rescheduling

#### POST /api/appointments/:id/reschedule
Reschedule an existing appointment.

**Request Body:**
```json
{
  "appointmentDate": "2025-12-31",
  "appointmentTime": "14:00",
  "reason": "Patient requested time change"
}
```

**Response:**
```json
{
  "id": "apt-123",
  "patientId": "pat-456",
  "doctorId": "doc-789",
  "appointmentDate": "2025-12-31T00:00:00.000Z",
  "appointmentTime": "14:00",
  "status": "scheduled",
  "notes": "Rescheduled on 12/31/2025 from 12/30/2025 10:00. Reason: Patient requested time change",
  "patient": { ... },
  "doctor": { ... }
}
```

**Features:**
- Validates no conflicts before rescheduling
- Returns 409 if slot is already booked
- Appends reschedule history to notes
- Sends confirmation notification to patient

### 4. Appointment Reminders

#### POST /api/appointments/:id/send-reminder
Manually send reminder to patient.

**Response:**
```json
{
  "message": "Reminder sent successfully",
  "appointmentId": "apt-123",
  "sentTo": {
    "sms": "+91XXXXXXXXXX",
    "email": "patient@example.com"
  }
}
```

**Features:**
- Sends SMS and Email reminders
- Uses notificationService with APPOINTMENT_REMINDER template
- Validates patient has contact information

#### POST /api/appointments/schedule-reminders
Auto-schedule reminders for upcoming appointments.

**Response:**
```json
{
  "message": "Reminders scheduled successfully",
  "totalAppointments": 25,
  "remindersSent": 8
}
```

**Features:**
- Finds appointments in next 2 days
- Sends 24-hour reminder (23-25 hours before)
- Sends 1-hour reminder (0.5-2 hours before)
- Only for 'scheduled' and 'confirmed' appointments
- Skips patients without contact info

**Production Enhancement:**
Use a job queue (Bull, Agenda, BullMQ) for scheduled reminders:
```typescript
// Example with Bull
import Queue from 'bull';
const reminderQueue = new Queue('appointment-reminders', 'redis://localhost:6379');

// Schedule reminder
reminderQueue.add('send-reminder', {
  appointmentId: 'apt-123',
  type: '24-hour'
}, {
  delay: oneDayBefore.getTime() - Date.now()
});
```

## Frontend Implementation

### File Modified: `/frontend/src/pages/Appointment.tsx`

#### New Features Added:

**1. Available Slots Display**
- Shows time slots in a grid when doctor and date are selected
- Green for available, red for booked
- Click to select a slot
- Auto-loads when doctor/date changes

**2. Conflict Detection UI**
- Real-time conflict checking when slot is selected
- Warning alert for conflicts
- Suggests next available slot with quick select button
- Success indicator for available slots

**3. Send Reminder Button**
- New action button in appointments table
- Sends immediate reminder to patient
- Disabled for cancelled/completed appointments

**4. Enhanced Reschedule Dialog**
- Similar slot selection as booking
- Conflict detection during rescheduling
- Prevents double-booking

#### New State Variables:
```typescript
const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
const [conflictWarning, setConflictWarning] = useState<ConflictCheckResult | null>(null);
const [loadingSlots, setLoadingSlots] = useState(false);
```

#### New Functions:
```typescript
fetchAvailableSlots(doctorId, date)  // Fetches available time slots
checkConflict(doctorId, date, time)  // Checks for conflicts
handleSendReminder(appointment)      // Sends reminder manually
```

## UI Components Used

**New Components:**
- `Alert` and `AlertDescription` - For conflict warnings and success messages
- `Bell`, `AlertTriangle`, `CheckCircle` icons from lucide-react

**Enhanced Dialogs:**
- Slot selection grid with visual indicators
- Real-time conflict alerts
- Available/booked slot highlighting

## Integration Steps

### Backend Integration:

1. **Copy the enhancement file:**
```bash
# File already created at:
/Users/sudipto/Desktop/projects/hospitalerp/backend/src/appointment-enhancements.ts
```

2. **Update server.ts:**
- Add import statement (line ~40-55)
- Add route definitions (after line 2756)
- See `/backend/src/appointment-routes.txt` for exact code

3. **Test the APIs:**
```bash
# Start the backend server
cd backend
npm run dev

# Test doctor availability
curl -X GET "http://localhost:3001/api/doctors/doc-1/availability?date=2025-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test conflict check
curl -X POST "http://localhost:3001/api/appointments/check-conflict" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "doc-1",
    "appointmentDate": "2025-12-31",
    "appointmentTime": "10:00"
  }'
```

### Frontend Integration:

1. **File already updated:**
```bash
/Users/sudipto/Desktop/projects/hospitalerp/frontend/src/pages/Appointment.tsx
```

2. **Update API calls:**
Replace mock API calls with actual backend calls:

```typescript
// In fetchAvailableSlots function (line ~106)
const response = await fetch(
  `/api/doctors/${doctorId}/availability?date=${date}`,
  {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  }
);
const data = await response.json();
setAvailableSlots(data.slots);

// In checkConflict function (line ~135)
const response = await fetch('/api/appointments/check-conflict', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  },
  body: JSON.stringify({
    doctorId,
    appointmentDate: date,
    appointmentTime: time
  })
});
const data = await response.json();
setConflictWarning(data);

// In handleSendReminder function (line ~224)
await fetch(`/api/appointments/${appointment.id}/send-reminder`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

## Database Considerations

### Future Enhancements - Add DoctorSchedule Table:

```prisma
model DoctorSchedule {
  id          String   @id @default(uuid())
  doctorId    String
  dayOfWeek   String   // monday, tuesday, etc.
  startTime   String   // HH:MM format
  endTime     String   // HH:MM format
  slotDuration Int     // in minutes
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  doctor      User     @relation(fields: [doctorId], references: [id])

  @@unique([doctorId, dayOfWeek])
  @@index([doctorId])
}
```

### Future Enhancements - Add ReminderLog Table:

```prisma
model ReminderLog {
  id            String   @id @default(uuid())
  appointmentId String
  sentAt        DateTime @default(now())
  sentVia       String   // sms, email, both
  reminderType  String   // 24-hour, 1-hour, manual
  status        String   // sent, failed

  appointment   Appointment @relation(fields: [appointmentId], references: [id])

  @@index([appointmentId])
}
```

## Testing Checklist

### Backend:
- [ ] Doctor availability returns correct slots for different days
- [ ] Booked slots are correctly marked as unavailable
- [ ] Conflict detection identifies overlapping appointments
- [ ] Next available slot suggestion works correctly
- [ ] Reschedule updates appointment and sends notification
- [ ] Manual reminder sends SMS/Email
- [ ] Auto-schedule reminders processes upcoming appointments
- [ ] Sunday returns empty slots (not in default schedule)

### Frontend:
- [ ] Slots load when doctor and date are selected
- [ ] Clicking a slot selects it
- [ ] Booked slots are disabled and marked
- [ ] Conflict warning shows for unavailable slots
- [ ] "Select next available" button works
- [ ] Success message shows for available slots
- [ ] Send Reminder button triggers notification
- [ ] Reschedule dialog shows available slots
- [ ] Form validates required fields

## Usage Examples

### Example 1: Booking with Slot Selection
1. User selects department and doctor
2. User selects appointment date
3. System loads available slots for that doctor/date
4. User clicks an available time slot
5. System validates slot is available (green checkmark)
6. User completes booking

### Example 2: Handling Conflicts
1. User tries to select a booked slot (red)
2. Button is disabled, cannot select
3. User selects another slot that's taken
4. Warning shows: "This time slot is already booked"
5. System suggests: "Next available: 14:30" with Select button
6. User clicks Select to use suggested time

### Example 3: Sending Reminders
1. Staff views appointment list
2. Clicks "Reminder" button for an appointment
3. System sends SMS and Email to patient
4. Success message shows which channels were used

### Example 4: Auto-scheduling Reminders
1. System runs scheduled job (cron: every hour)
2. Finds appointments 23-25 hours away → sends 24-hour reminder
3. Finds appointments 0.5-2 hours away → sends 1-hour reminder
4. Logs reminder activity

## Configuration

### Environment Variables:
Already configured in `.env`:
```
SMS_PROVIDER=mock
EMAIL_PROVIDER=mock
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_number
```

### Default Doctor Schedule:
Modify in `appointment-enhancements.ts` line 18-26:
```typescript
const defaultSchedule = {
  monday: { start: '09:00', end: '17:00', slotDuration: 30 },
  tuesday: { start: '09:00', end: '17:00', slotDuration: 30 },
  // ... customize as needed
};
```

## Production Recommendations

1. **Add Job Queue for Reminders:**
   - Use Bull or BullMQ with Redis
   - Schedule reminders when appointment is created
   - Handle retry logic for failed sends

2. **Add Doctor Schedule Management:**
   - Create admin UI for setting custom schedules
   - Handle holidays and special days
   - Support multiple time blocks per day

3. **Enhanced Conflict Detection:**
   - Consider buffer time between appointments
   - Handle emergency overrides
   - Support concurrent appointments (multi-doctor)

4. **Analytics Dashboard:**
   - Show appointment density heatmap
   - Track no-show rates
   - Monitor reminder effectiveness

5. **Mobile Notifications:**
   - Integrate with Firebase Cloud Messaging
   - Support push notifications
   - Add WhatsApp Business API

## Support

For questions or issues:
- Check console logs for API errors
- Verify authentication tokens are valid
- Ensure date formats are YYYY-MM-DD
- Time formats should be HH:MM (24-hour)

## Summary

This implementation provides:
- ✅ Doctor availability management with slot generation
- ✅ Real-time conflict detection
- ✅ Automated reminder scheduling
- ✅ Manual reminder sending
- ✅ Enhanced rescheduling with conflict prevention
- ✅ Visual slot selection UI
- ✅ Integration with existing notification service
- ✅ Comprehensive API documentation
