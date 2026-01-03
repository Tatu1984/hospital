// ============================================
// DOCTOR AVAILABILITY APIs
// ============================================

// Get doctor's available slots for a specific date
// GET /api/doctors/:id/availability?date=YYYY-MM-DD
export const getDoctorAvailability = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    const targetDate = new Date(date as string);
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Default availability schedule (can be customized per doctor)
    const defaultSchedule: Record<string, { start: string; end: string; slotDuration: number }> = {
      monday: { start: '09:00', end: '17:00', slotDuration: 30 },
      tuesday: { start: '09:00', end: '17:00', slotDuration: 30 },
      wednesday: { start: '09:00', end: '17:00', slotDuration: 30 },
      thursday: { start: '09:00', end: '17:00', slotDuration: 30 },
      friday: { start: '09:00', end: '17:00', slotDuration: 30 },
      saturday: { start: '09:00', end: '13:00', slotDuration: 30 },
    };

    const daySchedule = defaultSchedule[dayOfWeek];

    if (!daySchedule) {
      return res.json({ slots: [], message: 'Doctor not available on this day' });
    }

    // Get all booked appointments for this doctor on this date
    const { prisma } = require('./lib/db');
    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: id,
        appointmentDate: {
          gte: new Date(targetDate.setHours(0, 0, 0, 0)),
          lt: new Date(targetDate.setHours(23, 59, 59, 999)),
        },
        status: { notIn: ['cancelled', 'no-show'] },
      },
      select: {
        appointmentTime: true,
      },
    });

    const bookedSlots = bookedAppointments.map((apt: any) => apt.appointmentTime);

    // Generate time slots
    const slots = [];
    const [startHour, startMin] = daySchedule.start.split(':').map(Number);
    const [endHour, endMin] = daySchedule.end.split(':').map(Number);

    let currentMins = startHour * 60 + startMin;
    const endMins = endHour * 60 + endMin;

    while (currentMins + daySchedule.slotDuration <= endMins) {
      const slotStart = `${String(Math.floor(currentMins / 60)).padStart(2, '0')}:${String(currentMins % 60).padStart(2, '0')}`;
      const slotEnd = `${String(Math.floor((currentMins + daySchedule.slotDuration) / 60)).padStart(2, '0')}:${String((currentMins + daySchedule.slotDuration) % 60).padStart(2, '0')}`;

      slots.push({
        start: slotStart,
        end: slotEnd,
        isBooked: bookedSlots.includes(slotStart),
        isAvailable: !bookedSlots.includes(slotStart),
      });

      currentMins += daySchedule.slotDuration;
    }

    res.json({
      date: date,
      dayOfWeek: dayOfWeek,
      slots,
      totalSlots: slots.length,
      availableSlots: slots.filter((s: any) => s.isAvailable).length,
      bookedSlots: slots.filter((s: any) => s.isBooked).length,
    });
  } catch (error) {
    console.error('Get doctor availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Set doctor's availability schedule (for future enhancement with custom schedules)
// POST /api/doctors/:id/availability
export const setDoctorAvailability = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { schedule } = req.body;

    // This would update a DoctorSchedule table in production
    // For now, we'll just validate and return success
    if (!schedule) {
      return res.status(400).json({ error: 'Schedule data is required' });
    }

    res.json({
      message: 'Doctor availability updated successfully',
      doctorId: id,
      schedule
    });
  } catch (error) {
    console.error('Set doctor availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// APPOINTMENT CONFLICT DETECTION & RESCHEDULING
// ============================================

// Check for appointment conflicts
// POST /api/appointments/check-conflict
export const checkAppointmentConflict = async (req: any, res: any) => {
  try {
    const { doctorId, appointmentDate, appointmentTime, duration = 30, excludeAppointmentId } = req.body;

    if (!doctorId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Parse the appointment time
    const [startHour, startMin] = appointmentTime.split(':').map(Number);
    const startMins = startHour * 60 + startMin;
    const endMins = startMins + duration;

    const endTime = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;

    // Get existing appointments for this doctor on this date
    const { prisma } = require('./lib/db');
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: new Date(appointmentDate),
        status: { notIn: ['cancelled', 'no-show'] },
        ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
      },
      include: {
        patient: { select: { name: true } },
      },
    });

    // Check for conflicts
    const conflicts = existingAppointments.filter((apt: any) => {
      const [existStartHour, existStartMin] = apt.appointmentTime.split(':').map(Number);
      const existStartMins = existStartHour * 60 + existStartMin;
      const existEndMins = existStartMins + 30; // Assume 30 min default duration

      // Check if time ranges overlap
      return startMins < existEndMins && endMins > existStartMins;
    });

    if (conflicts.length > 0) {
      // Find next available slot
      const targetDate = new Date(appointmentDate);
      const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

      // Get all booked times
      const bookedTimes = existingAppointments.map((apt: any) => {
        const [h, m] = apt.appointmentTime.split(':').map(Number);
        return h * 60 + m;
      });

      // Find next available slot (simplified logic)
      let nextSlotMins = 9 * 60; // Start from 9 AM
      const endOfDay = 17 * 60; // End at 5 PM

      while (nextSlotMins < endOfDay) {
        const isSlotAvailable = !bookedTimes.some((bookedMins: number) => {
          const bookedEndMins = bookedMins + 30;
          return nextSlotMins < bookedEndMins && (nextSlotMins + duration) > bookedMins;
        });

        if (isSlotAvailable) {
          break;
        }
        nextSlotMins += 30;
      }

      const nextAvailableSlot = nextSlotMins < endOfDay
        ? `${String(Math.floor(nextSlotMins / 60)).padStart(2, '0')}:${String(nextSlotMins % 60).padStart(2, '0')}`
        : null;

      return res.json({
        hasConflict: true,
        conflicts: conflicts.map((c: any) => ({
          appointmentId: c.id,
          patientName: c.patient.name,
          time: c.appointmentTime,
        })),
        nextAvailableSlot,
        message: `Time slot conflicts with ${conflicts.length} existing appointment(s)`,
      });
    }

    res.json({
      hasConflict: false,
      message: 'No conflicts found. Time slot is available.',
    });
  } catch (error) {
    console.error('Check conflict error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reschedule appointment
// POST /api/appointments/:id/reschedule
export const rescheduleAppointment = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { appointmentDate, appointmentTime, reason } = req.body;

    if (!appointmentDate || !appointmentTime) {
      return res.status(400).json({ error: 'New date and time are required' });
    }

    // Get the appointment
    const { prisma } = require('./lib/db');
    const appointment = await prisma.appointment.findFirst({
      where: { id, tenantId: req.user.tenantId },
      include: {
        patient: { select: { name: true, contact: true, email: true } },
        doctor: { select: { name: true } },
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check for conflicts
    const conflictCheck = await prisma.appointment.findFirst({
      where: {
        doctorId: appointment.doctorId,
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        status: { notIn: ['cancelled', 'no-show'] },
        id: { not: id },
      },
    });

    if (conflictCheck) {
      return res.status(409).json({
        error: 'Time slot is already booked',
        hasConflict: true
      });
    }

    // Update appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        status: 'scheduled',
        notes: `${appointment.notes || ''}\nRescheduled on ${new Date().toLocaleDateString()} from ${new Date(appointment.appointmentDate).toLocaleDateString()} ${appointment.appointmentTime}. Reason: ${reason || 'Not specified'}`,
      },
      include: {
        patient: { select: { id: true, name: true, mrn: true, contact: true, email: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    // Send notification about rescheduling
    const { notificationService } = require('./services/notification');
    if (appointment.patient.contact || appointment.patient.email) {
      notificationService.send({
        type: 'APPOINTMENT_CONFIRMATION',
        recipientPhone: appointment.patient.contact || undefined,
        recipientEmail: appointment.patient.email || undefined,
        message: '',
        data: {
          patientName: appointment.patient.name,
          doctorName: appointment.doctor.name,
          date: new Date(appointmentDate).toLocaleDateString('en-IN'),
          time: appointmentTime,
          department: appointment.department || 'General',
          appointmentId: appointment.id.slice(0, 8).toUpperCase(),
          hospitalName: 'Hospital ERP',
          hospitalAddress: 'Hospital Address',
          contactNumber: '+91-XXXXXXXXXX',
        },
      }).catch((err: any) => console.error('Notification failed:', err));
    }

    res.json(updatedAppointment);
  } catch (error) {
    console.error('Reschedule appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// APPOINTMENT REMINDER APIs
// ============================================

// Send appointment reminder manually
// POST /api/appointments/:id/send-reminder
export const sendAppointmentReminder = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const { prisma } = require('./lib/db');
    const appointment = await prisma.appointment.findFirst({
      where: { id, tenantId: req.user.tenantId },
      include: {
        patient: { select: { name: true, contact: true, email: true } },
        doctor: { select: { name: true } },
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (!appointment.patient.contact && !appointment.patient.email) {
      return res.status(400).json({ error: 'Patient has no contact information' });
    }

    // Send reminder
    const { notificationService } = require('./services/notification');
    const result = await notificationService.send({
      type: 'APPOINTMENT_REMINDER',
      recipientPhone: appointment.patient.contact || undefined,
      recipientEmail: appointment.patient.email || undefined,
      message: '',
      data: {
        patientName: appointment.patient.name,
        doctorName: appointment.doctor.name,
        date: new Date(appointment.appointmentDate).toLocaleDateString('en-IN'),
        time: appointment.appointmentTime,
        department: appointment.department || 'General',
        hospitalName: 'Hospital ERP',
        contactNumber: '+91-XXXXXXXXXX',
      },
    });

    res.json({
      message: 'Reminder sent successfully',
      appointmentId: id,
      sentTo: {
        sms: result.sms ? appointment.patient.contact : null,
        email: result.email ? appointment.patient.email : null,
      },
    });
  } catch (error) {
    console.error('Send reminder error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Schedule automatic reminders for upcoming appointments
// POST /api/appointments/schedule-reminders
export const scheduleAppointmentReminders = async (req: any, res: any) => {
  try {
    // Get appointments for the next 2 days
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const { prisma } = require('./lib/db');
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        tenantId: req.user.tenantId,
        appointmentDate: {
          gte: now,
          lte: twoDaysFromNow,
        },
        status: { in: ['scheduled', 'confirmed'] },
      },
      include: {
        patient: { select: { name: true, contact: true, email: true } },
        doctor: { select: { name: true } },
      },
    });

    let scheduled = 0;
    const { notificationService } = require('./services/notification');

    for (const appointment of upcomingAppointments) {
      if (!appointment.patient.contact && !appointment.patient.email) {
        continue;
      }

      // Calculate reminder times
      const appointmentDateTime = new Date(appointment.appointmentDate);
      const [hours, mins] = appointment.appointmentTime.split(':').map(Number);
      appointmentDateTime.setHours(hours, mins, 0, 0);

      const oneDayBefore = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);
      const oneHourBefore = new Date(appointmentDateTime.getTime() - 60 * 60 * 1000);

      // Schedule reminders (in production, use a job queue like Bull or Agenda)
      // For now, we'll just send immediate reminders if within timeframe
      const timeUntilAppointment = appointmentDateTime.getTime() - now.getTime();
      const hoursUntil = timeUntilAppointment / (60 * 60 * 1000);

      if (hoursUntil > 23 && hoursUntil <= 25) {
        // Send 24-hour reminder
        await notificationService.send({
          type: 'APPOINTMENT_REMINDER',
          recipientPhone: appointment.patient.contact || undefined,
          recipientEmail: appointment.patient.email || undefined,
          message: '',
          data: {
            patientName: appointment.patient.name,
            doctorName: appointment.doctor.name,
            date: new Date(appointment.appointmentDate).toLocaleDateString('en-IN'),
            time: appointment.appointmentTime,
            department: appointment.department || 'General',
            hospitalName: 'Hospital ERP',
            contactNumber: '+91-XXXXXXXXXX',
          },
        });
        scheduled++;
      } else if (hoursUntil > 0.5 && hoursUntil <= 2) {
        // Send 1-hour reminder
        await notificationService.send({
          type: 'APPOINTMENT_REMINDER',
          recipientPhone: appointment.patient.contact || undefined,
          recipientEmail: appointment.patient.email || undefined,
          message: '',
          data: {
            patientName: appointment.patient.name,
            doctorName: appointment.doctor.name,
            date: new Date(appointment.appointmentDate).toLocaleDateString('en-IN'),
            time: appointment.appointmentTime,
            department: appointment.department || 'General',
            hospitalName: 'Hospital ERP',
            contactNumber: '+91-XXXXXXXXXX',
          },
        });
        scheduled++;
      }
    }

    res.json({
      message: 'Reminders scheduled successfully',
      totalAppointments: upcomingAppointments.length,
      remindersSent: scheduled,
    });
  } catch (error) {
    console.error('Schedule reminders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
