import { Router } from 'express';
import { authenticateToken } from '../../middleware';
import * as controller from './appointment.controller';

const router = Router();
router.use(authenticateToken);

// Patient-facing
router.get('/me', controller.listMine);
router.post('/', controller.book);
router.post('/:id/cancel', controller.cancel);

// Booking flow helpers
router.get('/doctors', controller.listDoctors);
router.get('/slots', controller.getDoctorSlots);

// Doctor-facing
router.get('/today', controller.listToday);

export default router;
