/**
 * Billing Routes
 *
 * Routes for billing integration with lab and radiology orders
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/db';
import { authenticateToken, AuthenticatedRequest, requirePermission } from '../middleware';
import {
  getPendingCharges,
  getIPDPendingCharges,
  generateInvoiceFromCharges,
  createLabOrderBilling,
  createRadiologyOrderBilling
} from '../services/billing';
import { z } from 'zod';
import { logger } from '../utils/logger';

const router = Router();

// Helper to verify patient belongs to tenant
async function verifyPatientTenant(patientId: string, tenantId: string): Promise<boolean> {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, tenantId }
  });
  return !!patient;
}

// Helper to verify admission belongs to tenant (via patient)
async function verifyAdmissionTenant(admissionId: string, tenantId: string): Promise<boolean> {
  const admission = await prisma.admission.findFirst({
    where: { id: admissionId },
    include: { patient: { select: { tenantId: true } } }
  });
  return admission?.patient?.tenantId === tenantId;
}

// Validation schemas
const generateInvoiceSchema = z.object({
  patientId: z.string().uuid(),
  orderIds: z.array(z.string().uuid()).min(1, 'At least one order ID is required'),
  encounterId: z.string().uuid().optional(),
  admissionId: z.string().uuid().optional(),
  discountPercent: z.number().min(0).max(100).default(0)
});

/**
 * GET /api/billing/patient/:patientId/pending
 * Get pending charges for a patient (not yet invoiced)
 */
router.get('/patient/:patientId/pending', authenticateToken, requirePermission('billing:view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { patientId } = req.params;
    const tenantId = req.user!.tenantId;

    // Verify patient belongs to user's tenant
    if (!await verifyPatientTenant(patientId, tenantId)) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const pendingCharges = await getPendingCharges(patientId);

    res.json({
      patientId,
      ...pendingCharges,
      summary: {
        totalLabCharges: pendingCharges.labOrders.reduce((sum, o) => sum + o.chargeAmount, 0),
        totalRadiologyCharges: pendingCharges.radiologyOrders.reduce((sum, o) => sum + o.chargeAmount, 0),
        totalPending: pendingCharges.totalPending
      }
    });
  } catch (error) {
    logger.error('Get pending charges error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/billing/admission/:admissionId/pending
 * Get pending charges for an IPD admission
 */
router.get('/admission/:admissionId/pending', authenticateToken, requirePermission('billing:view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { admissionId } = req.params;
    const tenantId = req.user!.tenantId;

    // Verify admission belongs to user's tenant
    const admission = await prisma.admission.findFirst({
      where: { id: admissionId },
      include: { patient: { select: { id: true, name: true, mrn: true, tenantId: true } } }
    });

    if (!admission || admission.patient.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Admission not found' });
    }

    const pendingCharges = await getIPDPendingCharges(admissionId);

    res.json({
      admissionId,
      patient: admission.patient,
      ...pendingCharges,
      summary: {
        totalLabCharges: pendingCharges.labOrders.reduce((sum, o) => sum + o.chargeAmount, 0),
        totalRadiologyCharges: pendingCharges.radiologyOrders.reduce((sum, o) => sum + o.chargeAmount, 0),
        totalPending: pendingCharges.totalPending
      }
    });
  } catch (error) {
    logger.error('Get IPD pending charges error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/billing/generate-invoice
 * Generate invoice from pending charges
 */
router.post('/generate-invoice', authenticateToken, requirePermission('billing:create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = generateInvoiceSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors
      });
    }

    const { patientId, orderIds, encounterId, admissionId, discountPercent } = validation.data;
    const tenantId = req.user!.tenantId;

    // Verify patient belongs to user's tenant
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      select: { id: true, name: true, mrn: true }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Generate invoice
    const invoice = await generateInvoiceFromCharges(
      patientId,
      orderIds,
      encounterId,
      admissionId,
      discountPercent
    );

    res.status(201).json({
      message: 'Invoice generated successfully',
      invoice
    });
  } catch (error: any) {
    logger.error('Generate invoice error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/billing/orders/:orderId/billing-status
 * Get billing status for a specific order
 */
router.get('/orders/:orderId/billing-status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderType: true,
        billingStatus: true,
        chargeAmount: true,
        invoiceId: true,
        admissionId: true,
        patient: { select: { name: true, mrn: true } },
        orderedAt: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // If order has invoice, fetch invoice details
    let invoiceDetails = null;
    if (order.invoiceId) {
      invoiceDetails = await prisma.invoice.findUnique({
        where: { id: order.invoiceId },
        select: {
          id: true,
          type: true,
          total: true,
          paid: true,
          balance: true,
          status: true,
          createdAt: true
        }
      });
    }

    res.json({
      order,
      invoice: invoiceDetails
    });
  } catch (error) {
    logger.error('Get order billing status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
