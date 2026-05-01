# Hospital ERP — Plan of Action (Production Readiness)

**Status snapshot:** ~55–60% production-ready as of 2026-05-01. Working demo on Vercel. Not safe to put live patient data on without the P0 fixes below.

> **Source of truth.** Every item has a status flag (`[ ]` open / `[x]` done / `[~]` in progress). Update this file as items land.

---

## Legend

| Severity | Meaning | Must-fix-by |
|---|---|---|
| 🔴 P0 — BLOCKER | Live patient data is unsafe without it | before live launch |
| 🟠 P1 — HIGH | User-visible launch / customer demo with PHI | within 2 weeks of launch |
| 🟡 P2 — MEDIUM | Operational / performance / quality | within 1 month of launch |
| 🟢 P3 — LOW | Polish, nice-to-have | when convenient |

---

## 🔴 P0 — BLOCKERS

### 1. [~] Tenant isolation enforced at runtime
**Progress 2026-05-01:**
- Added `backend/src/utils/tenantScope.ts` with `tenantWhere`, `branchTenantWhere`, `patientTenantWhere`, `tenantData`, `and` helpers.
- Audited the hot endpoints. Results:
  - ✅ Already scoped: `GET/POST /api/patients`, `GET /api/users` (both copies), `GET/POST /api/appointments`, `GET /api/encounters` (via branchId), `POST /api/encounters`
  - ✅ **Newly scoped (session 1):** `GET /api/admissions` (was leaking everything across tenants), `GET /api/invoices` (same)
  - ✅ **Newly scoped (session 2):** `GET /api/opd-notes/:encounterId`, `GET /api/lab-orders`, `GET /api/radiology-orders`, `GET /api/pharmacy/pending-prescriptions`, `GET /api/emergency/cases`, `GET /api/surgeries`
  - ✅ All 8 asset endpoints scope by tenantId and verify ownership
- **Remaining (still leaks):** ICUBed/ICUVitals (no patient relation column — schema migration needed), BloodDonor/BloodInventory/BloodRequest (some have patientId, some don't), HR/Payroll/Inventory/PO (no tenant relation), AmbulanceTrip, HousekeepingTask, DietOrder, Incident/Feedback, Drug/LabTestMaster/RadiologyTestMaster (master data — likely OK to share or needs explicit per-tenant override).
- **Plan to finish:** add `tenantId` directly to ICU/Surgery/EmergencyCase/BloodRequest/Incident/Feedback in a single migration — much cleaner than chasing parent relations everywhere. ~3 h work.
**Where:** `backend/src/server.ts` — most `prisma.X.findMany`/`findUnique` calls don't include `tenantId`/`branchId` filters.
**Risk:** Any authenticated user can read another tenant's PHI. HIPAA / NABH violation. Catastrophic.

**Schema reality (matters for the fix):** Only 10 of 67 models carry `tenantId` directly:
`AccountGroup`, `AccountHead`, `Appointment`, `Branch`, `FiscalYear`,
`JournalEntry`, `LedgerEntry`, `Patient`, `ReferralSource`, `User`.

The rest inherit tenancy transitively (e.g. `Encounter.patientId → Patient.tenantId`,
`Invoice.patientId → Patient.tenantId`). Many also carry `branchId` directly.

**Fix:**
- Add a `tenantScope(req)` helper that returns `{ tenantId, branchId }` from `req.user`.
- For top-level tenant-scoped models: add `where: tenantScope(req)` to every list/find query.
- For child models (Encounter, Invoice, Admission, etc.): scope via the parent —
  e.g. `where: { patient: { tenantId: req.user.tenantId } }`.
- Long-term: add `tenantId` directly to Encounter/Invoice/etc. via Prisma migration so
  scoping is one column lookup, not a join.
**Effort:** 8–12 h.

### 2. [x] TypeScript build errors that risk runtime 500s
**Where:** `backend/src/controllers/auth.controller.ts`, `backend/src/controllers/user.controller.ts`, `backend/src/middleware/security.ts`.
**Risk:** SWC bundles them but they reference Prisma fields (`fullName`, `password`, `roles`, `refreshToken`) that don't exist on the schema — calling those code paths throws at runtime.
**Fix:**
- Confirm whether these controllers are imported anywhere; if dead, delete.
- If live, rewrite to match current schema (`name`, `passwordHash`, `roleIds`).
**Effort:** 4–6 h.

### 3. [x] Asset model is now tenant-scoped
**Where:** `backend/prisma/schema.prisma` + migration `20260501000000_assets_multi_tenant`.
**Done:** Added `tenantId` (NOT NULL) and `branchId` (nullable) to `assets` and `tenantId` to `maintenance_logs`. Replaced the global `assetCode` UNIQUE index with `(tenantId, assetCode)` UNIQUE so each tenant has its own AST00001. All 8 asset endpoints now scope by `req.user.tenantId` and verify ownership before update/delete/status-change/maintenance.
**Migration runs automatically on next backend Vercel deploy** (P0 #5 done) — backfills existing rows from the only existing tenant.

### 4. [ ] NeonDB connection pooling for serverless
**Where:** `DATABASE_URL` env var on Vercel backend.
**Risk:** Every cold start opens a fresh Postgres connection; under burst traffic NeonDB hits its connection limit and DB calls hang/timeout.
**Fix:** Replace with the **pooled** connection string from NeonDB (host ends in `-pooler.neon.tech`) and append `?pgbouncer=true&connection_limit=1&connect_timeout=15`.
**Effort:** 5 min.

### 5. [x] `prisma migrate deploy` runs on every backend deploy
**Where:** `backend/vercel.json` buildCommand.
**Risk:** Schema drift between code and live DB silently breaks queries.
**Fix:** buildCommand chains `prisma generate && prisma migrate deploy`. **Requires `DATABASE_URL` to be set at build time** (Vercel does this if env vars are configured for "Build" + "Production").
**Effort:** 10 min.

### 6. [ ] Rotate seeded admin password
**Where:** Live NeonDB.
**Risk:** `admin / password123` is documented in this repo and across Vercel projects. Trivially guessable.
**Fix:**
- Generate a strong password: `openssl rand -base64 24`.
- Update directly in DB or via a one-shot script:
  ```sql
  UPDATE users SET passwordHash = '<bcrypt-hash>' WHERE username = 'admin';
  ```
- Or temporarily expose `POST /api/users/:id/reset-password` to admin and call it.
**Effort:** 5 min.

### 7. [x] CORS robustness
**Where:** `backend/src/server.ts`.
**Risk:** Frontend deploys behind on misconfigured `CORS_ORIGIN` get cryptic errors.
**Fix:** Validate origin via callback; allow `*.vercel.app` previews when `VERCEL_ALLOW_PREVIEW=true`; log denied origins to Vercel logs for fast debug.
**Effort:** done.

---

## 🟠 P1 — HIGH

### 8. [ ] Automated DB backups
**Risk:** NeonDB free tier expires branches; no backups means data loss.
**Fix:** GitHub Action nightly `pg_dump → S3`, 30-day retention. Quarterly restore drill.
**Effort:** 2 h.

### 9. [x] Per-IP/path write rate limit
**Risk:** Currently only `/auth/login` is rate-limited. `POST /api/patients` etc. have no throttle — easy abuse vector.
**Fix:** Apply `generalRateLimiter` more aggressively to all POST/PUT/DELETE; introduce per-user limits via Redis/Upstash key.
**Effort:** 1 h.

### 10. [ ] Refresh token in httpOnly cookie
**Where:** `frontend/src/services/api.ts` — currently in localStorage.
**Risk:** Vulnerable to XSS exfiltration.
**Fix:** Backend sets a `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh` on login. Frontend stops touching `refreshToken`.
**Effort:** 3 h.

### 11. [ ] Frontend tests + E2E
**Where:** `frontend/`.
**Risk:** Zero coverage; any regression goes live silently.
**Fix:** Vitest + RTL for component contracts (RoleProtectedRoute, axios interceptor, AssetManagement form). Playwright for the patient → encounter → invoice happy path.
**Effort:** 8–16 h initial.

### 12. [x] Sentry wired up
**Done:** `@sentry/node` initialized at the top of `server.ts` (lazy-required so missing dep wouldn't crash boot). Request handler + tracing handler installed before middleware; error handler installed before our app's `errorHandler`. Health-probe noise filtered via `beforeSend`. **No-op when `SENTRY_DSN` env var isn't set.** To enable: add `SENTRY_DSN` (and optional `SENTRY_TRACES_SAMPLE_RATE`) on Vercel, redeploy.

### 13. [ ] Secret rotation plan + leak detection
**Fix:** Pre-commit hook with `git-secrets`; quarterly rotation of `JWT_SECRET`/`REFRESH_TOKEN_SECRET` (with rolling-window invalidation tolerance); document the runbook.
**Effort:** 2 h.

### 14. [x] Code-split the frontend bundle (1.7 MB → 461 KB)
**Where:** `frontend/`. Bundle is 1.7 MB single chunk.
**Fix:** Convert routes in `App.tsx` to `React.lazy`/`Suspense`; bundle vendors separately via `manualChunks`.
**Effort:** 4 h.

### 15. [ ] CSP without `unsafe-inline`
**Where:** Helmet config in `backend/src/middleware/security.ts`.
**Risk:** XSS surface.
**Fix:** Hash or nonce inline styles; strip `'unsafe-inline'` from `style-src`.
**Effort:** 2 h.

### 16. [x] Audit-log viewer UI shipped
**Where:** Frontend has no `/audit-log` page.
**Risk:** Compliance reviewers can't actually use the audit log.
**Fix:** Build a paginated, filterable viewer (already have `/api/audit-logs` endpoint) — date range, user, action, resource.
**Effort:** 4 h.

---

## 🟡 P2 — MEDIUM

### 17. [x] `/api/auth/me` endpoint
**Fix:** Returns the current user's profile + permissions; frontend uses it on hydrate instead of `/dashboard/stats`.
**Effort:** 30 min.

### 18. [x] Tighten `validateBody` fallback
**Where:** `backend/src/routes/index.ts` — `genericObjectSchema = z.record(z.any())`.
**Risk:** Any unregistered POST/PUT accepts arbitrary payloads.
**Fix:** Write a Zod schema per endpoint, then drop the fallback to a strict `z.never()` on unregistered routes (with clearer 400 message).
**Effort:** 2–3 h.

### 19. [x] Pagination on hot list endpoints
**Where:** `/api/patients`, `/api/encounters`, `/api/admissions`, `/api/invoices`, etc.
**Risk:** Returning all rows kills the page at 10k+ records.
**Fix:** Cursor or offset pagination with sensible default (`?limit=50&cursor=...`).
**Effort:** 3 h.

### 20. [ ] Pick one token storage strategy on frontend
**Where:** `frontend/src/services/api.ts`.
**Risk:** Confusion between sessionStorage and localStorage; minor XSS surface.
**Fix:** `httpOnly` cookie for refresh; in-memory only for access; remove `localStorage`/`sessionStorage` token writes.
**Effort:** 1 h (after #10).

### 21. [ ] Persist rate-limit state in Redis
**Where:** `express-rate-limit` default in-memory store.
**Risk:** Resets on every Vercel cold start — limits don't actually limit much.
**Fix:** Use `rate-limit-redis` against an Upstash Redis URL.
**Effort:** 2 h.

### 22. [x] Dependency scanning in CI (advisory mode)
**Risk:** 12 npm vulnerabilities outstanding, no fail-fast.
**Fix:** Add `npm audit --audit-level=high` step in GitHub Actions.
**Effort:** 1 h.

### 23. [ ] Staging environment
**Risk:** Every push to `main` is production.
**Fix:** Create Vercel staging projects (frontend + backend) tracking `develop`. Block direct pushes to `main` via GitHub branch protection.
**Effort:** 4 h.

### 24. [ ] Health-based alerting
**Fix:** Uptime monitor (Better Uptime / UptimeRobot) hits `/api/health` every 60s; pages on 3 consecutive failures.
**Effort:** 2 h.

### 25. [ ] Delete or repair dead controller code
**Where:** `backend/src/controllers/auth.controller.ts`, `user.controller.ts`.
**Note:** Same as P0 #2 if these are wired anywhere; demote to P2 if confirmed dead.
**Effort:** 2 h.

---

## 🟢 P3 — LOW

- [x] **26.** Frontend favicon added (`frontend/public/favicon.svg`, 64×64, blue cross).
- [x] **27.** Password reset flow (`/forgot-password`, `/reset-password`) wired end-to-end. 30-min token signed with `REFRESH_TOKEN_SECRET`. With no email gateway yet, the link is logged to backend stdout — operator hands it to the user. Replace with SMTP/SES once configured.
- [x] **28.** Inventory, AssetManagement, and PatientRegistration use the toast component instead of `alert()`.
- [x] **29.** Hide Swagger UI in production — Swagger only mounted when `NODE_ENV !== 'production'` or explicit opt-in via `EXPOSE_API_DOCS=true`.
- [ ] **30.** Accessibility pass: aria labels on icon buttons, keyboard navigation for sidebar, focus management in dialogs.
- [ ] **31.** Front Office "purpose" gets its own DB column (currently packed into `allergies` with a `Purpose:` prefix — see `frontend/src/pages/PatientRegistration.tsx`).

---

## Suggested rollout order

| Sprint | Items | Goal |
|---|---|---|
| **W1 (live-launch must-haves)** | 1, 4, 5 ✅, 6, 12 | Tenant isolation, pooled DB, migrations on deploy, password reset, observability |
| **W2 (sleep at night)** | 2 ✅, 3, 8, 9, 16 | TS cleanup, asset multi-tenant, backups, write rate limit, audit viewer |
| **W3 (next paying customer)** | 11, 14, 15, 10/20, 22, 23 | Tests, perf, CSP, cookie auth, dep scans, staging |
| **Backlog** | rest | Polish |

**Target:** 55% → 90% production-ready in 3 weeks of focused work (~80 engineering hours).

---

## How to update this file

When you start an item: change `[ ]` to `[~]`. When done: `[x]` and add a short note (commit SHA / date). Keep this file in sync with reality — drift here means drift everywhere.
