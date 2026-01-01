/**
 * Orders Billing Integration Patch
 *
 * This file contains the updated implementations for lab and radiology order endpoints
 * with automatic billing integration.
 *
 * Usage: Import these handlers and use them to replace the existing endpoints in server.ts
 */

import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware';
import { createLabOrderBilling, createRadiologyOrderBilling } from '../services/billing';

const prisma = new PrismaClient();

/**
 * Updated handler for POST /api/radiology-orders
 * Includes automatic billing integration
 */
export async function createRadiologyOrderWithBilling(req: AuthenticatedRequest, res: Response) {
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
        orderedBy: req.user!.userId,
        priority: req.body.priority || 'routine',
        details: { tests },
        status: 'pending',
      },
    });

    // Auto-create billing for the radiology order
    const testIds = tests.map((t: any) => t.testId);
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
    console.error('Create radiology order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Instructions for applying this patch:
 *
 * In server.ts, replace the existing radiology order endpoint with:
 *
 * import { createRadiologyOrderWithBilling } from './routes/orders-patch';
 *
 * app.post('/api/radiology-orders', authenticateToken, validateBody(createRadiologyOrderSchema), createRadiologyOrderWithBilling);
 *
 * Note: The lab order endpoint has already been updated in server.ts
 */
