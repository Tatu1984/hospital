/* eslint-disable @typescript-eslint/no-explicit-any */
import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

// Ensure log directory exists
const logDir = config.logging.dir;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
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

// Create logger
export const logger = winston.createLogger({
  level: config.logging.level,
  defaultMeta: { service: 'hospital-erp' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Audit log for sensitive operations
    new winston.transports.File({
      filename: path.join(logDir, 'audit.log'),
      level: 'info',
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
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
