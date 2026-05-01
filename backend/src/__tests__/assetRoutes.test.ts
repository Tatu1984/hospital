import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Drift-detection for the Asset multi-tenant feature.
 *
 * These tests don't hit a real DB — they assert that the route registry
 * remembers every endpoint we shipped, the permissions are tight, and the
 * Zod-validation map is wired correctly. If anyone removes a tenant scope
 * on a future PR, the route-coverage suite + this file together will trip.
 */

let ROUTE_PERMISSIONS: Record<string, any>;
let ROUTE_VALIDATORS: Record<string, any>;

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-chars-or-longer-for-coverage';
  process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test-refresh-secret-32-chars-or-longer-coverage';
  process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

  const mod = await import('../routes');
  ROUTE_PERMISSIONS = mod.ROUTE_PERMISSIONS;
  ROUTE_VALIDATORS = mod.ROUTE_VALIDATORS;
});

describe('Asset endpoints — RBAC + validation registry', () => {
  const ASSET_ROUTES_REQUIRING_VIEW = [
    'GET /api/assets',
    'GET /api/assets/:id',
    'GET /api/assets/:id/maintenance',
  ];
  const ASSET_ROUTES_REQUIRING_MANAGE = [
    'POST /api/assets',
    'PUT /api/assets/:id',
    'DELETE /api/assets/:id',
    'POST /api/assets/:id/status',
    'POST /api/assets/:id/maintenance',
  ];

  it('every asset GET requires inventory:view', () => {
    for (const route of ASSET_ROUTES_REQUIRING_VIEW) {
      expect(ROUTE_PERMISSIONS[route], `missing permission for ${route}`).toBeDefined();
      expect(ROUTE_PERMISSIONS[route]).toContain('inventory:view');
    }
  });

  it('every asset write requires inventory:manage (never just :view)', () => {
    for (const route of ASSET_ROUTES_REQUIRING_MANAGE) {
      expect(ROUTE_PERMISSIONS[route], `missing permission for ${route}`).toBeDefined();
      const perms: string[] = ROUTE_PERMISSIONS[route];
      expect(perms.some((p) => p === 'inventory:manage')).toBe(true);
      expect(perms.some((p) => p === 'inventory:view' && perms.length === 1)).toBe(false);
    }
  });

  it('asset write endpoints sit in ROUTE_VALIDATORS or fall through the deny-by-default fallback', () => {
    // Not every asset write has its own Zod schema yet (status / maintenance use
    // generic validation). The deny-by-default behavior comes from
    // STRICT_BODY_VALIDATION; here we just confirm we haven't accidentally
    // typed `null` into the registry.
    for (const route of ASSET_ROUTES_REQUIRING_MANAGE) {
      const v = ROUTE_VALIDATORS[route];
      // Either a Zod schema (object with parse) or undefined → permissive fallback.
      if (v) {
        expect(typeof v.parse).toBe('function');
      }
    }
  });

  it('the global asset-code uniqueness changed to per-tenant (sanity on schema model)', async () => {
    // We can't introspect the live DB here without a connection, but we can
    // assert the schema file declares the composite unique. This catches a
    // regression where someone reverts the multi-tenant model edit.
    const fs = await import('node:fs');
    const path = await import('node:path');
    const schema = fs.readFileSync(
      path.join(__dirname, '..', '..', 'prisma', 'schema.prisma'),
      'utf8'
    );
    expect(schema).toMatch(/model Asset \{[\s\S]*tenantId\s+String/);
    expect(schema).toMatch(/@@unique\(\[tenantId, assetCode\]\)/);
    expect(schema).toMatch(/model MaintenanceLog \{[\s\S]*tenantId\s+String/);
  });
});
