/**
 * Role-based access control configuration
 * Aligned with backend RBAC system
 */

// All available roles - matching backend RBAC. Keep this list in sync
// with backend/src/rbac.ts Role union and SYSTEM_ROLE_LABELS — the backend
// is the source of truth, this file controls which sidebar routes each
// role can navigate to.
export type Role =
  // Line staff
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
  | 'QUALITY'
  // Executive
  | 'OPS_MANAGER'
  | 'MEDICAL_DIRECTOR'
  | 'NURSING_DIRECTOR'
  // Mid-management
  | 'DEPARTMENT_HEAD'
  | 'NURSE_MANAGER'
  | 'LAB_MANAGER'
  | 'RADIOLOGY_MANAGER'
  | 'PHARMACY_MANAGER'
  | 'OT_MANAGER'
  | 'ER_INCHARGE'
  | 'BILLING_MANAGER'
  | 'FRONT_DESK_LEAD'
  // Cross-cutting
  | 'TEAM_LEAD'
  | 'AUDITOR'
  | 'TPA_COORDINATOR'
  | 'PROCUREMENT_OFFICER';

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
    '/', 'live-dashboard', 'patients', 'appointment', 'opd', 'opd-clinical', 'health-checkup',
    'laboratory', 'radiology', 'pathology', 'inpatient', 'emergency', 'icu',
    'operation-theatre', 'pharmacy', 'doctor-assistant', 'video-conversation',
    'nurse-station', 'mrd-management', 'dicom-pacs', 'billing',
    // My Earnings — doctor's personal payout/finance page.
    'my-earnings',
    // New clinical modules
    'dialysis', 'physiotherapy', 'mortuary', 'birth-records',
  ],

  // NURSE - Patient care focus
  NURSE: [
    '/', 'live-dashboard', 'patients', 'appointment', 'nurse-station', 'inpatient', 'emergency', 'icu',
    'laboratory', 'radiology', 'pharmacy', 'diet', 'blood-bank', 'birth-records'
  ],

  // FRONT_OFFICE - Registration & Appointments
  FRONT_OFFICE: [
    '/', 'live-dashboard', 'patients', 'appointment', 'billing', 'tpa', 'inpatient'
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
    '/', 'inventory', 'store-management', 'asset-management', 'assets',
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
    '/', 'quality', 'mis-report', 'audit-log', 'activity-monitor'
  ],

  // ===========================================================================
  // MANAGEMENT / SUPERVISORY ROUTE ACCESS
  // ===========================================================================
  // Each management role's route list is curated to match its backend
  // permission set in backend/src/rbac.ts. Sidebar gating here is a
  // navigability hint — the backend still enforces per-endpoint
  // permissions, so a UI gap won't translate to a security gap (and
  // vice versa: appearing in the sidebar without backend perms shows
  // an Access Denied screen on click).

  // OPS_MANAGER (COO) — operations oversight. Read-access across the
  // hospital; backend gates any clinical write.
  OPS_MANAGER: [
    '/', 'live-dashboard', 'patients', 'appointment',
    'opd', 'inpatient', 'inpatient-billing', 'nurse-station',
    'emergency', 'icu', 'operation-theatre',
    'laboratory', 'radiology', 'pathology', 'pharmacy',
    'blood-bank', 'ambulance', 'dialysis',
    'housekeeping', 'diet', 'mortuary', 'birth-records',
    'hr', 'payroll', 'biometric-attendance',
    'inventory', 'store-management', 'asset-management', 'assets',
    'equipment-maintenance',
    'billing', 'ipd-billing', 'tpa', 'referral-commission',
    'doctor-accounting', 'tally',
    'mis-report', 'quality', 'audit-log', 'activity-monitor',
  ],

  // MEDICAL_DIRECTOR (CMO) — clinical leadership across all modules.
  MEDICAL_DIRECTOR: [
    '/', 'live-dashboard', 'patients', 'appointment',
    'opd', 'opd-clinical', 'health-checkup',
    'laboratory', 'radiology', 'pathology',
    'inpatient', 'emergency', 'icu', 'operation-theatre',
    'pharmacy', 'doctor-assistant', 'video-conversation',
    'nurse-station', 'mrd-management', 'dicom-pacs',
    'billing', 'dialysis', 'physiotherapy', 'mortuary', 'birth-records',
    'doctor-registration', 'mis-report',
  ],

  // NURSING_DIRECTOR (CNO) — nursing operations + ward management.
  NURSING_DIRECTOR: [
    '/', 'live-dashboard', 'patients', 'appointment',
    'nurse-station', 'inpatient', 'icu', 'emergency',
    'laboratory', 'radiology', 'pharmacy',
    'diet', 'blood-bank', 'housekeeping',
    'hr', 'biometric-attendance', 'mis-report',
  ],

  // DEPARTMENT_HEAD (HOD) — like DOCTOR + dept-scoped admin.
  DEPARTMENT_HEAD: [
    '/', 'live-dashboard', 'patients', 'appointment',
    'opd', 'opd-clinical', 'health-checkup',
    'laboratory', 'radiology', 'pathology',
    'inpatient', 'emergency', 'icu', 'operation-theatre',
    'pharmacy', 'doctor-assistant', 'nurse-station',
    'mrd-management', 'billing', 'my-earnings',
    'dialysis', 'physiotherapy',
    'hr', 'biometric-attendance', 'mis-report',
  ],

  // NURSE_MANAGER — ward in-charge.
  NURSE_MANAGER: [
    '/', 'live-dashboard', 'patients', 'appointment',
    'nurse-station', 'inpatient', 'emergency', 'icu',
    'laboratory', 'radiology', 'pharmacy', 'diet', 'blood-bank',
    'hr', 'biometric-attendance', 'mis-report',
  ],

  // LAB_MANAGER — lab tech routes + master data ownership.
  LAB_MANAGER: [
    '/', 'live-dashboard', 'patients',
    'laboratory', 'pathology', 'phlebotomy',
    'inventory', 'mis-report',
    'hr', 'biometric-attendance',
  ],

  // RADIOLOGY_MANAGER — same pattern for radiology.
  RADIOLOGY_MANAGER: [
    '/', 'live-dashboard', 'patients',
    'radiology', 'dicom-pacs',
    'inventory', 'mis-report',
    'hr', 'biometric-attendance',
  ],

  // PHARMACY_MANAGER — pharmacy + inventory + PO approval.
  PHARMACY_MANAGER: [
    '/', 'live-dashboard', 'patients',
    'pharmacy', 'inventory', 'store-management',
    'billing', 'mis-report',
    'hr', 'biometric-attendance',
  ],

  // OT_MANAGER — operation theatre rota.
  OT_MANAGER: [
    '/', 'live-dashboard', 'patients',
    'inpatient', 'operation-theatre', 'cssd',
    'blood-bank', 'equipment-maintenance', 'inventory',
    'mis-report', 'hr', 'biometric-attendance',
  ],

  // ER_INCHARGE — emergency department lead.
  ER_INCHARGE: [
    '/', 'live-dashboard', 'patients', 'appointment',
    'emergency', 'inpatient', 'icu',
    'laboratory', 'radiology', 'pharmacy',
    'blood-bank', 'ambulance',
    'billing', 'hr', 'biometric-attendance', 'mis-report',
  ],

  // BILLING_MANAGER — finance lead.
  BILLING_MANAGER: [
    '/', 'live-dashboard', 'patients', 'appointment',
    'inpatient', 'billing', 'ipd-billing', 'tpa',
    'referral-commission', 'doctor-accounting', 'tally',
    'mis-report', 'hr', 'biometric-attendance',
  ],

  // FRONT_DESK_LEAD — reception supervisor.
  FRONT_DESK_LEAD: [
    '/', 'live-dashboard', 'patients', 'appointment',
    'billing', 'tpa', 'inpatient', 'ambulance',
    'hr', 'biometric-attendance', 'mis-report',
  ],

  // TEAM_LEAD — generic supervisor. Per-user extras (granted via the
  // admin Users page) top this up with whichever domain the lead owns.
  TEAM_LEAD: [
    '/', 'live-dashboard', 'mis-report',
    'hr', 'biometric-attendance',
  ],

  // AUDITOR / COMPLIANCE — read-only across every module. Wildcard at
  // the route level is fine because the BACKEND enforces no-write
  // semantics; the AUDITOR role has zero :create/:edit/:manage perms,
  // so even if they click Edit the API refuses.
  AUDITOR: ['*'],

  // TPA_COORDINATOR — insurance + pre-auth + claims liaison.
  TPA_COORDINATOR: [
    '/', 'patients', 'appointment', 'inpatient',
    'billing', 'tpa', 'mis-report',
  ],

  // PROCUREMENT_OFFICER — vendor + PO lifecycle.
  PROCUREMENT_OFFICER: [
    '/', 'inventory', 'store-management',
    'asset-management', 'assets', 'equipment-maintenance',
    'mis-report',
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
