import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  createPatientSchema,
  createAppointmentSchema,
  createInvoiceSchema,
  paymentSchema,
  createLabOrderSchema,
  createAdmissionSchema,
  dischargeSchema,
  createEmergencySchema,
  scheduleSurgerySchema,
  bloodDonorSchema,
  bloodRequestSchema,
  createEmployeeSchema,
  leaveRequestSchema,
  icuVitalsSchema,
  pharmacyDispenseSchema,
  drugMasterSchema,
  ambulanceTripSchema,
  housekeepingTaskSchema,
  dietOrderSchema,
  incidentReportSchema,
  preAuthorizationSchema,
  referralSourceSchema,
  createUserSchema,
  journalEntrySchema,
  labTestMasterSchema,
  procedureMasterSchema,
  wardMasterSchema,
  paginationSchema,
  searchSchema,
  changePasswordSchema,
} from '../validators';

describe('Authentication Validators', () => {
  describe('loginSchema', () => {
    it('should validate correct login credentials', () => {
      const result = loginSchema.safeParse({
        username: 'admin',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject username less than 3 characters', () => {
      const result = loginSchema.safeParse({
        username: 'ab',
        password: 'password123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('at least 3');
      }
    });

    it('should reject password less than 6 characters', () => {
      const result = loginSchema.safeParse({
        username: 'admin',
        password: '12345',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('should validate strong password change', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'oldPassword',
        newPassword: 'NewPass@123',
        confirmPassword: 'NewPass@123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'oldPassword',
        newPassword: 'NewPass@123',
        confirmPassword: 'DifferentPass@123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject weak passwords', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'oldPassword',
        newPassword: 'weakpassword',
        confirmPassword: 'weakpassword',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Patient Validators', () => {
  describe('createPatientSchema', () => {
    it('should validate correct patient data', () => {
      const result = createPatientSchema.safeParse({
        name: 'John Doe',
        gender: 'MALE',
        contact: '+91-9876543210',
        email: 'john@example.com',
        bloodGroup: 'O+',
      });
      expect(result.success).toBe(true);
    });

    it('should reject name less than 2 characters', () => {
      const result = createPatientSchema.safeParse({
        name: 'J',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid blood group', () => {
      const result = createPatientSchema.safeParse({
        name: 'John Doe',
        bloodGroup: 'X+',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid phone number format', () => {
      const result = createPatientSchema.safeParse({
        name: 'John Doe',
        contact: '123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const result = createPatientSchema.safeParse({
        name: 'John Doe',
        email: 'invalid-email',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Appointment Validators', () => {
  describe('createAppointmentSchema', () => {
    it('should validate correct appointment data', () => {
      const result = createAppointmentSchema.safeParse({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        doctorId: '550e8400-e29b-41d4-a716-446655440001',
        scheduledAt: '2024-12-20T10:00:00.000Z',
        type: 'NEW',
        duration: 30,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      const result = createAppointmentSchema.safeParse({
        patientId: 'invalid-uuid',
        doctorId: '550e8400-e29b-41d4-a716-446655440001',
        scheduledAt: '2024-12-20T10:00:00.000Z',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid datetime format', () => {
      const result = createAppointmentSchema.safeParse({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        doctorId: '550e8400-e29b-41d4-a716-446655440001',
        scheduledAt: 'invalid-date',
      });
      expect(result.success).toBe(false);
    });

    it('should use default type if not provided', () => {
      const result = createAppointmentSchema.safeParse({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        doctorId: '550e8400-e29b-41d4-a716-446655440001',
        scheduledAt: '2024-12-20T10:00:00.000Z',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('NEW');
      }
    });
  });
});

describe('Billing Validators', () => {
  describe('createInvoiceSchema', () => {
    it('should validate correct invoice data', () => {
      const result = createInvoiceSchema.safeParse({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        items: [
          {
            description: 'Consultation Fee',
            quantity: 1,
            unitPrice: 500,
            discount: 0,
            taxRate: 18,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty items array', () => {
      const result = createInvoiceSchema.safeParse({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        items: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject discount greater than 100', () => {
      const result = createInvoiceSchema.safeParse({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        items: [
          {
            description: 'Test',
            quantity: 1,
            unitPrice: 100,
            discount: 150,
          },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('paymentSchema', () => {
    it('should validate correct payment data', () => {
      const result = paymentSchema.safeParse({
        invoiceId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 1000,
        paymentMode: 'CASH',
      });
      expect(result.success).toBe(true);
    });

    it('should reject zero amount', () => {
      const result = paymentSchema.safeParse({
        invoiceId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 0,
        paymentMode: 'CASH',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid payment mode', () => {
      const result = paymentSchema.safeParse({
        invoiceId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 1000,
        paymentMode: 'BITCOIN',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Laboratory Validators', () => {
  describe('createLabOrderSchema', () => {
    it('should validate correct lab order data', () => {
      const result = createLabOrderSchema.safeParse({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        tests: [
          {
            testId: '550e8400-e29b-41d4-a716-446655440001',
            priority: 'ROUTINE',
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty tests array', () => {
      const result = createLabOrderSchema.safeParse({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        tests: [],
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('IPD Validators', () => {
  describe('createAdmissionSchema', () => {
    it('should validate correct admission data', () => {
      const result = createAdmissionSchema.safeParse({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        wardId: '550e8400-e29b-41d4-a716-446655440001',
        bedId: '550e8400-e29b-41d4-a716-446655440002',
        admittingDoctorId: '550e8400-e29b-41d4-a716-446655440003',
        admissionType: 'ELECTIVE',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('dischargeSchema', () => {
    it('should validate correct discharge data', () => {
      const result = dischargeSchema.safeParse({
        dischargeSummary: 'Patient recovered well and is being discharged.',
        dischargeType: 'NORMAL',
      });
      expect(result.success).toBe(true);
    });

    it('should reject short discharge summary', () => {
      const result = dischargeSchema.safeParse({
        dischargeSummary: 'OK',
        dischargeType: 'NORMAL',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Emergency Validators', () => {
  describe('createEmergencySchema', () => {
    it('should validate correct emergency data', () => {
      const result = createEmergencySchema.safeParse({
        patientName: 'Unknown Patient',
        triageLevel: 'RED',
        chiefComplaint: 'Chest pain and difficulty breathing',
        arrivalMode: 'AMBULANCE',
        isMLC: false,
      });
      expect(result.success).toBe(true);
    });

    it('should accept MLC cases with mlcNumber', () => {
      const result = createEmergencySchema.safeParse({
        patientName: 'John Doe',
        triageLevel: 'YELLOW',
        chiefComplaint: 'Road traffic accident',
        arrivalMode: 'POLICE',
        isMLC: true,
        mlcNumber: 'MLC-2024-001',
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('Surgery Validators', () => {
  describe('scheduleSurgerySchema', () => {
    it('should validate correct surgery schedule', () => {
      const result = scheduleSurgerySchema.safeParse({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        procedureId: '550e8400-e29b-41d4-a716-446655440001',
        surgeonId: '550e8400-e29b-41d4-a716-446655440002',
        otRoomId: '550e8400-e29b-41d4-a716-446655440003',
        scheduledDate: '2024-12-25T09:00:00.000Z',
        estimatedDuration: 120,
        anesthesiaType: 'GENERAL',
      });
      expect(result.success).toBe(true);
    });

    it('should reject duration less than 15 minutes', () => {
      const result = scheduleSurgerySchema.safeParse({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        procedureId: '550e8400-e29b-41d4-a716-446655440001',
        surgeonId: '550e8400-e29b-41d4-a716-446655440002',
        otRoomId: '550e8400-e29b-41d4-a716-446655440003',
        scheduledDate: '2024-12-25T09:00:00.000Z',
        estimatedDuration: 10,
        anesthesiaType: 'LOCAL',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Blood Bank Validators', () => {
  describe('bloodDonorSchema', () => {
    it('should validate correct donor data', () => {
      const result = bloodDonorSchema.safeParse({
        name: 'Jane Smith',
        contact: '+91-9876543210',
        dob: '1990-05-15',
        gender: 'FEMALE',
        bloodGroup: 'A+',
        address: '123 Main St, City',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('bloodRequestSchema', () => {
    it('should validate correct blood request', () => {
      const result = bloodRequestSchema.safeParse({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        bloodGroup: 'O-',
        component: 'PRBC',
        units: 2,
        priority: 'URGENT',
        reason: 'Surgery scheduled',
        requestedBy: '550e8400-e29b-41d4-a716-446655440001',
      });
      expect(result.success).toBe(true);
    });

    it('should reject units greater than 20', () => {
      const result = bloodRequestSchema.safeParse({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        bloodGroup: 'O-',
        component: 'PRBC',
        units: 25,
        priority: 'EMERGENCY',
        reason: 'Massive blood loss',
        requestedBy: '550e8400-e29b-41d4-a716-446655440001',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('HR Validators', () => {
  describe('createEmployeeSchema', () => {
    it('should validate correct employee data', () => {
      const result = createEmployeeSchema.safeParse({
        employeeId: 'EMP001',
        name: 'Dr. Robert Brown',
        email: 'robert@hospital.com',
        phone: '+91-9876543210',
        department: 'Cardiology',
        designation: 'Senior Consultant',
        dateOfJoining: '2024-01-15',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('leaveRequestSchema', () => {
    it('should validate correct leave request', () => {
      const result = leaveRequestSchema.safeParse({
        leaveType: 'CASUAL',
        fromDate: '2024-12-20',
        toDate: '2024-12-22',
        reason: 'Personal work, need to attend a family function.',
      });
      expect(result.success).toBe(true);
    });

    it('should reject end date before start date', () => {
      const result = leaveRequestSchema.safeParse({
        leaveType: 'CASUAL',
        fromDate: '2024-12-25',
        toDate: '2024-12-20',
        reason: 'Personal work, need to attend a function.',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('ICU Validators', () => {
  describe('icuVitalsSchema', () => {
    it('should validate correct ICU vitals', () => {
      const result = icuVitalsSchema.safeParse({
        icuBedId: '550e8400-e29b-41d4-a716-446655440000',
        patientId: '550e8400-e29b-41d4-a716-446655440001',
        heartRate: 72,
        bpSystolic: 120,
        bpDiastolic: 80,
        temperature: 37.2,
        spo2: 98,
        respiratoryRate: 16,
        gcsScore: 15,
      });
      expect(result.success).toBe(true);
    });

    it('should reject GCS score out of range', () => {
      const result = icuVitalsSchema.safeParse({
        icuBedId: '550e8400-e29b-41d4-a716-446655440000',
        patientId: '550e8400-e29b-41d4-a716-446655440001',
        gcsScore: 2,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Pharmacy Validators', () => {
  describe('drugMasterSchema', () => {
    it('should validate correct drug data', () => {
      const result = drugMasterSchema.safeParse({
        name: 'Paracetamol 500mg',
        genericName: 'Acetaminophen',
        category: 'Analgesic',
        form: 'TABLET',
        strength: '500mg',
        unitPrice: 2.5,
        requiresPrescription: false,
      });
      expect(result.success).toBe(true);
    });

    it('should flag narcotic drugs', () => {
      const result = drugMasterSchema.safeParse({
        name: 'Morphine 10mg',
        category: 'Opioid',
        form: 'INJECTION',
        strength: '10mg/ml',
        unitPrice: 150,
        isNarcotic: true,
        requiresPrescription: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isNarcotic).toBe(true);
      }
    });
  });
});

describe('Ambulance Validators', () => {
  describe('ambulanceTripSchema', () => {
    it('should validate correct trip data', () => {
      const result = ambulanceTripSchema.safeParse({
        vehicleId: '550e8400-e29b-41d4-a716-446655440000',
        patientName: 'Emergency Patient',
        pickupLocation: '123 Main Street, Downtown Area',
        dropLocation: 'City Hospital Emergency Ward',
        tripType: 'EMERGENCY',
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('Housekeeping Validators', () => {
  describe('housekeepingTaskSchema', () => {
    it('should validate correct task data', () => {
      const result = housekeepingTaskSchema.safeParse({
        taskType: 'BED_CLEANING',
        location: 'Ward A - Bed 101',
        priority: 'HIGH',
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('Diet Validators', () => {
  describe('dietOrderSchema', () => {
    it('should validate correct diet order', () => {
      const result = dietOrderSchema.safeParse({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        admissionId: '550e8400-e29b-41d4-a716-446655440001',
        dietType: 'DIABETIC',
        mealType: 'LUNCH',
        specialInstructions: 'No sugar, limited carbs',
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('Quality Validators', () => {
  describe('incidentReportSchema', () => {
    it('should validate correct incident report', () => {
      const result = incidentReportSchema.safeParse({
        incidentType: 'FALL',
        severity: 'MEDIUM',
        occurredAt: '2024-12-15T14:30:00.000Z',
        location: 'Ward B - Room 205',
        description: 'Patient slipped while walking to bathroom. No visible injuries.',
        reportedBy: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject short description', () => {
      const result = incidentReportSchema.safeParse({
        incidentType: 'FALL',
        severity: 'LOW',
        occurredAt: '2024-12-15T14:30:00.000Z',
        location: 'Ward B',
        description: 'Patient fell',
        reportedBy: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('TPA Validators', () => {
  describe('preAuthorizationSchema', () => {
    it('should validate correct pre-auth request', () => {
      const result = preAuthorizationSchema.safeParse({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        insuranceId: 'INS12345',
        insurerName: 'ABC Insurance Co',
        policyNumber: 'POL-2024-001',
        requestedAmount: 50000,
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('Referral Validators', () => {
  describe('referralSourceSchema', () => {
    it('should validate correct referral source', () => {
      const result = referralSourceSchema.safeParse({
        name: 'Dr. Smith Clinic',
        code: 'DSC001',
        type: 'DOCTOR',
        commissionType: 'PERCENTAGE',
        commissionValue: 10,
      });
      expect(result.success).toBe(true);
    });

    it('should reject commission value greater than 100', () => {
      const result = referralSourceSchema.safeParse({
        name: 'Agent XYZ',
        code: 'AGT001',
        type: 'AGENT',
        commissionType: 'PERCENTAGE',
        commissionValue: 150,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('User Management Validators', () => {
  describe('createUserSchema', () => {
    it('should validate correct user data', () => {
      const result = createUserSchema.safeParse({
        username: 'john_doe',
        email: 'john@hospital.com',
        password: 'SecurePass@123',
        name: 'John Doe',
        roleIds: ['admin'],
        branchId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject username with special characters', () => {
      const result = createUserSchema.safeParse({
        username: 'john@doe',
        email: 'john@hospital.com',
        password: 'SecurePass@123',
        name: 'John Doe',
        roleIds: ['admin'],
        branchId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(false);
    });

    it('should reject weak password', () => {
      const result = createUserSchema.safeParse({
        username: 'john_doe',
        email: 'john@hospital.com',
        password: 'password',
        name: 'John Doe',
        roleIds: ['admin'],
        branchId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Accounting Validators', () => {
  describe('journalEntrySchema', () => {
    it('should validate balanced journal entry', () => {
      const result = journalEntrySchema.safeParse({
        date: '2024-12-15',
        description: 'Cash received from patient',
        entries: [
          {
            accountId: '550e8400-e29b-41d4-a716-446655440000',
            debit: 1000,
            credit: 0,
          },
          {
            accountId: '550e8400-e29b-41d4-a716-446655440001',
            debit: 0,
            credit: 1000,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject unbalanced journal entry', () => {
      const result = journalEntrySchema.safeParse({
        date: '2024-12-15',
        description: 'Unbalanced entry',
        entries: [
          {
            accountId: '550e8400-e29b-41d4-a716-446655440000',
            debit: 1000,
            credit: 0,
          },
          {
            accountId: '550e8400-e29b-41d4-a716-446655440001',
            debit: 0,
            credit: 500,
          },
        ],
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Master Data Validators', () => {
  describe('labTestMasterSchema', () => {
    it('should validate correct lab test data', () => {
      const result = labTestMasterSchema.safeParse({
        name: 'Complete Blood Count',
        code: 'CBC',
        category: 'Hematology',
        sampleType: 'BLOOD',
        normalRange: '4.5-5.5 million cells/mcL',
        unit: 'million cells/mcL',
        price: 500,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('procedureMasterSchema', () => {
    it('should validate correct procedure data', () => {
      const result = procedureMasterSchema.safeParse({
        name: 'Appendectomy',
        code: 'SURG-APP',
        category: 'Surgery',
        department: 'General Surgery',
        duration: 60,
        price: 25000,
        requiresAnesthesia: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('wardMasterSchema', () => {
    it('should validate correct ward data', () => {
      const result = wardMasterSchema.safeParse({
        name: 'General Ward A',
        code: 'GW-A',
        type: 'GENERAL',
        floor: 'Ground Floor',
        totalBeds: 30,
        dailyRate: 1000,
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('Common Validators', () => {
  describe('paginationSchema', () => {
    it('should use default values', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50);
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('should coerce string values to numbers', () => {
      const result = paginationSchema.safeParse({
        page: '2',
        limit: '25',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(25);
      }
    });

    it('should reject page less than 1', () => {
      const result = paginationSchema.safeParse({
        page: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 100', () => {
      const result = paginationSchema.safeParse({
        limit: 200,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('searchSchema', () => {
    it('should validate search query', () => {
      const result = searchSchema.safeParse({
        search: 'John',
        page: 1,
        limit: 20,
      });
      expect(result.success).toBe(true);
    });

    it('should reject search query too long', () => {
      const result = searchSchema.safeParse({
        search: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });
});
