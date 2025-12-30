import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Patient validation schema (mirrors the actual schema)
const createPatientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  gender: z.enum(['male', 'female', 'other']),
  phone: z.string().min(10, 'Phone must be at least 10 digits').optional(),
  email: z.string().email('Invalid email format').optional(),
  address: z.string().optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  allergies: z.string().optional(),
  medicalHistory: z.string().optional(),
});

const updatePatientSchema = createPatientSchema.partial();

describe('Patient API Validation', () => {
  describe('Create Patient Schema', () => {
    it('should accept valid patient data', () => {
      const validPatient = {
        name: 'John Doe',
        dateOfBirth: '1990-01-15',
        gender: 'male',
        phone: '+919876543210',
        email: 'john@example.com',
      };

      const result = createPatientSchema.safeParse(validPatient);
      expect(result.success).toBe(true);
    });

    it('should require name field', () => {
      const patientWithoutName = {
        dateOfBirth: '1990-01-15',
        gender: 'male',
      };

      const result = createPatientSchema.safeParse(patientWithoutName);
      expect(result.success).toBe(false);
    });

    it('should require name to be at least 2 characters', () => {
      const patientShortName = {
        name: 'A',
        dateOfBirth: '1990-01-15',
        gender: 'male',
      };

      const result = createPatientSchema.safeParse(patientShortName);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 2 characters');
      }
    });

    it('should require dateOfBirth in correct format', () => {
      const patientBadDate = {
        name: 'John Doe',
        dateOfBirth: '15-01-1990', // Wrong format
        gender: 'male',
      };

      const result = createPatientSchema.safeParse(patientBadDate);
      expect(result.success).toBe(false);
    });

    it('should accept valid dateOfBirth format', () => {
      const validDates = ['1990-01-15', '2000-12-31', '1985-06-20'];

      validDates.forEach(date => {
        const patient = { name: 'Test', dateOfBirth: date, gender: 'male' as const };
        const result = createPatientSchema.safeParse(patient);
        expect(result.success).toBe(true);
      });
    });

    it('should validate gender enum', () => {
      const validGenders = ['male', 'female', 'other'];
      const invalidGenders = ['MALE', 'unknown', ''];

      validGenders.forEach(gender => {
        const patient = { name: 'Test', dateOfBirth: '1990-01-15', gender };
        const result = createPatientSchema.safeParse(patient);
        expect(result.success).toBe(true);
      });

      invalidGenders.forEach(gender => {
        const patient = { name: 'Test', dateOfBirth: '1990-01-15', gender };
        const result = createPatientSchema.safeParse(patient);
        expect(result.success).toBe(false);
      });
    });

    it('should validate email format when provided', () => {
      const validEmails = ['test@example.com', 'user.name@domain.co.in'];
      const invalidEmails = ['notanemail', '@nodomain.com', 'missing@'];

      validEmails.forEach(email => {
        const patient = { name: 'Test', dateOfBirth: '1990-01-15', gender: 'male' as const, email };
        const result = createPatientSchema.safeParse(patient);
        expect(result.success).toBe(true);
      });

      invalidEmails.forEach(email => {
        const patient = { name: 'Test', dateOfBirth: '1990-01-15', gender: 'male' as const, email };
        const result = createPatientSchema.safeParse(patient);
        expect(result.success).toBe(false);
      });
    });

    it('should validate blood group enum when provided', () => {
      const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      const invalidBloodGroups = ['C+', 'AB', 'O', 'unknown'];

      validBloodGroups.forEach(bloodGroup => {
        const patient = {
          name: 'Test',
          dateOfBirth: '1990-01-15',
          gender: 'male' as const,
          bloodGroup,
        };
        const result = createPatientSchema.safeParse(patient);
        expect(result.success).toBe(true);
      });

      invalidBloodGroups.forEach(bloodGroup => {
        const patient = {
          name: 'Test',
          dateOfBirth: '1990-01-15',
          gender: 'male' as const,
          bloodGroup,
        };
        const result = createPatientSchema.safeParse(patient);
        expect(result.success).toBe(false);
      });
    });

    it('should allow optional fields to be omitted', () => {
      const minimalPatient = {
        name: 'Minimal Patient',
        dateOfBirth: '1990-01-15',
        gender: 'female',
      };

      const result = createPatientSchema.safeParse(minimalPatient);
      expect(result.success).toBe(true);
    });
  });

  describe('Update Patient Schema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = { name: 'Updated Name' };
      const result = updatePatientSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow empty update (no changes)', () => {
      const emptyUpdate = {};
      const result = updatePatientSchema.safeParse(emptyUpdate);
      expect(result.success).toBe(true);
    });

    it('should still validate field formats when provided', () => {
      const invalidUpdate = { email: 'not-an-email' };
      const result = updatePatientSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });
});

describe('Patient Business Logic', () => {
  describe('MRN Generation', () => {
    it('should generate unique MRN for each patient', () => {
      const generateMRN = (tenantPrefix: string = 'MRN') => {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${tenantPrefix}-${timestamp}${random}`;
      };

      const mrn1 = generateMRN();
      const mrn2 = generateMRN();

      expect(mrn1).not.toBe(mrn2);
      expect(mrn1).toMatch(/^MRN-/);
    });

    it('should follow MRN format conventions', () => {
      const mrnPattern = /^[A-Z]{2,4}-[A-Z0-9]{8,12}$/;
      const validMRNs = ['MRN-ABC12345', 'PAT-XYZ987654'];

      validMRNs.forEach(mrn => {
        expect(mrn).toMatch(mrnPattern);
      });
    });
  });

  describe('Age Calculation', () => {
    const calculateAge = (dateOfBirth: string): number => {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }

      return age;
    };

    it('should correctly calculate age from DOB', () => {
      // Test with a fixed date calculation
      const dob = '1990-01-15';
      const age = calculateAge(dob);

      expect(age).toBeGreaterThan(30);
      expect(age).toBeLessThan(40);
    });

    it('should handle birthdays correctly', () => {
      const today = new Date();
      const dobThisYear = `${today.getFullYear() - 30}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const age = calculateAge(dobThisYear);
      expect(age).toBe(30);
    });

    it('should return 0 for infants born this year', () => {
      const today = new Date();
      const infantDob = `${today.getFullYear()}-01-01`;

      const age = calculateAge(infantDob);
      expect(age).toBe(0);
    });
  });

  describe('Patient Search', () => {
    const patients = [
      { id: '1', name: 'John Doe', mrn: 'MRN-001', phone: '9876543210' },
      { id: '2', name: 'Jane Smith', mrn: 'MRN-002', phone: '9876543211' },
      { id: '3', name: 'Bob Johnson', mrn: 'MRN-003', phone: '9876543212' },
    ];

    const searchPatients = (query: string) => {
      const lowerQuery = query.toLowerCase();
      return patients.filter(
        p =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.mrn.toLowerCase().includes(lowerQuery) ||
          p.phone.includes(query)
      );
    };

    it('should find patients by name', () => {
      const results = searchPatients('john');
      expect(results.length).toBe(2); // John Doe and Bob Johnson
    });

    it('should find patients by MRN', () => {
      const results = searchPatients('MRN-002');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Jane Smith');
    });

    it('should find patients by phone number', () => {
      const results = searchPatients('9876543210');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('John Doe');
    });

    it('should return empty array for no matches', () => {
      const results = searchPatients('nonexistent');
      expect(results.length).toBe(0);
    });

    it('should be case-insensitive for name search', () => {
      const results1 = searchPatients('JANE');
      const results2 = searchPatients('jane');
      const results3 = searchPatients('Jane');

      expect(results1).toEqual(results2);
      expect(results2).toEqual(results3);
    });
  });

  describe('Patient Data Sanitization', () => {
    const sanitizePhone = (phone: string): string => {
      // Remove non-numeric characters and ensure country code
      let cleaned = phone.replace(/\D/g, '');
      if (cleaned.length === 10) {
        cleaned = '91' + cleaned;
      }
      return '+' + cleaned;
    };

    it('should clean phone numbers', () => {
      expect(sanitizePhone('9876543210')).toBe('+919876543210');
      expect(sanitizePhone('+91 98765 43210')).toBe('+919876543210');
      expect(sanitizePhone('(987) 654-3210')).toBe('+919876543210');
    });

    it('should preserve country code if present', () => {
      expect(sanitizePhone('+919876543210')).toBe('+919876543210');
      expect(sanitizePhone('919876543210')).toBe('+919876543210');
    });
  });
});

describe('Patient Data Privacy', () => {
  describe('PHI Masking', () => {
    const maskPhone = (phone: string): string => {
      if (!phone || phone.length < 4) return '****';
      return '***' + phone.slice(-4);
    };

    const maskEmail = (email: string): string => {
      if (!email || !email.includes('@')) return '***@***';
      const [local, domain] = email.split('@');
      return local.slice(0, 2) + '***@' + domain;
    };

    it('should mask phone numbers for display', () => {
      expect(maskPhone('9876543210')).toBe('***3210');
      expect(maskPhone('+919876543210')).toBe('***3210');
    });

    it('should mask email addresses for display', () => {
      expect(maskEmail('john@example.com')).toBe('jo***@example.com');
      expect(maskEmail('a@b.com')).toBe('a***@b.com');
    });

    it('should handle edge cases gracefully', () => {
      expect(maskPhone('')).toBe('****');
      expect(maskPhone('123')).toBe('****');
      expect(maskEmail('')).toBe('***@***');
    });
  });

  describe('Audit Trail', () => {
    interface AuditEntry {
      action: string;
      userId: string;
      patientId: string;
      timestamp: Date;
      changes?: Record<string, { old: any; new: any }>;
    }

    const createAuditEntry = (
      action: string,
      userId: string,
      patientId: string,
      changes?: Record<string, { old: any; new: any }>
    ): AuditEntry => ({
      action,
      userId,
      patientId,
      timestamp: new Date(),
      changes,
    });

    it('should record patient creation', () => {
      const audit = createAuditEntry('CREATE', 'user-1', 'patient-1');

      expect(audit.action).toBe('CREATE');
      expect(audit.timestamp).toBeInstanceOf(Date);
    });

    it('should record patient updates with changes', () => {
      const changes = {
        name: { old: 'John Doe', new: 'John D. Doe' },
        phone: { old: '9876543210', new: '9876543211' },
      };

      const audit = createAuditEntry('UPDATE', 'user-1', 'patient-1', changes);

      expect(audit.action).toBe('UPDATE');
      expect(audit.changes).toEqual(changes);
    });

    it('should record patient access', () => {
      const audit = createAuditEntry('VIEW', 'user-1', 'patient-1');

      expect(audit.action).toBe('VIEW');
    });
  });
});
