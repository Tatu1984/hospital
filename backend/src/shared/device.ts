// Device fingerprinting for login security. Ported from the HRMS stack.
//
// The fingerprint is a stable-ish hash of the user-agent plus any client hints
// the frontend forwards (timezone, screen size, language, platform). It is NOT
// cryptographically unique — its value is that a *change* in fingerprint for a
// given user is a useful signal (new device / new browser), which the anomaly
// engine reads.

import { createHash } from 'crypto';

export interface DeviceInfo {
  browserName?: string;
  osName?: string;
  deviceType?: string; // "mobile" | "tablet" | "desktop"
  fingerprint: string;
}

/** Client-supplied hints, forwarded by the frontend on login. */
export interface ClientHints {
  timezone?: string;
  screen?: string;
  language?: string;
  platform?: string;
}

function detectBrowser(ua: string): string | undefined {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/chrome\//i.test(ua)) return 'Chrome';
  if (/firefox\//i.test(ua)) return 'Firefox';
  if (/safari\//i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  return undefined;
}

function detectOs(ua: string): string | undefined {
  if (/windows nt/i.test(ua)) return 'Windows';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/mac os x/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  return undefined;
}

function detectDeviceType(ua: string): string {
  if (/ipad|tablet/i.test(ua)) return 'tablet';
  if (/mobile|iphone|android.*mobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

/**
 * Parse a user-agent (plus optional client hints) into a device summary and a
 * fingerprint hash.
 */
export function parseDevice(
  userAgent: string | null | undefined,
  hints?: ClientHints,
): DeviceInfo {
  const ua = userAgent || '';
  const fingerprintSource = [
    ua,
    hints?.platform ?? '',
    hints?.timezone ?? '',
    hints?.screen ?? '',
    hints?.language ?? '',
  ].join('|');

  return {
    browserName: detectBrowser(ua),
    osName: detectOs(ua),
    deviceType: detectDeviceType(ua),
    fingerprint: createHash('sha256').update(fingerprintSource).digest('hex').slice(0, 32),
  };
}
