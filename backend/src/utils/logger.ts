/* eslint-disable @typescript-eslint/no-explicit-any */
import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

/**
 * PHI redactor for log output.
 *
 * HIPAA-equivalent rule of thumb: don't write Patient Health Information into
 * application logs. Logs leak through stdout, log shippers, third-party
 * platforms, and ops dashboards — none of which carry the same access
 * controls as the database itself.
 *
 * This format walks log metadata recursively and replaces values for known
 * PHI keys with "[REDACTED]". Caller can still log the IDs (`patientId`,
 * `mrn`) so an investigator can pivot back to the DB; what's scrubbed is the
 * personally-identifying free text.
 *
 * Override the list with LOG_REDACT_KEYS=key1,key2,... (additive).
 */
const DEFAULT_PHI_KEYS = new Set([
  'name', 'patientName', 'firstName', 'lastName', 'fullName',
  'email', 'phone', 'contact', 'phoneNumber', 'mobile',
  'address', 'street', 'city', 'pincode', 'zip',
  'dob', 'dateOfBirth', 'aadhaar', 'pan', 'ssn',
  'emergencyContact', 'kin', 'relativeName',
  'allergies', 'diagnosis', 'symptoms', 'chiefComplaint',
  'password', 'passwordHash', 'token', 'authorization',
  'sessionToken', 'refreshToken', 'apiKey', 'secret',
]);
const extraKeys = (process.env.LOG_REDACT_KEYS || '').split(',').map((s) => s.trim()).filter(Boolean);
const PHI_KEYS: Set<string> = new Set([...DEFAULT_PHI_KEYS, ...extraKeys]);

function redactPHI(value: any, depth = 0): any {
  if (depth > 6 || value == null) return value;
  if (Array.isArray(value)) return value.map((v) => redactPHI(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = PHI_KEYS.has(k) ? '[REDACTED]' : redactPHI(v, depth + 1);
    }
    return out;
  }
  return value;
}

// Winston format that scrubs PHI keys from every entry's meta. Applied
// before consoleFormat / fileFormat so both transports get scrubbed output.
const phiRedactor = winston.format((info) => {
  for (const [k, v] of Object.entries(info)) {
    if (k === 'level' || k === 'message' || k === 'timestamp') continue;
    if (PHI_KEYS.has(k)) {
      (info as any)[k] = '[REDACTED]';
    } else {
      (info as any)[k] = redactPHI(v);
    }
  }
  return info;
});

// Serverless platforms (Vercel, Lambda, etc.) run from a read-only filesystem
// — only stdout/stderr is durable. Skip file transports there. Anywhere else
// (local dev, Docker, plain VPS) keep file logs as before.
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);

const logDir = config.logging.dir;
if (!isServerless) {
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  } catch (e) {
    // If we can't create the log dir (e.g. read-only FS we didn't detect),
    // fall back to console-only logging instead of crashing on boot.
    console.warn(`[logger] could not create log dir ${logDir}: ${(e as Error).message}. Falling back to console-only logging.`);
  }
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  phiRedactor(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Custom format for file output (JSON)
const fileFormat = winston.format.combine(
  phiRedactor(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Build the transport list. Always include the console; only add file
// transports when we have a writable filesystem.
const transports: winston.transport[] = [
  new winston.transports.Console({ format: consoleFormat }),
];

if (!isServerless) {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'audit.log'),
      level: 'info',
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  );
}

// Create logger
export const logger = winston.createLogger({
  level: config.logging.level,
  defaultMeta: { service: 'hospital-erp' },
  transports,
});

// Create audit logger for sensitive operations
export const auditLogger = {
  log: (action: string, userId: string, details: Record<string, any>) => {
    logger.info('AUDIT', {
      action,
      userId,
      timestamp: new Date().toISOString(),
      ...details,
    });
  },
  loginSuccess: (userId: string, ip: string) => {
    auditLogger.log('LOGIN_SUCCESS', userId, { ip });
  },
  loginFailure: (username: string, ip: string, reason: string) => {
    logger.warn('AUDIT', {
      action: 'LOGIN_FAILURE',
      username,
      ip,
      reason,
      timestamp: new Date().toISOString(),
    });
  },
  dataAccess: (userId: string, resource: string, action: string, resourceId?: string) => {
    auditLogger.log('DATA_ACCESS', userId, { resource, action, resourceId });
  },
  dataModification: (userId: string, resource: string, action: string, resourceId: string, changes?: Record<string, any>) => {
    auditLogger.log('DATA_MODIFICATION', userId, { resource, action, resourceId, changes });
  },
  securityEvent: (event: string, details: Record<string, any>) => {
    logger.warn('SECURITY_EVENT', {
      event,
      timestamp: new Date().toISOString(),
      ...details,
    });
  },
};

// HTTP request logger stream for Morgan
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};
