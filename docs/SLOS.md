# Service Level Objectives (SLOs)

Targets that, when missed, signal "users are getting hurt" — vs. internal
metrics that just feed dashboards. Each one comes with an **alert** in
[RUNBOOK.md](./RUNBOOK.md).

The SLOs below are calibrated for a **single-hospital, ~50-200 active
users at a time** deployment. Re-tune once you have 30 days of real
traffic data.

---

## Availability

| Metric | Target | Window | Source |
|---|---|---|---|
| Backend API availability | **99.5%** (≈ 3.6h/month downtime budget) | 30-day rolling | Better Stack uptime checks against `/api/health` |
| Frontend availability | **99.9%** (≈ 43m/month) | 30-day rolling | Better Stack uptime checks against `/` |

Why 99.5 and not 99.9 for the API: Vercel cold starts + NeonDB serverless
wake-ups cost us a few seconds per cold path, which counts as downtime
under tight thresholds. 99.5 is honest; 99.9 forces dishonest exclusions.

**Error budget**: 0.5% of 30 days = ~3.6 hours. If we burn through 50% of
the budget in any 7-day window, a release freeze kicks in until error rate
recovers.

---

## Latency

| Endpoint class | p50 target | p95 target | p99 target | Source |
|---|---|---|---|---|
| **Reads** (GET) | < 150 ms | **< 500 ms** | < 1000 ms | `/api/metrics` snapshot |
| **Writes** (POST/PUT/DELETE) | < 300 ms | **< 1000 ms** | < 2500 ms | `/api/metrics` snapshot |
| **Auth** (login, refresh) | < 250 ms | < 600 ms | < 1500 ms | `/api/metrics` snapshot |
| **Razorpay verify** | < 400 ms | < 1500 ms | < 3000 ms | `/api/metrics` snapshot |

Notes on the targets:
- p95 is the SLO line; if you only watch p99 you ship 5% of users a slow
  experience and never see it.
- The latency histogram is in-memory and resets per pod. For an actual
  rolling 30-day SLO you eventually need a real time-series store. Until
  then, the `/api/metrics` snapshot is the recent-window proxy.

---

## Error rate

| Metric | Target | Source |
|---|---|---|
| HTTP 5xx rate | **< 0.5%** of all requests, 5-minute window | Sentry + access logs |
| HTTP 4xx rate (excluding 401/404) | < 5% (anything higher implies bad client validation) | access logs |
| Razorpay webhook signature failures | **0** in any 1-hour window | Winston warn log |
| Audit-log write failures | **< 0.1%** | Winston warn log |

---

## Database

| Metric | Target | Source |
|---|---|---|
| Connection pool wait time | p95 < 100 ms | Neon dashboard |
| Active connections | < 80% of pool max | Neon dashboard |
| Slow queries (> 1 s) | < 5 / hour | Postgres `pg_stat_statements` |

---

## Background jobs

| Job | Target | Source |
|---|---|---|
| Audit-log retention | succeeds daily; 0 misses in 7 days | Vercel cron logs + `/api/internal/audit-retention/run` response |
| DB backup | succeeds nightly; 0 misses in 7 days | DB Backup workflow status |
| DB restore drill | succeeds weekly | DB Restore Drill workflow status |

---

## What to do when an SLO is missed

See [RUNBOOK.md](./RUNBOOK.md). Each alert links to a section with:

1. What the alert means (the symptom users are seeing).
2. Diagnostic queries / dashboard links (the first 5 things to check).
3. Common causes ranked by likelihood.
4. Remediation steps.

If an alert isn't in the runbook, **add it before resolving the incident**.
A runbook entry takes 10 minutes to write fresh and saves an hour the next
time it fires at 2 AM.

---

## Review cadence

- **Weekly** (Mondays): glance at the burn-rate dashboard. If the error
  budget is more than 50% spent for the week, freeze risky deploys.
- **Monthly**: re-baseline SLOs against actual traffic. Tighten
  consistently-met targets, loosen unrealistic ones.
- **Quarterly**: full review with the hospital ops contact. Are these the
  metrics they care about? (Usually no — patients care about "can I
  register" and "did my bill load," not "p95 latency". Translate into
  user-facing language for that conversation.)
