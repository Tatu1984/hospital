/**
 * Barcode Management Routes
 *
 * Provides endpoints for barcode generation, lookup, scanning, and management
 * for pharmacy and inventory operations.
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/db';
import { logger } from '../utils/logger';
import {
  barcodeService,
  BarcodeType,
  EntityType,
  ScanAction,
} from '../services/barcodeService';

const router = Router();

// ===========================
// BARCODE GENERATION
// ===========================

/**
 * Generate barcode for an entity
 * POST /api/barcodes/generate
 */
router.post('/generate', async (req: any, res: Response) => {
  try {
    const { entityType, entityId, barcodeType, prefix } = req.body;

    // Validation
    if (!entityType || !entityId) {
      return res.status(400).json({
        error: 'Missing required fields: entityType and entityId',
      });
    }

    // Validate entity type
    if (!Object.values(EntityType).includes(entityType)) {
      return res.status(400).json({
        error: `Invalid entity type. Must be one of: ${Object.values(EntityType).join(', ')}`,
      });
    }

    // Validate barcode type if provided
    if (barcodeType && !Object.values(BarcodeType).includes(barcodeType)) {
      return res.status(400).json({
        error: `Invalid barcode type. Must be one of: ${Object.values(BarcodeType).join(', ')}`,
      });
    }

    const barcode = await barcodeService.generateBarcode({
      entityType,
      entityId,
      barcodeType: barcodeType || BarcodeType.CODE128,
      prefix,
    });

    res.status(201).json({
      message: 'Barcode generated successfully',
      barcode: {
        id: barcode.id,
        code: barcode.code,
        type: barcode.type,
        entityType: barcode.entityType,
        entityId: barcode.entityId,
        createdAt: barcode.createdAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Generate barcode error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      error: 'Failed to generate barcode',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Bulk generate barcodes for multiple entities
 * POST /api/barcodes/bulk-generate
 */
router.post('/bulk-generate', async (req: any, res: Response) => {
  try {
    const { entityType, entityIds, barcodeType } = req.body;

    // Validation
    if (!entityType || !entityIds || !Array.isArray(entityIds)) {
      return res.status(400).json({
        error: 'Missing required fields: entityType and entityIds (array)',
      });
    }

    if (entityIds.length === 0) {
      return res.status(400).json({
        error: 'entityIds array cannot be empty',
      });
    }

    if (entityIds.length > 100) {
      return res.status(400).json({
        error: 'Cannot generate more than 100 barcodes at once',
      });
    }

    // Validate entity type
    if (!Object.values(EntityType).includes(entityType)) {
      return res.status(400).json({
        error: `Invalid entity type. Must be one of: ${Object.values(EntityType).join(', ')}`,
      });
    }

    const result = await barcodeService.bulkGenerateBarcodes(
      entityType,
      entityIds,
      barcodeType || BarcodeType.CODE128
    );

    res.status(201).json({
      message: `Generated ${result.successful.length} barcodes successfully`,
      successful: result.successful.map(b => ({
        id: b.id,
        code: b.code,
        entityId: b.entityId,
      })),
      failed: result.failed,
      summary: {
        total: entityIds.length,
        successful: result.successful.length,
        failed: result.failed.length,
      },
    });
  } catch (error) {
    logger.error('Bulk generate barcodes error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      error: 'Failed to bulk generate barcodes',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================
// BARCODE LOOKUP
// ===========================

/**
 * Lookup entity by barcode
 * GET /api/barcodes/lookup/:code
 */
router.get('/lookup/:code', async (req: any, res: Response) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ error: 'Barcode code is required' });
    }

    const result = await barcodeService.lookupBarcode(code);

    // Record the scan
    if (req.user?.id) {
      await barcodeService.recordScan(
        code,
        req.user.id,
        ScanAction.LOOKUP,
        req.body.location,
        result
      );
    }

    if (!result.found) {
      return res.status(404).json({
        found: false,
        message: result.message || 'Barcode not found',
      });
    }

    res.json({
      found: true,
      entityType: result.entityType,
      entityId: result.entityId,
      entity: result.entity,
      barcode: result.barcode,
    });
  } catch (error) {
    logger.error('Barcode lookup error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      error: 'Failed to lookup barcode',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================
// BARCODE SCANNING
// ===========================

/**
 * Record a barcode scan
 * POST /api/barcodes/scan
 */
router.post('/scan', async (req: any, res: Response) => {
  try {
    const { code, action, location, additionalData } = req.body;

    // Validation
    if (!code || !action) {
      return res.status(400).json({
        error: 'Missing required fields: code and action',
      });
    }

    // Validate action
    if (!Object.values(ScanAction).includes(action)) {
      return res.status(400).json({
        error: `Invalid action. Must be one of: ${Object.values(ScanAction).join(', ')}`,
      });
    }

    // Lookup the barcode
    const lookupResult = await barcodeService.lookupBarcode(code);

    // Record the scan
    const scan = await barcodeService.recordScan(
      code,
      req.user?.id || 'system',
      action,
      location,
      {
        ...lookupResult,
        additionalData,
      }
    );

    res.status(201).json({
      message: 'Scan recorded successfully',
      scan: {
        id: scan.id,
        code: scan.code,
        action: scan.action,
        location: scan.location,
        scannedAt: scan.scannedAt.toISOString(),
      },
      lookupResult,
    });
  } catch (error) {
    logger.error('Record scan error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      error: 'Failed to record scan',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get scan history
 * GET /api/barcodes/scan-history
 */
router.get('/scan-history', async (req: any, res: Response) => {
  try {
    const { code, scannedBy, action, location, startDate, endDate, limit } = req.query;

    const filters: any = {};

    if (code) filters.code = code as string;
    if (scannedBy) filters.scannedBy = scannedBy as string;
    if (action) filters.action = action as ScanAction;
    if (location) filters.location = location as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (limit) filters.limit = parseInt(limit as string);

    const scans = await barcodeService.getScanHistory(filters);

    res.json({
      scans: scans.map(scan => ({
        id: scan.id,
        code: scan.code,
        scannedBy: scan.scannedBy,
        action: scan.action,
        location: scan.location,
        result: scan.result,
        scannedAt: scan.scannedAt.toISOString(),
      })),
      count: scans.length,
    });
  } catch (error) {
    logger.error('Get scan history error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      error: 'Failed to fetch scan history',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================
// BARCODE LABEL
// ===========================

/**
 * Get printable barcode label data
 * GET /api/barcodes/:id/label
 */
router.get('/:id/label', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const labelData = await barcodeService.printBarcodeLabel(id);

    if (!labelData) {
      return res.status(404).json({
        error: 'Barcode not found or associated entity not found',
      });
    }

    res.json(labelData);
  } catch (error) {
    logger.error('Get barcode label error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      error: 'Failed to generate label data',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ===========================
// BARCODE MANAGEMENT
// ===========================

/**
 * Get all barcodes for an entity
 * GET /api/barcodes/entity/:entityType/:entityId
 */
router.get('/entity/:entityType/:entityId', async (req: any, res: Response) => {
  try {
    const { entityType, entityId } = req.params;

    // Validate entity type
    if (!Object.values(EntityType).includes(entityType as EntityType)) {
      return res.status(400).json({
        error: `Invalid entity type. Must be one of: ${Object.values(EntityType).join(', ')}`,
      });
    }

    const barcodes = await barcodeService.getEntityBarcodes(
      entityType as EntityType,
      entityId
    );

    res.json({
      barcodes: barcodes.map(b => ({
        id: b.id,
        code: b.code,
        type: b.type,
        isActive: b.isActive,
        createdAt: b.createdAt.toISOString(),
      })),
      count: barcodes.length,
    });
  } catch (error) {
    logger.error('Get entity barcodes error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      error: 'Failed to fetch barcodes',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Deactivate a barcode
 * PUT /api/barcodes/:id/deactivate
 */
router.put('/:id/deactivate', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const barcode = await barcodeService.deactivateBarcode(id);

    res.json({
      message: 'Barcode deactivated successfully',
      barcode: {
        id: barcode.id,
        code: barcode.code,
        isActive: barcode.isActive,
      },
    });
  } catch (error) {
    logger.error('Deactivate barcode error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      error: 'Failed to deactivate barcode',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Reactivate a barcode
 * PUT /api/barcodes/:id/reactivate
 */
router.put('/:id/reactivate', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const barcode = await barcodeService.reactivateBarcode(id);

    res.json({
      message: 'Barcode reactivated successfully',
      barcode: {
        id: barcode.id,
        code: barcode.code,
        isActive: barcode.isActive,
      },
    });
  } catch (error) {
    logger.error('Reactivate barcode error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      error: 'Failed to reactivate barcode',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Validate barcode format
 * POST /api/barcodes/validate
 */
router.post('/validate', async (req: any, res: Response) => {
  try {
    const { code, type } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Barcode code is required' });
    }

    const validation = barcodeService.validateBarcode(code, type);

    res.json(validation);
  } catch (error) {
    logger.error('Validate barcode error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      error: 'Failed to validate barcode',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
