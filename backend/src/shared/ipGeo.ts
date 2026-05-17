// IP geolocation helper for the activity monitor.
//
// Two design constraints:
//   1. Most internal traffic on a hospital LAN is RFC1918 or loopback —
//      no point making an external API call to learn a 10.x.x.x is
//      "private". Those short-circuit before any network access.
//   2. External lookups must NEVER block a request path. The activity
//      monitor calls this for batches of IPs; if the upstream API is
//      slow or rate-limited, we degrade to "unknown" rather than
//      stalling the dashboard. Results are cached aggressively (24h)
//      since an IP's country doesn't change minute-to-minute.
//
// Provider: ip-api.com — free tier (45 req/min, no key required). If
// you outgrow it, swap for MaxMind GeoLite2 (offline mmdb file, no rate
// limits) by replacing the `fetchPublicGeo` body.

export interface IpGeoResult {
  ip: string;
  // 'private' | 'loopback' | 'unknown' | 'resolved'
  kind: 'private' | 'loopback' | 'unknown' | 'resolved';
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  isp?: string;
  asOrg?: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { result: IpGeoResult; expiresAt: number }>();
// Rolling rate-limit window so we don't get banned by ip-api.com.
// 45/min free tier; we self-impose 40 to leave headroom.
const rateLimit = { window: 60_000, max: 40, hits: [] as number[] };

export function isPrivateIp(ip: string): boolean {
  if (!ip) return false;
  // IPv6 link-local + ULA
  if (ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) return true;
  // IPv4 RFC1918 + CGNAT (100.64.0.0/10)
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip)) return true;
  return false;
}

export function isLoopbackIp(ip: string): boolean {
  if (!ip) return false;
  return ip === '::1' || ip === '127.0.0.1' || ip.startsWith('127.');
}

// Strip IPv4-mapped IPv6 prefix (::ffff:1.2.3.4 → 1.2.3.4) so cache
// keys are stable and the upstream API understands the address.
function normalizeIp(ip: string): string {
  if (!ip) return '';
  const m = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return m ? m[1] : ip;
}

async function fetchPublicGeo(ip: string): Promise<IpGeoResult> {
  // Rolling-window rate limiter. Drop any hits older than the window,
  // refuse if we'd exceed max.
  const now = Date.now();
  rateLimit.hits = rateLimit.hits.filter((t) => t > now - rateLimit.window);
  if (rateLimit.hits.length >= rateLimit.max) {
    return { ip, kind: 'unknown' };
  }
  rateLimit.hits.push(now);

  try {
    const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city,isp,as,query`;
    // 3-second budget — anything slower than that and we'd rather show
    // "unknown" than block the activity monitor render.
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return { ip, kind: 'unknown' };
    const j: any = await r.json();
    if (j?.status !== 'success') return { ip, kind: 'unknown' };
    return {
      ip,
      kind: 'resolved',
      country: j.country,
      countryCode: j.countryCode,
      region: j.regionName,
      city: j.city,
      isp: j.isp,
      asOrg: j.as,
    };
  } catch {
    return { ip, kind: 'unknown' };
  }
}

export async function lookupIp(rawIp: string | null | undefined): Promise<IpGeoResult> {
  const ip = normalizeIp(rawIp || '');
  if (!ip) return { ip: '', kind: 'unknown' };
  if (isLoopbackIp(ip)) return { ip, kind: 'loopback' };
  if (isPrivateIp(ip)) return { ip, kind: 'private' };

  const cached = cache.get(ip);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const result = await fetchPublicGeo(ip);
  cache.set(ip, { result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

// Batch helper — looks up many IPs concurrently with de-dup on
// identical IPs, so a list of 50 audit entries from 5 IPs only fires
// 5 upstream calls. Caller can map back to its original ordering.
export async function lookupIps(ips: Array<string | null | undefined>): Promise<Map<string, IpGeoResult>> {
  const unique = Array.from(new Set(ips.filter(Boolean).map((i) => normalizeIp(i as string))));
  const out = new Map<string, IpGeoResult>();
  await Promise.all(unique.map(async (ip) => {
    out.set(ip, await lookupIp(ip));
  }));
  return out;
}
