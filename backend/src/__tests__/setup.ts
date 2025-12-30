import { beforeAll, afterAll, beforeEach, expect } from 'vitest';
import jwt from 'jsonwebtoken';

// Test configuration
export const TEST_CONFIG = {
  JWT_SECRET: 'test-secret-key-for-testing',
  TENANT_ID: 'tenant-test',
  BRANCH_ID: 'branch-test',
};

// Generate test tokens for different roles
export function generateTestToken(
  userId: string,
  username: string,
  roleIds: string[] = ['ADMIN'],
  options?: { tenantId?: string; branchId?: string }
): string {
  return jwt.sign(
    {
      userId,
      username,
      tenantId: options?.tenantId || TEST_CONFIG.TENANT_ID,
      branchId: options?.branchId || TEST_CONFIG.BRANCH_ID,
      roleIds,
    },
    process.env.JWT_SECRET || TEST_CONFIG.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Pre-generated tokens for common test scenarios
export const TEST_TOKENS = {
  admin: generateTestToken('user-admin', 'admin', ['ADMIN']),
  doctor: generateTestToken('user-doctor', 'doctor1', ['DOCTOR']),
  nurse: generateTestToken('user-nurse', 'nurse1', ['NURSE']),
  frontOffice: generateTestToken('user-front', 'frontdesk', ['FRONT_OFFICE']),
  billing: generateTestToken('user-billing', 'billing', ['BILLING']),
  labTech: generateTestToken('user-lab', 'lab', ['LAB_TECH']),
  pharmacist: generateTestToken('user-pharma', 'pharmacy', ['PHARMACIST']),
  invalid: 'invalid-token-string',
  expired: jwt.sign(
    { userId: 'user-expired', username: 'expired', roleIds: ['ADMIN'] },
    TEST_CONFIG.JWT_SECRET,
    { expiresIn: '-1h' } // Already expired
  ),
};

// Test data factories
export const createTestPatient = (overrides = {}) => ({
  name: 'Test Patient',
  dateOfBirth: '1990-01-15',
  gender: 'male',
  phone: '+919876543210',
  email: 'test@patient.com',
  address: '123 Test Street, Test City',
  emergencyContact: 'Emergency Person',
  emergencyPhone: '+919876543211',
  bloodGroup: 'O+',
  ...overrides,
});

export const createTestAppointment = (patientId: string, doctorId: string, overrides = {}) => ({
  patientId,
  doctorId,
  appointmentDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
  appointmentTime: '10:00',
  type: 'consultation',
  reason: 'General checkup',
  department: 'General Medicine',
  ...overrides,
});

export const createTestInvoice = (patientId: string, overrides = {}) => ({
  patientId,
  type: 'OPD',
  items: [
    {
      description: 'Consultation Fee',
      quantity: 1,
      unitPrice: 500,
      amount: 500,
    },
  ],
  subtotal: 500,
  discount: 0,
  tax: 25,
  total: 525,
  ...overrides,
});

// Mock response matchers
export const expectSuccessResponse = (response: any) => {
  expect(response.status).toBeLessThan(400);
};

export const expectErrorResponse = (response: any, expectedStatus: number) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('error');
};

export const expectPaginatedResponse = (response: any) => {
  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
};

// API helpers
export const authHeader = (token: string) => ({
  Authorization: `Bearer ${token}`,
});
