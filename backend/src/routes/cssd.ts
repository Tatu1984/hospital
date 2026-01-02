import { Router, Response } from 'express';
import { prisma } from '../lib/db';
import { AuthenticatedRequest, asyncHandler, ValidationError, NotFoundError } from '../middleware';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();

// ============================================
// Validation Schemas
// ============================================

const instrumentSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  category: z.string().min(1),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().datetime().optional(),
  purchasePrice: z.number().optional(),
  condition: z.enum(['good', 'fair', 'needs_repair', 'condemned']).optional(),
  status: z.enum(['available', 'in_use', 'sterilizing', 'maintenance', 'disposed']).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

const sterilizationCycleSchema = z.object({
  autoclaveName: z.string().min(1),
  autoclaveId: z.string().optional(),
  cycleType: z.enum(['gravity', 'prevacuum', 'flash', 'ETO', 'plasma', 'dry_heat']),
  loadType: z.enum(['wrapped', 'unwrapped', 'mixed']),
  temperature: z.number().min(0).max(300),
  temperatureUnit: z.enum(['C', 'F']).optional(),
  pressure: z.number().min(0),
  pressureUnit: z.enum(['PSI', 'bar', 'kPa']).optional(),
  duration: z.number().min(1),
  instrumentIds: z.array(z.string()).optional(),
  biologicalIndicator: z.boolean().optional(),
  chemicalIndicator: z.boolean().optional(),
  notes: z.string().optional(),
});

const sterilizationPackSchema = z.object({
  packType: z.string().min(1),
  packName: z.string().min(1),
  description: z.string().optional(),
  contents: z.array(z.object({
    instrumentId: z.string().optional(),
    name: z.string(),
    quantity: z.number().min(1),
  })),
  expiryDays: z.number().min(1).max(365).optional(),
});

// ============================================
// Instrument Endpoints
// ============================================

// Get all instruments
router.get('/instruments', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status, type, category, search, page = '1', limit = '50' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where: any = {
    tenantId: req.user!.tenantId,
    branchId: req.user!.branchId,
    isActive: true,
  };

  if (status) where.status = status;
  if (type) where.type = type;
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { instrumentCode: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const [instruments, total] = await Promise.all([
    prisma.instrument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.instrument.count({ where }),
  ]);

  res.json({
    data: instruments,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  });
}));

// Get single instrument
router.get('/instruments/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const instrument = await prisma.instrument.findFirst({
    where: {
      id: req.params.id,
      tenantId: req.user!.tenantId,
    },
    include: {
      sterilizationRecords: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { cycle: true },
      },
      usageRecords: {
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!instrument) {
    throw new NotFoundError('Instrument not found');
  }

  res.json(instrument);
}));

// Create instrument
router.post('/instruments', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = instrumentSchema.parse(req.body);

  // Generate instrument code
  const count = await prisma.instrument.count({
    where: { tenantId: req.user!.tenantId },
  });
  const instrumentCode = `INS${String(count + 1).padStart(6, '0')}`;

  const instrument = await prisma.instrument.create({
    data: {
      ...data,
      instrumentCode,
      tenantId: req.user!.tenantId,
      branchId: req.user!.branchId || '',
      purchasePrice: data.purchasePrice ? data.purchasePrice : undefined,
    },
  });

  logger.info('Instrument created', { instrumentId: instrument.id, code: instrumentCode });
  res.status(201).json(instrument);
}));

// Update instrument
router.put('/instruments/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = instrumentSchema.partial().parse(req.body);

  const instrument = await prisma.instrument.update({
    where: { id: req.params.id },
    data: {
      ...data,
      purchasePrice: data.purchasePrice ? data.purchasePrice : undefined,
    },
  });

  logger.info('Instrument updated', { instrumentId: instrument.id });
  res.json(instrument);
}));

// Delete instrument (soft delete)
router.delete('/instruments/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await prisma.instrument.update({
    where: { id: req.params.id },
    data: { isActive: false, status: 'disposed' },
  });

  logger.info('Instrument deleted', { instrumentId: req.params.id });
  res.json({ success: true, message: 'Instrument deleted' });
}));

// ============================================
// Sterilization Cycle Endpoints
// ============================================

// Get all cycles
router.get('/cycles', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status, result, dateFrom, dateTo, page = '1', limit = '50' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where: any = {
    tenantId: req.user!.tenantId,
    branchId: req.user!.branchId,
  };

  if (status) where.status = status;
  if (result) where.result = result;
  if (dateFrom || dateTo) {
    where.startTime = {};
    if (dateFrom) where.startTime.gte = new Date(dateFrom as string);
    if (dateTo) where.startTime.lte = new Date(dateTo as string);
  }

  const [cycles, total] = await Promise.all([
    prisma.sterilizationCycle.findMany({
      where,
      orderBy: { startTime: 'desc' },
      skip,
      take: parseInt(limit as string),
      include: {
        instruments: { include: { instrument: true } },
        packs: true,
      },
    }),
    prisma.sterilizationCycle.count({ where }),
  ]);

  res.json({
    data: cycles,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  });
}));

// Get single cycle
router.get('/cycles/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const cycle = await prisma.sterilizationCycle.findFirst({
    where: {
      id: req.params.id,
      tenantId: req.user!.tenantId,
    },
    include: {
      instruments: { include: { instrument: true } },
      packs: true,
    },
  });

  if (!cycle) {
    throw new NotFoundError('Sterilization cycle not found');
  }

  res.json(cycle);
}));

// Start new cycle
router.post('/cycles', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = sterilizationCycleSchema.parse(req.body);

  // Generate cycle number
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.sterilizationCycle.count({
    where: {
      tenantId: req.user!.tenantId,
      startTime: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
  });
  const cycleNumber = `CYC${today}${String(count + 1).padStart(3, '0')}`;

  const cycle = await prisma.sterilizationCycle.create({
    data: {
      cycleNumber,
      tenantId: req.user!.tenantId,
      branchId: req.user!.branchId || '',
      autoclaveName: data.autoclaveName,
      autoclaveId: data.autoclaveId,
      operatorId: req.user!.userId,
      operatorName: req.user!.username,
      cycleType: data.cycleType,
      loadType: data.loadType,
      startTime: new Date(),
      temperature: data.temperature,
      temperatureUnit: data.temperatureUnit || 'C',
      pressure: data.pressure,
      pressureUnit: data.pressureUnit || 'PSI',
      duration: data.duration,
      biologicalIndicator: data.biologicalIndicator || false,
      chemicalIndicator: data.chemicalIndicator || false,
      notes: data.notes,
      status: 'in_progress',
    },
  });

  // Add instruments to cycle if provided
  if (data.instrumentIds && data.instrumentIds.length > 0) {
    await prisma.instrumentSterilization.createMany({
      data: data.instrumentIds.map((instrumentId, index) => ({
        instrumentId,
        cycleId: cycle.id,
        position: `P${index + 1}`,
      })),
    });

    // Update instrument status
    await prisma.instrument.updateMany({
      where: { id: { in: data.instrumentIds } },
      data: { status: 'sterilizing' },
    });
  }

  logger.info('Sterilization cycle started', { cycleId: cycle.id, cycleNumber });
  res.status(201).json(cycle);
}));

// Complete cycle
router.put('/cycles/:id/complete', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { result, biologicalResult, chemicalResult, failureReason, notes } = req.body;

  const cycle = await prisma.sterilizationCycle.update({
    where: { id: req.params.id },
    data: {
      endTime: new Date(),
      status: 'completed',
      result: result || 'pass',
      biologicalResult,
      chemicalResult,
      failureReason,
      notes,
      verifiedBy: req.user!.userId,
      verifiedAt: new Date(),
    },
    include: {
      instruments: { include: { instrument: true } },
    },
  });

  // Update instrument status based on result
  const instrumentIds = cycle.instruments.map(i => i.instrumentId);
  if (instrumentIds.length > 0) {
    if (result === 'pass') {
      await prisma.instrument.updateMany({
        where: { id: { in: instrumentIds } },
        data: {
          status: 'available',
          lastSterilizedAt: new Date(),
        },
      });
    } else {
      // Failed - instruments need re-sterilization
      await prisma.instrument.updateMany({
        where: { id: { in: instrumentIds } },
        data: { status: 'available' }, // Back to available for re-sterilization
      });
    }
  }

  logger.info('Sterilization cycle completed', { cycleId: cycle.id, result });
  res.json(cycle);
}));

// Abort cycle
router.put('/cycles/:id/abort', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { reason } = req.body;

  const cycle = await prisma.sterilizationCycle.update({
    where: { id: req.params.id },
    data: {
      endTime: new Date(),
      status: 'aborted',
      result: 'incomplete',
      failureReason: reason,
    },
    include: {
      instruments: { include: { instrument: true } },
    },
  });

  // Return instruments to available status
  const instrumentIds = cycle.instruments.map(i => i.instrumentId);
  if (instrumentIds.length > 0) {
    await prisma.instrument.updateMany({
      where: { id: { in: instrumentIds } },
      data: { status: 'available' },
    });
  }

  logger.info('Sterilization cycle aborted', { cycleId: cycle.id, reason });
  res.json(cycle);
}));

// ============================================
// Sterilization Pack Endpoints
// ============================================

// Get all packs
router.get('/packs', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status, packType, expiring, page = '1', limit = '50' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where: any = {
    tenantId: req.user!.tenantId,
    branchId: req.user!.branchId,
  };

  if (status) where.status = status;
  if (packType) where.packType = packType;
  if (expiring === 'true') {
    // Expiring within 7 days
    where.expiryDate = {
      lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      gte: new Date(),
    };
    where.status = 'available';
  }

  const [packs, total] = await Promise.all([
    prisma.sterilizationPack.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string),
      include: {
        cycle: true,
      },
    }),
    prisma.sterilizationPack.count({ where }),
  ]);

  res.json({
    data: packs,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  });
}));

// Create pack from cycle
router.post('/packs', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = sterilizationPackSchema.parse(req.body);
  const { cycleId } = req.body;

  if (!cycleId) {
    throw new ValidationError('Cycle ID is required');
  }

  // Verify cycle exists and passed
  const cycle = await prisma.sterilizationCycle.findFirst({
    where: { id: cycleId, result: 'pass' },
  });

  if (!cycle) {
    throw new ValidationError('Invalid or failed sterilization cycle');
  }

  // Generate pack code
  const count = await prisma.sterilizationPack.count({
    where: { tenantId: req.user!.tenantId },
  });
  const packCode = `PKG${String(count + 1).padStart(6, '0')}`;

  const expiryDays = data.expiryDays || 30;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiryDays);

  const pack = await prisma.sterilizationPack.create({
    data: {
      packCode,
      tenantId: req.user!.tenantId,
      branchId: req.user!.branchId || '',
      packType: data.packType,
      packName: data.packName,
      description: data.description,
      contents: data.contents,
      cycleId,
      sterilizedAt: cycle.endTime || new Date(),
      expiryDate,
      expiryDays,
      status: 'available',
    },
  });

  logger.info('Sterilization pack created', { packId: pack.id, packCode });
  res.status(201).json(pack);
}));

// Issue pack
router.put('/packs/:id/issue', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { issuedTo, notes } = req.body;

  if (!issuedTo) {
    throw new ValidationError('Issue destination is required');
  }

  const pack = await prisma.sterilizationPack.update({
    where: { id: req.params.id },
    data: {
      status: 'issued',
      issuedTo,
      issuedAt: new Date(),
      issuedBy: req.user!.userId,
      notes,
    },
  });

  logger.info('Pack issued', { packId: pack.id, issuedTo });
  res.json(pack);
}));

// Mark pack as used
router.put('/packs/:id/use', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { usedFor, notes } = req.body;

  const pack = await prisma.sterilizationPack.update({
    where: { id: req.params.id },
    data: {
      status: 'used',
      usedFor,
      usedAt: new Date(),
      usedBy: req.user!.userId,
      notes,
    },
  });

  logger.info('Pack used', { packId: pack.id, usedFor });
  res.json(pack);
}));

// Return pack (unused)
router.put('/packs/:id/return', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { notes } = req.body;

  const pack = await prisma.sterilizationPack.findFirst({
    where: { id: req.params.id },
  });

  if (!pack) {
    throw new NotFoundError('Pack not found');
  }

  // Check if pack is expired
  const isExpired = new Date() > new Date(pack.expiryDate);

  const updatedPack = await prisma.sterilizationPack.update({
    where: { id: req.params.id },
    data: {
      status: isExpired ? 'expired' : 'available',
      returnedAt: new Date(),
      notes,
    },
  });

  logger.info('Pack returned', { packId: pack.id, isExpired });
  res.json(updatedPack);
}));

// ============================================
// Dashboard & Reports
// ============================================

// Get CSSD dashboard stats
router.get('/dashboard', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalInstruments,
    instrumentsByStatus,
    todayCycles,
    cyclesByResult,
    availablePacks,
    expiringPacks,
    packsIssuedToday,
  ] = await Promise.all([
    // Total active instruments
    prisma.instrument.count({
      where: {
        tenantId: req.user!.tenantId,
        isActive: true,
      },
    }),
    // Instruments by status
    prisma.instrument.groupBy({
      by: ['status'],
      where: {
        tenantId: req.user!.tenantId,
        isActive: true,
      },
      _count: true,
    }),
    // Today's cycles
    prisma.sterilizationCycle.count({
      where: {
        tenantId: req.user!.tenantId,
        startTime: { gte: today },
      },
    }),
    // Cycles by result (last 30 days)
    prisma.sterilizationCycle.groupBy({
      by: ['result'],
      where: {
        tenantId: req.user!.tenantId,
        startTime: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        status: 'completed',
      },
      _count: true,
    }),
    // Available packs
    prisma.sterilizationPack.count({
      where: {
        tenantId: req.user!.tenantId,
        status: 'available',
        expiryDate: { gte: new Date() },
      },
    }),
    // Packs expiring in 7 days
    prisma.sterilizationPack.count({
      where: {
        tenantId: req.user!.tenantId,
        status: 'available',
        expiryDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    // Packs issued today
    prisma.sterilizationPack.count({
      where: {
        tenantId: req.user!.tenantId,
        issuedAt: { gte: today },
      },
    }),
  ]);

  res.json({
    instruments: {
      total: totalInstruments,
      byStatus: instrumentsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
    },
    cycles: {
      today: todayCycles,
      byResult: cyclesByResult.reduce((acc, item) => {
        acc[item.result || 'unknown'] = item._count;
        return acc;
      }, {} as Record<string, number>),
    },
    packs: {
      available: availablePacks,
      expiringSoon: expiringPacks,
      issuedToday: packsIssuedToday,
    },
  });
}));

// Get instruments needing sterilization
router.get('/reports/pending-sterilization', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const instruments = await prisma.instrument.findMany({
    where: {
      tenantId: req.user!.tenantId,
      isActive: true,
      status: 'available',
      OR: [
        { lastSterilizedAt: null },
        {
          lastSterilizedAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Not sterilized in last 24 hours
          },
        },
      ],
    },
    orderBy: { lastSterilizedAt: 'asc' },
  });

  res.json(instruments);
}));

// Get expiry report
router.get('/reports/expiry', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { days = '7' } = req.query;
  const daysNum = parseInt(days as string);

  const expiringPacks = await prisma.sterilizationPack.findMany({
    where: {
      tenantId: req.user!.tenantId,
      status: 'available',
      expiryDate: {
        gte: new Date(),
        lte: new Date(Date.now() + daysNum * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { expiryDate: 'asc' },
    include: { cycle: true },
  });

  res.json(expiringPacks);
}));

export default router;
