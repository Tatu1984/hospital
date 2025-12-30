import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { logger } from '../utils/logger';

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const documentDir = path.join(uploadDir, 'documents');
const imagesDir = path.join(uploadDir, 'images');

[uploadDir, documentDir, imagesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// File type configurations
const allowedMimeTypes = {
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
};

// Generate secure filename
const generateFilename = (originalname: string): string => {
  const ext = path.extname(originalname);
  const hash = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}-${hash}${ext}`;
};

// Storage configuration for documents
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const patientId = req.params.patientId || 'general';
    const patientDir = path.join(documentDir, patientId);
    if (!fs.existsSync(patientDir)) {
      fs.mkdirSync(patientDir, { recursive: true });
    }
    cb(null, patientDir);
  },
  filename: (req, file, cb) => {
    cb(null, generateFilename(file.originalname));
  },
});

// Storage configuration for images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    cb(null, generateFilename(file.originalname));
  },
});

// File filter
const fileFilter = (allowedTypes: string[]) => {
  return (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  };
};

// Multer configurations
export const documentUpload = multer({
  storage: documentStorage,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024),
  },
  fileFilter: fileFilter(allowedMimeTypes.documents),
});

export const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for images
  },
  fileFilter: fileFilter(allowedMimeTypes.images),
});

// Document categories
export const documentCategories = [
  'id_proof',
  'insurance',
  'medical_records',
  'lab_reports',
  'radiology',
  'prescription',
  'consent_form',
  'discharge_summary',
  'referral_letter',
  'other',
] as const;

export type DocumentCategory = typeof documentCategories[number];

// Document metadata interface
export interface DocumentMetadata {
  id: string;
  patientId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: DocumentCategory;
  description?: string;
  uploadedBy: string;
  uploadedAt: Date;
  path: string;
}

// Get file path for serving
export const getFilePath = (patientId: string, filename: string): string => {
  return path.join(documentDir, patientId, filename);
};

// Delete file
export const deleteFile = async (filePath: string): Promise<boolean> => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info('FILE_DELETED', { path: filePath });
      return true;
    }
    return false;
  } catch (error) {
    logger.error('FILE_DELETE_ERROR', { path: filePath, error });
    return false;
  }
};

// Get file info
export const getFileInfo = (filePath: string): { exists: boolean; size?: number; mtime?: Date } => {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return { exists: true, size: stats.size, mtime: stats.mtime };
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
};

// Export directories for reference
export const uploadPaths = {
  documents: documentDir,
  images: imagesDir,
};
