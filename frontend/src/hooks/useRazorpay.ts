import { useState, useCallback, useEffect } from 'react';
import api from '../services/api';

interface PaymentConfig {
  enabled: boolean;
  publicKey: string | null;
  currency: string;
}

interface PaymentOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  paymentId: string;
  key: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void;
      close: () => void;
    };
  }
}

export function useRazorpay() {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Fetch payment configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get('/api/payments/config');
        setConfig(response.data);
      } catch (err) {
        console.error('Failed to fetch payment config:', err);
        setConfig({ enabled: false, publicKey: null, currency: 'INR' });
      }
    };
    fetchConfig();
  }, []);

  // Load Razorpay script
  useEffect(() => {
    if (!config?.enabled || scriptLoaded) return;

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setError('Failed to load payment gateway');
    document.body.appendChild(script);

    return () => {
      // Don't remove script on cleanup - might be needed later
    };
  }, [config?.enabled, scriptLoaded]);

  // Check if online payment is available
  const isAvailable = config?.enabled && scriptLoaded;

  // Create order and open Razorpay checkout
  const initiatePayment = useCallback(async (
    invoiceId: string,
    amount: number,
    onSuccess: (transactionId: string) => void,
    onError: (error: string) => void
  ) => {
    if (!isAvailable) {
      onError('Online payment is not available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create order
      const orderResponse = await api.post('/api/payments/create-order', {
        invoiceId,
        amount,
      });

      const orderData: PaymentOrderResponse = orderResponse.data;

      // Configure Razorpay options
      const options: RazorpayOptions = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Hospital ERP',
        description: `Payment for Invoice`,
        order_id: orderData.orderId,
        handler: async (response: RazorpayResponse) => {
          try {
            // Verify payment on backend
            const verifyResponse = await api.post('/api/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentId: orderData.paymentId,
            });

            if (verifyResponse.data.success) {
              onSuccess(response.razorpay_payment_id);
            } else {
              onError('Payment verification failed');
            }
          } catch (err: any) {
            onError(err.response?.data?.error || 'Payment verification failed');
          } finally {
            setLoading(false);
          }
        },
        prefill: orderData.prefill,
        theme: {
          color: '#1890ff',
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      setLoading(false);
      const errorMessage = err.response?.data?.error || 'Failed to initiate payment';
      setError(errorMessage);
      onError(errorMessage);
    }
  }, [isAvailable]);

  return {
    isAvailable,
    loading,
    error,
    initiatePayment,
    config,
  };
}

export default useRazorpay;
