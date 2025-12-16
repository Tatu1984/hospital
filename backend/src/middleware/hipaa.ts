import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { logger, auditLogger } from '../utils/logger';
import { AuthenticatedRequest } from './auth';

// HIPAA-compliant encryption for PHI (Protected Health Information)
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

// Get encryption key from environment or generate one
const getEncryptionKey = (): Buffer => {
  const secret = process.env.PHI_ENCRYPTION_KEY || config.jwt.secret;
  return crypto.scryptSync(secret, 'phi-salt', KEY_LENGTH);
};

/**
 * Encrypt sensitive PHI data
 */
export function encryptPHI(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return IV + AuthTag + Encrypted data
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt PHI data
 */
export function decryptPHI(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hash sensitive data (one-way, for comparison)
 */
export function hashSensitiveData(data: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.pbkdf2Sync(data, salt, ITERATIONS, 64, 'sha512');
  return salt.toString('hex') + ':' + hash.toString('hex');
}

/**
 * Verify hashed data
 */
export function verifyHashedData(data: string, hashedData: string): boolean {
  const parts = hashedData.split(':');
  if (parts.length !== 2) return false;

  const salt = Buffer.from(parts[0], 'hex');
  const originalHash = parts[1];

  const hash = crypto.pbkdf2Sync(data, salt, ITERATIONS, 64, 'sha512');
  return hash.toString('hex') === originalHash;
}

// PHI-sensitive routes that require enhanced logging
const PHI_ROUTES = [
  '/api/patients',
  '/api/encounters',
  '/api/opd-notes',
  '/api/admissions',
  '/api/prescriptions',
  '/api/lab-orders',
  '/api/lab-results',
  '/api/radiology',
  '/api/emergency',
  '/api/icu',
  '/api/surgeries',
  '/api/blood-bank',
];

/**
 * HIPAA PHI Access Logging Middleware
 * Logs all access to Protected Health Information
 */
export const phiAccessLogger = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const isPHIRoute = PHI_ROUTES.some(route => req.path.startsWith(route));

  if (isPHIRoute && req.user) {
    const startTime = Date.now();

    // Log access attempt
    auditLogger.dataAccess(
      req.user.userId,
      req.path,
      req.method,
      req.params.id
    );

    // Capture response to log outcome
    const originalSend = res.send;
    res.send = function(body) {
      const duration = Date.now() - startTime;

      logger.info('PHI_ACCESS', {
        userId: req.user?.userId,
        username: req.user?.username,
        tenantId: req.user?.tenantId,
        branchId: req.user?.branchId,
        path: req.path,
        method: req.method,
        resourceId: req.params.id,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
      });

      return originalSend.call(this, body);
    };
  }

  next();
};

/**
 * PHI Data Modification Logger
 * Logs all modifications to PHI with before/after state
 */
export const phiModificationLogger = (
  userId: string,
  resource: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  resourceId: string,
  oldData?: Record<string, any>,
  newData?: Record<string, any>
) => {
  // Remove sensitive fields from logging (but log that they were changed)
  const sanitizeForLog = (data: Record<string, any> | undefined) => {
    if (!data) return undefined;

    const sensitiveFields = ['passwordHash', 'biometricTemplate', 'ssn', 'creditCard'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  };

  auditLogger.dataModification(
    userId,
    resource,
    action,
    resourceId,
    {
      before: sanitizeForLog(oldData),
      after: sanitizeForLog(newData),
    }
  );
};

/**
 * Session timeout checker for HIPAA compliance
 * Auto-logout after inactivity period
 */
interface SessionData {
  lastActivity: number;
  userId: string;
}

const activeSessions = new Map<string, SessionData>();

export const sessionTimeoutChecker = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next();
  }

  const sessionKey = `${req.user.userId}:${req.headers.authorization}`;
  const now = Date.now();
  const timeoutMs = (config.session?.timeoutMinutes || 30) * 60 * 1000;

  const session = activeSessions.get(sessionKey);

  if (session) {
    if (now - session.lastActivity > timeoutMs) {
      // Session expired due to inactivity
      activeSessions.delete(sessionKey);

      auditLogger.securityEvent('SESSION_TIMEOUT', {
        userId: req.user.userId,
        lastActivity: new Date(session.lastActivity).toISOString(),
        timeoutMinutes: config.session?.timeoutMinutes || 30,
      });

      return res.status(401).json({
        error: 'SESSION_TIMEOUT',
        message: 'Your session has expired due to inactivity. Please log in again.',
      });
    }
  }

  // Update last activity
  activeSessions.set(sessionKey, {
    lastActivity: now,
    userId: req.user.userId,
  });

  next();
};

/**
 * Clean up expired sessions periodically
 */
export const cleanupExpiredSessions = () => {
  const timeoutMs = (config.session?.timeoutMinutes || 30) * 60 * 1000;
  const now = Date.now();

  for (const [key, session] of activeSessions.entries()) {
    if (now - session.lastActivity > timeoutMs) {
      activeSessions.delete(key);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

/**
 * Invalidate all sessions for a user (for logout, password change, etc.)
 */
export const invalidateUserSessions = (userId: string) => {
  for (const [key, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      activeSessions.delete(key);
    }
  }
};

/**
 * Emergency access override logging
 * For break-the-glass scenarios in emergencies
 */
export const logEmergencyAccess = (
  userId: string,
  patientId: string,
  reason: string,
  ip: string
) => {
  logger.warn('EMERGENCY_ACCESS', {
    event: 'BREAK_THE_GLASS',
    userId,
    patientId,
    reason,
    ip,
    timestamp: new Date().toISOString(),
    requiresReview: true,
  });
};

/**
 * Data masking for PHI in responses
 * Masks sensitive data based on user permissions
 */
export const maskPHI = (data: any, fieldsToMask: string[]): any => {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map(item => maskPHI(item, fieldsToMask));
  }

  if (typeof data === 'object') {
    const masked = { ...data };
    for (const field of fieldsToMask) {
      if (field in masked && masked[field]) {
        if (typeof masked[field] === 'string') {
          // Mask all but last 4 characters
          const value = masked[field];
          if (value.length > 4) {
            masked[field] = '*'.repeat(value.length - 4) + value.slice(-4);
          } else {
            masked[field] = '****';
          }
        }
      }
    }
    return masked;
  }

  return data;
};

/**
 * Middleware to add HIPAA-required headers
 */
export const hipaaHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent caching of PHI
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Prevent content sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Strict transport security (HTTPS only)
  if (config.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
};

/**
 * Consent verification middleware
 * Ensures proper consent before accessing PHI
 */
export const verifyConsent = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // In a full implementation, this would check:
  // 1. Patient has signed consent forms
  // 2. Healthcare provider has valid relationship with patient
  // 3. Access is within scope of treatment
  // For now, we log the access and continue

  if (req.params.patientId || req.body?.patientId) {
    const patientId = req.params.patientId || req.body?.patientId;

    logger.info('CONSENT_CHECK', {
      userId: req.user?.userId,
      patientId,
      action: req.method,
      path: req.path,
      timestamp: new Date().toISOString(),
    });
  }

  next();
};
