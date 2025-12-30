import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Appointment creation schema
const createAppointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  doctorId: z.string().min(1, 'Doctor ID is required'),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  appointmentTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format'),
  duration: z.number().min(5).max(240).default(30), // Duration in minutes
  type: z.enum(['consultation', 'follow_up', 'emergency', 'procedure', 'telehealth']),
  department: z.string().optional(),
  reason: z.string().min(3, 'Reason must be at least 3 characters').optional(),
  notes: z.string().optional(),
  priority: z.enum(['normal', 'urgent', 'emergency']).default('normal'),
});

// Appointment reschedule schema
const rescheduleSchema = z.object({
  appointmentId: z.string().min(1),
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  newTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format'),
  reason: z.string().min(5, 'Reschedule reason is required'),
});

// Appointment cancellation schema
const cancelSchema = z.object({
  appointmentId: z.string().min(1),
  reason: z.string().min(5, 'Cancellation reason is required'),
  cancelledBy: z.enum(['patient', 'doctor', 'system', 'staff']),
});

describe('Appointment API Validation', () => {
  describe('Create Appointment Schema', () => {
    it('should accept valid appointment data', () => {
      const validAppointment = {
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        appointmentDate: '2025-01-15',
        appointmentTime: '10:30',
        type: 'consultation',
        reason: 'General checkup',
      };

      const result = createAppointmentSchema.safeParse(validAppointment);
      expect(result.success).toBe(true);
    });

    it('should require patient ID', () => {
      const appointmentWithoutPatient = {
        doctorId: 'doctor-123',
        appointmentDate: '2025-01-15',
        appointmentTime: '10:30',
        type: 'consultation',
      };

      const result = createAppointmentSchema.safeParse(appointmentWithoutPatient);
      expect(result.success).toBe(false);
    });

    it('should require doctor ID', () => {
      const appointmentWithoutDoctor = {
        patientId: 'patient-123',
        appointmentDate: '2025-01-15',
        appointmentTime: '10:30',
        type: 'consultation',
      };

      const result = createAppointmentSchema.safeParse(appointmentWithoutDoctor);
      expect(result.success).toBe(false);
    });

    it('should validate date format', () => {
      const invalidDates = ['15-01-2025', '2025/01/15', '01-15-2025', 'invalid'];

      invalidDates.forEach(date => {
        const appointment = {
          patientId: 'patient-123',
          doctorId: 'doctor-123',
          appointmentDate: date,
          appointmentTime: '10:30',
          type: 'consultation',
        };
        const result = createAppointmentSchema.safeParse(appointment);
        expect(result.success).toBe(false);
      });
    });

    it('should accept valid date formats', () => {
      const validDates = ['2025-01-15', '2025-12-31', '2024-06-30'];

      validDates.forEach(date => {
        const appointment = {
          patientId: 'patient-123',
          doctorId: 'doctor-123',
          appointmentDate: date,
          appointmentTime: '10:30',
          type: 'consultation',
        };
        const result = createAppointmentSchema.safeParse(appointment);
        expect(result.success).toBe(true);
      });
    });

    it('should validate time format', () => {
      const invalidTimes = ['10:30 AM', '25:00', '10:60', '1:30', 'invalid'];

      invalidTimes.forEach(time => {
        const appointment = {
          patientId: 'patient-123',
          doctorId: 'doctor-123',
          appointmentDate: '2025-01-15',
          appointmentTime: time,
          type: 'consultation',
        };
        const result = createAppointmentSchema.safeParse(appointment);
        expect(result.success).toBe(false);
      });
    });

    it('should accept valid time formats', () => {
      const validTimes = ['00:00', '09:30', '12:00', '14:45', '23:59'];

      validTimes.forEach(time => {
        const appointment = {
          patientId: 'patient-123',
          doctorId: 'doctor-123',
          appointmentDate: '2025-01-15',
          appointmentTime: time,
          type: 'consultation',
        };
        const result = createAppointmentSchema.safeParse(appointment);
        expect(result.success).toBe(true);
      });
    });

    it('should validate appointment type enum', () => {
      const validTypes = ['consultation', 'follow_up', 'emergency', 'procedure', 'telehealth'];
      const invalidTypes = ['checkup', 'visit', 'other'];

      validTypes.forEach(type => {
        const appointment = {
          patientId: 'patient-123',
          doctorId: 'doctor-123',
          appointmentDate: '2025-01-15',
          appointmentTime: '10:30',
          type,
        };
        const result = createAppointmentSchema.safeParse(appointment);
        expect(result.success).toBe(true);
      });

      invalidTypes.forEach(type => {
        const appointment = {
          patientId: 'patient-123',
          doctorId: 'doctor-123',
          appointmentDate: '2025-01-15',
          appointmentTime: '10:30',
          type,
        };
        const result = createAppointmentSchema.safeParse(appointment);
        expect(result.success).toBe(false);
      });
    });

    it('should validate duration within bounds', () => {
      const invalidDurations = [0, 3, 241, 500];
      const validDurations = [5, 15, 30, 60, 120, 240];

      invalidDurations.forEach(duration => {
        const appointment = {
          patientId: 'patient-123',
          doctorId: 'doctor-123',
          appointmentDate: '2025-01-15',
          appointmentTime: '10:30',
          type: 'consultation',
          duration,
        };
        const result = createAppointmentSchema.safeParse(appointment);
        expect(result.success).toBe(false);
      });

      validDurations.forEach(duration => {
        const appointment = {
          patientId: 'patient-123',
          doctorId: 'doctor-123',
          appointmentDate: '2025-01-15',
          appointmentTime: '10:30',
          type: 'consultation',
          duration,
        };
        const result = createAppointmentSchema.safeParse(appointment);
        expect(result.success).toBe(true);
      });
    });

    it('should default duration to 30 minutes', () => {
      const appointment = {
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        appointmentDate: '2025-01-15',
        appointmentTime: '10:30',
        type: 'consultation',
      };

      const result = createAppointmentSchema.safeParse(appointment);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.duration).toBe(30);
      }
    });
  });

  describe('Reschedule Schema', () => {
    it('should accept valid reschedule data', () => {
      const validReschedule = {
        appointmentId: 'apt-123',
        newDate: '2025-01-20',
        newTime: '14:00',
        reason: 'Patient requested time change',
      };

      const result = rescheduleSchema.safeParse(validReschedule);
      expect(result.success).toBe(true);
    });

    it('should require reschedule reason', () => {
      const rescheduleWithoutReason = {
        appointmentId: 'apt-123',
        newDate: '2025-01-20',
        newTime: '14:00',
      };

      const result = rescheduleSchema.safeParse(rescheduleWithoutReason);
      expect(result.success).toBe(false);
    });

    it('should require minimum reason length', () => {
      const shortReason = {
        appointmentId: 'apt-123',
        newDate: '2025-01-20',
        newTime: '14:00',
        reason: 'ok',
      };

      const result = rescheduleSchema.safeParse(shortReason);
      expect(result.success).toBe(false);
    });
  });

  describe('Cancel Schema', () => {
    it('should accept valid cancellation data', () => {
      const validCancel = {
        appointmentId: 'apt-123',
        reason: 'Patient feeling unwell',
        cancelledBy: 'patient',
      };

      const result = cancelSchema.safeParse(validCancel);
      expect(result.success).toBe(true);
    });

    it('should validate cancelledBy enum', () => {
      const validCancellers = ['patient', 'doctor', 'system', 'staff'];
      const invalidCancellers = ['admin', 'nurse', 'other'];

      validCancellers.forEach(cancelledBy => {
        const cancel = {
          appointmentId: 'apt-123',
          reason: 'Test cancellation reason',
          cancelledBy,
        };
        const result = cancelSchema.safeParse(cancel);
        expect(result.success).toBe(true);
      });

      invalidCancellers.forEach(cancelledBy => {
        const cancel = {
          appointmentId: 'apt-123',
          reason: 'Test cancellation reason',
          cancelledBy,
        };
        const result = cancelSchema.safeParse(cancel);
        expect(result.success).toBe(false);
      });
    });
  });
});

describe('Appointment Business Logic', () => {
  describe('Token Number Generation', () => {
    const generateTokenNumber = (department: string, sequence: number): string => {
      const prefix = department.substring(0, 3).toUpperCase();
      return `${prefix}-${String(sequence).padStart(3, '0')}`;
    };

    it('should generate sequential token numbers', () => {
      const token1 = generateTokenNumber('General Medicine', 1);
      const token2 = generateTokenNumber('General Medicine', 2);
      const token3 = generateTokenNumber('General Medicine', 10);

      expect(token1).toBe('GEN-001');
      expect(token2).toBe('GEN-002');
      expect(token3).toBe('GEN-010');
    });

    it('should use department prefix', () => {
      expect(generateTokenNumber('Cardiology', 1)).toBe('CAR-001');
      expect(generateTokenNumber('Pediatrics', 5)).toBe('PED-005');
      expect(generateTokenNumber('ENT', 12)).toBe('ENT-012');
    });
  });

  describe('Slot Availability', () => {
    interface TimeSlot {
      start: string;
      end: string;
      isBooked: boolean;
    }

    const generateTimeSlots = (
      startTime: string,
      endTime: string,
      durationMins: number,
      bookedSlots: string[] = []
    ): TimeSlot[] => {
      const slots: TimeSlot[] = [];
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      let currentMins = startHour * 60 + startMin;
      const endMins = endHour * 60 + endMin;

      while (currentMins + durationMins <= endMins) {
        const slotStart = `${String(Math.floor(currentMins / 60)).padStart(2, '0')}:${String(currentMins % 60).padStart(2, '0')}`;
        const slotEnd = `${String(Math.floor((currentMins + durationMins) / 60)).padStart(2, '0')}:${String((currentMins + durationMins) % 60).padStart(2, '0')}`;

        slots.push({
          start: slotStart,
          end: slotEnd,
          isBooked: bookedSlots.includes(slotStart),
        });

        currentMins += durationMins;
      }

      return slots;
    };

    it('should generate correct number of slots', () => {
      const slots = generateTimeSlots('09:00', '12:00', 30);
      expect(slots.length).toBe(6); // 3 hours / 30 mins = 6 slots
    });

    it('should mark booked slots correctly', () => {
      const slots = generateTimeSlots('09:00', '10:00', 15, ['09:15', '09:45']);

      expect(slots[0].isBooked).toBe(false); // 09:00
      expect(slots[1].isBooked).toBe(true); // 09:15
      expect(slots[2].isBooked).toBe(false); // 09:30
      expect(slots[3].isBooked).toBe(true); // 09:45
    });

    it('should handle different durations', () => {
      const slots15 = generateTimeSlots('10:00', '11:00', 15);
      const slots30 = generateTimeSlots('10:00', '11:00', 30);
      const slots60 = generateTimeSlots('10:00', '11:00', 60);

      expect(slots15.length).toBe(4);
      expect(slots30.length).toBe(2);
      expect(slots60.length).toBe(1);
    });

    it('should generate correct time ranges', () => {
      const slots = generateTimeSlots('14:00', '15:00', 30);

      expect(slots[0]).toEqual({ start: '14:00', end: '14:30', isBooked: false });
      expect(slots[1]).toEqual({ start: '14:30', end: '15:00', isBooked: false });
    });
  });

  describe('Appointment Conflict Detection', () => {
    interface Appointment {
      doctorId: string;
      date: string;
      startTime: string;
      endTime: string;
    }

    const hasConflict = (
      newAppointment: { doctorId: string; date: string; startTime: string; endTime: string },
      existingAppointments: Appointment[]
    ): boolean => {
      return existingAppointments.some(existing => {
        if (existing.doctorId !== newAppointment.doctorId) return false;
        if (existing.date !== newAppointment.date) return false;

        const newStart = newAppointment.startTime;
        const newEnd = newAppointment.endTime;
        const existStart = existing.startTime;
        const existEnd = existing.endTime;

        // Check if time ranges overlap
        return newStart < existEnd && newEnd > existStart;
      });
    };

    it('should detect overlapping appointments', () => {
      const existing = [
        { doctorId: 'doc-1', date: '2025-01-15', startTime: '10:00', endTime: '10:30' },
      ];

      const conflicting = {
        doctorId: 'doc-1',
        date: '2025-01-15',
        startTime: '10:15',
        endTime: '10:45',
      };

      expect(hasConflict(conflicting, existing)).toBe(true);
    });

    it('should allow adjacent appointments', () => {
      const existing = [
        { doctorId: 'doc-1', date: '2025-01-15', startTime: '10:00', endTime: '10:30' },
      ];

      const adjacent = {
        doctorId: 'doc-1',
        date: '2025-01-15',
        startTime: '10:30',
        endTime: '11:00',
      };

      expect(hasConflict(adjacent, existing)).toBe(false);
    });

    it('should allow different doctors same time', () => {
      const existing = [
        { doctorId: 'doc-1', date: '2025-01-15', startTime: '10:00', endTime: '10:30' },
      ];

      const differentDoctor = {
        doctorId: 'doc-2',
        date: '2025-01-15',
        startTime: '10:00',
        endTime: '10:30',
      };

      expect(hasConflict(differentDoctor, existing)).toBe(false);
    });

    it('should allow same doctor different day', () => {
      const existing = [
        { doctorId: 'doc-1', date: '2025-01-15', startTime: '10:00', endTime: '10:30' },
      ];

      const differentDay = {
        doctorId: 'doc-1',
        date: '2025-01-16',
        startTime: '10:00',
        endTime: '10:30',
      };

      expect(hasConflict(differentDay, existing)).toBe(false);
    });

    it('should detect exact overlap', () => {
      const existing = [
        { doctorId: 'doc-1', date: '2025-01-15', startTime: '10:00', endTime: '10:30' },
      ];

      const exactOverlap = {
        doctorId: 'doc-1',
        date: '2025-01-15',
        startTime: '10:00',
        endTime: '10:30',
      };

      expect(hasConflict(exactOverlap, existing)).toBe(true);
    });
  });

  describe('Appointment Status Flow', () => {
    const validTransitions: Record<string, string[]> = {
      scheduled: ['confirmed', 'cancelled', 'no_show'],
      confirmed: ['checked_in', 'cancelled', 'no_show'],
      checked_in: ['in_progress', 'cancelled'],
      in_progress: ['completed'],
      completed: [],
      cancelled: [],
      no_show: ['rescheduled'],
      rescheduled: ['scheduled'],
    };

    const isValidTransition = (from: string, to: string): boolean => {
      return validTransitions[from]?.includes(to) || false;
    };

    it('should allow valid status transitions', () => {
      expect(isValidTransition('scheduled', 'confirmed')).toBe(true);
      expect(isValidTransition('confirmed', 'checked_in')).toBe(true);
      expect(isValidTransition('checked_in', 'in_progress')).toBe(true);
      expect(isValidTransition('in_progress', 'completed')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(isValidTransition('scheduled', 'completed')).toBe(false);
      expect(isValidTransition('completed', 'scheduled')).toBe(false);
      expect(isValidTransition('cancelled', 'confirmed')).toBe(false);
    });

    it('should allow cancellation from appropriate states', () => {
      expect(isValidTransition('scheduled', 'cancelled')).toBe(true);
      expect(isValidTransition('confirmed', 'cancelled')).toBe(true);
      expect(isValidTransition('checked_in', 'cancelled')).toBe(true);
      expect(isValidTransition('in_progress', 'cancelled')).toBe(false);
    });

    it('should handle no-show correctly', () => {
      expect(isValidTransition('scheduled', 'no_show')).toBe(true);
      expect(isValidTransition('confirmed', 'no_show')).toBe(true);
      expect(isValidTransition('no_show', 'rescheduled')).toBe(true);
    });
  });

  describe('Wait Time Calculation', () => {
    const calculateWaitTime = (
      scheduledTime: string,
      actualTime: string
    ): { waitMinutes: number; status: 'on_time' | 'delayed' | 'early' } => {
      const [schedHour, schedMin] = scheduledTime.split(':').map(Number);
      const [actualHour, actualMin] = actualTime.split(':').map(Number);

      const schedMins = schedHour * 60 + schedMin;
      const actualMins = actualHour * 60 + actualMin;
      const diff = actualMins - schedMins;

      return {
        waitMinutes: Math.abs(diff),
        status: diff > 5 ? 'delayed' : diff < -5 ? 'early' : 'on_time',
      };
    };

    it('should calculate on-time correctly', () => {
      const result = calculateWaitTime('10:00', '10:03');
      expect(result.status).toBe('on_time');
      expect(result.waitMinutes).toBe(3);
    });

    it('should detect delays', () => {
      const result = calculateWaitTime('10:00', '10:30');
      expect(result.status).toBe('delayed');
      expect(result.waitMinutes).toBe(30);
    });

    it('should detect early arrivals', () => {
      const result = calculateWaitTime('10:00', '09:45');
      expect(result.status).toBe('early');
      expect(result.waitMinutes).toBe(15);
    });
  });
});

describe('Appointment Reminders', () => {
  describe('Reminder Scheduling', () => {
    const getReminderTimes = (appointmentDate: Date, appointmentTime: string): Date[] => {
      const [hours, mins] = appointmentTime.split(':').map(Number);
      const appointmentDateTime = new Date(appointmentDate);
      appointmentDateTime.setHours(hours, mins, 0, 0);

      const oneDayBefore = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);
      const twoHoursBefore = new Date(appointmentDateTime.getTime() - 2 * 60 * 60 * 1000);

      return [oneDayBefore, twoHoursBefore];
    };

    it('should schedule reminder 24 hours before', () => {
      const appointmentDate = new Date('2025-01-15');
      const reminders = getReminderTimes(appointmentDate, '10:00');

      const expectedDayBefore = new Date('2025-01-14T10:00:00');
      expect(reminders[0].getDate()).toBe(14);
      expect(reminders[0].getHours()).toBe(10);
    });

    it('should schedule reminder 2 hours before', () => {
      const appointmentDate = new Date('2025-01-15');
      const reminders = getReminderTimes(appointmentDate, '10:00');

      expect(reminders[1].getDate()).toBe(15);
      expect(reminders[1].getHours()).toBe(8);
    });
  });

  describe('Reminder Message Templates', () => {
    const generateReminderMessage = (
      patientName: string,
      doctorName: string,
      appointmentDate: string,
      appointmentTime: string,
      department: string,
      type: 'sms' | 'email'
    ): string => {
      if (type === 'sms') {
        return `Reminder: Your appointment with Dr. ${doctorName} is on ${appointmentDate} at ${appointmentTime}. Dept: ${department}. Reply CONFIRM to confirm.`;
      }

      return `Dear ${patientName},\n\nThis is a reminder for your upcoming appointment:\n\nDoctor: Dr. ${doctorName}\nDate: ${appointmentDate}\nTime: ${appointmentTime}\nDepartment: ${department}\n\nPlease arrive 15 minutes before your scheduled time.\n\nRegards,\nHospital Management`;
    };

    it('should generate SMS reminder', () => {
      const sms = generateReminderMessage(
        'John',
        'Smith',
        '2025-01-15',
        '10:00',
        'Cardiology',
        'sms'
      );

      expect(sms).toContain('Dr. Smith');
      expect(sms).toContain('2025-01-15');
      expect(sms).toContain('10:00');
      expect(sms.length).toBeLessThan(160); // SMS length limit
    });

    it('should generate email reminder', () => {
      const email = generateReminderMessage(
        'John Doe',
        'Smith',
        '2025-01-15',
        '10:00',
        'Cardiology',
        'email'
      );

      expect(email).toContain('Dear John Doe');
      expect(email).toContain('Dr. Smith');
      expect(email).toContain('arrive 15 minutes before');
    });
  });
});

describe('Queue Management', () => {
  describe('Queue Position', () => {
    interface QueueEntry {
      appointmentId: string;
      tokenNumber: string;
      checkedInAt: Date;
      priority: 'normal' | 'urgent' | 'emergency';
      status: 'waiting' | 'called' | 'in_progress' | 'completed';
    }

    const calculateQueuePosition = (
      targetId: string,
      queue: QueueEntry[]
    ): { position: number; waitingCount: number } => {
      const waiting = queue
        .filter(e => e.status === 'waiting')
        .sort((a, b) => {
          // Emergency first, then urgent, then by check-in time
          const priorityOrder = { emergency: 0, urgent: 1, normal: 2 };
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }
          return a.checkedInAt.getTime() - b.checkedInAt.getTime();
        });

      const position = waiting.findIndex(e => e.appointmentId === targetId);
      return {
        position: position >= 0 ? position + 1 : -1,
        waitingCount: waiting.length,
      };
    };

    it('should calculate queue position correctly', () => {
      const queue: QueueEntry[] = [
        { appointmentId: 'apt-1', tokenNumber: 'GEN-001', checkedInAt: new Date('2025-01-15T09:00:00'), priority: 'normal', status: 'waiting' },
        { appointmentId: 'apt-2', tokenNumber: 'GEN-002', checkedInAt: new Date('2025-01-15T09:05:00'), priority: 'normal', status: 'waiting' },
        { appointmentId: 'apt-3', tokenNumber: 'GEN-003', checkedInAt: new Date('2025-01-15T09:10:00'), priority: 'normal', status: 'waiting' },
      ];

      expect(calculateQueuePosition('apt-1', queue).position).toBe(1);
      expect(calculateQueuePosition('apt-2', queue).position).toBe(2);
      expect(calculateQueuePosition('apt-3', queue).position).toBe(3);
    });

    it('should prioritize emergency patients', () => {
      const queue: QueueEntry[] = [
        { appointmentId: 'apt-1', tokenNumber: 'GEN-001', checkedInAt: new Date('2025-01-15T09:00:00'), priority: 'normal', status: 'waiting' },
        { appointmentId: 'apt-2', tokenNumber: 'GEN-002', checkedInAt: new Date('2025-01-15T09:30:00'), priority: 'emergency', status: 'waiting' },
        { appointmentId: 'apt-3', tokenNumber: 'GEN-003', checkedInAt: new Date('2025-01-15T09:15:00'), priority: 'urgent', status: 'waiting' },
      ];

      expect(calculateQueuePosition('apt-2', queue).position).toBe(1); // Emergency first
      expect(calculateQueuePosition('apt-3', queue).position).toBe(2); // Urgent second
      expect(calculateQueuePosition('apt-1', queue).position).toBe(3); // Normal last
    });

    it('should exclude completed and in-progress', () => {
      const queue: QueueEntry[] = [
        { appointmentId: 'apt-1', tokenNumber: 'GEN-001', checkedInAt: new Date('2025-01-15T09:00:00'), priority: 'normal', status: 'completed' },
        { appointmentId: 'apt-2', tokenNumber: 'GEN-002', checkedInAt: new Date('2025-01-15T09:05:00'), priority: 'normal', status: 'in_progress' },
        { appointmentId: 'apt-3', tokenNumber: 'GEN-003', checkedInAt: new Date('2025-01-15T09:10:00'), priority: 'normal', status: 'waiting' },
      ];

      const result = calculateQueuePosition('apt-3', queue);
      expect(result.position).toBe(1);
      expect(result.waitingCount).toBe(1);
    });
  });

  describe('Estimated Wait Time', () => {
    const estimateWaitTime = (
      position: number,
      avgConsultationMins: number = 15
    ): { estimatedMins: number; displayText: string } => {
      const estimatedMins = (position - 1) * avgConsultationMins;

      let displayText: string;
      if (estimatedMins === 0) {
        displayText = 'You are next';
      } else if (estimatedMins < 60) {
        displayText = `~${estimatedMins} mins`;
      } else {
        const hours = Math.floor(estimatedMins / 60);
        const mins = estimatedMins % 60;
        displayText = mins > 0 ? `~${hours}h ${mins}m` : `~${hours}h`;
      }

      return { estimatedMins, displayText };
    };

    it('should show next for position 1', () => {
      const result = estimateWaitTime(1);
      expect(result.estimatedMins).toBe(0);
      expect(result.displayText).toBe('You are next');
    });

    it('should calculate wait time based on position', () => {
      expect(estimateWaitTime(2, 15).estimatedMins).toBe(15);
      expect(estimateWaitTime(5, 15).estimatedMins).toBe(60);
      expect(estimateWaitTime(3, 20).estimatedMins).toBe(40);
    });

    it('should format display text correctly', () => {
      expect(estimateWaitTime(3, 15).displayText).toBe('~30 mins');
      expect(estimateWaitTime(5, 15).displayText).toBe('~1h');
      expect(estimateWaitTime(6, 15).displayText).toBe('~1h 15m');
    });
  });
});
