import { describe, it, expect } from 'vitest';
import {
  ROLE_PERMISSIONS,
  getUserPermissions,
  Role,
  Permission,
} from '../rbac';

describe('RBAC System', () => {
  describe('ROLE_PERMISSIONS', () => {
    it('should define permissions for all roles', () => {
      const roles: Role[] = [
        'ADMIN', 'DOCTOR', 'NURSE', 'FRONT_OFFICE', 'BILLING',
        'LAB_TECH', 'RADIOLOGY_TECH', 'PHARMACIST', 'EMERGENCY',
        'ICU', 'OT', 'IPD', 'HR', 'INVENTORY', 'HOUSEKEEPING',
        'DIET', 'AMBULANCE', 'BLOOD_BANK', 'QUALITY'
      ];

      roles.forEach(role => {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
        expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
      });
    });

    it('should give ADMIN all permissions', () => {
      const adminPerms = ROLE_PERMISSIONS['ADMIN'];
      expect(adminPerms).toContain('dashboard:view');
      expect(adminPerms).toContain('patients:view');
      expect(adminPerms).toContain('patients:create');
      expect(adminPerms).toContain('patients:edit');
      expect(adminPerms).toContain('system:manage');
      expect(adminPerms).toContain('users:manage');
    });

    it('should give DOCTOR clinical permissions', () => {
      const doctorPerms = ROLE_PERMISSIONS['DOCTOR'];
      expect(doctorPerms).toContain('opd:view');
      expect(doctorPerms).toContain('opd:create');
      expect(doctorPerms).toContain('prescriptions:create');
      expect(doctorPerms).toContain('encounters:create');
    });

    it('should NOT give DOCTOR admin permissions', () => {
      const doctorPerms = ROLE_PERMISSIONS['DOCTOR'];
      expect(doctorPerms).not.toContain('system:manage');
      expect(doctorPerms).not.toContain('users:manage');
    });

    it('should give NURSE patient care permissions', () => {
      const nursePerms = ROLE_PERMISSIONS['NURSE'];
      expect(nursePerms).toContain('patients:view');
      expect(nursePerms).toContain('nurse_station:view');
      expect(nursePerms).toContain('nurse_station:edit');
    });

    it('should give FRONT_OFFICE registration permissions', () => {
      const frontOfficePerms = ROLE_PERMISSIONS['FRONT_OFFICE'];
      expect(frontOfficePerms).toContain('patients:view');
      expect(frontOfficePerms).toContain('patients:create');
      expect(frontOfficePerms).toContain('appointments:create');
    });

    it('should give BILLING payment permissions', () => {
      const billingPerms = ROLE_PERMISSIONS['BILLING'];
      expect(billingPerms).toContain('billing:view');
      expect(billingPerms).toContain('billing:create');
      expect(billingPerms).toContain('invoices:payment');
    });

    it('should give LAB_TECH laboratory permissions', () => {
      const labPerms = ROLE_PERMISSIONS['LAB_TECH'];
      expect(labPerms).toContain('lab:view');
      expect(labPerms).toContain('lab_orders:view');
      expect(labPerms).toContain('lab_results:create');
    });

    it('should give PHARMACIST dispensing permissions', () => {
      const pharmacistPerms = ROLE_PERMISSIONS['PHARMACIST'];
      expect(pharmacistPerms).toContain('pharmacy:view');
      expect(pharmacistPerms).toContain('pharmacy:dispense');
    });

    it('should give EMERGENCY triage permissions', () => {
      const emergencyPerms = ROLE_PERMISSIONS['EMERGENCY'];
      expect(emergencyPerms).toContain('emergency:view');
      expect(emergencyPerms).toContain('emergency:create');
      expect(emergencyPerms).toContain('emergency:admit');
    });

    it('should give ICU critical care permissions', () => {
      const icuPerms = ROLE_PERMISSIONS['ICU'];
      expect(icuPerms).toContain('icu:view');
      expect(icuPerms).toContain('icu:create');
      expect(icuPerms).toContain('icu_vitals:create');
    });

    it('should give OT surgery permissions', () => {
      const otPerms = ROLE_PERMISSIONS['OT'];
      expect(otPerms).toContain('ot:view');
      expect(otPerms).toContain('surgery:view');
      expect(otPerms).toContain('surgery:start');
    });

    it('should give HR employee management permissions', () => {
      const hrPerms = ROLE_PERMISSIONS['HR'];
      expect(hrPerms).toContain('hr:view');
      expect(hrPerms).toContain('hr:manage');
      expect(hrPerms).toContain('employees:view');
      expect(hrPerms).toContain('employees:create');
    });

    it('should give INVENTORY stock management permissions', () => {
      const inventoryPerms = ROLE_PERMISSIONS['INVENTORY'];
      expect(inventoryPerms).toContain('inventory:view');
      expect(inventoryPerms).toContain('inventory:manage');
      expect(inventoryPerms).toContain('purchase_orders:create');
    });

    it('should give BLOOD_BANK donation/transfusion permissions', () => {
      const bloodBankPerms = ROLE_PERMISSIONS['BLOOD_BANK'];
      expect(bloodBankPerms).toContain('blood_bank:view');
      expect(bloodBankPerms).toContain('blood_donors:create');
      expect(bloodBankPerms).toContain('blood_requests:issue');
    });

    it('should give QUALITY incident management permissions', () => {
      const qualityPerms = ROLE_PERMISSIONS['QUALITY'];
      expect(qualityPerms).toContain('quality:view');
      expect(qualityPerms).toContain('quality:manage');
    });
  });

  describe('getUserPermissions', () => {
    it('should return permissions for single role', () => {
      const permissions = getUserPermissions(['DOCTOR']);
      expect(permissions).toContain('opd:view');
      expect(permissions).toContain('prescriptions:create');
    });

    it('should merge permissions for multiple roles', () => {
      const permissions = getUserPermissions(['DOCTOR', 'NURSE']);
      // Should have doctor permissions
      expect(permissions).toContain('prescriptions:create');
      // Should have nurse permissions
      expect(permissions).toContain('nurse_station:edit');
    });

    it('should deduplicate permissions from multiple roles', () => {
      const permissions = getUserPermissions(['ADMIN', 'DOCTOR']);
      // Count dashboard:view occurrences
      const dashboardCount = permissions.filter(p => p === 'dashboard:view').length;
      expect(dashboardCount).toBe(1);
    });

    it('should return empty array for empty roles', () => {
      const permissions = getUserPermissions([]);
      expect(permissions).toEqual([]);
    });

    it('should handle unknown roles gracefully', () => {
      // @ts-ignore - Testing runtime behavior with invalid role
      const permissions = getUserPermissions(['UNKNOWN_ROLE']);
      expect(Array.isArray(permissions)).toBe(true);
    });
  });

  describe('Permission Categories', () => {
    it('should have view permission for each module', () => {
      const viewPermissions: Permission[] = [
        'dashboard:view',
        'patients:view',
        'appointments:view',
        'opd:view',
        'ipd:view',
        'emergency:view',
        'icu:view',
        'ot:view',
        'lab:view',
        'radiology:view',
        'pharmacy:view',
        'billing:view',
        'hr:view',
        'inventory:view',
        'housekeeping:view',
        'diet:view',
        'ambulance:view',
        'blood_bank:view',
        'quality:view',
      ];

      const adminPerms = ROLE_PERMISSIONS['ADMIN'];
      viewPermissions.forEach(perm => {
        expect(adminPerms).toContain(perm);
      });
    });

    it('should follow permission naming convention', () => {
      const allPermissions = Object.values(ROLE_PERMISSIONS).flat();
      const uniquePermissions = [...new Set(allPermissions)];

      uniquePermissions.forEach(perm => {
        // Permission should be in format module:action (allows hyphens)
        expect(perm).toMatch(/^[a-z_-]+:[a-z_]+$/);
      });
    });
  });

  describe('Role Hierarchy', () => {
    it('should ensure ADMIN has more permissions than other roles', () => {
      const adminCount = ROLE_PERMISSIONS['ADMIN'].length;

      Object.entries(ROLE_PERMISSIONS).forEach(([role, perms]) => {
        if (role !== 'ADMIN') {
          expect(perms.length).toBeLessThanOrEqual(adminCount);
        }
      });
    });

    it('should ensure clinical roles have patient access', () => {
      const clinicalRoles: Role[] = ['DOCTOR', 'NURSE', 'ICU', 'EMERGENCY', 'OT'];

      clinicalRoles.forEach(role => {
        expect(ROLE_PERMISSIONS[role]).toContain('patients:view');
      });
    });
  });

  describe('Security Constraints', () => {
    it('should restrict system:manage to ADMIN only', () => {
      Object.entries(ROLE_PERMISSIONS).forEach(([role, perms]) => {
        if (role !== 'ADMIN') {
          expect(perms).not.toContain('system:manage');
        }
      });
    });

    it('should restrict users:manage to ADMIN only', () => {
      Object.entries(ROLE_PERMISSIONS).forEach(([role, perms]) => {
        if (role !== 'ADMIN') {
          expect(perms).not.toContain('users:manage');
        }
      });
    });

    it('should restrict master_data:edit to limited roles', () => {
      const rolesWithMasterEdit = Object.entries(ROLE_PERMISSIONS)
        .filter(([_, perms]) => perms.includes('master_data:edit'))
        .map(([role]) => role);

      // Only ADMIN should be able to edit master data
      expect(rolesWithMasterEdit).toContain('ADMIN');
      expect(rolesWithMasterEdit.length).toBeLessThanOrEqual(2);
    });
  });
});

describe('Permission Utility Functions', () => {
  describe('getUserPermissions edge cases', () => {
    it('should handle role array with duplicates', () => {
      const permissions = getUserPermissions(['DOCTOR', 'DOCTOR']);
      const uniquePerms = [...new Set(permissions)];
      expect(permissions.length).toBe(uniquePerms.length);
    });

    it('should return permissions sorted consistently', () => {
      const perms1 = getUserPermissions(['DOCTOR', 'NURSE']);
      const perms2 = getUserPermissions(['NURSE', 'DOCTOR']);

      // Should contain same permissions regardless of order
      expect(perms1.sort()).toEqual(perms2.sort());
    });
  });
});
