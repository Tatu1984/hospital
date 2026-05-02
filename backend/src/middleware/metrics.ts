import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Lightweight in-memory latency histogram.
 *
 * Records request duration on the response 'finish' event, bucketed by
 * `method:route_template`. Exposes p50/p95/p99 via /api/metrics so an external
 * SLO board (or a one-off curl) can pull them without adding a Prometheus
 * sidecar. Resets every METRICS_WINDOW_MS so the percentiles describe a
 * recent window, not a slowly-creeping average.
 *
 * Tradeoff: keeps the most recent N samples per route in a circular buffer.
 * Bounded memory (default 5,000 samples per route × ~200 routes = ~1M
 * floats ≈ 8 MB peak) — acceptable. If you want a real time-series, swap
 * for prom-client.
 */

const SAMPLES_PER_ROUTE = parseInt(process.env.METRICS_SAMPLES_PER_ROUTE || '5000', 10);
const SLOW_REQUEST_MS = parseInt(process.env.SLOW_REQUEST_MS || '1000', 10);

interface RouteStats {
  samples: number[]; // ring buffer of duration_ms
  cursor: number;   // next slot to overwrite
  count: number;    // total observed
  filled: boolean;  // wrapped at least once
}

const stats = new Map<string, RouteStats>();

function record(key: string, durationMs: number): void {
  let s = stats.get(key);
  if (!s) {
    s = { samples: new Array(SAMPLES_PER_ROUTE), cursor: 0, count: 0, filled: false };
    stats.set(key, s);
  }
  s.samples[s.cursor] = durationMs;
  s.cursor = (s.cursor + 1) % SAMPLES_PER_ROUTE;
  s.count += 1;
  if (s.cursor === 0) s.filled = true;
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.floor(sortedAsc.length * p));
  return Math.round(sortedAsc[idx]);
}

export function metricsSnapshot(): Array<{
  route: string;
  count: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}> {
  const out: Array<any> = [];
  for (const [key, s] of stats.entries()) {
    const valid = s.filled ? s.samples : s.samples.slice(0, s.cursor);
    const sorted = [...valid].sort((a, b) => a - b);
    out.push({
      route: key,
      count: s.count,
      p50: percentile(sorted, 0.5),
      p95: percentile(sorted, 0.95),
      p99: percentile(sorted, 0.99),
      max: sorted.length ? Math.round(sorted[sorted.length - 1]) : 0,
    });
  }
  // Sort by p95 desc so the slowest routes float to the top.
  out.sort((a, b) => b.p95 - a.p95);
  return out;
}

/**
 * Express middleware. Capture start time on entry, record on response
 * 'finish'. Uses `req.route?.path` (the matched template, e.g.
 * `/api/patients/:id`) so high-cardinality URL paths don't explode the map.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const template = (req.route as any)?.path ?? req.path;
    const key = `${req.method} ${template}`;
    record(key, durationMs);

    if (durationMs > SLOW_REQUEST_MS) {
      logger.warn('slow request', {
        method: req.method,
        path: req.path,
        route: template,
        durationMs: Math.round(durationMs),
        status: res.statusCode,
        requestId: (req as any).requestId,
      });
    }
  });
  next();
}
