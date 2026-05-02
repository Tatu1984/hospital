# Load testing

Tooling: **[k6](https://k6.io)** — single binary, scriptable in JavaScript,
no infrastructure required. Run from your laptop, a CI runner, or a small
EC2/Hetzner box close to the target region.

## Install

```bash
# macOS
brew install k6
# Linux (Debian/Ubuntu)
sudo apt-get install -y k6
# Windows
choco install k6
```

## Run a smoke load test

1. **Create a dedicated load-test user** in the production tenant. Don't
   reuse the admin password.

   ```sql
   -- Pick a strong password; this user is going to do thousands of logins.
   -- Hash it with bcrypt before inserting (we use rounds=10).
   INSERT INTO users (id, "tenantId", "branchId", username, email, name,
     "passwordHash", "roleIds", "departmentIds", "isActive")
   VALUES (gen_random_uuid(), 'tenant-1', 'branch-1', 'loadtest',
     'loadtest@hospital.local', 'Load Test User',
     '<bcrypt hash here>', ARRAY['ADMIN'], ARRAY[]::text[], true);
   ```

2. Set the env vars and run:

   ```bash
   export K6_BASE_URL='https://hospital-api-xxx.vercel.app'
   export K6_USERNAME='loadtest'
   export K6_PASSWORD='<the password you picked>'

   k6 run loadtest/k6-smoke.js
   ```

3. Watch the live console. The summary at the end prints p50/p90/p95/p99
   for `read_latency_ms` and `write_latency_ms`. The `thresholds` block in
   the script gates on:

   - `http_req_failed < 0.5%`
   - read p95 < 500 ms, p99 < 1000 ms
   - write p95 < 1000 ms, p99 < 2500 ms

   k6 exits non-zero if any threshold fails — wire it into CI as a
   release gate when you're ready.

## Adjust the load profile

Edit the `scenarios.smoke.stages` array in `k6-smoke.js`. Defaults:

```
1 → 5 VUs over 1 min
5 → 20 VUs over 2 min
hold 20 VUs for 2 min
ramp down over 1 min
```

For a soak test, replace with a single `{ duration: '30m', target: 50 }`
stage. For a stress test, ramp to 200 VUs and watch where the SLO breaks.

## Don't do this

- **Don't run against the live patient-facing prod URL during clinic
  hours** without telling the hospital first. Even read load competes for
  Postgres connections.
- **Don't reuse the `admin` user.** A load test that locks out admin while
  it runs will ruin a Friday afternoon.
- **Don't push past the Razorpay webhook**. The Razorpay test mode is
  rate-limited — if your load test triggers thousands of `/order` calls
  the keys can get throttled.

## Interpreting failure

| Symptom | Likely cause |
|---|---|
| `http_req_failed > 0.5%` early | Auth path broken or rate limiter too tight |
| `read p95 > 500ms` past 10 VUs | DB connection pool too small (Vercel serverless creates many) — switch to Neon pooler URL |
| `write p95` rising linearly | Lock contention — likely the audit-log INSERT on every write |
| 502/504 | Vercel function timeout — increase `maxDuration` in `vercel.json` or split the slow endpoint |
| Sudden 401 wave | JWT TTL expired during long soak — wire the test to refresh |

After every run, **also check Sentry** for new errors and `/api/metrics`
for which routes regressed. The k6 summary won't tell you _which_ endpoint
went slow — `/api/metrics` will.
