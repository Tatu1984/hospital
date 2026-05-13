// SSRF guard for outbound fetches that take a host from user-supplied
// or admin-supplied config (Integration.baseUrl, webhook URLs, etc.).
//
// The risk pattern: a malicious admin sets baseUrl to http://169.254.169.254
// (cloud metadata service) or http://localhost:6379 (Redis) and triggers
// the integration test; the server makes an authenticated outbound HTTP
// call from inside our network and returns the response body to the
// attacker. With cloud metadata that's an IAM token; with Redis that's
// arbitrary command execution. Both are pre-auth from the cloud
// provider's perspective because the call originates from a trusted IP.
//
// What this enforces:
//   - http(s) only — block file:, gopher:, dict:, etc.
//   - block requests with userinfo (admins shouldn't embed creds in URL)
//   - resolve hostname via dns.lookup and reject:
//       * loopback                       (127.0.0.0/8, ::1)
//       * private RFC1918                (10/8, 172.16/12, 192.168/16)
//       * link-local                     (169.254/16, fe80::/10)
//       * CGNAT                          (100.64/10)
//       * IPv6 unique-local              (fc00::/7)
//       * IPv4-mapped IPv6 forms thereof
//   - reject if the host has multiple A records and ANY of them is private
//     (DNS rebinding pinning at lookup time).
//
// What this does NOT do:
//   - it does not re-validate after redirects. Callers should either
//     pass redirect: 'manual' (fetch) or, if redirects are expected,
//     re-check each Location header.

import dns from 'node:dns/promises';
import net from 'node:net';

export class UnsafeOutboundUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeOutboundUrlError';
  }
}

const PRIVATE_V4_RANGES: Array<[string, number]> = [
  ['10.0.0.0', 8],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['100.64.0.0', 10],
  ['0.0.0.0', 8],
];

function v4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let acc = 0;
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    acc = (acc * 256) + n;
  }
  return acc >>> 0;
}

function inV4Range(ip: string, base: string, prefix: number): boolean {
  const ipN = v4ToInt(ip);
  const baseN = v4ToInt(base);
  if (ipN == null || baseN == null) return false;
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipN & mask) === (baseN & mask);
}

function isPrivateV4(ip: string): boolean {
  return PRIVATE_V4_RANGES.some(([base, prefix]) => inV4Range(ip, base, prefix));
}

// Expand an IPv6 string to a 16-byte buffer, or null if unparseable.
// Handles "::" compression and both forms of IPv4-mapped addresses
// (::ffff:127.0.0.1 and ::ffff:7f00:1).
function v6ToBytes(ip: string): Buffer | null {
  // Split off an embedded IPv4 tail, if any.
  let v4Tail: Buffer | null = null;
  const lastColon = ip.lastIndexOf(':');
  const tail = lastColon >= 0 ? ip.slice(lastColon + 1) : ip;
  let head = ip;
  if (tail.includes('.')) {
    const v4 = v4ToInt(tail);
    if (v4 == null) return null;
    v4Tail = Buffer.alloc(4);
    v4Tail.writeUInt32BE(v4, 0);
    head = ip.slice(0, lastColon);
  }

  const doubleIdx = head.indexOf('::');
  let groups: string[];
  if (doubleIdx === -1) {
    groups = head ? head.split(':') : [];
  } else {
    const left = head.slice(0, doubleIdx).split(':').filter((s) => s.length > 0);
    const right = head.slice(doubleIdx + 2).split(':').filter((s) => s.length > 0);
    const total = v4Tail ? 6 : 8;
    const fill = total - left.length - right.length;
    if (fill < 0) return null;
    groups = [...left, ...new Array(fill).fill('0'), ...right];
  }
  const expectedGroups = v4Tail ? 6 : 8;
  if (groups.length !== expectedGroups) return null;

  const out = Buffer.alloc(16);
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    const n = parseInt(g, 16);
    out.writeUInt16BE(n, i * 2);
  }
  if (v4Tail) v4Tail.copy(out, 12);
  return out;
}

function isPrivateV6(ip: string): boolean {
  const bytes = v6ToBytes(ip);
  if (!bytes) return true; // unparseable — fail closed
  // ::1 (loopback) and :: (unspecified)
  if (bytes.subarray(0, 15).every((b) => b === 0)) return bytes[15] === 0 || bytes[15] === 1;
  // Link-local fe80::/10 — first 10 bits = 1111 1110 10
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true;
  // Unique local fc00::/7 — first 7 bits = 1111 110
  if ((bytes[0] & 0xfe) === 0xfc) return true;
  // IPv4-mapped ::ffff:0:0/96 — first 80 bits zero, next 16 bits = 0xffff
  const isMapped =
    bytes.subarray(0, 10).every((b) => b === 0) &&
    bytes[10] === 0xff && bytes[11] === 0xff;
  if (isMapped) {
    const v4 = `${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`;
    return isPrivateV4(v4);
  }
  return false;
}

function isPrivateAddress(ip: string, family: number): boolean {
  if (family === 4) return isPrivateV4(ip);
  if (family === 6) return isPrivateV6(ip);
  return true; // unknown family — refuse rather than allow
}

/**
 * Throws UnsafeOutboundUrlError if `urlStr` is not a safe outbound HTTP(S)
 * URL. Returns the parsed URL on success so callers can fetch(parsed.href).
 *
 * Resolves the hostname via DNS once. Callers that care about TOCTOU
 * between this check and the fetch should pass the resolved IP and a
 * Host header instead, but for the integration-test use case the
 * window is short and an attacker would need control of authoritative
 * DNS for the configured host.
 */
export async function assertSafeOutboundUrl(urlStr: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new UnsafeOutboundUrlError('URL is not parseable');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new UnsafeOutboundUrlError(`scheme ${parsed.protocol} is not allowed`);
  }
  if (parsed.username || parsed.password) {
    throw new UnsafeOutboundUrlError('userinfo in URL is not allowed');
  }

  // Node's URL parser preserves the surrounding brackets on IPv6
  // hostnames (e.g. "[fc00::1]"), which net.isIP refuses. Strip them
  // so the IP-literal short-circuit below recognizes IPv6 forms.
  const rawHost = parsed.hostname;
  if (!rawHost) throw new UnsafeOutboundUrlError('URL has no host');
  const host = rawHost.startsWith('[') && rawHost.endsWith(']')
    ? rawHost.slice(1, -1)
    : rawHost;

  // If host is already a literal IP, check it directly and skip DNS.
  const family = net.isIP(host);
  if (family) {
    if (isPrivateAddress(host, family)) {
      throw new UnsafeOutboundUrlError(`host ${host} resolves to a private/loopback range`);
    }
    return parsed;
  }

  // Resolve all addresses and reject if ANY is private.
  let addrs: Array<{ address: string; family: number }>;
  try {
    addrs = await dns.lookup(host, { all: true });
  } catch (e: any) {
    throw new UnsafeOutboundUrlError(`DNS lookup failed for ${host}: ${e?.code || e?.message || 'unknown'}`);
  }
  if (addrs.length === 0) {
    throw new UnsafeOutboundUrlError(`DNS lookup returned no addresses for ${host}`);
  }
  for (const a of addrs) {
    if (isPrivateAddress(a.address, a.family)) {
      throw new UnsafeOutboundUrlError(`host ${host} resolves to private/loopback address ${a.address}`);
    }
  }

  return parsed;
}
