# Database Restore Runbook

When to use this: production DB is corrupted, accidentally truncated, or
NeonDB itself is unavailable and you need to bring up a parallel instance
from yesterday's backup.

**TL;DR — pick one path:**

1. **NeonDB Point-in-Time Restore (PITR)** — preferred. Sub-minute RTO.
   Console-only.
2. **Restore from our daily pg_dump artifact** — fallback if Neon is down
   or the bug is older than the PITR window.

---

## Path 1 — NeonDB Point-in-Time Restore

NeonDB's branch feature lets us restore the entire database to any point in
the last 7 days (24 hours on free, 7 days on Launch+). This is the path you
should try **first** for any data-corruption incident.

1. Open the [Neon console](https://console.neon.tech) → the project for HMS.
2. Click **Branches** → **New branch**.
3. **Source**: select the production branch (usually `main`).
4. **Time**: pick the timestamp you want to restore to. Default is "now"; for
   a corruption incident, pick ~5 minutes before the bad write.
5. Name the branch `restore-YYYYMMDD-HHmm` so it's obvious in the list.
6. Click **Create branch**. Neon copies the data — takes 30-90 seconds for
   our DB size.
7. Copy the new branch's connection string from **Connection Details**.
8. **If you want to fully cut over** (vs. just inspect the data):
   - Update Vercel's `DATABASE_URL` env var on the backend project to point
     at the restored branch.
   - Redeploy the backend (Vercel → Deployments → ... → Redeploy).
   - Once you've confirmed the restored data is correct, you can promote
     the restored branch to be the new main (Neon UI: branch → Promote).

**Total time for an experienced operator: ~5 minutes.**

---

## Path 2 — Restore from pg_dump artifact

Use when Neon itself is unreachable, or the corruption is older than the
PITR window allows. This is what `db-restore-drill.yml` rehearses every
Monday — it does this exact procedure against a throwaway Postgres.

### 2a. Find the right backup

1. Repo → **Actions** tab → **DB Backup** workflow.
2. Find the last successful run before the incident timestamp.
3. Click into the run → **Artifacts** section at the bottom → download
   `hospital-backup-YYYYMMDD_HHMMSSZ`.
4. Unzip locally. You'll have `hospital_YYYYMMDD_HHMMSSZ.sql.gz`.

### 2b. Provision a target Postgres

Pick one:

- **Same Neon project, new branch** (recommended): Neon console → New
  branch → empty (no source). Note the connection string.
- **A separate Postgres anywhere** (Hetzner, Supabase, RDS): just point
  `psql` at it.

### 2c. Restore

```bash
# Replace TARGET_DB_URL with the empty Postgres you provisioned.
gunzip -c hospital_*.sql.gz \
  | psql --set ON_ERROR_STOP=on "$TARGET_DB_URL"
```

The dump is created with `--clean --if-exists`, so restoring on top of an
existing database also works — it drops every object first, then recreates.
**But: don't do that on production.** Always restore into a parallel
target, validate, and only then cut traffic over.

### 2d. Sanity-check

```bash
# All five of these should return non-zero counts on a healthy restore.
psql "$TARGET_DB_URL" -c 'SELECT count(*) FROM tenants;'
psql "$TARGET_DB_URL" -c 'SELECT count(*) FROM users;'
psql "$TARGET_DB_URL" -c 'SELECT count(*) FROM patients;'
psql "$TARGET_DB_URL" -c 'SELECT count(*) FROM audit_logs;'
psql "$TARGET_DB_URL" -c 'SELECT count(*) FROM invoices;'

# Tenant integrity — should return 0.
psql "$TARGET_DB_URL" -c '
  SELECT count(*) FROM patients p
  LEFT JOIN tenants t ON t.id = p."tenantId"
  WHERE t.id IS NULL;
'
```

### 2e. Cut traffic over

1. Update Vercel `DATABASE_URL` on the backend project → the restored DB.
2. Redeploy backend.
3. Invalidate any caches (Sentry release will refresh on next deploy
   automatically).
4. Watch `/api/health/detailed` and the latency histogram for 15 minutes.

---

## Recovery time objective (RTO) and recovery point objective (RPO)

| Path | RTO (time to restore) | RPO (data loss window) |
|---|---|---|
| Neon PITR | ~5 minutes | < 1 minute |
| pg_dump artifact | 30-60 minutes | up to 24 hours |

**Implication:** for any data corruption that happened in the last 7 days,
**always try Path 1 first.** The pg_dump path is for catastrophic Neon
unavailability.

---

## Incident comms checklist

When you start a restore:

1. Post in `#hms-incident` (or wherever the on-call channel is): "Starting
   DB restore — using Path X — ETA Y minutes."
2. Tell the client / hospital ops if patient-facing impact is possible.
3. Capture timestamps: incident detected, restore started, restore
   completed, traffic cut over. Drop them into the post-incident review.
4. After: file an incident in the issue tracker with what failed, what
   the restore restored to, and what would have caught it earlier.

---

## How we know this works

`db-restore-drill.yml` runs every Monday at 03:00 UTC. It downloads the most
recent `hospital-backup-*` artifact, restores it into a fresh Postgres in a
GitHub Actions service container, and runs row-count + tenant-integrity
sanity SQL. Any failure pages the on-call engineer.

If you've never seen the drill green-build pass, **try a manual run**
(Actions → DB Restore Drill → Run workflow) before you ever need to do
this for real. Five minutes of practice on a calm day is worth an hour of
debugging during an incident.
