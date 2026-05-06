import { Router } from 'express';
import { authenticateToken } from '../../middleware';
import * as controller from './order.controller';

const router = Router();
router.use(authenticateToken);

// GET /api/mobile/v1/orders/by-patient/:patientId — pending + completed
// orders for a patient. Used by the doctor app's patient detail page.
router.get('/by-patient/:patientId', controller.listForPatient);

// GET /api/mobile/v1/orders/:id — single order detail for the result-
// entry screen. Cross-tenant gated through patient.tenantId.
router.get('/:id', controller.getOne);

// POST /api/mobile/v1/orders/:id/result — record a result for an order.
// Permissive — accepts any resultData shape. Atomic write (Result row +
// order.status='completed').
router.post('/:id/result', controller.submitResult);

export default router;
