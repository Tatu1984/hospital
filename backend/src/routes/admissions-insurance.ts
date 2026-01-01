// Enhanced admission endpoint with insurance verification
// This replaces the existing POST /api/admissions endpoint

import { Response } from 'express';
import { prisma } from '../lib/db';
import { verifyEligibility, checkCoverageLimit } from '../services/insuranceEligibility';

export const createAdmissionWithInsurance = async (req: any, res: Response) => {
  try {
    const {
      encounterId,
      patientId,
      bedId,
      diagnosis,
      patientInsuranceId,
      preAuthorizationId,
      requireInsurance = false,
      estimatedCharges, // Optional: estimated admission charges for coverage check
    } = req.body;

    // If insurance is required or provided, verify it
    let insuranceVerified = false;
    let insuranceVerifiedAt: Date | null = null;
    let eligibilityCheckId: string | undefined;
    let coverageStatus: any = null;

    if (requireInsurance || patientInsuranceId) {
      if (!patientInsuranceId) {
        return res.status(400).json({
          error: 'Insurance is required for admission but no insurance policy was provided',
        });
      }

      // Get the insurance details
      const insurance = await prisma.patientInsurance.findUnique({
        where: { id: patientInsuranceId },
        include: {
          tpa: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!insurance) {
        return res.status(400).json({
          error: 'Invalid insurance policy ID',
        });
      }

      // Auto-verify eligibility using the new service
      const tenantId = req.user?.tenantId || 'default';
      const userId = req.user?.userId;

      try {
        const eligibility = await verifyEligibility(
          patientId,
          insurance.tpaId,
          new Date(),
          tenantId,
          userId
        );

        eligibilityCheckId = eligibility.checkId;

        if (!eligibility.isEligible) {
          return res.status(400).json({
            error: `Insurance eligibility verification failed: ${eligibility.message}`,
            eligibility,
          });
        }

        // If estimated charges provided, check coverage limit
        if (estimatedCharges) {
          const coverageCheck = await checkCoverageLimit(
            patientInsuranceId,
            parseFloat(estimatedCharges)
          );

          coverageStatus = coverageCheck;

          if (!coverageCheck.canCover) {
            // Log warning but allow admission
            console.warn(
              `Admission ${patientId}: ${coverageCheck.message}`
            );
          }
        }

        insuranceVerified = true;
        insuranceVerifiedAt = new Date();
      } catch (eligibilityError) {
        console.error('Eligibility verification failed:', eligibilityError);
        return res.status(400).json({
          error: 'Failed to verify insurance eligibility',
          message: eligibilityError instanceof Error ? eligibilityError.message : 'Unknown error',
        });
      }
    }

    // If pre-authorization is provided, verify it
    if (preAuthorizationId) {
      const preAuth = await prisma.preAuthorization.findUnique({
        where: { id: preAuthorizationId },
      });

      if (!preAuth) {
        return res.status(400).json({
          error: 'Invalid pre-authorization ID',
        });
      }

      if (preAuth.status !== 'approved') {
        return res.status(400).json({
          error: `Pre-authorization is ${preAuth.status}, not approved`,
        });
      }

      if (preAuth.validTill && preAuth.validTill < new Date()) {
        return res.status(400).json({
          error: 'Pre-authorization has expired',
        });
      }

      // Ensure pre-auth is for the same patient
      if (preAuth.patientId !== patientId) {
        return res.status(400).json({
          error: 'Pre-authorization is for a different patient',
        });
      }
    }

    const admission = await prisma.admission.create({
      data: {
        encounterId,
        patientId,
        bedId,
        admittingDoctorId: req.user.userId,
        diagnosis,
        status: 'active',
        patientInsuranceId,
        preAuthorizationId,
        insuranceVerified,
        insuranceVerifiedAt,
      },
      include: {
        patient: { select: { name: true, mrn: true } },
        bed: { select: { bedNumber: true, category: true } },
      },
    });

    // Update bed status
    if (bedId) {
      await prisma.bed.update({
        where: { id: bedId },
        data: { status: 'occupied' },
      });
    }

    // Build response with coverage status if available
    const response: any = {
      ...admission,
      insuranceCoverage: coverageStatus,
    };

    if (eligibilityCheckId) {
      response.eligibilityCheckId = eligibilityCheckId;
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Create admission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// To use this, replace the existing admission endpoint in server.ts with:
// app.post('/api/admissions', authenticateToken, validateBody(createAdmissionSchema), createAdmissionWithInsurance);
