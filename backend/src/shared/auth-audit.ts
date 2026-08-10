// Login auditing + anomaly detection. Ported from the HRMS stack and adapted to
// this project's multi-tenant schema and stateless-JWT auth (sessions are the
// lightweight LoginSession rows we create at login).
//
// Nothing in here is allowed to throw into the auth flow — auditing must never
// block a login. Every DB touch is wrapped or fire-and-forget.

import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { haversineKm, impliedSpeedKmh, type GeoInfo } from './geo';
import type { DeviceInfo } from './device';

export type AuthEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'SESSION_EXPIRED'
  | 'SESSION_REVOKED';

export type AnomalySeverity = 'low' | 'medium' | 'high';

export interface Anomaly {
  code: string;
  severity: AnomalySeverity;
  detail: string;
}

/** Speed (km/h) above which travel between two logins is physically implausible. */
const IMPOSSIBLE_TRAVEL_KMH = 900; // ~ commercial jet cruising speed

const SEVERITY_WEIGHT: Record<AnomalySeverity, number> = {
  low: 15,
  medium: 35,
  high: 60,
};

export interface AuthEventInput {
  tenantId: string;
  eventType: AuthEventType;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  sessionId?: string | null;
  usernameTried?: string | null;
  failureReason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  geo?: GeoInfo;
  device?: DeviceInfo;
  clientTimezone?: string | null;
  gps?: { latitude?: number | null; longitude?: number | null; accuracyM?: number | null };
  anomalies?: Anomaly[];
  riskScore?: number;
}

/** Persist a single auth event row. Never throws into the caller's flow. */
export async function recordAuthEvent(input: AuthEventInput): Promise<void> {
  try {
    await prisma.authEvent.create({
      data: {
        tenantId: input.tenantId,
        eventType: input.eventType,
        userId: input.userId ?? null,
        userName: input.userName ?? null,
        userRole: input.userRole ?? null,
        sessionId: input.sessionId ?? null,
        usernameTried: input.usernameTried ?? null,
        failureReason: input.failureReason ?? null,
        ipAddress: input.ipAddress ?? null,
        city: input.geo?.city,
        district: input.geo?.district,
        region: input.geo?.region,
        postal: input.geo?.postal,
        country: input.geo?.country,
        latitude: input.geo?.latitude,
        longitude: input.geo?.longitude,
        geoSource: input.geo?.source,
        isp: input.geo?.isp,
        asn: input.geo?.asn,
        org: input.geo?.org,
        isVpnOrProxy: input.geo?.isVpnOrProxy,
        ipTimezone: input.geo?.ipTimezone,
        userAgent: input.userAgent ?? null,
        browserName: input.device?.browserName,
        osName: input.device?.osName,
        deviceType: input.device?.deviceType,
        deviceFingerprint: input.device?.fingerprint,
        clientTimezone: input.clientTimezone ?? null,
        gpsLatitude: input.gps?.latitude ?? null,
        gpsLongitude: input.gps?.longitude ?? null,
        gpsAccuracyM: input.gps?.accuracyM ?? null,
        riskScore: input.riskScore,
        anomalies:
          input.anomalies && input.anomalies.length
            ? (input.anomalies as unknown as Prisma.InputJsonValue)
            : undefined,
      },
    });
  } catch (err) {
    // Auditing must never block authentication; just log and move on.
    console.error('recordAuthEvent failed:', err);
  }
}

/** Create the lightweight session row that anchors concurrent-session detection. */
export async function createLoginSession(args: {
  tenantId: string;
  sessionId: string;
  userId: string;
  userName?: string | null;
  userRole?: string | null;
  expiresAt: Date;
  ipAddress?: string | null;
  geo?: GeoInfo;
  device?: DeviceInfo;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await prisma.loginSession.create({
      data: {
        tenantId: args.tenantId,
        sessionId: args.sessionId,
        userId: args.userId,
        userName: args.userName ?? null,
        userRole: args.userRole ?? null,
        expiresAt: args.expiresAt,
        ipAddress: args.ipAddress ?? null,
        city: args.geo?.city,
        district: args.geo?.district,
        region: args.geo?.region,
        postal: args.geo?.postal,
        country: args.geo?.country,
        latitude: args.geo?.latitude,
        longitude: args.geo?.longitude,
        isp: args.geo?.isp,
        asn: args.geo?.asn,
        isVpnOrProxy: args.geo?.isVpnOrProxy,
        deviceFingerprint: args.device?.fingerprint,
        userAgent: args.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error('createLoginSession failed:', err);
  }
}

/** Mark a session revoked (logout / rotation). Best-effort. */
export async function revokeLoginSession(sessionId: string, reason: string): Promise<void> {
  if (!sessionId) return;
  try {
    await prisma.loginSession.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  } catch {
    /* table may not exist yet / transient — ignore */
  }
}

export interface AnomalyResult {
  anomalies: Anomaly[];
  riskScore: number;
}

/**
 * Is this (user, IP) pair on the admin-approved allowlist?
 * Approving a flagged login adds its IP here so the same IP never re-flags.
 * Bumps lastSeenAt as a side effect.
 */
export async function isTrustedLogin(userId: string, ipAddress?: string | null): Promise<boolean> {
  if (!ipAddress) return false;
  try {
    const trusted = await prisma.trustedLoginLocation.findUnique({
      where: { userId_ipAddress: { userId, ipAddress } },
      select: { id: true },
    });
    if (!trusted) return false;
    await prisma.trustedLoginLocation
      .update({ where: { id: trusted.id }, data: { lastSeenAt: new Date() } })
      .catch(() => {});
    return true;
  } catch {
    return false;
  }
}

/**
 * Return the set of "userId|ipAddress" keys on the trust allowlist for the given
 * users, so the suspicious-login feed can filter already-trusted events without
 * an N+1 query per row.
 */
export async function trustedKeysFor(userIds: string[]): Promise<Set<string>> {
  const keys = new Set<string>();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return keys;
  try {
    const rows = await prisma.trustedLoginLocation.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, ipAddress: true },
    });
    for (const r of rows) {
      if (r.ipAddress) keys.add(`${r.userId}|${r.ipAddress}`);
    }
  } catch {
    /* table missing — nothing trusted yet */
  }
  return keys;
}

/**
 * Approve a flagged login: allowlist its (user, IP) so it never re-flags.
 * Snapshots the location from the event for later display. Returns the trusted
 * row's id, or null if the event has no IP to key on.
 */
export async function approveLoginEvent(args: {
  event: {
    tenantId: string;
    userId: string | null;
    userName: string | null;
    ipAddress: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
    asn: string | null;
    isp: string | null;
  };
  approvedBy?: string | null;
  approvedByName?: string | null;
  label?: string | null;
}): Promise<string | null> {
  const { event } = args;
  if (!event.userId || !event.ipAddress) return null;

  const snapshot = {
    tenantId: event.tenantId,
    userName: event.userName,
    city: event.city,
    region: event.region,
    country: event.country,
    asn: event.asn,
    isp: event.isp,
    label: args.label ?? null,
    approvedBy: args.approvedBy ?? null,
    approvedByName: args.approvedByName ?? null,
  };

  const row = await prisma.trustedLoginLocation.upsert({
    where: { userId_ipAddress: { userId: event.userId, ipAddress: event.ipAddress } },
    create: { userId: event.userId, ipAddress: event.ipAddress, ...snapshot },
    update: { ...snapshot, lastSeenAt: new Date() },
  });
  return row.id;
}

/**
 * Inspect a user's recent auth history + live sessions to flag behavioral
 * signals that suggest concurrent/dual usage or account compromise:
 *  - concurrent active sessions from a different city/network
 *  - "impossible travel" between consecutive logins
 *  - VPN / proxy / hosting network
 *  - browser timezone not matching the IP's timezone
 *  - a never-before-seen device, country, or city
 */
export async function detectLoginAnomalies(args: {
  tenantId: string;
  userId: string;
  ipAddress?: string | null;
  geo: GeoInfo;
  device: DeviceInfo;
  clientTimezone?: string | null;
  now?: Date;
}): Promise<AnomalyResult> {
  const { tenantId, userId, ipAddress, geo, device, clientTimezone } = args;
  const now = args.now ?? new Date();
  const anomalies: Anomaly[] = [];

  // --- 0. Admin-approved IP: trust it and skip scoring entirely -------------
  if (await isTrustedLogin(userId, ipAddress)) {
    return { anomalies: [], riskScore: 0 };
  }

  // --- 1. Concurrent active sessions from a different place / network --------
  const liveSessions = await prisma.loginSession
    .findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
      orderBy: { lastSeenAt: 'desc' },
      take: 20,
    })
    .catch(() => []);

  for (const s of liveSessions) {
    const differentCity = geo.city && s.city && geo.city !== s.city;
    const differentAsn = geo.asn && s.asn && geo.asn !== s.asn;
    const farApart = haversineKm(geo, s);
    if (differentCity || differentAsn || (farApart != null && farApart > 100)) {
      anomalies.push({
        code: 'CONCURRENT_SESSION_DIFFERENT_LOCATION',
        severity: 'high',
        detail: `Another active session from ${s.city ?? s.ipAddress ?? 'unknown'}${
          s.asn ? ` (${s.asn})` : ''
        } while logging in from ${geo.city ?? 'unknown'}${geo.asn ? ` (${geo.asn})` : ''}.`,
      });
      break;
    }
  }

  // --- 2. Impossible travel vs the last successful login --------------------
  const lastLogin = await prisma.authEvent
    .findFirst({
      where: {
        userId,
        eventType: 'LOGIN_SUCCESS',
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    })
    .catch(() => null);

  if (lastLogin && geo.latitude != null && geo.longitude != null) {
    const distance = haversineKm(geo, lastLogin);
    if (distance != null && distance > 50) {
      const elapsed = now.getTime() - lastLogin.createdAt.getTime();
      const speed = impliedSpeedKmh(distance, elapsed);
      if (speed > IMPOSSIBLE_TRAVEL_KMH) {
        anomalies.push({
          code: 'IMPOSSIBLE_TRAVEL',
          severity: 'high',
          detail: `${Math.round(distance)} km from previous login in ${Math.round(
            elapsed / 60000,
          )} min (~${Math.round(speed)} km/h).`,
        });
      }
    }
  }

  // --- 3. VPN / proxy / hosting network -------------------------------------
  if (geo.isVpnOrProxy) {
    anomalies.push({
      code: 'VPN_OR_PROXY',
      severity: 'medium',
      detail: `Login network flagged as VPN/proxy/hosting${geo.isp ? ` (${geo.isp})` : ''}.`,
    });
  }

  // --- 4. Browser timezone vs IP timezone mismatch --------------------------
  if (clientTimezone && geo.ipTimezone && clientTimezone !== geo.ipTimezone) {
    anomalies.push({
      code: 'TIMEZONE_MISMATCH',
      severity: 'medium',
      detail: `Browser timezone ${clientTimezone} differs from IP timezone ${geo.ipTimezone}.`,
    });
  }

  // --- 5. New device fingerprint --------------------------------------------
  const seenDevice = await prisma.authEvent
    .findFirst({
      where: { userId, deviceFingerprint: device.fingerprint, eventType: 'LOGIN_SUCCESS' },
      select: { id: true },
    })
    .catch(() => null);
  if (!seenDevice) {
    anomalies.push({
      code: 'NEW_DEVICE',
      severity: 'low',
      detail: `First login from this device (${device.browserName ?? 'unknown'} on ${
        device.osName ?? 'unknown'
      }).`,
    });
  }

  // --- 6. New country -------------------------------------------------------
  if (geo.country) {
    const seenCountry = await prisma.authEvent
      .findFirst({
        where: { userId, country: geo.country, eventType: 'LOGIN_SUCCESS' },
        select: { id: true },
      })
      .catch(() => null);
    if (!seenCountry) {
      anomalies.push({
        code: 'NEW_COUNTRY',
        severity: 'medium',
        detail: `First login from ${geo.country}.`,
      });
    }
  }

  // --- 7. Unusual locality: an established user appearing from a new city ----
  if (geo.city) {
    const priorLogins = await prisma.authEvent
      .count({ where: { userId, eventType: 'LOGIN_SUCCESS' } })
      .catch(() => 0);
    if (priorLogins >= 3) {
      const seenCity = await prisma.authEvent
        .findFirst({
          where: { userId, city: geo.city, eventType: 'LOGIN_SUCCESS' },
          select: { id: true },
        })
        .catch(() => null);
      if (!seenCity) {
        anomalies.push({
          code: 'UNUSUAL_LOCALITY',
          severity: 'medium',
          detail: `Login from ${[geo.district, geo.city].filter(Boolean).join(', ')} — not a place this user normally logs in from.`,
        });
      }
    }
  }

  const riskScore = Math.min(
    100,
    anomalies.reduce((sum, a) => sum + SEVERITY_WEIGHT[a.severity], 0),
  );

  return { anomalies, riskScore };
}
