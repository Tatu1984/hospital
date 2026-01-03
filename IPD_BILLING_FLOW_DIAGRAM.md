# IPD Billing Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│                    IPDBilling.tsx                                │
│                                                                   │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Admissions     │  │ Bill Dialog  │  │  Payment Dialog  │   │
│  │  Table          │  │              │  │                  │   │
│  │  - List         │  │ - Charges    │  │  - Amount        │   │
│  │  - Filter       │  │ - Summary    │  │  - Mode          │   │
│  │  - Actions      │  │ - Payments   │  │  - Reference     │   │
│  └─────────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            ↓ ↑ API Calls
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND                                   │
│                      server.ts                                   │
│                                                                   │
│  API Endpoints:                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ GET  /api/ipd-billing/admissions      → List admissions   │ │
│  │ GET  /api/ipd-billing/:id             → Full bill details │ │
│  │ GET  /api/ipd-billing/:id/charges     → Detailed charges  │ │
│  │ GET  /api/ipd-billing/:id/summary     → Quick summary     │ │
│  │ POST /api/ipd-billing                 → Save bill         │ │
│  │ POST /api/ipd-billing/:id/pay         → Record payment    │ │
│  │ POST /api/ipd-billing/:id/generate    → Generate bill     │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            ↓ ↑ Prisma ORM
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE                                   │
│                    PostgreSQL                                    │
│                                                                   │
│  ┌──────────┐  ┌───────────┐  ┌────────┐  ┌─────────┐         │
│  │Admission │→ │ Encounter │→ │ Order  │  │ Invoice │          │
│  └──────────┘  └───────────┘  └────────┘  └─────────┘          │
│       ↓              ↓                           ↓               │
│  ┌──────────┐  ┌───────────┐             ┌─────────┐           │
│  │   Bed    │  │  Patient  │             │ Payment │           │
│  └──────────┘  └───────────┘             └─────────┘           │
│       ↓                                                          │
│  ┌──────────┐                                                   │
│  │   Ward   │                                                   │
│  └──────────┘                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Billing Flow Sequence

```
┌──────┐
│Patient│
└───┬──┘
    │
    │ 1. Admission
    ▼
┌────────────┐
│ Admission  │
│  Created   │──────┐
└────────────┘      │
                    │ 2. Bed Assigned
                    ▼
              ┌──────────┐
              │   Bed    │
              │ Allocated│
              └──────────┘
                    │
                    │ 3. Services Ordered
                    ▼
         ┌─────────────────────┐
         │    Orders Created   │
         ├─────────────────────┤
         │ - Lab Tests         │
         │ - Medications       │
         │ - Radiology         │
         │ - Procedures        │
         └─────────────────────┘
                    │
                    │ 4. Generate Bill
                    ▼
         ┌─────────────────────┐
         │ Calculate Charges:  │
         ├─────────────────────┤
         │ ✓ Bed Charges       │
         │ ✓ Nursing Charges   │
         │ ✓ Consultation      │
         │ ✓ Lab Tests         │
         │ ✓ Medications       │
         │ ✓ Radiology         │
         │ ✓ Procedures        │
         │ ✓ Misc. Charges     │
         └─────────────────────┘
                    │
                    │ 5. Apply Discount/Tax
                    ▼
         ┌─────────────────────┐
         │  Subtotal: 10,000   │
         │  Discount:   -500   │
         │  Tax:        +475   │
         │  ─────────────────  │
         │  Total:     9,975   │
         └─────────────────────┘
                    │
                    │ 6. Save Invoice
                    ▼
              ┌──────────┐
              │ Invoice  │
              │  Saved   │
              └──────────┘
                    │
                    │ 7. Record Payments
                    ▼
         ┌─────────────────────┐
         │  Payment 1: 5,000   │
         │  Payment 2: 4,975   │
         │  ─────────────────  │
         │  Balance:      0    │
         └─────────────────────┘
                    │
                    │ 8. Discharge
                    ▼
         ┌─────────────────────┐
         │  Patient Discharged │
         │  Bed Released       │
         │  Invoice Finalized  │
         └─────────────────────┘
```

## Charge Calculation Flow

```
                ┌─────────────────┐
                │   Admission     │
                │   Created       │
                └────────┬────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
   ┌─────────┐    ┌──────────┐    ┌──────────┐
   │  Days   │    │   Bed    │    │  Orders  │
   │Calculate│    │ Category │    │  Fetch   │
   └────┬────┘    └─────┬────┘    └─────┬────┘
        │               │               │
        │               │               │
        ▼               ▼               ▼
   Days = 3        Rate = 1500    Parse Orders
        │               │               │
        │               │               │
        ├───────────────┴───────────────┤
        │                               │
        ▼                               ▼
   ┌──────────────┐            ┌────────────────┐
   │ Fixed Charges│            │ Order Charges  │
   ├──────────────┤            ├────────────────┤
   │ Bed: 4,500   │            │ Lab:     1,300 │
   │ Nursing: 900 │            │ Pharmacy:  270 │
   │ Consult: 500 │            │ Radiology: 600 │
   └──────┬───────┘            │ Procedure: 300 │
          │                    └────────┬───────┘
          │                             │
          └──────────┬──────────────────┘
                     │
                     ▼
              ┌─────────────┐
              │  Sum All    │
              │  Charges    │
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │  Subtotal   │
              │   8,370     │
              └──────┬──────┘
                     │
       ┌─────────────┼─────────────┐
       │                           │
       ▼                           ▼
 ┌──────────┐              ┌────────────┐
 │ Discount │              │    Tax     │
 │ 5% = 418 │              │ 5% = 398   │
 └─────┬────┘              └──────┬─────┘
       │                          │
       └────────┬───────────────┬─┘
                │               │
                ▼               ▼
         8,370 - 418 + 398 = 8,350
                │
                ▼
         ┌─────────────┐
         │Grand Total  │
         │   8,350     │
         └─────────────┘
```

## Payment Flow

```
┌──────────────┐
│ Invoice      │
│ Total: 8,350 │
│ Paid:  0     │
│ Balance:8,350│
└──────┬───────┘
       │
       │ Payment 1
       ▼
┌──────────────┐
│ Cash: 5,000  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Invoice      │
│ Total: 8,350 │
│ Paid:  5,000 │
│ Balance:3,350│
│ Status:      │
│ PARTIAL      │
└──────┬───────┘
       │
       │ Payment 2
       ▼
┌──────────────┐
│ Card: 3,350  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Invoice      │
│ Total: 8,350 │
│ Paid:  8,350 │
│ Balance:  0  │
│ Status:      │
│   PAID       │
└──────────────┘
```

## Order to Charge Conversion

```
┌────────────────────────────────────────────────────┐
│               ORDER CREATED                        │
├────────────────────────────────────────────────────┤
│ Type: Lab Test                                     │
│ Details: {                                         │
│   tests: [                                         │
│     {testName: "CBC", price: 500},                │
│     {testName: "Lipid Profile", price: 800}       │
│   ]                                                │
│ }                                                  │
└────────────────┬───────────────────────────────────┘
                 │
                 │ Bill Generation
                 ▼
┌────────────────────────────────────────────────────┐
│            CHARGES CREATED                         │
├────────────────────────────────────────────────────┤
│ Charge 1:                                          │
│   Category: lab                                    │
│   Description: CBC                                 │
│   Quantity: 1                                      │
│   Unit Price: 500                                  │
│   Total: 500                                       │
├────────────────────────────────────────────────────┤
│ Charge 2:                                          │
│   Category: lab                                    │
│   Description: Lipid Profile                       │
│   Quantity: 1                                      │
│   Unit Price: 800                                  │
│   Total: 800                                       │
└────────────────────────────────────────────────────┘
```

## Category Breakdown Visualization

```
                    TOTAL BILL: Rs. 8,370
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
  ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
  │  Bed    │        │  Prof.  │        │Services │
  │ Charges │        │Services │        │ Charges │
  └────┬────┘        └────┬────┘        └────┬────┘
       │                  │                   │
   Rs. 4,500          Rs. 500            Rs. 3,370
       │                  │                   │
   (54%)              (6%)               (40%)
                          │
              ┌───────────┼───────────┐
              │           │           │
         ┌────▼────┐ ┌───▼────┐ ┌───▼─────┐
         │   Lab   │ │Radiology││Pharmacy │
         │ Rs.1,300│ │ Rs. 600 ││ Rs. 270 │
         └─────────┘ └─────────┘ └─────────┘
              │           │           │
          (15.5%)     (7.2%)      (3.2%)
```

## Status Transitions

```
┌──────────┐    Save Bill    ┌──────────┐
│          │ ──────────────> │          │
│  Draft   │                 │ Pending  │
│          │ <────────────── │          │
└──────────┘   Edit/Delete   └────┬─────┘
                                   │
                              Partial Payment
                                   │
                                   ▼
                             ┌──────────┐
                             │          │
                             │ Partial  │
                             │          │
                             └────┬─────┘
                                  │
                            Full Payment
                                  │
                                  ▼
                             ┌──────────┐
                             │          │
                             │   Paid   │
                             │          │
                             └──────────┘
```

## Data Relationships

```
Patient
   │
   ├──> Admission
   │       │
   │       ├──> Encounter
   │       │       │
   │       │       ├──> Orders (Lab, Pharmacy, etc.)
   │       │       │
   │       │       └──> Invoice
   │       │               │
   │       │               └──> Payments
   │       │
   │       └──> Bed
   │               │
   │               └──> Ward (Tariff)
   │
   └──> Insurance (Optional)
```

## Complete Billing Workflow

```
START
  │
  ├─> Is patient admitted?
  │     │
  │     └─> NO: Create Admission
  │     │
  │     └─> YES: Continue
  │
  ├─> Generate Bill clicked
  │
  ├─> Calculate Duration
  │     │
  │     └─> Days = Discharge Date - Admission Date
  │
  ├─> Get Bed Rate
  │     │
  │     ├─> Check Ward Tariff
  │     └─> Else use Category Rate
  │
  ├─> Calculate Fixed Charges
  │     │
  │     ├─> Bed Charges (Days × Rate)
  │     ├─> Nursing Charges (Days × 300)
  │     └─> Consultation (Default 500)
  │
  ├─> Fetch All Orders
  │     │
  │     └─> Filter: Not Cancelled
  │
  ├─> Convert Orders to Charges
  │     │
  │     ├─> Lab Orders → Lab Charges
  │     ├─> Pharmacy Orders → Pharmacy Charges
  │     ├─> Radiology Orders → Radiology Charges
  │     ├─> Procedure Orders → Procedure Charges
  │     └─> Other Orders → Misc Charges
  │
  ├─> Calculate Subtotal
  │     │
  │     └─> Sum of all charges
  │
  ├─> Apply Discount
  │     │
  │     └─> Subtotal × (Discount % / 100)
  │
  ├─> Calculate Tax Base
  │     │
  │     └─> Subtotal - Discount
  │
  ├─> Apply Tax
  │     │
  │     └─> Tax Base × (Tax % / 100)
  │
  ├─> Calculate Grand Total
  │     │
  │     └─> Subtotal - Discount + Tax
  │
  ├─> Display Bill to User
  │
  ├─> User Reviews and Edits
  │     │
  │     ├─> Add Manual Charges?
  │     ├─> Adjust Discount?
  │     └─> Adjust Tax?
  │
  ├─> Save Bill
  │     │
  │     └─> Create/Update Invoice
  │
  ├─> Record Payments
  │     │
  │     ├─> Payment 1, 2, 3...
  │     └─> Update Balance
  │
  ├─> Is Balance Zero?
  │     │
  │     ├─> YES: Mark Paid
  │     └─> NO: Mark Partial
  │
  ├─> Discharge Patient?
  │     │
  │     ├─> YES: Update Admission Status
  │     │         Release Bed
  │     │
  │     └─> NO: Keep Active
  │
END
```

---

These diagrams illustrate the complete IPD Billing system flow from patient admission to final payment and discharge. All components are integrated and work together to provide a comprehensive billing solution.
