---
title: "Managed IT Services Proposal"
subtitle: "Complete IT Infrastructure Outsourcing for Busitema Referral Hospital"
client: "Busitema Referral Hospital"
prepared_by: "[Your Company Name]"
date: "May 2026"
version: "1.0"
---

# Managed IT Services Proposal

## Complete IT infrastructure outsourcing for Busitema Referral Hospital

**Client:** Busitema Referral Hospital
**Engagement type:** Full IT outsourcing — single-vendor responsibility for end-user computing, network, infrastructure, applications, identity, security, and helpdesk
**Prepared by:** [Your Company Name]
**Date:** May 2026
**Validity:** This proposal is valid for 45 days from the date of issue.

---

## 1. Executive summary

This proposal establishes a comprehensive Managed IT Services Agreement (MSA) under which **[Your Company Name]** assumes end-to-end responsibility for the hospital's IT infrastructure, applications, and end-user support. Under this arrangement the hospital has a **single accountable vendor** for everything from a clinician's laptop to the WAN circuit to the HospitalPro HMIS application — eliminating the operational drag of managing multiple specialty vendors.

The engagement covers **150 employees** across all departments (clinical, administrative, paramedical, support) with a tightly defined scope, a fixed monthly fee for managed services, and transparent pass-through billing for licensable assets (Microsoft 365, Entra ID, EDR, internet circuits, hardware refresh).

**Recommended package: Standard Managed IT Tier — ₹9,75,000 per month for managed services + ₹3,40,000 estimated pass-through + GST.** Total all-inclusive: **approximately ₹15,75,000 per month** in steady state. Annual contract value (ACV): **approximately ₹1.89 crore**.

This proposal **supersedes and replaces** the standalone HospitalPro AMC if both contracts are signed together; the HMIS support is fully absorbed into this MSA.

---

## 2. Why a single managed-IT vendor

Hospitals commonly run a multi-vendor IT stack:
- One vendor for the HMIS application
- Another for desktops and laptops
- A third for networking and WiFi
- A fourth for security tooling
- An IT manager on the hospital's payroll trying to coordinate them

This structure creates expensive failure modes — when an OPD consultation desk goes down, the desktop vendor blames the HMIS, the HMIS team blames the network, the network team blames the ISP, and the patient queue grows.

A **single managed-services vendor** with end-to-end accountability:

- **One ticket, one owner.** The hospital staff log a single ticket; we coordinate internally
- **No finger-pointing across SLAs.** A site outage triggers our internal escalation, not a multi-vendor scrum
- **Predictable monthly spend.** Hardware/licenses pass through transparently; everything else is a fixed fee
- **Strategic IT partner**, not a transactional vendor. We attend QBRs, advise on roadmap, plan capacity

---

## 3. Scope of services

### 3.1 End-user computing (EUC)

- Desktops, laptops, all-in-ones at OPD consult rooms, IPD nursing stations, billing desks, pharmacy counters, lab counters, admin floors
- Biometric scanners, signature pads, barcode readers, label printers, prescription printers
- Standard operating environment (SOE) build with security baseline
- Patch management (Windows / macOS / Linux endpoints)
- Endpoint Detection & Response (EDR) — CrowdStrike / SentinelOne / Microsoft Defender for Business
- Asset lifecycle: procurement, deployment, refresh planning (3-year cycle for laptops, 5-year for desktops), e-waste disposal
- Endpoint encryption (BitLocker / FileVault) with recovery key escrow
- Remote Monitoring & Management (RMM) tooling for proactive health checks

### 3.2 Network & connectivity

- LAN switching, structured cabling rationalisation, VLAN architecture
- Enterprise WiFi (clinical-grade — separate SSIDs for staff, guest, biometric devices, IoT/medical equipment)
- Next-generation firewalls (Fortinet / Palo Alto / SonicWall) with IPS, content filtering, SSL inspection
- Internet circuits: primary + secondary failover with SD-WAN
- VPN access for clinicians and admin staff working from home / on call
- Network monitoring with proactive alerting (PRTG / LibreNMS / Auvik)
- Quarterly network health reports and capacity planning
- ISP and circuit vendor management (you escalate to one number)

### 3.3 Servers, storage & on-premises infrastructure

- On-prem server (if any — typically a small print/file server, AD controller, surveillance NVR)
- Hypervisor management (VMware / Proxmox / Hyper-V) where applicable
- Network-attached storage for clinical files, imaging archives (PACS), CCTV
- Server patching, monitoring, capacity planning, hardware refresh
- UPS and battery health monitoring
- Server room environmental monitoring (temperature, humidity, smoke)

### 3.4 Cloud applications & infrastructure

- HospitalPro HMIS hosting and platform operations (Vercel + managed Postgres, as in the standalone AMC)
- Microsoft 365 — Exchange Online, Teams, OneDrive, SharePoint
- Microsoft Entra ID — single source of identity for all applications
- Backups: Microsoft 365, HMIS database, file shares — all backed up to immutable cloud storage with 30-day rolling + 12-month archival
- Disaster Recovery runbook with documented RTO (4 hours) and RPO (15 minutes for HMIS, 24 hours for file shares)

### 3.5 Identity, access management & security

- **Microsoft Entra ID P1** for 150 employees (P2 available as upgrade)
- SSO across HospitalPro, M365, Teams, and federated 3rd-party apps
- Conditional access (location-based, device-trust, risk-based)
- Multi-Factor Authentication enforced organisation-wide
- Self-Service Password Reset
- Privileged access management for IT administrators
- Quarterly access reviews and audit reports
- Joiner-Mover-Leaver workflow with HR system integration
- Endpoint Detection & Response (EDR) on every endpoint
- Email security (anti-phishing, anti-malware, DKIM/DMARC)
- Vulnerability management with monthly patching cadence
- Annual penetration test (one external pentest per annum, included)
- Security Information & Event Management (SIEM) — log aggregation and correlation
- 24×7 security alert triage (Standard SOC coverage)

### 3.6 Helpdesk & user support

#### Onsite presence (Standard tier)

- **1 IT Site Manager** — full-time, Mon-Sat, 9 AM – 6 PM, single point of contact for hospital leadership
- **2 L1 Helpdesk Engineers** — onsite, covering 9 AM – 9 PM in two shifts, 7 days a week
- **1 L1 Helpdesk Engineer** — on-call rotation for nights and emergencies (paid as on-call when activated)

#### Remote / shared support

- L2 / L3 application engineers (HospitalPro module owners)
- Network and systems engineers
- Security analysts
- Account manager / governance lead

All tickets logged in shared ITSM platform with hospital leadership having visibility into all open issues, SLA performance, and analytics.

### 3.7 Compliance, governance & documentation

- DPDP Act 2023 compliance posture management
- NABH IT-related controls (if/when hospital pursues NABH accreditation)
- Annual security audit and remediation tracking
- Data Processing Addendum and audit trail retention
- Asset register maintenance (every device tagged, tracked, lifecycle managed)
- Configuration Management Database (CMDB) maintained throughout
- Annual IT strategy and roadmap document delivered each March

### 3.8 Vendor management

- Single point of contact for the hospital — we coordinate with all underlying vendors
- ISP relationship management (escalations, renewals, circuit upgrades)
- Hardware vendor management (Dell / HP / Lenovo / Cisco / Fortinet)
- Software licensing optimisation (annual true-up reviews)
- M&E vendor coordination (UPS, CCTV, fire-alarm, biometric)

---

## 4. Team composition

The Standard tier is staffed with **6.5 full-time-equivalent (FTE) allocated resources**. Some roles are dedicated; others are shared across multiple clients to keep cost optimised while maintaining quality.

| # | Role | Allocation | Onsite / Remote | Function |
|---|------|------------|-----------------|----------|
| 1 | IT Site Manager / SPOC | 1.0 FTE | Onsite, 6 days/week | Single point of contact, governance, vendor coordination |
| 2 | L1 Helpdesk Engineer (Shift A) | 1.0 FTE | Onsite, 9 AM – 3 PM | Desktop support, ticket triage, walk-up support |
| 3 | L1 Helpdesk Engineer (Shift B) | 1.0 FTE | Onsite, 3 PM – 9 PM | Desktop support, after-hours coverage |
| 4 | L1 Helpdesk Engineer (Backup) | 0.5 FTE | Onsite, rotation | Weekend, night on-call, leave coverage |
| 5 | Network & Systems Engineer (L2) | 0.7 FTE | Hybrid | Network ops, server admin, escalation |
| 6 | Application Support — HospitalPro | 0.5 FTE | Remote | HMIS module support, bug triage |
| 7 | Security Analyst | 0.3 FTE | Remote (SOC) | EDR alerts, incident response, vuln mgmt |
| 8 | Cloud / DevOps Engineer | 0.3 FTE | Remote | Cloud hosting, backups, DR |
| 9 | Account Manager / Service Delivery | 0.2 FTE | Remote with onsite QBRs | Governance, QBRs, contract |
| 10 | Engineering Lead (escalation) | 0.1 FTE | Remote | L3/L4 escalations, complex incidents |

**Total: ~6.6 FTE allocated to the engagement**

### 4.1 Why this team size for 150 employees

Rule of thumb in healthcare-managed IT:
- **Helpdesk:** ~50-70 endpoints per L1 engineer for white-glove healthcare support (clinical staff cannot wait). 150 employees = ~180-220 endpoints (incl. shared, biometric, printers) → 2.5 L1 engineers in rotation
- **Network/Systems:** ~250-400 endpoints per L2 engineer → 0.5-0.7 FTE
- **Security:** Shared SOC; 0.2-0.5 FTE per mid-size organisation
- **Site lead:** 1 dedicated for any hospital >100 employees with onsite presence

We have engineered the team to run lean while preserving white-glove onsite presence in clinical areas.

### 4.2 Coverage matrix

| Time window | Onsite L1 | Remote L2/L3 | Site Manager |
|-------------|-----------|--------------|--------------|
| Mon–Sat 9 AM – 9 PM | ✅ Yes (2 in shifts) | ✅ Yes | ✅ (Mon-Sat 9-6) |
| Mon–Sat 9 PM – 9 AM | On-call, 1-hour onsite ETA | ✅ Yes (24×7 SOC) | On-call escalation |
| Sunday | On-call, 1-hour onsite ETA | ✅ Yes | On-call escalation |
| Public holidays | On-call, 1-hour onsite ETA | ✅ Yes | On-call escalation |

---

## 5. Service Level Agreements

### 5.1 Severity matrix

| Severity | Definition | Response | Resolution target |
|----------|------------|----------|-------------------|
| **P1** | Site-wide outage; cannot record clinical activity; patient safety risk | 15 minutes | 2 hours |
| **P2** | Major service degraded (one floor/department offline; HMIS module unavailable) | 30 minutes | 4 hours |
| **P3** | Single user impacted but workaround exists | 2 business hours | 1 business day |
| **P4** | Cosmetic / enhancement / non-blocking | 1 business day | 5 business days |

P1 and P2 SLAs apply 24×7. P3 and P4 SLAs apply during onsite coverage hours.

### 5.2 Uptime commitments

- **HospitalPro HMIS:** 99.9% monthly uptime
- **Entra ID / M365:** Microsoft's standard 99.9% SLA passed through (we monitor and credit if Microsoft credits)
- **Internet:** 99.5% combined (primary + failover)
- **WiFi coverage in clinical areas:** 99.5% during business hours

### 5.3 Service credits

If monthly uptime falls below the committed level, the hospital is credited a percentage of that month's managed-services fee:

| Achieved uptime | Service credit |
|-----------------|----------------|
| 99.0% – 99.4% (HMIS) | 5% |
| 98.0% – 98.9% (HMIS) | 10% |
| Below 98.0% (HMIS) | 25% (or termination right) |

Credits are applied to the next invoice. Maximum credit per month is capped at 25% of that month's managed-services fee.

---

## 6. Pricing

### 6.1 Standard tier — recommended

**Managed services fee: ₹9,75,000 per month + GST**

| Line item | Monthly (₹) |
|-----------|-------------|
| **Onsite team** | |
| IT Site Manager (1 FTE) | 1,40,000 |
| L1 Helpdesk × 2.5 FTE (avg) | 1,15,000 |
| **Remote team (allocated)** | |
| Network & Systems Engineer (0.7 FTE) | 91,000 |
| HospitalPro Application Support (0.5 FTE) | 70,000 |
| Security Analyst (0.3 FTE) | 42,000 |
| Cloud / DevOps Engineer (0.3 FTE) | 35,000 |
| Account Manager (0.2 FTE) | 28,000 |
| Engineering Lead — escalation (0.1 FTE) | 15,000 |
| **Tools & platform** | |
| ITSM (Freshservice / JSM) | 22,000 |
| RMM (NinjaOne / Atera) for 200 endpoints | 28,000 |
| SIEM / log aggregation | 18,000 |
| Backup software | 15,000 |
| Network monitoring (PRTG / Auvik) | 8,000 |
| Documentation & CMDB tooling | 6,000 |
| **Operations & overhead** | |
| Onsite engineer transport, equipment, mobile data | 22,000 |
| Annual pentest amortised | 12,000 |
| Compliance & audit support | 18,000 |
| **Subtotal (managed services)** | **8,85,000** |
| Margin (10% — already absorbed in resource costs) | included |
| **Final managed services fee** | **₹9,75,000** |
| GST @ 18% | ₹1,75,500 |
| **Total managed services / month (with GST)** | **₹11,50,500** |

### 6.2 Pass-through licensing & infrastructure (estimated)

These items are billed at vendor cost with **zero markup** — full transparency. Estimates based on typical 150-employee Indian hospital. Final costs depend on hospital's chosen license mix.

| Line item | Quantity | Unit cost | Monthly (₹) |
|-----------|----------|-----------|-------------|
| Microsoft 365 Business Standard | 150 | ₹720/user/mo | 1,08,000 |
| Microsoft Entra ID P1 (if not in M365 Business Premium) | 150 | ₹500/user/mo | 75,000 |
| EDR — CrowdStrike / SentinelOne | 200 endpoints | ₹400/endpoint | 80,000 |
| Backup cloud storage | — | — | 35,000 |
| Internet circuit (primary, 200 Mbps) | 1 | — | 25,000 |
| Internet circuit (failover, 50 Mbps 4G/5G) | 1 | — | 12,000 |
| Domain SSL, DNS, ancillary services | — | — | 5,000 |
| **Estimated pass-through subtotal** | | | **~₹3,40,000** |
| GST @ 18% (where applicable) | | | ~₹61,000 |
| **Estimated pass-through total / month** | | | **~₹4,01,000** |

> Note: Microsoft 365 Business Premium (₹1,710/user/mo) bundles Entra ID P1 + Intune + Defender — often more cost-effective than buying components individually for a 150-employee hospital. We will help the client choose the right bundle during onboarding.

### 6.3 Total monthly run-rate

| Component | Monthly (₹) |
|-----------|-------------|
| Managed services (with GST) | 11,50,500 |
| Pass-through (with GST) | 4,01,000 |
| **Total monthly all-in (estimate)** | **₹15,51,500** |
| **Annual run-rate (estimate)** | **₹1,86,18,000** |

### 6.4 One-time transition costs (billed separately)

| Phase | Activity | One-time fee (₹) |
|-------|----------|------------------|
| 0 | Discovery & current-state assessment (4 weeks) | 6,50,000 |
| 1 | Tooling onboarding (RMM, ITSM, SIEM agents on every endpoint) | 2,75,000 |
| 2 | Network audit and rectification (rationalise VLANs, baseline cabling, refresh firewall rules) | 4,50,000 |
| 3 | Entra ID tenant setup, user migration, group/role mapping | 3,50,000 |
| 4 | Asset register baselining (physical audit of all 200 endpoints) | 1,75,000 |
| 5 | Knowledge transfer & runbook authoring | 2,00,000 |
| **Total one-time transition** | | **₹21,00,000** + GST |

This is a **fixed-fee, milestone-based** transition project. The hospital is not invoiced for the managed-services fee until cutover (typically week 8-10).

### 6.5 Three-tier comparison

| | **Basic** | **Standard** ⭐ | **Premium** |
|---|---|---|---|
| Onsite L1 coverage | Mon-Fri 9-6 | Mon-Sat 9-9 + on-call | 24×7 onsite (2 engineers always) |
| Site manager | 0.5 FTE shared | 1 FTE dedicated | 1 FTE dedicated + onsite engineering lead |
| P1 SLA | 1 hour | 15 minutes | 5 minutes |
| Pentest | Annual | Annual | Bi-annual |
| Service credit cap | 10% | 25% | 50% |
| Monthly fee (excl. GST, excl. pass-through) | ₹6,75,000 | **₹9,75,000** | ₹14,50,000 |
| Monthly fee (incl. GST, excl. pass-through) | ₹7,96,500 | **₹11,50,500** | ₹17,11,000 |

### 6.6 Per-seat scaling

For each employee added beyond 150:
- **Pass-through licenses:** at vendor cost (M365 + Entra + EDR ≈ ₹1,400/user/mo)
- **Managed services overhead:** **₹650 per employee per month**

For each employee removed below 150:
- Pass-through reduces 1:1 with license adjustment (CSP commitment cycles apply)
- No reduction in managed-services fee for first 15 seats; thereafter, ₹400/seat/mo reduction

### 6.7 Annual escalation

Managed-services fee escalates **8% per annum** at each renewal anniversary.

---

## 7. Pass-through billing model

To preserve full transparency:

- All pass-through costs (licenses, internet, hardware) are invoiced at **actual vendor cost** with the underlying invoice attached for audit
- Pass-throughs are billed **monthly in arrears** based on actual consumption
- No procurement margin on pass-throughs (we earn a small CSP / partner rebate from Microsoft / vendors which goes to operating expense, not client billing)
- Hardware refresh is planned 12 months in advance with the hospital's CFO and approved before order

---

## 8. Contract terms

- **Initial term:** 36 months from cutover (post-transition)
- **Renewal:** Auto-renews for 12-month terms unless either party provides 90 days' notice
- **Termination for convenience:** 6 months' notice (after initial 24 months) due to scale of operations and team retention obligations
- **Termination for cause:** 30-day cure period for material breach
- **Exit assistance:** 3 months of transition support to incoming vendor included at no charge if the contract runs full term
- **Data return:** Full data export (HMIS DB, file shares, M365 archive) within 30 days of termination
- **Liability:** Capped at six (6) months of managed-services fees for direct damages; consequential damages excluded
- **Insurance:** Service provider maintains professional indemnity and cyber-liability insurance of ₹5 crore minimum

---

## 9. Governance

| Cadence | Forum | Attendees | Duration |
|---------|-------|-----------|----------|
| Daily | Operations standup (internal) | Site Manager + L1/L2 | 15 min |
| Weekly | Hospital ops review | Site Manager + Hospital Admin/MS | 30 min |
| Monthly | Service review | Account Manager + Hospital CFO/MS | 60 min |
| Quarterly | QBR | Engineering Lead + Account Director + Hospital MD/CFO | 90 min |
| Annual | Strategic IT review | Account Director + Hospital MD + CTO/CFO | Half-day |

### 9.1 Reporting

The hospital receives monthly reports including:

- Ticket volume by category, severity, and resolution time
- SLA compliance per severity
- Uptime metrics for HMIS, M365, Entra, network, internet
- Incident summaries
- Patch compliance percentages
- Backup success rates
- Asset inventory deltas
- Vulnerability scan results and remediation status
- Cost trend (managed services vs. pass-through)

### 9.2 Annual deliverables

- IT strategy roadmap (March)
- Penetration test report (May)
- DR drill report (September)
- Year-in-review and ahead-look (December)

---

## 10. Implementation roadmap

| Phase | Weeks | Activities | Hospital responsibility |
|-------|-------|------------|------------------------|
| Discovery | 1-4 | Site walkthrough, asset audit, network capture, stakeholder interviews, risk register | Provide access, introductions, current vendor contacts |
| Tooling | 3-6 | RMM/ITSM/SIEM/EDR rolled out; tickets baselined | Approve agents on endpoints, provide M365 admin |
| Network | 5-8 | Firewall rules, VLAN cleanup, WiFi survey, ISP redundancy | Approve changes, schedule maintenance windows |
| Identity | 6-9 | Entra ID setup, user migration, MFA enablement | HR data feed, communication to staff |
| Cutover | 9-10 | Full ownership transfer; legacy vendors offboarded; SOPs and runbooks signed off | Joint cutover meeting, sign off on completeness |
| Steady state | 11+ | Standard managed-services operations | Routine collaboration |

---

## 11. Hospital responsibilities

For the engagement to succeed, the hospital agrees to:

1. **Designate a single business owner** (typically the Medical Superintendent or COO) with authority to approve changes, sign off on incidents, and resolve internal escalations
2. **Provide unrestricted onsite access** for the IT Site Manager and L1 engineers during agreed coverage hours, including secure storage for tools and stock
3. **Maintain an updated HR feed** (joiners/leavers/movers) for identity provisioning workflows
4. **Approve hardware refresh budgets** in advance per the annual capex plan
5. **Cooperate with security policy enforcement** (MFA, password policies, acceptable-use policy, BYOD policy)
6. **Notify in advance** of any large events (NABH inspection, audit, mass hiring, OT expansion) so that we can scale capacity
7. **Pay invoices on time** per the agreed payment terms

---

## 12. Out of scope

The following items are explicitly out of scope and would be billed separately on quote:

- Medical equipment integration (X-ray, CT, MRI, pathology analysers) — quoted as separate integration projects
- ABDM / NDHM / PMJAY integrations
- HL7 FHIR adapter development
- Hospital website, marketing, SEO
- CCTV / surveillance / physical access control (except basic monitoring)
- Voice-over-IP / PBX implementation (we'll manage if existing; new deployment is a project)
- Building management systems, HVAC, fire alarm IT
- Major application development (beyond HospitalPro maintenance)

---

## 13. Why us

- **We built HospitalPro.** No second-vendor handoff for HMIS issues — the engineering team that wrote the code is on call
- **Healthcare-experienced.** Familiar with NABH, DPDP, clinical workflow constraints
- **Single accountable team.** The Site Manager is your single throat to choke
- **Predictable economics.** Managed-services fee is fixed; pass-through is at vendor cost with full receipts
- **Scale without disruption.** As the hospital grows, the team grows with you on a transparent per-seat model

---

## 14. Acceptance

| For Busitema Referral Hospital | For [Your Company Name] |
|-------------------------------|-------------------------|
| Name: ____________________________ | Name: ____________________________ |
| Title: ____________________________ | Title: ____________________________ |
| Date: ____________________________ | Date: ____________________________ |
| Signature: _______________________ | Signature: _______________________ |

---

## Appendix A — Sample SLA penalty calculation

If HMIS uptime in May 2026 is measured at 98.7%:
- Falls in the 98.0%–98.9% bucket → 10% service credit
- Standard managed services fee that month: ₹9,75,000
- Service credit: ₹97,500
- Applied to June 2026 invoice as a deduction

## Appendix B — Roles & responsibilities matrix (RACI)

A full RACI matrix covering 80+ recurring IT activities is provided as a separate document (RACI-Matrix.xlsx) for reference. Highlights:

| Activity | Hospital | Vendor |
|----------|----------|--------|
| Approve hardware purchases | A | R, C |
| Patch endpoints | I | R, A |
| Onboard new employee (IT) | C | R, A |
| Approve Entra ID role assignments | A | R |
| Investigate clinical data issue in HMIS | C | R, A |
| Decide on M365 license tier | A | C |
| Pay vendor invoices for pass-through | A, R | C |

A = Accountable, R = Responsible, C = Consulted, I = Informed

## Appendix C — Sample monthly invoice format

```
Invoice No: MSP-2026-0X
Period: 1 May 2026 – 31 May 2026
Bill To: Busitema Referral Hospital

A. MANAGED SERVICES (fixed)
   Standard Tier monthly fee ............ ₹9,75,000
   GST @ 18% ............................ ₹1,75,500
   Subtotal A ........................... ₹11,50,500

B. PASS-THROUGH (variable, at cost)
   Microsoft 365 Business Standard
     150 licenses × ₹720 ................ ₹1,08,000
     [Microsoft CSP invoice attached]
   EDR — 200 endpoints × ₹400 .......... ₹80,000
     [CrowdStrike invoice attached]
   Internet primary circuit ............ ₹25,000
     [ISP invoice attached]
   ...
   Subtotal B (pre-GST) ................ ₹3,40,000
   GST on pass-through (where applicable) ₹61,000
   Subtotal B .......................... ₹4,01,000

C. ONE-TIME (if any this month)
   (none this period)

GRAND TOTAL ........................... ₹15,51,500

Payment terms: Net 15 days
```

---

*— End of proposal —*
