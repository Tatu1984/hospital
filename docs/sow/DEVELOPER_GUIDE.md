# Hospital ERP — Developer Guide

**Repository:** `Tatu1984/hospital`  ·  **Branch:** `develop`
**Audience:** Engineers onboarding to the Hospital ERP backend & frontend.

This guide is the engineering reference for the system. It covers:

1. [Project layout](#1-project-layout)
2. [Local setup](#2-local-setup)
3. [Environment variables](#3-environment-variables)
4. [Database schema](#4-database-schema-67-models)
5. [API surface (187 endpoints)](#5-api-surface-187-endpoints)
6. [Authentication & RBAC](#6-authentication--rbac)
7. [Validation](#7-validation)
8. [Frontend architecture & route map](#8-frontend-architecture--route-map)
9. [Testing](#9-testing)
10. [CI/CD](#10-cicd)
11. [Deployment](#11-deployment)
12. [Observability](#12-observability)
13. [Conventions & contribution rules](#13-conventions--contribution-rules)

---

## 1. Project layout

```
hospital/
├── backend/                    # Express + TypeScript + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma       # 67 models, multi-tenant
│   │   └── migrations/
│   ├── src/
│   │   ├── server.ts           # 187 routes, app entry
│   │   ├── rbac.ts             # Roles, permissions, mappings
│   │   ├── seed.ts             # Sample tenant + roles + users
│   │   ├── controllers/        # 26 module controllers
│   │   ├── middleware/         # auth, rbac, hipaa, csrf, rateLimit, validation
│   │   ├── validators/         # Zod schemas
│   │   ├── routes/             # router composition
│   │   ├── services/           # cross-cutting (audit, tally, payroll)
│   │   ├── utils/              # logger, etc.
│   │   ├── swagger.ts          # OpenAPI generator
│   │   └── __tests__/          # vitest
│   ├── Dockerfile
│   ├── package.json
│   └── vitest.config.ts
├── frontend/                   # React 18 + Vite SPA
│   ├── src/
│   │   ├── App.tsx             # Router with RoleProtectedRoute
│   │   ├── pages/              # 39 module pages
│   │   ├── components/
│   │   ├── services/api.ts     # axios client + endpoints
│   │   └── contexts/           # AuthContext, etc.
│   ├── Dockerfile
│   └── package.json
├── docs/sow/
│   ├── SOW.md / .docx
│   ├── FEATURES.md / .docx
│   ├── DEVELOPER_GUIDE.md / .docx
│   └── diagrams/
│       ├── diagram_architecture.jpg
│       └── diagram_dataflow.jpg
├── .github/workflows/          # CI (ci.yml, pr-check.yml)
├── docker-compose.yml          # Production stack
├── docker-compose.dev.yml      # Dev stack
├── start.sh / stop.sh
└── README.md
```

---

## 2. Local setup

```bash
# 1. Prereqs: Docker, Node 20, pnpm or npm
git clone git@github.com:Tatu1984/hospital.git
cd hospital
git checkout develop

# 2. Boot the dev stack (Postgres + Redis only)
docker compose -f docker-compose.dev.yml up -d

# 3. Backend
cd backend
cp .env.example .env             # fill in JWT_SECRET, DATABASE_URL, etc.
npm ci
npx prisma generate
npx prisma migrate deploy        # apply schema
npm run seed                     # load sample tenant/users
npm run dev                      # tsx watch server.ts

# 4. Frontend (new terminal)
cd ../frontend
npm ci
echo "VITE_API_URL=http://localhost:3000" > .env
npm run dev                      # http://localhost:5173

# Default seed credentials (dev only — rotate before any deployment):
#  admin@hospital.local / <set via SEED_ADMIN_PASSWORD env>
```

Or boot the full stack:

```bash
docker compose up --build        # backend, frontend, postgres, redis, nginx
```

---

## 3. Environment variables

All variables are documented in `backend/.env.example` and `frontend/.env.example`.

### 3.1 Backend (`backend/.env`)

| Variable | Purpose | Required | Example |
|---|---|---|---|
| `NODE_ENV` | `development` / `production` / `test` | ✅ | `production` |
| `PORT` | API port | ✅ | `3000` |
| `DATABASE_URL` | Postgres connection string | ✅ | `postgresql://user:pass@host:5432/hms?schema=public` |
| `JWT_SECRET` | Signing secret for access tokens (≥ 32 chars random) | ✅ | (generate: `openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | Access token TTL | ⛔ default | `1h` |
| `REFRESH_TOKEN_SECRET` | Refresh token signing | ✅ | `openssl rand -hex 32` |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token TTL | ⛔ default | `7d` |
| `CORS_ORIGIN` | Comma-separated allowlist | ✅ | `https://hms.example.com` |
| `SEED_ADMIN_EMAIL` | Used by `seed.ts` only | ⚠ seed only | `admin@example.com` |
| `SEED_ADMIN_PASSWORD` | Used by `seed.ts` only | ⚠ seed only | (strong, set per-env) |
| `RATE_LIMIT_AUTH_MAX` | Login attempts per window | ⛔ default 5 | `5` |
| `RATE_LIMIT_GENERAL_MAX` | API calls per window | ⛔ default 100 | `100` |
| `LOG_LEVEL` | winston level | ⛔ default `info` | `info` |
| `SENTRY_DSN` | Sentry project DSN (optional) | ⛔ | `https://...@sentry.io/...` |

### 3.2 Frontend (`frontend/.env`)

| Variable | Purpose | Example |
|---|---|---|
| `VITE_API_URL` | Backend base URL | `https://api.hms.example.com` |

> The repo ships **`.env.example`** files only. No real secrets are committed. `docker-compose.yml` reads `${VAR}` placeholders and fails fast if any required value is missing.

---

## 4. Database schema (67 models)

Source of truth: `backend/prisma/schema.prisma`. The model is multi-tenant: every primary table carries `tenantId` and (where applicable) `branchId`.

### 4.1 Models grouped by domain

| Domain | Models |
|---|---|
| **Tenancy & access** | `Tenant`, `Branch`, `Module`, `BranchModule`, `Department`, `User`, `AuditLog` |
| **Patient** | `Patient`, `PatientInsurance` |
| **Scheduling** | `Appointment` |
| **Clinical** | `Encounter`, `OPDNote`, `Prescription`, `Admission`, `Bed`, `Ward`, `IPDNote` |
| **Orders & results** | `Order`, `Result`, `LabTestMaster`, `RadiologyTestMaster`, `ProcedureMaster`, `PackageMaster` |
| **Emergency / ICU / OT** | `EmergencyCase`, `ICUBed`, `ICUVitals`, `Surgery`, `OTRoom`, `OTTheatre` |
| **Pharmacy & inventory** | `Drug`, `Stock`, `InventoryItem`, `PurchaseOrder`, `PurchaseOrderItem` |
| **Blood bank** | `BloodDonor`, `BloodDonation`, `BloodInventory`, `BloodRequest`, `BloodIssuance` |
| **Billing** | `Invoice`, `Payment` |
| **TPA / Insurance** | `TPAMaster`, `PreAuthorization` |
| **Doctor finance** | `ReferralSource`, `Commission`, `CommissionPayout`, `DoctorContract`, `DoctorRevenue`, `DoctorPayout` |
| **GL / Accounting** | `FiscalYear`, `AccountGroup`, `AccountHead`, `JournalEntry`, `JournalEntryLine`, `LedgerEntry` |
| **HR** | `Employee`, `EmployeeAttendance`, `LeaveRequest`, `AttendanceLog` |
| **Operations** | `AmbulanceVehicle`, `AmbulanceTrip`, `HousekeepingTask`, `DietOrder`, `Asset`, `MaintenanceLog` |
| **Quality** | `Incident`, `Feedback` |
| **Misc** | (continues — see schema for full list) |

> **Total:** 67 models. **Enums:** zero — status fields use string literals validated by Zod and the Prisma schema. This keeps migrations cheaper.

### 4.2 Key tenancy / scoping conventions

- Every primary entity declares `tenantId String` (FK → `Tenant.id`) and most also `branchId String?` (FK → `Branch.id`).
- All list endpoints **must** filter by `tenantId` derived from the JWT (`req.user.tenantId`). Cross-tenant access is impossible at the data layer.
- For cross-branch queries, the user must hold the `system:manage` permission.

### 4.3 Migrations

All schema changes are versioned under `backend/prisma/migrations/`. To add a migration:

```bash
cd backend
npx prisma migrate dev --name add_xyz_table
```

For production:

```bash
npx prisma migrate deploy
```

Never edit a migration that has been applied to production; always add a new one.

---

## 5. API surface (187 endpoints)

The full machine-readable spec is at:

- `GET /api/docs` — Swagger UI
- `GET /api/docs.json` — OpenAPI JSON

Below is the complete grouped listing, by module. Every authenticated endpoint requires a Bearer JWT (`Authorization: Bearer <token>`) and an RBAC permission (see [section 6](#6-authentication--rbac)).

### 5.1 Health & docs

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | none | Liveness ping (no DB) |
| GET | `/api/health` | none | Service health |
| GET | `/api/health/detailed` | `system:manage` | DB latency, memory, CPU |
| GET | `/api/live` | none | Container liveness |
| GET | `/api/ready` | none | Container readiness (DB reachable) |
| GET | `/api/docs.json` | none | OpenAPI spec |

### 5.2 Auth

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | none (rate-limited) | Returns `{ token, refreshToken, user }` |

### 5.3 Patients

| Method | Path | Permission |
|---|---|---|
| GET | `/api/patients` | `patients:view` |
| GET | `/api/patients/:id` | `patients:view` |
| POST | `/api/patients` | `patients:create` |

### 5.4 Users & doctors

| Method | Path | Permission |
|---|---|---|
| GET | `/api/users` | `users:view` |
| POST | `/api/users` | `users:manage` |
| PUT | `/api/users/:id` | `users:manage` |
| DELETE | `/api/users/:id` | `users:manage` |
| POST | `/api/users/:id/reset-password` | `users:manage` |
| GET | `/api/doctors` | `users:view` |
| GET | `/api/referral-doctors` | `commissions:view` |

### 5.5 Appointments

| Method | Path | Permission |
|---|---|---|
| GET | `/api/appointments` | `appointments:view` |
| POST | `/api/appointments` | `appointments:create` |
| PUT | `/api/appointments/:id` | `appointments:edit` |
| DELETE | `/api/appointments/:id` | `appointments:delete` |
| POST | `/api/appointments/:id/check-in` | `appointments:edit` |
| POST | `/api/appointments/:id/cancel` | `appointments:edit` |

### 5.6 OPD / Encounters

| Method | Path | Permission |
|---|---|---|
| GET | `/api/encounters` | `encounters:view` |
| POST | `/api/encounters` | `encounters:create` |
| GET | `/api/opd-notes/:encounterId` | `opd:view` |
| POST | `/api/opd-notes` | `opd:create` |

### 5.7 IPD / Admissions / Beds

| Method | Path | Permission |
|---|---|---|
| GET | `/api/admissions` | `admissions:view` |
| POST | `/api/admissions` | `admissions:create` |
| POST | `/api/admissions/:id/discharge` | `admissions:discharge` |
| GET | `/api/beds` | `beds:view` |
| GET | `/api/wards` | `master_data:view` |
| GET | `/api/nurse/medications` | `nurse_station:view` |
| GET | `/api/nurse/vitals` | `nurse_station:view` |

### 5.8 Emergency

| Method | Path | Permission |
|---|---|---|
| GET | `/api/emergency` | `emergency:view` |
| GET | `/api/emergency/cases` | `emergency:view` |
| POST | `/api/emergency/cases` | `emergency:create` |
| PUT | `/api/emergency/cases/:id` | `emergency:edit` |
| POST | `/api/emergency/cases/:id/admit` | `emergency:admit` |
| POST | `/api/emergency/cases/:id/discharge` | `emergency:discharge` |

### 5.9 ICU

| Method | Path | Permission |
|---|---|---|
| GET | `/api/icu/beds` | `icu:view` |
| POST | `/api/icu/beds` | `icu:create` |
| GET | `/api/icu/patients` | `icu:view` |
| POST | `/api/icu/vitals` | `icu_vitals:create` |
| POST | `/api/icu/ventilator` | `icu_vitals:create` |

### 5.10 OT / Surgery

| Method | Path | Permission |
|---|---|---|
| GET | `/api/surgeries` | `surgery:view` |
| POST | `/api/surgeries` | `surgery:schedule` |
| POST | `/api/surgeries/:id/start` | `surgery:start` |
| POST | `/api/surgeries/:id/complete` | `surgery:complete` |
| POST | `/api/surgeries/:id/cancel` | `surgery:cancel` |
| GET | `/api/ot-rooms` / `/api/ot/rooms` | `ot:view` |
| POST | `/api/ot-rooms` | `ot:create` |

### 5.11 Lab

| Method | Path | Permission |
|---|---|---|
| GET | `/api/lab-orders` | `lab_orders:view` |
| POST | `/api/lab-orders` | `lab_orders:create` |
| PUT | `/api/lab-orders/:id` | `lab_orders:update` |
| POST | `/api/lab-results` | `lab_results:create` |
| GET | `/api/lab-tests` | `master_data:view` |
| POST | `/api/lab-tests` | `master_data:edit` |

### 5.12 Radiology

| Method | Path | Permission |
|---|---|---|
| GET | `/api/radiology-orders` | `radiology_orders:view` |
| POST | `/api/radiology-orders` | `radiology_orders:create` |
| PUT | `/api/radiology-orders/:id` | `radiology_orders:update` |
| GET | `/api/radiology-tests` | `master_data:view` |
| POST | `/api/radiology-tests` | `master_data:edit` |

### 5.13 Phlebotomy

| Method | Path | Permission |
|---|---|---|
| GET | `/api/phlebotomy/collections` | `phlebotomy:view` |
| POST | `/api/phlebotomy/collections` | `phlebotomy:create` |
| PUT | `/api/phlebotomy/collections/:id/collect` | `phlebotomy:update` |
| PUT | `/api/phlebotomy/collections/:id/reject` | `phlebotomy:update` |

### 5.14 Pharmacy

| Method | Path | Permission |
|---|---|---|
| GET | `/api/drugs` / `/api/pharmacy/drugs` | `pharmacy:view` |
| POST | `/api/drugs` | `pharmacy:manage` |
| PUT | `/api/drugs/:id` | `pharmacy:manage` |
| GET | `/api/pharmacy/stock` | `pharmacy:view` |
| GET | `/api/pharmacy/pending-prescriptions` | `pharmacy:dispense` |

### 5.15 Blood Bank

| Method | Path | Permission |
|---|---|---|
| GET | `/api/blood-bank/inventory` | `blood_bank:view` |
| GET | `/api/blood-bank/donors` | `blood_donors:view` |
| POST | `/api/blood-bank/donors` | `blood_donors:create` |
| GET | `/api/blood-bank/requests` | `blood_requests:view` |
| POST | `/api/blood-bank/requests` | `blood_requests:create` |
| POST | `/api/blood-bank/requests/:id/cross-match` | `blood_bank:manage` |
| POST | `/api/blood-bank/requests/:id/issue` | `blood_requests:issue` |

### 5.16 Inventory & Procurement

| Method | Path | Permission |
|---|---|---|
| GET | `/api/inventory/items` | `inventory:view` |
| POST | `/api/inventory/items` | `inventory:manage` |
| GET | `/api/inventory/purchase-orders` | `purchase_orders:view` |
| POST | `/api/inventory/purchase-orders` | `purchase_orders:create` |
| PUT | `/api/inventory/purchase-orders/:id` | `purchase_orders:approve` |

### 5.17 Billing & Invoices

| Method | Path | Permission |
|---|---|---|
| GET | `/api/invoices` / `/api/bills` | `invoices:view` |
| POST | `/api/invoices` | `invoices:create` |
| POST | `/api/invoices/:id/payment` | `invoices:payment` |
| GET | `/api/ipd-billing/:admissionId` | `billing:view` |
| POST | `/api/ipd-billing` | `billing:create` |
| POST | `/api/ipd-billing/:admissionId/pay` | `billing:payment` |
| GET | `/api/packages` | `master_data:view` |
| GET | `/api/procedures` | `master_data:view` |

### 5.18 TPA / Insurance

| Method | Path | Permission |
|---|---|---|
| GET | `/api/insurance-companies` | `master_data:view` |
| POST | `/api/insurance-companies` | `master_data:edit` |
| GET | `/api/patient-insurances` | `patients:view` |
| POST | `/api/patient-insurances` | `patients:edit` |
| GET | `/api/tpa/claims` | `billing:view` |
| POST | `/api/tpa/claims` | `billing:create` |
| GET | `/api/tpa/pre-authorizations` | `billing:view` |
| POST | `/api/tpa/pre-authorizations` | `billing:create` |

### 5.19 Doctor accounting & commissions

| Method | Path | Permission |
|---|---|---|
| GET | `/api/referral-sources` | `commissions:view` |
| POST | `/api/referral-sources` | `commissions:manage` |
| PUT | `/api/referral-sources/:id` | `commissions:manage` |
| GET | `/api/commissions` | `commissions:view` |
| GET | `/api/commissions/summary` | `commissions:view` |
| POST | `/api/commissions/:id/approve` | `commissions:manage` |
| GET | `/api/commission-payouts` | `commissions:view` |
| POST | `/api/commission-payouts` | `commissions:payout` |
| GET | `/api/doctor-contracts` | `doctor_revenue:view` |
| POST | `/api/doctor-contracts` | `doctor_revenue:manage` |
| GET | `/api/doctor-revenues` | `doctor_revenue:view` |
| GET | `/api/doctor-payouts` | `doctor_revenue:view` |
| POST | `/api/doctor-payouts` | `doctor_revenue:manage` |

### 5.20 Accounting / GL / Tally

| Method | Path | Permission |
|---|---|---|
| GET | `/api/account-heads` | `accounts:view` |
| POST | `/api/account-heads` | `accounts:create` |
| GET | `/api/journal-entries` | `accounts:view` |
| POST | `/api/journal-entries` | `accounts:create` |
| GET | `/api/ledger/:accountHeadId` | `accounts:view` |
| GET | `/api/trial-balance` | `accounts:view` |
| GET | `/api/tally/sync-status` | `accounting:view` |
| POST | `/api/tally/sync` | `accounting:create` |
| GET | `/api/tally/entries` | `accounting:view` |

### 5.21 HR / Payroll / Attendance

| Method | Path | Permission |
|---|---|---|
| GET | `/api/hr/employees` / `/api/employees` | `employees:view` |
| POST | `/api/hr/employees` | `employees:create` |
| GET | `/api/hr/attendance` / `/api/attendance` | `attendance:view` |
| POST | `/api/hr/attendance` | `attendance:manage` |
| GET | `/api/hr/leaves` | `leaves:view` |
| POST | `/api/hr/leaves` | `leaves:create` |
| POST | `/api/hr/leaves/:id/approve` | `leaves:approve` |
| POST | `/api/hr/leaves/:id/reject` | `leaves:approve` |
| GET | `/api/payroll/salary-structures` | `payroll:view` |
| POST | `/api/payroll/salary-structures` | `payroll:create` |
| GET | `/api/payroll/payslips` | `payroll:view` |
| GET | `/api/payroll/payslips/:employeeId` | `payroll:view` |
| POST | `/api/payroll/generate` | `payroll:create` |
| GET | `/api/biometric/devices` | `hr:view` |
| GET | `/api/biometric/today` | `hr:view` |
| POST | `/api/biometric/punch` | `hr:create` |

### 5.22 Operations

| Method | Path | Permission |
|---|---|---|
| GET | `/api/ambulance/vehicles` / `/api/ambulances` | `ambulance:view` |
| POST | `/api/ambulance/vehicles` | `ambulance:manage` |
| GET | `/api/ambulance/trips` | `ambulance:view` |
| POST | `/api/ambulance/trips` | `ambulance:manage` |
| POST | `/api/ambulance/trips/:id/assign` | `ambulance:manage` |
| POST | `/api/ambulance/trips/:id/complete` | `ambulance:manage` |
| GET | `/api/housekeeping/tasks` | `housekeeping:view` |
| POST | `/api/housekeeping/tasks` | `housekeeping:manage` |
| POST | `/api/housekeeping/tasks/:id/complete` | `housekeeping:manage` |
| GET | `/api/housekeeping/laundry` | `housekeeping:view` |
| GET | `/api/diet/orders` | `diet:view` |
| POST | `/api/diet/orders` | `diet:manage` |
| PUT | `/api/diet/orders/:id` | `diet:manage` |
| GET | `/api/cssd/cycles` | `cssd:view` |
| POST | `/api/cssd/cycles` | `cssd:create` |
| PUT | `/api/cssd/cycles/:id/complete` | `cssd:update` |
| GET | `/api/cssd/instruments` | `cssd:view` |

### 5.23 Quality

| Method | Path | Permission |
|---|---|---|
| GET | `/api/quality/incidents` | `quality:view` |
| GET | `/api/quality/feedbacks` | `quality:view` |

### 5.24 Health checkup

| Method | Path | Permission |
|---|---|---|
| GET | `/api/health-checkup/packages` | `health-checkup:view` |
| POST | `/api/health-checkup/packages` | `health-checkup:create` |
| GET | `/api/health-checkup/bookings` | `health-checkup:view` |
| POST | `/api/health-checkup/bookings` | `health-checkup:create` |

### 5.25 Reporting & dashboards

| Method | Path | Permission |
|---|---|---|
| GET | `/api/dashboard/stats` | `dashboard:view` |
| GET | `/api/reports` | `reports:view` |
| GET | `/api/reports/dashboard` | `reports:view` |

### 5.26 Master data

| Method | Path | Permission |
|---|---|---|
| GET | `/api/master/{drugs,tests,lab-tests,radiology-tests,procedures,departments,wards,packages}` | `master_data:view` |
| POST | `/api/master/:type` | `master_data:edit` |
| PUT | `/api/master/:type/:id` | `master_data:edit` |
| DELETE | `/api/master/:type/:id` | `master_data:edit` |

### 5.27 System & audit

| Method | Path | Permission |
|---|---|---|
| GET | `/api/audit-logs` | `system:manage` |
| GET | `/api/settings` | `system:view` |
| POST | `/api/settings/hospital` | `system:manage` |
| POST | `/api/settings/email` | `system:manage` |
| POST | `/api/settings/sms` | `system:manage` |

---

## 6. Authentication & RBAC

### 6.1 Login flow

1. Client `POST /api/auth/login` with `{ email, password }`.
2. Backend rate-limits via `authRateLimiter`, validates with Zod, looks up user, compares password with `bcrypt.compare`.
3. On success: signs an access JWT (`JWT_SECRET`, ~1h TTL) and a refresh JWT (`REFRESH_TOKEN_SECRET`, 7d). Audit `LOGIN_SUCCESS`.
4. On failure: audit `LOGIN_FAILED`. After 5 failed attempts in 15 minutes the IP is blocked.
5. Client stores tokens (access in memory, refresh in `httpOnly` cookie).
6. Subsequent requests carry `Authorization: Bearer <access>`.
7. Frontend axios interceptor refreshes the access token on 401 (single-flight).

### 6.2 Middleware

```ts
// backend/src/middleware/auth.ts
authenticateToken(req, res, next)         // verifies JWT, attaches req.user
requireRole('ADMIN', 'DOCTOR')(req,res,next)
requirePermission('patients:view')(req,res,next)
```

`req.user` shape:

```ts
{ id: string, email: string, role: Role, tenantId: string, branchId?: string, permissions: Permission[] }
```

### 6.3 Roles (19) and permission map

Defined in `backend/src/rbac.ts`:

`ADMIN`, `DOCTOR`, `NURSE`, `FRONT_OFFICE`, `BILLING`, `LAB_TECH`, `RADIOLOGY_TECH`, `PHARMACIST`, `EMERGENCY`, `ICU`, `OT`, `IPD`, `HR`, `INVENTORY`, `HOUSEKEEPING`, `DIET`, `AMBULANCE`, `BLOOD_BANK`, `QUALITY`.

The `ROLE_PERMISSIONS` map is the source of truth; controllers do **not** hardcode role checks — always go through `requirePermission(...)`.

---

## 7. Validation

All POST/PUT/PATCH endpoints carry a Zod schema, applied via `validateBody(schema)`. Schemas live in `backend/src/validators/`.

Examples:

```ts
// validators/auth.ts
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

// validators/patient.ts
export const createPatientSchema = z.object({
  firstName: z.string().min(1).max(120),
  lastName:  z.string().max(120).optional(),
  dob:       z.string().datetime(),
  gender:    z.enum(['MALE','FEMALE','OTHER']),
  phone:     z.string().regex(/^\+?[0-9]{7,15}$/),
  // ...
});
```

Query parameters use `validateQuery(schema)`. Validation errors return `400` with `{ errors: [{path, message}] }`.

---

## 8. Frontend architecture & route map

### 8.1 Stack

- React 18 (functional components, hooks)
- Vite 5 (build), TypeScript 5
- React Router 6 with `RoleProtectedRoute` wrapper
- Ant Design 5 + shadcn/ui (Radix primitives) + Tailwind CSS 4
- Axios client (`src/services/api.ts`) with interceptors for auth + 401 refresh
- Recharts (charts), jsPDF (PDF export), date-fns/dayjs

### 8.2 Auth & state

- `AuthContext` provides `{ user, login, logout, refresh }`. Persisted in `httpOnly` cookie (refresh) + `sessionStorage` (access — cleared on tab close).
- `RoleProtectedRoute` reads `user.permissions` and the route's required permission key, redirects to `/dashboard` if disallowed.
- Server state uses axios + lightweight stores per page; complex modules use a `useReducer` pattern.

### 8.3 Page → route → API mapping (selected)

| Page (`frontend/src/pages/`) | Route | Permission | Primary API calls |
|---|---|---|---|
| `Login.tsx` | `/login` | none | `POST /api/auth/login` |
| `NewDashboard.tsx` | `/` | `dashboard:view` | `GET /api/dashboard/stats` |
| `PatientRegistration.tsx` | `/patients` | `patients:view` | `GET/POST /api/patients` |
| `Appointment.tsx` | `/appointment` | `appointments:view` | `GET/POST/PUT /api/appointments` |
| `OPD.tsx` / `OPDClinical.tsx` | `/opd`, `/opd-clinical` | `opd:view` | `POST /api/encounters`, `/api/opd-notes` |
| `HealthCheckup.tsx` | `/health-checkup` | `health-checkup:view` | `/api/health-checkup/*` |
| `Laboratory.tsx` | `/laboratory` | `lab:view` | `/api/lab-orders`, `/api/lab-results` |
| `Radiology.tsx` | `/radiology` | `radiology:view` | `/api/radiology-orders` |
| `Pathology.tsx` | `/pathology` | `lab:view` | `/api/lab-orders` |
| `Phlebotomy.tsx` | `/phlebotomy` | `phlebotomy:view` | `/api/phlebotomy/collections` |
| `Inpatient.tsx` | `/inpatient` | `ipd:view` | `/api/admissions`, `/api/beds` |
| `InpatientBilling.tsx` / `IPDBilling.tsx` | `/inpatient-billing`, `/ipd-billing` | `billing:view` | `/api/ipd-billing/*` |
| `NurseStation.tsx` | `/nurse-station` | `nurse_station:view` | `/api/nurse/*` |
| `Emergency.tsx` | `/emergency` | `emergency:view` | `/api/emergency/cases` |
| `ICU.tsx` | `/icu` | `icu:view` | `/api/icu/*` |
| `OperationTheatre.tsx` | `/operation-theatre` | `ot:view` | `/api/surgeries`, `/api/ot-rooms` |
| `BloodBank.tsx` | `/blood-bank` | `blood_bank:view` | `/api/blood-bank/*` |
| `Pharmacy.tsx` | `/pharmacy` | `pharmacy:view` | `/api/drugs`, `/api/pharmacy/*` |
| `Ambulance.tsx` | `/ambulance` | `ambulance:view` | `/api/ambulance/*` |
| `Housekeeping.tsx` | `/housekeeping` | `housekeeping:view` | `/api/housekeeping/*` |
| `Diet.tsx` | `/diet` | `diet:view` | `/api/diet/orders` |
| `Quality.tsx` | `/quality` | `quality:view` | `/api/quality/*` |
| `CSSD.tsx` | `/cssd` | `cssd:view` | `/api/cssd/*` |
| `BillingPage.tsx` | `/billing` | `billing:view` | `/api/invoices` |
| `ReferralCommission.tsx` | `/referral-commission` | `commissions:view` | `/api/commissions/*`, `/api/referral-sources` |
| `TPA.tsx` | `/tpa` | `billing:view` | `/api/tpa/*` |
| `DoctorAccounting.tsx` | `/doctor-accounting` | `doctor_revenue:view` | `/api/doctor-*` |
| `Tally.tsx` | `/tally` | `accounting:view` | `/api/tally/*` |
| `Inventory.tsx` / `StoreManagement.tsx` | `/inventory`, `/store-management` | `inventory:view` | `/api/inventory/*` |
| `AssetManagement.tsx` | `/asset-management` | `inventory:view` | `/api/inventory/items` |
| `EquipmentMaintenance.tsx` | `/equipment-maintenance` | `inventory:view` | `/api/inventory/items` |
| `MedicalDevice.tsx` | `/medical-device` | `inventory:view` | `/api/inventory/items` |
| `DoctorAssistant.tsx` | `/doctor-assistant` | `dashboard:view` | `/api/encounters`, `/api/appointments` |
| `MRDManagement.tsx` | `/mrd-management` | `patients:view` | `/api/patients` |
| `VideoConversation.tsx` | `/video-conversation` | `dashboard:view` | external |
| `DICOMPACS.tsx` | `/dicom-pacs` | `radiology:view` | external |
| `HR.tsx` | `/hr` | `hr:view` | `/api/hr/*` |
| `PayrollManagement.tsx` | `/payroll` | `payroll:view` | `/api/payroll/*` |
| `BiometricAttendance.tsx` | `/biometric-attendance` | `hr:view` | `/api/biometric/*` |
| `DoctorRegistration.tsx` | `/doctor-registration` | `users:manage` | `/api/users` |
| `MISReport.tsx` | `/mis-report` | `reports:view` | `/api/reports/*` |
| `MasterData.tsx` | `/master-data` | `master_data:view` | `/api/master/*` |
| `SoftwareManagement.tsx` | `/software-management` | `system:view` | `/api/settings` |
| `SystemControl.tsx` | `/system-control` | `system:manage` | `/api/audit-logs`, `/api/settings/*` |
| `Mortuary.tsx` | `/mortuary` | `dashboard:view` | TBD |
| `Physiotherapy.tsx` | `/physiotherapy` | `dashboard:view` | TBD |

> Total: 50+ routes wired through `App.tsx`. Every protected route uses `<RoleProtectedRoute path="...">`.

---

## 9. Testing

### 9.1 Backend (`backend/`)

- Runner: **vitest** (configured in `vitest.config.ts`).
- Suites: `src/__tests__/rbac.test.ts` (60+ permission-matrix cases), `validators.test.ts` (Zod schemas), expanding to controllers.
- Run locally:
  ```bash
  cd backend
  npm test                 # vitest run
  npm run test:watch       # vitest
  npm run test:coverage    # v8 coverage, HTML report under coverage/
  ```
- CI runs `npm test` on every push/PR (see `.github/workflows/ci.yml`). Failing tests block merge.

### 9.2 Frontend

- Vitest + React Testing Library (planned). Component contract tests for `RoleProtectedRoute`, axios interceptors, and form validation.

### 9.3 E2E (planned)

Playwright covering: login → register patient → OPD encounter → lab order → invoice → discharge.

---

## 10. CI/CD

`.github/workflows/ci.yml` runs the **backend job** with a Postgres 15 service container:

1. Checkout
2. Node 20 setup
3. `npm ci` (caches `package-lock.json`)
4. `npx prisma generate`
5. `npx prisma migrate deploy` (against the test DB)
6. `npm run lint --if-present`
7. `npm test --if-present` (vitest)
8. `npm run build`
9. Upload `dist/` artifact

The **frontend job** does `npm ci`, type-check (`tsc`), and `npm run build`.

Docker images are built and pushed on merges to `main` (requires `DOCKER_USERNAME`, `DOCKER_PASSWORD` secrets). `pr-check.yml` runs the same pipeline on PRs.

---

## 11. Deployment

### 11.1 Docker Compose

```bash
docker compose up -d --build
```

Brings up: `postgres:15`, `backend` (Node), `frontend` (nginx-served Vite build), `redis:7`, `nginx` reverse proxy.

All services have healthchecks; `backend` depends on `postgres` being healthy.

### 11.2 Production check-list

- [ ] Generate strong `JWT_SECRET`, `REFRESH_TOKEN_SECRET` (`openssl rand -hex 32`)
- [ ] Set `DATABASE_URL` to the managed Postgres (HA + WAL backups)
- [ ] Set `CORS_ORIGIN` to the actual public domain(s)
- [ ] Provide TLS certs to nginx (Let's Encrypt or cert manager)
- [ ] Configure Sentry DSN, log shipping (Loki / CloudWatch)
- [ ] Configure SMTP / SMS gateway in `Settings → Hospital/Email/SMS`
- [ ] Run `npx prisma migrate deploy` then `npm run seed` (with production-grade `SEED_ADMIN_PASSWORD`)
- [ ] Rotate seeded admin password on first login
- [ ] Schedule nightly `pg_dump` to S3
- [ ] Smoke-test `/health`, `/api/ready`, `/api/docs`

### 11.3 Kubernetes (optional)

Helm chart roadmap. Components: `Deployment` × backend (3 replicas), frontend (2 replicas), `StatefulSet` Postgres (or external RDS), Redis, ingress with TLS.

---

## 12. Observability

| Concern | Tool | Path |
|---|---|---|
| Structured logs | Winston | stdout (Docker captures) |
| Error tracking | Sentry (`@sentry/node`) | `SENTRY_DSN` |
| Audit trail | `AuditLog` table | append-only |
| Health probes | Express endpoints | `/health`, `/api/live`, `/api/ready`, `/api/health/detailed` |
| API docs | Swagger UI | `/api/docs` |
| Metrics | Prometheus exporter | TBD (phase 2) |

Log fields always include `requestId`, `userId`, `tenantId`, `route`, `latency_ms`. PHI is redacted (only IDs in logs).

---

## 13. Conventions & contribution rules

- **Branching:** `develop` (integration), feature branches `feat/<short>`, fixes `fix/<short>`. PRs target `develop`. Releases are tagged + merged to `main`.
- **Commits:** conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- **No AI attribution** in commit messages or PR descriptions.
- **Every new endpoint** must:
  1. Land a Zod validator in `backend/src/validators/`.
  2. Carry `requirePermission(...)` (or explicitly justify why not).
  3. Have a vitest test covering the permission matrix (allowed/denied roles).
  4. Be documented in Swagger via JSDoc annotations.
- **Every new UI page** must:
  1. Be registered as a `<RoleProtectedRoute>` in `App.tsx`.
  2. Consume APIs only via `services/api.ts`.
  3. Use the shared `AuthContext`, never read tokens directly.
- **Schema changes** ship as Prisma migrations only — never edit `_prisma_migrations` or rewrite history.
- **Secrets** never enter git, including `.env` files. Use `.env.example` as the contract.
- **Logs** never contain raw PHI; only IDs and event types.
