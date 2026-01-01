/**
 * Billing Service Module
 *
 * This module provides helper functions for automatic billing integration
 * with lab and radiology orders.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface OrderBillingInfo {
  orderId: string;
  patientId: string;
  testId: string;
  testName: string;
  price: number;
  orderType: 'lab' | 'radiology';
}

export interface PendingCharge {
  orderId: string;
  orderType: string;
  testName: string;
  chargeAmount: number;
  orderedAt: Date;
  priority: string;
  status: string;
}

/**
 * Create automatic billing for a lab order
 * For OPD patients: creates/updates draft invoice
 * For IPD patients: adds to IPD charges (no invoice yet)
 */
export async function createLabOrderBilling(
  orderId: string,
  patientId: string,
  encounterId: string | null,
  admissionId: string | null,
  testIds: string[]
): Promise<void> {
  try {
    // Fetch test details and prices from LabTestMaster
    const tests = await prisma.labTestMaster.findMany({
      where: { id: { in: testIds }, isActive: true },
      select: { id: true, name: true, price: true, code: true }
    });

    if (tests.length === 0) {
      throw new Error('No valid lab tests found');
    }

    const totalAmount = tests.reduce((sum, test) => sum + Number(test.price), 0);

    // Update order with billing info
    await prisma.order.update({
      where: { id: orderId },
      data: {
        chargeAmount: totalAmount,
        billingStatus: 'unbilled',
        admissionId: admissionId
      }
    });

    // Check if patient is IPD (has active admission)
    if (admissionId) {
      // For IPD patients, just mark the order with admissionId
      // Don't create invoice yet - will be created at discharge
      console.log(`Lab order ${orderId} added to IPD charges for admission ${admissionId}`);
    } else {
      // For OPD patients, create or update draft invoice
      await createOrUpdateDraftInvoice(patientId, encounterId, orderId, tests, 'lab');
    }
  } catch (error) {
    console.error('Error creating lab order billing:', error);
    throw error;
  }
}

/**
 * Create automatic billing for a radiology order
 * For OPD patients: creates/updates draft invoice
 * For IPD patients: adds to IPD charges (no invoice yet)
 */
export async function createRadiologyOrderBilling(
  orderId: string,
  patientId: string,
  encounterId: string | null,
  admissionId: string | null,
  testIds: string[]
): Promise<void> {
  try {
    // Fetch test details and prices from RadiologyTestMaster
    const tests = await prisma.radiologyTestMaster.findMany({
      where: { id: { in: testIds }, isActive: true },
      select: { id: true, name: true, price: true, code: true }
    });

    if (tests.length === 0) {
      throw new Error('No valid radiology tests found');
    }

    const totalAmount = tests.reduce((sum, test) => sum + Number(test.price), 0);

    // Update order with billing info
    await prisma.order.update({
      where: { id: orderId },
      data: {
        chargeAmount: totalAmount,
        billingStatus: 'unbilled',
        admissionId: admissionId
      }
    });

    // Check if patient is IPD (has active admission)
    if (admissionId) {
      // For IPD patients, just mark the order with admissionId
      // Don't create invoice yet - will be created at discharge
      console.log(`Radiology order ${orderId} added to IPD charges for admission ${admissionId}`);
    } else {
      // For OPD patients, create or update draft invoice
      await createOrUpdateDraftInvoice(patientId, encounterId, orderId, tests, 'radiology');
    }
  } catch (error) {
    console.error('Error creating radiology order billing:', error);
    throw error;
  }
}

/**
 * Create or update draft invoice for OPD patients
 */
async function createOrUpdateDraftInvoice(
  patientId: string,
  encounterId: string | null,
  orderId: string,
  tests: Array<{ id: string; name: string; price: any; code: string }>,
  orderType: 'lab' | 'radiology'
): Promise<void> {
  // Check if there's an existing draft invoice for this patient and encounter
  const existingDraftInvoice = await prisma.invoice.findFirst({
    where: {
      patientId,
      encounterId: encounterId || undefined,
      status: 'draft',
      type: 'opd'
    },
    orderBy: { createdAt: 'desc' }
  });

  const items = tests.map(test => ({
    description: `${orderType === 'lab' ? 'Lab Test' : 'Radiology Test'}: ${test.name}`,
    code: test.code,
    testId: test.id,
    orderId: orderId,
    quantity: 1,
    unitPrice: Number(test.price),
    amount: Number(test.price)
  }));

  const subtotal = tests.reduce((sum, test) => sum + Number(test.price), 0);

  if (existingDraftInvoice) {
    // Update existing draft invoice
    const currentItems = existingDraftInvoice.items as any[];
    const updatedItems = [...currentItems, ...items];
    const newSubtotal = Number(existingDraftInvoice.subtotal) + subtotal;
    const newTotal = newSubtotal - Number(existingDraftInvoice.discount) + Number(existingDraftInvoice.tax);

    await prisma.invoice.update({
      where: { id: existingDraftInvoice.id },
      data: {
        items: updatedItems,
        subtotal: newSubtotal,
        total: newTotal,
        balance: newTotal - Number(existingDraftInvoice.paid)
      }
    });

    // Link order to invoice
    await prisma.order.update({
      where: { id: orderId },
      data: {
        invoiceId: existingDraftInvoice.id,
        billingStatus: 'billed'
      }
    });

    console.log(`Updated draft invoice ${existingDraftInvoice.id} with ${orderType} order ${orderId}`);
  } else {
    // Create new draft invoice
    const invoice = await prisma.invoice.create({
      data: {
        patientId,
        encounterId,
        type: 'opd',
        items: items,
        subtotal: subtotal,
        discount: 0,
        tax: 0,
        total: subtotal,
        paid: 0,
        balance: subtotal,
        status: 'draft'
      }
    });

    // Link order to invoice
    await prisma.order.update({
      where: { id: orderId },
      data: {
        invoiceId: invoice.id,
        billingStatus: 'billed'
      }
    });

    console.log(`Created new draft invoice ${invoice.id} for ${orderType} order ${orderId}`);
  }
}

/**
 * Get pending charges for a patient (not yet invoiced)
 */
export async function getPendingCharges(patientId: string): Promise<{
  labOrders: PendingCharge[];
  radiologyOrders: PendingCharge[];
  totalPending: number;
}> {
  // Get unbilled lab orders
  const labOrders = await prisma.order.findMany({
    where: {
      patientId,
      orderType: 'lab',
      billingStatus: 'unbilled',
      admissionId: null // Only OPD orders
    },
    include: {
      patient: { select: { name: true, mrn: true } }
    }
  });

  // Get unbilled radiology orders
  const radiologyOrders = await prisma.order.findMany({
    where: {
      patientId,
      orderType: 'radiology',
      billingStatus: 'unbilled',
      admissionId: null // Only OPD orders
    },
    include: {
      patient: { select: { name: true, mrn: true } }
    }
  });

  const formatOrder = (order: any): PendingCharge => {
    const details = order.details as any;
    const testName = details.tests && details.tests.length > 0
      ? (Array.isArray(details.tests) ? details.tests.map((t: any) => t.testName || 'Unknown').join(', ') : 'Unknown')
      : 'Unknown';

    return {
      orderId: order.id,
      orderType: order.orderType,
      testName: testName,
      chargeAmount: Number(order.chargeAmount || 0),
      orderedAt: order.orderedAt,
      priority: order.priority,
      status: order.status
    };
  };

  const labCharges = labOrders.map(formatOrder);
  const radiologyCharges = radiologyOrders.map(formatOrder);

  const totalPending =
    labCharges.reduce((sum, c) => sum + c.chargeAmount, 0) +
    radiologyCharges.reduce((sum, c) => sum + c.chargeAmount, 0);

  return {
    labOrders: labCharges,
    radiologyOrders: radiologyCharges,
    totalPending
  };
}

/**
 * Get IPD charges for an admission (unbilled orders)
 */
export async function getIPDPendingCharges(admissionId: string): Promise<{
  labOrders: PendingCharge[];
  radiologyOrders: PendingCharge[];
  totalPending: number;
}> {
  // Get unbilled lab orders for this admission
  const labOrders = await prisma.order.findMany({
    where: {
      admissionId,
      orderType: 'lab',
      billingStatus: 'unbilled'
    }
  });

  // Get unbilled radiology orders for this admission
  const radiologyOrders = await prisma.order.findMany({
    where: {
      admissionId,
      orderType: 'radiology',
      billingStatus: 'unbilled'
    }
  });

  const formatOrder = (order: any): PendingCharge => {
    const details = order.details as any;
    const testName = details.tests && details.tests.length > 0
      ? (Array.isArray(details.tests) ? details.tests.map((t: any) => t.testName || 'Unknown').join(', ') : 'Unknown')
      : 'Unknown';

    return {
      orderId: order.id,
      orderType: order.orderType,
      testName: testName,
      chargeAmount: Number(order.chargeAmount || 0),
      orderedAt: order.orderedAt,
      priority: order.priority,
      status: order.status
    };
  };

  const labCharges = labOrders.map(formatOrder);
  const radiologyCharges = radiologyOrders.map(formatOrder);

  const totalPending =
    labCharges.reduce((sum, c) => sum + c.chargeAmount, 0) +
    radiologyCharges.reduce((sum, c) => sum + c.chargeAmount, 0);

  return {
    labOrders: labCharges,
    radiologyOrders: radiologyCharges,
    totalPending
  };
}

/**
 * Generate invoice from pending charges
 */
export async function generateInvoiceFromCharges(
  patientId: string,
  orderIds: string[],
  encounterId?: string,
  admissionId?: string,
  discountPercent: number = 0
): Promise<any> {
  // Fetch orders
  const orders = await prisma.order.findMany({
    where: {
      id: { in: orderIds },
      patientId,
      billingStatus: 'unbilled'
    }
  });

  if (orders.length === 0) {
    throw new Error('No unbilled orders found');
  }

  // Fetch test details
  const labOrderIds = orders.filter(o => o.orderType === 'lab').map(o => o.id);
  const radiologyOrderIds = orders.filter(o => o.orderType === 'radiology').map(o => o.id);

  const items: any[] = [];

  // Process lab orders
  for (const order of orders.filter(o => o.orderType === 'lab')) {
    const details = order.details as any;
    const testIds = details.tests?.map((t: any) => t.testId) || [];

    const tests = await prisma.labTestMaster.findMany({
      where: { id: { in: testIds } }
    });

    tests.forEach(test => {
      items.push({
        description: `Lab Test: ${test.name}`,
        code: test.code,
        testId: test.id,
        orderId: order.id,
        quantity: 1,
        unitPrice: Number(test.price),
        amount: Number(test.price)
      });
    });
  }

  // Process radiology orders
  for (const order of orders.filter(o => o.orderType === 'radiology')) {
    const details = order.details as any;
    const testIds = details.tests?.map((t: any) => t.testId) || [];

    const tests = await prisma.radiologyTestMaster.findMany({
      where: { id: { in: testIds } }
    });

    tests.forEach(test => {
      items.push({
        description: `Radiology Test: ${test.name}`,
        code: test.code,
        testId: test.id,
        orderId: order.id,
        quantity: 1,
        unitPrice: Number(test.price),
        amount: Number(test.price)
      });
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const discount = subtotal * (discountPercent / 100);
  const total = subtotal - discount;

  // Create invoice
  const invoice = await prisma.invoice.create({
    data: {
      patientId,
      encounterId: encounterId || null,
      type: admissionId ? 'ipd' : 'opd',
      items: items,
      subtotal: subtotal,
      discount: discount,
      tax: 0,
      total: total,
      paid: 0,
      balance: total,
      status: 'final'
    },
    include: {
      patient: { select: { name: true, mrn: true, contact: true } }
    }
  });

  // Update orders to mark as billed
  await prisma.order.updateMany({
    where: { id: { in: orderIds } },
    data: {
      billingStatus: 'billed',
      invoiceId: invoice.id
    }
  });

  return invoice;
}

/**
 * Mark order charges as paid (when invoice is paid)
 */
export async function markOrdersAsPaid(invoiceId: string): Promise<void> {
  await prisma.order.updateMany({
    where: { invoiceId },
    data: { billingStatus: 'paid' }
  });
}
