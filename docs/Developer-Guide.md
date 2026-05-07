---
title: "HospitalPro — Developer Guide"
subtitle: "Architecture, conventions, and how to extend the system"
audience: "Software engineers maintaining or extending HospitalPro"
date: "May 2026"
version: "1.0"
---

# HospitalPro — Developer Guide

## 1. System overview

HospitalPro is a multi-tenant hospital management system with three client surfaces sharing a single backend:

| Surface | Tech | Purpose |
|---|---|---|
| **Web portal** | Vite + React 18 + TypeScript | Primary clinical/admin UI for hospital staff |
| **Patient mobile app** | Expo SDK 52 + React Native | Self-service for outpatients & families |
| **Doctor mobile app** | Expo SDK 52 + React Native | Clinical companion for consultants |
| **Backend API** | Node 20 + Express + Prisma + Postgres | Single source of truth for all clients |

All three clients call the **same backend** (`https://hospital-c3k5.vercel.app`). Mobile-specific endpoints live under `/api/mobile/v1/*`; everything else is shared with the web portal.

### Deployment

| Component | Hosting | Build trigger |
|---|---|---|
| Backend | Vercel serverless functions | `git push origin main` |
| Web portal | Vercel static site (Vite build) | `git push origin main` |
| Mobile apps | EAS Build → App Store / Play Store | Manual (`eas build`) |
| Database | Postgres (Neon / RDS / equivalent) | Migrations via `prisma migrate deploy` |

---

## 2. Repository structure

```
hospital/
├── backend/                  ← Node 20 + Express + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma     ← 71 models, single source of truth
│   │   └── migrations/       ← 18+ ordered SQL migrations
│   ├── src/
│   │   ├── server.ts         ← Express bootstrap + most legacy endpoints
│   │   ├── swagger.ts        ← OpenAPI spec
│   │   ├── middleware/       ← auth, validation, RBAC, error handler
│   │   ├── modules/          ← Layered modules (controller/service/repository)
│   │   │   ├── auth/         ← Mobile auth (login, OTP)
│   │   │   ├── patients/     ← Mobile patient self-service + chart
│   │   │   ├── appointments/ ← Mobile booking
│   │   │   ├── doctors/      ← Doctor dashboard + finance
│   │   │   ├── orders/       ← Lab + radiology orders
│   │   │   ├── reports/      ← Patient-facing reports
│   │   │   ├── billing/      ← Razorpay integration
│   │   │   └── index.ts      ← Mounts all modules under /api/mobile/v1
│   │   ├── routes/
│   │   │   └── index.ts      ← ROUTE_PERMISSIONS + ROUTE_VALIDATORS registry
│   │   ├── validators/       ← Zod schemas
│   │   ├── shared/
│   │   │   └── prisma.ts     ← Singleton Prisma client
│   │   ├── rbac.ts           ← Role-permission map
│   │   └── audit-logger.ts   ← Audit log writer
│   └── package.json
│
├── frontend/                 ← Vite + React + TypeScript portal
│   ├── src/
│   │   ├── App.tsx           ← Route definitions, ProtectedRoute, lazy loading
│   │   ├── main.tsx          ← Entry
│   │   ├── pages/            ← One file per top-level route (42 pages)
│   │   ├── components/
│   │   │   ├── ui/           ← shadcn/Radix component library
│   │   │   ├── MainLayout.tsx← Sidebar + header shell
│   │   │   ├── Toast.tsx     ← Toast provider
│   │   │   └── ErrorBoundary.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx ← User, token, hasAccess()
│   │   ├── config/
│   │   │   └── permissions.ts ← Role→route allow-list (mirrors backend RBAC)
│   │   ├── services/
│   │   │   └── api.ts        ← Axios client + 401 refresh interceptor
│   │   ├── utils/
│   │   │   └── pdfGenerator.ts ← Lab report PDF builder
│   │   └── website/          ← Public marketing pages (lazy-loaded)
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── mobile/                   ← Two Expo apps
│   ├── README.md
│   ├── doctor/               ← Doctor companion app
│   │   ├── app/              ← expo-router file-based routes
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx
│   │   │   ├── (tabs)/
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── index.tsx       ← Today's schedule
│   │   │   │   ├── patients.tsx    ← Patient search
│   │   │   │   ├── rounds.tsx      ← IPD rounds
│   │   │   │   └── profile.tsx     ← Account hub
│   │   │   ├── patient/[id].tsx    ← Comprehensive patient chart
│   │   │   ├── order/[id].tsx      ← Lab/radiology result entry
│   │   │   ├── ot/[id].tsx         ← Surgery stage tracker
│   │   │   ├── finance.tsx         ← Earnings dashboard
│   │   │   ├── settings.tsx
│   │   │   ├── change-password.tsx
│   │   │   └── about.tsx
│   │   ├── lib/
│   │   │   ├── api.ts        ← Axios + token interceptor
│   │   │   └── auth.ts       ← Zustand auth store
│   │   ├── app.json
│   │   └── package.json
│   └── patient/              ← Patient self-service app
│       └── app/              ← Mirror structure: index, appointments,
│                                prescriptions, bills, profile, book,
│                                report/[category]/[id], edit-profile,
│                                settings, change-password, about
│
├── docs/                     ← Proposals, this guide, user manual
│   └── proposals/
│       ├── AMC-Proposal.{md,docx}
│       ├── Managed-IT-Services-Proposal.{md,docx}
│       └── Managed-IT-Team-Summary.{md,docx}
│
├── scripts/                  ← One-off scripts (seeding, data migration)
├── loadtest/                 ← k6 / artillery scripts
├── docker-compose.yml        ← Local Postgres
└── README.md
```

---

## 3. Tech stack & versions

| Layer | Library | Version | Notes |
|---|---|---|---|
| **Backend** | | | |
| | Node | 20.x | Vercel runtime |
| | Express | 4.x | |
| | Prisma | 5.x | ORM + migration tool |
| | Postgres | 15+ | Primary DB |
| | bcryptjs | latest | Password hashing |
| | jsonwebtoken | 9.x | Access + refresh tokens |
| | zod | 3.x | Request validation |
| | swagger-ui-express + swagger-jsdoc | latest | Auto-generated API docs |
| **Web** | | | |
| | React | 18 | |
| | TypeScript | 5.x | Strict mode |
| | Vite | 5.x | Build + dev server |
| | Tailwind CSS | 3.x | Styling |
| | shadcn/Radix UI | latest | Component primitives |
| | axios | 1.x | HTTP client |
| | react-router-dom | 6.x | Routing |
| | lucide-react | latest | Icon library |
| **Mobile** | | | |
| | Expo SDK | 52 | Managed workflow |
| | expo-router | 4.x | File-based routing |
| | NativeWind | 4.x | Tailwind for RN |
| | react-native-reusables | latest | shadcn-style RN components |
| | Moti + Reanimated | latest | Animations |
| | expo-secure-store | latest | Token storage (Keychain / EncryptedSP) |
| | expo-local-authentication | latest | Biometric unlock |
| | zustand | latest | Auth state |

---

## 4. Backend deep-dive

### 4.1 Two co-existing styles

The backend has two styles of code, both healthy:

1. **Legacy flat handlers** in `src/server.ts` — older endpoints, pre-modular phase. ~7000 lines. Still maintained.
2. **Layered modules** in `src/modules/<domain>/` — newer, follows Controller / Service / Repository / Routes / Model. Used for all mobile endpoints + new features.

**When to use which:** Add new endpoints under a module if you can. If extending an existing endpoint that lives in `server.ts`, edit it in place — don't gratuitously refactor.

### 4.2 Module structure

A module under `backend/src/modules/<domain>/` looks like:

```
doctors/
├── doctor.controller.ts   ← HTTP layer (req/res handling, status codes)
├── doctor.service.ts      ← Business logic, error classes (NotADoctorError…)
├── doctor.repository.ts   ← All Prisma queries live here
├── doctor.routes.ts       ← Express Router with auth middleware applied
└── doctor.model.ts        ← TypeScript DTOs returned to clients
```

**Layering rule:** controllers can call services; services can call repositories and other services; repositories only call Prisma. Never bypass a layer.

### 4.3 Adding a new endpoint to an existing module

Example: add `GET /api/mobile/v1/doctors/me/team`.

1. **Repository** — add the Prisma query:

   ```ts
   // doctor.repository.ts
   export async function teamForDoctor(doctorId: string) {
     return prisma.user.findMany({
       where: { departmentIds: { hasSome: [/* …*/] } },
       select: { id: true, name: true, profile: true },
     });
   }
   ```

2. **Service** — orchestrate + shape DTO:

   ```ts
   // doctor.service.ts
   export async function getMyTeam(userId: string, tenantId: string) {
     const meta = await repo.findDoctorWithDepartments(userId, tenantId);
     if (!meta) throw new NotADoctorError();
     return repo.teamForDoctor(userId);
   }
   ```

3. **Controller** — HTTP plumbing:

   ```ts
   export async function getMyTeam(req: AuthedReq, res: Response) {
     try {
       const dto = await service.getMyTeam(req.user!.userId, req.user!.tenantId);
       res.json(dto);
     } catch (err: any) {
       if (err instanceof NotADoctorError) return res.status(403).json({ error: err.message });
       res.status(500).json({ error: 'Internal server error' });
     }
   }
   ```

4. **Route** — wire it:

   ```ts
   router.get('/me/team', controller.getMyTeam);
   ```

5. **RBAC** — register in `src/routes/index.ts`:

   ```ts
   'GET /api/mobile/v1/doctors/me/team': ['dashboard:view'],
   ```

   Without this entry the deny-by-default RBAC middleware will 403 the route.

6. **Validator** (if it accepts a body) — register in the same file under `ROUTE_VALIDATORS`.

### 4.4 RBAC — single source of truth

`backend/src/routes/index.ts` owns three maps:

- `PUBLIC_ROUTES` — routes that bypass auth + RBAC entirely (login, health, webhooks).
- `ROUTE_PERMISSIONS` — `'METHOD /path': ['perm:1', 'perm:2']`. The route is allowed if the user holds **any** of the listed permissions.
- `ROUTE_VALIDATORS` — `'METHOD /path': zodSchema`. Body is parsed against this schema before reaching the handler.

The middleware `enforceRoutePermissions` and `enforceRouteValidators` (wired in `server.ts`) apply these maps automatically. **Adding a new route requires adding it to one of these maps.** A route-coverage test asserts there are no orphans.

Permissions follow `<resource>:<action>` convention — e.g. `patients:view`, `lab:create`, `system:manage`. Defined in `src/rbac.ts` and assigned to roles via the seeded `User.roleIds`.

### 4.5 Authentication flow

```
┌────────┐  POST /api/auth/login        ┌─────────┐
│ Client │ ───────────────────────────▶ │ Backend │
│        │ ◀─────────────────────────── │         │
│        │  { token, refreshToken }     └─────────┘
│        │  + httpOnly refresh cookie
└────────┘

Subsequent requests carry: Authorization: Bearer <access>

If access expired:
  Client → POST /api/auth/refresh (with refresh cookie)
  Backend issues new access token → client retries original

Logout:
  Client → POST /api/auth/logout
  Backend hashes the refresh token, writes to TokenBlacklist,
    clears the cookie. Cleanup job purges expired entries.
```

- Access token TTL: 15 minutes
- Refresh token TTL: 30 days, rotates on every refresh
- Failed-login lockout: 5 attempts → 15-minute lock (`User.failedLoginAttempts`, `User.lockedUntil`)
- Self-service password change: `POST /api/auth/change-password` (verifies current password)
- Forgot password: `POST /api/auth/forgot-password` (email link with JWT, 30-min TTL)

### 4.6 Database & Prisma

The schema (`backend/prisma/schema.prisma`) has 71 models. Highlights:

| Domain | Key models |
|---|---|
| Tenancy | `Tenant`, `Branch`, `Department`, `Module`, `BranchModule` |
| Identity | `User`, `TokenBlacklist` |
| Patient | `Patient`, `PatientInsurance`, `Encounter`, `Admission`, `Bed`, `Ward` |
| Clinical | `OPDNote`, `IPDNote`, `Prescription`, `Order`, `Result` |
| Lab | `LabTestMaster`, **`LabTestParameter`** (per-analyte ranges), `RadiologyTestMaster` |
| Surgery | `OTTheatre`, `Surgery`, `SurgeryStage`, `SurgeryFamilyContact` |
| Billing | `Invoice`, `Payment`, `PaymentTransaction` (Razorpay), `Commission`, `JournalEntry` |
| Revenue sharing | `DoctorContract`, `DoctorRevenue`, `DoctorPayout` |
| Operations | `BloodDonor`, `BloodInventory`, `BloodRequest`, `Drug`, `PharmacyTxn`, `AmbulanceTrip`, `DietOrder`, `Asset` |
| Audit | `AuditLog` |
| HR | `AttendanceLog`, `LeaveRequest`, `BiometricDevice` |

Tenant isolation: most operational tables have a direct `tenantId` column (added in migration `20260502010000_tenant_isolation_phase2`). Always filter queries by `tenantId` from `req.user.tenantId`.

### 4.7 Migrations

Migrations live in `backend/prisma/migrations/<timestamp>_<name>/migration.sql`.

**Workflow:**

1. Edit `schema.prisma`
2. Create migration directory: `backend/prisma/migrations/YYYYMMDDHHMMSS_short_name/`
3. Write `migration.sql` by hand (we don't use `prisma migrate dev` because the live DB has had drift)
4. Run `npx prisma generate` to refresh the generated client
5. Test locally with `npx prisma migrate deploy`
6. Commit the migration directory + schema changes together
7. After merge, run `npx prisma migrate deploy` against production

**Safety rules:**

- Use `IF NOT EXISTS` / `IF EXISTS` for idempotency
- Wrap risky changes in transactions
- Backfill data before dropping columns
- Never delete a migration file once committed — write a forward migration instead

### 4.8 Audit logging

`auditLogger.securityEvent(...)` for high-signal events (failed login, password change, role change). `writeAudit({ prisma, req, … })` for resource changes (CREATE / UPDATE / DELETE on Patient, Invoice, etc.).

All audit rows go into `AuditLog` table with `tenantId`, `userId`, `action`, `resource`, `resourceId`, `oldValue`, `newValue`, `ipAddress`, `timestamp`. Surfaced in System Control → Audit Logs.

---

## 5. Frontend deep-dive

### 5.1 Routing

`frontend/src/App.tsx` defines the route tree. Three regions:

- `/` → public marketing website (lazy-loaded `WebsiteLayout`)
- `/login`, `/forgot-password`, `/reset-password` → public auth pages
- `/track/:token` → public surgery tracker (token is the auth)
- `/app/*` → authenticated portal, wrapped in `<ProtectedRoute>` + `<MainLayout>`

Inside `/app`, the `index` route renders `<PortalLanding>` which checks the user's role:

- Doctor roles (DOCTOR / CONSULTANT / SURGEON) → `<DoctorDashboard>`
- Everyone else → `<NewDashboard>` (generic 34-tile dashboard)

### 5.2 Auth context

`AuthContext` (in `src/contexts/AuthContext.tsx`) exposes:

```ts
const { user, token, hasAccess, login, logout } = useAuth();
```

- `user.roleIds` is an array of role ids (e.g. `['DOCTOR']`).
- `hasAccess(routePath)` consults `src/config/permissions.ts` to decide if the current user's roles permit a given route. Used by `RoleProtectedRoute` and the sidebar to filter menu items.

### 5.3 Sidebar

`MainLayout.tsx` renders the sidebar from a static `menuGroups` array. Each item has `path`, `icon`, `label`. Items are filtered by `hasAccess()` before rendering. Doctor-only items (e.g. "My Earnings") are added conditionally based on `roleIds`.

### 5.4 API client

`src/services/api.ts` exports an axios instance with:

- Bearer-token interceptor (reads token from sessionStorage)
- 401 → refresh-once interceptor (calls `/api/auth/refresh`, retries original request)
- `withCredentials: true` so the httpOnly refresh cookie ships on cross-origin refresh calls

### 5.5 Component library

`src/components/ui/` is shadcn — Radix UI primitives styled with Tailwind. Available: `Card`, `Button`, `Input`, `Label`, `Select`, `Dialog`, `Table`, `Tabs`, `Badge`, `Avatar`, `DropdownMenu`, `Textarea`. Add new shadcn components with `npx shadcn-ui add <name>`.

**Radix Select gotcha:** `<SelectItem value="">` throws at render. Use a sentinel like `'all'` and translate in your handler. (See `SystemControl.tsx` audit-log filter for the correct pattern.)

### 5.6 Adding a new page

1. Create `src/pages/MyNewPage.tsx`
2. Add a lazy import in `App.tsx`:

   ```tsx
   const MyNewPage = lazy(() => import('./pages/MyNewPage'));
   ```

3. Add a route inside the `/app` Routes block:

   ```tsx
   <Route path="my-new-page" element={<RoleProtectedRoute path="my-new-page"><MyNewPage /></RoleProtectedRoute>} />
   ```

4. If the page should appear in the sidebar, add an entry to the appropriate `menuGroups` group in `MainLayout.tsx`.

5. Update `src/config/permissions.ts` to grant the relevant roles access to `my-new-page` (the route key is the lowercase URL segment).

---

## 6. Mobile apps

### 6.1 Two apps, one backend

```
mobile/
├── doctor/      ← Clinical companion (consultants, surgeons)
└── patient/     ← Self-service (outpatients, families)
```

Each is a standalone Expo project (own `package.json`, own `app.json`, own EAS profile). They share API conventions but are **not** packaged together — keep them independent so the patient app can ship faster than the doctor app and vice versa.

### 6.2 expo-router structure

Every app uses file-based routing under `app/`:

| File | Route |
|---|---|
| `app/_layout.tsx` | Root stack — wraps in SafeAreaProvider, hydrates auth |
| `app/login.tsx` | `/login` |
| `app/(tabs)/_layout.tsx` | Tab bar shell for the authenticated zone |
| `app/(tabs)/index.tsx` | `/(tabs)` — tab #1 |
| `app/patient/[id].tsx` | `/patient/:id` — dynamic route |
| `app/finance.tsx` | `/finance` — pushed from profile tab |

Stack vs tabs: tabs are the primary nav inside the authenticated zone; stack screens (finance, settings, etc.) are pushed from a tab.

### 6.3 Auth state (zustand)

```ts
// mobile/<app>/lib/auth.ts
const { user, login, logout, hydrate, unlockBiometric } = useAuth();
```

- Tokens live in `expo-secure-store` (Keychain on iOS, EncryptedSharedPreferences on Android)
- Refresh logic mirrors the web portal — same axios interceptor pattern
- Biometric unlock checks `LocalAuthentication.hasHardwareAsync()` and a stored token; verifies the device owner before promoting to "logged in"

### 6.4 Adding a new mobile screen

Same as web minus router config:

1. Create `app/<screen-name>.tsx`
2. Push to it from elsewhere: `router.push('/<screen-name>')`
3. If it lives inside a tab, place it under `app/(tabs)/<screen-name>.tsx` and add a `<Tabs.Screen>` entry in `(tabs)/_layout.tsx`

### 6.5 Backend contract for mobile

Mobile-only endpoints under `/api/mobile/v1/*`. Shared endpoints under `/api/*`. Mobile namespace gets:

- `auth/login`, `auth/request-otp`, `auth/verify-otp`
- `patients/me`, `patients/me` PATCH, `patients/:id/chart`
- `appointments/me`, `appointments/today`, `appointments/doctors`, `appointments/slots`, `appointments` POST, `appointments/:id/cancel`
- `reports/me`, `reports/:category/:id`
- `orders/by-patient/:patientId`, `orders/:id`, `orders/:id/result`
- `doctors/me/dashboard`, `doctors/me/finance`

---

## 7. APIs & Swagger

### 7.1 Swagger UI

Once the backend is running:

| URL | What |
|---|---|
| `/api/docs` | Interactive Swagger UI |
| `/api/docs.json` | Raw OpenAPI 3.0 JSON |

Both are publicly accessible (in `PUBLIC_ROUTES`). The spec is generated from JSDoc comments via `swagger-jsdoc`. To document a new endpoint, add a JSDoc block above the handler:

```ts
/**
 * @swagger
 * /api/my-resource:
 *   get:
 *     tags: [Resource]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */
app.get('/api/my-resource', authenticateToken, async (req, res) => { … });
```

### 7.2 Route catalogue

There are **289 RBAC-registered routes** plus the public ones. Logical groupings:

| Domain | Approx route count |
|---|---|
| Patients, Encounters, Admissions | 25 |
| Appointments | 8 |
| OPD, IPD, Emergency, ICU | 30 |
| Lab orders + results + tests + parameters | 18 |
| Radiology orders + results + tests | 12 |
| Pharmacy + drugs + transactions | 14 |
| Billing + invoices + payments + Razorpay | 22 |
| Surgery + OT + stages + family contacts | 18 |
| Blood bank | 12 |
| HR + attendance + biometric + leaves + payroll | 25 |
| Inventory + assets + stores | 18 |
| Diet, ambulance, housekeeping, CSSD, mortuary, etc. | 25 |
| Insurance / TPA / pre-authorization | 8 |
| Master data (drugs, lab tests, procedures, packages, wards) | 14 |
| Doctor revenue sharing | 5 |
| Audit, system control, reports | 8 |
| Mobile namespace | 22 |

**Authoritative source:** `backend/src/routes/index.ts`. Read it directly when in doubt — every callable route is there.

---

## 8. Common tasks (cookbook)

### 8.1 Add a new role

1. `frontend/src/config/permissions.ts`: add the role to the `Role` union and a permissions list.
2. Backend `src/rbac.ts`: add the same role with its permission list.
3. Backend seed (`scripts/seed.ts` if present): create a sample user with the new role.
4. Sidebar visibility (`MainLayout.tsx`): adjust if the new role gets a special tile.

### 8.2 Add a new permission

1. Backend `src/rbac.ts`: extend `Permission` type, add to relevant role(s).
2. `backend/src/routes/index.ts`: reference the permission on routes that should require it.
3. Frontend `src/config/permissions.ts`: mirror the role→permission mapping.

### 8.3 Add a new database column

1. Edit `schema.prisma` — add the column.
2. Create a migration directory and `migration.sql` with `ALTER TABLE … ADD COLUMN IF NOT EXISTS …`.
3. Run `npx prisma generate` (backend dir).
4. Update repository/service to read/write the new column.
5. Update DTO + frontend interface to surface it.

### 8.4 Add a new mobile screen reachable from a tab

1. Create `mobile/<app>/app/<screen>.tsx` (or under a tab folder for nested route).
2. Push to it from a tab: `router.push('/<screen>')`.
3. If it should show in the tab bar, register in `app/(tabs)/_layout.tsx`.
4. If it needs new backend data, add an API helper in `lib/api.ts`.

### 8.5 Wire a new RBAC-aware route

1. Define the handler in `server.ts` or in a module.
2. Register in `ROUTE_PERMISSIONS` in `routes/index.ts`.
3. If it accepts a body, register a Zod schema in `ROUTE_VALIDATORS`.
4. Add a JSDoc `@swagger` block.
5. Verify by hitting the endpoint with a token from a user who has + lacks the permission.

### 8.6 Run a one-off data fix

1. Write a script under `scripts/<descriptive-name>.ts`.
2. Connect via `prisma` from `src/shared/prisma.ts`.
3. Run with `npx tsx scripts/<file>.ts`.
4. Commit the script (don't delete) — it's the audit trail of what ran in production.

---

## 9. Local development

### 9.1 Prerequisites

- Node 20 (use `nvm` or `volta`)
- Docker (for local Postgres) **or** a Neon / Supabase free-tier DB
- pnpm or npm

### 9.2 Start the backend

```bash
cd backend
cp .env.example .env       # then edit DATABASE_URL, JWT_ACCESS_TOKEN_SECRET, etc.
docker compose up -d       # starts Postgres on :5432 (root docker-compose.yml)
npm install
npx prisma migrate deploy  # apply all migrations
npx prisma generate
npm run dev                # nodemon → http://localhost:4000
```

### 9.3 Start the web portal

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:4000" > .env.local
npm run dev                # http://localhost:5173
```

### 9.4 Start a mobile app

```bash
cd mobile/patient          # or mobile/doctor
npm install
echo "EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:4000" > .env
npx expo start             # scan QR with Expo Go
```

### 9.5 Seed users

The backend seed creates these test accounts (password `password123`):

| Username | Roles | Use for |
|---|---|---|
| `admin` | ADMIN | Full access |
| `doctor1` | DOCTOR | Doctor mobile app + portal |
| `nurse1` | NURSE | Patient care testing |
| `lab1` | LAB_TECH | Lab order/result flow |
| `front1` | FRONT_OFFICE | Registration |
| `billing1` | BILLING | Billing testing |

A patient seed user lands once `auth.service.findLinkedPatient` is verified end-to-end.

---

## 10. Testing

### 10.1 Backend

- **Unit tests:** Jest. Run: `npm test` (in `backend/`).
- **Integration tests:** Hit the running server with supertest.
- **Route coverage test:** asserts every route registered in `routes/index.ts` has a corresponding `app.METHOD()` handler — catches drift.
- **Load testing:** `loadtest/` has k6 scripts for critical paths (login, patient search, appointment booking).

### 10.2 Frontend

- **Vitest:** run `npm test` in `frontend/`.
- **TypeScript:** `npx tsc -p tsconfig.json --noEmit` is the contract — must pass before merging.

### 10.3 Mobile

- **TypeScript:** same `tsc --noEmit` check.
- Manual testing via Expo Go is the primary loop today. EAS preview builds for stakeholder review.

---

## 11. Deployment

### 11.1 Backend (Vercel)

- Connected to GitHub `main` branch — auto-deploys on push.
- Environment variables set in Vercel dashboard (DATABASE_URL, JWT secrets, Razorpay keys, SMS provider keys).
- Health endpoint: `/api/health` and `/api/ready`.

### 11.2 Web portal (Vercel)

- Separate Vercel project, same repo.
- `VITE_API_URL` must point at the backend URL.

### 11.3 Database migrations

After deploy, run:

```bash
DATABASE_URL=<prod-url> npx prisma migrate deploy
```

This is currently manual. Future improvement: wire into a Vercel post-deploy hook.

### 11.4 Mobile apps (EAS)

```bash
cd mobile/patient
eas build --profile production --platform ios
eas submit --profile production --platform ios
```

App Store / Play Store listings live in EAS dashboard.

---

## 12. Conventions

- **Tabs vs spaces:** 2-space indent.
- **Quotes:** single in TS/JS; double in JSON/HTML.
- **Imports:** absolute via `@/*` alias in web + mobile (`tsconfig.json` `paths`); relative in backend.
- **Naming:** camelCase for variables, PascalCase for components, kebab-case for files in mobile (matches expo-router).
- **Comments:** lead with **why**, not what. Don't restate code. Avoid TODOs in committed code — file a ticket instead.
- **Commits:** `<type>(<scope>): <subject>` (feat, fix, docs, refactor). Bodies wrap at 72.
- **PRs:** open against `main`. CI runs lint + typecheck + tests. Use the suggested commit-message format from the merge UI.

---

## 13. Troubleshooting

| Symptom | First thing to check |
|---|---|
| 401 on every call from frontend | `VITE_API_URL` set correctly; token exists in sessionStorage |
| 403 on a new endpoint | Forgot to add it to `ROUTE_PERMISSIONS` |
| Body validation failing silently | Schema in `ROUTE_VALIDATORS` doesn't match payload |
| Prisma "Unknown field" | Schema not regenerated after edit — run `npx prisma generate` |
| Prisma migration drift | Live DB has columns the schema doesn't — see comment patterns in `backend/src/modules/reports/report.repository.ts` |
| Mobile `Authorization` header undefined | Token cleared from SecureStore — log out + back in |
| Radix Select crashes | Likely `<SelectItem value="">` somewhere — use a sentinel |
| Sidebar item doesn't appear | Check `hasAccess(<route>)` and `permissions.ts` for the role |
| Audit Log tab blank | See commit `3065eda` — empty SelectItem fix |
| Vercel deploy fails on tsc | Strict mode error — run `tsc --noEmit` locally; fix |

---

## 14. Where to ask

- **Bugs / feature requests:** GitHub issues on this repo.
- **Architecture questions:** the `#hospital-eng` Slack channel.
- **Database / migration help:** ping the platform owner (currently @sudipto).
- **Production incidents:** PagerDuty escalation policy, then `escalation@hospitalpro.io`.
