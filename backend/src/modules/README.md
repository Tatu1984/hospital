# `backend/src/modules/` — layered architecture for mobile + new APIs

This directory hosts the layered code structure used by all new mobile-facing
endpoints (and any new desktop endpoints we want to migrate over time). It is
**additive** to `backend/src/server.ts` — the existing fat-server file is
untouched and continues to serve every desktop portal route. New code lives
here.

## Layout

```
modules/
├── <domain>/
│   ├── <domain>.model.ts       — Zod schemas + TypeScript types
│   ├── <domain>.repository.ts  — Prisma queries (the only file that touches `prisma.*` directly)
│   ├── <domain>.service.ts     — business logic; calls the repository
│   ├── <domain>.controller.ts  — Express handlers; calls the service; never touches Prisma
│   └── <domain>.routes.ts      — wires the controller into Express; mounts middleware
└── index.ts                    — aggregates every module's router under one prefix
```

The router from `index.ts` is mounted in `server.ts` at `/api/mobile/v1` (see
`server.ts` near the auth section). To add a new mobile endpoint:

1. Create the four files in a new `modules/<thing>/` folder, mirroring an
   existing module (`patients/` is the canonical example).
2. Add `<thing>.routes.ts` to the router list in `modules/index.ts`.
3. Add the new route's RBAC entry to `routes/index.ts` (`ROUTE_PERMISSIONS`).

## Conventions

- **Repositories** are pure data access. They take a `tenantId` argument
  explicitly — no implicit context. Returns Prisma model rows or null.
- **Services** never see `req` / `res`. They take typed inputs, call
  repositories, apply business rules, and return DTOs.
- **Controllers** are thin: parse + validate input from `req`, call the
  service, map errors to HTTP status codes, send JSON. No queries, no rules.
- **Models** are the Zod input schemas + the TypeScript output DTOs the
  service returns. Keep server-only fields (`passwordHash`, internal IDs)
  out of the DTO so the controller can `res.json(dto)` directly.
- All four files are TypeScript. Don't switch to .js — the rest of the
  codebase is TS and we have type-checking gates in CI.

## Tenant isolation

Every repository call **must** scope by `tenantId`. The service is the layer
that knows which tenant the caller belongs to (it gets it from the auth'd
controller via the function argument). A future audit will grep for
`prisma.*` outside `modules/*/repository.ts` to enforce this.

## Why a separate folder instead of refactoring `server.ts`?

Refactoring all 7,000 lines of `server.ts` into modules would be a 2-3 week
project. Adding `modules/` next to it lets us ship the mobile apps without
freezing other work. Existing routes can migrate one by one when touched.
