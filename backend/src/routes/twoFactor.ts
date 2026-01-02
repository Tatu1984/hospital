import express from 'express';
import { z } from 'zod';
import { twoFactorService, sendSmsOtp } from '../services/twoFactorAuth';

const router = express.Router();

// Helper to wrap async handlers
const asyncHandler = (fn: Function) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Get 2FA status
router.get('/status', asyncHandler(async (req: any, res: express.Response) => {
  const userId = req.user.id;
  const status = await twoFactorService.getStatus(userId);
  res.json(status);
}));

// Initialize TOTP setup
router.post('/totp/setup', asyncHandler(async (req: any, res: express.Response) => {
  const userId = req.user.id;

  try {
    const { secret, uri, backupCodes } = await twoFactorService.enableTotp(userId);

    res.json({
      success: true,
      secret,
      otpauthUri: uri,
      backupCodes,
      message: 'Scan the QR code with your authenticator app',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}));

// Verify TOTP setup (confirm user can generate valid tokens)
router.post('/totp/verify-setup', asyncHandler(async (req: any, res: express.Response) => {
  const userId = req.user.id;
  const schema = z.object({
    token: z.string().length(6),
  });

  const { token } = schema.parse(req.body);

  try {
    const isValid = await twoFactorService.verifyTotpSetup(userId, token);

    if (isValid) {
      res.json({
        success: true,
        message: 'TOTP verified and enabled successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please try again.',
      });
    }
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}));

// Enable SMS 2FA
router.post('/sms/setup', asyncHandler(async (req: any, res: express.Response) => {
  const userId = req.user.id;
  const schema = z.object({
    phone: z.string().min(10),
  });

  const { phone } = schema.parse(req.body);

  try {
    const result = await twoFactorService.enableSms(userId, phone);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}));

// Send SMS OTP (for login verification)
router.post('/sms/send', asyncHandler(async (req: any, res: express.Response) => {
  const userId = req.user?.id || req.body.userId;
  const schema = z.object({
    phone: z.string().min(10),
  });

  const { phone } = schema.parse(req.body);

  try {
    const result = await sendSmsOtp(phone, userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}));

// Verify 2FA token (for login)
router.post('/verify', asyncHandler(async (req: any, res: express.Response) => {
  const schema = z.object({
    userId: z.string().uuid(),
    token: z.string().min(6).max(10),
    method: z.enum(['totp', 'sms', 'backup']),
  });

  const { userId, token, method } = schema.parse(req.body);

  try {
    const isValid = await twoFactorService.verify(userId, token, method);

    if (isValid) {
      res.json({
        success: true,
        message: '2FA verification successful',
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid verification code',
      });
    }
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}));

// Disable 2FA
router.post('/disable', asyncHandler(async (req: any, res: express.Response) => {
  const userId = req.user.id;
  const schema = z.object({
    password: z.string().min(1),
  });

  // Password verification would be done here in production
  const { password } = schema.parse(req.body);

  // TODO: Verify password before disabling

  try {
    await twoFactorService.disable2FA(userId);
    res.json({
      success: true,
      message: '2FA has been disabled',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}));

// Regenerate backup codes
router.post('/backup-codes/regenerate', asyncHandler(async (req: any, res: express.Response) => {
  const userId = req.user.id;
  const schema = z.object({
    password: z.string().min(1),
  });

  // Password verification would be done here in production
  const { password } = schema.parse(req.body);

  try {
    const codes = await twoFactorService.regenerateBackupCodes(userId);
    res.json({
      success: true,
      backupCodes: codes,
      message: 'New backup codes generated. Store them securely.',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}));

export default router;
