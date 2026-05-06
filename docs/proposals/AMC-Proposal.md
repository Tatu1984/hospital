---
title: "Annual Maintenance Contract (AMC) Proposal"
subtitle: "HospitalPro — Hospital Management Information System"
client: "Busitema Referral Hospital"
prepared_by: "[Your Company Name]"
date: "May 2026"
version: "1.0"
---

# Annual Maintenance Contract (AMC) Proposal

**Client:** Busitema Referral Hospital
**Service:** Application support, infrastructure operations, identity management, and ongoing maintenance for the HospitalPro HMIS platform
**Prepared by:** [Your Company Name]
**Date:** May 2026
**Validity:** This proposal is valid for 30 days from the date of issue.

---

## 1. Executive summary

This proposal outlines the Annual Maintenance Contract (AMC) for the HospitalPro Hospital Management Information System currently deployed at Busitema Referral Hospital. The AMC bundles application maintenance, cloud hosting, monitoring, helpdesk support, identity & access management (Microsoft Entra ID), and compliance assistance into a single predictable monthly fee.

The proposed engagement covers **150 employees** at the hospital with a contractually defined SLA matrix and a per-seat scaling clause for future growth.

**Recommended package: Standard Tier — ₹2,95,000 per month + GST (18%)**, totalling **₹3,48,100 per month** all-inclusive. Annual contract value (ACV): **₹41,77,200** including GST.

---

## 2. Scope of services

### 2.1 Application maintenance

- Bug fixes, regression patching, security patching of HospitalPro modules in production
- Dependency updates (security advisories, library upgrades) on a rolling cadence
- Minor enhancements within the scope of the engineering retainer (≤ 25 hours/month)
- Database schema fixes, data corrections, and operational hotfixes
- Daily release management for the production environment
- Vulnerability scanning and remediation of OWASP Top-10 issues

### 2.2 Identity & access management — Microsoft Entra ID

- Microsoft Entra ID **P1** license provisioning for **150 employees** (pass-through licensing via authorised CSP)
- Single Sign-On (SSO) configuration for the HospitalPro portal and integrated third-party applications
- Multi-Factor Authentication (MFA) policy enforcement
- Conditional Access policies (location-based, device-trust, risk-based)
- Self-Service Password Reset (SSPR)
- User provisioning / de-provisioning workflows
- Group-to-role mapping aligned with HospitalPro RBAC roles
- Hybrid identity sync (if on-premises Active Directory exists)
- Quarterly access reviews and audit reports

### 2.3 Cloud infrastructure & hosting

- Application hosting on Vercel (frontend + backend serverless)
- PostgreSQL database (managed: Neon / RDS / equivalent) with daily snapshots
- Object storage for clinical reports, patient photos, signed documents
- Email gateway (SendGrid / Postmark) for transactional and reminder emails
- SMS gateway for OTP, appointment reminders, and surgery family-tracking notifications
- Razorpay integration support for patient billing
- Backup retention: 30 days rolling, with quarterly archival snapshots stored offsite
- Disaster Recovery (DR) procedures with documented Recovery Time Objective (RTO) and Recovery Point Objective (RPO)

### 2.4 Monitoring, observability & security

- Application Performance Monitoring (APM) with error tracking (Sentry or equivalent)
- Uptime monitoring with alerting to the operations team
- Log retention for 90 days, with extended retention for audit-relevant events
- Security scanning (dependency CVE scanning, container scanning, secret scanning)
- Audit log retention for clinical actions per DPDP Act 2023 and Indian Medical Council guidelines
- Annual penetration test (one external pentest per annum, included)

### 2.5 Helpdesk & user support

- Email and ticket-based support during defined business hours (Standard tier)
- Triage and resolution per the SLA matrix in Section 4
- Issue logging in shared ticketing system, accessible to client administrators
- Monthly service review meeting

### 2.6 Compliance & governance

- DPDP Act 2023 compliance assistance (data subject requests, retention, deletion workflows)
- Annual security review and audit support
- Clinical audit log review and retention policies
- Documentation of data processing, access controls, and incident response

---

## 3. What is **NOT** included in the AMC

The following items are **out of scope** and would be billed separately on a Time & Materials (T&M) basis at **₹3,500 – ₹5,000 per hour** depending on resource grade, or as a fixed-bid project on mutual agreement:

- New module development (e.g., Pathology lab integrations, NABH report automation, telemedicine modules)
- Major UI redesigns or rebrand efforts
- Third-party API integrations beyond the scope of the existing platform (HL7 FHIR adapters, lab analyser integrations, government insurance schemes such as ABDM/PMJAY)
- Bulk data migration from legacy systems
- Training programmes beyond the initial 8-hour onboarding session
- Hardware procurement, installation, and on-premises networking
- Endpoint device management (laptops, biometric scanners, POS terminals) — see the separate Managed IT Services proposal if required
- On-site presence at the hospital (this AMC is remote-only)
- Microsoft Entra ID **P2** upgrades (available as a separate add-on at ₹650/user/month if required for risk-based conditional access or Privileged Identity Management)

---

## 4. Service Level Agreement (SLA) matrix

Severity classification and target response/resolution times for the **Standard Tier**:

| Severity | Definition | Response time | Resolution target | Coverage hours |
|----------|------------|---------------|-------------------|----------------|
| **P1 — Critical** | Complete system outage; cannot record any clinical activity; patient safety risk | 1 business hour | 4 business hours | 9 AM – 9 PM, 7 days |
| **P2 — High** | Major module unavailable (e.g., billing, OPD); workaround possible | 4 business hours | 1 business day | 9 AM – 6 PM, Mon–Sat |
| **P3 — Medium** | Minor module impacted; workaround easy | 1 business day | 5 business days | 9 AM – 6 PM, Mon–Fri |
| **P4 — Low** | Cosmetic or enhancement request | 3 business days | Next release cycle | 9 AM – 6 PM, Mon–Fri |

**Uptime commitment:** 99.5% monthly uptime, measured at the application URL excluding scheduled maintenance windows. Service credits apply if uptime falls below 99.0% in any calendar month, capped at 10% of that month's AMC fee.

**Scheduled maintenance window:** Sundays, 2 AM – 5 AM IST. Notified at least 48 hours in advance.

**Escalation matrix:**

| Level | Role | Trigger |
|-------|------|---------|
| L1 | Helpdesk engineer | All initial tickets |
| L2 | Senior application engineer | P1/P2 within target |
| L3 | Engineering lead | Breached SLA on P1/P2 |
| L4 | Account director | Persistent breach or systemic issue |

---

## 5. Pricing

### 5.1 Standard Tier — recommended (₹2,95,000 / month + GST)

| Line item | Description | Monthly (₹) |
|-----------|-------------|-------------|
| Microsoft Entra ID P1 (150 licenses) | Pass-through CSP licensing, no markup | 75,000 |
| Cloud hosting + database + object storage | Vercel + managed Postgres + storage | 45,000 |
| Monitoring, observability, security scanning | APM, uptime, log retention, vulnerability scanning | 15,000 |
| Email & SMS gateway | Transactional, reminders, OTP, family tracker | 20,000 |
| Backup & disaster recovery | Daily snapshots, 30-day retention, quarterly archive | 10,000 |
| Engineering retainer (25 hrs/month) | Bug fixes, dependency updates, minor enhancements | 85,000 |
| Helpdesk support (4-hour SLA, business hours) | Ticket triage and resolution | 25,000 |
| Compliance & audit assistance | DPDP, annual security review | 12,000 |
| DevOps & release management | Deployment automation, environment maintenance | 8,000 |
| **Subtotal** | | **₹2,95,000** |
| GST (18%) | | ₹53,100 |
| **Total per month (all-inclusive)** | | **₹3,48,100** |
| **Annual Contract Value** | | **₹41,77,200** |

### 5.2 Tier comparison

For client flexibility, three tiers are offered:

| | **Basic** | **Standard** ⭐ | **Premium** |
|---|---|---|---|
| Engineering retainer | 15 hrs/month | 25 hrs/month | 40 hrs/month |
| Helpdesk hours | Business hours, Mon–Fri | Business hours, Mon–Sat + 4-hr P1 | 24×7 on-call, 1-hr P1 |
| Uptime SLA | 99.0% | 99.5% | 99.9% |
| Monthly fee (excl. GST) | ₹1,95,000 | **₹2,95,000** | ₹4,75,000 |
| Monthly fee (incl. GST) | ₹2,30,100 | **₹3,48,100** | ₹5,60,500 |

### 5.3 Per-seat scaling clause

For each employee added beyond the 150-employee baseline, the AMC fee increases by **₹950 per employee per month** (covers Entra ID P1 license, helpdesk overhead, provisioning labour, and proportionate infrastructure scaling). This per-seat charge is billed in arrears at the start of the following month.

For each employee removed below the baseline, no reduction applies for the first 10 seats (to absorb churn). Beyond 10 seats removed, the fee reduces by **₹600 per seat per month**.

License changes are processed quarterly to align with Microsoft CSP commitment terms.

### 5.4 Annual escalation

The AMC fee escalates by **8% per annum**, applied at each renewal anniversary. This escalation accounts for Microsoft license price changes (typically 5-7% per year), Indian inflation, and progressive feature improvements bundled into the platform.

### 5.5 Optional add-ons

| Add-on | Monthly (₹) |
|--------|-------------|
| Microsoft Entra ID P2 upgrade (risk-based access, PIM) | +₹97,500 (₹650/user × 150) |
| Premium support (24×7 on-call, 1-hr P1) — upgrade from Standard | +₹1,80,000 |
| On-site presence (1 engineer, business hours) | +₹85,000 |
| HL7 FHIR / ABDM integration support | Quote on request |
| NABH compliance assistance | +₹35,000 |

---

## 6. Payment terms

- **Billing frequency:** Monthly, invoiced on the 1st of each month
- **Payment terms:** Net 15 days from invoice date
- **Payment method:** RTGS / NEFT bank transfer
- **Late payment:** 2% per month interest on overdue balances; service may be suspended if payment is more than 45 days overdue
- **Tax:** GST at applicable rates (currently 18%) added to all invoices
- **Microsoft license billing:** Entra ID licenses are billed monthly in arrears based on actual seat count

---

## 7. Contract terms

- **Initial term:** 12 months from the effective date
- **Renewal:** Automatic renewal for successive 12-month terms unless either party gives 60 days' written notice of non-renewal
- **Termination for convenience:** Either party may terminate with 90 days' written notice
- **Termination for cause:** Either party may terminate immediately for material breach not cured within 30 days of written notice
- **Data return:** Upon termination, all client data will be exported in standard formats (SQL dump, CSV, JSON) and provided to the client within 30 days. Data destruction confirmed by signed certificate within 60 days.
- **Confidentiality:** Mutual NDA executed alongside this contract; standard 5-year confidentiality term post-termination
- **Liability:** Capped at three (3) months of fees for direct damages; consequential and indirect damages excluded; standard exclusions for gross negligence and wilful misconduct
- **Indemnification:** Standard mutual IP indemnification; medical/clinical liability remains with the hospital
- **Insurance:** Service provider maintains professional indemnity insurance of ₹2 crore minimum

---

## 8. Onboarding and transition (one-time, included)

The first 30 days of the AMC are treated as transition. No additional cost. Activities included:

| Week | Activity |
|------|----------|
| Week 1 | Kickoff, knowledge transfer, runbook review, access provisioning |
| Week 2 | Entra ID tenant setup, user provisioning, group/role mapping, MFA enforcement |
| Week 3 | SSO integration with HospitalPro, initial conditional access policies, SSPR enrollment |
| Week 4 | Cutover, monitoring baseline establishment, first service review |

A go-live readiness review is conducted at the end of week 4 with the hospital's IT/operations leadership.

---

## 9. Governance & reporting

- **Monthly service review:** 60-minute call with hospital leadership covering: ticket statistics, SLA compliance, infrastructure metrics, incidents, planned changes
- **Quarterly business review (QBR):** 90-minute review of the relationship, roadmap alignment, growth planning, satisfaction survey
- **Annual security review:** Comprehensive review of access controls, incident log, compliance posture, and architectural improvements
- **Reports delivered:** Monthly service report (within 5 business days of month-end) covering all SLA metrics

---

## 10. Key contacts

| Role | Name | Email | Phone |
|------|------|-------|-------|
| Account Director | TBD | TBD | TBD |
| Engineering Lead | TBD | TBD | TBD |
| Helpdesk (24×5) | helpdesk@yourcompany.com | — | TBD |
| Escalation (24×7) | escalation@yourcompany.com | — | TBD |

---

## 11. Acceptance

This proposal becomes a binding agreement upon signature by both parties. Either party's electronic signature is acceptable.

| For Busitema Referral Hospital | For [Your Company Name] |
|-------------------------------|-------------------------|
| Name: ____________________________ | Name: ____________________________ |
| Title: ____________________________ | Title: ____________________________ |
| Date: ____________________________ | Date: ____________________________ |
| Signature: _______________________ | Signature: _______________________ |

---

*Appendix A — Standard Operating Procedures (separate document)*
*Appendix B — Master Services Agreement (separate document)*
*Appendix C — Data Processing Addendum (DPDP-compliant, separate document)*
