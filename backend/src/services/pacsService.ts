/**
 * PACS (Picture Archiving and Communication System) Service
 *
 * Handles radiology study management, image storage, and reporting
 */

import { prisma } from '../lib/db';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

// DICOM modalities
export const MODALITIES = {
  CR: 'Computed Radiography',
  CT: 'Computed Tomography',
  MR: 'Magnetic Resonance',
  US: 'Ultrasound',
  XR: 'X-Ray',
  DX: 'Digital X-Ray',
  MG: 'Mammography',
  PT: 'Positron Emission Tomography',
  NM: 'Nuclear Medicine',
  RF: 'Fluoroscopy',
  OT: 'Other',
};

// Study statuses
export const STUDY_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  REPORTED: 'reported',
};

// Report statuses
export const REPORT_STATUS = {
  DRAFT: 'draft',
  PRELIMINARY: 'preliminary',
  FINAL: 'final',
};

// Image types
export const IMAGE_TYPES = {
  ORIGINAL: 'ORIGINAL',
  DERIVED: 'DERIVED',
};

// Annotation types
export const ANNOTATION_TYPES = {
  TEXT: 'text',
  ARROW: 'arrow',
  CIRCLE: 'circle',
  MEASUREMENT: 'measurement',
  ROI: 'roi',
};

interface CreateStudyParams {
  orderId: string;
  patientId: string;
  modality: string;
  studyDescription?: string;
  referringPhysician?: string;
  performingTechnician?: string;
  studyDate?: Date;
}

interface UploadImageParams {
  studyId: string;
  seriesId?: string;
  seriesNumber?: number;
  instanceNumber: number;
  file: Express.Multer.File;
  imageType?: string;
  sopInstanceUID?: string;
  rows?: number;
  columns?: number;
  bitsAllocated?: number;
  windowCenter?: number;
  windowWidth?: number;
}

interface CreateSeriesParams {
  studyId: string;
  seriesNumber: number;
  modality: string;
  seriesDescription?: string;
  bodyPart?: string;
  seriesInstanceUID?: string;
}

interface AddAnnotationParams {
  imageId: string;
  type: string;
  coordinates: object;
  label?: string;
  color?: string;
  createdBy: string;
}

interface CreateReportParams {
  studyId: string;
  findings: string;
  impression: string;
  recommendations?: string;
  reportedBy: string;
  reportType?: string;
  templateUsed?: string;
}

/**
 * Generate unique accession number
 */
export function generateAccessionNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();

  return `ACC${year}${month}${day}${random}`;
}

/**
 * Generate Study Instance UID (DICOM standard)
 */
export function generateStudyInstanceUID(): string {
  // Using a simplified UID format (in production, use proper DICOM UID)
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `1.2.840.${timestamp}.${random}`;
}

/**
 * Generate Series Instance UID
 */
export function generateSeriesInstanceUID(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `1.2.840.${timestamp}.${random}`;
}

/**
 * Generate SOP Instance UID (for individual images)
 */
export function generateSOPInstanceUID(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `1.2.840.${timestamp}.${random}`;
}

/**
 * Create a new radiology study
 */
export async function createStudy(params: CreateStudyParams) {
  try {
    const {
      orderId,
      patientId,
      modality,
      studyDescription,
      referringPhysician,
      performingTechnician,
      studyDate = new Date(),
    } = params;

    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { patient: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Generate accession number and study UID
    const accessionNumber = generateAccessionNumber();
    const studyInstanceUID = generateStudyInstanceUID();

    const study = await prisma.radiologyStudy.create({
      data: {
        orderId,
        patientId,
        accessionNumber,
        studyInstanceUID,
        modality,
        studyDescription,
        referringPhysician,
        performingTechnician,
        studyDate,
        status: STUDY_STATUS.SCHEDULED,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            mrn: true,
            dob: true,
            gender: true,
          },
        },
        order: {
          select: {
            id: true,
            orderType: true,
            orderedBy: true,
          },
        },
      },
    });

    logger.info('RADIOLOGY_STUDY_CREATED', {
      studyId: study.id,
      accessionNumber: study.accessionNumber,
      patientId: study.patientId,
      modality: study.modality,
    });

    return study;
  } catch (error) {
    logger.error('CREATE_STUDY_ERROR', { error, params });
    throw error;
  }
}

/**
 * Create a new series in a study
 */
export async function createSeries(params: CreateSeriesParams) {
  try {
    const {
      studyId,
      seriesNumber,
      modality,
      seriesDescription,
      bodyPart,
      seriesInstanceUID = generateSeriesInstanceUID(),
    } = params;

    // Verify study exists
    const study = await prisma.radiologyStudy.findUnique({
      where: { id: studyId },
    });

    if (!study) {
      throw new Error('Study not found');
    }

    const series = await prisma.radiologySeries.create({
      data: {
        studyId,
        seriesNumber,
        modality,
        seriesDescription,
        bodyPart,
        seriesInstanceUID,
      },
    });

    // Update study series count
    await prisma.radiologyStudy.update({
      where: { id: studyId },
      data: {
        numberOfSeries: {
          increment: 1,
        },
      },
    });

    logger.info('RADIOLOGY_SERIES_CREATED', {
      seriesId: series.id,
      studyId,
      seriesNumber,
    });

    return series;
  } catch (error) {
    logger.error('CREATE_SERIES_ERROR', { error, params });
    throw error;
  }
}

/**
 * Upload an image to a series
 */
export async function uploadImage(params: UploadImageParams) {
  try {
    const {
      studyId,
      seriesId,
      seriesNumber = 1,
      instanceNumber,
      file,
      imageType = IMAGE_TYPES.ORIGINAL,
      sopInstanceUID = generateSOPInstanceUID(),
      rows,
      columns,
      bitsAllocated,
      windowCenter,
      windowWidth,
    } = params;

    // Verify study exists
    const study = await prisma.radiologyStudy.findUnique({
      where: { id: studyId },
    });

    if (!study) {
      throw new Error('Study not found');
    }

    // If seriesId not provided, create or find series
    let series;
    if (seriesId) {
      series = await prisma.radiologySeries.findUnique({
        where: { id: seriesId },
      });
      if (!series) {
        throw new Error('Series not found');
      }
    } else {
      // Try to find existing series with this number
      const existingSeries = await prisma.radiologySeries.findFirst({
        where: {
          studyId,
          seriesNumber,
        },
      });

      if (existingSeries) {
        series = existingSeries;
      } else {
        // Create new series
        series = await createSeries({
          studyId,
          seriesNumber,
          modality: study.modality,
        });
      }
    }

    // Store file (already handled by multer middleware)
    const filePath = file.path;
    const fileSize = file.size;

    // Create image record
    const image = await prisma.radiologyImage.create({
      data: {
        seriesId: series.id,
        sopInstanceUID,
        instanceNumber,
        imageType,
        filePath,
        fileSize,
        rows,
        columns,
        bitsAllocated,
        windowCenter,
        windowWidth,
      },
    });

    // Update series and study image counts
    await prisma.$transaction([
      prisma.radiologySeries.update({
        where: { id: series.id },
        data: {
          numberOfImages: {
            increment: 1,
          },
        },
      }),
      prisma.radiologyStudy.update({
        where: { id: studyId },
        data: {
          numberOfImages: {
            increment: 1,
          },
          storageSize: {
            increment: fileSize,
          },
        },
      }),
    ]);

    logger.info('RADIOLOGY_IMAGE_UPLOADED', {
      imageId: image.id,
      studyId,
      seriesId: series.id,
      fileSize,
    });

    return image;
  } catch (error) {
    logger.error('UPLOAD_IMAGE_ERROR', { error, params: { studyId: params.studyId } });
    throw error;
  }
}

/**
 * Get all images for a study (for viewer)
 */
export async function getStudyImages(studyId: string) {
  try {
    const study = await prisma.radiologyStudy.findUnique({
      where: { id: studyId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            mrn: true,
            dob: true,
            gender: true,
          },
        },
        series: {
          include: {
            images: {
              orderBy: {
                instanceNumber: 'asc',
              },
              include: {
                annotations: true,
              },
            },
          },
          orderBy: {
            seriesNumber: 'asc',
          },
        },
        reports: {
          orderBy: {
            reportedAt: 'desc',
          },
        },
      },
    });

    if (!study) {
      throw new Error('Study not found');
    }

    logger.info('STUDY_IMAGES_RETRIEVED', {
      studyId,
      numberOfSeries: study.series.length,
      numberOfImages: study.numberOfImages,
    });

    return study;
  } catch (error) {
    logger.error('GET_STUDY_IMAGES_ERROR', { error, studyId });
    throw error;
  }
}

/**
 * Add annotation to an image
 */
export async function addAnnotation(params: AddAnnotationParams) {
  try {
    const { imageId, type, coordinates, label, color, createdBy } = params;

    // Verify image exists
    const image = await prisma.radiologyImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      throw new Error('Image not found');
    }

    const annotation = await prisma.imageAnnotation.create({
      data: {
        imageId,
        type,
        coordinates,
        label,
        color,
        createdBy,
      },
    });

    logger.info('IMAGE_ANNOTATION_ADDED', {
      annotationId: annotation.id,
      imageId,
      type,
    });

    return annotation;
  } catch (error) {
    logger.error('ADD_ANNOTATION_ERROR', { error, params });
    throw error;
  }
}

/**
 * Get annotations for an image
 */
export async function getImageAnnotations(imageId: string) {
  try {
    const annotations = await prisma.imageAnnotation.findMany({
      where: { imageId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return annotations;
  } catch (error) {
    logger.error('GET_IMAGE_ANNOTATIONS_ERROR', { error, imageId });
    throw error;
  }
}

/**
 * Update study status
 */
export async function updateStudyStatus(studyId: string, status: string) {
  try {
    const study = await prisma.radiologyStudy.update({
      where: { id: studyId },
      data: { status },
    });

    logger.info('STUDY_STATUS_UPDATED', {
      studyId,
      status,
    });

    return study;
  } catch (error) {
    logger.error('UPDATE_STUDY_STATUS_ERROR', { error, studyId, status });
    throw error;
  }
}

/**
 * Create radiology report
 */
export async function createReport(params: CreateReportParams) {
  try {
    const {
      studyId,
      findings,
      impression,
      recommendations,
      reportedBy,
      reportType = 'final',
      templateUsed,
    } = params;

    // Verify study exists
    const study = await prisma.radiologyStudy.findUnique({
      where: { id: studyId },
    });

    if (!study) {
      throw new Error('Study not found');
    }

    const report = await prisma.radiologyReport.create({
      data: {
        studyId,
        reportType,
        findings,
        impression,
        recommendations,
        reportedBy,
        templateUsed,
        status: REPORT_STATUS.DRAFT,
      },
    });

    // Update study status to reported if report is final
    if (reportType === 'final') {
      await updateStudyStatus(studyId, STUDY_STATUS.REPORTED);
    }

    logger.info('RADIOLOGY_REPORT_CREATED', {
      reportId: report.id,
      studyId,
      reportType,
    });

    return report;
  } catch (error) {
    logger.error('CREATE_REPORT_ERROR', { error, params });
    throw error;
  }
}

/**
 * Update radiology report
 */
export async function updateReport(
  reportId: string,
  data: {
    findings?: string;
    impression?: string;
    recommendations?: string;
    status?: string;
    verifiedBy?: string;
    verifiedAt?: Date;
  }
) {
  try {
    const report = await prisma.radiologyReport.update({
      where: { id: reportId },
      data,
    });

    logger.info('RADIOLOGY_REPORT_UPDATED', {
      reportId,
      status: data.status,
    });

    return report;
  } catch (error) {
    logger.error('UPDATE_REPORT_ERROR', { error, reportId, data });
    throw error;
  }
}

/**
 * Get report templates
 */
export async function getReportTemplates(modality?: string, bodyPart?: string) {
  try {
    const where: any = {
      isActive: true,
    };

    if (modality) {
      where.modality = modality;
    }

    if (bodyPart) {
      where.bodyPart = bodyPart;
    }

    const templates = await prisma.radiologyReportTemplate.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return templates;
  } catch (error) {
    logger.error('GET_REPORT_TEMPLATES_ERROR', { error, modality, bodyPart });
    throw error;
  }
}

/**
 * Create report template
 */
export async function createReportTemplate(data: {
  name: string;
  modality: string;
  bodyPart?: string;
  content: string;
  createdBy: string;
}) {
  try {
    const template = await prisma.radiologyReportTemplate.create({
      data,
    });

    logger.info('REPORT_TEMPLATE_CREATED', {
      templateId: template.id,
      name: template.name,
      modality: template.modality,
    });

    return template;
  } catch (error) {
    logger.error('CREATE_REPORT_TEMPLATE_ERROR', { error, data });
    throw error;
  }
}

/**
 * List studies with filters
 */
export async function listStudies(filters: {
  patientId?: string;
  modality?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}) {
  try {
    const {
      patientId,
      modality,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
    } = filters;

    const where: any = {};

    if (patientId) {
      where.patientId = patientId;
    }

    if (modality) {
      where.modality = modality;
    }

    if (status) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.studyDate = {};
      if (dateFrom) {
        where.studyDate.gte = dateFrom;
      }
      if (dateTo) {
        where.studyDate.lte = dateTo;
      }
    }

    const [studies, total] = await Promise.all([
      prisma.radiologyStudy.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              mrn: true,
              dob: true,
              gender: true,
            },
          },
          reports: {
            select: {
              id: true,
              status: true,
              reportedAt: true,
              reportedBy: true,
            },
            orderBy: {
              reportedAt: 'desc',
            },
            take: 1,
          },
        },
        orderBy: {
          studyDate: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.radiologyStudy.count({ where }),
    ]);

    return {
      studies,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('LIST_STUDIES_ERROR', { error, filters });
    throw error;
  }
}

/**
 * Get study details
 */
export async function getStudyDetails(studyId: string) {
  try {
    const study = await prisma.radiologyStudy.findUnique({
      where: { id: studyId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            mrn: true,
            dob: true,
            gender: true,
            contact: true,
          },
        },
        order: {
          select: {
            id: true,
            orderType: true,
            orderedBy: true,
            orderedAt: true,
            details: true,
          },
        },
        series: {
          include: {
            _count: {
              select: {
                images: true,
              },
            },
          },
          orderBy: {
            seriesNumber: 'asc',
          },
        },
        reports: {
          orderBy: {
            reportedAt: 'desc',
          },
        },
      },
    });

    if (!study) {
      throw new Error('Study not found');
    }

    return study;
  } catch (error) {
    logger.error('GET_STUDY_DETAILS_ERROR', { error, studyId });
    throw error;
  }
}

export const pacsService = {
  generateAccessionNumber,
  generateStudyInstanceUID,
  generateSeriesInstanceUID,
  generateSOPInstanceUID,
  createStudy,
  createSeries,
  uploadImage,
  getStudyImages,
  addAnnotation,
  getImageAnnotations,
  updateStudyStatus,
  createReport,
  updateReport,
  getReportTemplates,
  createReportTemplate,
  listStudies,
  getStudyDetails,
  MODALITIES,
  STUDY_STATUS,
  REPORT_STATUS,
  IMAGE_TYPES,
  ANNOTATION_TYPES,
};
