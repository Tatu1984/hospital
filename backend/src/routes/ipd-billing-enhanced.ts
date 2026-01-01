/**
 * Enhanced IPD Billing Routes
 * Add these routes to server.ts in the IPD BILLING ROUTES section
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// GET /api/ipd-billing/admissions - Get active admissions for billing
export const getIPDAdmissions = async (req: any, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};

    if (status) where.status = status;

    const admissions = await prisma.admission.findMany({
      where,
      include: {
        patient: { select: { name: true, mrn: true, dob: true, gender: true } },
        bed: { select: { bedNumber: true, category: true, wardId: true } },
        admittingDoctor: { select: { name: true } },
        encounter: {
          include: {
            invoices: { where: { type: 'ipd' }, take: 1 }
          }
        }
      },
      orderBy: { admissionDate: 'desc' },
    });

    // Transform for frontend compatibility
    res.json(admissions.map((adm, index) => ({
      ...adm,
      admissionId: `ADM-${String(index + 1).padStart(4, '0')}`,
      patientName: adm.patient?.name || 'Unknown',
      patientMRN: adm.patient?.mrn || '',
      wardName: adm.bed?.category || 'General',
      bedNumber: adm.bed?.bedNumber || 'N/A',
      doctorName: adm.admittingDoctor?.name || 'Not Assigned',
      diagnosis: adm.diagnosis || 'Not specified',
      hasInvoice: adm.encounter?.invoices?.length > 0,
      invoiceId: adm.encounter?.invoices?.[0]?.id || null,
      invoiceStatus: adm.encounter?.invoices?.[0]?.status || null,
    })));
  } catch (error) {
    logger.error('Get IPD admissions error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/ipd-billing/:admissionId/charges - Calculate all charges for an admission
export const getIPDCharges = async (req: any, res: Response) => {
  try {
    const { admissionId } = req.params;

    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        patient: true,
        bed: { include: { branch: true } },
        admittingDoctor: { select: { name: true } },
        encounter: {
          include: {
            orders: { where: { status: { not: 'cancelled' } } },
          },
        },
      },
    });

    if (!admission) {
      return res.status(404).json({ error: 'Admission not found' });
    }

    // Calculate days of stay
    const admitDate = new Date(admission.admissionDate);
    const dischargeDate = admission.dischargeDate ? new Date(admission.dischargeDate) : new Date();
    const totalDays = Math.ceil((dischargeDate.getTime() - admitDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;

    // Get ward tariff if available
    let bedChargePerDay = 1500; // Default rate
    if (admission.bed?.wardId) {
      const ward = await prisma.ward.findUnique({ where: { id: admission.bed.wardId } });
      if (ward) bedChargePerDay = Number(ward.tariffPerDay);
    } else {
      // Set rate based on bed category
      const categoryRates: Record<string, number> = {
        'general': 1500,
        'semi-private': 2500,
        'private': 4000,
        'deluxe': 6000,
        'icu': 8000,
        'nicu': 10000,
      };
      bedChargePerDay = categoryRates[admission.bed?.category?.toLowerCase() || 'general'] || 1500;
    }

    const charges: any[] = [];

    // 1. BED CHARGES - Daily bed rate x number of days
    charges.push({
      id: `bed-${admissionId}`,
      admissionId,
      category: 'bed',
      description: `${admission.bed?.category || 'General'} Ward - Bed ${admission.bed?.bedNumber || 'N/A'} (${totalDays} day${totalDays > 1 ? 's' : ''})`,
      quantity: totalDays,
      unitPrice: bedChargePerDay,
      total: totalDays * bedChargePerDay,
      date: admission.admissionDate.toISOString(),
    });

    // 2. CONSULTATION/DOCTOR VISIT CHARGES
    const consultationOrders = admission.encounter?.orders?.filter((o: any) =>
      o.orderType.toLowerCase().includes('consultation') || o.orderType.toLowerCase().includes('visit')
    ) || [];

    if (consultationOrders.length > 0) {
      consultationOrders.forEach((order: any) => {
        const details = order.details as any;
        charges.push({
          id: `${order.id}`,
          admissionId,
          category: 'consultation',
          description: details?.description || details?.name || 'Doctor Consultation',
          quantity: 1,
          unitPrice: Number(details?.price || 500),
          total: Number(details?.price || 500),
          date: order.orderedAt.toISOString(),
          orderId: order.id,
        });
      });
    } else {
      // Default consultation charge
      charges.push({
        id: `consultation-default-${admissionId}`,
        admissionId,
        category: 'consultation',
        description: `Doctor Consultation - ${admission.admittingDoctor?.name || 'Attending Physician'}`,
        quantity: 1,
        unitPrice: 500,
        total: 500,
        date: admission.admissionDate.toISOString(),
      });
    }

    // 3. NURSING CHARGES - Daily nursing care
    const nursingChargePerDay = 300;
    charges.push({
      id: `nursing-${admissionId}`,
      admissionId,
      category: 'other',
      description: `Nursing Care (${totalDays} day${totalDays > 1 ? 's' : ''})`,
      quantity: totalDays,
      unitPrice: nursingChargePerDay,
      total: totalDays * nursingChargePerDay,
      date: admission.admissionDate.toISOString(),
    });

    // 4. PROCEDURE/SURGERY CHARGES
    const procedureOrders = admission.encounter?.orders?.filter((o: any) =>
      o.orderType.toLowerCase().includes('procedure') || o.orderType.toLowerCase().includes('surgery')
    ) || [];

    procedureOrders.forEach((order: any) => {
      const details = order.details as any;
      if (details?.items && Array.isArray(details.items)) {
        details.items.forEach((item: any) => {
          charges.push({
            id: `${order.id}-${item.id || Math.random().toString(36).substr(2, 9)}`,
            admissionId,
            category: 'procedure',
            description: item.name || item.procedureName || 'Procedure',
            quantity: item.quantity || 1,
            unitPrice: Number(item.price) || 0,
            total: (item.quantity || 1) * (Number(item.price) || 0),
            date: order.orderedAt.toISOString(),
            orderId: order.id,
          });
        });
      } else if (details?.name || details?.procedureName) {
        charges.push({
          id: order.id,
          admissionId,
          category: 'procedure',
          description: details.procedureName || details.name || 'Procedure',
          quantity: 1,
          unitPrice: Number(details.price) || 0,
          total: Number(details.price) || 0,
          date: order.orderedAt.toISOString(),
          orderId: order.id,
        });
      }
    });

    // 5. LAB TEST CHARGES
    const labOrders = admission.encounter?.orders?.filter((o: any) =>
      o.orderType.toLowerCase().includes('lab') || o.orderType.toLowerCase().includes('test')
    ) || [];

    labOrders.forEach((order: any) => {
      const details = order.details as any;
      if (details?.tests && Array.isArray(details.tests)) {
        details.tests.forEach((test: any) => {
          charges.push({
            id: `${order.id}-${test.id || Math.random().toString(36).substr(2, 9)}`,
            admissionId,
            category: 'lab',
            description: test.testName || test.name || 'Lab Test',
            quantity: 1,
            unitPrice: Number(test.price) || 0,
            total: Number(test.price) || 0,
            date: order.orderedAt.toISOString(),
            orderId: order.id,
          });
        });
      } else if (details?.testName || details?.name) {
        charges.push({
          id: order.id,
          admissionId,
          category: 'lab',
          description: details.testName || details.name || 'Lab Test',
          quantity: 1,
          unitPrice: Number(details.price) || 0,
          total: Number(details.price) || 0,
          date: order.orderedAt.toISOString(),
          orderId: order.id,
        });
      }
    });

    // 6. RADIOLOGY/IMAGING CHARGES
    const radiologyOrders = admission.encounter?.orders?.filter((o: any) =>
      o.orderType.toLowerCase().includes('radiology') ||
      o.orderType.toLowerCase().includes('imaging') ||
      o.orderType.toLowerCase().includes('xray') ||
      o.orderType.toLowerCase().includes('ct') ||
      o.orderType.toLowerCase().includes('mri')
    ) || [];

    radiologyOrders.forEach((order: any) => {
      const details = order.details as any;
      if (details?.tests && Array.isArray(details.tests)) {
        details.tests.forEach((test: any) => {
          charges.push({
            id: `${order.id}-${test.id || Math.random().toString(36).substr(2, 9)}`,
            admissionId,
            category: 'radiology',
            description: test.testName || test.name || 'Radiology Test',
            quantity: 1,
            unitPrice: Number(test.price) || 0,
            total: Number(test.price) || 0,
            date: order.orderedAt.toISOString(),
            orderId: order.id,
          });
        });
      } else if (details?.testName || details?.name) {
        charges.push({
          id: order.id,
          admissionId,
          category: 'radiology',
          description: details.testName || details.name || 'Radiology Test',
          quantity: 1,
          unitPrice: Number(details.price) || 0,
          total: Number(details.price) || 0,
          date: order.orderedAt.toISOString(),
          orderId: order.id,
        });
      }
    });

    // 7. PHARMACY/MEDICATION CHARGES
    const pharmacyOrders = admission.encounter?.orders?.filter((o: any) =>
      o.orderType.toLowerCase().includes('pharmacy') ||
      o.orderType.toLowerCase().includes('medication') ||
      o.orderType.toLowerCase().includes('drug')
    ) || [];

    pharmacyOrders.forEach((order: any) => {
      const details = order.details as any;
      if (details?.medications && Array.isArray(details.medications)) {
        details.medications.forEach((med: any) => {
          charges.push({
            id: `${order.id}-${med.id || Math.random().toString(36).substr(2, 9)}`,
            admissionId,
            category: 'pharmacy',
            description: med.medicationName || med.name || 'Medication',
            quantity: med.quantity || 1,
            unitPrice: Number(med.price) || 0,
            total: (med.quantity || 1) * (Number(med.price) || 0),
            date: order.orderedAt.toISOString(),
            orderId: order.id,
          });
        });
      } else if (details?.medicationName || details?.name) {
        charges.push({
          id: order.id,
          admissionId,
          category: 'pharmacy',
          description: details.medicationName || details.name || 'Medication',
          quantity: details.quantity || 1,
          unitPrice: Number(details.price) || 0,
          total: (details.quantity || 1) * (Number(details.price) || 0),
          date: order.orderedAt.toISOString(),
          orderId: order.id,
        });
      }
    });

    // 8. MISCELLANEOUS CHARGES (other orders not categorized above)
    const otherOrders = admission.encounter?.orders?.filter((o: any) => {
      const orderType = o.orderType.toLowerCase();
      return !orderType.includes('lab') &&
             !orderType.includes('radiology') &&
             !orderType.includes('imaging') &&
             !orderType.includes('pharmacy') &&
             !orderType.includes('medication') &&
             !orderType.includes('procedure') &&
             !orderType.includes('consultation') &&
             !orderType.includes('surgery');
    }) || [];

    otherOrders.forEach((order: any) => {
      const details = order.details as any;
      if (details?.items && Array.isArray(details.items)) {
        details.items.forEach((item: any) => {
          charges.push({
            id: `${order.id}-${item.id || Math.random().toString(36).substr(2, 9)}`,
            admissionId,
            category: 'other',
            description: item.name || item.description || order.orderType,
            quantity: item.quantity || 1,
            unitPrice: Number(item.price) || 0,
            total: (item.quantity || 1) * (Number(item.price) || 0),
            date: order.orderedAt.toISOString(),
            orderId: order.id,
          });
        });
      } else if (details?.name || details?.description) {
        charges.push({
          id: order.id,
          admissionId,
          category: 'other',
          description: details.name || details.description || order.orderType,
          quantity: details.quantity || 1,
          unitPrice: Number(details.price) || 0,
          total: (details.quantity || 1) * (Number(details.price) || 0),
          date: order.orderedAt.toISOString(),
          orderId: order.id,
        });
      }
    });

    // Calculate totals
    const subtotal = charges.reduce((sum, charge) => sum + charge.total, 0);

    res.json({
      charges,
      summary: {
        totalDays,
        bedChargePerDay,
        subtotal,
        totalCharges: charges.length,
        chargesByCategory: {
          bed: charges.filter(c => c.category === 'bed').reduce((sum, c) => sum + c.total, 0),
          consultation: charges.filter(c => c.category === 'consultation').reduce((sum, c) => sum + c.total, 0),
          procedure: charges.filter(c => c.category === 'procedure').reduce((sum, c) => sum + c.total, 0),
          lab: charges.filter(c => c.category === 'lab').reduce((sum, c) => sum + c.total, 0),
          radiology: charges.filter(c => c.category === 'radiology').reduce((sum, c) => sum + c.total, 0),
          pharmacy: charges.filter(c => c.category === 'pharmacy').reduce((sum, c) => sum + c.total, 0),
          other: charges.filter(c => c.category === 'other').reduce((sum, c) => sum + c.total, 0),
        }
      }
    });
  } catch (error) {
    logger.error('Get IPD charges error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/ipd-billing/:admissionId/summary - Get billing summary
export const getIPDBillingSummary = async (req: any, res: Response) => {
  try {
    const { admissionId } = req.params;

    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        patient: { select: { name: true, mrn: true } },
        bed: true,
        admittingDoctor: { select: { name: true } },
        encounter: {
          include: {
            invoices: {
              where: { type: 'ipd' },
              include: { payments: true },
            },
            orders: { where: { status: { not: 'cancelled' } } },
          },
        },
      },
    });

    if (!admission) {
      return res.status(404).json({ error: 'Admission not found' });
    }

    // Calculate days of stay
    const admitDate = new Date(admission.admissionDate);
    const dischargeDate = admission.dischargeDate ? new Date(admission.dischargeDate) : new Date();
    const totalDays = Math.ceil((dischargeDate.getTime() - admitDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;

    const existingInvoice = admission.encounter?.invoices?.find(inv => inv.type === 'ipd');

    // Quick summary without detailed charge calculation
    const summary = {
      admissionId,
      patientName: admission.patient.name,
      patientMRN: admission.patient.mrn,
      doctorName: admission.admittingDoctor?.name || 'Not Assigned',
      wardName: admission.bed?.category || 'General',
      bedNumber: admission.bed?.bedNumber || 'N/A',
      admissionDate: admission.admissionDate.toISOString(),
      dischargeDate: admission.dischargeDate?.toISOString() || null,
      totalDays,
      status: admission.status,
      hasInvoice: !!existingInvoice,
      invoice: existingInvoice ? {
        id: existingInvoice.id,
        subtotal: Number(existingInvoice.subtotal),
        discount: Number(existingInvoice.discount),
        tax: Number(existingInvoice.tax),
        total: Number(existingInvoice.total),
        paid: Number(existingInvoice.paid),
        balance: Number(existingInvoice.balance),
        status: existingInvoice.status,
        totalPayments: existingInvoice.payments.length,
      } : null,
      orderCounts: {
        total: admission.encounter?.orders?.length || 0,
        lab: admission.encounter?.orders?.filter(o => o.orderType.toLowerCase().includes('lab')).length || 0,
        radiology: admission.encounter?.orders?.filter(o => o.orderType.toLowerCase().includes('radiology') || o.orderType.toLowerCase().includes('imaging')).length || 0,
        pharmacy: admission.encounter?.orders?.filter(o => o.orderType.toLowerCase().includes('pharmacy') || o.orderType.toLowerCase().includes('medication')).length || 0,
        procedure: admission.encounter?.orders?.filter(o => o.orderType.toLowerCase().includes('procedure')).length || 0,
      }
    };

    res.json(summary);
  } catch (error) {
    logger.error('Get IPD billing summary error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/ipd-billing/:admissionId/generate - Generate IPD bill
export const generateIPDBill = async (req: any, res: Response) => {
  try {
    const { admissionId } = req.params;
    const { includeDischarge } = req.body;

    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        encounter: {
          include: {
            invoices: { where: { type: 'ipd' } }
          }
        }
      }
    });

    if (!admission) {
      return res.status(404).json({ error: 'Admission not found' });
    }

    // Check if bill already exists
    const existingInvoice = admission.encounter?.invoices?.[0];

    if (existingInvoice) {
      return res.json({
        message: 'Bill already exists',
        invoiceId: existingInvoice.id,
        status: existingInvoice.status,
      });
    }

    // Generate new bill with default values
    // The actual bill will be created when user saves from frontend
    res.json({
      message: 'Ready to generate bill',
      admissionId,
      canGenerate: true,
    });

  } catch (error) {
    logger.error('Generate IPD bill error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Internal server error' });
  }
};
