import { logger } from '../utils/logger';

// Safe config access
const getEmailConfig = () => {
  try {
    const { config } = require('../config');
    return config?.email || {};
  } catch {
    return {};
  }
};
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

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

interface WhatsAppConfig {
  provider: 'twilio' | 'meta' | 'gupshup' | 'mock';
  accountSid?: string;
  authToken?: string;
  fromNumber?: string; // Twilio WhatsApp number (e.g., whatsapp:+14155238886)
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

// Notification templates (SMS, Email, and WhatsApp)
const templates: Record<NotificationType, { sms: string; email: { subject: string; body: string }; whatsapp: string }> = {
  APPOINTMENT_REMINDER: {
    sms: 'Reminder: Your appointment with Dr. {{doctorName}} is scheduled for {{date}} at {{time}}. {{hospitalName}}',
    whatsapp: `🏥 *Appointment Reminder*

Dear {{patientName}},

Your appointment is scheduled:
👨‍⚕️ *Doctor:* Dr. {{doctorName}}
📅 *Date:* {{date}}
🕐 *Time:* {{time}}
🏢 *Department:* {{department}}

Please arrive 15 minutes early.

📞 To reschedule: {{contactNumber}}

_{{hospitalName}}_`,
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
    whatsapp: `✅ *Appointment Confirmed*

Dear {{patientName}},

Your appointment is confirmed:
🔖 *Ref:* {{appointmentId}}
👨‍⚕️ *Doctor:* Dr. {{doctorName}}
📅 *Date:* {{date}}
🕐 *Time:* {{time}}
🏢 *Department:* {{department}}

📍 *Location:* {{hospitalAddress}}

Please bring your ID and medical records.

_{{hospitalName}}_`,
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
    whatsapp: `❌ *Appointment Cancelled*

Dear {{patientName}},

Your appointment has been cancelled:
👨‍⚕️ *Doctor:* Dr. {{doctorName}}
📅 *Original Date:* {{date}}
🕐 *Original Time:* {{time}}

📝 *Reason:* {{reason}}

📞 To reschedule: {{contactNumber}}

_{{hospitalName}}_`,
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
    whatsapp: `🔬 *Lab Results Ready*

Dear {{patientName}},

Your test results are available!
🔖 *Order Ref:* {{orderId}}
🧪 *Tests:* {{testNames}}

You can:
1️⃣ Visit the hospital
2️⃣ Access via patient portal

Consult your doctor for any questions.

_{{hospitalName}}_`,
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
    whatsapp: `🚨 *CRITICAL VALUE ALERT*

⚠️ *IMMEDIATE ACTION REQUIRED*

👤 *Patient:* {{patientName}}
🔖 *MRN:* {{mrn}}
🧪 *Test:* {{testName}}
📊 *Result:* {{value}} {{unit}}
📈 *Normal Range:* {{normalRange}}

🕐 *Time:* {{timestamp}}
🏥 *Lab:* {{labName}}

Please acknowledge and document action taken.

_{{hospitalName}}_`,
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
    whatsapp: `📋 *Discharge Summary Ready*

Dear {{patientName}},

Your discharge summary is ready.

📅 *Admission:* {{admissionDate}}
📅 *Discharge:* {{dischargeDate}}
👨‍⚕️ *Doctor:* Dr. {{doctorName}}

📝 *Follow-up:*
{{followUpInstructions}}

💊 *Medications:*
{{medications}}

📞 Contact: {{contactNumber}}

_{{hospitalName}}_`,
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
    whatsapp: `💊 *Prescription Ready*

Dear {{patientName}},

Your prescription is ready!
🎫 *Token:* {{token}}
👨‍⚕️ *Doctor:* Dr. {{doctorName}}

🕐 *Pharmacy Hours:* {{pharmacyHours}}
📍 *Location:* {{pharmacyLocation}}

Bring your ID for verification.

_{{hospitalName}}_`,
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
    whatsapp: `✅ *Payment Received*

Dear {{patientName}},

Thank you for your payment!

🧾 *Receipt:* {{receiptNumber}}
💰 *Amount:* ₹{{amount}}
💳 *Mode:* {{paymentMode}}
📅 *Date:* {{date}}

📄 *Invoice:* {{invoiceNumber}}
💵 *Balance:* ₹{{balance}}

_{{hospitalName}}_`,
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
    whatsapp: `🧾 *Invoice Generated*

Dear {{patientName}},

📄 *Invoice:* {{invoiceNumber}}
📅 *Date:* {{date}}
💰 *Amount:* ₹{{amount}}

*Payment Options:*
💵 Cash at billing counter
💳 Card payment
📱 UPI: {{upiId}}
🔗 Online: {{paymentLink}}

⏰ *Due:* {{dueDate}}

_{{hospitalName}}_`,
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
    whatsapp: `🔐 *Password Reset*

Dear {{userName}},

Your OTP: *{{otp}}*

⏰ Valid for 10 minutes
⚠️ Do not share this code

If you didn't request this, contact IT support.

_{{hospitalName}}_`,
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
    whatsapp: `🚨 *EMERGENCY ALERT*

Patient *{{patientName}}* admitted to Emergency.

🕐 *Time:* {{timestamp}}
⚠️ *Triage:* {{triageLevel}}
📍 *Location:* {{location}}

📞 *Contact:* {{contactNumber}}

_{{hospitalName}}_`,
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
    whatsapp: `🏥 *Admission Notification*

Dear Family/Guardian,

*{{patientName}}* has been admitted.

📅 *Date:* {{admissionDate}}
🛏️ *Room/Bed:* {{roomNumber}} / {{bedNumber}}
🏢 *Ward:* {{wardName}}
👨‍⚕️ *Doctor:* Dr. {{doctorName}}

🕐 *Visiting Hours:* {{visitingHours}}

📞 Contact: {{contactNumber}}

_{{hospitalName}}_`,
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
    whatsapp: `🏥 *Surgery Scheduled*

Dear {{patientName}},

Your surgery is scheduled:

🔬 *Procedure:* {{procedureName}}
📅 *Date:* {{date}}
🕐 *Time:* {{time}}
👨‍⚕️ *Surgeon:* Dr. {{surgeonName}}

📝 *Pre-op Instructions:*
{{preOpInstructions}}

⚠️ Report to OT Reception 2 hours early.

📞 Contact: {{contactNumber}}

_{{hospitalName}}_`,
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
    whatsapp: `🩸 *URGENT BLOOD REQUIREMENT*

👤 *Patient:* {{patientName}}
🩸 *Blood Group:* {{bloodGroup}}
📊 *Units Needed:* {{units}}

If you can donate, please contact:
📞 *Phone:* {{contactNumber}}
🏥 *Blood Bank:* {{bloodBankLocation}}

❤️ Thank you for saving a life!

_{{hospitalName}}_`,
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
      apiKey: process.env.SMS_API_KEY || process.env.TWILIO_AUTH_TOKEN || process.env.MSG91_AUTH_KEY,
      apiSecret: process.env.SMS_API_SECRET || process.env.TWILIO_ACCOUNT_SID,
      senderId: process.env.SMS_SENDER_ID || process.env.TWILIO_PHONE_NUMBER || 'HOSPTL',
    };
  }

  async send(phone: string, message: string, priority: string = 'NORMAL'): Promise<boolean> {
    try {
      // Normalize phone number (ensure it has country code)
      const normalizedPhone = this.normalizePhone(phone);

      if (this.config.provider === 'mock' || !this.config.apiKey) {
        // Mock implementation - log instead of sending
        logger.info('SMS_MOCK', {
          to: normalizedPhone,
          message: message.substring(0, 50) + '...',
          priority,
          timestamp: new Date().toISOString(),
        });
        return true;
      }

      switch (this.config.provider) {
        case 'twilio':
          return await this.sendViaTwilio(normalizedPhone, message);
        case 'msg91':
          return await this.sendViaMsg91(normalizedPhone, message);
        case 'aws-sns':
          return await this.sendViaAWSSNS(normalizedPhone, message);
        default:
          logger.warn('Unknown SMS provider', { provider: this.config.provider });
          return false;
      }
    } catch (error) {
      logger.error('SMS sending failed', { phone, error });
      return false;
    }
  }

  private normalizePhone(phone: string): string {
    // Remove any non-numeric characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    // Add India country code if not present
    if (!cleaned.startsWith('+')) {
      if (cleaned.length === 10) {
        cleaned = '+91' + cleaned;
      } else if (!cleaned.startsWith('91') && cleaned.length === 10) {
        cleaned = '+91' + cleaned;
      } else {
        cleaned = '+' + cleaned;
      }
    }
    return cleaned;
  }

  private async sendViaTwilio(phone: string, message: string): Promise<boolean> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      logger.error('Twilio credentials not configured');
      return false;
    }

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: phone,
            From: fromNumber,
            Body: message,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        logger.error('Twilio SMS failed', { error: data });
        return false;
      }

      logger.info('SMS_TWILIO_SENT', { to: phone, sid: (data as any).sid });
      return true;
    } catch (error) {
      logger.error('Twilio API error', { error });
      return false;
    }
  }

  private async sendViaMsg91(phone: string, message: string): Promise<boolean> {
    const authKey = process.env.MSG91_AUTH_KEY;
    const senderId = process.env.MSG91_SENDER_ID || 'HOSPTL';
    const templateId = process.env.MSG91_TEMPLATE_ID;

    if (!authKey) {
      logger.error('MSG91 credentials not configured');
      return false;
    }

    try {
      // MSG91 Flow API
      const response = await fetch('https://api.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
          'authkey': authKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flow_id: templateId,
          sender: senderId,
          mobiles: phone.replace('+', ''),
          VAR1: message, // Template variable
        }),
      });

      const data = await response.json();

      const result = data as any;
      if (result.type !== 'success') {
        logger.error('MSG91 SMS failed', { error: result });
        return false;
      }

      logger.info('SMS_MSG91_SENT', { to: phone, requestId: result.request_id });
      return true;
    } catch (error) {
      logger.error('MSG91 API error', { error });
      return false;
    }
  }

  private async sendViaAWSSNS(phone: string, message: string): Promise<boolean> {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'ap-south-1';

    if (!accessKeyId || !secretAccessKey) {
      logger.warn('AWS credentials not configured - using mock');
      logger.info('SMS_AWS_SNS_MOCK', { to: phone, messageLength: message.length });
      return true;
    }

    try {
      // AWS SNS REST API call using AWS Signature V4
      const endpoint = `https://sns.${region}.amazonaws.com`;
      const now = new Date();
      const dateString = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
      const dateStamp = dateString.slice(0, 8);

      const params = new URLSearchParams({
        Action: 'Publish',
        Message: message,
        PhoneNumber: phone,
        Version: '2010-03-31',
      });

      // For production, use @aws-sdk/client-sns package
      // This is a simplified implementation
      let SNSClient: any = null;
      let PublishCommand: any = null;
      try {
        const sns = await import('@aws-sdk/client-sns' as any);
        SNSClient = sns.SNSClient;
        PublishCommand = sns.PublishCommand;
      } catch {
        // AWS SDK not installed, skip SMS
      }

      if (SNSClient && PublishCommand) {
        const client = new SNSClient({
          region,
          credentials: { accessKeyId, secretAccessKey },
        });

        const command = new PublishCommand({
          Message: message,
          PhoneNumber: phone,
        });

        const result = await client.send(command);
        logger.info('SMS_AWS_SNS_SENT', { to: phone, messageId: result.MessageId });
        return true;
      } else {
        // Fallback to mock if SDK not installed
        logger.warn('AWS SDK not installed - using mock. Install @aws-sdk/client-sns for production');
        logger.info('SMS_AWS_SNS_MOCK', { to: phone, messageLength: message.length });
        return true;
      }
    } catch (error) {
      logger.error('AWS SNS error', { phone, error });
      return false;
    }
  }
}

// WhatsApp Service (Twilio)
class WhatsAppService {
  private config: WhatsAppConfig;

  constructor() {
    this.config = {
      provider: (process.env.WHATSAPP_PROVIDER as WhatsAppConfig['provider']) || 'mock',
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886', // Twilio sandbox default
    };
  }

  async send(phone: string, message: string, priority: string = 'NORMAL'): Promise<boolean> {
    try {
      const normalizedPhone = this.normalizePhone(phone);

      if (this.config.provider === 'mock' || !this.config.accountSid || !this.config.authToken) {
        // Mock implementation - log instead of sending
        logger.info('WHATSAPP_MOCK', {
          to: normalizedPhone,
          message: message.substring(0, 100) + '...',
          priority,
          timestamp: new Date().toISOString(),
        });
        return true;
      }

      switch (this.config.provider) {
        case 'twilio':
          return await this.sendViaTwilio(normalizedPhone, message);
        case 'meta':
          return await this.sendViaMeta(normalizedPhone, message);
        case 'gupshup':
          return await this.sendViaGupshup(normalizedPhone, message);
        default:
          logger.warn('Unknown WhatsApp provider', { provider: this.config.provider });
          return false;
      }
    } catch (error) {
      logger.error('WhatsApp sending failed', { phone, error });
      return false;
    }
  }

  private normalizePhone(phone: string): string {
    // Remove any non-numeric characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    // Add India country code if not present
    if (!cleaned.startsWith('+')) {
      if (cleaned.length === 10) {
        cleaned = '+91' + cleaned;
      } else if (!cleaned.startsWith('91') && cleaned.length === 10) {
        cleaned = '+91' + cleaned;
      } else {
        cleaned = '+' + cleaned;
      }
    }
    return cleaned;
  }

  private async sendViaTwilio(phone: string, message: string): Promise<boolean> {
    const accountSid = this.config.accountSid;
    const authToken = this.config.authToken;
    const fromNumber = this.config.fromNumber;

    if (!accountSid || !authToken || !fromNumber) {
      logger.error('Twilio WhatsApp credentials not configured');
      return false;
    }

    try {
      // Format phone number for WhatsApp (needs whatsapp: prefix)
      const toWhatsApp = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
      const fromWhatsApp = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: toWhatsApp,
            From: fromWhatsApp,
            Body: message,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        logger.error('Twilio WhatsApp failed', { error: data });
        return false;
      }

      logger.info('WHATSAPP_TWILIO_SENT', { to: phone, sid: (data as any).sid });
      return true;
    } catch (error) {
      logger.error('Twilio WhatsApp API error', { error });
      return false;
    }
  }

  private async sendViaMeta(phone: string, message: string): Promise<boolean> {
    // Meta Cloud API implementation
    const accessToken = process.env.META_WHATSAPP_TOKEN;
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      logger.warn('Meta WhatsApp credentials not configured - using mock');
      logger.info('WHATSAPP_META_MOCK', { to: phone, messageLength: message.length });
      return true;
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone.replace('+', ''),
            type: 'text',
            text: { body: message },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        logger.error('Meta WhatsApp failed', { error: data });
        return false;
      }

      logger.info('WHATSAPP_META_SENT', { to: phone, messageId: (data as any).messages?.[0]?.id });
      return true;
    } catch (error) {
      logger.error('Meta WhatsApp API error', { error });
      return false;
    }
  }

  private async sendViaGupshup(phone: string, message: string): Promise<boolean> {
    // Gupshup implementation
    const apiKey = process.env.GUPSHUP_API_KEY;
    const appName = process.env.GUPSHUP_APP_NAME;
    const sourceNumber = process.env.GUPSHUP_SOURCE_NUMBER;

    if (!apiKey || !appName) {
      logger.warn('Gupshup WhatsApp credentials not configured - using mock');
      logger.info('WHATSAPP_GUPSHUP_MOCK', { to: phone, messageLength: message.length });
      return true;
    }

    try {
      const response = await fetch('https://api.gupshup.io/sm/api/v1/msg', {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          channel: 'whatsapp',
          source: sourceNumber || '',
          destination: phone.replace('+', ''),
          message: JSON.stringify({ type: 'text', text: message }),
          'src.name': appName,
        }),
      });

      const data = await response.json();

      if ((data as any).status !== 'submitted') {
        logger.error('Gupshup WhatsApp failed', { error: data });
        return false;
      }

      logger.info('WHATSAPP_GUPSHUP_SENT', { to: phone, messageId: (data as any).messageId });
      return true;
    } catch (error) {
      logger.error('Gupshup WhatsApp API error', { error });
      return false;
    }
  }
}

// Email Service
class EmailService {
  private config: EmailConfig;
  private smtpTransporter: Transporter | null = null;

  constructor() {
    const emailConfig = getEmailConfig();
    this.config = {
      provider: (process.env.EMAIL_PROVIDER as EmailConfig['provider']) || 'mock',
      host: emailConfig?.host,
      port: emailConfig?.port,
      user: emailConfig?.user,
      pass: emailConfig?.pass,
      apiKey: process.env.SENDGRID_API_KEY,
      from: emailConfig?.from || 'noreply@hospital.com',
    };

    // Initialize SMTP transporter if configured
    if (this.config.provider === 'smtp' && this.config.host) {
      this.initSMTPTransporter();
    }
  }

  private initSMTPTransporter(): void {
    try {
      this.smtpTransporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port || 587,
        secure: this.config.port === 465, // true for 465, false for other ports
        auth: {
          user: this.config.user,
          pass: this.config.pass,
        },
      });
      logger.info('SMTP transporter initialized');
    } catch (error) {
      logger.error('Failed to initialize SMTP transporter', { error });
    }
  }

  async send(
    to: string,
    subject: string,
    body: string,
    attachments?: any[]
  ): Promise<boolean> {
    try {
      // Check for valid email
      if (!to || !this.isValidEmail(to)) {
        logger.warn('Invalid email address', { to });
        return false;
      }

      if (this.config.provider === 'mock' || (!this.config.host && !this.config.apiKey)) {
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

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async sendViaSMTP(
    to: string,
    subject: string,
    body: string,
    attachments?: any[]
  ): Promise<boolean> {
    if (!this.smtpTransporter) {
      this.initSMTPTransporter();
      if (!this.smtpTransporter) {
        logger.error('SMTP transporter not available');
        return false;
      }
    }

    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: this.config.from,
        to,
        subject,
        text: body,
        html: this.textToHtml(body),
        attachments: attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      };

      const result = await this.smtpTransporter.sendMail(mailOptions);
      logger.info('EMAIL_SMTP_SENT', { to, subject, messageId: result.messageId });
      return true;
    } catch (error) {
      logger.error('SMTP send failed', { to, subject, error });
      return false;
    }
  }

  private async sendViaSendGrid(
    to: string,
    subject: string,
    body: string,
    attachments?: any[]
  ): Promise<boolean> {
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
      logger.error('SendGrid API key not configured');
      return false;
    }

    try {
      const emailData: any = {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: this.config.from },
        subject,
        content: [
          { type: 'text/plain', value: body },
          { type: 'text/html', value: this.textToHtml(body) },
        ],
      };

      if (attachments?.length) {
        emailData.attachments = attachments.map(att => ({
          content: Buffer.isBuffer(att.content)
            ? att.content.toString('base64')
            : att.content,
          filename: att.filename,
          type: att.contentType,
          disposition: 'attachment',
        }));
      }

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error('SendGrid send failed', { to, subject, error: errorData });
        return false;
      }

      logger.info('EMAIL_SENDGRID_SENT', { to, subject });
      return true;
    } catch (error) {
      logger.error('SendGrid API error', { to, subject, error });
      return false;
    }
  }

  private async sendViaAWSSES(
    to: string,
    subject: string,
    body: string,
    attachments?: any[]
  ): Promise<boolean> {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'ap-south-1';

    if (!accessKeyId || !secretAccessKey) {
      logger.warn('AWS credentials not configured - using mock');
      logger.info('EMAIL_AWS_SES_MOCK', { to, subject });
      return true;
    }

    try {
      const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses').catch(() => ({ SESClient: null, SendEmailCommand: null }));

      if (SESClient && SendEmailCommand) {
        const client = new SESClient({
          region,
          credentials: { accessKeyId, secretAccessKey },
        });

        const command = new SendEmailCommand({
          Source: this.config.from,
          Destination: {
            ToAddresses: [to],
          },
          Message: {
            Subject: {
              Data: subject,
              Charset: 'UTF-8',
            },
            Body: {
              Text: {
                Data: body,
                Charset: 'UTF-8',
              },
              Html: {
                Data: this.textToHtml(body),
                Charset: 'UTF-8',
              },
            },
          },
        });

        const result = await client.send(command);
        logger.info('EMAIL_AWS_SES_SENT', { to, subject, messageId: result.MessageId });
        return true;
      } else {
        // Fallback to mock if SDK not installed
        logger.warn('AWS SDK not installed - using mock. Install @aws-sdk/client-ses for production');
        logger.info('EMAIL_AWS_SES_MOCK', { to, subject });
        return true;
      }
    } catch (error) {
      logger.error('AWS SES error', { to, subject, error });
      return false;
    }
  }

  private textToHtml(text: string): string {
    // Convert plain text to simple HTML
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          ${text.replace(/\n/g, '<br>')}
        </div>
      </body>
      </html>
    `;
  }
}

// Main Notification Service
class NotificationService {
  private smsService: SMSService;
  private emailService: EmailService;
  private whatsappService: WhatsAppService;
  private notificationQueue: NotificationPayload[] = [];
  private isProcessing = false;

  constructor() {
    this.smsService = new SMSService();
    this.emailService = new EmailService();
    this.whatsappService = new WhatsAppService();
  }

  /**
   * Send a notification immediately
   * @param payload - Notification data
   * @param channels - Optional array to specify channels ['sms', 'email', 'whatsapp']. Defaults to all available.
   */
  async send(
    payload: NotificationPayload,
    channels?: ('sms' | 'email' | 'whatsapp')[]
  ): Promise<{ sms: boolean; email: boolean; whatsapp: boolean }> {
    const template = templates[payload.type];
    const results = { sms: false, email: false, whatsapp: false };

    if (!template) {
      logger.error('Unknown notification type', { type: payload.type });
      return results;
    }

    const sendSms = !channels || channels.includes('sms');
    const sendEmail = !channels || channels.includes('email');
    const sendWhatsapp = !channels || channels.includes('whatsapp');

    // Send SMS if phone provided and channel enabled
    if (payload.recipientPhone && sendSms) {
      const smsMessage = payload.message || processTemplate(template.sms, payload.data || {});
      results.sms = await this.smsService.send(
        payload.recipientPhone,
        smsMessage,
        payload.priority
      );
    }

    // Send Email if email provided and channel enabled
    if (payload.recipientEmail && sendEmail) {
      const emailSubject = payload.subject || processTemplate(template.email.subject, payload.data || {});
      const emailBody = processTemplate(template.email.body, payload.data || {});
      results.email = await this.emailService.send(
        payload.recipientEmail,
        emailSubject,
        emailBody
      );
    }

    // Send WhatsApp if phone provided and channel enabled
    if (payload.recipientPhone && sendWhatsapp) {
      const whatsappMessage = processTemplate(template.whatsapp, payload.data || {});
      results.whatsapp = await this.whatsappService.send(
        payload.recipientPhone,
        whatsappMessage,
        payload.priority
      );
    }

    // Log notification
    logger.info('NOTIFICATION_SENT', {
      type: payload.type,
      recipientPhone: payload.recipientPhone ? '***' + payload.recipientPhone.slice(-4) : null,
      recipientEmail: payload.recipientEmail ? '***@' + payload.recipientEmail.split('@')[1] : null,
      channels: channels || ['sms', 'email', 'whatsapp'],
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
export { NotificationService, SMSService, EmailService, WhatsAppService, templates, processTemplate };
