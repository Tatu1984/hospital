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
// Note: loginSchema should NOT enforce password length - let authentication handle invalid passwords
// Password length validation should only apply to new password creation/changes
export const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  password: z.string().min(1, 'Password is required').max(100),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),  // Don't enforce length for existing passwords
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
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
  doctorId: idSchema.optional().nullable(), // Optional for lab/radiology
  appointmentDate: z.string(),
  appointmentTime: z.string(),
  endTime: z.string().optional(),
  type: z.enum(['consultation', 'lab', 'radiology', 'procedure', 'health_checkup']).default('consultation'),
  category: z.string().optional(), // blood_test, urine_test, xray, ct_scan, mri, ultrasound, ecg
  reason: z.string().max(1000).optional(),
  notes: z.string().max(1000).optional(),
  department: z.string().optional(),
  priority: z.enum(['normal', 'urgent', 'emergency']).default('normal'),
  // Lab/Radiology specific
  testIds: z.array(z.string()).optional(),
  testNames: z.array(z.string()).optional(),
  modality: z.string().optional(), // X-Ray, CT, MRI, Ultrasound
  preparationInstructions: z.string().optional(),
  // Scheduling
  estimatedDuration: z.number().int().min(5).max(480).optional(),
  roomNumber: z.string().optional(),
  machineId: z.string().optional(),
  technicianId: z.string().optional(),
  // Referral
  referredBy: z.string().optional(),
  referralNotes: z.string().optional(),
});

export const updateAppointmentSchema = z.object({
  appointmentDate: z.string().optional(),
  appointmentTime: z.string().optional(),
  endTime: z.string().optional(),
  type: z.enum(['consultation', 'lab', 'radiology', 'procedure', 'health_checkup']).optional(),
  category: z.string().optional(),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).optional(),
  priority: z.enum(['normal', 'urgent', 'emergency']).optional(),
  reason: z.string().max(1000).optional(),
  notes: z.string().max(1000).optional(),
  department: z.string().optional(),
  testIds: z.array(z.string()).optional(),
  testNames: z.array(z.string()).optional(),
  modality: z.string().optional(),
  preparationInstructions: z.string().optional(),
  estimatedDuration: z.number().int().optional(),
  roomNumber: z.string().optional(),
  machineId: z.string().optional(),
  technicianId: z.string().optional(),
  referredBy: z.string().optional(),
  referralNotes: z.string().optional(),
  reportReady: z.boolean().optional(),
  reportUrl: z.string().optional(),
  isPaid: z.boolean().optional(),
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
  admissionId: idSchema.optional(),
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
  admissionId: idSchema.optional(),
  tests: z.array(z.object({
    testId: idSchema,
    priority: z.enum(['ROUTINE', 'URGENT', 'STAT']).default('ROUTINE'),
    notes: z.string().max(500).optional(),
  })).min(1),
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
// OPD Workflow validators
export const updateEncounterSchema = z.object({
  subjective: z.string().max(5000).optional(),
  objective: z.string().max(5000).optional(),
  assessment: z.string().max(2000).optional(),
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

// ===========================
// ANESTHESIA & OT VALIDATORS
// ===========================

export const createAnesthesiaRecordSchema = z.object({
  surgeryId: idSchema,
  patientId: idSchema,
  anesthetistId: idSchema,
  anesthesiaType: z.enum(['general', 'spinal', 'epidural', 'local', 'regional', 'MAC', 'sedation']),
  preOpAssessment: z.object({
    asaGrade: z.enum(['I', 'II', 'III', 'IV', 'V', 'VI']),
    airwayAssessment: z.object({
      mallamapati: z.enum(['I', 'II', 'III', 'IV']).optional(),
      thyromental: z.number().optional(),
      mouthOpening: z.string().max(100).optional(),
      neckMobility: z.string().max(100).optional(),
      dentition: z.string().max(200).optional(),
    }).optional(),
    npoStatus: z.object({
      lastSolid: z.string().datetime().optional(),
      lastFluid: z.string().datetime().optional(),
      hoursNPO: z.number().optional(),
    }),
    preExistingConditions: z.array(z.string()).optional(),
    currentMedications: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    labValues: z.record(z.string(), z.any()).optional(),
  }),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
});

export const updateAnesthesiaRecordSchema = z.object({
  agents: z.array(z.object({
    name: z.string().min(1).max(200),
    dose: z.string().max(100),
    unit: z.string().max(50).optional(),
    route: z.enum(['IV', 'IM', 'SC', 'PO', 'Inhalation', 'Topical', 'Intrathecal', 'Epidural']),
    time: z.string().datetime(),
  })).optional(),
  airwayManagement: z.object({
    technique: z.enum(['mask', 'LMA', 'ETT', 'tracheostomy', 'none']).optional(),
    ettSize: z.string().max(50).optional(),
    ettDepth: z.string().max(50).optional(),
    cuffPressure: z.number().optional(),
    intubationAttempts: z.number().int().min(0).max(10).optional(),
    difficulty: z.enum(['easy', 'moderate', 'difficult']).optional(),
    ventilatorSettings: z.object({
      mode: z.string().max(50).optional(),
      tidalVolume: z.number().optional(),
      respiratoryRate: z.number().optional(),
      fio2: z.number().min(21).max(100).optional(),
      peep: z.number().optional(),
      pip: z.number().optional(),
    }).optional(),
  }).optional(),
  fluidBalance: z.object({
    ivFluids: z.array(z.object({
      fluid: z.string().max(100),
      volume: z.number(),
      time: z.string().datetime(),
    })).optional(),
    bloodProducts: z.array(z.object({
      product: z.string().max(100),
      volume: z.number(),
      time: z.string().datetime(),
    })).optional(),
    urineOutput: z.number().optional(),
    bloodLoss: z.number().optional(),
    drains: z.array(z.object({
      type: z.string().max(50),
      output: z.number(),
    })).optional(),
  }).optional(),
  recoveryNotes: z.string().max(5000).optional(),
  postOpInstructions: z.string().max(5000).optional(),
  endTime: z.string().datetime().optional(),
});

export const addVitalsEntrySchema = z.object({
  heartRate: z.number().int().min(0).max(300).optional(),
  systolicBP: z.number().int().min(0).max(300).optional(),
  diastolicBP: z.number().int().min(0).max(200).optional(),
  meanBP: z.number().int().min(0).max(250).optional(),
  temperature: z.number().min(25).max(45).optional(),
  spo2: z.number().int().min(0).max(100).optional(),
  etco2: z.number().int().min(0).max(100).optional(),
  respiratoryRate: z.number().int().min(0).max(100).optional(),
  time: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

export const addAnesthesiaComplicationSchema = z.object({
  type: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  management: z.string().min(1).max(2000),
  time: z.string().datetime(),
});

export const reportSurgeryComplicationSchema = z.object({
  surgeryId: idSchema,
  type: z.enum(['intraoperative', 'postoperative']),
  description: z.string().min(10).max(5000),
  severity: z.enum(['minor', 'moderate', 'major', 'critical']),
  managementDone: z.string().min(10).max(5000),
  outcome: z.string().min(1).max(1000),
  reportedBy: idSchema,
});

export const addSurgeryImplantSchema = z.object({
  surgeryId: idSchema,
  implantName: z.string().min(1).max(200),
  manufacturer: z.string().min(1).max(200),
  serialNumber: z.string().min(1).max(100),
  batchNumber: z.string().min(1).max(100),
  expiryDate: optionalDateSchema,
  quantity: z.number().int().min(1).max(1000),
  cost: z.number().min(0).max(10000000),
});

// Export types
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
export type UpdateEncounterInput = z.infer<typeof updateEncounterSchema>;
export type CreateAnesthesiaRecordInput = z.infer<typeof createAnesthesiaRecordSchema>;
export type UpdateAnesthesiaRecordInput = z.infer<typeof updateAnesthesiaRecordSchema>;
export type AddVitalsEntryInput = z.infer<typeof addVitalsEntrySchema>;
export type ReportSurgeryComplicationInput = z.infer<typeof reportSurgeryComplicationSchema>;
export type AddSurgeryImplantInput = z.infer<typeof addSurgeryImplantSchema>;

// ===========================
// SHIFT MANAGEMENT VALIDATORS
// ===========================

export const createShiftTemplateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  code: z.string().min(2).max(50).regex(/^[A-Z0-9_-]+$/, 'Code must contain only uppercase letters, numbers, underscores, and hyphens'),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM (24-hour format)'),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM (24-hour format)'),
  breakMinutes: z.number().int().min(0).max(180).default(30),
  isOvernight: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateShiftTemplateSchema = createShiftTemplateSchema.partial();

export const createShiftSchema = z.object({
  templateId: idSchema,
  employeeId: idSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
  status: z.enum(['scheduled', 'started', 'completed', 'absent', 'leave']).default('scheduled'),
  notes: z.string().max(500).optional(),
});

export const updateShiftSchema = z.object({
  templateId: idSchema.optional(),
  status: z.enum(['scheduled', 'started', 'completed', 'absent', 'leave']).optional(),
  notes: z.string().max(500).optional(),
  actualStartTime: z.string().datetime().optional(),
  actualEndTime: z.string().datetime().optional(),
});

export const getShiftsQuerySchema = z.object({
  employeeId: idSchema.optional(),
  department: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['scheduled', 'started', 'completed', 'absent', 'leave']).optional(),
  templateId: idSchema.optional(),
}).merge(paginationSchema);

export const generateRosterSchema = z.object({
  departmentId: z.string().optional().nullable(),
  wardId: z.string().optional().nullable(),
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
  publishImmediately: z.boolean().default(false),
});

export const publishRosterSchema = z.object({
  rosterId: idSchema,
});

export const createShiftSwapRequestSchema = z.object({
  requestedShiftId: idSchema,
  targetEmployeeId: idSchema.optional().nullable(),
  offeredShiftId: idSchema.optional().nullable(),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500).optional(),
});

export const approveShiftSwapSchema = z.object({
  swapRequestId: idSchema,
  approved: z.boolean(),
});

export const getRosterQuerySchema = z.object({
  departmentId: z.string().optional(),
  wardId: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['draft', 'published']).optional(),
}).merge(paginationSchema);

export const getStaffingReportSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
  departmentId: z.string().optional(),
  wardId: z.string().optional(),
});

export const calculateOvertimeSchema = z.object({
  employeeId: idSchema,
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

// Export shift management types
export type CreateShiftTemplateInput = z.infer<typeof createShiftTemplateSchema>;
export type UpdateShiftTemplateInput = z.infer<typeof updateShiftTemplateSchema>;
export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
export type GenerateRosterInput = z.infer<typeof generateRosterSchema>;
export type CreateShiftSwapRequestInput = z.infer<typeof createShiftSwapRequestSchema>;
export type GetStaffingReportInput = z.infer<typeof getStaffingReportSchema>;
export type CalculateOvertimeInput = z.infer<typeof calculateOvertimeSchema>;

// ===========================
// BED MANAGEMENT VALIDATORS
// ===========================

export const checkBedAvailabilitySchema = z.object({
  fromDate: z.string().datetime('Invalid date format'),
  toDate: z.string().datetime('Invalid date format').optional(),
});

export const findAvailableBedsSchema = z.object({
  wardId: idSchema,
  category: z.string().min(1).max(50),
  fromDate: z.string().datetime('Invalid date format'),
  toDate: z.string().datetime('Invalid date format').optional(),
});

export const reserveBedSchema = z.object({
  bedId: idSchema,
  patientId: idSchema,
  reservedFrom: z.string().datetime('Invalid date format'),
  reservedUntil: z.string().datetime('Invalid date format'),
  admissionId: idSchema.optional(),
  remarks: z.string().max(500).optional(),
}).refine((data) => {
  const from = new Date(data.reservedFrom);
  const until = new Date(data.reservedUntil);
  return until > from;
}, {
  message: 'reservedUntil must be after reservedFrom',
  path: ['reservedUntil'],
});

export const updateBedStatusSchema = z.object({
  status: z.enum(['vacant', 'occupied', 'reserved', 'maintenance', 'dirty']),
});

export const transferBedSchema = z.object({
  admissionId: idSchema,
  newBedId: idSchema,
  reason: z.string().max(500).optional(),
});

export const getBedHistorySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const getAvailableBedsQuerySchema = z.object({
  wardId: idSchema.optional(),
  category: z.string().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  floor: z.string().optional(),
});

// Export bed management types
export type CheckBedAvailabilityInput = z.infer<typeof checkBedAvailabilitySchema>;
export type FindAvailableBedsInput = z.infer<typeof findAvailableBedsSchema>;
export type ReserveBedInput = z.infer<typeof reserveBedSchema>;
export type UpdateBedStatusInput = z.infer<typeof updateBedStatusSchema>;
export type TransferBedInput = z.infer<typeof transferBedSchema>;
export type GetBedHistoryInput = z.infer<typeof getBedHistorySchema>;
export type GetAvailableBedsQueryInput = z.infer<typeof getAvailableBedsQuerySchema>;

// ===========================
// PACS (RADIOLOGY) VALIDATORS
// ===========================

export const createRadiologyStudySchema = z.object({
  orderId: idSchema,
  patientId: idSchema,
  modality: z.enum(['CR', 'CT', 'MR', 'US', 'XR', 'DX', 'MG', 'PT', 'NM', 'RF', 'OT']),
  studyDescription: z.string().min(1).max(500).optional(),
  referringPhysician: z.string().max(200).optional(),
  performingTechnician: z.string().max(200).optional(),
  studyDate: z.string().datetime().optional(),
});

export const updateStudyStatusSchema = z.object({
  status: z.enum(['scheduled', 'in_progress', 'completed', 'reported']),
});

export const createRadiologySeriesSchema = z.object({
  studyId: idSchema,
  seriesNumber: z.number().int().min(1).max(9999),
  modality: z.enum(['CR', 'CT', 'MR', 'US', 'XR', 'DX', 'MG', 'PT', 'NM', 'RF', 'OT']),
  seriesDescription: z.string().max(500).optional(),
  bodyPart: z.string().max(100).optional(),
  seriesInstanceUID: z.string().max(200).optional(),
});

export const uploadRadiologyImageSchema = z.object({
  studyId: idSchema,
  seriesId: idSchema.optional(),
  seriesNumber: z.number().int().min(1).max(9999).default(1),
  instanceNumber: z.number().int().min(1).max(9999),
  imageType: z.enum(['ORIGINAL', 'DERIVED']).default('ORIGINAL'),
  sopInstanceUID: z.string().max(200).optional(),
  rows: z.number().int().min(1).max(10000).optional(),
  columns: z.number().int().min(1).max(10000).optional(),
  bitsAllocated: z.number().int().min(1).max(32).optional(),
  windowCenter: z.number().optional(),
  windowWidth: z.number().optional(),
});

export const createImageAnnotationSchema = z.object({
  imageId: idSchema,
  type: z.enum(['text', 'arrow', 'circle', 'measurement', 'roi']),
  coordinates: z.object({
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    points: z.array(z.object({
      x: z.number(),
      y: z.number(),
    })).optional(),
  }),
  label: z.string().max(200).optional(),
  color: z.string().max(50).optional(),
  createdBy: idSchema,
});

export const createRadiologyReportSchema = z.object({
  studyId: idSchema,
  reportType: z.enum(['preliminary', 'final', 'addendum']).default('final'),
  findings: z.string().min(10, 'Findings must be at least 10 characters').max(10000),
  impression: z.string().min(10, 'Impression must be at least 10 characters').max(5000),
  recommendations: z.string().max(2000).optional(),
  reportedBy: idSchema,
  templateUsed: idSchema.optional(),
});

export const updateRadiologyReportSchema = z.object({
  findings: z.string().min(10).max(10000).optional(),
  impression: z.string().min(10).max(5000).optional(),
  recommendations: z.string().max(2000).optional(),
  status: z.enum(['draft', 'preliminary', 'final']).optional(),
  verifiedBy: idSchema.optional(),
  verifiedAt: z.string().datetime().optional(),
});

export const createReportTemplateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  modality: z.enum(['CR', 'CT', 'MR', 'US', 'XR', 'DX', 'MG', 'PT', 'NM', 'RF', 'OT']),
  bodyPart: z.string().max(100).optional(),
  content: z.string().min(10, 'Template content must be at least 10 characters').max(20000),
  createdBy: idSchema,
});

export const updateReportTemplateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  bodyPart: z.string().max(100).optional(),
  content: z.string().min(10).max(20000).optional(),
  isActive: z.boolean().optional(),
});

export const listStudiesQuerySchema = z.object({
  patientId: idSchema.optional(),
  modality: z.enum(['CR', 'CT', 'MR', 'US', 'XR', 'DX', 'MG', 'PT', 'NM', 'RF', 'OT']).optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'reported']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
}).merge(paginationSchema);

export const getReportTemplatesQuerySchema = z.object({
  modality: z.enum(['CR', 'CT', 'MR', 'US', 'XR', 'DX', 'MG', 'PT', 'NM', 'RF', 'OT']).optional(),
  bodyPart: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
});

// Export PACS types
export type CreateRadiologyStudyInput = z.infer<typeof createRadiologyStudySchema>;
export type UpdateStudyStatusInput = z.infer<typeof updateStudyStatusSchema>;
export type CreateRadiologySeriesInput = z.infer<typeof createRadiologySeriesSchema>;
export type UploadRadiologyImageInput = z.infer<typeof uploadRadiologyImageSchema>;
export type CreateImageAnnotationInput = z.infer<typeof createImageAnnotationSchema>;
export type CreateRadiologyReportInput = z.infer<typeof createRadiologyReportSchema>;
export type UpdateRadiologyReportInput = z.infer<typeof updateRadiologyReportSchema>;
export type CreateReportTemplateInput = z.infer<typeof createReportTemplateSchema>;
export type UpdateReportTemplateInput = z.infer<typeof updateReportTemplateSchema>;
export type ListStudiesQueryInput = z.infer<typeof listStudiesQuerySchema>;
export type GetReportTemplatesQueryInput = z.infer<typeof getReportTemplatesQuerySchema>;

// ===========================
// BARCODE VALIDATORS
// ===========================

export const barcodeTypeEnum = z.enum(['EAN13', 'CODE128', 'QR', 'CODE39', 'DATAMATRIX']);
export const entityTypeEnum = z.enum(['drug', 'inventory_item', 'patient', 'sample']);
export const scanActionEnum = z.enum(['lookup', 'dispense', 'receive', 'verify', 'stock_take']);

// Generate barcode schema
export const generateBarcodeSchema = z.object({
  entityType: entityTypeEnum,
  entityId: idSchema,
  barcodeType: barcodeTypeEnum.default('CODE128').optional(),
  prefix: z.string().max(10).optional(),
});

// Bulk generate barcodes schema
export const bulkGenerateBarcodeSchema = z.object({
  entityType: entityTypeEnum,
  entityIds: z.array(idSchema).min(1, 'At least one entity ID required').max(100, 'Maximum 100 entities at once'),
  barcodeType: barcodeTypeEnum.default('CODE128').optional(),
});

// Barcode lookup schema
export const barcodeLookupSchema = z.object({
  code: z.string().min(1, 'Barcode code is required').max(128),
});

// Record scan schema
export const recordScanSchema = z.object({
  code: z.string().min(1, 'Barcode code is required').max(128),
  action: scanActionEnum,
  location: z.string().max(100).optional(),
  additionalData: z.record(z.any()).optional(),
});

// Scan history query schema
export const scanHistoryQuerySchema = z.object({
  code: z.string().max(128).optional(),
  scannedBy: idSchema.optional(),
  action: scanActionEnum.optional(),
  location: z.string().max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100).optional(),
});

// Validate barcode schema
export const validateBarcodeSchema = z.object({
  code: z.string().min(1, 'Barcode code is required').max(128),
  type: barcodeTypeEnum.optional(),
});

// Pharmacy dispense by barcode schema
export const pharmacyDispenseByBarcodeSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required').max(128),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  patientId: idSchema.optional(),
  prescriptionId: idSchema.optional(),
  paymentMode: z.enum(['cash', 'card', 'upi', 'insurance', 'credit']).default('cash').optional(),
  location: z.string().max(100).optional(),
});

// Inventory receive by barcode schema
export const inventoryReceiveByBarcodeSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required').max(128),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  storeId: z.string().min(1, 'Store ID is required'),
  batchNumber: z.string().max(50).optional(),
  expiryDate: dateSchema.optional(),
  poNumber: z.string().max(50).optional(),
  vendorName: z.string().max(200).optional(),
  location: z.string().max(100).optional(),
});

// Inventory issue by barcode schema
export const inventoryIssueByBarcodeSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required').max(128),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  storeId: z.string().min(1, 'Store ID is required'),
  issuedTo: z.string().max(200).optional(),
  department: z.string().max(100).optional(),
  requisitionNumber: z.string().max(50).optional(),
  location: z.string().max(100).optional(),
});

// Inventory verify by barcode schema
export const inventoryVerifyByBarcodeSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required').max(128),
  storeId: z.string().min(1, 'Store ID is required'),
  physicalCount: z.number().int().min(0, 'Physical count cannot be negative'),
  location: z.string().max(100).optional(),
});

// Export barcode types
export type GenerateBarcodeInput = z.infer<typeof generateBarcodeSchema>;
export type BulkGenerateBarcodeInput = z.infer<typeof bulkGenerateBarcodeSchema>;
export type BarcodeLookupInput = z.infer<typeof barcodeLookupSchema>;
export type RecordScanInput = z.infer<typeof recordScanSchema>;
export type ScanHistoryQueryInput = z.infer<typeof scanHistoryQuerySchema>;
export type ValidateBarcodeInput = z.infer<typeof validateBarcodeSchema>;
export type PharmacyDispenseByBarcodeInput = z.infer<typeof pharmacyDispenseByBarcodeSchema>;
export type InventoryReceiveByBarcodeInput = z.infer<typeof inventoryReceiveByBarcodeSchema>;
export type InventoryIssueByBarcodeInput = z.infer<typeof inventoryIssueByBarcodeSchema>;
export type InventoryVerifyByBarcodeInput = z.infer<typeof inventoryVerifyByBarcodeSchema>;
