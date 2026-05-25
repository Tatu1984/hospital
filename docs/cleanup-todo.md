# Cleanup TODO — remaining audit items

This file lists audit items that were **not** addressed in the 2026-05-25
cleanup pass. They were deferred because each one needs its own focused
PR (split, refactor, or risky migration) and bundling them with file
moves would have produced an unreviewable diff.

## Backend structural

- [ ] **Split `backend/src/server.ts` (11,319 lines)** into `modules/`.
      Start order: billing, HR, pharmacy, lab, radiology. Each module
      should own its routes, validators, services. Expect ~5 PRs.
- [ ] **Split `backend/src/clinical-modules.ts` (5,587 lines)** into
      `modules/clinical/<topic>/`.
- [ ] **Move `backend/src/clinical-copilot.ts`** into
      `modules/clinical/copilot/` once `clinical-modules.ts` is split.
- [ ] **Move `backend/src/masterData.ts`** into `src/data/`.
- [ ] **Move `backend/src/hr-helpers.ts`** into `src/utils/hr.ts`.
- [ ] **Split `backend/src/rbac.ts` (1,134 lines)** into
      `rbac/{types,permissions,cache,helpers}.ts`.
- [ ] **Dedup env validation** — keep it in `backend/src/config/`,
      remove the duplicate validation in `server.ts`.
- [ ] **Consolidate duplicate API routes** — pick one of each pair,
      add a 301 from the loser:
      - `/api/bills` vs `/api/invoices`
      - `/api/employees` vs `/api/hr/employees`
      - `/api/attendance` vs `/api/hr/attendance`

## Frontend structural

- [ ] **Reorganize `frontend/src/pages/` (80+ files)** into
      `pages/{clinical,admin,finance,operations}/`. Update
      `App.tsx` lazy-import paths and any deep links.
- [ ] **Split `frontend/src/pages/PatientProfile.tsx` (2,786 lines)**
      into tab/section components.
- [ ] **Split `frontend/src/pages/ICU.tsx` (1,732 lines)**.
- [ ] **Split `frontend/src/pages/Inpatient.tsx` (1,219 lines)**.
- [ ] **Reshape `frontend/src/lib/`** —
      - `useIntegration.ts` → `hooks/`
      - `letterheadStore.ts` → `store/`
      - `wardCategories.ts`, `dialysisSlots.ts` → `constants/`

## Cross-cutting

- [ ] **Extract shared package** for `wardCategories` and
      `dialysisSlots` (currently duplicated in `backend/` and
      `frontend/`).
- [ ] **Extract `mobile/shared/`** — `mobile/doctor/package.json`
      and `mobile/patient/package.json` are nearly identical.

## Code quality

- [ ] **Add ESLint to backend and frontend** (`@typescript-eslint`).
- [ ] **Remove `eslint-disable no-explicit-any`** in `server.ts` —
      fix per module as `server.ts` is split.
- [ ] **Strip `console.log/warn/error`** in frontend (~150 calls).
      Either replace with the `Toast` component or add
      `esbuild.drop: ['console']` to `vite.config.ts` for production.
- [ ] **Align vitest versions** — backend is v4.x, frontend is v1.x.
      Bump frontend to v4.x (breaking, needs config updates).
- [ ] **Add `frontend/.env.example`** — currently undocumented for
      new contributors.

## CI / deployment

- [ ] **Backend CI runs tests twice** (`npm test` + `npm run
      test:coverage`). Drop the first run.
- [ ] **Remove `|| true` from `npm audit`** in CI once known
      advisories are addressed.
- [ ] **Docker image tags** — also tag with git SHA so rollback is
      possible. Less critical since deployment is Vercel-only;
      Docker is for self-hosted only.
- [ ] **No staging environment** — deploys go straight to prod.
      Consider Vercel preview deployments per PR.

## Performance

- [ ] **API client cache-buster** — `frontend/src/services/api.ts`
      adds `?_t=timestamp` to every request, defeating browser cache
      for GETs. Apply only to write requests.
- [ ] **Replace `limit=500` dropdowns** with search-as-you-type on
      pages that load full dropdowns at mount (search the frontend
      for `limit=500`).
- [ ] **Cache hot reads in Redis** — dashboard stats, drug catalog,
      ward list. Redis is already in the stack.

## Config notes (not bugs)

- **Rate limiting** uses in-memory fallback when `REDIS_URL` is
  unset. On Vercel that means counters reset on every cold start —
  set `REDIS_URL` in production (already documented in
  `backend/.env.example`).
- **`trust proxy: true`** in Express trusts every hop. On Vercel
  this is correct (Vercel is the only hop). For self-hosted setups
  behind a single nginx, change to `1`.
- **Two migrations with timestamp `20260506000000`** is not a bug.
  Prisma sorts by full folder name (`_lab_test_parameters` <
  `_user_profile` alphabetically), so they apply in deterministic
  order. Renaming would cause drift on deployed databases.
