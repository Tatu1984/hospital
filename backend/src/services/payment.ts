import crypto from 'crypto';
import { logger } from '../utils/logger';

// Safe config access
const getPaymentConfig = () => {
  try {
    const { config } = require('../config');
    return config?.razorpay || { keyId: '', keySecret: '', webhookSecret: '', enabled: false };
  } catch {
    return { keyId: '', keySecret: '', webhookSecret: '', enabled: false };
  }
};

// Razorpay API base URL
const RAZORPAY_API = 'https://api.razorpay.com/v1';

interface RazorpayOrderParams {
  amount: number; // Amount in smallest currency unit (paise for INR)
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

interface RazorpayPaymentVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayPaymentDetails {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string;
  method: string;
  description: string;
  bank: string | null;
  wallet: string | null;
  vpa: string | null;
  email: string;
  contact: string;
  fee: number;
  tax: number;
  error_code: string | null;
  error_description: string | null;
  created_at: number;
  captured: boolean;
}

interface RefundParams {
  paymentId: string;
  amount?: number; // Optional for partial refunds (in paise)
  notes?: Record<string, string>;
}

interface RefundResponse {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  payment_id: string;
  status: string;
  created_at: number;
}

/**
 * Payment Gateway Service
 * Handles all Razorpay payment operations
 */
export class PaymentService {
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;
  private enabled: boolean;

  constructor() {
    const paymentConfig = getPaymentConfig();
    this.keyId = paymentConfig.keyId;
    this.keySecret = paymentConfig.keySecret;
    this.webhookSecret = paymentConfig.webhookSecret;
    this.enabled = paymentConfig.enabled;
  }

  /**
   * Check if payment gateway is configured
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get basic auth header for Razorpay API
   */
  private getAuthHeader(): string {
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    return `Basic ${auth}`;
  }

  /**
   * Make API request to Razorpay
   */
  private async apiRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${RAZORPAY_API}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('Razorpay API error', {
        endpoint,
        status: response.status,
        error: data,
      });
      throw new Error((data as any).error?.description || 'Payment gateway error');
    }

    return data as T;
  }

  /**
   * Create a Razorpay order
   * @param params Order parameters
   * @returns Created order details
   */
  async createOrder(params: RazorpayOrderParams): Promise<RazorpayOrder> {
    if (!this.enabled) {
      throw new Error('Payment gateway is not configured');
    }

    logger.info('Creating Razorpay order', { receipt: params.receipt, amount: params.amount });

    const order = await this.apiRequest<RazorpayOrder>('/orders', 'POST', {
      amount: params.amount,
      currency: params.currency || 'INR',
      receipt: params.receipt,
      notes: params.notes || {},
    });

    logger.info('Razorpay order created', { orderId: order.id, receipt: params.receipt });

    return order;
  }

  /**
   * Verify payment signature from Razorpay
   * @param params Payment verification parameters
   * @returns True if signature is valid
   */
  verifyPaymentSignature(params: RazorpayPaymentVerification): boolean {
    if (!this.enabled) {
      throw new Error('Payment gateway is not configured');
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params;

    // Generate expected signature
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(payload)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    logger.info('Payment signature verification', {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      isValid,
    });

    return isValid;
  }

  /**
   * Verify webhook signature
   * @param body Raw request body
   * @param signature Signature from X-Razorpay-Signature header
   * @returns True if webhook is authentic
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!this.webhookSecret) {
      logger.warn('Webhook secret not configured');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Fetch payment details from Razorpay
   * @param paymentId Razorpay payment ID
   * @returns Payment details
   */
  async getPaymentDetails(paymentId: string): Promise<RazorpayPaymentDetails> {
    if (!this.enabled) {
      throw new Error('Payment gateway is not configured');
    }

    return this.apiRequest<RazorpayPaymentDetails>(`/payments/${paymentId}`);
  }

  /**
   * Capture a payment (for manual capture mode)
   * @param paymentId Razorpay payment ID
   * @param amount Amount to capture (in paise)
   * @returns Updated payment details
   */
  async capturePayment(paymentId: string, amount: number): Promise<RazorpayPaymentDetails> {
    if (!this.enabled) {
      throw new Error('Payment gateway is not configured');
    }

    logger.info('Capturing payment', { paymentId, amount });

    return this.apiRequest<RazorpayPaymentDetails>(`/payments/${paymentId}/capture`, 'POST', {
      amount,
      currency: 'INR',
    });
  }

  /**
   * Create a refund
   * @param params Refund parameters
   * @returns Refund details
   */
  async createRefund(params: RefundParams): Promise<RefundResponse> {
    if (!this.enabled) {
      throw new Error('Payment gateway is not configured');
    }

    const { paymentId, amount, notes } = params;

    logger.info('Creating refund', { paymentId, amount });

    const body: Record<string, unknown> = {};
    if (amount) body.amount = amount;
    if (notes) body.notes = notes;

    return this.apiRequest<RefundResponse>(`/payments/${paymentId}/refund`, 'POST', body);
  }

  /**
   * Get public key for frontend checkout
   */
  getPublicKey(): string {
    return this.keyId;
  }

  /**
   * Convert amount to paise (smallest currency unit)
   * @param amount Amount in rupees
   * @returns Amount in paise
   */
  static toPaise(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Convert paise to rupees
   * @param paise Amount in paise
   * @returns Amount in rupees
   */
  static toRupees(paise: number): number {
    return paise / 100;
  }
}

// Singleton instance
export const paymentService = new PaymentService();
