// Wires the patients-module controller into Express. Mounted by
// modules/index.ts under /api/mobile/v1/patients.

import { Router } from 'express';
import { authenticateToken } from '../../middleware';
import * as controller from './patient.controller';

const router = Router();

// Every route here requires the standard JWT auth — same middleware the
// desktop portal uses, so a single user can move between web and mobile
// without re-login (within the access token's TTL).
router.use(authenticateToken);

router.get('/me', controller.getMyHome);
router.patch('/me', controller.updateMyProfile);
// Comprehensive patient chart — used by the doctor portal + doctor app.
router.get('/:patientId/chart', controller.getChart);

export default router;
