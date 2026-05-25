# Hospital ERP

Multi-tenant hospital management system covering OPD, IPD, pharmacy, lab, radiology, billing, HR, accounting and a clinical AI copilot. Deployed on Vercel (backend + frontend) against Neon Postgres.

## Stack

- **Backend** — Express + Prisma + TypeScript (`backend/`), serverless on Vercel
- **Frontend** — Vite + React + Radix UI + Tailwind (`frontend/`)
- **Mobile** — Expo (React Native) doctor and patient apps (`mobile/doctor`, `mobile/patient`)
- **DB** — PostgreSQL via Prisma; Neon in production
- **Cache / rate-limit** — Redis (optional; in-memory fallback for local)

## Layout

```
backend/    Express API, Prisma schema, tests
frontend/   Vite SPA — operator workstation UI
mobile/     Expo apps (doctor, patient)
docs/       SOW, developer guide, user manual, runbooks, source requirements
scripts/    Local utilities (create-admin, smoke check, doc/diagram generators)
loadtest/   k6 smoke scenarios
nginx/      Reverse-proxy config for self-hosted Docker deployments
```

## Local development

```sh
# Postgres + redis
docker-compose up -d db redis

# Backend
cd backend && npm install && npm run prisma:migrate:deploy && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

Then `./start.sh` from the repo root handles the orchestration for both.

Default login: `admin` / `password123` (seeded). Change before any non-local use.

## Documentation

- [`docs/CLIENT_SOW.md`](docs/CLIENT_SOW.md) — scope of work
- [`docs/sow/DEVELOPER_GUIDE.md`](docs/sow/DEVELOPER_GUIDE.md) — developer setup + architecture
- [`docs/User-Manual.md`](docs/User-Manual.md) — operator manual
- [`docs/RUNBOOK.md`](docs/RUNBOOK.md) — on-call runbook
- [`docs/source/`](docs/source/) — original client requirement documents

## Deployment

Vercel-only for backend + frontend. See [`backend/vercel.json`](backend/vercel.json) and [`frontend/vercel.json`](frontend/vercel.json). Neon hosts Postgres; Redis and S3/R2 are budgeted for May 2026.
