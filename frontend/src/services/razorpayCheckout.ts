import api from './api';

/**
 * Razorpay checkout helper.
 *
 * Flow:
 *   1. Caller hands us an invoiceId.
 *   2. We POST /api/payments/razorpay/order to mint a Razorpay order. The
 *      server returns the orderId, the public keyId, and the amount in paise.
 *   3. We dynamically inject Razorpay's checkout.js (skipped if already on
 *      the page) and open the modal.
 *   4. When the user pays, Razorpay's success handler runs in the browser and
 *      gives us (orderId, paymentId, signature). We POST those to
 *      /api/payments/razorpay/verify, which HMAC-checks the signature and
 *      records the Payment row.
 *
 * Returns a Promise that resolves with the verify response on success or
 * rejects with an Error on cancel/failure. Pages can `await` the helper and
 * just refresh their invoice grid afterwards — no manual state plumbing.
 */

interface OrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  invoiceId: string;
}

interface VerifyResponse {
  ok: true;
  paymentId: string;
  newPaid: number;
  newBalance: number;
}

interface CheckoutOptions {
  invoiceId: string;
  /** Display name + contact prefilled into the Razorpay modal. */
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  /** Optional theme color override. */
  themeColor?: string;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay checkout')));
      return;
    }
    const script = document.createElement('script');
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
    document.body.appendChild(script);
  });
}

export async function payInvoiceWithRazorpay(opts: CheckoutOptions): Promise<VerifyResponse> {
  // 1. Mint the order.
  const { data: order } = await api.post<OrderResponse>('/api/payments/razorpay/order', {
    invoiceId: opts.invoiceId,
  });

  // 2. Make sure checkout.js is on the page.
  await loadCheckoutScript();

  // 3. Open the modal and wait for either success or cancel.
  return new Promise<VerifyResponse>((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'Hospital Bill',
      description: `Invoice ${order.invoiceId.slice(0, 8)}`,
      order_id: order.orderId,
      prefill: {
        name: opts.patientName,
        email: opts.patientEmail,
        contact: opts.patientPhone,
      },
      theme: { color: opts.themeColor || '#1f6feb' },
      handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        try {
          const { data } = await api.post<VerifyResponse>('/api/payments/razorpay/verify', {
            invoiceId: opts.invoiceId,
            orderId: resp.razorpay_order_id,
            paymentId: resp.razorpay_payment_id,
            signature: resp.razorpay_signature,
          });
          resolve(data);
        } catch (e: any) {
          // Server rejected the signature OR transaction failed. The webhook
          // is the backstop — Razorpay will POST it within ~minutes if the
          // payment actually captured, so the user shouldn't be told the
          // payment failed if it didn't. Surface the error and let the
          // caller refresh their invoice grid.
          reject(e?.response?.data?.error ? new Error(e.response.data.error) : e);
        }
      },
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
    });
    rzp.on('payment.failed', (resp: { error?: { description?: string } }) => {
      reject(new Error(resp?.error?.description || 'Payment failed'));
    });
    rzp.open();
  });
}
