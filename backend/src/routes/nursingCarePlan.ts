/**
 * Nursing Care Plan Routes
 *
 * API endpoints for comprehensive nursing care plan management
 */

import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware';
import {
  createCarePlan,
  getCarePlanByAdmission,
  updateCarePlanStatus,
  addDiagnosis,
  addIntervention,
  executeIntervention,
  evaluateCarePlan,
  updateGoalOutcome,
  recordAssessmentScale,
  getAssessmentScales,
  getInterventionTemplates,
  getAvailableScales
} from '../services/nursingCarePlan';
import {
  createCarePlanSchema,
  updateCarePlanStatusSchema,
  diagnosisSchema,
  interventionSchema,
  executeInterventionSchema,
  evaluationSchema,
  updateGoalOutcomeSchema,
  assessmentScaleSchema
} from '../validators/nursingCarePlan';

const router = Router();
const prisma = new PrismaClient();

// ===========================
// CARE PLAN MANAGEMENT
// ===========================

/**
 * POST /api/nursing/care-plans
 * Create a new nursing care plan
 */
router.post('/care-plans', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = createCarePlanSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors
      });
    }

    const carePlan = await createCarePlan(validation.data);

    res.status(201).json({
      message: 'Nursing care plan created successfully',
      carePlan
    });
  } catch (error: any) {
    console.error('Create care plan error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/nursing/care-plans/:admissionId
 * Get care plan for an admission
 */
router.get('/care-plans/:admissionId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { admissionId } = req.params;

    const carePlan = await getCarePlanByAdmission(admissionId);

    if (!carePlan) {
      return res.status(404).json({
        error: 'No care plan found for this admission'
      });
    }

    res.json(carePlan);
  } catch (error: any) {
    console.error('Get care plan error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * PUT /api/nursing/care-plans/:id
 * Update care plan status
 */
router.put('/care-plans/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = updateCarePlanStatusSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors
      });
    }

    const carePlan = await updateCarePlanStatus(
      id,
      validation.data.status,
      validation.data.endDate
    );

    res.json({
      message: 'Care plan updated successfully',
      carePlan
    });
  } catch (error: any) {
    console.error('Update care plan error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ===========================
// DIAGNOSIS MANAGEMENT
// ===========================

/**
 * POST /api/nursing/care-plans/:id/diagnoses
 * Add a nursing diagnosis to care plan
 */
router.post('/care-plans/:id/diagnoses', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = diagnosisSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors
      });
    }

    const diagnosis = await addDiagnosis(id, validation.data);

    res.status(201).json({
      message: 'Nursing diagnosis added successfully',
      diagnosis
    });
  } catch (error: any) {
    console.error('Add diagnosis error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/nursing/diagnoses/templates
 * Get intervention templates for common diagnoses
 */
router.get('/diagnoses/templates', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const templates = {
      pressure_ulcer_risk: {
        diagnosis: 'Risk for Impaired Skin Integrity',
        code: '00047',
        interventions: getInterventionTemplates('pressure_ulcer_risk')
      },
      fall_risk: {
        diagnosis: 'Risk for Falls',
        code: '00155',
        interventions: getInterventionTemplates('fall_risk')
      },
      pain_management: {
        diagnosis: 'Acute Pain',
        code: '00132',
        interventions: getInterventionTemplates('pain_management')
      },
      impaired_mobility: {
        diagnosis: 'Impaired Physical Mobility',
        code: '00085',
        interventions: getInterventionTemplates('impaired_mobility')
      },
      fluid_volume_deficit: {
        diagnosis: 'Deficient Fluid Volume',
        code: '00027',
        interventions: getInterventionTemplates('fluid_volume_deficit')
      },
      ineffective_airway_clearance: {
        diagnosis: 'Ineffective Airway Clearance',
        code: '00031',
        interventions: getInterventionTemplates('ineffective_airway_clearance')
      }
    };

    res.json(templates);
  } catch (error: any) {
    console.error('Get templates error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ===========================
// INTERVENTION MANAGEMENT
// ===========================

/**
 * POST /api/nursing/care-plans/:id/interventions
 * Add an intervention to care plan
 */
router.post('/care-plans/:id/interventions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = interventionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors
      });
    }

    const intervention = await addIntervention(id, validation.data);

    res.status(201).json({
      message: 'Intervention added successfully',
      intervention
    });
  } catch (error: any) {
    console.error('Add intervention error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/nursing/interventions/:id/execute
 * Record intervention execution
 */
router.post('/interventions/:id/execute', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = executeInterventionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors
      });
    }

    const execution = await executeIntervention(
      id,
      validation.data.executedBy,
      validation.data.notes,
      validation.data.patientResponse
    );

    res.status(201).json({
      message: 'Intervention execution recorded successfully',
      execution
    });
  } catch (error: any) {
    console.error('Execute intervention error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * PUT /api/nursing/interventions/:id/deactivate
 * Deactivate an intervention
 */
router.put('/interventions/:id/deactivate', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const intervention = await prisma.nursingIntervention.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({
      message: 'Intervention deactivated successfully',
      intervention
    });
  } catch (error: any) {
    console.error('Deactivate intervention error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ===========================
// GOAL MANAGEMENT
// ===========================

/**
 * PUT /api/nursing/goals/:id/outcome
 * Update goal outcome
 */
router.put('/goals/:id/outcome', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = updateGoalOutcomeSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors
      });
    }

    const goal = await updateGoalOutcome(id, validation.data.outcome);

    res.json({
      message: 'Goal outcome updated successfully',
      goal
    });
  } catch (error: any) {
    console.error('Update goal outcome error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ===========================
// EVALUATION
// ===========================

/**
 * POST /api/nursing/care-plans/:id/evaluate
 * Add evaluation to care plan
 */
router.post('/care-plans/:id/evaluate', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = evaluationSchema.safeParse({
      ...req.body,
      carePlanId: id
    });

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors
      });
    }

    const evaluation = await evaluateCarePlan(validation.data);

    res.status(201).json({
      message: 'Care plan evaluation added successfully',
      evaluation
    });
  } catch (error: any) {
    console.error('Evaluate care plan error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ===========================
// ASSESSMENT SCALES
// ===========================

/**
 * GET /api/nursing/assessment-scales
 * Get available assessment scales with scoring criteria
 */
router.get('/assessment-scales', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scales = getAvailableScales();

    res.json({
      scales,
      totalScales: scales.length
    });
  } catch (error: any) {
    console.error('Get assessment scales error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/nursing/assessments
 * Record an assessment scale
 */
router.post('/assessments', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = assessmentScaleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors
      });
    }

    const assessment = await recordAssessmentScale(validation.data);

    res.status(201).json({
      message: 'Assessment recorded successfully',
      assessment
    });
  } catch (error: any) {
    console.error('Record assessment error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/nursing/assessments/:admissionId
 * Get assessments for an admission
 */
router.get('/assessments/:admissionId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { admissionId } = req.params;
    const { scaleType } = req.query;

    const assessments = await getAssessmentScales(
      admissionId,
      scaleType as string | undefined
    );

    res.json({
      admissionId,
      scaleType: scaleType || 'all',
      assessments,
      totalAssessments: assessments.length
    });
  } catch (error: any) {
    console.error('Get assessments error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/nursing/assessments/:admissionId/latest
 * Get latest assessments by type for an admission
 */
router.get('/assessments/:admissionId/latest', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { admissionId } = req.params;

    // Get latest of each type
    const [braden, morse, glasgow, pain] = await Promise.all([
      prisma.nursingAssessmentScale.findFirst({
        where: { admissionId, scaleType: 'braden' },
        orderBy: { assessedAt: 'desc' }
      }),
      prisma.nursingAssessmentScale.findFirst({
        where: { admissionId, scaleType: 'morse' },
        orderBy: { assessedAt: 'desc' }
      }),
      prisma.nursingAssessmentScale.findFirst({
        where: { admissionId, scaleType: 'glasgow' },
        orderBy: { assessedAt: 'desc' }
      }),
      prisma.nursingAssessmentScale.findFirst({
        where: { admissionId, scaleType: 'pain' },
        orderBy: { assessedAt: 'desc' }
      })
    ]);

    res.json({
      admissionId,
      latestAssessments: {
        braden,
        morse,
        glasgow,
        pain
      }
    });
  } catch (error: any) {
    console.error('Get latest assessments error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/nursing/assessments/:admissionId/trends
 * Get assessment trends over time
 */
router.get('/assessments/:admissionId/trends', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { admissionId } = req.params;
    const { scaleType, days } = req.query;

    if (!scaleType) {
      return res.status(400).json({
        error: 'scaleType query parameter is required'
      });
    }

    const daysBack = days ? parseInt(days as string) : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const assessments = await prisma.nursingAssessmentScale.findMany({
      where: {
        admissionId,
        scaleType: scaleType as string,
        assessedAt: {
          gte: startDate
        }
      },
      orderBy: { assessedAt: 'asc' }
    });

    const trend = assessments.map(a => ({
      date: a.assessedAt,
      score: a.score,
      riskLevel: a.riskLevel
    }));

    res.json({
      admissionId,
      scaleType,
      daysBack,
      trend,
      totalAssessments: trend.length,
      currentScore: assessments.length > 0 ? assessments[assessments.length - 1].score : null,
      currentRiskLevel: assessments.length > 0 ? assessments[assessments.length - 1].riskLevel : null
    });
  } catch (error: any) {
    console.error('Get assessment trends error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/nursing/care-plans/:id/summary
 * Get comprehensive care plan summary
 */
router.get('/care-plans/:id/summary', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const carePlan = await prisma.nursingCarePlan.findUnique({
      where: { id },
      include: {
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
        },
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
              take: 1
            }
          }
        },
        evaluations: {
          orderBy: { evaluatedAt: 'desc' },
          take: 1
        }
      }
    });

    if (!carePlan) {
      return res.status(404).json({
        error: 'Care plan not found'
      });
    }

    // Get latest assessments
    const latestAssessments = await Promise.all([
      prisma.nursingAssessmentScale.findFirst({
        where: { admissionId: carePlan.admissionId, scaleType: 'braden' },
        orderBy: { assessedAt: 'desc' }
      }),
      prisma.nursingAssessmentScale.findFirst({
        where: { admissionId: carePlan.admissionId, scaleType: 'morse' },
        orderBy: { assessedAt: 'desc' }
      }),
      prisma.nursingAssessmentScale.findFirst({
        where: { admissionId: carePlan.admissionId, scaleType: 'pain' },
        orderBy: { assessedAt: 'desc' }
      })
    ]);

    // Cast to any for TypeScript - the include makes these properties available
    const plan = carePlan as any;
    const summary = {
      carePlan: {
        id: plan.id,
        status: plan.status,
        startDate: plan.startDate,
        endDate: plan.endDate
      },
      patient: plan.patient,
      admission: plan.admission,
      statistics: {
        totalDiagnoses: plan.diagnoses?.length || 0,
        activeDiagnoses: plan.diagnoses?.filter((d: any) => d.status === 'active').length || 0,
        totalGoals: plan.diagnoses?.reduce((sum: number, d: any) => sum + (d.goals?.length || 0), 0) || 0,
        metGoals: plan.diagnoses?.reduce((sum: number, d: any) =>
          sum + (d.goals?.filter((g: any) => g.outcome === 'met').length || 0), 0
        ) || 0,
        activeInterventions: plan.interventions?.length || 0,
        totalEvaluations: plan.evaluations?.length || 0
      },
      diagnoses: plan.diagnoses,
      interventions: plan.interventions,
      latestEvaluation: plan.evaluations?.[0] || null,
      latestAssessments: {
        braden: latestAssessments[0],
        morse: latestAssessments[1],
        pain: latestAssessments[2]
      }
    };

    res.json(summary);
  } catch (error: any) {
    console.error('Get care plan summary error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;
