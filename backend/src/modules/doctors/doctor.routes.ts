import { Router } from 'express';
import { authenticateToken } from '../../middleware';
import * as controller from './doctor.controller';

const router = Router();
router.use(authenticateToken);

// GET /api/mobile/v1/doctors/me/dashboard — landing payload for the
// doctor's web portal + mobile app.
router.get('/me/dashboard', controller.getMyDashboard);

export default router;
