/**
 * Barcode Service
 *
 * Provides comprehensive barcode generation, validation, lookup, and management
 * for pharmacy and inventory items in the Hospital ERP system.
 */

import { prisma } from '../lib/db';
import { Prisma } from '@prisma/client';

/**
 * Barcode types supported by the system
 */
export enum BarcodeType {
  EAN13 = 'EAN13',
  CODE128 = 'CODE128',
  QR = 'QR',
  CODE39 = 'CODE39',
  DATAMATRIX = 'DATAMATRIX',
}

/**
 * Entity types that can have barcodes
 */
export enum EntityType {
  DRUG = 'drug',
  INVENTORY_ITEM = 'inventory_item',
  PATIENT = 'patient',
  SAMPLE = 'sample',
}

/**
 * Scan action types
 */
export enum ScanAction {
  LOOKUP = 'lookup',
  DISPENSE = 'dispense',
  RECEIVE = 'receive',
  VERIFY = 'verify',
  STOCK_TAKE = 'stock_take',
}

/**
 * Barcode generation options
 */
interface BarcodeGenerationOptions {
  entityType: EntityType;
  entityId: string;
  barcodeType?: BarcodeType;
  prefix?: string;
}

/**
 * Barcode lookup result
 */
interface BarcodeLookupResult {
  found: boolean;
  entityType?: EntityType;
  entityId?: string;
  entity?: any;
  barcode?: any;
  message?: string;
}

/**
 * Barcode label data for printing
 */
interface BarcodeLabelData {
  code: string;
  type: string;
  entityType: string;
  entityName: string;
  entityDetails: string;
  additionalInfo?: any;
}

class BarcodeService {
  /**
   * Generate a unique barcode code
   */
  private async generateUniqueCode(
    entityType: EntityType,
    barcodeType: BarcodeType = BarcodeType.CODE128,
    prefix?: string
  ): Promise<string> {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();

    // Create prefix based on entity type
    const entityPrefix = prefix || this.getEntityPrefix(entityType);

    let code: string;

    switch (barcodeType) {
      case BarcodeType.EAN13:
        // Generate 13-digit code (simplified - in production use proper EAN13 with checksum)
        code = this.generateEAN13(entityPrefix);
        break;

      case BarcodeType.CODE128:
      default:
        // Alphanumeric code
        code = `${entityPrefix}${timestamp.substr(-8)}${random}`;
        break;

      case BarcodeType.QR:
        // QR codes can store more data
        code = `${entityPrefix}-${entityType.toUpperCase()}-${timestamp}-${random}`;
        break;
    }

    // Ensure uniqueness
    const existing = await prisma.barcode.findUnique({
      where: { code },
    });

    if (existing) {
      // Recursively try again if duplicate (very rare)
      return this.generateUniqueCode(entityType, barcodeType, prefix);
    }

    return code;
  }

  /**
   * Get entity-specific prefix
   */
  private getEntityPrefix(entityType: EntityType): string {
    switch (entityType) {
      case EntityType.DRUG:
        return 'DRG';
      case EntityType.INVENTORY_ITEM:
        return 'INV';
      case EntityType.PATIENT:
        return 'PAT';
      case EntityType.SAMPLE:
        return 'SMP';
      default:
        return 'GEN';
    }
  }

  /**
   * Generate EAN13 barcode (simplified version)
   */
  private generateEAN13(prefix: string): string {
    // Convert prefix to numeric
    const prefixNum = prefix.split('').map(c => c.charCodeAt(0) % 10).join('').substr(0, 3);

    // Generate random 9 digits
    const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');

    // Combine (12 digits)
    const code12 = prefixNum + random;

    // Calculate check digit (simplified Luhn algorithm)
    const checkDigit = this.calculateEAN13CheckDigit(code12);

    return code12 + checkDigit;
  }

  /**
   * Calculate EAN13 check digit
   */
  private calculateEAN13CheckDigit(code12: string): string {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code12[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
  }

  /**
   * Validate barcode format
   */
  validateBarcode(code: string, type?: BarcodeType): {
    valid: boolean;
    message?: string;
    detectedType?: BarcodeType;
  } {
    if (!code || code.trim().length === 0) {
      return { valid: false, message: 'Barcode cannot be empty' };
    }

    // Check length constraints
    if (code.length > 128) {
      return { valid: false, message: 'Barcode exceeds maximum length of 128 characters' };
    }

    // If type is specified, validate against that type
    if (type) {
      switch (type) {
        case BarcodeType.EAN13:
          if (!/^\d{13}$/.test(code)) {
            return { valid: false, message: 'EAN13 must be exactly 13 digits' };
          }
          // Validate check digit
          const checkDigit = this.calculateEAN13CheckDigit(code.substr(0, 12));
          if (code[12] !== checkDigit) {
            return { valid: false, message: 'Invalid EAN13 check digit' };
          }
          break;

        case BarcodeType.CODE128:
          if (!/^[A-Za-z0-9\-_]+$/.test(code)) {
            return { valid: false, message: 'CODE128 can only contain alphanumeric characters, hyphens, and underscores' };
          }
          break;
      }

      return { valid: true, detectedType: type };
    }

    // Auto-detect type
    let detectedType: BarcodeType;

    if (/^\d{13}$/.test(code)) {
      detectedType = BarcodeType.EAN13;
    } else if (/^[A-Za-z0-9\-_]+$/.test(code)) {
      detectedType = BarcodeType.CODE128;
    } else {
      detectedType = BarcodeType.QR;
    }

    return { valid: true, detectedType };
  }

  /**
   * Generate barcode for an entity
   */
  async generateBarcode(options: BarcodeGenerationOptions): Promise<any> {
    const { entityType, entityId, barcodeType = BarcodeType.CODE128, prefix } = options;

    // Validate entity exists
    const entityExists = await this.validateEntity(entityType, entityId);
    if (!entityExists) {
      throw new Error(`Entity ${entityType} with ID ${entityId} not found`);
    }

    // Check if barcode already exists for this entity
    const existingBarcode = await prisma.barcode.findFirst({
      where: {
        entityType,
        entityId,
        isActive: true,
      },
    });

    if (existingBarcode) {
      throw new Error(`Active barcode already exists for this ${entityType}`);
    }

    // Generate unique code
    const code = await this.generateUniqueCode(entityType, barcodeType, prefix);

    // Create barcode
    const barcode = await prisma.barcode.create({
      data: {
        code,
        type: barcodeType,
        entityType,
        entityId,
        isActive: true,
      },
    });

    // Update entity with barcode
    await this.updateEntityBarcode(entityType, entityId, code);

    return barcode;
  }

  /**
   * Validate that an entity exists
   */
  private async validateEntity(entityType: EntityType, entityId: string): Promise<boolean> {
    let exists = false;

    switch (entityType) {
      case EntityType.DRUG:
        const drug = await prisma.drug.findUnique({ where: { id: entityId } });
        exists = !!drug;
        break;

      case EntityType.INVENTORY_ITEM:
        const item = await prisma.inventoryItem.findUnique({ where: { id: entityId } });
        exists = !!item;
        break;

      case EntityType.PATIENT:
        const patient = await prisma.patient.findUnique({ where: { id: entityId } });
        exists = !!patient;
        break;

      case EntityType.SAMPLE:
        // Add sample validation if you have a sample model
        exists = true; // Placeholder
        break;
    }

    return exists;
  }

  /**
   * Update entity with barcode
   */
  private async updateEntityBarcode(
    entityType: EntityType,
    entityId: string,
    code: string
  ): Promise<void> {
    switch (entityType) {
      case EntityType.DRUG:
        await prisma.drug.update({
          where: { id: entityId },
          data: { barcode: code },
        });
        break;

      case EntityType.INVENTORY_ITEM:
        await prisma.inventoryItem.update({
          where: { id: entityId },
          data: { barcode: code },
        });
        break;

      // Patient and Sample don't have barcode field in their models yet
      // They only use the Barcode table
    }
  }

  /**
   * Lookup entity by barcode
   */
  async lookupBarcode(code: string): Promise<BarcodeLookupResult> {
    // Validate barcode format
    const validation = this.validateBarcode(code);
    if (!validation.valid) {
      return {
        found: false,
        message: validation.message,
      };
    }

    // First, try to find in Barcode table
    const barcode = await prisma.barcode.findUnique({
      where: { code },
    });

    if (barcode && barcode.isActive) {
      // Fetch the actual entity
      const entity = await this.fetchEntity(barcode.entityType as EntityType, barcode.entityId);

      return {
        found: true,
        entityType: barcode.entityType as EntityType,
        entityId: barcode.entityId,
        entity,
        barcode,
      };
    }

    // If not found in Barcode table, try direct lookup in entity tables
    // (for legacy data or manually entered barcodes)

    // Try Drug
    const drug = await prisma.drug.findUnique({
      where: { barcode: code },
      include: {
        stocks: {
          where: {
            quantity: { gt: 0 },
            expiryDate: { gt: new Date() },
          },
          orderBy: { expiryDate: 'asc' },
          take: 5,
        },
      },
    });

    if (drug) {
      return {
        found: true,
        entityType: EntityType.DRUG,
        entityId: drug.id,
        entity: drug,
      };
    }

    // Try InventoryItem
    const item = await prisma.inventoryItem.findUnique({
      where: { barcode: code },
      include: {
        stocks: {
          orderBy: { lastUpdated: 'desc' },
          take: 5,
        },
      },
    });

    if (item) {
      return {
        found: true,
        entityType: EntityType.INVENTORY_ITEM,
        entityId: item.id,
        entity: item,
      };
    }

    return {
      found: false,
      message: 'Barcode not found in system',
    };
  }

  /**
   * Fetch entity details by type and ID
   */
  private async fetchEntity(entityType: EntityType, entityId: string): Promise<any> {
    switch (entityType) {
      case EntityType.DRUG:
        return await prisma.drug.findUnique({
          where: { id: entityId },
          include: {
            stocks: {
              where: {
                quantity: { gt: 0 },
                expiryDate: { gt: new Date() },
              },
              orderBy: { expiryDate: 'asc' },
              take: 5,
            },
          },
        });

      case EntityType.INVENTORY_ITEM:
        return await prisma.inventoryItem.findUnique({
          where: { id: entityId },
          include: {
            stocks: {
              orderBy: { lastUpdated: 'desc' },
              take: 5,
            },
          },
        });

      case EntityType.PATIENT:
        return await prisma.patient.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            mrn: true,
            name: true,
            dob: true,
            gender: true,
            contact: true,
            bloodGroup: true,
            allergies: true,
          },
        });

      default:
        return null;
    }
  }

  /**
   * Record a barcode scan
   */
  async recordScan(
    code: string,
    scannedBy: string,
    action: ScanAction,
    location?: string,
    result?: any
  ): Promise<any> {
    return await prisma.barcodeScan.create({
      data: {
        code,
        scannedBy,
        action,
        location: location || null,
        result: result || null,
        scannedAt: new Date(),
      },
    });
  }

  /**
   * Get scan history
   */
  async getScanHistory(filters?: {
    code?: string;
    scannedBy?: string;
    action?: ScanAction;
    location?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<any[]> {
    const where: any = {};

    if (filters?.code) {
      where.code = filters.code;
    }

    if (filters?.scannedBy) {
      where.scannedBy = filters.scannedBy;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.location) {
      where.location = filters.location;
    }

    if (filters?.startDate || filters?.endDate) {
      where.scannedAt = {};
      if (filters.startDate) {
        where.scannedAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.scannedAt.lte = filters.endDate;
      }
    }

    return await prisma.barcodeScan.findMany({
      where,
      orderBy: { scannedAt: 'desc' },
      take: filters?.limit || 100,
    });
  }

  /**
   * Generate printable label data
   */
  async printBarcodeLabel(barcodeId: string): Promise<BarcodeLabelData | null> {
    const barcode = await prisma.barcode.findUnique({
      where: { id: barcodeId },
    });

    if (!barcode) {
      return null;
    }

    const entity = await this.fetchEntity(
      barcode.entityType as EntityType,
      barcode.entityId
    );

    if (!entity) {
      return null;
    }

    let entityName = '';
    let entityDetails = '';
    let additionalInfo: any = {};

    switch (barcode.entityType) {
      case EntityType.DRUG:
        entityName = entity.name;
        entityDetails = `${entity.genericName} | ${entity.form} ${entity.strength}`;
        additionalInfo = {
          category: entity.category,
          price: Number(entity.price),
          stockQuantity: entity.stockQuantity,
        };
        break;

      case EntityType.INVENTORY_ITEM:
        entityName = entity.name;
        entityDetails = `${entity.category} | ${entity.unit}`;
        additionalInfo = {
          code: entity.code,
          price: Number(entity.price),
        };
        break;

      case EntityType.PATIENT:
        entityName = entity.name;
        entityDetails = `MRN: ${entity.mrn} | ${entity.gender || ''}`;
        additionalInfo = {
          bloodGroup: entity.bloodGroup,
          contact: entity.contact,
        };
        break;
    }

    return {
      code: barcode.code,
      type: barcode.type,
      entityType: barcode.entityType,
      entityName,
      entityDetails,
      additionalInfo,
    };
  }

  /**
   * Bulk generate barcodes for multiple entities
   */
  async bulkGenerateBarcodes(
    entityType: EntityType,
    entityIds: string[],
    barcodeType: BarcodeType = BarcodeType.CODE128
  ): Promise<{
    successful: any[];
    failed: Array<{ entityId: string; error: string }>;
  }> {
    const successful: any[] = [];
    const failed: Array<{ entityId: string; error: string }> = [];

    for (const entityId of entityIds) {
      try {
        const barcode = await this.generateBarcode({
          entityType,
          entityId,
          barcodeType,
        });
        successful.push(barcode);
      } catch (error) {
        failed.push({
          entityId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Deactivate a barcode
   */
  async deactivateBarcode(barcodeId: string): Promise<any> {
    return await prisma.barcode.update({
      where: { id: barcodeId },
      data: { isActive: false },
    });
  }

  /**
   * Reactivate a barcode
   */
  async reactivateBarcode(barcodeId: string): Promise<any> {
    return await prisma.barcode.update({
      where: { id: barcodeId },
      data: { isActive: true },
    });
  }

  /**
   * Get all barcodes for an entity
   */
  async getEntityBarcodes(entityType: EntityType, entityId: string): Promise<any[]> {
    return await prisma.barcode.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const barcodeService = new BarcodeService();
export { BarcodeService };
