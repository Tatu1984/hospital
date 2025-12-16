import { z } from 'zod';

// Common validation patterns
const phoneRegex = /^[+]?[\d\s-]{10,15}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reusable validators
export const idSchema = z.string().uuid('Invalid ID format');
export const dateSchema = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));
export const optionalDateSchema = dateSchema.optional().nullable();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const searchSchema = z.object({
  search: z.string().max(100).optional(),
}).merge(paginationSchema);

// Auth validators
export const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Patient validators
export const createPatientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  dob: optionalDateSchema,
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  contact: z.string().regex(phoneRegex, 'Invalid phone number').optional(),
  email: z.string().email('Invalid email').optional().nullable(),
  address: z.string().max(500).optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  allergies: z.string().max(1000).optional(),
  referralSourceId: idSchema.optional().nullable(),
});

export const updatePatientSchema = createPatientSchema.partial();

// Appointment validators
export const createAppointmentSchema = z.object({
  patientId: idSchema,
  doctorId: idSchema,
  scheduledAt: z.string().datetime('Invalid date/time format'),
  type: z.enum(['NEW', 'FOLLOW_UP', 'EMERGENCY', 'CONSULTATION']).default('NEW'),
  notes: z.string().max(1000).optional(),
  duration: z.number().int().min(5).max(240).default(30),
});

export const updateAppointmentSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  notes: z.string().max(1000).optional(),
});

// Encounter/OPD validators
export const createEncounterSchema = z.object({
  patientId: idSchema,
  appointmentId: idSchema.optional(),
  type: z.enum(['OPD', 'IPD', 'EMERGENCY']).default('OPD'),
});

export const opdNoteSchema = z.object({
  encounterId: idSchema,
  chiefComplaint: z.string().min(1).max(1000),
  historyOfPresentIllness: z.string().max(5000).optional(),
  pastMedicalHistory: z.string().max(2000).optional(),
  examination: z.string().max(5000).optional(),
  diagnosis: z.string().max(1000).optional(),
  plan: z.string().max(2000).optional(),
  vitals: z.object({
    temperature: z.number().min(30).max(45).optional(),
    pulse: z.number().int().min(20).max(250).optional(),
    bp_systolic: z.number().int().min(50).max(300).optional(),
    bp_diastolic: z.number().int().min(30).max(200).optional(),
    respiratory_rate: z.number().int().min(5).max(60).optional(),
    spo2: z.number().int().min(50).max(100).optional(),
    weight: z.number().min(0.5).max(500).optional(),
    height: z.number().min(20).max(300).optional(),
  }).optional(),
});

// Prescription validators
export const prescriptionItemSchema = z.object({
  drugId: idSchema,
  dosage: z.string().min(1).max(100),
  frequency: z.string().min(1).max(100),
  duration: z.string().min(1).max(100),
  route: z.enum(['ORAL', 'IV', 'IM', 'SC', 'TOPICAL', 'INHALATION', 'RECTAL', 'SUBLINGUAL']).default('ORAL'),
  instructions: z.string().max(500).optional(),
  quantity: z.number().int().min(1).max(1000),
});

export const createPrescriptionSchema = z.object({
  encounterId: idSchema,
  items: z.array(prescriptionItemSchema).min(1),
  notes: z.string().max(1000).optional(),
});

// Admission validators
export const createAdmissionSchema = z.object({
  patientId: idSchema,
  wardId: idSchema,
  bedId: idSchema,
  admittingDoctorId: idSchema,
  admissionType: z.enum(['EMERGENCY', 'ELECTIVE', 'TRANSFER']).default('ELECTIVE'),
  provisionalDiagnosis: z.string().max(1000).optional(),
  admissionNotes: z.string().max(5000).optional(),
});

export const dischargeSchema = z.object({
  dischargeSummary: z.string().min(10).max(10000),
  dischargeType: z.enum(['NORMAL', 'LAMA', 'ABSCONDED', 'DEATH', 'TRANSFER']).default('NORMAL'),
  followUpDate: optionalDateSchema,
  followUpInstructions: z.string().max(2000).optional(),
});

// Lab order validators
export const createLabOrderSchema = z.object({
  patientId: idSchema,
  encounterId: idSchema.optional(),
  tests: z.array(z.object({
    testId: idSchema,
    priority: z.enum(['ROUTINE', 'URGENT', 'STAT']).default('ROUTINE'),
    notes: z.string().max(500).optional(),
  })).min(1),
  clinicalInfo: z.string().max(1000).optional(),
});

export const labResultSchema = z.object({
  orderId: idSchema,
  testId: idSchema,
  result: z.string().max(5000),
  unit: z.string().max(50).optional(),
  referenceRange: z.string().max(100).optional(),
  isCritical: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
});

// Billing validators
export const createInvoiceSchema = z.object({
  patientId: idSchema,
  encounterId: idSchema.optional(),
  admissionId: idSchema.optional(),
  items: z.array(z.object({
    description: z.string().min(1).max(200),
    quantity: z.number().int().min(1).max(10000),
    unitPrice: z.number().min(0).max(10000000),
    discount: z.number().min(0).max(100).default(0),
    taxRate: z.number().min(0).max(50).default(0),
  })).min(1),
  discountPercent: z.number().min(0).max(100).default(0),
  notes: z.string().max(1000).optional(),
});

export const paymentSchema = z.object({
  invoiceId: idSchema,
  amount: z.number().min(0.01).max(100000000),
  paymentMode: z.enum(['CASH', 'CARD', 'UPI', 'CHEQUE', 'BANK_TRANSFER', 'INSURANCE']),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

// Emergency validators
export const createEmergencySchema = z.object({
  patientId: idSchema.optional(),
  patientName: z.string().min(1).max(100),
  patientContact: z.string().regex(phoneRegex).optional(),
  patientAge: z.number().int().min(0).max(150).optional(),
  patientGender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  triageLevel: z.enum(['RED', 'YELLOW', 'GREEN']),
  chiefComplaint: z.string().min(1).max(1000),
  arrivalMode: z.enum(['WALK_IN', 'AMBULANCE', 'POLICE', 'REFERRED']).default('WALK_IN'),
  isMLC: z.boolean().default(false),
  mlcNumber: z.string().max(50).optional(),
  attendantName: z.string().max(100).optional(),
  attendantContact: z.string().regex(phoneRegex).optional(),
});

// Surgery validators
export const scheduleSurgerySchema = z.object({
  patientId: idSchema,
  admissionId: idSchema.optional(),
  procedureId: idSchema,
  surgeonId: idSchema,
  otRoomId: idSchema,
  scheduledDate: z.string().datetime(),
  estimatedDuration: z.number().int().min(15).max(1440),
  anesthesiaType: z.enum(['GENERAL', 'SPINAL', 'EPIDURAL', 'LOCAL', 'REGIONAL', 'SEDATION']),
  preOpDiagnosis: z.string().max(1000).optional(),
  preOpNotes: z.string().max(5000).optional(),
});

// Blood Bank validators
export const bloodDonorSchema = z.object({
  name: z.string().min(2).max(100),
  contact: z.string().regex(phoneRegex),
  email: z.string().email().optional(),
  dob: dateSchema,
  gender: z.enum(['MALE', 'FEMALE']),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  address: z.string().max(500),
  lastDonationDate: optionalDateSchema,
});

export const bloodRequestSchema = z.object({
  patientId: idSchema,
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  component: z.enum(['WHOLE_BLOOD', 'PRBC', 'FFP', 'PLATELETS', 'CRYOPRECIPITATE']),
  units: z.number().int().min(1).max(20),
  priority: z.enum(['ROUTINE', 'URGENT', 'EMERGENCY']).default('ROUTINE'),
  reason: z.string().max(500),
  requestedBy: idSchema,
});

// Inventory validators
export const createPurchaseOrderSchema = z.object({
  supplierId: idSchema,
  items: z.array(z.object({
    itemId: idSchema,
    quantity: z.number().int().min(1).max(100000),
    unitPrice: z.number().min(0).max(10000000),
  })).min(1),
  expectedDelivery: optionalDateSchema,
  notes: z.string().max(1000).optional(),
});

// HR validators
export const createEmployeeSchema = z.object({
  employeeId: z.string().min(1).max(20),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(phoneRegex),
  department: z.string().max(100),
  designation: z.string().max(100),
  dateOfJoining: dateSchema,
  salary: z.number().min(0).max(100000000).optional(),
  reportingTo: idSchema.optional(),
});

export const leaveRequestSchema = z.object({
  leaveType: z.enum(['CASUAL', 'SICK', 'EARNED', 'MATERNITY', 'PATERNITY', 'UNPAID']),
  fromDate: dateSchema,
  toDate: dateSchema,
  reason: z.string().min(10).max(500),
}).refine((data) => new Date(data.toDate) >= new Date(data.fromDate), {
  message: 'End date must be after start date',
  path: ['toDate'],
});

// ICU validators
export const icuVitalsSchema = z.object({
  icuBedId: idSchema,
  patientId: idSchema,
  heartRate: z.number().int().min(0).max(300).optional(),
  bpSystolic: z.number().int().min(0).max(300).optional(),
  bpDiastolic: z.number().int().min(0).max(200).optional(),
  temperature: z.number().min(25).max(45).optional(),
  spo2: z.number().int().min(0).max(100).optional(),
  respiratoryRate: z.number().int().min(0).max(100).optional(),
  gcsScore: z.number().int().min(3).max(15).optional(),
  fio2: z.number().int().min(21).max(100).optional(),
  peep: z.number().min(0).max(30).optional(),
  tidalVolume: z.number().int().min(0).max(2000).optional(),
  ventilatorMode: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
});

export const icuBedAssignmentSchema = z.object({
  patientId: idSchema,
  icuType: z.enum(['MICU', 'SICU', 'CCU', 'NICU', 'PICU']),
  admissionReason: z.string().min(1).max(1000),
  attendingDoctorId: idSchema,
});

// Radiology validators
export const createRadiologyOrderSchema = z.object({
  patientId: idSchema,
  encounterId: idSchema.optional(),
  testId: idSchema,
  modality: z.enum(['X-RAY', 'CT', 'MRI', 'ULTRASOUND', 'MAMMOGRAPHY', 'FLUOROSCOPY', 'PET', 'NUCLEAR']),
  priority: z.enum(['ROUTINE', 'URGENT', 'STAT']).default('ROUTINE'),
  clinicalHistory: z.string().max(2000).optional(),
  specialInstructions: z.string().max(1000).optional(),
});

export const radiologyResultSchema = z.object({
  orderId: idSchema,
  findings: z.string().min(10).max(10000),
  impression: z.string().max(5000).optional(),
  recommendations: z.string().max(2000).optional(),
  criticalFindings: z.boolean().default(false),
});

// Pharmacy validators
export const pharmacyDispenseSchema = z.object({
  prescriptionId: idSchema,
  items: z.array(z.object({
    drugId: idSchema,
    quantity: z.number().int().min(1).max(10000),
    batchNumber: z.string().max(50).optional(),
    expiryDate: optionalDateSchema,
  })).min(1),
  patientId: idSchema,
  dispensedBy: idSchema.optional(),
});

export const drugMasterSchema = z.object({
  name: z.string().min(2).max(200),
  genericName: z.string().max(200).optional(),
  category: z.string().max(100),
  form: z.enum(['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'OINTMENT', 'DROPS', 'INHALER', 'PATCH', 'POWDER', 'GEL', 'LOTION', 'SUPPOSITORY', 'OTHER']),
  strength: z.string().max(100),
  manufacturer: z.string().max(200).optional(),
  unitPrice: z.number().min(0).max(1000000),
  isNarcotic: z.boolean().default(false),
  requiresPrescription: z.boolean().default(true),
  reorderLevel: z.number().int().min(0).max(100000).optional(),
});

// Ambulance validators
export const ambulanceTripSchema = z.object({
  vehicleId: idSchema,
  patientId: idSchema.optional(),
  patientName: z.string().max(100).optional(),
  patientContact: z.string().regex(/^[+]?[\d\s-]{10,15}$/).optional(),
  pickupLocation: z.string().min(5).max(500),
  dropLocation: z.string().min(5).max(500),
  tripType: z.enum(['EMERGENCY', 'TRANSFER', 'DISCHARGE', 'SCHEDULED']),
  requestedTime: z.string().datetime().optional(),
  estimatedDistance: z.number().min(0).max(10000).optional(),
  notes: z.string().max(1000).optional(),
});

export const ambulanceVehicleSchema = z.object({
  vehicleNumber: z.string().min(4).max(20),
  vehicleType: z.enum(['ALS', 'BLS', 'PATIENT_TRANSPORT', 'NEONATAL', 'CARDIAC']),
  driverName: z.string().max(100),
  driverContact: z.string().regex(/^[+]?[\d\s-]{10,15}$/),
  status: z.enum(['AVAILABLE', 'ON_TRIP', 'MAINTENANCE', 'OUT_OF_SERVICE']).default('AVAILABLE'),
});

// Housekeeping validators
export const housekeepingTaskSchema = z.object({
  taskType: z.enum(['BED_CLEANING', 'ROOM_CLEANING', 'LINEN_CHANGE', 'WASTE_DISPOSAL', 'SANITIZATION', 'GENERAL_CLEANING']),
  location: z.string().min(1).max(200),
  bedId: idSchema.optional(),
  wardId: idSchema.optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  assignedTo: idSchema.optional(),
  notes: z.string().max(500).optional(),
  scheduledTime: z.string().datetime().optional(),
});

// Diet validators
export const dietOrderSchema = z.object({
  patientId: idSchema,
  admissionId: idSchema,
  dietType: z.enum(['REGULAR', 'SOFT', 'LIQUID', 'DIABETIC', 'LOW_SODIUM', 'RENAL', 'CARDIAC', 'NPO', 'CLEAR_LIQUID', 'FULL_LIQUID', 'HIGH_PROTEIN', 'LOW_FAT', 'GLUTEN_FREE', 'VEGETARIAN', 'CUSTOM']),
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']),
  specialInstructions: z.string().max(1000).optional(),
  allergies: z.string().max(500).optional(),
  restrictions: z.string().max(500).optional(),
});

// Quality/Incident validators
export const incidentReportSchema = z.object({
  incidentType: z.enum(['FALL', 'MEDICATION_ERROR', 'NEEDLE_STICK', 'PATIENT_COMPLAINT', 'EQUIPMENT_FAILURE', 'INFECTION', 'NEAR_MISS', 'ADVERSE_EVENT', 'OTHER']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  occurredAt: z.string().datetime(),
  location: z.string().max(200),
  patientId: idSchema.optional(),
  description: z.string().min(20).max(5000),
  immediateAction: z.string().max(2000).optional(),
  witnesses: z.array(z.string().max(100)).optional(),
  reportedBy: idSchema,
});

// TPA/Insurance validators
export const preAuthorizationSchema = z.object({
  patientId: idSchema,
  admissionId: idSchema.optional(),
  insuranceId: z.string().max(50),
  insurerName: z.string().max(200),
  policyNumber: z.string().max(50),
  requestedAmount: z.number().min(0).max(100000000),
  diagnosisCode: z.string().max(20).optional(),
  procedureCodes: z.array(z.string().max(20)).optional(),
  documents: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
});

// Referral/Commission validators
export const referralSourceSchema = z.object({
  name: z.string().min(2).max(200),
  code: z.string().min(2).max(20),
  type: z.enum(['DOCTOR', 'AGENT', 'HOSPITAL', 'CORPORATE', 'INSURANCE', 'OTHER']),
  contact: z.string().regex(/^[+]?[\d\s-]{10,15}$/).optional(),
  email: z.string().email().optional(),
  address: z.string().max(500).optional(),
  commissionType: z.enum(['PERCENTAGE', 'FIXED', 'TIERED']),
  commissionValue: z.number().min(0).max(100),
  bankDetails: z.object({
    accountName: z.string().max(200),
    accountNumber: z.string().max(30),
    bankName: z.string().max(200),
    ifscCode: z.string().max(20),
  }).optional(),
  isActive: z.boolean().default(true),
});

// User management validators
export const createUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email(),
  password: z.string().min(8).max(100).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain uppercase, lowercase, number, and special character'
  ),
  name: z.string().min(2).max(100),
  roleIds: z.array(z.string()).min(1),
  departmentIds: z.array(z.string()).optional(),
  branchId: idSchema,
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  roleIds: z.array(z.string()).min(1).optional(),
  departmentIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// Accounting validators
export const journalEntrySchema = z.object({
  date: dateSchema,
  description: z.string().min(5).max(500),
  entries: z.array(z.object({
    accountId: idSchema,
    debit: z.number().min(0).max(100000000000).default(0),
    credit: z.number().min(0).max(100000000000).default(0),
    narration: z.string().max(500).optional(),
  })).min(2),
  reference: z.string().max(100).optional(),
}).refine(
  (data) => {
    const totalDebit = data.entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = data.entries.reduce((sum, e) => sum + e.credit, 0);
    return Math.abs(totalDebit - totalCredit) < 0.01;
  },
  { message: 'Debits must equal credits' }
);

// Master data validators
export const labTestMasterSchema = z.object({
  name: z.string().min(2).max(200),
  code: z.string().min(2).max(20),
  category: z.string().max(100),
  sampleType: z.enum(['BLOOD', 'URINE', 'STOOL', 'SPUTUM', 'CSF', 'SWAB', 'TISSUE', 'FLUID', 'OTHER']),
  method: z.string().max(200).optional(),
  normalRange: z.string().max(200).optional(),
  unit: z.string().max(50).optional(),
  turnaroundTime: z.number().int().min(0).max(10080).optional(), // Max 1 week in minutes
  price: z.number().min(0).max(1000000),
  isActive: z.boolean().default(true),
});

export const procedureMasterSchema = z.object({
  name: z.string().min(2).max(200),
  code: z.string().min(2).max(20),
  category: z.string().max(100),
  department: z.string().max(100),
  duration: z.number().int().min(5).max(1440).optional(), // Max 24 hours
  price: z.number().min(0).max(100000000),
  description: z.string().max(2000).optional(),
  requiresAnesthesia: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const wardMasterSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20),
  type: z.enum(['GENERAL', 'SEMI_PRIVATE', 'PRIVATE', 'DELUXE', 'SUITE', 'ICU', 'CCU', 'NICU', 'PICU', 'ISOLATION']),
  floor: z.string().max(50),
  totalBeds: z.number().int().min(1).max(1000),
  dailyRate: z.number().min(0).max(1000000),
  nursingChargePerDay: z.number().min(0).max(100000).optional(),
  isActive: z.boolean().default(true),
});

// Validation middleware factory
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    req.validatedBody = result.data;
    next();
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details: result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    req.validatedQuery = result.data;
    next();
  };
}

export function validateParams<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid path parameters',
        details: result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    req.validatedParams = result.data;
    next();
  };
}

// Common param schemas
export const idParamSchema = z.object({
  id: idSchema,
});

export const patientIdParamSchema = z.object({
  patientId: idSchema,
});

// Export type helpers
export type LoginInput = z.infer<typeof loginSchema>;
export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type CreateEncounterInput = z.infer<typeof createEncounterSchema>;
export type OPDNoteInput = z.infer<typeof opdNoteSchema>;
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type CreateAdmissionInput = z.infer<typeof createAdmissionSchema>;
export type DischargeInput = z.infer<typeof dischargeSchema>;
export type CreateLabOrderInput = z.infer<typeof createLabOrderSchema>;
export type LabResultInput = z.infer<typeof labResultSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type CreateEmergencyInput = z.infer<typeof createEmergencySchema>;
export type ScheduleSurgeryInput = z.infer<typeof scheduleSurgerySchema>;
export type BloodDonorInput = z.infer<typeof bloodDonorSchema>;
export type BloodRequestInput = z.infer<typeof bloodRequestSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;
