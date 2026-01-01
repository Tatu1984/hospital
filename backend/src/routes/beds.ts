/**
 * Bed Management Routes
 *
 * API endpoints for bed availability checking, conflict detection,
 * reservation, and bed history management.
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/db';
import {
  authenticateToken,
  AuthenticatedRequest,
  asyncHandler,
  validateBody,
  validateQuery,
  validateParams,
} from '../middleware';
import {
  checkBedAvailabilitySchema,
  findAvailableBedsSchema,
  reserveBedSchema,
  updateBedStatusSchema,
  transferBedSchema,
  getBedHistorySchema,
  getAvailableBedsQuerySchema,
  idParamSchema,
} from '../validators';
import { bedManagementService, checkBedAvailabilityBatch } from '../services/bedManagement';

const router = Router();

/**
 * GET /api/beds/available
 * Get available beds with optional filters
 */
router.get(
  '/available',
  authenticateToken,
  validateQuery(getAvailableBedsQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { wardId, category, fromDate, toDate, floor } = req.query as any;
    const branchId = req.user!.branchId;

    // Build filter with tenant isolation
    const where: any = {
      branchId, // Tenant isolation
      status: {
        in: ['vacant', 'reserved']
      }
    };

    if (wardId) where.wardId = wardId;
    if (category) where.category = category;
    if (floor) where.floor = floor;

    // Get beds matching criteria
    const beds = await prisma.bed.findMany({
      where,
      include: {
        branch: {
          select: { name: true }
        }
      },
      orderBy: {
        bedNumber: 'asc'
      }
    });

    // If date range provided, check availability using batch query (optimized - no N+1)
    if (fromDate) {
      const from = new Date(fromDate as string);
      const to = toDate ? new Date(toDate as string) : undefined;

      // Use batch function instead of N+1 individual queries
      const bedIds = beds.map(bed => bed.id);
      const availabilityMap = await checkBedAvailabilityBatch(bedIds, from, to);

      const availableBeds = beds
        .filter(bed => {
          const availability = availabilityMap.get(bed.id);
          return availability?.isAvailable ?? false;
        })
        .map(bed => ({
          id: bed.id,
          bedNumber: bed.bedNumber,
          category: bed.category,
          floor: bed.floor,
          wardId: bed.wardId,
          status: bed.status,
          branchName: bed.branch.name
        }));

      res.json({
        success: true,
        count: availableBeds.length,
        beds: availableBeds
      });
    } else {
      // Just return beds based on current status
      res.json({
        success: true,
        count: beds.length,
        beds: beds.map(bed => ({
          id: bed.id,
          bedNumber: bed.bedNumber,
          category: bed.category,
          floor: bed.floor,
          wardId: bed.wardId,
          status: bed.status,
          branchName: bed.branch.name
        }))
      });
    }
  })
);

/**
 * POST /api/beds/:id/check-availability
 * Check if a specific bed is available for a date range
 */
router.post(
  '/:id/check-availability',
  authenticateToken,
  validateParams(idParamSchema),
  validateBody(checkBedAvailabilitySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { fromDate, toDate } = req.body;

    const availability = await bedManagementService.checkBedAvailability(
      id,
      new Date(fromDate),
      toDate ? new Date(toDate) : undefined
    );

    res.json({
      success: true,
      availability
    });
  })
);

/**
 * POST /api/beds/:id/reserve
 * Reserve a bed for future admission
 */
router.post(
  '/:id/reserve',
  authenticateToken,
  validateParams(idParamSchema),
  validateBody(reserveBedSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { patientId, reservedFrom, reservedUntil, admissionId, remarks } = req.body;

    try {
      const reservation = await bedManagementService.reserveBed(
        id,
        patientId,
        new Date(reservedFrom),
        new Date(reservedUntil),
        admissionId
      );

      // Update reservation with createdBy
      await prisma.bedReservation.update({
        where: { id: reservation.id },
        data: { createdBy: req.user?.userId }
      });

      res.status(201).json({
        success: true,
        message: 'Bed reserved successfully',
        reservation: {
          id: reservation.id,
          bedNumber: reservation.bed.bedNumber,
          category: reservation.bed.category,
          patientName: reservation.patient.name,
          patientMRN: reservation.patient.mrn,
          reservedFrom: reservation.reservedFrom,
          reservedUntil: reservation.reservedUntil,
          status: reservation.status
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to reserve bed'
      });
    }
  })
);

/**
 * DELETE /api/beds/reservations/:id
 * Cancel a bed reservation
 */
router.delete(
  '/reservations/:id',
  authenticateToken,
  validateParams(idParamSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    try {
      const reservation = await bedManagementService.cancelReservation(id);

      res.json({
        success: true,
        message: 'Reservation cancelled successfully',
        reservation: {
          id: reservation.id,
          status: reservation.status
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to cancel reservation'
      });
    }
  })
);

/**
 * GET /api/beds/:id/history
 * Get bed assignment history
 */
router.get(
  '/:id/history',
  authenticateToken,
  validateParams(idParamSchema),
  validateQuery(getBedHistorySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { limit } = req.query as any;

    const history = await bedManagementService.getBedHistory(
      id,
      limit ? parseInt(limit) : 50
    );

    res.json({
      success: true,
      count: history.length,
      history
    });
  })
);

/**
 * PATCH /api/beds/:id/status
 * Update bed status (maintenance, dirty, vacant)
 */
router.patch(
  '/:id/status',
  authenticateToken,
  validateParams(idParamSchema),
  validateBody(updateBedStatusSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
      const bed = await bedManagementService.updateBedStatus(id, status);

      res.json({
        success: true,
        message: 'Bed status updated successfully',
        bed: {
          id: bed.id,
          bedNumber: bed.bedNumber,
          status: bed.status
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update bed status'
      });
    }
  })
);

/**
 * POST /api/beds/transfer
 * Transfer patient to a different bed
 */
router.post(
  '/transfer',
  authenticateToken,
  validateBody(transferBedSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { admissionId, newBedId, reason } = req.body;

    try {
      // Get current admission to find old bed
      const currentAdmission = await prisma.admission.findUnique({
        where: { id: admissionId },
        select: { bedId: true }
      });

      if (!currentAdmission) {
        return res.status(404).json({
          success: false,
          error: 'Admission not found'
        });
      }

      const admission = await bedManagementService.transferBed(
        admissionId,
        newBedId,
        currentAdmission.bedId,
        reason
      );

      res.json({
        success: true,
        message: 'Patient transferred successfully',
        admission: {
          id: admission.id,
          newBedId: admission.bedId
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to transfer bed'
      });
    }
  })
);

/**
 * GET /api/beds/:id/conflicts/:admissionId
 * Detect conflicts for a specific bed and admission
 */
router.get(
  '/:id/conflicts/:admissionId',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id, admissionId } = req.params;

    const conflict = await bedManagementService.detectConflicts(id, admissionId);

    res.json({
      success: true,
      conflict
    });
  })
);

/**
 * GET /api/beds/reservations
 * Get all bed reservations with filters
 */
router.get(
  '/reservations',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { status, patientId, bedId, fromDate, toDate } = req.query;

    const where: any = {};

    if (status) where.status = status;
    if (patientId) where.patientId = patientId;
    if (bedId) where.bedId = bedId;

    if (fromDate || toDate) {
      where.AND = [];
      if (fromDate) {
        where.AND.push({
          reservedUntil: { gte: new Date(fromDate as string) }
        });
      }
      if (toDate) {
        where.AND.push({
          reservedFrom: { lte: new Date(toDate as string) }
        });
      }
    }

    const reservations = await prisma.bedReservation.findMany({
      where,
      include: {
        bed: {
          select: {
            bedNumber: true,
            category: true,
            floor: true
          }
        },
        patient: {
          select: {
            name: true,
            mrn: true,
            contact: true
          }
        }
      },
      orderBy: {
        reservedFrom: 'desc'
      }
    });

    res.json({
      success: true,
      count: reservations.length,
      reservations
    });
  })
);

export default router;
