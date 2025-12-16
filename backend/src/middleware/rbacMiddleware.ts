/**
 * RBAC Middleware - Route-based Permission Checking
 *
 * This middleware automatically enforces permissions based on route patterns
 * without requiring each route to explicitly declare permissions.
 */

import { Request, Response, NextFunction } from 'express';
import { Permission, hasAnyPermission } from '../rbac';
import { auditLogger } from '../utils/logger';

// Extended request with user data
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    tenantId: string;
    branchId: string;
    roleIds: string[];
  };
}

// Route pattern to permissions mapping
const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  // Patient routes
  'GET:/api/patients': ['patients:view'],
  'POST:/api/patients': ['patients:create'],
  'GET:/api/patients/:id': ['patients:view'],
  'PUT:/api/patients/:id': ['patients:edit'],

  // User routes
  'GET:/api/users': ['users:view'],
  'POST:/api/users': ['users:manage'],

  // Encounter routes
  'POST:/api/encounters': ['encounters:create'],
  'GET:/api/encounters': ['encounters:view'],

  // OPD routes
  'POST:/api/opd-notes': ['opd:create'],
  'GET:/api/opd-notes/:encounterId': ['opd:view'],

  // Invoice/Billing routes
  'POST:/api/invoices': ['invoices:create'],
  'GET:/api/invoices': ['invoices:view'],
  'POST:/api/invoices/:id/payment': ['invoices:payment'],

  // Referral/Commission routes
  'GET:/api/referral-sources': ['commissions:view'],
  'POST:/api/referral-sources': ['commissions:manage'],
  'PUT:/api/referral-sources/:id': ['commissions:manage'],
  'GET:/api/commissions': ['commissions:view'],
  'POST:/api/commissions/:id/approve': ['commissions:manage'],
  'POST:/api/commission-payouts': ['commissions:payout'],
  'GET:/api/commission-payouts': ['commissions:view'],
  'GET:/api/commissions/summary': ['commissions:view'],

  // Accounts routes
  'GET:/api/account-heads': ['accounts:view'],
  'POST:/api/account-heads': ['accounts:create'],
  'GET:/api/journal-entries': ['accounts:view'],
  'POST:/api/journal-entries': ['accounts:create'],
  'GET:/api/ledger/:accountHeadId': ['accounts:view'],
  'GET:/api/trial-balance': ['accounts:view'],

  // Doctor revenue routes
  'GET:/api/doctor-contracts': ['doctor_revenue:view'],
  'POST:/api/doctor-contracts': ['doctor_revenue:manage'],
  'GET:/api/doctor-revenues': ['doctor_revenue:view'],
  'POST:/api/doctor-payouts': ['doctor_revenue:manage'],
  'GET:/api/doctor-payouts': ['doctor_revenue:view'],

  // Master data routes
  'GET:/api/drugs': ['master_data:view'],
  'POST:/api/drugs': ['master_data:edit'],
  'PUT:/api/drugs/:id': ['master_data:edit'],
  'GET:/api/lab-tests': ['master_data:view'],
  'POST:/api/lab-tests': ['master_data:edit'],
  'GET:/api/radiology-tests': ['master_data:view'],
  'POST:/api/radiology-tests': ['master_data:edit'],
  'GET:/api/procedures': ['master_data:view'],
  'GET:/api/packages': ['master_data:view'],
  'GET:/api/wards': ['master_data:view'],

  // Appointment routes
  'GET:/api/appointments': ['appointments:view'],
  'POST:/api/appointments': ['appointments:create'],
  'PUT:/api/appointments/:id': ['appointments:edit'],
  'DELETE:/api/appointments/:id': ['appointments:delete'],
  'POST:/api/appointments/:id/check-in': ['appointments:edit'],
  'POST:/api/appointments/:id/cancel': ['appointments:edit'],

  // Lab routes
  'POST:/api/lab-orders': ['lab_orders:create'],
  'GET:/api/lab-orders': ['lab_orders:view'],
  'PUT:/api/lab-orders/:id': ['lab_orders:update'],
  'POST:/api/lab-results': ['lab_results:create'],

  // Radiology routes
  'POST:/api/radiology-orders': ['radiology_orders:create'],
  'GET:/api/radiology-orders': ['radiology_orders:view'],
  'PUT:/api/radiology-orders/:id': ['radiology_orders:update'],

  // Pharmacy routes
  'GET:/api/pharmacy/pending-prescriptions': ['pharmacy:view'],
  'GET:/api/pharmacy/drugs': ['pharmacy:view'],
  'GET:/api/pharmacy/stock': ['pharmacy:view'],

  // Admission/IPD routes
  'POST:/api/admissions': ['admissions:create'],
  'GET:/api/admissions': ['admissions:view'],
  'POST:/api/admissions/:id/discharge': ['admissions:discharge'],
  'GET:/api/beds': ['beds:view'],

  // Emergency routes
  'GET:/api/emergency/cases': ['emergency:view'],
  'POST:/api/emergency/cases': ['emergency:create'],
  'PUT:/api/emergency/cases/:id': ['emergency:edit'],
  'POST:/api/emergency/cases/:id/admit': ['emergency:admit'],
  'POST:/api/emergency/cases/:id/discharge': ['emergency:discharge'],

  // ICU routes
  'GET:/api/icu/beds': ['icu:view'],
  'POST:/api/icu/beds': ['icu:create'],
  'POST:/api/icu/vitals': ['icu_vitals:create'],
  'POST:/api/icu/ventilator': ['icu:edit'],
  'GET:/api/icu/patients': ['icu:view'],

  // Surgery/OT routes
  'GET:/api/surgeries': ['surgery:view'],
  'POST:/api/surgeries': ['surgery:schedule'],
  'GET:/api/ot-rooms': ['ot:view'],
  'POST:/api/ot-rooms': ['ot:create'],
  'POST:/api/surgeries/:id/start': ['surgery:start'],
  'POST:/api/surgeries/:id/complete': ['surgery:complete'],
  'POST:/api/surgeries/:id/cancel': ['surgery:cancel'],

  // Blood Bank routes
  'GET:/api/blood-bank/inventory': ['blood_bank:view'],
  'GET:/api/blood-bank/donors': ['blood_donors:view'],
  'POST:/api/blood-bank/donors': ['blood_donors:create'],
  'GET:/api/blood-bank/requests': ['blood_requests:view'],
  'POST:/api/blood-bank/requests': ['blood_requests:create'],
  'POST:/api/blood-bank/requests/:id/cross-match': ['blood_bank:manage'],
  'POST:/api/blood-bank/requests/:id/issue': ['blood_requests:issue'],

  // HR routes
  'GET:/api/hr/employees': ['employees:view'],
  'POST:/api/hr/employees': ['employees:create'],
  'GET:/api/hr/attendance': ['attendance:view'],
  'POST:/api/hr/attendance': ['attendance:manage'],
  'GET:/api/hr/leaves': ['leaves:view'],
  'POST:/api/hr/leaves': ['leaves:create'],
  'POST:/api/hr/leaves/:id/approve': ['leaves:approve'],
  'POST:/api/hr/leaves/:id/reject': ['leaves:approve'],

  // Inventory routes
  'GET:/api/inventory/items': ['inventory:view'],
  'POST:/api/inventory/items': ['inventory:manage'],
  'GET:/api/inventory/purchase-orders': ['purchase_orders:view'],
  'POST:/api/inventory/purchase-orders': ['purchase_orders:create'],
  'PUT:/api/inventory/purchase-orders/:id': ['purchase_orders:approve'],

  // Ambulance routes
  'GET:/api/ambulance/vehicles': ['ambulance:view'],
  'POST:/api/ambulance/vehicles': ['ambulance:manage'],
  'GET:/api/ambulance/trips': ['ambulance:view'],
  'POST:/api/ambulance/trips': ['ambulance:manage'],
  'POST:/api/ambulance/trips/:id/assign': ['ambulance:manage'],
  'POST:/api/ambulance/trips/:id/complete': ['ambulance:manage'],

  // Housekeeping routes
  'GET:/api/housekeeping/tasks': ['housekeeping:view'],
  'POST:/api/housekeeping/tasks': ['housekeeping:manage'],
  'POST:/api/housekeeping/tasks/:id/complete': ['housekeeping:manage'],
  'GET:/api/housekeeping/laundry': ['housekeeping:view'],

  // Diet routes
  'GET:/api/diet/orders': ['diet:view'],
  'POST:/api/diet/orders': ['diet:manage'],
  'PUT:/api/diet/orders/:id': ['diet:manage'],

  // Quality routes
  'GET:/api/quality/incidents': ['quality:view'],
  'GET:/api/quality/feedbacks': ['quality:view'],

  // Report routes
  'GET:/api/reports/dashboard': ['reports:view'],

  // Nurse routes
  'GET:/api/nurse/medications': ['nurse_station:view'],
  'GET:/api/nurse/vitals': ['nurse_station:view'],

  // IPD Billing routes
  'GET:/api/ipd-billing/:admissionId': ['billing:view'],
  'POST:/api/ipd-billing': ['billing:create'],
  'POST:/api/ipd-billing/:admissionId/pay': ['billing:payment'],
};

// Routes that don't require specific permission (just authentication)
const OPEN_AUTHENTICATED_ROUTES = [
  'GET:/api/doctors',           // Doctor list - needed everywhere
  'GET:/api/dashboard/stats',   // Dashboard stats
  'GET:/api/health',            // Health check
];

// Convert route pattern to regex for matching
function patternToRegex(pattern: string): RegExp {
  // Replace :param with regex pattern
  const regexPattern = pattern
    .replace(/:[^/]+/g, '[^/]+')
    .replace(/\//g, '\\/');
  return new RegExp(`^${regexPattern}$`);
}

// Find permissions for a route
function getPermissionsForRoute(method: string, path: string): Permission[] | null {
  const routeKey = `${method}:${path}`;

  // Check exact match first
  if (ROUTE_PERMISSIONS[routeKey]) {
    return ROUTE_PERMISSIONS[routeKey];
  }

  // Check pattern matches
  for (const [pattern, permissions] of Object.entries(ROUTE_PERMISSIONS)) {
    const [patternMethod, patternPath] = pattern.split(':');
    if (patternMethod !== method) continue;

    const regex = patternToRegex(patternPath);
    if (regex.test(path)) {
      return permissions;
    }
  }

  return null;
}

// Check if route is open authenticated (no specific permission needed)
function isOpenAuthenticatedRoute(method: string, path: string): boolean {
  const routeKey = `${method}:${path}`;
  return OPEN_AUTHENTICATED_ROUTES.some(pattern => {
    if (pattern === routeKey) return true;
    const [patternMethod, patternPath] = pattern.split(':');
    if (patternMethod !== method) return false;
    const regex = patternToRegex(patternPath);
    return regex.test(path);
  });
}

/**
 * Dynamic RBAC middleware that checks permissions based on route
 * Apply this AFTER authentication middleware
 */
export function dynamicRBAC(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Skip if no user (should be handled by auth middleware)
  if (!req.user) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  const method = req.method.toUpperCase();
  const path = req.path;

  // Check if it's an open authenticated route
  if (isOpenAuthenticatedRoute(method, path)) {
    return next();
  }

  // Get required permissions for this route
  const requiredPermissions = getPermissionsForRoute(method, path);

  // If no permissions defined, allow (opt-in security model)
  // Change to deny if you want stricter security (opt-out model)
  if (!requiredPermissions) {
    return next();
  }

  // Check if user has required permissions
  const userRoles = req.user.roleIds || [];
  if (!hasAnyPermission(userRoles, requiredPermissions)) {
    auditLogger.securityEvent('ACCESS_DENIED', {
      userId: req.user.userId,
      path,
      method,
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
 * Permission check helper for manual use in routes
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

export { ROUTE_PERMISSIONS };
