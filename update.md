# Hospital Audit Blockers — Completion Notes

> All 8 blockers from the Codex-style production-readiness audit are
> resolved on `fix/audit-blockers`. This file replaces the previous
> resume-from-restart notes.

## Branch state

- **Branch:** `fix/audit-blockers` (off `main` at `3d3342f`)
- **Status:** 8 commits ahead of `main`. Local only — nothing has been
  pushed. Awaiting user OK on push / PR.
- **Tree:** clean.
- **Stashed pre-existing work:** `stash@{0}`
  `preexisting-security-hardening-and-my-rbac-fix-WIP-20260513-0813` —
  unrelated security hardening on `main` (JWT `algorithm: 'HS256'`
  pinning, HSTS / Referrer-Policy / Permissions-Policy headers, mobile
  `EXPO_PUBLIC_API_URL` fallback warning, refresh expiry 30d→7d). NOT
  part of the audit fixes. Restore with `git stash pop` on `main` after
  this branch is merged, or leave for later.

## Verification

- **Backend tests:** `cd backend && npm test` → 127 passed, 9 skipped,
  0 failed (was 106 before this session; +21 new tests for RBAC
  overrides, integration credential crypto, and SSRF guard).
- **TypeScript:**
  - `cd backend && npx tsc --noEmit` → clean.
  - `cd mobile/doctor && npm run tsc` → clean.
  - `cd mobile/patient && npm run tsc` → clean.
- **npm audit (prod deps):** `npm audit --omit=dev` reports
  `found 0 vulnerabilities` in all 5 packages (backend, frontend, root
  Next, mobile/doctor, mobile/patient).

## Commits, in branch order

| Commit  | Blocker | Title |
|---------|---------|-------|
| aa0e88b | #3 | `fix(rbac,tests): register missing ICU/master bed routes and align pagination test with 500 cap` |
| d55f3ce | #7 | `fix(docker): wire missing envs and resolve dangling volume mounts` |
| d14425d | #8 | `fix(mobile): unbreak tsc on both Expo apps` |
| 12d5916 | #2 | `fix(rbac): make per-user extra/revoked permissions actually apply` |
| 68485ea | #1 | `fix(tenancy): close cross-tenant reads/writes in cited endpoints` |
| a574a5d | #6 | `fix(integrations): encrypt credentials at rest + SSRF-guard the test endpoint` |
| 7653a19 | #5 | `fix(prescriptions): reconcile schema drift; drop raw-SQL workarounds` |
| 637058c | #4 | `fix(deps): clear npm audit across all 5 packages` |

## Per-blocker summary

### #3 RBAC + tests (aa0e88b)
- Three handlers in `server.ts` had no entry in `ROUTE_PERMISSIONS` and
  were 403'ing for everyone under the deny-by-default gate:
  - `GET  /api/icu/beds/:id/details` → `icu:view`
  - `POST /api/icu/beds/:id/reset`   → `icu:edit`
  - `GET  /api/master/beds`          → `master_data:view`
- `validators.test.ts` pagination test was asserting the old 100 cap;
  code intentionally raised it to 500. Replaced with two assertions
  matching the current contract (limit=200 valid, limit=600 rejected).

### #7 docker-compose (d55f3ce)
- Removed dead `./backend/prisma/init.sql` bind mount — Prisma
  migrations own schema init.
- Created `nginx/nginx.conf` (minimal reverse proxy: `/api/` →
  backend:4000, everything else → frontend:80) + `nginx/ssl/.gitkeep`
  so the `production` profile is a valid configuration.
- Added missing backend envs the code reads at boot:
  - `PHI_ENCRYPTION_KEY` (required, blocks prod boot if missing)
  - `REDIS_URL` (defaults to the bundled redis service)
  - `AUDIT_RETENTION_DAYS` (defaults 365)
  - `CRON_SECRET` (bearer for `/api/internal/audit-retention/run`)
- Added redis to backend `depends_on` with `service_healthy` condition.

### #8 mobile tsc (d14425d)
- Expo SDK 54's `tsconfig.base.json` uses `module: "preserve"` (added
  in TS 5.4) but both apps were pinned to typescript `~5.3.3`, so tsc
  rejected the base config (TS6046) and never reached app code.
- Upgraded `typescript` to `~5.9.0` in both apps (matches Expo SDK 54's
  recommended version).
- Overrode `compilerOptions.module` to `"esnext"` in each app's
  `tsconfig.json` so `tsc --noEmit` accepts both static and dynamic
  imports without changing what Metro emits at runtime.
- In each app's `lib/api.ts`, replaced the plain-object spread on
  `AxiosRequestHeaders` (TS2322) with `new AxiosHeaders(...)` + `.set()`.

### #2 RBAC overrides (12d5916)
- `User.extraPermissions` / `User.revokedPermissions` were first-class
  schema columns but ignored by the route-level RBAC gate. Three gaps:
  1. `rbac.ts:hasAnyPermission` / `hasAllPermissions` did not accept
     overrides → extended to take an optional overrides arg.
  2. `middleware/rbacMiddleware.ts:dynamicRBAC` + `checkPermission`
     built `{extras, revoked}` from `req.user` and pass them through.
  3. `server.ts:970` (refresh JWT) and
     `modules/auth/auth.service.ts:51` (mobile login JWT) both omitted
     overrides → now re-bake them on every issuance so admin
     revocations take effect within one refresh cycle, not stuck on
     the old token until logout.
- `AuthenticatedRequest` interface in `rbacMiddleware.ts` declares
  `extraPermissions` / `revokedPermissions`.
- 6 new tests pin the contract (extras grant, revoked veto,
  revoked-wins-over-extras, hasAnyPermission/hasAllPermissions variants,
  getUserPermissions union/diff).

### #1 Tenant isolation (68485ea)
- `orders/listForPatient` repository now requires `tenantId` and walks
  `patient.tenantId` in the where clause — the stale "controller
  validates before getting here" comment is now true at the SQL layer.
- `GET /api/patient-insurances`, `GET /api/tpa/pre-authorizations`,
  `GET /api/ipd-billing/:admissionId`, `POST /api/ipd-billing` all
  filter via `patient: { tenantId: req.user.tenantId }`. Admission
  lookups switched from `findUnique` to `findFirst` (the composite
  where can't use the @unique form).
- Sibling POSTs `/api/patient-insurances` and `/api/tpa/pre-authorizations`
  also fixed — they were defaulting to "first patient in the global
  table" when `patientId` was omitted, and trusted whatever `patientId`
  the client posted with no tenant check.
- Cross-tenant lookup returns 404 (identical to "no such record") so
  the endpoint isn't an oracle for IDs in other tenants.

### #6 Integration credentials + SSRF (a574a5d)
- `utils/integrationSecrets.ts`: AES-GCM envelope encryption keyed by
  the existing `PHI_ENCRYPTION_KEY` (one auditable encryption surface,
  not two). Envelope `{__enc: 'aes-256-gcm:v1', ct}` distinguishes
  ciphertext from legacy plaintext rows; legacy rows pass through
  unchanged on read and re-encrypt on the next write, so no one-shot
  migration script is required.
- `utils/ssrf.ts`: `assertSafeOutboundUrl`. http(s) only, no userinfo,
  rejects IPv4 loopback / RFC1918 / link-local / CGNAT and the
  equivalent IPv6 ranges (`::1`, `fe80::/10`, `fc00::/7`,
  IPv4-mapped). Handles both bracketed and canonical IPv6 hostnames,
  and both dotted-quad and 16-bit-hex IPv4-mapped forms (incl. canonical
  `::ffff:7f00:1`).
- `server.ts`:
  - `POST /api/admin/integrations` encrypts on create.
  - `PUT /api/admin/integrations/:id` decrypts existing → merges with
    partial update from admin → re-encrypts (admins don't need to
    re-enter every secret on each save).
  - `maskIntegrationCredentials` decrypts first, then masks key-by-key.
  - `POST /api/admin/integrations/:id/test` runs `assertSafeOutboundUrl`
    + `redirect: 'manual'` before the fetch. SSRF rejections audit-log
    as `SSRF_BLOCKED` and return 400.
  - `findActiveIntegration` decrypts on the way out so downstream
    SMS/email/payment services see plaintext.
- 15 new tests: 5 for the encryption helpers (roundtrip, random-IV
  uniqueness, legacy passthrough, envelope-spoof refusal, null safety)
  + 10 for SSRF (scheme allowlist, private literals incl. IPv4-mapped /
  CGNAT / ULA, URL hygiene).

### #5 Prescriptions schema drift (7653a19)
- The live `prescriptions` table carried six columns the Prisma model
  never reflected (`patientId, encounterId, status, notes, instructions,
  updatedAt`), forcing three workarounds: a runtime `information_schema`
  introspection in the demo-seed POST + raw `$queryRaw` in two
  repositories.
- `schema.prisma`: `Prescription` now models all the drifted columns
  with the right nullability, real FKs to `Patient` and `Encounter`,
  and an index on `(patientId, createdAt)` for the
  "recent N rx for patient X" query both repositories run.
- Migration `20260513000000_reconcile_prescriptions`: idempotent
  `ADD COLUMN IF NOT EXISTS`, backfill (`patientId`, `encounterId`
  from `opd_notes`; `updatedAt` from `createdAt`), then tighten
  `NOT NULL` on `patientId` + `updatedAt`. FKs and index are guarded
  with `DO` blocks / `IF NOT EXISTS` so re-runs on a partially-migrated
  DB are no-ops.
- `report.repository.ts:listPrescriptions` and
  `patient.repository.ts:chartFor`: `$queryRaw` + manual doctor join
  replaced by a single typed `prisma.prescription.findMany` with
  `doctor` included.
- `server.ts` demo-seed: ~50 lines of introspection + raw SQL collapse
  into a 9-line `prisma.prescription.create`. The
  `rxDiagnostic` / `__rxSkipReason` / `__rxAllCols` stash is gone.
- The `/api/opd-notes` POST also passes `patientId` + `encounterId`
  on its inline `prisma.prescription.create` (Prisma now requires them).

### #4 npm audit (637058c)
All 5 packages report `found 0 vulnerabilities` under `npm audit --omit=dev`.

- **backend** (4 high, 4 moderate → 0): non-breaking `npm audit fix`.
  Cleared `express-rate-limit` IPv4-mapped IPv6 bypass, `qs` DoS x2,
  `uuid` bounds, `lodash` prototype pollution, `minimatch` ReDoS x3,
  `path-to-regexp` ReDoS, `ip-address` XSS, `brace-expansion` hang.
- **frontend** (2 critical, 4 high, 2 moderate → 0): non-breaking
  `audit fix` cleared everything except the `jsPDF` HTML-injection
  advisory (critical). Bumped `jspdf` 3.0.4 → 4.2.1 +
  `jspdf-autotable` 5.0.7. `pdfGenerator.ts` already uses the
  functional autoTable form, so no source change was needed.
- **root Next** (1 high, 1 moderate → 0): bumped `next` 16.0.7 →
  `^16.2.6` (still within major) for the App Router segment-prefetch
  middleware bypass + i18n bypass + cache-poison advisories. The
  postcss <8.5.10 vuln inside next's nested `node_modules` is fixed
  via a root-level `overrides.postcss: ^8.5.10` — npm's own suggested
  fix would downgrade `next` to 9.x.
- **mobile/doctor** (4 moderate → 0) and **mobile/patient**
  (4 moderate → 0): same postcss-inside-Expo story. Added
  `overrides.postcss: ^8.5.10` to each app's `package.json`. The
  alternative npm offered was `expo@49.0.23` — a 5-major downgrade.

## Operational notes for the next session

- Decision to make: merge `fix/audit-blockers` → `main` directly, or
  open a PR for review first. User has not authorized a push yet.
- Migration `20260513000000_reconcile_prescriptions` will run on next
  Vercel deploy via the build step. It is idempotent and won't fail on
  partially-migrated DBs.
- The stashed pre-existing security hardening (`stash@{0}`) is still
  parked. Decide separately with the user whether to land it.
- `nginx/ssl/.gitkeep` is a placeholder; real cert + key still need to
  be supplied at deploy time for the `production` compose profile.
