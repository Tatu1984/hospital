import { Router, Response } from 'express';
import { prisma } from '../lib/db';
import { logger } from '../utils/logger';
import {
  verifyEligibility,
  checkCoverageLimit,
  getRemainingCoverage,
  getEligibilityHistory,
  updateInsuranceUtilization,
} from '../services/insuranceEligibility';

const router = Router();

// Verify patient insurance
router.post('/verify', async (req: any, res: Response) => {
  try {
    const { patientId, policyNumber, tpaId } = req.body;

    if (!patientId || !policyNumber || !tpaId) {
      return res.status(400).json({
        error: 'Missing required fields: patientId, policyNumber, tpaId'
      });
    }

    // Find the patient's insurance policy
    const insurance = await prisma.patientInsurance.findFirst({
      where: {
        patientId,
        policyNumber,
        tpaId,
        isActive: true,
      },
      include: {
        tpa: {
          select: {
            id: true,
            name: true,
            type: true,
            contactPerson: true,
            contact: true,
            email: true,
            creditLimit: true,
            discountPercent: true,
          },
        },
      },
    });

    if (!insurance) {
      return res.status(404).json({
        verified: false,
        message: 'Insurance policy not found or inactive',
      });
    }

    const now = new Date();
    const isValid = insurance.validFrom <= now && insurance.validTill >= now;
    const isExpired = insurance.validTill < now;
    const isNotStarted = insurance.validFrom > now;

    // Calculate coverage status
    let coverageStatus = 'valid';
    let message = 'Insurance verified successfully';

    if (isExpired) {
      coverageStatus = 'expired';
      message = 'Insurance policy has expired';
    } else if (isNotStarted) {
      coverageStatus = 'not_started';
      message = 'Insurance policy not yet active';
    }

    res.json({
      verified: isValid,
      coverageStatus,
      message,
      insurance: {
        id: insurance.id,
        policyNumber: insurance.policyNumber,
        policyHolderName: insurance.policyHolderName,
        validFrom: insurance.validFrom,
        validTill: insurance.validTill,
        sumInsured: insurance.sumInsured,
        tpa: insurance.tpa,
      },
    });
  } catch (error) {
    logger.error('Verify insurance error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get patient's insurance policies
router.get('/patient/:patientId', async (req: any, res: Response) => {
  try {
    const { patientId } = req.params;

    const insurances = await prisma.patientInsurance.findMany({
      where: { patientId },
      include: {
        tpa: {
          select: {
            id: true,
            name: true,
            type: true,
            contactPerson: true,
            contact: true,
            email: true,
            discountPercent: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add status to each insurance
    const now = new Date();
    const insurancesWithStatus = insurances.map(insurance => {
      let status = 'active';
      if (!insurance.isActive) {
        status = 'inactive';
      } else if (insurance.validTill < now) {
        status = 'expired';
      } else if (insurance.validFrom > now) {
        status = 'not_started';
      }

      return {
        ...insurance,
        status,
      };
    });

    res.json(insurancesWithStatus);
  } catch (error) {
    logger.error('Get patient insurances error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request pre-authorization
router.post('/pre-auth/request', async (req: any, res: Response) => {
  try {
    const {
      patientId,
      tpaId,
      requestedAmount,
      diagnosis,
      procedurePlanned,
      remarks: initialRemarks,
    } = req.body;
    let remarks = initialRemarks;

    if (!patientId || !tpaId || !requestedAmount) {
      return res.status(400).json({
        error: 'Missing required fields: patientId, tpaId, requestedAmount',
      });
    }

    // Verify patient has active insurance with this TPA
    const insurance = await prisma.patientInsurance.findFirst({
      where: {
        patientId,
        tpaId,
        isActive: true,
        validFrom: { lte: new Date() },
        validTill: { gte: new Date() },
      },
    });

    if (!insurance) {
      return res.status(400).json({
        error: 'No active insurance found for this patient with the specified TPA',
      });
    }

    // Auto-verify eligibility before creating pre-auth
    const tenantId = req.user?.tenantId || 'default';
    const userId = req.user?.userId;

    try {
      const eligibility = await verifyEligibility(
        patientId,
        tpaId,
        new Date(),
        tenantId,
        userId
      );

      // Check if insurance can cover the requested amount
      if (eligibility.isEligible) {
        const coverageCheck = await checkCoverageLimit(insurance.id, parseFloat(requestedAmount));

        if (!coverageCheck.canCover) {
          // Still allow pre-auth creation but add warning in remarks
          const warningMsg = `Warning: ${coverageCheck.message}`;
          remarks = remarks ? `${remarks}\n\n${warningMsg}` : warningMsg;
        }
      }
    } catch (eligibilityError) {
      // Log but don't fail pre-auth creation
      logger.warn('Eligibility check failed during pre-auth', { error: eligibilityError instanceof Error ? eligibilityError.message : eligibilityError });
    }

    // Create pre-authorization request
    const preAuth = await prisma.preAuthorization.create({
      data: {
        patientId,
        tpaId,
        requestedAmount: parseFloat(requestedAmount),
        diagnosis,
        procedurePlanned,
        remarks,
        status: 'pending',
      },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            name: true,
            contact: true,
          },
        },
        tpa: {
          select: {
            id: true,
            name: true,
            type: true,
            contactPerson: true,
            contact: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json(preAuth);
  } catch (error) {
    logger.error('Create pre-authorization error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List pre-authorizations
router.get('/pre-auth', async (req: any, res: Response) => {
  try {
    const { status, patientId, tpaId } = req.query;
    const where: any = {};

    if (status) where.status = status;
    if (patientId) where.patientId = patientId;
    if (tpaId) where.tpaId = tpaId;

    const preAuths = await prisma.preAuthorization.findMany({
      where,
      include: {
        patient: { select: { id: true, mrn: true, name: true } },
        tpa: { select: { id: true, name: true, type: true } },
      },
      orderBy: { requestDate: 'desc' },
    });

    res.json(preAuths);
  } catch (error) {
    logger.error('List pre-authorizations error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pre-authorization details
router.get('/pre-auth/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const preAuth = await prisma.preAuthorization.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            name: true,
            dob: true,
            gender: true,
            contact: true,
          },
        },
        tpa: {
          select: {
            id: true,
            name: true,
            type: true,
            contactPerson: true,
            contact: true,
            email: true,
          },
        },
      },
    });

    if (!preAuth) {
      return res.status(404).json({ error: 'Pre-authorization not found' });
    }

    res.json(preAuth);
  } catch (error) {
    logger.error('Get pre-authorization error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve pre-authorization
router.put('/pre-auth/:id/approve', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { approvedAmount, approvalNumber, validTill, remarks } = req.body;

    if (!approvedAmount || !approvalNumber) {
      return res.status(400).json({
        error: 'Missing required fields: approvedAmount, approvalNumber',
      });
    }

    // Check if pre-auth exists
    const existing = await prisma.preAuthorization.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Pre-authorization not found' });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({
        error: `Pre-authorization already ${existing.status}`,
      });
    }

    // Update pre-authorization
    const preAuth = await prisma.preAuthorization.update({
      where: { id },
      data: {
        status: 'approved',
        approvedAmount: parseFloat(approvedAmount),
        approvalNumber,
        approvalDate: new Date(),
        validTill: validTill ? new Date(validTill) : undefined,
        remarks: remarks || existing.remarks,
      },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            name: true,
          },
        },
        tpa: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    res.json(preAuth);
  } catch (error) {
    logger.error('Approve pre-authorization error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject pre-authorization
router.put('/pre-auth/:id/reject', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const existing = await prisma.preAuthorization.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Pre-authorization not found' });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({
        error: `Pre-authorization already ${existing.status}`,
      });
    }

    const preAuth = await prisma.preAuthorization.update({
      where: { id },
      data: {
        status: 'rejected',
        remarks: remarks || existing.remarks,
      },
      include: {
        patient: { select: { id: true, mrn: true, name: true } },
        tpa: { select: { id: true, name: true } },
      },
    });

    res.json(preAuth);
  } catch (error) {
    logger.error('Reject pre-authorization error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// REAL-TIME ELIGIBILITY VERIFICATION ENDPOINTS
// ===========================

/**
 * POST /api/insurance/verify-eligibility
 * Real-time insurance eligibility check
 * Verifies validity, active status, and remaining coverage
 * Results are cached in Redis for 1 hour
 */
router.post('/verify-eligibility', async (req: any, res: Response) => {
  try {
    const { patientId, tpaId, serviceDate } = req.body;

    if (!patientId || !tpaId) {
      return res.status(400).json({
        error: 'Missing required fields: patientId, tpaId',
      });
    }

    // Use serviceDate if provided, otherwise use current date
    const checkDate = serviceDate ? new Date(serviceDate) : new Date();

    // Get tenant ID from authenticated user
    const tenantId = req.user?.tenantId || 'default';
    const userId = req.user?.userId;

    const result = await verifyEligibility(
      patientId,
      tpaId,
      checkDate,
      tenantId,
      userId
    );

    res.json(result);
  } catch (error) {
    logger.error('Verify eligibility error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/insurance/coverage/:patientInsuranceId
 * Get coverage details and remaining amount for a patient insurance policy
 * Includes sum insured, used amount, and remaining coverage
 */
router.get('/coverage/:patientInsuranceId', async (req: any, res: Response) => {
  try {
    const { patientInsuranceId } = req.params;

    if (!patientInsuranceId) {
      return res.status(400).json({
        error: 'Missing required parameter: patientInsuranceId',
      });
    }

    const coverage = await getRemainingCoverage(patientInsuranceId);

    res.json(coverage);
  } catch (error) {
    logger.error('Get coverage error', { error: error instanceof Error ? error.message : error });
    if (error instanceof Error && error.message === 'Insurance policy not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/insurance/coverage/:patientInsuranceId/check-limit
 * Check if a specific amount can be covered by the insurance
 * Used before approving claims or capturing charges
 */
router.post('/coverage/:patientInsuranceId/check-limit', async (req: any, res: Response) => {
  try {
    const { patientInsuranceId } = req.params;
    const { amount } = req.body;

    if (!patientInsuranceId || amount === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: patientInsuranceId (in params), amount (in body)',
      });
    }

    const requestedAmount = parseFloat(amount);
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({
        error: 'Amount must be a positive number',
      });
    }

    const result = await checkCoverageLimit(patientInsuranceId, requestedAmount);

    res.json(result);
  } catch (error) {
    logger.error('Check coverage limit error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/insurance/utilization/:patientInsuranceId
 * Get utilization history for a patient insurance policy
 * Includes total used, remaining coverage, and recent eligibility checks
 */
router.get('/utilization/:patientInsuranceId', async (req: any, res: Response) => {
  try {
    const { patientInsuranceId } = req.params;
    const { limit } = req.query;

    if (!patientInsuranceId) {
      return res.status(400).json({
        error: 'Missing required parameter: patientInsuranceId',
      });
    }

    const historyLimit = limit ? parseInt(limit as string) : 20;

    const [utilization, history] = await Promise.all([
      getRemainingCoverage(patientInsuranceId),
      getEligibilityHistory(patientInsuranceId, historyLimit),
    ]);

    res.json({
      ...utilization,
      history,
    });
  } catch (error) {
    logger.error('Get utilization error', { error: error instanceof Error ? error.message : error });
    if (error instanceof Error && error.message === 'Insurance policy not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/insurance/utilization/:patientInsuranceId/update
 * Update insurance utilization after a claim or charge
 * This should be called when processing claims or capturing IPD charges
 * Note: This is typically called internally by the system, but exposed as an endpoint for manual adjustments
 */
router.post('/utilization/:patientInsuranceId/update', async (req: any, res: Response) => {
  try {
    const { patientInsuranceId } = req.params;
    const { amount, description } = req.body;

    if (!patientInsuranceId || amount === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: patientInsuranceId (in params), amount (in body)',
      });
    }

    const utilizationAmount = parseFloat(amount);
    if (isNaN(utilizationAmount)) {
      return res.status(400).json({
        error: 'Amount must be a valid number',
      });
    }

    const tenantId = req.user?.tenantId || 'default';

    await updateInsuranceUtilization(
      patientInsuranceId,
      utilizationAmount,
      tenantId,
      description
    );

    // Get updated coverage
    const coverage = await getRemainingCoverage(patientInsuranceId);

    res.json({
      success: true,
      message: 'Insurance utilization updated successfully',
      coverage,
    });
  } catch (error) {
    logger.error('Update utilization error', { error: error instanceof Error ? error.message : error });
    if (error instanceof Error && error.message === 'Insurance policy not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/insurance/eligibility-history/:patientInsuranceId
 * Get eligibility check history for a patient insurance policy
 */
router.get('/eligibility-history/:patientInsuranceId', async (req: any, res: Response) => {
  try {
    const { patientInsuranceId } = req.params;
    const { limit } = req.query;

    if (!patientInsuranceId) {
      return res.status(400).json({
        error: 'Missing required parameter: patientInsuranceId',
      });
    }

    const historyLimit = limit ? parseInt(limit as string) : 20;

    const history = await getEligibilityHistory(patientInsuranceId, historyLimit);

    res.json(history);
  } catch (error) {
    logger.error('Get eligibility history error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
