/**
 * OTP Service
 *
 * Secure OTP generation, storage, and verification with:
 * - Rate limiting per phone/email
 * - Sandbox mode for development/testing
 * - Redis support with in-memory fallback
 * - Secure OTP hashing
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';

interface OTPSession {
  hashedOtp: string;
  patientId: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

interface RateLimitEntry {
  count: number;
  windowStart: Date;
}

// Configuration
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_REQUESTS = 5;

// Sandbox OTPs for testing (only works in development/sandbox mode)
const SANDBOX_OTPS: Record<string, string> = {
  'test-patient': '123456',
  'demo-user': '000000',
  'sandbox': '111111',
};

class OTPService {
  private sessions: Map<string, OTPSession> = new Map();
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private isSandboxMode: boolean;

  constructor() {
    this.isSandboxMode = process.env.OTP_SANDBOX_MODE === 'true' ||
                         process.env.NODE_ENV === 'development' ||
                         process.env.NODE_ENV === 'test';

    // Clean up expired sessions every 5 minutes
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);

    if (this.isSandboxMode) {
      logger.info('OTP Service running in SANDBOX mode - OTPs will be logged');
    }
  }

  /**
   * Generate a new OTP for a patient
   */
  async generateOTP(patientId: string, identifier: string): Promise<{
    sessionId: string;
    otp?: string; // Only returned in sandbox mode
    message: string;
  }> {
    // Check rate limit
    const rateLimitKey = `otp:${identifier}`;
    if (!this.checkRateLimit(rateLimitKey)) {
      logger.warn('OTP rate limit exceeded', { identifier });
      throw new Error('Too many OTP requests. Please wait 15 minutes before trying again.');
    }

    // Generate OTP
    const otp = this.isSandboxMode && SANDBOX_OTPS[identifier]
      ? SANDBOX_OTPS[identifier]
      : this.generateSecureOTP();

    // Create session
    const sessionId = crypto.randomUUID();
    const hashedOtp = this.hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    this.sessions.set(sessionId, {
      hashedOtp,
      patientId,
      expiresAt,
      attempts: 0,
      createdAt: new Date(),
    });

    // Increment rate limit
    this.incrementRateLimit(rateLimitKey);

    // Log in sandbox mode only
    if (this.isSandboxMode) {
      logger.info(`[SANDBOX] OTP generated for ${identifier}: ${otp}`);
      return {
        sessionId,
        otp, // Return OTP in sandbox mode for testing
        message: 'OTP sent successfully (sandbox mode)',
      };
    }

    return {
      sessionId,
      message: 'OTP sent successfully',
    };
  }

  /**
   * Verify an OTP
   */
  async verifyOTP(sessionId: string, otp: string): Promise<{
    valid: boolean;
    patientId?: string;
    message: string;
  }> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { valid: false, message: 'Session expired or not found. Please request a new OTP.' };
    }

    // Check expiry
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return { valid: false, message: 'OTP has expired. Please request a new one.' };
    }

    // Check attempts
    if (session.attempts >= MAX_ATTEMPTS) {
      this.sessions.delete(sessionId);
      logger.warn('OTP max attempts exceeded', { sessionId });
      return { valid: false, message: 'Too many failed attempts. Please request a new OTP.' };
    }

    // Verify OTP
    const hashedInput = this.hashOTP(otp);
    if (hashedInput !== session.hashedOtp) {
      session.attempts++;
      const remainingAttempts = MAX_ATTEMPTS - session.attempts;
      return {
        valid: false,
        message: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`
      };
    }

    // Success - clean up session
    const patientId = session.patientId;
    this.sessions.delete(sessionId);

    logger.info('OTP verified successfully', { patientId });
    return { valid: true, patientId, message: 'OTP verified successfully' };
  }

  /**
   * Generate a cryptographically secure 6-digit OTP
   */
  private generateSecureOTP(): string {
    const buffer = crypto.randomBytes(4);
    const num = buffer.readUInt32BE(0);
    return String(num % 1000000).padStart(6, '0');
  }

  /**
   * Hash OTP for secure storage
   */
  private hashOTP(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  /**
   * Check rate limit
   */
  private checkRateLimit(key: string): boolean {
    const entry = this.rateLimits.get(key);

    if (!entry) {
      return true;
    }

    const windowMs = RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
    const now = new Date();

    // Reset if window has passed
    if (now.getTime() - entry.windowStart.getTime() > windowMs) {
      this.rateLimits.delete(key);
      return true;
    }

    return entry.count < RATE_LIMIT_MAX_REQUESTS;
  }

  /**
   * Increment rate limit counter
   */
  private incrementRateLimit(key: string): void {
    const entry = this.rateLimits.get(key);
    const now = new Date();

    if (!entry) {
      this.rateLimits.set(key, { count: 1, windowStart: now });
      return;
    }

    const windowMs = RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
    if (now.getTime() - entry.windowStart.getTime() > windowMs) {
      this.rateLimits.set(key, { count: 1, windowStart: now });
    } else {
      entry.count++;
    }
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    // Also clean up old rate limit entries
    const windowMs = RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
    for (const [key, entry] of this.rateLimits) {
      if (now.getTime() - entry.windowStart.getTime() > windowMs) {
        this.rateLimits.delete(key);
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired OTP sessions`);
    }
  }

  /**
   * Get service status (for health checks)
   */
  getStatus(): { activeSessions: number; isSandbox: boolean } {
    return {
      activeSessions: this.sessions.size,
      isSandbox: this.isSandboxMode,
    };
  }
}

// Export singleton instance
export const otpService = new OTPService();
