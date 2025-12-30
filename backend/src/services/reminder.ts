import { prisma } from '../lib/db';
import { notificationService } from './notification';
import { logger } from '../utils/logger';

interface ReminderConfig {
  // Hours before appointment to send reminder
  reminderHours: number[];
  // Whether to send SMS
  sendSms: boolean;
  // Whether to send Email
  sendEmail: boolean;
}

const DEFAULT_CONFIG: ReminderConfig = {
  reminderHours: [24, 2], // 24 hours and 2 hours before
  sendSms: true,
  sendEmail: true,
};

/**
 * Appointment Reminder Service
 * Sends automated reminders to patients before their appointments
 */
class ReminderService {
  private config: ReminderConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(config: ReminderConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Start the reminder scheduler
   * Checks for upcoming appointments every 15 minutes
   */
  start(intervalMinutes: number = 15): void {
    if (this.intervalId) {
      logger.warn('Reminder service already running');
      return;
    }

    logger.info('Starting appointment reminder service', {
      intervalMinutes,
      reminderHours: this.config.reminderHours,
    });

    // Run immediately on start
    this.processReminders();

    // Then run at intervals
    this.intervalId = setInterval(
      () => this.processReminders(),
      intervalMinutes * 60 * 1000
    );
  }

  /**
   * Stop the reminder scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Appointment reminder service stopped');
    }
  }

  /**
   * Process all pending reminders
   */
  async processReminders(): Promise<void> {
    if (this.isRunning) {
      logger.debug('Reminder processing already in progress, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.debug('Processing appointment reminders');

      for (const hours of this.config.reminderHours) {
        await this.sendRemindersForTimeframe(hours);
      }

      const duration = Date.now() - startTime;
      logger.debug('Reminder processing completed', { durationMs: duration });
    } catch (error) {
      logger.error('Error processing reminders', { error });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Send reminders for appointments happening in X hours
   */
  private async sendRemindersForTimeframe(hoursBeforeAppointment: number): Promise<void> {
    const now = new Date();
    const targetTime = new Date(now.getTime() + hoursBeforeAppointment * 60 * 60 * 1000);

    // Define a 30-minute window around the target time
    const windowStart = new Date(targetTime.getTime() - 15 * 60 * 1000);
    const windowEnd = new Date(targetTime.getTime() + 15 * 60 * 1000);

    // Find appointments in this window that haven't received this reminder
    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: windowStart,
          lte: windowEnd,
        },
        status: {
          in: ['scheduled', 'confirmed'],
        },
      },
      include: {
        patient: true,
        doctor: true,
      },
    });

    logger.info('Found appointments for reminder', {
      hoursBeforeAppointment,
      count: appointments.length,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
    });

    for (const appointment of appointments) {
      try {
        // Check if reminder already sent (using metadata tracking)
        const reminderKey = `reminder_${hoursBeforeAppointment}h`;
        const existingReminder = await prisma.notification.findFirst({
          where: {
            type: 'APPOINTMENT_REMINDER',
            referenceId: appointment.id,
            message: {
              contains: reminderKey,
            },
          },
        });

        if (existingReminder) {
          continue; // Already sent this reminder
        }

        await this.sendAppointmentReminder(appointment, hoursBeforeAppointment);
      } catch (error) {
        logger.error('Error sending reminder for appointment', {
          appointmentId: appointment.id,
          error,
        });
      }
    }
  }

  /**
   * Send reminder for a specific appointment
   */
  private async sendAppointmentReminder(
    appointment: any,
    hoursBeforeAppointment: number
  ): Promise<void> {
    const patient = appointment.patient;
    const doctor = appointment.doctor;

    const appointmentDate = new Date(appointment.appointmentDate);
    const formattedDate = appointmentDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = appointment.appointmentTime || appointmentDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const doctorName = doctor?.user?.name || doctor?.name || 'your doctor';
    const department = appointment.department || 'Consultation';

    const reminderType = hoursBeforeAppointment >= 24 ? 'day-before' : 'hours-before';
    const timeDescription = hoursBeforeAppointment >= 24
      ? 'tomorrow'
      : `in ${hoursBeforeAppointment} hours`;

    // SMS Message (concise)
    const smsMessage = `Reminder: Your appointment with Dr. ${doctorName} is ${timeDescription} on ${formattedDate} at ${formattedTime}. Please arrive 15 mins early. Reply CANCEL to cancel.`;

    // Email content (detailed)
    const emailSubject = `Appointment Reminder - ${formattedDate}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Appointment Reminder</h2>
        <p>Dear ${patient.name},</p>
        <p>This is a friendly reminder about your upcoming appointment:</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
          <p><strong>Department:</strong> ${department}</p>
          ${appointment.reason ? `<p><strong>Reason:</strong> ${appointment.reason}</p>` : ''}
        </div>

        <h3>Please remember to:</h3>
        <ul>
          <li>Arrive 15 minutes before your scheduled time</li>
          <li>Bring your ID and insurance card (if applicable)</li>
          <li>Bring any previous medical records or test reports</li>
          <li>List any medications you are currently taking</li>
        </ul>

        <p>If you need to reschedule or cancel, please contact us at least 2 hours before your appointment.</p>

        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          This is an automated reminder. Please do not reply to this email.
        </p>
      </div>
    `;

    const reminderKey = `reminder_${hoursBeforeAppointment}h`;
    let results = { sms: false, email: false };

    // Send notification via the notification service
    try {
      results = await notificationService.send({
        type: 'APPOINTMENT_REMINDER' as any,
        recipientPhone: this.config.sendSms && patient.contact ? patient.contact : undefined,
        recipientEmail: this.config.sendEmail && patient.email ? patient.email : undefined,
        subject: emailSubject,
        message: smsMessage,
        data: {
          patientName: patient.name,
          doctorName,
          date: formattedDate,
          time: formattedTime,
          department,
          emailHtml,
        },
        priority: 'HIGH',
      });

      logger.info('Appointment reminder sent', {
        appointmentId: appointment.id,
        patientId: patient.id,
        reminderType,
        results,
      });
    } catch (error) {
      logger.error('Failed to send reminder', {
        appointmentId: appointment.id,
        error,
      });
    }

    // Record the notification
    await prisma.notification.create({
      data: {
        type: 'APPOINTMENT_REMINDER',
        message: `${reminderKey}: Appointment reminder for ${formattedDate} at ${formattedTime}`,
        userId: patient.id,
        referenceId: appointment.id,
        referenceType: 'appointment',
        channel: results.sms && results.email ? 'both' : results.sms ? 'sms' : 'email',
        status: (results.sms || results.email) ? 'sent' : 'failed',
        tenantId: appointment.tenantId,
      },
    });
  }

  /**
   * Manually trigger reminder for a specific appointment
   */
  async sendManualReminder(appointmentId: string, tenantId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        tenantId,
      },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!appointment) {
      return { success: false, message: 'Appointment not found' };
    }

    if (!['scheduled', 'confirmed'].includes(appointment.status)) {
      return { success: false, message: 'Appointment is not active' };
    }

    try {
      await this.sendAppointmentReminder(appointment, 0);
      return { success: true, message: 'Reminder sent successfully' };
    } catch (error) {
      logger.error('Error sending manual reminder', { appointmentId, error });
      return { success: false, message: 'Failed to send reminder' };
    }
  }

  /**
   * Get reminder status for an appointment
   */
  async getReminderStatus(appointmentId: string): Promise<{
    reminders: Array<{
      type: string;
      sentAt: Date;
      channel: string;
      status: string;
    }>;
  }> {
    const notifications = await prisma.notification.findMany({
      where: {
        referenceId: appointmentId,
        type: 'APPOINTMENT_REMINDER',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      reminders: notifications.map(n => ({
        type: n.message?.split(':')[0] || 'unknown',
        sentAt: n.createdAt,
        channel: n.channel || 'unknown',
        status: n.status || 'unknown',
      })),
    };
  }

  /**
   * Get statistics on reminders sent
   */
  async getStats(tenantId: string, startDate?: Date, endDate?: Date): Promise<{
    totalSent: number;
    byChannel: { sms: number; email: number; both: number };
    byStatus: { sent: number; failed: number };
  }> {
    const where: any = {
      type: 'APPOINTMENT_REMINDER',
      tenantId,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const notifications = await prisma.notification.findMany({ where });

    const stats = {
      totalSent: notifications.length,
      byChannel: { sms: 0, email: 0, both: 0 },
      byStatus: { sent: 0, failed: 0 },
    };

    notifications.forEach(n => {
      if (n.channel === 'sms') stats.byChannel.sms++;
      else if (n.channel === 'email') stats.byChannel.email++;
      else if (n.channel === 'both') stats.byChannel.both++;

      if (n.status === 'sent') stats.byStatus.sent++;
      else if (n.status === 'failed') stats.byStatus.failed++;
    });

    return stats;
  }
}

// Singleton instance
export const reminderService = new ReminderService();

// Export class for custom configurations
export { ReminderService, ReminderConfig };
