# Barcode Scanning Implementation for Hospital ERP

## Overview

This document provides a comprehensive overview of the barcode scanning system implemented for pharmacy and inventory management in the Hospital ERP system.

## Implementation Summary

### 1. Database Schema Updates

**File:** `/prisma/schema.prisma`

#### New Models Added:

**Barcode Model:**
```prisma
model Barcode {
  id          String   @id @default(uuid())
  code        String   @unique
  type        String   // EAN13, CODE128, QR, etc.
  entityType  String   // drug, inventory_item, patient, sample
  entityId    String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  @@index([code])
  @@index([entityType, entityId])
  @@map("barcodes")
}
```

**BarcodeScan Model:**
```prisma
model BarcodeScan {
  id          String   @id @default(uuid())
  code        String
  scannedBy   String
  scannedAt   DateTime @default(now())
  location    String?  // pharmacy, lab, ward, etc.
  action      String   // lookup, dispense, receive, verify
  result      Json?    // scan result/entity found

  @@index([scannedAt])
  @@index([scannedBy])
  @@index([action])
  @@map("barcode_scans")
}
```

#### Modified Models:

**Drug Model:**
- Added `barcode` field (String?, unique)

**InventoryItem Model:**
- Added `barcode` field (String?, unique)

### 2. Barcode Service

**File:** `/src/services/barcodeService.ts`

A comprehensive service providing:

#### Core Features:

1. **Barcode Generation**
   - Supports multiple barcode types: EAN13, CODE128, QR, CODE39, DATAMATRIX
   - Entity-specific prefixes (DRG for drugs, INV for inventory items)
   - Unique code generation with collision detection
   - Bulk generation support (up to 100 entities at once)

2. **Barcode Validation**
   - Format validation for different barcode types
   - EAN13 checksum validation
   - Auto-detection of barcode type

3. **Entity Lookup**
   - Fast barcode lookup with entity resolution
   - Support for drugs, inventory items, patients, and samples
   - Returns complete entity details with stock information

4. **Scan Recording**
   - Comprehensive scan history tracking
   - Support for different scan actions (lookup, dispense, receive, verify)
   - Location tracking
   - Result metadata storage

5. **Label Generation**
   - Printable barcode label data generation
   - Entity-specific formatting
   - Additional information inclusion

#### Key Functions:

```typescript
- generateBarcode(options: BarcodeGenerationOptions): Promise<any>
- validateBarcode(code: string, type?: BarcodeType): ValidationResult
- lookupBarcode(code: string): Promise<BarcodeLookupResult>
- recordScan(code, scannedBy, action, location?, result?): Promise<any>
- getScanHistory(filters?): Promise<any[]>
- printBarcodeLabel(barcodeId: string): Promise<BarcodeLabelData>
- bulkGenerateBarcodes(entityType, entityIds, barcodeType): Promise<BulkResult>
```

### 3. API Endpoints

#### Barcode Management Routes (`/src/routes/barcode.ts`)

1. **POST /api/barcodes/generate**
   - Generate barcode for an entity
   - Required: `entityType`, `entityId`
   - Optional: `barcodeType`, `prefix`

2. **POST /api/barcodes/bulk-generate**
   - Bulk generate barcodes (max 100 entities)
   - Required: `entityType`, `entityIds[]`
   - Optional: `barcodeType`

3. **GET /api/barcodes/lookup/:code**
   - Lookup entity by barcode
   - Returns complete entity details
   - Records scan automatically

4. **POST /api/barcodes/scan**
   - Record a barcode scan
   - Required: `code`, `action`
   - Optional: `location`, `additionalData`

5. **GET /api/barcodes/scan-history**
   - Get scan history with filters
   - Filters: `code`, `scannedBy`, `action`, `location`, `startDate`, `endDate`, `limit`

6. **GET /api/barcodes/:id/label**
   - Get printable barcode label data
   - Returns formatted label information

7. **GET /api/barcodes/entity/:entityType/:entityId**
   - Get all barcodes for an entity
   - Support for versioning/multiple barcodes

8. **PUT /api/barcodes/:id/deactivate**
   - Deactivate a barcode

9. **PUT /api/barcodes/:id/reactivate**
   - Reactivate a barcode

10. **POST /api/barcodes/validate**
    - Validate barcode format
    - Returns validation result and detected type

#### Pharmacy Barcode Routes (`/src/routes/pharmacy.ts`)

11. **POST /api/pharmacy/dispense-by-barcode**
    - Dispense drug by scanning barcode
    - Required: `barcode`, `quantity`
    - Optional: `patientId`, `prescriptionId`, `paymentMode`, `location`
    - Features:
      - Automatic drug lookup
      - Stock availability check
      - FIFO batch selection
      - Automatic stock deduction
      - Invoice generation
      - Scan recording

#### Inventory Barcode Routes (`/src/routes/inventory.ts`)

12. **GET /api/inventory/items**
    - List inventory items
    - Supports search by barcode
    - Pagination support

13. **GET /api/inventory/items/:id**
    - Get single inventory item details

14. **POST /api/inventory/items**
    - Create new inventory item

15. **PUT /api/inventory/items/:id**
    - Update inventory item

16. **GET /api/inventory/stock**
    - Get stock information
    - Filter by `storeId`, `itemId`

17. **GET /api/inventory/low-stock**
    - Get low stock alerts

18. **POST /api/inventory/receive-by-barcode**
    - Receive inventory stock by barcode
    - Required: `barcode`, `quantity`, `storeId`
    - Optional: `batchNumber`, `expiryDate`, `poNumber`, `vendorName`, `location`
    - Features:
      - Automatic item lookup
      - Stock creation/update
      - Batch tracking
      - Scan recording

19. **POST /api/inventory/issue-by-barcode**
    - Issue/dispense inventory item by barcode
    - Required: `barcode`, `quantity`, `storeId`
    - Optional: `issuedTo`, `department`, `requisitionNumber`, `location`
    - Features:
      - Stock availability check
      - FIFO stock deduction
      - Usage tracking

20. **POST /api/inventory/verify-by-barcode**
    - Verify stock by barcode (stock take/audit)
    - Required: `barcode`, `storeId`, `physicalCount`
    - Optional: `location`
    - Features:
      - System vs physical count comparison
      - Variance calculation
      - Audit trail

### 4. Validation Schemas

**File:** `/src/validators/index.ts`

Comprehensive Zod validation schemas for all barcode operations:

- `generateBarcodeSchema`
- `bulkGenerateBarcodeSchema`
- `barcodeLookupSchema`
- `recordScanSchema`
- `scanHistoryQuerySchema`
- `validateBarcodeSchema`
- `pharmacyDispenseByBarcodeSchema`
- `inventoryReceiveByBarcodeSchema`
- `inventoryIssueByBarcodeSchema`
- `inventoryVerifyByBarcodeSchema`

All schemas include:
- Type safety with TypeScript inference
- Input validation
- Error messages
- Optional field handling

### 5. Security & Permissions

**File:** `/src/routes/index.ts`

Added RBAC permissions for all barcode endpoints:

**Barcode Permissions:**
- `barcode:generate` - Generate barcodes
- `barcode:lookup` - Lookup barcodes
- `barcode:scan` - Record scans
- `barcode:view` - View barcode data
- `barcode:manage` - Manage (activate/deactivate) barcodes

**Pharmacy Permissions:**
- `pharmacy:dispense` - Dispense drugs
- Combined with `barcode:scan` for barcode dispensing

**Inventory Permissions:**
- `inventory:view` - View inventory
- `inventory:create` - Create items
- `inventory:edit` - Edit items
- `inventory:receive` - Receive stock
- `inventory:issue` - Issue stock
- `inventory:verify` - Verify stock
- Combined with `barcode:scan` for barcode operations

## Usage Examples

### 1. Generate Barcode for a Drug

```bash
POST /api/barcodes/generate
{
  "entityType": "drug",
  "entityId": "drug-uuid-here",
  "barcodeType": "CODE128"
}
```

Response:
```json
{
  "message": "Barcode generated successfully",
  "barcode": {
    "id": "barcode-uuid",
    "code": "DRG12345678ABC",
    "type": "CODE128",
    "entityType": "drug",
    "entityId": "drug-uuid-here",
    "createdAt": "2025-12-31T10:00:00Z"
  }
}
```

### 2. Dispense Drug by Barcode

```bash
POST /api/pharmacy/dispense-by-barcode
{
  "barcode": "DRG12345678ABC",
  "quantity": 10,
  "patientId": "patient-uuid",
  "paymentMode": "cash",
  "location": "pharmacy"
}
```

Response:
```json
{
  "message": "Drug dispensed successfully",
  "sale": {
    "id": "sale-uuid",
    "invoiceNumber": "INV-1735632000-ABCD123",
    "total": 250.00,
    "items": [...]
  },
  "drug": {
    "id": "drug-uuid",
    "name": "Paracetamol 500mg",
    "barcode": "DRG12345678ABC"
  },
  "batchesUsed": [...]
}
```

### 3. Receive Inventory by Barcode

```bash
POST /api/inventory/receive-by-barcode
{
  "barcode": "INV87654321XYZ",
  "quantity": 50,
  "storeId": "store-uuid",
  "batchNumber": "BATCH001",
  "expiryDate": "2026-12-31",
  "poNumber": "PO-2025-001",
  "vendorName": "ABC Suppliers"
}
```

Response:
```json
{
  "message": "Stock received successfully",
  "stock": {
    "id": "stock-uuid",
    "itemId": "item-uuid",
    "itemName": "Surgical Gloves",
    "storeId": "store-uuid",
    "batchNumber": "BATCH001",
    "quantity": 50,
    "expiryDate": "2026-12-31T00:00:00Z",
    "barcode": "INV87654321XYZ"
  }
}
```

### 4. Lookup Barcode

```bash
GET /api/barcodes/lookup/DRG12345678ABC
```

Response:
```json
{
  "found": true,
  "entityType": "drug",
  "entityId": "drug-uuid",
  "entity": {
    "id": "drug-uuid",
    "name": "Paracetamol 500mg",
    "genericName": "Paracetamol",
    "form": "Tablet",
    "strength": "500mg",
    "price": 25.00,
    "stockQuantity": 500,
    "stocks": [...]
  },
  "barcode": {
    "id": "barcode-uuid",
    "code": "DRG12345678ABC",
    "type": "CODE128"
  }
}
```

### 5. Get Scan History

```bash
GET /api/barcodes/scan-history?action=dispense&startDate=2025-12-01T00:00:00Z&limit=50
```

Response:
```json
{
  "scans": [
    {
      "id": "scan-uuid",
      "code": "DRG12345678ABC",
      "scannedBy": "user-uuid",
      "action": "dispense",
      "location": "pharmacy",
      "result": {...},
      "scannedAt": "2025-12-31T10:00:00Z"
    },
    ...
  ],
  "count": 50
}
```

## Database Migration

After implementing these changes, run the following commands:

```bash
# Generate Prisma client with new models
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name add_barcode_support

# Or for production
npx prisma migrate deploy
```

## Next Steps

1. **Frontend Integration:**
   - Implement barcode scanner component (using device camera or USB scanner)
   - Create barcode generation UI
   - Add barcode lookup interface
   - Implement scan history dashboard

2. **Barcode Label Printing:**
   - Integrate with thermal printer libraries
   - Design label templates
   - Implement batch printing

3. **Mobile App:**
   - Develop mobile app for barcode scanning
   - Implement offline support
   - Add camera-based scanning

4. **Analytics:**
   - Scan frequency reports
   - Most scanned items
   - Scan error tracking
   - Audit reports

5. **Advanced Features:**
   - QR code generation with embedded data
   - 2D barcode support for complex data
   - Integration with external barcode databases
   - Automated reordering based on scan patterns

## Testing

### Manual Testing Checklist:

- [ ] Generate barcode for drug
- [ ] Generate barcode for inventory item
- [ ] Bulk generate barcodes
- [ ] Lookup barcode
- [ ] Dispense drug by barcode
- [ ] Receive inventory by barcode
- [ ] Issue inventory by barcode
- [ ] Verify stock by barcode
- [ ] View scan history
- [ ] Deactivate/reactivate barcode
- [ ] Get barcode label data
- [ ] Validate barcode format

### API Testing:

Use the provided Postman/Thunder Client collection or test each endpoint using curl or your preferred API testing tool.

## Security Considerations

1. **Permission-based Access:**
   - All endpoints require appropriate permissions
   - Barcode operations are logged with user information

2. **Audit Trail:**
   - All scans are recorded with timestamp and user
   - Scan results are stored for audit purposes

3. **Data Validation:**
   - All inputs are validated using Zod schemas
   - Barcode format validation prevents invalid data

4. **Unique Constraints:**
   - Barcodes are unique across the system
   - Prevents duplicate barcode generation

## Performance Optimization

1. **Indexed Fields:**
   - Barcode code field is indexed for fast lookup
   - Entity type and ID combination is indexed

2. **Batch Operations:**
   - Bulk generation supports up to 100 entities
   - Efficient transaction handling

3. **Caching Opportunities:**
   - Frequently scanned items can be cached
   - Barcode lookup results can be cached

## Support & Maintenance

For issues or questions:
- Check scan history for audit trail
- Review validation errors for input issues
- Monitor database indexes for performance
- Regular cleanup of old scan records (consider retention policy)

## Version History

- **v1.0** (2025-12-31): Initial implementation
  - Basic barcode generation and scanning
  - Pharmacy and inventory integration
  - Comprehensive API endpoints
  - Full validation and permissions
