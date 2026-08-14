// Patient-facing ambulance booking, mounted under /api/mobile/v1/ambulance.
// Distinct from the legacy staff console at /api/ambulance/* (server.ts),
// which requires the ambulance:manage RBAC permission patients don't have.

import { Router } from 'express';
import { authenticateToken } from '../../middleware';
import * as controller from './ambulance.controller';

const router = Router();

router.use(authenticateToken);

router.post('/trips', controller.bookTrip);
router.get('/trips', controller.listMyTrips);

export default router;
