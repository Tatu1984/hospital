/* eslint-disable @typescript-eslint/no-explicit-any */
import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

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
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Custom format for file output (JSON)
const fileFormat = winston.format.combine(
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
