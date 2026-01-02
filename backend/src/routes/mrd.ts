import { Router, Response } from 'express';
import { prisma } from '../lib/db';
import { AuthenticatedRequest, asyncHandler, ValidationError, NotFoundError } from '../middleware';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();

// ============================================
// Validation Schemas
// ============================================

const medicalRecordSchema = z.object({
  patientId: z.string().min(1),
  encounterId: z.string().optional(),
  admissionId: z.string().optional(),
  recordType: z.string().min(1),
  recordCategory: z.string().min(1),
  documentId: z.string().optional(),
  documentUrl: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  icdCodes: z.array(z.string()).optional(),
  cptCodes: z.array(z.string()).optional(),
  isConfidential: z.boolean().optional(),
  retentionYears: z.number().min(1).max(100).optional(),
});

const codingSchema = z.object({
  codeType: z.enum(['icd10', 'icd9', 'cpt', 'hcpcs', 'drg']),
  code: z.string().min(1),
  description: z.string().min(1),
  isPrimary: z.boolean().optional(),
  notes: z.string().optional(),
});

const releaseRequestSchema = z.object({
  patientId: z.string().min(1),
  requestedByType: z.enum(['patient', 'family', 'legal', 'insurance', 'employer', 'other']),
  relationship: z.string().optional(),
  purpose: z.enum(['treatment', 'legal', 'insurance', 'employment', 'research', 'personal']),
  recordTypes: z.array(z.string()),
  dateRange: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }).optional(),
  deliveryMethod: z.enum(['email', 'mail', 'pickup', 'portal']),
  deliveryAddress: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

// ============================================
// Helper: Log Access
// ============================================

async function logAccess(
  recordId: string,
  userId: string,
  userName: string,
  accessType: string,
  accessReason?: string,
  req?: AuthenticatedRequest
) {
  await prisma.mRDAccessLog.create({
    data: {
      medicalRecordId: recordId,
      userId,
      userName,
      accessType,
      accessReason,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
    },
  });
}

// ============================================
// Medical Record Endpoints
// ============================================

// Get all medical records with filters
router.get('/records', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { patientId, recordType, recordCategory, status, search, page = '1', limit = '50' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where: any = {
    tenantId: req.user!.tenantId,
    branchId: req.user!.branchId,
  };

  if (patientId) where.patientId = patientId;
  if (recordType) where.recordType = recordType;
  if (recordCategory) where.recordCategory = recordCategory;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { title: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const [records, total] = await Promise.all([
    prisma.medicalRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.medicalRecord.count({ where }),
  ]);

  res.json({
    data: records,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  });
}));

// Get single medical record
router.get('/records/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const record = await prisma.medicalRecord.findFirst({
    where: {
      id: req.params.id,
      tenantId: req.user!.tenantId,
    },
    include: {
      codingRecords: true,
      accessLogs: {
        take: 10,
        orderBy: { accessedAt: 'desc' },
      },
    },
  });

  if (!record) {
    throw new NotFoundError('Medical record not found');
  }

  // Log access
  await logAccess(record.id, req.user!.userId, req.user!.username, 'view', 'Record access', req);

  res.json(record);
}));

// Get records by patient
router.get('/patient/:patientId/records', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { recordType, category } = req.query;

  const where: any = {
    tenantId: req.user!.tenantId,
    patientId: req.params.patientId,
    status: { not: 'deleted' },
  };

  if (recordType) where.recordType = recordType;
  if (category) where.recordCategory = category;

  const records = await prisma.medicalRecord.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  res.json(records);
}));

// Create medical record
router.post('/records', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = medicalRecordSchema.parse(req.body);

  const record = await prisma.medicalRecord.create({
    data: {
      ...data,
      tenantId: req.user!.tenantId,
      branchId: req.user!.branchId || '',
      createdBy: req.user!.userId,
      createdByName: req.user!.username,
      icdCodes: data.icdCodes || [],
      cptCodes: data.cptCodes || [],
    },
  });

  logger.info('Medical record created', { recordId: record.id, patientId: data.patientId });
  res.status(201).json(record);
}));

// Update medical record
router.put('/records/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = medicalRecordSchema.partial().parse(req.body);

  const record = await prisma.medicalRecord.update({
    where: { id: req.params.id },
    data,
  });

  await logAccess(record.id, req.user!.userId, req.user!.username, 'edit', 'Record updated', req);

  logger.info('Medical record updated', { recordId: record.id });
  res.json(record);
}));

// Archive medical record
router.put('/records/:id/archive', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const record = await prisma.medicalRecord.update({
    where: { id: req.params.id },
    data: {
      status: 'archived',
      archivedAt: new Date(),
      archivedBy: req.user!.userId,
    },
  });

  await logAccess(record.id, req.user!.userId, req.user!.username, 'archive', 'Record archived', req);

  logger.info('Medical record archived', { recordId: record.id });
  res.json(record);
}));

// Review medical record
router.put('/records/:id/review', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { notes } = req.body;

  const record = await prisma.medicalRecord.update({
    where: { id: req.params.id },
    data: {
      reviewedBy: req.user!.userId,
      reviewedByName: req.user!.username,
      reviewedAt: new Date(),
    },
  });

  await logAccess(record.id, req.user!.userId, req.user!.username, 'review', notes, req);

  logger.info('Medical record reviewed', { recordId: record.id });
  res.json(record);
}));

// Delete medical record (soft delete)
router.delete('/records/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await prisma.medicalRecord.update({
    where: { id: req.params.id },
    data: {
      status: 'deleted',
      deletedAt: new Date(),
      deletedBy: req.user!.userId,
    },
  });

  logger.info('Medical record deleted', { recordId: req.params.id });
  res.json({ success: true, message: 'Record deleted' });
}));

// ============================================
// Coding Endpoints
// ============================================

// Add coding to record
router.post('/records/:id/coding', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = codingSchema.parse(req.body);

  // Verify record exists
  const record = await prisma.medicalRecord.findFirst({
    where: { id: req.params.id, tenantId: req.user!.tenantId },
  });

  if (!record) {
    throw new NotFoundError('Medical record not found');
  }

  const coding = await prisma.mRDCoding.create({
    data: {
      medicalRecordId: req.params.id,
      ...data,
      codedBy: req.user!.userId,
      codedByName: req.user!.username,
    },
  });

  // Update record's icdCodes if it's ICD
  if (data.codeType === 'icd10' || data.codeType === 'icd9') {
    await prisma.medicalRecord.update({
      where: { id: req.params.id },
      data: {
        icdCodes: { push: data.code },
      },
    });
  } else if (data.codeType === 'cpt') {
    await prisma.medicalRecord.update({
      where: { id: req.params.id },
      data: {
        cptCodes: { push: data.code },
      },
    });
  }

  logger.info('Coding added', { recordId: req.params.id, code: data.code });
  res.status(201).json(coding);
}));

// Verify coding
router.put('/coding/:id/verify', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const coding = await prisma.mRDCoding.update({
    where: { id: req.params.id },
    data: {
      verifiedBy: req.user!.userId,
      verifiedAt: new Date(),
    },
  });

  logger.info('Coding verified', { codingId: coding.id });
  res.json(coding);
}));

// Delete coding
router.delete('/coding/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await prisma.mRDCoding.delete({
    where: { id: req.params.id },
  });

  res.json({ success: true, message: 'Coding deleted' });
}));

// ============================================
// ICD-10 Code Search
// ============================================

// Search ICD-10 codes
router.get('/icd10/search', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { q, category, limit = '20' } = req.query;

  if (!q || (q as string).length < 2) {
    return res.json([]);
  }

  const where: any = {
    isActive: true,
    OR: [
      { code: { contains: q as string, mode: 'insensitive' } },
      { shortDescription: { contains: q as string, mode: 'insensitive' } },
    ],
  };

  if (category) {
    where.category = category;
  }

  const codes = await prisma.iCD10Code.findMany({
    where,
    take: parseInt(limit as string),
    orderBy: { code: 'asc' },
  });

  res.json(codes);
}));

// Get ICD-10 categories
router.get('/icd10/categories', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const categories = await prisma.iCD10Code.findMany({
    select: { category: true },
    distinct: ['category'],
    where: { isActive: true },
    orderBy: { category: 'asc' },
  });

  res.json(categories.map(c => c.category));
}));

// ============================================
// Release Request Endpoints
// ============================================

// Get all release requests
router.get('/release-requests', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status, patientId, page = '1', limit = '50' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where: any = {
    tenantId: req.user!.tenantId,
    branchId: req.user!.branchId,
  };

  if (status) where.status = status;
  if (patientId) where.patientId = patientId;

  const [requests, total] = await Promise.all([
    prisma.mRDReleaseRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.mRDReleaseRequest.count({ where }),
  ]);

  res.json({
    data: requests,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  });
}));

// Get single release request
router.get('/release-requests/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const request = await prisma.mRDReleaseRequest.findFirst({
    where: {
      id: req.params.id,
      tenantId: req.user!.tenantId,
    },
  });

  if (!request) {
    throw new NotFoundError('Release request not found');
  }

  res.json(request);
}));

// Create release request
router.post('/release-requests', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = releaseRequestSchema.parse(req.body);

  const request = await prisma.mRDReleaseRequest.create({
    data: {
      ...data,
      tenantId: req.user!.tenantId,
      branchId: req.user!.branchId || '',
      requestedBy: req.user!.userId,
      requestedByName: req.user!.username,
    },
  });

  logger.info('Release request created', { requestId: request.id, patientId: data.patientId });
  res.status(201).json(request);
}));

// Approve/Deny release request
router.put('/release-requests/:id/review', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status, denialReason, notes } = req.body;

  if (!['approved', 'partially_approved', 'denied'].includes(status)) {
    throw new ValidationError('Invalid status');
  }

  if (status === 'denied' && !denialReason) {
    throw new ValidationError('Denial reason is required');
  }

  const request = await prisma.mRDReleaseRequest.update({
    where: { id: req.params.id },
    data: {
      status,
      denialReason: status === 'denied' ? denialReason : null,
      reviewedBy: req.user!.userId,
      reviewedByName: req.user!.username,
      reviewedAt: new Date(),
      notes,
    },
  });

  logger.info('Release request reviewed', { requestId: request.id, status });
  res.json(request);
}));

// Complete release request
router.put('/release-requests/:id/complete', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { notes } = req.body;

  const request = await prisma.mRDReleaseRequest.update({
    where: { id: req.params.id },
    data: {
      status: 'completed',
      completedBy: req.user!.userId,
      completedAt: new Date(),
      notes,
    },
  });

  logger.info('Release request completed', { requestId: request.id });
  res.json(request);
}));

// ============================================
// Archive Endpoints
// ============================================

// Create archive batch
router.post('/archives', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { recordIds, archiveLocation, retentionYears, notes } = req.body;

  if (!recordIds || recordIds.length === 0) {
    throw new ValidationError('Record IDs are required');
  }

  // Generate batch ID
  const batchId = `ARC${Date.now().toString(36).toUpperCase()}`;

  // Calculate retention date
  const retentionUntil = new Date();
  retentionUntil.setFullYear(retentionUntil.getFullYear() + (retentionYears || 7));

  // Create archive record
  const archive = await prisma.mRDArchive.create({
    data: {
      tenantId: req.user!.tenantId,
      branchId: req.user!.branchId || '',
      archiveBatchId: batchId,
      totalRecords: recordIds.length,
      archivedBy: req.user!.userId,
      archivedByName: req.user!.username,
      archiveLocation,
      retentionUntil,
      notes,
    },
  });

  // Update records to archived status
  await prisma.medicalRecord.updateMany({
    where: { id: { in: recordIds } },
    data: {
      status: 'archived',
      archivedAt: new Date(),
      archivedBy: req.user!.userId,
    },
  });

  logger.info('Archive batch created', { batchId, recordCount: recordIds.length });
  res.status(201).json(archive);
}));

// Get archives
router.get('/archives', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status, page = '1', limit = '50' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where: any = {
    tenantId: req.user!.tenantId,
    branchId: req.user!.branchId,
  };

  if (status) where.status = status;

  const [archives, total] = await Promise.all([
    prisma.mRDArchive.findMany({
      where,
      orderBy: { archivedAt: 'desc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.mRDArchive.count({ where }),
  ]);

  res.json({
    data: archives,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  });
}));

// ============================================
// Access Logs
// ============================================

// Get access logs for a record
router.get('/records/:id/access-logs', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', limit = '50' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const [logs, total] = await Promise.all([
    prisma.mRDAccessLog.findMany({
      where: { medicalRecordId: req.params.id },
      orderBy: { accessedAt: 'desc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.mRDAccessLog.count({ where: { medicalRecordId: req.params.id } }),
  ]);

  res.json({
    data: logs,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  });
}));

// ============================================
// Dashboard & Reports
// ============================================

// Get MRD dashboard stats
router.get('/dashboard', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalRecords,
    recordsByType,
    recordsByCategory,
    pendingRequests,
    completedRequestsToday,
    recordsCreatedToday,
    archivedRecords,
  ] = await Promise.all([
    prisma.medicalRecord.count({
      where: {
        tenantId: req.user!.tenantId,
        status: 'active',
      },
    }),
    prisma.medicalRecord.groupBy({
      by: ['recordType'],
      where: {
        tenantId: req.user!.tenantId,
        status: 'active',
      },
      _count: true,
    }),
    prisma.medicalRecord.groupBy({
      by: ['recordCategory'],
      where: {
        tenantId: req.user!.tenantId,
        status: 'active',
      },
      _count: true,
    }),
    prisma.mRDReleaseRequest.count({
      where: {
        tenantId: req.user!.tenantId,
        status: 'pending',
      },
    }),
    prisma.mRDReleaseRequest.count({
      where: {
        tenantId: req.user!.tenantId,
        completedAt: { gte: today },
      },
    }),
    prisma.medicalRecord.count({
      where: {
        tenantId: req.user!.tenantId,
        createdAt: { gte: today },
      },
    }),
    prisma.medicalRecord.count({
      where: {
        tenantId: req.user!.tenantId,
        status: 'archived',
      },
    }),
  ]);

  res.json({
    totalRecords,
    recordsByType: recordsByType.reduce((acc, item) => {
      acc[item.recordType] = item._count;
      return acc;
    }, {} as Record<string, number>),
    recordsByCategory: recordsByCategory.reduce((acc, item) => {
      acc[item.recordCategory] = item._count;
      return acc;
    }, {} as Record<string, number>),
    pendingRequests,
    completedRequestsToday,
    recordsCreatedToday,
    archivedRecords,
  });
}));

// Get pending coding records
router.get('/reports/pending-coding', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const records = await prisma.medicalRecord.findMany({
    where: {
      tenantId: req.user!.tenantId,
      status: 'active',
      icdCodes: { isEmpty: true },
      recordCategory: 'clinical',
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  res.json(records);
}));

// Get records due for retention review
router.get('/reports/retention-review', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  const archives = await prisma.mRDArchive.findMany({
    where: {
      tenantId: req.user!.tenantId,
      status: 'active',
      retentionUntil: { lte: oneYearFromNow },
    },
    orderBy: { retentionUntil: 'asc' },
  });

  res.json(archives);
}));

export default router;
