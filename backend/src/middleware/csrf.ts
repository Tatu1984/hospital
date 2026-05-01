import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { logger, auditLogger } from '../utils/logger';

// CSRF token store (in production, use Redis or database)
const csrfTokenStore = new Map<string, { token: string; createdAt: number }>();

const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'csrf-token';

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store CSRF token for a session
 */
export function storeCSRFToken(sessionId: string): string {
  const token = generateCSRFToken();
  csrfTokenStore.set(sessionId, {
    token,
    createdAt: Date.now(),
  });
  return token;
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(sessionId: string, token: string): boolean {
  const stored = csrfTokenStore.get(sessionId);

  if (!stored) {
    return false;
  }

  // Check expiry
  if (Date.now() - stored.createdAt > CSRF_TOKEN_EXPIRY) {
    csrfTokenStore.delete(sessionId);
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(stored.token),
      Buffer.from(token)
    );
  } catch {
    return false;
  }
}

/**
 * Middleware to set CSRF token
 */
export const setCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  // Get or create session ID (from JWT sessionId or cookie)
  const sessionId = (req as any).user?.sessionId || req.cookies?.sessionId || crypto.randomUUID();

  // Generate and store new CSRF token
  const csrfToken = storeCSRFToken(sessionId);

  // Set token in cookie (httpOnly: false so JS can read it)
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false, // JS needs to read this
    secure: config.isProduction,
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_EXPIRY,
  });

  // Also set in response header for initial requests
  res.setHeader(CSRF_HEADER_NAME, csrfToken);

  next();
};

/**
 * Middleware to verify CSRF token on state-changing requests
 */
export const verifyCSRF = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF check for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip CSRF for API token authentication (machine-to-machine)
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ') && req.headers['x-api-client']) {
    return next();
  }

  // Get session ID
  const sessionId = (req as any).user?.sessionId || req.cookies?.sessionId;

  if (!sessionId) {
    auditLogger.securityEvent('CSRF_NO_SESSION', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    return res.status(403).json({
      error: 'CSRF_ERROR',
      message: 'Invalid session. Please refresh the page and try again.',
    });
  }

  // Get CSRF token from header or body
  const csrfToken = req.headers[CSRF_HEADER_NAME] as string ||
    req.body?._csrf ||
    req.query?._csrf;

  if (!csrfToken) {
    auditLogger.securityEvent('CSRF_MISSING_TOKEN', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      sessionId,
    });

    return res.status(403).json({
      error: 'CSRF_ERROR',
      message: 'CSRF token missing. Please refresh the page and try again.',
    });
  }

  if (!verifyCSRFToken(sessionId, csrfToken)) {
    auditLogger.securityEvent('CSRF_INVALID_TOKEN', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      sessionId,
    });

    return res.status(403).json({
      error: 'CSRF_ERROR',
      message: 'CSRF token invalid or expired. Please refresh the page and try again.',
    });
  }

  next();
};

/**
 * Cleanup expired CSRF tokens
 */
export function cleanupExpiredCSRFTokens(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [sessionId, data] of csrfTokenStore.entries()) {
    if (now - data.createdAt > CSRF_TOKEN_EXPIRY) {
      csrfTokenStore.delete(sessionId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug('CSRF token cleanup', { cleanedTokens: cleaned });
  }
}

// Run cleanup every 15 minutes
setInterval(cleanupExpiredCSRFTokens, 15 * 60 * 1000);

/**
 * Double Submit Cookie Pattern
 * Alternative CSRF protection that doesn't require server-side token storage
 */
export const doubleSubmitCookie = {
  /**
   * Set the CSRF cookie
   */
  setCookie: (req: Request, res: Response, next: NextFunction) => {
    // Check if cookie already exists
    if (req.cookies?.[CSRF_COOKIE_NAME]) {
      return next();
    }

    const token = generateCSRFToken();

    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: config.isProduction,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    next();
  },

  /**
   * Verify the CSRF token matches cookie
   */
  verify: (req: Request, res: Response, next: NextFunction) => {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
      return next();
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME] as string;

    if (!cookieToken || !headerToken) {
      return res.status(403).json({
        error: 'CSRF_ERROR',
        message: 'CSRF validation failed. Please refresh and try again.',
      });
    }

    try {
      if (!crypto.timingSafeEqual(
        Buffer.from(cookieToken),
        Buffer.from(headerToken)
      )) {
        auditLogger.securityEvent('CSRF_MISMATCH', {
          ip: req.ip,
          path: req.path,
        });

        return res.status(403).json({
          error: 'CSRF_ERROR',
          message: 'CSRF validation failed. Please refresh and try again.',
        });
      }
    } catch {
      return res.status(403).json({
        error: 'CSRF_ERROR',
        message: 'CSRF validation failed. Please refresh and try again.',
      });
    }

    next();
  },
};

/**
 * SameSite Cookie configuration for CSRF mitigation
 */
export const sameSiteCookieConfig = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000,
};
