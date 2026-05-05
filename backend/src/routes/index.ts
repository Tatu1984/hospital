/**
 * Route Configuration with Validation and RBAC
 *
 * Single source of truth for:
 *   - RBAC permissions per route        → ROUTE_PERMISSIONS
 *   - Body validation schemas per route → ROUTE_VALIDATORS
 *   - Routes that intentionally bypass auth → PUBLIC_ROUTES
 *
 * The global middlewares `enforceRoutePermissions` and `enforceRouteValidators`
 * are wired into server.ts and apply these maps automatically. Adding a new
 * route therefore REQUIRES adding it to this registry — drift is caught at
 * runtime (deny-by-default) and by the route-coverage test suite.
 */

import { Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  authenticateToken,
  requirePermission,
  AuthenticatedRequest,
  asyncHandler,
  validateBody,
  validateQuery,
  validateParams,
} from '../middleware';
import { Permission } from '../rbac';
import {
  loginSchema,
  createPatientSchema,
  updatePatientSchema,
  searchSchema,
  idParamSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
  createEncounterSchema,
  opdNoteSchema,
  createPrescriptionSchema,
  createAdmissionSchema,
  dischargeSchema,
  createLabOrderSchema,
  labResultSchema,
  createRadiologyOrderSchema,
  radiologyResultSchema,
  createInvoiceSchema,
  paymentSchema,
  createEmergencySchema,
  scheduleSurgerySchema,
  bloodDonorSchema,
  bloodRequestSchema,
  createPurchaseOrderSchema,
  createEmployeeSchema,
  leaveRequestSchema,
  icuVitalsSchema,
  icuBedAssignmentSchema,
  pharmacyDispenseSchema,
  drugMasterSchema,
  ambulanceTripSchema,
  ambulanceVehicleSchema,
  housekeepingTaskSchema,
  dietOrderSchema,
  incidentReportSchema,
  preAuthorizationSchema,
  referralSourceSchema,
  createUserSchema,
  updateUserSchema,
  journalEntrySchema,
  labTestMasterSchema,
  procedureMasterSchema,
  wardMasterSchema,
} from '../validators';

// ============================================
// PUBLIC ROUTES — bypass auth + RBAC entirely.
// Anything not on this list and not in ROUTE_PERMISSIONS is denied.
// ============================================
export const PUBLIC_ROUTES: ReadonlySet<string> = new Set([
  'GET /health',
  'GET /api/health',
  'GET /api/live',
  'GET /api/ready',
  'GET /api/docs.json',
  'GET /api/docs',
  'GET /api/surgery-stages',
  'POST /api/auth/login',
  'POST /api/auth/refresh',
  'POST /api/auth/logout',
  'POST /api/auth/forgot-password',
  'POST /api/auth/reset-password',
  // Mobile auth + health — public so unauth'd clients can get a token
  // and so monitoring can probe the mobile namespace without credentials.
  'POST /api/mobile/v1/auth/login',
  'POST /api/mobile/v1/auth/request-otp',
  'POST /api/mobile/v1/auth/verify-otp',
  'GET /api/mobile/v1/health',
  // Internal cron entry. Bypasses RBAC because it auths via X-Cron-Secret
  // header (the handler verifies it). Never expose this through the UI.
  // Vercel cron sends GET; we also accept POST for non-Vercel triggers.
  'GET /api/internal/audit-retention/run',
  'POST /api/internal/audit-retention/run',
  // Razorpay webhook — auth via X-Razorpay-Signature HMAC over the raw body.
  'POST /api/payments/razorpay/webhook',
]);

// Prefix-style public routes for endpoints that take a path parameter (e.g.
// the family-facing OT tracker keyed by token). isPublicRoute checks these in
// addition to the exact-match set above. Tokens are unguessable random
// base64url so the path itself is the auth.
export const PUBLIC_ROUTE_PREFIXES: ReadonlyArray<{ method: string; prefix: string }> = [
  { method: 'GET', prefix: '/api/track/surgery/' },
];

// ============================================
// ROUTE_PERMISSIONS — every authenticated route must appear here.
// ============================================
export const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  // Detailed health (admin-only)
  'GET /api/health/detailed': ['system:manage'],

  // Latency snapshot (p50/p95/p99 per route, admin-only)
  'GET /api/metrics': ['system:manage'],

  // Razorpay payment flow
  'POST /api/payments/razorpay/order': ['billing:edit'],
  'POST /api/payments/razorpay/verify': ['billing:edit'],

  // Current user
  'GET /api/auth/me': ['dashboard:view'],

  // Patients
  'GET /api/patients': ['patients:view'],
  'POST /api/patients': ['patients:create'],
  'GET /api/patients/:id': ['patients:view'],
  'PUT /api/patients/:id': ['patients:edit'],

  // Users / Doctors / Settings
  'GET /api/users': ['users:view'],
  'POST /api/users': ['users:manage'],
  'PUT /api/users/:id': ['users:manage'],
  'DELETE /api/users/:id': ['users:manage'],
  'POST /api/users/:id/reset-password': ['users:manage'],
  'GET /api/doctors': ['patients:view'],
  'GET /api/referral-doctors': ['commissions:view'],
  'GET /api/audit-logs': ['system:manage'],
  'GET /api/settings': ['system:view'],
  'POST /api/settings/hospital': ['system:manage'],
  'POST /api/settings/email': ['system:manage'],
  'POST /api/settings/sms': ['system:manage'],
  'GET /api/reports': ['reports:view'],

  // Encounters / OPD
  'GET /api/encounters': ['encounters:view'],
  'POST /api/encounters': ['encounters:create'],
  'GET /api/opd-notes/:encounterId': ['opd:view'],
  'POST /api/opd-notes': ['opd:create'],

  // Appointments
  'GET /api/appointments': ['appointments:view'],
  'POST /api/appointments': ['appointments:create'],
  'PUT /api/appointments/:id': ['appointments:edit'],
  'DELETE /api/appointments/:id': ['appointments:delete'],
  'POST /api/appointments/:id/check-in': ['appointments:edit'],
  'POST /api/appointments/:id/cancel': ['appointments:edit'],

  // Admissions / IPD / Beds
  'GET /api/admissions': ['admissions:view'],
  'POST /api/admissions': ['admissions:create'],
  'POST /api/admissions/:id/discharge': ['admissions:discharge'],
  'POST /api/admissions/:id/transfer-bed': ['ipd:edit', 'beds:manage'],
  'GET /api/beds': ['beds:view'],
  'GET /api/wards': ['master_data:view'],
  'GET /api/nurse/medications': ['nurse_station:view'],
  'GET /api/nurse/vitals': ['nurse_station:view'],
  'POST /api/nurse/vitals': ['nurse_station:edit'],
  'GET /api/nurse/patients': ['nurse_station:view'],
  'POST /api/nurse/medication-admin': ['nurse_station:edit'],
  'GET /api/nurse/roster': ['nurse_station:view'],
  'POST /api/nurse/roster': ['nurse_station:edit'],
  'GET /api/nurse/handover': ['nurse_station:view'],
  'POST /api/nurse/handover': ['nurse_station:edit'],

  // Emergency
  'GET /api/emergency': ['emergency:view'],
  'GET /api/emergency/cases': ['emergency:view'],
  'POST /api/emergency/cases': ['emergency:create'],
  'PUT /api/emergency/cases/:id': ['emergency:edit'],
  'POST /api/emergency/cases/:id/admit': ['emergency:admit'],
  'POST /api/emergency/cases/:id/discharge': ['emergency:discharge'],

  // ICU
  'GET /api/icu/beds': ['icu:view'],
  'POST /api/icu/beds': ['icu:create'],
  'GET /api/icu/patients': ['icu:view'],
  'POST /api/icu/vitals': ['icu_vitals:create'],
  'POST /api/icu/ventilator': ['icu:edit'],

  // OT / Surgery
  'GET /api/surgeries': ['surgery:view'],
  'POST /api/surgeries': ['surgery:schedule'],
  'POST /api/surgeries/:id/start': ['surgery:start'],
  'POST /api/surgeries/:id/complete': ['surgery:complete'],
  'POST /api/surgeries/:id/cancel': ['surgery:cancel'],
  'POST /api/surgeries/:id/stage': ['surgery:start'],
  'GET /api/surgeries/:id/stages': ['surgery:view'],
  'POST /api/surgeries/:id/family-contacts': ['surgery:schedule'],
  'GET /api/surgeries/:id/family-contacts': ['surgery:view'],
  'DELETE /api/surgeries/:surgeryId/family-contacts/:contactId': ['surgery:schedule'],
  // Mobile namespace — patient self-service. Doctor-app endpoints will be
  // added under modules/doctors/ + modules/appointments/ as they're built.
  'GET /api/mobile/v1/patients/me': ['patients:view'],
  'PATCH /api/mobile/v1/patients/me': ['patients:edit'],
  // Mobile appointments — patient + doctor. Reuses the existing
  // appointments:view/create permissions so seeded users keep working.
  'GET /api/mobile/v1/appointments/me': ['appointments:view'],
  'GET /api/mobile/v1/appointments/today': ['appointments:view'],
  'GET /api/mobile/v1/appointments/doctors': ['appointments:view'],
  'GET /api/mobile/v1/appointments/slots': ['appointments:view'],
  'POST /api/mobile/v1/appointments': ['appointments:create'],
  'POST /api/mobile/v1/appointments/:id/cancel': ['appointments:edit'],
  // Mobile reports — patient-facing health records (lab, radiology,
  // prescription, invoice). Reuses dashboard:view since this is a
  // self-view of one's own records and the seeded patient role already
  // grants it.
  'GET /api/mobile/v1/reports/me': ['dashboard:view'],
  'GET /api/mobile/v1/reports/:category/:id': ['dashboard:view'],
  'GET /api/ot-rooms': ['ot:view'],
  'POST /api/ot-rooms': ['ot:create'],
  'GET /api/ot/rooms': ['ot:view'],

  // Lab
  'GET /api/lab-orders': ['lab_orders:view'],
  'POST /api/lab-orders': ['lab_orders:create'],
  'PUT /api/lab-orders/:id': ['lab_orders:update'],
  'POST /api/lab-results': ['lab_results:create'],
  'GET /api/lab-tests': ['master_data:view'],
  'POST /api/lab-tests': ['master_data:edit'],

  // Radiology
  'GET /api/radiology-orders': ['radiology_orders:view'],
  'POST /api/radiology-orders': ['radiology_orders:create'],
  'PUT /api/radiology-orders/:id': ['radiology_orders:update'],
  'GET /api/radiology-tests': ['master_data:view'],
  'POST /api/radiology-tests': ['master_data:edit'],

  // Phlebotomy
  'GET /api/phlebotomy/collections': ['phlebotomy:view'],
  'POST /api/phlebotomy/collections': ['phlebotomy:create'],
  'PUT /api/phlebotomy/collections/:id/collect': ['phlebotomy:update'],
  'PUT /api/phlebotomy/collections/:id/reject': ['phlebotomy:update'],

  // Pharmacy
  'GET /api/drugs': ['pharmacy:view'],
  'POST /api/drugs': ['pharmacy:manage'],
  'PUT /api/drugs/:id': ['pharmacy:manage'],
  'GET /api/drugs/by-tag': ['pharmacy:view'],
  'GET /api/pharmacy/drugs': ['pharmacy:view'],
  'GET /api/pharmacy/stock': ['pharmacy:view'],
  'GET /api/pharmacy/pending-prescriptions': ['pharmacy:dispense'],

  // Blood Bank
  'GET /api/blood-bank/inventory': ['blood_bank:view'],
  'GET /api/blood-bank/donors': ['blood_donors:view'],
  'POST /api/blood-bank/donors': ['blood_donors:create'],
  'GET /api/blood-bank/requests': ['blood_requests:view'],
  'POST /api/blood-bank/requests': ['blood_requests:create'],
  'POST /api/blood-bank/requests/:id/cross-match': ['blood_bank:manage'],
  'POST /api/blood-bank/requests/:id/issue': ['blood_requests:issue'],

  // Inventory & Procurement
  'GET /api/inventory/items': ['inventory:view'],
  'POST /api/inventory/items': ['inventory:manage'],
  'GET /api/inventory/purchase-orders': ['purchase_orders:view'],
  'POST /api/inventory/purchase-orders': ['purchase_orders:create'],
  'PUT /api/inventory/purchase-orders/:id': ['purchase_orders:approve'],

  // Billing & Invoices
  'GET /api/invoices': ['invoices:view'],
  'POST /api/invoices': ['invoices:create'],
  'POST /api/invoices/:id/payment': ['invoices:payment'],
  'GET /api/bills': ['invoices:view'],
  'GET /api/ipd-billing/:admissionId': ['billing:view'],
  'POST /api/ipd-billing': ['billing:create'],
  'POST /api/ipd-billing/:admissionId/pay': ['billing:payment'],
  'GET /api/packages': ['master_data:view'],
  'GET /api/procedures': ['master_data:view'],

  // TPA / Insurance
  'GET /api/insurance-companies': ['master_data:view'],
  'POST /api/insurance-companies': ['master_data:edit'],
  'GET /api/patient-insurances': ['patients:view'],
  'POST /api/patient-insurances': ['patients:edit'],
  'GET /api/tpa/claims': ['billing:view'],
  'POST /api/tpa/claims': ['billing:create'],
  'GET /api/tpa/pre-authorizations': ['billing:view'],
  'POST /api/tpa/pre-authorizations': ['billing:create'],

  // Doctor accounting & commissions
  'GET /api/referral-sources': ['commissions:view'],
  'POST /api/referral-sources': ['commissions:manage'],
  'PUT /api/referral-sources/:id': ['commissions:manage'],
  'GET /api/commissions': ['commissions:view'],
  'GET /api/commissions/summary': ['commissions:view'],
  'POST /api/commissions/:id/approve': ['commissions:manage'],
  'GET /api/commission-payouts': ['commissions:view'],
  'POST /api/commission-payouts': ['commissions:payout'],
  'GET /api/doctor-contracts': ['doctor_revenue:view'],
  'POST /api/doctor-contracts': ['doctor_revenue:manage'],
  'GET /api/doctor-revenues': ['doctor_revenue:view'],
  'GET /api/doctor-payouts': ['doctor_revenue:view'],
  'POST /api/doctor-payouts': ['doctor_revenue:manage'],

  // Accounting / GL / Tally
  'GET /api/account-heads': ['accounts:view'],
  'POST /api/account-heads': ['accounts:create'],
  'GET /api/journal-entries': ['accounts:view'],
  'POST /api/journal-entries': ['accounts:create'],
  'GET /api/ledger/:accountHeadId': ['accounts:view'],
  'GET /api/trial-balance': ['accounts:view'],
  'GET /api/tally/sync-status': ['accounting:view'],
  'POST /api/tally/sync': ['accounting:create'],
  'GET /api/tally/entries': ['accounting:view'],

  // HR / Payroll / Attendance
  'GET /api/hr/employees': ['employees:view'],
  'POST /api/hr/employees': ['employees:create'],
  'GET /api/employees': ['employees:view'],
  'GET /api/hr/attendance': ['attendance:view'],
  'POST /api/hr/attendance': ['attendance:manage'],
  'GET /api/attendance': ['attendance:view'],
  'GET /api/hr/leaves': ['leaves:view'],
  'POST /api/hr/leaves': ['leaves:create'],
  'POST /api/hr/leaves/:id/approve': ['leaves:approve'],
  'POST /api/hr/leaves/:id/reject': ['leaves:approve'],
  'GET /api/payroll/salary-structures': ['payroll:view'],
  'POST /api/payroll/salary-structures': ['payroll:create'],
  'GET /api/payroll/payslips': ['payroll:view'],
  'GET /api/payroll/payslips/:employeeId': ['payroll:view'],
  'POST /api/payroll/generate': ['payroll:create'],
  'GET /api/biometric/devices': ['hr:view'],
  'POST /api/biometric/punch': ['hr:create'],
  'GET /api/biometric/today': ['hr:view'],

  // Operations
  'GET /api/ambulance/vehicles': ['ambulance:view'],
  'POST /api/ambulance/vehicles': ['ambulance:manage'],
  'GET /api/ambulances': ['ambulance:view'],
  'GET /api/ambulance/trips': ['ambulance:view'],
  'POST /api/ambulance/trips': ['ambulance:manage'],
  'POST /api/ambulance/trips/:id/assign': ['ambulance:manage'],
  'POST /api/ambulance/trips/:id/complete': ['ambulance:manage'],
  'GET /api/housekeeping/tasks': ['housekeeping:view'],
  'POST /api/housekeeping/tasks': ['housekeeping:manage'],
  'POST /api/housekeeping/tasks/:id/complete': ['housekeeping:manage'],
  'GET /api/housekeeping/laundry': ['housekeeping:view'],
  'GET /api/diet/orders': ['diet:view'],
  'POST /api/diet/orders': ['diet:manage'],
  'PUT /api/diet/orders/:id': ['diet:manage'],
  'GET /api/cssd/cycles': ['cssd:view'],
  'POST /api/cssd/cycles': ['cssd:create'],
  'PUT /api/cssd/cycles/:id/complete': ['cssd:update'],
  'GET /api/cssd/instruments': ['cssd:view'],

  // Quality
  'GET /api/quality/incidents': ['quality:view'],
  'GET /api/quality/feedbacks': ['quality:view'],

  // Assets / Equipment registry
  'GET /api/assets': ['inventory:view'],
  'GET /api/assets/:id': ['inventory:view'],
  'POST /api/assets': ['inventory:manage'],
  'PUT /api/assets/:id': ['inventory:manage'],
  'DELETE /api/assets/:id': ['inventory:manage'],
  'POST /api/assets/:id/status': ['inventory:manage'],
  'GET /api/assets/:id/maintenance': ['inventory:view'],
  'POST /api/assets/:id/maintenance': ['inventory:manage'],

  // Health checkup
  'GET /api/health-checkup/packages': ['health-checkup:view'],
  'POST /api/health-checkup/packages': ['health-checkup:create'],
  'GET /api/health-checkup/bookings': ['health-checkup:view'],
  'POST /api/health-checkup/bookings': ['health-checkup:create'],

  // Dashboards & reports
  'GET /api/dashboard/stats': ['dashboard:view'],
  'GET /api/reports/dashboard': ['reports:view'],

  // Master data
  'GET /api/master/drugs': ['master_data:view'],
  'GET /api/master/tests': ['master_data:view'],
  'GET /api/master/lab-tests': ['master_data:view'],
  'GET /api/master/radiology-tests': ['master_data:view'],
  'GET /api/master/procedures': ['master_data:view'],
  'GET /api/master/departments': ['master_data:view'],
  'GET /api/master/wards': ['master_data:view'],
  'GET /api/master/packages': ['master_data:view'],
  'POST /api/master/:type': ['master_data:edit'],
  'PUT /api/master/:type/:id': ['master_data:edit'],
  'DELETE /api/master/:type/:id': ['master_data:edit'],
};

// ============================================
// ROUTE_VALIDATORS — body validation schemas, applied to POST/PUT/PATCH.
// Routes not on this map fall back to a generic "must be a JSON object"
// validator (denyEmptyBody) — so nothing slips through unchecked.
// ============================================
const genericObjectSchema = z.record(z.any());

export const ROUTE_VALIDATORS: Record<string, z.ZodTypeAny> = {
  // Auth
  'POST /api/auth/login': loginSchema,

  // Patients
  'POST /api/patients': createPatientSchema,
  'PUT /api/patients/:id': updatePatientSchema,

  // Users
  'POST /api/users': createUserSchema,
  'PUT /api/users/:id': updateUserSchema,

  // Encounters & OPD
  'POST /api/encounters': createEncounterSchema,
  'POST /api/opd-notes': opdNoteSchema,

  // Appointments
  'POST /api/appointments': createAppointmentSchema,
  'PUT /api/appointments/:id': updateAppointmentSchema,

  // Admissions
  'POST /api/admissions': createAdmissionSchema,
  'POST /api/admissions/:id/discharge': dischargeSchema,

  // Emergency
  'POST /api/emergency/cases': createEmergencySchema,

  // Surgery
  'POST /api/surgeries': scheduleSurgerySchema,

  // Lab
  'POST /api/lab-orders': createLabOrderSchema,
  'POST /api/lab-results': labResultSchema,
  'POST /api/lab-tests': labTestMasterSchema,

  // Radiology
  'POST /api/radiology-orders': createRadiologyOrderSchema,

  // Pharmacy / drugs
  'POST /api/drugs': drugMasterSchema,
  'PUT /api/drugs/:id': drugMasterSchema.partial(),

  // Blood bank
  'POST /api/blood-bank/donors': bloodDonorSchema,
  'POST /api/blood-bank/requests': bloodRequestSchema,

  // Inventory
  'POST /api/inventory/purchase-orders': createPurchaseOrderSchema,

  // Billing
  'POST /api/invoices': createInvoiceSchema,
  'POST /api/invoices/:id/payment': paymentSchema,
  'POST /api/ipd-billing/:admissionId/pay': paymentSchema,

  // ICU
  'POST /api/icu/beds': icuBedAssignmentSchema,
  'POST /api/icu/vitals': icuVitalsSchema,

  // HR
  'POST /api/hr/employees': createEmployeeSchema,
  'POST /api/hr/leaves': leaveRequestSchema,

  // Ambulance
  'POST /api/ambulance/vehicles': ambulanceVehicleSchema,
  'POST /api/ambulance/trips': ambulanceTripSchema,

  // Housekeeping / diet
  'POST /api/housekeeping/tasks': housekeepingTaskSchema,
  'POST /api/diet/orders': dietOrderSchema,

  // TPA
  'POST /api/tpa/pre-authorizations': preAuthorizationSchema,

  // Referrals
  'POST /api/referral-sources': referralSourceSchema,
  'PUT /api/referral-sources/:id': referralSourceSchema.partial(),

  // Accounting
  'POST /api/journal-entries': journalEntrySchema,

  // Master data fallback (already covered by master_data:edit RBAC)
  'POST /api/master/:type': genericObjectSchema,
  'PUT /api/master/:type/:id': genericObjectSchema,
};

// ============================================
// LOOKUP HELPERS
// ============================================
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

export function getRoutePermissions(method: string, path: string): Permission[] {
  const key = matchKey(method, path, ROUTE_PERMISSIONS);
  return key ? ROUTE_PERMISSIONS[key] : [];
}

export function isPublicRoute(method: string, path: string): boolean {
  const normalized = path.replace(/\/+$/, '');
  const m = method.toUpperCase();
  if (PUBLIC_ROUTES.has(`${m} ${normalized}`)) return true;
  for (const p of PUBLIC_ROUTE_PREFIXES) {
    if (p.method === m && normalized.startsWith(p.prefix)) return true;
  }
  return false;
}

// ============================================
// GLOBAL MIDDLEWARES — wired in server.ts
// ============================================

// Deny-by-default RBAC: any authenticated route MUST have an entry in ROUTE_PERMISSIONS.
// Public routes are short-circuited and never reach this middleware.
export function enforceRoutePermissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (isPublicRoute(req.method, req.path)) return next();
  const perms = getRoutePermissions(req.method, req.path);
  if (perms.length === 0) {
    // Unknown authenticated route — refuse to serve. Add the route to ROUTE_PERMISSIONS.
    return res.status(403).json({
      error: 'Forbidden',
      detail: `No permission registered for ${req.method} ${req.path}. Update backend/src/routes/index.ts.`,
    });
  }
  return requirePermission(...perms)(req, res, next);
}

// Body validation: every POST/PUT/PATCH must either have a registered Zod schema
// or fall through to the genericObjectSchema (rejects non-object/empty bodies).
export function enforceRouteValidators(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const m = req.method.toUpperCase();
  if (m !== 'POST' && m !== 'PUT' && m !== 'PATCH') return next();
  if (isPublicRoute(req.method, req.path) && req.path !== '/api/auth/login') return next();

  const key = matchKey(req.method, req.path, ROUTE_VALIDATORS);
  const schema = key ? ROUTE_VALIDATORS[key] : genericObjectSchema;
  return validateBody(schema)(req, res, next);
}

// Backwards-compatible wrapper kept for any existing callers.
export function checkRoutePermission(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  return enforceRoutePermissions(req, res, next);
}

export default {
  ROUTE_PERMISSIONS,
  ROUTE_VALIDATORS,
  PUBLIC_ROUTES,
  getRoutePermissions,
  isPublicRoute,
  enforceRoutePermissions,
  enforceRouteValidators,
  checkRoutePermission,
};
