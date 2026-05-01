import { config } from '../config';
import { logger } from '../utils/logger';

// Notification types
export type NotificationType =
  | 'APPOINTMENT_REMINDER'
  | 'APPOINTMENT_CONFIRMATION'
  | 'APPOINTMENT_CANCELLED'
  | 'LAB_RESULT_READY'
  | 'CRITICAL_VALUE_ALERT'
  | 'DISCHARGE_SUMMARY'
  | 'PRESCRIPTION_READY'
  | 'PAYMENT_RECEIPT'
  | 'BILL_GENERATED'
  | 'PASSWORD_RESET'
  | 'EMERGENCY_ALERT'
  | 'ADMISSION_NOTIFICATION'
  | 'SURGERY_SCHEDULED'
  | 'BLOOD_REQUEST_URGENT';

interface NotificationPayload {
  type: NotificationType;
  recipientPhone?: string;
  recipientEmail?: string;
  subject?: string;
  message: string;
  data?: Record<string, any>;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

interface SMSConfig {
  provider: 'twilio' | 'msg91' | 'aws-sns' | 'mock';
  apiKey?: string;
  apiSecret?: string;
  senderId?: string;
}

interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'aws-ses' | 'mock';
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  apiKey?: string;
  from?: string;
}

// Notification templates
const templates: Record<NotificationType, { sms: string; email: { subject: string; body: string } }> = {
  APPOINTMENT_REMINDER: {
    sms: 'Reminder: Your appointment with Dr. {{doctorName}} is scheduled for {{date}} at {{time}}. {{hospitalName}}',
    email: {
      subject: 'Appointment Reminder - {{hospitalName}}',
      body: `
Dear {{patientName}},

This is a reminder that you have an appointment scheduled:

Doctor: Dr. {{doctorName}}
Date: {{date}}
Time: {{time}}
Department: {{department}}

Please arrive 15 minutes early for registration.

If you need to reschedule, please contact us at {{contactNumber}}.

Best regards,
{{hospitalName}}
      `,
    },
  },
  APPOINTMENT_CONFIRMATION: {
    sms: 'Confirmed: Your appointment with Dr. {{doctorName}} on {{date}} at {{time}}. Ref: {{appointmentId}}. {{hospitalName}}',
    email: {
      subject: 'Appointment Confirmed - {{hospitalName}}',
      body: `
Dear {{patientName}},

Your appointment has been confirmed:

Reference Number: {{appointmentId}}
Doctor: Dr. {{doctorName}}
Date: {{date}}
Time: {{time}}
Department: {{department}}

Location: {{hospitalAddress}}

Please bring your ID and any previous medical records.

Best regards,
{{hospitalName}}
      `,
    },
  },
  APPOINTMENT_CANCELLED: {
    sms: 'Your appointment with Dr. {{doctorName}} on {{date}} has been cancelled. Please reschedule. {{hospitalName}}',
    email: {
      subject: 'Appointment Cancelled - {{hospitalName}}',
      body: `
Dear {{patientName}},

Your appointment has been cancelled:

Doctor: Dr. {{doctorName}}
Original Date: {{date}}
Original Time: {{time}}

Reason: {{reason}}

Please contact us to reschedule at {{contactNumber}}.

Best regards,
{{hospitalName}}
      `,
    },
  },
  LAB_RESULT_READY: {
    sms: 'Your lab results are ready. Visit {{hospitalName}} or access via patient portal. Ref: {{orderId}}',
    email: {
      subject: 'Lab Results Ready - {{hospitalName}}',
      body: `
Dear {{patientName}},

Your laboratory test results are now available.

Order Reference: {{orderId}}
Tests: {{testNames}}

You can:
1. Visit the hospital to collect your reports
2. Access them via our patient portal

If you have any questions about your results, please consult with your doctor.

Best regards,
{{hospitalName}}
      `,
    },
  },
  CRITICAL_VALUE_ALERT: {
    sms: 'URGENT: Critical lab value detected for patient {{patientName}} ({{mrn}}). {{testName}}: {{value}}. Immediate review required.',
    email: {
      subject: 'CRITICAL VALUE ALERT - Immediate Action Required',
      body: `
CRITICAL VALUE ALERT

Patient: {{patientName}}
MRN: {{mrn}}
Test: {{testName}}
Result: {{value}} {{unit}}
Normal Range: {{normalRange}}

This value requires immediate clinical review and action.

Time Detected: {{timestamp}}
Performing Lab: {{labName}}

Please acknowledge receipt and document action taken.

This is an automated alert from {{hospitalName}}.
      `,
    },
  },
  DISCHARGE_SUMMARY: {
    sms: 'Your discharge summary from {{hospitalName}} is ready. Please collect it from the medical records department.',
    email: {
      subject: 'Discharge Summary - {{hospitalName}}',
      body: `
Dear {{patientName}},

Your discharge summary is attached to this email.

Admission Date: {{admissionDate}}
Discharge Date: {{dischargeDate}}
Treating Doctor: Dr. {{doctorName}}

Follow-up Instructions:
{{followUpInstructions}}

Medications:
{{medications}}

If you have any questions, please contact us at {{contactNumber}}.

Best regards,
{{hospitalName}}
      `,
    },
  },
  PRESCRIPTION_READY: {
    sms: 'Your prescription is ready for pickup at {{hospitalName}} Pharmacy. Token: {{token}}',
    email: {
      subject: 'Prescription Ready for Pickup - {{hospitalName}}',
      body: `
Dear {{patientName}},

Your prescription is ready for pickup at our pharmacy.

Token Number: {{token}}
Prescribing Doctor: Dr. {{doctorName}}

Pharmacy Hours: {{pharmacyHours}}
Location: {{pharmacyLocation}}

Please bring your ID and this email for verification.

Best regards,
{{hospitalName}}
      `,
    },
  },
  PAYMENT_RECEIPT: {
    sms: 'Payment of Rs.{{amount}} received. Receipt No: {{receiptNumber}}. Balance: Rs.{{balance}}. {{hospitalName}}',
    email: {
      subject: 'Payment Receipt - {{hospitalName}}',
      body: `
Dear {{patientName}},

Thank you for your payment.

Receipt Number: {{receiptNumber}}
Amount Paid: Rs. {{amount}}
Payment Mode: {{paymentMode}}
Date: {{date}}

Invoice Number: {{invoiceNumber}}
Previous Balance: Rs. {{previousBalance}}
Current Balance: Rs. {{balance}}

For any queries, contact our billing department.

Best regards,
{{hospitalName}}
      `,
    },
  },
  BILL_GENERATED: {
    sms: 'Bill generated. Amount: Rs.{{amount}}. Invoice: {{invoiceNumber}}. Pay at {{hospitalName}} billing counter.',
    email: {
      subject: 'Invoice Generated - {{hospitalName}}',
      body: `
Dear {{patientName}},

Your invoice has been generated:

Invoice Number: {{invoiceNumber}}
Date: {{date}}
Total Amount: Rs. {{amount}}

Payment Options:
- Cash at billing counter
- Card payment
- UPI: {{upiId}}
- Online: {{paymentLink}}

Payment Due By: {{dueDate}}

Best regards,
{{hospitalName}}
      `,
    },
  },
  PASSWORD_RESET: {
    sms: 'Your OTP for password reset is {{otp}}. Valid for 10 minutes. Do not share. {{hospitalName}}',
    email: {
      subject: 'Password Reset Request - {{hospitalName}}',
      body: `
Dear {{userName}},

You have requested to reset your password.

Your OTP is: {{otp}}

This OTP is valid for 10 minutes.

If you did not request this, please contact IT support immediately.

Best regards,
{{hospitalName}}
      `,
    },
  },
  EMERGENCY_ALERT: {
    sms: 'EMERGENCY: {{patientName}} admitted to {{hospitalName}} Emergency. Contact: {{contactNumber}}',
    email: {
      subject: 'Emergency Admission Alert - {{hospitalName}}',
      body: `
EMERGENCY NOTIFICATION

Patient {{patientName}} has been admitted to our Emergency Department.

Time: {{timestamp}}
Triage Level: {{triageLevel}}
Location: {{location}}

Please contact us immediately at {{contactNumber}}.

{{hospitalName}}
      `,
    },
  },
  ADMISSION_NOTIFICATION: {
    sms: 'Patient {{patientName}} admitted to {{hospitalName}}. Room: {{roomNumber}}, Ward: {{wardName}}. Contact: {{contactNumber}}',
    email: {
      subject: 'Admission Notification - {{hospitalName}}',
      body: `
Dear Family/Guardian,

This is to inform you that {{patientName}} has been admitted.

Admission Details:
- Admission Date: {{admissionDate}}
- Room/Bed: {{roomNumber}} / {{bedNumber}}
- Ward: {{wardName}}
- Admitting Doctor: Dr. {{doctorName}}

Visiting Hours: {{visitingHours}}

For any queries, please contact: {{contactNumber}}

Best regards,
{{hospitalName}}
      `,
    },
  },
  SURGERY_SCHEDULED: {
    sms: 'Surgery scheduled for {{patientName}} on {{date}} at {{time}}. Report to OT Reception. {{hospitalName}}',
    email: {
      subject: 'Surgery Scheduled - {{hospitalName}}',
      body: `
Dear {{patientName}},

Your surgery has been scheduled:

Procedure: {{procedureName}}
Date: {{date}}
Time: {{time}}
Surgeon: Dr. {{surgeonName}}

Pre-operative Instructions:
{{preOpInstructions}}

Please report to OT Reception 2 hours before the scheduled time.

Contact: {{contactNumber}}

Best regards,
{{hospitalName}}
      `,
    },
  },
  BLOOD_REQUEST_URGENT: {
    sms: 'URGENT: Blood ({{bloodGroup}}) needed for {{patientName}} at {{hospitalName}}. Contact: {{contactNumber}}',
    email: {
      subject: 'URGENT Blood Requirement - {{hospitalName}}',
      body: `
URGENT BLOOD REQUIREMENT

Patient: {{patientName}}
Blood Group Required: {{bloodGroup}}
Units Needed: {{units}}
Hospital: {{hospitalName}}

If you or anyone you know can donate, please contact:
Phone: {{contactNumber}}
Blood Bank: {{bloodBankLocation}}

Thank you for saving a life.

{{hospitalName}}
      `,
    },
  },
};

// Template processor
function processTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}

// SMS Service
class SMSService {
  private config: SMSConfig;

  constructor() {
    this.config = {
      provider: (process.env.SMS_PROVIDER as SMSConfig['provider']) || 'mock',
      apiKey: process.env.SMS_API_KEY,
      apiSecret: process.env.SMS_API_SECRET,
      senderId: process.env.SMS_SENDER_ID || 'HOSPTL',
    };
  }

  async send(phone: string, message: string, priority: string = 'NORMAL'): Promise<boolean> {
    try {
      if (this.config.provider === 'mock' || !this.config.apiKey) {
        // Mock implementation - log instead of sending
        logger.info('SMS_MOCK', {
          to: phone,
          message: message.substring(0, 50) + '...',
          priority,
          timestamp: new Date().toISOString(),
        });
        return true;
      }

      switch (this.config.provider) {
        case 'twilio':
          return await this.sendViaTwilio(phone, message);
        case 'msg91':
          return await this.sendViaMsg91(phone, message);
        case 'aws-sns':
          return await this.sendViaAWSSNS(phone, message);
        default:
          logger.warn('Unknown SMS provider', { provider: this.config.provider });
          return false;
      }
    } catch (error) {
      logger.error('SMS sending failed', { phone, error });
      return false;
    }
  }

  private async sendViaTwilio(phone: string, message: string): Promise<boolean> {
    // Twilio implementation placeholder
    // In production, use: const twilio = require('twilio')(accountSid, authToken);
    logger.info('SMS_TWILIO', { to: phone, messageLength: message.length });
    return true;
  }

  private async sendViaMsg91(phone: string, message: string): Promise<boolean> {
    // MSG91 implementation placeholder
    logger.info('SMS_MSG91', { to: phone, messageLength: message.length });
    return true;
  }

  private async sendViaAWSSNS(phone: string, message: string): Promise<boolean> {
    // AWS SNS implementation placeholder
    logger.info('SMS_AWS_SNS', { to: phone, messageLength: message.length });
    return true;
  }
}

// Email Service
class EmailService {
  private config: EmailConfig;

  constructor() {
    this.config = {
      provider: (process.env.EMAIL_PROVIDER as EmailConfig['provider']) || 'mock',
      host: config.email?.host,
      port: config.email?.port,
      user: config.email?.user,
      pass: config.email?.pass,
      apiKey: process.env.SENDGRID_API_KEY,
      from: config.email?.from || 'noreply@hospital.com',
    };
  }

  async send(
    to: string,
    subject: string,
    body: string,
    attachments?: any[]
  ): Promise<boolean> {
    try {
      if (this.config.provider === 'mock' || !this.config.host) {
        // Mock implementation - log instead of sending
        logger.info('EMAIL_MOCK', {
          to,
          subject,
          bodyPreview: body.substring(0, 100) + '...',
          hasAttachments: !!attachments?.length,
          timestamp: new Date().toISOString(),
        });
        return true;
      }

      switch (this.config.provider) {
        case 'smtp':
          return await this.sendViaSMTP(to, subject, body, attachments);
        case 'sendgrid':
          return await this.sendViaSendGrid(to, subject, body, attachments);
        case 'aws-ses':
          return await this.sendViaAWSSES(to, subject, body, attachments);
        default:
          logger.warn('Unknown email provider', { provider: this.config.provider });
          return false;
      }
    } catch (error) {
      logger.error('Email sending failed', { to, subject, error });
      return false;
    }
  }

  private async sendViaSMTP(
    to: string,
    subject: string,
    body: string,
    attachments?: any[]
  ): Promise<boolean> {
    // Nodemailer implementation placeholder
    // In production, use nodemailer with transporter.sendMail()
    logger.info('EMAIL_SMTP', { to, subject });
    return true;
  }

  private async sendViaSendGrid(
    to: string,
    subject: string,
    body: string,
    attachments?: any[]
  ): Promise<boolean> {
    // SendGrid implementation placeholder
    logger.info('EMAIL_SENDGRID', { to, subject });
    return true;
  }

  private async sendViaAWSSES(
    to: string,
    subject: string,
    body: string,
    attachments?: any[]
  ): Promise<boolean> {
    // AWS SES implementation placeholder
    logger.info('EMAIL_AWS_SES', { to, subject });
    return true;
  }
}

// Main Notification Service
class NotificationService {
  private smsService: SMSService;
  private emailService: EmailService;
  private notificationQueue: NotificationPayload[] = [];
  private isProcessing = false;

  constructor() {
    this.smsService = new SMSService();
    this.emailService = new EmailService();
  }

  /**
   * Send a notification immediately
   */
  async send(payload: NotificationPayload): Promise<{ sms: boolean; email: boolean }> {
    const template = templates[payload.type];
    const results = { sms: false, email: false };

    if (!template) {
      logger.error('Unknown notification type', { type: payload.type });
      return results;
    }

    // Send SMS if phone provided
    if (payload.recipientPhone) {
      const smsMessage = payload.message || processTemplate(template.sms, payload.data || {});
      results.sms = await this.smsService.send(
        payload.recipientPhone,
        smsMessage,
        payload.priority
      );
    }

    // Send Email if email provided
    if (payload.recipientEmail) {
      const emailSubject = payload.subject || processTemplate(template.email.subject, payload.data || {});
      const emailBody = processTemplate(template.email.body, payload.data || {});
      results.email = await this.emailService.send(
        payload.recipientEmail,
        emailSubject,
        emailBody
      );
    }

    // Log notification
    logger.info('NOTIFICATION_SENT', {
      type: payload.type,
      recipientPhone: payload.recipientPhone ? '***' + payload.recipientPhone.slice(-4) : null,
      recipientEmail: payload.recipientEmail ? '***@' + payload.recipientEmail.split('@')[1] : null,
      results,
      timestamp: new Date().toISOString(),
    });

    return results;
  }

  /**
   * Queue a notification for later processing
   */
  queue(payload: NotificationPayload): void {
    this.notificationQueue.push(payload);
    logger.debug('Notification queued', { type: payload.type, queueSize: this.notificationQueue.length });
  }

  /**
   * Process queued notifications
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      if (notification) {
        try {
          await this.send(notification);
        } catch (error) {
          logger.error('Failed to process queued notification', { error });
        }
      }
      // Small delay between sends to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
  }

  // Convenience methods for common notifications

  async sendAppointmentReminder(
    patientPhone: string,
    patientEmail: string,
    data: {
      patientName: string;
      doctorName: string;
      date: string;
      time: string;
      department: string;
      hospitalName: string;
      contactNumber: string;
    }
  ): Promise<void> {
    await this.send({
      type: 'APPOINTMENT_REMINDER',
      recipientPhone: patientPhone,
      recipientEmail: patientEmail,
      message: '',
      data,
    });
  }

  async sendLabResultReady(
    patientPhone: string,
    patientEmail: string,
    data: {
      patientName: string;
      orderId: string;
      testNames: string;
      hospitalName: string;
    }
  ): Promise<void> {
    await this.send({
      type: 'LAB_RESULT_READY',
      recipientPhone: patientPhone,
      recipientEmail: patientEmail,
      message: '',
      data,
    });
  }

  async sendCriticalValueAlert(
    doctorPhone: string,
    doctorEmail: string,
    data: {
      patientName: string;
      mrn: string;
      testName: string;
      value: string;
      unit: string;
      normalRange: string;
      timestamp: string;
      labName: string;
      hospitalName: string;
    }
  ): Promise<void> {
    await this.send({
      type: 'CRITICAL_VALUE_ALERT',
      recipientPhone: doctorPhone,
      recipientEmail: doctorEmail,
      message: '',
      data,
      priority: 'URGENT',
    });
  }

  async sendPaymentReceipt(
    patientPhone: string,
    patientEmail: string,
    data: {
      patientName: string;
      amount: string;
      receiptNumber: string;
      balance: string;
      paymentMode: string;
      invoiceNumber: string;
      previousBalance: string;
      date: string;
      hospitalName: string;
    }
  ): Promise<void> {
    await this.send({
      type: 'PAYMENT_RECEIPT',
      recipientPhone: patientPhone,
      recipientEmail: patientEmail,
      message: '',
      data,
    });
  }

  async sendEmergencyAlert(
    contactPhone: string,
    contactEmail: string,
    data: {
      patientName: string;
      timestamp: string;
      triageLevel: string;
      location: string;
      contactNumber: string;
      hospitalName: string;
    }
  ): Promise<void> {
    await this.send({
      type: 'EMERGENCY_ALERT',
      recipientPhone: contactPhone,
      recipientEmail: contactEmail,
      message: '',
      data,
      priority: 'URGENT',
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Export for testing
export { NotificationService, SMSService, EmailService, templates, processTemplate };
