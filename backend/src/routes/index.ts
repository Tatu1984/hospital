/**
 * Route Configuration with Validation and RBAC
 *
 * This module defines route handlers with proper validation and permission checks
 * for all API endpoints.
 */

import { Router, Request, Response, NextFunction } from 'express';
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
  // Auth schemas
  loginSchema,
  // Patient schemas
  createPatientSchema,
  updatePatientSchema,
  searchSchema,
  idParamSchema,
  // Appointment schemas
  createAppointmentSchema,
  updateAppointmentSchema,
  // Encounter schemas
  createEncounterSchema,
  opdNoteSchema,
  // Prescription schemas
  createPrescriptionSchema,
  // Admission schemas
  createAdmissionSchema,
  dischargeSchema,
  // Lab schemas
  createLabOrderSchema,
  labResultSchema,
  // Radiology schemas
  createRadiologyOrderSchema,
  radiologyResultSchema,
  // Billing schemas
  createInvoiceSchema,
  paymentSchema,
  // Emergency schemas
  createEmergencySchema,
  // Surgery schemas
  scheduleSurgerySchema,
  // Blood Bank schemas
  bloodDonorSchema,
  bloodRequestSchema,
  // Inventory schemas
  createPurchaseOrderSchema,
  // HR schemas
  createEmployeeSchema,
  leaveRequestSchema,
  // ICU schemas
  icuVitalsSchema,
  icuBedAssignmentSchema,
  // Pharmacy schemas
  pharmacyDispenseSchema,
  drugMasterSchema,
  // Ambulance schemas
  ambulanceTripSchema,
  ambulanceVehicleSchema,
  // Housekeeping schemas
  housekeepingTaskSchema,
  // Diet schemas
  dietOrderSchema,
  // Quality schemas
  incidentReportSchema,
  // TPA schemas
  preAuthorizationSchema,
  // Referral schemas
  referralSourceSchema,
  // User schemas
  createUserSchema,
  updateUserSchema,
  // Accounting schemas
  journalEntrySchema,
  // Master data schemas
  labTestMasterSchema,
  procedureMasterSchema,
  wardMasterSchema,
} from '../validators';

// Route-to-Permission Mapping
export const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  // Patient routes
  'GET /api/patients': ['patients:view'],
  'POST /api/patients': ['patients:create'],
  'GET /api/patients/:id': ['patients:view'],
  'PUT /api/patients/:id': ['patients:edit'],

  // User/Doctor routes
  'GET /api/users': ['users:view'],
  'GET /api/doctors': ['patients:view'], // Anyone who can view patients can see doctor list

  // Encounter routes
  'POST /api/encounters': ['encounters:create'],
  'GET /api/encounters': ['encounters:view'],

  // OPD routes
  'POST /api/opd-notes': ['opd:create'],
  'GET /api/opd-notes/:encounterId': ['opd:view'],

  // Invoice/Billing routes
  'POST /api/invoices': ['invoices:create'],
  'GET /api/invoices': ['invoices:view'],
  'POST /api/invoices/:id/payment': ['invoices:payment'],

  // Dashboard routes
  'GET /api/dashboard/stats': ['dashboard:view'],

  // Referral/Commission routes
  'GET /api/referral-sources': ['commissions:view'],
  'POST /api/referral-sources': ['commissions:manage'],
  'PUT /api/referral-sources/:id': ['commissions:manage'],
  'GET /api/commissions': ['commissions:view'],
  'POST /api/commissions/:id/approve': ['commissions:manage'],
  'POST /api/commission-payouts': ['commissions:payout'],
  'GET /api/commission-payouts': ['commissions:view'],
  'GET /api/commissions/summary': ['commissions:view'],

  // Accounts routes
  'GET /api/account-heads': ['accounts:view'],
  'POST /api/account-heads': ['accounts:create'],
  'GET /api/journal-entries': ['accounts:view'],
  'POST /api/journal-entries': ['accounts:create'],
  'GET /api/ledger/:accountHeadId': ['accounts:view'],
  'GET /api/trial-balance': ['accounts:view'],

  // Doctor revenue routes
  'GET /api/doctor-contracts': ['doctor_revenue:view'],
  'POST /api/doctor-contracts': ['doctor_revenue:manage'],
  'GET /api/doctor-revenues': ['doctor_revenue:view'],
  'POST /api/doctor-payouts': ['doctor_revenue:manage'],
  'GET /api/doctor-payouts': ['doctor_revenue:view'],

  // Master data routes - Drugs
  'GET /api/drugs': ['master_data:view'],
  'POST /api/drugs': ['master_data:edit'],
  'PUT /api/drugs/:id': ['master_data:edit'],

  // Master data routes - Lab tests
  'GET /api/lab-tests': ['master_data:view'],
  'POST /api/lab-tests': ['master_data:edit'],

  // Master data routes - Radiology tests
  'GET /api/radiology-tests': ['master_data:view'],
  'POST /api/radiology-tests': ['master_data:edit'],

  // Master data routes - Procedures
  'GET /api/procedures': ['master_data:view'],

  // Master data routes - Packages
  'GET /api/packages': ['master_data:view'],

  // Master data routes - Wards
  'GET /api/wards': ['master_data:view'],

  // Appointment routes
  'GET /api/appointments': ['appointments:view'],
  'POST /api/appointments': ['appointments:create'],
  'PUT /api/appointments/:id': ['appointments:edit'],
  'DELETE /api/appointments/:id': ['appointments:delete'],
  'POST /api/appointments/:id/check-in': ['appointments:edit'],
  'POST /api/appointments/:id/cancel': ['appointments:edit'],

  // Lab routes
  'POST /api/lab-orders': ['lab_orders:create'],
  'GET /api/lab-orders': ['lab_orders:view'],
  'PUT /api/lab-orders/:id': ['lab_orders:update'],
  'POST /api/lab-results': ['lab_results:create'],

  // Radiology routes
  'POST /api/radiology-orders': ['radiology_orders:create'],
  'GET /api/radiology-orders': ['radiology_orders:view'],
  'PUT /api/radiology-orders/:id': ['radiology_orders:update'],

  // Pharmacy routes
  'GET /api/pharmacy/pending-prescriptions': ['pharmacy:view'],
  'GET /api/pharmacy/drugs': ['pharmacy:view'],
  'GET /api/pharmacy/stock': ['pharmacy:view'],

  // Admission/IPD routes
  'POST /api/admissions': ['admissions:create'],
  'GET /api/admissions': ['admissions:view'],
  'POST /api/admissions/:id/discharge': ['admissions:discharge'],
  'GET /api/beds': ['beds:view'],

  // Emergency routes
  'GET /api/emergency/cases': ['emergency:view'],
  'POST /api/emergency/cases': ['emergency:create'],
  'PUT /api/emergency/cases/:id': ['emergency:edit'],
  'POST /api/emergency/cases/:id/admit': ['emergency:admit'],
  'POST /api/emergency/cases/:id/discharge': ['emergency:discharge'],

  // ICU routes
  'GET /api/icu/beds': ['icu:view'],
  'POST /api/icu/beds': ['icu:create'],
  'POST /api/icu/vitals': ['icu_vitals:create'],
  'POST /api/icu/ventilator': ['icu:edit'],
  'GET /api/icu/patients': ['icu:view'],

  // Surgery/OT routes
  'GET /api/surgeries': ['surgery:view'],
  'POST /api/surgeries': ['surgery:schedule'],
  'GET /api/ot-rooms': ['ot:view'],
  'POST /api/ot-rooms': ['ot:create'],
  'POST /api/surgeries/:id/start': ['surgery:start'],
  'POST /api/surgeries/:id/complete': ['surgery:complete'],
  'POST /api/surgeries/:id/cancel': ['surgery:cancel'],

  // Blood Bank routes
  'GET /api/blood-bank/inventory': ['blood_bank:view'],
  'GET /api/blood-bank/donors': ['blood_donors:view'],
  'POST /api/blood-bank/donors': ['blood_donors:create'],
  'GET /api/blood-bank/requests': ['blood_requests:view'],
  'POST /api/blood-bank/requests': ['blood_requests:create'],
  'POST /api/blood-bank/requests/:id/cross-match': ['blood_bank:manage'],
  'POST /api/blood-bank/requests/:id/issue': ['blood_requests:issue'],

  // HR routes
  'GET /api/hr/employees': ['employees:view'],
  'POST /api/hr/employees': ['employees:create'],
  'GET /api/hr/attendance': ['attendance:view'],
  'POST /api/hr/attendance': ['attendance:manage'],
  'GET /api/hr/leaves': ['leaves:view'],
  'POST /api/hr/leaves': ['leaves:create'],
  'POST /api/hr/leaves/:id/approve': ['leaves:approve'],
  'POST /api/hr/leaves/:id/reject': ['leaves:approve'],

  // Inventory routes
  'GET /api/inventory/items': ['inventory:view'],
  'POST /api/inventory/items': ['inventory:manage'],
  'GET /api/inventory/purchase-orders': ['purchase_orders:view'],
  'POST /api/inventory/purchase-orders': ['purchase_orders:create'],
  'PUT /api/inventory/purchase-orders/:id': ['purchase_orders:approve'],

  // Ambulance routes
  'GET /api/ambulance/vehicles': ['ambulance:view'],
  'POST /api/ambulance/vehicles': ['ambulance:manage'],
  'GET /api/ambulance/trips': ['ambulance:view'],
  'POST /api/ambulance/trips': ['ambulance:manage'],
  'POST /api/ambulance/trips/:id/assign': ['ambulance:manage'],
  'POST /api/ambulance/trips/:id/complete': ['ambulance:manage'],

  // Housekeeping routes
  'GET /api/housekeeping/tasks': ['housekeeping:view'],
  'POST /api/housekeeping/tasks': ['housekeeping:manage'],
  'POST /api/housekeeping/tasks/:id/complete': ['housekeeping:manage'],
  'GET /api/housekeeping/laundry': ['housekeeping:view'],

  // Diet routes
  'GET /api/diet/orders': ['diet:view'],
  'POST /api/diet/orders': ['diet:manage'],
  'PUT /api/diet/orders/:id': ['diet:manage'],

  // Quality routes
  'GET /api/quality/incidents': ['quality:view'],
  'GET /api/quality/feedbacks': ['quality:view'],

  // Report routes
  'GET /api/reports/dashboard': ['reports:view'],

  // Nurse routes
  'GET /api/nurse/medications': ['nurse_station:view'],
  'GET /api/nurse/vitals': ['nurse_station:view'],

  // IPD Billing routes
  'GET /api/ipd-billing/:admissionId': ['billing:view'],
  'POST /api/ipd-billing': ['billing:create'],
  'POST /api/ipd-billing/:admissionId/pay': ['billing:payment'],
};

// Helper function to get permissions for a route
export function getRoutePermissions(method: string, path: string): Permission[] {
  // Normalize path (remove trailing slashes, etc.)
  const normalizedPath = path.replace(/\/+$/, '');

  // Try exact match first
  const exactKey = `${method.toUpperCase()} ${normalizedPath}`;
  if (ROUTE_PERMISSIONS[exactKey]) {
    return ROUTE_PERMISSIONS[exactKey];
  }

  // Try pattern matching (replace :param with regex)
  for (const [routeKey, permissions] of Object.entries(ROUTE_PERMISSIONS)) {
    const [routeMethod, routePath] = routeKey.split(' ');
    if (routeMethod !== method.toUpperCase()) continue;

    // Convert route path to regex pattern
    const pattern = routePath.replace(/:\w+/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);

    if (regex.test(normalizedPath)) {
      return permissions;
    }
  }

  return [];
}

// Middleware to check route permissions dynamically
export function checkRoutePermission(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const permissions = getRoutePermissions(req.method, req.path);

  if (permissions.length === 0) {
    // No permissions defined - allow (or deny based on policy)
    return next();
  }

  // Use the requirePermission middleware
  return requirePermission(...permissions)(req, res, next);
}

export default {
  ROUTE_PERMISSIONS,
  getRoutePermissions,
  checkRoutePermission,
};
