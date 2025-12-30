import { Response, NextFunction } from 'express';

// Define all available roles
export type Role =
  | 'ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'FRONT_OFFICE'
  | 'BILLING'
  | 'LAB_TECH'
  | 'RADIOLOGY_TECH'
  | 'PHARMACIST'
  | 'EMERGENCY'
  | 'ICU'
  | 'OT'
  | 'IPD'
  | 'HR'
  | 'INVENTORY'
  | 'HOUSEKEEPING'
  | 'DIET'
  | 'AMBULANCE'
  | 'BLOOD_BANK'
  | 'QUALITY';

// Define permission categories
export type Permission =
  // Dashboard & Core
  | 'dashboard:view'
  | 'patients:view' | 'patients:create' | 'patients:edit'
  | 'appointments:view' | 'appointments:create' | 'appointments:edit' | 'appointments:delete'

  // Clinical - OPD
  | 'opd:view' | 'opd:create' | 'opd:edit'
  | 'encounters:view' | 'encounters:create'
  | 'prescriptions:view' | 'prescriptions:create'

  // Clinical - IPD
  | 'ipd:view' | 'ipd:create' | 'ipd:edit'
  | 'admissions:view' | 'admissions:create' | 'admissions:discharge'
  | 'beds:view' | 'beds:manage'
  | 'nurse_station:view' | 'nurse_station:edit'

  // Emergency
  | 'emergency:view' | 'emergency:create' | 'emergency:edit' | 'emergency:admit' | 'emergency:discharge'

  // ICU
  | 'icu:view' | 'icu:create' | 'icu:edit'
  | 'icu_vitals:view' | 'icu_vitals:create'

  // OT / Surgery
  | 'ot:view' | 'ot:create' | 'ot:edit'
  | 'surgery:view' | 'surgery:schedule' | 'surgery:start' | 'surgery:complete' | 'surgery:cancel'

  // Diagnostics - Laboratory
  | 'lab:view' | 'lab:create' | 'lab:edit'
  | 'lab_orders:view' | 'lab_orders:create' | 'lab_orders:update'
  | 'lab_results:view' | 'lab_results:create'

  // Diagnostics - Radiology
  | 'radiology:view' | 'radiology:create' | 'radiology:edit'
  | 'radiology_orders:view' | 'radiology_orders:create' | 'radiology_orders:update'

  // Blood Bank
  | 'blood_bank:view' | 'blood_bank:manage'
  | 'blood_donors:view' | 'blood_donors:create'
  | 'blood_requests:view' | 'blood_requests:create' | 'blood_requests:issue'

  // Pharmacy
  | 'pharmacy:view' | 'pharmacy:dispense' | 'pharmacy:manage'

  // Billing & Finance
  | 'billing:view' | 'billing:create' | 'billing:edit' | 'billing:payment' | 'billing:refund'
  | 'invoices:view' | 'invoices:create' | 'invoices:payment'
  | 'accounts:view' | 'accounts:create' | 'accounts:edit'
  | 'commissions:view' | 'commissions:manage' | 'commissions:payout'
  | 'doctor_revenue:view' | 'doctor_revenue:manage'

  // Operations - HR
  | 'hr:view' | 'hr:manage'
  | 'employees:view' | 'employees:create' | 'employees:edit'
  | 'attendance:view' | 'attendance:manage'
  | 'leaves:view' | 'leaves:create' | 'leaves:approve'

  // Operations - Inventory
  | 'inventory:view' | 'inventory:manage'
  | 'purchase_orders:view' | 'purchase_orders:create' | 'purchase_orders:approve'

  // Operations - Housekeeping
  | 'housekeeping:view' | 'housekeeping:manage'

  // Operations - Diet/Kitchen
  | 'diet:view' | 'diet:manage'

  // Operations - Ambulance
  | 'ambulance:view' | 'ambulance:manage'

  // Quality
  | 'quality:view' | 'quality:manage'

  // Health Checkup
  | 'health-checkup:view' | 'health-checkup:create' | 'health-checkup:edit'

  // Phlebotomy
  | 'phlebotomy:view' | 'phlebotomy:create' | 'phlebotomy:update'

  // Payroll
  | 'payroll:view' | 'payroll:create' | 'payroll:edit'

  // Accounting/Tally
  | 'accounting:view' | 'accounting:create' | 'accounting:edit'

  // CSSD
  | 'cssd:view' | 'cssd:create' | 'cssd:update' | 'cssd:manage'

  // HR Extended (already have hr:view and hr:manage)
  | 'hr:create'

  // Reports & Analytics
  | 'reports:view' | 'reports:export'
  | 'analytics:view'

  // Master Data & System
  | 'master_data:view' | 'master_data:edit'
  | 'system:view' | 'system:manage'
  | 'users:view' | 'users:manage';

// Role to Permissions mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // ADMIN has all permissions
  ADMIN: [
    'dashboard:view',
    'patients:view', 'patients:create', 'patients:edit',
    'appointments:view', 'appointments:create', 'appointments:edit', 'appointments:delete',
    'opd:view', 'opd:create', 'opd:edit',
    'encounters:view', 'encounters:create',
    'prescriptions:view', 'prescriptions:create',
    'ipd:view', 'ipd:create', 'ipd:edit',
    'admissions:view', 'admissions:create', 'admissions:discharge',
    'beds:view', 'beds:manage',
    'nurse_station:view', 'nurse_station:edit',
    'emergency:view', 'emergency:create', 'emergency:edit', 'emergency:admit', 'emergency:discharge',
    'icu:view', 'icu:create', 'icu:edit',
    'icu_vitals:view', 'icu_vitals:create',
    'ot:view', 'ot:create', 'ot:edit',
    'surgery:view', 'surgery:schedule', 'surgery:start', 'surgery:complete', 'surgery:cancel',
    'lab:view', 'lab:create', 'lab:edit',
    'lab_orders:view', 'lab_orders:create', 'lab_orders:update',
    'lab_results:view', 'lab_results:create',
    'radiology:view', 'radiology:create', 'radiology:edit',
    'radiology_orders:view', 'radiology_orders:create', 'radiology_orders:update',
    'blood_bank:view', 'blood_bank:manage',
    'blood_donors:view', 'blood_donors:create',
    'blood_requests:view', 'blood_requests:create', 'blood_requests:issue',
    'pharmacy:view', 'pharmacy:dispense', 'pharmacy:manage',
    'billing:view', 'billing:create', 'billing:edit', 'billing:payment', 'billing:refund',
    'invoices:view', 'invoices:create', 'invoices:payment',
    'accounts:view', 'accounts:create', 'accounts:edit',
    'commissions:view', 'commissions:manage', 'commissions:payout',
    'doctor_revenue:view', 'doctor_revenue:manage',
    'hr:view', 'hr:manage', 'hr:create',
    'employees:view', 'employees:create', 'employees:edit',
    'attendance:view', 'attendance:manage',
    'leaves:view', 'leaves:create', 'leaves:approve',
    'inventory:view', 'inventory:manage',
    'purchase_orders:view', 'purchase_orders:create', 'purchase_orders:approve',
    'housekeeping:view', 'housekeeping:manage',
    'diet:view', 'diet:manage',
    'ambulance:view', 'ambulance:manage',
    'quality:view', 'quality:manage',
    'health-checkup:view', 'health-checkup:create', 'health-checkup:edit',
    'phlebotomy:view', 'phlebotomy:create', 'phlebotomy:update',
    'payroll:view', 'payroll:create', 'payroll:edit',
    'accounting:view', 'accounting:create', 'accounting:edit',
    'cssd:view', 'cssd:create', 'cssd:update', 'cssd:manage',
    'reports:view', 'reports:export',
    'analytics:view',
    'master_data:view', 'master_data:edit',
    'system:view', 'system:manage',
    'users:view', 'users:manage',
  ],

  // DOCTOR - Clinical focus
  DOCTOR: [
    'dashboard:view',
    'patients:view', 'patients:create', 'patients:edit',
    'appointments:view', 'appointments:create', 'appointments:edit',
    'opd:view', 'opd:create', 'opd:edit',
    'encounters:view', 'encounters:create',
    'prescriptions:view', 'prescriptions:create',
    'ipd:view', 'ipd:create',
    'admissions:view', 'admissions:create', 'admissions:discharge',
    'beds:view',
    'nurse_station:view',
    'emergency:view', 'emergency:create', 'emergency:edit',
    'icu:view',
    'icu_vitals:view',
    'ot:view',
    'surgery:view', 'surgery:schedule',
    'lab:view',
    'lab_orders:view', 'lab_orders:create',
    'lab_results:view',
    'radiology:view',
    'radiology_orders:view', 'radiology_orders:create',
    'blood_bank:view',
    'blood_requests:view', 'blood_requests:create',
    'pharmacy:view',
    'billing:view',
    'invoices:view',
    'health-checkup:view', 'health-checkup:create',
    'reports:view',
  ],

  // NURSE - Patient care focus
  NURSE: [
    'dashboard:view',
    'patients:view',
    'appointments:view',
    'opd:view',
    'encounters:view',
    'prescriptions:view',
    'ipd:view',
    'admissions:view',
    'beds:view',
    'nurse_station:view', 'nurse_station:edit',
    'icu:view',
    'icu_vitals:view', 'icu_vitals:create',
    'lab:view',
    'lab_orders:view',
    'lab_results:view',
    'radiology:view',
    'radiology_orders:view',
    'blood_bank:view',
    'blood_requests:view',
    'pharmacy:view',
    'diet:view',
  ],

  // FRONT_OFFICE - Registration & Appointments
  FRONT_OFFICE: [
    'dashboard:view',
    'patients:view', 'patients:create', 'patients:edit',
    'appointments:view', 'appointments:create', 'appointments:edit', 'appointments:delete',
    'encounters:view', 'encounters:create',
    'admissions:view',
    'beds:view',
    'billing:view', 'billing:create',
    'invoices:view', 'invoices:create',
    'health-checkup:view', 'health-checkup:create',
  ],

  // BILLING - Finance focus
  BILLING: [
    'dashboard:view',
    'patients:view',
    'appointments:view',
    'admissions:view',
    'billing:view', 'billing:create', 'billing:edit', 'billing:payment', 'billing:refund',
    'invoices:view', 'invoices:create', 'invoices:payment',
    'accounts:view', 'accounts:create',
    'accounting:view', 'accounting:create', 'accounting:edit',
    'commissions:view', 'commissions:manage', 'commissions:payout',
    'doctor_revenue:view', 'doctor_revenue:manage',
    'reports:view', 'reports:export',
  ],

  // LAB_TECH - Laboratory focus
  LAB_TECH: [
    'dashboard:view',
    'patients:view',
    'lab:view', 'lab:create', 'lab:edit',
    'lab_orders:view', 'lab_orders:create', 'lab_orders:update',
    'lab_results:view', 'lab_results:create',
    'phlebotomy:view', 'phlebotomy:create', 'phlebotomy:update',
    'inventory:view',
    'reports:view',
  ],

  // RADIOLOGY_TECH - Radiology focus
  RADIOLOGY_TECH: [
    'dashboard:view',
    'patients:view',
    'radiology:view', 'radiology:create', 'radiology:edit',
    'radiology_orders:view', 'radiology_orders:create', 'radiology_orders:update',
    'inventory:view',
    'reports:view',
  ],

  // PHARMACIST - Pharmacy focus
  PHARMACIST: [
    'dashboard:view',
    'patients:view',
    'prescriptions:view',
    'pharmacy:view', 'pharmacy:dispense', 'pharmacy:manage',
    'inventory:view', 'inventory:manage',
    'purchase_orders:view', 'purchase_orders:create',
    'billing:view', 'billing:create',
    'invoices:view', 'invoices:create',
    'reports:view',
  ],

  // EMERGENCY - Emergency department
  EMERGENCY: [
    'dashboard:view',
    'patients:view', 'patients:create', 'patients:edit',
    'appointments:view', 'appointments:create',
    'emergency:view', 'emergency:create', 'emergency:edit', 'emergency:admit', 'emergency:discharge',
    'admissions:view', 'admissions:create',
    'beds:view',
    'lab:view',
    'lab_orders:view', 'lab_orders:create',
    'radiology:view',
    'radiology_orders:view', 'radiology_orders:create',
    'blood_bank:view',
    'blood_requests:view', 'blood_requests:create',
    'pharmacy:view',
    'billing:view', 'billing:create',
    'ambulance:view',
  ],

  // ICU - ICU staff
  ICU: [
    'dashboard:view',
    'patients:view',
    'ipd:view',
    'admissions:view',
    'beds:view', 'beds:manage',
    'nurse_station:view', 'nurse_station:edit',
    'icu:view', 'icu:create', 'icu:edit',
    'icu_vitals:view', 'icu_vitals:create',
    'lab:view',
    'lab_orders:view', 'lab_orders:create',
    'radiology:view',
    'radiology_orders:view', 'radiology_orders:create',
    'blood_bank:view',
    'blood_requests:view', 'blood_requests:create',
    'pharmacy:view',
    'diet:view',
  ],

  // OT - Operation Theatre staff
  OT: [
    'dashboard:view',
    'patients:view',
    'ipd:view',
    'admissions:view',
    'beds:view',
    'ot:view', 'ot:create', 'ot:edit',
    'surgery:view', 'surgery:schedule', 'surgery:start', 'surgery:complete', 'surgery:cancel',
    'blood_bank:view',
    'blood_requests:view', 'blood_requests:create',
    'inventory:view',
    'cssd:view', 'cssd:create', 'cssd:update',
  ],

  // IPD - Inpatient department
  IPD: [
    'dashboard:view',
    'patients:view',
    'ipd:view', 'ipd:create', 'ipd:edit',
    'admissions:view', 'admissions:create', 'admissions:discharge',
    'beds:view', 'beds:manage',
    'nurse_station:view', 'nurse_station:edit',
    'diet:view', 'diet:manage',
    'housekeeping:view',
    'billing:view',
  ],

  // HR - Human Resources
  HR: [
    'dashboard:view',
    'hr:view', 'hr:manage', 'hr:create',
    'employees:view', 'employees:create', 'employees:edit',
    'attendance:view', 'attendance:manage',
    'leaves:view', 'leaves:create', 'leaves:approve',
    'payroll:view', 'payroll:create', 'payroll:edit',
    'reports:view', 'reports:export',
    'users:view',
  ],

  // INVENTORY - Inventory management
  INVENTORY: [
    'dashboard:view',
    'inventory:view', 'inventory:manage',
    'purchase_orders:view', 'purchase_orders:create', 'purchase_orders:approve',
    'cssd:view', 'cssd:create', 'cssd:update', 'cssd:manage',
    'reports:view',
  ],

  // HOUSEKEEPING - Housekeeping staff
  HOUSEKEEPING: [
    'dashboard:view',
    'beds:view',
    'housekeeping:view', 'housekeeping:manage',
  ],

  // DIET - Kitchen/Diet staff
  DIET: [
    'dashboard:view',
    'patients:view',
    'admissions:view',
    'diet:view', 'diet:manage',
  ],

  // AMBULANCE - Ambulance/Transport
  AMBULANCE: [
    'dashboard:view',
    'patients:view',
    'emergency:view',
    'ambulance:view', 'ambulance:manage',
  ],

  // BLOOD_BANK - Blood bank staff
  BLOOD_BANK: [
    'dashboard:view',
    'patients:view',
    'blood_bank:view', 'blood_bank:manage',
    'blood_donors:view', 'blood_donors:create',
    'blood_requests:view', 'blood_requests:create', 'blood_requests:issue',
    'inventory:view',
    'reports:view',
  ],

  // QUALITY - Quality management
  QUALITY: [
    'dashboard:view',
    'quality:view', 'quality:manage',
    'reports:view', 'reports:export',
  ],
};

// Route to module mapping for frontend navigation
export const ROUTE_MODULES: Record<string, Permission[]> = {
  '/': ['dashboard:view'],
  '/patients': ['patients:view'],
  '/appointment': ['appointments:view'],
  '/opd': ['opd:view'],
  '/health-checkup': ['opd:view'],
  '/laboratory': ['lab:view'],
  '/radiology': ['radiology:view'],
  '/pathology': ['lab:view'],
  '/phlebotomy': ['lab:view'],
  '/inpatient': ['ipd:view'],
  '/inpatient-billing': ['billing:view', 'ipd:view'],
  '/nurse-station': ['nurse_station:view'],
  '/emergency': ['emergency:view'],
  '/icu': ['icu:view'],
  '/operation-theatre': ['ot:view'],
  '/blood-bank': ['blood_bank:view'],
  '/pharmacy': ['pharmacy:view'],
  '/ambulance': ['ambulance:view'],
  '/housekeeping': ['housekeeping:view'],
  '/diet': ['diet:view'],
  '/quality': ['quality:view'],
  '/cssd': ['inventory:view'],
  '/physiotherapy': ['opd:view'],
  '/mortuary': ['ipd:view'],
  '/billing': ['billing:view'],
  '/ipd-billing': ['billing:view'],
  '/referral-commission': ['commissions:view'],
  '/tpa': ['billing:view'],
  '/doctor-accounting': ['doctor_revenue:view'],
  '/tally': ['accounts:view'],
  '/inventory': ['inventory:view'],
  '/store-management': ['inventory:view'],
  '/asset-management': ['inventory:view'],
  '/equipment-maintenance': ['inventory:view'],
  '/medical-device': ['inventory:view'],
  '/opd-clinical': ['opd:view'],
  '/doctor-assistant': ['opd:view'],
  '/mrd-management': ['patients:view'],
  '/video-conversation': ['opd:view'],
  '/dicom-pacs': ['radiology:view'],
  '/hr': ['hr:view'],
  '/payroll': ['hr:view'],
  '/biometric-attendance': ['attendance:view'],
  '/doctor-registration': ['users:view'],
  '/mis-report': ['reports:view'],
  '/master-data': ['master_data:view'],
  '/software-management': ['system:view'],
  '/system-control': ['system:manage'],
};

// Helper function to check if user has a specific permission
export function hasPermission(userRoles: string[], permission: Permission): boolean {
  for (const role of userRoles) {
    const rolePermissions = ROLE_PERMISSIONS[role as Role];
    if (rolePermissions && rolePermissions.includes(permission)) {
      return true;
    }
  }
  return false;
}

// Helper function to check if user has any of the specified permissions
export function hasAnyPermission(userRoles: string[], permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRoles, permission));
}

// Helper function to check if user has all of the specified permissions
export function hasAllPermissions(userRoles: string[], permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRoles, permission));
}

// Get all permissions for a user based on their roles
export function getUserPermissions(userRoles: string[]): Permission[] {
  const permissions = new Set<Permission>();
  for (const role of userRoles) {
    const rolePermissions = ROLE_PERMISSIONS[role as Role];
    if (rolePermissions) {
      rolePermissions.forEach(p => permissions.add(p));
    }
  }
  return Array.from(permissions);
}

// Middleware to require specific permission(s)
export function requirePermission(...permissions: Permission[]) {
  return (req: any, res: Response, next: NextFunction) => {
    const userRoles = req.user?.roleIds || [];

    if (!hasAnyPermission(userRoles, permissions)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to perform this action',
        required: permissions
      });
    }

    next();
  };
}

// Middleware to require specific role(s)
export function requireRole(...roles: Role[]) {
  return (req: any, res: Response, next: NextFunction) => {
    const userRoles = req.user?.roleIds || [];

    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have the required role',
        required: roles
      });
    }

    next();
  };
}

// Export permissions list for frontend
export function getPermissionsConfig() {
  return {
    roles: Object.keys(ROLE_PERMISSIONS),
    routeModules: ROUTE_MODULES,
  };
}
