/**
 * Inventory Management Routes
 *
 * Provides endpoints for inventory management including barcode-based operations
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/db';
import { barcodeService, ScanAction } from '../services/barcodeService';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middleware';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication to all inventory routes
router.use(authenticateToken);

// ===========================
// INVENTORY ITEMS CRUD
// ===========================

// Get all inventory items
router.get('/items', async (req: any, res: Response) => {
  try {
    const { category, searchTerm, page = 1, limit = 50 } = req.query;

    const where: any = { isActive: true };

    if (category) {
      where.category = category;
    }

    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { code: { contains: searchTerm, mode: 'insensitive' } },
        { barcode: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: {
          stocks: {
            select: {
              storeId: true,
              quantity: true,
              batchNumber: true,
              expiryDate: true,
            },
          },
        },
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    res.json({
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        code: item.code,
        barcode: item.barcode,
        category: item.category,
        unit: item.unit,
        price: Number(item.price),
        reorderLevel: item.reorderLevel,
        totalStock: item.stocks.reduce((sum, s) => sum + s.quantity, 0),
        stocks: item.stocks,
      })),
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    logger.error('Get inventory items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single inventory item
router.get('/items/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        stocks: {
          orderBy: { lastUpdated: 'desc' },
        },
        purchaseOrderItems: {
          include: {
            purchaseOrder: true,
          },
          orderBy: { id: 'desc' },
          take: 10,
        },
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.json({
      id: item.id,
      name: item.name,
      code: item.code,
      barcode: item.barcode,
      category: item.category,
      unit: item.unit,
      price: Number(item.price),
      reorderLevel: item.reorderLevel,
      isActive: item.isActive,
      totalStock: item.stocks.reduce((sum, s) => sum + s.quantity, 0),
      stocks: item.stocks.map(s => ({
        id: s.id,
        storeId: s.storeId,
        batchNumber: s.batchNumber,
        expiryDate: s.expiryDate?.toISOString(),
        quantity: s.quantity,
        lastUpdated: s.lastUpdated.toISOString(),
      })),
      recentPurchases: item.purchaseOrderItems.map(poi => ({
        poNumber: poi.purchaseOrder.poNumber,
        quantity: poi.quantity,
        rate: Number(poi.rate),
        amount: Number(poi.amount),
        orderDate: poi.purchaseOrder.orderDate.toISOString(),
        status: poi.purchaseOrder.status,
      })),
    });
  } catch (error) {
    logger.error('Get inventory item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new inventory item
router.post('/items', async (req: any, res: Response) => {
  try {
    const { name, code, category, unit, price, reorderLevel } = req.body;

    // Validation
    if (!name || !code || !category || !unit) {
      return res.status(400).json({
        error: 'Missing required fields: name, code, category, unit',
      });
    }

    // Check if code already exists
    const existing = await prisma.inventoryItem.findUnique({
      where: { code },
    });

    if (existing) {
      return res.status(400).json({
        error: 'Item code already exists',
      });
    }

    const item = await prisma.inventoryItem.create({
      data: {
        name,
        code,
        category,
        unit,
        price: price || 0,
        reorderLevel: reorderLevel || 0,
      },
    });

    res.status(201).json({
      message: 'Inventory item created successfully',
      item: {
        id: item.id,
        name: item.name,
        code: item.code,
        category: item.category,
        unit: item.unit,
        price: Number(item.price),
        reorderLevel: item.reorderLevel,
      },
    });
  } catch (error) {
    logger.error('Create inventory item error:', error);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

// Update inventory item
router.put('/items/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, unit, price, reorderLevel } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (category) updateData.category = category;
    if (unit) updateData.unit = unit;
    if (price !== undefined) updateData.price = price;
    if (reorderLevel !== undefined) updateData.reorderLevel = reorderLevel;

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: updateData,
    });

    res.json({
      message: 'Inventory item updated successfully',
      item: {
        id: item.id,
        name: item.name,
        code: item.code,
        category: item.category,
        unit: item.unit,
        price: Number(item.price),
        reorderLevel: item.reorderLevel,
      },
    });
  } catch (error) {
    logger.error('Update inventory item error:', error);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

// ===========================
// STOCK MANAGEMENT
// ===========================

// Get stock by store
router.get('/stock', async (req: any, res: Response) => {
  try {
    const { storeId, itemId } = req.query;

    const where: any = {};
    if (storeId) where.storeId = storeId;
    if (itemId) where.itemId = itemId;

    const stocks = await prisma.stock.findMany({
      where,
      include: {
        item: true,
      },
      orderBy: { lastUpdated: 'desc' },
    });

    res.json({
      stocks: stocks.map(s => ({
        id: s.id,
        itemId: s.itemId,
        itemName: s.item.name,
        itemCode: s.item.code,
        storeId: s.storeId,
        batchNumber: s.batchNumber,
        expiryDate: s.expiryDate?.toISOString(),
        quantity: s.quantity,
        lastUpdated: s.lastUpdated.toISOString(),
      })),
    });
  } catch (error) {
    logger.error('Get stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Low stock alert
router.get('/low-stock', async (req: any, res: Response) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { isActive: true },
      include: {
        stocks: true,
      },
    });

    const lowStockItems = items
      .map(item => {
        const totalStock = item.stocks.reduce((sum, s) => sum + s.quantity, 0);
        return {
          id: item.id,
          name: item.name,
          code: item.code,
          category: item.category,
          totalStock,
          reorderLevel: item.reorderLevel,
          status:
            totalStock === 0 ? 'out_of_stock' : totalStock <= item.reorderLevel ? 'low_stock' : 'ok',
        };
      })
      .filter(item => item.totalStock <= item.reorderLevel)
      .sort((a, b) => a.totalStock - b.totalStock);

    res.json({ items: lowStockItems, count: lowStockItems.length });
  } catch (error) {
    logger.error('Get low stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// BARCODE-BASED OPERATIONS
// ===========================

/**
 * Receive inventory stock by barcode
 * POST /api/inventory/receive-by-barcode
 */
router.post('/receive-by-barcode', async (req: any, res: Response) => {
  try {
    const {
      barcode,
      quantity,
      storeId,
      batchNumber,
      expiryDate,
      poNumber,
      vendorName,
      location,
    } = req.body;

    // Validation
    if (!barcode || !quantity || !storeId) {
      return res.status(400).json({
        error: 'Missing required fields: barcode, quantity, and storeId',
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        error: 'Quantity must be greater than 0',
      });
    }

    // Lookup item by barcode
    const lookupResult = await barcodeService.lookupBarcode(barcode);

    if (!lookupResult.found) {
      return res.status(404).json({
        error: 'Barcode not found',
        message: lookupResult.message,
      });
    }

    if (lookupResult.entityType !== 'inventory_item') {
      return res.status(400).json({
        error: 'Barcode is not associated with an inventory item',
        entityType: lookupResult.entityType,
      });
    }

    const item = lookupResult.entity;

    // Process stock receipt in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check if stock exists for this store/item/batch
      const existingStock = await tx.stock.findFirst({
        where: {
          itemId: item.id,
          storeId,
          batchNumber: batchNumber || null,
        },
      });

      let stock;

      if (existingStock) {
        // Update existing stock
        stock = await tx.stock.update({
          where: { id: existingStock.id },
          data: {
            quantity: { increment: quantity },
            expiryDate: expiryDate ? new Date(expiryDate) : existingStock.expiryDate,
          },
        });
      } else {
        // Create new stock entry
        stock = await tx.stock.create({
          data: {
            itemId: item.id,
            storeId,
            batchNumber: batchNumber || null,
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            quantity,
          },
        });
      }

      return stock;
    });

    // Record barcode scan
    await barcodeService.recordScan(
      barcode,
      req.user?.id || 'system',
      ScanAction.RECEIVE,
      location || storeId,
      {
        itemId: item.id,
        itemName: item.name,
        quantity,
        storeId,
        batchNumber,
        stockId: result.id,
        poNumber,
        vendorName,
      }
    );

    res.status(201).json({
      message: 'Stock received successfully',
      stock: {
        id: result.id,
        itemId: result.itemId,
        itemName: item.name,
        storeId: result.storeId,
        batchNumber: result.batchNumber,
        quantity: result.quantity,
        expiryDate: result.expiryDate?.toISOString(),
        barcode,
      },
    });
  } catch (error) {
    logger.error('Receive stock by barcode error:', error);
    res.status(500).json({
      error: 'Failed to receive stock',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Issue/dispense inventory item by barcode
 * POST /api/inventory/issue-by-barcode
 */
router.post('/issue-by-barcode', async (req: any, res: Response) => {
  try {
    const { barcode, quantity, storeId, issuedTo, department, requisitionNumber, location } = req.body;

    // Validation
    if (!barcode || !quantity || !storeId) {
      return res.status(400).json({
        error: 'Missing required fields: barcode, quantity, and storeId',
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        error: 'Quantity must be greater than 0',
      });
    }

    // Lookup item by barcode
    const lookupResult = await barcodeService.lookupBarcode(barcode);

    if (!lookupResult.found) {
      return res.status(404).json({
        error: 'Barcode not found',
        message: lookupResult.message,
      });
    }

    if (lookupResult.entityType !== 'inventory_item') {
      return res.status(400).json({
        error: 'Barcode is not associated with an inventory item',
        entityType: lookupResult.entityType,
      });
    }

    const item = lookupResult.entity;

    // Check stock availability
    const availableStocks = item.stocks.filter((s: any) => s.storeId === storeId);
    const totalAvailable = availableStocks.reduce((sum: number, s: any) => sum + s.quantity, 0);

    if (totalAvailable < quantity) {
      return res.status(400).json({
        error: 'Insufficient stock',
        available: totalAvailable,
        requested: quantity,
        storeId,
      });
    }

    // Process stock issue in a transaction
    const result = await prisma.$transaction(async (tx) => {
      let remainingQuantity = quantity;
      const stocksUsed: any[] = [];

      // Deduct from available stocks (FIFO by lastUpdated)
      const stocks = await tx.stock.findMany({
        where: {
          itemId: item.id,
          storeId,
          quantity: { gt: 0 },
        },
        orderBy: { lastUpdated: 'asc' },
      });

      for (const stock of stocks) {
        if (remainingQuantity <= 0) break;

        const deductQty = Math.min(stock.quantity, remainingQuantity);

        await tx.stock.update({
          where: { id: stock.id },
          data: { quantity: { decrement: deductQty } },
        });

        stocksUsed.push({
          stockId: stock.id,
          batchNumber: stock.batchNumber,
          quantity: deductQty,
        });

        remainingQuantity -= deductQty;
      }

      return stocksUsed;
    });

    // Record barcode scan
    await barcodeService.recordScan(
      barcode,
      req.user?.id || 'system',
      ScanAction.DISPENSE,
      location || storeId,
      {
        itemId: item.id,
        itemName: item.name,
        quantity,
        storeId,
        issuedTo,
        department,
        requisitionNumber,
        stocksUsed: result,
      }
    );

    res.status(200).json({
      message: 'Stock issued successfully',
      item: {
        id: item.id,
        name: item.name,
        code: item.code,
        barcode,
      },
      quantity,
      storeId,
      issuedTo,
      department,
      stocksUsed: result,
    });
  } catch (error) {
    logger.error('Issue stock by barcode error:', error);
    res.status(500).json({
      error: 'Failed to issue stock',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Verify stock by barcode (stock take/audit)
 * POST /api/inventory/verify-by-barcode
 */
router.post('/verify-by-barcode', async (req: any, res: Response) => {
  try {
    const { barcode, storeId, physicalCount, location } = req.body;

    // Validation
    if (!barcode || !storeId || physicalCount === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: barcode, storeId, and physicalCount',
      });
    }

    // Lookup item by barcode
    const lookupResult = await barcodeService.lookupBarcode(barcode);

    if (!lookupResult.found) {
      return res.status(404).json({
        error: 'Barcode not found',
        message: lookupResult.message,
      });
    }

    if (lookupResult.entityType !== 'inventory_item') {
      return res.status(400).json({
        error: 'Barcode is not associated with an inventory item',
        entityType: lookupResult.entityType,
      });
    }

    const item = lookupResult.entity;

    // Get current system stock
    const stocks = await prisma.stock.findMany({
      where: {
        itemId: item.id,
        storeId,
      },
    });

    const systemCount = stocks.reduce((sum, s) => sum + s.quantity, 0);
    const variance = physicalCount - systemCount;

    // Record barcode scan with verification data
    await barcodeService.recordScan(
      barcode,
      req.user?.id || 'system',
      ScanAction.VERIFY,
      location || storeId,
      {
        itemId: item.id,
        itemName: item.name,
        storeId,
        systemCount,
        physicalCount,
        variance,
        stocks: stocks.map(s => ({
          stockId: s.id,
          batchNumber: s.batchNumber,
          quantity: s.quantity,
        })),
      }
    );

    res.json({
      message: 'Stock verification recorded',
      item: {
        id: item.id,
        name: item.name,
        code: item.code,
        barcode,
      },
      storeId,
      systemCount,
      physicalCount,
      variance,
      status: variance === 0 ? 'matched' : variance > 0 ? 'surplus' : 'shortage',
    });
  } catch (error) {
    logger.error('Verify stock by barcode error:', error);
    res.status(500).json({
      error: 'Failed to verify stock',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
