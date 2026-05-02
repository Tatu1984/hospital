---
title: "Scope of Work — Hospital ERP, HRMS & Accounts System"
subtitle: "Including Patient and Doctor Mobile Applications"
author: "[Your Company Name]"
date: "2026-05-02"
---

# Scope of Work

**Project:** Hospital ERP, HRMS & Accounts System with Mobile Applications

**Prepared for:** [Client Hospital Name]

**Prepared by:** [Your Company Name]

**Date:** 2026-05-02

**Document Reference:** SOW/HMS/2026/001

**Version:** 1.0

---

## Document Control

| Field | Detail |
| --- | --- |
| Document Title | Scope of Work — Hospital ERP, HRMS & Accounts System |
| Version | 1.0 |
| Status | For Client Review |
| Issued On | 2026-05-02 |
| Validity | 30 days from issue date |
| Currency | Indian Rupees (INR / ₹) |
| GST | All amounts are exclusive of 18% GST unless stated otherwise |

---

## Index

1. [Executive Summary](#1-executive-summary)
2. [Hospital ERP — Feature List](#2-hospital-erp--feature-list)
3. [HRMS — Feature List](#3-hrms--feature-list)
4. [Accounts — Feature List](#4-accounts--feature-list)
5. [Mobile Applications — Feature List](#5-mobile-applications--feature-list)
6. [Technology Stack](#6-technology-stack)
7. [Project Deliverables](#7-project-deliverables)
8. [Pricing & Commercials](#8-pricing--commercials)
9. [Annual Maintenance Contract (AMC)](#9-annual-maintenance-contract-amc)
10. [Project Timeline](#10-project-timeline)
11. [Out of Scope](#11-out-of-scope)
12. [Assumptions & Dependencies](#12-assumptions--dependencies)
13. [Acceptance & Sign-off](#13-acceptance--sign-off)

---

## 1. Executive Summary

This Scope of Work describes the supply, customization, deployment and post-go-live maintenance of a complete digital management system for the hospital, comprising three integrated modules and two mobile applications:

- **Hospital ERP** — clinical, operational and patient-management workflows.
- **HRMS** — human resources, payroll and attendance.
- **Accounts** — financial accounting, ledgers and statutory reporting.
- **Patient Mobile Application** (iOS + Android).
- **Doctor Mobile Application** (iOS + Android).

The system is multi-tenant capable, multi-branch capable, and is delivered with audit logging, role-based access control, daily database backups, and Razorpay payment-gateway integration as standard.

This document captures the agreed feature scope, technology stack, commercial terms, and post-delivery support obligations. Any feature, integration or workflow not explicitly listed here is treated as out of scope and will be quoted separately.

---

## 2. Hospital ERP — Feature List

### 2.1 Core Platform & Administration

- Multi-tenant, multi-branch architecture with strict tenant data isolation.
- Role-based access control (RBAC) with the following predefined roles: Administrator, Doctor, Nurse, Front Desk, Billing Staff, Lab Technician, Radiology Technician, Pharmacist, Emergency Physician, ICU Nurse, OT Coordinator, IPD Coordinator. Custom roles supported.
- Module activation per branch (any combination of modules can be enabled or disabled per location).
- Department, ward, bed, and OT room masters.
- Audit log of every clinical and administrative action with HIPAA-equivalent retention controls.
- System settings management with hospital branding, contact details, and configurable parameters.
- Two-factor JWT authentication with refresh token rotation.
- Password reset workflow (email-based).
- Session timeout enforcement.

### 2.2 Front Office & Patient Registration

- Patient registration with auto-generated MRN per tenant.
- Demographics: name, date of birth, gender, contact, email, address, photo, emergency contact, blood group, allergies, purpose of visit.
- Biometric template support (for biometric-enabled deployments).
- Referral source capture and tracking.
- Patient search by MRN, name, contact, or date of birth.
- Patient edit history with audit trail.
- Patient insurance details and TPA linkage.

### 2.3 Appointment Management

- Doctor schedule and slot booking.
- Multi-channel appointment booking (front office, mobile app, web).
- Appointment statuses: scheduled, confirmed, in progress, completed, cancelled, no-show.
- Appointment reminders via SMS / Email (subject to gateway provisioning by client).
- Reschedule and cancellation workflow.
- Walk-in appointment registration.

### 2.4 Outpatient Department (OPD)

- OPD encounter creation per visit.
- OPD notes: chief complaint, history of present illness, past medical history, examination, diagnosis, plan.
- Prescription management with drug-master integration.
- Vital signs capture.
- Referral to specialist.
- OPD billing integration.

### 2.5 Inpatient Department (IPD)

- Admission workflow with bed assignment.
- Bed master with status: vacant, occupied, dirty, maintenance.
- Bed transfer between wards (audit-tracked).
- IPD progress notes (per shift).
- IPD prescription orders.
- Discharge workflow with discharge summary.
- IPD billing with daily bed charges, consumables, services.
- Admission, discharge and transfer (ADT) reports.

### 2.6 Emergency / Casualty

- Emergency case registration including walk-ins (no prior MRN required).
- Triage categorization (RED, YELLOW, GREEN).
- MLC (Medico-Legal Case) flag and MLC number capture.
- Vital signs capture.
- Disposition tracking: admit to IPD, admit to ICU, discharge, transfer, DAMA, expired.
- Emergency-to-IPD admission flow.

### 2.7 ICU & Critical Care

- ICU bed master with units (MICU, SICU, NICU, PICU, CCU).
- Patient assignment to ICU beds.
- Vitals charting: heart rate, BP, temperature, SpO2, respiratory rate, GCS.
- Ventilator settings: mode, FiO2, PEEP.
- Ventilator setting history per bed.
- Patient handover notes between shifts.

### 2.8 Operation Theatre (OT)

- OT room master with type and floor.
- Surgery scheduling against OT rooms.
- Surgery details: patient, procedure, surgeon, anaesthetist, scheduled date/time.
- Pre-operative checklist.
- Surgery start / complete / cancel workflow.
- OT room status auto-updates linked to surgery status.
- Post-operative notes and complications.
- Implants and consumables tracking.

### 2.9 Laboratory (LIS)

- Lab test master with categories.
- Lab order from OPD or IPD encounter.
- Sample collection and tracking.
- Result entry with reference ranges.
- Panic-value flagging.
- Lab report PDF generation.
- Lab order status: pending, sample-collected, in-progress, completed.
- Phlebotomy (sample collection) module.

### 2.10 Radiology (RIS)

- Radiology test master.
- Radiology order from OPD or IPD encounter.
- Result entry and report PDF generation.
- Order status workflow.
- DICOM/PACS integration ready (PACS server provisioning is client's responsibility).

### 2.11 Pharmacy

- Drug master with generic name, form, strength, category, narcotic flag, price.
- **Plug-and-play scanner support**: any USB barcode or RFID scanner in HID-keyboard mode (the factory default for the vast majority of the market) works without any driver, configuration or pairing.
- Drug-tag enrollment: bind a barcode and/or RFID tag to any drug record from the master-data screen.
- Pharmacy POS with cart-based billing.
- Stock management with batch number, expiry tracking, reorder level.
- Stock alerts for low / expiring / expired stock.
- Pharmacy dispensing against prescription.
- Walk-in OTC dispensing.
- Pharmacy invoice generation.

### 2.12 Blood Bank

- Donor registration with screening status.
- Blood donation tracking with bag number, component, volume, expiry.
- Blood inventory (whole blood, packed RBC, platelets, plasma, cryo).
- Blood request from any department.
- Cross-match recording.
- Blood issuance against request.
- Inventory expiry monitoring (3-day, 7-day alerts).

### 2.13 Ambulance Management

- Ambulance vehicle master with type (ALS / BLS / patient transport).
- Driver and contact details.
- Trip request (emergency or scheduled).
- Vehicle assignment to trip with status updates.
- Trip completion with distance and charges.
- Vehicle availability tracking.

### 2.14 Housekeeping & Linen

- Housekeeping task creation per bed / area.
- Task assignment, priority, scheduled time.
- Task completion tracking.
- Laundry management (linen request, pickup, return).

### 2.15 Diet & Kitchen

- Diet order per admitted patient.
- Diet types and meal types (breakfast, lunch, dinner, snacks).
- Order status tracking.
- Linkage to admission record.

### 2.16 Quality, Compliance & Feedback

- Incident reporting with type, severity, location.
- Investigation and root-cause capture.
- Action taken and closure tracking.
- Patient feedback capture with department and rating.
- Feedback resolution workflow.

### 2.17 Asset Management

- Hospital equipment / asset registry with asset code per tenant.
- Categories: medical equipment, IT, infrastructure, vehicles.
- Purchase, warranty and AMC expiry tracking.
- Maintenance log per asset.
- Asset status: active, under-maintenance, retired.
- Maintenance scheduling and cost capture.

### 2.18 Inventory & Procurement

- Inventory item master with categories.
- Stock per store / location.
- Reorder-level tracking and low-stock alerts.
- Purchase order generation with vendor details.
- PO line items, rates and totals.
- PO status tracking.
- Goods-receipt workflow (basic).

### 2.19 Insurance / TPA

- TPA master with contact and rate-card.
- Patient insurance linkage.
- Pre-authorization request submission.
- Pre-auth status tracking.
- Insurance billing (cashless / reimbursement).

### 2.20 Referral & Commission Tracking

- Referral source registry (broker, agent, doctor, hospital, corporate, self).
- Commission rules: percentage, fixed, tiered.
- Auto-calculation of commission on fully-paid invoices.
- Commission approval and payout workflow.
- Commission payout statements (per source, per period).

### 2.21 Health Checkup Packages

- Pre-defined package master with included tests / consultations / charges.
- Package booking against patient.
- Package fulfilment tracking (which tests done, which pending).
- Package billing.

### 2.22 Billing, Payments & Razorpay

- OPD, IPD and pharmacy bill generation.
- Itemized invoices with subtotal, discount, tax, total.
- Multiple payment modes: cash, card, UPI, net-banking, insurance, cheque.
- **Razorpay payment-gateway integration** (sandbox + live), with end-to-end:
  - Order creation against an invoice.
  - Browser checkout opens directly from the billing page.
  - HMAC signature verification before recording payment.
  - Webhook handler as backstop for closed-tab cases.
  - Idempotent verification (no duplicate payments).
- Payment receipt PDF.
- Outstanding-balance tracking.
- Refund workflow.

### 2.23 MIS & Reports

- Operational dashboard (today's appointments, admissions, occupancy, revenue).
- Patient register, admission register, discharge register.
- Doctor performance reports.
- Department-wise revenue.
- Insurance claim register.
- Daily / monthly / yearly revenue reports.
- Exportable to PDF and Excel.

### 2.24 Notifications

- Email and SMS notification framework with provider abstraction (SMTP, SendGrid, AWS SES; Twilio, MSG91, AWS SNS).
- WhatsApp messaging adapter (provider configurable).
- Triggers: appointment confirmation, reminder, lab result ready, discharge, payment receipt.
- Provider accounts (SendGrid, MSG91, etc.) are the client's responsibility — see Section 12.

### 2.25 Security, Audit & Compliance

- All passwords stored as bcrypt hashes (rounds = 10).
- JWT access token (1-hour TTL) + refresh token (7-day TTL, httpOnly cookie).
- PHI encryption at the application layer (AES-256-GCM).
- Audit log of every data-modifying action with timestamp, user, IP, before/after values.
- Audit-log retention policy (configurable, default 365 days, automated archival).
- HIPAA-equivalent log redaction (PHI scrubbed before any log shipper sees it).
- Rate limiting per endpoint class.
- Helmet + CSP + CORS hardening.

---

## 3. HRMS — Feature List

### 3.1 Employee Master

- Employee registration with auto-generated employee ID.
- Personal details: name, email, phone, address, DOB.
- Employment details: department, designation, joining date, employee type (permanent, contract, visiting), shift.
- Salary details: basic, allowances, deductions.
- Document storage (offer letter, ID proof, qualifications) — uploads optional.
- Employee status: active, on leave, terminated.

### 3.2 Attendance Management

- Daily attendance capture (check-in, check-out, status).
- Manual attendance entry by HR.
- Biometric integration ready (biometric device is client's responsibility — see Section 12).
- Attendance status: present, absent, half-day, on-leave.
- Late-mark tracking.
- Monthly attendance reports per employee.
- Department-wise attendance summary.

### 3.3 Leave Management

- Leave type master: sick, casual, earned, maternity, compensatory, etc.
- Leave balance per employee per type.
- Leave application workflow.
- Approval workflow (manager → HR).
- Leave rejection with remarks.
- Leave calendar view per department.
- Holiday master.
- Leave reports.

### 3.4 Payroll

- Salary structure master per employee or per role:
  - Basic salary
  - HRA
  - Medical allowance
  - Special allowance
  - Other allowances
  - PF deduction
  - ESI deduction
  - Professional tax
  - TDS
  - Other deductions
- Monthly payroll generation per employee.
- Payslip PDF generation with hospital branding.
- Bulk payroll generation per pay period.
- Payroll status workflow: draft, approved, paid.
- Payroll reports: monthly summary, year-to-date, statutory.

### 3.5 Doctor / Consultant Management

- Doctor contracts (consulting, retainer, fee-share).
- Doctor revenue tracking per encounter / surgery / OPD visit.
- Doctor payout calculation per contract terms.
- Doctor payout statements (per period).
- Doctor payout payment recording.
- Doctor commission integration with billing.

### 3.6 Shift & Roster Management

- Shift master (morning, afternoon, night, custom).
- Duty roster per ward / department.
- Roster publication.
- Shift swap / cover requests.
- Nurse handover notes between shifts.

### 3.7 Statutory & Compliance

- PF / ESI / Professional Tax computation.
- Form 16 generation (annual).
- Form 24Q (quarterly TDS return) data export.
- Provident Fund return data export.
- ESIC return data export.

### 3.8 HRMS Reports

- Attendance summary (daily / monthly / annual).
- Leave register and balance reports.
- Payroll summary.
- Department / designation headcount.
- Joiners and leavers report.
- Salary register.
- Statutory deduction reports.

---

## 4. Accounts — Feature List

### 4.1 Chart of Accounts

- Fiscal year master (e.g. FY 2026-27) per tenant.
- Account groups (Asset, Liability, Income, Expense, Equity) with parent-child hierarchy.
- Account heads (ledger accounts) under groups.
- System-defined accounts (Cash, Bank, Sales, Patient Receivable, etc.) auto-created on go-live.
- Custom account head creation.
- Opening-balance entry per account head.

### 4.2 Journal Entries

- Manual journal entry creation (double-entry, Dr / Cr).
- Multi-line journal entries.
- Voucher numbering (auto-generated, fiscal-year-aware).
- Voucher types: payment, receipt, journal, contra, sales, purchase.
- Journal-entry approval workflow.
- Reversal of posted entries with audit trail.
- Auto-postings from billing (sales, GST output) and payments (cash / bank).

### 4.3 Ledgers & Day-Books

- General ledger (per account head).
- Cash book.
- Bank book.
- Day-book (all entries on a date).
- Ledger printing / PDF export.
- Ledger filtering by date range, voucher type.

### 4.4 Receipts & Payments

- Patient receipts auto-posted from billing payments.
- Vendor payments (against PO / bill).
- Doctor payouts auto-posted from HRMS.
- Salary payments auto-posted from payroll.
- Expense vouchers (manual).
- Cheque-issued register.

### 4.5 Bank Reconciliation

- Bank statement import (CSV / Excel).
- Auto-match against bank book.
- Manual reconciliation for unmatched entries.
- Bank reconciliation statement.

### 4.6 GST & Statutory

- GST configuration: GSTIN, state, GST registration type.
- HSN / SAC code on services and items.
- GST output computation on every invoice (CGST / SGST / IGST).
- GSTR-1 data export.
- GSTR-3B summary.
- TDS deduction tracking.
- TDS certificate (Form 16A) data export.

### 4.7 Financial Statements

- Trial Balance (any date range).
- Profit & Loss statement (any date range).
- Balance Sheet (as of any date).
- Cash flow statement.
- Statements exportable to PDF and Excel.
- Comparative statements (current vs. previous period).

### 4.8 Budget & Variance

- Budget master per account head per period.
- Budget vs. actuals report.
- Variance analysis.

### 4.9 Tally Integration (Optional)

- Tally Connector to push journal entries to TallyPrime.
- Configurable mapping (Tally ledger ↔ HMS account head).
- One-way sync (HMS → Tally) with manual trigger and scheduled sync.
- **Note**: requires Tally licence and a TallyConnector setup on the client's local network — deployment is included; the licence is the client's responsibility.

### 4.10 Accounts Reports

- Day-book.
- Cash and bank books.
- Outstanding payables and receivables.
- Aging analysis (30 / 60 / 90 / 120+ days).
- GST collection summary.
- Doctor payout register.
- Vendor ledger.
- Patient ledger (collection).

---

## 5. Mobile Applications — Feature List

### 5.1 Patient Mobile Application (iOS + Android)

- Patient registration / login.
- View personal profile and demographics.
- Book / reschedule / cancel OPD appointments.
- View past and upcoming appointments.
- View prescriptions issued.
- View lab and radiology reports (PDF download).
- View invoices and outstanding balance.
- Online bill payment via Razorpay.
- View discharge summary.
- Notification preferences (push, SMS, email).
- Multi-language ready (English by default; additional languages quoted separately).

### 5.2 Doctor Mobile Application (iOS + Android)

- Doctor login.
- Today's schedule (OPD slots, IPD rounds, OT cases).
- Patient queue with status (waiting, in-consultation, done).
- Patient summary view (demographics, allergies, history).
- Quick view of last visit, last lab results, last prescriptions.
- Write OPD notes and prescriptions on mobile.
- View pending lab and radiology results.
- IPD round notes capture.
- Surgery schedule and pre-op checklist.
- Notifications for new admissions, panic lab values, urgent consult requests.

### 5.3 Mobile Common Notes

- Both apps are built with React Native (single codebase for iOS and Android).
- Both apps publish to Google Play Store and Apple App Store under the client's developer accounts.
- Apple Developer Programme account (USD 99 / year) and Google Play Developer account (one-time USD 25) are the client's responsibility — see Section 12.
- App-store review and approval timelines are governed by the respective stores and are not under our control.

---

## 6. Technology Stack

### 6.1 Backend

- **Language / Runtime**: Node.js 20, TypeScript 5
- **Framework**: Express.js
- **ORM**: Prisma 5
- **Database**: PostgreSQL 15 (managed by NeonDB)
- **Authentication**: JWT (access + refresh), bcrypt password hashing
- **Validation**: Zod
- **API style**: REST + JSON
- **Documentation**: Swagger / OpenAPI

### 6.2 Frontend (Web Portal)

- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui component library
- **Routing**: React Router 6
- **HTTP client**: Axios with interceptor-based JWT refresh
- **Charts**: Recharts
- **PDF export**: jsPDF + html2canvas

### 6.3 Mobile

- **Framework**: React Native 0.74+ (iOS + Android, single codebase)
- **State management**: React Query + Zustand
- **Styling**: NativeWind (Tailwind for React Native)
- **Push notifications**: Firebase Cloud Messaging (Android) + APNs (iOS)
- **Build**: Expo Application Services (EAS) for over-the-air updates and store submission

### 6.4 Hosting & Infrastructure

- **Compute**: Vercel (serverless functions for backend + static SPA for frontend)
- **Database**: NeonDB (managed PostgreSQL with daily auto-backup and point-in-time restore)
- **Object storage** (when uploads are enabled): Cloudflare R2 or AWS S3
- **CDN**: Vercel Edge Network (built-in)
- **DNS / Domain**: Cloudflare (recommended) or any registrar

### 6.5 Payment Gateway

- **Provider**: Razorpay (India), with sandbox and live mode
- **Integration**: Razorpay Web Checkout + server-side HMAC verification + webhook handler

### 6.6 Observability & Operations

- **Error tracking**: Sentry (errors, performance traces, release tagging)
- **Logging**: Winston (structured JSON, with PHI redaction)
- **Latency monitoring**: in-process histogram exposed via `/api/metrics`
- **Uptime monitoring**: Better Stack / UptimeRobot (client's choice)
- **Backups**: Daily `pg_dump` to GitHub Actions artifact (30-day retention) + NeonDB PITR (7 days)
- **Restore drill**: Weekly automated restore-from-backup test

### 6.7 Quality & Delivery

- **Version control**: Git on GitHub (private repo, access shared with client engineering team if requested)
- **CI/CD**: GitHub Actions (lint, typecheck, test, build, deploy)
- **Test framework**: Vitest (unit + integration), Playwright (end-to-end), k6 (load test)
- **Code review**: Pull-request workflow

### 6.8 Security

- **Transport**: TLS 1.2+ (Vercel-managed)
- **Application**: Helmet (security headers), CSP, HSTS
- **Database**: Connections via NeonDB pooler, application-layer PHI encryption
- **Secrets**: Vercel environment variables (encrypted at rest)
- **Audit**: Tamper-evident audit log table, retention enforced

---

## 7. Project Deliverables

For each module (Hospital ERP, HRMS, Accounts) the deliverables are:

1. Working software meeting the feature list in this SoW.
2. Source code in a Git repository (access shared with client).
3. Database schema documentation (Prisma schema + migrations).
4. API documentation (Swagger / OpenAPI).
5. Admin user-manual (PDF).
6. Module-specific user-manual (PDF) for each role.
7. Two (2) virtual or on-site training sessions per module.
8. Production deployment to Vercel + NeonDB with all environment variables configured.
9. Configured backup and restore routine.
10. 90-day post-go-live warranty period covering bug fixes for delivered features.

For each mobile application the deliverables are:

1. Working iOS and Android apps meeting the feature list.
2. Source code in a Git repository.
3. Submission to Apple App Store and Google Play Store under the client's developer accounts.
4. App store metadata (screenshots, description, privacy policy template).
5. One (1) training session per app.
6. 90-day post-go-live warranty period.

---

## 8. Pricing & Commercials

### 8.1 Module-wise Pricing

| # | Module | Price (₹) |
| --- | --- | ---: |
| 1 | Hospital ERP — full feature list as per Section 2 | 15,00,000 |
| 2 | HRMS — full feature list as per Section 3 | 6,00,000 |
| 3 | Accounts — full feature list as per Section 4 | 8,00,000 |
| 4 | Patient Mobile Application (iOS + Android) | 4,00,000 |
| 5 | Doctor Mobile Application (iOS + Android) | 4,00,000 |
| | **Sub-total (excluding GST)** | **37,00,000** |
| | GST @ 18% | 6,66,000 |
| | **Grand Total (inclusive of GST)** | **43,66,000** |

All amounts in Indian Rupees (₹).

### 8.2 Payment Schedule

| Milestone | % of project value | Trigger |
| --- | ---: | --- |
| Advance | 30% | Signing of this SoW + PO |
| UAT readiness | 30% | All modules deployed to staging, ready for User Acceptance Testing |
| Go-Live | 30% | Production cut-over completed |
| Retention | 10% | 30 days post go-live, after warranty smoke-check |

Each milestone payment is invoiced separately. Invoices include GST. Payment terms: 7 days from invoice date.

### 8.3 Modules Bought Separately

If the client elects to take any module(s) individually, the prices in Section 8.1 apply directly per-module. Bundled discounts are not offered against this quotation.

### 8.4 What Is NOT Included in the Project Cost

The following are the client's responsibility and are charged / paid by the client directly to the relevant vendor:

- Hosting (Vercel) and database (NeonDB) subscriptions.
- Razorpay merchant account, KYC and per-transaction fees.
- Email gateway account (SendGrid / SMTP / AWS SES).
- SMS gateway account (MSG91 / Twilio / AWS SNS) and DLT registration.
- WhatsApp Business API account (if chosen).
- Apple Developer Programme (USD 99 / year) and Google Play Developer account (one-time USD 25).
- Domain name registration and renewal.
- Pen-test vendor engagement (if scoped — see `docs/PENTEST.md`).
- Biometric devices, RFID/barcode scanners, label printers, and any other on-premise hardware.
- Tally licence (if Tally integration is opted for).
- PACS / DICOM server licence (if Radiology DICOM integration is opted for).

A complete list of provisioning requirements is provided in the Integration Handoff document at the time of project kick-off.

---

## 9. Annual Maintenance Contract (AMC)

### 9.1 AMC Fee

The AMC fee is **22% of the total project cost per annum, billed half-yearly in advance**, for the duration of the AMC period.

| Item | Amount (₹) |
| --- | ---: |
| Total project cost (sub-total, excl. GST) | 37,00,000 |
| AMC rate | 22% of project cost per annum |
| **Annual AMC fee (excl. GST)** | **8,14,000** |
| **Half-yearly AMC instalment (excl. GST)** | **4,07,000** |

GST @ 18% is applicable on every half-yearly AMC invoice.

### 9.2 AMC Period & Commencement

- The AMC period commences immediately on completion of the 90-day post-go-live warranty period.
- The default AMC term is **twelve (12) months**, automatically renewable at the same rate unless either party gives 60 days' written notice of non-renewal.
- AMC invoices are issued half-yearly in advance, payable within 7 days of invoice date.

### 9.3 AMC Scope — What IS Covered

The AMC fee buys the client an obligation from us to **keep the delivered software working as specified in this SoW**, as it stands at go-live. Specifically:

1. **Bug fixes** for defects in any feature delivered under this SoW.
2. **Security patches** — application of dependency updates, framework patches, and any vulnerability fixes that affect the delivered system.
3. **Production health monitoring** — uptime, error rate, latency, audit log integrity, backup success.
4. **Daily backup verification** and weekly restore-drill validation.
5. **Database housekeeping** — index health, audit-log retention sweeps, statistics refresh.
6. **Hosting and platform liaison** — coordination with Vercel, NeonDB, Sentry, Razorpay support on infrastructure issues that affect the delivered system.
7. **Periodic deployment of bug-fix releases** — typically monthly, more often for security-critical patches.
8. **Tier-1 support** for the client's admin / IT team via email and phone, during the agreed support window (default: 09:00–18:00 IST, Monday–Saturday excluding public holidays). 24×7 support is available as a separate add-on.
9. **Quarterly health report** — written summary of system uptime, error rate, slowest endpoints, backup status, and any security advisories addressed.
10. **One (1) refresher training session per quarter** for the client's admin staff.

### 9.4 AMC Scope — What Is NOT Covered

The AMC fee does NOT cover any of the following. Each will be quoted separately on a feature-by-feature basis:

1. **New features** not present in the feature lists of Sections 2, 3, 4 or 5 of this SoW.
2. **Modifications or enhancements** to the behaviour of any delivered feature, beyond the original specification.
3. **Removal or sunsetting** of delivered features at the client's request.
4. **New integrations** with third-party systems not listed in Section 6 (e.g. addition of a new lab analyser, a new payment gateway, a new insurance TPA, biometric device beyond the originally connected model, ABHA / HRMS-statutory portal integrations introduced after this SoW).
5. **Bulk data migration** from legacy systems beyond the migration carried out at go-live.
6. **Custom report development** beyond the reports listed in Sections 2, 3 and 4.
7. **UI / UX redesign** or rebranding work.
8. **New mobile application screens or modules**.
9. **Training of new staff or new roles** beyond the quarterly refresher.
10. **Hardware procurement, installation or on-site repair** (PCs, scanners, biometric devices, printers, network equipment).
11. **Issues caused by the client or a third party** — including but not limited to: changes made directly to the database outside the application, modifications to source code by a third-party developer, environment changes made on Vercel / NeonDB / Razorpay accounts without notice, internet or power outages at the client's site, mis-configuration of email / SMS gateways by the client.
12. **Penetration testing** — see Section 11.
13. **Compliance certifications** (DPDP, ISO 27001, NABH IT, etc.) — these require separate engagement scoping.

Any of the above will be scoped and quoted as a separate work order on receipt of a written request from the client. Quotations are typically returned within 5 business days. Work commences only on signed approval and PO.

### 9.5 AMC Service Levels

| Issue severity | Definition | Response time | Restoration target |
| --- | --- | --- | --- |
| **Critical** | Production fully down; no users can log in; data loss; financial transactions failing | 1 hour | 4 hours |
| **High** | Major module unavailable; significant fraction of users impacted | 4 hours | 1 business day |
| **Medium** | Single feature broken; workaround exists | 1 business day | 5 business days |
| **Low** | Cosmetic, minor inconvenience, enhancement-flavoured fix | 3 business days | next planned release |

Response time is measured from the time the issue is raised via the agreed channel (email + phone) during the support window.

### 9.6 Out-of-AMC Engagement

If the AMC is not renewed at the end of any period, the client retains the source code and the right to use the software, but we are not obligated to provide support, fixes or hosting liaison. Re-engagement under a fresh AMC after a lapse may require a re-evaluation fee.

---

## 10. Project Timeline

| Phase | Duration | Activities |
| --- | --- | --- |
| Kick-off & discovery | 2 weeks | SoW sign-off, stakeholder workshops, configuration capture |
| Setup & deploy infrastructure | 1 week | Vercel project, NeonDB instance, Sentry project, secrets provisioned by client |
| Hospital ERP delivery | 8 weeks | Build, customisation, internal QA |
| HRMS delivery | 4 weeks | Build, customisation, internal QA (in parallel with ERP) |
| Accounts delivery | 4 weeks | Build, customisation, internal QA (in parallel) |
| Mobile apps delivery | 6 weeks | Build, customisation, store-submission prep (in parallel) |
| Integrations | 2 weeks | Razorpay, email, SMS, WhatsApp wiring (depends on client provisioning) |
| User Acceptance Testing | 3 weeks | Client testing, defect remediation |
| Training | 2 weeks | Sessions per module / role |
| Go-Live & hyper-care | 2 weeks | Production cut-over, on-call coverage |
| **Total elapsed (parallel-tracked)** | **~16 weeks (~4 months)** | from SoW sign-off to go-live |

The above timeline assumes:

- All client-side provisioning (Razorpay KYC, SMS DLT registration, Apple / Google developer accounts, hosting accounts) starts in week 1 and completes by week 12.
- UAT feedback is provided within 5 business days of each release.
- No major scope change after kick-off.

Any delay attributable to client-side provisioning or feedback latency will move the go-live date by an equivalent amount.

---

## 11. Out of Scope

The following are explicitly excluded from this SoW unless added by written work order:

- DICOM / PACS server installation, configuration or licensing.
- Tally licence and Tally Connector hardware.
- Biometric / RFID / barcode hardware procurement.
- Penetration testing (a separate scope-of-work document is available).
- Compliance certification (DPDP, ISO 27001, NABH IT).
- Multi-language UI translation (Bengali, Hindi or other Indian-language UI).
- Custom branded letterheads beyond one default template per document.
- Integration with state-government insurance schemes (Swasthya Sathi, PMJAY, CGHS, ECHS) — quoted separately, ₹1.5–2.5 lakh per scheme depending on data-format complexity.
- Doctor-app inbox / chat features.
- Telemedicine video consultation.
- Voice transcription of OPD notes.
- AI / ML-driven decision support.
- E-prescription IHE / FHIR exchange.
- ABHA (Ayushman Bharat Health Account) integration.
- Pharmacy retail/wholesale separate from hospital pharmacy.
- Inventory across multiple geographically-separated warehouses.

---

## 12. Assumptions & Dependencies

This SoW is priced and scheduled on the assumption that:

1. The client has, or will provision before the relevant phase, all third-party accounts listed in Section 8.4.
2. The client provides a single nominated project owner (decision-maker) with authority to sign off on UAT and changes.
3. The client provides timely, written feedback on each delivery (within 5 business days).
4. Internet connectivity at the client's site is sufficient for a modern web application (1 Mbps per active user, minimum).
5. The client's existing data (if any) is in a structured digital format (Excel, CSV, or a dump from the previous system). Paper records, free-text in scanned PDFs, and the like will require additional digitization work.
6. Hospital workflows captured during discovery are stable for the duration of the build. Mid-build workflow rewrites trigger a change request.
7. End-user devices (PCs, tablets, smartphones) meet minimum requirements: modern Chrome / Edge / Safari, iOS 14+, Android 9+.
8. The client's network does not impose unusual restrictions on outbound HTTPS that would block Vercel / NeonDB / Razorpay / Sentry connectivity.

---

## 13. Acceptance & Sign-off

By signing below, the client confirms acceptance of:

- The feature lists in Sections 2, 3, 4 and 5.
- The technology stack in Section 6.
- The deliverables in Section 7.
- The pricing and payment schedule in Section 8.
- The AMC obligations and pricing in Section 9.
- The timeline assumptions in Section 10.
- The out-of-scope items in Section 11.
- The dependencies in Section 12.

\

\

| For [Your Company Name] | For [Client Hospital Name] |
| --- | --- |
| | |
| | |
| Signature: _____________________ | Signature: _____________________ |
| Name: _________________________ | Name: _________________________ |
| Designation: ___________________ | Designation: ___________________ |
| Date: _________________________ | Date: _________________________ |
| Company seal: | Company seal: |

---

*End of Scope of Work.*
