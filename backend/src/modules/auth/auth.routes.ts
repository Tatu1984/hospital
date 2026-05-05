import { Router } from 'express';
import * as controller from './auth.controller';

const router = Router();

// All routes here are PUBLIC — they're how a mobile client gets a token in
// the first place. The aggregator in modules/index.ts mounts this under
// /api/mobile/v1/auth, and the global isPublicRoute() check in
// routes/index.ts has matching entries so the auth middleware doesn't
// reject these requests.
router.post('/login', controller.loginWithPassword);
router.post('/request-otp', controller.requestOtp);
router.post('/verify-otp', controller.verifyOtp);

export default router;
