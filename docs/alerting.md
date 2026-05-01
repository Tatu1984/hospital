# Health monitoring + alerting

The backend exposes three probes — `/api/health`, `/api/ready`, `/api/live`. Sentry catches exceptions. We need a third leg: external uptime monitoring that pages on-call when the API stops responding (which Sentry won't, by definition — if the function never starts, it can't report).

---

## Recommended stack (free tier covers our scale)

| Tool | Role | Free tier |
|---|---|---|
| **Better Stack Uptime** (formerly Better Uptime) | HTTP checks every 30s on production probes | 10 monitors, 3-min checks free; $24/mo for 30s |
| **Sentry** | Application errors / 500s | 5K events/mo |
| **Vercel built-in** | Cold-start failures, build failures | included |

Pick **one** uptime monitor — Better Stack, UptimeRobot, or Pingdom. Wiring is identical.

---

## Better Stack setup

1. https://betterstack.com/uptime → sign up (GitHub OAuth fastest).
2. **Monitors → Create monitor.** Repeat for each probe:

   | Name | URL | Expected status | Interval | Region |
   |---|---|---|---|---|
   | Backend health | `https://hospital-c3k5.vercel.app/api/health` | 200 | 30s (or 3m on free) | India + EU |
   | Backend readiness | `https://hospital-c3k5.vercel.app/api/ready` | 200 | 30s | India |
   | Backend live | `https://hospital-c3k5.vercel.app/api/live` | 200 | 30s | India |
   | Frontend (vnyb) | `https://hospital-vnyb.vercel.app/` | 200 | 60s | India |
   | Frontend (opal-two) | `https://hospital-opal-two.vercel.app/` | 200 | 60s | India |

3. **Confirm monitor body content** (optional but valuable — catches silent corruption):
   - For `/api/health`, set "Required keyword in response body" = `"status":"ok"`.
   - For `/api/ready`, = `"ready":true`.

4. **Escalation policy → Create.** Add yourself + co-on-call:
   - Tier 1 — email after 1 minute down.
   - Tier 2 — SMS / phone call after 3 minutes (paid feature; skip if free).

5. **Status page (free)** — generate one for your tenants:
   - Better Stack → Status pages → New → select all the monitors → branded URL.
   - Share `https://hospitalstatus.betterstack.com` with hospital admins.

---

## What to do on a real alert

1. Hit `/api/health` and `/api/ready` in your terminal.
   - Both 200 → false alarm; check the monitor's recent history.
   - 502 / function failed → Vercel Logs tab (the smoke-check script also catches this).
2. If the **build** is failing, every push that hour is rolled back. Open Vercel → backend → Deployments → click the failed one → Build Logs.
3. If it's a runtime crash, it'll be in Sentry. Click through the exception and the breadcrumb trail.
4. Post in #incidents channel: short timeline, what was tried, current state.

Recovery options, in order of preference:

1. **Vercel Promote**: previous deployment → ⋯ → "Promote to Production" (zero downtime, no rebuild).
2. **`git revert` and push** the offending commit.
3. **Rebuild last green deploy**: ⋯ → Redeploy.

---

## Synthetic E2E in CI (optional, later)

Once `develop` is wired to staging (see `docs/staging.md`), schedule the smoke script + Playwright every 10 minutes against staging to catch regressions before they reach production:

```yaml
# .github/workflows/synthetic.yml
name: Synthetic monitor
on:
  schedule: [{ cron: '*/10 * * * *' }]
  workflow_dispatch:

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/smoke-check.sh https://hospital-c3k5-staging.vercel.app
        env:
          # store an E2E user with read-only role in repo secrets
          HOSPITAL_USER: ${{ secrets.E2E_USERNAME }}
          HOSPITAL_PASS: ${{ secrets.E2E_PASSWORD }}
```

Failures wake the on-call via the same Better Stack policy if you wire the GitHub status as a downstream check.

---

## Slack/Teams hook (simplest alert channel)

Better Stack lets you wire any monitor to a Slack incoming webhook in 30 seconds. Recommended setup:

1. Slack → Apps → **Incoming Webhooks** → Add to Workspace → pick `#hospital-erp-alerts`.
2. Copy the webhook URL.
3. Better Stack → **Integrations → Slack** → paste URL.
4. Done — every monitor incident posts to the channel with a Resolved button.

---

## Quarterly review

Same cadence as `docs/secrets-rotation.md`:
- Are all monitors green?
- Do escalation contacts still work?
- Has any false alert fired more than 3 times? Tune or retire.
- Did Sentry fire any exceptions that we silently ignored? Add them to the audit-log review.
