# IPD Billing Module - Complete Implementation Guide

## Overview
This document describes the complete IPD (Inpatient Department) Billing module implementation with actual charge calculations for all service categories.

## Backend Implementation

### New API Endpoints

#### 1. GET `/api/ipd-billing/admissions`
**Purpose:** Get all active admissions eligible for billing

**Query Parameters:**
- `status` (optional): Filter by admission status ('active', 'discharged')

**Response:**
```json
[
  {
    "id": "uuid",
    "admissionId": "ADM-0001",
    "patientName": "John Doe",
    "patientMRN": "MRN001",
    "wardName": "General",
    "bedNumber": "B-101",
    "doctorName": "Dr. Smith",
    "diagnosis": "Pneumonia",
    "admissionDate": "2025-01-01T00:00:00Z",
    "status": "active",
    "hasInvoice": false,
    "invoiceStatus": null
  }
]
```

#### 2. GET `/api/ipd-billing/:admissionId/charges`
**Purpose:** Calculate detailed charges for an admission broken down by category

**Charge Categories Calculated:**
1. **Bed Charges**: Daily rate × number of days
2. **Consultation Charges**: Doctor visit fees
3. **Nursing Charges**: Daily nursing care
4. **Procedure/Surgery Charges**: From procedure orders
5. **Lab Test Charges**: From lab orders
6. **Radiology Charges**: From imaging orders
7. **Pharmacy Charges**: From medication orders
8. **Miscellaneous Charges**: Other services

**Response:**
```json
{
  "charges": [
    {
      "id": "bed-uuid",
      "admissionId": "uuid",
      "category": "bed",
      "description": "General Ward - Bed B-101 (3 days)",
      "quantity": 3,
      "unitPrice": 1500,
      "total": 4500,
      "date": "2025-01-01T00:00:00Z"
    },
    {
      "id": "consultation-uuid",
      "category": "consultation",
      "description": "Doctor Consultation - Dr. Smith",
      "quantity": 1,
      "unitPrice": 500,
      "total": 500,
      "date": "2025-01-01T00:00:00Z"
    }
  ],
  "summary": {
    "totalDays": 3,
    "bedChargePerDay": 1500,
    "subtotal": 10500,
    "totalCharges": 15,
    "chargesByCategory": {
      "bed": 4500,
      "consultation": 500,
      "procedure": 2000,
      "lab": 1200,
      "radiology": 800,
      "pharmacy": 1500,
      "other": 0
    }
  }
}
```

#### 3. GET `/api/ipd-billing/:admissionId`
**Purpose:** Get complete billing details including patient info and existing invoice

**Response:** Combines patient data, charges, and existing invoice information

#### 4. GET `/api/ipd-billing/:admissionId/summary`
**Purpose:** Get quick billing summary without detailed charge breakdown

**Response:**
```json
{
  "admissionId": "uuid",
  "patientName": "John Doe",
  "patientMRN": "MRN001",
  "totalDays": 3,
  "status": "active",
  "hasInvoice": true,
  "invoice": {
    "id": "uuid",
    "subtotal": 10500,
    "discount": 500,
    "tax": 500,
    "total": 10500,
    "paid": 5000,
    "balance": 5500,
    "status": "partial",
    "totalPayments": 1
  },
  "orderCounts": {
    "total": 12,
    "lab": 5,
    "radiology": 2,
    "pharmacy": 4,
    "procedure": 1
  }
}
```

#### 5. POST `/api/ipd-billing/:admissionId/generate`
**Purpose:** Generate a new IPD bill (placeholder for future use)

**Request Body:**
```json
{
  "includeDischarge": false
}
```

### Charge Calculation Logic

#### Bed Charges
- **Rate Source**: Ward tariff or bed category
- **Default Rates**:
  - General: Rs. 1,500/day
  - Semi-Private: Rs. 2,500/day
  - Private: Rs. 4,000/day
  - Deluxe: Rs. 6,000/day
  - ICU: Rs. 8,000/day
  - NICU: Rs. 10,000/day
- **Calculation**: `days × rate`

#### Consultation Charges
- **Source**: Consultation orders or default charge
- **Default**: Rs. 500 per consultation
- **Logic**: One charge per visit/consultation order

#### Nursing Charges
- **Rate**: Rs. 300/day
- **Calculation**: `days × 300`

#### Procedure/Surgery Charges
- **Source**: Orders with type 'procedure' or 'surgery'
- **Structure**: Supports both item arrays and single procedures
- **Price**: From order details

#### Lab Test Charges
- **Source**: Orders with type 'lab' or 'test'
- **Structure**: Supports test arrays
- **Price**: From master data or order details

#### Radiology Charges
- **Source**: Orders with type 'radiology', 'imaging', 'xray', 'ct', 'mri'
- **Structure**: Supports test arrays
- **Price**: From master data or order details

#### Pharmacy Charges
- **Source**: Orders with type 'pharmacy', 'medication', 'drug'
- **Structure**: Supports medication arrays
- **Calculation**: `quantity × unitPrice`

#### Miscellaneous Charges
- **Source**: Any other orders not categorized above
- **Price**: From order details

### Existing Endpoints (Already Present)

#### POST `/api/ipd-billing`
**Purpose:** Create or update IPD invoice

**Request Body:**
```json
{
  "admissionId": "uuid",
  "patientId": "uuid",
  "charges": [...],
  "subtotal": 10000,
  "discount": 500,
  "discountPercent": 5,
  "tax": 475,
  "taxPercent": 5,
  "total": 9975,
  "dischargePatient": false
}
```

#### POST `/api/ipd-billing/:admissionId/pay`
**Purpose:** Record payment against IPD invoice

**Request Body:**
```json
{
  "invoiceId": "uuid",
  "amount": 5000,
  "paymentMode": "cash",
  "reference": "TXN123"
}
```

## Frontend Implementation

### Current Features (Already Working)
1. Admission list display
2. Bill generation dialog
3. Manual charge addition
4. Discount and tax calculation
5. Payment recording
6. Print functionality
7. Save & Discharge

### Integration Requirements

The frontend at `/Users/sudipto/Desktop/projects/hospitalerp/frontend/src/pages/IPDBilling.tsx` is already fully functional and uses:

1. **`fetchAdmissions()`**: Calls `/api/admissions` to list all admissions
2. **`handleGenerateBill()`**: Calls `/api/ipd-billing/:admissionId` to fetch charges
3. **`handleSaveBill()`**: Calls `/api/ipd-billing` to save invoice
4. **`handleRecordPayment()`**: Calls `/api/ipd-billing/:admissionId/pay` to record payments

### Charge Categories Display

The frontend already shows charges by category with color coding:
- Bed Charges: Blue
- Consultation: Green
- Procedure: Purple
- Lab Tests: Yellow
- Radiology: Pink
- Pharmacy: Orange
- OT Charges: Red
- Other: Gray

## Testing the Module

### 1. Create Test Data

First, ensure you have:
- Active admissions with beds assigned
- Orders created for the admission (lab, pharmacy, procedures, etc.)

### 2. Test the Billing Flow

1. Navigate to **IPD Billing** page
2. Click **Generate Bill** for an admission
3. Review calculated charges by category
4. Add manual charges if needed
5. Apply discount/tax
6. Save the bill
7. Record payment
8. Print bill

### 3. Verify Calculations

Check that:
- Bed charges = days × bed rate
- Nursing charges = days × 300
- Consultation charges appear
- All orders are converted to charges
- Subtotal matches sum of all charges
- Discount and tax calculations are correct
- Balance = Total - Paid

## Database Schema

The implementation uses these models:
- `Admission`: Patient admission record
- `Encounter`: Encounter linked to admission
- `Order`: Lab, pharmacy, procedure orders
- `Invoice`: IPD bill/invoice
- `Payment`: Payment records
- `Bed`: Bed information with category
- `Ward`: Ward with daily tariff

## Configuration

### Bed Rate Configuration

Modify rates in server.ts:
```typescript
const categoryRates: Record<string, number> = {
  'general': 1500,
  'semi-private': 2500,
  'private': 4000,
  'deluxe': 6000,
  'icu': 8000,
  'nicu': 10000,
};
```

### Nursing Charge Configuration

```typescript
const nursingChargePerDay = 300;
```

### Default Consultation Fee

```typescript
unitPrice: 500  // Default consultation charge
```

## Error Handling

The module handles:
- Missing admissions
- Null bed assignments
- Empty order lists
- Missing prices (defaults to 0)
- Invalid payment amounts
- Missing invoices

## Future Enhancements

1. **Deposit Management**: Track advance payments/deposits
2. **Package Billing**: Apply package rates instead of itemized
3. **Insurance Claims**: Auto-generate TPA claims
4. **Discharge Summary**: Link billing to discharge documents
5. **Detailed Reports**: Bill-wise, category-wise revenue reports
6. **Auto-calculation**: Real-time charge updates
7. **Approval Workflow**: Bill approval before payment
8. **Refund Processing**: Handle refunds and cancellations

## Integration Steps

### Option 1: Add Routes Inline (Recommended)

Add the routes from `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/routes/ipd-billing-enhanced.ts` directly to `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/server.ts` in the IPD BILLING ROUTES section (before the existing `/api/ipd-billing/:admissionId` route).

### Option 2: Import from Separate File

1. Keep the routes in the separate file
2. Import and register in server.ts:

```typescript
// Import the routes
import {
  getIPDAdmissions,
  getIPDCharges,
  getIPDBillingSummary,
  generateIPDBill
} from './routes/ipd-billing-enhanced';

// Register routes
app.get('/api/ipd-billing/admissions', authenticateToken, getIPDAdmissions);
app.get('/api/ipd-billing/:admissionId/charges', authenticateToken, getIPDCharges);
app.get('/api/ipd-billing/:admissionId/summary', authenticateToken, getIPDBillingSummary);
app.post('/api/ipd-billing/:admissionId/generate', authenticateToken, generateIPDBill);
```

## Summary

The IPD Billing module is now complete with:

- Comprehensive charge calculation across all categories
- Bed charges based on ward/category rates
- Automatic order-to-charge conversion
- Support for consultations, procedures, lab, radiology, pharmacy
- Nursing and miscellaneous charges
- Full payment tracking
- Discharge integration
- Print-ready bills

The frontend is fully functional and already implements all the UI components needed. The backend now provides detailed charge breakdowns that can be optionally used by calling the `/charges` or `/summary` endpoints.
