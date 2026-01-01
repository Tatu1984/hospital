import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Import centralized database client (supports NeonDB serverless)
import { prisma, disconnectPrisma } from './lib/db';
import jwt from 'jsonwebtoken';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import {
  requirePermission,
  requireRole,
  getUserPermissions,
  ROLE_PERMISSIONS,
  ROUTE_MODULES,
  Permission,
  Role
} from './rbac';

// Import middleware
import {
  authenticateToken as authMiddleware,
  AuthenticatedRequest,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ValidationError,
  NotFoundError,
  securityHeaders,
  generalRateLimiter,
  authRateLimiter,
  sanitizeRequest,
  apiSecurityHeaders,
  dynamicRBAC,
} from './middleware';

// Import notification service
import { notificationService } from './services/notification';

// Import export service
import { exportService } from './services/export';

// Import PDF service
import { pdfService } from './services/pdf';

// Import upload service
import { documentUpload, getFilePath, deleteFile, documentCategories } from './services/upload';
import path from 'path';

// Import reminder service
import { reminderService } from './services/reminder';

// Import Redis service
import redisService from './services/redis';

// Import IPD charge capture service
import { ipdChargeCaptureService } from './services/ipdChargeCapture';

// Import patient deduplication service
import { findPotentialDuplicates, mergePatients, getDuplicateStats } from './services/patientDeduplication';

// Import validators
import {
  loginSchema,
  createPatientSchema,
  updatePatientSchema,
  searchSchema,
  idParamSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
  createEncounterSchema,
  opdNoteSchema,
  createPrescriptionSchema,
  createAdmissionSchema,
  dischargeSchema,
  createLabOrderSchema,
  labResultSchema,
  createRadiologyOrderSchema,
  radiologyResultSchema,
  createInvoiceSchema,
  paymentSchema,
  createEmergencySchema,
  scheduleSurgerySchema,
  bloodDonorSchema,
  bloodRequestSchema,
  createPurchaseOrderSchema,
  createEmployeeSchema,
  leaveRequestSchema,
  icuVitalsSchema,
  icuBedAssignmentSchema,
  pharmacyDispenseSchema,
  drugMasterSchema,
  ambulanceTripSchema,
  ambulanceVehicleSchema,
  housekeepingTaskSchema,
  dietOrderSchema,
  incidentReportSchema,
  preAuthorizationSchema,
  referralSourceSchema,
  createUserSchema,
  updateUserSchema,
  journalEntrySchema,
  labTestMasterSchema,
  procedureMasterSchema,
  wardMasterSchema,
  createAnesthesiaRecordSchema,
  updateAnesthesiaRecordSchema,
  addVitalsEntrySchema,
  addAnesthesiaComplicationSchema,
  reportSurgeryComplicationSchema,
  addSurgeryImplantSchema,
  validateBody,
  validateQuery,
  validateParams,
} from './validators';

// Import route permissions
import { checkRoutePermission, ROUTE_PERMISSIONS } from './routes';

// Import pharmacy routes
import pharmacyRoutes from './routes/pharmacy';

// Import insurance routes
import insuranceRoutes from './routes/insurance';

// Import OPD workflow routes
import opdWorkflowRoutes from './routes/opd-workflow';

// Import anesthesia routes
import anesthesiaRoutes from './routes/anesthesia';

// Import bed management routes
import bedRoutes from './routes/beds';

// Import reports routes
import reportsRoutes from './routes/reports';

// Import barcode routes
import barcodeRoutes from './routes/barcode';

// Import drug interaction routes
import drugInteractionRoutes from './routes/drugInteractionRoutes';

// Import nursing care plan routes
import nursingCarePlanRoutes from './routes/nursingCarePlan';

// Import shift management routes
import shiftsRoutes from './routes/shifts';

// Import radiology/PACS routes
import radiologyRoutes from './routes/radiology';

// Import inventory routes
import inventoryRoutes from './routes/inventory';

// Import billing routes
import billingRoutes from './routes/billing';

// Import logger
import { logger, auditLogger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ============================================
// GLOBAL MIDDLEWARE SETUP
// ============================================

// CORS MUST be the FIRST middleware (before everything else)
// This is critical for Vercel serverless functions
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000']; // Default for development

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? corsOrigins  // Restrict to specific origins in production
    : true,        // Allow all in development for convenience
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400, // 24 hours
}));

// Explicit OPTIONS handler for preflight requests (critical for serverless)
app.options('*', cors());

// Security headers (after CORS)
app.use(securityHeaders);
app.use(apiSecurityHeaders);

// Request sanitization
app.use(sanitizeRequest);

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply general rate limiting to all routes
app.use('/api', generalRateLimiter);

// ============================================
// CONFIG ERROR CHECK (for serverless)
// ============================================
import { configError } from './config';

// Health check endpoint (always works, shows config errors)
app.get('/api/health', (req: Request, res: Response) => {
  if (configError) {
    return res.status(503).json({
      status: 'error',
      message: configError,
      hint: 'Add DATABASE_URL and JWT_SECRET to your Vercel Environment Variables'
    });
  }
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// If config is missing, return helpful error for all other API routes
if (configError) {
  app.use('/api', (req: Request, res: Response) => {
    res.status(503).json({
      error: 'CONFIGURATION_ERROR',
      message: configError,
      hint: 'Go to Vercel Dashboard → Your Backend Project → Settings → Environment Variables'
    });
  });
}

// ============================================
// API DOCUMENTATION (Swagger UI)
// ============================================
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Hospital ERP API Documentation',
}));

// Serve OpenAPI spec as JSON
app.get('/api/docs.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ============================================
// AUTH MIDDLEWARE (using enhanced version)
// ============================================
const authenticateToken = (req: any, res: Response, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Access denied. No token provided.',
    });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'TOKEN_EXPIRED',
          message: 'Your session has expired. Please log in again.',
        });
      }
      auditLogger.securityEvent('INVALID_TOKEN', {
        ip: req.ip,
        path: req.path,
        error: err.message,
      });
      return res.status(403).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid token.',
      });
    }
    req.user = user;
    // Apply dynamic RBAC check after authentication
    dynamicRBAC(req, res, next);
  });
};

// Health check endpoints
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', async (req: Request, res: Response) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      database: 'unknown',
      api: 'healthy'
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    }
  };

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    healthCheck.services.database = 'healthy';
  } catch (error) {
    healthCheck.services.database = 'unhealthy';
    healthCheck.status = 'degraded';
  }

  const statusCode = healthCheck.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

// Detailed health check (protected)
app.get('/api/health/detailed', authenticateToken, requirePermission('system:manage'), async (req: any, res: Response) => {
  const detailedHealth = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    node: process.version,
    platform: process.platform,
    services: {
      database: { status: 'unknown', latency: 0 },
      api: { status: 'healthy', latency: 0 }
    },
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    counts: {
      patients: 0,
      appointments: 0,
      users: 0
    }
  };

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    detailedHealth.services.database = {
      status: 'healthy',
      latency: Date.now() - dbStart
    };

    // Get counts
    const [patients, appointments, users] = await Promise.all([
      prisma.patient.count({ where: { tenantId: req.user.tenantId } }),
      prisma.appointment.count({ where: { tenantId: req.user.tenantId } }),
      prisma.user.count({ where: { tenantId: req.user.tenantId } })
    ]);
    detailedHealth.counts = { patients, appointments, users };
  } catch (error) {
    detailedHealth.services.database = { status: 'unhealthy', latency: -1 };
    detailedHealth.status = 'degraded';
  }

  res.json(detailedHealth);
});

// Readiness probe (for Kubernetes/Docker)
app.get('/api/ready', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: 'Database not available' });
  }
});

// Liveness probe (for Kubernetes/Docker)
app.get('/api/live', (req: Request, res: Response) => {
  res.json({ alive: true, timestamp: new Date().toISOString() });
});

// Auth routes - with rate limiting and validation
app.post('/api/auth/login', authRateLimiter, validateBody(loginSchema), async (req: Request, res: Response) => {
  try {
    const { username, password } = (req as any).validatedBody || req.body;

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        tenant: true,
        branch: true,
      },
    });

    if (!user || !user.isActive) {
      auditLogger.securityEvent('LOGIN_FAILED', { username, reason: 'invalid_user', ip: req.ip });
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
      });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      auditLogger.securityEvent('LOGIN_FAILED', { username, reason: 'invalid_password', ip: req.ip });
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        tenantId: user.tenantId,
        branchId: user.branchId,
        roleIds: user.roleIds,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Get user permissions based on roles
    const permissions = getUserPermissions(user.roleIds);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        roleIds: user.roleIds,
        permissions,
        tenant: user.tenant,
        branch: user.branch,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password reset - request reset token
app.post('/api/auth/forgot-password', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return success to prevent email enumeration
    if (!user || !user.isActive) {
      return res.json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    // Generate secure reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save hashed token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetTokenHash,
        passwordResetExpires: resetExpires,
      },
    });

    // Build reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    // Send email (if notification service is configured)
    try {
      const { notificationService } = await import('./services/notification');
      await notificationService.send({
        type: 'PASSWORD_RESET',
        recipientEmail: user.email,
        message: `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you did not request this, please ignore this email.`,
        data: { resetUrl, userName: user.name },
      });
    } catch (emailError) {
      logger.error('Failed to send password reset email:', emailError);
      // Continue even if email fails - token is saved
    }

    auditLogger.securityEvent('PASSWORD_RESET_REQUESTED', { userId: user.id, email: user.email, ip: req.ip });

    res.json({
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password reset - reset password with token
app.post('/api/auth/reset-password', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Reset token is required' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Hash the provided token to compare with stored hash
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpires: { gt: new Date() },
        isActive: true,
      },
    });

    if (!user) {
      auditLogger.securityEvent('PASSWORD_RESET_FAILED', { reason: 'invalid_or_expired_token', ip: req.ip });
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    auditLogger.securityEvent('PASSWORD_RESET_SUCCESS', { userId: user.id, email: user.email, ip: req.ip });

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PHARMACY MODULE ROUTES
// ============================================
app.use('/api/pharmacy', authenticateToken, pharmacyRoutes);

// ============================================
// INSURANCE MODULE ROUTES
// ============================================
app.use('/api/insurance', authenticateToken, insuranceRoutes);

// ============================================
// OPD WORKFLOW ROUTES
// ============================================
app.use('/api', opdWorkflowRoutes);

// ============================================
// ANESTHESIA & SURGERY MANAGEMENT ROUTES
// ============================================
app.use('/api', anesthesiaRoutes);

// ============================================
// BED MANAGEMENT ROUTES
// ============================================
app.use('/api/beds', authenticateToken, bedRoutes);

// ============================================
// REPORTS ROUTES
// ============================================
app.use('/api/reports', authenticateToken, reportsRoutes);

// ============================================
// BARCODE MANAGEMENT ROUTES
// ============================================
app.use('/api/barcodes', authenticateToken, barcodeRoutes);

// ============================================
// DRUG INTERACTION ROUTES
// ============================================
app.use('/api', authenticateToken, drugInteractionRoutes);

// ============================================
// NURSING CARE PLAN ROUTES
// ============================================
app.use('/api/nursing', authenticateToken, nursingCarePlanRoutes);

// ============================================
// SHIFT MANAGEMENT ROUTES
// ============================================
app.use('/api/shifts', authenticateToken, shiftsRoutes);

// ============================================
// RADIOLOGY/PACS ROUTES
// ============================================
app.use('/api/radiology', authenticateToken, radiologyRoutes);

// ============================================
// INVENTORY MANAGEMENT ROUTES
// ============================================
app.use('/api/inventory', authenticateToken, inventoryRoutes);

// ============================================
// BILLING ROUTES
// ============================================
app.use('/api/billing', authenticateToken, billingRoutes);

// Patient routes - with validation and RBAC
app.get('/api/patients', authenticateToken, requirePermission('patients:view'), validateQuery(searchSchema), async (req: any, res: Response) => {
  try {
    const { search, limit = 50, page = 1 } = (req as any).validatedQuery || req.query;

    // Generate cache key based on query parameters
    const cacheKey = redisService.generateKey('patients', {
      tenantId: req.user.tenantId,
      search: search || '',
      limit,
      page,
    });

    // Try to get from cache first, or fetch from database
    const patients = await redisService.cacheWrapper(
      cacheKey,
      300, // 5 minutes TTL
      async () => {
        const where: any = {
          tenantId: req.user.tenantId,
        };

        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { mrn: { contains: search, mode: 'insensitive' } },
            { contact: { contains: search, mode: 'insensitive' } },
          ];
        }

        return await prisma.patient.findMany({
          where,
          take: parseInt(limit as string),
          skip: (parseInt(page as string) - 1) * parseInt(limit as string),
          orderBy: { createdAt: 'desc' },
          include: {
            branch: { select: { name: true } },
          },
        });
      }
    );

    res.json(patients);
  } catch (error) {
    logger.error('Get patients error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch patients',
    });
  }
});

app.post('/api/patients', authenticateToken, requirePermission('patients:create'), validateBody(createPatientSchema), async (req: any, res: Response) => {
  try {
    const { name, dob, gender, contact, email, address, bloodGroup, allergies, referralSourceId, forceCreate } = (req as any).validatedBody || req.body;

    // Check for potential duplicates before creating (unless forceCreate is true)
    if (!forceCreate) {
      const potentialDuplicates = await findPotentialDuplicates(
        { name, dob, gender, contact, email, address },
        req.user.tenantId,
        req.user.branchId
      );

      // If high-confidence duplicates found, return them for confirmation
      if (potentialDuplicates.length > 0 && potentialDuplicates[0].score >= 70) {
        return res.status(409).json({
          error: 'POTENTIAL_DUPLICATE',
          message: 'Potential duplicate patients found. Please review or use forceCreate option.',
          duplicates: potentialDuplicates.map(d => ({
            id: d.patient.id,
            mrn: d.patient.mrn,
            name: d.patient.name,
            dob: d.patient.dob,
            contact: d.patient.contact,
            email: d.patient.email,
            address: d.patient.address,
            score: d.score,
            matchReasons: d.matchReasons,
          })),
        });
      }
    }

    // Generate MRN
    const lastPatient = await prisma.patient.findFirst({
      where: { tenantId: req.user.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    let mrnNumber = 1;
    if (lastPatient) {
      const lastMrnNum = parseInt(lastPatient.mrn.replace(/\D/g, ''));
      mrnNumber = lastMrnNum + 1;
    }

    const mrn = `MRN${mrnNumber.toString().padStart(6, '0')}`;

    const patient = await prisma.patient.create({
      data: {
        tenantId: req.user.tenantId,
        branchId: req.user.branchId,
        mrn,
        name,
        dob: dob ? new Date(dob) : null,
        gender,
        contact,
        email,
        address,
        bloodGroup,
        allergies,
        referralSourceId: referralSourceId || null,
      },
      include: {
        branch: { select: { name: true } },
        referralSource: { select: { name: true, code: true, type: true } },
      },
    });

    // Invalidate patients cache for this tenant
    await redisService.deletePattern(`patients:*tenantId:${req.user.tenantId}*`);

    res.status(201).json(patient);
  } catch (error) {
    logger.error('Create patient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/patients/:id', authenticateToken, requirePermission('patients:view'), async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        branch: true,
        encounters: {
          orderBy: { visitDate: 'desc' },
          take: 10,
          include: {
            doctor: { select: { name: true } },
          },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Patient not found',
      });
    }

    res.json(patient);
  } catch (error) {
    logger.error('Get patient error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch patient',
    });
  }
});

// Patient deduplication endpoints

/**
 * @swagger
 * /api/patients/check-duplicates:
 *   post:
 *     summary: Check for duplicate patients before registration
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               dob:
 *                 type: string
 *                 format: date
 *               contact:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *               gender:
 *                 type: string
 *     responses:
 *       200:
 *         description: Potential duplicates found or no duplicates
 */
app.post('/api/patients/check-duplicates', authenticateToken, requirePermission('patients:view'), async (req: any, res: Response) => {
  try {
    const { name, dob, gender, contact, email, address } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Name is required',
      });
    }

    const potentialDuplicates = await findPotentialDuplicates(
      { name, dob, gender, contact, email, address },
      req.user.tenantId,
      req.user.branchId
    );

    res.json({
      hasDuplicates: potentialDuplicates.length > 0,
      count: potentialDuplicates.length,
      duplicates: potentialDuplicates.map(d => ({
        id: d.patient.id,
        mrn: d.patient.mrn,
        name: d.patient.name,
        dob: d.patient.dob,
        contact: d.patient.contact,
        email: d.patient.email,
        address: d.patient.address,
        gender: d.patient.gender,
        score: d.score,
        matchReasons: d.matchReasons,
        confidenceLevel: d.score >= 85 ? 'high' : d.score >= 70 ? 'medium' : 'low',
      })),
    });
  } catch (error) {
    logger.error('Check duplicates error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to check for duplicates',
    });
  }
});

/**
 * @swagger
 * /api/patients/{id}/potential-duplicates:
 *   get:
 *     summary: Find potential duplicates for an existing patient
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: Potential duplicates found
 *       404:
 *         description: Patient not found
 */
app.get('/api/patients/:id/potential-duplicates', authenticateToken, requirePermission('patients:view'), async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    // Get the patient first
    const patient = await prisma.patient.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!patient) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Patient not found',
      });
    }

    // Find potential duplicates
    const potentialDuplicates = await findPotentialDuplicates(
      {
        name: patient.name,
        dob: patient.dob,
        contact: patient.contact,
        email: patient.email,
        address: patient.address,
        gender: patient.gender,
      },
      req.user.tenantId,
      patient.branchId,
      id // Exclude this patient from results
    );

    // Get statistics
    const stats = await getDuplicateStats(id, req.user.tenantId);

    res.json({
      patient: {
        id: patient.id,
        mrn: patient.mrn,
        name: patient.name,
        dob: patient.dob,
        contact: patient.contact,
        email: patient.email,
      },
      stats,
      duplicates: potentialDuplicates.map(d => ({
        id: d.patient.id,
        mrn: d.patient.mrn,
        name: d.patient.name,
        dob: d.patient.dob,
        contact: d.patient.contact,
        email: d.patient.email,
        address: d.patient.address,
        gender: d.patient.gender,
        bloodGroup: d.patient.bloodGroup,
        createdAt: d.patient.createdAt,
        score: d.score,
        matchReasons: d.matchReasons,
        confidenceLevel: d.score >= 85 ? 'high' : d.score >= 70 ? 'medium' : 'low',
      })),
    });
  } catch (error) {
    logger.error('Get potential duplicates error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to find potential duplicates',
    });
  }
});

/**
 * @swagger
 * /api/patients/merge:
 *   post:
 *     summary: Merge two patient records (admin only)
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - primaryId
 *               - duplicateId
 *             properties:
 *               primaryId:
 *                 type: string
 *                 description: ID of the patient to keep
 *               duplicateId:
 *                 type: string
 *                 description: ID of the patient to merge and delete
 *     responses:
 *       200:
 *         description: Patients merged successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Insufficient permissions
 */
app.post('/api/patients/merge', authenticateToken, requirePermission('patients:edit'), async (req: any, res: Response) => {
  try {
    const { primaryId, duplicateId } = req.body;

    // Validate input
    if (!primaryId || !duplicateId) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Both primaryId and duplicateId are required',
      });
    }

    if (primaryId === duplicateId) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Cannot merge a patient with itself',
      });
    }

    // Perform merge
    const result = await mergePatients(primaryId, duplicateId, req.user.tenantId);

    // Invalidate patients cache for this tenant
    await redisService.deletePattern(`patients:*tenantId:${req.user.tenantId}*`);

    res.json({
      success: true,
      message: 'Patients merged successfully',
      primaryPatient: {
        id: result.primaryPatient.id,
        mrn: result.primaryPatient.mrn,
        name: result.primaryPatient.name,
        dob: result.primaryPatient.dob,
        contact: result.primaryPatient.contact,
        email: result.primaryPatient.email,
      },
      mergedData: result.mergedData,
    });
  } catch (error: any) {
    logger.error('Merge patients error:', error);

    // Handle specific error cases
    if (error.message === 'One or both patients not found') {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: error.message,
      });
    }

    if (error.message === 'Unauthorized: Patients do not belong to this tenant') {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to merge patients',
    });
  }
});

// Users/Doctors routes
app.get('/api/users', authenticateToken, requirePermission('users:view'), async (req: any, res: Response) => {
  try {
    const { role } = req.query;
    const where: any = { tenantId: req.user.tenantId, isActive: true };

    if (role) {
      where.roleIds = { has: role };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        roleIds: true,
        departmentIds: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(users);
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch users',
    });
  }
});

app.get('/api/doctors', authenticateToken, async (req: any, res: Response) => {
  // No specific permission required - doctors list is commonly needed
  try {
    const doctors = await prisma.user.findMany({
      where: {
        tenantId: req.user.tenantId,
        isActive: true,
        roleIds: { has: 'doctor' },
      },
      select: {
        id: true,
        name: true,
        email: true,
        departmentIds: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(doctors);
  } catch (error) {
    logger.error('Get doctors error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch doctors',
    });
  }
});

// ============================================
// EXPORT APIs
// ============================================

// Export patients to Excel
app.get('/api/export/patients', authenticateToken, requirePermission('patients:view'), async (req: any, res: Response) => {
  try {
    const patients = await prisma.patient.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const buffer = exportService.toExcel(patients, exportService.patientColumns, { sheetName: 'Patients' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=patients_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    logger.error('Export patients error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Export appointments to Excel
app.get('/api/export/appointments', authenticateToken, requirePermission('appointments:view'), async (req: any, res: Response) => {
  try {
    const { from, to } = req.query;
    const where: any = { tenantId: req.user.tenantId };

    if (from) where.appointmentDate = { gte: new Date(from as string) };
    if (to) where.appointmentDate = { ...where.appointmentDate, lte: new Date(to as string) };

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { name: true, mrn: true } },
        doctor: { select: { name: true } },
      },
      orderBy: { appointmentDate: 'desc' },
    });

    const buffer = exportService.toExcel(appointments, exportService.appointmentColumns, { sheetName: 'Appointments' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=appointments_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    logger.error('Export appointments error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Export invoices to Excel
app.get('/api/export/invoices', authenticateToken, requirePermission('billing:view'), async (req: any, res: Response) => {
  try {
    const { from, to, status } = req.query;
    const where: any = { patient: { tenantId: req.user.tenantId } };

    if (from) where.createdAt = { gte: new Date(from as string) };
    if (to) where.createdAt = { ...where.createdAt, lte: new Date(to as string) };
    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      include: { patient: { select: { name: true, mrn: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const buffer = exportService.toExcel(invoices, exportService.invoiceColumns, { sheetName: 'Invoices' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=invoices_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    logger.error('Export invoices error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Export payments/collections to Excel
app.get('/api/export/payments', authenticateToken, requirePermission('billing:view'), async (req: any, res: Response) => {
  try {
    const { from, to } = req.query;
    const where: any = { invoice: { patient: { tenantId: req.user.tenantId } } };

    if (from) where.paidAt = { gte: new Date(from as string) };
    if (to) where.paidAt = { ...where.paidAt, lte: new Date(to as string) };

    const payments = await prisma.payment.findMany({
      where,
      include: { invoice: { include: { patient: { select: { name: true, mrn: true } } } } },
      orderBy: { paidAt: 'desc' },
    });

    const buffer = exportService.toExcel(payments, exportService.paymentColumns, { sheetName: 'Collections' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=collections_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    logger.error('Export payments error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Export lab orders to Excel
app.get('/api/export/lab-orders', authenticateToken, requirePermission('lab:view'), async (req: any, res: Response) => {
  try {
    const { from, to, status } = req.query;
    const where: any = { orderType: 'lab', patient: { tenantId: req.user.tenantId } };

    if (from) where.createdAt = { gte: new Date(from as string) };
    if (to) where.createdAt = { ...where.createdAt, lte: new Date(to as string) };
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      include: {
        patient: { select: { name: true, mrn: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const buffer = exportService.toExcel(orders, exportService.labOrderColumns, { sheetName: 'Lab Orders' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=lab_orders_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    logger.error('Export lab orders error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Export employees to Excel
app.get('/api/export/employees', authenticateToken, requirePermission('hr:view'), async (req: any, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { name: 'asc' },
    });

    const buffer = exportService.toExcel(employees, exportService.employeeColumns, { sheetName: 'Employees' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=employees_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    logger.error('Export employees error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Export admissions to Excel
app.get('/api/export/admissions', authenticateToken, requirePermission('ipd:view'), async (req: any, res: Response) => {
  try {
    const { from, to, status } = req.query;
    const where: any = { patient: { tenantId: req.user.tenantId } };

    if (from) where.admissionDate = { gte: new Date(from as string) };
    if (to) where.admissionDate = { ...where.admissionDate, lte: new Date(to as string) };
    if (status) where.status = status;

    const admissions = await prisma.admission.findMany({
      where,
      include: {
        patient: { select: { name: true, mrn: true } },
        bed: true,
        admittingDoctor: { select: { name: true } },
      },
      orderBy: { admissionDate: 'desc' },
    });

    const buffer = exportService.toExcel(admissions, exportService.admissionColumns, { sheetName: 'Admissions' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=admissions_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    logger.error('Export admissions error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// ============================================
// PDF GENERATION APIs
// ============================================

// Generate Invoice PDF
app.get('/api/pdf/invoice/:id', authenticateToken, requirePermission('billing:view'), async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, patient: { tenantId: req.user.tenantId } },
      include: {
        patient: true,
        payments: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const pdfBuffer = await pdfService.generateInvoice({
      invoiceNumber: invoice.id.slice(0, 8).toUpperCase(),
      invoiceDate: invoice.createdAt,
      patient: {
        name: invoice.patient.name,
        mrn: invoice.patient.mrn,
        contact: invoice.patient.contact || undefined,
        address: invoice.patient.address || undefined,
      },
      items: (invoice.items as any[]).map(item => ({
        description: item.description || item.name,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || item.rate || item.amount,
        amount: item.amount,
      })),
      subtotal: Number(invoice.subtotal),
      discount: Number(invoice.discount),
      tax: Number(invoice.tax || 0),
      total: Number(invoice.total),
      paid,
      balance: Number(invoice.balance),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${invoice.id.slice(0, 8)}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Generate invoice PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Generate Payment Receipt PDF
app.get('/api/pdf/receipt/:id', authenticateToken, requirePermission('billing:view'), async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findFirst({
      where: { id },
      include: {
        invoice: {
          include: { patient: true },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const pdfBuffer = await pdfService.generateReceipt({
      receiptNumber: payment.id.slice(0, 8).toUpperCase(),
      receiptDate: payment.paidAt,
      patient: {
        name: payment.invoice.patient.name,
        mrn: payment.invoice.patient.mrn,
      },
      amount: Number(payment.amount),
      paymentMode: payment.mode,
      transactionRef: payment.transactionRef || undefined,
      invoiceNumber: payment.invoiceId.slice(0, 8).toUpperCase(),
      receivedBy: payment.receivedBy || undefined,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt_${payment.id.slice(0, 8)}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Generate receipt PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Generate Lab Report PDF
app.get('/api/pdf/lab-report/:id', authenticateToken, requirePermission('lab:view'), async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const result = await prisma.result.findFirst({
      where: { id },
      include: {
        order: {
          include: {
            patient: true,
          },
        },
      },
    });

    if (!result) {
      return res.status(404).json({ error: 'Lab result not found' });
    }

    const resultData = result.resultData as any;
    const tests = Array.isArray(resultData) ? resultData : [{ name: 'Test', result: resultData?.value || '-' }];
    const order = result.order as any;

    const pdfBuffer = await pdfService.generateLabReport({
      reportNumber: result.id.slice(0, 8).toUpperCase(),
      reportDate: result.createdAt,
      patient: {
        name: order.patient.name,
        mrn: order.patient.mrn,
        gender: order.patient.gender || undefined,
      },
      referringDoctor: order.orderedBy,
      tests: tests.map((t: any) => ({
        name: t.name || t.testName,
        result: t.result || t.value,
        unit: t.unit,
        referenceRange: t.referenceRange || t.normalRange,
        isCritical: t.isCritical || result.isCritical,
      })),
      verifiedBy: result.verifiedBy || undefined,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=lab_report_${result.id.slice(0, 8)}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Generate lab report PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Generate Discharge Summary PDF
app.get('/api/pdf/discharge/:id', authenticateToken, requirePermission('ipd:view'), async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const admission = await prisma.admission.findFirst({
      where: { id, patient: { tenantId: req.user.tenantId } },
      include: {
        patient: true,
        bed: true,
        admittingDoctor: true,
      },
    });

    if (!admission) {
      return res.status(404).json({ error: 'Admission not found' });
    }

    if (admission.status !== 'discharged') {
      return res.status(400).json({ error: 'Patient not yet discharged' });
    }

    const admissionData = admission as any;

    const pdfBuffer = await pdfService.generateDischargeSummary({
      admissionNumber: admission.id.slice(0, 8).toUpperCase(),
      patient: {
        name: admissionData.patient.name,
        mrn: admissionData.patient.mrn,
        gender: admissionData.patient.gender || undefined,
        address: admissionData.patient.address || undefined,
      },
      admissionDate: admission.admissionDate,
      dischargeDate: admission.dischargeDate || new Date(),
      ward: admissionData.bed?.wardId || 'N/A',
      bed: admissionData.bed?.bedNumber || 'N/A',
      attendingDoctor: admissionData.admittingDoctor?.name || 'N/A',
      diagnosis: admission.diagnosis || 'N/A',
      treatmentGiven: admissionData.treatmentGiven || 'As per clinical notes',
      conditionAtDischarge: admissionData.conditionAtDischarge || 'Stable',
      followUpInstructions: admissionData.dischargeSummary || undefined,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=discharge_${admission.id.slice(0, 8)}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Generate discharge PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Encounter routes
app.post('/api/encounters', authenticateToken, requirePermission('encounters:create'), validateBody(createEncounterSchema), async (req: any, res: Response) => {
  try {
    const { patientId, type, chiefComplaint, appointmentId, tokenNumber, doctorId } = (req as any).validatedBody || req.body;

    // If appointmentId provided, check if encounter already exists for this appointment
    if (appointmentId) {
      const existingEncounter = await prisma.encounter.findFirst({
        where: { appointmentId },
        include: { patient: true, doctor: { select: { name: true } } }
      });
      if (existingEncounter) {
        return res.json(existingEncounter);
      }
    }

    // Get appointment details if appointmentId is provided
    let appointmentDetails: any = null;
    if (appointmentId) {
      appointmentDetails = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { patientId: true, doctorId: true, reason: true, department: true }
      });
    }

    const encounter = await prisma.encounter.create({
      data: {
        patientId: patientId || appointmentDetails?.patientId,
        branchId: req.user.branchId,
        type: type || 'OP',
        doctorId: doctorId || appointmentDetails?.doctorId || req.user.userId,
        chiefComplaint: chiefComplaint || appointmentDetails?.reason,
        appointmentId: appointmentId || null,
        tokenNumber: tokenNumber || null,
        startTime: new Date(),
        status: 'active',
      },
      include: {
        patient: true,
        doctor: { select: { name: true } },
        appointment: { select: { id: true, appointmentDate: true, appointmentTime: true } }
      },
    });

    // Update appointment status to 'in_progress' if linked
    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'in_progress' }
      });
    }

    res.status(201).json(encounter);
  } catch (error) {
    logger.error('Create encounter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/encounters', authenticateToken, async (req: any, res: Response) => {
  try {
    const { patientId, status = 'active' } = req.query;

    const where: any = {
      branchId: req.user.branchId,
    };

    if (patientId) {
      where.patientId = patientId;
    }

    if (status) {
      where.status = status;
    }

    const encounters = await prisma.encounter.findMany({
      where,
      orderBy: { visitDate: 'desc' },
      include: {
        patient: { select: { id: true, mrn: true, name: true, dob: true, gender: true } },
        doctor: { select: { name: true } },
      },
    });

    res.json(encounters);
  } catch (error) {
    logger.error('Get encounters error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// OPD Notes
app.post('/api/opd-notes', authenticateToken, validateBody(opdNoteSchema), async (req: any, res: Response) => {
  try {
    const {
      encounterId,
      patientId,
      chiefComplaint,
      history,
      vitals,
      examination,
      assessment,
      plan,
      prescription,
    } = req.body;

    const opdNote = await prisma.oPDNote.create({
      data: {
        encounterId,
        patientId,
        doctorId: req.user.userId,
        chiefComplaint,
        history,
        vitals,
        examination,
        assessment,
        plan,
      },
    });

    // Create prescription if provided
    if (prescription && prescription.drugs && prescription.drugs.length > 0) {
      await prisma.prescription.create({
        data: {
          opdNoteId: opdNote.id,
          patientId,
          doctorId: req.user.userId,
          drugs: prescription.drugs,
          status: 'pending', // Default status for new prescriptions
        },
      });
    }

    const result = await prisma.oPDNote.findUnique({
      where: { id: opdNote.id },
      include: {
        prescriptions: true,
        doctor: { select: { name: true } },
      },
    });

    res.status(201).json(result);
  } catch (error) {
    logger.error('Create OPD note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/opd-notes/:encounterId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { encounterId } = req.params;

    const opdNotes = await prisma.oPDNote.findMany({
      where: { encounterId },
      include: {
        prescriptions: true,
        doctor: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(opdNotes);
  } catch (error) {
    logger.error('Get OPD notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invoice routes
app.post('/api/invoices', authenticateToken, validateBody(createInvoiceSchema), async (req: any, res: Response) => {
  try {
    const { patientId, encounterId, type, items } = req.body;

    const subtotal = items.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0);
    const total = subtotal;
    const balance = total;

    const invoice = await prisma.invoice.create({
      data: {
        patientId,
        encounterId,
        type: type || 'OP',
        items,
        subtotal,
        total,
        balance,
        status: 'draft',
      },
      include: {
        patient: { select: { name: true, mrn: true } },
      },
    });

    res.status(201).json(invoice);
  } catch (error) {
    logger.error('Create invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/invoices/:id/payment', authenticateToken, validateBody(paymentSchema), async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, mode, transactionRef } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        patient: { include: { referralSource: true } },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId: id,
        amount: parseFloat(amount),
        mode,
        transactionRef,
        receivedBy: req.user.userId,
      },
    });

    const totalPaid = parseFloat(invoice.paid.toString()) + parseFloat(amount);
    const newBalance = parseFloat(invoice.total.toString()) - totalPaid;

    await prisma.invoice.update({
      where: { id },
      data: {
        paid: totalPaid,
        balance: newBalance,
        status: newBalance <= 0 ? 'paid' : 'final',
      },
    });

    // Auto-create commission if patient has referral source and invoice is fully paid
    if (newBalance <= 0 && invoice.patient.referralSourceId && invoice.patient.referralSource) {
      const referralSource = invoice.patient.referralSource;
      const invoiceTotal = parseFloat(invoice.total.toString());

      const commissionAmount = calculateCommission(invoiceTotal, referralSource);

      if (commissionAmount > 0) {
        await prisma.commission.create({
          data: {
            referralSourceId: referralSource.id,
            patientId: invoice.patientId,
            invoiceId: invoice.id,
            invoiceAmount: invoiceTotal,
            commissionType: referralSource.commissionType,
            commissionRate: referralSource.commissionType === 'percentage' ? parseFloat(referralSource.commissionValue.toString()) : null,
            commissionAmount,
            status: 'pending',
          },
        });
      }
    }

    res.json(payment);
  } catch (error) {
    logger.error('Create payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/invoices', authenticateToken, async (req: any, res: Response) => {
  try {
    const { patientId, status } = req.query;

    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        patient: { select: { name: true, mrn: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(invoices);
  } catch (error) {
    logger.error('Get invoices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// PAYMENT GATEWAY ROUTES (Razorpay)
// ============================================================================

import { paymentService, PaymentService } from './services/payment';

// Get payment gateway configuration (public)
app.get('/api/payments/config', authenticateToken, async (req: any, res: Response) => {
  try {
    res.json({
      enabled: paymentService.isEnabled(),
      publicKey: paymentService.isEnabled() ? paymentService.getPublicKey() : null,
      currency: 'INR',
    });
  } catch (error) {
    logger.error('Get payment config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create Razorpay order for an invoice
app.post('/api/payments/create-order', authenticateToken, async (req: any, res: Response) => {
  try {
    const { invoiceId, amount } = req.body;

    if (!paymentService.isEnabled()) {
      return res.status(400).json({ error: 'Online payment is not configured' });
    }

    // Validate invoice exists and amount matches
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { patient: true },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const balanceDue = parseFloat(invoice.balance.toString());
    const paymentAmount = parseFloat(amount);

    if (paymentAmount <= 0 || paymentAmount > balanceDue) {
      return res.status(400).json({
        error: `Invalid amount. Balance due: ${balanceDue}`
      });
    }

    // Create Razorpay order
    const order = await paymentService.createOrder({
      amount: PaymentService.toPaise(paymentAmount),
      currency: 'INR',
      receipt: `INV-${invoiceId.slice(0, 8)}`,
      notes: {
        invoiceId,
        patientId: invoice.patientId,
        patientName: invoice.patient.name,
      },
    });

    // Create pending payment record
    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        amount: paymentAmount,
        mode: 'razorpay',
        razorpayOrderId: order.id,
        gatewayStatus: 'initiated',
        receivedBy: req.user.userId,
      },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment.id,
      key: paymentService.getPublicKey(),
      prefill: {
        name: invoice.patient.name,
        email: invoice.patient.email || '',
        contact: invoice.patient.contact || '',
      },
    });
  } catch (error: any) {
    logger.error('Create payment order error:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment order' });
  }
});

// Verify payment after Razorpay checkout
app.post('/api/payments/verify', authenticateToken, async (req: any, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentId
    } = req.body;

    if (!paymentService.isEnabled()) {
      return res.status(400).json({ error: 'Online payment is not configured' });
    }

    // Verify signature
    const isValid = paymentService.verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      // Update payment as failed
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          gatewayStatus: 'failed',
          gatewayResponse: { error: 'Invalid signature' },
        },
      });
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    // Get payment details from Razorpay
    const paymentDetails = await paymentService.getPaymentDetails(razorpay_payment_id);

    // Update payment record
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        gatewayStatus: 'captured',
        gatewayResponse: paymentDetails as any,
        transactionRef: razorpay_payment_id,
        paidAt: new Date(),
      },
      include: { invoice: { include: { patient: { include: { referralSource: true } } } } },
    });

    // Update invoice
    const invoice = payment.invoice;
    const totalPaid = parseFloat(invoice.paid.toString()) + parseFloat(payment.amount.toString());
    const newBalance = parseFloat(invoice.total.toString()) - totalPaid;

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paid: totalPaid,
        balance: newBalance,
        status: newBalance <= 0 ? 'paid' : 'final',
      },
    });

    // Auto-create commission if applicable
    if (newBalance <= 0 && invoice.patient.referralSourceId && invoice.patient.referralSource) {
      const referralSource = invoice.patient.referralSource;
      const invoiceTotal = parseFloat(invoice.total.toString());
      const commissionAmount = calculateCommission(invoiceTotal, referralSource);

      if (commissionAmount > 0) {
        await prisma.commission.create({
          data: {
            referralSourceId: referralSource.id,
            patientId: invoice.patientId,
            invoiceId: invoice.id,
            invoiceAmount: invoiceTotal,
            commissionType: referralSource.commissionType,
            commissionRate: referralSource.commissionType === 'percentage'
              ? parseFloat(referralSource.commissionValue.toString())
              : null,
            commissionAmount,
            status: 'pending',
          },
        });
      }
    }

    // Send payment receipt notification (async - don't wait)
    const patient = invoice.patient;
    if (patient.contact || patient.email) {
      notificationService.send({
        type: 'PAYMENT_RECEIPT',
        recipientPhone: patient.contact || undefined,
        recipientEmail: patient.email || undefined,
        message: '',
        data: {
          patientName: patient.name,
          amount: payment.amount.toString(),
          receiptNumber: razorpay_payment_id,
          balance: newBalance.toFixed(2),
          paymentMode: 'Online (Razorpay)',
          invoiceNumber: invoice.id.slice(0, 8).toUpperCase(),
          previousBalance: invoice.balance.toString(),
          date: new Date().toLocaleDateString('en-IN'),
          hospitalName: 'Hospital ERP',
        },
      }).catch(err => logger.error('Payment notification failed:', err));
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      payment: {
        id: payment.id,
        amount: payment.amount,
        transactionRef: razorpay_payment_id,
        status: 'captured',
      },
    });
  } catch (error: any) {
    logger.error('Verify payment error:', error);
    res.status(500).json({ error: error.message || 'Payment verification failed' });
  }
});

// Razorpay webhook handler
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const body = req.body.toString();

    // Verify webhook signature
    if (!paymentService.verifyWebhookSignature(body, signature)) {
      logger.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(body);
    const eventType = event.event;
    const payload = event.payload;

    logger.info('Razorpay webhook received:', eventType);

    switch (eventType) {
      case 'payment.captured': {
        const paymentData = payload.payment.entity;

        // Find and update payment by Razorpay order ID
        const payment = await prisma.payment.findFirst({
          where: { razorpayOrderId: paymentData.order_id },
        });

        if (payment && payment.gatewayStatus !== 'captured') {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              razorpayPaymentId: paymentData.id,
              gatewayStatus: 'captured',
              gatewayResponse: paymentData,
              transactionRef: paymentData.id,
              paidAt: new Date(),
            },
          });

          // Update invoice
          const invoice = await prisma.invoice.findUnique({ where: { id: payment.invoiceId } });
          if (invoice) {
            const totalPaid = parseFloat(invoice.paid.toString()) + parseFloat(payment.amount.toString());
            const newBalance = parseFloat(invoice.total.toString()) - totalPaid;
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: {
                paid: totalPaid,
                balance: newBalance,
                status: newBalance <= 0 ? 'paid' : 'final',
              },
            });
          }
        }
        break;
      }

      case 'payment.failed': {
        const paymentData = payload.payment.entity;

        await prisma.payment.updateMany({
          where: { razorpayOrderId: paymentData.order_id },
          data: {
            gatewayStatus: 'failed',
            gatewayResponse: paymentData,
          },
        });
        break;
      }

      case 'refund.created': {
        const refundData = payload.refund.entity;

        await prisma.payment.updateMany({
          where: { razorpayPaymentId: refundData.payment_id },
          data: {
            refundId: refundData.id,
            refundAmount: PaymentService.toRupees(refundData.amount),
            refundedAt: new Date(),
            gatewayStatus: 'refunded',
          },
        });
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Initiate refund
app.post('/api/payments/:id/refund', authenticateToken, requirePermission('billing:refund'), async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    if (!paymentService.isEnabled()) {
      return res.status(400).json({ error: 'Online payment is not configured' });
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { invoice: true },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (!payment.razorpayPaymentId) {
      return res.status(400).json({ error: 'This payment cannot be refunded online' });
    }

    if (payment.gatewayStatus === 'refunded') {
      return res.status(400).json({ error: 'Payment already refunded' });
    }

    const refundAmount = amount
      ? PaymentService.toPaise(parseFloat(amount))
      : undefined;

    const refund = await paymentService.createRefund({
      paymentId: payment.razorpayPaymentId,
      amount: refundAmount,
      notes: { reason: reason || 'Refund requested' },
    });

    // Update payment record
    await prisma.payment.update({
      where: { id },
      data: {
        refundId: refund.id,
        refundAmount: PaymentService.toRupees(refund.amount),
        refundedAt: new Date(),
        gatewayStatus: 'refunded',
      },
    });

    // Update invoice balance
    const invoice = payment.invoice;
    const refundedRupees = PaymentService.toRupees(refund.amount);
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paid: parseFloat(invoice.paid.toString()) - refundedRupees,
        balance: parseFloat(invoice.balance.toString()) + refundedRupees,
        status: 'final',
      },
    });

    res.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refundedRupees,
        status: refund.status,
      },
    });
  } catch (error: any) {
    logger.error('Refund error:', error);
    res.status(500).json({ error: error.message || 'Refund failed' });
  }
});

// ============================================================================
// END PAYMENT GATEWAY ROUTES
// ============================================================================

// Dashboard stats
app.get('/api/dashboard/stats', authenticateToken, async (req: any, res: Response) => {
  try {
    // Generate cache key based on branch and current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = today.toISOString().split('T')[0];

    const cacheKey = redisService.generateKey('dashboard:stats', {
      branchId: req.user.branchId,
      date: dateKey,
    });

    // Try to get from cache first, or fetch from database
    const stats = await redisService.cacheWrapper(
      cacheKey,
      60, // 1 minute TTL
      async () => {
        const [
          todayPatients,
          todayEncounters,
          activeAdmissions,
          todayRevenue,
        ] = await Promise.all([
          prisma.patient.count({
            where: {
              branchId: req.user.branchId,
              createdAt: { gte: today },
            },
          }),
          prisma.encounter.count({
            where: {
              branchId: req.user.branchId,
              visitDate: { gte: today },
            },
          }),
          prisma.admission.count({
            where: {
              status: 'active',
            },
          }),
          prisma.invoice.aggregate({
            where: {
              createdAt: { gte: today },
              status: { in: ['final', 'paid'] },
            },
            _sum: { total: true },
          }),
        ]);

        return {
          todayPatients,
          todayEncounters,
          activeAdmissions,
          todayRevenue: todayRevenue._sum.total || 0,
        };
      }
    );

    res.json(stats);
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// DASHBOARD ANALYTICS APIs
// ============================================

// Revenue analytics - daily/weekly/monthly trends
app.get('/api/analytics/revenue', authenticateToken, requirePermission('dashboard:view'), async (req: any, res: Response) => {
  try {
    const { period = '7d' } = req.query;
    const days = period === '30d' ? 30 : period === '7d' ? 7 : 1;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const payments = await prisma.payment.findMany({
      where: {
        paidAt: { gte: startDate },
        invoice: { patient: { tenantId: req.user.tenantId } },
      },
      select: { paidAt: true, amount: true, mode: true },
    });

    // Group by date
    const dailyRevenue: Record<string, number> = {};
    const byPaymentMode: Record<string, number> = {};

    payments.forEach(p => {
      const dateKey = p.paidAt.toISOString().split('T')[0];
      dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + Number(p.amount);
      byPaymentMode[p.mode] = (byPaymentMode[p.mode] || 0) + Number(p.amount);
    });

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    res.json({
      totalRevenue,
      dailyRevenue: Object.entries(dailyRevenue).map(([date, amount]) => ({ date, amount })),
      byPaymentMode: Object.entries(byPaymentMode).map(([mode, amount]) => ({ mode, amount })),
    });
  } catch (error) {
    logger.error('Revenue analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Patient analytics - registrations, demographics
app.get('/api/analytics/patients', authenticateToken, requirePermission('dashboard:view'), async (req: any, res: Response) => {
  try {
    const { period = '30d' } = req.query;
    const days = period === '30d' ? 30 : period === '7d' ? 7 : 1;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalPatients, newPatients, genderDistribution] = await Promise.all([
      prisma.patient.count({ where: { tenantId: req.user.tenantId } }),
      prisma.patient.count({
        where: { tenantId: req.user.tenantId, createdAt: { gte: startDate } },
      }),
      prisma.patient.groupBy({
        by: ['gender'],
        where: { tenantId: req.user.tenantId },
        _count: { id: true },
      }),
    ]);

    // Daily registrations
    const registrations = await prisma.patient.findMany({
      where: { tenantId: req.user.tenantId, createdAt: { gte: startDate } },
      select: { createdAt: true },
    });

    const dailyRegistrations: Record<string, number> = {};
    registrations.forEach(p => {
      const dateKey = p.createdAt.toISOString().split('T')[0];
      dailyRegistrations[dateKey] = (dailyRegistrations[dateKey] || 0) + 1;
    });

    res.json({
      totalPatients,
      newPatients,
      genderDistribution: genderDistribution.map(g => ({ gender: g.gender || 'Unknown', count: g._count.id })),
      dailyRegistrations: Object.entries(dailyRegistrations).map(([date, count]) => ({ date, count })),
    });
  } catch (error) {
    logger.error('Patient analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Appointment analytics
app.get('/api/analytics/appointments', authenticateToken, requirePermission('dashboard:view'), async (req: any, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    const [todayAppointments, weekAppointments, statusDistribution, departmentDistribution] = await Promise.all([
      prisma.appointment.count({
        where: { tenantId: req.user.tenantId, appointmentDate: { gte: today } },
      }),
      prisma.appointment.count({
        where: { tenantId: req.user.tenantId, appointmentDate: { gte: weekStart } },
      }),
      prisma.appointment.groupBy({
        by: ['status'],
        where: { tenantId: req.user.tenantId, appointmentDate: { gte: weekStart } },
        _count: { id: true },
      }),
      prisma.appointment.groupBy({
        by: ['department'],
        where: { tenantId: req.user.tenantId, appointmentDate: { gte: weekStart } },
        _count: { id: true },
      }),
    ]);

    res.json({
      todayAppointments,
      weekAppointments,
      statusDistribution: statusDistribution.map(s => ({ status: s.status, count: s._count.id })),
      departmentDistribution: departmentDistribution.map(d => ({ department: d.department || 'General', count: d._count.id })),
    });
  } catch (error) {
    logger.error('Appointment analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lab analytics
app.get('/api/analytics/lab', authenticateToken, requirePermission('dashboard:view'), async (req: any, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingOrders, completedToday, statusDistribution] = await Promise.all([
      prisma.order.count({
        where: { orderType: 'lab', status: { in: ['pending', 'in_progress'] } },
      }),
      prisma.order.count({
        where: { orderType: 'lab', status: 'completed', updatedAt: { gte: today } },
      }),
      prisma.order.groupBy({
        by: ['status'],
        where: { orderType: 'lab' },
        _count: { id: true },
      }),
    ]);

    res.json({
      pendingOrders,
      completedToday,
      statusDistribution: statusDistribution.map(s => ({ status: s.status, count: s._count.id })),
    });
  } catch (error) {
    logger.error('Lab analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// IPD analytics
app.get('/api/analytics/ipd', authenticateToken, requirePermission('dashboard:view'), async (req: any, res: Response) => {
  try {
    const [activeAdmissions, totalBeds, occupiedBeds] = await Promise.all([
      prisma.admission.count({ where: { status: 'active' } }),
      prisma.bed.count(),
      prisma.bed.count({ where: { status: 'occupied' } }),
    ]);

    const occupancyRate = totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : 0;

    res.json({
      activeAdmissions,
      totalBeds,
      occupiedBeds,
      availableBeds: totalBeds - occupiedBeds,
      occupancyRate,
    });
  } catch (error) {
    logger.error('IPD analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// BROKER/REFERRAL COMMISSION SYSTEM APIs
// ===========================

// Get all referral sources
app.get('/api/referral-sources', authenticateToken, async (req: any, res: Response) => {
  try {
    const { type, search } = req.query;
    const where: any = { tenantId: req.user.tenantId };

    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { contact: { contains: search, mode: 'insensitive' } },
      ];
    }

    const sources = await prisma.referralSource.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { patients: true, commissions: true }
        }
      }
    });

    res.json(sources);
  } catch (error) {
    logger.error('Get referral sources error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create referral source
app.post('/api/referral-sources', authenticateToken, validateBody(referralSourceSchema), async (req: any, res: Response) => {
  try {
    const source = await prisma.referralSource.create({
      data: {
        tenantId: req.user.tenantId,
        ...req.body,
      },
    });

    res.status(201).json(source);
  } catch (error) {
    logger.error('Create referral source error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update referral source
app.put('/api/referral-sources/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const source = await prisma.referralSource.update({
      where: { id },
      data: req.body,
    });

    res.json(source);
  } catch (error) {
    logger.error('Update referral source error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate commission for an invoice
const calculateCommission = (invoiceAmount: number, source: any) => {
  if (source.commissionType === 'percentage') {
    return (invoiceAmount * parseFloat(source.commissionValue)) / 100;
  } else if (source.commissionType === 'fixed') {
    return parseFloat(source.commissionValue);
  } else if (source.commissionType === 'tiered' && source.commissionTiers) {
    const tier = source.commissionTiers.find((t: any) =>
      invoiceAmount >= t.min && (t.max === null || invoiceAmount < t.max)
    );
    if (tier) {
      return (invoiceAmount * tier.value) / 100;
    }
  }
  return 0;
};

// Get commissions
app.get('/api/commissions', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status, referralSourceId, fromDate, toDate } = req.query;
    const where: any = {};

    if (status) where.status = status;
    if (referralSourceId) where.referralSourceId = referralSourceId;
    if (fromDate) where.createdAt = { ...where.createdAt, gte: new Date(fromDate as string) };
    if (toDate) where.createdAt = { ...where.createdAt, lte: new Date(toDate as string) };

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        referralSource: { select: { name: true, code: true } },
        patient: { select: { name: true, mrn: true } },
        invoice: { select: { id: true, total: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(commissions);
  } catch (error) {
    logger.error('Get commissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve commission
app.post('/api/commissions/:id/approve', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const commission = await prisma.commission.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: req.user.userId,
        approvedAt: new Date(),
      },
    });

    res.json(commission);
  } catch (error) {
    logger.error('Approve commission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create commission payout
app.post('/api/commission-payouts', authenticateToken, async (req: any, res: Response) => {
  try {
    const { referralSourceId, fromDate, toDate, paymentMode, paymentReference, remarks } = req.body;

    // Get approved commissions for this source in date range
    const commissions = await prisma.commission.findMany({
      where: {
        referralSourceId,
        status: 'approved',
        createdAt: {
          gte: new Date(fromDate),
          lte: new Date(toDate),
        },
      },
    });

    if (commissions.length === 0) {
      return res.status(400).json({ error: 'No approved commissions found for payout' });
    }

    const totalAmount = commissions.reduce((sum, c) => sum + parseFloat(c.commissionAmount.toString()), 0);

    // Generate payout number
    const lastPayout = await prisma.commissionPayout.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    const payoutNumber = `CPAY${(lastPayout ? parseInt(lastPayout.payoutNumber.slice(4)) + 1 : 1).toString().padStart(6, '0')}`;

    // Create payout
    const payout = await prisma.commissionPayout.create({
      data: {
        referralSourceId,
        payoutNumber,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        totalAmount,
        paymentMode,
        paymentReference,
        paidBy: req.user.userId,
        remarks,
      },
    });

    // Update commissions
    await prisma.commission.updateMany({
      where: { id: { in: commissions.map(c => c.id) } },
      data: {
        status: 'paid',
        paidAt: new Date(),
        payoutId: payout.id,
      },
    });

    res.status(201).json(payout);
  } catch (error) {
    logger.error('Create commission payout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get commission payouts
app.get('/api/commission-payouts', authenticateToken, async (req: any, res: Response) => {
  try {
    const { referralSourceId, status } = req.query;
    const where: any = {};

    if (referralSourceId) where.referralSourceId = referralSourceId;
    if (status) where.status = status;

    const payouts = await prisma.commissionPayout.findMany({
      where,
      include: {
        referralSource: { select: { name: true, code: true } },
        commissions: { select: { commissionAmount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(payouts);
  } catch (error) {
    logger.error('Get commission payouts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Commission summary by referral source
app.get('/api/commissions/summary', authenticateToken, async (req: any, res: Response) => {
  try {
    const summary = await prisma.commission.groupBy({
      by: ['referralSourceId', 'status'],
      _sum: { commissionAmount: true },
      _count: true,
    });

    const sources = await prisma.referralSource.findMany({
      where: { id: { in: summary.map(s => s.referralSourceId) } },
      select: { id: true, name: true, code: true },
    });

    const result = sources.map(source => {
      const sourceSummary = summary.filter(s => s.referralSourceId === source.id);
      return {
        ...source,
        pending: sourceSummary.find(s => s.status === 'pending')?._sum.commissionAmount || 0,
        approved: sourceSummary.find(s => s.status === 'approved')?._sum.commissionAmount || 0,
        paid: sourceSummary.find(s => s.status === 'paid')?._sum.commissionAmount || 0,
        totalCount: sourceSummary.reduce((sum, s) => sum + s._count, 0),
      };
    });

    res.json(result);
  } catch (error) {
    logger.error('Get commission summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// ACCOUNTS SYSTEM APIs
// ===========================

// Get account heads (Chart of Accounts)
app.get('/api/account-heads', authenticateToken, async (req: any, res: Response) => {
  try {
    const { type, search } = req.query;
    const where: any = { tenantId: req.user.tenantId };

    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const accounts = await prisma.accountHead.findMany({
      where,
      include: { group: { select: { name: true, type: true } } },
      orderBy: { code: 'asc' },
    });

    res.json(accounts);
  } catch (error) {
    logger.error('Get account heads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create account head
app.post('/api/account-heads', authenticateToken, async (req: any, res: Response) => {
  try {
    const account = await prisma.accountHead.create({
      data: {
        tenantId: req.user.tenantId,
        ...req.body,
      },
    });

    res.status(201).json(account);
  } catch (error) {
    logger.error('Create account head error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get journal entries
app.get('/api/journal-entries', authenticateToken, async (req: any, res: Response) => {
  try {
    const { fromDate, toDate, entryType } = req.query;
    const where: any = { tenantId: req.user.tenantId };

    if (entryType) where.entryType = entryType;
    if (fromDate) where.entryDate = { ...where.entryDate, gte: new Date(fromDate as string) };
    if (toDate) where.entryDate = { ...where.entryDate, lte: new Date(toDate as string) };

    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            accountHead: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { entryDate: 'desc' },
    });

    res.json(entries);
  } catch (error) {
    logger.error('Get journal entries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create journal entry
app.post('/api/journal-entries', authenticateToken, validateBody(journalEntrySchema), async (req: any, res: Response) => {
  try {
    const { description, lines, fiscalYearId } = req.body;

    // Validate debit = credit
    const totalDebit = lines.reduce((sum: number, line: any) => sum + parseFloat(line.debitAmount || 0), 0);
    const totalCredit = lines.reduce((sum: number, line: any) => sum + parseFloat(line.creditAmount || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({ error: 'Total debit must equal total credit' });
    }

    // Generate entry number
    const lastEntry = await prisma.journalEntry.findFirst({
      where: { tenantId: req.user.tenantId },
      orderBy: { createdAt: 'desc' },
    });
    const entryNumber = `JV${(lastEntry ? parseInt(lastEntry.entryNumber.slice(2)) + 1 : 1).toString().padStart(6, '0')}`;

    const entry = await prisma.journalEntry.create({
      data: {
        tenantId: req.user.tenantId,
        fiscalYearId,
        entryNumber,
        description,
        entryType: 'manual',
        totalDebit,
        totalCredit,
        createdBy: req.user.userId,
        lines: {
          create: lines.map((line: any) => ({
            accountHeadId: line.accountHeadId,
            description: line.description,
            debitAmount: parseFloat(line.debitAmount || 0),
            creditAmount: parseFloat(line.creditAmount || 0),
          })),
        },
      },
      include: {
        lines: {
          include: {
            accountHead: { select: { name: true, code: true } },
          },
        },
      },
    });

    res.status(201).json(entry);
  } catch (error) {
    logger.error('Create journal entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get ledger for an account
app.get('/api/ledger/:accountHeadId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { accountHeadId } = req.params;
    const { fromDate, toDate } = req.query;

    const where: any = {
      tenantId: req.user.tenantId,
      accountHeadId,
    };

    if (fromDate) where.entryDate = { ...where.entryDate, gte: new Date(fromDate as string) };
    if (toDate) where.entryDate = { ...where.entryDate, lte: new Date(toDate as string) };

    const ledger = await prisma.ledgerEntry.findMany({
      where,
      include: {
        journalEntry: { select: { entryNumber: true, description: true } },
      },
      orderBy: { entryDate: 'asc' },
    });

    res.json(ledger);
  } catch (error) {
    logger.error('Get ledger error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Trial balance
app.get('/api/trial-balance', authenticateToken, async (req: any, res: Response) => {
  try {
    const accounts = await prisma.accountHead.findMany({
      where: { tenantId: req.user.tenantId },
      select: { id: true, name: true, code: true, type: true, currentBalance: true },
      orderBy: { code: 'asc' },
    });

    const trialBalance = accounts.map(account => ({
      ...account,
      debit: ['asset', 'expense'].includes(account.type) ? account.currentBalance : 0,
      credit: ['liability', 'equity', 'income'].includes(account.type) ? account.currentBalance : 0,
    }));

    const totalDebit = trialBalance.reduce((sum, acc) => sum + parseFloat(acc.debit.toString()), 0);
    const totalCredit = trialBalance.reduce((sum, acc) => sum + parseFloat(acc.credit.toString()), 0);

    res.json({ accounts: trialBalance, totalDebit, totalCredit });
  } catch (error) {
    logger.error('Get trial balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// DOCTOR REVENUE SHARING APIs
// ===========================

// Get doctor contracts
app.get('/api/doctor-contracts', authenticateToken, async (req: any, res: Response) => {
  try {
    const contracts = await prisma.doctorContract.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json(contracts);
  } catch (error) {
    logger.error('Get doctor contracts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create doctor contract
app.post('/api/doctor-contracts', authenticateToken, async (req: any, res: Response) => {
  try {
    const contract = await prisma.doctorContract.create({
      data: req.body,
    });

    res.status(201).json(contract);
  } catch (error) {
    logger.error('Create doctor contract error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get doctor revenues
app.get('/api/doctor-revenues', authenticateToken, async (req: any, res: Response) => {
  try {
    const { doctorId, status, fromDate, toDate } = req.query;
    const where: any = {};

    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;
    if (fromDate) where.createdAt = { ...where.createdAt, gte: new Date(fromDate as string) };
    if (toDate) where.createdAt = { ...where.createdAt, lte: new Date(toDate as string) };

    const revenues = await prisma.doctorRevenue.findMany({
      where,
      include: {
        contract: { select: { contractNumber: true } },
        invoice: { select: { id: true, total: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(revenues);
  } catch (error) {
    logger.error('Get doctor revenues error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create doctor payout
app.post('/api/doctor-payouts', authenticateToken, async (req: any, res: Response) => {
  try {
    const { contractId, doctorId, fromDate, toDate, paymentMode, paymentReference, deductions, remarks } = req.body;

    // Get approved revenues
    const revenues = await prisma.doctorRevenue.findMany({
      where: {
        doctorId,
        contractId,
        status: 'approved',
        createdAt: {
          gte: new Date(fromDate),
          lte: new Date(toDate),
        },
      },
    });

    if (revenues.length === 0) {
      return res.status(400).json({ error: 'No approved revenues found for payout' });
    }

    const totalRevenue = revenues.reduce((sum, r) => sum + parseFloat(r.revenueAmount.toString()), 0);
    const totalShare = revenues.reduce((sum, r) => sum + parseFloat(r.shareAmount.toString()), 0);
    const netAmount = totalShare - parseFloat(deductions || 0);

    // Generate payout number
    const lastPayout = await prisma.doctorPayout.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    const payoutNumber = `DPAY${(lastPayout ? parseInt(lastPayout.payoutNumber.slice(4)) + 1 : 1).toString().padStart(6, '0')}`;

    const payout = await prisma.doctorPayout.create({
      data: {
        contractId,
        doctorId,
        payoutNumber,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        totalRevenue,
        totalShare,
        deductions: parseFloat(deductions || 0),
        netAmount,
        paymentMode,
        paymentReference,
        paidBy: req.user.userId,
        remarks,
      },
    });

    // Update revenues
    await prisma.doctorRevenue.updateMany({
      where: { id: { in: revenues.map(r => r.id) } },
      data: {
        status: 'paid',
        paidAt: new Date(),
        payoutId: payout.id,
      },
    });

    res.status(201).json(payout);
  } catch (error) {
    logger.error('Create doctor payout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get doctor payouts
app.get('/api/doctor-payouts', authenticateToken, async (req: any, res: Response) => {
  try {
    const { doctorId, contractId, status } = req.query;
    const where: any = {};

    if (doctorId) where.doctorId = doctorId;
    if (contractId) where.contractId = contractId;
    if (status) where.status = status;

    const payouts = await prisma.doctorPayout.findMany({
      where,
      include: {
        contract: { select: { contractNumber: true } },
        revenues: { select: { shareAmount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(payouts);
  } catch (error) {
    logger.error('Get doctor payouts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// MASTER DATA APIs
// ===========================

// Drugs
app.get('/api/drugs', authenticateToken, async (req: any, res: Response) => {
  try {
    const { search } = req.query;
    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { genericName: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const drugs = await prisma.drug.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        stocks: {
          select: {
            id: true,
            batchNumber: true,
            expiryDate: true,
            quantity: true,
          },
        },
      },
    });

    res.json(drugs.map(drug => ({
      id: drug.id,
      name: drug.name,
      genericName: drug.genericName,
      form: drug.form,
      dosageForm: drug.form,
      strength: drug.strength,
      category: drug.category,
      isNarcotic: drug.isNarcotic,
      price: Number(drug.price),
      unitPrice: Number(drug.price),
      isActive: drug.isActive,
      code: drug.code,
      reorderLevel: drug.reorderLevel,
      stockQuantity: drug.stockQuantity,
      stocks: drug.stocks,
    })));
  } catch (error) {
    logger.error('Get drugs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/drugs', authenticateToken, validateBody(drugMasterSchema), async (req: any, res: Response) => {
  try {
    const drug = await prisma.drug.create({ data: req.body });

    // Invalidate drugs cache
    await redisService.del('master:drugs');

    res.status(201).json(drug);
  } catch (error) {
    logger.error('Create drug error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/drugs/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const drug = await prisma.drug.update({ where: { id }, data: req.body });

    // Invalidate drugs cache
    await redisService.del('master:drugs');

    res.json(drug);
  } catch (error) {
    logger.error('Update drug error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lab Tests
app.get('/api/lab-tests', authenticateToken, async (req: any, res: Response) => {
  try {
    const { search, category } = req.query;
    const where: any = { isActive: true };

    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const tests = await prisma.labTestMaster.findMany({ where, orderBy: { name: 'asc' } });
    res.json(tests);
  } catch (error) {
    logger.error('Get lab tests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/lab-tests', authenticateToken, validateBody(labTestMasterSchema), async (req: any, res: Response) => {
  try {
    const test = await prisma.labTestMaster.create({ data: req.body });

    // Invalidate lab tests cache
    await redisService.del('master:lab-tests');

    res.status(201).json(test);
  } catch (error) {
    logger.error('Create lab test error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Radiology Tests
app.get('/api/radiology-tests', authenticateToken, async (req: any, res: Response) => {
  try {
    const { search, modality } = req.query;
    const where: any = { isActive: true };

    if (modality) where.modality = modality;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const tests = await prisma.radiologyTestMaster.findMany({ where, orderBy: { name: 'asc' } });
    res.json(tests);
  } catch (error) {
    logger.error('Get radiology tests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/radiology-tests', authenticateToken, async (req: any, res: Response) => {
  try {
    const test = await prisma.radiologyTestMaster.create({ data: req.body });
    res.status(201).json(test);
  } catch (error) {
    logger.error('Create radiology test error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Procedures
app.get('/api/procedures', authenticateToken, async (req: any, res: Response) => {
  try {
    const { search } = req.query;
    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const procedures = await prisma.procedureMaster.findMany({ where, orderBy: { name: 'asc' } });
    res.json(procedures);
  } catch (error) {
    logger.error('Get procedures error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Packages
app.get('/api/packages', authenticateToken, async (req: any, res: Response) => {
  try {
    const packages = await prisma.packageMaster.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(packages);
  } catch (error) {
    logger.error('Get packages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Wards
app.get('/api/wards', authenticateToken, async (req: any, res: Response) => {
  try {
    const wards = await prisma.ward.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(wards);
  } catch (error) {
    logger.error('Get wards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// APPOINTMENT APIs
// ===========================

app.get('/api/appointments', authenticateToken, async (req: any, res: Response) => {
  try {
    const { date, patientId, doctorId, status } = req.query;

    // Generate cache key based on query parameters
    const cacheKey = redisService.generateKey('appointments', {
      tenantId: req.user.tenantId,
      date: date || '',
      patientId: patientId || '',
      doctorId: doctorId || '',
      status: status || '',
    });

    // Try to get from cache first, or fetch from database
    const appointments = await redisService.cacheWrapper(
      cacheKey,
      120, // 2 minutes TTL
      async () => {
        const where: any = { tenantId: req.user.tenantId };

        if (date) {
          const startDate = new Date(date as string);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
          where.appointmentDate = { gte: startDate, lt: endDate };
        }
        if (patientId) where.patientId = patientId;
        if (doctorId) where.doctorId = doctorId;
        if (status) where.status = status;

        return await prisma.appointment.findMany({
          where,
          include: {
            patient: { select: { id: true, name: true, mrn: true, contact: true } },
            doctor: { select: { id: true, name: true } },
          },
          orderBy: [{ appointmentDate: 'asc' }, { appointmentTime: 'asc' }],
        });
      }
    );

    res.json(appointments);
  } catch (error) {
    logger.error('Get appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/appointments', authenticateToken, validateBody(createAppointmentSchema), async (req: any, res: Response) => {
  try {
    const { patientId, doctorId, appointmentDate, appointmentTime, type, reason, notes, department } = req.body;

    if (!patientId || !doctorId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const appointment = await prisma.appointment.create({
      data: {
        tenantId: req.user.tenantId,
        patientId,
        doctorId,
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        type: type || 'consultation',
        status: 'scheduled',
        reason,
        notes,
        department,
        createdBy: req.user.userId,
      },
      include: {
        patient: { select: { id: true, name: true, mrn: true, contact: true, email: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    // Invalidate appointments cache for this tenant
    await redisService.deletePattern(`appointments:*tenantId:${req.user.tenantId}*`);

    // Send appointment confirmation notification (async - don't wait)
    if (appointment.patient.contact || appointment.patient.email) {
      notificationService.send({
        type: 'APPOINTMENT_CONFIRMATION',
        recipientPhone: appointment.patient.contact || undefined,
        recipientEmail: appointment.patient.email || undefined,
        message: '',
        data: {
          patientName: appointment.patient.name,
          doctorName: appointment.doctor.name,
          date: new Date(appointmentDate).toLocaleDateString('en-IN'),
          time: appointmentTime,
          department: department || 'General',
          appointmentId: appointment.id.slice(0, 8).toUpperCase(),
          hospitalName: 'Hospital ERP',
          hospitalAddress: 'Hospital Address',
          contactNumber: '+91-XXXXXXXXXX',
        },
      }).catch(err => logger.error('Notification failed:', err));
    }

    res.status(201).json(appointment);
  } catch (error) {
    logger.error('Create appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/appointments/:id', authenticateToken, validateBody(updateAppointmentSchema), async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { appointmentDate, appointmentTime, type, reason, notes, status, department } = req.body;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(appointmentDate && { appointmentDate: new Date(appointmentDate) }),
        ...(appointmentTime && { appointmentTime }),
        ...(type && { type }),
        ...(reason !== undefined && { reason }),
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
        ...(department !== undefined && { department }),
      },
      include: {
        patient: { select: { id: true, name: true, mrn: true, contact: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    // Invalidate appointments cache for this tenant
    await redisService.deletePattern(`appointments:*tenantId:${req.user.tenantId}*`);

    res.json(appointment);
  } catch (error) {
    logger.error('Update appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/appointments/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.appointment.delete({ where: { id } });

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    logger.error('Delete appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DEPRECATED: Old check-in endpoint (replaced by OPD workflow routes)
// app.post('/api/appointments/:id/check-in', authenticateToken, async (req: any, res: Response) => {
//   try {
//     const { id } = req.params;
//
//     const appointment = await prisma.appointment.update({
//       where: { id },
//       data: { status: 'checked-in' },
//       include: {
//         patient: { select: { id: true, name: true, mrn: true, contact: true } },
//         doctor: { select: { id: true, name: true } },
//       },
//     });
//
//     res.json(appointment);
//   } catch (error) {
//     logger.error('Check-in appointment error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

app.post('/api/appointments/:id/cancel', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status: 'cancelled' },
      include: {
        patient: { select: { id: true, name: true, mrn: true, contact: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    // Invalidate appointments cache for this tenant
    await redisService.deletePattern(`appointments:*tenantId:${req.user.tenantId}*`);

    res.json(appointment);
  } catch (error) {
    logger.error('Cancel appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// APPOINTMENT AVAILABILITY & CONFLICT CHECKING
// ============================================

// Get doctor availability for a specific date
app.get('/api/appointments/availability', authenticateToken, async (req: any, res: Response) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({ error: 'Doctor ID and date are required' });
    }

    const requestedDate = new Date(date as string);
    requestedDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(requestedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get doctor's info (doctors are User records with doctorContract for fee info)
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId as string },
      select: {
        id: true,
        name: true,
        departmentIds: true,
      },
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Get consultation fee from doctor contract if available
    const doctorContract = await prisma.doctorContract.findUnique({
      where: { doctorId: doctorId as string },
      select: { consultationFeeShare: true },
    });
    const consultationFee = doctorContract?.consultationFeeShare || 500;

    // Get existing appointments for this doctor on the date
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctorId as string,
        appointmentDate: { gte: requestedDate, lt: nextDay },
        status: { notIn: ['cancelled', 'no_show'] },
      },
      select: { appointmentTime: true, status: true },
    });

    // Default time slots (9 AM to 5 PM, 30-minute intervals)
    const defaultSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
      '16:00', '16:30', '17:00'
    ];

    // Use default slots - can be customized based on schedule settings
    let availableSlots = defaultSlots;

    // Mark booked slots
    const bookedTimes = existingAppointments.map(apt => apt.appointmentTime);
    const slots = availableSlots.map(time => ({
      time,
      isAvailable: !bookedTimes.includes(time),
      status: bookedTimes.includes(time) ? 'booked' : 'available',
    }));

    res.json({
      doctorId: doctor.id,
      doctorName: doctor.name,
      department: doctor.departmentIds?.[0] || 'General',
      consultationFee: Number(consultationFee),
      date: requestedDate.toISOString().split('T')[0],
      isAvailable: slots.some(s => s.isAvailable),
      totalSlots: slots.length,
      availableSlots: slots.filter(s => s.isAvailable).length,
      bookedSlots: slots.filter(s => !s.isAvailable).length,
      slots,
    });
  } catch (error) {
    logger.error('Get appointment availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check for appointment conflicts before booking
app.post('/api/appointments/check-conflict', authenticateToken, async (req: any, res: Response) => {
  try {
    const { doctorId, patientId, date, time } = req.body;

    if (!doctorId || !date || !time) {
      return res.status(400).json({ error: 'Doctor ID, date, and time are required' });
    }

    const requestedDate = new Date(date);
    requestedDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(requestedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const conflicts: any[] = [];

    // Check if doctor already has an appointment at this time
    const doctorConflict = await prisma.appointment.findFirst({
      where: {
        doctorId,
        appointmentDate: { gte: requestedDate, lt: nextDay },
        appointmentTime: time,
        status: { notIn: ['cancelled', 'no_show'] },
      },
      include: {
        patient: { select: { name: true, mrn: true } },
      },
    });

    if (doctorConflict) {
      conflicts.push({
        type: 'doctor_busy',
        message: `Doctor already has an appointment at ${time} with ${doctorConflict.patient.name} (${doctorConflict.patient.mrn})`,
        existingAppointment: {
          id: doctorConflict.id,
          patientName: doctorConflict.patient.name,
          time: doctorConflict.appointmentTime,
        },
      });
    }

    // Check if patient already has an appointment at this time (with any doctor)
    if (patientId) {
      const patientConflict = await prisma.appointment.findFirst({
        where: {
          patientId,
          appointmentDate: { gte: requestedDate, lt: nextDay },
          appointmentTime: time,
          status: { notIn: ['cancelled', 'no_show'] },
        },
        include: {
          doctor: { select: { name: true } },
        },
      });

      if (patientConflict) {
        conflicts.push({
          type: 'patient_busy',
          message: `Patient already has an appointment at ${time} with Dr. ${patientConflict.doctor?.name || 'Unknown'}`,
          existingAppointment: {
            id: patientConflict.id,
            doctorName: patientConflict.doctor?.name,
            time: patientConflict.appointmentTime,
          },
        });
      }

      // Check if patient already has an appointment with this doctor on the same day
      const duplicateAppointment = await prisma.appointment.findFirst({
        where: {
          patientId,
          doctorId,
          appointmentDate: { gte: requestedDate, lt: nextDay },
          status: { notIn: ['cancelled', 'no_show'] },
        },
      });

      if (duplicateAppointment) {
        conflicts.push({
          type: 'duplicate_appointment',
          message: `Patient already has an appointment with this doctor on the same day at ${duplicateAppointment.appointmentTime}`,
          existingAppointment: {
            id: duplicateAppointment.id,
            time: duplicateAppointment.appointmentTime,
          },
        });
      }
    }

    res.json({
      hasConflicts: conflicts.length > 0,
      conflicts,
      canProceed: conflicts.length === 0,
      message: conflicts.length === 0 ? 'No conflicts found. Appointment can be booked.' : 'Conflicts detected. Please resolve before booking.',
    });
  } catch (error) {
    logger.error('Check appointment conflict error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all available doctors on a specific date
app.get('/api/appointments/available-doctors', authenticateToken, async (req: any, res: Response) => {
  try {
    const { date, department, time } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const requestedDate = new Date(date as string);
    requestedDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(requestedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get all active users who have appointments (doctors)
    const whereDoctor: any = {
      isActive: true,
      tenantId: req.user.tenantId,
      roleIds: { has: 'DOCTOR' }, // Users with DOCTOR role
    };
    if (department) whereDoctor.departmentIds = { has: department };

    const doctors = await prisma.user.findMany({
      where: whereDoctor,
      select: {
        id: true,
        name: true,
        departmentIds: true,
      },
    });

    // Get all appointments for the date
    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: { in: doctors.map((d: { id: string }) => d.id) },
        appointmentDate: { gte: requestedDate, lt: nextDay },
        status: { notIn: ['cancelled', 'no_show'] },
      },
      select: { doctorId: true, appointmentTime: true },
    });

    // Calculate availability for each doctor
    const availableDoctors = doctors.map((doctor: { id: string; name: string; departmentIds: string[] }) => {
      const doctorAppointments = appointments.filter(a => a.doctorId === doctor.id);
      const bookedTimes = doctorAppointments.map(a => a.appointmentTime);

      // Default time slots
      const defaultSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00'
      ];

      const availableSlots = defaultSlots.filter(slot => !bookedTimes.includes(slot));

      // If specific time is requested, check if doctor is available at that time
      const isAvailableAtRequestedTime = time ? !bookedTimes.includes(time as string) : true;

      return {
        id: doctor.id,
        name: doctor.name,
        department: doctor.departmentIds?.[0] || 'General',
        consultationFee: 500, // Default fee
        totalSlots: defaultSlots.length,
        availableSlots: availableSlots.length,
        isAvailable: availableSlots.length > 0,
        isAvailableAtRequestedTime,
        nextAvailableSlot: availableSlots[0] || null,
      };
    }).filter((d: { isAvailable: boolean }) => d.isAvailable);

    res.json({
      date: requestedDate.toISOString().split('T')[0],
      department: department || 'All',
      totalDoctors: doctors.length,
      availableDoctors: availableDoctors.length,
      doctors: availableDoctors,
    });
  } catch (error) {
    logger.error('Get available doctors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send manual reminder for an appointment
app.post('/api/appointments/:id/send-reminder', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    // Import reminder service dynamically
    const { reminderService } = await import('./services/reminder');

    const result = await reminderService.sendManualReminder(id, req.user.tenantId);

    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    logger.error('Send reminder error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get reminder status for an appointment
app.get('/api/appointments/:id/reminder-status', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const { reminderService } = await import('./services/reminder');
    const status = await reminderService.getReminderStatus(id);

    res.json(status);
  } catch (error) {
    logger.error('Get reminder status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// QUEUE MANAGEMENT APIs
// ============================================

// DEPRECATED: Old OPD queue endpoint (replaced by OPD workflow routes /api/opd/queue)
// Get OPD queue for a department/doctor
// app.get('/api/queue/opd', authenticateToken, async (req: any, res: Response) => {
//   try {
//     const { department, doctorId } = req.query;
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//
//     const where: any = {
//       tenantId: req.user.tenantId,
//       appointmentDate: { gte: today },
//       status: { in: ['confirmed', 'checked_in', 'in_progress'] },
//     };
//
//     if (department) where.department = department;
//     if (doctorId) where.doctorId = doctorId;
//
//     const appointments = await prisma.appointment.findMany({
//       where,
//       include: {
//         patient: { select: { id: true, name: true, mrn: true, contact: true } },
//         doctor: { select: { name: true } },
//       },
//       orderBy: [
//         { status: 'asc' }, // checked_in first
//         { appointmentTime: 'asc' },
//       ],
//     });
//
//     // Calculate queue position and estimated wait time
//     const queue = appointments.map((apt, index) => ({
//       ...apt,
//       queuePosition: index + 1,
//       tokenNumber: `${(apt.department || 'GEN').slice(0, 3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
//       estimatedWaitMinutes: index * 15, // Assume 15 min per patient
//     }));
//
//     res.json(queue);
//   } catch (error) {
//     logger.error('Get OPD queue error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// Check-in patient for appointment
app.post('/api/queue/check-in/:appointmentId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId: req.user.tenantId },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointment.status !== 'confirmed' && appointment.status !== 'scheduled') {
      return res.status(400).json({ error: 'Appointment cannot be checked in' });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'checked_in',
        notes: appointment.notes ? `${appointment.notes}\nChecked in at ${new Date().toLocaleTimeString()}` : `Checked in at ${new Date().toLocaleTimeString()}`,
      },
      include: {
        patient: { select: { name: true, mrn: true } },
      },
    });

    res.json({ message: 'Patient checked in successfully', appointment: updated });
  } catch (error) {
    logger.error('Check-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Call next patient (mark as in_progress)
app.post('/api/queue/call-next/:appointmentId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'in_progress' },
      include: {
        patient: { select: { name: true, mrn: true, contact: true } },
      },
    });

    res.json({ message: 'Patient called', appointment });
  } catch (error) {
    logger.error('Call next error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get queue display (public display screen - requires tenantId for isolation)
app.get('/api/queue/display/:department', async (req: Request, res: Response) => {
  try {
    const { department } = req.params;
    const { tenantId } = req.query;

    // Require tenantId for tenant isolation on public displays
    if (!tenantId || typeof tenantId !== 'string') {
      return res.status(400).json({ error: 'tenantId query parameter is required' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointments = await prisma.appointment.findMany({
      where: {
        department,
        tenantId, // Tenant isolation
        appointmentDate: { gte: today },
        status: { in: ['checked_in', 'in_progress'] },
      },
      include: {
        patient: { select: { name: true } },
        doctor: { select: { name: true } },
      },
      orderBy: { appointmentTime: 'asc' },
      take: 10,
    });

    const display = {
      department,
      currentlyServing: appointments.find(a => a.status === 'in_progress'),
      waiting: appointments.filter(a => a.status === 'checked_in').map((apt, i) => ({
        tokenNumber: `${department.slice(0, 3).toUpperCase()}-${String(i + 2).padStart(3, '0')}`,
        patientName: apt.patient.name.split(' ')[0], // First name only for privacy
        doctorName: apt.doctor.name,
      })),
      timestamp: new Date(),
    };

    res.json(display);
  } catch (error) {
    logger.error('Get queue display error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lab sample collection queue
app.get('/api/queue/lab', authenticateToken, async (req: any, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        orderType: 'lab',
        status: { in: ['pending', 'sample_collected'] },
        createdAt: { gte: today },
      },
      include: {
        patient: { select: { name: true, mrn: true } },
      },
      orderBy: [
        { priority: 'desc' }, // STAT first
        { createdAt: 'asc' },
      ],
    });

    const queue = orders.map((order, index) => ({
      ...order,
      queuePosition: index + 1,
      tokenNumber: `LAB-${String(index + 1).padStart(3, '0')}`,
    }));

    res.json(queue);
  } catch (error) {
    logger.error('Get lab queue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pharmacy dispensing queue
app.get('/api/queue/pharmacy', authenticateToken, async (req: any, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const prescriptions = await prisma.prescription.findMany({
      where: {
        createdAt: { gte: today },
      },
      include: {
        opdNote: {
          include: {
            patient: { select: { name: true, mrn: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const queue = prescriptions.map((rx: any, index) => ({
      id: rx.id,
      queuePosition: index + 1,
      tokenNumber: `PHR-${String(index + 1).padStart(3, '0')}`,
      patientName: rx.opdNote?.patient?.name || 'Unknown',
      patientMRN: rx.opdNote?.patient?.mrn || 'N/A',
      status: 'pending',
      createdAt: rx.createdAt,
    }));

    res.json(queue);
  } catch (error) {
    logger.error('Get pharmacy queue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// DOCUMENT UPLOAD APIs
// ============================================

// Upload patient document
app.post('/api/documents/patient/:patientId', authenticateToken, requirePermission('patients:edit'), documentUpload.single('file'), async (req: any, res: Response) => {
  try {
    const { patientId } = req.params;
    const { category, description } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify patient exists and belongs to tenant
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, tenantId: req.user.tenantId },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Store document metadata in database
    const document = await prisma.document.create({
      data: {
        tenantId: req.user.tenantId,
        patientId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        category: category || 'other',
        description,
        uploadedBy: req.user.userId,
        path: file.path,
      },
    });

    res.status(201).json(document);
  } catch (error) {
    logger.error('Document upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Get patient documents
app.get('/api/documents/patient/:patientId', authenticateToken, requirePermission('patients:view'), async (req: any, res: Response) => {
  try {
    const { patientId } = req.params;
    const { category } = req.query;

    // Verify patient belongs to user's tenant (IDOR protection)
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, tenantId: req.user.tenantId },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const where: any = { patientId, isDeleted: false };
    if (category) where.category = category;

    const documents = await prisma.document.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
    });

    res.json(documents);
  } catch (error) {
    logger.error('Get documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download/view document
app.get('/api/documents/:id/download', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findFirst({
      where: { id },
      include: { patient: true },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Verify access
    if (document.patient.tenantId !== req.user.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filePath = document.path;
    if (!require('fs').existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    logger.error('Download document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete document (soft delete)
app.delete('/api/documents/:id', authenticateToken, requirePermission('patients:edit'), async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findFirst({
      where: { id },
      include: { patient: true },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.patient.tenantId !== req.user.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete file from disk
    await deleteFile(document.path);

    // Delete from database
    await prisma.document.delete({ where: { id } });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    logger.error('Delete document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get document categories
app.get('/api/documents/categories', authenticateToken, (req: any, res: Response) => {
  res.json(documentCategories);
});

// ============================================
// APPOINTMENT REMINDER APIs
// ============================================

// Get reminder status for an appointment
app.get('/api/reminders/appointment/:appointmentId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const status = await reminderService.getReminderStatus(appointmentId);
    res.json(status);
  } catch (error) {
    logger.error('Get reminder status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send manual reminder for an appointment
app.post('/api/reminders/appointment/:appointmentId/send', authenticateToken, requirePermission('appointments:edit'), async (req: any, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const result = await reminderService.sendManualReminder(appointmentId, req.user.tenantId);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ message: result.message });
  } catch (error) {
    logger.error('Send manual reminder error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get reminder statistics
app.get('/api/reminders/stats', authenticateToken, requireRole('ADMIN', 'FRONT_OFFICE'), async (req: any, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = await reminderService.getStats(
      req.user.tenantId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json(stats);
  } catch (error) {
    logger.error('Get reminder stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get today's pending reminders
app.get('/api/reminders/pending', authenticateToken, requireRole('ADMIN', 'FRONT_OFFICE'), async (req: any, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get appointments scheduled for today that haven't received reminders
    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId: req.user.tenantId,
        appointmentDate: {
          gte: today,
          lt: tomorrow,
        },
        status: { in: ['scheduled', 'confirmed'] },
      },
      include: {
        patient: { select: { name: true, mrn: true, contact: true, email: true } },
        doctor: { select: { name: true } },
      },
      orderBy: { appointmentDate: 'asc' },
    });

    // Check which have received reminders
    const appointmentIds = appointments.map(a => a.id);
    const sentReminders = await prisma.notification.findMany({
      where: {
        type: 'APPOINTMENT_REMINDER',
        referenceId: { in: appointmentIds },
      },
      select: { referenceId: true },
    });

    const sentIds = new Set(sentReminders.map((r: any) => r.referenceId));

    const result = appointments.map((apt: any) => ({
      id: apt.id,
      appointmentDate: apt.appointmentDate,
      appointmentTime: apt.appointmentTime,
      patient: apt.patient,
      doctor: apt.doctor?.name || 'N/A',
      department: apt.department,
      reminderSent: sentIds.has(apt.id),
    }));

    res.json(result);
  } catch (error) {
    logger.error('Get pending reminders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// LABORATORY APIs
// ===========================

app.post('/api/lab-orders', authenticateToken, validateBody(createLabOrderSchema), async (req: any, res: Response) => {
  try {
    const { patientId, encounterId, tests, admissionId } = req.body;

    // Check if patient is admitted (IPD)
    let activeAdmissionId = admissionId || null;
    if (!activeAdmissionId && encounterId) {
      const encounter = await prisma.encounter.findUnique({
        where: { id: encounterId },
        include: { admission: true }
      });
      if (encounter?.admission && encounter.admission.status === 'active') {
        activeAdmissionId = encounter.admission.id;
      }
    }

    const order = await prisma.order.create({
      data: {
        patientId,
        encounterId,
        admissionId: activeAdmissionId,
        orderType: 'lab',
        orderedBy: req.user.userId,
        priority: req.body.priority || 'routine',
        details: { tests },
        status: 'pending',
      },
    });

    // Auto-create billing for the lab order
    const testIds = tests.map((t: any) => t.testId);
    const { createLabOrderBilling } = await import('./services/billing');
    await createLabOrderBilling(order.id, patientId, encounterId, activeAdmissionId, testIds);

    // Fetch the updated order with billing info
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        patient: { select: { name: true, mrn: true } }
      }
    });

    res.status(201).json(updatedOrder);
  } catch (error) {
    logger.error('Create lab order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/lab-orders', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status, patientId } = req.query;
    const where: any = { orderType: 'lab' };

    if (status) where.status = status;
    if (patientId) where.patientId = patientId;

    const orders = await prisma.order.findMany({
      where,
      include: {
        patient: { select: { name: true, mrn: true } },
        results: true,
      },
      orderBy: { orderedAt: 'desc' },
    });

    res.json(orders);
  } catch (error) {
    logger.error('Get lab orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/lab-orders/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        patient: { select: { name: true, mrn: true } },
        results: true,
      },
    });

    res.json(order);
  } catch (error) {
    logger.error('Update lab order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/lab-results', authenticateToken, validateBody(labResultSchema), async (req: any, res: Response) => {
  try {
    const { orderId, resultData, isCritical } = req.body;

    const result = await prisma.result.create({
      data: {
        orderId,
        resultData,
        isCritical: isCritical || false,
        verifiedBy: req.user.userId,
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'completed' },
    });

    res.status(201).json(result);
  } catch (error) {
    logger.error('Create lab result error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit and finalize lab results
app.post('/api/lab/orders/:id/submit-results', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { results, remarks } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        patient: true,
        encounter: {
          include: {
            doctor: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.orderType !== 'lab') {
      return res.status(400).json({ error: 'Not a lab order' });
    }

    const criticalAlerts = [];
    const processedResults = [];

    for (const resultItem of results || []) {
      const { testName, value, unit, normalRange, isCritical } = resultItem;

      const isOutOfRange = normalRange ? validateResultAgainstRange(value, normalRange) : false;
      const flaggedAsCritical = isCritical || isOutOfRange;

      processedResults.push({
        testName,
        value,
        unit,
        normalRange,
        flag: flaggedAsCritical ? 'critical' : isOutOfRange ? 'abnormal' : 'normal',
      });

      if (flaggedAsCritical) {
        const alert = await prisma.criticalAlert.create({
          data: {
            orderId: id,
            patientId: order.patientId,
            testName,
            value: String(value),
            unit: unit || '',
            normalRange: normalRange || '',
            status: 'unacknowledged',
            notifiedDoctorId: order.orderedBy,
          },
        });

        criticalAlerts.push(alert);

        try {
          const doctor = await prisma.user.findUnique({
            where: { id: order.orderedBy },
          });

          if (doctor) {
            // User model doesn't have contact, use empty string - notification uses email
            await notificationService.sendCriticalValueAlert(
              '',
              doctor.email || '',
              {
                patientName: order.patient.name,
                mrn: order.patient.mrn,
                testName,
                value: String(value),
                unit: unit || '',
                normalRange: normalRange || '',
                timestamp: new Date().toISOString(),
                labName: 'Laboratory',
                hospitalName: 'Hospital',
              }
            );
          }
        } catch (notifError) {
          logger.error('Failed to send critical value notification:', notifError);
        }
      }
    }

    const existingResult = await prisma.result.findFirst({
      where: { orderId: id },
    });

    const hasCritical = criticalAlerts.length > 0;

    if (existingResult) {
      await prisma.result.update({
        where: { id: existingResult.id },
        data: {
          resultData: { results: processedResults, remarks },
          isCritical: hasCritical,
          verifiedBy: req.user.userId,
        },
      });
    } else {
      await prisma.result.create({
        data: {
          orderId: id,
          resultData: { results: processedResults, remarks },
          isCritical: hasCritical,
          verifiedBy: req.user.userId,
        },
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: 'completed' },
      include: {
        patient: { select: { name: true, mrn: true } },
        results: true,
      },
    });

    try {
      await notificationService.sendLabResultReady(
        order.patient.contact || '',
        order.patient.email || '',
        {
          patientName: order.patient.name,
          orderId: id.substring(0, 8).toUpperCase(),
          testNames: processedResults.map((r: any) => r.testName).join(', '),
          hospitalName: 'Hospital',
        }
      );
    } catch (notifError) {
      logger.error('Failed to send result ready notification:', notifError);
    }

    res.json({
      order: updatedOrder,
      criticalAlerts: criticalAlerts.length,
      message: hasCritical
        ? 'Results submitted with critical values. Physician notified.'
        : 'Results submitted successfully.',
    });
  } catch (error) {
    logger.error('Submit lab results error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function validateResultAgainstRange(value: any, normalRange: string): boolean {
  try {
    const numValue = parseFloat(String(value));
    if (isNaN(numValue)) return false;

    const rangeMatch = normalRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      return numValue < min || numValue > max;
    }

    const ltMatch = normalRange.match(/<\s*(\d+\.?\d*)/);
    if (ltMatch) {
      const threshold = parseFloat(ltMatch[1]);
      return numValue >= threshold;
    }

    const gtMatch = normalRange.match(/>\s*(\d+\.?\d*)/);
    if (gtMatch) {
      const threshold = parseFloat(gtMatch[1]);
      return numValue <= threshold;
    }

    return false;
  } catch {
    return false;
  }
}

app.get('/api/lab/critical-alerts', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status, patientId } = req.query;
    const where: any = {};

    if (status) {
      where.status = status;
    } else {
      where.status = 'unacknowledged';
    }

    if (patientId) {
      where.patientId = patientId;
    }

    const alerts = await prisma.criticalAlert.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            name: true,
            contact: true,
          },
        },
      },
      orderBy: { alertedAt: 'desc' },
    });

    res.json(alerts);
  } catch (error) {
    logger.error('Get critical alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/lab/critical-alerts/:id/acknowledge', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const alert = await prisma.criticalAlert.update({
      where: { id },
      data: {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy: req.user.userId,
      },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            name: true,
          },
        },
      },
    });

    res.json(alert);
  } catch (error) {
    logger.error('Acknowledge critical alert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// RADIOLOGY APIs
// ===========================

app.post('/api/radiology-orders', authenticateToken, validateBody(createRadiologyOrderSchema), async (req: any, res: Response) => {
  try {
    const { patientId, encounterId, tests, admissionId } = req.body;

    // Check if patient is admitted (IPD)
    let activeAdmissionId = admissionId || null;
    if (!activeAdmissionId && encounterId) {
      const encounter = await prisma.encounter.findUnique({
        where: { id: encounterId },
        include: { admission: true }
      });
      if (encounter?.admission && encounter.admission.status === 'active') {
        activeAdmissionId = encounter.admission.id;
      }
    }

    const order = await prisma.order.create({
      data: {
        patientId,
        encounterId,
        admissionId: activeAdmissionId,
        orderType: 'radiology',
        orderedBy: req.user.userId,
        priority: req.body.priority || 'routine',
        details: { tests },
        status: 'pending',
      },
    });

    // Auto-create billing for the radiology order
    const testIds = tests.map((t: any) => t.testId);
    const { createRadiologyOrderBilling } = await import('./services/billing');
    await createRadiologyOrderBilling(order.id, patientId, encounterId, activeAdmissionId, testIds);

    // Fetch the updated order with billing info
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        patient: { select: { name: true, mrn: true } }
      }
    });

    res.status(201).json(updatedOrder);
  } catch (error) {
    logger.error('Create radiology order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/radiology-orders/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        patient: { select: { name: true, mrn: true } },
        results: true,
      },
    });

    res.json(order);
  } catch (error) {
    logger.error('Update radiology order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/radiology-orders', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status, patientId } = req.query;
    const where: any = { orderType: 'radiology' };

    if (status) where.status = status;
    if (patientId) where.patientId = patientId;

    const orders = await prisma.order.findMany({
      where,
      include: {
        patient: { select: { name: true, mrn: true } },
        results: true,
      },
      orderBy: { orderedAt: 'desc' },
    });

    res.json(orders);
  } catch (error) {
    logger.error('Get radiology orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// PHARMACY APIs
// ===========================

app.get('/api/pharmacy/pending-prescriptions', authenticateToken, async (req: any, res: Response) => {
  try {
    const prescriptions = await prisma.prescription.findMany({
      include: {
        opdNote: {
          include: {
            patient: { select: { name: true, mrn: true } },
            doctor: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(prescriptions);
  } catch (error) {
    logger.error('Get pending prescriptions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// IPD (INPATIENT) APIs
// ===========================

app.post('/api/admissions', authenticateToken, validateBody(createAdmissionSchema), async (req: any, res: Response) => {
  try {
    const { encounterId, patientId, bedId, diagnosis, patientInsuranceId, preAuthorizationId } = req.body;

    // Import bed management service
    const { bedManagementService } = require('./services/bedManagement');

    // Check bed availability and conflicts before admission
    if (bedId) {
      const availability = await bedManagementService.checkBedAvailability(
        bedId,
        new Date()
      );

      if (!availability.isAvailable) {
        return res.status(409).json({
          success: false,
          error: 'Bed is not available',
          reason: availability.reason,
          conflict: availability.conflict
        });
      }
    }

    // Handle insurance verification if provided
    let insuranceVerified = false;
    let insuranceVerifiedAt: Date | null = null;

    if (patientInsuranceId) {
      const insurance = await prisma.patientInsurance.findUnique({
        where: { id: patientInsuranceId },
      });

      if (!insurance || !insurance.isActive) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or inactive insurance policy'
        });
      }

      const now = new Date();
      if (insurance.validFrom > now || insurance.validTill < now) {
        return res.status(400).json({
          success: false,
          error: 'Insurance policy is not valid for current date'
        });
      }

      insuranceVerified = true;
      insuranceVerifiedAt = now;
    }

    // Verify pre-authorization if provided
    if (preAuthorizationId) {
      const preAuth = await prisma.preAuthorization.findUnique({
        where: { id: preAuthorizationId },
      });

      if (!preAuth || preAuth.status !== 'approved') {
        return res.status(400).json({
          success: false,
          error: 'Pre-authorization is not approved'
        });
      }

      if (preAuth.validTill && preAuth.validTill < new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Pre-authorization has expired'
        });
      }

      if (preAuth.patientId !== patientId) {
        return res.status(400).json({
          success: false,
          error: 'Pre-authorization is for a different patient'
        });
      }
    }

    const admission = await prisma.admission.create({
      data: {
        encounterId,
        patientId,
        bedId,
        admittingDoctorId: req.user.userId,
        diagnosis,
        status: 'active',
        patientInsuranceId,
        preAuthorizationId,
        insuranceVerified,
        insuranceVerifiedAt,
      },
      include: {
        patient: { select: { name: true, mrn: true } },
        bed: { select: { bedNumber: true, category: true } },
      },
    });

    // Update bed status to occupied
    if (bedId) {
      await prisma.bed.update({
        where: { id: bedId },
        data: { status: 'occupied' },
      });

      // Cancel any active reservations for this bed
      await prisma.bedReservation.updateMany({
        where: {
          bedId,
          status: 'active'
        },
        data: {
          status: 'completed'
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Admission created successfully',
      admission
    });
  } catch (error) {
    logger.error('Create admission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admissions', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};

    if (status) where.status = status;

    const admissions = await prisma.admission.findMany({
      where,
      include: {
        patient: { select: { name: true, mrn: true, dob: true, gender: true } },
        bed: { select: { bedNumber: true, category: true } },
        admittingDoctor: { select: { name: true } },
        encounter: {
          include: {
            invoices: { where: { type: 'ipd' }, take: 1 }
          }
        }
      },
      orderBy: { admissionDate: 'desc' },
    });

    // Transform for frontend compatibility
    res.json(admissions.map((adm, index) => ({
      ...adm,
      admissionId: `ADM-${String(index + 1).padStart(4, '0')}`,
      patientName: adm.patient?.name || 'Unknown',
      patientMRN: adm.patient?.mrn || '',
      wardName: adm.bed?.category || 'General',
      bedNumber: adm.bed?.bedNumber || 'N/A',
      doctorName: adm.admittingDoctor?.name || 'Not Assigned',
      diagnosis: adm.diagnosis || 'Not specified',
      hasInvoice: adm.encounter?.invoices?.length > 0,
      invoiceId: adm.encounter?.invoices?.[0]?.id || null,
      invoiceStatus: adm.encounter?.invoices?.[0]?.status || null,
    })));
  } catch (error) {
    logger.error('Get admissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admissions/:id/discharge', authenticateToken, validateBody(dischargeSchema), async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { dischargeSummary } = req.body;

    const admission = await prisma.admission.update({
      where: { id },
      data: {
        status: 'discharged',
        dischargeDate: new Date(),
      },
      include: { bed: true },
    });

    // Update bed status
    if (admission.bedId) {
      await prisma.bed.update({
        where: { id: admission.bedId },
        data: { status: 'dirty' },
      });
    }

    res.json(admission);
  } catch (error) {
    logger.error('Discharge patient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/beds', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status, category } = req.query;
    const where: any = { branchId: req.user.branchId };

    if (status) where.status = status;
    if (category) where.category = category;

    const beds = await prisma.bed.findMany({
      where,
      orderBy: { bedNumber: 'asc' },
    });

    res.json(beds);
  } catch (error) {
    logger.error('Get beds error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// EMERGENCY/CASUALTY APIs
// ===========================

app.get('/api/emergency/cases', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};

    if (status) where.status = status;

    const cases = await prisma.emergencyCase.findMany({
      where,
      orderBy: { arrivalTime: 'desc' },
    });

    res.json(cases.map(c => ({
      ...c,
      age: c.patientAge,
      gender: c.patientGender,
      waitingTime: Math.floor((Date.now() - c.arrivalTime.getTime()) / 60000) + ' min',
    })));
  } catch (error) {
    logger.error('Get emergency cases error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/emergency/cases', authenticateToken, validateBody(createEmergencySchema), async (req: any, res: Response) => {
  try {
    const { patientName, patientAge, patientGender, patientContact, triageCategory, chiefComplaint, vitalSigns, isMLC, mlcNumber, assignedDoctor, notes } = req.body;

    const emergencyCase = await prisma.emergencyCase.create({
      data: {
        patientName,
        patientAge: patientAge ? parseInt(patientAge) : null,
        patientGender,
        patientContact,
        triageCategory: triageCategory || 'YELLOW',
        chiefComplaint,
        vitalSigns,
        isMLC: isMLC || false,
        mlcNumber,
        assignedDoctor,
        notes,
      },
    });

    res.status(201).json(emergencyCase);
  } catch (error) {
    logger.error('Create emergency case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/emergency/cases/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { triageCategory, vitalSigns, assignedDoctor, notes, status } = req.body;

    const emergencyCase = await prisma.emergencyCase.update({
      where: { id },
      data: {
        ...(triageCategory && { triageCategory }),
        ...(vitalSigns && { vitalSigns }),
        ...(assignedDoctor && { assignedDoctor }),
        ...(notes && { notes }),
        ...(status && { status }),
      },
    });

    res.json(emergencyCase);
  } catch (error) {
    logger.error('Update emergency case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/emergency/cases/:id/admit', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { disposition } = req.body;

    const emergencyCase = await prisma.emergencyCase.update({
      where: { id },
      data: {
        status: 'admitted',
        disposition: disposition || 'admitted_ipd',
      },
    });

    res.json({ message: 'Patient admitted to IPD', emergencyCase });
  } catch (error) {
    logger.error('Admit emergency case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/emergency/cases/:id/discharge', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const emergencyCase = await prisma.emergencyCase.update({
      where: { id },
      data: {
        status: 'discharged',
        disposition: 'discharged',
        dischargeTime: new Date(),
      },
    });

    res.json({ message: 'Patient discharged', emergencyCase });
  } catch (error) {
    logger.error('Discharge emergency case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// ICU & CRITICAL CARE APIs
// ===========================

app.get('/api/icu/beds', authenticateToken, async (req: any, res: Response) => {
  try {
    const { icuUnit, status } = req.query;
    const where: any = {};

    if (icuUnit) where.icuUnit = icuUnit;
    if (status) where.status = status;

    const beds = await prisma.iCUBed.findMany({
      where,
      include: {
        vitalsRecords: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { bedNumber: 'asc' },
    });

    res.json(beds.map(b => ({
      ...b,
      latestVitals: b.vitalsRecords[0] ? {
        hr: b.vitalsRecords[0].heartRate,
        bp: b.vitalsRecords[0].systolicBP && b.vitalsRecords[0].diastolicBP
          ? `${b.vitalsRecords[0].systolicBP}/${b.vitalsRecords[0].diastolicBP}` : null,
        spo2: b.vitalsRecords[0].spo2,
        temp: b.vitalsRecords[0].temperature,
        rr: b.vitalsRecords[0].respiratoryRate,
        gcs: b.vitalsRecords[0].gcs,
        ventilatorMode: b.vitalsRecords[0].ventilatorMode,
        timestamp: b.vitalsRecords[0].recordedAt,
      } : null,
    })));
  } catch (error) {
    logger.error('Get ICU beds error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/icu/beds', authenticateToken, async (req: any, res: Response) => {
  try {
    const { bedNumber, icuUnit } = req.body;

    const bed = await prisma.iCUBed.create({
      data: {
        bedNumber,
        icuUnit,
      },
    });

    res.status(201).json(bed);
  } catch (error) {
    logger.error('Create ICU bed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/icu/vitals', authenticateToken, validateBody(icuVitalsSchema), async (req: any, res: Response) => {
  try {
    const { icuBedId, patientId, heartRate, systolicBP, diastolicBP, temperature, spo2, respiratoryRate, gcs, ventilatorMode, fio2, peep } = req.body;

    const vitals = await prisma.iCUVitals.create({
      data: {
        icuBedId,
        patientId,
        heartRate: heartRate ? parseInt(heartRate) : null,
        systolicBP: systolicBP ? parseInt(systolicBP) : null,
        diastolicBP: diastolicBP ? parseInt(diastolicBP) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        spo2: spo2 ? parseInt(spo2) : null,
        respiratoryRate: respiratoryRate ? parseInt(respiratoryRate) : null,
        gcs: gcs ? parseInt(gcs) : null,
        ventilatorMode,
        fio2: fio2 ? parseInt(fio2) : null,
        peep: peep ? parseInt(peep) : null,
        recordedBy: req.user.userId,
      },
    });

    // Check for critical values and create alerts
    const criticalAlerts: any[] = [];
    const hr = vitals.heartRate;
    const sbp = vitals.systolicBP;
    const dbp = vitals.diastolicBP;
    const temp = vitals.temperature;
    const oxygen = vitals.spo2;
    const rr = vitals.respiratoryRate;
    const gcsVal = vitals.gcs;

    const createICUAlert = async (testName: string, value: number, unit: string, normalRange: string) => {
      if (patientId) {
        const alert = await prisma.criticalAlert.create({
          data: {
            orderId: vitals.id,
            patientId,
            testName,
            value: value.toString(),
            unit,
            normalRange,
            status: 'unacknowledged',
          },
        });
        criticalAlerts.push({ testName, value, unit, normalRange, alertId: alert.id });
      }
    };

    // Check critical thresholds for ICU vitals (convert Decimal to number for comparison)
    const tempNum = temp ? Number(temp) : null;
    if (oxygen !== null && oxygen < 90) await createICUAlert('SpO2', oxygen, '%', '95-100%');
    if (hr !== null && (hr < 50 || hr > 120)) await createICUAlert('Heart Rate', hr, 'bpm', '60-100 bpm');
    if (tempNum !== null && (tempNum > 102 || tempNum < 95)) await createICUAlert('Temperature', tempNum, '°F', '97-99°F');
    if (sbp !== null && (sbp < 90 || sbp > 180)) await createICUAlert('Systolic BP', sbp, 'mmHg', '90-140 mmHg');
    if (dbp !== null && (dbp < 60 || dbp > 110)) await createICUAlert('Diastolic BP', dbp, 'mmHg', '60-90 mmHg');
    if (gcsVal !== null && gcsVal < 9) await createICUAlert('GCS', gcsVal, '', '15 (normal)');
    if (rr !== null && (rr < 10 || rr > 30)) await createICUAlert('Respiratory Rate', rr, '/min', '12-20/min');

    // Send doctor notification for critical alerts - try to get doctor from admission
    if (criticalAlerts.length > 0 && patientId) {
      const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { name: true, mrn: true } });
      // Get ICU bed with admission to find attending doctor
      const icuBed = await prisma.iCUBed.findUnique({ where: { id: icuBedId }, select: { admissionId: true } });
      if (icuBed?.admissionId) {
        const admission = await prisma.admission.findUnique({
          where: { id: icuBed.admissionId },
          select: { admittingDoctorId: true }
        });
        if (admission?.admittingDoctorId) {
          const doctor = await prisma.user.findUnique({
            where: { id: admission.admittingDoctorId },
            select: { email: true }
          });
          if (doctor?.email) {
            notificationService.sendCriticalValueAlert('', doctor.email, {
              patientName: patient?.name || 'Unknown',
              mrn: patient?.mrn || 'Unknown',
              testName: criticalAlerts.map(a => a.testName).join(', '),
              value: criticalAlerts.map(a => `${a.value}`).join(', '),
              unit: criticalAlerts.map(a => a.unit).join(', '),
              normalRange: criticalAlerts.map(a => a.normalRange).join(', '),
              timestamp: new Date().toISOString(),
              labName: 'ICU',
              hospitalName: 'Hospital ERP',
            }).catch(err => logger.error('ICU critical alert notification failed:', err));
          }
        }
      }
    }

    res.status(201).json({
      ...vitals,
      criticalAlerts: criticalAlerts.length > 0 ? criticalAlerts : undefined,
      hasCriticalValues: criticalAlerts.length > 0,
      message: criticalAlerts.length > 0 ? `Vitals recorded. ${criticalAlerts.length} critical alert(s).` : 'Vitals recorded',
    });
  } catch (error) {
    logger.error('Record vitals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/icu/ventilator', authenticateToken, async (req: any, res: Response) => {
  try {
    const { icuBedId, ventilatorMode, fio2, peep } = req.body;

    // Record as a vitals entry with ventilator params
    const vitals = await prisma.iCUVitals.create({
      data: {
        icuBedId,
        ventilatorMode,
        fio2: fio2 ? parseInt(fio2) : null,
        peep: peep ? parseInt(peep) : null,
        recordedBy: req.user.userId,
      },
    });

    res.status(201).json({ message: 'Ventilator settings updated', vitals });
  } catch (error) {
    logger.error('Update ventilator error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// OPERATION THEATRE APIs
// ===========================

app.get('/api/surgeries', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status, date } = req.query;
    const where: any = {};

    if (status) where.status = status;
    if (date) {
      const startDate = new Date(date as string);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      where.scheduledDate = { gte: startDate, lt: endDate };
    }

    const surgeries = await prisma.surgery.findMany({
      where,
      orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
    });

    res.json(surgeries.map(s => ({
      ...s,
      duration: s.estimatedDuration,
    })));
  } catch (error) {
    logger.error('Get surgeries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/surgeries', authenticateToken, validateBody(scheduleSurgerySchema), async (req: any, res: Response) => {
  try {
    const { patientId, patientName, patientMRN, procedureName, surgeonId, surgeonName, anesthetistName, otRoom, scheduledDate, scheduledTime, estimatedDuration, anesthesiaType, priority, notes } = req.body;

    const surgery = await prisma.surgery.create({
      data: {
        patientId,
        patientName,
        patientMRN,
        procedureName,
        surgeonId,
        surgeonName,
        anesthetistName,
        otRoom,
        scheduledDate: new Date(scheduledDate),
        scheduledTime,
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null,
        anesthesiaType,
        priority: priority || 'elective',
        postOpNotes: notes,
      },
    });

    res.status(201).json(surgery);
  } catch (error) {
    logger.error('Schedule surgery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/ot-rooms', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};

    if (status) where.status = status;

    const rooms = await prisma.oTRoom.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json(rooms);
  } catch (error) {
    logger.error('Get OT rooms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/ot-rooms', authenticateToken, async (req: any, res: Response) => {
  try {
    const { name, type, floor, equipment } = req.body;

    const room = await prisma.oTRoom.create({
      data: {
        name,
        type,
        floor,
        equipment,
      },
    });

    res.status(201).json(room);
  } catch (error) {
    logger.error('Create OT room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/surgeries/:id/start', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const surgery = await prisma.surgery.update({
      where: { id },
      data: {
        status: 'in_progress',
        actualStartTime: new Date(),
      },
    });

    // Update OT room status
    if (surgery.otRoom) {
      await prisma.oTRoom.updateMany({
        where: { name: surgery.otRoom },
        data: { status: 'in_use', currentSurgery: surgery.procedureName },
      });
    }

    res.json({ message: 'Surgery started', surgery });
  } catch (error) {
    logger.error('Start surgery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/surgeries/:id/complete', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { postOpNotes, complications } = req.body;

    const surgery = await prisma.surgery.update({
      where: { id },
      data: {
        status: 'completed',
        actualEndTime: new Date(),
        postOpNotes,
        complications,
      },
    });

    // Free up OT room
    if (surgery.otRoom) {
      await prisma.oTRoom.updateMany({
        where: { name: surgery.otRoom },
        data: { status: 'cleaning', currentSurgery: null },
      });
    }

    res.json({ message: 'Surgery completed', surgery });
  } catch (error) {
    logger.error('Complete surgery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/surgeries/:id/cancel', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const surgery = await prisma.surgery.update({
      where: { id },
      data: {
        status: 'cancelled',
        postOpNotes: reason,
      },
    });

    res.json({ message: 'Surgery cancelled', surgery });
  } catch (error) {
    logger.error('Cancel surgery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/surgeries/:id/postpone', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { scheduledDate, scheduledTime, reason } = req.body;

    const surgery = await prisma.surgery.update({
      where: { id },
      data: {
        status: 'scheduled',
        scheduledDate: new Date(scheduledDate),
        scheduledTime,
        postOpNotes: reason ? `Postponed: ${reason}` : undefined,
      },
    });

    res.json({ message: 'Surgery postponed', surgery });
  } catch (error) {
    logger.error('Postpone surgery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/surgeries/:id/checklist', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    // Standard pre-operative checklist items
    const checklistItems = [
      { id: '1', item: 'Patient identity verified', completed: false },
      { id: '2', item: 'Consent form signed', completed: false },
      { id: '3', item: 'NPO status confirmed (fasting)', completed: false },
      { id: '4', item: 'Pre-operative tests completed', completed: false },
      { id: '5', item: 'Allergies documented', completed: false },
      { id: '6', item: 'IV line established', completed: false },
      { id: '7', item: 'Surgical site marked', completed: false },
      { id: '8', item: 'Anesthesia assessment done', completed: false },
      { id: '9', item: 'Blood products available (if needed)', completed: false },
      { id: '10', item: 'Equipment and instruments checked', completed: false },
    ];

    const surgery = await prisma.surgery.findUnique({
      where: { id },
    });

    if (!surgery) {
      return res.status(404).json({ error: 'Surgery not found' });
    }

    res.json({
      surgeryId: id,
      completed: surgery.preOpChecklist,
      items: checklistItems,
    });
  } catch (error) {
    logger.error('Get checklist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/surgeries/:id/checklist', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;

    const surgery = await prisma.surgery.update({
      where: { id },
      data: {
        preOpChecklist: completed,
      },
    });

    res.json({ message: 'Checklist updated', surgery });
  } catch (error) {
    logger.error('Update checklist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/surgeries/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { postOpNotes, complications, implants } = req.body;

    const surgery = await prisma.surgery.update({
      where: { id },
      data: {
        postOpNotes,
        complications,
        implants,
      },
    });

    res.json({ message: 'Surgery updated', surgery });
  } catch (error) {
    logger.error('Update surgery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// BLOOD BANK APIs
// ===========================

app.get('/api/blood-bank/inventory', authenticateToken, async (req: any, res: Response) => {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const inventory = await prisma.bloodInventory.groupBy({
      by: ['bloodType', 'component'],
      where: { status: 'available' },
      _count: { id: true },
    });

    const inventoryWithExpiry = await Promise.all(
      inventory.map(async (item) => {
        const expiringIn3Days = await prisma.bloodInventory.count({
          where: {
            bloodType: item.bloodType,
            component: item.component,
            status: 'available',
            expiryDate: { lte: threeDaysFromNow, gt: now },
          },
        });
        const expiringIn7Days = await prisma.bloodInventory.count({
          where: {
            bloodType: item.bloodType,
            component: item.component,
            status: 'available',
            expiryDate: { lte: sevenDaysFromNow, gt: threeDaysFromNow },
          },
        });
        return {
          id: `${item.bloodType}-${item.component}`,
          bloodType: item.bloodType,
          component: item.component,
          quantity: item._count.id,
          expiringIn3Days,
          expiringIn7Days,
          expired: 0,
        };
      })
    );

    res.json(inventoryWithExpiry);
  } catch (error) {
    logger.error('Get blood inventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/blood-bank/donors', authenticateToken, async (req: any, res: Response) => {
  try {
    const { search, bloodType } = req.query;
    const where: any = {};

    if (bloodType) where.bloodType = bloodType;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { donorId: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const donors = await prisma.bloodDonor.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(donors.map(d => ({
      ...d,
      status: d.isEligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
      lastDonation: d.lastDonationAt,
    })));
  } catch (error) {
    logger.error('Get donors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/blood-bank/donors', authenticateToken, validateBody(bloodDonorSchema), async (req: any, res: Response) => {
  try {
    const { name, age, gender, bloodType, phone, email, address } = req.body;

    const donorCount = await prisma.bloodDonor.count();
    const donorId = `D${String(donorCount + 1).padStart(4, '0')}`;

    const donor = await prisma.bloodDonor.create({
      data: {
        donorId,
        name,
        age: parseInt(age),
        gender,
        bloodType,
        phone,
        email,
        address,
      },
    });

    res.status(201).json({ ...donor, status: 'ELIGIBLE' });
  } catch (error) {
    logger.error('Register donor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/blood-bank/requests', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};

    if (status) where.status = status;

    const requests = await prisma.bloodRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
    });

    res.json(requests.map(r => ({
      ...r,
      unitsRequired: r.unitsRequested,
      requestDate: r.requestedAt,
      crossMatchStatus: r.crossMatchResult ? 'COMPLETED' : 'PENDING',
    })));
  } catch (error) {
    logger.error('Get blood requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/blood-bank/requests', authenticateToken, validateBody(bloodRequestSchema), async (req: any, res: Response) => {
  try {
    const { patientName, patientMRN, bloodType, component, unitsRequired, urgency, requestedBy, indication } = req.body;

    const request = await prisma.bloodRequest.create({
      data: {
        patientName,
        patientMRN,
        bloodType,
        component: component || 'Whole Blood',
        unitsRequested: parseInt(unitsRequired),
        urgency: urgency || 'routine',
        requestedBy,
        indication,
      },
    });

    res.status(201).json({ ...request, unitsRequired: request.unitsRequested, requestDate: request.requestedAt });
  } catch (error) {
    logger.error('Create blood request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/blood-bank/requests/:id/cross-match', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { result } = req.body;

    const request = await prisma.bloodRequest.update({
      where: { id },
      data: {
        crossMatchedAt: new Date(),
        crossMatchedBy: req.user.userId,
        crossMatchResult: result || 'compatible',
        status: 'crossmatched',
      },
    });

    res.json({ message: 'Cross-matching completed', request });
  } catch (error) {
    logger.error('Cross-match error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/blood-bank/requests/:id/issue', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const request = await prisma.bloodRequest.update({
      where: { id },
      data: { status: 'issued' },
    });

    res.json({ message: 'Blood issued successfully', request });
  } catch (error) {
    logger.error('Issue blood error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// HR & STAFF MANAGEMENT APIs
// ===========================

app.get('/api/hr/employees', authenticateToken, async (req: any, res: Response) => {
  try {
    const { department, status } = req.query;
    const where: any = {};

    if (department) where.department = department;
    if (status) where.status = status;

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json(employees);
  } catch (error) {
    logger.error('Get employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/hr/employees', authenticateToken, validateBody(createEmployeeSchema), async (req: any, res: Response) => {
  try {
    const { name, email, phone, department, designation, joiningDate, salary, shift } = req.body;

    const employeeCount = await prisma.employee.count();
    const employeeId = `EMP${String(employeeCount + 1).padStart(4, '0')}`;

    const employee = await prisma.employee.create({
      data: {
        employeeId,
        name,
        email,
        phone,
        department,
        designation,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        salary: salary ? parseFloat(salary) : null,
        shift,
      },
    });

    res.status(201).json(employee);
  } catch (error) {
    logger.error('Add employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/hr/attendance', authenticateToken, async (req: any, res: Response) => {
  try {
    const { date, employeeId } = req.query;
    const where: any = {};

    if (date) {
      where.date = new Date(date as string);
    }
    if (employeeId) where.employeeId = employeeId;

    const attendance = await prisma.employeeAttendance.findMany({
      where,
      include: { employee: { select: { name: true, employeeId: true } } },
      orderBy: { date: 'desc' },
    });

    res.json(attendance.map(a => ({
      ...a,
      employeeName: a.employee.name,
      checkIn: a.checkIn?.toLocaleTimeString(),
      checkOut: a.checkOut?.toLocaleTimeString(),
    })));
  } catch (error) {
    logger.error('Get attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/hr/attendance', authenticateToken, async (req: any, res: Response) => {
  try {
    const { employeeId, date, checkIn, checkOut, status } = req.body;

    const attendance = await prisma.employeeAttendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: new Date(date),
        },
      },
      create: {
        employeeId,
        date: new Date(date),
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        status: status || 'present',
      },
      update: {
        checkIn: checkIn ? new Date(checkIn) : undefined,
        checkOut: checkOut ? new Date(checkOut) : undefined,
        status: status || undefined,
      },
    });

    res.status(201).json(attendance);
  } catch (error) {
    logger.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/hr/leaves', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status, employeeId } = req.query;
    const where: any = {};

    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: { employee: { select: { name: true, employeeId: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(leaves.map(l => ({
      ...l,
      employeeName: l.employee.name,
      appliedDate: l.createdAt,
    })));
  } catch (error) {
    logger.error('Get leaves error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/hr/leaves', authenticateToken, validateBody(leaveRequestSchema), async (req: any, res: Response) => {
  try {
    const { employeeId, leaveType, fromDate, toDate, reason } = req.body;

    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveType,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        reason,
      },
    });

    res.status(201).json(leave);
  } catch (error) {
    logger.error('Apply leave error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/hr/leaves/:id/approve', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const leave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: req.user.userId,
        approvedAt: new Date(),
      },
    });

    res.json({ message: 'Leave approved', leave });
  } catch (error) {
    logger.error('Approve leave error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/hr/leaves/:id/reject', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const leave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        approvedBy: req.user.userId,
        approvedAt: new Date(),
        remarks,
      },
    });

    res.json({ message: 'Leave rejected', leave });
  } catch (error) {
    logger.error('Reject leave error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// INVENTORY & PROCUREMENT APIs
// ===========================

app.get('/api/inventory/items', authenticateToken, async (req: any, res: Response) => {
  try {
    const { category, lowStock, search } = req.query;
    const where: any = { isActive: true };

    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        stocks: {
          select: { quantity: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const itemsWithStock = items.map(item => ({
      ...item,
      itemCode: item.code,
      unitPrice: item.price,
      currentStock: item.stocks.reduce((sum, s) => sum + s.quantity, 0),
      isLowStock: item.stocks.reduce((sum, s) => sum + s.quantity, 0) < item.reorderLevel,
    }));

    if (lowStock === 'true') {
      res.json(itemsWithStock.filter(i => i.isLowStock));
    } else {
      res.json(itemsWithStock);
    }
  } catch (error) {
    logger.error('Get inventory items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/inventory/items', authenticateToken, async (req: any, res: Response) => {
  try {
    const { name, category, unit, reorderLevel, price } = req.body;

    const itemCount = await prisma.inventoryItem.count();
    const code = `ITM${String(itemCount + 1).padStart(4, '0')}`;

    const item = await prisma.inventoryItem.create({
      data: {
        name,
        code,
        category,
        unit,
        reorderLevel: parseInt(reorderLevel) || 0,
        price: parseFloat(price) || 0,
      },
    });

    res.status(201).json({ ...item, itemCode: item.code, unitPrice: item.price, currentStock: 0 });
  } catch (error) {
    logger.error('Add inventory item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/inventory/purchase-orders', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};

    if (status) where.status = status;

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        items: {
          include: { item: { select: { name: true, code: true } } },
        },
      },
      orderBy: { orderDate: 'desc' },
    });

    res.json(orders.map(o => ({
      ...o,
      supplier: o.vendorName,
      expectedDelivery: o.expectedDate,
      items: o.items.map(i => ({
        name: i.item.name,
        code: i.item.code,
        quantity: i.quantity,
        unitPrice: i.rate,
        amount: i.amount,
      })),
    })));
  } catch (error) {
    logger.error('Get purchase orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/inventory/purchase-orders', authenticateToken, validateBody(createPurchaseOrderSchema), async (req: any, res: Response) => {
  try {
    const { vendorName, vendorContact, expectedDate, items, remarks } = req.body;

    const poCount = await prisma.purchaseOrder.count();
    const poNumber = `PO${new Date().getFullYear()}${String(poCount + 1).padStart(4, '0')}`;

    const totalAmount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.rate), 0);

    const order = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        vendorName,
        vendorContact,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        totalAmount,
        remarks,
        createdBy: req.user.userId,
        items: {
          create: items.map((item: any) => ({
            itemId: item.itemId,
            quantity: parseInt(item.quantity),
            rate: parseFloat(item.rate),
            amount: parseInt(item.quantity) * parseFloat(item.rate),
          })),
        },
      },
      include: { items: true },
    });

    res.status(201).json(order);
  } catch (error) {
    logger.error('Create purchase order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/inventory/purchase-orders/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.purchaseOrder.update({
      where: { id },
      data: { status },
    });

    res.json(order);
  } catch (error) {
    logger.error('Update purchase order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// AMBULANCE & TRANSPORT APIs
// ===========================

app.get('/api/ambulance/vehicles', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};

    if (status) where.status = status;

    const vehicles = await prisma.ambulanceVehicle.findMany({
      where,
      orderBy: { vehicleNumber: 'asc' },
    });

    res.json(vehicles.map(v => ({
      ...v,
      driver: v.driverName,
      lastService: v.lastMaintenance,
    })));
  } catch (error) {
    logger.error('Get ambulance vehicles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/ambulance/vehicles', authenticateToken, validateBody(ambulanceVehicleSchema), async (req: any, res: Response) => {
  try {
    const { vehicleNumber, type, driverName, driverPhone } = req.body;

    const vehicle = await prisma.ambulanceVehicle.create({
      data: {
        vehicleNumber,
        type,
        driverName,
        driverPhone,
      },
    });

    res.status(201).json(vehicle);
  } catch (error) {
    logger.error('Add vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/ambulance/trips', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};

    if (status) where.status = status;

    const trips = await prisma.ambulanceTrip.findMany({
      where,
      orderBy: { startTime: 'desc' },
    });

    res.json(trips.map(t => ({
      ...t,
      patientName: t.patientId || 'Walk-in',
      requestTime: t.startTime,
      assignedVehicle: t.vehicleNumber,
    })));
  } catch (error) {
    logger.error('Get ambulance trips error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/ambulance/trips', authenticateToken, validateBody(ambulanceTripSchema), async (req: any, res: Response) => {
  try {
    const { patientName, patientPhone, pickupLocation, dropLocation, tripType, urgency, notes, vehicleNumber } = req.body;

    const trip = await prisma.ambulanceTrip.create({
      data: {
        vehicleNumber: vehicleNumber || 'UNASSIGNED',
        pickupLocation,
        dropLocation,
        tripType: tripType || 'EMERGENCY',
        remarks: notes,
        status: 'pending',
      },
    });

    res.status(201).json({ ...trip, patientName, patientPhone, requestTime: trip.startTime });
  } catch (error) {
    logger.error('Create trip request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/ambulance/trips/:id/assign', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { vehicleId } = req.body;

    const vehicle = await prisma.ambulanceVehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const trip = await prisma.ambulanceTrip.update({
      where: { id },
      data: {
        vehicleNumber: vehicle.vehicleNumber,
        driverName: vehicle.driverName,
        driverContact: vehicle.driverPhone,
        status: 'in_progress',
      },
    });

    await prisma.ambulanceVehicle.update({
      where: { id: vehicleId },
      data: { status: 'on_trip' },
    });

    res.json({ message: 'Vehicle assigned to trip', trip });
  } catch (error) {
    logger.error('Assign vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/ambulance/trips/:id/complete', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const trip = await prisma.ambulanceTrip.update({
      where: { id },
      data: {
        status: 'completed',
        endTime: new Date(),
      },
    });

    // Free up the vehicle
    await prisma.ambulanceVehicle.updateMany({
      where: { vehicleNumber: trip.vehicleNumber },
      data: { status: 'available' },
    });

    res.json({ message: 'Trip completed', trip });
  } catch (error) {
    logger.error('Complete trip error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// HOUSEKEEPING & LINEN APIs
// ===========================

app.get('/api/housekeeping/tasks', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};

    if (status) where.status = status;

    const tasks = await prisma.housekeepingTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(tasks.map(t => ({
      ...t,
      location: t.bedId || 'General Area',
      area: t.remarks || '',
      scheduledTime: t.scheduledAt?.toLocaleTimeString() || 'Not scheduled',
    })));
  } catch (error) {
    logger.error('Get housekeeping tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/housekeeping/tasks', authenticateToken, validateBody(housekeepingTaskSchema), async (req: any, res: Response) => {
  try {
    const { bedId, taskType, assignedTo, priority, scheduledAt, remarks } = req.body;

    const task = await prisma.housekeepingTask.create({
      data: {
        bedId,
        taskType,
        assignedTo,
        priority: priority || 'normal',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        remarks,
      },
    });

    res.status(201).json(task);
  } catch (error) {
    logger.error('Create housekeeping task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/housekeeping/tasks/:id/complete', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const task = await prisma.housekeepingTask.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    res.json({ message: 'Task completed', task });
  } catch (error) {
    logger.error('Complete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/housekeeping/laundry', authenticateToken, async (req: any, res: Response) => {
  try {
    // Using housekeeping tasks with taskType = 'laundry'
    const laundry = await prisma.housekeepingTask.findMany({
      where: { taskType: { contains: 'laundry', mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(laundry.map(l => ({
      id: l.id,
      department: l.bedId || 'General',
      itemType: l.remarks || 'Mixed Items',
      quantity: 1,
      requestDate: l.createdAt,
      status: l.status.toUpperCase(),
    })));
  } catch (error) {
    logger.error('Get laundry requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// DIET & KITCHEN APIs
// ===========================

app.get('/api/diet/orders', authenticateToken, async (req: any, res: Response) => {
  try {
    const { mealType, date } = req.query;
    const where: any = {};

    if (mealType) where.mealType = mealType;
    if (date) {
      const startDate = new Date(date as string);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      where.orderDate = { gte: startDate, lt: endDate };
    }

    const orders = await prisma.dietOrder.findMany({
      where,
      include: { patient: { select: { name: true, mrn: true } } },
      orderBy: { orderDate: 'desc' },
    });

    res.json(orders.map(o => ({
      ...o,
      patientName: o.patient.name,
      patientMRN: o.patient.mrn,
      ward: 'Ward A', // Could be enriched with admission data
      bedNumber: 'Bed-1',
      scheduledTime: o.orderDate.toLocaleTimeString(),
    })));
  } catch (error) {
    logger.error('Get diet orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/diet/orders', authenticateToken, validateBody(dietOrderSchema), async (req: any, res: Response) => {
  try {
    const { patientId, admissionId, dietType, mealType, remarks } = req.body;

    const order = await prisma.dietOrder.create({
      data: {
        patientId,
        admissionId,
        dietType,
        mealType,
        remarks,
      },
      include: { patient: { select: { name: true } } },
    });

    res.status(201).json(order);
  } catch (error) {
    logger.error('Create diet order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/diet/orders/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.dietOrder.update({
      where: { id },
      data: { status },
    });

    res.json(order);
  } catch (error) {
    logger.error('Update diet order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// QUALITY, COMPLIANCE & FEEDBACK APIs
// ===========================

app.get('/api/quality/incidents', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status } = req.query;

    // Mock data
    const incidents = [
      {
        id: '1',
        type: 'Medication Error',
        description: 'Wrong dosage administered',
        reportedBy: 'Nurse Wilson',
        date: new Date().toISOString(),
        severity: 'MEDIUM',
        status: 'PENDING'
      }
    ];

    res.json(incidents);
  } catch (error) {
    logger.error('Get incidents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/quality/feedbacks', authenticateToken, async (req: any, res: Response) => {
  try {
    // Mock data
    const feedbacks = [
      {
        id: '1',
        patientName: 'David Lee',
        department: 'Emergency',
        rating: 4,
        comments: 'Good service, prompt attention',
        date: new Date().toISOString()
      },
      {
        id: '2',
        patientName: 'Susan White',
        department: 'OPD',
        rating: 5,
        comments: 'Excellent care and friendly staff',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    res.json(feedbacks);
  } catch (error) {
    logger.error('Get feedbacks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// REPORTS/MIS APIs
// ===========================

app.get('/api/reports/dashboard', authenticateToken, async (req: any, res: Response) => {
  try {
    // Mock data for dashboard charts
    const dashboardData = {
      patientFlow: [
        { month: 'Jan', opd: 450, ipd: 120, emergency: 80 },
        { month: 'Feb', opd: 520, ipd: 135, emergency: 95 },
        { month: 'Mar', opd: 480, ipd: 140, emergency: 88 }
      ],
      revenue: [
        { month: 'Jan', amount: 125000 },
        { month: 'Feb', amount: 142000 },
        { month: 'Mar', amount: 138000 }
      ],
      departmentPerformance: [
        { department: 'Emergency', patients: 350, revenue: 45000 },
        { department: 'OPD', patients: 890, revenue: 78000 },
        { department: 'IPD', patients: 210, revenue: 125000 }
      ]
    };

    res.json(dashboardData);
  } catch (error) {
    logger.error('Get dashboard data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// ALIAS ROUTES (Frontend compatibility)
// ===========================

// Bills - alias for invoices
app.get('/api/bills', authenticateToken, async (req: any, res: Response) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        patient: { select: { name: true, mrn: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const bills = invoices.map(inv => {
      const paidAmount = inv.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      const items = inv.items as any[] || [];
      return {
        id: inv.id,
        billNo: `INV-${inv.id.substring(0, 8)}`,
        patientId: inv.patientId,
        patientName: inv.patient?.name || 'Unknown',
        patientMRN: inv.patient?.mrn || '',
        billType: inv.type,
        items: items,
        subtotal: Number(inv.subtotal),
        discount: Number(inv.discount),
        discountPercent: Number(inv.subtotal) > 0 ? (Number(inv.discount) / Number(inv.subtotal)) * 100 : 0,
        tax: Number(inv.tax),
        taxPercent: Number(inv.subtotal) > 0 ? (Number(inv.tax) / Number(inv.subtotal)) * 100 : 0,
        total: Number(inv.total),
        paid: paidAmount,
        balance: Number(inv.total) - paidAmount,
        status: inv.status === 'paid' ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending',
        paymentMode: inv.payments[0]?.mode || '',
        date: inv.createdAt.toISOString(),
      };
    });

    res.json(bills);
  } catch (error) {
    logger.error('Get bills error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Emergency - alias for emergency/cases
app.get('/api/emergency', authenticateToken, async (req: any, res: Response) => {
  try {
    const cases = await prisma.emergencyCase.findMany({
      orderBy: { arrivalTime: 'desc' },
    });

    res.json(cases.map(c => ({
      id: c.id,
      patientName: c.patientName || 'Unknown',
      patientId: c.patientId,
      patientAge: c.patientAge,
      patientGender: c.patientGender,
      patientContact: c.patientContact,
      triageLevel: c.triageCategory,
      triageCategory: c.triageCategory,
      chiefComplaint: c.chiefComplaint,
      vitalSigns: c.vitalSigns,
      status: c.status,
      arrivalTime: c.arrivalTime.toISOString(),
      assignedDoctor: c.assignedDoctor || '',
      isMLC: c.isMLC,
      mlcNumber: c.mlcNumber,
      disposition: c.disposition,
    })));
  } catch (error) {
    logger.error('Get emergency error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// OT Rooms - alias
app.get('/api/ot/rooms', authenticateToken, async (req: any, res: Response) => {
  try {
    const rooms = await prisma.oTRoom.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(rooms.map(room => ({
      id: room.id,
      roomNumber: room.name,
      name: room.name,
      type: room.type,
      floor: room.floor,
      status: room.status,
      currentSurgery: room.currentSurgery,
      equipment: room.equipment,
    })));
  } catch (error) {
    logger.error('Get OT rooms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pharmacy drugs - alias
app.get('/api/pharmacy/drugs', authenticateToken, async (req: any, res: Response) => {
  try {
    const drugs = await prisma.drug.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(drugs.map(d => ({
      id: d.id,
      code: d.id.substring(0, 8).toUpperCase(),
      name: d.name,
      genericName: d.genericName,
      category: d.category,
      dosageForm: d.form,
      form: d.form,
      strength: d.strength,
      manufacturer: 'Generic',
      unitPrice: Number(d.price),
      price: Number(d.price),
      stockQuantity: 100, // Placeholder - would need Stock model
      reorderLevel: 10,
      isNarcotic: d.isNarcotic,
      isActive: d.isActive,
    })));
  } catch (error) {
    logger.error('Get pharmacy drugs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pharmacy stock
app.get('/api/pharmacy/stock', authenticateToken, async (req: any, res: Response) => {
  try {
    const drugs = await prisma.drug.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    res.json(drugs.map(d => ({
      id: d.id,
      drugId: d.id,
      drugName: d.name,
      drugCode: d.id.substring(0, 8).toUpperCase(),
      batchNumber: `BATCH-${d.id.substring(0, 6)}`,
      quantity: 100, // Placeholder
      unitPrice: Number(d.price),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      supplier: 'Generic Supplier',
    })));
  } catch (error) {
    logger.error('Get pharmacy stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Employees - alias for hr/employees
app.get('/api/employees', authenticateToken, async (req: any, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(employees.map(emp => ({
      id: emp.id,
      employeeId: emp.employeeId,
      employeeCode: emp.employeeId,
      name: emp.name,
      email: emp.email || '',
      phone: emp.phone || '',
      department: emp.department || '',
      designation: emp.designation || '',
      joiningDate: emp.joiningDate?.toISOString() || null,
      salary: emp.salary ? Number(emp.salary) : null,
      status: emp.status,
      shift: emp.shift || 'day',
    })));
  } catch (error) {
    logger.error('Get employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Attendance - alias
app.get('/api/attendance', authenticateToken, async (req: any, res: Response) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();

    const attendance = await prisma.employeeAttendance.findMany({
      where: {
        date: targetDate,
      },
      include: { employee: { select: { name: true, employeeId: true } } },
      orderBy: { date: 'desc' },
      take: 100,
    });

    res.json(attendance.map(a => ({
      id: a.id,
      employeeId: a.employeeId,
      employeeName: a.employee?.name || '',
      employeeCode: a.employee?.employeeId || '',
      date: a.date.toISOString(),
      checkIn: a.checkIn?.toISOString() || null,
      checkOut: a.checkOut?.toISOString() || null,
      status: a.status,
      remarks: a.remarks,
    })));
  } catch (error) {
    logger.error('Get attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ambulances - alias
app.get('/api/ambulances', authenticateToken, async (req: any, res: Response) => {
  try {
    const vehicles = await prisma.ambulanceVehicle.findMany({
      orderBy: { vehicleNumber: 'asc' },
    });

    res.json(vehicles.map(v => ({
      id: v.id,
      vehicleNumber: v.vehicleNumber,
      type: v.type,
      status: v.status,
      driver: v.driverName || '',
      driverName: v.driverName || '',
      driverPhone: v.driverPhone || '',
      currentLocation: v.currentLocation || '',
      lastMaintenance: v.lastMaintenance?.toISOString() || null,
    })));
  } catch (error) {
    logger.error('Get ambulances error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Nurse medications
app.get('/api/nurse/medications', authenticateToken, async (req: any, res: Response) => {
  try {
    // Return medication tasks from prescriptions for admitted patients
    const admissions = await prisma.admission.findMany({
      where: {
        status: 'active',
      },
      include: {
        patient: { select: { name: true, mrn: true } },
        encounter: {
          include: {
            opdNotes: {
              include: {
                prescriptions: true,
              },
            },
          },
        },
      },
    });

    const medications: any[] = [];
    admissions.forEach(adm => {
      adm.encounter?.opdNotes?.forEach(note => {
        note.prescriptions?.forEach(rx => {
          const drugs = rx.drugs as any[] || [];
          drugs.forEach((drug, idx) => {
            medications.push({
              id: `${rx.id}-${idx}`,
              patientId: adm.patientId,
              patientName: adm.patient.name,
              patientMRN: adm.patient.mrn,
              medication: drug.name || 'Unknown',
              dosage: drug.dosage || '',
              route: drug.route || 'oral',
              frequency: drug.frequency || '',
              scheduledTime: new Date().toISOString(),
              status: 'pending',
            });
          });
        });
      });
    });

    res.json(medications);
  } catch (error) {
    logger.error('Get nurse medications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Nurse vitals
app.get('/api/nurse/vitals', authenticateToken, async (req: any, res: Response) => {
  try {
    // Get vitals from ICU records
    const vitals = await prisma.iCUVitals.findMany({
      include: {
        icuBed: true,
      },
      orderBy: { recordedAt: 'desc' },
      take: 100,
    });

    res.json(vitals.map(v => ({
      id: v.id,
      patientId: v.patientId || '',
      bedNumber: v.icuBed?.bedNumber || '',
      temperature: v.temperature ? Number(v.temperature) : null,
      bloodPressure: v.systolicBP && v.diastolicBP ? `${v.systolicBP}/${v.diastolicBP}` : '',
      systolicBP: v.systolicBP,
      diastolicBP: v.diastolicBP,
      pulse: v.heartRate,
      heartRate: v.heartRate,
      respiratoryRate: v.respiratoryRate,
      oxygenSaturation: v.spo2,
      spo2: v.spo2,
      gcs: v.gcs,
      recordedAt: v.recordedAt.toISOString(),
      recordedBy: v.recordedBy || '',
    })));
  } catch (error) {
    logger.error('Get nurse vitals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Referral doctors
app.get('/api/referral-doctors', authenticateToken, async (req: any, res: Response) => {
  try {
    const sources = await prisma.referralSource.findMany({
      where: {
        type: 'doctor',
      },
      orderBy: { name: 'asc' },
    });

    res.json(sources.map(s => ({
      id: s.id,
      name: s.name,
      code: s.code,
      type: s.type,
      contact: s.contact || '',
      email: s.email || '',
      address: s.address || '',
      commissionType: s.commissionType,
      commissionValue: Number(s.commissionValue),
      isActive: s.isActive,
    })));
  } catch (error) {
    logger.error('Get referral doctors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Insurance companies (TPA)
app.get('/api/insurance-companies', authenticateToken, async (req: any, res: Response) => {
  try {
    const companies = await prisma.tPAMaster.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(companies.map(c => ({
      id: c.id,
      name: c.name,
      code: c.id.substring(0, 6).toUpperCase(),
      type: c.type,
      contactPerson: c.contactPerson || '',
      contact: c.contact || '',
      email: c.email || '',
      address: c.address || '',
      creditLimit: c.creditLimit ? Number(c.creditLimit) : null,
      discountPercent: c.discountPercent ? Number(c.discountPercent) : null,
      status: c.isActive ? 'active' : 'inactive',
      isActive: c.isActive,
    })));
  } catch (error) {
    logger.error('Get insurance companies error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Master data - drugs
app.get('/api/master/drugs', authenticateToken, async (req: any, res: Response) => {
  try {
    // Generate cache key
    const cacheKey = 'master:drugs';

    // Try to get from cache first, or fetch from database
    const drugs = await redisService.cacheWrapper(
      cacheKey,
      600, // 10 minutes TTL
      async () => {
        return await prisma.drug.findMany({
          orderBy: { name: 'asc' },
        });
      }
    );

    res.json(drugs.map(d => ({
      id: d.id,
      code: d.id.substring(0, 8).toUpperCase(),
      name: d.name,
      genericName: d.genericName,
      description: d.genericName,
      category: d.category,
      dosageForm: d.form,
      form: d.form,
      strength: d.strength,
      unitPrice: Number(d.price),
      price: Number(d.price),
      isNarcotic: d.isNarcotic,
      status: d.isActive ? 'active' : 'inactive',
    })));
  } catch (error) {
    logger.error('Get master drugs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Master data - tests
app.get('/api/master/tests', authenticateToken, async (req: any, res: Response) => {
  try {
    const tests = await prisma.labTestMaster.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(tests.map(t => ({
      id: t.id,
      code: t.code,
      name: t.name,
      description: t.name,
      category: t.category,
      price: Number(t.price),
      tat: t.tat,
      unit: t.unit,
      normalRange: t.normalRange,
      status: t.isActive ? 'active' : 'inactive',
    })));
  } catch (error) {
    logger.error('Get master tests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// MASTER DATA APIs
// ===========================

// Master data - lab tests (alias for frontend)
app.get('/api/master/lab-tests', authenticateToken, async (req: any, res: Response) => {
  try {
    // Generate cache key
    const cacheKey = 'master:lab-tests';

    // Try to get from cache first, or fetch from database
    const tests = await redisService.cacheWrapper(
      cacheKey,
      600, // 10 minutes TTL
      async () => {
        return await prisma.labTestMaster.findMany({
          orderBy: { name: 'asc' },
        });
      }
    );

    res.json(tests.map(t => ({
      id: t.id,
      code: t.code,
      name: t.name,
      description: t.name,
      category: t.category,
      sampleType: t.category,
      price: Number(t.price),
      tat: t.tat,
      unit: t.unit,
      normalRange: t.normalRange,
      status: t.isActive ? 'active' : 'inactive',
    })));
  } catch (error) {
    logger.error('Get master lab tests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Master data - radiology tests
app.get('/api/master/radiology-tests', authenticateToken, async (req: any, res: Response) => {
  try {
    const tests = await prisma.radiologyTestMaster.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(tests.map(t => ({
      id: t.id,
      code: t.code,
      name: t.name,
      description: t.name,
      category: t.modality,
      price: Number(t.price),
      tat: t.tat,
      status: t.isActive ? 'active' : 'inactive',
    })));
  } catch (error) {
    logger.error('Get master radiology tests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Master data - procedures
app.get('/api/master/procedures', authenticateToken, async (req: any, res: Response) => {
  try {
    const procedures = await prisma.procedureMaster.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(procedures.map(p => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.name,
      category: p.category,
      price: Number(p.price),
      status: p.isActive ? 'active' : 'inactive',
    })));
  } catch (error) {
    logger.error('Get master procedures error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Master data - departments
app.get('/api/master/departments', authenticateToken, async (req: any, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(departments.map(d => ({
      id: d.id,
      code: d.id.substring(0, 8).toUpperCase(),
      name: d.name,
      type: d.type,
      hodName: '',
      contact: '',
      status: d.isActive ? 'active' : 'inactive',
    })));
  } catch (error) {
    logger.error('Get master departments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Master data - wards
app.get('/api/master/wards', authenticateToken, async (req: any, res: Response) => {
  try {
    const wards = await prisma.ward.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(wards.map(w => ({
      id: w.id,
      code: w.id.substring(0, 8).toUpperCase(),
      name: w.name,
      type: w.type,
      totalBeds: w.totalBeds,
      bedCharge: Number(w.tariffPerDay),
      floor: w.floor || '',
      wing: '',
      status: w.isActive ? 'active' : 'inactive',
    })));
  } catch (error) {
    logger.error('Get master wards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Master data - packages
app.get('/api/master/packages', authenticateToken, async (req: any, res: Response) => {
  try {
    const packages = await prisma.packageMaster.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(packages.map(p => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: JSON.stringify(p.items),
      items: p.items,
      price: Number(p.price),
      status: p.isActive ? 'active' : 'inactive',
    })));
  } catch (error) {
    logger.error('Get master packages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST - Create master data item
app.post('/api/master/:type', authenticateToken, async (req: any, res: Response) => {
  try {
    const { type } = req.params;
    const data = req.body;
    let result;

    switch (type) {
      case 'drugs':
        result = await prisma.drug.create({
          data: {
            name: data.name,
            genericName: data.genericName || data.name,
            category: data.category || 'General',
            form: data.dosageForm || 'Tablet',
            strength: data.strength || '',
            price: data.unitPrice || 0,
            isNarcotic: false,
            isActive: true,
          },
        });
        break;

      case 'lab-tests':
        result = await prisma.labTestMaster.create({
          data: {
            name: data.name,
            code: data.code || `LAB-${Date.now()}`,
            category: data.category || data.sampleType || 'General',
            price: data.price || 0,
            tat: 24,
            isActive: true,
          },
        });
        break;

      case 'radiology-tests':
        result = await prisma.radiologyTestMaster.create({
          data: {
            name: data.name,
            code: data.code || `RAD-${Date.now()}`,
            modality: data.category || 'X-Ray',
            price: data.price || 0,
            tat: 24,
            isActive: true,
          },
        });
        break;

      case 'procedures':
        result = await prisma.procedureMaster.create({
          data: {
            name: data.name,
            code: data.code || `PROC-${Date.now()}`,
            category: data.category || 'General',
            price: data.price || 0,
            isActive: true,
          },
        });
        break;

      case 'departments':
        result = await prisma.department.create({
          data: {
            name: data.name,
            branchId: req.user.branchId,
            type: data.type || 'clinical',
            isActive: true,
          },
        });
        break;

      case 'wards':
        result = await prisma.ward.create({
          data: {
            name: data.name,
            type: data.type || 'General',
            floor: data.floor || '',
            totalBeds: data.totalBeds || 0,
            tariffPerDay: data.bedCharge || 0,
            isActive: true,
          },
        });
        break;

      case 'packages':
        result = await prisma.packageMaster.create({
          data: {
            name: data.name,
            code: data.code || `PKG-${Date.now()}`,
            items: data.items || {},
            price: data.price || 0,
            isActive: true,
          },
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid master data type' });
    }

    // Invalidate relevant cache based on type
    if (type === 'drugs') {
      await redisService.del('master:drugs');
    } else if (type === 'lab-tests') {
      await redisService.del('master:lab-tests');
    }

    res.status(201).json({ id: result.id, message: 'Item created successfully' });
  } catch (error) {
    logger.error('Create master data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT - Update master data item
app.put('/api/master/:type/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { type, id } = req.params;
    const data = req.body;
    let result;

    switch (type) {
      case 'drugs':
        result = await prisma.drug.update({
          where: { id },
          data: {
            name: data.name,
            genericName: data.genericName,
            category: data.category,
            form: data.dosageForm,
            strength: data.strength,
            price: data.unitPrice,
            isActive: data.status === 'active',
          },
        });
        break;

      case 'lab-tests':
        result = await prisma.labTestMaster.update({
          where: { id },
          data: {
            name: data.name,
            code: data.code,
            category: data.category,
            price: data.price,
            isActive: data.status === 'active',
          },
        });
        break;

      case 'radiology-tests':
        result = await prisma.radiologyTestMaster.update({
          where: { id },
          data: {
            name: data.name,
            code: data.code,
            modality: data.category,
            price: data.price,
            isActive: data.status === 'active',
          },
        });
        break;

      case 'procedures':
        result = await prisma.procedureMaster.update({
          where: { id },
          data: {
            name: data.name,
            code: data.code,
            category: data.category,
            price: data.price,
            isActive: data.status === 'active',
          },
        });
        break;

      case 'departments':
        result = await prisma.department.update({
          where: { id },
          data: {
            name: data.name,
            type: data.type,
            isActive: data.status === 'active',
          },
        });
        break;

      case 'wards':
        result = await prisma.ward.update({
          where: { id },
          data: {
            name: data.name,
            type: data.type,
            floor: data.floor,
            totalBeds: data.totalBeds,
            tariffPerDay: data.bedCharge,
            isActive: data.status === 'active',
          },
        });
        break;

      case 'packages':
        result = await prisma.packageMaster.update({
          where: { id },
          data: {
            name: data.name,
            code: data.code,
            items: data.items,
            price: data.price,
            isActive: data.status === 'active',
          },
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid master data type' });
    }

    // Invalidate relevant cache based on type
    if (type === 'drugs') {
      await redisService.del('master:drugs');
    } else if (type === 'lab-tests') {
      await redisService.del('master:lab-tests');
    }

    res.json({ id: result.id, message: 'Item updated successfully' });
  } catch (error) {
    logger.error('Update master data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE - Delete master data item
app.delete('/api/master/:type/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { type, id } = req.params;

    switch (type) {
      case 'drugs':
        await prisma.drug.delete({ where: { id } });
        break;
      case 'lab-tests':
        await prisma.labTestMaster.delete({ where: { id } });
        break;
      case 'radiology-tests':
        await prisma.radiologyTestMaster.delete({ where: { id } });
        break;
      case 'procedures':
        await prisma.procedureMaster.delete({ where: { id } });
        break;
      case 'departments':
        await prisma.department.delete({ where: { id } });
        break;
      case 'wards':
        await prisma.ward.delete({ where: { id } });
        break;
      case 'packages':
        await prisma.packageMaster.delete({ where: { id } });
        break;
      default:
        return res.status(400).json({ error: 'Invalid master data type' });
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    logger.error('Delete master data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// MASTER DATA BULK IMPORT/EXPORT
// ===========================

// Export master data as JSON/CSV
app.get('/api/master/:type/export', authenticateToken, async (req: any, res: Response) => {
  try {
    const { type } = req.params;
    const { format = 'json' } = req.query;

    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'drugs':
        data = await prisma.drug.findMany({
          select: {
            code: true, name: true, genericName: true, category: true, form: true,
            strength: true, price: true, reorderLevel: true, isActive: true,
          },
        });
        filename = 'drugs';
        break;

      case 'lab-tests':
        data = await prisma.labTestMaster.findMany({
          select: {
            code: true, name: true, category: true,
            price: true, tat: true, unit: true, normalRange: true, isActive: true,
          },
        });
        filename = 'lab-tests';
        break;

      case 'radiology-tests':
        data = await prisma.radiologyTestMaster.findMany({
          select: {
            code: true, name: true, modality: true,
            price: true, tat: true, isActive: true,
          },
        });
        filename = 'radiology-tests';
        break;

      case 'procedures':
        data = await prisma.procedureMaster.findMany({
          select: {
            code: true, name: true, category: true,
            price: true, isActive: true,
          },
        });
        filename = 'procedures';
        break;

      case 'departments':
        data = await prisma.department.findMany({
          where: { branchId: req.user.branchId },
          select: {
            name: true, type: true, isActive: true,
          },
        });
        filename = 'departments';
        break;

      case 'wards':
        data = await prisma.ward.findMany({
          select: {
            name: true, type: true, totalBeds: true,
            tariffPerDay: true, floor: true,
          },
        });
        filename = 'wards';
        break;

      case 'packages':
        data = await prisma.packageMaster.findMany({
          select: {
            code: true, name: true, price: true, items: true, isActive: true,
          },
        });
        filename = 'packages';
        break;

      default:
        return res.status(400).json({ error: 'Invalid master data type' });
    }

    if (format === 'csv') {
      // Convert to CSV
      if (data.length === 0) {
        return res.status(404).json({ error: 'No data to export' });
      }

      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')];

      for (const row of data) {
        const values = headers.map(header => {
          const val = row[header];
          if (val === null || val === undefined) return '';
          if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return String(val);
        });
        csvRows.push(values.join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}-export.csv`);
      res.send(csvRows.join('\n'));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}-export.json`);
      res.json({
        exportedAt: new Date().toISOString(),
        type,
        count: data.length,
        data,
      });
    }
  } catch (error) {
    logger.error('Export master data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk import master data
app.post('/api/master/:type/import', authenticateToken, async (req: any, res: Response) => {
  try {
    const { type } = req.params;
    const { data, updateExisting = false } = req.body;
    const branchId = req.user.branchId;

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'Data array is required' });
    }

    const results = {
      total: data.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      try {
        switch (type) {
          case 'drugs': {
            const existing = item.code ? await prisma.drug.findUnique({
              where: { code: item.code },
            }) : null;

            if (existing) {
              if (updateExisting) {
                await prisma.drug.update({
                  where: { id: existing.id },
                  data: {
                    name: item.name,
                    genericName: item.genericName,
                    category: item.category || 'General',
                    form: item.form || 'tablet',
                    strength: item.strength || '',
                    price: parseFloat(item.price) || 0,
                    reorderLevel: parseInt(item.reorderLevel) || 10,
                    isActive: item.isActive !== false,
                  },
                });
                results.updated++;
              } else {
                results.skipped++;
              }
            } else {
              await prisma.drug.create({
                data: {
                  code: item.code || `DRG-${Date.now()}-${i}`,
                  name: item.name,
                  genericName: item.genericName || item.name,
                  category: item.category || 'General',
                  form: item.form || 'tablet',
                  strength: item.strength || '',
                  price: parseFloat(item.price) || 0,
                  reorderLevel: parseInt(item.reorderLevel) || 10,
                  stockQuantity: 0,
                  isActive: item.isActive !== false,
                },
              });
              results.created++;
            }
            break;
          }

          case 'lab-tests': {
            const existing = await prisma.labTestMaster.findUnique({
              where: { code: item.code },
            });

            if (existing) {
              if (updateExisting) {
                await prisma.labTestMaster.update({
                  where: { id: existing.id },
                  data: {
                    name: item.name,
                    category: item.category || 'General',
                    price: parseFloat(item.price) || 0,
                    tat: parseInt(item.tat) || 24,
                    unit: item.unit,
                    normalRange: item.normalRange,
                    isActive: item.isActive !== false,
                  },
                });
                results.updated++;
              } else {
                results.skipped++;
              }
            } else {
              await prisma.labTestMaster.create({
                data: {
                  code: item.code,
                  name: item.name,
                  category: item.category || 'General',
                  price: parseFloat(item.price) || 0,
                  tat: parseInt(item.tat) || 24,
                  unit: item.unit,
                  normalRange: item.normalRange,
                  isActive: item.isActive !== false,
                },
              });
              results.created++;
            }
            break;
          }

          case 'radiology-tests': {
            const existing = await prisma.radiologyTestMaster.findUnique({
              where: { code: item.code },
            });

            if (existing) {
              if (updateExisting) {
                await prisma.radiologyTestMaster.update({
                  where: { id: existing.id },
                  data: {
                    name: item.name,
                    modality: item.modality || 'X-Ray',
                    price: parseFloat(item.price) || 0,
                    tat: parseInt(item.tat) || 24,
                    isActive: item.isActive !== false,
                  },
                });
                results.updated++;
              } else {
                results.skipped++;
              }
            } else {
              await prisma.radiologyTestMaster.create({
                data: {
                  code: item.code,
                  name: item.name,
                  modality: item.modality || 'X-Ray',
                  price: parseFloat(item.price) || 0,
                  tat: parseInt(item.tat) || 24,
                  isActive: item.isActive !== false,
                },
              });
              results.created++;
            }
            break;
          }

          case 'procedures': {
            const existing = await prisma.procedureMaster.findUnique({
              where: { code: item.code },
            });

            if (existing) {
              if (updateExisting) {
                await prisma.procedureMaster.update({
                  where: { id: existing.id },
                  data: {
                    name: item.name,
                    category: item.category || 'General',
                    price: parseFloat(item.price) || 0,
                    isActive: item.isActive !== false,
                  },
                });
                results.updated++;
              } else {
                results.skipped++;
              }
            } else {
              await prisma.procedureMaster.create({
                data: {
                  code: item.code,
                  name: item.name,
                  category: item.category || 'General',
                  price: parseFloat(item.price) || 0,
                  isActive: item.isActive !== false,
                },
              });
              results.created++;
            }
            break;
          }

          case 'departments': {
            // For departments, use name as unique identifier within branch
            const existing = await prisma.department.findFirst({
              where: { name: item.name, branchId },
            });

            if (existing) {
              if (updateExisting) {
                await prisma.department.update({
                  where: { id: existing.id },
                  data: {
                    type: item.type || 'clinical',
                    isActive: item.isActive !== false,
                  },
                });
                results.updated++;
              } else {
                results.skipped++;
              }
            } else {
              await prisma.department.create({
                data: {
                  branchId,
                  name: item.name,
                  type: item.type || 'clinical',
                  isActive: item.isActive !== false,
                },
              });
              results.created++;
            }
            break;
          }

          default:
            results.errors.push(`Row ${i + 1}: Unsupported type ${type}`);
        }
      } catch (itemError: any) {
        results.errors.push(`Row ${i + 1}: ${itemError.message || 'Unknown error'}`);
      }
    }

    // Invalidate relevant cache based on type
    if (type === 'drugs') {
      await redisService.del('master:drugs');
    } else if (type === 'lab-tests') {
      await redisService.del('master:lab-tests');
    }

    res.json({
      message: 'Import completed',
      results,
    });
  } catch (error) {
    logger.error('Import master data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pricing for master data items
app.get('/api/master/:type/pricing', authenticateToken, async (req: any, res: Response) => {
  try {
    const { type } = req.params;
    const { search } = req.query;

    let items: any[] = [];

    switch (type) {
      case 'drugs':
        items = await prisma.drug.findMany({
          where: {
            isActive: true,
            ...(search ? {
              OR: [
                { name: { contains: search as string, mode: 'insensitive' } },
                { code: { contains: search as string, mode: 'insensitive' } },
              ],
            } : {}),
          },
          select: { id: true, code: true, name: true, price: true, category: true },
          orderBy: { name: 'asc' },
        });
        break;

      case 'lab-tests':
        items = await prisma.labTestMaster.findMany({
          where: {
            isActive: true,
            ...(search ? {
              OR: [
                { name: { contains: search as string, mode: 'insensitive' } },
                { code: { contains: search as string, mode: 'insensitive' } },
              ],
            } : {}),
          },
          select: { id: true, code: true, name: true, price: true, category: true },
          orderBy: { name: 'asc' },
        });
        break;

      case 'radiology-tests':
        items = await prisma.radiologyTestMaster.findMany({
          where: {
            isActive: true,
            ...(search ? {
              OR: [
                { name: { contains: search as string, mode: 'insensitive' } },
                { code: { contains: search as string, mode: 'insensitive' } },
              ],
            } : {}),
          },
          select: { id: true, code: true, name: true, price: true, modality: true },
          orderBy: { name: 'asc' },
        });
        break;

      case 'procedures':
        items = await prisma.procedureMaster.findMany({
          where: {
            isActive: true,
            ...(search ? {
              OR: [
                { name: { contains: search as string, mode: 'insensitive' } },
                { code: { contains: search as string, mode: 'insensitive' } },
              ],
            } : {}),
          },
          select: { id: true, code: true, name: true, price: true, category: true },
          orderBy: { name: 'asc' },
        });
        break;

      case 'packages':
        items = await prisma.packageMaster.findMany({
          where: {
            isActive: true,
            ...(search ? {
              OR: [
                { name: { contains: search as string, mode: 'insensitive' } },
                { code: { contains: search as string, mode: 'insensitive' } },
              ],
            } : {}),
          },
          select: { id: true, code: true, name: true, price: true },
          orderBy: { name: 'asc' },
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid master data type' });
    }

    res.json({
      type,
      count: items.length,
      items: items.map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.category || item.modality || 'General',
        price: Number(item.price || 0),
      })),
    });
  } catch (error) {
    logger.error('Get pricing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk update pricing
app.put('/api/master/:type/pricing', authenticateToken, async (req: any, res: Response) => {
  try {
    const { type } = req.params;
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Updates array is required' });
    }

    const results = {
      total: updates.length,
      updated: 0,
      errors: [] as string[],
    };

    for (const update of updates) {
      try {
        if (!update.id || update.price === undefined) {
          results.errors.push(`Invalid update: missing id or price`);
          continue;
        }

        const newPrice = parseFloat(update.price);
        if (isNaN(newPrice) || newPrice < 0) {
          results.errors.push(`Invalid price for ID ${update.id}`);
          continue;
        }

        switch (type) {
          case 'drugs':
            await prisma.drug.update({
              where: { id: update.id },
              data: { price: newPrice },
            });
            break;
          case 'lab-tests':
            await prisma.labTestMaster.update({
              where: { id: update.id },
              data: { price: newPrice },
            });
            break;
          case 'radiology-tests':
            await prisma.radiologyTestMaster.update({
              where: { id: update.id },
              data: { price: newPrice },
            });
            break;
          case 'procedures':
            await prisma.procedureMaster.update({
              where: { id: update.id },
              data: { price: newPrice },
            });
            break;
          case 'packages':
            await prisma.packageMaster.update({
              where: { id: update.id },
              data: { price: newPrice },
            });
            break;
          default:
            results.errors.push(`Unsupported type: ${type}`);
            continue;
        }

        results.updated++;
      } catch (updateError: any) {
        results.errors.push(`Error updating ${update.id}: ${updateError.message}`);
      }
    }

    // Invalidate relevant cache based on type
    if (type === 'drugs') {
      await redisService.del('master:drugs');
    } else if (type === 'lab-tests') {
      await redisService.del('master:lab-tests');
    }

    res.json({
      message: 'Pricing update completed',
      results,
    });
  } catch (error) {
    logger.error('Update pricing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// SYSTEM CONTROL APIs
// ===========================

// Get all users
app.get('/api/users', authenticateToken, async (req: any, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { name: 'asc' },
    });

    // Map roleId to display name
    const roleDisplayNames: Record<string, string> = {
      'ADMIN': 'Admin',
      'DOCTOR': 'Doctor',
      'NURSE': 'Nurse',
      'FRONT_OFFICE': 'Receptionist',
      'PHARMACIST': 'Pharmacist',
      'LAB_TECH': 'Lab Technician',
      'BILLING': 'Accountant',
      'RADIOLOGY_TECH': 'Radiology Tech',
      'IPD_STAFF': 'IPD Staff',
      'OT_STAFF': 'OT Staff',
      'ICU': 'ICU Staff',
      'EMERGENCY': 'Emergency Staff',
    };

    res.json(users.map(u => ({
      id: u.id,
      username: u.username,
      fullName: u.name,
      email: u.email,
      phone: '',
      role: roleDisplayNames[u.roleIds[0]] || u.roleIds[0] || 'User',
      status: u.isActive ? 'active' : 'inactive',
      lastLogin: u.lastLoginAt?.toISOString(),
      createdAt: u.createdAt.toISOString(),
    })));
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user
app.post('/api/users', authenticateToken, requirePermission('users:manage'), validateBody(createUserSchema), async (req: any, res: Response) => {
  try {
    const { username, fullName, email, phone, role, password } = req.body;
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(password || 'password123', 10);

    const user = await prisma.user.create({
      data: {
        username,
        name: fullName,
        email,
        passwordHash,
        tenantId: req.user.tenantId,
        branchId: req.user.branchId,
        roleIds: [role],
        isActive: true,
      },
    });

    res.status(201).json({
      id: user.id,
      username: user.username,
      fullName: user.name,
      email: user.email,
      role: user.roleIds[0],
      status: 'active',
    });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
app.put('/api/users/:id', authenticateToken, requirePermission('users:manage'), validateBody(updateUserSchema), async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { username, fullName, email, role, status } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        username,
        name: fullName,
        email,
        roleIds: role ? [role] : undefined,
        isActive: status === 'active',
      },
    });

    res.json({
      id: user.id,
      username: user.username,
      fullName: user.name,
      email: user.email,
      role: user.roleIds[0],
      status: user.isActive ? 'active' : 'inactive',
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user
app.delete('/api/users/:id', authenticateToken, requirePermission('users:manage'), async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    // Prevent self-deletion
    if (id === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset user password (admin only)
app.post('/api/users/:id/reset-password', authenticateToken, requirePermission('users:manage'), async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change current user's password
app.post('/api/users/change-password', authenticateToken, async (req: any, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const bcrypt = await import('bcryptjs');
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get audit logs
app.get('/api/audit-logs', authenticateToken, async (req: any, res: Response) => {
  try {
    const { module, dateFrom, dateTo } = req.query;

    const where: any = {};
    if (module) where.resource = module;
    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) where.timestamp.gte = new Date(dateFrom as string);
      if (dateTo) where.timestamp.lte = new Date(dateTo as string);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { name: true, username: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    res.json(logs.map(log => ({
      id: log.id,
      userId: log.userId,
      userName: log.user?.username || log.performedBy || 'System',
      action: log.action,
      module: log.resource,
      details: log.resourceId ? `Resource ID: ${log.resourceId}` : '',
      ipAddress: log.ipAddress || 'N/A',
      timestamp: log.timestamp.toISOString(),
    })));
  } catch (error) {
    logger.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export audit logs as CSV
app.get('/api/audit-logs/export', authenticateToken, async (req: any, res: Response) => {
  try {
    const { module, dateFrom, dateTo } = req.query;

    const where: any = {};
    if (module) where.resource = module;
    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) where.timestamp.gte = new Date(dateFrom as string);
      if (dateTo) where.timestamp.lte = new Date(dateTo as string);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { name: true, username: true } },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Convert to CSV format
    const csvHeaders = ['Timestamp', 'User', 'Module', 'Action', 'Resource ID', 'IP Address'];
    const csvRows = logs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.user?.username || log.performedBy || 'System',
      log.resource || 'N/A',
      log.action || 'N/A',
      log.resourceId || '',
      log.ipAddress || 'N/A',
    ]);

    // Build CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    logger.error('Export audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get system settings
app.get('/api/settings', authenticateToken, async (req: any, res: Response) => {
  try {
    // Return tenant/branch config as settings
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
    });
    const branch = await prisma.branch.findUnique({
      where: { id: req.user.branchId },
    });

    const settings = [
      { id: '1', category: 'hospital', key: 'name', value: tenant?.name || '', description: 'Hospital name' },
      { id: '2', category: 'hospital', key: 'address', value: tenant?.address || '', description: 'Hospital address' },
      { id: '3', category: 'hospital', key: 'phone', value: tenant?.contact || '', description: 'Contact phone' },
    ];

    res.json(settings);
  } catch (error) {
    logger.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save hospital settings
app.post('/api/settings/hospital', authenticateToken, async (req: any, res: Response) => {
  try {
    const { name, address, phone, email } = req.body;

    await prisma.tenant.update({
      where: { id: req.user.tenantId },
      data: {
        name: name || undefined,
        address: address || undefined,
        contact: phone || undefined,
      },
    });

    res.json({ message: 'Hospital settings saved successfully' });
  } catch (error) {
    logger.error('Save hospital settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get email config
app.get('/api/settings/email', authenticateToken, async (req: any, res: Response) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
    });
    const config = (tenant?.config as any) || {};
    const emailConfig = config.email || {};

    res.json({
      provider: emailConfig.provider || 'smtp',
      host: emailConfig.host || '',
      port: emailConfig.port || 587,
      user: emailConfig.user || '',
      from: emailConfig.from || '',
      secure: emailConfig.secure || false,
      enabled: emailConfig.enabled || false,
    });
  } catch (error) {
    logger.error('Get email config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save email config
app.post('/api/settings/email', authenticateToken, async (req: any, res: Response) => {
  try {
    const { provider, host, port, user, pass, from, secure, enabled, apiKey } = req.body;

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
    });
    const currentConfig = (tenant?.config as any) || {};

    const emailConfig: any = {
      provider: provider || 'smtp',
      host: host || '',
      port: port || 587,
      user: user || '',
      from: from || '',
      secure: secure || false,
      enabled: enabled || false,
    };

    // Only update password if provided
    if (pass) {
      emailConfig.pass = pass;
    } else if (currentConfig.email?.pass) {
      emailConfig.pass = currentConfig.email.pass;
    }

    // Store API key for providers like SendGrid
    if (apiKey) {
      emailConfig.apiKey = apiKey;
    } else if (currentConfig.email?.apiKey) {
      emailConfig.apiKey = currentConfig.email.apiKey;
    }

    await prisma.tenant.update({
      where: { id: req.user.tenantId },
      data: {
        config: {
          ...currentConfig,
          email: emailConfig,
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'UPDATE',
        resource: 'settings',
        resourceId: 'email',
        newValue: { provider, host, port, from, enabled },
        ipAddress: req.ip,
        performedBy: req.user.userId,
      },
    });

    res.json({ message: 'Email configuration saved successfully' });
  } catch (error) {
    logger.error('Save email config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test email config
app.post('/api/settings/email/test', authenticateToken, async (req: any, res: Response) => {
  try {
    const { testEmail } = req.body;

    if (!testEmail) {
      return res.status(400).json({ error: 'Test email address is required' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
    });
    const config = (tenant?.config as any) || {};
    const emailConfig = config.email || {};

    if (!emailConfig.enabled) {
      return res.status(400).json({ error: 'Email is not enabled. Please enable and save configuration first.' });
    }

    // Use notification service to send test email
    const { notificationService } = require('./services/notification');
    const result = await notificationService.send({
      type: 'PASSWORD_RESET',
      recipientEmail: testEmail,
      subject: 'Test Email from Hospital ERP',
      message: 'This is a test email to verify your email configuration is working correctly.',
      data: {
        userName: req.user.username,
        otp: '123456',
        hospitalName: tenant?.name || 'Hospital ERP',
      },
    });

    if (result.email) {
      res.json({ message: 'Test email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send test email. Check configuration.' });
    }
  } catch (error) {
    logger.error('Test email error:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// Get SMS config
app.get('/api/settings/sms', authenticateToken, async (req: any, res: Response) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
    });
    const config = (tenant?.config as any) || {};
    const smsConfig = config.sms || {};

    res.json({
      provider: smsConfig.provider || 'twilio',
      senderId: smsConfig.senderId || '',
      enabled: smsConfig.enabled || false,
      // Don't return sensitive keys
      hasApiKey: !!smsConfig.apiKey,
      hasApiSecret: !!smsConfig.apiSecret,
    });
  } catch (error) {
    logger.error('Get SMS config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save SMS config
app.post('/api/settings/sms', authenticateToken, async (req: any, res: Response) => {
  try {
    const { provider, apiKey, apiSecret, senderId, enabled, accountSid, authToken } = req.body;

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
    });
    const currentConfig = (tenant?.config as any) || {};

    const smsConfig: any = {
      provider: provider || 'twilio',
      senderId: senderId || '',
      enabled: enabled || false,
    };

    // Only update keys if provided (supports both generic and Twilio-specific fields)
    if (apiKey || accountSid) {
      smsConfig.apiKey = apiKey || accountSid;
    } else if (currentConfig.sms?.apiKey) {
      smsConfig.apiKey = currentConfig.sms.apiKey;
    }

    if (apiSecret || authToken) {
      smsConfig.apiSecret = apiSecret || authToken;
    } else if (currentConfig.sms?.apiSecret) {
      smsConfig.apiSecret = currentConfig.sms.apiSecret;
    }

    await prisma.tenant.update({
      where: { id: req.user.tenantId },
      data: {
        config: {
          ...currentConfig,
          sms: smsConfig,
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'UPDATE',
        resource: 'settings',
        resourceId: 'sms',
        newValue: { provider, senderId, enabled },
        ipAddress: req.ip,
        performedBy: req.user.userId,
      },
    });

    res.json({ message: 'SMS configuration saved successfully' });
  } catch (error) {
    logger.error('Save SMS config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test SMS config
app.post('/api/settings/sms/test', authenticateToken, async (req: any, res: Response) => {
  try {
    const { testPhone } = req.body;

    if (!testPhone) {
      return res.status(400).json({ error: 'Test phone number is required' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
    });
    const config = (tenant?.config as any) || {};
    const smsConfig = config.sms || {};

    if (!smsConfig.enabled) {
      return res.status(400).json({ error: 'SMS is not enabled. Please enable and save configuration first.' });
    }

    // Use notification service to send test SMS
    const { notificationService } = require('./services/notification');
    const result = await notificationService.send({
      type: 'PASSWORD_RESET',
      recipientPhone: testPhone,
      message: `Test SMS from ${tenant?.name || 'Hospital ERP'}. Your OTP is 123456.`,
      data: {
        otp: '123456',
        hospitalName: tenant?.name || 'Hospital ERP',
      },
    });

    if (result.sms) {
      res.json({ message: 'Test SMS sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send test SMS. Check configuration.' });
    }
  } catch (error) {
    logger.error('Test SMS error:', error);
    res.status(500).json({ error: 'Failed to send test SMS' });
  }
});

// Get reports config (placeholder)
app.get('/api/reports', authenticateToken, async (req: any, res: Response) => {
  try {
    // Return mock reports for now
    res.json([]);
  } catch (error) {
    logger.error('Get reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// TPA & INSURANCE APIs
// ===========================

// Add insurance company
app.post('/api/insurance-companies', authenticateToken, async (req: any, res: Response) => {
  try {
    const { name, code, contact, email, address } = req.body;

    const company = await prisma.tPAMaster.create({
      data: {
        name,
        type: 'Insurance',
        contactPerson: '',
        contact,
        email,
        address,
        isActive: true,
      },
    });

    res.status(201).json({
      id: company.id,
      name: company.name,
      code: code || company.id.substring(0, 6).toUpperCase(),
      contact: company.contact,
      email: company.email,
      address: company.address,
      status: 'active',
    });
  } catch (error) {
    logger.error('Create insurance company error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get patient insurances
app.get('/api/patient-insurances', authenticateToken, async (req: any, res: Response) => {
  try {
    const patientInsurances = await prisma.patientInsurance.findMany({
      include: {
        patient: { select: { id: true, name: true, mrn: true } },
        tpa: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(patientInsurances.map(pi => ({
      id: pi.id,
      patientId: pi.patientId,
      patientName: pi.patient.name,
      patientMRN: pi.patient.mrn,
      insuranceCompanyId: pi.tpaId,
      insuranceCompanyName: pi.tpa.name,
      policyNumber: pi.policyNumber,
      policyHolderName: pi.policyHolderName || pi.patient.name,
      validFrom: pi.validFrom.toISOString().split('T')[0],
      validTill: pi.validTill.toISOString().split('T')[0],
      sumInsured: Number(pi.sumInsured),
      status: pi.isActive && new Date(pi.validTill) > new Date() ? 'active' : 'expired',
    })));
  } catch (error) {
    logger.error('Get patient insurances error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add patient insurance
app.post('/api/patient-insurances', authenticateToken, async (req: any, res: Response) => {
  try {
    const { patientId, insuranceCompanyId, policyNumber, policyHolderName, validFrom, validTill, sumInsured } = req.body;

    // If patientId is passed as patientName (from frontend), find or create patient
    let actualPatientId = patientId;
    if (!patientId || patientId === '') {
      // Use first patient as demo
      const patient = await prisma.patient.findFirst();
      if (!patient) {
        return res.status(400).json({ error: 'No patients found in the system' });
      }
      actualPatientId = patient.id;
    }

    const patientInsurance = await prisma.patientInsurance.create({
      data: {
        patientId: actualPatientId,
        tpaId: insuranceCompanyId,
        policyNumber,
        policyHolderName,
        validFrom: new Date(validFrom),
        validTill: new Date(validTill),
        sumInsured: sumInsured || 0,
        isActive: true,
      },
      include: {
        patient: { select: { name: true, mrn: true } },
        tpa: { select: { name: true } },
      },
    });

    res.status(201).json({
      id: patientInsurance.id,
      patientId: patientInsurance.patientId,
      patientName: patientInsurance.patient.name,
      patientMRN: patientInsurance.patient.mrn,
      insuranceCompanyId: patientInsurance.tpaId,
      insuranceCompanyName: patientInsurance.tpa.name,
      policyNumber: patientInsurance.policyNumber,
      policyHolderName: patientInsurance.policyHolderName,
      validFrom: patientInsurance.validFrom.toISOString().split('T')[0],
      validTill: patientInsurance.validTill.toISOString().split('T')[0],
      sumInsured: Number(patientInsurance.sumInsured),
      status: 'active',
    });
  } catch (error) {
    logger.error('Create patient insurance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// CLAIMS MANAGEMENT ROUTES
// ===========================

// Get all claims
app.get('/api/claims', authenticateToken, async (req: any, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    const claims = await prisma.claim.findMany({
      where: { tenantId },
      orderBy: { submittedDate: 'desc' },
    });

    const claimsWithDetails = await Promise.all(
      claims.map(async (claim) => {
        const patient = await prisma.patient.findUnique({
          where: { id: claim.patientId },
          select: { name: true, mrn: true },
        });

        let insuranceCompanyName = '';
        let policyNumber = '';

        if (claim.patientInsuranceId) {
          const patientInsurance = await prisma.patientInsurance.findUnique({
            where: { id: claim.patientInsuranceId },
            include: { tpa: { select: { name: true } } },
          });
          insuranceCompanyName = patientInsurance?.tpa.name || '';
          policyNumber = patientInsurance?.policyNumber || '';
        }

        return {
          id: claim.id,
          claimNumber: claim.claimNumber,
          patientId: claim.patientId,
          patientName: patient?.name || '',
          patientMRN: patient?.mrn || '',
          patientInsuranceId: claim.patientInsuranceId,
          insuranceCompanyId: claim.insuranceCompanyId,
          insuranceCompanyName,
          policyNumber,
          admissionId: claim.admissionId,
          claimType: claim.claimType,
          claimAmount: Number(claim.claimAmount),
          approvedAmount: Number(claim.approvedAmount),
          rejectedAmount: Number(claim.rejectedAmount),
          status: claim.status,
          submittedDate: claim.submittedDate.toISOString(),
          approvedDate: claim.approvedDate?.toISOString(),
          settledDate: claim.settledDate?.toISOString(),
          documents: claim.documents || [],
          remarks: claim.remarks,
        };
      })
    );

    res.json(claimsWithDetails);
  } catch (error) {
    logger.error('Get claims error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get claim by ID
app.get('/api/claims/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const claim = await prisma.claim.findFirst({
      where: { id, tenantId },
    });

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const patient = await prisma.patient.findUnique({
      where: { id: claim.patientId },
      select: { name: true, mrn: true },
    });

    let insuranceCompanyName = '';
    let policyNumber = '';

    if (claim.patientInsuranceId) {
      const patientInsurance = await prisma.patientInsurance.findUnique({
        where: { id: claim.patientInsuranceId },
        include: { tpa: { select: { name: true } } },
      });
      insuranceCompanyName = patientInsurance?.tpa.name || '';
      policyNumber = patientInsurance?.policyNumber || '';
    }

    const settlements = await prisma.settlement.findMany({
      where: { claimId: id },
      orderBy: { settlementDate: 'desc' },
    });

    res.json({
      id: claim.id,
      claimNumber: claim.claimNumber,
      patientId: claim.patientId,
      patientName: patient?.name || '',
      patientMRN: patient?.mrn || '',
      patientInsuranceId: claim.patientInsuranceId,
      insuranceCompanyId: claim.insuranceCompanyId,
      insuranceCompanyName,
      policyNumber,
      admissionId: claim.admissionId,
      claimType: claim.claimType,
      claimAmount: Number(claim.claimAmount),
      approvedAmount: Number(claim.approvedAmount),
      rejectedAmount: Number(claim.rejectedAmount),
      status: claim.status,
      submittedDate: claim.submittedDate.toISOString(),
      approvedDate: claim.approvedDate?.toISOString(),
      settledDate: claim.settledDate?.toISOString(),
      documents: claim.documents || [],
      remarks: claim.remarks,
      settlements: settlements.map(s => ({
        id: s.id,
        settlementNumber: s.settlementNumber,
        settlementAmount: Number(s.settlementAmount),
        settlementDate: s.settlementDate.toISOString(),
        paymentMode: s.paymentMode,
        transactionRef: s.transactionRef,
        remarks: s.remarks,
      })),
    });
  } catch (error) {
    logger.error('Get claim by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new claim
app.post('/api/claims', authenticateToken, async (req: any, res: Response) => {
  try {
    const {
      patientId,
      patientInsuranceId,
      insuranceCompanyId,
      invoiceId,
      admissionId,
      claimType,
      claimAmount,
      documents,
      remarks,
    } = req.body;

    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    const claimCount = await prisma.claim.count({ where: { tenantId } });
    const claimNumber = `CLM-${String(claimCount + 1).padStart(6, '0')}`;

    const claim = await prisma.claim.create({
      data: {
        tenantId,
        claimNumber,
        patientId,
        patientInsuranceId,
        insuranceCompanyId,
        invoiceId,
        admissionId,
        claimType: claimType?.toLowerCase() || 'cashless',
        claimAmount: claimAmount || 0,
        approvedAmount: 0,
        rejectedAmount: 0,
        status: 'submitted',
        documents: documents || [],
        remarks,
        createdBy: userId,
      },
    });

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { name: true, mrn: true },
    });

    res.status(201).json({
      id: claim.id,
      claimNumber: claim.claimNumber,
      patientId: claim.patientId,
      patientName: patient?.name || '',
      patientMRN: patient?.mrn || '',
      status: claim.status,
      submittedDate: claim.submittedDate.toISOString(),
    });
  } catch (error) {
    logger.error('Create claim error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update claim status
app.put('/api/claims/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status, approvedAmount, rejectedAmount, remarks, rejectionReason } = req.body;
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    const claim = await prisma.claim.findFirst({
      where: { id, tenantId },
    });

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const updateData: any = {
      status: status?.toLowerCase() || claim.status,
      updatedBy: userId,
    };

    if (approvedAmount !== undefined) {
      updateData.approvedAmount = approvedAmount;
    }

    if (rejectedAmount !== undefined) {
      updateData.rejectedAmount = rejectedAmount;
    }

    if (remarks !== undefined) {
      updateData.remarks = remarks;
    }

    if (rejectionReason !== undefined) {
      updateData.rejectionReason = rejectionReason;
    }

    if (status === 'approved' && !claim.approvedDate) {
      updateData.approvedDate = new Date();
    }

    if (status === 'rejected' && !claim.rejectedDate) {
      updateData.rejectedDate = new Date();
    }

    if (status === 'settled' && !claim.settledDate) {
      updateData.settledDate = new Date();
    }

    const updatedClaim = await prisma.claim.update({
      where: { id },
      data: updateData,
    });

    res.json({
      id: updatedClaim.id,
      claimNumber: updatedClaim.claimNumber,
      status: updatedClaim.status,
      approvedAmount: Number(updatedClaim.approvedAmount),
      rejectedAmount: Number(updatedClaim.rejectedAmount),
      approvedDate: updatedClaim.approvedDate?.toISOString(),
      rejectedDate: updatedClaim.rejectedDate?.toISOString(),
      settledDate: updatedClaim.settledDate?.toISOString(),
      remarks: updatedClaim.remarks,
    });
  } catch (error) {
    logger.error('Update claim error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// SETTLEMENT TRACKING ROUTES
// ===========================

// Get all settlements
app.get('/api/settlements', authenticateToken, async (req: any, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    const settlements = await prisma.settlement.findMany({
      where: { tenantId },
      include: {
        claim: {
          select: {
            claimNumber: true,
            patientId: true,
            claimAmount: true,
          },
        },
      },
      orderBy: { settlementDate: 'desc' },
    });

    const settlementsWithDetails = await Promise.all(
      settlements.map(async (settlement) => {
        const patient = await prisma.patient.findUnique({
          where: { id: settlement.claim.patientId },
          select: { name: true, mrn: true },
        });

        return {
          id: settlement.id,
          settlementNumber: settlement.settlementNumber,
          claimId: settlement.claimId,
          claimNumber: settlement.claim.claimNumber,
          patientName: patient?.name || '',
          patientMRN: patient?.mrn || '',
          claimAmount: Number(settlement.claim.claimAmount),
          settlementAmount: Number(settlement.settlementAmount),
          settlementDate: settlement.settlementDate.toISOString(),
          paymentMode: settlement.paymentMode,
          transactionRef: settlement.transactionRef,
          remarks: settlement.remarks,
          settledBy: settlement.settledBy,
        };
      })
    );

    res.json(settlementsWithDetails);
  } catch (error) {
    logger.error('Get settlements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new settlement
app.post('/api/settlements', authenticateToken, async (req: any, res: Response) => {
  try {
    const {
      claimId,
      settlementAmount,
      settlementDate,
      paymentMode,
      transactionRef,
      remarks,
    } = req.body;

    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    const claim = await prisma.claim.findFirst({
      where: { id: claimId, tenantId },
    });

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const settlementCount = await prisma.settlement.count({ where: { tenantId } });
    const settlementNumber = `SET-${String(settlementCount + 1).padStart(6, '0')}`;

    const settlement = await prisma.settlement.create({
      data: {
        tenantId,
        settlementNumber,
        claimId,
        settlementAmount: settlementAmount || 0,
        settlementDate: settlementDate ? new Date(settlementDate) : new Date(),
        paymentMode,
        transactionRef,
        remarks,
        settledBy: userId,
      },
    });

    await prisma.claim.update({
      where: { id: claimId },
      data: {
        status: 'settled',
        settledDate: settlement.settlementDate,
      },
    });

    res.status(201).json({
      id: settlement.id,
      settlementNumber: settlement.settlementNumber,
      claimId: settlement.claimId,
      settlementAmount: Number(settlement.settlementAmount),
      settlementDate: settlement.settlementDate.toISOString(),
      paymentMode: settlement.paymentMode,
    });
  } catch (error) {
    logger.error('Create settlement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Legacy TPA claims route (for backward compatibility)
app.get('/api/tpa/claims', authenticateToken, async (req: any, res: Response) => {
  try {
    const tenantId = req.user.tenantId;

    const claims = await prisma.claim.findMany({
      where: { tenantId },
      orderBy: { submittedDate: 'desc' },
    });

    const claimsWithDetails = await Promise.all(
      claims.map(async (claim) => {
        const patient = await prisma.patient.findUnique({
          where: { id: claim.patientId },
          select: { name: true, mrn: true },
        });

        let insuranceCompanyName = '';
        let policyNumber = '';

        if (claim.patientInsuranceId) {
          const patientInsurance = await prisma.patientInsurance.findUnique({
            where: { id: claim.patientInsuranceId },
            include: { tpa: { select: { name: true } } },
          });
          insuranceCompanyName = patientInsurance?.tpa.name || '';
          policyNumber = patientInsurance?.policyNumber || '';
        }

        return {
          id: claim.id,
          claimNumber: claim.claimNumber,
          patientId: claim.patientId,
          patientName: patient?.name || '',
          patientMRN: patient?.mrn || '',
          patientInsuranceId: claim.patientInsuranceId,
          insuranceCompanyId: claim.insuranceCompanyId,
          insuranceCompanyName,
          policyNumber,
          admissionId: claim.admissionId,
          claimType: claim.claimType.charAt(0).toUpperCase() + claim.claimType.slice(1),
          claimAmount: Number(claim.claimAmount),
          approvedAmount: Number(claim.approvedAmount),
          rejectedAmount: Number(claim.rejectedAmount),
          status: claim.status.charAt(0).toUpperCase() + claim.status.slice(1).replace('_', ' '),
          submittedDate: claim.submittedDate.toISOString(),
          approvedDate: claim.approvedDate?.toISOString(),
          settledDate: claim.settledDate?.toISOString(),
          documents: claim.documents || [],
          remarks: claim.remarks,
        };
      })
    );

    res.json(claimsWithDetails);
  } catch (error) {
    logger.error('Get TPA claims error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Legacy TPA claim submission
app.post('/api/tpa/claims', authenticateToken, async (req: any, res: Response) => {
  try {
    const {
      patientId,
      patientInsuranceId,
      insuranceCompanyId,
      admissionId,
      claimType,
      claimAmount,
      documents,
    } = req.body;

    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    const claimCount = await prisma.claim.count({ where: { tenantId } });
    const claimNumber = `CLM-${String(claimCount + 1).padStart(6, '0')}`;

    const claim = await prisma.claim.create({
      data: {
        tenantId,
        claimNumber,
        patientId,
        patientInsuranceId,
        insuranceCompanyId,
        admissionId,
        claimType: claimType?.toLowerCase() || 'cashless',
        claimAmount: claimAmount || 0,
        approvedAmount: 0,
        rejectedAmount: 0,
        status: 'submitted',
        documents: documents || [],
        createdBy: userId,
      },
    });

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { name: true, mrn: true },
    });

    res.status(201).json({
      id: claim.id,
      claimNumber: claim.claimNumber,
      patientId: claim.patientId,
      patientName: patient?.name || '',
      patientMRN: patient?.mrn || '',
      status: 'Submitted',
      submittedDate: claim.submittedDate.toISOString(),
    });
  } catch (error) {
    logger.error('Submit TPA claim error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pre-authorizations
app.get('/api/tpa/pre-authorizations', authenticateToken, async (req: any, res: Response) => {
  try {
    const preAuths = await prisma.preAuthorization.findMany({
      include: {
        patient: { select: { name: true, mrn: true } },
        tpa: { select: { name: true } },
      },
      orderBy: { requestDate: 'desc' },
    });

    res.json(preAuths.map(pa => ({
      id: pa.id,
      patientId: pa.patientId,
      patientName: pa.patient.name,
      patientInsuranceId: pa.tpaId,
      insuranceCompanyName: pa.tpa.name,
      policyNumber: pa.approvalNumber || '',
      procedure: pa.procedurePlanned || '',
      estimatedAmount: Number(pa.requestedAmount),
      approvedAmount: Number(pa.approvedAmount) || 0,
      status: pa.status === 'approved' ? 'Approved' : pa.status === 'rejected' ? 'Rejected' : 'Pending',
      requestedDate: pa.requestDate.toISOString(),
      approvedDate: pa.approvalDate?.toISOString(),
    })));
  } catch (error) {
    logger.error('Get pre-authorizations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit pre-authorization
app.post('/api/tpa/pre-authorizations', authenticateToken, validateBody(preAuthorizationSchema), async (req: any, res: Response) => {
  try {
    const { patientInsuranceId, procedure, estimatedAmount, patientId } = req.body;

    // Get a patient if patientId not provided
    let actualPatientId = patientId;
    if (!actualPatientId) {
      const patient = await prisma.patient.findFirst();
      actualPatientId = patient?.id;
    }

    if (!actualPatientId) {
      return res.status(400).json({ error: 'No patient found' });
    }

    const preAuth = await prisma.preAuthorization.create({
      data: {
        patientId: actualPatientId,
        tpaId: patientInsuranceId,
        requestedAmount: estimatedAmount || 0,
        procedurePlanned: procedure,
        status: 'pending',
      },
      include: {
        patient: { select: { name: true } },
        tpa: { select: { name: true } },
      },
    });

    res.status(201).json({
      id: preAuth.id,
      patientId: preAuth.patientId,
      patientName: preAuth.patient.name,
      insuranceCompanyName: preAuth.tpa.name,
      procedure: preAuth.procedurePlanned,
      estimatedAmount: Number(preAuth.requestedAmount),
      approvedAmount: 0,
      status: 'Pending',
      requestedDate: preAuth.requestDate.toISOString(),
    });
  } catch (error) {
    logger.error('Submit pre-authorization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update pre-authorization (approve/reject)
app.put('/api/tpa/pre-authorizations/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status, approvedAmount, remarks } = req.body;

    const preAuth = await prisma.preAuthorization.findUnique({
      where: { id },
    });

    if (!preAuth) {
      return res.status(404).json({ error: 'Pre-authorization not found' });
    }

    const updateData: any = {
      status: status?.toLowerCase() || preAuth.status,
      remarks: remarks !== undefined ? remarks : preAuth.remarks,
    };

    if (approvedAmount !== undefined) {
      updateData.approvedAmount = approvedAmount;
    }

    if (status === 'approved' && !preAuth.approvalDate) {
      updateData.approvalDate = new Date();
      updateData.approvalNumber = `PA-${String(Date.now()).slice(-8)}`;
    }

    const updatedPreAuth = await prisma.preAuthorization.update({
      where: { id },
      data: updateData,
      include: {
        patient: { select: { name: true } },
        tpa: { select: { name: true } },
      },
    });

    res.json({
      id: updatedPreAuth.id,
      patientId: updatedPreAuth.patientId,
      patientName: updatedPreAuth.patient.name,
      insuranceCompanyName: updatedPreAuth.tpa.name,
      procedure: updatedPreAuth.procedurePlanned,
      estimatedAmount: Number(updatedPreAuth.requestedAmount),
      approvedAmount: Number(updatedPreAuth.approvedAmount) || 0,
      status: updatedPreAuth.status === 'approved' ? 'Approved' : updatedPreAuth.status === 'rejected' ? 'Rejected' : 'Pending',
      requestedDate: updatedPreAuth.requestDate.toISOString(),
      approvedDate: updatedPreAuth.approvalDate?.toISOString(),
      approvalNumber: updatedPreAuth.approvalNumber,
      remarks: updatedPreAuth.remarks,
    });
  } catch (error) {
    logger.error('Update pre-authorization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ICU patients
app.get('/api/icu/patients', authenticateToken, async (req: any, res: Response) => {
  try {
    const icuBeds = await prisma.iCUBed.findMany({
      where: {
        status: 'occupied',
      },
    });

    res.json(icuBeds.map(b => ({
      id: b.id,
      bedNumber: b.bedNumber,
      icuUnit: b.icuUnit,
      status: b.status,
      currentPatient: b.currentPatient,
      admissionId: b.admissionId,
      ventilatorId: b.ventilatorId,
    })));
  } catch (error) {
    logger.error('Get ICU patients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// IPD BILLING ROUTES
// ===========================

// Get IPD billing details for an admission
app.get('/api/ipd-billing/:admissionId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { admissionId } = req.params;

    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        patient: { select: { name: true, mrn: true } },
        bed: true,
        admittingDoctor: { select: { name: true } },
        encounter: {
          include: {
            invoices: {
              where: { type: 'ipd' },
              include: { payments: true },
            },
            orders: true,
          },
        },
      },
    });

    if (!admission) {
      return res.status(404).json({ error: 'Admission not found' });
    }

    // Calculate days of stay
    const admitDate = new Date(admission.admissionDate);
    const dischargeDate = admission.dischargeDate ? new Date(admission.dischargeDate) : new Date();
    const totalDays = Math.ceil((dischargeDate.getTime() - admitDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;

    // Get ward tariff if available
    let bedChargePerDay = 1500; // Default rate
    if (admission.bed?.wardId) {
      const ward = await prisma.ward.findUnique({ where: { id: admission.bed.wardId } });
      if (ward) bedChargePerDay = Number(ward.tariffPerDay);
    } else {
      // Set rate based on bed category
      const categoryRates: Record<string, number> = {
        'general': 1500,
        'semi-private': 2500,
        'private': 4000,
        'deluxe': 6000,
        'icu': 8000,
        'nicu': 10000,
      };
      bedChargePerDay = categoryRates[admission.bed?.category?.toLowerCase() || 'general'] || 1500;
    }

    const charges: any[] = [];

    // Add bed charges
    charges.push({
      id: `bed-${admissionId}`,
      admissionId,
      category: 'bed',
      description: `${admission.bed?.category || 'General'} Ward - Bed ${admission.bed?.bedNumber || 'N/A'}`,
      quantity: totalDays,
      unitPrice: bedChargePerDay,
      total: totalDays * bedChargePerDay,
      date: admission.admissionDate.toISOString(),
    });

    // Add charges from orders (lab, radiology, pharmacy, etc.)
    const orders = admission.encounter?.orders || [];
    for (const order of orders) {
      const details = order.details as any;
      const orderType = order.orderType.toLowerCase();

      let category = 'other';
      if (orderType.includes('lab')) category = 'lab';
      else if (orderType.includes('radiology') || orderType.includes('imaging')) category = 'radiology';
      else if (orderType.includes('pharmacy') || orderType.includes('medication')) category = 'pharmacy';
      else if (orderType.includes('procedure')) category = 'procedure';
      else if (orderType.includes('consultation')) category = 'consultation';

      // Handle different order structures
      if (details?.items && Array.isArray(details.items)) {
        for (const item of details.items) {
          charges.push({
            id: `${order.id}-${item.id || Math.random().toString(36).substr(2, 9)}`,
            admissionId,
            category,
            description: item.name || item.testName || item.medicationName || 'Service',
            quantity: item.quantity || 1,
            unitPrice: Number(item.price) || 0,
            total: (item.quantity || 1) * (Number(item.price) || 0),
            date: order.orderedAt.toISOString(),
            orderId: order.id,
          });
        }
      } else if (details?.testName || details?.name) {
        charges.push({
          id: order.id,
          admissionId,
          category,
          description: details.testName || details.name || `${orderType} Order`,
          quantity: 1,
          unitPrice: Number(details.price) || 0,
          total: Number(details.price) || 0,
          date: order.orderedAt.toISOString(),
          orderId: order.id,
        });
      }
    }

    // Get existing invoice if any
    const existingInvoice = admission.encounter?.invoices?.find(inv => inv.type === 'ipd');
    const existingPayments = existingInvoice?.payments || [];

    res.json({
      admissionId,
      encounterId: admission.encounterId,
      patientId: admission.patientId,
      patientName: admission.patient.name,
      patientMRN: admission.patient.mrn,
      doctorName: admission.admittingDoctor?.name || 'Not Assigned',
      diagnosis: admission.diagnosis || '',
      wardName: admission.bed?.category || 'General',
      bedNumber: admission.bed?.bedNumber || 'N/A',
      admissionDate: admission.admissionDate.toISOString(),
      dischargeDate: admission.dischargeDate?.toISOString() || null,
      status: admission.status,
      totalDays,
      charges,
      existingInvoice: existingInvoice ? {
        id: existingInvoice.id,
        items: existingInvoice.items,
        subtotal: Number(existingInvoice.subtotal),
        discount: Number(existingInvoice.discount),
        tax: Number(existingInvoice.tax),
        total: Number(existingInvoice.total),
        paid: Number(existingInvoice.paid),
        balance: Number(existingInvoice.balance),
        status: existingInvoice.status,
        payments: existingPayments.map(p => ({
          id: p.id,
          amount: Number(p.amount),
          paymentMode: p.mode,
          paymentDate: p.paidAt.toISOString(),
          reference: p.transactionRef,
        })),
      } : null,
    });
  } catch (error) {
    logger.error('Get IPD billing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update IPD bill
app.post('/api/ipd-billing', authenticateToken, async (req: any, res: Response) => {
  try {
    const { admissionId, patientId, charges, subtotal, discount, discountPercent, tax, taxPercent, total, dischargePatient } = req.body;

    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        encounter: {
          include: {
            invoices: { where: { type: 'ipd' } }
          }
        }
      }
    });

    if (!admission) {
      return res.status(404).json({ error: 'Admission not found' });
    }

    // Check if invoice already exists
    const existingInvoice = admission.encounter?.invoices?.[0];
    let invoice;

    if (existingInvoice) {
      // Update existing invoice
      invoice = await prisma.invoice.update({
        where: { id: existingInvoice.id },
        data: {
          items: charges,
          subtotal: subtotal || 0,
          discount: discount || 0,
          tax: tax || 0,
          total: total || 0,
          balance: total - Number(existingInvoice.paid),
          status: Number(existingInvoice.paid) >= total ? 'paid' : Number(existingInvoice.paid) > 0 ? 'partial' : 'pending',
        },
      });
    } else {
      // Create new invoice
      invoice = await prisma.invoice.create({
        data: {
          patientId,
          encounterId: admission.encounterId,
          type: 'ipd',
          items: charges,
          subtotal: subtotal || 0,
          discount: discount || 0,
          tax: tax || 0,
          total: total || 0,
          paid: 0,
          balance: total || 0,
          status: 'pending',
        },
      });
    }

    // Discharge patient if requested
    if (dischargePatient) {
      await prisma.admission.update({
        where: { id: admissionId },
        data: {
          status: 'discharged',
          dischargeDate: new Date(),
        },
      });

      // Free up the bed
      if (admission.bedId) {
        await prisma.bed.update({
          where: { id: admission.bedId },
          data: { status: 'dirty' },
        });
      }
    }

    res.status(existingInvoice ? 200 : 201).json({
      id: invoice.id,
      message: existingInvoice ? 'IPD bill updated successfully' : 'IPD bill created successfully',
      discharged: dischargePatient || false,
    });
  } catch (error) {
    logger.error('Create/Update IPD bill error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add payment to IPD bill
app.post('/api/ipd-billing/:admissionId/pay', authenticateToken, async (req: any, res: Response) => {
  try {
    const { admissionId } = req.params;
    const { invoiceId, amount, paymentMode, reference, billData } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    // Find admission and existing invoice
    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        encounter: {
          include: {
            invoices: { where: { type: 'ipd' } },
          },
        },
      },
    });

    if (!admission) {
      return res.status(404).json({ error: 'Admission not found' });
    }

    let invoice = invoiceId
      ? await prisma.invoice.findUnique({ where: { id: invoiceId } })
      : admission?.encounter?.invoices?.[0];

    // If no invoice exists but billData is provided, create the invoice first
    if (!invoice && billData) {
      invoice = await prisma.invoice.create({
        data: {
          patientId: admission.patientId,
          encounterId: admission.encounterId,
          type: 'ipd',
          items: billData.charges || [],
          subtotal: billData.subtotal || 0,
          discount: billData.discount || 0,
          tax: billData.tax || 0,
          total: billData.total || 0,
          paid: 0,
          balance: billData.total || 0,
          status: 'pending',
        },
      });
    }

    if (!invoice) {
      return res.status(400).json({ error: 'Please save the bill first before recording payment' });
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: amount,
        mode: paymentMode || 'cash',
        transactionRef: reference,
        receivedBy: req.user.userId,
      },
    });

    // Update invoice paid amount and balance
    const newPaid = Number(invoice.paid) + Number(amount);
    const newBalance = Number(invoice.total) - newPaid;

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paid: newPaid,
        balance: newBalance,
        status: newBalance <= 0 ? 'paid' : 'partial',
      },
    });

    res.json({
      paymentId: payment.id,
      message: 'Payment recorded successfully',
      newPaid,
      newBalance,
    });
  } catch (error) {
    logger.error('IPD payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// IPD CHARGE CAPTURE ENDPOINTS
// ============================================

// POST /api/ipd/charges/capture - Automatically capture daily charges
app.post('/api/ipd/charges/capture', authenticateToken, async (req: any, res: Response) => {
  try {
    const { admissionId, captureAll } = req.body;
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    if (captureAll) {
      // Capture charges for all active admissions
      const result = await ipdChargeCaptureService.captureChargesForAllActiveAdmissions(
        tenantId,
        userId
      );

      return res.json({
        success: result.errors.length === 0,
        message: `Captured charges for ${result.totalAdmissions} admissions`,
        totalAdmissions: result.totalAdmissions,
        totalCharges: result.totalCharges,
        errors: result.errors,
      });
    } else if (admissionId) {
      // Capture charges for a specific admission
      const result = await ipdChargeCaptureService.captureChargesForAdmission(
        admissionId,
        tenantId,
        userId
      );

      return res.json({
        success: result.success,
        message: `Captured ${result.charges.length} charges`,
        charges: result.charges,
        errors: result.errors,
      });
    } else {
      return res.status(400).json({
        error: 'Please provide either admissionId or set captureAll to true',
      });
    }
  } catch (error) {
    logger.error('Charge capture error:', error);
    logger.error('Charge capture error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ipd/charges/:admissionId - Get all charges for an admission
app.get('/api/ipd/charges/:admissionId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { admissionId } = req.params;

    const result = await ipdChargeCaptureService.getChargesByAdmission(admissionId);

    res.json({
      admissionId,
      charges: result.charges,
      summary: result.summary,
    });
  } catch (error) {
    logger.error('Get charges error:', error);
    logger.error('Get charges error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/ipd/charges/add - Manually add a charge
app.post('/api/ipd/charges/add', authenticateToken, async (req: any, res: Response) => {
  try {
    const { admissionId, category, description, quantity, amount, date } = req.body;
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    // Validate required fields
    if (!admissionId || !category || !description || !quantity || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: admissionId, category, description, quantity, amount',
      });
    }

    // Validate category
    const validCategories = [
      'bed',
      'nursing',
      'procedure',
      'lab',
      'radiology',
      'pharmacy',
      'consumable',
      'consultation',
      'other',
    ];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
      });
    }

    const unitPrice = amount / quantity;
    const chargeDate = date ? new Date(date) : new Date();

    const charge = await ipdChargeCaptureService.addManualCharge(
      tenantId,
      admissionId,
      category,
      description,
      quantity,
      unitPrice,
      chargeDate,
      userId
    );

    res.json({
      success: true,
      message: 'Charge added successfully',
      charge,
    });
  } catch (error) {
    logger.error('Add charge error:', error);
    logger.error('Add charge error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ipd/billing/summary/:admissionId - Get billing summary for IPD
app.get('/api/ipd/billing/summary/:admissionId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { admissionId } = req.params;

    const summary = await ipdChargeCaptureService.getBillingSummary(admissionId);

    res.json(summary);
  } catch (error: any) {
    logger.error('Get billing summary error:', error);
    logger.error('Get billing summary error:', error);

    if (error.message === 'Admission not found') {
      return res.status(404).json({ error: 'Admission not found' });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// HEALTH CHECKUP ENDPOINTS
// ============================================

// List all health checkup packages
app.get('/api/health-checkup/packages', authenticateToken, requirePermission('health-checkup:view'), async (req: any, res: Response) => {
  try {
    // Mock data since model may not exist yet
    const packages = [
      {
        id: '1',
        name: 'Basic Health Checkup',
        description: 'Complete basic health screening',
        price: 2500,
        tests: ['CBC', 'Blood Sugar', 'Lipid Profile'],
        validity: 90,
        status: 'active',
      },
      {
        id: '2',
        name: 'Executive Health Checkup',
        description: 'Comprehensive executive health screening',
        price: 8500,
        tests: ['CBC', 'Blood Sugar', 'Lipid Profile', 'Liver Function', 'Kidney Function', 'ECG', 'X-Ray'],
        validity: 90,
        status: 'active',
      },
    ];

    res.json(packages);
  } catch (error) {
    logger.error('Get health checkup packages error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch health checkup packages',
    });
  }
});

// Create health checkup package
app.post('/api/health-checkup/packages', authenticateToken, requirePermission('health-checkup:create'), async (req: any, res: Response) => {
  try {
    const { name, description, price, tests, validity } = req.body;

    // Mock response since model may not exist yet
    const newPackage = {
      id: `pkg_${Date.now()}`,
      name,
      description,
      price,
      tests,
      validity,
      status: 'active',
      tenantId: req.user.tenantId,
      createdAt: new Date(),
    };

    res.status(201).json(newPackage);
  } catch (error) {
    logger.error('Create health checkup package error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create health checkup package',
    });
  }
});

// List health checkup bookings
app.get('/api/health-checkup/bookings', authenticateToken, requirePermission('health-checkup:view'), async (req: any, res: Response) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    // Mock data since model may not exist yet
    const bookings = [
      {
        id: '1',
        bookingId: 'HCB001',
        patientName: 'John Doe',
        packageName: 'Basic Health Checkup',
        bookingDate: new Date(),
        scheduledDate: new Date(),
        status: 'confirmed',
        amount: 2500,
      },
    ];

    res.json({
      data: bookings,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: bookings.length,
      },
    });
  } catch (error) {
    logger.error('Get health checkup bookings error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch health checkup bookings',
    });
  }
});

// Create health checkup booking
app.post('/api/health-checkup/bookings', authenticateToken, requirePermission('health-checkup:create'), async (req: any, res: Response) => {
  try {
    const { patientId, packageId, scheduledDate, notes } = req.body;

    // Generate booking ID
    const bookingId = `HCB${Date.now().toString().slice(-6)}`;

    // Mock response since model may not exist yet
    const booking = {
      id: `booking_${Date.now()}`,
      bookingId,
      patientId,
      packageId,
      scheduledDate: new Date(scheduledDate),
      notes,
      status: 'confirmed',
      tenantId: req.user.tenantId,
      createdBy: req.user.userId,
      createdAt: new Date(),
    };

    res.status(201).json(booking);
  } catch (error) {
    logger.error('Create health checkup booking error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create health checkup booking',
    });
  }
});

// ============================================
// PHLEBOTOMY ENDPOINTS
// ============================================

// List sample collections
app.get('/api/phlebotomy/collections', authenticateToken, requirePermission('phlebotomy:view'), async (req: any, res: Response) => {
  try {
    const { page = 1, limit = 50, status } = req.query;

    // Mock data since model may not exist yet
    const collections = [
      {
        id: '1',
        collectionId: 'PHL001',
        patientName: 'John Doe',
        mrn: 'MRN000001',
        labOrderId: 'LAB001',
        sampleType: 'Blood',
        requestedBy: 'Dr. Smith',
        requestDate: new Date(),
        status: 'pending',
        priority: 'routine',
      },
      {
        id: '2',
        collectionId: 'PHL002',
        patientName: 'Jane Smith',
        mrn: 'MRN000002',
        labOrderId: 'LAB002',
        sampleType: 'Urine',
        requestedBy: 'Dr. Johnson',
        requestDate: new Date(),
        status: 'collected',
        collectedAt: new Date(),
        collectedBy: 'Tech A',
        priority: 'urgent',
      },
    ];

    const filtered = status
      ? collections.filter(c => c.status === status)
      : collections;

    res.json({
      data: filtered,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: filtered.length,
      },
    });
  } catch (error) {
    logger.error('Get phlebotomy collections error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch sample collections',
    });
  }
});

// Create sample collection request
app.post('/api/phlebotomy/collections', authenticateToken, requirePermission('phlebotomy:create'), async (req: any, res: Response) => {
  try {
    const { patientId, labOrderId, sampleType, priority, instructions } = req.body;

    // Generate collection ID
    const collectionId = `PHL${Date.now().toString().slice(-6)}`;

    // Mock response since model may not exist yet
    const collection = {
      id: `col_${Date.now()}`,
      collectionId,
      patientId,
      labOrderId,
      sampleType,
      priority: priority || 'routine',
      instructions,
      status: 'pending',
      requestedBy: req.user.userId,
      requestDate: new Date(),
      tenantId: req.user.tenantId,
    };

    res.status(201).json(collection);
  } catch (error) {
    logger.error('Create sample collection error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create sample collection request',
    });
  }
});

// Mark sample as collected
app.put('/api/phlebotomy/collections/:id/collect', authenticateToken, requirePermission('phlebotomy:update'), async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { sampleQuality, notes } = req.body;

    // Mock response since model may not exist yet
    const updatedCollection = {
      id,
      status: 'collected',
      collectedAt: new Date(),
      collectedBy: req.user.userId,
      sampleQuality: sampleQuality || 'good',
      notes,
      updatedAt: new Date(),
    };

    res.json(updatedCollection);
  } catch (error) {
    logger.error('Mark sample collected error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to mark sample as collected',
    });
  }
});

// Reject sample
app.put('/api/phlebotomy/collections/:id/reject', authenticateToken, requirePermission('phlebotomy:update'), async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Rejection reason is required',
      });
    }

    // Mock response since model may not exist yet
    const updatedCollection = {
      id,
      status: 'rejected',
      rejectedAt: new Date(),
      rejectedBy: req.user.userId,
      rejectionReason: reason,
      updatedAt: new Date(),
    };

    res.json(updatedCollection);
  } catch (error) {
    logger.error('Reject sample error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to reject sample',
    });
  }
});

// ============================================
// PAYROLL ENDPOINTS
// ============================================

// List salary structures
app.get('/api/payroll/salary-structures', authenticateToken, requirePermission('payroll:view'), async (req: any, res: Response) => {
  try {
    // Mock data since model may not exist yet
    const structures = [
      {
        id: '1',
        name: 'Standard Nurse',
        basicSalary: 40000,
        hra: 10000,
        medicalAllowance: 5000,
        specialAllowance: 5000,
        pf: 4800,
        esi: 1200,
        totalGross: 60000,
        totalDeductions: 6000,
        netSalary: 54000,
        status: 'active',
      },
      {
        id: '2',
        name: 'Senior Doctor',
        basicSalary: 100000,
        hra: 25000,
        medicalAllowance: 10000,
        specialAllowance: 15000,
        pf: 12000,
        esi: 0,
        totalGross: 150000,
        totalDeductions: 12000,
        netSalary: 138000,
        status: 'active',
      },
    ];

    res.json(structures);
  } catch (error) {
    logger.error('Get salary structures error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch salary structures',
    });
  }
});

// Create salary structure
app.post('/api/payroll/salary-structures', authenticateToken, requirePermission('payroll:create'), async (req: any, res: Response) => {
  try {
    const {
      name,
      basicSalary,
      hra,
      medicalAllowance,
      specialAllowance,
      pf,
      esi,
      otherAllowances,
      otherDeductions,
    } = req.body;

    const totalGross = Number(basicSalary) + Number(hra || 0) +
                      Number(medicalAllowance || 0) + Number(specialAllowance || 0) +
                      Number(otherAllowances || 0);

    const totalDeductions = Number(pf || 0) + Number(esi || 0) + Number(otherDeductions || 0);
    const netSalary = totalGross - totalDeductions;

    // Mock response since model may not exist yet
    const structure = {
      id: `struct_${Date.now()}`,
      name,
      basicSalary,
      hra: hra || 0,
      medicalAllowance: medicalAllowance || 0,
      specialAllowance: specialAllowance || 0,
      otherAllowances: otherAllowances || 0,
      pf: pf || 0,
      esi: esi || 0,
      otherDeductions: otherDeductions || 0,
      totalGross,
      totalDeductions,
      netSalary,
      status: 'active',
      tenantId: req.user.tenantId,
      createdAt: new Date(),
    };

    res.status(201).json(structure);
  } catch (error) {
    logger.error('Create salary structure error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create salary structure',
    });
  }
});

// List payslips
app.get('/api/payroll/payslips', authenticateToken, requirePermission('payroll:view'), async (req: any, res: Response) => {
  try {
    const { month, year, employeeId } = req.query;

    // Mock data since model may not exist yet
    const payslips = [
      {
        id: '1',
        payslipNumber: 'PS202401001',
        employeeName: 'John Doe',
        employeeId: 'EMP001',
        month: 1,
        year: 2024,
        basicSalary: 40000,
        grossSalary: 60000,
        totalDeductions: 6000,
        netSalary: 54000,
        status: 'paid',
        paidDate: new Date(),
      },
    ];

    let filtered = payslips;
    if (employeeId) {
      filtered = filtered.filter(p => p.employeeId === employeeId);
    }
    if (month) {
      filtered = filtered.filter(p => p.month === parseInt(month as string));
    }
    if (year) {
      filtered = filtered.filter(p => p.year === parseInt(year as string));
    }

    res.json(filtered);
  } catch (error) {
    logger.error('Get payslips error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch payslips',
    });
  }
});

// Generate payroll
app.post('/api/payroll/generate', authenticateToken, requirePermission('payroll:create'), async (req: any, res: Response) => {
  try {
    const { month, year, employeeIds } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Month and year are required',
      });
    }

    // Mock response since model may not exist yet
    const result = {
      message: 'Payroll generated successfully',
      month,
      year,
      employeesProcessed: employeeIds?.length || 0,
      totalAmount: 540000,
      generatedAt: new Date(),
      generatedBy: req.user.userId,
    };

    res.status(201).json(result);
  } catch (error) {
    logger.error('Generate payroll error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to generate payroll',
    });
  }
});

// Get employee payslips
app.get('/api/payroll/payslips/:employeeId', authenticateToken, requirePermission('payroll:view'), async (req: any, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { limit = 12 } = req.query;

    // Mock data since model may not exist yet
    const payslips = [
      {
        id: '1',
        payslipNumber: 'PS202401001',
        month: 1,
        year: 2024,
        grossSalary: 60000,
        netSalary: 54000,
        status: 'paid',
      },
    ];

    res.json(payslips.slice(0, parseInt(limit as string)));
  } catch (error) {
    logger.error('Get employee payslips error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch employee payslips',
    });
  }
});

// ============================================
// TALLY/ACCOUNTING ENDPOINTS
// ============================================

// Get Tally sync status
app.get('/api/tally/sync-status', authenticateToken, requirePermission('accounting:view'), async (req: any, res: Response) => {
  try {
    // Mock data since model may not exist yet
    const syncStatus = {
      isConnected: true,
      lastSyncAt: new Date(),
      syncedRecords: 1542,
      pendingRecords: 23,
      failedRecords: 2,
      tallyVersion: '9.0',
      companyName: 'Hospital ERP',
      status: 'active',
    };

    res.json(syncStatus);
  } catch (error) {
    logger.error('Get Tally sync status error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch Tally sync status',
    });
  }
});

// Trigger Tally sync
app.post('/api/tally/sync', authenticateToken, requirePermission('accounting:create'), async (req: any, res: Response) => {
  try {
    const { syncType = 'all' } = req.body;

    // Mock response since model may not exist yet
    const syncResult = {
      message: 'Sync initiated successfully',
      syncId: `sync_${Date.now()}`,
      syncType,
      status: 'processing',
      initiatedBy: req.user.userId,
      initiatedAt: new Date(),
    };

    res.status(202).json(syncResult);
  } catch (error) {
    logger.error('Trigger Tally sync error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to trigger Tally sync',
    });
  }
});

// Get accounting entries for sync
app.get('/api/tally/entries', authenticateToken, requirePermission('accounting:view'), async (req: any, res: Response) => {
  try {
    const { fromDate, toDate, status, limit = 100 } = req.query;

    // Mock data since model may not exist yet
    const entries = [
      {
        id: '1',
        voucherNumber: 'JV001',
        voucherType: 'Journal',
        date: new Date(),
        particulars: 'IPD Collection',
        debitAmount: 15000,
        creditAmount: 0,
        ledger: 'Cash',
        narration: 'Patient payment received',
        syncStatus: 'pending',
      },
      {
        id: '2',
        voucherNumber: 'JV002',
        voucherType: 'Journal',
        date: new Date(),
        particulars: 'OPD Revenue',
        debitAmount: 0,
        creditAmount: 15000,
        ledger: 'Revenue',
        narration: 'OPD consultation fees',
        syncStatus: 'synced',
      },
    ];

    let filtered = entries;
    if (status) {
      filtered = filtered.filter(e => e.syncStatus === status);
    }

    res.json({
      data: filtered.slice(0, parseInt(limit as string)),
      total: filtered.length,
    });
  } catch (error) {
    logger.error('Get Tally entries error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch accounting entries',
    });
  }
});

// ============================================
// CSSD ENDPOINTS
// ============================================

// List sterilization cycles
app.get('/api/cssd/cycles', authenticateToken, requirePermission('cssd:view'), async (req: any, res: Response) => {
  try {
    const { page = 1, limit = 50, status } = req.query;

    // Mock data since model may not exist yet
    const cycles = [
      {
        id: '1',
        cycleNumber: 'CYC001',
        sterilizer: 'Autoclave A',
        cycleType: 'Steam',
        startTime: new Date(),
        endTime: null,
        temperature: 121,
        pressure: 15,
        duration: 30,
        itemCount: 25,
        status: 'running',
        operator: 'Tech A',
      },
      {
        id: '2',
        cycleNumber: 'CYC002',
        sterilizer: 'Autoclave B',
        cycleType: 'Steam',
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(),
        temperature: 121,
        pressure: 15,
        duration: 30,
        itemCount: 30,
        status: 'completed',
        operator: 'Tech B',
        validationStatus: 'passed',
      },
    ];

    const filtered = status
      ? cycles.filter(c => c.status === status)
      : cycles;

    res.json({
      data: filtered,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: filtered.length,
      },
    });
  } catch (error) {
    logger.error('Get CSSD cycles error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch sterilization cycles',
    });
  }
});

// Create sterilization cycle
app.post('/api/cssd/cycles', authenticateToken, requirePermission('cssd:create'), async (req: any, res: Response) => {
  try {
    const {
      sterilizer,
      cycleType,
      temperature,
      pressure,
      duration,
      items,
    } = req.body;

    // Generate cycle number
    const cycleNumber = `CYC${Date.now().toString().slice(-6)}`;

    // Mock response since model may not exist yet
    const cycle = {
      id: `cycle_${Date.now()}`,
      cycleNumber,
      sterilizer,
      cycleType,
      temperature,
      pressure,
      duration,
      itemCount: items?.length || 0,
      items,
      status: 'running',
      startTime: new Date(),
      operator: req.user.userId,
      tenantId: req.user.tenantId,
      createdAt: new Date(),
    };

    res.status(201).json(cycle);
  } catch (error) {
    logger.error('Create CSSD cycle error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create sterilization cycle',
    });
  }
});

// Mark cycle complete
app.put('/api/cssd/cycles/:id/complete', authenticateToken, requirePermission('cssd:update'), async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { validationStatus, notes } = req.body;

    if (!validationStatus) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Validation status is required',
      });
    }

    // Mock response since model may not exist yet
    const updatedCycle = {
      id,
      status: 'completed',
      endTime: new Date(),
      validationStatus,
      notes,
      completedBy: req.user.userId,
      updatedAt: new Date(),
    };

    res.json(updatedCycle);
  } catch (error) {
    logger.error('Complete CSSD cycle error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to mark cycle as complete',
    });
  }
});

// List CSSD instruments
app.get('/api/cssd/instruments', authenticateToken, requirePermission('cssd:view'), async (req: any, res: Response) => {
  try {
    const { search, category } = req.query;

    // Mock data since model may not exist yet
    const instruments = [
      {
        id: '1',
        name: 'Surgical Scissors',
        code: 'INS001',
        category: 'Surgical',
        quantity: 50,
        sterileQuantity: 30,
        location: 'CSSD Rack A1',
        status: 'available',
      },
      {
        id: '2',
        name: 'Forceps',
        code: 'INS002',
        category: 'Surgical',
        quantity: 100,
        sterileQuantity: 60,
        location: 'CSSD Rack A2',
        status: 'available',
      },
      {
        id: '3',
        name: 'Scalpel Handle',
        code: 'INS003',
        category: 'Surgical',
        quantity: 40,
        sterileQuantity: 25,
        location: 'CSSD Rack A3',
        status: 'available',
      },
    ];

    let filtered = instruments;
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filtered = filtered.filter(i =>
        i.name.toLowerCase().includes(searchLower) ||
        i.code.toLowerCase().includes(searchLower)
      );
    }
    if (category) {
      filtered = filtered.filter(i => i.category === category);
    }

    res.json(filtered);
  } catch (error) {
    logger.error('Get CSSD instruments error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch CSSD instruments',
    });
  }
});

// ============================================
// NURSING MODULE ENDPOINTS
// ============================================

// Get admitted patients under nursing care
app.get('/api/nursing/patients', authenticateToken, async (req: any, res: Response) => {
  try {
    const { tenantId, branchId } = req.user;

    // Get active admissions with patient, bed, and ward information
    const admissions = await prisma.admission.findMany({
      where: {
        patient: {
          tenantId,
          branchId,
        },
        status: 'active',
      },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            name: true,
          },
        },
        bed: {
          select: {
            bedNumber: true,
            wardId: true,
            category: true,
          },
        },
      },
      orderBy: {
        admissionDate: 'desc',
      },
    });

    // Format the response to match frontend expectations
    const patients = admissions.map((admission) => ({
      id: admission.patient.id,
      name: admission.patient.name,
      mrn: admission.patient.mrn,
      wardName: admission.bed?.wardId || 'General Ward',
      bedNumber: admission.bed?.bedNumber || 'N/A',
      admissionDate: admission.admissionDate.toISOString(),
      admissionId: admission.id,
    }));

    res.json(patients);
  } catch (error) {
    logger.error('Get nursing patients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get medication administration tasks
app.get('/api/nursing/medications', authenticateToken, async (req: any, res: Response) => {
  try {
    const { tenantId, branchId } = req.user;
    const { status, patientId } = req.query;

    const where: any = {
      tenantId,
      branchId,
    };

    // Filter by status if provided (pending, administered, etc.)
    if (status) {
      where.status = status;
    }

    if (patientId) {
      where.patientId = patientId;
    }

    // Get medications for today and upcoming
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    where.scheduledTime = {
      gte: startOfDay,
    };

    const medications = await prisma.medicationAdministration.findMany({
      where,
      orderBy: {
        scheduledTime: 'asc',
      },
    });

    // Get patient names for each medication
    const patientIds = [...new Set(medications.map(m => m.patientId))];
    const patients = await prisma.patient.findMany({
      where: {
        id: { in: patientIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const patientMap = new Map(patients.map(p => [p.id, p.name]));

    // Format the response to match frontend expectations
    const formattedMedications = medications.map((med) => ({
      id: med.id,
      patientId: med.patientId,
      patientName: patientMap.get(med.patientId) || 'Unknown Patient',
      medication: med.medicationName,
      dosage: med.dosage,
      route: med.route,
      scheduledTime: med.scheduledTime.toISOString(),
      status: med.status,
      administeredBy: med.administeredByName,
      administeredAt: med.administeredTime?.toISOString(),
    }));

    res.json(formattedMedications);
  } catch (error) {
    logger.error('Get nursing medications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all duty roster entries
app.get('/api/nursing/roster', authenticateToken, async (req: any, res: Response) => {
  try {
    const { date, shift, nurseId, ward, department } = req.query;
    const { tenantId, branchId } = req.user;

    const where: any = {
      tenantId,
      branchId,
    };

    if (date) where.date = new Date(date as string);
    if (shift) where.shift = shift;
    if (nurseId) where.nurseId = nurseId;
    if (ward) where.ward = ward;
    if (department) where.department = department;

    const rosters = await prisma.dutyRoster.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { shift: 'asc' },
      ],
    });

    res.json(rosters);
  } catch (error) {
    logger.error('Get duty roster error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create/assign nurse to shift
app.post('/api/nursing/roster', authenticateToken, async (req: any, res: Response) => {
  try {
    const { nurseId, nurseName, date, shift, ward, department, notes } = req.body;
    const { tenantId, branchId, userId } = req.user;

    const roster = await prisma.dutyRoster.create({
      data: {
        tenantId,
        branchId,
        nurseId,
        nurseName,
        date: new Date(date),
        shift,
        ward,
        department,
        notes,
        createdBy: userId,
      },
    });

    res.status(201).json(roster);
  } catch (error) {
    logger.error('Create duty roster error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update roster entry
app.put('/api/nursing/roster/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { nurseName, date, shift, ward, department, status, notes } = req.body;

    const roster = await prisma.dutyRoster.update({
      where: { id },
      data: {
        ...(nurseName && { nurseName }),
        ...(date && { date: new Date(date) }),
        ...(shift && { shift }),
        ...(ward && { ward }),
        ...(department && { department }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
    });

    res.json(roster);
  } catch (error) {
    logger.error('Update duty roster error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete roster entry
app.delete('/api/nursing/roster/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.dutyRoster.delete({
      where: { id },
    });

    res.json({ message: 'Duty roster entry deleted successfully' });
  } catch (error) {
    logger.error('Delete duty roster error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending medication administrations for admitted patients
app.get('/api/nursing/medication-admin', authenticateToken, async (req: any, res: Response) => {
  try {
    const { patientId, admissionId, status, date } = req.query;
    const { tenantId, branchId } = req.user;

    const where: any = {
      tenantId,
      branchId,
    };

    if (patientId) where.patientId = patientId;
    if (admissionId) where.admissionId = admissionId;
    if (status) where.status = status;

    if (date) {
      const startOfDay = new Date(date as string);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date as string);
      endOfDay.setHours(23, 59, 59, 999);

      where.scheduledTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const medications = await prisma.medicationAdministration.findMany({
      where,
      orderBy: {
        scheduledTime: 'asc',
      },
    });

    res.json(medications);
  } catch (error) {
    logger.error('Get medication administration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record medication administration
app.post('/api/nursing/medication-admin', authenticateToken, async (req: any, res: Response) => {
  try {
    const {
      medicationId,
      patientId,
      admissionId,
      medicationName,
      dosage,
      route,
      frequency,
      scheduledTime,
      administeredTime,
      administeredAt,
      status,
      notes,
      sideEffects,
    } = req.body;
    const { tenantId, branchId, userId, name } = req.user;

    // If medicationId is provided, update existing medication record
    if (medicationId) {
      const medication = await prisma.medicationAdministration.update({
        where: { id: medicationId },
        data: {
          administeredTime: administeredAt ? new Date(administeredAt) : (administeredTime ? new Date(administeredTime) : new Date()),
          administeredBy: userId,
          administeredByName: name,
          status: 'administered',
          ...(notes && { notes }),
          ...(sideEffects && { sideEffects }),
        },
      });

      res.json(medication);
    } else {
      // Create new medication record
      const medication = await prisma.medicationAdministration.create({
        data: {
          tenantId,
          branchId,
          patientId,
          admissionId,
          medicationName,
          dosage,
          route,
          frequency,
          scheduledTime: new Date(scheduledTime),
          administeredTime: administeredTime ? new Date(administeredTime) : null,
          administeredBy: status === 'administered' ? userId : null,
          administeredByName: status === 'administered' ? name : null,
          status: status || 'pending',
          notes,
          sideEffects,
          createdBy: userId,
        },
      });

      res.status(201).json(medication);
    }
  } catch (error) {
    logger.error('Record medication administration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update medication record
app.put('/api/nursing/medication-admin/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const {
      administeredTime,
      status,
      notes,
      sideEffects,
    } = req.body;
    const { userId, name } = req.user;

    const updateData: any = {};

    if (administeredTime) updateData.administeredTime = new Date(administeredTime);
    if (status) {
      updateData.status = status;
      if (status === 'administered') {
        updateData.administeredBy = userId;
        updateData.administeredByName = name;
        if (!administeredTime) {
          updateData.administeredTime = new Date();
        }
      }
    }
    if (notes !== undefined) updateData.notes = notes;
    if (sideEffects !== undefined) updateData.sideEffects = sideEffects;

    const medication = await prisma.medicationAdministration.update({
      where: { id },
      data: updateData,
    });

    res.json(medication);
  } catch (error) {
    logger.error('Update medication administration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get shift handover notes
app.get('/api/nursing/handover', authenticateToken, async (req: any, res: Response) => {
  try {
    const { date, shift, ward, department, patientId, status } = req.query;
    const { tenantId, branchId } = req.user;

    const where: any = {
      tenantId,
      branchId,
    };

    if (date) where.date = new Date(date as string);
    if (shift) where.shift = shift;
    if (ward) where.ward = ward;
    if (department) where.department = department;
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    const handovers = await prisma.handoverNote.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { shift: 'asc' },
        { priority: 'desc' },
      ],
    });

    res.json(handovers);
  } catch (error) {
    logger.error('Get handover notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new handover note
app.post('/api/nursing/handover', authenticateToken, async (req: any, res: Response) => {
  try {
    const {
      shift,
      date,
      ward,
      department,
      handoverFrom,
      handoverTo,
      patientId,
      patientName,
      admissionId,
      notes,
      priority,
    } = req.body;
    const { tenantId, branchId, userId } = req.user;

    const handover = await prisma.handoverNote.create({
      data: {
        tenantId,
        branchId,
        shift,
        date: new Date(date),
        ward,
        department,
        handoverFrom,
        handoverTo,
        patientId,
        patientName,
        admissionId,
        notes,
        priority: priority || 'normal',
        status: 'active',
        createdBy: userId,
      },
    });

    res.status(201).json(handover);
  } catch (error) {
    logger.error('Create handover note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update handover note
app.put('/api/nursing/handover/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const {
      notes,
      priority,
      status,
      handoverTo,
    } = req.body;

    const handover = await prisma.handoverNote.update({
      where: { id },
      data: {
        ...(notes !== undefined && { notes }),
        ...(priority && { priority }),
        ...(status && { status }),
        ...(handoverTo && { handoverTo }),
      },
    });

    res.json(handover);
  } catch (error) {
    logger.error('Update handover note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get patient vitals
app.get('/api/nursing/vitals', authenticateToken, async (req: any, res: Response) => {
  try {
    const { patientId, admissionId, startDate, endDate } = req.query;
    const { tenantId, branchId } = req.user;

    const where: any = {
      tenantId,
      branchId,
    };

    if (patientId) where.patientId = patientId;
    if (admissionId) where.admissionId = admissionId;

    if (startDate || endDate) {
      where.recordedAt = {};
      if (startDate) where.recordedAt.gte = new Date(startDate as string);
      if (endDate) where.recordedAt.lte = new Date(endDate as string);
    }

    const vitals = await prisma.nursingVitals.findMany({
      where,
      orderBy: {
        recordedAt: 'desc',
      },
    });

    res.json(vitals);
  } catch (error) {
    logger.error('Get nursing vitals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record patient vitals
app.post('/api/nursing/vitals', authenticateToken, async (req: any, res: Response) => {
  try {
    const {
      patientId,
      admissionId,
      heartRate,
      systolicBP,
      diastolicBP,
      temperature,
      spo2,
      respiratoryRate,
      weight,
      height,
      bmi,
      painScore,
      consciousness,
      notes,
    } = req.body;
    const { tenantId, branchId, userId, name } = req.user;

    const vitals = await prisma.nursingVitals.create({
      data: {
        tenantId,
        branchId,
        patientId,
        admissionId,
        heartRate,
        systolicBP,
        diastolicBP,
        temperature,
        spo2,
        respiratoryRate,
        weight,
        height,
        bmi,
        painScore,
        consciousness,
        notes,
        recordedAt: new Date(),
        recordedBy: userId,
        recordedByName: name,
      },
    });

    res.status(201).json(vitals);
  } catch (error) {
    logger.error('Record nursing vitals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// BIOMETRIC ATTENDANCE ENDPOINTS
// ============================================

// List biometric devices
app.get('/api/biometric/devices', authenticateToken, requirePermission('hr:view'), async (req: any, res: Response) => {
  try {
    // Mock data since model may not exist yet
    const devices = [
      {
        id: '1',
        deviceId: 'BIO001',
        deviceName: 'Main Entrance',
        location: 'Ground Floor - Main Gate',
        ipAddress: '192.168.1.100',
        status: 'online',
        lastSync: new Date(),
        employeesRegistered: 150,
      },
      {
        id: '2',
        deviceId: 'BIO002',
        deviceName: 'Emergency Wing',
        location: 'Ground Floor - Emergency',
        ipAddress: '192.168.1.101',
        status: 'online',
        lastSync: new Date(),
        employeesRegistered: 80,
      },
      {
        id: '3',
        deviceId: 'BIO003',
        deviceName: 'ICU Block',
        location: '2nd Floor - ICU',
        ipAddress: '192.168.1.102',
        status: 'offline',
        lastSync: new Date(Date.now() - 7200000),
        employeesRegistered: 45,
      },
    ];

    res.json(devices);
  } catch (error) {
    logger.error('Get biometric devices error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch biometric devices',
    });
  }
});

// Record biometric punch
app.post('/api/biometric/punch', authenticateToken, requirePermission('hr:create'), async (req: any, res: Response) => {
  try {
    const { employeeId, deviceId, punchType, timestamp } = req.body;

    if (!employeeId || !deviceId) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Employee ID and Device ID are required',
      });
    }

    // Mock response since model may not exist yet
    const punch = {
      id: `punch_${Date.now()}`,
      employeeId,
      deviceId,
      punchType: punchType || 'auto',
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      status: 'recorded',
      tenantId: req.user.tenantId,
      createdAt: new Date(),
    };

    res.status(201).json(punch);
  } catch (error) {
    logger.error('Record biometric punch error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to record biometric punch',
    });
  }
});

// Get today's attendance
app.get('/api/biometric/today', authenticateToken, requirePermission('hr:view'), async (req: any, res: Response) => {
  try {
    const { departmentId } = req.query;

    // Mock data since model may not exist yet
    const attendance = [
      {
        employeeId: 'EMP001',
        employeeName: 'John Doe',
        department: 'Nursing',
        checkIn: new Date(new Date().setHours(9, 0, 0)),
        checkOut: null,
        status: 'present',
        workingHours: null,
      },
      {
        employeeId: 'EMP002',
        employeeName: 'Jane Smith',
        department: 'Laboratory',
        checkIn: new Date(new Date().setHours(9, 15, 0)),
        checkOut: null,
        status: 'present',
        workingHours: null,
      },
      {
        employeeId: 'EMP003',
        employeeName: 'Bob Johnson',
        department: 'Emergency',
        checkIn: new Date(new Date().setHours(8, 45, 0)),
        checkOut: new Date(new Date().setHours(17, 0, 0)),
        status: 'present',
        workingHours: 8.25,
      },
    ];

    const summary = {
      totalEmployees: 150,
      present: 120,
      absent: 25,
      onLeave: 5,
      late: 15,
      earlyCheckout: 3,
    };

    res.json({
      summary,
      attendance,
    });
  } catch (error) {
    logger.error('Get today attendance error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch today\'s attendance',
    });
  }
});

// ============================================
// PATIENT PORTAL APIs
// ============================================

// Store for OTP sessions (in production, use Redis)
const otpSessions: Map<string, { patientId: string; otp: string; expiresAt: Date }> = new Map();

// Patient Portal - Request OTP
app.post('/api/patient-portal/request-otp', async (req: Request, res: Response) => {
  try {
    const { mrn, phone, dob } = req.body;
    if (!dob) return res.status(400).json({ error: 'Date of birth is required' });

    let patient;
    if (mrn) {
      patient = await prisma.patient.findFirst({ where: { mrn } });
    } else if (phone) {
      patient = await prisma.patient.findFirst({ where: { contact: phone } });
    }

    if (!patient) return res.status(404).json({ message: 'Patient not found. Please check your details.' });

    const patientDob = patient.dob ? new Date(patient.dob).toISOString().split('T')[0] : null;
    const inputDob = new Date(dob).toISOString().split('T')[0];
    if (patientDob !== inputDob) return res.status(401).json({ message: 'Date of birth does not match our records.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const crypto = require('crypto');
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    otpSessions.set(sessionId, { patientId: patient.id, otp, expiresAt });

    try {
      const { notificationService } = require('./services/notification');
      if (patient.contact) {
        await notificationService.send({
          type: 'PASSWORD_RESET',
          recipientPhone: patient.contact,
          recipientEmail: patient.email || undefined,
          message: `Your OTP for Patient Portal login is: ${otp}. Valid for 10 minutes.`,
          data: { otp, hospitalName: 'Hospital ERP' },
        });
      }
    } catch (e) { logger.info('OTP notification error:', e); }

    console.log(`Patient Portal OTP for ${patient.mrn}: ${otp}`);
    res.json({ sessionId, message: 'OTP sent successfully', ...(process.env.NODE_ENV === 'development' ? { otp } : {}) });
  } catch (error) {
    logger.error('Request OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Patient Portal - Verify OTP
app.post('/api/patient-portal/verify-otp', async (req: Request, res: Response) => {
  try {
    const { sessionId, otp } = req.body;
    if (!sessionId || !otp) return res.status(400).json({ error: 'Session ID and OTP are required' });

    const session = otpSessions.get(sessionId);
    if (!session) return res.status(401).json({ message: 'Session expired. Please request a new OTP.' });
    if (new Date() > session.expiresAt) { otpSessions.delete(sessionId); return res.status(401).json({ message: 'OTP expired.' }); }
    if (session.otp !== otp) return res.status(401).json({ message: 'Invalid OTP. Please try again.' });

    otpSessions.delete(sessionId);
    const patient = await prisma.patient.findUnique({
      where: { id: session.patientId },
      select: { id: true, mrn: true, name: true, dob: true, gender: true, contact: true, email: true, bloodGroup: true },
    });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const token = jwt.sign({ patientId: patient.id, mrn: patient.mrn, type: 'patient-portal' }, process.env.JWT_SECRET!, { expiresIn: '24h' });
    res.json({ token, patient });
  } catch (error) {
    logger.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Patient Portal auth middleware
const authenticatePatientPortal = (req: any, res: Response, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.type !== 'patient-portal') return res.status(403).json({ error: 'Invalid token type' });
    req.patientId = decoded.patientId;
    next();
  } catch { return res.status(403).json({ error: 'Invalid token' }); }
};

// Patient Portal - Get appointments
app.get('/api/patient-portal/appointments', authenticatePatientPortal, async (req: any, res: Response) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { patientId: req.patientId },
      include: { doctor: { select: { name: true } } },
      orderBy: { appointmentDate: 'desc' },
      take: 20,
    });
    res.json(appointments.map(apt => ({
      id: apt.id, date: apt.appointmentDate.toISOString().split('T')[0], time: apt.appointmentTime,
      doctor: apt.doctor?.name || 'N/A', department: apt.department || 'General', status: apt.status, reason: apt.reason || '',
    })));
  } catch (error) { logger.error('Get patient appointments error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

// Patient Portal - Get lab results
app.get('/api/patient-portal/lab-results', authenticatePatientPortal, async (req: any, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: { patientId: req.patientId, orderType: 'lab' },
      include: { results: true },
      orderBy: { orderedAt: 'desc' },
      take: 20,
    });
    res.json(orders.map(order => {
      const details = order.details as any;
      const result = order.results[0];
      return {
        id: order.id, testName: details?.testName || details?.tests?.map((t: any) => t.name).join(', ') || 'Lab Test',
        date: order.orderedAt.toISOString().split('T')[0], status: order.status, isCritical: result?.isCritical || false,
      };
    }));
  } catch (error) { logger.error('Get patient lab results error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

// Patient Portal - Get prescriptions
app.get('/api/patient-portal/prescriptions', authenticatePatientPortal, async (req: any, res: Response) => {
  try {
    const prescriptions = await prisma.prescription.findMany({
      where: { opdNote: { patientId: req.patientId } },
      include: { doctor: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(prescriptions.map(rx => ({ id: rx.id, date: rx.createdAt.toISOString().split('T')[0], doctor: rx.doctor?.name || 'Doctor', drugs: (rx.drugs as any[]) || [] })));
  } catch (error) { logger.error('Get patient prescriptions error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

// Patient Portal - Get bills
app.get('/api/patient-portal/bills', authenticatePatientPortal, async (req: any, res: Response) => {
  try {
    const invoices = await prisma.invoice.findMany({ where: { patientId: req.patientId }, orderBy: { createdAt: 'desc' }, take: 20 });
    res.json(invoices.map((inv, idx) => ({
      id: inv.id, date: inv.createdAt.toISOString().split('T')[0],
      invoiceNumber: `INV-${inv.createdAt.getFullYear()}${(inv.createdAt.getMonth() + 1).toString().padStart(2, '0')}${idx + 1}`,
      amount: Number(inv.total), paid: Number(inv.paid), balance: Number(inv.balance), status: inv.status,
    })));
  } catch (error) { logger.error('Get patient bills error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

// ============================================
// GLOBAL ERROR HANDLERS (must be last)
// ============================================

// Handle 404 - Route not found
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================

// Export app for Vercel serverless functions
export default app;
export { app };

// Only start the server if not in Vercel serverless environment
const isVercel = process.env.VERCEL === '1';

if (!isVercel) {
  app.listen(PORT, () => {
    logger.info(`Hospital ERP Backend running on http://localhost:${PORT}`);
    logger.info(`API Health: http://localhost:${PORT}/api/health`);
    console.log(`Hospital ERP Backend running on http://localhost:${PORT}`);
    console.log(`API Health: http://localhost:${PORT}/api/health`);

    // Start appointment reminder service (checks every 15 minutes)
    // Note: In serverless, use Vercel Cron Jobs instead
    if (process.env.ENABLE_REMINDERS !== 'false') {
      reminderService.start(15);
      console.log(`Appointment reminder service started`);
    }
  });

  // Graceful shutdown (only for non-serverless)
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    reminderService.stop();
    await disconnectPrisma();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    reminderService.stop();
    await disconnectPrisma();
    process.exit(0);
  });
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  if (!isVercel) process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});
