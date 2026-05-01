import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Drift-detection: every Express route declared in server.ts must be either
 * in PUBLIC_ROUTES or have an entry in ROUTE_PERMISSIONS. If you add a route
 * but forget to register a permission, this test fails — and the runtime
 * deny-by-default would 403 your callers anyway.
 *
 * The route registry is loaded lazily after env vars are set, because importing
 * `src/routes` transitively pulls in `middleware/auth.ts` → `config/index.ts`,
 * which calls `process.exit(1)` if env vars are missing.
 */

const SERVER = fs.readFileSync(path.join(__dirname, '..', 'server.ts'), 'utf8');

function extractRoutes(): Array<{ method: string; path: string }> {
  const re = /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  const found: Array<{ method: string; path: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(SERVER)) !== null) {
    found.push({ method: m[1].toUpperCase(), path: m[2] });
  }
  return found;
}

let routes: Array<{ method: string; path: string }> = [];
let isPublicRoute: (m: string, p: string) => boolean;
let getRoutePermissions: (m: string, p: string) => any[];
let ROUTE_PERMISSIONS: Record<string, any>;
let PUBLIC_ROUTES: ReadonlySet<string>;

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-chars-or-longer-for-coverage';
  process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test-refresh-secret-32-chars-or-longer-coverage';
  process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

  const mod = await import('../routes');
  isPublicRoute = mod.isPublicRoute;
  getRoutePermissions = mod.getRoutePermissions;
  ROUTE_PERMISSIONS = mod.ROUTE_PERMISSIONS;
  PUBLIC_ROUTES = mod.PUBLIC_ROUTES;
  routes = extractRoutes();
});

describe('Route registry coverage', () => {
  it('discovers a non-trivial number of routes', () => {
    expect(routes.length).toBeGreaterThan(150);
  });

  it('every route is either public or has a registered permission', () => {
    const unregistered: string[] = [];
    for (const r of routes) {
      if (isPublicRoute(r.method, r.path)) continue;
      const perms = getRoutePermissions(r.method, r.path);
      if (!perms || perms.length === 0) {
        unregistered.push(`${r.method} ${r.path}`);
      }
    }
    expect(
      unregistered,
      `Unregistered routes (add to PUBLIC_ROUTES or ROUTE_PERMISSIONS in src/routes/index.ts):\n${unregistered.join('\n')}`
    ).toEqual([]);
  });

  it('PUBLIC_ROUTES are not also in ROUTE_PERMISSIONS', () => {
    const overlap: string[] = [];
    for (const key of PUBLIC_ROUTES) {
      if (key in ROUTE_PERMISSIONS) overlap.push(key);
    }
    expect(overlap).toEqual([]);
  });
});
