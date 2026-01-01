/**
 * IPD Charge Capture Service
 * Automatically captures daily charges for IPD admissions
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface ChargeCategory {
  category: 'bed' | 'nursing' | 'procedure' | 'lab' | 'radiology' | 'pharmacy' | 'consumable' | 'consultation' | 'other';
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  chargeDate: Date;
  orderId?: string;
}

export class IPDChargeCaptureService {
  /**
   * Capture all charges for a specific admission
   */
  async captureChargesForAdmission(
    admissionId: string,
    tenantId: string,
    userId?: string
  ): Promise<{ success: boolean; charges: any[]; errors: string[] }> {
    const errors: string[] = [];
    const capturedCharges: any[] = [];

    try {
      // Get admission details
      const admission = await prisma.admission.findUnique({
        where: { id: admissionId },
        include: {
          patient: true,
          bed: true,
          encounter: {
            include: {
              orders: {
                where: { status: { not: 'cancelled' } },
              },
            },
          },
          ipdCharges: true,
        },
      });

      if (!admission) {
        errors.push('Admission not found');
        return { success: false, charges: [], errors };
      }

      if (admission.status !== 'active') {
        errors.push('Admission is not active');
        return { success: false, charges: [], errors };
      }

      // Calculate days since admission
      const admitDate = new Date(admission.admissionDate);
      const today = new Date();
      const totalDays = Math.ceil((today.getTime() - admitDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;

      // Get already captured bed charge dates
      const existingBedCharges = admission.ipdCharges.filter(
        (charge) => charge.category === 'bed'
      );
      const capturedDates = new Set(
        existingBedCharges.map((charge) =>
          new Date(charge.chargeDate).toISOString().split('T')[0]
        )
      );

      // 1. CAPTURE BED CHARGES (daily)
      try {
        const bedCharges = await this.captureBedCharges(
          admission,
          tenantId,
          capturedDates,
          userId
        );
        capturedCharges.push(...bedCharges);
      } catch (error: any) {
        errors.push(`Bed charges error: ${error.message}`);
        logger.error('Error capturing bed charges:', error);
      }

      // 2. CAPTURE NURSING CHARGES (daily)
      try {
        const nursingCharges = await this.captureNursingCharges(
          admission,
          tenantId,
          capturedDates,
          userId
        );
        capturedCharges.push(...nursingCharges);
      } catch (error: any) {
        errors.push(`Nursing charges error: ${error.message}`);
        logger.error('Error capturing nursing charges:', error);
      }

      // 3. CAPTURE ORDER-BASED CHARGES (procedures, lab, radiology, pharmacy)
      try {
        const orderCharges = await this.captureOrderCharges(
          admission,
          tenantId,
          userId
        );
        capturedCharges.push(...orderCharges);
      } catch (error: any) {
        errors.push(`Order charges error: ${error.message}`);
        logger.error('Error capturing order charges:', error);
      }

      return {
        success: errors.length === 0,
        charges: capturedCharges,
        errors,
      };
    } catch (error: any) {
      logger.error('Error in captureChargesForAdmission:', error);
      errors.push(`General error: ${error.message}`);
      return { success: false, charges: [], errors };
    }
  }

  /**
   * Capture bed charges for uncaptured days
   */
  private async captureBedCharges(
    admission: any,
    tenantId: string,
    capturedDates: Set<string>,
    userId?: string
  ): Promise<any[]> {
    const charges: any[] = [];
    const admitDate = new Date(admission.admissionDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get bed tariff from Ward or use default based on category
    let bedChargePerDay = 1500; // Default

    if (admission.bed?.wardId) {
      const ward = await prisma.ward.findUnique({
        where: { id: admission.bed.wardId },
      });
      if (ward) {
        bedChargePerDay = Number(ward.tariffPerDay);
      }
    } else if (admission.bed?.category) {
      // Default rates by category
      const categoryRates: Record<string, number> = {
        general: 1500,
        'semi-private': 2500,
        private: 4000,
        deluxe: 6000,
        icu: 8000,
        nicu: 10000,
      };
      bedChargePerDay =
        categoryRates[admission.bed.category.toLowerCase()] || 1500;
    }

    // Capture charges for each day not yet captured
    const currentDate = new Date(admitDate);
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];

      if (!capturedDates.has(dateStr)) {
        const charge = await prisma.iPDCharge.create({
          data: {
            tenantId,
            admissionId: admission.id,
            category: 'bed',
            description: `${admission.bed?.category || 'General'} Ward - Bed ${
              admission.bed?.bedNumber || 'N/A'
            }`,
            quantity: 1,
            unitPrice: bedChargePerDay,
            amount: bedChargePerDay,
            chargeDate: new Date(currentDate),
            capturedBy: userId,
            isAutomatic: true,
          },
        });
        charges.push(charge);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return charges;
  }

  /**
   * Capture nursing charges for uncaptured days
   */
  private async captureNursingCharges(
    admission: any,
    tenantId: string,
    capturedDates: Set<string>,
    userId?: string
  ): Promise<any[]> {
    const charges: any[] = [];
    const admitDate = new Date(admission.admissionDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nursingChargePerDay = 300; // Default nursing charge

    // Get already captured nursing charge dates
    const existingNursingCharges = admission.ipdCharges.filter(
      (charge: any) => charge.category === 'nursing'
    );
    const nursingCapturedDates = new Set(
      existingNursingCharges.map((charge: any) =>
        new Date(charge.chargeDate).toISOString().split('T')[0]
      )
    );

    // Capture charges for each day not yet captured
    const currentDate = new Date(admitDate);
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];

      if (!nursingCapturedDates.has(dateStr)) {
        const charge = await prisma.iPDCharge.create({
          data: {
            tenantId,
            admissionId: admission.id,
            category: 'nursing',
            description: 'Nursing Care',
            quantity: 1,
            unitPrice: nursingChargePerDay,
            amount: nursingChargePerDay,
            chargeDate: new Date(currentDate),
            capturedBy: userId,
            isAutomatic: true,
          },
        });
        charges.push(charge);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return charges;
  }

  /**
   * Capture charges from orders (lab, radiology, pharmacy, procedures)
   */
  private async captureOrderCharges(
    admission: any,
    tenantId: string,
    userId?: string
  ): Promise<any[]> {
    const charges: any[] = [];
    const orders = admission.encounter?.orders || [];

    // Get already captured order IDs
    const capturedOrderIds = new Set(
      admission.ipdCharges
        .filter((charge: any) => charge.orderId)
        .map((charge: any) => charge.orderId)
    );

    for (const order of orders) {
      // Skip if already captured
      if (capturedOrderIds.has(order.id)) {
        continue;
      }

      const orderType = order.orderType.toLowerCase();
      const details = order.details as any;

      try {
        // Determine category
        let category: string;
        if (orderType.includes('lab') || orderType.includes('test')) {
          category = 'lab';
        } else if (
          orderType.includes('radiology') ||
          orderType.includes('imaging') ||
          orderType.includes('xray') ||
          orderType.includes('ct') ||
          orderType.includes('mri')
        ) {
          category = 'radiology';
        } else if (
          orderType.includes('pharmacy') ||
          orderType.includes('medication') ||
          orderType.includes('drug')
        ) {
          category = 'pharmacy';
        } else if (
          orderType.includes('procedure') ||
          orderType.includes('surgery')
        ) {
          category = 'procedure';
        } else if (
          orderType.includes('consultation') ||
          orderType.includes('visit')
        ) {
          category = 'consultation';
        } else {
          category = 'other';
        }

        // Extract items from order details
        const items = this.extractItemsFromOrderDetails(details, orderType);

        for (const item of items) {
          const charge = await prisma.iPDCharge.create({
            data: {
              tenantId,
              admissionId: admission.id,
              category,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount,
              chargeDate: new Date(order.orderedAt),
              orderId: order.id,
              capturedBy: userId,
              isAutomatic: true,
            },
          });
          charges.push(charge);
        }
      } catch (error: any) {
        logger.error(`Error capturing order ${order.id}:`, error);
      }
    }

    return charges;
  }

  /**
   * Extract items from order details
   */
  private extractItemsFromOrderDetails(
    details: any,
    orderType: string
  ): Array<{ description: string; quantity: number; unitPrice: number; amount: number }> {
    const items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }> = [];

    if (!details) return items;

    // Handle array of items/tests/medications
    if (details.tests && Array.isArray(details.tests)) {
      details.tests.forEach((test: any) => {
        items.push({
          description: test.testName || test.name || 'Test',
          quantity: 1,
          unitPrice: Number(test.price) || 0,
          amount: Number(test.price) || 0,
        });
      });
    } else if (details.items && Array.isArray(details.items)) {
      details.items.forEach((item: any) => {
        items.push({
          description: item.name || item.procedureName || item.description || 'Item',
          quantity: item.quantity || 1,
          unitPrice: Number(item.price) || 0,
          amount: (item.quantity || 1) * (Number(item.price) || 0),
        });
      });
    } else if (details.medications && Array.isArray(details.medications)) {
      details.medications.forEach((med: any) => {
        items.push({
          description: med.medicationName || med.name || 'Medication',
          quantity: med.quantity || 1,
          unitPrice: Number(med.price) || 0,
          amount: (med.quantity || 1) * (Number(med.price) || 0),
        });
      });
    } else {
      // Single item
      if (details.testName || details.name || details.description) {
        items.push({
          description:
            details.testName ||
            details.name ||
            details.procedureName ||
            details.description ||
            orderType,
          quantity: details.quantity || 1,
          unitPrice: Number(details.price) || 0,
          amount: (details.quantity || 1) * (Number(details.price) || 0),
        });
      }
    }

    return items;
  }

  /**
   * Capture charges for all active admissions
   */
  async captureChargesForAllActiveAdmissions(
    tenantId: string,
    userId?: string
  ): Promise<{ totalAdmissions: number; totalCharges: number; errors: string[] }> {
    const errors: string[] = [];
    let totalCharges = 0;

    try {
      // Get all active admissions
      const activeAdmissions = await prisma.admission.findMany({
        where: {
          status: 'active',
          patient: {
            tenantId,
          },
        },
        select: {
          id: true,
        },
      });

      for (const admission of activeAdmissions) {
        try {
          const result = await this.captureChargesForAdmission(
            admission.id,
            tenantId,
            userId
          );
          totalCharges += result.charges.length;
          errors.push(...result.errors);
        } catch (error: any) {
          errors.push(
            `Error capturing charges for admission ${admission.id}: ${error.message}`
          );
          logger.error(`Error capturing charges for admission ${admission.id}:`, error);
        }
      }

      return {
        totalAdmissions: activeAdmissions.length,
        totalCharges,
        errors,
      };
    } catch (error: any) {
      logger.error('Error in captureChargesForAllActiveAdmissions:', error);
      errors.push(`General error: ${error.message}`);
      return { totalAdmissions: 0, totalCharges: 0, errors };
    }
  }

  /**
   * Get all charges for an admission, grouped by category
   */
  async getChargesByAdmission(admissionId: string): Promise<{
    charges: any[];
    summary: {
      totalCharges: number;
      subtotal: number;
      chargesByCategory: Record<string, number>;
    };
  }> {
    const charges = await prisma.iPDCharge.findMany({
      where: { admissionId },
      orderBy: { chargeDate: 'asc' },
    });

    const subtotal = charges.reduce(
      (sum, charge) => sum + Number(charge.amount),
      0
    );

    const chargesByCategory: Record<string, number> = {
      bed: 0,
      nursing: 0,
      procedure: 0,
      lab: 0,
      radiology: 0,
      pharmacy: 0,
      consultation: 0,
      consumable: 0,
      other: 0,
    };

    charges.forEach((charge) => {
      chargesByCategory[charge.category] =
        (chargesByCategory[charge.category] || 0) + Number(charge.amount);
    });

    return {
      charges: charges.map((charge) => ({
        ...charge,
        unitPrice: Number(charge.unitPrice),
        amount: Number(charge.amount),
      })),
      summary: {
        totalCharges: charges.length,
        subtotal,
        chargesByCategory,
      },
    };
  }

  /**
   * Add a manual charge
   */
  async addManualCharge(
    tenantId: string,
    admissionId: string,
    category: string,
    description: string,
    quantity: number,
    unitPrice: number,
    chargeDate: Date,
    userId?: string
  ): Promise<any> {
    const amount = quantity * unitPrice;

    const charge = await prisma.iPDCharge.create({
      data: {
        tenantId,
        admissionId,
        category,
        description,
        quantity,
        unitPrice,
        amount,
        chargeDate,
        capturedBy: userId,
        isAutomatic: false,
      },
    });

    return {
      ...charge,
      unitPrice: Number(charge.unitPrice),
      amount: Number(charge.amount),
    };
  }

  /**
   * Get billing summary for an admission
   */
  async getBillingSummary(admissionId: string): Promise<{
    admission: any;
    charges: any;
    invoice: any;
    summary: any;
  }> {
    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        patient: {
          select: {
            name: true,
            mrn: true,
            insurances: {
              where: { isActive: true },
              include: { tpa: true },
            },
          },
        },
        bed: true,
        admittingDoctor: { select: { name: true } },
        encounter: {
          include: {
            invoices: {
              where: { type: 'ipd' },
              include: { payments: true },
            },
          },
        },
      },
    });

    if (!admission) {
      throw new Error('Admission not found');
    }

    const chargesData = await this.getChargesByAdmission(admissionId);
    const invoice = admission.encounter?.invoices?.[0];

    // Calculate days of stay
    const admitDate = new Date(admission.admissionDate);
    const dischargeDate = admission.dischargeDate
      ? new Date(admission.dischargeDate)
      : new Date();
    const totalDays =
      Math.ceil(
        (dischargeDate.getTime() - admitDate.getTime()) / (1000 * 60 * 60 * 24)
      ) || 1;

    // Get insurance info
    const insurance = admission.patient.insurances?.[0];

    return {
      admission: {
        id: admission.id,
        patientName: admission.patient.name,
        patientMRN: admission.patient.mrn,
        admissionDate: admission.admissionDate,
        dischargeDate: admission.dischargeDate,
        totalDays,
        status: admission.status,
        diagnosis: admission.diagnosis,
        wardName: admission.bed?.category || 'General',
        bedNumber: admission.bed?.bedNumber || 'N/A',
        doctorName: admission.admittingDoctor?.name || 'Not Assigned',
      },
      charges: chargesData,
      invoice: invoice
        ? {
            id: invoice.id,
            subtotal: Number(invoice.subtotal),
            discount: Number(invoice.discount),
            tax: Number(invoice.tax),
            total: Number(invoice.total),
            paid: Number(invoice.paid),
            balance: Number(invoice.balance),
            status: invoice.status,
            payments: invoice.payments.map((p) => ({
              ...p,
              amount: Number(p.amount),
            })),
          }
        : null,
      summary: {
        totalCharges: chargesData.charges.length,
        subtotal: chargesData.summary.subtotal,
        chargesByCategory: chargesData.summary.chargesByCategory,
        insurance: insurance
          ? {
              tpaName: insurance.tpa.name,
              policyNumber: insurance.policyNumber,
              sumInsured: Number(insurance.sumInsured),
            }
          : null,
        balance: invoice ? Number(invoice.balance) : chargesData.summary.subtotal,
      },
    };
  }
}

// Export singleton instance
export const ipdChargeCaptureService = new IPDChargeCaptureService();
