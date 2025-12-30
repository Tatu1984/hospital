import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Invoice item validation schema
const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative'),
  amount: z.number().nonnegative('Amount cannot be negative'),
  category: z.enum(['consultation', 'procedure', 'lab', 'pharmacy', 'room', 'other']).optional(),
  serviceId: z.string().optional(),
});

// Invoice creation schema
const createInvoiceSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  type: z.enum(['OPD', 'IPD', 'Emergency', 'Lab', 'Pharmacy']),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  subtotal: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  tax: z.number().nonnegative().default(0),
  total: z.number().positive('Total must be positive'),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
});

// Payment schema
const paymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  amount: z.number().positive('Payment amount must be positive'),
  method: z.enum(['cash', 'card', 'upi', 'netbanking', 'insurance', 'wallet']),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

// Refund schema
const refundSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  amount: z.number().positive('Refund amount must be positive'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

describe('Billing API Validation', () => {
  describe('Invoice Creation Schema', () => {
    it('should accept valid invoice data', () => {
      const validInvoice = {
        patientId: 'patient-123',
        type: 'OPD',
        items: [
          {
            description: 'Consultation Fee',
            quantity: 1,
            unitPrice: 500,
            amount: 500,
          },
        ],
        subtotal: 500,
        discount: 0,
        tax: 25,
        total: 525,
      };

      const result = createInvoiceSchema.safeParse(validInvoice);
      expect(result.success).toBe(true);
    });

    it('should require patient ID', () => {
      const invoiceWithoutPatient = {
        type: 'OPD',
        items: [{ description: 'Test', quantity: 1, unitPrice: 100, amount: 100 }],
        subtotal: 100,
        total: 100,
      };

      const result = createInvoiceSchema.safeParse(invoiceWithoutPatient);
      expect(result.success).toBe(false);
    });

    it('should require at least one item', () => {
      const invoiceNoItems = {
        patientId: 'patient-123',
        type: 'OPD',
        items: [],
        subtotal: 0,
        total: 0,
      };

      const result = createInvoiceSchema.safeParse(invoiceNoItems);
      expect(result.success).toBe(false);
    });

    it('should validate invoice type enum', () => {
      const validTypes = ['OPD', 'IPD', 'Emergency', 'Lab', 'Pharmacy'];
      const invalidTypes = ['OUTPATIENT', 'inpatient', 'unknown'];

      validTypes.forEach(type => {
        const invoice = {
          patientId: 'patient-123',
          type,
          items: [{ description: 'Test', quantity: 1, unitPrice: 100, amount: 100 }],
          subtotal: 100,
          total: 100,
        };
        const result = createInvoiceSchema.safeParse(invoice);
        expect(result.success).toBe(true);
      });

      invalidTypes.forEach(type => {
        const invoice = {
          patientId: 'patient-123',
          type,
          items: [{ description: 'Test', quantity: 1, unitPrice: 100, amount: 100 }],
          subtotal: 100,
          total: 100,
        };
        const result = createInvoiceSchema.safeParse(invoice);
        expect(result.success).toBe(false);
      });
    });

    it('should reject negative amounts', () => {
      const invoiceNegativeAmount = {
        patientId: 'patient-123',
        type: 'OPD',
        items: [{ description: 'Test', quantity: 1, unitPrice: -100, amount: -100 }],
        subtotal: -100,
        total: -100,
      };

      const result = createInvoiceSchema.safeParse(invoiceNegativeAmount);
      expect(result.success).toBe(false);
    });

    it('should validate item quantity is positive', () => {
      const invalidQuantities = [0, -1, -5];

      invalidQuantities.forEach(quantity => {
        const invoice = {
          patientId: 'patient-123',
          type: 'OPD',
          items: [{ description: 'Test', quantity, unitPrice: 100, amount: 100 }],
          subtotal: 100,
          total: 100,
        };
        const result = createInvoiceSchema.safeParse(invoice);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Payment Schema', () => {
    it('should accept valid payment data', () => {
      const validPayment = {
        invoiceId: 'invoice-123',
        amount: 500,
        method: 'cash',
      };

      const result = paymentSchema.safeParse(validPayment);
      expect(result.success).toBe(true);
    });

    it('should require invoice ID', () => {
      const paymentWithoutInvoice = {
        amount: 500,
        method: 'cash',
      };

      const result = paymentSchema.safeParse(paymentWithoutInvoice);
      expect(result.success).toBe(false);
    });

    it('should require positive payment amount', () => {
      const invalidAmounts = [0, -100, -1];

      invalidAmounts.forEach(amount => {
        const payment = {
          invoiceId: 'invoice-123',
          amount,
          method: 'cash',
        };
        const result = paymentSchema.safeParse(payment);
        expect(result.success).toBe(false);
      });
    });

    it('should validate payment method enum', () => {
      const validMethods = ['cash', 'card', 'upi', 'netbanking', 'insurance', 'wallet'];
      const invalidMethods = ['check', 'crypto', 'barter'];

      validMethods.forEach(method => {
        const payment = { invoiceId: 'invoice-123', amount: 500, method };
        const result = paymentSchema.safeParse(payment);
        expect(result.success).toBe(true);
      });

      invalidMethods.forEach(method => {
        const payment = { invoiceId: 'invoice-123', amount: 500, method };
        const result = paymentSchema.safeParse(payment);
        expect(result.success).toBe(false);
      });
    });

    it('should allow optional reference number', () => {
      const paymentWithRef = {
        invoiceId: 'invoice-123',
        amount: 500,
        method: 'card',
        referenceNumber: 'TXN123456',
      };

      const result = paymentSchema.safeParse(paymentWithRef);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.referenceNumber).toBe('TXN123456');
      }
    });
  });

  describe('Refund Schema', () => {
    it('should accept valid refund data', () => {
      const validRefund = {
        paymentId: 'payment-123',
        amount: 250,
        reason: 'Service not provided as expected',
      };

      const result = refundSchema.safeParse(validRefund);
      expect(result.success).toBe(true);
    });

    it('should require payment ID', () => {
      const refundWithoutPayment = {
        amount: 250,
        reason: 'Service not provided as expected',
      };

      const result = refundSchema.safeParse(refundWithoutPayment);
      expect(result.success).toBe(false);
    });

    it('should require positive refund amount', () => {
      const invalidAmounts = [0, -50, -100];

      invalidAmounts.forEach(amount => {
        const refund = {
          paymentId: 'payment-123',
          amount,
          reason: 'Service not provided as expected',
        };
        const result = refundSchema.safeParse(refund);
        expect(result.success).toBe(false);
      });
    });

    it('should require reason with minimum length', () => {
      const shortReasons = ['short', 'too short', ''];

      shortReasons.forEach(reason => {
        const refund = {
          paymentId: 'payment-123',
          amount: 250,
          reason,
        };
        const result = refundSchema.safeParse(refund);
        expect(result.success).toBe(false);
      });
    });
  });
});

describe('Billing Business Logic', () => {
  describe('Invoice Number Generation', () => {
    const generateInvoiceNumber = (prefix: string = 'INV', tenantCode: string = 'HS') => {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const sequence = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      return `${prefix}-${tenantCode}${year}${month}-${sequence}`;
    };

    it('should generate unique invoice numbers', () => {
      const inv1 = generateInvoiceNumber();
      const inv2 = generateInvoiceNumber();

      expect(inv1).not.toBe(inv2);
      expect(inv1).toMatch(/^INV-HS\d{4}-\d{4}$/);
    });

    it('should follow invoice number format', () => {
      const invoicePattern = /^INV-[A-Z]{2}\d{4}-\d{4}$/;
      const numbers = Array.from({ length: 10 }, () => generateInvoiceNumber());

      numbers.forEach(num => {
        expect(num).toMatch(invoicePattern);
      });
    });

    it('should support custom prefixes', () => {
      const labInvoice = generateInvoiceNumber('LAB', 'DX');
      const pharmaInvoice = generateInvoiceNumber('PHR', 'RX');

      expect(labInvoice.startsWith('LAB-DX')).toBe(true);
      expect(pharmaInvoice.startsWith('PHR-RX')).toBe(true);
    });
  });

  describe('Amount Calculations', () => {
    const calculateInvoiceTotal = (
      items: Array<{ quantity: number; unitPrice: number }>,
      discount: number = 0,
      discountType: 'percentage' | 'fixed' = 'fixed',
      taxRate: number = 0
    ) => {
      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

      let discountAmount = 0;
      if (discountType === 'percentage') {
        discountAmount = (subtotal * discount) / 100;
      } else {
        discountAmount = discount;
      }

      const afterDiscount = subtotal - discountAmount;
      const taxAmount = (afterDiscount * taxRate) / 100;
      const total = afterDiscount + taxAmount;

      return {
        subtotal,
        discountAmount,
        taxAmount,
        total: Math.round(total * 100) / 100, // Round to 2 decimal places
      };
    };

    it('should calculate subtotal correctly', () => {
      const items = [
        { quantity: 2, unitPrice: 100 },
        { quantity: 1, unitPrice: 500 },
      ];

      const result = calculateInvoiceTotal(items);
      expect(result.subtotal).toBe(700);
    });

    it('should apply fixed discount correctly', () => {
      const items = [{ quantity: 1, unitPrice: 1000 }];
      const result = calculateInvoiceTotal(items, 100, 'fixed');

      expect(result.subtotal).toBe(1000);
      expect(result.discountAmount).toBe(100);
      expect(result.total).toBe(900);
    });

    it('should apply percentage discount correctly', () => {
      const items = [{ quantity: 1, unitPrice: 1000 }];
      const result = calculateInvoiceTotal(items, 10, 'percentage');

      expect(result.subtotal).toBe(1000);
      expect(result.discountAmount).toBe(100);
      expect(result.total).toBe(900);
    });

    it('should calculate tax correctly', () => {
      const items = [{ quantity: 1, unitPrice: 1000 }];
      const result = calculateInvoiceTotal(items, 0, 'fixed', 5);

      expect(result.subtotal).toBe(1000);
      expect(result.taxAmount).toBe(50);
      expect(result.total).toBe(1050);
    });

    it('should apply discount before tax', () => {
      const items = [{ quantity: 1, unitPrice: 1000 }];
      const result = calculateInvoiceTotal(items, 200, 'fixed', 10);

      // Subtotal: 1000, After discount: 800, Tax (10%): 80, Total: 880
      expect(result.subtotal).toBe(1000);
      expect(result.discountAmount).toBe(200);
      expect(result.taxAmount).toBe(80);
      expect(result.total).toBe(880);
    });

    it('should handle multiple items with discount and tax', () => {
      const items = [
        { quantity: 2, unitPrice: 500 },
        { quantity: 1, unitPrice: 200 },
        { quantity: 3, unitPrice: 100 },
      ];
      const result = calculateInvoiceTotal(items, 10, 'percentage', 5);

      // Subtotal: 1500, Discount (10%): 150, After: 1350, Tax (5%): 67.50
      expect(result.subtotal).toBe(1500);
      expect(result.discountAmount).toBe(150);
      expect(result.taxAmount).toBe(67.5);
      expect(result.total).toBe(1417.5);
    });
  });

  describe('Payment Status Tracking', () => {
    type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'refunded';

    const calculatePaymentStatus = (
      total: number,
      paid: number,
      dueDate: Date | null,
      refunded: number = 0
    ): PaymentStatus => {
      if (refunded > 0 && refunded >= paid) return 'refunded';
      if (paid >= total) return 'paid';
      if (paid > 0) return 'partial';
      if (dueDate && new Date() > dueDate) return 'overdue';
      return 'pending';
    };

    it('should return pending for unpaid invoices', () => {
      const status = calculatePaymentStatus(1000, 0, null);
      expect(status).toBe('pending');
    });

    it('should return paid when fully paid', () => {
      const status = calculatePaymentStatus(1000, 1000, null);
      expect(status).toBe('paid');
    });

    it('should return paid when overpaid', () => {
      const status = calculatePaymentStatus(1000, 1200, null);
      expect(status).toBe('paid');
    });

    it('should return partial for partially paid invoices', () => {
      const status = calculatePaymentStatus(1000, 500, null);
      expect(status).toBe('partial');
    });

    it('should return overdue for past due unpaid invoices', () => {
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      const status = calculatePaymentStatus(1000, 0, pastDate);
      expect(status).toBe('overdue');
    });

    it('should return pending for future due date', () => {
      const futureDate = new Date(Date.now() + 86400000 * 7); // 7 days from now
      const status = calculatePaymentStatus(1000, 0, futureDate);
      expect(status).toBe('pending');
    });

    it('should return refunded when fully refunded', () => {
      const status = calculatePaymentStatus(1000, 1000, null, 1000);
      expect(status).toBe('refunded');
    });
  });

  describe('Outstanding Balance', () => {
    interface Invoice {
      id: string;
      total: number;
      paidAmount: number;
    }

    const calculateOutstandingBalance = (invoices: Invoice[]): number => {
      return invoices.reduce((sum, inv) => sum + (inv.total - inv.paidAmount), 0);
    };

    it('should calculate total outstanding balance', () => {
      const invoices = [
        { id: '1', total: 1000, paidAmount: 500 },
        { id: '2', total: 2000, paidAmount: 2000 },
        { id: '3', total: 500, paidAmount: 0 },
      ];

      const balance = calculateOutstandingBalance(invoices);
      expect(balance).toBe(1000); // 500 + 0 + 500
    });

    it('should return 0 for fully paid invoices', () => {
      const invoices = [
        { id: '1', total: 1000, paidAmount: 1000 },
        { id: '2', total: 2000, paidAmount: 2000 },
      ];

      const balance = calculateOutstandingBalance(invoices);
      expect(balance).toBe(0);
    });

    it('should handle empty invoice list', () => {
      const balance = calculateOutstandingBalance([]);
      expect(balance).toBe(0);
    });
  });
});

describe('Billing Reports', () => {
  describe('Daily Collection Summary', () => {
    interface Payment {
      method: string;
      amount: number;
      timestamp: Date;
    }

    const summarizeCollections = (payments: Payment[]) => {
      const byMethod: Record<string, number> = {};
      let totalAmount = 0;

      payments.forEach(p => {
        byMethod[p.method] = (byMethod[p.method] || 0) + p.amount;
        totalAmount += p.amount;
      });

      return { byMethod, totalAmount, count: payments.length };
    };

    it('should summarize collections by payment method', () => {
      const payments = [
        { method: 'cash', amount: 500, timestamp: new Date() },
        { method: 'card', amount: 1000, timestamp: new Date() },
        { method: 'cash', amount: 300, timestamp: new Date() },
        { method: 'upi', amount: 750, timestamp: new Date() },
      ];

      const summary = summarizeCollections(payments);

      expect(summary.byMethod.cash).toBe(800);
      expect(summary.byMethod.card).toBe(1000);
      expect(summary.byMethod.upi).toBe(750);
      expect(summary.totalAmount).toBe(2550);
      expect(summary.count).toBe(4);
    });

    it('should handle empty payments list', () => {
      const summary = summarizeCollections([]);

      expect(summary.totalAmount).toBe(0);
      expect(summary.count).toBe(0);
      expect(Object.keys(summary.byMethod).length).toBe(0);
    });
  });

  describe('Revenue by Department', () => {
    interface InvoiceItem {
      department: string;
      amount: number;
    }

    const summarizeByDepartment = (items: InvoiceItem[]) => {
      const byDept: Record<string, { total: number; count: number }> = {};

      items.forEach(item => {
        if (!byDept[item.department]) {
          byDept[item.department] = { total: 0, count: 0 };
        }
        byDept[item.department].total += item.amount;
        byDept[item.department].count += 1;
      });

      return byDept;
    };

    it('should summarize revenue by department', () => {
      const items = [
        { department: 'General Medicine', amount: 500 },
        { department: 'Cardiology', amount: 1500 },
        { department: 'General Medicine', amount: 300 },
        { department: 'Lab', amount: 200 },
        { department: 'Cardiology', amount: 2000 },
      ];

      const summary = summarizeByDepartment(items);

      expect(summary['General Medicine'].total).toBe(800);
      expect(summary['General Medicine'].count).toBe(2);
      expect(summary['Cardiology'].total).toBe(3500);
      expect(summary['Cardiology'].count).toBe(2);
      expect(summary['Lab'].total).toBe(200);
      expect(summary['Lab'].count).toBe(1);
    });
  });
});

describe('Insurance Claims', () => {
  describe('Claim Validation', () => {
    const claimSchema = z.object({
      patientId: z.string().min(1),
      invoiceId: z.string().min(1),
      insurerId: z.string().min(1),
      policyNumber: z.string().min(5, 'Policy number must be at least 5 characters'),
      claimAmount: z.number().positive(),
      preAuthNumber: z.string().optional(),
      documents: z.array(z.string()).optional(),
    });

    it('should accept valid claim data', () => {
      const validClaim = {
        patientId: 'patient-123',
        invoiceId: 'invoice-123',
        insurerId: 'insurer-123',
        policyNumber: 'POL12345',
        claimAmount: 5000,
      };

      const result = claimSchema.safeParse(validClaim);
      expect(result.success).toBe(true);
    });

    it('should require valid policy number', () => {
      const invalidClaim = {
        patientId: 'patient-123',
        invoiceId: 'invoice-123',
        insurerId: 'insurer-123',
        policyNumber: 'POL',
        claimAmount: 5000,
      };

      const result = claimSchema.safeParse(invalidClaim);
      expect(result.success).toBe(false);
    });

    it('should require positive claim amount', () => {
      const invalidClaim = {
        patientId: 'patient-123',
        invoiceId: 'invoice-123',
        insurerId: 'insurer-123',
        policyNumber: 'POL12345',
        claimAmount: 0,
      };

      const result = claimSchema.safeParse(invalidClaim);
      expect(result.success).toBe(false);
    });
  });

  describe('Claim Status Flow', () => {
    const validTransitions: Record<string, string[]> = {
      draft: ['submitted'],
      submitted: ['under_review', 'rejected'],
      under_review: ['approved', 'query_raised', 'rejected'],
      query_raised: ['submitted', 'rejected'],
      approved: ['settled', 'partial_settled'],
      partial_settled: ['settled'],
      rejected: [],
      settled: [],
    };

    const isValidTransition = (from: string, to: string): boolean => {
      return validTransitions[from]?.includes(to) || false;
    };

    it('should allow valid status transitions', () => {
      expect(isValidTransition('draft', 'submitted')).toBe(true);
      expect(isValidTransition('submitted', 'under_review')).toBe(true);
      expect(isValidTransition('under_review', 'approved')).toBe(true);
      expect(isValidTransition('approved', 'settled')).toBe(true);
    });

    it('should reject invalid status transitions', () => {
      expect(isValidTransition('draft', 'approved')).toBe(false);
      expect(isValidTransition('submitted', 'settled')).toBe(false);
      expect(isValidTransition('rejected', 'approved')).toBe(false);
      expect(isValidTransition('settled', 'draft')).toBe(false);
    });

    it('should prevent transitions from terminal states', () => {
      expect(isValidTransition('settled', 'submitted')).toBe(false);
      expect(isValidTransition('rejected', 'submitted')).toBe(false);
    });
  });
});
