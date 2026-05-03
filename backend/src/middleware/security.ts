import helmet from 'helmet';
import rateLimit, { type Store } from 'express-rate-limit';
import { ipKeyGenerator } from 'express-rate-limit';
import compression from 'compression';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger, auditLogger } from '../utils/logger';

// Optional Redis-backed rate-limit store. Without REDIS_URL the limiters
// fall back to express-rate-limit's in-memory store — fine for dev and
// single-instance deploys, but resets on every Vercel cold start. With a
// REDIS_URL (Upstash works fine) the counters persist across instances.
function buildSharedStore(prefix: string): Store | undefined {
  const url = process.env.REDIS_URL;
  if (!url) return undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RedisStore = require('rate-limit-redis').default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require('ioredis');
    const client = new Redis(url, {
      // Keep pre-connection retries short — we'd rather fall back than hang
      // every request waiting for a flaky Redis.
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    });
    client.on('error', (e: Error) => {
      // eslint-disable-next-line no-console
      console.warn(`[rate-limit] redis error (${prefix}):`, e.message);
    });
    return new RedisStore({
      sendCommand: (...args: any[]) => client.call(...args),
      prefix: `rl:${prefix}:`,
    });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.warn(`[rate-limit] redis store init failed (${prefix}); using in-memory:`, e?.message);
    return undefined;
  }
}

// CSP `connect-src` must be a list of individual origins, not a single
// comma-separated string. CORS_ORIGIN is comma-separated, so split it here
// (and drop any "*" entries — they aren't valid CSP values either).
const cspConnectSources = [
  "'self'",
  ...config.cors.origin
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== '*'),
];

// Helmet security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'"],
      connectSrc: cspConnectSources,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// Rate limiting - general
const generalStore = buildSharedStore('general');
export const generalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  store: generalStore,
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // ipKeyGenerator wants the IP string (handles IPv6 mapping correctly).
    return ipKeyGenerator(req.ip || req.socket?.remoteAddress || '');
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

// Rate limiting - tighter for state-changing methods.
// Skips GET/HEAD/OPTIONS so list pages aren't crippled. The key is per-IP +
// per-path so one user spamming a single endpoint doesn't lock everyone out
// of every other endpoint.
const writeStore = buildSharedStore('write');
export const writeRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: Math.max(20, Math.floor(config.rateLimit.maxRequests / 4)),
  store: writeStore,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
    // Auth endpoints have their own dedicated limiter (authRateLimiter) with
    // skipSuccessfulRequests, so a real login never counts. Letting the
    // generic write limiter also fire on /api/auth/* double-counts every
    // POST and locks legitimate users out after a few attempts.
    if (req.path.startsWith('/api/auth/')) return true;
    return false;
  },
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip || req.socket?.remoteAddress || '')}:${req.method}:${req.baseUrl || req.path}`,
  handler: (req, res) => {
    auditLogger.securityEvent('WRITE_RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      method: req.method,
      path: req.path,
    });
    res.status(429).json({
      error: 'Too many writes',
      message: 'You are sending too many write requests. Please slow down.',
    });
  },
});

// Rate limiting - strict for auth routes
const authStore = buildSharedStore('auth');
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  store: authStore,
  message: {
    error: 'Too many login attempts',
    message: 'Please wait 15 minutes before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // ipKeyGenerator wants the IP string (handles IPv6 mapping correctly).
    return ipKeyGenerator(req.ip || req.socket?.remoteAddress || '');
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
