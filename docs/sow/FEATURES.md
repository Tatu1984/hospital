# Hospital ERP — Feature List

**Repository:** `Tatu1984/hospital`  ·  **Branch:** `develop`  ·  **Audience:** Product, Clinical, Engineering, QA

This document is the authoritative catalogue of features in the Hospital ERP. Every module below is grouped into:

- **Core capabilities** — primary user-visible flows
- **Sub-features** — discrete actions/screens within the module
- **Data entities** — primary Prisma models used
- **Acceptance criteria** — what "done" looks like
- **Status** — ✅ Implemented · 🟡 Partial · 🟦 Planned

---

## Table of contents

1. [Patient Management](#1-patient-management)
2. [Appointment & Front-Office](#2-appointment--front-office)
3. [OPD (Outpatient)](#3-opd-outpatient)
4. [IPD (Inpatient)](#4-ipd-inpatient)
5. [Emergency Room (ER)](#5-emergency-room-er)
6. [ICU](#6-icu)
7. [Operation Theatre (OT) & Surgery](#7-operation-theatre-ot--surgery)
8. [Laboratory](#8-laboratory)
9. [Radiology / Imaging](#9-radiology--imaging)
10. [Phlebotomy](#10-phlebotomy)
11. [Pharmacy](#11-pharmacy)
12. [Blood Bank](#12-blood-bank)
13. [Inventory & Purchase Orders](#13-inventory--purchase-orders)
14. [Billing & Invoicing](#14-billing--invoicing)
15. [TPA / Insurance](#15-tpa--insurance)
16. [Doctor Accounting & Commissions](#16-doctor-accounting--commissions)
17. [Accounting (GL / Ledger / Tally)](#17-accounting-gl--ledger--tally)
18. [HR & Payroll](#18-hr--payroll)
19. [Biometric Attendance](#19-biometric-attendance)
20. [Ambulance](#20-ambulance)
21. [Housekeeping & Laundry](#21-housekeeping--laundry)
22. [Diet / Kitchen](#22-diet--kitchen)
23. [CSSD (Sterilization)](#23-cssd-sterilization)
24. [Quality & Incident Management](#24-quality--incident-management)
25. [Health Checkup Packages](#25-health-checkup-packages)
26. [Mortuary, Physiotherapy, Mortuary, MRD](#26-mortuary-physiotherapy-mrd)
27. [DICOM / PACS](#27-dicom--pacs)
28. [MIS & Analytics](#28-mis--analytics)
29. [Master Data](#29-master-data)
30. [Authentication, Roles & RBAC](#30-authentication-roles--rbac)
31. [Audit, Compliance & Security](#31-audit-compliance--security)
32. [System Administration](#32-system-administration)
33. [Multi-tenant & Multi-branch](#33-multi-tenant--multi-branch)
34. [Notifications](#34-notifications)
35. [Cross-cutting NFRs](#35-cross-cutting-nfrs)

---

## 1. Patient Management

**Core capability:** Create, search, update, and view patients with full demographics, identity, and clinical context. Each patient is uniquely identified by an auto-generated UHID.

| Sub-feature | Status | Notes |
|---|---|---|
| Register new patient (demographics, contact, ID proof, blood group) | ✅ | `POST /api/patients` |
| Search patients (name, UHID, phone, age, gender) | ✅ | `GET /api/patients?q=...` |
| Patient profile view (timeline of OPD/IPD/lab/pharmacy) | ✅ | `GET /api/patients/:id` |
| Update demographics | ✅ | `PUT /api/patients/:id` |
| Patient insurance linkage (multiple policies) | ✅ | `PatientInsurance` model |
| MRD / medical record number management | 🟡 | Page exists; flows partial |
| Photo upload | 🟦 | Planned (object storage) |
| Patient portal login | 🟦 | Planned phase 2 |

**Entities:** `Patient`, `PatientInsurance`, `Encounter`, `Admission`
**Acceptance:** A patient registered at one branch is visible (with permissions) across the tenant; UHID is unique per tenant; PHI access is logged in `AuditLog`.

---

## 2. Appointment & Front-Office

**Core capability:** Slot-based booking with doctor calendars, walk-in registration, token generation, and check-in.

| Sub-feature | Status | Notes |
|---|---|---|
| Create appointment (doctor, slot, patient, dept) | ✅ | `POST /api/appointments` |
| List / filter appointments (date, doctor, status) | ✅ | `GET /api/appointments` |
| Reschedule | ✅ | `PUT /api/appointments/:id` |
| Cancel appointment | ✅ | `POST /api/appointments/:id/cancel` |
| Check-in (token issued, encounter primed) | ✅ | `POST /api/appointments/:id/check-in` |
| Delete appointment | ✅ | `DELETE /api/appointments/:id` |
| Walk-in flow → registration → token | ✅ | UI: `Appointment.tsx`, `Front Office` |
| SMS / WhatsApp confirmation | 🟦 | Planned |
| Doctor availability calendar | 🟡 | Slot model exists, calendar UI partial |

**Entities:** `Appointment`, `Patient`, `User` (doctor)

---

## 3. OPD (Outpatient)

**Core capability:** Doctor-led consultation flow producing an `Encounter`, OPD note, prescription, and orders.

| Sub-feature | Status | Notes |
|---|---|---|
| Create encounter on check-in | ✅ | `POST /api/encounters` |
| OPD clinical notes (chief complaint, exam, plan) | ✅ | `POST /api/opd-notes` |
| Vitals capture (BP, HR, SpO₂, temp, weight, height, BMI) | ✅ | Stored on encounter |
| Prescription (drug, dose, frequency, duration) | ✅ | `Prescription` model |
| Lab / radiology / procedure orders from OPD | ✅ | Linked back to encounter |
| Doctor assistant view (next patient, queue) | ✅ | `DoctorAssistant.tsx` |
| OPD clinical notes UI | ✅ | `OPDClinical.tsx` |
| Discharge / advice / follow-up scheduling | ✅ |  |
| Print OPD slip | 🟡 | jsPDF wired, layout pending |

**Entities:** `Encounter`, `OPDNote`, `Prescription`, `Order`

---

## 4. IPD (Inpatient)

**Core capability:** Admission, bed allocation, daily nursing, doctor rounds, and discharge.

| Sub-feature | Status | Notes |
|---|---|---|
| Admit patient (ward, bed, diagnosis, attending doctor) | ✅ | `POST /api/admissions` |
| List admissions (active, discharged) | ✅ | `GET /api/admissions` |
| Bed allotment & status (vacant, occupied, cleaning, blocked) | ✅ | `Bed`, `Ward` models |
| Bed transfer | 🟡 | Model supports, UI partial |
| Nursing notes & medication administration | ✅ | `IPDNote`, `NurseStation.tsx` |
| Doctor rounds notes | ✅ | `IPDNote` |
| Investigation orders (lab, radiology) from IPD | ✅ |  |
| Pharmacy charge to admission | ✅ |  |
| Procedure / OT linkage from admission | ✅ |  |
| Discharge with summary & final bill | ✅ | `POST /api/admissions/:id/discharge` |
| LAMA / DOR / death recording | 🟡 | Status field present |

**Entities:** `Admission`, `Bed`, `Ward`, `IPDNote`, `Order`

---

## 5. Emergency Room (ER)

**Core capability:** Triage, rapid registration, stabilisation, then admit/discharge/refer.

| Sub-feature | Status |
|---|---|
| Create ER case (triage level: red/yellow/green) | ✅ |
| List active ER cases | ✅ |
| Update case (vitals, interventions, notes) | ✅ |
| Admit from ER → IPD | ✅ |
| Discharge from ER | ✅ |
| Refer-out / death-on-arrival | 🟡 |

**Endpoints:** `/api/emergency/cases` (GET, POST, PUT, /:id/admit, /:id/discharge)
**Entity:** `EmergencyCase`

---

## 6. ICU

**Core capability:** ICU-specific bed management, hourly vitals, ventilator parameters.

| Sub-feature | Status |
|---|---|
| ICU bed list & status | ✅ |
| Create ICU bed | ✅ |
| Record ICU vitals (HR, BP, SpO₂, MAP, GCS, urine output) | ✅ |
| Ventilator parameters (mode, FiO₂, PEEP, tidal vol.) | ✅ |
| ICU patient list | ✅ |

**Endpoints:** `/api/icu/*`  ·  **Entities:** `ICUBed`, `ICUVitals`

---

## 7. Operation Theatre (OT) & Surgery

**Core capability:** Schedule, conduct, and bill surgeries; track OT room utilisation.

| Sub-feature | Status |
|---|---|
| Schedule surgery (patient, surgeon, OT room, time) | ✅ |
| List surgeries (date, room, status) | ✅ |
| Manage OT rooms (status, schedule) | ✅ |
| Start surgery (timestamp, anaesthesia note) | ✅ |
| Complete surgery (post-op note, surgeon team) | ✅ |
| Cancel surgery | ✅ |
| Implants / consumables consumption | 🟡 |

**Endpoints:** `/api/surgeries`, `/api/ot-rooms`  ·  **Entities:** `Surgery`, `OTRoom`, `OTTheatre`

---

## 8. Laboratory

**Core capability:** Order → sample → analyse → result → report.

| Sub-feature | Status |
|---|---|
| Order lab tests from OPD/IPD | ✅ |
| List lab orders by status | ✅ |
| Update order (collected, in-progress, ready) | ✅ |
| Enter results (numeric / text / file) | ✅ |
| Validate / lock result | 🟡 |
| Print / share report (PDF) | 🟡 |
| Lab test master (price, ref ranges, sample type) | ✅ |
| Outsourced lab handoff | 🟦 |

**Endpoints:** `/api/lab-orders`, `/api/lab-results`, `/api/lab-tests`
**Entities:** `Order` (type=LAB), `Result`, `LabTestMaster`

---

## 9. Radiology / Imaging

**Core capability:** Order, schedule, report on imaging studies.

| Sub-feature | Status |
|---|---|
| Order radiology test | ✅ |
| Update study status | ✅ |
| List radiology orders | ✅ |
| Radiology test master | ✅ |
| Reporting workstation view | 🟡 |
| DICOM PACS integration | 🟦 |

**Endpoints:** `/api/radiology-orders`, `/api/radiology-tests`
**Entities:** `Order` (type=RAD), `RadiologyTestMaster`

---

## 10. Phlebotomy

**Core capability:** Manage in-house and home sample collections.

| Sub-feature | Status |
|---|---|
| List collections (pending, collected, rejected) | ✅ |
| Create collection request | ✅ |
| Mark sample collected | ✅ |
| Reject sample (reason) | ✅ |

**Endpoints:** `/api/phlebotomy/collections`

---

## 11. Pharmacy

**Core capability:** Drug master, prescription dispensing, stock control, charge-to-admission.

| Sub-feature | Status |
|---|---|
| Drug master (name, strength, mfr, MRP, schedule) | ✅ |
| Stock view (batch, expiry, qty) | ✅ |
| Pending prescriptions queue | ✅ |
| Dispense (decrement stock, charge to invoice) | ✅ |
| OTC sale | 🟡 |
| Stock transfer between branches | 🟦 |

**Endpoints:** `/api/drugs`, `/api/pharmacy/*`
**Entities:** `Drug`, `Stock`, `Prescription`

---

## 12. Blood Bank

**Core capability:** Manage donors, blood inventory, cross-match, and issuance.

| Sub-feature | Status |
|---|---|
| Donor registry | ✅ |
| Blood inventory (group, units, expiry) | ✅ |
| Blood request from ward | ✅ |
| Cross-match | ✅ |
| Issue unit (decrement inventory, log issuance) | ✅ |

**Endpoints:** `/api/blood-bank/*`
**Entities:** `BloodDonor`, `BloodDonation`, `BloodInventory`, `BloodRequest`, `BloodIssuance`

---

## 13. Inventory & Purchase Orders

**Core capability:** Non-pharma stock and procurement.

| Sub-feature | Status |
|---|---|
| Inventory items master | ✅ |
| Stock view by item | ✅ |
| Create PO (vendor, items, expected date) | ✅ |
| Update PO (approve, GRN) | ✅ |
| Goods receipt note (GRN) | 🟡 |
| Indents from departments | 🟦 |

**Endpoints:** `/api/inventory/*`
**Entities:** `InventoryItem`, `PurchaseOrder`, `PurchaseOrderItem`, `Stock`

---

## 14. Billing & Invoicing

**Core capability:** Invoice generation for OPD and IPD, partial payments, refunds.

| Sub-feature | Status |
|---|---|
| OPD invoice (services, procedures, drugs) | ✅ |
| IPD running bill (per-day charges) | ✅ |
| Final discharge bill | ✅ |
| Take payment (cash, card, UPI) | ✅ |
| List invoices / filter by patient/date | ✅ |
| Refund | 🟡 |
| Discount approvals | 🟡 |
| Package billing (predefined bundles) | ✅ |
| Tax (GST) lines | 🟡 |

**Endpoints:** `/api/invoices/*`, `/api/ipd-billing/*`, `/api/bills`
**Entities:** `Invoice`, `Payment`, `PackageMaster`

---

## 15. TPA / Insurance

**Core capability:** Pre-authorisation, claim submission, EOB tracking.

| Sub-feature | Status |
|---|---|
| Insurance company master | ✅ |
| Patient insurance linkage | ✅ |
| Pre-authorisation request | ✅ |
| Claim creation & status tracking | ✅ |
| EOB capture | 🟡 |

**Endpoints:** `/api/insurance-companies`, `/api/patient-insurances`, `/api/tpa/*`
**Entities:** `TPAMaster`, `PreAuthorization`, `PatientInsurance`

---

## 16. Doctor Accounting & Commissions

**Core capability:** Track per-doctor revenue, contract terms, payouts; referral commissions.

| Sub-feature | Status |
|---|---|
| Doctor contract (revenue %, retainer, slabs) | ✅ |
| Doctor revenue ledger | ✅ |
| Doctor payout creation & history | ✅ |
| Referral source master | ✅ |
| Commission accrual & approval | ✅ |
| Commission payout | ✅ |
| Commission summary report | ✅ |

**Endpoints:** `/api/doctor-contracts`, `/api/doctor-revenues`, `/api/doctor-payouts`, `/api/commissions/*`, `/api/referral-sources`
**Entities:** `DoctorContract`, `DoctorRevenue`, `DoctorPayout`, `ReferralSource`, `Commission`, `CommissionPayout`

---

## 17. Accounting (GL / Ledger / Tally)

**Core capability:** Double-entry GL with journal entries, ledger, trial balance, Tally sync.

| Sub-feature | Status |
|---|---|
| Account groups & heads | ✅ |
| Journal entry create/list | ✅ |
| Ledger by account head | ✅ |
| Trial balance | ✅ |
| Fiscal year | ✅ |
| Tally sync status | ✅ |
| Tally sync trigger | ✅ |
| Tally sync entries log | ✅ |

**Endpoints:** `/api/account-heads`, `/api/journal-entries`, `/api/ledger/:accountHeadId`, `/api/trial-balance`, `/api/tally/*`
**Entities:** `AccountGroup`, `AccountHead`, `JournalEntry`, `JournalEntryLine`, `LedgerEntry`, `FiscalYear`

---

## 18. HR & Payroll

**Core capability:** Employee lifecycle, attendance, leave, salary structures, payslips.

| Sub-feature | Status |
|---|---|
| Employee master (CRUD) | ✅ |
| Attendance (manual + biometric) | ✅ |
| Leave request, approve, reject | ✅ |
| Salary structures (earnings, deductions) | ✅ |
| Generate payslip (period) | ✅ |
| Payslips by employee | ✅ |

**Endpoints:** `/api/hr/*`, `/api/payroll/*`
**Entities:** `Employee`, `EmployeeAttendance`, `LeaveRequest`

---

## 19. Biometric Attendance

**Core capability:** Punch capture from biometric devices.

| Sub-feature | Status |
|---|---|
| List biometric devices | ✅ |
| Record punch | ✅ |
| Today's punches (per device / branch) | ✅ |

**Endpoints:** `/api/biometric/*`

---

## 20. Ambulance

**Core capability:** Vehicle fleet, trips, dispatch, completion.

| Sub-feature | Status |
|---|---|
| Vehicle master | ✅ |
| Trip log (request → assign → complete) | ✅ |
| Driver assignment | ✅ |
| Trip completion (KMs, charges) | ✅ |

**Endpoints:** `/api/ambulance/*`
**Entities:** `AmbulanceVehicle`, `AmbulanceTrip`

---

## 21. Housekeeping & Laundry

**Core capability:** Task queue for cleaning rooms/wards; laundry tracking.

| Sub-feature | Status |
|---|---|
| Create task (room, type, priority) | ✅ |
| List tasks | ✅ |
| Complete task | ✅ |
| Laundry log | ✅ |

**Endpoints:** `/api/housekeeping/*`

---

## 22. Diet / Kitchen

**Core capability:** Diet orders for inpatients, served per meal.

| Sub-feature | Status |
|---|---|
| Diet order creation | ✅ |
| List diet orders | ✅ |
| Update status (prepared, served, cancelled) | ✅ |

**Endpoints:** `/api/diet/orders`

---

## 23. CSSD (Sterilization)

**Core capability:** Sterilisation cycle tracking, instrument reprocessing.

| Sub-feature | Status |
|---|---|
| Cycle list | ✅ |
| Create sterilisation cycle | ✅ |
| Complete cycle | ✅ |
| Instrument inventory | ✅ |

**Endpoints:** `/api/cssd/*`

---

## 24. Quality & Incident Management

**Core capability:** Capture incidents and patient feedback.

| Sub-feature | Status |
|---|---|
| Incident reporting (type, severity, root cause) | ✅ |
| Feedback capture & ratings | ✅ |
| Quality dashboard | 🟡 |
| CAPA workflow | 🟦 |

**Endpoints:** `/api/quality/incidents`, `/api/quality/feedbacks`
**Entities:** `Incident`, `Feedback`

---

## 25. Health Checkup Packages

**Core capability:** Predefined preventive packages, booking & fulfilment.

| Sub-feature | Status |
|---|---|
| Package master (tests, price) | ✅ |
| Bookings (patient, package, date) | ✅ |

**Endpoints:** `/api/health-checkup/*`

---

## 26. Mortuary, Physiotherapy, MRD

| Sub-feature | Status | Notes |
|---|---|---|
| Mortuary register | 🟡 | UI page exists |
| Physiotherapy session log | 🟡 | UI page exists |
| MRD (medical record dept) check-in/out | 🟡 | UI page exists |

---

## 27. DICOM / PACS

| Sub-feature | Status | Notes |
|---|---|---|
| Image store integration (study/series/instance) | 🟦 | Page scaffolded |
| Web viewer | 🟦 |  |
| Worklist push to modality | 🟦 |  |

---

## 28. MIS & Analytics

**Core capability:** Operational, financial, and clinical reporting.

| Sub-feature | Status |
|---|---|
| Dashboard stats (today's OPD, IPD, revenue) | ✅ |
| Reports list | ✅ |
| Reports dashboard | ✅ |
| Bed occupancy | ✅ |
| Revenue by department / doctor | ✅ |
| Pharmacy / lab volume | ✅ |
| Export to CSV / PDF | 🟡 |
| Custom report builder | 🟦 |

**Endpoints:** `/api/dashboard/stats`, `/api/reports/*`

---

## 29. Master Data

**Core capability:** Centralised reference data, generic CRUD.

| Master | Endpoint |
|---|---|
| Drugs | `/api/master/drugs` |
| Lab tests | `/api/master/lab-tests` |
| Radiology tests | `/api/master/radiology-tests` |
| Procedures | `/api/master/procedures` |
| Departments | `/api/master/departments` |
| Wards | `/api/master/wards` |
| Packages | `/api/master/packages` |
| Generic master (POST/PUT/DELETE) | `/api/master/:type[/:id]` |

---

## 30. Authentication, Roles & RBAC

**Core capability:** JWT-based auth with 19 roles and >100 fine-grained permissions.

**Roles:** `ADMIN`, `DOCTOR`, `NURSE`, `FRONT_OFFICE`, `BILLING`, `LAB_TECH`, `RADIOLOGY_TECH`, `PHARMACIST`, `EMERGENCY`, `ICU`, `OT`, `IPD`, `HR`, `INVENTORY`, `HOUSEKEEPING`, `DIET`, `AMBULANCE`, `BLOOD_BANK`, `QUALITY`.

**Permission categories:** `dashboard:*`, `patients:*`, `appointments:*`, `opd:*`, `encounters:*`, `prescriptions:*`, `ipd:*`, `admissions:*`, `beds:*`, `nurse_station:*`, `emergency:*`, `icu:*`, `ot:*`, `surgery:*`, `lab:*`, `radiology:*`, `blood_bank:*`, `pharmacy:*`, `billing:*`, `invoices:*`, `accounts:*`, `commissions:*`, `doctor_revenue:*`, `hr:*`, `employees:*`, `attendance:*`, `leaves:*`, `inventory:*`, `purchase_orders:*`, `housekeeping:*`, `diet:*`, `ambulance:*`, `quality:*`, `health-checkup:*`, `phlebotomy:*`, `payroll:*`, `accounting:*`, `cssd:*`, `reports:*`, `analytics:*`, `master_data:*`, `system:*`, `users:*`.

| Sub-feature | Status |
|---|---|
| Login (JWT, bcrypt) | ✅ |
| RoleProtectedRoute (frontend) | ✅ |
| `requireRole` / `requirePermission` middleware (backend) | ✅ (enforced on all 187 routes) |
| Token refresh | 🟦 |
| Password reset | 🟡 |
| 2FA / MFA | 🟦 |
| SSO / SAML | 🟦 |

---

## 31. Audit, Compliance & Security

| Sub-feature | Status |
|---|---|
| Audit log table (who/what/when) | ✅ |
| PHI access logger | ✅ |
| Security event logger (LOGIN_FAILED, LOGIN_SUCCESS) | ✅ |
| Helmet headers | ✅ |
| CORS allowlist | ✅ |
| Rate limiting (auth + general) | ✅ |
| CSRF middleware | ✅ |
| Zod input validation | ✅ (auth + 20+ schemas) |
| HIPAA-style middleware | ✅ |
| Data encryption at rest (PHI columns) | 🟡 |
| Data retention policy (7y) | 🟦 |
| NABH / JCI compliance reports | 🟦 |

---

## 32. System Administration

| Sub-feature | Status |
|---|---|
| User CRUD | ✅ |
| Reset password | ✅ |
| Roles & permissions matrix | ✅ |
| Hospital settings | ✅ |
| Email / SMS gateway settings | ✅ |
| Health endpoints `/health`, `/api/live`, `/api/ready` | ✅ |
| Swagger / OpenAPI `/api/docs` | ✅ |
| Software / version management page | ✅ |

---

## 33. Multi-tenant & Multi-branch

- Every primary table carries `tenantId` and `branchId` columns.
- Branch-level module activation via `BranchModule`.
- Department scoping per branch (`Department`).
- Cross-branch reports require `system:manage` permission.

**Status:** ✅ Schema-level isolation. **Pending:** runtime middleware to attach tenant context from JWT and enforce on every Prisma query.

---

## 34. Notifications

| Sub-feature | Status |
|---|---|
| Email gateway (settings only) | 🟡 |
| SMS gateway (settings only) | 🟡 |
| WhatsApp / push | 🟦 |
| Templated transactional notifications | 🟦 |

---

## 35. Cross-cutting NFRs

| Concern | Implementation |
|---|---|
| Performance | Indexed FK columns, paginated list endpoints, gzip via nginx |
| Availability | Healthchecks on every container; restart policies in docker-compose |
| Observability | Winston structured logs; Sentry integrated; `/api/health/detailed` exposes DB latency, memory, CPU |
| Backups | `pg_dump` + WAL archive (operational doc) |
| Secrets | `.env` only — no defaults shipped in `docker-compose.yml` (post-fix) |
| CI/CD | GitHub Actions: lint → test (vitest) → build → docker push |
| Tests | Vitest with coverage; RBAC matrix and validators; expanding to controllers |
| Localization | English baseline; Hindi/regional planned |
| Browser support | Chrome, Edge, Safari (latest 2 versions); Firefox best-effort |
| Accessibility | WCAG 2.1 AA target |
