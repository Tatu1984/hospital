import { Router, Response } from 'express';
import { prisma } from '../lib/db';
import { Prisma } from '@prisma/client';
import { authenticateToken, requirePermission, AuthenticatedRequest, asyncHandler } from '../middleware';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication to all pharmacy routes
router.use(authenticateToken);

// ===========================
// PHARMACY STOCK MANAGEMENT
// ===========================

// Get all pharmacy stock items
router.get('/stock', async (req: any, res: Response) => {
  try {
    const stocks = await prisma.pharmacyStock.findMany({
      include: {
        drug: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(stocks.map(s => ({
      id: s.id,
      drugId: s.drugId,
      drugName: s.drug.name,
      batchNumber: s.batchNumber,
      expiryDate: s.expiryDate.toISOString(),
      quantity: s.quantity,
      purchasePrice: Number(s.purchasePrice),
      mrp: Number(s.mrp),
      supplierId: s.supplierId,
      supplierName: s.supplierName,
      createdAt: s.createdAt.toISOString(),
    })));
  } catch (error) {
    logger.error('Get pharmacy stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new stock (from purchase)
router.post('/stock', async (req: any, res: Response) => {
  try {
    const { drugId, batchNumber, expiryDate, quantity, purchasePrice, mrp, supplierId, supplierName } = req.body;

    // Validate required fields
    if (!drugId || !batchNumber || !expiryDate || !quantity || !mrp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Use transaction to ensure atomicity
    const stock = await prisma.$transaction(async (tx) => {
      // Create stock entry
      const newStock = await tx.pharmacyStock.create({
        data: {
          drugId,
          batchNumber,
          expiryDate: new Date(expiryDate),
          quantity: parseInt(quantity),
          purchasePrice: purchasePrice || 0,
          mrp,
          supplierId,
          supplierName,
        },
        include: {
          drug: true,
        },
      });

      // Update drug's total stock quantity
      await tx.drug.update({
        where: { id: drugId },
        data: {
          stockQuantity: {
            increment: parseInt(quantity),
          },
        },
      });

      return newStock;
    });

    res.status(201).json({
      message: 'Stock added successfully',
      stock: {
        id: stock.id,
        drugId: stock.drugId,
        drugName: stock.drug.name,
        batchNumber: stock.batchNumber,
        expiryDate: stock.expiryDate.toISOString(),
        quantity: stock.quantity,
        purchasePrice: Number(stock.purchasePrice),
        mrp: Number(stock.mrp),
      },
    });
  } catch (error) {
    logger.error('Add pharmacy stock error:', error);
    res.status(500).json({ error: 'Failed to add stock' });
  }
});

// Update stock quantity
router.put('/stock/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    // Get current stock to calculate difference
    const currentStock = await prisma.pharmacyStock.findUnique({
      where: { id },
    });

    if (!currentStock) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    const difference = parseInt(quantity) - currentStock.quantity;

    // Use transaction to ensure atomicity
    const updatedStock = await prisma.$transaction(async (tx) => {
      // Update stock quantity
      const stock = await tx.pharmacyStock.update({
        where: { id },
        data: { quantity: parseInt(quantity) },
        include: { drug: true },
      });

      // Update drug's total stock quantity
      await tx.drug.update({
        where: { id: currentStock.drugId },
        data: {
          stockQuantity: {
            increment: difference,
          },
        },
      });

      return stock;
    });

    res.json({
      message: 'Stock updated successfully',
      stock: {
        id: updatedStock.id,
        drugId: updatedStock.drugId,
        drugName: updatedStock.drug.name,
        batchNumber: updatedStock.batchNumber,
        quantity: updatedStock.quantity,
      },
    });
  } catch (error) {
    logger.error('Update pharmacy stock error:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// Manual stock adjustment
router.post('/stock/adjust', async (req: any, res: Response) => {
  try {
    const { stockId, adjustmentQuantity, reason } = req.body;

    if (!stockId || adjustmentQuantity === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const stock = await prisma.pharmacyStock.findUnique({
      where: { id: stockId },
    });

    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    const newQuantity = stock.quantity + parseInt(adjustmentQuantity);

    if (newQuantity < 0) {
      return res.status(400).json({ error: 'Adjustment would result in negative stock' });
    }

    // Use transaction to ensure atomicity
    const updatedStock = await prisma.$transaction(async (tx) => {
      // Update stock quantity
      const adjusted = await tx.pharmacyStock.update({
        where: { id: stockId },
        data: { quantity: newQuantity },
        include: { drug: true },
      });

      // Update drug's total stock quantity
      await tx.drug.update({
        where: { id: stock.drugId },
        data: {
          stockQuantity: {
            increment: parseInt(adjustmentQuantity),
          },
        },
      });

      return adjusted;
    });

    res.json({
      message: 'Stock adjusted successfully',
      stock: {
        id: updatedStock.id,
        drugName: updatedStock.drug.name,
        previousQuantity: stock.quantity,
        newQuantity: updatedStock.quantity,
        adjustment: adjustmentQuantity,
        reason: reason || 'Manual adjustment',
      },
    });
  } catch (error) {
    logger.error('Stock adjustment error:', error);
    res.status(500).json({ error: 'Failed to adjust stock' });
  }
});

// ===========================
// PHARMACY SALES / POS
// ===========================

// Get all pharmacy sales
router.get('/sales', async (req: any, res: Response) => {
  try {
    const sales = await prisma.pharmacySale.findMany({
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(sales.map(sale => ({
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      patientName: sale.patientName,
      patientMRN: sale.patientMRN,
      patientId: sale.patientId,
      items: sale.items.map(item => ({
        drugId: item.drugId,
        drugName: item.drugName,
        batchNumber: item.batchNumber,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
      })),
      total: Number(sale.total),
      paymentMode: sale.paymentMode,
      timestamp: sale.createdAt.toISOString(),
    })));
  } catch (error) {
    logger.error('Get pharmacy sales error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new sale (dispense prescription or walk-in)
router.post('/sales', async (req: any, res: Response) => {
  try {
    const { patientName, patientMRN, patientId, items, paymentMode, total } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items in sale' });
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Use transaction to ensure atomicity of sale and stock deduction
    const sale = await prisma.$transaction(async (tx) => {
      // Create sale with items
      const newSale = await tx.pharmacySale.create({
        data: {
          invoiceNumber,
          patientName: patientName || null,
          patientMRN: patientMRN || null,
          patientId: patientId || null,
          total: total || 0,
          paymentMode: paymentMode || 'cash',
          createdBy: req.user?.id,
          items: {
            create: items.map((item: any) => ({
              drugId: item.drugId,
              drugName: item.drugName,
              batchNumber: item.batchNumber || null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Deduct stock for each item within the same transaction
      for (const item of items) {
        // Update drug's total stock
        await tx.drug.update({
          where: { id: item.drugId },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });

        // Deduct from stock batches using FIFO (First Expiry First Out)
        let remainingQty = item.quantity;
        const batches = await tx.pharmacyStock.findMany({
          where: {
            drugId: item.drugId,
            quantity: { gt: 0 },
          },
          orderBy: { expiryDate: 'asc' },
        });

        for (const batch of batches) {
          if (remainingQty <= 0) break;
          const deductQty = Math.min(batch.quantity, remainingQty);
          await tx.pharmacyStock.update({
            where: { id: batch.id },
            data: {
              quantity: { decrement: deductQty },
            },
          });
          remainingQty -= deductQty;
        }
      }

      return newSale;
    });

    res.status(201).json({
      message: 'Sale completed successfully',
      sale: {
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        total: Number(sale.total),
        items: sale.items.length,
      },
    });
  } catch (error) {
    logger.error('Create pharmacy sale error:', error);
    res.status(500).json({ error: 'Failed to complete sale' });
  }
});

// ===========================
// LOW STOCK ALERTS
// ===========================

// Get drugs below reorder level
router.get('/low-stock', async (req: any, res: Response) => {
  try {
    const lowStockDrugs = await prisma.drug.findMany({
      where: {
        isActive: true,
        OR: [
          {
            stockQuantity: {
              lte: prisma.drug.fields.reorderLevel,
            },
          },
        ],
      },
      orderBy: { stockQuantity: 'asc' },
    });

    res.json(lowStockDrugs.map(drug => ({
      id: drug.id,
      code: drug.code,
      name: drug.name,
      genericName: drug.genericName,
      category: drug.category,
      stockQuantity: drug.stockQuantity,
      reorderLevel: drug.reorderLevel,
      unitPrice: Number(drug.price),
      status: drug.stockQuantity === 0 ? 'out_of_stock' : 'low_stock',
    })));
  } catch (error) {
    logger.error('Get low stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// PRESCRIPTION-TO-PHARMACY INTEGRATION
// ===========================

// Get pending prescriptions for dispensing
router.get('/prescriptions', async (req: any, res: Response) => {
  try {
    const { status } = req.query;

    // Build where clause
    const where: any = {};
    if (status && ['pending', 'partial', 'dispensed'].includes(status)) {
      where.status = status;
    } else {
      // Default: show pending and partial
      where.status = { in: ['pending', 'partial'] };
    }

    const prescriptions = await prisma.prescription.findMany({
      where,
      include: {
        doctor: {
          select: { id: true, name: true },
        },
        opdNote: {
          select: {
            id: true,
            patient: {
              select: {
                id: true,
                mrn: true,
                name: true,
                contact: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // For prescriptions without opdNote, we need to fetch patient separately
    const enrichedPrescriptions = await Promise.all(
      prescriptions.map(async (prescription) => {
        let patient = prescription.opdNote?.patient;

        // If no opdNote, fetch patient directly
        if (!patient && prescription.patientId) {
          const patientData = await prisma.patient.findUnique({
            where: { id: prescription.patientId },
            select: {
              id: true,
              mrn: true,
              name: true,
              contact: true,
            },
          });
          patient = patientData ?? undefined;
        }

        return {
          id: prescription.id,
          patientId: patient?.id || prescription.patientId,
          patientName: patient?.name || 'Unknown',
          patientMRN: patient?.mrn || null,
          patientContact: patient?.contact || null,
          doctorId: prescription.doctor.id,
          doctorName: prescription.doctor.name,
          drugs: prescription.drugs as any[],
          status: prescription.status,
          createdAt: prescription.createdAt.toISOString(),
          updatedAt: prescription.updatedAt.toISOString(),
        };
      })
    );

    res.json(enrichedPrescriptions);
  } catch (error) {
    logger.error('Get prescriptions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single prescription details for dispensing
router.get('/prescription/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        doctor: {
          select: { id: true, name: true },
        },
        opdNote: {
          select: {
            id: true,
            patient: {
              select: {
                id: true,
                mrn: true,
                name: true,
                contact: true,
                allergies: true,
              },
            },
          },
        },
      },
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    // Get patient info
    let patient = prescription.opdNote?.patient;
    if (!patient && prescription.patientId) {
      const patientData = await prisma.patient.findUnique({
        where: { id: prescription.patientId },
        select: {
          id: true,
          mrn: true,
          name: true,
          contact: true,
          allergies: true,
        },
      });
      patient = patientData ?? undefined;
    }

    // Enrich drugs with current stock information
    const drugs = prescription.drugs as any[];
    const enrichedDrugs = await Promise.all(
      drugs.map(async (drug: any) => {
        if (!drug.drugId) return drug;

        // Get drug details and stock
        const drugData = await prisma.drug.findUnique({
          where: { id: drug.drugId },
          select: {
            id: true,
            name: true,
            genericName: true,
            form: true,
            strength: true,
            price: true,
            stockQuantity: true,
          },
        });

        // Get available stock batches (FIFO - oldest expiry first, non-expired only)
        const availableBatches = await prisma.pharmacyStock.findMany({
          where: {
            drugId: drug.drugId,
            quantity: { gt: 0 },
            expiryDate: { gt: new Date() },
          },
          orderBy: { expiryDate: 'asc' },
          take: 5,
        });

        return {
          ...drug,
          drugName: drugData?.name || drug.drugName,
          genericName: drugData?.genericName,
          form: drugData?.form,
          strength: drugData?.strength,
          unitPrice: drugData ? Number(drugData.price) : 0,
          stockQuantity: drugData?.stockQuantity || 0,
          availableBatches: availableBatches.map(batch => ({
            id: batch.id,
            batchNumber: batch.batchNumber,
            quantity: batch.quantity,
            expiryDate: batch.expiryDate.toISOString(),
            mrp: Number(batch.mrp),
          })),
        };
      })
    );

    // Get previous pharmacy sales for this prescription
    const previousSales = await prisma.pharmacySale.findMany({
      where: { prescriptionId: id },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      id: prescription.id,
      patientId: patient?.id || prescription.patientId,
      patientName: patient?.name || 'Unknown',
      patientMRN: patient?.mrn || null,
      patientContact: patient?.contact || null,
      patientAllergies: patient?.allergies || null,
      doctorId: prescription.doctor.id,
      doctorName: prescription.doctor.name,
      drugs: enrichedDrugs,
      status: prescription.status,
      createdAt: prescription.createdAt.toISOString(),
      updatedAt: prescription.updatedAt.toISOString(),
      previousDispenses: previousSales.map(sale => ({
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        total: Number(sale.total),
        paymentMode: sale.paymentMode,
        items: sale.items.map(item => ({
          drugId: item.drugId,
          drugName: item.drugName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
        })),
        createdAt: sale.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error('Get prescription details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dispense prescription items
router.post('/dispense', async (req: any, res: Response) => {
  try {
    const { prescriptionId, items, paymentMode } = req.body;

    // Validate required fields
    if (!prescriptionId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: prescriptionId and items' });
    }

    // Get prescription details
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        opdNote: {
          select: {
            patient: {
              select: { id: true, mrn: true, name: true },
            },
          },
        },
      },
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    if (prescription.status === 'dispensed') {
      return res.status(400).json({ error: 'Prescription already fully dispensed' });
    }

    // Get patient info
    let patient = prescription.opdNote?.patient;
    if (!patient && prescription.patientId) {
      const patientData = await prisma.patient.findUnique({
        where: { id: prescription.patientId },
        select: { id: true, mrn: true, name: true },
      });
      patient = patientData ?? undefined;
    }

    // Validate stock availability and expiry for each item
    const validationErrors: string[] = [];

    for (const item of items) {
      const { drugId, quantity, batchNumber } = item;

      if (!drugId || !quantity || quantity <= 0) {
        validationErrors.push(`Invalid item: drugId and positive quantity required`);
        continue;
      }

      // Get drug info
      const drug = await prisma.drug.findUnique({
        where: { id: drugId },
      });

      if (!drug) {
        validationErrors.push(`Drug ${drugId} not found`);
        continue;
      }

      if (!drug.isActive) {
        validationErrors.push(`Drug ${drug.name} is inactive`);
        continue;
      }

      // Check total stock
      if (drug.stockQuantity < quantity) {
        validationErrors.push(`Insufficient stock for ${drug.name}. Available: ${drug.stockQuantity}, Requested: ${quantity}`);
        continue;
      }

      // If batch number specified, validate that batch
      if (batchNumber) {
        const batch = await prisma.pharmacyStock.findFirst({
          where: {
            drugId,
            batchNumber,
          },
        });

        if (!batch) {
          validationErrors.push(`Batch ${batchNumber} not found for ${drug.name}`);
          continue;
        }

        if (batch.quantity < quantity) {
          validationErrors.push(`Insufficient quantity in batch ${batchNumber} for ${drug.name}. Available: ${batch.quantity}, Requested: ${quantity}`);
          continue;
        }

        // Check expiry
        if (batch.expiryDate <= new Date()) {
          validationErrors.push(`Batch ${batchNumber} for ${drug.name} has expired`);
          continue;
        }
      } else {
        // If no batch specified, check if there are non-expired batches with enough stock
        const availableBatches = await prisma.pharmacyStock.findMany({
          where: {
            drugId,
            quantity: { gt: 0 },
            expiryDate: { gt: new Date() },
          },
          orderBy: { expiryDate: 'asc' },
        });

        const totalAvailable = availableBatches.reduce((sum, b) => sum + b.quantity, 0);
        if (totalAvailable < quantity) {
          validationErrors.push(`Insufficient non-expired stock for ${drug.name}. Available: ${totalAvailable}, Requested: ${quantity}`);
        }
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    // Process dispensing in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Prepare sale items with prices
      const saleItems: any[] = [];
      let total = 0;

      for (const item of items) {
        const { drugId, quantity, batchNumber } = item;

        const drug = await tx.drug.findUnique({
          where: { id: drugId },
        });

        if (!drug) throw new Error(`Drug ${drugId} not found`);

        const unitPrice = Number(drug.price);
        const itemTotal = unitPrice * quantity;
        total += itemTotal;

        saleItems.push({
          drugId,
          drugName: drug.name,
          batchNumber: batchNumber || null,
          quantity,
          unitPrice,
          total: itemTotal,
        });

        // Deduct stock using FIFO (First Expiry First Out)
        let remainingQuantity = quantity;

        if (batchNumber) {
          // Deduct from specific batch
          const batch = await tx.pharmacyStock.findFirst({
            where: { drugId, batchNumber },
          });

          if (!batch) throw new Error(`Batch ${batchNumber} not found`);

          await tx.pharmacyStock.update({
            where: { id: batch.id },
            data: { quantity: { decrement: quantity } },
          });

          remainingQuantity = 0;
        } else {
          // Deduct using FIFO from available batches
          const batches = await tx.pharmacyStock.findMany({
            where: {
              drugId,
              quantity: { gt: 0 },
              expiryDate: { gt: new Date() },
            },
            orderBy: { expiryDate: 'asc' },
          });

          for (const batch of batches) {
            if (remainingQuantity <= 0) break;

            const deductQty = Math.min(batch.quantity, remainingQuantity);

            await tx.pharmacyStock.update({
              where: { id: batch.id },
              data: { quantity: { decrement: deductQty } },
            });

            remainingQuantity -= deductQty;
          }
        }

        // Update drug total stock
        await tx.drug.update({
          where: { id: drugId },
          data: { stockQuantity: { decrement: quantity } },
        });
      }

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create pharmacy sale
      const sale = await tx.pharmacySale.create({
        data: {
          invoiceNumber,
          patientName: patient?.name || null,
          patientMRN: patient?.mrn || null,
          patientId: patient?.id || prescription.patientId,
          prescriptionId,
          total,
          paymentMode: paymentMode || 'cash',
          createdBy: req.user?.id,
          items: {
            create: saleItems,
          },
        },
        include: {
          items: true,
        },
      });

      // Update prescription status
      const prescriptionDrugs = prescription.drugs as any[];
      const allDispensed = prescriptionDrugs.every((prescDrug: any) => {
        // Check if this drug has been fully dispensed
        const dispensedQty = items
          .filter((item: any) => item.drugId === prescDrug.drugId)
          .reduce((sum: number, item: any) => sum + item.quantity, 0);

        return dispensedQty >= (prescDrug.quantity || 0);
      });

      const newStatus = allDispensed ? 'dispensed' : 'partial';

      await tx.prescription.update({
        where: { id: prescriptionId },
        data: { status: newStatus },
      });

      return { sale, newStatus };
    });

    res.status(201).json({
      message: 'Prescription dispensed successfully',
      sale: {
        id: result.sale.id,
        invoiceNumber: result.sale.invoiceNumber,
        total: Number(result.sale.total),
        items: result.sale.items.map(item => ({
          drugId: item.drugId,
          drugName: item.drugName,
          batchNumber: item.batchNumber,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
        })),
      },
      prescriptionStatus: result.newStatus,
    });
  } catch (error) {
    logger.error('Dispense prescription error:', error);
    res.status(500).json({
      error: 'Failed to dispense prescription',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================
// BARCODE-BASED OPERATIONS
// ===========================

// Dispense drug by scanning barcode
router.post('/dispense-by-barcode', async (req: any, res: Response) => {
  try {
    const { barcode, quantity, patientId, prescriptionId, paymentMode, location } = req.body;

    // Validation
    if (!barcode || !quantity) {
      return res.status(400).json({
        error: 'Missing required fields: barcode and quantity',
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        error: 'Quantity must be greater than 0',
      });
    }

    // Import barcode service
    const { barcodeService, ScanAction } = require('../services/barcodeService');

    // Lookup drug by barcode
    const lookupResult = await barcodeService.lookupBarcode(barcode);

    if (!lookupResult.found) {
      return res.status(404).json({
        error: 'Barcode not found',
        message: lookupResult.message,
      });
    }

    if (lookupResult.entityType !== 'drug') {
      return res.status(400).json({
        error: 'Barcode is not associated with a drug',
        entityType: lookupResult.entityType,
      });
    }

    const drug = lookupResult.entity;

    // Check stock availability
    if (drug.stockQuantity < quantity) {
      return res.status(400).json({
        error: 'Insufficient stock',
        available: drug.stockQuantity,
        requested: quantity,
      });
    }

    // Get patient information if provided
    let patient = null;
    if (patientId) {
      patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true, mrn: true, name: true },
      });
    }

    // Process dispensing in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Calculate total
      const unitPrice = Number(drug.price);
      const total = unitPrice * quantity;

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Deduct stock using FIFO (First Expiry First Out)
      let remainingQuantity = quantity;
      const batches = await tx.pharmacyStock.findMany({
        where: {
          drugId: drug.id,
          quantity: { gt: 0 },
          expiryDate: { gt: new Date() },
        },
        orderBy: { expiryDate: 'asc' },
      });

      const batchesUsed: any[] = [];

      for (const batch of batches) {
        if (remainingQuantity <= 0) break;

        const deductQty = Math.min(batch.quantity, remainingQuantity);

        await tx.pharmacyStock.update({
          where: { id: batch.id },
          data: { quantity: { decrement: deductQty } },
        });

        batchesUsed.push({
          batchNumber: batch.batchNumber,
          quantity: deductQty,
          expiryDate: batch.expiryDate.toISOString(),
        });

        remainingQuantity -= deductQty;
      }

      // Update drug total stock
      await tx.drug.update({
        where: { id: drug.id },
        data: { stockQuantity: { decrement: quantity } },
      });

      // Create pharmacy sale
      const sale = await tx.pharmacySale.create({
        data: {
          invoiceNumber,
          patientName: patient?.name || null,
          patientMRN: patient?.mrn || null,
          patientId: patient?.id || null,
          prescriptionId: prescriptionId || null,
          total,
          paymentMode: paymentMode || 'cash',
          createdBy: req.user?.id,
          items: {
            create: {
              drugId: drug.id,
              drugName: drug.name,
              batchNumber: batchesUsed[0]?.batchNumber || null,
              quantity,
              unitPrice,
              total,
            },
          },
        },
        include: {
          items: true,
        },
      });

      // Update prescription status if applicable
      if (prescriptionId) {
        const prescription = await tx.prescription.findUnique({
          where: { id: prescriptionId },
        });

        if (prescription) {
          await tx.prescription.update({
            where: { id: prescriptionId },
            data: { status: 'partial' }, // Could be 'dispensed' if all items fulfilled
          });
        }
      }

      return { sale, batchesUsed };
    });

    // Record barcode scan
    await barcodeService.recordScan(
      barcode,
      req.user?.id || 'system',
      ScanAction.DISPENSE,
      location || 'pharmacy',
      {
        drugId: drug.id,
        drugName: drug.name,
        quantity,
        saleId: result.sale.id,
        invoiceNumber: result.sale.invoiceNumber,
      }
    );

    res.status(201).json({
      message: 'Drug dispensed successfully',
      sale: {
        id: result.sale.id,
        invoiceNumber: result.sale.invoiceNumber,
        total: Number(result.sale.total),
        items: result.sale.items.map(item => ({
          drugId: item.drugId,
          drugName: item.drugName,
          batchNumber: item.batchNumber,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
        })),
      },
      drug: {
        id: drug.id,
        name: drug.name,
        barcode,
      },
      batchesUsed: result.batchesUsed,
    });
  } catch (error) {
    logger.error('Dispense by barcode error:', error);
    res.status(500).json({
      error: 'Failed to dispense drug',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
