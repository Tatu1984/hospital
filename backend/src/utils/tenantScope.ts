/**
 * Tenant-scoping helpers.
 *
 * The schema has THREE patterns for tenant ownership:
 *   1. Direct: model has `tenantId` column.
 *      → use `tenantWhere(req)`
 *   2. Branch-only: model has `branchId` but no `tenantId`. Branch belongs to
 *      a tenant, so we scope through the relation.
 *      → use `branchTenantWhere(req)`
 *   3. Patient-rooted: model has `patientId` (Encounter, Invoice, Admission,
 *      etc.). Scope through Patient.tenantId.
 *      → use `patientTenantWhere(req)`
 *
 * Always pass `req` (the AuthenticatedRequest after `authenticateToken`) so
 * we read tenantId/branchId from the verified JWT, not anything client-supplied.
 */

import { Request } from 'express';

interface ReqUser {
  userId: string;
  username: string;
  tenantId: string;
  branchId: string | null;
  roleIds: string[];
}

interface AuthedReq extends Request {
  user?: ReqUser;
}

function userOrThrow(req: AuthedReq): ReqUser {
  if (!req.user || !req.user.tenantId) {
    throw new Error('tenantScope helper called before authenticateToken populated req.user');
  }
  return req.user;
}

/** For models with a direct `tenantId` column (Patient, User, Appointment, etc.) */
export function tenantWhere(req: AuthedReq): { tenantId: string } {
  return { tenantId: userOrThrow(req).tenantId };
}

/** Same plus `tenantId` in `data` (for create operations) */
export function tenantData(req: AuthedReq): { tenantId: string; branchId?: string } {
  const u = userOrThrow(req);
  return u.branchId ? { tenantId: u.tenantId, branchId: u.branchId } : { tenantId: u.tenantId };
}

/** For models scoped by `branchId` only (Encounter, Bed, Department, AttendanceLog) */
export function branchTenantWhere(req: AuthedReq): { branch: { tenantId: string } } {
  return { branch: { tenantId: userOrThrow(req).tenantId } };
}

/** For models with `patientId` but no tenantId (Invoice, Admission, OPDNote, Order, ...) */
export function patientTenantWhere(req: AuthedReq): { patient: { tenantId: string } } {
  return { patient: { tenantId: userOrThrow(req).tenantId } };
}

/** Compose multiple where-clauses safely (handy in list endpoints) */
export function and(...clauses: Array<Record<string, unknown> | undefined>): Record<string, unknown> {
  const valid = clauses.filter((c): c is Record<string, unknown> => !!c && Object.keys(c).length > 0);
  if (valid.length === 0) return {};
  if (valid.length === 1) return valid[0];
  return { AND: valid };
}

/**
 * Pagination helper. Reads `limit` and `page` from req.query, clamps both,
 * and returns Prisma-friendly `skip` and `take`.
 *   default page = 1, default limit = 50, max limit = 200.
 */
export function paginate(req: AuthedReq): { skip: number; take: number; page: number; limit: number } {
  const q = req.query as Record<string, unknown>;
  const rawLimit = Number(q.limit ?? 50);
  const rawPage = Number(q.page ?? 1);
  const limit = Math.min(200, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 50));
  const page = Math.max(1, Number.isFinite(rawPage) ? rawPage : 1);
  return { skip: (page - 1) * limit, take: limit, page, limit };
}
