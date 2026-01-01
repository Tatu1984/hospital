/**
 * Drug Interaction API Routes
 *
 * These routes provide drug interaction checking and allergy conflict detection
 *
 * To integrate into server.ts:
 * 1. Import at top: import drugInteractionRoutes from './routes/drugInteractionRoutes';
 * 2. Use in app: app.use('/api', drugInteractionRoutes);
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/db';
import { logger } from '../utils/logger';
import { checkDrugInteractions, checkAllergyConflicts, getDrugInteractions } from '../services/drugInteraction';

const router = Router();
// Use prisma as any for patientAllergy calls since model may not exist yet
const prismaAny = prisma as any;

// Middleware - assumes authenticateToken is available
// If integrating into server.ts, make sure to use your existing auth middleware

/**
 * POST /api/drugs/check-interactions
 * Check drug interactions between multiple drugs
 *
 * Request Body:
 * {
 *   "drugIds": ["drug-id-1", "drug-id-2", ...],
 *   "patientAllergies": "Penicillin, Sulfa" (optional)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "result": {
 *     "hasContraindications": false,
 *     "hasMajorInteractions": true,
 *     "interactions": [...],
 *     "allergyWarnings": [...],
 *     "canProceed": true,
 *     "requiresOverride": true
 *   },
 *   "canProceed": true,
 *   "message": "Major interactions found - requires careful monitoring"
 * }
 */
router.post('/drugs/check-interactions', async (req: any, res: Response) => {
  try {
    const { drugIds, patientAllergies } = req.body;

    if (!drugIds || !Array.isArray(drugIds) || drugIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'drugIds array is required and must not be empty'
      });
    }

    const result = await checkDrugInteractions(drugIds, patientAllergies);

    res.json({
      success: true,
      result,
      canProceed: result.canProceed,
      message: result.hasContraindications
        ? 'Contraindicated interactions found - cannot proceed'
        : result.hasMajorInteractions
        ? 'Major interactions found - requires careful monitoring'
        : result.interactions.length > 0
        ? 'Interactions found - review recommendations'
        : 'No significant interactions detected'
    });
  } catch (error) {
    logger.error('Check drug interactions error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to check drug interactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/drugs/:id/interactions
 * Get all known interactions for a specific drug
 *
 * Response:
 * {
 *   "success": true,
 *   "drug": {
 *     "id": "drug-id",
 *     "name": "Warfarin",
 *     "genericName": "Warfarin Sodium"
 *   },
 *   "interactions": [...],
 *   "count": 8,
 *   "summary": {
 *     "contraindicated": 0,
 *     "major": 6,
 *     "moderate": 2,
 *     "minor": 0
 *   }
 * }
 */
router.get('/drugs/:id/interactions', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    // Verify drug exists
    const drug = await prisma.drug.findUnique({
      where: { id },
      select: { id: true, name: true, genericName: true, isActive: true }
    });

    if (!drug) {
      return res.status(404).json({
        success: false,
        error: 'Drug not found'
      });
    }

    if (!drug.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Drug is inactive'
      });
    }

    const interactions = await getDrugInteractions(id);

    res.json({
      success: true,
      drug: {
        id: drug.id,
        name: drug.name,
        genericName: drug.genericName
      },
      interactions,
      count: interactions.length,
      summary: {
        contraindicated: interactions.filter(i => i.severity === 'contraindicated').length,
        major: interactions.filter(i => i.severity === 'major').length,
        moderate: interactions.filter(i => i.severity === 'moderate').length,
        minor: interactions.filter(i => i.severity === 'minor').length,
      }
    });
  } catch (error) {
    logger.error('Get drug interactions error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to get drug interactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/drugs/check-allergy
 * Check if a drug conflicts with patient allergies
 *
 * Request Body:
 * {
 *   "drugId": "drug-id",
 *   "allergies": "Penicillin, Sulfa, Aspirin"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "hasConflicts": true,
 *   "conflicts": [
 *     {
 *       "drugName": "Amoxicillin",
 *       "allergen": "Penicillin",
 *       "severity": "high",
 *       "recommendation": "AVOID: Patient allergic to Penicillin..."
 *     }
 *   ],
 *   "severity": "high",
 *   "message": "Allergy conflicts detected - review recommendations"
 * }
 */
router.post('/drugs/check-allergy', async (req: any, res: Response) => {
  try {
    const { drugId, allergies } = req.body;

    if (!drugId) {
      return res.status(400).json({
        success: false,
        error: 'drugId is required'
      });
    }

    if (!allergies) {
      return res.json({
        success: true,
        hasConflicts: false,
        conflicts: [],
        severity: 'none',
        message: 'No allergies provided for checking'
      });
    }

    const conflicts = await checkAllergyConflicts(drugId, allergies);

    // Determine highest severity
    let highestSeverity = 'none';
    if (conflicts.some(c => c.severity === 'high')) highestSeverity = 'high';
    else if (conflicts.some(c => c.severity === 'moderate')) highestSeverity = 'moderate';
    else if (conflicts.some(c => c.severity === 'low')) highestSeverity = 'low';

    res.json({
      success: true,
      hasConflicts: conflicts.length > 0,
      conflicts,
      severity: highestSeverity,
      message: conflicts.length > 0
        ? `Allergy conflicts detected (${highestSeverity} severity) - review recommendations`
        : 'No allergy conflicts detected'
    });
  } catch (error) {
    logger.error('Check allergy conflicts error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to check allergy conflicts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/patients/:patientId/allergies
 * Get patient allergy records
 *
 * Response:
 * {
 *   "success": true,
 *   "allergies": [...],
 *   "count": 3
 * }
 */
router.get('/patients/:patientId/allergies', async (req: any, res: Response) => {
  try {
    const { patientId } = req.params;

    // Check if PatientAllergy model exists
    // If not, fall back to patient.allergies field
    let allergies;
    try {
      allergies = await prismaAny.patientAllergy.findMany({
        where: {
          patientId,
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      // PatientAllergy table doesn't exist yet, use patient.allergies field
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { allergies: true }
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          error: 'Patient not found'
        });
      }

      // Parse comma-separated allergies string
      const allergyList = patient.allergies
        ? patient.allergies.split(',').map(a => a.trim()).filter(a => a)
        : [];

      return res.json({
        success: true,
        allergies: allergyList.map(allergen => ({
          allergen,
          severity: 'unknown',
          source: 'patient_record'
        })),
        count: allergyList.length,
        note: 'Allergies from patient record. PatientAllergy table not yet migrated.'
      });
    }

    res.json({
      success: true,
      allergies,
      count: allergies.length
    });
  } catch (error) {
    logger.error('Get patient allergies error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to get patient allergies',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/patients/:patientId/allergies
 * Add new allergy record for patient
 *
 * Request Body:
 * {
 *   "allergen": "Penicillin",
 *   "reaction": "Rash and itching",
 *   "severity": "severe", // severe, moderate, mild
 *   "onsetDate": "2024-01-15",
 *   "notes": "Occurred after amoxicillin treatment"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "allergy": {...},
 *   "message": "Allergy record created successfully"
 * }
 */
router.post('/patients/:patientId/allergies', async (req: any, res: Response) => {
  try {
    const { patientId } = req.params;
    const { allergen, reaction, severity, onsetDate, notes } = req.body;

    if (!allergen || !severity) {
      return res.status(400).json({
        success: false,
        error: 'allergen and severity are required'
      });
    }

    // Validate severity
    const validSeverities = ['severe', 'moderate', 'mild'];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        success: false,
        error: 'severity must be one of: severe, moderate, mild'
      });
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, name: true, allergies: true }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    try {
      const allergy = await prismaAny.patientAllergy.create({
        data: {
          patientId,
          allergen,
          reaction,
          severity,
          onsetDate: onsetDate ? new Date(onsetDate) : null,
          notes,
          verifiedBy: req.user?.userId,
          verifiedAt: new Date(),
        }
      });

      res.status(201).json({
        success: true,
        allergy,
        message: 'Allergy record created successfully'
      });
    } catch (error) {
      // PatientAllergy table doesn't exist yet
      // Update patient.allergies field instead
      const currentAllergies = patient.allergies || '';
      const allergiesList = currentAllergies
        ? currentAllergies.split(',').map(a => a.trim())
        : [];

      if (!allergiesList.includes(allergen)) {
        allergiesList.push(allergen);
        await prisma.patient.update({
          where: { id: patientId },
          data: {
            allergies: allergiesList.join(', ')
          }
        });
      }

      res.status(201).json({
        success: true,
        allergy: {
          allergen,
          reaction,
          severity,
          onsetDate,
          notes
        },
        message: 'Allergy added to patient record (PatientAllergy table not yet migrated)',
        note: 'Run migration to use full allergy tracking features'
      });
    }
  } catch (error) {
    logger.error('Create patient allergy error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to create allergy record',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/patients/:patientId/allergies/:allergyId
 * Deactivate an allergy record
 */
router.delete('/patients/:patientId/allergies/:allergyId', async (req: any, res: Response) => {
  try {
    const { patientId, allergyId } = req.params;

    const allergy = await prismaAny.patientAllergy.findFirst({
      where: {
        id: allergyId,
        patientId
      }
    });

    if (!allergy) {
      return res.status(404).json({
        success: false,
        error: 'Allergy record not found'
      });
    }

    await prismaAny.patientAllergy.update({
      where: { id: allergyId },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Allergy record deactivated successfully'
    });
  } catch (error) {
    logger.error('Delete patient allergy error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate allergy record',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
