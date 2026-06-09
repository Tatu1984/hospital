import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../shared/prisma';

/**
 * Read-only section guard.
 *
 * Some accounts (e.g. an auditor-style admin) are allowed to SEE everything
 * in a section but never change it. The "Admin & Reports" section is awkward
 * to lock down with RBAC alone because it mixes two protection styles:
 *
 *   - Master Data / System Control use granular permissions
 *     (master_data:edit, system:manage) — revocable per user.
 *   - The register/quality modules (Form-F, MTP, BMW, HAI, M&M, Quality)
 *     are served by clinicalModulesRouter behind auth-ONLY, with no
 *     per-permission gate, so revoking a permission can't stop writes.
 *
 * This middleware closes that gap uniformly: for a user flagged read-only on
 * a module, any write verb (POST/PUT/PATCH/DELETE) to that module's API
 * prefixes is rejected with 403. GETs are always allowed, so viewing —
 * including Audit Log and Activity Monitor — keeps working.
 *
 * The flag lives on User.profile.readOnlyModules (a string[] on the existing
 * JSON column — no migration). It's read from the DB on the rare write
 * attempt to a guarded prefix, so changes apply immediately without waiting
 * for a token to expire, and it works on already-issued tokens too.
 *
 * Mounted globally BEFORE clinicalModulesRouter so it runs ahead of those
 * auth-only routes (Express matches in registration order).
 */

// Module key -> API path prefixes whose write endpoints belong to it.
// Mirrors the "Admin & Reports" group in frontend MainLayout.tsx.
const MODULE_WRITE_PREFIXES: Record<string, string[]> = {
  'admin-reports': [
    // India statutory registers + clinical-quality modules (auth-only routes)
    '/api/form-f',
    '/api/mtp',
    '/api/bmw',
    '/api/hai-cases',
    '/api/mnm',
    '/api/quality',
    '/api/nps',
    '/api/nabh',
    // Master data configuration
    '/api/master',
    '/api/lab-tests',
    '/api/lab-test-parameters',
    '/api/radiology-tests',
    '/api/insurance-companies',
    '/api/packages',
    '/api/procedures',
    // System control / settings / integrations
    '/api/settings',
    '/api/admin/integrations',
    '/api/tenant/letterhead',
  ],
};

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function pathInModule(path: string, module: string): boolean {
  const prefixes = MODULE_WRITE_PREFIXES[module];
  if (!prefixes) return false;
  return prefixes.some((p) => path === p || path.startsWith(p + '/'));
}

export const readOnlyGuard = async (req: Request, res: Response, next: NextFunction) => {
  // Only write verbs can mutate; everything else (incl. all GETs) passes through.
  if (!WRITE_METHODS.has(req.method.toUpperCase())) return next();

  // Skip the DB hit unless the target path is actually a guarded prefix.
  const guardedModules = Object.keys(MODULE_WRITE_PREFIXES).filter((m) =>
    pathInModule(req.path, m),
  );
  if (guardedModules.length === 0) return next();

  // Resolve the caller from the bearer token. We verify here rather than
  // relying on per-route auth ordering. On any failure we fall through —
  // the route's own authenticateToken will issue the proper 401/403.
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();

  let userId: string;
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { userId?: string };
    if (!decoded?.userId) return next();
    userId = decoded.userId;
  } catch {
    return next();
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profile: true },
    });
    const readOnlyModules: string[] = Array.isArray((user?.profile as any)?.readOnlyModules)
      ? (user!.profile as any).readOnlyModules
      : [];

    const blocked = guardedModules.find((m) => readOnlyModules.includes(m));
    if (blocked) {
      return res.status(403).json({
        error: 'READ_ONLY_SECTION',
        message: `Your account has view-only access to ${blocked.replace('-', ' & ')}. You cannot create, edit, or delete here.`,
      });
    }
    return next();
  } catch {
    // Never let an analytics/lookup failure block a legitimate request —
    // fall through to normal RBAC, which is the security authority.
    return next();
  }
};
