import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { Request, Response, NextFunction } from 'express';
import { logger, auditLogger } from '../utils/logger';

// Safe config access - use defaults if config fails
const getCorsOrigin = () => {
  try {
    const { config } = require('../config');
    return config?.cors?.origin || '*';
  } catch {
    return '*';
  }
};

const getRateLimitConfig = () => {
  try {
    const { config } = require('../config');
    return {
      windowMs: config?.rateLimit?.windowMs || 900000,
      maxRequests: config?.rateLimit?.maxRequests || 100,
    };
  } catch {
    return { windowMs: 900000, maxRequests: 100 };
  }
};

const rateLimitConfig = getRateLimitConfig();

// Helmet security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'", getCorsOrigin()],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// Rate limiting - general
export const generalRateLimiter = rateLimit({
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.maxRequests,
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
  },
  handler: (req, res) => {
    auditLogger.securityEvent('RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent'],
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
    });
  },
});

// Rate limiting - strict for auth routes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many login attempts',
    message: 'Please wait 15 minutes before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
  },
  handler: (req, res) => {
    auditLogger.securityEvent('AUTH_RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: 'Too many login attempts',
      message: 'Please wait 15 minutes before trying again.',
    });
  },
  skipSuccessfulRequests: true,
});

// Compression middleware
export const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
});

// Request sanitization
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  // Remove any null bytes
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      return value.replace(/\0/g, '');
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (value && typeof value === 'object') {
      const sanitized: Record<string, any> = {};
      for (const key of Object.keys(value)) {
        sanitized[key] = sanitizeValue(value[key]);
      }
      return sanitized;
    }
    return value;
  };

  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query) as any;
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }

  next();
};

// Request size limiter
export const requestSizeLimiter = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const maxBytes = parseSize(maxSize);

    if (contentLength > maxBytes) {
      logger.warn('Request too large', { contentLength, maxBytes, path: req.path });
      return res.status(413).json({
        error: 'Request too large',
        message: `Request body must not exceed ${maxSize}`,
      });
    }
    next();
  };
};

function parseSize(size: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)?$/);
  if (!match) return 10 * 1024 * 1024; // default 10mb
  const num = parseInt(match[1], 10);
  const unit = match[2] || 'b';
  return num * units[unit];
}

// Security headers for API responses
export const apiSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

// Request ID middleware for tracing
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string ||
                    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Attach to request for use in handlers
  (req as any).requestId = requestId;

  // Set in response header for client correlation
  res.setHeader('X-Request-ID', requestId);

  // Add to logger context for this request
  (req as any).logContext = { requestId };

  next();
};

// Sanitize error responses - don't expose internal details
export const sanitizeErrorResponse = (error: any): { message: string; code?: string } => {
  // In production, don't expose stack traces or internal error details
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Map common errors to safe messages
    if (error.code === 'P2002') {
      return { message: 'A record with this value already exists', code: 'DUPLICATE_ENTRY' };
    }
    if (error.code === 'P2025') {
      return { message: 'Record not found', code: 'NOT_FOUND' };
    }
    if (error.name === 'JsonWebTokenError') {
      return { message: 'Invalid authentication token', code: 'INVALID_TOKEN' };
    }
    if (error.name === 'TokenExpiredError') {
      return { message: 'Authentication token has expired', code: 'TOKEN_EXPIRED' };
    }
    // Generic error for unknown types
    return { message: 'An error occurred. Please try again.', code: 'INTERNAL_ERROR' };
  }

  // In development, return more details
  return {
    message: error.message || 'An error occurred',
    code: error.code || 'ERROR'
  };
};
