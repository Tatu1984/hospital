import { Router } from 'express';
import { authenticateToken } from '../../middleware';
import * as controller from './report.controller';

const router = Router();
router.use(authenticateToken);

// GET /api/mobile/v1/reports/me — flat reverse-chrono timeline.
router.get('/me', controller.listMine);

// GET /api/mobile/v1/reports/:category/:id — type-specific detail.
// Category is one of lab | radiology | prescription | invoice.
router.get('/:category/:id', controller.getDetail);

export default router;
