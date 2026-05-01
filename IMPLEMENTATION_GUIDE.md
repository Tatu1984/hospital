# Hospital ERP - Complete Implementation Guide

## PHASE 1: CRITICAL FUNCTIONAL FIXES

### ✅ COMPLETED
1. **Patient Actions** - View, Edit, Invoice buttons now functional
2. **Appointment Management** - Confirm, Reschedule, Cancel now working

### 🔧 REMAINING PHASE 1 TASKS

#### 3. OPD Prescription Features
**File**: `/frontend/src/pages/OPD.tsx`
**Issues**: Order Radiology and Schedule Follow-up buttons not working
**Fix Required**:
- Add `isRadiologyDialogOpen`, `isFollowUpDialogOpen` state
- Create `handleOrderRadiology()` function to open dialog with test selection
- Create `handleScheduleFollowUp()` function to schedule next appointment
- Add dialogs at end of component for both features

#### 4. OT Surgery Actions
**File**: `/frontend/src/pages/OperationTheatre.tsx`
**Issues**: Start, Complete, Cancel buttons not working
**Fix Required**:
- Add onClick handlers: `handleStartSurgery(id)`, `handleCompleteSurgery(id)`, `handleCancelSurgery(id)`
- Update surgery status in state
- Add API calls to backend endpoints

#### 5. Blood Bank Submissions
**File**: `/frontend/src/pages/BloodBank.tsx`
**Issues**: Donor registration and requests not displaying after submission
**Fix Required**:
- Fix `handleRegisterDonor()` to refresh donor list after submission
- Fix `handleRequestSubmit()` to refresh requests list
- Ensure state updates properly with new data

#### 6. Laboratory Auto-Submission
**File**: `/frontend/src/pages/Laboratory.tsx`
**Issues**: Results should auto-submit
**Fix Required**:
- Add "Submit Results" button to each pending test
- Create `handleSubmitResults(orderId, results)` function
- Auto-update order status to "completed"

---

## PHASE 2: MODULE COMPLETIONS

### 7. Pharmacy Module - Complete Overhaul
**File**: `/frontend/src/pages/Pharmacy.tsx`
**Current State**: Basic prescription viewing only
**Required Features**:

```typescript
// Add these interfaces and states:
interface StockItem {
  id: string;
  drugId: string;
  drugName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  mrp: number;
  purchasePrice: number;
}

interface Sale {
  id: string;
  invoiceNumber: string;
  patientName?: string;
  items: SaleItem[];
  total: number;
  paymentMode: string;
  timestamp: string;
}

// Add new tabs:
1. Stock Management (view/add/remove stock)
2. Billing/POS (RFID scanning, barcode, manual entry)
3. Sales History
4. Low Stock Alerts
5. Expiry Tracking
```

**Implementation Steps**:
1. Create Stock Management tab with Add/Remove stock dialogs
2. Create Billing/POS interface with item search and cart
3. Add RFID/Barcode scanner integration (simulate with input field)
4. Create invoice generation with print functionality
5. Add stock deduction on each sale
6. Create sales history with filters

### 8. Nursing Module - Complete Functionality
**File**: `/frontend/src/pages/NurseStation.tsx`
**Current State**: Basic patient viewing only
**Required Features**:

```typescript
// Add these sections:
1. Duty Roster Management
   - Create/Edit shifts
   - Assign nurses to wards/shifts
   - View weekly/monthly roster

2. Patient Care Tasks
   - Medication administration tracking
   - Vital signs recording (integrated)
   - Care plan execution
   - Wound care documentation

3. Handover Notes
   - Shift handover documentation
   - Critical patient alerts
   - Pending tasks transfer

4. Nurse Performance
   - Task completion rates
   - Patient satisfaction scores
```

### 9. Billing Module
**File**: `/frontend/src/pages/BillingPage.tsx`
**Issues**: New Bill button does nothing
**Fix Required**:
1. Add comprehensive billing form with:
   - Service/Procedure selection
   - Package selection
   - Lab test billing
   - Consultation fees
   - Bed charges
   - OT charges
2. Calculate total with discounts/taxes
3. Multiple payment modes (Cash, Card, UPI, Insurance)
4. Invoice generation and printing
5. Payment history tracking

### 10. IPD Billing Module
**File**: `/frontend/src/pages/InpatientBilling.tsx` (from AllModules)
**Issues**: Static, non-functional
**Fix Required**:
1. Fetch active admissions
2. Calculate daily bed charges
3. Add consultation charges
4. Add procedure/surgery charges
5. Add pharmacy charges
6. Add lab/radiology charges
7. Generate discharge summary bill
8. Partial payment support

### 11. TPA (Insurance) Module
**File**: Create `/frontend/src/pages/TPA.tsx`
**Current State**: Doesn't exist
**Required Features**:

```typescript
interface TPAClaim {
  id: string;
  claimNumber: string;
  patientId: string;
  patientName: string;
  insuranceCompany: string;
  policyNumber: string;
  admissionId?: string;
  claimAmount: number;
  approvedAmount: number;
  status: 'Submitted' | 'Approved' | 'Rejected' | 'Pending';
  submittedDate: string;
  documents: string[];
}

// Features:
1. Patient insurance details management
2. Pre-authorization requests
3. Claim submission
4. Claim status tracking
5. Document upload
6. Settlement tracking
```

---

## PHASE 3: ENHANCEMENTS

### 12. Master Data Module
**File**: Create `/frontend/src/pages/MasterData.tsx`
**Required Sections**:

```typescript
// Tabs for:
1. Drugs Master
2. Lab Tests Master
3. Radiology Tests Master
4. Procedures Master
5. Departments
6. Wards/Rooms/Beds
7. Insurance Companies
8. Referral Sources
9. Service Packages
10. Tariff Management

// Each section needs:
- List view with search/filter
- Add/Edit/Delete functionality
- Active/Inactive status
- Bulk import/export
```

### 13. System Control Module
**File**: Create `/frontend/src/pages/SystemControl.tsx`
**Required Features**:

```typescript
// Sections:
1. User Management
   - Create/Edit users
   - Role assignment
   - Permissions management
   - Password reset

2. System Settings
   - Hospital details
   - Logo upload
   - Branch management
   - SMS/Email configuration
   - Backup settings

3. Audit Logs
   - User activity tracking
   - System changes log
   - Login history

4. Reports Configuration
   - Custom report builder
   - Scheduled reports
   - Email distribution

5. Integration Settings
   - Lab equipment integration
   - DICOM/PACS settings
   - Payment gateway config
```

---

## BACKEND API REQUIREMENTS

### Routes to Add/Fix:

```typescript
// Patient Management
PUT /api/patients/:id - Update patient details

// OPD
POST /api/opd/:id/order-radiology - Order radiology tests
POST /api/opd/:id/schedule-followup - Schedule follow-up

// Surgery
POST /api/surgeries/:id/start - Start surgery
POST /api/surgeries/:id/complete - Complete surgery

// Blood Bank (Fix data persistence)
POST /api/blood-bank/donors - Save to database
POST /api/blood-bank/requests - Save to database

// Laboratory
POST /api/lab-orders/:id/submit-results - Submit results

// Pharmacy
GET /api/pharmacy/stock - Get stock items
POST /api/pharmacy/stock - Add stock
PUT /api/pharmacy/stock/:id - Update stock
POST /api/pharmacy/sales - Record sale
GET /api/pharmacy/sales - Get sales history

// Nursing
GET /api/nursing/roster - Get duty roster
POST /api/nursing/roster - Create/update roster
POST /api/nursing/medication-admin - Record medication
POST /api/nursing/handover - Save handover notes

// Billing
POST /api/billing/opd - Create OPD bill
POST /api/billing/ipd/:admissionId - Get IPD bill details
POST /api/billing/ipd/:admissionId/pay - Record IPD payment

// TPA
POST /api/tpa/claims - Submit claim
PUT /api/tpa/claims/:id - Update claim status
GET /api/tpa/claims - Get all claims

// Master Data
GET /api/master/:type - Get master data by type
POST /api/master/:type - Add master record
PUT /api/master/:type/:id - Update master record
DELETE /api/master/:type/:id - Delete master record

// System Control
GET /api/users - Get all users
POST /api/users - Create user
PUT /api/users/:id - Update user
GET /api/audit-logs - Get audit logs
GET /api/system-settings - Get settings
PUT /api/system-settings - Update settings
```

---

## PRIORITY IMPLEMENTATION ORDER

### Immediate (Next 2 hours):
1. ✅ Patient actions - DONE
2. ✅ Appointment management - DONE
3. OPD prescription features (critical for clinical workflow)
4. OT surgery actions (critical for surgical department)
5. Blood Bank fixes (critical for emergency situations)

### High Priority (Next 4 hours):
6. Laboratory auto-submission
7. Pharmacy module overhaul (most used module)
8. Billing module (revenue critical)
9. IPD Billing (discharge workflow)

### Medium Priority (Next 6 hours):
10. Nursing module completion
11. TPA module creation
12. Master Data module

### Lower Priority (Final polish):
13. System Control enhancements
14. Advanced reporting features
15. UI/UX improvements

---

## Testing Checklist

After implementation, verify:
- [ ] Can register and edit patients
- [ ] Can create, confirm, reschedule appointments
- [ ] Can order radiology from OPD
- [ ] Can start/complete surgeries
- [ ] Blood bank data persists after submission
- [ ] Lab results can be submitted
- [ ] Pharmacy can add stock and process sales
- [ ] Can generate OPD and IPD bills
- [ ] Nursing roster can be managed
- [ ] TPA claims can be submitted
- [ ] Master data can be managed
- [ ] System settings can be configured

---

## Deployment Notes

1. Database migrations needed for new tables
2. Seed data required for master tables
3. Environment variables for external integrations
4. Backup strategy before production deployment
5. User training documentation
6. API documentation generation

