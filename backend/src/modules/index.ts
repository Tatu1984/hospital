// Aggregator for the mobile + new layered API surface. Mounted in server.ts
// at /api/mobile/v1. Adding a new module = create modules/<thing>/ with the
// five files (model/repository/service/controller/routes), then add a line
// here.

import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import patientsRoutes from './patients/patient.routes';
import appointmentsRoutes from './appointments/appointment.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/patients', patientsRoutes);
router.use('/appointments', appointmentsRoutes);

// Health probe for the mobile namespace specifically — useful for canary
// alerts that want to distinguish the mobile API from the desktop API.
router.get('/health', (_req, res) => {
  res.json({ ok: true, namespace: 'mobile/v1', timestamp: new Date().toISOString() });
});

export default router;
