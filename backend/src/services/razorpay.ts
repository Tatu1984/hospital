import crypto from 'crypto';
import { logger } from '../utils/logger';

/**
 * Razorpay client wrapper.
 *
 * Test vs live is keyed off the prefix of `RAZORPAY_KEY_ID`:
 *   - rzp_test_*  → sandbox (no real money moves)
 *   - rzp_live_*  → production
 *
 * The handler endpoints don't care which mode is active; client-side checkout
 * picks up the same key id and Razorpay routes accordingly.
 */

interface RazorpayClient {
  orders: {
    create(args: { amount: number; currency: string; receipt: string; notes?: Record<string, string> }): Promise<{
      id: string;
      amount: number;
      currency: string;
      receipt: string;
      status: string;
    }>;
  };
}

let client: RazorpayClient | null = null;

export function getRazorpay(): RazorpayClient {
  if (client) return client;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay not configured: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Razorpay = require('razorpay');
  client = new Razorpay({ key_id: keyId, key_secret: keySecret }) as RazorpayClient;
  logger.info('razorpay client initialized', { mode: keyId.startsWith('rzp_test_') ? 'test' : 'live' });
  return client;
}

export function isRazorpayConfigured(): boolean {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/**
 * Verify the HMAC signature Razorpay returns to the browser after a successful
 * checkout. The browser then POSTs (orderId, paymentId, signature) to our
 * /verify endpoint; this function is the gate before we mark the invoice paid.
 *
 * Algorithm per Razorpay docs:
 *   expected = HMAC-SHA256(orderId + "|" + paymentId, RAZORPAY_KEY_SECRET)
 *   accept iff expected === signature
 */
export function verifyCheckoutSignature(args: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${args.orderId}|${args.paymentId}`)
    .digest('hex');
  // Constant-time compare so timing differences can't reveal the signature.
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(args.signature, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Verify the X-Razorpay-Signature header on incoming webhooks. Different
 * secret from the checkout signature — Razorpay generates a webhook secret
 * separately when you create the webhook. Stored in RAZORPAY_WEBHOOK_SECRET.
 *
 * Algorithm:
 *   expected = HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)
 *   accept iff expected === header
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}
