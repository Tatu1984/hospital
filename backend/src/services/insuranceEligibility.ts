/**
 * Insurance Eligibility Verification Service
 *
 * Provides real-time insurance eligibility verification, coverage limit checking,
 * and utilization tracking with Redis caching support.
 */

import { prisma } from '../lib/db';
import { redisService } from './redis';
import { logger } from '../utils/logger';
import { Decimal } from '@prisma/client/runtime/library';

// Cache TTL for eligibility checks (1 hour)
const ELIGIBILITY_CACHE_TTL = 3600; // 1 hour in seconds

// Types
export interface EligibilityResult {
  isEligible: boolean;
  status: 'eligible' | 'not_eligible' | 'expired' | 'not_started' | 'limit_exceeded' | 'pending_verification';
  sumInsured: number;
  usedAmount: number;
  remainingAmount: number;
  validFrom: Date;
  validTill: Date;
  policyNumber: string;
  policyHolderName: string | null;
  tpaName: string;
  message: string;
  checkId?: string;
  cachedResult?: boolean;
}

export interface CoverageCheck {
  canCover: boolean;
  requestedAmount: number;
  remainingCoverage: number;
  exceedsBy?: number;
  message: string;
}

export interface UtilizationHistory {
  totalUsed: number;
  sumInsured: number;
  remainingCoverage: number;
  utilizationPercentage: number;
  recentChecks: Array<{
    id: string;
    checkedAt: Date;
    status: string;
    usedAmount: number;
    remainingAmount: number;
  }>;
}

/**
 * Verify patient insurance eligibility
 * Checks validity dates, active status, and remaining coverage
 * Results are cached in Redis for 1 hour
 */
export async function verifyEligibility(
  patientId: string,
  tpaId: string,
  serviceDate: Date,
  tenantId: string,
  checkedBy?: string
): Promise<EligibilityResult> {
  try {
    // Generate cache key
    const cacheKey = redisService.generateKey('insurance:eligibility', {
      patientId,
      tpaId,
      date: serviceDate.toISOString().split('T')[0], // Date only for caching
    });

    // Try to get from cache first
    const cached = await redisService.get<EligibilityResult>(cacheKey);
    if (cached) {
      logger.info(`Eligibility cache hit for patient ${patientId}`);
      return { ...cached, cachedResult: true };
    }

    // Find active insurance for patient and TPA
    const insurance = await prisma.patientInsurance.findFirst({
      where: {
        patientId,
        tpaId,
        isActive: true,
      },
      include: {
        tpa: {
          select: {
            name: true,
            type: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Get the most recent policy
      },
    });

    if (!insurance) {
      const result: EligibilityResult = {
        isEligible: false,
        status: 'not_eligible',
        sumInsured: 0,
        usedAmount: 0,
        remainingAmount: 0,
        validFrom: new Date(),
        validTill: new Date(),
        policyNumber: '',
        policyHolderName: null,
        tpaName: '',
        message: 'No active insurance policy found for this patient and TPA',
      };
      return result;
    }

    // Check validity dates
    let status: EligibilityResult['status'] = 'eligible';
    let isEligible = true;
    let message = 'Insurance is valid and active';

    if (serviceDate < insurance.validFrom) {
      status = 'not_started';
      isEligible = false;
      message = 'Insurance policy has not started yet';
    } else if (serviceDate > insurance.validTill) {
      status = 'expired';
      isEligible = false;
      message = 'Insurance policy has expired';
    } else if (!insurance.isActive) {
      status = 'not_eligible';
      isEligible = false;
      message = 'Insurance policy is inactive';
    }

    // Calculate remaining coverage
    const sumInsured = parseFloat(insurance.sumInsured.toString());
    const usedAmount = parseFloat(insurance.usedAmount.toString());
    const remainingAmount = sumInsured - usedAmount;

    // Check if limit exceeded
    if (remainingAmount <= 0 && isEligible) {
      status = 'limit_exceeded';
      isEligible = false;
      message = 'Insurance coverage limit exceeded';
    }

    // Create eligibility check record
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Expire in 1 hour

    const eligibilityCheck = await prisma.insuranceEligibilityCheck.create({
      data: {
        tenantId,
        patientInsuranceId: insurance.id,
        checkedBy,
        status,
        sumInsured: insurance.sumInsured,
        usedAmount: insurance.usedAmount,
        remainingAmount: new Decimal(remainingAmount),
        verificationSource: 'manual', // In production, this could be 'api' if integrated with TPA API
        expiresAt,
        coverageDetails: {
          tpaType: insurance.tpa.type,
          validFrom: insurance.validFrom,
          validTill: insurance.validTill,
          checkedForDate: serviceDate,
        },
      },
    });

    const result: EligibilityResult = {
      isEligible,
      status,
      sumInsured,
      usedAmount,
      remainingAmount: Math.max(0, remainingAmount),
      validFrom: insurance.validFrom,
      validTill: insurance.validTill,
      policyNumber: insurance.policyNumber,
      policyHolderName: insurance.policyHolderName,
      tpaName: insurance.tpa.name,
      message,
      checkId: eligibilityCheck.id,
      cachedResult: false,
    };

    // Cache the result for 1 hour
    await redisService.set(cacheKey, result, ELIGIBILITY_CACHE_TTL);

    logger.info(`Eligibility verified for patient ${patientId}: ${status}`);
    return result;
  } catch (error) {
    logger.error('Error verifying eligibility:', error);
    throw error;
  }
}

/**
 * Check if a specific amount can be covered by the insurance
 * Compares requested amount against remaining coverage
 */
export async function checkCoverageLimit(
  patientInsuranceId: string,
  amount: number
): Promise<CoverageCheck> {
  try {
    const insurance = await prisma.patientInsurance.findUnique({
      where: { id: patientInsuranceId },
      include: {
        tpa: {
          select: {
            name: true,
            discountPercent: true,
          },
        },
      },
    });

    if (!insurance) {
      return {
        canCover: false,
        requestedAmount: amount,
        remainingCoverage: 0,
        message: 'Insurance policy not found',
      };
    }

    const sumInsured = parseFloat(insurance.sumInsured.toString());
    const usedAmount = parseFloat(insurance.usedAmount.toString());
    const remainingCoverage = sumInsured - usedAmount;

    const canCover = remainingCoverage >= amount;
    const exceedsBy = canCover ? undefined : amount - remainingCoverage;

    let message = canCover
      ? `Coverage is sufficient. ${remainingCoverage.toFixed(2)} remaining after this claim.`
      : `Insufficient coverage. Exceeds by ${exceedsBy?.toFixed(2)}. Patient will need to pay the difference.`;

    // Apply TPA discount if available
    if (insurance.tpa.discountPercent) {
      const discountPercent = parseFloat(insurance.tpa.discountPercent.toString());
      const discountedAmount = amount * (1 - discountPercent / 100);
      message += ` (TPA discount: ${discountPercent}% applied)`;
    }

    return {
      canCover,
      requestedAmount: amount,
      remainingCoverage: Math.max(0, remainingCoverage),
      exceedsBy,
      message,
    };
  } catch (error) {
    logger.error('Error checking coverage limit:', error);
    throw error;
  }
}

/**
 * Get remaining coverage and utilization details
 * Includes historical eligibility checks
 */
export async function getRemainingCoverage(
  patientInsuranceId: string
): Promise<UtilizationHistory> {
  try {
    // Get insurance details
    const insurance = await prisma.patientInsurance.findUnique({
      where: { id: patientInsuranceId },
    });

    if (!insurance) {
      throw new Error('Insurance policy not found');
    }

    const sumInsured = parseFloat(insurance.sumInsured.toString());
    const usedAmount = parseFloat(insurance.usedAmount.toString());
    const remainingCoverage = Math.max(0, sumInsured - usedAmount);
    const utilizationPercentage = sumInsured > 0 ? (usedAmount / sumInsured) * 100 : 0;

    // Get recent eligibility checks (last 10)
    const recentChecks = await prisma.insuranceEligibilityCheck.findMany({
      where: {
        patientInsuranceId,
      },
      orderBy: {
        checkedAt: 'desc',
      },
      take: 10,
      select: {
        id: true,
        checkedAt: true,
        status: true,
        usedAmount: true,
        remainingAmount: true,
      },
    });

    return {
      totalUsed: usedAmount,
      sumInsured,
      remainingCoverage,
      utilizationPercentage: parseFloat(utilizationPercentage.toFixed(2)),
      recentChecks: recentChecks.map((check) => ({
        id: check.id,
        checkedAt: check.checkedAt,
        status: check.status,
        usedAmount: parseFloat(check.usedAmount.toString()),
        remainingAmount: parseFloat(check.remainingAmount.toString()),
      })),
    };
  } catch (error) {
    logger.error('Error getting remaining coverage:', error);
    throw error;
  }
}

/**
 * Update insurance utilization after a claim or charge
 * This should be called when processing claims or capturing charges
 */
export async function updateInsuranceUtilization(
  patientInsuranceId: string,
  amount: number,
  tenantId: string,
  description?: string
): Promise<void> {
  try {
    // Get current insurance
    const insurance = await prisma.patientInsurance.findUnique({
      where: { id: patientInsuranceId },
    });

    if (!insurance) {
      throw new Error('Insurance policy not found');
    }

    // Update used amount
    const newUsedAmount = parseFloat(insurance.usedAmount.toString()) + amount;

    await prisma.patientInsurance.update({
      where: { id: patientInsuranceId },
      data: {
        usedAmount: new Decimal(newUsedAmount),
      },
    });

    // Invalidate cache for this insurance
    const patientId = insurance.patientId;
    const tpaId = insurance.tpaId;
    const pattern = `insurance:eligibility:patientId:${patientId}|*`;
    await redisService.deletePattern(pattern);

    logger.info(
      `Updated insurance utilization for ${patientInsuranceId}: +${amount} (total: ${newUsedAmount})`
    );
  } catch (error) {
    logger.error('Error updating insurance utilization:', error);
    throw error;
  }
}

/**
 * Invalidate eligibility cache for a patient
 * Should be called when insurance details are updated
 */
export async function invalidateEligibilityCache(
  patientId: string,
  tpaId?: string
): Promise<void> {
  try {
    if (tpaId) {
      // Invalidate specific TPA
      const pattern = `insurance:eligibility:patientId:${patientId}|tpaId:${tpaId}|*`;
      await redisService.deletePattern(pattern);
    } else {
      // Invalidate all TPAs for this patient
      const pattern = `insurance:eligibility:patientId:${patientId}|*`;
      await redisService.deletePattern(pattern);
    }

    logger.info(`Invalidated eligibility cache for patient ${patientId}`);
  } catch (error) {
    logger.warn('Error invalidating eligibility cache:', error);
    // Don't throw - cache invalidation failure shouldn't break the flow
  }
}

/**
 * Get eligibility check history for a patient insurance
 */
export async function getEligibilityHistory(
  patientInsuranceId: string,
  limit: number = 20
) {
  try {
    const checks = await prisma.insuranceEligibilityCheck.findMany({
      where: {
        patientInsuranceId,
      },
      orderBy: {
        checkedAt: 'desc',
      },
      take: limit,
      include: {
        patientInsurance: {
          select: {
            policyNumber: true,
            tpa: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return checks.map((check) => ({
      id: check.id,
      checkedAt: check.checkedAt,
      checkedBy: check.checkedBy,
      status: check.status,
      sumInsured: parseFloat(check.sumInsured.toString()),
      usedAmount: parseFloat(check.usedAmount.toString()),
      remainingAmount: parseFloat(check.remainingAmount.toString()),
      verificationSource: check.verificationSource,
      expiresAt: check.expiresAt,
      remarks: check.remarks,
      policyNumber: check.patientInsurance.policyNumber,
      tpaName: check.patientInsurance.tpa.name,
    }));
  } catch (error) {
    logger.error('Error getting eligibility history:', error);
    throw error;
  }
}

export default {
  verifyEligibility,
  checkCoverageLimit,
  getRemainingCoverage,
  updateInsuranceUtilization,
  invalidateEligibilityCache,
  getEligibilityHistory,
};
