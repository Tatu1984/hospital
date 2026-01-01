/**
 * Radiology (PACS) Routes
 *
 * Handles radiology study management, image uploads, annotations, and reporting
 */

import { Router, Request, Response } from 'express';
import {
  authenticateToken,
  requirePermission,
  AuthenticatedRequest,
  asyncHandler,
  validateBody,
  validateQuery,
  validateParams,
} from '../middleware';
import { Permission } from '../rbac';
import {
  idParamSchema,
  createRadiologyStudySchema,
  updateStudyStatusSchema,
  createRadiologySeriesSchema,
  uploadRadiologyImageSchema,
  createImageAnnotationSchema,
  createRadiologyReportSchema,
  updateRadiologyReportSchema,
  createReportTemplateSchema,
  updateReportTemplateSchema,
  listStudiesQuerySchema,
  getReportTemplatesQuerySchema,
} from '../validators';
import { pacsService } from '../services/pacsService';
import { dicomUpload, getDICOMFilePath } from '../services/upload';
import path from 'path';
import fs from 'fs';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   POST /api/radiology/studies
 * @desc    Create a new radiology study
 * @access  Private - radiology:create
 */
router.post(
  '/studies',
  requirePermission('radiology:create'),
  validateBody(createRadiologyStudySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const study = await pacsService.createStudy(req.body);
    res.status(201).json({ success: true, data: study });
  })
);

/**
 * @route   GET /api/radiology/studies
 * @desc    List radiology studies with filters
 * @access  Private - radiology:view
 */
router.get(
  '/studies',
  requirePermission('radiology:view'),
  validateQuery(listStudiesQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { patientId, modality, status, dateFrom, dateTo, page, limit } = req.query;

    const result = await pacsService.listStudies({
      patientId: patientId as string,
      modality: modality as string,
      status: status as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({ success: true, data: result.studies, pagination: result.pagination });
  })
);

/**
 * @route   GET /api/radiology/studies/:id
 * @desc    Get study details
 * @access  Private - radiology:view
 */
router.get(
  '/studies/:id',
  requirePermission('radiology:view'),
  validateParams(idParamSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const study = await pacsService.getStudyDetails(req.params.id);
    res.json({ success: true, data: study });
  })
);

/**
 * @route   PUT /api/radiology/studies/:id/status
 * @desc    Update study status
 * @access  Private - radiology:edit
 */
router.put(
  '/studies/:id/status',
  requirePermission('radiology:edit'),
  validateParams(idParamSchema),
  validateBody(updateStudyStatusSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { status } = req.body;
    const study = await pacsService.updateStudyStatus(req.params.id, status);
    res.json({ success: true, data: study });
  })
);

/**
 * @route   POST /api/radiology/studies/:studyId/series
 * @desc    Add a series to a study
 * @access  Private - radiology:create
 */
router.post(
  '/studies/:studyId/series',
  requirePermission('radiology:create'),
  validateBody(createRadiologySeriesSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const series = await pacsService.createSeries({
      ...req.body,
      studyId: req.params.studyId,
    });
    res.status(201).json({ success: true, data: series });
  })
);

/**
 * @route   POST /api/radiology/series/:seriesId/images
 * @desc    Upload image to a series
 * @access  Private - radiology:upload
 */
router.post(
  '/series/:seriesId/images',
  requirePermission('radiology:upload'),
  dicomUpload.single('image'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    const {
      studyId,
      instanceNumber,
      imageType,
      sopInstanceUID,
      rows,
      columns,
      bitsAllocated,
      windowCenter,
      windowWidth,
    } = req.body;

    const image = await pacsService.uploadImage({
      studyId,
      seriesId: req.params.seriesId,
      instanceNumber: parseInt(instanceNumber),
      file: req.file,
      imageType,
      sopInstanceUID,
      rows: rows ? parseInt(rows) : undefined,
      columns: columns ? parseInt(columns) : undefined,
      bitsAllocated: bitsAllocated ? parseInt(bitsAllocated) : undefined,
      windowCenter: windowCenter ? parseFloat(windowCenter) : undefined,
      windowWidth: windowWidth ? parseFloat(windowWidth) : undefined,
    });

    res.status(201).json({ success: true, data: image });
  })
);

/**
 * @route   POST /api/radiology/studies/:studyId/upload
 * @desc    Upload image directly to a study (creates series if needed)
 * @access  Private - radiology:upload
 */
router.post(
  '/studies/:studyId/upload',
  requirePermission('radiology:upload'),
  dicomUpload.single('image'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    const {
      seriesNumber,
      instanceNumber,
      imageType,
      sopInstanceUID,
      rows,
      columns,
      bitsAllocated,
      windowCenter,
      windowWidth,
    } = req.body;

    const image = await pacsService.uploadImage({
      studyId: req.params.studyId,
      seriesNumber: seriesNumber ? parseInt(seriesNumber) : 1,
      instanceNumber: parseInt(instanceNumber),
      file: req.file,
      imageType,
      sopInstanceUID,
      rows: rows ? parseInt(rows) : undefined,
      columns: columns ? parseInt(columns) : undefined,
      bitsAllocated: bitsAllocated ? parseInt(bitsAllocated) : undefined,
      windowCenter: windowCenter ? parseFloat(windowCenter) : undefined,
      windowWidth: windowWidth ? parseFloat(windowWidth) : undefined,
    });

    res.status(201).json({ success: true, data: image });
  })
);

/**
 * @route   GET /api/radiology/studies/:id/images
 * @desc    Get all images for a study (for viewer)
 * @access  Private - radiology:view
 */
router.get(
  '/studies/:id/images',
  requirePermission('radiology:view'),
  validateParams(idParamSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const study = await pacsService.getStudyImages(req.params.id);
    res.json({ success: true, data: study });
  })
);

/**
 * @route   GET /api/radiology/images/:id/file
 * @desc    Serve image file
 * @access  Private - radiology:view
 */
router.get(
  '/images/:id/file',
  requirePermission('radiology:view'),
  validateParams(idParamSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { prisma } = await import('../lib/db');

    const image = await prisma.radiologyImage.findUnique({
      where: { id: req.params.id },
      include: {
        series: {
          include: {
            study: true,
          },
        },
      },
    });

    if (!image) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }

    const filePath = image.filePath;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Image file not found on disk' });
    }

    // Determine content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.dcm': 'application/dicom',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  })
);

/**
 * @route   POST /api/radiology/images/:id/annotations
 * @desc    Add annotation to an image
 * @access  Private - radiology:annotate
 */
router.post(
  '/images/:imageId/annotations',
  requirePermission('radiology:annotate'),
  validateBody(createImageAnnotationSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const annotation = await pacsService.addAnnotation({
      ...req.body,
      imageId: req.params.imageId,
      createdBy: req.user!.userId,
    });
    res.status(201).json({ success: true, data: annotation });
  })
);

/**
 * @route   GET /api/radiology/images/:id/annotations
 * @desc    Get annotations for an image
 * @access  Private - radiology:view
 */
router.get(
  '/images/:id/annotations',
  requirePermission('radiology:view'),
  validateParams(idParamSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const annotations = await pacsService.getImageAnnotations(req.params.id);
    res.json({ success: true, data: annotations });
  })
);

/**
 * @route   POST /api/radiology/studies/:studyId/report
 * @desc    Create a radiology report
 * @access  Private - radiology:report
 */
router.post(
  '/studies/:studyId/report',
  requirePermission('radiology:report'),
  validateBody(createRadiologyReportSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const report = await pacsService.createReport({
      ...req.body,
      studyId: req.params.studyId,
      reportedBy: req.user!.userId,
    });
    res.status(201).json({ success: true, data: report });
  })
);

/**
 * @route   PUT /api/radiology/reports/:id
 * @desc    Update a radiology report
 * @access  Private - radiology:report
 */
router.put(
  '/reports/:id',
  requirePermission('radiology:report'),
  validateParams(idParamSchema),
  validateBody(updateRadiologyReportSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const report = await pacsService.updateReport(req.params.id, req.body);
    res.json({ success: true, data: report });
  })
);

/**
 * @route   GET /api/radiology/report-templates
 * @desc    Get report templates
 * @access  Private - radiology:view
 */
router.get(
  '/report-templates',
  requirePermission('radiology:view'),
  validateQuery(getReportTemplatesQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { modality, bodyPart } = req.query;
    const templates = await pacsService.getReportTemplates(
      modality as string,
      bodyPart as string
    );
    res.json({ success: true, data: templates });
  })
);

/**
 * @route   POST /api/radiology/report-templates
 * @desc    Create a report template
 * @access  Private - radiology:manage
 */
router.post(
  '/report-templates',
  requirePermission('radiology:manage'),
  validateBody(createReportTemplateSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const template = await pacsService.createReportTemplate({
      ...req.body,
      createdBy: req.user!.userId,
    });
    res.status(201).json({ success: true, data: template });
  })
);

/**
 * @route   PUT /api/radiology/report-templates/:id
 * @desc    Update a report template
 * @access  Private - radiology:manage
 */
router.put(
  '/report-templates/:id',
  requirePermission('radiology:manage'),
  validateParams(idParamSchema),
  validateBody(updateReportTemplateSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { prisma } = await import('../lib/db');

    const template = await prisma.radiologyReportTemplate.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json({ success: true, data: template });
  })
);

/**
 * @route   DELETE /api/radiology/report-templates/:id
 * @desc    Delete/deactivate a report template
 * @access  Private - radiology:manage
 */
router.delete(
  '/report-templates/:id',
  requirePermission('radiology:manage'),
  validateParams(idParamSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { prisma } = await import('../lib/db');

    // Soft delete by deactivating
    const template = await prisma.radiologyReportTemplate.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ success: true, data: template, message: 'Template deactivated successfully' });
  })
);

/**
 * @route   GET /api/radiology/modalities
 * @desc    Get list of available modalities
 * @access  Private - radiology:view
 */
router.get(
  '/modalities',
  requirePermission('radiology:view'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: pacsService.MODALITIES });
  })
);

export default router;
