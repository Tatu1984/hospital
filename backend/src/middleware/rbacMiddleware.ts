/**
 * RBAC + Validation Middleware — route-based permission and body validation.
 *
 * This module is the runtime enforcement arm. The single source of truth for
 * permissions and Zod schemas lives in `backend/src/routes/index.ts`
 * (ROUTE_PERMISSIONS, ROUTE_VALIDATORS, PUBLIC_ROUTES). This middleware
 * delegates to those maps so we never drift between two registries.
 *
 * Policy: DENY BY DEFAULT.
 *   - If a route is in PUBLIC_ROUTES → bypass auth/RBAC/validation.
 *   - If a route is in ROUTE_PERMISSIONS → enforce that permission.
 *   - Anything else under /api/* → 403. Add it to the registry.
 */

import { Request, Response, NextFunction } from 'express';
import { Permission, hasAnyPermission } from '../rbac';
import { auditLogger } from '../utils/logger';
import {
  getRoutePermissions,
  isPublicRoute,
  ROUTE_VALIDATORS,
} from '../routes';
import { z } from 'zod';
import { validateBody } from './validation';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    tenantId: string;
    branchId: string;
    roleIds: string[];
  };
}

const genericObjectSchema = z.record(z.any());

function matchKey(method: string, path: string, table: Record<string, unknown>): string | null {
  const normalized = path.replace(/\/+$/, '');
  const exact = `${method.toUpperCase()} ${normalized}`;
  if (exact in table) return exact;
  for (const key of Object.keys(table)) {
    const [m, p] = key.split(' ');
    if (m !== method.toUpperCase()) continue;
    const re = new RegExp('^' + p.replace(/:[^/]+/g, '[^/]+') + '$');
    if (re.test(normalized)) return key;
  }
  return null;
}

/**
 * Deny-by-default RBAC, wired to ROUTE_PERMISSIONS / PUBLIC_ROUTES.
 * Apply AFTER authentication middleware (req.user must be set).
 */
export function dynamicRBAC(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (isPublicRoute(req.method, req.path)) return next();

  if (!req.user) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  const requiredPermissions = getRoutePermissions(req.method, req.path);

  if (!requiredPermissions || requiredPermissions.length === 0) {
    auditLogger.securityEvent('UNREGISTERED_ROUTE_DENIED', {
      userId: req.user.userId,
      path: req.path,
      method: req.method,
    });
    return res.status(403).json({
      error: 'FORBIDDEN',
      message:
        `Route ${req.method} ${req.path} has no permission registered. ` +
        `Add it to ROUTE_PERMISSIONS in backend/src/routes/index.ts.`,
    });
  }

  const userRoles = req.user.roleIds || [];
  if (!hasAnyPermission(userRoles, requiredPermissions)) {
    auditLogger.securityEvent('ACCESS_DENIED', {
      userId: req.user.userId,
      path: req.path,
      method: req.method,
      requiredPermissions,
      userRoles,
    });
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'You do not have permission to perform this action',
      required: requiredPermissions,
    });
  }

  next();
}

/**
 * Body validation for POST/PUT/PATCH using ROUTE_VALIDATORS.
 * Falls back to a generic "must be a JSON object" rule for routes
 * that have not yet declared a schema. Apply after dynamicRBAC.
 */
export function dynamicValidation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const m = req.method.toUpperCase();
  if (m !== 'POST' && m !== 'PUT' && m !== 'PATCH') return next();
  if (isPublicRoute(req.method, req.path) && req.path !== '/api/auth/login') return next();

  const key = matchKey(req.method, req.path, ROUTE_VALIDATORS as Record<string, unknown>);
  const schema = key ? (ROUTE_VALIDATORS as Record<string, z.ZodTypeAny>)[key] : genericObjectSchema;
  return validateBody(schema)(req, res, next);
}

/**
 * Convenience wrapper retained for any callers that imported it.
 */
export function checkPermission(permission: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }
    const userRoles = req.user.roleIds || [];
    if (!hasAnyPermission(userRoles, [permission])) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You do not have permission to perform this action',
      });
    }
    next();
  };
}
