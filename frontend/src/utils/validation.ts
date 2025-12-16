import { z } from 'zod';

// Common validation patterns
const phoneRegex = /^[+]?[\d\s-]{10,15}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reusable validators
export const validators = {
  required: (fieldName: string) => z.string().min(1, `${fieldName} is required`),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(phoneRegex, 'Invalid phone number (10-15 digits)'),
  optionalPhone: z.string().regex(phoneRegex, 'Invalid phone number').optional().or(z.literal('')),
  optionalEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  positiveNumber: z.number().positive('Must be a positive number'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  uuid: z.string().uuid('Invalid ID format'),
};

// Patient validation schema
export const patientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  dob: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  contact: z.string().regex(phoneRegex, 'Invalid phone number').optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().max(500, 'Address too long').optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  allergies: z.string().max(1000).optional(),
});

// Appointment validation schema
export const appointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  doctorId: z.string().min(1, 'Doctor is required'),
  scheduledAt: z.string().min(1, 'Date and time is required'),
  type: z.enum(['NEW', 'FOLLOW_UP', 'EMERGENCY', 'CONSULTATION']).default('NEW'),
  notes: z.string().max(1000).optional(),
  duration: z.number().min(5).max(240).default(30),
});

// Lab order validation schema
export const labOrderSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  tests: z.array(z.object({
    testId: z.string().min(1),
    priority: z.enum(['ROUTINE', 'URGENT', 'STAT']).default('ROUTINE'),
  })).min(1, 'At least one test is required'),
  clinicalInfo: z.string().max(1000).optional(),
});

// Admission validation schema
export const admissionSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  wardId: z.string().min(1, 'Ward is required'),
  bedId: z.string().min(1, 'Bed is required'),
  admittingDoctorId: z.string().min(1, 'Admitting doctor is required'),
  admissionType: z.enum(['EMERGENCY', 'ELECTIVE', 'TRANSFER']).default('ELECTIVE'),
  provisionalDiagnosis: z.string().max(1000).optional(),
});

// Invoice validation schema
export const invoiceSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  items: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unitPrice: z.number().min(0, 'Price cannot be negative'),
  })).min(1, 'At least one item is required'),
});

// Payment validation schema
export const paymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  paymentMode: z.enum(['CASH', 'CARD', 'UPI', 'CHEQUE', 'BANK_TRANSFER', 'INSURANCE']),
  referenceNumber: z.string().optional(),
});

// Employee validation schema
export const employeeSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(phoneRegex, 'Invalid phone number'),
  department: z.string().min(1, 'Department is required'),
  designation: z.string().min(1, 'Designation is required'),
  dateOfJoining: z.string().min(1, 'Date of joining is required'),
});

// Leave request validation schema
export const leaveRequestSchema = z.object({
  leaveType: z.enum(['CASUAL', 'SICK', 'EARNED', 'MATERNITY', 'PATERNITY', 'UNPAID']),
  fromDate: z.string().min(1, 'Start date is required'),
  toDate: z.string().min(1, 'End date is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

// Blood donor validation schema
export const bloodDonorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  contact: z.string().regex(phoneRegex, 'Invalid phone number'),
  dob: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['MALE', 'FEMALE']),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  address: z.string().min(5, 'Address is required'),
});

// Emergency case validation schema
export const emergencyCaseSchema = z.object({
  patientName: z.string().min(1, 'Patient name is required'),
  triageLevel: z.enum(['RED', 'YELLOW', 'GREEN']),
  chiefComplaint: z.string().min(1, 'Chief complaint is required'),
  arrivalMode: z.enum(['WALK_IN', 'AMBULANCE', 'POLICE', 'REFERRED']).default('WALK_IN'),
  isMLC: z.boolean().default(false),
});

// Surgery validation schema
export const surgerySchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  procedureId: z.string().min(1, 'Procedure is required'),
  surgeonId: z.string().min(1, 'Surgeon is required'),
  otRoomId: z.string().min(1, 'OT Room is required'),
  scheduledDate: z.string().min(1, 'Date is required'),
  estimatedDuration: z.number().min(15, 'Duration must be at least 15 minutes'),
  anesthesiaType: z.enum(['GENERAL', 'SPINAL', 'EPIDURAL', 'LOCAL', 'REGIONAL', 'SEDATION']),
});

// Diet order validation schema
export const dietOrderSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  admissionId: z.string().min(1, 'Admission is required'),
  dietType: z.enum(['REGULAR', 'SOFT', 'LIQUID', 'DIABETIC', 'LOW_SODIUM', 'RENAL', 'CARDIAC', 'NPO', 'CLEAR_LIQUID', 'FULL_LIQUID', 'HIGH_PROTEIN', 'LOW_FAT', 'GLUTEN_FREE', 'VEGETARIAN', 'CUSTOM']),
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']),
  specialInstructions: z.string().optional(),
});

// Housekeeping task validation schema
export const housekeepingTaskSchema = z.object({
  taskType: z.enum(['BED_CLEANING', 'ROOM_CLEANING', 'LINEN_CHANGE', 'WASTE_DISPOSAL', 'SANITIZATION', 'GENERAL_CLEANING']),
  location: z.string().min(1, 'Location is required'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  notes: z.string().optional(),
});

// Quality incident validation schema
export const incidentSchema = z.object({
  incidentType: z.enum(['FALL', 'MEDICATION_ERROR', 'NEEDLE_STICK', 'PATIENT_COMPLAINT', 'EQUIPMENT_FAILURE', 'INFECTION', 'NEAR_MISS', 'ADVERSE_EVENT', 'OTHER']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  occurredAt: z.string().min(1, 'Date/time is required'),
  location: z.string().min(1, 'Location is required'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  immediateAction: z.string().optional(),
});

// Ambulance trip validation schema
export const ambulanceTripSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  pickupLocation: z.string().min(5, 'Pickup location is required'),
  dropLocation: z.string().min(5, 'Drop location is required'),
  tripType: z.enum(['EMERGENCY', 'TRANSFER', 'DISCHARGE', 'SCHEDULED']),
  patientName: z.string().optional(),
  patientContact: z.string().regex(phoneRegex, 'Invalid phone number').optional().or(z.literal('')),
});

// Referral source validation schema
export const referralSourceSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  code: z.string().min(2, 'Code is required'),
  type: z.enum(['DOCTOR', 'AGENT', 'HOSPITAL', 'CORPORATE', 'INSURANCE', 'OTHER']),
  contact: z.string().regex(phoneRegex, 'Invalid phone number').optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  commissionType: z.enum(['PERCENTAGE', 'FIXED', 'TIERED']),
  commissionValue: z.number().min(0).max(100),
});

// Validation helper function
export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });

  return { success: false, errors };
}

// Field validation helper
export function validateField<T>(schema: z.ZodSchema<T>, value: unknown): string | null {
  const result = schema.safeParse(value);
  if (result.success) {
    return null;
  }
  return result.error.errors[0]?.message || 'Invalid value';
}

export default {
  validators,
  patientSchema,
  appointmentSchema,
  labOrderSchema,
  admissionSchema,
  invoiceSchema,
  paymentSchema,
  employeeSchema,
  leaveRequestSchema,
  bloodDonorSchema,
  emergencyCaseSchema,
  surgerySchema,
  dietOrderSchema,
  housekeepingTaskSchema,
  incidentSchema,
  ambulanceTripSchema,
  referralSourceSchema,
  validateForm,
  validateField,
};
