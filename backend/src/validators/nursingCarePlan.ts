/**
 * Nursing Care Plan Validators
 *
 * Validation schemas for nursing care plan endpoints using Zod
 */

import { z } from 'zod';

// ===========================
// DIAGNOSIS VALIDATORS
// ===========================

export const goalSchema = z.object({
  description: z.string().min(10, 'Goal description must be at least 10 characters'),
  targetDate: z.coerce.date().refine(date => date > new Date(), {
    message: 'Target date must be in the future'
  })
});

export const diagnosisSchema = z.object({
  code: z.string().optional(),
  diagnosis: z.string().min(5, 'Diagnosis must be at least 5 characters'),
  relatedTo: z.string().min(5, 'Related to (etiology) must be at least 5 characters'),
  evidencedBy: z.array(z.string()).min(1, 'At least one sign/symptom is required'),
  priority: z.number().int().min(1).max(5),
  goals: z.array(goalSchema).optional()
});

// ===========================
// INTERVENTION VALIDATORS
// ===========================

export const interventionSchema = z.object({
  category: z.enum(['assessment', 'therapeutic', 'teaching', 'referral'], {
    errorMap: () => ({ message: 'Category must be assessment, therapeutic, teaching, or referral' })
  }),
  intervention: z.string().min(10, 'Intervention must be at least 10 characters'),
  frequency: z.string().min(2, 'Frequency is required (e.g., Q4H, TID, PRN)'),
  instructions: z.string().optional()
});

// ===========================
// CARE PLAN VALIDATORS
// ===========================

export const createCarePlanSchema = z.object({
  admissionId: z.string().uuid('Invalid admission ID'),
  patientId: z.string().uuid('Invalid patient ID'),
  createdBy: z.string().uuid('Invalid creator ID'),
  diagnoses: z.array(diagnosisSchema).min(1, 'At least one nursing diagnosis is required'),
  interventions: z.array(interventionSchema).min(1, 'At least one intervention is required')
});

export const updateCarePlanStatusSchema = z.object({
  status: z.enum(['active', 'completed', 'discontinued'], {
    errorMap: () => ({ message: 'Status must be active, completed, or discontinued' })
  }),
  endDate: z.coerce.date().optional()
});

// ===========================
// EVALUATION VALIDATORS
// ===========================

export const evaluationSchema = z.object({
  carePlanId: z.string().uuid('Invalid care plan ID'),
  evaluatedBy: z.string().uuid('Invalid evaluator ID'),
  overallStatus: z.enum(['improving', 'stable', 'deteriorating'], {
    errorMap: () => ({ message: 'Overall status must be improving, stable, or deteriorating' })
  }),
  notes: z.string().min(20, 'Evaluation notes must be at least 20 characters'),
  modifications: z.string().optional()
});

// ===========================
// GOAL OUTCOME VALIDATORS
// ===========================

export const updateGoalOutcomeSchema = z.object({
  outcome: z.enum(['met', 'partially_met', 'not_met'], {
    errorMap: () => ({ message: 'Outcome must be met, partially_met, or not_met' })
  })
});

// ===========================
// INTERVENTION EXECUTION VALIDATORS
// ===========================

export const executeInterventionSchema = z.object({
  executedBy: z.string().uuid('Invalid executor ID'),
  notes: z.string().optional(),
  patientResponse: z.string().optional()
});

// ===========================
// ASSESSMENT SCALE VALIDATORS
// ===========================

const bradenAnswersSchema = z.object({
  sensoryPerception: z.number().int().min(1).max(4),
  moisture: z.number().int().min(1).max(4),
  activity: z.number().int().min(1).max(4),
  mobility: z.number().int().min(1).max(4),
  nutrition: z.number().int().min(1).max(4),
  frictionShear: z.number().int().min(1).max(3)
});

const morseAnswersSchema = z.object({
  historyOfFalling: z.boolean(),
  secondaryDiagnosis: z.boolean(),
  ambulatoryAid: z.enum(['none', 'crutches_cane_walker', 'furniture']),
  ivTherapy: z.boolean(),
  gait: z.enum(['normal', 'weak', 'impaired']),
  mentalStatus: z.enum(['oriented', 'forgets_limitations'])
});

const glasgowAnswersSchema = z.object({
  eyeOpening: z.number().int().min(1).max(4),
  verbalResponse: z.number().int().min(1).max(5),
  motorResponse: z.number().int().min(1).max(6)
});

const painAnswersSchema = z.object({
  painLevel: z.number().int().min(0).max(10),
  location: z.string().optional(),
  quality: z.string().optional(),
  onset: z.string().optional(),
  aggravatingFactors: z.array(z.string()).optional(),
  relievingFactors: z.array(z.string()).optional()
});

export const assessmentScaleSchema = z.object({
  admissionId: z.string().uuid('Invalid admission ID'),
  patientId: z.string().uuid('Invalid patient ID'),
  scaleType: z.enum(['braden', 'morse', 'glasgow', 'pain'], {
    errorMap: () => ({ message: 'Scale type must be braden, morse, glasgow, or pain' })
  }),
  answers: z.union([
    bradenAnswersSchema,
    morseAnswersSchema,
    glasgowAnswersSchema,
    painAnswersSchema
  ]),
  assessedBy: z.string().uuid('Invalid assessor ID')
}).refine(
  (data) => {
    // Validate that answers match the scale type
    if (data.scaleType === 'braden') {
      return bradenAnswersSchema.safeParse(data.answers).success;
    } else if (data.scaleType === 'morse') {
      return morseAnswersSchema.safeParse(data.answers).success;
    } else if (data.scaleType === 'glasgow') {
      return glasgowAnswersSchema.safeParse(data.answers).success;
    } else if (data.scaleType === 'pain') {
      return painAnswersSchema.safeParse(data.answers).success;
    }
    return false;
  },
  {
    message: 'Answers do not match the selected scale type'
  }
);
