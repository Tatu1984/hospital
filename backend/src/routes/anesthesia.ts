import { Router, Response } from 'express';
import { prisma } from '../lib/db';
import {
  authenticateToken,
  AuthenticatedRequest,
  asyncHandler,
  NotFoundError,
  ValidationError,
} from '../middleware';
import {
  createAnesthesiaRecordSchema,
  updateAnesthesiaRecordSchema,
  addVitalsEntrySchema,
  addAnesthesiaComplicationSchema,
  reportSurgeryComplicationSchema,
  addSurgeryImplantSchema,
} from '../validators';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/surgeries/{id}/anesthesia:
 *   post:
 *     summary: Create anesthesia record for surgery
 *     tags: [Anesthesia]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - surgeryId
 *               - patientId
 *               - anesthetistId
 *               - anesthesiaType
 *               - preOpAssessment
 *               - startTime
 */
router.post('/surgeries/:id/anesthesia',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    // Validate schema
    const validated = createAnesthesiaRecordSchema.parse(data);

    // Check if surgery exists
    const surgery = await prisma.surgery.findUnique({ where: { id } });
    if (!surgery) {
      throw new NotFoundError('Surgery not found');
    }

    // Check if anesthesia record already exists
    const existing = await prisma.anesthesiaRecord.findUnique({
      where: { surgeryId: id }
    });
    if (existing) {
      throw new ValidationError('Anesthesia record already exists for this surgery');
    }

    // Create anesthesia record
    const record = await prisma.anesthesiaRecord.create({
      data: {
        surgeryId: id,
        patientId: validated.patientId,
        anesthetistId: validated.anesthetistId,
        anesthesiaType: validated.anesthesiaType,
        preOpAssessment: validated.preOpAssessment,
        agents: [],
        vitalsLog: [],
        airwayManagement: {},
        fluidBalance: {},
        complications: [],
        startTime: new Date(validated.startTime),
        endTime: validated.endTime ? new Date(validated.endTime) : null,
      },
    });

    logger.info('Anesthesia record created', {
      recordId: record.id,
      surgeryId: id,
      userId: req.user?.userId
    });

    res.status(201).json({
      message: 'Anesthesia record created successfully',
      record
    });
  })
);

/**
 * @swagger
 * /api/surgeries/{id}/anesthesia:
 *   get:
 *     summary: Get anesthesia record for surgery
 *     tags: [Anesthesia]
 *     security:
 *       - bearerAuth: []
 */
router.get('/surgeries/:id/anesthesia',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const record = await prisma.anesthesiaRecord.findUnique({
      where: { surgeryId: id },
      include: {
        surgery: {
          select: {
            id: true,
            procedureName: true,
            patientName: true,
            patientMRN: true,
            scheduledDate: true,
            status: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundError('Anesthesia record not found');
    }

    res.json({ record });
  })
);

/**
 * @swagger
 * /api/surgeries/{id}/anesthesia:
 *   put:
 *     summary: Update anesthesia record
 *     tags: [Anesthesia]
 *     security:
 *       - bearerAuth: []
 */
router.put('/surgeries/:id/anesthesia',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    // Validate schema
    const validated = updateAnesthesiaRecordSchema.parse(data);

    // Check if record exists
    const existing = await prisma.anesthesiaRecord.findUnique({
      where: { surgeryId: id },
    });

    if (!existing) {
      throw new NotFoundError('Anesthesia record not found');
    }

    // Update record
    const updateData: any = {};
    if (validated.agents) updateData.agents = validated.agents;
    if (validated.airwayManagement) updateData.airwayManagement = validated.airwayManagement;
    if (validated.fluidBalance) updateData.fluidBalance = validated.fluidBalance;
    if (validated.recoveryNotes) updateData.recoveryNotes = validated.recoveryNotes;
    if (validated.postOpInstructions) updateData.postOpInstructions = validated.postOpInstructions;
    if (validated.endTime) updateData.endTime = new Date(validated.endTime);

    const record = await prisma.anesthesiaRecord.update({
      where: { surgeryId: id },
      data: updateData,
    });

    logger.info('Anesthesia record updated', {
      recordId: record.id,
      surgeryId: id,
      userId: req.user?.userId
    });

    res.json({
      message: 'Anesthesia record updated successfully',
      record
    });
  })
);

/**
 * @swagger
 * /api/surgeries/{id}/vitals:
 *   post:
 *     summary: Add vitals entry during surgery
 *     tags: [Anesthesia]
 *     security:
 *       - bearerAuth: []
 */
router.post('/surgeries/:id/vitals',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    // Validate schema
    const validated = addVitalsEntrySchema.parse(data);

    // Get anesthesia record
    const record = await prisma.anesthesiaRecord.findUnique({
      where: { surgeryId: id },
    });

    if (!record) {
      throw new NotFoundError('Anesthesia record not found');
    }

    // Add vitals entry
    const vitalsLog = Array.isArray(record.vitalsLog) ? [...record.vitalsLog] : [];
    vitalsLog.push(validated);

    const updated = await prisma.anesthesiaRecord.update({
      where: { surgeryId: id },
      data: { vitalsLog: vitalsLog as any },
    });

    logger.info('Vitals entry added', {
      recordId: updated.id,
      surgeryId: id,
      time: validated.time,
      userId: req.user?.userId
    });

    res.status(201).json({
      message: 'Vitals entry added successfully',
      vitalsLog: updated.vitalsLog
    });
  })
);

/**
 * @swagger
 * /api/surgeries/{id}/anesthesia/complications:
 *   post:
 *     summary: Add anesthesia complication during surgery
 *     tags: [Anesthesia]
 *     security:
 *       - bearerAuth: []
 */
router.post('/surgeries/:id/anesthesia/complications',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    // Validate schema
    const validated = addAnesthesiaComplicationSchema.parse(data);

    // Get anesthesia record
    const record = await prisma.anesthesiaRecord.findUnique({
      where: { surgeryId: id },
    });

    if (!record) {
      throw new NotFoundError('Anesthesia record not found');
    }

    // Add complication entry
    const complications = Array.isArray(record.complications) ? [...record.complications] : [];
    complications.push(validated);

    const updated = await prisma.anesthesiaRecord.update({
      where: { surgeryId: id },
      data: { complications: complications as any },
    });

    logger.warn('Anesthesia complication recorded', {
      recordId: updated.id,
      surgeryId: id,
      complicationType: validated.type,
      userId: req.user?.userId
    });

    res.status(201).json({
      message: 'Complication recorded successfully',
      complications: updated.complications
    });
  })
);

/**
 * @swagger
 * /api/surgeries/{id}/complications:
 *   post:
 *     summary: Report surgery complication
 *     tags: [Surgery]
 *     security:
 *       - bearerAuth: []
 */
router.post('/surgeries/:id/complications',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    // Validate schema
    const validated = reportSurgeryComplicationSchema.parse({
      ...data,
      surgeryId: id,
      reportedBy: req.user?.userId,
    });

    // Check if surgery exists
    const surgery = await prisma.surgery.findUnique({ where: { id } });
    if (!surgery) {
      throw new NotFoundError('Surgery not found');
    }

    // Create complication record
    const complication = await prisma.surgeryComplication.create({
      data: {
        surgeryId: id,
        type: validated.type,
        description: validated.description,
        severity: validated.severity,
        managementDone: validated.managementDone,
        outcome: validated.outcome,
        reportedBy: validated.reportedBy,
      },
    });

    logger.warn('Surgery complication reported', {
      complicationId: complication.id,
      surgeryId: id,
      severity: complication.severity,
      userId: req.user?.userId
    });

    res.status(201).json({
      message: 'Complication reported successfully',
      complication
    });
  })
);

/**
 * @swagger
 * /api/surgeries/{id}/complications:
 *   get:
 *     summary: Get surgery complications
 *     tags: [Surgery]
 *     security:
 *       - bearerAuth: []
 */
router.get('/surgeries/:id/complications',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const complications = await prisma.surgeryComplication.findMany({
      where: { surgeryId: id },
      orderBy: { reportedAt: 'desc' },
    });

    res.json({
      complications,
      count: complications.length
    });
  })
);

/**
 * @swagger
 * /api/surgeries/{id}/implants:
 *   post:
 *     summary: Add implant used in surgery
 *     tags: [Surgery]
 *     security:
 *       - bearerAuth: []
 */
router.post('/surgeries/:id/implants',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    // Validate schema
    const validated = addSurgeryImplantSchema.parse({
      ...data,
      surgeryId: id,
    });

    // Check if surgery exists
    const surgery = await prisma.surgery.findUnique({ where: { id } });
    if (!surgery) {
      throw new NotFoundError('Surgery not found');
    }

    // Create implant record
    const implant = await prisma.surgeryImplant.create({
      data: {
        surgeryId: id,
        implantName: validated.implantName,
        manufacturer: validated.manufacturer,
        serialNumber: validated.serialNumber,
        batchNumber: validated.batchNumber,
        expiryDate: validated.expiryDate ? new Date(validated.expiryDate) : null,
        quantity: validated.quantity,
        cost: validated.cost,
      },
    });

    logger.info('Surgery implant recorded', {
      implantId: implant.id,
      surgeryId: id,
      implantName: implant.implantName,
      userId: req.user?.userId
    });

    res.status(201).json({
      message: 'Implant recorded successfully',
      implant
    });
  })
);

/**
 * @swagger
 * /api/surgeries/{id}/implants:
 *   get:
 *     summary: Get implants used in surgery
 *     tags: [Surgery]
 *     security:
 *       - bearerAuth: []
 */
router.get('/surgeries/:id/implants',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const implants = await prisma.surgeryImplant.findMany({
      where: { surgeryId: id },
      orderBy: { createdAt: 'desc' },
    });

    const totalCost = implants.reduce((sum, implant) => {
      return sum + Number(implant.cost);
    }, 0);

    res.json({
      implants,
      count: implants.length,
      totalCost
    });
  })
);

export default router;
