---
title: "HospitalPro — User Manual"
subtitle: "Day-to-day operating guide for hospital staff"
audience: "Doctors, nurses, front-office staff, lab techs, billing team, administrators"
date: "May 2026"
version: "1.0"
---

# HospitalPro — User Manual

> **About screenshots:** Placeholders are marked **[SCREENSHOT: …]**. Replace each with an actual screen capture from your hospital's deployment before printing for training. Ideal capture resolution: 1920 × 1080 for desktop, 1170 × 2532 for mobile (iPhone 13 Pro). All examples use the seeded demo tenant ("Busitema Referral Hospital").

---

## Table of contents

1. Introduction
2. Getting started — login & first run
3. Roles, permissions, and what you'll see
4. The portal at a glance
5. Front Office (patient registration)
6. Appointments
7. OPD (outpatient consultation)
8. IPD / Ward (inpatient care)
9. Emergency & ICU
10. Laboratory
11. Radiology
12. Pharmacy
13. Operation Theatre (OT) & Surgery
14. Billing & Payments
15. Doctor's portal — special view
16. Lab Configuration (admin)
17. System Control (admin)
18. Reports & Analytics
19. Mobile apps — Patient
20. Mobile apps — Doctor
21. Common tasks (cheat-sheet)
22. FAQs
23. Glossary

---

## 1. Introduction

HospitalPro is the hospital's information system. It records every patient interaction — from registration at the front desk, through clinical consults, lab and imaging, ward stays, surgeries, and finally billing — in one connected platform.

You'll use it on:

- **Web portal** — Chrome / Edge / Safari on a desktop or laptop. The primary interface for clinical and administrative work.
- **Mobile apps** — patient app and doctor app, both available for iOS and Android. Lighter, focused, designed for use away from the desk.

This manual covers the web portal first, then the mobile apps. Each module has the same structure: what it's for → how to open it → step-by-step for the most common tasks → common errors and what to do.

---

## 2. Getting started — login & first run

### 2.1 Where to go

Open your browser and visit your hospital's HospitalPro URL — typically:

```
https://<hospital-name>.hospitalpro.io
```

For Busitema Referral the URL is `https://hospital-vnyb.vercel.app`.

**[SCREENSHOT: Login page — shows the HospitalPro logo, hospital name, username + password fields, "Forgot Password?" link, and the blue "Sign In" button]**

### 2.2 First-time sign-in

1. Enter the **username** and **temporary password** provided by your administrator. Usernames are usually first-initial + last name (`jsmith`, `rsharma`).
2. Click **Sign In**.
3. You'll land on your role-specific dashboard.

### 2.3 If you forgot your password

1. On the login page click **Forgot Password?**
2. Enter your registered email.
3. You'll receive an email with a reset link. The link is valid for 30 minutes.
4. Click the link, choose a new password (minimum 8 characters), confirm.
5. Sign in with the new password.

### 2.4 Changing your password from inside the app

1. From any portal page, click your name in the top-right.
2. Choose **Change Password**.
3. Enter your current password, then the new password twice.
4. Click **Update**.

For mobile apps, see **§19** and **§20**.

### 2.5 Account locked?

After 5 incorrect password attempts in a row your account is locked for 15 minutes. Either wait, or ask an administrator to use **System Control → User Management → Reset Password**.

---

## 3. Roles, permissions, and what you'll see

Your role determines which menu items appear and which actions are available. Common roles:

| Role | Sees in sidebar |
|---|---|
| **ADMIN** | Everything |
| **DOCTOR / CONSULTANT / SURGEON** | Dashboard (chart-style), Live Dashboard, Front Office, Appointments, OPD, IPD, ICU, Emergency, OT, Lab, Radiology, Pharmacy, Billing, **My Earnings** |
| **NURSE** | Dashboard, Front Office, Appointments, Nursing, IPD, ICU, Emergency, Lab, Radiology, Pharmacy, Diet, Blood Bank |
| **FRONT_OFFICE** | Dashboard, Front Office, Appointments, Billing, TPA, IPD |
| **LAB_TECH** | Dashboard, Front Office, Lab |
| **BILLING** | Dashboard, Front Office, Billing, IPD Billing, TPA, Doctor Accounting, Tally |
| **PHARMACIST** | Dashboard, Front Office, Pharmacy |

If you don't see a menu item you expect, ask an administrator to add the right role.

---

## 4. The portal at a glance

### 4.1 Layout

After login the screen splits into three regions:

- **Sidebar (left)** — module navigation, grouped by Core / Clinical / Diagnostics / Support / Finance / Operations / Admin
- **Header (top)** — hospital name, current date, your name + role, refresh, sign-out
- **Main area** — the active module's content

**[SCREENSHOT: Doctor dashboard showing the sidebar on the left, identity card at the top with "Dr. John Smith" + "General Medicine", 5 stat cards (OPD TODAY, IPD UNDER CARE, OT TODAY, PENDING LABS, PENDING IMAGING), and a placeholder area below for the selected card's list]**

### 4.2 Two dashboard styles

- **Doctors** see a chart-style landing — name + qualifications card, then 5 clickable stat cards. Tapping a card shows the matching patient list. Tapping a patient opens their full chart.
- **Everyone else** sees a 34-tile dashboard with shortcuts to every module the role can access.

### 4.3 The sidebar groups

| Group | Modules |
|---|---|
| Core | Dashboard, Live Dashboard, Front Office, Appointments |
| Clinical | OPD, IPD/Ward, Emergency, ICU, OT |
| Diagnostics | Laboratory, Radiology, Blood Bank |
| Support Services | Pharmacy, Nursing, Transport |
| Finance | **My Earnings** (doctors only), Billing, IPD Billing, TPA |
| Operations | HR, Inventory, Housekeeping, Diet & Kitchen, Assets |
| Admin & Reports | Analytics, Quality, Master Data, Audit Log, System Control |

### 4.4 Refreshing data

Most pages have a **Refresh** button in the top-right of the header card. Use it after another team member has made a change you want to see.

---

## 5. Front Office — patient registration

**Used by:** front-office staff, nurses, anyone who first meets a patient.

### 5.1 Open the module

Sidebar → **Front Office**.

**[SCREENSHOT: Front Office page with patient list table, search bar at the top, "+ New Patient" button on the right]**

### 5.2 Search for an existing patient

The search bar at the top filters by name, MRN, or phone. Type at least 2 characters.

### 5.3 Register a new patient

1. Click **+ New Patient** (top-right).
2. Fill the form. Required fields are marked with `*`:
   - Name *
   - Date of birth (or age) *
   - Gender *
   - Contact number *
   - Address
   - Email
   - Blood group
   - **Allergies** — be specific. This appears on every clinician's chart screen.
   - Emergency contact (name + phone)
   - Purpose of visit
3. Click **Register Patient**.
4. The system assigns a sequential MRN (e.g. `MRN000412`).

**[SCREENSHOT: New patient form with all fields visible]**

### 5.4 Edit an existing patient

Click any row in the patient list → the patient's profile dialog opens. Edit fields → **Save**.

### 5.5 Common errors

| Message | Meaning | Fix |
|---|---|---|
| "MRN already exists" | Duplicate MRN typed manually | Leave MRN auto-generated |
| "Phone number invalid" | Not 10 digits / wrong format | Enter `+91 9xxxxxxxxx` |
| "Required field missing" | Name/DOB/gender/contact missing | Scroll up and complete |

---

## 6. Appointments

**Used by:** front-office staff, doctors (view their own), nurses.

### 6.1 Open the module

Sidebar → **Appointments**.

### 6.2 Book an appointment

1. Click **+ New Appointment**.
2. Search for the patient by name or MRN.
3. Choose the **doctor** from the dropdown.
4. Pick a **date** — the calendar shows the doctor's availability.
5. Pick a **time slot** — slots in red are already booked.
6. Set **type** (Consultation, Follow-up, Health Check) and reason.
7. Click **Book**.
8. The patient receives an SMS confirmation (if the SMS provider is configured).

**[SCREENSHOT: Appointment booking dialog showing patient search, doctor dropdown, calendar, time-slot grid, type selector, and "Book Appointment" button]**

### 6.3 Cancel or reschedule

Find the appointment in the list → click the three-dot menu → **Cancel** or **Reschedule**. Cancellations require a reason.

### 6.4 Today's lineup

The Appointments page defaults to today's view. Filters at the top let you switch to date ranges or filter by doctor / status.

---

## 7. OPD (outpatient consultation)

**Used by:** doctors, consultants.

### 7.1 Open the module

Sidebar → **OPD**.

### 7.2 The OPD queue

The OPD page shows all patients with an OPD appointment for the selected date, grouped by status: **Waiting → In consultation → Completed**.

**[SCREENSHOT: OPD page showing the queue grouped into three columns, each card showing patient name, MRN, time, and chief complaint]**

### 7.3 Starting a consultation

1. Click a patient's card in the **Waiting** column.
2. The card moves to **In consultation** and the patient chart opens on the right.
3. The chart shows: patient header, allergies banner (if any), recent visits, pending orders, prescriptions.

### 7.4 Recording a consultation

Inside the patient chart there are sub-tabs:

- **Vitals** — temperature, BP, pulse, SpO2, weight, height
- **Examination** — free-text exam findings
- **Assessment** — provisional diagnosis
- **Plan** — what's next: investigations, prescriptions, follow-up

Fill in the relevant tabs → click **Save Note**.

### 7.5 Adding orders (lab / imaging)

1. From inside the consultation, click **+ Add Order**.
2. Choose **Lab** or **Radiology**.
3. For lab: pick tests from the search list (each one has a configured price + reference ranges).
4. For imaging: pick modality (X-Ray / CT / MRI / Ultrasound) and the body part.
5. Set priority: Routine / Urgent / STAT.
6. Click **Order**. The order is dispatched to the relevant department.

### 7.6 Writing a prescription

1. Click **+ Prescription**.
2. Search the drug catalogue.
3. For each drug set: dose, frequency (BD / TDS / QID / OD), duration, instructions.
4. Click **Save & Print**. The prescription PDF can be handed to the patient.

### 7.7 Completing the consultation

When done, click **Complete** at the top of the chart. The card moves to the **Completed** column. The patient receives an SMS with their prescription summary.

---

## 8. IPD / Ward (inpatient care)

**Used by:** doctors, nurses, ward staff.

### 8.1 Open the module

Sidebar → **IPD / Ward**.

### 8.2 The ward map

The IPD page shows wards as collapsible sections. Each bed is a tile showing patient name (if occupied) or "Vacant" (if free).

**[SCREENSHOT: IPD page with three ward sections (Cardiac ICU, Surgical Ward, General Ward) expanded, each containing bed tiles. Occupied beds show patient name + days admitted; vacant beds show "Vacant" in grey]**

### 8.3 Admit a patient

1. Click a **Vacant** bed tile.
2. Search for the patient (or register a new one inline).
3. Set: admission date/time, admitting doctor, diagnosis, expected length of stay, insurance/TPA if applicable.
4. Click **Admit**.

### 8.4 Daily nursing notes

Click an occupied bed → patient chart opens → **Notes** tab → **+ Add Note**. Use the structured fields (vitals, intake, output, medications administered, observations).

### 8.5 Discharge

From the patient chart click **Discharge** (top-right) → fill in: discharge summary, follow-up plan, prescriptions on discharge → click **Generate Discharge Bill** → bill goes to Billing for payment.

---

## 9. Emergency & ICU

Same workflow as IPD, with two differences:

- **Triage colour** at the top of every card: Red (immediate) / Orange (urgent) / Yellow (delayed) / Green (minor).
- **ICU vitals** are timestamped — every entry persists with timestamp; the chart shows trend lines over the admission.

**[SCREENSHOT: Emergency triage page showing patient cards colour-banded by acuity]**

---

## 10. Laboratory

**Used by:** lab technicians.

### 10.1 The Lab page

Sidebar → **Laboratory**. Four tabs at the top:

- **All Tests** — every order, all statuses
- **Pending Collection** — sample not yet drawn
- **In Process** — sample drawn, result pending
- **Completed** — resulted

**[SCREENSHOT: Laboratory page showing the All Tests tab with a table of orders: Order ID, Patient, MRN, Tests, Priority, Status, Ordered Date, Actions]**

### 10.2 Mark sample collected

Find the order in **Pending Collection** → click **Collect Sample** → barcode is generated for the tube → click **Print Label**.

### 10.3 Enter results

1. In **In Process**, find the order → click **Enter Result**.
2. The result form lists every parameter configured for that test (see **§16 Lab Configuration**).
3. For each parameter, type the measured value. The reference range is displayed alongside.
4. Out-of-range values are highlighted red automatically.
5. Critical values (above critical-high or below critical-low) trigger an SMS alert to the ordering doctor.
6. Click **Submit Result**.

### 10.4 Print the report

In the **Completed** tab → **View Report** opens the PDF. Standard layout: hospital header → patient details → test panel(s) → parameters with values, units, reference ranges, flags → technician signature → date.

---

## 11. Radiology

Same workflow as Laboratory, but the result form has different fields:

- Modality (auto-filled from order)
- Findings (rich text)
- Impression (one or two diagnostic statements)
- Attached images (DICOM viewer link if PACS is integrated)

**[SCREENSHOT: Radiology result entry form with findings/impression text areas and image attachment slot]**

---

## 12. Pharmacy

**Used by:** pharmacists.

### 12.1 Dispense a prescription

1. Sidebar → **Pharmacy** → **Pending Prescriptions**.
2. Click the prescription → review drugs, dose, quantity.
3. Confirm stock and click **Dispense**.
4. The patient signs the receipt; the system updates inventory automatically.

### 12.2 OTC sales

**Pharmacy → OTC Sale** — search drug, set quantity, add to cart, take payment, print receipt.

### 12.3 Stock alerts

Drugs below their re-order level appear in **Pharmacy → Low Stock**. Generate purchase orders directly from the alert.

---

## 13. Operation Theatre (OT) & Surgery

**Used by:** surgeons, OT coordinator, anaesthetist.

### 13.1 Schedule a surgery

1. Sidebar → **OT** → **+ Schedule Surgery**.
2. Choose theatre, surgeon, anaesthetist, scheduled date + time, procedure name, expected duration.
3. Add family contacts (name + phone) — they receive SMS updates with a **public tracker link**.
4. Click **Schedule**.

### 13.2 Real-time stage updates

During surgery the OT coordinator updates the stage:

> Pre-op → Anaesthesia → Incision → Intra-op → Closure → Recovery → Discharged from OT

Each stage update triggers an SMS to family contacts. Family clicks the link → sees a public read-only tracker page (no login).

**[SCREENSHOT: OT stage tracker showing stage progression with timestamps and the "Update Stage" button at the bottom]**

### 13.3 Post-op summary

After the final stage, click **Surgery Complete** → fill in operative notes, blood loss, complications, post-op orders → save.

---

## 14. Billing & Payments

**Used by:** billing team, front-office.

### 14.1 Generate an invoice

OPD bills are auto-created when a consultation completes. For other services:

1. Sidebar → **Billing** → **+ New Invoice**.
2. Search patient → choose service type (Consultation, Lab, Radiology, Pharmacy, Surgery, IPD).
3. Add line items — picked from masters (lab tests, drugs, procedures, packages).
4. Apply discount (if any) — discount > 10% requires an admin approval code.
5. Apply TPA / insurance deduction (if patient is covered).
6. Click **Save & Print**.

### 14.2 Take payment

From the invoice → **Take Payment** → choose mode (Cash / UPI / Card / Razorpay link). The Razorpay payment link can be sent via SMS for online payment.

### 14.3 IPD final bill

When a patient is discharged, IPD Billing assembles room charges, all consults, all orders, all drugs, OT charges, and any add-ons → final invoice → patient pays before discharge papers are released.

**[SCREENSHOT: IPD final-bill page showing line items grouped by category with totals at the bottom]**

---

## 15. Doctor's portal — special view

When a user with a **DOCTOR / CONSULTANT / SURGEON** role logs in, the dashboard is replaced with a chart-style landing.

### 15.1 Identity card

Top of the page: doctor's name + qualifications + departments + a Refresh button.

### 15.2 Five stat cards

Each card is **clickable**. Clicking a card highlights it (blue ring) and opens the matching list below.

| Card | What clicking it shows |
|---|---|
| **OPD TODAY** | Today's OPD lineup — appointments sorted by time |
| **IPD UNDER CARE** | All admissions under your care, grouped by ward |
| **OT TODAY** | Surgeries you're on for today |
| **PENDING LABS** | Lab orders you placed that are awaiting results |
| **PENDING IMAGING** | Radiology orders awaiting reports |

**[SCREENSHOT: Doctor dashboard with the IPD card highlighted and the IPD ward list rendered below]**

By default no card is highlighted on landing — pick the one you need.

### 15.3 Patient chart

Click any patient row in any of these lists → the **comprehensive patient chart** opens.

The chart has tabs:

- **Overview** — latest vitals, current status (admitted / surgery / outstanding bills), latest assessment & plan
- **Visits** — every encounter on file with chief complaint, assessment, plan, vitals
- **Admissions** — IPD history with ward, bed, diagnosis, doctor
- **Lab & Imaging** — every order with results
- **Rx** — prescriptions with full drug list
- **Surgeries** — every scheduled / completed surgery
- **Bills** — every invoice with paid + outstanding amounts

**[SCREENSHOT: Patient chart top section showing demographics, allergies banner, count tiles (Visits / Admissions / Lab / Imaging / Rx / Surgeries) and the tab bar]**

### 15.4 My Earnings

Sidebar → Finance → **My Earnings**. Shows:

- **Today / Week / Month** cards with earned, paid (done), pending (left)
- **Lifetime totals** (earned, paid out, pending)
- **6-month bar chart** — earned vs. paid each month
- **Recent earnings** — per-invoice contribution lines
- **Payout history** — actual transfers with date, mode, reference

**[SCREENSHOT: My Earnings page showing the three period cards, the bar chart, and a recent earnings list]**

---

## 16. Lab Configuration (admin)

**Used by:** lab manager / system admin.

Lab tests are configured here. Each test can be a single value (Random Blood Sugar = one number) or a panel with multiple parameters (CBC has Hb, RBC, WBC, etc.).

### 16.1 Open the screen

Sidebar → **System Control** → **Lab Configuration** tab.

### 16.2 Add a new test

1. Click **+ New Test**.
2. Fill the master fields: name, code, category, price, TAT, sample type, methodology.
3. Click **Create**. The new test appears at the top of the catalog.

**[SCREENSHOT: Lab Configuration screen — left pane shows the catalog list with search and category filter; right pane shows the selected test's master fields and the parameters table]**

### 16.3 Add parameters to a test

1. Click the test in the catalog (left pane).
2. The right pane shows master fields and a **Report parameters** table.
3. Click **+ Add parameter**.
4. Fill: parameter name, code, unit, result type (Numeric / Text / Qualitative), default reference low/high, critical low/high, decimals, display order.
5. **For Numeric parameters** an optional **Stratified ranges** section appears at the bottom — define different ranges for **Male / Female / Child** or by **age window**. Use the quick-add buttons (+ Child, + Adult Male, + Adult Female, + Custom).
6. Click **Save**.

**[SCREENSHOT: Parameter add dialog with Numeric type selected, default range fields filled, and the stratified ranges section below showing rows for "Child", "Adult Male", "Adult Female"]**

### 16.4 Edit / delete a parameter

Hover a row → pencil icon (edit) or trash icon (delete) on the right.

### 16.5 What happens at result-entry time

When a lab tech enters a result for this test, the form lists every parameter you configured. The reference range shown is the most specific match for the patient (sex + age). Out-of-range values are highlighted; critical values trigger SMS alerts.

---

## 17. System Control (admin)

**Used by:** ADMIN role only.

Sidebar → **System Control**. Five tabs:

### 17.1 User Management

Add / edit / disable users, assign roles, reset passwords.

**To add a user:**

1. Click **+ Add User**.
2. Fill identity (name, email, phone, username), roles (multi-select), department(s), branch.
3. For doctors: add qualifications, specialization, registration number, joining date, banking details, KYC.
4. Click **Create User**. A welcome email with the temporary password is sent.

**[SCREENSHOT: User Management table showing rows of users with role badges and action buttons (edit, reset password, disable)]**

### 17.2 System Settings

- **Hospital info** — name, contact, address, GST, license numbers
- **SMS provider** — toggle, MSG91 / Twilio credentials
- **Email provider** — SMTP host / port / sender
- **Razorpay** — public key, secret (write-only)
- **Branding** — logo upload, primary colour

### 17.3 Lab Configuration

See **§16** above.

### 17.4 Audit Logs

Every privileged action (login, password change, role change, patient create/edit, billing) is logged. Filters: module, date range, user.

**[SCREENSHOT: Audit Logs tab with date filter, module dropdown, user filter, and a table of timestamped events]**

### 17.5 Reports

Tenant-level analytics: user count, login activity, audit trail summaries, system health.

---

## 18. Reports & Analytics

**Sidebar → Analytics (MIS Reports)** has scheduled and ad-hoc reports:

- Daily census (admissions, discharges, occupancy)
- OPD volume by doctor
- Revenue by department / by service type
- Outstanding receivables
- TPA / insurance settlement status
- Inventory consumption
- Staff attendance summary

Each report has Export buttons: **PDF**, **Excel**, **CSV**.

---

## 19. Mobile apps — Patient

### 19.1 Install

- iOS: App Store → search "HospitalPro Patient"
- Android: Play Store → search "HospitalPro Patient"

### 19.2 Sign in

Same username/password as the portal. (OTP login is rolling out — check the login screen for the toggle.)

**[SCREENSHOT: Patient app login screen with username + password fields and a "Sign In" button]**

### 19.3 Bottom tabs

| Tab | What |
|---|---|
| **Home** | Welcome banner, upcoming appointment card, latest prescription card, outstanding bills card, surgery tracker (if applicable) |
| **Appointments** | List of past and upcoming. Tap any to see details / cancel. |
| **Records** | All your prescriptions, lab reports, radiology reports, discharge summaries — by date |
| **Bills** | Invoices with outstanding balance highlighted. Tap **Pay Now** to open Razorpay |
| **Profile** | Demographics, allergies, edit, settings, change password, sign-out |

**[SCREENSHOT: Patient app home tab with the four dashboard cards and bottom tab bar]**

### 19.4 Booking an appointment

Tap the **Calendar** icon on the home tab → choose doctor → pick date → pick slot → confirm reason → book.

**[SCREENSHOT: Patient app booking flow — doctor list → date picker → slot grid → confirmation screen]**

### 19.5 Viewing a report

**Records tab** → tap any item → full report opens with a **Download PDF** button.

### 19.6 Editing your profile

**Profile tab → Edit profile** → update phone, email, address, allergies, emergency contact → **Save**.

> Name, DOB, and gender are read-only — they were set at registration. Visit the front desk if any of these need to be corrected.

### 19.7 Surgery tracker

If a family member is having surgery and you've been added as a contact, you receive an SMS with a tracker link. Click it (no login needed) — the page updates in real-time as the surgery progresses through stages.

---

## 20. Mobile apps — Doctor

### 20.1 Sign in

Username / password + biometric unlock (Touch ID / Face ID / fingerprint) for subsequent opens.

### 20.2 Bottom tabs

| Tab | What |
|---|---|
| **Today** | Your schedule for today — appointments + surgeries chronologically |
| **Patients** | Search any patient by name / MRN. Tap to open chart. |
| **Rounds** | Your IPD admissions, grouped by ward |
| **Profile** | Identity card, **My Earnings**, settings, change password, sign-out |

**[SCREENSHOT: Doctor app Today tab showing chronological cards of appointments and surgeries with patient names and times]**

### 20.3 Patient chart on mobile

Tap any patient (from Today / Patients / Rounds tab) → comprehensive chart opens. Sections, top-to-bottom:

- Identity + Call/Email buttons
- Active admission banner (if admitted)
- Allergies banner
- Upcoming surgery banner
- Outstanding balance
- Address + emergency contact
- Pending orders → tap to enter result
- Recent visits
- Admissions history
- Prescriptions
- Surgeries
- Bills

**[SCREENSHOT: Doctor app patient chart showing the identity card, allergies banner, and the orders section with one pending lab order and one resulted radiology order]**

### 20.4 Entering a lab/radiology result on mobile

In the chart → tap a pending order → result form opens with all parameters configured for that test → enter values → toggle "Critical" if applicable → **Submit**.

### 20.5 Updating an OT stage

From Today → tap a surgery → stage tracker → tap **Next stage** → optional note → **Update**. Family receives an SMS automatically.

### 20.6 My Earnings

Profile tab → **My Earnings**. Same content as the web portal — period cards, bar chart, recent earnings, payout history.

**[SCREENSHOT: Doctor app My Earnings screen showing the today/week/month cards and the 6-month bar chart]**

---

## 21. Common tasks (cheat-sheet)

| Task | Path |
|---|---|
| Register a new patient | Front Office → + New Patient |
| Book an OPD appointment | Appointments → + New Appointment |
| Record a consultation note | OPD → click patient card → Vitals/Examination/Assessment/Plan → Save |
| Order a lab test | OPD chart → + Add Order → Lab |
| Print a prescription | OPD chart → + Prescription → Save & Print |
| Admit a patient to a ward | IPD → click vacant bed → fill admission form |
| Discharge a patient | IPD → patient chart → Discharge → fill summary |
| Mark a sample collected | Laboratory → Pending Collection → Collect Sample |
| Enter a lab result | Laboratory → In Process → Enter Result |
| Generate an invoice | Billing → + New Invoice |
| Take a payment | Invoice → Take Payment |
| Schedule a surgery | OT → + Schedule Surgery |
| Update a surgery stage | OT → click surgery → Update Stage |
| Add a new lab test parameter | System Control → Lab Configuration → select test → + Add parameter |
| Reset a user's password | System Control → User Management → ⋮ → Reset Password |
| View today's audit log | System Control → Audit Logs → set date filter |
| Check your earnings (doctor) | Sidebar → Finance → My Earnings |
| Cancel an appointment (patient) | Patient app → Appointments → tap → Cancel |
| Pay a bill (patient) | Patient app → Bills → tap → Pay Now |
| Update your phone (patient) | Patient app → Profile → Edit profile |

---

## 22. FAQs

**Q: I don't see a module I expect.**
A: Your role doesn't grant access to it. Ask an administrator.

**Q: My password isn't working.**
A: Try the **Forgot Password** link. After 5 failed tries the account is locked for 15 minutes.

**Q: A lab result didn't show on the report.**
A: The technician hasn't submitted yet, or the parameter wasn't configured (System Control → Lab Configuration). Check both.

**Q: Why is the patient chart slow to open?**
A: It pulls every record on file. For high-volume patients (50+ visits) the first load takes a few seconds; subsequent loads in the same session are cached.

**Q: How do I print prescriptions in regional language?**
A: Currently English only. Hindi / regional language support is on the roadmap. Track in the public release notes.

**Q: Can I undo a discharge?**
A: No — discharge is irreversible from the UI. Contact admin; they can re-admit the same patient with a reason note.

**Q: My phone doesn't get OTPs.**
A: SMS provider not yet enabled in your tenant. Use username + password until your administrator finishes provider registration with MSG91 / Twilio.

**Q: Can the patient app work offline?**
A: Records the patient has previously viewed are cached. New requests need internet.

---

## 23. Glossary

| Term | Meaning |
|---|---|
| **MRN** | Medical Record Number — unique patient identifier within the hospital |
| **OPD** | Outpatient Department |
| **IPD** | Inpatient Department (admitted patients) |
| **ICU** | Intensive Care Unit |
| **OT** | Operation Theatre |
| **TAT** | Turnaround Time (e.g. lab TAT in hours) |
| **TPA** | Third-Party Administrator (insurance intermediary) |
| **CBC** | Complete Blood Count (panel of blood parameters) |
| **STAT** | Highest priority — process immediately |
| **DPDP Act** | Digital Personal Data Protection Act, 2023 (Indian data protection law) |
| **SLA** | Service Level Agreement |
| **CSAT** | Customer Satisfaction Score |
| **EDR** | Endpoint Detection & Response (security software) |
| **PACS** | Picture Archiving & Communication System (radiology imaging) |
| **RBAC** | Role-Based Access Control |
| **MFA** | Multi-Factor Authentication |
| **SSO** | Single Sign-On |
| **DICOM** | Digital Imaging and Communications in Medicine (imaging standard) |
| **HL7 FHIR** | Healthcare data exchange standard |

---

*— End of manual —*

> **Help & support:** for any issue not covered here, contact your hospital's IT helpdesk (extension typically posted at every desktop) or email **support@hospitalpro.io**.
