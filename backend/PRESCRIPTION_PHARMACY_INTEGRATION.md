# Prescription-to-Pharmacy Integration Implementation

This document describes the prescription-to-pharmacy integration workflow implemented in the Hospital ERP system.

## Overview

This integration allows prescriptions created in OPD/IPD to be seamlessly dispensed through the pharmacy module, with complete tracking of stock deduction, patient billing, and prescription status.

## Database Changes

### 1. Prescription Model Updates
- **Added Fields:**
  - `patientId` (String, required): Direct link to patient for easier querying
  - `status` (String, default: "pending"): Tracks prescription dispensing status
    - Values: `pending`, `partial`, `dispensed`
  - `admissionId` (String, optional): Link to IPD admission if applicable
  - `updatedAt` (DateTime): Track when prescription status changes

- **Modified Fields:**
  - `opdNoteId` (String, now optional): Made optional to support IPD prescriptions

- **Indexes Added:**
  - `patientId` index for faster patient-based queries
  - `status` index for filtering pending prescriptions

### 2. PharmacySale Model Updates
- **Added Fields:**
  - `prescriptionId` (String, optional): Links sale to prescription if dispensed from a prescription

- **Indexes Added:**
  - `prescriptionId` index for linking sales to prescriptions

## API Endpoints

### 1. GET /api/pharmacy/prescriptions
**Purpose:** Get pending prescriptions for dispensing

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `partial`, `dispensed`)
  - Default: Returns `pending` and `partial` prescriptions

**Response:**
```json
[
  {
    "id": "prescription-id",
    "patientId": "patient-id",
    "patientName": "John Doe",
    "patientMRN": "MRN001",
    "patientContact": "+1234567890",
    "doctorId": "doctor-id",
    "doctorName": "Dr. Smith",
    "drugs": [
      {
        "drugId": "drug-id",
        "drugName": "Paracetamol",
        "dosage": "500mg",
        "frequency": "TDS",
        "duration": "5 days",
        "quantity": 15,
        "instructions": "After meals"
      }
    ],
    "status": "pending",
    "createdAt": "2025-12-31T10:00:00.000Z",
    "updatedAt": "2025-12-31T10:00:00.000Z"
  }
]
```

### 2. GET /api/pharmacy/prescription/:id
**Purpose:** Get detailed prescription information for dispensing

**Path Parameters:**
- `id`: Prescription ID

**Response:**
```json
{
  "id": "prescription-id",
  "patientId": "patient-id",
  "patientName": "John Doe",
  "patientMRN": "MRN001",
  "patientContact": "+1234567890",
  "patientAllergies": "Penicillin",
  "doctorId": "doctor-id",
  "doctorName": "Dr. Smith",
  "drugs": [
    {
      "drugId": "drug-id",
      "drugName": "Paracetamol",
      "genericName": "Acetaminophen",
      "form": "Tablet",
      "strength": "500mg",
      "dosage": "500mg",
      "frequency": "TDS",
      "duration": "5 days",
      "quantity": 15,
      "instructions": "After meals",
      "unitPrice": 5.00,
      "stockQuantity": 500,
      "availableBatches": [
        {
          "id": "batch-id",
          "batchNumber": "BATCH001",
          "quantity": 100,
          "expiryDate": "2026-12-31T00:00:00.000Z",
          "mrp": 6.00
        }
      ]
    }
  ],
  "status": "pending",
  "createdAt": "2025-12-31T10:00:00.000Z",
  "updatedAt": "2025-12-31T10:00:00.000Z",
  "previousDispenses": []
}
```

### 3. POST /api/pharmacy/dispense
**Purpose:** Dispense prescription items and create pharmacy sale

**Request Body:**
```json
{
  "prescriptionId": "prescription-id",
  "items": [
    {
      "drugId": "drug-id",
      "quantity": 10,
      "batchNumber": "BATCH001" // optional, uses FIFO if not specified
    }
  ],
  "paymentMode": "cash" // optional, defaults to "cash"
}
```

**Response:**
```json
{
  "message": "Prescription dispensed successfully",
  "sale": {
    "id": "sale-id",
    "invoiceNumber": "INV-1234567890-ABC123",
    "total": 50.00,
    "items": [
      {
        "drugId": "drug-id",
        "drugName": "Paracetamol",
        "batchNumber": "BATCH001",
        "quantity": 10,
        "unitPrice": 5.00,
        "total": 50.00
      }
    ]
  },
  "prescriptionStatus": "partial" // or "dispensed" if fully dispensed
}
```

**Validation:**
- Checks drug stock availability
- Validates batch expiry dates
- Ensures drugs are active
- Prevents dispensing expired batches
- Validates prescription exists and not already fully dispensed

## Workflow

### 1. Prescription Creation (OPD/IPD)
When a doctor creates a prescription in OPD:
1. Prescription is created with `status: "pending"`
2. `patientId` is automatically set
3. `opdNoteId` links to the OPD note
4. Prescription appears in pharmacy queue

### 2. Prescription Dispensing (Pharmacy)
Pharmacist workflow:
1. View pending prescriptions via GET /api/pharmacy/prescriptions
2. Select a prescription to dispense
3. Get full details via GET /api/pharmacy/prescription/:id
   - See patient allergies
   - View drug stock availability
   - Check available batches and expiry dates
4. Dispense items via POST /api/pharmacy/dispense
   - Select drugs and quantities to dispense
   - Optionally specify batch numbers
   - System automatically:
     - Validates stock and expiry
     - Deducts from stock using FIFO (First Expiry First Out)
     - Creates pharmacy sale with invoice
     - Updates prescription status (partial/dispensed)
     - Links sale to prescription

### 3. Stock Deduction (FIFO)
The system implements FIFO (First Expiry First Out) for stock deduction:
- If batch number specified: Deducts from that specific batch
- If batch not specified: Automatically deducts from oldest expiring batches first
- Skips expired batches
- Updates both batch-level and drug-level stock quantities

### 4. Prescription Status Tracking
- **pending**: No items dispensed yet
- **partial**: Some items dispensed, but not all
- **dispensed**: All items fully dispensed

## Integration Points

### OPD Module
- File: `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/server.ts`
- Prescription creation includes `patientId` and `status` fields
- Default status is "pending"

### Pharmacy Module
- File: `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/routes/pharmacy.ts`
- Three new endpoints for prescription management
- Enhanced stock validation and FIFO logic
- Automatic prescription status updates

### PharmacySale Integration
- Existing pharmacy sales flow remains unchanged
- New sales can optionally link to prescriptions via `prescriptionId`
- Walk-in sales (without prescription) continue to work as before

## Validations

1. **Stock Validation**
   - Checks total drug stock quantity
   - Validates batch-specific stock if batch number provided
   - Ensures sufficient non-expired stock available

2. **Expiry Validation**
   - Prevents dispensing expired batches
   - Only considers non-expired batches in FIFO logic

3. **Drug Validation**
   - Ensures drug exists
   - Checks drug is active

4. **Prescription Validation**
   - Verifies prescription exists
   - Prevents re-dispensing fully dispensed prescriptions

## Migration

A migration script has been created to apply database changes:

**File:** `/Users/sudipto/Desktop/projects/hospitalerp/backend/apply-prescription-migration.js`

**To apply migration:**
```bash
node apply-prescription-migration.js
```

**Migration changes:**
- Adds new columns to prescriptions table
- Adds new column to pharmacy_sales table
- Creates indexes for better performance
- Updates existing prescriptions with patientId from opdNote

## Testing Checklist

- [ ] Create OPD note with prescription
- [ ] Verify prescription appears in pending list
- [ ] View prescription details with stock info
- [ ] Dispense partial prescription
- [ ] Verify prescription status is "partial"
- [ ] Verify stock deducted correctly
- [ ] Verify pharmacy sale created with prescriptionId
- [ ] Dispense remaining items
- [ ] Verify prescription status is "dispensed"
- [ ] Test with expired batches (should skip)
- [ ] Test with insufficient stock (should fail gracefully)
- [ ] Test FIFO logic with multiple batches

## Future Enhancements

1. **IPD Integration**: Support prescriptions from IPD admissions
2. **Partial Dispensing History**: Track individual dispense transactions
3. **Return/Refund**: Handle prescription returns
4. **Drug Substitution**: Allow pharmacist to substitute with generic equivalents
5. **Prescription Expiry**: Add expiry date to prescriptions
6. **Stock Reservation**: Reserve stock when prescription created
7. **Prescription Printing**: Generate prescription labels
8. **Batch Selection UI**: Enhanced batch selection interface
9. **Stock Alerts**: Alert when trying to dispense near-expiry batches
10. **Audit Trail**: Track who dispensed what and when
