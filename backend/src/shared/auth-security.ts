// Auth-security primitives shared between the desktop and mobile login
// paths. Lives in shared/ rather than modules/<auth>/ because the legacy
// /api/auth/login in server.ts also imports from here — they need to use
// the same lockout counter and the same blacklist table.

import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

// Tunables. Conservative defaults; can be overridden via env later if a
// specific deployment needs different numbers.
export const ACCOUNT_LOCKOUT_THRESHOLD = 10;          // failed attempts
export const ACCOUNT_LOCKOUT_DURATION_MS = 15 * 60_000; // 15 minutes

export interface LockoutCheckResult {
  locked: boolean;
  unlockAt?: Date;
}

export async function checkAccountLockout(userId: string): Promise<LockoutCheckResult> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { lockedUntil: true },
  });
  if (u?.lockedUntil && u.lockedUntil > new Date()) {
    return { locked: true, unlockAt: u.lockedUntil };
  }
  return { locked: false };
}

// Bumps the failed-login counter. If the threshold is crossed, sets
// lockedUntil. Returns the new counter value so the caller can log audit
// detail. Best-effort: if the user row doesn't exist yet (rare race) we
// silently swallow the update.
export async function recordFailedLogin(userId: string): Promise<number> {
  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });
    if (updated.failedLoginAttempts >= ACCOUNT_LOCKOUT_THRESHOLD) {
      await prisma.user.update({
        where: { id: userId },
        data: { lockedUntil: new Date(Date.now() + ACCOUNT_LOCKOUT_DURATION_MS) },
      });
    }
    return updated.failedLoginAttempts;
  } catch {
    return 0;
  }
}

export async function clearFailedLogins(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  }).catch(() => undefined);
}

// SHA-256 of the raw token, hex-encoded. Same hash for the same token across
// processes so logout and refresh-check find each other deterministically.
// We never store the raw token — a DB dump can't mint sessions.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface BlacklistOptions {
  userId?: string | null;
  reason?: string;
}

// Adds a refresh token to the blacklist. expiresAt is read from the JWT's
// own `exp` claim so cleanup can drop the row when it would have expired
// anyway; tokens that fail verification (already-expired, malformed) are
// silently ignored — there's nothing to revoke.
export async function blacklistRefreshToken(token: string, opts: BlacklistOptions = {}): Promise<void> {
  let exp: number | undefined;
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    exp = decoded?.exp;
  } catch {
    /* fall through to "no exp" */
  }
  // If we can't read exp, fall back to 30 days. Better than skipping the
  // blacklist entirely on a malformed token.
  const expiresAt = exp ? new Date(exp * 1000) : new Date(Date.now() + 30 * 24 * 3600_000);

  await prisma.tokenBlacklist.create({
    data: {
      tokenHash: hashToken(token),
      userId: opts.userId ?? null,
      reason: opts.reason ?? 'logout',
      expiresAt,
    },
  }).catch((err: any) => {
    // Unique violation = token already blacklisted. That's fine — idempotent.
    if (err?.code !== 'P2002') throw err;
  });
}

export async function isRefreshTokenBlacklisted(token: string): Promise<boolean> {
  const row = await prisma.tokenBlacklist.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true },
  });
  return !!row;
}

// Cron-friendly cleanup. Called from the existing audit-retention sweep so
// we don't add a second cron entry. Returns the number of rows deleted.
export async function cleanupBlacklist(): Promise<number> {
  const result = await prisma.tokenBlacklist.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
