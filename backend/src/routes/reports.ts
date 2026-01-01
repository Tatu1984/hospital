/**
 * Reports Routes
 *
 * API endpoints for customizable report builder system
 */

import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware';
import { logger } from '../utils/logger';
import {
  executeReport,
  scheduleReport,
  cleanupExpiredReports,
  getSystemReportTemplates
} from '../services/reportBuilder';
import { z } from 'zod';
import { createReadStream, existsSync } from 'fs';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.enum(['clinical', 'financial', 'operational', 'hr']),
  dataSource: z.string().min(1, 'Data source is required'),
  columns: z.array(z.object({
    field: z.string(),
    label: z.string(),
    type: z.enum(['string', 'number', 'date', 'boolean']),
    aggregate: z.enum(['sum', 'avg', 'count', 'min', 'max']).optional()
  })),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'between']),
    defaultValue: z.any().optional()
  })),
  groupBy: z.array(z.string()).optional(),
  sortBy: z.array(z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc'])
  })).optional(),
  chartType: z.enum(['bar', 'line', 'pie', 'table']).optional()
});

const generateReportSchema = z.object({
  templateId: z.string().uuid(),
  filters: z.record(z.any()).optional(),
  format: z.enum(['excel', 'pdf', 'csv', 'json']).optional().default('excel')
});

const createScheduleSchema = z.object({
  templateId: z.string().uuid(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  recipients: z.array(z.string().email()),
  format: z.enum(['excel', 'pdf', 'csv']).optional().default('excel'),
  filters: z.record(z.any()).optional()
});

/**
 * GET /api/reports/templates
 * List all report templates
 */
router.get('/templates', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { category, search } = req.query;

    const where: any = { tenantId, isActive: true };

    if (category) {
      where.category = category as string;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const templates = await prisma.reportTemplate.findMany({
      where,
      orderBy: [
        { isSystem: 'desc' },
        { name: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        dataSource: true,
        chartType: true,
        isSystem: true,
        createdAt: true,
        createdBy: true
      }
    });

    res.json({
      templates,
      total: templates.length
    });
  } catch (error) {
    logger.error('List templates error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/templates/:id
 * Get template details
 */
router.get('/templates/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user!;

    const template = await prisma.reportTemplate.findFirst({
      where: { id, tenantId, isActive: true }
    });

    if (!template) {
      return res.status(404).json({ error: 'Report template not found' });
    }

    res.json(template);
  } catch (error) {
    logger.error('Get template error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/reports/templates
 * Create custom report template
 */
router.post('/templates', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = createTemplateSchema.parse(req.body);
    const { tenantId, userId } = req.user!;

    // Check for duplicate name
    const existing = await prisma.reportTemplate.findFirst({
      where: {
        tenantId,
        name: validatedData.name,
        isActive: true
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'A template with this name already exists' });
    }

    const template = await prisma.reportTemplate.create({
      data: {
        ...validatedData,
        tenantId,
        createdBy: userId,
        isSystem: false
      }
    });

    res.status(201).json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Create template error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/reports/templates/:id
 * Update report template
 */
router.put('/templates/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user!;
    const validatedData = createTemplateSchema.parse(req.body);

    // Check if template exists and is not a system template
    const existing = await prisma.reportTemplate.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (existing.isSystem) {
      return res.status(403).json({ error: 'System templates cannot be modified' });
    }

    const template = await prisma.reportTemplate.update({
      where: { id },
      data: validatedData
    });

    res.json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Update template error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/reports/templates/:id
 * Deactivate report template (soft delete)
 */
router.delete('/templates/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user!;

    const existing = await prisma.reportTemplate.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (existing.isSystem) {
      return res.status(403).json({ error: 'System templates cannot be deleted' });
    }

    await prisma.reportTemplate.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ message: 'Template deactivated successfully' });
  } catch (error) {
    logger.error('Delete template error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/reports/generate
 * Generate a report
 */
router.post('/generate', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = generateReportSchema.parse(req.body);
    const { tenantId, userId } = req.user!;

    // Verify template exists
    const template = await prisma.reportTemplate.findFirst({
      where: {
        id: validatedData.templateId,
        tenantId,
        isActive: true
      }
    });

    if (!template) {
      return res.status(404).json({ error: 'Report template not found' });
    }

    // Generate report
    const result = await executeReport({
      templateId: validatedData.templateId,
      filters: validatedData.filters || {},
      format: validatedData.format || 'excel',
      tenantId,
      generatedBy: userId
    });

    res.json({
      reportId: result.reportId,
      rowCount: result.rowCount,
      filePath: result.filePath,
      data: result.data,
      generatedAt: result.generatedAt,
      downloadUrl: result.filePath ? `/api/reports/generated/${result.reportId}/download` : null
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Generate report error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to generate report', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/reports/generated
 * List generated reports
 */
router.get('/generated', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { templateId, limit = '20', offset = '0' } = req.query;

    const where: any = { tenantId };

    if (templateId) {
      where.templateId = templateId as string;
    }

    const [reports, total] = await Promise.all([
      prisma.generatedReport.findMany({
        where,
        orderBy: { generatedAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        select: {
          id: true,
          templateId: true,
          name: true,
          format: true,
          rowCount: true,
          generatedBy: true,
          generatedAt: true,
          expiresAt: true
        }
      }),
      prisma.generatedReport.count({ where })
    ]);

    res.json({
      reports,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    logger.error('List generated reports error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/generated/:id/download
 * Download generated report
 */
router.get('/generated/:id/download', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user!;

    const report = await prisma.generatedReport.findFirst({
      where: { id, tenantId }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (!report.filePath) {
      return res.status(404).json({ error: 'Report file not available' });
    }

    if (!existsSync(report.filePath)) {
      return res.status(404).json({ error: 'Report file not found on disk' });
    }

    // Set appropriate headers based on format
    const contentTypes: Record<string, string> = {
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf: 'application/pdf',
      csv: 'text/csv'
    };

    const extensions: Record<string, string> = {
      excel: 'xlsx',
      pdf: 'pdf',
      csv: 'csv'
    };

    const fileName = `${report.name.replace(/[^a-z0-9]/gi, '_')}.${extensions[report.format] || 'dat'}`;

    res.setHeader('Content-Type', contentTypes[report.format] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const fileStream = createReadStream(report.filePath);
    fileStream.pipe(res);
  } catch (error) {
    logger.error('Download report error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/reports/schedule
 * Create report schedule
 */
router.post('/schedule', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = createScheduleSchema.parse(req.body);
    const { tenantId } = req.user!;

    // Verify template exists
    const template = await prisma.reportTemplate.findFirst({
      where: {
        id: validatedData.templateId,
        tenantId,
        isActive: true
      }
    });

    if (!template) {
      return res.status(404).json({ error: 'Report template not found' });
    }

    // Calculate next run time
    const nextRunAt = calculateNextRunTime(
      validatedData.frequency,
      validatedData.dayOfWeek,
      validatedData.dayOfMonth,
      validatedData.time
    );

    const schedule = await prisma.reportSchedule.create({
      data: {
        ...validatedData,
        nextRunAt
      }
    });

    res.status(201).json(schedule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Create schedule error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/schedules
 * List report schedules
 */
router.get('/schedules', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { templateId, isActive } = req.query;

    const where: any = {};

    if (templateId) {
      where.templateId = templateId as string;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const schedules = await prisma.reportSchedule.findMany({
      where,
      include: {
        template: {
          select: {
            id: true,
            name: true,
            category: true,
            tenantId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Filter out schedules where template doesn't belong to tenant
    const filteredSchedules = schedules.filter(s => s.template?.tenantId === tenantId);

    res.json({ schedules: filteredSchedules });
  } catch (error) {
    logger.error('List schedules error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/reports/schedules/:id
 * Update report schedule
 */
router.put('/schedules/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = createScheduleSchema.parse(req.body);

    const existing = await prisma.reportSchedule.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const nextRunAt = calculateNextRunTime(
      validatedData.frequency,
      validatedData.dayOfWeek,
      validatedData.dayOfMonth,
      validatedData.time
    );

    const schedule = await prisma.reportSchedule.update({
      where: { id },
      data: {
        ...validatedData,
        nextRunAt
      }
    });

    res.json(schedule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Update schedule error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/reports/schedules/:id
 * Delete report schedule
 */
router.delete('/schedules/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.reportSchedule.delete({
      where: { id }
    });

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    logger.error('Delete schedule error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/reports/system/seed
 * Seed system report templates (admin only)
 */
router.post('/system/seed', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = req.user!;

    const systemTemplates = getSystemReportTemplates(tenantId, userId);

    const created = [];
    for (const template of systemTemplates) {
      const existing = await prisma.reportTemplate.findFirst({
        where: {
          tenantId,
          name: template.name,
          isSystem: true
        }
      });

      if (!existing) {
        const newTemplate = await prisma.reportTemplate.create({
          data: template as any
        });
        created.push(newTemplate);
      }
    }

    res.json({
      message: 'System templates seeded successfully',
      created: created.length,
      total: systemTemplates.length
    });
  } catch (error) {
    logger.error('Seed templates error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/reports/cleanup
 * Clean up expired reports (admin only)
 */
router.post('/cleanup', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deletedCount = await cleanupExpiredReports();

    res.json({
      message: 'Cleanup completed successfully',
      deletedReports: deletedCount
    });
  } catch (error) {
    logger.error('Cleanup error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function
function calculateNextRunTime(
  frequency: string,
  dayOfWeek: number | null | undefined,
  dayOfMonth: number | null | undefined,
  time: string
): Date {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const next = new Date(now);

  switch (frequency) {
    case 'daily':
      next.setHours(hours, minutes, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      break;

    case 'weekly':
      next.setHours(hours, minutes, 0, 0);
      const currentDay = next.getDay();
      const targetDay = dayOfWeek || 0;
      const daysUntilNext = (targetDay - currentDay + 7) % 7 || 7;
      next.setDate(next.getDate() + daysUntilNext);
      break;

    case 'monthly':
      next.setHours(hours, minutes, 0, 0);
      next.setDate(dayOfMonth || 1);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      break;

    default:
      next.setHours(hours, minutes, 0, 0);
  }

  return next;
}

export default router;
