import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Drift-detection for recent auth + admissions endpoints. Same shape as
 * assetRoutes.test.ts: assert registry entries exist with the right
 * permissions / public-route tagging. No DB required.
 */

let ROUTE_PERMISSIONS: Record<string, any>;
let PUBLIC_ROUTES: ReadonlySet<string>;

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-chars-or-longer-for-coverage';
  process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test-refresh-secret-32-chars-or-longer-coverage';
  process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

  const mod = await import('../routes');
  ROUTE_PERMISSIONS = mod.ROUTE_PERMISSIONS;
  PUBLIC_ROUTES = mod.PUBLIC_ROUTES;
});

describe('Auth endpoints — public routes are tagged', () => {
  const expectedPublic = [
    'POST /api/auth/login',
    'POST /api/auth/refresh',
    'POST /api/auth/logout',
    'POST /api/auth/forgot-password',
    'POST /api/auth/reset-password',
  ];

  it('lists every public auth route in PUBLIC_ROUTES', () => {
    for (const route of expectedPublic) {
      expect(PUBLIC_ROUTES.has(route), `missing public route: ${route}`).toBe(true);
    }
  });

  it('does not also gate them with a permission', () => {
    for (const route of expectedPublic) {
      expect(ROUTE_PERMISSIONS[route], `${route} should not have a permission`).toBeUndefined();
    }
  });

  it('GET /api/auth/me requires dashboard:view', () => {
    expect(ROUTE_PERMISSIONS['GET /api/auth/me']).toEqual(['dashboard:view']);
  });
});

describe('Admissions endpoints — bed transfer + lifecycle', () => {
  it('POST /api/admissions/:id/transfer-bed is registered with ipd:edit', () => {
    const perms: string[] = ROUTE_PERMISSIONS['POST /api/admissions/:id/transfer-bed'];
    expect(perms).toBeDefined();
    expect(perms).toContain('ipd:edit');
    expect(perms).toContain('beds:manage');
  });

  it('POST /api/admissions/:id/discharge requires admissions:discharge', () => {
    expect(ROUTE_PERMISSIONS['POST /api/admissions/:id/discharge']).toEqual(['admissions:discharge']);
  });

  it('POST /api/admissions requires admissions:create', () => {
    expect(ROUTE_PERMISSIONS['POST /api/admissions']).toEqual(['admissions:create']);
  });
});
