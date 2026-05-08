import type { PrismaClient } from '@prisma/client';
import type { Request } from 'express';
import { logger } from './logger';

interface AuthedReq extends Request {
  user?: { userId?: string; username?: string; tenantId?: string };
}

// Resolve the *real* client IP for an incoming request. Tries (in order):
//   1. req.ip — Express respects X-Forwarded-For when `trust proxy` is set
//      (which we do in server.ts). On Vercel + most reverse proxies this
//      gives the originating client.
//   2. The leftmost entry of x-forwarded-for explicitly — defensive fallback
//      in case the trust-proxy setting hasn't propagated.
//   3. cf-connecting-ip / x-real-ip — set by Cloudflare and nginx variants.
//   4. req.socket.remoteAddress — last resort, the immediate peer.
//
// IPv6-mapped IPv4 addresses (::ffff:1.2.3.4) get unwrapped to their plain
// dotted form so the audit log shows what the user expects.
export function clientIp(req: Request | undefined): string | null {
  if (!req) return null;
  const fwd = req.headers?.['x-forwarded-for'];
  const realIp = req.headers?.['x-real-ip'];
  const cfIp = req.headers?.['cf-connecting-ip'];

  let candidate: string | null = null;
  if (req.ip) candidate = req.ip;
  else if (typeof fwd === 'string') candidate = fwd.split(',')[0].trim();
  else if (Array.isArray(fwd) && fwd.length) candidate = String(fwd[0]).split(',')[0].trim();
  else if (typeof cfIp === 'string') candidate = cfIp;
  else if (typeof realIp === 'string') candidate = realIp;
  else candidate = (req as any).socket?.remoteAddress ?? null;

  if (!candidate) return null;
  // Unwrap IPv6-mapped IPv4 (e.g. ::ffff:203.0.113.5)
  return candidate.replace(/^::ffff:/, '');
}

interface WriteAuditParams {
  prisma: PrismaClient;
  req?: AuthedReq;
  userId?: string | null;
  /**
   * Tenant the audit row belongs to. Falls back to `req.user.tenantId` if
   * omitted. Required because AuditLog.tenantId is NOT NULL — events that
   * predate a session (e.g. failed login) MUST resolve a tenant some other
   * way (look up the user by username first, or skip the DB write).
   */
  tenantId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Persist an audit log entry. Fire-and-forget — logs to Winston instead of
 * throwing if the DB write fails, so a transient DB hiccup never breaks the
 * caller's flow. Use for security events (LOGIN_SUCCESS, LOGIN_FAILED) and
 * mutations (patient.create, asset.update, asset.delete, etc.).
 */
export async function writeAudit({
  prisma,
  req,
  userId,
  tenantId,
  action,
  resource,
  resourceId,
  oldValue,
  newValue,
}: WriteAuditParams): Promise<void> {
  const resolvedTenantId = tenantId ?? req?.user?.tenantId ?? null;
  if (!resolvedTenantId) {
    // No tenant context (e.g. login attempt for unknown user). Don't write
    // to the DB — Winston still has the event via the caller's logger.
    logger.warn('writeAudit skipped: no tenantId available', { action, resource });
    return;
  }
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: resolvedTenantId,
        userId: userId ?? req?.user?.userId ?? null,
        performedBy: req?.user?.userId ?? null,
        action,
        resource,
        resourceId: resourceId ?? null,
        oldValue: oldValue === undefined ? undefined : (oldValue as any),
        newValue: newValue === undefined ? undefined : (newValue as any),
        ipAddress: clientIp(req),
        userAgent: (req?.headers?.['user-agent'] as string) ?? null,
      },
    });
  } catch (e: any) {
    // Don't crash request flow if audit write fails. Winston still has it.
    logger.warn('writeAudit failed', { action, resource, error: e?.message });
  }
}
