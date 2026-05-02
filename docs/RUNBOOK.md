# On-Call Runbook

One section per alert. When something fires at 2 AM, this is what you
read first.

**General rule:** before doing anything, check `/api/health/detailed`,
`/api/metrics`, and the Sentry dashboard. Most alerts have a 30-second
diagnosis if you know where to look.

**Quick links:**
- Backend health: `https://<backend>.vercel.app/api/health`
- Latency snapshot: `https://<backend>.vercel.app/api/metrics` (auth required)
- [Sentry](https://sentry.io)
- [Neon console](https://console.neon.tech)
- [Vercel project](https://vercel.com)
- [Restore runbook](./RESTORE.md)

---

## Alert: Backend health check failing (503/timeout)

**Symptom**: Better Stack pinged `/api/health` and got a non-200 or no
response within 30s. Real users are seeing the SPA load but every API
call hang or 503.

**First 60 seconds:**
1. Reload `/api/health` in your browser. If it 200s, this was a transient
   cold start — note the time, no further action unless it repeats.
2. If still failing, open the Vercel project → Logs. Look for the most
   recent invocation. Common patterns:
   - `Function exceeded max duration` → DB query timed out; jump to "DB
     connection pool exhausted" below.
   - `Cannot connect to database` → Neon down or connection limit hit;
     check Neon status page.
   - Crash on boot (`PHI_ENCRYPTION_KEY required` or similar) → an env
     var was changed in the Vercel UI but not propagated to the latest
     deployment. Redeploy.

**Common causes (ranked):**
1. Neon hit the connection limit — switch to the pooler URL if not
   already (`-pooler.neon.tech` host + `?pgbouncer=true&connection_limit=1`).
2. A bad env var change. Roll back via Vercel → Deployments → ... →
   Promote previous deployment.
3. Code regression in the last deploy — same fix.
4. Genuine Neon outage. Check status.neon.tech. **No mitigation
   short-term**; flip to a Path-2 restore if it lasts > 30 minutes.

**Rollback**: Vercel → Deployments → find last green one → Promote.

---

## Alert: 5xx error rate > 0.5% (5-min window)

**Symptom**: Sentry is firing on a flood of new errors, or access-log
analysis shows a spike of 500s.

**First 60 seconds:**
1. Open Sentry → Issues → sort by "Last Seen". Top issue is probably the
   one driving the rate.
2. Read the stack trace. Common buckets:
   - `Prisma error P2002` (unique violation): a rate of these usually
     means a duplicate-detection bug in a UI flow.
   - `Prisma error P2025` (record not found): often a tenant-scoping
     regression — the request is hitting a row that exists, but the
     tenant filter is rejecting it.
   - `JsonWebTokenError` / `TokenExpiredError`: client-side bug, not
     ours.
   - `ECONNRESET` to Postgres: see "DB connection pool" below.

**Mitigation:**
- If the top issue is in code from the latest deploy: roll back.
- If it's an env-driven bug: check Vercel env vars haven't drifted.
- If it's a client-side spam (one VU pounding a broken endpoint): tighten
  the rate limiter (`RATE_LIMIT_GENERAL_MAX`) and ban the IP.

---

## Alert: Read p95 > 500 ms (over 10-min window)

**Symptom**: `/api/metrics` shows the read percentile climbing.

**First 60 seconds:**
1. `GET /api/metrics` (system:manage permission) → which route is at the
   top of the list sorted by p95?
2. Open Neon → Monitoring → Slow queries. Cross-reference.

**Common causes:**
1. **Missing index**. Run `EXPLAIN ANALYZE` on the slow query. If it's a
   seq scan on a large table, add an index in the next migration.
2. **N+1 from a frontend page**. Look at the route. If it's
   `/api/admissions` or similar with `include`, the include set may have
   ballooned.
3. **Cold start cascading**. Vercel just rebuilt; first 30 seconds are
   slow. Watch — if it doesn't recover in 5 minutes, it's not just a
   cold start.

**Mitigation**: revert the offending PR, or ship a quick index migration.

---

## Alert: Write p95 > 1000 ms

Same drill as reads, plus:

**Likely culprit**: lock contention on `audit_logs` (every write inserts a
row). Check `pg_stat_activity` for blocked queries.

**Mitigation**:
- If the audit_logs table is huge and slow to insert into, run the
  retention job manually:
  `curl -X POST https://<backend>/api/internal/audit-retention/run -H "Authorization: Bearer ${CRON_SECRET}"`
- If retention has been failing silently, see "Audit retention failed"
  below.

---

## Alert: DB connection pool exhausted

**Symptom**: 503s, errors mention `Can't reach database server` or
`connection limit exceeded`, and Neon shows active connections at 100%
of the pool max.

**Cause**: every Vercel cold start opens a fresh Postgres connection.
Without the pooler URL, a sudden traffic spike opens dozens of
connections that NeonDB never closes fast enough.

**Mitigation:**
1. Check the `DATABASE_URL` in the backend Vercel env. The host MUST end
   in `-pooler.neon.tech`. The query string MUST include
   `?pgbouncer=true&connection_limit=1&connect_timeout=15`.
2. If it's already using the pooler URL, increase the Neon project's
   connection-pool size in the Neon console (free tier: 100 limit;
   paid: configurable).
3. As a temporary cap, set Vercel `Functions → Concurrency` to a lower
   number to throttle inbound load.

---

## Alert: Razorpay webhook signature failures > 0

**Symptom**: Winston warn log `razorpay webhook signature mismatch` is
firing. We're rejecting incoming webhooks.

**First 60 seconds:**
1. Compare `RAZORPAY_WEBHOOK_SECRET` in Vercel env vs. the value in the
   Razorpay dashboard → Webhooks → Edit. Mismatch is by far the most
   common cause.
2. If they match: try sending a test webhook from the Razorpay dashboard
   ("Test webhook" button) and tail Vercel logs.

**Common causes:**
1. The webhook secret was rotated in Razorpay but not in Vercel (or vice
   versa).
2. A proxy in front of Vercel (Cloudflare, etc.) is mutating the body
   before it hits us → `verify` callback in `express.json` captures the
   wrong bytes.
3. Replay attempt by an attacker (rare, but real). Check the source IP
   in the log line — Razorpay's IPs are documented in their docs.

**Note**: webhook failures don't lose money — the `/verify` endpoint is
the primary path. Webhooks are the backstop for closed-tab cases. But
sustained failures eventually mean we miss reconciliation events.

---

## Alert: Audit-log retention failed (cron didn't run, or returned non-200)

**Symptom**: Vercel cron dashboard shows the daily run failed, or the
`audit_logs` table is growing unbounded.

**First 60 seconds:**
1. Trigger manually:
   ```bash
   curl -X POST 'https://<backend>.vercel.app/api/internal/audit-retention/run' \
     -H "Authorization: Bearer ${CRON_SECRET}"
   ```
2. Inspect the JSON response. Common shapes:
   - `{ skipped: true, reason: "lock-held" }` → another cron tick is
     mid-run; wait 60s and retry.
   - `{ deleted: 0 }` → nothing to delete (table all within retention).
   - `503` → `CRON_SECRET` not set in Vercel env.

**Common causes:**
1. `CRON_SECRET` env var missing or rotated; Vercel cron auths via
   `Authorization: Bearer ${CRON_SECRET}` so a missing var = 401.
2. Vercel cron disabled at project level (check `vercel.json` `crons`
   block is present and the deploy succeeded).
3. Retention query timing out on a huge table — `AUDIT_RETENTION_BATCH`
   is too large. Lower it (e.g. 1000) and re-run.

---

## Alert: DB backup failed (DB Backup workflow red)

**Symptom**: GitHub Actions notification — last DB Backup run failed.

**First 60 seconds:**
1. Open the workflow run → which step failed?
2. Common cases:
   - `pg_dump: connection refused` → Neon was unreachable at run time.
     Trigger a manual run via Actions → DB Backup → Run workflow.
   - `pg_dump: server version mismatch` → we're on Postgres 15 but the
     workflow installs an older client. The workflow pins `postgresql-client-15`;
     if Neon upgrades to PG16, bump the workflow.

**Mitigation**: rerun the workflow manually. If it fails twice in a row,
fall back to Neon's PITR for the next 24 hours and file a higher-priority
fix.

---

## Alert: DB restore drill failed (weekly Monday workflow red)

**Symptom**: GitHub Actions — DB Restore Drill failed.

**This is one of the highest-priority alerts.** A backup we can't restore
is the same as no backup.

**First 60 seconds:**
1. Open the failed run. Which step failed?
   - "Find the backup artifact": there's no recent backup → DB Backup is
     also broken; address that first.
   - "Restore into the throwaway Postgres": dump is corrupt. **Do not
     wait — pick the previous day's artifact and rerun the drill
     manually to confirm yesterday's backup is restorable.**
   - "Sanity SQL": dump restored but a core table is empty or has orphan
     rows. The schema may have drifted in a way that breaks restore.
     Compare current schema vs. the dump's CREATE TABLE statements.

**Mitigation:**
- If today's backup is bad but yesterday's is good: file an issue, ship
  a fix to the backup pipeline, but don't panic — RPO is still ~24h.
- If multiple consecutive drills fail: switch to **Neon PITR as primary
  recovery path** while you debug.

---

## Alert: Sentry quota at 80% / 100%

**Symptom**: Sentry email — events approaching plan limit.

**First 60 seconds:**
1. Sentry → Stats → which project / which issue is dominating?
2. If a single issue accounts for >50%: that issue is firing in a tight
   loop. Open the issue → "Resolve" or set "Ignore until N events" to
   suppress noise while you fix.

**Common causes:**
1. A new bug in the latest deploy is throwing on every request.
2. Healthcheck/probe noise wasn't filtered (we filter `/api/health`,
   `/api/ready`, `/api/live`, `/api/metrics` in `beforeSend` — confirm
   the URL matches one of those).
3. Genuine traffic increase — bump the Sentry plan or sample rate
   (`SENTRY_TRACES_SAMPLE_RATE` is for traces, not errors; for errors
   the rate is fixed at 100% — fix the bug instead).

---

## Alert: Slow request log spam (>20 slow requests / minute)

**Symptom**: `slow request` warns in Winston firing many times per minute.

This isn't strictly an alert (Winston warns aren't paged), but if you see
it in the dashboard, treat it as a leading indicator for the read/write
p95 alerts.

Action: same as "Read p95 > 500 ms" above.

---

## Adding a new alert to this runbook

When something pages you and there isn't a section for it:

1. Resolve the incident first (rolling back is always allowed).
2. Before closing the ticket, write a new section here covering: symptom,
   first-60-seconds checks, common causes ranked, mitigation.
3. Open a PR with the new section. Don't merge until you've actually run
   one of the diagnostic queries you wrote — if it doesn't work in
   practice, the runbook is worse than nothing.

A useful test: would a teammate who's never seen this alert before
resolve it from the section you just wrote? If not, rewrite.
