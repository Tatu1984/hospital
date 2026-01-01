/**
 * Nursing Care Plan Service
 *
 * Comprehensive nursing care plan management including:
 * - Care plan creation and management
 * - Nursing diagnoses with NANDA codes
 * - Goal setting and evaluation
 * - Nursing interventions and execution
 * - Assessment scales (Braden, Morse, Pain, Glasgow)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ===========================
// TYPE DEFINITIONS
// ===========================

export interface CreateCarePlanInput {
  admissionId: string;
  patientId: string;
  createdBy: string;
  diagnoses: DiagnosisInput[];
  interventions: InterventionInput[];
}

export interface DiagnosisInput {
  code?: string;
  diagnosis: string;
  relatedTo: string;
  evidencedBy: string[];
  priority: number;
  goals?: GoalInput[];
}

export interface GoalInput {
  description: string;
  targetDate: Date;
}

export interface InterventionInput {
  category: string;
  intervention: string;
  frequency: string;
  instructions?: string;
}

export interface EvaluationInput {
  carePlanId: string;
  evaluatedBy: string;
  overallStatus: string;
  notes: string;
  modifications?: string;
}

export interface AssessmentScaleInput {
  admissionId: string;
  patientId: string;
  scaleType: string;
  answers: Record<string, any>;
  assessedBy: string;
}

// ===========================
// INTERVENTION TEMPLATES
// ===========================

export const INTERVENTION_TEMPLATES = {
  'pressure_ulcer_risk': [
    {
      category: 'assessment',
      intervention: 'Assess skin integrity every shift, paying special attention to bony prominences',
      frequency: 'Q8H',
      instructions: 'Document any redness, breakdown, or changes in skin condition'
    },
    {
      category: 'therapeutic',
      intervention: 'Reposition patient to relieve pressure on vulnerable areas',
      frequency: 'Q2H',
      instructions: 'Use pillows and positioning devices to maintain proper alignment'
    },
    {
      category: 'therapeutic',
      intervention: 'Apply pressure-relieving mattress or cushion',
      frequency: 'Continuous',
      instructions: 'Ensure device is functioning properly and properly positioned'
    },
    {
      category: 'therapeutic',
      intervention: 'Keep skin clean and dry',
      frequency: 'PRN',
      instructions: 'Use barrier cream for incontinence management'
    },
    {
      category: 'teaching',
      intervention: 'Educate patient/family on importance of position changes',
      frequency: 'Once daily',
      instructions: 'Provide written materials on pressure ulcer prevention'
    }
  ],
  'fall_risk': [
    {
      category: 'assessment',
      intervention: 'Perform Morse Fall Scale assessment',
      frequency: 'Daily',
      instructions: 'Reassess after any change in condition'
    },
    {
      category: 'therapeutic',
      intervention: 'Keep bed in lowest position with brakes locked',
      frequency: 'Continuous',
      instructions: 'Ensure call bell within reach'
    },
    {
      category: 'therapeutic',
      intervention: 'Implement fall precaution protocol (yellow wristband, signage)',
      frequency: 'Continuous',
      instructions: 'Communicate fall risk to all care team members'
    },
    {
      category: 'therapeutic',
      intervention: 'Assist with ambulation and toileting',
      frequency: 'PRN',
      instructions: 'Encourage use of assistive devices as prescribed'
    },
    {
      category: 'teaching',
      intervention: 'Educate patient on fall prevention strategies',
      frequency: 'Daily',
      instructions: 'Instruct to call for assistance before getting up'
    }
  ],
  'pain_management': [
    {
      category: 'assessment',
      intervention: 'Assess pain using numeric pain scale (0-10)',
      frequency: 'Q4H and PRN',
      instructions: 'Document location, quality, intensity, and aggravating/relieving factors'
    },
    {
      category: 'therapeutic',
      intervention: 'Administer prescribed pain medication',
      frequency: 'As ordered',
      instructions: 'Follow medication administration protocol'
    },
    {
      category: 'therapeutic',
      intervention: 'Position patient for comfort',
      frequency: 'Q2-4H',
      instructions: 'Use pillows to support painful areas'
    },
    {
      category: 'therapeutic',
      intervention: 'Apply non-pharmacological pain relief measures',
      frequency: 'PRN',
      instructions: 'Heat/cold therapy, relaxation techniques, distraction'
    },
    {
      category: 'assessment',
      intervention: 'Evaluate pain relief 30-60 minutes after intervention',
      frequency: 'After each intervention',
      instructions: 'Document effectiveness and notify provider if inadequate relief'
    }
  ],
  'impaired_mobility': [
    {
      category: 'assessment',
      intervention: 'Assess range of motion and mobility limitations',
      frequency: 'Daily',
      instructions: 'Document baseline and changes in mobility status'
    },
    {
      category: 'therapeutic',
      intervention: 'Perform passive/active range of motion exercises',
      frequency: 'TID',
      instructions: 'Work within patient tolerance, avoid painful movements'
    },
    {
      category: 'therapeutic',
      intervention: 'Assist with progressive mobility (bed mobility to ambulation)',
      frequency: 'BID',
      instructions: 'Use gait belt and ensure adequate assistance'
    },
    {
      category: 'therapeutic',
      intervention: 'Apply antiembolic stockings or sequential compression devices',
      frequency: 'Continuous',
      instructions: 'Remove for 15-20 minutes each shift to assess skin'
    },
    {
      category: 'referral',
      intervention: 'Physical therapy consultation',
      frequency: 'Once',
      instructions: 'Request evaluation and treatment plan'
    }
  ],
  'fluid_volume_deficit': [
    {
      category: 'assessment',
      intervention: 'Monitor intake and output',
      frequency: 'Q8H',
      instructions: 'Document all oral, IV, and output amounts'
    },
    {
      category: 'assessment',
      intervention: 'Assess for signs of dehydration',
      frequency: 'Q4H',
      instructions: 'Check skin turgor, mucous membranes, vital signs'
    },
    {
      category: 'therapeutic',
      intervention: 'Encourage oral fluid intake',
      frequency: 'Hourly while awake',
      instructions: 'Offer preferred fluids, keep fresh water at bedside'
    },
    {
      category: 'therapeutic',
      intervention: 'Administer IV fluids as ordered',
      frequency: 'As prescribed',
      instructions: 'Monitor IV site for signs of infiltration/phlebitis'
    },
    {
      category: 'assessment',
      intervention: 'Monitor daily weight',
      frequency: 'Daily at same time',
      instructions: 'Use same scale, same clothing'
    }
  ],
  'ineffective_airway_clearance': [
    {
      category: 'assessment',
      intervention: 'Assess respiratory status including rate, depth, effort, breath sounds',
      frequency: 'Q4H',
      instructions: 'Note presence of adventitious sounds, cough effectiveness'
    },
    {
      category: 'therapeutic',
      intervention: 'Position patient in semi-Fowlers or high Fowlers position',
      frequency: 'Continuous',
      instructions: 'Reposition Q2H to facilitate lung expansion'
    },
    {
      category: 'therapeutic',
      intervention: 'Encourage deep breathing and coughing exercises',
      frequency: 'Q2H while awake',
      instructions: 'Provide pillow to splint incision if post-operative'
    },
    {
      category: 'therapeutic',
      intervention: 'Provide incentive spirometry',
      frequency: 'Q1H while awake',
      instructions: 'Demonstrate proper technique, set volume goals'
    },
    {
      category: 'therapeutic',
      intervention: 'Perform chest physiotherapy/postural drainage',
      frequency: 'TID',
      instructions: 'Coordinate with respiratory therapy'
    }
  ]
};

// ===========================
// ASSESSMENT SCALE CALCULATORS
// ===========================

/**
 * Calculate Braden Scale Score (Pressure Ulcer Risk)
 * Score Range: 6-23
 * - 19-23: No risk
 * - 15-18: Low risk
 * - 13-14: Moderate risk
 * - 10-12: High risk
 * - ≤9: Very high risk
 */
export function calculateBradenScore(answers: {
  sensoryPerception: number;  // 1-4
  moisture: number;           // 1-4
  activity: number;           // 1-4
  mobility: number;           // 1-4
  nutrition: number;          // 1-4
  frictionShear: number;      // 1-3
}): { score: number; riskLevel: string; details: any } {
  const score =
    answers.sensoryPerception +
    answers.moisture +
    answers.activity +
    answers.mobility +
    answers.nutrition +
    answers.frictionShear;

  let riskLevel: string;
  if (score >= 19) {
    riskLevel = 'no_risk';
  } else if (score >= 15) {
    riskLevel = 'low';
  } else if (score >= 13) {
    riskLevel = 'moderate';
  } else if (score >= 10) {
    riskLevel = 'high';
  } else {
    riskLevel = 'very_high';
  }

  return {
    score,
    riskLevel,
    details: {
      ...answers,
      interpretation: getRiskInterpretation('braden', riskLevel)
    }
  };
}

/**
 * Calculate Morse Fall Scale (Fall Risk)
 * Score Range: 0-125
 * - 0-24: No risk
 * - 25-50: Low risk
 * - ≥51: High risk
 */
export function calculateMorseScore(answers: {
  historyOfFalling: boolean;        // 25 or 0
  secondaryDiagnosis: boolean;      // 15 or 0
  ambulatoryAid: string;            // wheelchair=0, crutches/cane/walker=15, furniture=30
  ivTherapy: boolean;               // 20 or 0
  gait: string;                     // normal=0, weak=10, impaired=20
  mentalStatus: string;             // oriented=0, forgets_limitations=15
}): { score: number; riskLevel: string; details: any } {
  let score = 0;

  if (answers.historyOfFalling) score += 25;
  if (answers.secondaryDiagnosis) score += 15;

  if (answers.ambulatoryAid === 'furniture') score += 30;
  else if (answers.ambulatoryAid === 'crutches_cane_walker') score += 15;

  if (answers.ivTherapy) score += 20;

  if (answers.gait === 'impaired') score += 20;
  else if (answers.gait === 'weak') score += 10;

  if (answers.mentalStatus === 'forgets_limitations') score += 15;

  let riskLevel: string;
  if (score >= 51) {
    riskLevel = 'high';
  } else if (score >= 25) {
    riskLevel = 'low';
  } else {
    riskLevel = 'no_risk';
  }

  return {
    score,
    riskLevel,
    details: {
      ...answers,
      interpretation: getRiskInterpretation('morse', riskLevel)
    }
  };
}

/**
 * Calculate Glasgow Coma Scale (Consciousness Level)
 * Score Range: 3-15
 * - 13-15: Mild
 * - 9-12: Moderate
 * - 3-8: Severe
 */
export function calculateGlasgowScore(answers: {
  eyeOpening: number;      // 1-4
  verbalResponse: number;  // 1-5
  motorResponse: number;   // 1-6
}): { score: number; riskLevel: string; details: any } {
  const score = answers.eyeOpening + answers.verbalResponse + answers.motorResponse;

  let riskLevel: string;
  if (score >= 13) {
    riskLevel = 'mild';
  } else if (score >= 9) {
    riskLevel = 'moderate';
  } else {
    riskLevel = 'severe';
  }

  return {
    score,
    riskLevel,
    details: {
      ...answers,
      interpretation: getRiskInterpretation('glasgow', riskLevel)
    }
  };
}

/**
 * Calculate Pain Scale Score
 * Score Range: 0-10
 * - 0: No pain
 * - 1-3: Mild pain
 * - 4-6: Moderate pain
 * - 7-10: Severe pain
 */
export function calculatePainScore(answers: {
  painLevel: number;        // 0-10
  location?: string;
  quality?: string;
  onset?: string;
  aggravatingFactors?: string[];
  relievingFactors?: string[];
}): { score: number; riskLevel: string; details: any } {
  const score = answers.painLevel;

  let riskLevel: string;
  if (score === 0) {
    riskLevel = 'none';
  } else if (score <= 3) {
    riskLevel = 'mild';
  } else if (score <= 6) {
    riskLevel = 'moderate';
  } else {
    riskLevel = 'severe';
  }

  return {
    score,
    riskLevel,
    details: {
      ...answers,
      interpretation: getRiskInterpretation('pain', riskLevel)
    }
  };
}

/**
 * Get risk interpretation text
 */
function getRiskInterpretation(scaleType: string, riskLevel: string): string {
  const interpretations: Record<string, Record<string, string>> = {
    braden: {
      no_risk: 'No risk for pressure ulcer development',
      low: 'Low risk for pressure ulcer development',
      moderate: 'Moderate risk - implement preventive measures',
      high: 'High risk - aggressive preventive interventions required',
      very_high: 'Very high risk - maximum preventive interventions required'
    },
    morse: {
      no_risk: 'No identified fall risk',
      low: 'Low fall risk - implement standard precautions',
      high: 'High fall risk - implement fall prevention protocol'
    },
    glasgow: {
      mild: 'Mild impairment in consciousness',
      moderate: 'Moderate impairment - close monitoring required',
      severe: 'Severe impairment - critical monitoring and intervention required'
    },
    pain: {
      none: 'No pain reported',
      mild: 'Mild pain - may not require intervention',
      moderate: 'Moderate pain - intervention recommended',
      severe: 'Severe pain - immediate intervention required'
    }
  };

  return interpretations[scaleType]?.[riskLevel] || 'Unknown risk level';
}

/**
 * Calculate assessment score based on scale type
 */
export function calculateAssessmentScore(
  scaleType: string,
  answers: Record<string, any>
): { score: number; riskLevel: string; details: any } {
  switch (scaleType) {
    case 'braden':
      return calculateBradenScore(answers as any);
    case 'morse':
      return calculateMorseScore(answers as any);
    case 'glasgow':
      return calculateGlasgowScore(answers as any);
    case 'pain':
      return calculatePainScore(answers as any);
    default:
      throw new Error(`Unknown assessment scale type: ${scaleType}`);
  }
}

// ===========================
// CARE PLAN FUNCTIONS
// ===========================

/**
 * Create a comprehensive nursing care plan
 */
export async function createCarePlan(input: CreateCarePlanInput): Promise<any> {
  try {
    // Verify admission exists and is active
    const admission = await prisma.admission.findUnique({
      where: { id: input.admissionId },
      include: { patient: true }
    });

    if (!admission) {
      throw new Error('Admission not found');
    }

    if (admission.status !== 'active') {
      throw new Error('Cannot create care plan for inactive admission');
    }

    // Check if care plan already exists for this admission
    const existingCarePlan = await prisma.nursingCarePlan.findFirst({
      where: {
        admissionId: input.admissionId,
        status: 'active'
      }
    });

    if (existingCarePlan) {
      throw new Error('Active care plan already exists for this admission');
    }

    // Create care plan with diagnoses, goals, and interventions
    const carePlan = await prisma.nursingCarePlan.create({
      data: {
        admissionId: input.admissionId,
        patientId: input.patientId,
        createdBy: input.createdBy,
        status: 'active',
        diagnoses: {
          create: input.diagnoses.map(diag => ({
            code: diag.code,
            diagnosis: diag.diagnosis,
            relatedTo: diag.relatedTo,
            evidencedBy: diag.evidencedBy,
            priority: diag.priority,
            status: 'active',
            goals: diag.goals ? {
              create: diag.goals.map(goal => ({
                description: goal.description,
                targetDate: goal.targetDate
              }))
            } : undefined
          }))
        },
        interventions: {
          create: input.interventions.map(intervention => ({
            category: intervention.category,
            intervention: intervention.intervention,
            frequency: intervention.frequency,
            instructions: intervention.instructions,
            isActive: true
          }))
        }
      },
      include: {
        diagnoses: {
          include: {
            goals: true
          }
        },
        interventions: true,
        patient: {
          select: {
            id: true,
            name: true,
            mrn: true
          }
        },
        admission: {
          select: {
            id: true,
            admissionDate: true,
            bed: true
          }
        }
      }
    });

    return carePlan;
  } catch (error) {
    console.error('Error creating care plan:', error);
    throw error;
  }
}

/**
 * Get care plan for an admission
 */
export async function getCarePlanByAdmission(admissionId: string): Promise<any> {
  const carePlan = await prisma.nursingCarePlan.findFirst({
    where: { admissionId },
    include: {
      diagnoses: {
        include: {
          goals: true
        },
        orderBy: { priority: 'asc' }
      },
      interventions: {
        where: { isActive: true },
        include: {
          executions: {
            orderBy: { executedAt: 'desc' },
            take: 5
          }
        }
      },
      evaluations: {
        orderBy: { evaluatedAt: 'desc' },
        take: 10
      },
      patient: {
        select: {
          id: true,
          name: true,
          mrn: true,
          dob: true,
          gender: true
        }
      },
      admission: {
        select: {
          id: true,
          admissionDate: true,
          diagnosis: true,
          bed: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return carePlan;
}

/**
 * Update care plan status
 */
export async function updateCarePlanStatus(
  carePlanId: string,
  status: string,
  endDate?: Date
): Promise<any> {
  const carePlan = await prisma.nursingCarePlan.update({
    where: { id: carePlanId },
    data: {
      status,
      endDate: endDate || (status === 'completed' || status === 'discontinued' ? new Date() : undefined)
    }
  });

  return carePlan;
}

/**
 * Add diagnosis to existing care plan
 */
export async function addDiagnosis(
  carePlanId: string,
  diagnosis: DiagnosisInput
): Promise<any> {
  const newDiagnosis = await prisma.nursingDiagnosis.create({
    data: {
      carePlanId,
      code: diagnosis.code,
      diagnosis: diagnosis.diagnosis,
      relatedTo: diagnosis.relatedTo,
      evidencedBy: diagnosis.evidencedBy,
      priority: diagnosis.priority,
      status: 'active',
      goals: diagnosis.goals ? {
        create: diagnosis.goals.map(goal => ({
          description: goal.description,
          targetDate: goal.targetDate
        }))
      } : undefined
    },
    include: {
      goals: true
    }
  });

  return newDiagnosis;
}

/**
 * Add intervention to existing care plan
 */
export async function addIntervention(
  carePlanId: string,
  intervention: InterventionInput
): Promise<any> {
  const newIntervention = await prisma.nursingIntervention.create({
    data: {
      carePlanId,
      category: intervention.category,
      intervention: intervention.intervention,
      frequency: intervention.frequency,
      instructions: intervention.instructions,
      isActive: true
    }
  });

  return newIntervention;
}

/**
 * Record intervention execution
 */
export async function executeIntervention(
  interventionId: string,
  executedBy: string,
  notes?: string,
  patientResponse?: string
): Promise<any> {
  const execution = await prisma.interventionExecution.create({
    data: {
      interventionId,
      executedBy,
      executedAt: new Date(),
      notes,
      patientResponse
    },
    include: {
      intervention: true
    }
  });

  return execution;
}

/**
 * Evaluate care plan
 */
export async function evaluateCarePlan(input: EvaluationInput): Promise<any> {
  const evaluation = await prisma.nursingEvaluation.create({
    data: {
      carePlanId: input.carePlanId,
      evaluatedBy: input.evaluatedBy,
      evaluatedAt: new Date(),
      overallStatus: input.overallStatus,
      notes: input.notes,
      modifications: input.modifications
    },
    include: {
      carePlan: {
        include: {
          diagnoses: true,
          interventions: { where: { isActive: true } }
        }
      }
    }
  });

  return evaluation;
}

/**
 * Update goal outcome
 */
export async function updateGoalOutcome(
  goalId: string,
  outcome: string
): Promise<any> {
  const goal = await prisma.nursingGoal.update({
    where: { id: goalId },
    data: {
      outcome,
      evaluatedAt: new Date()
    },
    include: {
      diagnosis: true
    }
  });

  return goal;
}

/**
 * Record assessment scale
 */
export async function recordAssessmentScale(input: AssessmentScaleInput): Promise<any> {
  const { score, riskLevel, details } = calculateAssessmentScore(input.scaleType, input.answers);

  const assessment = await prisma.nursingAssessmentScale.create({
    data: {
      admissionId: input.admissionId,
      patientId: input.patientId,
      scaleType: input.scaleType,
      score,
      riskLevel,
      details,
      assessedBy: input.assessedBy,
      assessedAt: new Date()
    }
  });

  return assessment;
}

/**
 * Get assessment scales for admission
 */
export async function getAssessmentScales(
  admissionId: string,
  scaleType?: string
): Promise<any[]> {
  const assessments = await prisma.nursingAssessmentScale.findMany({
    where: {
      admissionId,
      ...(scaleType && { scaleType })
    },
    orderBy: { assessedAt: 'desc' }
  });

  return assessments;
}

/**
 * Get intervention templates by diagnosis
 */
export function getInterventionTemplates(diagnosisKey: string): InterventionInput[] {
  return INTERVENTION_TEMPLATES[diagnosisKey as keyof typeof INTERVENTION_TEMPLATES] || [];
}

/**
 * Get all available assessment scales
 */
export function getAvailableScales(): any[] {
  return [
    {
      type: 'braden',
      name: 'Braden Scale',
      description: 'Pressure Ulcer Risk Assessment',
      scoreRange: '6-23',
      fields: [
        { name: 'sensoryPerception', label: 'Sensory Perception', type: 'select', options: [
          { value: 1, label: 'Completely Limited' },
          { value: 2, label: 'Very Limited' },
          { value: 3, label: 'Slightly Limited' },
          { value: 4, label: 'No Impairment' }
        ]},
        { name: 'moisture', label: 'Moisture', type: 'select', options: [
          { value: 1, label: 'Constantly Moist' },
          { value: 2, label: 'Very Moist' },
          { value: 3, label: 'Occasionally Moist' },
          { value: 4, label: 'Rarely Moist' }
        ]},
        { name: 'activity', label: 'Activity', type: 'select', options: [
          { value: 1, label: 'Bedfast' },
          { value: 2, label: 'Chairfast' },
          { value: 3, label: 'Walks Occasionally' },
          { value: 4, label: 'Walks Frequently' }
        ]},
        { name: 'mobility', label: 'Mobility', type: 'select', options: [
          { value: 1, label: 'Completely Immobile' },
          { value: 2, label: 'Very Limited' },
          { value: 3, label: 'Slightly Limited' },
          { value: 4, label: 'No Limitation' }
        ]},
        { name: 'nutrition', label: 'Nutrition', type: 'select', options: [
          { value: 1, label: 'Very Poor' },
          { value: 2, label: 'Probably Inadequate' },
          { value: 3, label: 'Adequate' },
          { value: 4, label: 'Excellent' }
        ]},
        { name: 'frictionShear', label: 'Friction & Shear', type: 'select', options: [
          { value: 1, label: 'Problem' },
          { value: 2, label: 'Potential Problem' },
          { value: 3, label: 'No Apparent Problem' }
        ]}
      ]
    },
    {
      type: 'morse',
      name: 'Morse Fall Scale',
      description: 'Fall Risk Assessment',
      scoreRange: '0-125',
      fields: [
        { name: 'historyOfFalling', label: 'History of Falling', type: 'boolean' },
        { name: 'secondaryDiagnosis', label: 'Secondary Diagnosis', type: 'boolean' },
        { name: 'ambulatoryAid', label: 'Ambulatory Aid', type: 'select', options: [
          { value: 'none', label: 'None/Bedrest/Wheelchair' },
          { value: 'crutches_cane_walker', label: 'Crutches/Cane/Walker' },
          { value: 'furniture', label: 'Furniture' }
        ]},
        { name: 'ivTherapy', label: 'IV Therapy/Heparin Lock', type: 'boolean' },
        { name: 'gait', label: 'Gait', type: 'select', options: [
          { value: 'normal', label: 'Normal/Bedrest/Wheelchair' },
          { value: 'weak', label: 'Weak' },
          { value: 'impaired', label: 'Impaired' }
        ]},
        { name: 'mentalStatus', label: 'Mental Status', type: 'select', options: [
          { value: 'oriented', label: 'Oriented to Own Ability' },
          { value: 'forgets_limitations', label: 'Forgets Limitations' }
        ]}
      ]
    },
    {
      type: 'glasgow',
      name: 'Glasgow Coma Scale',
      description: 'Consciousness Level Assessment',
      scoreRange: '3-15',
      fields: [
        { name: 'eyeOpening', label: 'Eye Opening', type: 'select', options: [
          { value: 1, label: 'None' },
          { value: 2, label: 'To Pain' },
          { value: 3, label: 'To Speech' },
          { value: 4, label: 'Spontaneous' }
        ]},
        { name: 'verbalResponse', label: 'Verbal Response', type: 'select', options: [
          { value: 1, label: 'None' },
          { value: 2, label: 'Incomprehensible' },
          { value: 3, label: 'Inappropriate' },
          { value: 4, label: 'Confused' },
          { value: 5, label: 'Oriented' }
        ]},
        { name: 'motorResponse', label: 'Motor Response', type: 'select', options: [
          { value: 1, label: 'None' },
          { value: 2, label: 'Extension' },
          { value: 3, label: 'Flexion' },
          { value: 4, label: 'Withdrawal' },
          { value: 5, label: 'Localizes Pain' },
          { value: 6, label: 'Obeys Commands' }
        ]}
      ]
    },
    {
      type: 'pain',
      name: 'Pain Scale',
      description: 'Pain Assessment',
      scoreRange: '0-10',
      fields: [
        { name: 'painLevel', label: 'Pain Level (0-10)', type: 'number', min: 0, max: 10 },
        { name: 'location', label: 'Location', type: 'text' },
        { name: 'quality', label: 'Quality', type: 'text' },
        { name: 'onset', label: 'Onset', type: 'text' },
        { name: 'aggravatingFactors', label: 'Aggravating Factors', type: 'array' },
        { name: 'relievingFactors', label: 'Relieving Factors', type: 'array' }
      ]
    }
  ];
}
