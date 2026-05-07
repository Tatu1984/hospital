---
title: "HospitalPro — Cybersecurity Architecture"
subtitle: "Defense-in-depth blueprint for a 150-employee hospital running HospitalPro"
audience: "CIO/CISO, IT leadership, Auditors, Insurance underwriters"
date: "May 2026"
version: "1.0"
classification: "Internal — share only under NDA"
---

# HospitalPro — Cybersecurity Architecture

## 1. Executive summary

This document is the cybersecurity blueprint for a hospital running the HospitalPro HMIS platform under the Managed IT Services agreement. It captures the **architectural principles, control layers, operational cadence, and compliance posture** the hospital and its IT partner jointly maintain.

The architecture follows three operating principles:

1. **Defense in depth.** No single control is trusted — every threat path crosses multiple independent controls (network, identity, endpoint, application, data, monitoring) so a single failure does not breach patient data.
2. **Zero trust.** No traffic is implicitly trusted by location (LAN ≠ trusted). Every request authenticates, every session reauthorizes, every action is logged.
3. **Least privilege.** Every user, every service account, every device receives only the access required for its role; admin rights are time-boxed.

**Threat model summary** — the hospital is realistically targeted by: ransomware operators, cybercrime credential theft, supply-chain compromise of medical devices, insider data theft of patient records, and untargeted opportunistic scans. State-actor targeting is not a primary concern for this size of facility.

**Compliance framework** — the architecture is engineered to meet:

- **DPDP Act 2023** (India's primary data protection statute, in force from August 2025)
- **NABH IT/Information-Security controls** for hospital accreditation
- **ISO/IEC 27001:2022** alignment (without formal certification in v1)
- **Razorpay PCI-DSS** scope reduction (no card data ever touches our systems)

**Risk posture (snapshot)** — Initial state at managed-services cutover:

| Risk area | Rating (Likelihood × Impact) | Trend |
|---|---|---|
| Ransomware | High × Critical | Mitigated by EDR + immutable backups |
| Phishing → credential theft | High × High | Mitigated by Entra ID MFA + email gateway |
| Insider data theft | Medium × High | Mitigated by RBAC + audit + DLP |
| Medical-device exploit | Medium × Critical | Mitigated by network segmentation |
| Cloud misconfiguration | Low × High | Mitigated by IaC + monthly review |
| Vendor breach | Medium × Medium | Mitigated by SOC2 vendor policy |

---

## 2. Architecture principles

### 2.1 Defense in depth — the seven layers

```
┌────────────────────────────────────────────────────────────┐
│  Layer 7 — Governance, training, policy                    │ Awareness, NDAs, IR plan
├────────────────────────────────────────────────────────────┤
│  Layer 6 — Monitoring, SIEM, SOC                           │ Detect & respond
├────────────────────────────────────────────────────────────┤
│  Layer 5 — Application (HospitalPro RBAC, audit, validators)│ Logic enforcement
├────────────────────────────────────────────────────────────┤
│  Layer 4 — Identity (Entra ID, MFA, conditional access)    │ Who can act
├────────────────────────────────────────────────────────────┤
│  Layer 3 — Endpoint (EDR, encryption, MDM, patching)       │ The device speaks safely
├────────────────────────────────────────────────────────────┤
│  Layer 2 — Network (NGFW, segmentation, WiFi tiers, VPN)   │ Where traffic flows
├────────────────────────────────────────────────────────────┤
│  Layer 1 — Physical (racks, server room, badges, cameras)  │ The premises
└────────────────────────────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
       Data layer    PHI / clinical / financial — encrypted at rest + in transit
```

A control failure at one layer does not breach the system. Example: a stolen laptop (L3 fail) is still useless without Entra credentials (L4) and MFA (L4) and conditional access location check (L4).

### 2.2 Zero-trust adoption (where we are vs. ideal)

| Pillar | Current | 12-month target |
|---|---|---|
| Identity verification on every request | ✅ (JWT + MFA) | ✅ |
| Device trust check | ❌ | ✅ Intune/MDM compliance gate |
| Application-aware access | ✅ (RBAC) | ✅ |
| Data sensitivity labelling | Partial | ✅ (Microsoft Information Protection) |
| Continuous session evaluation | Partial | ✅ Entra Continuous Access Evaluation |

### 2.3 Least privilege concrete examples

- **Doctor** — sees only patients on their roster; edits only their own clinical notes; no access to billing reconciliation
- **Front-office** — registers + searches patients; no access to clinical notes, lab results, or financial reports
- **Lab technician** — sees only the lab module; no patient demographics beyond MRN/name
- **IT admin** — Privileged Identity Management (PIM) — admin role active for 4-hour windows on demand, then auto-downgraded. All actions audit-logged
- **Service accounts** — distinct per integration (SMS gateway, email gateway, Razorpay, backup). Each has only the scopes it needs.

---

## 3. Identity & Access Management (Layer 4)

Identity is the keystone — once an attacker has a valid credential, every other control degrades. Get this right.

### 3.1 Microsoft Entra ID configuration

Single tenant for the hospital. Federated to:

- HospitalPro web portal (OIDC / SAML)
- Microsoft 365 (native)
- Razorpay merchant dashboard (admin-only group)
- Vercel deployments (admin-only group)
- ITSM helpdesk (Freshservice / JSM)

Every employee has exactly **one** Entra identity. Departing employees are disabled (not deleted) within 30 minutes of HR notification — automated via the JML (joiner/mover/leaver) workflow.

### 3.2 Multi-Factor Authentication

Enforced for **100% of users** (no exceptions). Methods, in order of preference:

1. **Microsoft Authenticator** (push notification with number-match) — primary
2. **FIDO2 security keys** — for IT admins and clinical leadership
3. **OATH TOTP app** (Google/Microsoft Authenticator) — backup
4. **SMS** — last-resort only, not allowed for admin accounts (vulnerable to SIM-swap)

Voice-call MFA is **disabled** entirely.

### 3.3 Conditional Access policies

| Policy | Trigger | Action |
|---|---|---|
| Block legacy auth | Any IMAP/POP/SMTP basic auth | Deny |
| Require MFA from outside India | Geo-IP outside IN | Block + alert |
| Require MFA always | All sign-ins | Require MFA |
| Block unmanaged devices for admins | Admin role + non-Intune device | Deny |
| Risky sign-in remediation | Entra Identity Protection P2 risk score ≥ medium | Force MFA + password change |
| Session lifetime — admins | Admin role | 4-hour tokens, no persistent sessions |
| Session lifetime — clinicians | Clinical roles | 12-hour tokens |
| Session lifetime — kiosks | Front-desk shared workstations | 1-hour idle timeout, force re-auth |

### 3.4 Privileged Identity Management (PIM)

All admin roles (Global Admin, Security Admin, Application Admin) are **eligible**, not active. To use them an IT engineer:

1. Activates the role via PIM with a justification reason (linked to ticket id)
2. Approves an MFA challenge
3. Has the role for max 4 hours
4. Auto-downgrades back to user-level when the window expires

This means an unattended admin laptop or stolen credential cannot perform admin actions without an additional fresh MFA prompt + business justification logged.

### 3.5 Self-Service Password Reset (SSPR)

Enabled with **two methods required** per user (e.g. authenticator + alt email). Reduces helpdesk workload by ~60% and shrinks password-reset social-engineering attack surface.

### 3.6 Joiner / Mover / Leaver (JML)

```
HR system  ──(daily feed)──▶  Entra ID  ──(provisioning)──▶  HospitalPro / M365 / etc.

Joiner:    Account created at offer-accept. Day-1 group memberships set automatically
           based on role + department. Welcome email with one-time setup link.

Mover:     Department change → group membership recalculated → access surface adjusts
           atomically. Audit row written.

Leaver:    HR sets termination date. Account disabled at 23:59 of last day.
           Group memberships removed. Mailbox set to litigation-hold for 90 days.
           Personal data scrubbed after 7 years per DPDP retention rules.
```

---

## 4. Network architecture (Layer 2)

### 4.1 Network segmentation map

```
Internet ──┬── ISP-A (200 Mbps) ──┐
           │                       ├── NGFW Cluster (Fortinet 60F HA pair)
           └── ISP-B (50 Mbps 5G) ─┘            │
                                                ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │                    Core LAN switch                       │
                  └─────────────────────────────────────────────────────────┘
                  │       │       │       │       │       │       │
                  ▼       ▼       ▼       ▼       ▼       ▼       ▼
                VLAN10  VLAN20  VLAN30  VLAN40  VLAN50  VLAN60  VLAN99
                Clinical Admin  Lab/Rad PACS   Medical Guest  Mgmt
                workstns workstns + biomet OT/CT   IoT    WiFi   (NMS)
```

### 4.2 VLAN policy

| VLAN | Hosts | Outbound | Inter-VLAN | Notes |
|---|---|---|---|---|
| 10 — Clinical | OPD/IPD desktops, nursing stations | M365 + HospitalPro + DNS only | Allow → 30, 40 | EDR-managed |
| 20 — Admin | Billing, HR, finance desktops | Per-app whitelist | Allow → 50 (Tally) | EDR-managed |
| 30 — Lab/Imaging | Lab analyzer PCs, biometric scanners | HospitalPro + analyzer vendor only | Deny outbound to internet by default | Many legacy/unpatchable |
| 40 — PACS / OT cameras | Imaging archives, OT video | Internal only | Deny inbound from 10/20 except specific IPs | High bandwidth |
| 50 — Medical IoT | Infusion pumps, ventilators, monitors | Vendor cloud only (allowlisted FQDNs) | Deny lateral movement | Often unpatchable — **isolation is the control** |
| 60 — Guest WiFi | Patient/visitor phones | Internet only via captive portal | **No** access to any other VLAN | DPI on this VLAN |
| 99 — Management | Switches, APs, NMS, RMM agents | Out-of-band | Strictly admin-only | MAC-port lock |

### 4.3 Firewall posture

- **Default deny** outbound and inbound
- IDS/IPS signatures on all north-south traffic, updated hourly
- TLS inspection on Clinical (10) and Admin (20) VLANs (excluding banking, healthcare-portal, and government sites — privacy / legality)
- Geo-block on inbound: only allow connections from India for management interfaces
- DDoS mitigation handled at ISP edge (clean-pipe service)
- Rule changes require **change control ticket**; no direct console edits

### 4.4 Wireless

Three SSIDs broadcast across all enterprise APs (Aruba / Ubiquiti UniFi):

| SSID | VLAN | Auth | Visible to |
|---|---|---|---|
| `hospital-staff` | 10 | WPA3-Enterprise via Entra (RADIUS) | Staff devices only |
| `hospital-iot` | 50 | WPA3-PSK with rotating key | Vendor-onboarded devices only |
| `hospital-guest` | 60 | Captive portal + T&C | Patients, visitors |

The legacy `hospital-wifi` SSID with WPA2-PSK is **decommissioned** at cutover.

### 4.5 Remote access

- **No VPN to LAN.** Replaced by Zero-Trust Network Access (ZTNA) — Cloudflare Access / Tailscale — per-app tunnels with Entra ID auth + device posture check
- Site-to-site IPSec VPN to the cloud backup vault only
- Vendor remote support uses **Splashtop SOS** (attended only, session-recorded, time-boxed)

---

## 5. Endpoint security (Layer 3)

### 5.1 Standard Operating Environment (SOE)

Every staff laptop / desktop is built from a single image:

- **OS:** Windows 11 Pro 23H2 (or macOS 14+ for clinicians who request)
- **MDM:** Microsoft Intune — auto-enrolled at first login via Entra
- **Encryption:** BitLocker (Windows) / FileVault (macOS) — recovery keys escrowed in Entra
- **Local admin:** **disabled for end-users**. LAPS rotates the local admin password every 24 hours; only IT can read it
- **EDR:** CrowdStrike Falcon Pro (or SentinelOne) — central console, auto-quarantine on critical detections
- **Patching:** Intune update rings — N+1 day on critical CVEs, weekly cadence for cumulative updates
- **Browser:** Microsoft Edge with managed extensions; Chrome allowed but not preferred
- **Disallowed:** uTorrent, TeamViewer, AnyDesk, third-party password managers (1Password Business is the standard)
- **USB:** read-only by default; write-access requires manager approval with audit trail

### 5.2 BYOD policy

Personal phones are allowed for HospitalPro mobile apps only, with these constraints enforced via Intune App Protection Policies:

- App data encrypted in app sandbox
- Copy/paste from HospitalPro app to personal apps blocked
- Screenshots disabled inside HospitalPro mobile apps
- Remote wipe of HospitalPro app data possible without touching personal data
- Jailbroken/rooted devices blocked

### 5.3 Medical devices (special handling)

Many clinical devices run unsupported OS (Windows XP/7) and cannot be patched. These are mitigated by **isolation, not protection**:

1. Live on VLAN 50 with strict ACL
2. No internet access except whitelisted vendor-update FQDNs
3. EDR is **not** installed on these (often unsupported, can crash device)
4. Network anomaly detection (Auvik) flags any new outbound flow
5. Annual asset audit confirms what's in scope
6. Vendor-supplied agents are sandboxed and reviewed before install

### 5.4 Mobile device management

- **Hospital-owned devices** — full Intune enrollment, full visibility, remote wipe
- **BYOD** — App Protection Policies only (no full MDM, respects employee privacy)
- Lost-device flow: helpdesk receives report → wipes corporate data within 1 hour

---

## 6. Application security (Layer 5) — HospitalPro-specific

### 6.1 RBAC (already implemented)

`backend/src/routes/index.ts` registers every route with required permissions. The `enforceRoutePermissions` middleware fails-closed: a route not in the registry is **denied**, not allowed-by-default.

Permissions follow `<resource>:<action>` (e.g. `patients:view`, `lab:create`). Roles map to permission sets. Every HTTP request goes through:

```
Request → JWT verified → User loaded → Permissions resolved → Route checked → Handler
```

### 6.2 Validation

Zod schemas on every endpoint that accepts a body. Empty / malformed bodies return 400 with a specific field error. No request reaches the handler if validation fails.

### 6.3 Audit logging

Every privileged action writes to `audit_logs`:

- WHO (`userId` + `performedBy` for impersonation cases)
- WHAT (`action`, `resource`, `resourceId`)
- WHEN (`timestamp` UTC)
- WHERE (`ipAddress`)
- DELTA (`oldValue` and `newValue` for updates)

Audit log retention is **7 years** (DPDP minimum for healthcare records). Audit table is append-only — no delete or update permission granted to any role.

Surfaced in System Control → Audit Logs (with date / module / user filters).

### 6.4 Secrets management

- All secrets in Vercel environment variables (not in code, not in env files committed to git)
- Database URL, JWT secrets, Razorpay keys, SMS provider keys — **rotated every 90 days**
- Secret-scanning pre-commit hook (gitleaks) blocks accidental commits
- Quarterly review of secret usage; unused secrets deleted

### 6.5 Dependency management

- `npm audit` runs in CI on every push; high/critical CVEs block merge
- Dependabot opens PRs weekly for security patches
- Major-version upgrades quarterly with testing
- Pinned versions in lockfiles; no `^` in security-sensitive packages

### 6.6 Output encoding & input handling

- React auto-escapes JSX (XSS-safe by default)
- Prisma is parameterized — no string concatenation in queries
- File uploads scanned via vendor antivirus before storage
- PDF rendering happens server-side; no client-controlled PDF templates

### 6.7 Rate limiting

- `/api/auth/login` — 10 attempts per 15 min per IP, then 429
- `/api/mobile/v1/auth/*` — same policy
- General API — 1000 requests per minute per token (alarms at 80%)

### 6.8 Application security testing

| Test | Cadence | Tool |
|---|---|---|
| SAST (static code analysis) | Every PR | Semgrep + GitHub CodeQL |
| Dependency scan | Every push | npm audit + Snyk |
| Secret scan | Every push | gitleaks |
| DAST (dynamic) | Weekly | OWASP ZAP scheduled scan |
| External pentest | Annual | Third-party CERT-In empanelled vendor |
| Mobile-app penetration | Pre-store-release | OWASP MASVS Level 1 minimum |

---

## 7. Data security & encryption

### 7.1 Data classification

| Class | Examples | Controls |
|---|---|---|
| **Restricted** | Patient clinical data, financial records, biometric templates | Encrypted at rest + in transit; access logged; restricted to need-to-know roles |
| **Confidential** | Employee HR data, internal financials, contracts | Encrypted; standard RBAC |
| **Internal** | Operational dashboards, vendor lists | Authenticated access |
| **Public** | Marketing site, doctors directory | No restrictions |

Classification enforced via Microsoft Information Protection labels (target: 12-month deployment).

### 7.2 Encryption at rest

| Data store | Encryption | Key management |
|---|---|---|
| PostgreSQL (Neon/RDS) | AES-256 (provider-managed) | Cloud KMS, rotated annually |
| Object storage (S3-compat) | SSE-S3 (AES-256) | KMS-managed |
| Backup vault | AES-256 with per-backup unique data key | Customer-managed (CMK) |
| Endpoint disks | BitLocker / FileVault | Recovery key in Entra |
| Mobile device storage | iOS Data Protection / Android Keystore | OS-managed |

### 7.3 Encryption in transit

- **All client → backend:** TLS 1.3 (TLS 1.2 minimum), HSTS preload, certificate pinning on mobile apps
- **Internal service-to-service:** mutual TLS where supported, otherwise TLS 1.2+ with cert validation
- **Email:** Opportunistic TLS for outbound; MTA-STS + TLS-RPT published for inbound
- **VPN / ZTNA:** WireGuard or QUIC

### 7.4 Patient data lifecycle

```
Capture (registration) → Active use (clinical) → Archive (post-discharge)
                                                         │
                                                         ▼
                                              Retention (per DPDP rules)
                                                         │
                                                         ▼
                                              Anonymization or deletion
```

DPDP Act retention rules:

- **Active clinical records:** retained while the patient is actively under care + 7 years after last visit
- **Diagnostic images:** 7 years post-acquisition
- **Financial records:** 8 years (Income Tax Act overrides DPDP minimum)
- **Audit logs:** 7 years
- **Right to erasure:** the hospital is **not** obliged to delete clinical records if regulatory retention applies (DPDP allows lawful-purpose exception). The patient is informed of this exception.

### 7.5 Data Subject Requests (DSRs)

Per DPDP Act, patients can request:

| Right | SLA | Process |
|---|---|---|
| Access (copy of their data) | 30 days | Request via patient app or front desk; data export generated; identity verified before release |
| Correction | 30 days | Front-desk update form; certain fields (name, DOB, gender) require photo ID |
| Erasure | 30 days, subject to retention exceptions | Reviewed by DPO; clinical data not erased while retention applies |
| Grievance | 30 days | Designated Grievance Officer per DPDP |

The hospital's **Data Protection Officer (DPO)** is named in the privacy notice on the patient app and the public website. Contact email: `dpo@<hospital>.com`.

### 7.6 Cross-border data transfer

DPDP Act allows transfer to countries notified by the Government as adequate. As of writing, no notification list is published, so the hospital's policy is:

- All primary data stays in **AWS / Azure India regions**
- Cross-border processing is not used unless approval obtained
- Vercel deployments are pinned to `bom1` (Mumbai) / `sin1` for failover — both within "Asia" but the data store is single-region India

---

## 8. Email & messaging security

### 8.1 Inbound

- **MX:** routed through Microsoft Defender for Office 365 P1
- **Gateway controls:** SPF, DKIM, DMARC enforced; quarantine on `dmarc=fail`
- **Anti-phish:** Microsoft Defender + KnowBe4 simulations monthly
- **Attachment sandboxing:** dynamic detonation in cloud sandbox before delivery
- **Banner injection:** external sender banner ("⚠ External email") on every inbound message

### 8.2 Outbound

- All outbound mail signed with DKIM
- Hospital-domain SPF record: hard-fail
- DMARC: `p=reject` after 6-month monitoring period
- Patient-facing transactional mail (appointment reminders, OTP, invoices) routed through SendGrid with separate sub-domain (`mail.<hospital>.com`) so a phishing attack on the main domain doesn't poison patient trust

### 8.3 SMS / patient messaging

- DLT-registered templates only (TRAI compliance for India)
- Header is the hospital short-code (e.g. `BUSITA`)
- One-time passwords expire in 5 minutes
- Surgery tracker links use signed JWTs valid for 24 hours; no credentials shared via SMS

### 8.4 In-app messaging

HospitalPro itself does not have generic in-app chat (out of scope for v1). Future addition would require encryption-at-rest of message content + DLP scanning + retention rules.

---

## 9. Backup, disaster recovery, business continuity

### 9.1 The 3-2-1-1-0 rule

- **3** copies of every dataset
- on **2** different media
- with **1** copy off-site
- and **1** copy **immutable** (object lock / WORM)
- and **0** errors verified by monthly restore test

### 9.2 Backup matrix

| Data | Frequency | Retention | Storage | Encryption |
|---|---|---|---|---|
| HospitalPro Postgres (full) | Daily 02:00 IST | 30 days rolling + 12 monthly + 7 yearly | Cloud object lock (immutable) | AES-256 customer-managed key |
| Postgres WAL archive | Continuous | 7 days | Cloud | AES-256 |
| Object storage (uploaded reports, photos) | Versioned bucket + cross-region replication | 7 years | India primary, India secondary | SSE-KMS |
| Microsoft 365 (mail + OneDrive + SharePoint) | Daily | 1 year | Veeam M365 Cloud | Provider-managed |
| Endpoint user folders | Continuous (OneDrive sync) | 30 days version history | Microsoft cloud | Provider |
| Server image (VM) | Weekly | 90 days | Cloud | AES-256 |
| Configuration (firewall, switch, RMM) | On every change | Indefinite | Git + cloud vault | Git-encrypted |

### 9.3 Restore SLA

- **HospitalPro database:** RPO 15 minutes, RTO 4 hours
- **Microsoft 365 mailbox/file:** RPO 24 hours, RTO 8 hours
- **Endpoint full restore:** RPO 24 hours (depends on user OneDrive sync), RTO 4 hours
- **Whole-site outage:** RPO 1 hour, RTO 8 hours (DR drill-validated)

### 9.4 DR drills

- **Monthly:** restore-test of one random backup; verify integrity; pen-and-paper documented
- **Quarterly:** full DR exercise — bring up HospitalPro from backups in an isolated environment, validate clinical workflows, sign off
- **Annually:** tabletop ransomware exercise with hospital leadership; failover simulation; lessons learned tracked

### 9.5 Business continuity for clinical operations

If HospitalPro is unavailable:

1. Front-office switches to paper registration with pre-printed forms
2. OPD continues on paper notes (pre-printed proforma)
3. Lab uses paper requisition + standalone result entry on local LIS
4. Pharmacy uses paper dispensing log
5. All paper data is back-entered into HospitalPro within 24 hours of restoration
6. Drill: every clinical area runs a **30-minute paper-fallback drill** twice a year

---

## 10. Logging, monitoring, SIEM & SOC

### 10.1 Telemetry sources

| Source | Logs forwarded |
|---|---|
| HospitalPro backend (Vercel) | App logs + audit_logs table → SIEM via Vercel Log Drain |
| Postgres | pg_audit + slow query log |
| Entra ID | Sign-in logs + audit logs + risky sign-ins → Sentinel |
| Microsoft 365 | Audit unified log → Sentinel |
| EDR (CrowdStrike / SentinelOne) | All detections + telemetry → Sentinel |
| Firewall | Traffic + IPS + URL filter → SIEM |
| Switches / WiFi | DHCP, RADIUS, port-security violations |
| RMM | Asset state + missing patches |
| Cloud (AWS / Azure) | CloudTrail / Activity Log |
| Application access | All authn + authz decisions |

### 10.2 SIEM platform

**Microsoft Sentinel** as the primary SIEM (native Entra integration, healthcare templates). Secondary option: ELK or Wazuh for cost-sensitive deployments.

### 10.3 Detection rules

Tier-1 (immediate alert):

- Brute-force login (5+ failed in 5 min)
- Successful login from new country / impossible-travel
- Privilege escalation outside change-window
- Mass data export from HospitalPro
- Mass file download from M365
- Disabled-account reactivation
- EDR critical-severity detection
- Backup failure 2 days running
- Domain admin role activation

Tier-2 (review within 1 business day):

- New service account created
- Firewall rule modified
- M365 admin role assignment
- Failed MFA challenge spike
- Email forwarding rule auto-created (compromise indicator)

### 10.4 SOC operating model

For a 150-employee hospital, a fully on-prem 24×7 SOC is over-engineered. The model is:

| Tier | Coverage | Where |
|---|---|---|
| L1 — Alert triage | 24×7 | Shared SOC at managed-services partner |
| L2 — Investigation | 24×7 | Shared SOC |
| L3 — Incident response | On-call | Dedicated to this hospital |
| Forensic / IR retainer | On-demand | Pre-paid 40 hours/year with CERT-In empanelled IR firm |

### 10.5 Mean Time To Detect (MTTD) targets

| Threat | Target MTTD |
|---|---|
| Compromised credential (impossible-travel) | < 5 min |
| Brute-force attack | < 15 min |
| Ransomware encryption activity | < 5 min (EDR auto-isolate) |
| Exfiltration (10 GB+ outbound) | < 30 min |
| Insider data access pattern anomaly | < 24 hours |

---

## 11. Compliance framework

### 11.1 DPDP Act 2023 — control mapping

| DPDP requirement | Our control |
|---|---|
| Consent before processing | Patient registration form has explicit consent checkbox; consent recorded with timestamp |
| Notice (purpose, retention, rights, contact) | Privacy notice on patient app onboarding + on patient registration paper form |
| Purpose limitation | RBAC ensures only need-to-know access; audit prevents misuse |
| Data minimisation | Schema reviewed annually; fields removed where unused |
| Accuracy | Patient self-edit via mobile app; correction request workflow |
| Storage limitation | Retention rules in Section 7.4 |
| Security safeguards | This entire document |
| Breach notification (72 hours to Data Protection Board) | IR plan §13 includes 72-hour reporting workflow |
| Designated DPO + Grievance Officer | Named in privacy notice |
| Data Subject Requests | §7.5 |
| Children's data (<18) | Verifiable parental consent flow at registration |
| Cross-border transfer | India-only as default (§7.6) |

### 11.2 NABH Information Management standards

NABH 5th edition has IMS (Information Management Standards) covering: data backup, security, audit trail, business continuity, training. Our implementation maps cleanly. Annual gap-analysis ahead of NABH inspection.

### 11.3 ISO 27001:2022 alignment

We align with the 2022 control set without pursuing certification in v1 (cost vs. benefit at 150-employee scale). Annex A controls grouped into:

- Organizational (37 controls) — all addressed via policy framework §16
- People (8 controls) — training, awareness, NDAs (§18)
- Physical (14 controls) — server room, badges (§14)
- Technological (34 controls) — this document end-to-end

### 11.4 PCI-DSS scope

We **never** store, transmit, or process card data. All payments flow through Razorpay's hosted page. Our scope is limited to the **redirect URL + webhook signature verification** — Razorpay's PCI-DSS Level 1 attestation transitively covers us. SAQ-A applies.

### 11.5 Audit calendar

| Audit | Cadence | Auditor |
|---|---|---|
| Internal security review | Quarterly | Internal IT |
| Vulnerability assessment | Quarterly | External vendor (CERT-In empanelled) |
| Penetration test | Annual | External vendor |
| NABH IMS gap analysis | Annual | Quality consultant |
| DPDP compliance review | Annual | Legal / DPO |
| Backup restore audit | Monthly | Internal IT |
| Access review | Quarterly | Department managers |

---

## 12. Threat model

### 12.1 Adversaries

| Actor | Motivation | Capability | Likelihood |
|---|---|---|---|
| **Ransomware operator** | Financial extortion | High — automated, well-resourced | High |
| **Cybercrime credential broker** | Resell credentials | Medium — phishing kits + bulk attacks | High |
| **Disgruntled insider** | Revenge or financial | Medium — has legitimate access | Medium |
| **Curious insider** | Snooping / blackmail | Low — limited skills, RBAC limits scope | Medium |
| **Hacktivist** | Political messaging | Low–Medium | Low |
| **State-actor** | Espionage / sabotage | Very high | Very low |
| **Script kiddie / opportunistic** | Bragging / random | Low — automated scanners | High volume, low impact |

### 12.2 Attack surface

```
External:                                  Internal:
  • Public website                          • Compromised endpoint
  • HospitalPro web portal                  • Insider with valid creds
  • Mobile app stores                       • Medical device on VLAN 50
  • Razorpay redirect                       • USB / removable media
  • Email                                   • Lateral movement after breach
  • SMS gateway                             • Privileged service account
  • Vercel / cloud APIs                     • Backup vault credentials
```

### 12.3 Crown jewels

What must never leak / be unavailable:

1. Patient clinical records (PHI)
2. Laboratory results awaiting communication to clinicians
3. Pharmacy stock + drug interaction database
4. Financial records / outstanding receivables
5. Doctor-patient communication metadata
6. Biometric templates (fingerprint / face)

### 12.4 Top 10 risks (post-control)

| # | Risk | Likelihood | Impact | Inherent | Residual | Owner |
|---|---|---|---|---|---|---|
| 1 | Ransomware locks production | Medium | Critical | Critical | Medium | CISO |
| 2 | Phishing → privileged credential theft | High | High | High | Medium | IT lead |
| 3 | Insider exfiltration of patient list | Medium | High | High | Low | DPO |
| 4 | Medical device exploitation → lateral movement | Medium | Critical | Critical | Medium | IT lead |
| 5 | Cloud misconfiguration → public bucket | Low | High | Medium | Low | DevOps |
| 6 | Backup failure during restore need | Low | Critical | High | Low | Backup admin |
| 7 | DDoS on payment / appointment booking | Low | Medium | Medium | Low | Cloud team |
| 8 | Vendor breach → supply chain | Medium | Medium | Medium | Low | Procurement |
| 9 | Lost / stolen device with PHI | Medium | Medium | Medium | Low | IT lead |
| 10 | Stale account abuse | Low | Medium | Medium | Low | HR/IT |

---

## 13. Incident response plan

### 13.1 Severity classification

| Severity | Definition | Examples | Notification |
|---|---|---|---|
| **SEV-1 Critical** | Active breach, patient safety, full outage | Ransomware encryption running, mass PHI exfiltration | CISO + MD within 15 min; CERT-In within 6 hours; DPB within 72 hours |
| **SEV-2 High** | Confirmed compromise, contained | Single account compromised, EDR detection mass-quarantine | CISO + IT lead within 1 hour |
| **SEV-3 Medium** | Suspected anomaly | Failed-login spike, suspicious sign-in | IT lead within 4 hours |
| **SEV-4 Low** | Informational | Phishing email reported, vulnerability scan finding | Standard ticket |

### 13.2 IR workflow

```
Detect ──▶ Triage ──▶ Contain ──▶ Eradicate ──▶ Recover ──▶ Lessons learned
   │          │          │            │             │             │
   │          │          │            │             │             ▼
   │          │          │            │             │     Post-incident review
   │          │          │            │             │     Update runbooks
   │          │          │            │             ▼
   │          │          │            │     Resume normal operations
   │          │          │            │     Restore from backup if needed
   │          │          │            ▼
   │          │          │     Patch / re-image / rotate
   │          │          ▼
   │          │     Isolate device / disable account / firewall block
   │          ▼
   │     Severity + scope + comms plan
   ▼
SIEM alert / EDR detection / user report / vendor alert / external notification
```

### 13.3 Communications matrix

| Stakeholder | When | How | By whom |
|---|---|---|---|
| Hospital MD / CEO | SEV-1, SEV-2 | Phone within 30 min | CISO |
| Department heads | SEV-1 | In-person briefing within 4 hours | MD + CISO |
| Affected patients | If PHI breached | Letter within 72 hours | DPO + Legal |
| Data Protection Board | If PHI breached | Form filing within 72 hours | DPO |
| CERT-In | Per CERT-In rules (within 6 hours for certain categories) | https://incident.cert-in.org.in | CISO |
| Cyber-insurance carrier | Within 24 hours | Hotline | CISO |
| Press / PR | Only via designated spokesperson | Pre-approved statement | CEO + PR consultant |
| Staff (general) | Need-to-know | Email / town-hall | HR |

**Discipline:** no IR communication outside this matrix. No social media. No staff WhatsApp.

### 13.4 IR runbooks (pre-built)

Each runbook is a one-page checklist with named owners, commands to run, contacts:

- RB-01 Ransomware suspected
- RB-02 Account compromise (single user)
- RB-03 Account compromise (privileged user)
- RB-04 Phishing email reported
- RB-05 Lost / stolen laptop
- RB-06 Lost / stolen mobile device
- RB-07 Insider data theft suspected
- RB-08 DDoS attack
- RB-09 Ransomware confirmed (active)
- RB-10 Vendor / supply-chain compromise
- RB-11 Medical-device anomaly
- RB-12 Database integrity issue
- RB-13 Cloud account compromise
- RB-14 Public-facing service compromise
- RB-15 Backup vault compromise

Runbooks reviewed every 6 months; updated after every actual incident.

### 13.5 Forensic readiness

- Endpoint forensic image capability (FTK Imager) — available within 4 hours
- Memory capture tool pre-installed via RMM
- Network packet capture buffer at firewall (last 6 hours)
- 90-day log retention online; 7 years archived
- Chain-of-custody log template ready
- IR retainer with **CERT-In empanelled** firm (40 hours pre-paid, surge available)

---

## 14. Physical & environmental security

### 14.1 Server room

- Locked room, biometric + card access
- 24×7 CCTV (90-day retention)
- Temperature & humidity sensor → alert below/above thresholds
- Smoke detector → alert + fire-suppression (FM-200 / Novec 1230, **not** water)
- UPS with 30-minute runtime + diesel generator backup
- Quarterly UPS load test
- Fire drill (ops perspective): annual

### 14.2 Workstation security

- Screen-lock policy: 5-minute idle on workstations, 10 minutes on shared kiosks
- Cable locks on hot-desk laptops
- Privacy screens for billing & front-desk monitors (visible to public)
- Clean-desk policy enforced for finance and HR

### 14.3 Badge & access

- Photo ID badge for every staff member
- Visitor badges (numbered, returned at exit, 24-hour expiry)
- Server room access list reviewed quarterly
- Tailgating detection where budget allows (security camera alert)

### 14.4 Disposal

- Paper: shredded (DIN P-4 cross-cut minimum)
- Hard drives: certified destruction (degauss + physical shred); certificate filed
- Mobile devices: wipe via Intune + factory reset; stored for 30 days then physically destroyed
- E-waste: handled by certified vendor with chain-of-custody

---

## 15. Vendor & third-party risk

### 15.1 Onboarding gate

Every vendor with access to PHI, network, or systems answers a 50-question security questionnaire covering:

- Security certifications (SOC 2 / ISO 27001 / HITRUST)
- Encryption posture
- Subcontractor list
- Incident notification SLAs
- Data residency
- Insurance coverage
- Last-pentest date + scope
- DPDP-equivalent compliance

### 15.2 Critical vendors (current)

| Vendor | Service | Access level | Cert | DPA signed |
|---|---|---|---|---|
| Vercel | App hosting | Production code + DB connection string | SOC 2 Type II | ✅ |
| Neon (or RDS) | Database | All clinical data | SOC 2 + HIPAA | ✅ |
| Microsoft (Entra + M365) | Identity + email | All user mail/files/identities | ISO 27001 + SOC 2 + HITRUST | ✅ |
| Razorpay | Payments | Card data (pass-through) + transaction metadata | PCI-DSS Level 1 | ✅ |
| MSG91 / Twilio | SMS | Patient phone + OTP | ISO 27001 | ✅ |
| SendGrid / Postmark | Email | Patient email | SOC 2 | ✅ |
| CrowdStrike / SentinelOne | EDR | Endpoint telemetry | SOC 2 + ISO 27001 | ✅ |
| Veeam M365 | Backup | M365 data | SOC 2 | ✅ |
| Sentry | App error logs | Stack traces | SOC 2 | ✅ |

### 15.3 Annual review

- Vendor security posture re-attested annually
- Updated SOC 2 report reviewed
- Any change in subcontractors flagged
- Pricing + service-level renegotiated

---

## 16. Security policies & procedures

The following policies are signed by the hospital MD and reviewed annually:

| Policy | What it covers |
|---|---|
| **Information Security Policy** | The umbrella document; this architecture is its technical implementation |
| **Acceptable Use Policy (AUP)** | What staff can / cannot do on hospital systems |
| **Access Control Policy** | RBAC, JML, privileged access |
| **Data Classification & Handling** | The 4-tier scheme in §7.1 |
| **Encryption Policy** | When and how to encrypt |
| **BYOD Policy** | What's allowed on personal devices |
| **Email & Communications Policy** | Phishing, external sharing, sensitive content |
| **Password Policy** | 14+ characters, no reuse, MFA mandatory |
| **Incident Response Policy** | The IR plan in §13 |
| **Backup & Recovery Policy** | The 3-2-1-1-0 rule in §9 |
| **Vendor Risk Policy** | Onboarding, review, offboarding |
| **Clean Desk Policy** | Physical document handling |
| **Change Management Policy** | Approval workflow for production changes |
| **Vulnerability Management Policy** | Patch SLAs by severity |
| **Cryptographic Standards** | Algorithms, key length, lifecycle |
| **Logging & Monitoring Policy** | What's logged, retained, reviewed |
| **Software Development Lifecycle (SDLC)** | Secure coding, code review, testing |
| **Mobile Device Management (MDM)** | Enrollment, controls, off-boarding |
| **Physical Security Policy** | Server room, badges, visitors |

All policies are stored in the hospital's intranet under `/policies/security/`. Staff must acknowledge them annually.

---

## 17. Roles & responsibilities (RACI)

| Activity | CISO | IT Mgr | DPO | HR | DevOps | SOC | MD |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Policy ownership | A | R | C | I | I | I | C |
| RBAC design | C | A,R | C | C | I | — | I |
| Incident response (SEV-1) | A | R | C | C | R | R | I |
| Patch deployment | C | A,R | I | — | R | C | — |
| User onboarding | I | C | I | A,R | — | — | — |
| User offboarding | I | R | C | A,R | — | — | — |
| Backup integrity | C | A | I | — | R | I | — |
| Penetration test | A,R | C | I | — | C | C | I |
| DPDP DSR processing | C | C | A,R | — | — | — | I |
| Vendor onboarding | C | A | C | — | C | — | I |

A = Accountable, R = Responsible, C = Consulted, I = Informed

---

## 18. Security awareness & training

### 18.1 New-joiner training (first week)

- 90-minute classroom session on phishing, password hygiene, AUP
- Hands-on Microsoft Authenticator setup
- Acknowledgement signed in HR system
- Deferred access to clinical systems until completion

### 18.2 Recurring training

| Audience | Topic | Frequency |
|---|---|---|
| All staff | Phishing simulation | Monthly (KnowBe4) |
| All staff | DPDP / privacy refresher | Annual |
| All staff | Incident reporting drill | Quarterly |
| Clinicians | PHI handling workshop | Annual |
| IT staff | OWASP Top 10 / secure coding | Annual |
| Privileged users | PIM / break-glass procedures | Annual |
| Leadership | Tabletop ransomware exercise | Annual |

### 18.3 Phishing simulation metrics

- Click-through baseline at month 0: ~25% (typical hospital)
- 6-month target: <10%
- 12-month target: <5%
- Repeat-clickers (3+ in 6 months) → mandatory 1:1 retraining

---

## 19. Operating cadence

### 19.1 Daily

- SIEM alert triage (24×7)
- Backup success verification
- EDR detection review
- Patch-deployment progress check

### 19.2 Weekly

- Vulnerability scan summary
- Failed-login pattern review
- New-user provisioning audit
- Phishing report review

### 19.3 Monthly

- Backup restore test (random selection)
- Phishing simulation
- Patch compliance reporting
- Vendor SLA review
- Audit log review (privileged actions)

### 19.4 Quarterly

- Access review (department heads recertify their team's access)
- Vulnerability assessment (third-party)
- Firewall rule review
- DR drill
- Service review with hospital leadership

### 19.5 Annual

- External penetration test
- ISO 27001 / NABH gap analysis
- Tabletop ransomware exercise
- Full policy review + signoff
- Vendor re-attestation
- Insurance renewal with security posture update

---

## 20. Maturity roadmap (current → 24 months)

### Phase 0 — Cutover (Month 0)

- Entra ID P1 + MFA enforced
- EDR on every endpoint
- HospitalPro RBAC + audit live
- Daily backups with monthly restore test
- Network segmented (VLANs 10/20/30/40/50/60/99)
- ITSM ticketing + runbooks
- AUP / IR policies signed

### Phase 1 — Hardening (Months 1-3)

- ZTNA replaces VPN
- Conditional Access policies tightened (geo + device)
- TLS inspection enabled on staff VLAN
- Sentinel deployed; first 20 detection rules tuned
- Phishing simulation begins; baseline metric captured
- Quarterly access review starts

### Phase 2 — Maturity (Months 4-9)

- Microsoft Information Protection labels rolled out
- Privileged Identity Management (PIM) for all admin roles
- Annual penetration test conducted; remediations tracked
- DR drill validated end-to-end
- DPO appointed; DPDP compliance review filed
- BYOD App Protection Policies live

### Phase 3 — Optimization (Months 10-18)

- Entra ID P2 evaluated for risk-based conditional access
- Threat intelligence integration in Sentinel
- Insider-threat analytics (UEBA) tuning
- ISO 27001 readiness review (no certification yet)
- Healthcare-specific medical-device security platform deployed

### Phase 4 — Mature posture (Months 18-24)

- ISO 27001 certification audit (optional — depends on hospital priorities)
- HITRUST CSF gap analysis (relevant if international medical-tourism business)
- Bug-bounty program for the public website
- Continuous compliance dashboard published to leadership
- Cyber-risk quantification model (e.g. FAIR) integrated into board reporting

---

## 21. Investment summary

(Dovetails with the Managed IT Services proposal — pricing in INR per month unless noted.)

| Cost line | Monthly | Notes |
|---|---|---|
| Microsoft Entra ID P1 (150 users) | 75,000 | Already in MSA pass-through |
| Microsoft 365 Business Standard (150) | 1,08,000 | Already in MSA pass-through |
| EDR (CrowdStrike / SentinelOne, 200 endpoints) | 80,000 | Already in MSA pass-through |
| Microsoft Sentinel ingestion (~10 GB/day) | 35,000 | Add-on if not in MSA |
| Backup software (Veeam M365 + Postgres backup) | 35,000 | Already in MSA pass-through |
| Email security (Defender P1) | included in M365 | — |
| Phishing simulation (KnowBe4) | 25,000 | Add-on |
| Annual penetration test | 1,80,000/yr (≈15,000/mo amortised) | CERT-In empanelled vendor |
| IR retainer (40 hrs pre-paid) | 1,20,000/yr (≈10,000/mo) | CERT-In empanelled |
| ZTNA (Cloudflare Access / Tailscale) | 30,000 | Add-on |
| Monitoring tools, NMS, vuln scanner | included in MSA | — |
| Security analyst time (SOC + tuning) | 1,40,000 | Already in MSA labour line |
| **Estimated incremental security investment beyond MSA** | **~₹95,000 / month** | Adds ZTNA, Sentinel, phishing sim, pentest amort, IR retainer |

---

## 22. Acceptance & sign-off

| Stakeholder | Role | Signature | Date |
|---|---|---|---|
| MD / CEO | Final accountability for security posture | __________________ | __________ |
| CISO / IT Director | Architectural ownership | __________________ | __________ |
| DPO | Data protection sign-off | __________________ | __________ |
| Medical Superintendent | Clinical operations sign-off | __________________ | __________ |
| Managed IT Services Partner | Operational ownership | __________________ | __________ |

---

## Appendix A — Control matrix (DPDP → implementation)

| DPDP §  | Requirement | Implementation evidence |
|---|---|---|
| §6 | Notice of processing | Privacy notice on patient app + registration form |
| §7 | Consent | Explicit checkbox at registration; consent_recorded flag |
| §8(4) | Reasonable security safeguards | This architecture document |
| §8(6) | Data breach notification | IR plan §13.3 |
| §10 | Data fiduciary obligations | DPO appointed; grievance officer named |
| §11 | Right to access | DSR workflow §7.5 |
| §12 | Right to correction | Patient self-edit + front-desk workflow |
| §13 | Right to erasure | DSR workflow + retention exceptions |
| §16 | Cross-border transfer | India-only data residency |
| §28-29 | Data Protection Board cooperation | Designated points of contact |

## Appendix B — Glossary

| Acronym | Meaning |
|---|---|
| DPDP | Digital Personal Data Protection Act 2023 (India) |
| DPO | Data Protection Officer |
| DPB | Data Protection Board (DPDP regulator) |
| EDR | Endpoint Detection & Response |
| IR | Incident Response |
| JML | Joiner-Mover-Leaver workflow |
| MFA | Multi-Factor Authentication |
| MTTD | Mean Time To Detect |
| MTTR | Mean Time To Respond / Recover |
| NABH | National Accreditation Board for Hospitals & Healthcare Providers |
| NGFW | Next-Generation Firewall |
| NMS | Network Management System |
| PHI | Protected Health Information |
| PIM | Privileged Identity Management |
| RACI | Responsible / Accountable / Consulted / Informed |
| RBAC | Role-Based Access Control |
| RPO | Recovery Point Objective |
| RTO | Recovery Time Objective |
| SAQ-A | PCI-DSS Self-Assessment Questionnaire A (merchant outsourcing card data) |
| SBOM | Software Bill of Materials |
| SDR | Subject Data Request |
| SIEM | Security Information & Event Management |
| SOC | Security Operations Centre |
| SOE | Standard Operating Environment |
| SSPR | Self-Service Password Reset |
| UEBA | User & Entity Behaviour Analytics |
| ZTNA | Zero-Trust Network Access |

---

*— End of cybersecurity architecture document —*

> **Classification:** Internal — share only under NDA. Excerpts may appear in NABH submissions, insurance applications, and customer security questionnaires; the full document is not distributed beyond the hospital, its DPO, its IT partner, and named auditors.
