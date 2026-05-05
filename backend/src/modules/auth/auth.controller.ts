import { Request, Response } from 'express';
import * as service from './auth.service';
import { InvalidCredentialsError } from './auth.service';
import { mobileLoginSchema, requestOtpSchema, verifyOtpSchema } from './auth.model';

export async function loginWithPassword(req: Request, res: Response) {
  try {
    const parsed = mobileLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const result = await service.loginWithPassword(parsed.data);
    res.json(result);
  } catch (err: any) {
    if (err instanceof InvalidCredentialsError) return res.status(401).json({ error: err.message });
    // eslint-disable-next-line no-console
    console.error('mobile login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// PHASE 2 — OTP login. Wired but returns 503 until SMS_PROVIDER !== 'mock'.
// Once the SMS provider is live (DLT-registered MSG91 / Twilio etc.), we add
// the actual issue+verify logic; the schema and route are stable so the
// mobile clients can integrate against the contract today.
export async function requestOtp(_req: Request, res: Response) {
  try {
    const parsed = requestOtpSchema.safeParse(_req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
    if ((process.env.SMS_PROVIDER || 'mock') === 'mock') {
      return res.status(503).json({ error: 'OTP login not yet enabled. Use username/password.' });
    }
    // TODO(phase 2): generate 6-digit code, store in OtpRequest table with
    // 5-min TTL + 5-attempt cap, send via notificationService.
    return res.status(501).json({ error: 'Not implemented' });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function verifyOtp(_req: Request, res: Response) {
  try {
    const parsed = verifyOtpSchema.safeParse(_req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
    if ((process.env.SMS_PROVIDER || 'mock') === 'mock') {
      return res.status(503).json({ error: 'OTP login not yet enabled.' });
    }
    return res.status(501).json({ error: 'Not implemented' });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
