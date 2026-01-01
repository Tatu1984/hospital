/**
 * Shift Management Routes
 *
 * This module handles all shift management endpoints including:
 * - Shift template CRUD
 * - Shift assignment and scheduling
 * - Clock in/out functionality
 * - Roster generation and publishing
 * - Shift swap requests
 * - Staffing reports
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  authenticateToken,
  requirePermission,
  AuthenticatedRequest,
  asyncHandler,
  validateBody,
  validateQuery,
  validateParams,
} from '../middleware';
import {
  createShiftTemplateSchema,
  updateShiftTemplateSchema,
  createShiftSchema,
  updateShiftSchema,
  getShiftsQuerySchema,
  generateRosterSchema,
  publishRosterSchema,
  createShiftSwapRequestSchema,
  approveShiftSwapSchema,
  getRosterQuerySchema,
  getStaffingReportSchema,
  calculateOvertimeSchema,
  idParamSchema,
} from '../validators';
import {
  checkShiftConflicts,
  calculateOvertimeHours,
  getStaffingLevels,
  generateWeeklyRoster,
  getShiftDetails,
  clockIn,
  clockOut,
  requestShiftSwap,
  approveShiftSwap,
  publishRoster,
  getStaffingReport,
} from '../services/shiftManagement';

const router = Router();
const prisma = new PrismaClient();

// ===========================
// SHIFT TEMPLATE ROUTES
// ===========================

/**
 * GET /api/shifts/templates
 * Get all shift templates
 */
router.get(
  '/templates',
  authenticateToken,
  requirePermission('shifts:view'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const templates = await prisma.shiftTemplate.findMany({
      where: { isActive: true },
      orderBy: { startTime: 'asc' },
    });

    res.json({
      success: true,
      data: templates,
    });
  })
);

/**
 * GET /api/shifts/templates/:id
 * Get a single shift template
 */
router.get(
  '/templates/:id',
  authenticateToken,
  requirePermission('shifts:view'),
  validateParams(idParamSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const template = await prisma.shiftTemplate.findUnique({
      where: { id },
      include: {
        _count: {
          select: { shifts: true }
        }
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Shift template not found',
      });
    }

    res.json({
      success: true,
      data: template,
    });
  })
);

/**
 * POST /api/shifts/templates
 * Create a new shift template
 */
router.post(
  '/templates',
  authenticateToken,
  requirePermission('shifts:manage'),
  validateBody(createShiftTemplateSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = req.body;

    // Check if code already exists
    const existing = await prisma.shiftTemplate.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Shift template with this code already exists',
      });
    }

    const template = await prisma.shiftTemplate.create({
      data,
    });

    res.status(201).json({
      success: true,
      data: template,
      message: 'Shift template created successfully',
    });
  })
);

/**
 * PUT /api/shifts/templates/:id
 * Update a shift template
 */
router.put(
  '/templates/:id',
  authenticateToken,
  requirePermission('shifts:manage'),
  validateParams(idParamSchema),
  validateBody(updateShiftTemplateSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    // Check if template exists
    const existing = await prisma.shiftTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Shift template not found',
      });
    }

    // If code is being updated, check uniqueness
    if (data.code && data.code !== existing.code) {
      const codeExists = await prisma.shiftTemplate.findUnique({
        where: { code: data.code },
      });

      if (codeExists) {
        return res.status(400).json({
          success: false,
          error: 'Shift template with this code already exists',
        });
      }
    }

    const template = await prisma.shiftTemplate.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      data: template,
      message: 'Shift template updated successfully',
    });
  })
);

/**
 * DELETE /api/shifts/templates/:id
 * Soft delete a shift template (set isActive to false)
 */
router.delete(
  '/templates/:id',
  authenticateToken,
  requirePermission('shifts:manage'),
  validateParams(idParamSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const template = await prisma.shiftTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      data: template,
      message: 'Shift template deactivated successfully',
    });
  })
);

// ===========================
// SHIFT ROUTES
// ===========================

/**
 * GET /api/shifts
 * Get shifts with filters
 */
router.get(
  '/',
  authenticateToken,
  requirePermission('shifts:view'),
  validateQuery(getShiftsQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {
      employeeId,
      department,
      date,
      startDate,
      endDate,
      status,
      templateId,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query as any;

    const where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (department) {
      where.employee = { department };
    }

    if (date) {
      where.date = new Date(date);
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (status) {
      where.status = status;
    }

    if (templateId) {
      where.templateId = templateId;
    }

    const [shifts, total] = await Promise.all([
      prisma.shift.findMany({
        where,
        include: {
          template: true,
          employee: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              email: true,
              phone: true,
              department: true,
              designation: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { date: 'desc' },
      }),
      prisma.shift.count({ where }),
    ]);

    res.json({
      success: true,
      data: shifts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

/**
 * GET /api/shifts/:id
 * Get a single shift
 */
router.get(
  '/:id',
  authenticateToken,
  requirePermission('shifts:view'),
  validateParams(idParamSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const shift = await getShiftDetails(id);

    if (!shift) {
      return res.status(404).json({
        success: false,
        error: 'Shift not found',
      });
    }

    res.json({
      success: true,
      data: shift,
    });
  })
);

/**
 * POST /api/shifts
 * Assign a shift to an employee
 */
router.post(
  '/',
  authenticateToken,
  requirePermission('shifts:manage'),
  validateBody(createShiftSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = req.body;

    // Check for conflicts
    const conflict = await checkShiftConflicts(
      data.employeeId,
      new Date(data.date),
      data.templateId
    );

    if (conflict.hasConflict) {
      return res.status(400).json({
        success: false,
        error: 'Shift conflict detected',
        conflicts: conflict.conflicts,
      });
    }

    const shift = await prisma.shift.create({
      data: {
        ...data,
        date: new Date(data.date),
      },
      include: {
        template: true,
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            email: true,
            department: true,
            designation: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: shift,
      message: 'Shift assigned successfully',
    });
  })
);

/**
 * PUT /api/shifts/:id
 * Update a shift
 */
router.put(
  '/:id',
  authenticateToken,
  requirePermission('shifts:manage'),
  validateParams(idParamSchema),
  validateBody(updateShiftSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    const shift = await prisma.shift.update({
      where: { id },
      data,
      include: {
        template: true,
        employee: true,
      },
    });

    res.json({
      success: true,
      data: shift,
      message: 'Shift updated successfully',
    });
  })
);

/**
 * POST /api/shifts/:id/start
 * Clock in (start shift)
 */
router.post(
  '/:id/start',
  authenticateToken,
  requirePermission('shifts:clock'),
  validateParams(idParamSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    try {
      const shift = await clockIn(id);

      res.json({
        success: true,
        data: shift,
        message: 'Clocked in successfully',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * POST /api/shifts/:id/end
 * Clock out (end shift)
 */
router.post(
  '/:id/end',
  authenticateToken,
  requirePermission('shifts:clock'),
  validateParams(idParamSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    try {
      const shift = await clockOut(id);

      res.json({
        success: true,
        data: shift,
        message: 'Clocked out successfully',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// ===========================
// ROSTER ROUTES
// ===========================

/**
 * POST /api/shifts/roster/generate
 * Auto-generate weekly roster
 */
router.post(
  '/roster/generate',
  authenticateToken,
  requirePermission('shifts:manage'),
  validateBody(generateRosterSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { departmentId, wardId, weekStartDate, publishImmediately } = req.body;
    const userId = req.user!.userId;

    try {
      const result = await generateWeeklyRoster(
        departmentId,
        new Date(weekStartDate),
        publishImmediately ? userId : undefined
      );

      res.status(201).json({
        success: true,
        data: result,
        message: `Weekly roster generated successfully. ${result.shiftsCreated} shifts created.`,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * GET /api/shifts/roster
 * Get rosters with filters
 */
router.get(
  '/roster',
  authenticateToken,
  requirePermission('shifts:view'),
  validateQuery(getRosterQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {
      departmentId,
      wardId,
      startDate,
      endDate,
      status,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query as any;

    const where: any = {};

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (wardId) {
      where.wardId = wardId;
    }

    if (startDate && endDate) {
      where.weekStartDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (status) {
      where.status = status;
    }

    const [rosters, total] = await Promise.all([
      prisma.shiftRoster.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { weekStartDate: 'desc' },
      }),
      prisma.shiftRoster.count({ where }),
    ]);

    res.json({
      success: true,
      data: rosters,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

/**
 * POST /api/shifts/roster/publish
 * Publish a roster
 */
router.post(
  '/roster/publish',
  authenticateToken,
  requirePermission('shifts:manage'),
  validateBody(publishRosterSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { rosterId } = req.body;
    const userId = req.user!.userId;

    const roster = await publishRoster(rosterId, userId);

    res.json({
      success: true,
      data: roster,
      message: 'Roster published successfully',
    });
  })
);

// ===========================
// SHIFT SWAP ROUTES
// ===========================

/**
 * POST /api/shifts/swap-request
 * Request a shift swap
 */
router.post(
  '/swap-request',
  authenticateToken,
  requirePermission('shifts:swap'),
  validateBody(createShiftSwapRequestSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = req.body;
    const userId = req.user!.userId;

    // Get user's email first
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Find the employee record for the user
    const employee = await prisma.employee.findFirst({
      where: { email: user.email },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee record not found for this user',
      });
    }

    try {
      const swapRequest = await requestShiftSwap(
        employee.id,
        data.requestedShiftId,
        data.targetEmployeeId,
        data.offeredShiftId,
        data.reason
      );

      res.status(201).json({
        success: true,
        data: swapRequest,
        message: 'Shift swap request created successfully',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * GET /api/shifts/swap-request
 * Get all shift swap requests
 */
router.get(
  '/swap-request',
  authenticateToken,
  requirePermission('shifts:view'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const swapRequests = await prisma.shiftSwapRequest.findMany({
      include: {
        requestedShift: {
          include: {
            template: true,
            employee: {
              select: {
                id: true,
                employeeId: true,
                name: true,
                department: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: swapRequests,
    });
  })
);

/**
 * PUT /api/shifts/swap-request/:id/approve
 * Approve or reject a shift swap request
 */
router.put(
  '/swap-request/:id/approve',
  authenticateToken,
  requirePermission('shifts:manage'),
  validateParams(idParamSchema),
  validateBody(approveShiftSwapSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { approved } = req.body;
    const userId = req.user!.userId;

    if (approved) {
      try {
        const swapRequest = await approveShiftSwap(id, userId);

        res.json({
          success: true,
          data: swapRequest,
          message: 'Shift swap approved successfully',
        });
      } catch (error: any) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
    } else {
      // Reject the swap
      const swapRequest = await prisma.shiftSwapRequest.update({
        where: { id },
        data: {
          status: 'rejected',
          approvedBy: userId,
          approvedAt: new Date(),
        },
      });

      res.json({
        success: true,
        data: swapRequest,
        message: 'Shift swap rejected',
      });
    }
  })
);

// ===========================
// REPORTING ROUTES
// ===========================

/**
 * GET /api/shifts/staffing-report
 * Get staffing levels report
 */
router.get(
  '/staffing-report',
  authenticateToken,
  requirePermission('shifts:view'),
  validateQuery(getStaffingReportSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { startDate, endDate, departmentId, wardId } = req.query as any;

    const report = await getStaffingReport(
      new Date(startDate),
      new Date(endDate),
      departmentId
    );

    res.json({
      success: true,
      data: report,
    });
  })
);

/**
 * GET /api/shifts/overtime/:employeeId
 * Calculate overtime for an employee
 */
router.get(
  '/overtime/:employeeId',
  authenticateToken,
  requirePermission('shifts:view'),
  validateParams(idParamSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { employeeId } = req.params;
    const { month, year } = req.query as any;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        error: 'Month and year query parameters are required',
      });
    }

    const overtime = await calculateOvertimeHours(
      employeeId,
      parseInt(month),
      parseInt(year)
    );

    res.json({
      success: true,
      data: overtime,
    });
  })
);

/**
 * GET /api/shifts/staffing/:date
 * Get staffing levels for a specific date and department
 */
router.get(
  '/staffing/:date',
  authenticateToken,
  requirePermission('shifts:view'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { date } = req.params;
    const { departmentId, wardId } = req.query as any;

    const staffing = await getStaffingLevels(
      departmentId || null,
      wardId || null,
      new Date(date)
    );

    res.json({
      success: true,
      data: staffing,
    });
  })
);

export default router;
