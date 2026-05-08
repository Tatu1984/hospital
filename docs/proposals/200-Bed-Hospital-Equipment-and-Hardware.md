---
title: "200-Bed Hospital — Equipment & Hardware Requirements"
subtitle: "Complete IT + clinical-IT inventory for HospitalPro deployment"
audience: "Hospital admin, CFO, IT procurement, infrastructure consultants"
date: "May 2026"
version: "1.0"
---

# 200-Bed Hospital — Equipment & Hardware Requirements

## Scope

This document covers the **IT-touching hardware and biomedical equipment** required to run a 200-bed multi-specialty hospital with HospitalPro as the core HMIS. It does **not** cover purely clinical equipment that doesn't integrate with the IT system (surgical instruments, basic furniture, building services).

Coverage:

1. End-user computing (workstations, tablets, peripherals)
2. Network & connectivity
3. Servers & data-centre
4. Telephony & paging
5. Clinical / biomedical IT-integrated devices
6. Imaging hardware (radiology + lab)
7. Print, scan, label
8. Power & environmental
9. Biometric & access control
10. Surveillance
11. Mobile / endpoint accessories
12. Spares & consumables

Pricing in INR is indicative for India procurement (May 2026), based on commercial-grade brands. **Capex** = one-time. **Opex** = recurring (cloud, support, licenses).

---

## 1. End-user computing (EUC)

Counts derived from a typical 200-bed multi-specialty: 60-bed IPD ward, 60-bed IPD private/semi-private, 20-bed ICU, 20-bed Emergency, 16-bed OT recovery, 16 OPD chambers, plus admin / lab / radiology / pharmacy / billing / front office.

| Item | Qty | Spec | Unit (₹) | Total (₹) |
|---|---:|---|---:|---:|
| OPD consultation desktops | 18 | i5/8GB/256GB SSD/22" monitor | 50,000 | 9,00,000 |
| Nursing-station all-in-ones (IPD) | 16 | 24" AIO, i5/8GB, antimicrobial keyboard | 65,000 | 10,40,000 |
| Front-office desktops (registration, OPD reception) | 6 | i3/8GB/256GB SSD/22" | 45,000 | 2,70,000 |
| Billing counter desktops | 4 | i5/8GB/256GB SSD/24" | 55,000 | 2,20,000 |
| Pharmacy POS desktops | 4 | i5/8GB/256GB SSD/22" | 50,000 | 2,00,000 |
| Lab analyzer-attached PCs | 4 | i5/8GB/256GB, 2× COM ports | 55,000 | 2,20,000 |
| Radiology / PACS workstations | 3 | Xeon/32GB/2TB SSD/24" medical-grade dual-monitor | 2,80,000 | 8,40,000 |
| OT consoles | 4 | i7/16GB/512GB SSD/27" | 90,000 | 3,60,000 |
| ICU bedside workstations | 5 | Medical-grade panel PC, IP54, 19" | 1,15,000 | 5,75,000 |
| Emergency triage desktops | 4 | i5/8GB/256GB SSD/22" | 50,000 | 2,00,000 |
| Doctor mobile devices (ward rounds) | 25 | iPad 10.9" (or Android equivalent) + ruggedized case | 55,000 | 13,75,000 |
| Admin / HR / Finance laptops | 12 | i5/16GB/512GB SSD/14" | 75,000 | 9,00,000 |
| MD / leadership laptops | 5 | i7/16GB/1TB SSD/14" | 1,10,000 | 5,50,000 |
| **Subtotal — EUC** | **110 endpoints** | | | **76,50,000** |

### EUC notes

- **Antimicrobial keyboards** in clinical areas — wipeable, IP-rated. Add ~₹1,500/unit for these.
- **Medical-grade monitors** in radiology must meet DICOM Part 14 grayscale calibration (3MP minimum for general radiography reading; 5MP for mammography if applicable).
- **iPads** use HospitalPro's mobile doctor app over WiFi for ward-round chart updates and OT stage tracker.
- **Stock spare** of ~10% (≈11 endpoints) recommended for swap-out during repair — budget +₹7,65,000.

---

## 2. Network & connectivity

### 2.1 Internet (WAN)

| Item | Qty | Spec | Monthly opex (₹) |
|---|---:|---|---:|
| Primary internet — fiber leased line | 1 | 200 Mbps symmetric, 1:1, SLA 99.5% | 25,000 |
| Failover internet — 5G or secondary fiber | 1 | 50 Mbps, automatic failover | 12,000 |
| Static public IPs | 2 | for inbound HL7 / DICOM gateways if needed | 2,000 |
| **Subtotal — WAN** | | | **39,000/mo** |

### 2.2 LAN — switches & cabling

| Item | Qty | Spec | Unit (₹) | Total (₹) |
|---|---:|---|---:|---:|
| Core switch (L3) | 2 (HA pair) | 24-port 10GbE, stackable | 4,80,000 | 9,60,000 |
| Distribution switch (per floor) | 6 | 48-port 1GbE PoE+ | 1,20,000 | 7,20,000 |
| Access switch (small areas) | 4 | 24-port PoE+ | 65,000 | 2,60,000 |
| Cat-6A structured cabling (rooms + IT closets) | ~600 drops | including patch panels | 2,200/drop | 13,20,000 |
| 19" wall-mount racks (IT closets) | 6 | 9U + ventilation | 18,000 | 1,08,000 |
| Patch cords (Cat 6A) | 800 | mixed lengths | 350 | 2,80,000 |
| **Subtotal — LAN** | | | | **36,48,000** |

### 2.3 WiFi — enterprise-grade

| Item | Qty | Spec | Unit (₹) | Total (₹) |
|---|---:|---|---:|---:|
| WiFi access points (WiFi 6E) | 35 | Aruba / Ubiquiti UniFi 6E, ceiling-mount | 35,000 | 12,25,000 |
| WiFi controller / cloud key | 1 | UniFi Cloud Key Gen2 Plus or Aruba Central | 50,000 | 50,000 |
| WiFi survey + design | 1 | Heat-map professional service | 1,50,000 | 1,50,000 |
| **Subtotal — WiFi** | | | | **14,25,000** |

### 2.4 Firewall & security

| Item | Qty | Spec | Unit (₹) | Total (₹) |
|---|---:|---|---:|---:|
| Next-gen firewall (HA pair) | 2 | Fortinet 60F or similar, IPS+SSL inspection licenses | 3,80,000 | 7,60,000 |
| 3-year support & updates (firewall) | 1 | UTM bundle | 2,40,000 | 2,40,000 |
| **Subtotal — security** | | | | **10,00,000** |

### 2.5 Network totals

- **Capex (LAN + WiFi + Firewall):** ₹60,73,000
- **Opex (WAN):** ₹39,000/month = ₹4,68,000/year

---

## 3. Servers & data-centre

For a 200-bed hospital, HospitalPro is hosted on Vercel (cloud serverless) and the Postgres database is managed (Neon / RDS / equivalent), so the hospital itself runs **minimal on-prem infrastructure**. The on-prem footprint is for:

- Local file/print server
- Active Directory / Entra ID hybrid join (if hybrid)
- PACS image archive (radiology — too large for cloud at hospital prices)
- Surveillance / NVR
- Backup target for tape/USB rotation
- Monitoring & syslog

| Item | Qty | Spec | Unit (₹) | Total (₹) |
|---|---:|---|---:|---:|
| Server — file / domain / monitoring | 1 | Dell PowerEdge R450, Xeon Silver, 64GB RAM, 4× 1TB SSD RAID-10 | 4,50,000 | 4,50,000 |
| Server — PACS / DICOM archive (Orthanc or dcm4chee) | 1 | Dell R650, Xeon Gold, 128GB RAM, 4× 4TB NVMe RAID-10 + 2× 8TB HDD for cold archive | 8,50,000 | 8,50,000 |
| NAS for backups + CCTV recording | 1 | Synology RS3621xs+ with 8× 16TB drives in RAID-6 | 5,80,000 | 5,80,000 |
| Server rack + PDU | 1 | 42U, redundant PDUs | 2,20,000 | 2,20,000 |
| **Subtotal — servers** | | | | **21,00,000** |

### Server room infrastructure

| Item | Qty | Spec | Unit (₹) | Total (₹) |
|---|---:|---|---:|---:|
| Precision air-conditioner | 2 (N+1) | 7.5 kW each | 2,80,000 | 5,60,000 |
| UPS — server room | 1 | 10 kVA online, 30-min runtime | 4,50,000 | 4,50,000 |
| UPS — workstations (per floor) | 4 | 5 kVA each | 1,80,000 | 7,20,000 |
| Diesel generator | 1 | 40 kVA standby | 5,50,000 | 5,50,000 |
| Fire-suppression (FM-200 / Novec 1230) | 1 | for server room | 3,50,000 | 3,50,000 |
| Smoke + temperature sensors | 1 set | with SNMP alerting | 80,000 | 80,000 |
| **Subtotal — power & environment** | | | | **27,10,000** |

### Cloud-side opex (managed services, monthly)

| Service | Monthly (₹) |
|---|---:|
| Vercel Pro (frontend + backend) | 35,000 |
| Postgres managed (Neon / RDS) | 50,000 |
| Object storage + CDN | 25,000 |
| Backup vault (immutable, off-site) | 35,000 |
| Email / SMS gateway | 25,000 |
| **Cloud opex subtotal** | **1,70,000/month** = **20,40,000/year** |

---

## 4. Telephony & paging

| Item | Qty | Spec | Unit (₹) | Total (₹) |
|---|---:|---|---:|---:|
| IP-PBX (cloud or on-prem) | 1 | 3CX or Yeastar, 100 extensions | 2,50,000 | 2,50,000 |
| IP phones (desks) | 100 | Yealink T31G | 7,500 | 7,50,000 |
| Cordless DECT for clinicians | 30 | base + handset | 18,000 | 5,40,000 |
| Nurse-call / paging system | 1 | per bed call buttons + master station, 200 beds | — | 12,00,000 |
| Public-address system | 1 | covers OPD, lobby, common areas | 4,00,000 | 4,00,000 |
| **Subtotal** | | | | **31,40,000** |

---

## 5. Clinical / biomedical — IT-integrated devices

Devices that push data into HospitalPro via HL7 / ASTM / vendor SDK. Quantities are minimums; expand based on patient volume.

| Item | Qty | Spec / use | Unit (₹) | Total (₹) |
|---|---:|---|---:|---:|
| Multi-parameter patient monitors | 25 | ICU + emergency, ECG/SpO2/NIBP/temp/EtCO2 | 2,80,000 | 70,00,000 |
| Defibrillator (biphasic) | 6 | with monitor + AED mode | 3,50,000 | 21,00,000 |
| Ventilators | 12 | ICU-grade, multi-mode | 12,00,000 | 1,44,00,000 |
| Anaesthesia workstations | 5 | OT, integrated vapourizer + monitor | 18,00,000 | 90,00,000 |
| Infusion pumps | 60 | volumetric, network-connected | 75,000 | 45,00,000 |
| Syringe pumps | 40 | for ICU + NICU | 65,000 | 26,00,000 |
| Vital-signs monitors (ward) | 30 | spot-check, BP/SpO2/Temp | 65,000 | 19,50,000 |
| Blood-gas analyzer | 1 | networked | 12,00,000 | 12,00,000 |
| Glucometers (POC) | 15 | with cloud sync | 12,000 | 1,80,000 |
| **Subtotal — biomedical** | | | | **4,29,30,000** |

### Lab analyzers (IT-integrated)

| Item | Qty | Spec | Unit (₹) | Total (₹) |
|---|---:|---|---:|---:|
| Auto-haematology analyzer (5-part) | 1 | 60 samples/hr, HL7 output | 18,00,000 | 18,00,000 |
| Auto-biochemistry analyzer | 1 | 400 tests/hr | 35,00,000 | 35,00,000 |
| Auto-immunoassay analyzer | 1 | mid-volume | 28,00,000 | 28,00,000 |
| Urine analyzer (auto) | 1 | strip + sediment | 8,00,000 | 8,00,000 |
| Blood-coagulation analyzer | 1 | 4-channel | 9,00,000 | 9,00,000 |
| ECG machine (12-lead, networked) | 4 | DICOM/HL7 export | 1,80,000 | 7,20,000 |
| **Subtotal — lab analyzers** | | | | **1,05,20,000** |

---

## 6. Imaging hardware

| Item | Qty | Spec | Unit (₹) | Total (₹) |
|---|---:|---|---:|---:|
| Digital X-ray system (DR) | 1 | 500-650 mA, ceiling-mounted, DICOM | 1,80,00,000 | 1,80,00,000 |
| Mobile X-ray (ward / OT) | 1 | digital, battery-operated | 32,00,000 | 32,00,000 |
| CT scanner (16-slice) | 1 | with PACS integration | 4,50,00,000 | 4,50,00,000 |
| Ultrasound (high-end) | 2 | 4D obstetric + general | 24,00,000 | 48,00,000 |
| Ultrasound (portable) | 2 | bedside | 8,00,000 | 16,00,000 |
| Mammography (optional, women's hospital) | — | optional | — | — |
| C-arm (OT) | 1 | mobile, image-intensifier | 32,00,000 | 32,00,000 |
| MRI (1.5T) — Phase-2 / optional | — | typically deferred to phase 2 | — | — |
| **Subtotal — imaging (Phase 1)** | | | | **7,58,00,000** |

### Imaging IT integration

- All imaging devices export **DICOM** to the on-prem PACS server (Orthanc / dcm4chee).
- HospitalPro's radiology module pulls study metadata via DICOMweb.
- Reports authored in HospitalPro's Radiology page; PDF + DICOM-SR pushed back to PACS for archival.

---

## 7. Print, scan, label

| Item | Qty | Spec | Unit (₹) | Total (₹) |
|---|---:|---|---:|---:|
| Network laser printers (departmental) | 12 | Brother HL-L6400DW or HP equivalent | 35,000 | 4,20,000 |
| MFD (scan + print + copy) | 4 | front office, MRD, billing | 1,20,000 | 4,80,000 |
| Pharmacy thermal label printer | 4 | Zebra GK420t | 28,000 | 1,12,000 |
| Lab specimen barcode printer | 2 | Zebra ZD420 | 32,000 | 64,000 |
| Patient wristband printer | 4 | Zebra HC100 healthcare-grade | 65,000 | 2,60,000 |
| Barcode scanners (handheld) | 30 | for pharmacy, lab, ward | 6,500 | 1,95,000 |
| Document scanner (high-volume MRD) | 1 | Fujitsu fi-7160 ADF | 1,40,000 | 1,40,000 |
| **Subtotal — print/scan/label** | | | | **16,71,000** |

---

## 8. Biometric & access control

| Item | Qty | Spec | Unit (₹) | Total (₹) |
|---|---:|---|---:|---:|
| Biometric attendance terminals | 4 | fingerprint + face, IP-connected, push to HospitalPro `/api/biometric/punch` | 28,000 | 1,12,000 |
| Access-control card readers (server room, pharmacy, MRD) | 8 | RFID + PIN | 12,000 | 96,000 |
| Door controllers + electric strikes | 8 | with battery backup | 18,000 | 1,44,000 |
| Visitor-management kiosk | 1 | tablet + ID scanner | 1,20,000 | 1,20,000 |
| **Subtotal** | | | | **4,72,000** |

---

## 9. Surveillance

| Item | Qty | Spec | Unit (₹) | Total (₹) |
|---|---:|---|---:|---:|
| IP cameras (entrances, lobby, ward corridors, pharmacy, OT external) | 60 | 4MP IP, IR night vision | 8,500 | 5,10,000 |
| NVR | 1 | 64-channel, 16TB storage (on the NAS) | 1,80,000 | 1,80,000 |
| Cabling + PoE (camera infrastructure included in LAN budget) | — | — | — | — |
| **Subtotal** | | | | **6,90,000** |

---

## 10. Mobile / endpoint accessories

| Item | Qty | Spec | Unit (₹) | Total (₹) |
|---|---:|---|---:|---:|
| Tablet docks for ward iPads | 30 | wall-mounted with charging | 4,500 | 1,35,000 |
| Headsets for video consultation | 20 | USB stereo with mic | 3,500 | 70,000 |
| Webcams (telemedicine) | 8 | Logitech C930e | 8,000 | 64,000 |
| Lab coats with RFID tags (optional) | 100 | for asset tracking | — | — |
| Privacy screens (front-desk monitors) | 15 | 22-24" | 4,500 | 67,500 |
| **Subtotal** | | | | **3,36,500** |

---

## 11. Software licenses (annual)

| Item | Qty | Annual unit (₹) | Total annual (₹) |
|---|---:|---:|---:|
| Microsoft 365 Business Standard | 200 | 8,640 | 17,28,000 |
| Microsoft Entra ID P1 | 200 | 6,000 | 12,00,000 |
| EDR (CrowdStrike / SentinelOne) | 200 | 4,800 | 9,60,000 |
| Backup software | 1 | 4,00,000 | 4,00,000 |
| Antivirus / Defender server licenses | 2 | 8,000 | 16,000 |
| HospitalPro AMC (≈₹3.5L/mo from Standard tier proposal) | 1 | — | 41,77,200 |
| **Annual software subtotal** | | | **84,81,200** |

---

## 12. Spares & consumables (annual)

| Item | Annual budget (₹) |
|---|---:|
| Endpoint replacement reserve (10% of EUC) | 7,65,000 |
| Print consumables (toner, paper, labels) | 8,00,000 |
| Cabling, accessories, small parts | 2,00,000 |
| **Total** | **17,65,000/year** |

---

## 13. Summary totals

### One-time capex (at hospital launch)

| Category | ₹ (lakhs) |
|---|---:|
| End-user computing | 76.50 |
| Network — LAN + WiFi + Firewall | 60.73 |
| Servers + data-centre | 21.00 |
| Power & environment | 27.10 |
| Telephony & paging | 31.40 |
| Biomedical (IT-integrated) | 429.30 |
| Lab analyzers | 105.20 |
| Imaging (Phase 1) | 758.00 |
| Print / scan / label | 16.71 |
| Biometric & access control | 4.72 |
| Surveillance | 6.90 |
| Mobile / endpoint accessories | 3.36 |
| **Capex total** | **₹15,40,92,000** ≈ **₹15.4 crore** |

### Annual opex

| Category | ₹ /year (lakhs) |
|---|---:|
| WAN (internet) | 4.68 |
| Cloud services (Vercel + Postgres + storage + backup + SMS/email) | 20.40 |
| Software licences (M365 + Entra + EDR + AV + HospitalPro AMC) | 84.81 |
| Spares & consumables | 17.65 |
| **Opex total** | **₹1,27,54,000/year** ≈ **₹1.28 crore/year** |

### Phasing recommendation

For cash-flow management, a **Phase 1 / Phase 2** split is typical:

**Phase 1 — Day 1 (must-have):** EUC, full network, server room minus PACS, telephony, biomedical for ICU + OT, lab analyzers, **digital X-ray + ultrasound** (defer CT to Phase 2), print/label, biometric, surveillance, all software. **Approx ₹9-10 crore capex.**

**Phase 2 — Months 6-12:** CT scanner, MRI (if planned), expanded biomedical, advanced lab platforms. **Approx ₹5-6 crore capex.**

---

## 14. Vendor brands — preferred shortlist

| Category | Preferred (India market) |
|---|---|
| Endpoints | Dell, HP, Lenovo (commercial line) |
| Medical-grade monitors | Eizo, Barco, NEC |
| Network switches | Cisco Catalyst / Meraki, Aruba CX, Ubiquiti UniFi (cost-sensitive) |
| WiFi | Aruba, Ubiquiti UniFi, Cisco Meraki |
| Firewall | Fortinet, Palo Alto, SonicWall |
| Servers | Dell PowerEdge, HPE ProLiant |
| Storage / NAS | Synology, QNAP, Dell PowerStore |
| UPS | APC, Schneider, Eaton |
| Patient monitors | Mindray, Philips, GE Healthcare, Welch Allyn |
| Ventilators | Mindray, Maquet, Hamilton, Drager |
| Ultrasound | Mindray, GE, Philips, Samsung |
| CT / X-ray | Siemens, GE, Philips, Mindray |
| Printers | Brother, HP, Zebra (label) |
| Biometric | Realtime, Matrix Comsec, Suprema |
| CCTV | Hikvision, Dahua, Axis |
| EDR | CrowdStrike, SentinelOne, Microsoft Defender for Business |

---

## 15. Acceptance criteria for procurement

For each line item, RFP / RFQ should include:

- 3-year warranty (5-year for high-value imaging)
- Onsite support SLA (4-hour for biomedical critical, 24-hour for IT)
- AMC + spare-parts supply commitment
- Training for IT and clinical staff
- DICOM / HL7 / ASTM compliance certificate (for IT-integrated devices)
- Regulatory approvals (CE, FDA, CDSCO for biomedical)
- DPDP Act 2023 data-handling addendum (where applicable)

---

*Pricing is indicative for India procurement as of May 2026. Actual quotes vary by brand, region, and negotiation. Use this as a budgetary baseline; refresh quotes 60 days before procurement.*
