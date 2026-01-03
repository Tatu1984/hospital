# Quick Integration Guide - Appointment Module Enhancements

## Step-by-Step Integration

### Step 1: Backend Integration (5 minutes)

1. **Open `/backend/src/server.ts`**

2. **Add import at top** (around line 40-55, after other imports):
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

3. **Add routes after existing appointment routes** (after line 2756, before "QUEUE MANAGEMENT APIs"):
```typescript
// ============================================
// DOCTOR AVAILABILITY APIs
// ============================================
app.get('/api/doctors/:id/availability', authenticateToken, getDoctorAvailability);
app.post('/api/doctors/:id/availability', authenticateToken, setDoctorAvailability);

// ============================================
// APPOINTMENT CONFLICT DETECTION & RESCHEDULING
// ============================================
app.post('/api/appointments/check-conflict', authenticateToken, checkAppointmentConflict);
app.post('/api/appointments/:id/reschedule', authenticateToken, rescheduleAppointment);

// ============================================
// APPOINTMENT REMINDER APIs
// ============================================
app.post('/api/appointments/:id/send-reminder', authenticateToken, sendAppointmentReminder);
app.post('/api/appointments/schedule-reminders', authenticateToken, scheduleAppointmentReminders);
```

4. **Restart backend server:**
```bash
cd backend
npm run dev
```

### Step 2: Frontend API Integration (10 minutes)

The frontend UI is already updated. Now connect it to the backend APIs:

1. **Open `/frontend/src/pages/Appointment.tsx`**

2. **Update `fetchAvailableSlots` function** (around line 106):
```typescript
const fetchAvailableSlots = async (doctorId: string, date: string) => {
  setLoadingSlots(true);
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `http://localhost:3001/api/doctors/${doctorId}/availability?date=${date}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      }
    );

    if (!response.ok) throw new Error('Failed to fetch slots');

    const data = await response.json();
    setAvailableSlots(data.slots || []);
  } catch (error) {
    console.error('Error fetching slots:', error);
    setAvailableSlots([]);
  } finally {
    setLoadingSlots(false);
  }
};
```

3. **Update `checkConflict` function** (around line 135):
```typescript
const checkConflict = async (doctorId: string, date: string, time: string) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:3001/api/appointments/check-conflict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        doctorId,
        appointmentDate: date,
        appointmentTime: time,
        duration: 30
      })
    });

    if (!response.ok) throw new Error('Failed to check conflict');

    const data = await response.json();
    setConflictWarning(data);
  } catch (error) {
    console.error('Error checking conflict:', error);
    setConflictWarning({ hasConflict: false, message: 'Unable to verify slot availability' });
  }
};
```

4. **Update `handleSendReminder` function** (around line 224):
```typescript
const handleSendReminder = async (appointment: Appointment) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `http://localhost:3001/api/appointments/${appointment.id}/send-reminder`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      }
    );

    if (!response.ok) throw new Error('Failed to send reminder');

    const data = await response.json();
    alert(`Reminder sent successfully to ${appointment.patientName}\n${JSON.stringify(data.sentTo, null, 2)}`);
  } catch (error) {
    console.error('Error sending reminder:', error);
    alert('Failed to send reminder. Please try again.');
  }
};
```

### Step 3: Test the Features (15 minutes)

**Test 1: Doctor Availability**
1. Log in to the application
2. Click "Schedule Appointment"
3. Select a department
4. Select a doctor → Doctor ID should be set
5. Select a date → Available slots should load
6. Verify slots show with green (available) and red (booked) indicators

**Test 2: Conflict Detection**
1. Click on an available (green) slot
2. Should see green checkmark "Time slot is available!"
3. Try to click a booked (red) slot
4. Button should be disabled

**Test 3: Send Reminder**
1. Go to appointments table
2. Find a scheduled/confirmed appointment
3. Click "Reminder" button
4. Check backend logs for notification being sent
5. Should see success alert

**Test 4: API Testing with curl**
```bash
# Get doctor availability
curl -X GET "http://localhost:3001/api/doctors/doc-1/availability?date=2026-01-15" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Check conflict
curl -X POST "http://localhost:3001/api/appointments/check-conflict" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "doc-1",
    "appointmentDate": "2026-01-15",
    "appointmentTime": "10:00"
  }'

# Send reminder
curl -X POST "http://localhost:3001/api/appointments/apt-123/send-reminder" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Step 4: Connect to Real Doctors (Optional)

To use real doctor data from your database:

1. **Update doctor selection in frontend:**
```typescript
// Fetch real doctors from API
const [doctors, setDoctors] = useState([]);

useEffect(() => {
  const fetchDoctors = async () => {
    const response = await fetch('http://localhost:3001/api/users?role=doctor', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setDoctors(data);
  };
  fetchDoctors();
}, []);

// In the doctor select dropdown:
<SelectContent>
  {doctors.map(doctor => (
    <SelectItem key={doctor.id} value={doctor.id}>
      Dr. {doctor.name}
    </SelectItem>
  ))}
</SelectContent>
```

### Troubleshooting

**Slots not loading?**
- Check browser console for errors
- Verify doctor ID is being set (check React DevTools state)
- Ensure backend server is running on port 3001
- Check CORS settings if frontend is on different port

**Conflict check not working?**
- Verify date format is YYYY-MM-DD
- Verify time format is HH:MM (24-hour)
- Check Network tab for request/response
- Ensure doctor ID and date are selected first

**Reminders not sending?**
- Check backend logs for notification service output
- In development, reminders use mock mode (logged to console)
- To send real SMS/Email, configure environment variables:
  ```
  SMS_PROVIDER=twilio
  TWILIO_ACCOUNT_SID=...
  TWILIO_AUTH_TOKEN=...
  EMAIL_PROVIDER=smtp
  EMAIL_HOST=...
  ```

**CORS errors?**
- Add frontend URL to CORS whitelist in backend
- Or use proxy in frontend package.json:
  ```json
  "proxy": "http://localhost:3001"
  ```

### Production Deployment Checklist

Before deploying to production:

- [ ] Replace mock API calls with real backend URLs
- [ ] Configure real SMS/Email providers
- [ ] Add error boundaries for API failures
- [ ] Implement loading states for all async operations
- [ ] Add retry logic for failed notifications
- [ ] Set up job queue for automated reminders (Bull/BullMQ)
- [ ] Create database table for doctor schedules
- [ ] Add audit logging for appointment changes
- [ ] Implement rate limiting on reminder APIs
- [ ] Add monitoring/alerting for notification failures
- [ ] Test with real patient data (in staging first)
- [ ] Update API base URLs for production environment

### Next Steps

1. **Customize Doctor Schedules:**
   - Edit `defaultSchedule` in `appointment-enhancements.ts`
   - Add database table for per-doctor custom schedules
   - Create admin UI for schedule management

2. **Enhance Reminders:**
   - Set up cron job to run `POST /api/appointments/schedule-reminders` hourly
   - Add reminder preferences per patient
   - Track reminder delivery status

3. **Add Analytics:**
   - Dashboard showing slot utilization
   - No-show rate tracking
   - Popular booking times
   - Average wait times

4. **Mobile Support:**
   - Make slot selection UI responsive
   - Add touch-friendly controls
   - Support mobile notifications

## Files Reference

All implementation files are located at:
- `/backend/src/appointment-enhancements.ts` - Backend handlers
- `/backend/src/appointment-routes.txt` - Routes to add
- `/frontend/src/pages/Appointment.tsx` - Frontend UI (already updated)
- `/APPOINTMENT_MODULE_COMPLETION.md` - Full documentation

## Support

If you encounter issues:
1. Check the console logs (both frontend and backend)
2. Verify all dependencies are installed (`npm install`)
3. Ensure database migrations are up to date
4. Review the full documentation in `APPOINTMENT_MODULE_COMPLETION.md`

---

**Estimated Total Integration Time: 30 minutes**
- Backend: 5 minutes
- Frontend API: 10 minutes
- Testing: 15 minutes
