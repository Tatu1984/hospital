import { Response, NextFunction } from 'express';

// Define all available roles
export type Role =
  // Line-staff roles (individual contributors)
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
  // Executive / department leadership
  | 'OPS_MANAGER'
  | 'MEDICAL_DIRECTOR'
  | 'NURSING_DIRECTOR'
  // Mid-management (each is the senior of an existing line role)
  | 'DEPARTMENT_HEAD'
  | 'NURSE_MANAGER'
  | 'LAB_MANAGER'
  | 'RADIOLOGY_MANAGER'
  | 'PHARMACY_MANAGER'
  | 'OT_MANAGER'
  | 'ER_INCHARGE'
  | 'BILLING_MANAGER'
  | 'FRONT_DESK_LEAD'
  // Cross-cutting / specialty
  | 'TEAM_LEAD'
  | 'AUDITOR'
  | 'TPA_COORDINATOR'
  | 'PROCUREMENT_OFFICER';

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
  | 'billing:view' | 'billing:create' | 'billing:edit' | 'billing:payment'
  | 'invoices:view' | 'invoices:create' | 'invoices:payment'
  // Applying discounts (percent or flat) on an invoice. Gated separately
  // from invoices:create/edit so the hospital can grant create-bills to
  // front-desk staff but reserve discounting to a smaller approver group.
  | 'invoices:discount'
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

  // Dialysis
  | 'dialysis:view' | 'dialysis:create' | 'dialysis:update' | 'dialysis:manage'

  // Mortuary
  | 'mortuary:view' | 'mortuary:create' | 'mortuary:update' | 'mortuary:manage'

  // Physiotherapy
  | 'physio:view' | 'physio:create' | 'physio:update'

  // Pathology
  | 'pathology:view' | 'pathology:create' | 'pathology:update'

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
    'billing:view', 'billing:create', 'billing:edit', 'billing:payment',
    'invoices:view', 'invoices:create', 'invoices:payment', 'invoices:discount',
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
    'dialysis:view', 'dialysis:create', 'dialysis:update', 'dialysis:manage',
    'mortuary:view', 'mortuary:create', 'mortuary:update', 'mortuary:manage',
    'physio:view', 'physio:create', 'physio:update',
    'pathology:view', 'pathology:create', 'pathology:update',
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
    'dialysis:view', 'dialysis:create', 'dialysis:update',
    'physio:view', 'physio:create', 'physio:update',
    'pathology:view', 'pathology:create', 'pathology:update',
    'mortuary:view', 'mortuary:create',
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
    'billing:view', 'billing:create', 'billing:payment',
    // Front desk accepts part-payments on the IPD running invoice
    // during a stay — the family typically settles in instalments
    // before discharge. Discount authority is deliberately withheld
    // here (BILLING + ADMIN only).
    'invoices:view', 'invoices:create', 'invoices:payment',
    'health-checkup:view', 'health-checkup:create',
  ],

  // BILLING - Finance focus
  BILLING: [
    'dashboard:view',
    'patients:view',
    'appointments:view',
    'admissions:view',
    'billing:view', 'billing:create', 'billing:edit', 'billing:payment',
    'invoices:view', 'invoices:create', 'invoices:payment', 'invoices:discount',
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

  // ===========================================================================
  // MANAGEMENT / SUPERVISORY ROLES
  // ===========================================================================
  // Each management role is named for its real-world equivalent in a hospital
  // org chart. The permission lists below are conservative: managers get the
  // VIEW of everything their line staff touches, plus targeted write perms
  // appropriate to their authority (e.g. NURSE_MANAGER can approve leave;
  // BILLING_MANAGER can apply discounts). Tighten or loosen per-user via the
  // extra/revoked permissions feature on the User model. ADMIN remains the
  // catch-all super-user; do not add ADMIN-level perms here.

  // OPS_MANAGER (COO) — operations dashboard + cross-module visibility.
  // No clinical writes. They run the hospital but don't practise medicine.
  OPS_MANAGER: [
    'dashboard:view', 'analytics:view', 'reports:view', 'reports:export',
    'patients:view',
    'appointments:view',
    'encounters:view',
    'opd:view',
    'ipd:view', 'admissions:view', 'beds:view', 'nurse_station:view',
    'emergency:view',
    'icu:view',
    'ot:view', 'surgery:view',
    'lab:view', 'lab_orders:view', 'lab_results:view',
    'radiology:view', 'radiology_orders:view',
    'pharmacy:view',
    'blood_bank:view', 'blood_donors:view', 'blood_requests:view',
    'billing:view', 'invoices:view',
    'accounts:view', 'commissions:view', 'doctor_revenue:view',
    'hr:view', 'employees:view', 'attendance:view', 'leaves:view',
    'inventory:view', 'purchase_orders:view',
    'housekeeping:view', 'diet:view', 'ambulance:view', 'quality:view',
    'health-checkup:view', 'phlebotomy:view',
    'cssd:view', 'dialysis:view', 'mortuary:view', 'physio:view', 'pathology:view',
    'master_data:view', 'system:view', 'users:view',
  ],

  // MEDICAL_DIRECTOR (CMO) — leads the doctor body. Full clinical view +
  // targeted writes (review/cancel surgeries, approve doctor contracts).
  MEDICAL_DIRECTOR: [
    'dashboard:view', 'analytics:view', 'reports:view', 'reports:export',
    'patients:view', 'patients:edit',
    'appointments:view', 'appointments:edit',
    'opd:view', 'opd:create', 'opd:edit',
    'encounters:view', 'encounters:create',
    'prescriptions:view', 'prescriptions:create',
    'ipd:view', 'ipd:edit',
    'admissions:view', 'admissions:discharge',
    'beds:view',
    'nurse_station:view',
    'emergency:view', 'emergency:edit',
    'icu:view', 'icu:edit',
    'ot:view', 'ot:edit',
    'surgery:view', 'surgery:schedule', 'surgery:complete', 'surgery:cancel',
    'lab:view', 'lab_orders:view', 'lab_orders:create', 'lab_results:view',
    'radiology:view', 'radiology_orders:view', 'radiology_orders:create',
    'pharmacy:view',
    'health-checkup:view', 'health-checkup:edit',
    'dialysis:view', 'pathology:view', 'physio:view',
    'doctor_revenue:view', 'doctor_revenue:manage',
    'master_data:view', 'master_data:edit',
    'users:view',
  ],

  // NURSING_DIRECTOR (CNO) — heads nursing across all wards. Full nursing
  // perms + ward management + leave approval for nursing staff.
  NURSING_DIRECTOR: [
    'dashboard:view', 'analytics:view', 'reports:view', 'reports:export',
    'patients:view', 'patients:edit',
    'appointments:view',
    'ipd:view', 'ipd:edit',
    'admissions:view',
    'beds:view', 'beds:manage',
    'nurse_station:view', 'nurse_station:edit',
    'emergency:view',
    'icu:view', 'icu:edit',
    'icu_vitals:view', 'icu_vitals:create',
    'ot:view',
    'diet:view', 'diet:manage',
    'housekeeping:view',
    'hr:view', 'employees:view', 'attendance:view', 'attendance:manage',
    'leaves:view', 'leaves:approve',
    'master_data:view',
  ],

  // DEPARTMENT_HEAD (HOD) — senior doctor with department-scoped management.
  // Same clinical perms as DOCTOR plus team visibility + master data for
  // their department's procedures.
  DEPARTMENT_HEAD: [
    'dashboard:view', 'reports:view', 'reports:export', 'analytics:view',
    'patients:view', 'patients:edit',
    'appointments:view', 'appointments:create', 'appointments:edit',
    'opd:view', 'opd:create', 'opd:edit',
    'encounters:view', 'encounters:create',
    'prescriptions:view', 'prescriptions:create',
    'ipd:view', 'ipd:create', 'ipd:edit',
    'admissions:view', 'admissions:create', 'admissions:discharge',
    'beds:view',
    'emergency:view',
    'icu:view',
    'ot:view', 'surgery:view', 'surgery:schedule', 'surgery:complete',
    'lab:view', 'lab_orders:view', 'lab_orders:create', 'lab_results:view',
    'radiology:view', 'radiology_orders:view', 'radiology_orders:create',
    'pharmacy:view',
    'doctor_revenue:view',
    'master_data:view', 'master_data:edit',
    'hr:view', 'employees:view', 'attendance:view',
    'leaves:view', 'leaves:approve',
    'users:view',
  ],

  // NURSE_MANAGER / Ward In-charge — supervises a ward. All nurse perms
  // plus bed management and leave approval for their team.
  NURSE_MANAGER: [
    'dashboard:view', 'reports:view',
    'patients:view',
    'appointments:view',
    'ipd:view', 'ipd:edit',
    'admissions:view', 'admissions:discharge',
    'beds:view', 'beds:manage',
    'nurse_station:view', 'nurse_station:edit',
    'emergency:view',
    'icu:view', 'icu_vitals:view', 'icu_vitals:create',
    'ot:view',
    'lab:view', 'lab_orders:view',
    'radiology:view', 'radiology_orders:view',
    'pharmacy:view',
    'diet:view',
    'hr:view', 'employees:view', 'attendance:view', 'attendance:manage',
    'leaves:view', 'leaves:approve',
    'master_data:view',
  ],

  // LAB_MANAGER — senior LAB_TECH; owns lab master data and reporting.
  LAB_MANAGER: [
    'dashboard:view', 'reports:view', 'reports:export', 'analytics:view',
    'patients:view',
    'lab:view', 'lab:create', 'lab:edit',
    'lab_orders:view', 'lab_orders:create', 'lab_orders:update',
    'lab_results:view', 'lab_results:create',
    'phlebotomy:view', 'phlebotomy:create', 'phlebotomy:update',
    'pathology:view', 'pathology:create', 'pathology:update',
    'inventory:view',
    'purchase_orders:view', 'purchase_orders:create',
    'billing:view', 'invoices:view', 'invoices:create',
    'master_data:view', 'master_data:edit',
    'hr:view', 'employees:view', 'attendance:view',
    'leaves:view', 'leaves:approve',
  ],

  // RADIOLOGY_MANAGER — senior RADIOLOGY_TECH.
  RADIOLOGY_MANAGER: [
    'dashboard:view', 'reports:view', 'reports:export', 'analytics:view',
    'patients:view',
    'radiology:view', 'radiology:create', 'radiology:edit',
    'radiology_orders:view', 'radiology_orders:create', 'radiology_orders:update',
    'inventory:view',
    'purchase_orders:view', 'purchase_orders:create',
    'billing:view', 'invoices:view', 'invoices:create',
    'master_data:view', 'master_data:edit',
    'hr:view', 'employees:view', 'attendance:view',
    'leaves:view', 'leaves:approve',
  ],

  // PHARMACY_MANAGER — pharmacy ops + inventory + POs (approval authority).
  PHARMACY_MANAGER: [
    'dashboard:view', 'reports:view', 'reports:export', 'analytics:view',
    'patients:view',
    'prescriptions:view',
    'pharmacy:view', 'pharmacy:dispense', 'pharmacy:manage',
    'inventory:view', 'inventory:manage',
    'purchase_orders:view', 'purchase_orders:create', 'purchase_orders:approve',
    'billing:view', 'invoices:view', 'invoices:create',
    'master_data:view', 'master_data:edit',
    'hr:view', 'employees:view', 'attendance:view',
    'leaves:view', 'leaves:approve',
  ],

  // OT_MANAGER / OT In-charge — runs the operation theatre rota.
  OT_MANAGER: [
    'dashboard:view', 'reports:view', 'reports:export', 'analytics:view',
    'patients:view',
    'ot:view', 'ot:create', 'ot:edit',
    'surgery:view', 'surgery:schedule', 'surgery:start', 'surgery:complete', 'surgery:cancel',
    'admissions:view', 'beds:view',
    'cssd:view', 'cssd:manage',
    'inventory:view',
    'purchase_orders:view',
    'billing:view',
    'master_data:view',
    'hr:view', 'employees:view', 'attendance:view',
    'leaves:view', 'leaves:approve',
  ],

  // ER_INCHARGE — emergency department lead. All ER perms + admit/discharge
  // authority + ability to admit to IPD or ICU directly.
  ER_INCHARGE: [
    'dashboard:view', 'reports:view',
    'patients:view', 'patients:create', 'patients:edit',
    'appointments:view', 'appointments:create',
    'emergency:view', 'emergency:create', 'emergency:edit', 'emergency:admit', 'emergency:discharge',
    'ipd:view', 'ipd:create',
    'admissions:view', 'admissions:create',
    'beds:view', 'beds:manage',
    'icu:view', 'icu:create',
    'lab:view', 'lab_orders:view', 'lab_orders:create',
    'radiology:view', 'radiology_orders:view', 'radiology_orders:create',
    'blood_bank:view', 'blood_requests:view', 'blood_requests:create',
    'pharmacy:view',
    'billing:view', 'billing:create',
    'invoices:view', 'invoices:create',
    'ambulance:view',
    'hr:view', 'employees:view', 'attendance:view',
    'leaves:view', 'leaves:approve',
    'master_data:view',
  ],

  // BILLING_MANAGER — finance lead. Full billing perms incl. discount
  // authority and analytics.
  BILLING_MANAGER: [
    'dashboard:view', 'reports:view', 'reports:export', 'analytics:view',
    'patients:view',
    'appointments:view',
    'admissions:view',
    'billing:view', 'billing:create', 'billing:edit', 'billing:payment',
    'invoices:view', 'invoices:create', 'invoices:payment', 'invoices:discount',
    'accounts:view', 'accounts:create', 'accounts:edit',
    'accounting:view', 'accounting:create', 'accounting:edit',
    'commissions:view', 'commissions:manage', 'commissions:payout',
    'doctor_revenue:view', 'doctor_revenue:manage',
    'master_data:view',
    'hr:view', 'employees:view', 'attendance:view',
    'leaves:view', 'leaves:approve',
  ],

  // FRONT_DESK_LEAD — reception supervisor. Front office perms + invoicing +
  // visibility into their team's attendance.
  FRONT_DESK_LEAD: [
    'dashboard:view', 'reports:view',
    'patients:view', 'patients:create', 'patients:edit',
    'appointments:view', 'appointments:create', 'appointments:edit', 'appointments:delete',
    'encounters:view', 'encounters:create',
    'admissions:view',
    'beds:view',
    'billing:view', 'billing:create', 'billing:payment',
    'invoices:view', 'invoices:create', 'invoices:payment',
    'health-checkup:view', 'health-checkup:create',
    'ambulance:view',
    'master_data:view',
    'hr:view', 'employees:view', 'attendance:view',
    'leaves:view', 'leaves:approve',
  ],

  // TEAM_LEAD — generic team lead. Cross-module read + leave approval.
  // Operationally, the per-user extra-permissions flow tops this up with
  // whichever domain the lead actually owns.
  TEAM_LEAD: [
    'dashboard:view', 'reports:view', 'analytics:view',
    'patients:view',
    'hr:view', 'employees:view',
    'attendance:view', 'attendance:manage',
    'leaves:view', 'leaves:approve',
    'master_data:view',
  ],

  // AUDITOR / COMPLIANCE — read-only across every clinical, financial, and
  // ops module. Never grant any :create/:edit/:manage permission here; this
  // is the safety guarantee of the role.
  AUDITOR: [
    'dashboard:view', 'analytics:view', 'reports:view', 'reports:export',
    'patients:view',
    'appointments:view',
    'encounters:view',
    'prescriptions:view',
    'opd:view',
    'ipd:view', 'admissions:view', 'beds:view', 'nurse_station:view',
    'emergency:view',
    'icu:view', 'icu_vitals:view',
    'ot:view', 'surgery:view',
    'lab:view', 'lab_orders:view', 'lab_results:view',
    'radiology:view', 'radiology_orders:view',
    'blood_bank:view', 'blood_donors:view', 'blood_requests:view',
    'pharmacy:view',
    'billing:view',
    'invoices:view',
    'accounts:view', 'accounting:view',
    'commissions:view', 'doctor_revenue:view',
    'hr:view', 'employees:view', 'attendance:view', 'leaves:view',
    'payroll:view',
    'inventory:view', 'purchase_orders:view',
    'housekeeping:view', 'diet:view', 'ambulance:view', 'quality:view',
    'health-checkup:view', 'phlebotomy:view',
    'cssd:view', 'dialysis:view', 'mortuary:view', 'physio:view', 'pathology:view',
    'master_data:view', 'system:view', 'users:view',
  ],

  // TPA_COORDINATOR — insurance + pre-auth + claims liaison.
  TPA_COORDINATOR: [
    'dashboard:view', 'reports:view',
    'patients:view',
    'appointments:view',
    'admissions:view',
    'opd:view', 'ipd:view',
    'lab_results:view',
    'radiology_orders:view',
    'billing:view',
    'invoices:view', 'invoices:create',
    'accounts:view',
    'master_data:view',
  ],

  // PROCUREMENT_OFFICER — vendor + PO lifecycle owner.
  PROCUREMENT_OFFICER: [
    'dashboard:view', 'reports:view', 'reports:export',
    'inventory:view', 'inventory:manage',
    'purchase_orders:view', 'purchase_orders:create', 'purchase_orders:approve',
    'accounts:view',
    'master_data:view', 'master_data:edit',
    'hr:view', 'employees:view',
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
  // Birth records reuse the IPD permission family — maternity workflow
  // sits in the same ward/ipd context.
  '/birth-records': ['ipd:view'],
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

// =====================================================================
// DB-backed role cache.
//
// Roles used to be a hardcoded TS map (ROLE_PERMISSIONS above). They're
// now rows in the `roles` table so admins can create/edit/delete custom
// roles without a code change. To keep the existing sync API of the
// hasPermission / requirePermission middleware, we cache the role →
// permissions mapping in memory and refresh it on boot + after any
// role mutation. The hardcoded ROLE_PERMISSIONS above is treated as
// the seed defaults: on boot we make sure each system role exists in
// the DB and matches its hardcoded permission list, then load the DB
// rows into the cache.
// =====================================================================

// In-memory cache. Keys are role IDs (string), values are permission
// arrays. Populated by loadRoleCache() at boot and after writes.
let rolePermissionsCache: Record<string, Permission[]> = { ...ROLE_PERMISSIONS } as any;

export function getCachedRolePermissions(roleId: string): Permission[] | undefined {
  return rolePermissionsCache[roleId];
}

export function getAllCachedRoles(): Array<{ id: string; permissions: Permission[] }> {
  return Object.entries(rolePermissionsCache).map(([id, permissions]) => ({ id, permissions }));
}

// Refresh the cache from the DB. Call this after any mutation to a
// role (create / update / delete). The seedSystemRoles function is
// invoked first so the cache always sees the seeded baseline even on
// a fresh database.
export async function loadRoleCache(prisma: any): Promise<void> {
  await seedSystemRoles(prisma);
  const rows = await prisma.role.findMany({ where: { isActive: true } });
  const next: Record<string, Permission[]> = {};
  for (const r of rows) next[r.id] = r.permissions as Permission[];
  // Fall back to hardcoded defaults for any role missing in the DB
  // (e.g. ADMIN before seedSystemRoles runs successfully on first boot).
  for (const [id, perms] of Object.entries(ROLE_PERMISSIONS)) {
    if (!next[id]) next[id] = perms as Permission[];
  }
  rolePermissionsCache = next;
}

// Idempotent insert of the system roles. Re-run on every boot — only
// inserts rows that don't already exist. After first run, admins can
// edit the permissions list freely; subsequent boots won't overwrite
// their changes (we only insert rows that are absent).
export async function seedSystemRoles(prisma: any): Promise<void> {
  const SYSTEM_ROLE_LABELS: Record<string, string> = {
    // Line staff
    ADMIN: 'Administrator',
    DOCTOR: 'Doctor',
    NURSE: 'Nurse',
    FRONT_OFFICE: 'Front Office',
    BILLING: 'Billing',
    LAB_TECH: 'Lab Technician',
    RADIOLOGY_TECH: 'Radiology Technician',
    PHARMACIST: 'Pharmacist',
    EMERGENCY: 'Emergency',
    ICU: 'ICU',
    OT: 'Operation Theatre',
    IPD: 'IPD Coordinator',
    HR: 'HR Manager',
    INVENTORY: 'Inventory Manager',
    HOUSEKEEPING: 'Housekeeping',
    DIET: 'Diet & Kitchen',
    AMBULANCE: 'Ambulance',
    BLOOD_BANK: 'Blood Bank',
    QUALITY: 'Quality',
    // Executive
    OPS_MANAGER: 'Operations Manager (COO)',
    MEDICAL_DIRECTOR: 'Medical Director (CMO)',
    NURSING_DIRECTOR: 'Nursing Director (CNO)',
    // Mid-management
    DEPARTMENT_HEAD: 'Department Head (HOD)',
    NURSE_MANAGER: 'Nurse Manager / Ward In-charge',
    LAB_MANAGER: 'Laboratory Manager',
    RADIOLOGY_MANAGER: 'Radiology Manager',
    PHARMACY_MANAGER: 'Pharmacy Manager',
    OT_MANAGER: 'OT Manager',
    ER_INCHARGE: 'ER In-charge',
    BILLING_MANAGER: 'Billing Manager',
    FRONT_DESK_LEAD: 'Front Desk Lead',
    // Cross-cutting
    TEAM_LEAD: 'Team Lead',
    AUDITOR: 'Auditor / Compliance',
    TPA_COORDINATOR: 'TPA Coordinator',
    PROCUREMENT_OFFICER: 'Procurement Officer',
  };
  for (const [id, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const existing = await prisma.role.findUnique({ where: { id } });
    if (existing) continue;
    await prisma.role.create({
      data: {
        id,
        name: SYSTEM_ROLE_LABELS[id] || id,
        description: `Seeded system role — ${id}`,
        permissions: perms as string[],
        isSystem: true,
        isActive: true,
      },
    });
  }
}

// Helper function to check if user has a specific permission. Now
// honors per-user extra/revoked permission overrides if a third arg
// is passed; existing callers that only pass roleIds keep working.
export function hasPermission(
  userRoles: string[],
  permission: Permission,
  overrides?: { extras?: string[]; revoked?: string[] },
): boolean {
  if (overrides?.revoked?.includes(permission as string)) return false;
  if (overrides?.extras?.includes(permission as string)) return true;
  for (const role of userRoles) {
    const rolePermissions = rolePermissionsCache[role];
    if (rolePermissions && rolePermissions.includes(permission)) return true;
  }
  return false;
}

// Helper function to check if user has any of the specified permissions.
// Optional overrides arg makes per-user grants/revocations effective at the
// route-level RBAC gate (dynamicRBAC), not just at the per-handler middleware.
export function hasAnyPermission(
  userRoles: string[],
  permissions: Permission[],
  overrides?: { extras?: string[]; revoked?: string[] },
): boolean {
  return permissions.some(permission => hasPermission(userRoles, permission, overrides));
}

// Helper function to check if user has all of the specified permissions
export function hasAllPermissions(
  userRoles: string[],
  permissions: Permission[],
  overrides?: { extras?: string[]; revoked?: string[] },
): boolean {
  return permissions.every(permission => hasPermission(userRoles, permission, overrides));
}

// Get all permissions for a user based on their roles + optional
// per-user extra/revoked overrides. revoked wins over extras.
export function getUserPermissions(
  userRoles: string[],
  overrides?: { extras?: string[]; revoked?: string[] },
): Permission[] {
  const permissions = new Set<Permission>();
  for (const role of userRoles) {
    const rolePermissions = rolePermissionsCache[role];
    if (rolePermissions) rolePermissions.forEach(p => permissions.add(p));
  }
  if (overrides?.extras) overrides.extras.forEach(p => permissions.add(p as Permission));
  if (overrides?.revoked) overrides.revoked.forEach(p => permissions.delete(p as Permission));
  return Array.from(permissions);
}

// Middleware to require specific permission(s). Honors the user's
// per-user overrides written to req.user by the auth middleware.
export function requirePermission(...permissions: Permission[]) {
  return (req: any, res: Response, next: NextFunction) => {
    const userRoles = req.user?.roleIds || [];
    const overrides = {
      extras: req.user?.extraPermissions || [],
      revoked: req.user?.revokedPermissions || [],
    };
    const hasAny = permissions.some((p) => hasPermission(userRoles, p, overrides));
    if (!hasAny) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to perform this action',
        required: permissions
      });
    }
    next();
  };
}

// Master list of every defined permission, used by the admin UI to
// render a checklist when creating/editing roles. This stays in code
// because the Permission union type is what the route registry checks
// against — adding a permission requires both adding it here and using
// it on a route, both of which are code changes.
export function listAllPermissions(): { code: Permission; group: string }[] {
  // Heuristic grouping: split on first colon.
  const seen = new Set<string>();
  const all: Permission[] = [];
  for (const perms of Object.values(ROLE_PERMISSIONS)) {
    for (const p of perms) {
      if (typeof p === 'string' && !seen.has(p) && (p as string) !== '*') {
        seen.add(p);
        all.push(p);
      }
    }
  }
  // Plus a curated extra list for permissions that may not yet be on
  // any seeded role but are referenced by the route registry.
  const extras: Permission[] = [
    'dialysis:view', 'dialysis:create', 'dialysis:update', 'dialysis:manage',
    'mortuary:view', 'mortuary:create', 'mortuary:update', 'mortuary:manage',
    'physio:view', 'physio:create', 'physio:update',
    'pathology:view', 'pathology:create', 'pathology:update',
    'phlebotomy:view', 'phlebotomy:create', 'phlebotomy:update',
  ];
  for (const p of extras) {
    if (!seen.has(p)) { seen.add(p); all.push(p); }
  }
  return all
    .map((code) => ({ code, group: typeof code === 'string' && code.includes(':') ? code.split(':')[0] : 'other' }))
    .sort((a, b) => a.group.localeCompare(b.group) || a.code.localeCompare(b.code));
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
