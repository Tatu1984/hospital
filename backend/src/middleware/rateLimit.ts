import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

// In-memory store for rate limiting (use Redis in production for distributed systems)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

// Get client identifier (IP address or user ID if authenticated)
function getClientId(req: Request): string {
  const user = (req as any).user;
  if (user?.userId) {
    return `user:${user.userId}`;
  }
  return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
}

// Standard rate limiter options
export interface RateLimitOptions {
  windowMs?: number;      // Time window in milliseconds
  maxRequests?: number;   // Max requests per window
  message?: string;       // Error message
  skipFailedRequests?: boolean;  // Don't count failed requests
  keyGenerator?: (req: Request) => string;  // Custom key generator
}

// Create rate limiter middleware
export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = config.rateLimit.windowMs,
    maxRequests = config.rateLimit.maxRequests,
    message = 'Too many requests, please try again later.',
    keyGenerator = getClientId,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new entry
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    } else {
      // Increment count
      entry.count++;
    }

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', resetSeconds);
      return res.status(429).json({
        error: 'Too Many Requests',
        message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: resetSeconds,
      });
    }

    next();
  };
}

// Stricter rate limit for auth endpoints (prevent brute force)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,          // 10 attempts per 15 minutes
  message: 'Too many login attempts. Please try again in 15 minutes.',
  keyGenerator: (req) => `auth:${req.ip || 'unknown'}`,
});

// Standard API rate limit
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,      // 1 minute
  maxRequests: 100,         // 100 requests per minute
  message: 'Too many requests. Please slow down.',
});

// Stricter rate limit for write operations
export const writeRateLimit = rateLimit({
  windowMs: 60 * 1000,      // 1 minute
  maxRequests: 30,          // 30 writes per minute
  message: 'Too many write operations. Please slow down.',
});

// Very strict rate limit for sensitive operations (password reset, etc.)
export const sensitiveRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,           // 5 attempts per hour
  message: 'Too many attempts. Please try again later.',
});
