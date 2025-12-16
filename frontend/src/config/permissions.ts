/**
 * Role-based access control configuration
 * Aligned with backend RBAC system
 */

// All available roles - matching backend RBAC
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

// Legacy role mappings for backward compatibility
const LEGACY_ROLE_MAP: Record<string, Role> = {
  'RECEPTIONIST': 'FRONT_OFFICE',
  'FRONT_DESK': 'FRONT_OFFICE',
  'BILLING_STAFF': 'BILLING',
  'EMERGENCY_PHYSICIAN': 'EMERGENCY',
  'ICU_NURSE': 'ICU',
  'OT_COORDINATOR': 'OT',
  'IPD_COORDINATOR': 'IPD',
  'HR_MANAGER': 'HR',
  'STORE_MANAGER': 'INVENTORY',
  'ACCOUNTANT': 'BILLING',
};

// Normalize role name (handle legacy roles)
function normalizeRole(role: string): Role {
  if (LEGACY_ROLE_MAP[role]) {
    return LEGACY_ROLE_MAP[role];
  }
  return role as Role;
}

// Define which routes each role can access
export const rolePermissions: Record<Role, string[]> = {
  // ADMIN has access to everything
  ADMIN: ['*'],

  // DOCTOR - Clinical focus
  DOCTOR: [
    '/', 'patients', 'appointment', 'opd', 'opd-clinical', 'health-checkup',
    'laboratory', 'radiology', 'pathology', 'inpatient', 'emergency', 'icu',
    'operation-theatre', 'pharmacy', 'doctor-assistant', 'video-conversation',
    'nurse-station', 'mrd-management', 'dicom-pacs', 'billing'
  ],

  // NURSE - Patient care focus
  NURSE: [
    '/', 'patients', 'appointment', 'nurse-station', 'inpatient', 'emergency', 'icu',
    'laboratory', 'radiology', 'pharmacy', 'diet', 'blood-bank'
  ],

  // FRONT_OFFICE - Registration & Appointments
  FRONT_OFFICE: [
    '/', 'patients', 'appointment', 'billing', 'tpa', 'inpatient'
  ],

  // BILLING - Finance focus
  BILLING: [
    '/', 'patients', 'appointment', 'inpatient', 'billing', 'ipd-billing', 'tpa',
    'referral-commission', 'doctor-accounting', 'tally', 'mis-report'
  ],

  // LAB_TECH - Laboratory focus
  LAB_TECH: [
    '/', 'patients', 'laboratory', 'pathology', 'phlebotomy', 'inventory', 'mis-report'
  ],

  // RADIOLOGY_TECH - Radiology focus
  RADIOLOGY_TECH: [
    '/', 'patients', 'radiology', 'dicom-pacs', 'inventory', 'mis-report'
  ],

  // PHARMACIST - Pharmacy focus
  PHARMACIST: [
    '/', 'patients', 'pharmacy', 'inventory', 'store-management', 'billing', 'mis-report'
  ],

  // EMERGENCY - Emergency department
  EMERGENCY: [
    '/', 'patients', 'appointment', 'emergency', 'inpatient', 'laboratory',
    'radiology', 'pharmacy', 'blood-bank', 'ambulance', 'billing'
  ],

  // ICU - ICU staff
  ICU: [
    '/', 'patients', 'inpatient', 'icu', 'nurse-station', 'laboratory',
    'radiology', 'pharmacy', 'blood-bank', 'diet'
  ],

  // OT - Operation Theatre staff
  OT: [
    '/', 'patients', 'inpatient', 'operation-theatre', 'cssd', 'blood-bank',
    'equipment-maintenance', 'inventory'
  ],

  // IPD - Inpatient department
  IPD: [
    '/', 'patients', 'inpatient', 'inpatient-billing', 'nurse-station',
    'diet', 'housekeeping', 'billing'
  ],

  // HR - Human Resources
  HR: [
    '/', 'hr', 'payroll', 'biometric-attendance', 'doctor-registration', 'mis-report'
  ],

  // INVENTORY - Inventory management
  INVENTORY: [
    '/', 'inventory', 'store-management', 'asset-management',
    'equipment-maintenance', 'mis-report'
  ],

  // HOUSEKEEPING - Housekeeping staff
  HOUSEKEEPING: [
    '/', 'inpatient', 'housekeeping'
  ],

  // DIET - Kitchen/Diet staff
  DIET: [
    '/', 'patients', 'inpatient', 'diet'
  ],

  // AMBULANCE - Ambulance/Transport
  AMBULANCE: [
    '/', 'patients', 'emergency', 'ambulance'
  ],

  // BLOOD_BANK - Blood bank staff
  BLOOD_BANK: [
    '/', 'patients', 'blood-bank', 'inventory', 'mis-report'
  ],

  // QUALITY - Quality management
  QUALITY: [
    '/', 'quality', 'mis-report'
  ],
};

// Check if a user with given roles can access a route
export function canAccessRoute(userRoles: string[], route: string): boolean {
  // Remove leading slash for comparison
  const normalizedRoute = route.replace(/^\//, '') || '/';

  for (const role of userRoles) {
    // Normalize role name to handle legacy roles
    const normalizedRoleName = normalizeRole(role);
    const permissions = rolePermissions[normalizedRoleName];
    if (!permissions) continue;

    // Admin has access to everything
    if (permissions.includes('*')) return true;

    // Check if the route is in the allowed list
    if (permissions.includes(normalizedRoute)) return true;
    if (normalizedRoute === '' && permissions.includes('/')) return true;
  }

  return false;
}

// Get all accessible routes for a user
export function getAccessibleRoutes(userRoles: string[]): string[] {
  const routes = new Set<string>();

  for (const role of userRoles) {
    // Normalize role name to handle legacy roles
    const normalizedRoleName = normalizeRole(role);
    const permissions = rolePermissions[normalizedRoleName];
    if (!permissions) continue;

    if (permissions.includes('*')) {
      // Return all routes for admin
      return ['*'];
    }

    permissions.forEach(route => routes.add(route));
  }

  return Array.from(routes);
}

// Export the normalize function for use elsewhere
export { normalizeRole };
