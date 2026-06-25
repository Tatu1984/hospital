// IP geolocation resolver for login security. Ported from the HRMS stack and
// adapted to Express + this project's existing ip-api helper (./ipGeo).
//
// Sources, in priority order:
//   1. "vercel-ip"  — city / region / country / lat-long / timezone injected for
//                     free by Vercel as `x-vercel-ip-*` request headers (the
//                     backend is deployed on Vercel). No external call, no cost.
//   2. "ipinfo"     — optional enrichment via ipinfo.io for PIN/postal, ISP,
//                     ASN and VPN/proxy detection. Only when IPINFO_TOKEN is set.
//   3. "ip-api"     — the project's pre-existing free lookup (./ipGeo), used as
//                     a baseline when neither of the above yields a city. Gives
//                     city / region / country / ISP without a token.
// Coordinates (from whichever source) are then refined to a named locality via
// BigDataCloud's free reverse-geocode endpoint.
//
// Every external call has a tight timeout and degrades to "unknown" — a slow geo
// lookup must NEVER hold up a login.

import type { Request } from 'express';
import { lookupIp } from './ipGeo';

export interface GeoInfo {
  city?: string;
  /** Locality / neighbourhood within the city, e.g. "Salt Lake, Bidhannagar". */
  district?: string;
  region?: string;
  /** PIN / ZIP / postal code — the most reliable sub-city signal for IP geo. */
  postal?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  asn?: string;
  org?: string;
  /** True if the IP belongs to a hosting/VPN/proxy network (best effort). */
  isVpnOrProxy?: boolean;
  /** Timezone the IP maps to, e.g. "Asia/Kolkata" (when available). */
  ipTimezone?: string;
  source: 'vercel-ip' | 'ipinfo' | 'ip-api' | 'unknown';
}

function decode(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    // Vercel URL-encodes non-ASCII city/region names.
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function toNumber(value: string | null | undefined): number | undefined {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function header(req: Request, name: string): string | undefined {
  const v = req.headers?.[name];
  return Array.isArray(v) ? v[0] : (v as string | undefined);
}

/**
 * Read geolocation from Vercel's edge headers. Present on every request when
 * deployed to Vercel; returns mostly-empty info in local dev.
 */
export function geoFromVercelHeaders(req: Request): GeoInfo {
  return {
    city: decode(header(req, 'x-vercel-ip-city')),
    region: decode(header(req, 'x-vercel-ip-country-region')),
    country: header(req, 'x-vercel-ip-country') || undefined,
    latitude: toNumber(header(req, 'x-vercel-ip-latitude')),
    longitude: toNumber(header(req, 'x-vercel-ip-longitude')),
    ipTimezone: header(req, 'x-vercel-ip-timezone') || undefined,
    source: header(req, 'x-vercel-ip-city') ? 'vercel-ip' : 'unknown',
  };
}

interface IpinfoResponse {
  city?: string;
  region?: string;
  postal?: string;
  country?: string;
  loc?: string; // "lat,long"
  org?: string; // "AS#### Org Name"
  timezone?: string;
  privacy?: { vpn?: boolean; proxy?: boolean; tor?: boolean; hosting?: boolean };
}

/**
 * Enrich an IP with ISP / ASN / PIN / VPN-proxy data via ipinfo.io.
 * No-op (returns null) unless IPINFO_TOKEN is configured, so the system works
 * out of the box and gets richer signals once a token is added.
 */
export async function enrichWithIpinfo(ip: string): Promise<GeoInfo | null> {
  const token = process.env.IPINFO_TOKEN;
  if (!token || !ip || ip === 'unknown') return null;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}?token=${token}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = (await res.json()) as IpinfoResponse;

    const [latStr, lonStr] = (data.loc || '').split(',');
    const asnMatch = data.org?.match(/^(AS\d+)\s+(.*)$/);

    return {
      city: data.city,
      region: data.region,
      postal: data.postal,
      country: data.country,
      latitude: toNumber(latStr),
      longitude: toNumber(lonStr),
      asn: asnMatch?.[1],
      isp: asnMatch?.[2] || data.org,
      org: data.org,
      ipTimezone: data.timezone,
      isVpnOrProxy: data.privacy
        ? Boolean(data.privacy.vpn || data.privacy.proxy || data.privacy.tor || data.privacy.hosting)
        : undefined,
      source: 'ipinfo',
    };
  } catch {
    return null;
  }
}

interface BigDataCloudResponse {
  locality?: string;
  city?: string;
  localityInfo?: { administrative?: { name?: string; order?: number }[] };
  postcode?: string;
  principalSubdivision?: string;
}

/**
 * Turn coordinates into a named locality / neighbourhood (the "which part of
 * the city" answer). Uses BigDataCloud's free reverse-geocode endpoint — no API
 * key required. Returns null on any failure so it never blocks a login.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<{ district?: string; postal?: string } | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
      { signal: ctrl.signal, headers: { Accept: 'application/json' } },
    );
    clearTimeout(t);
    if (!res.ok) return null;
    const data = (await res.json()) as BigDataCloudResponse;

    // Prefer the smallest named administrative area (highest "order") as the
    // locality, falling back to the locality field itself.
    const admin = data.localityInfo?.administrative ?? [];
    const finest = admin
      .filter((a) => a.name)
      .sort((a, b) => (b.order ?? 0) - (a.order ?? 0))[0]?.name;

    const district = data.locality || finest;
    return { district: district || undefined, postal: data.postcode || undefined };
  } catch {
    return null;
  }
}

/**
 * Resolve the best available geolocation for a request/IP: Vercel headers as the
 * always-on base, enriched with ipinfo (PIN/ISP/ASN/VPN) when configured,
 * falling back to the project's ip-api lookup for a city when neither yields
 * one, then refined to a named locality via reverse geocoding.
 */
export async function resolveGeo(req: Request, ip: string | null | undefined): Promise<GeoInfo> {
  const base = geoFromVercelHeaders(req);
  const enriched = ip ? await enrichWithIpinfo(ip) : null;

  let merged: GeoInfo = enriched
    ? {
        city: base.city ?? enriched.city,
        region: base.region ?? enriched.region,
        postal: enriched.postal,
        country: base.country ?? enriched.country,
        latitude: base.latitude ?? enriched.latitude,
        longitude: base.longitude ?? enriched.longitude,
        ipTimezone: base.ipTimezone ?? enriched.ipTimezone,
        isp: enriched.isp,
        asn: enriched.asn,
        org: enriched.org,
        isVpnOrProxy: enriched.isVpnOrProxy,
        source: enriched.source,
      }
    : base;

  // Baseline fallback: if we still don't have a city (no Vercel headers in
  // local/non-Vercel deploys, no ipinfo token), use the existing ip-api helper.
  if (!merged.city && ip) {
    const baseline = await lookupIp(ip);
    if (baseline.kind === 'resolved') {
      merged = {
        ...merged,
        city: merged.city ?? baseline.city,
        region: merged.region ?? baseline.region,
        country: merged.country ?? baseline.country,
        isp: merged.isp ?? baseline.isp,
        org: merged.org ?? baseline.asOrg,
        source: merged.source === 'unknown' ? 'ip-api' : merged.source,
      };
    }
  }

  // Refine to a named locality when we have coordinates.
  if (merged.latitude != null && merged.longitude != null) {
    const fine = await reverseGeocode(merged.latitude, merged.longitude);
    if (fine) {
      merged.district = fine.district ?? merged.district;
      merged.postal = merged.postal ?? fine.postal;
    }
  }

  return merged;
}

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two lat/long points, in kilometers. */
export function haversineKm(
  a: { latitude?: number | null; longitude?: number | null },
  b: { latitude?: number | null; longitude?: number | null },
): number | null {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) {
    return null;
  }
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Given the distance and time between two logins, return the implied travel
 * speed in km/h. Used to flag "impossible travel" (e.g. two cities in minutes).
 */
export function impliedSpeedKmh(distanceKm: number, milliseconds: number): number {
  const hours = milliseconds / 3_600_000;
  if (hours <= 0) return Infinity;
  return distanceKm / hours;
}
