# Secret Rotation Runbook

**Last reviewed:** 2026-05-01
**Owner:** Engineering on-call

This is the playbook for rotating every secret the Hospital ERP depends on. Run through this list **at least once a quarter**, plus immediately after any incident that could have leaked a value (laptop compromised, contractor offboarded, accidental commit).

---

## Quick reference

| Secret | Where it lives | Rotation cadence | Blast radius if leaked |
|---|---|---|---|
| `JWT_SECRET` | Vercel backend env | Quarterly | All sessions can be forged. |
| `REFRESH_TOKEN_SECRET` | Vercel backend env | Quarterly | Long-lived sessions can be forged + password-reset tokens too. |
| `DATABASE_URL` | Vercel backend env, GH Actions secret | After any DB password change | Full read/write to PHI database. |
| `SENTRY_DSN` | Vercel backend env | Yearly | Spam in our error feed. Low. |
| `DOCKER_USERNAME` / `DOCKER_PASSWORD` | GH repo secrets | Yearly | Push malicious image tags. |
| `VERCEL_TOKEN` | GH repo secrets | Yearly | Trigger arbitrary deploys. |
| Seed admin password | Live DB (rotated via UI) | After every seed run | Login as admin. |

---

## 1. JWT_SECRET / REFRESH_TOKEN_SECRET

### When to rotate
- Every quarter (calendar Q-end is fine).
- Immediately if any backend log was shared externally and you suspect the value was visible.
- Within 24 hours after any developer with access to the Vercel project leaves the org.

### How
1. Generate a new value:
   ```bash
   openssl rand -hex 32
   ```
   Do this twice (one for each secret). Don't reuse JWT_SECRET == REFRESH_TOKEN_SECRET.
2. Vercel → backend project → **Settings → Environment Variables** → edit each → paste new value → save.
3. **Deployments tab → ⋯ on latest → Redeploy → uncheck cache → Redeploy.**
4. Browser-side: existing access tokens (signed with the OLD secret) will fail verification. The axios interceptor catches the 401 and tries to refresh; refresh ALSO fails because its token was signed with the old REFRESH secret too. End result: every active user is forced to log in again. **Communicate this** in advance via Slack/email.

### Rolling-window mitigation (optional, future)
For zero-downtime rotation, accept BOTH the old and new secret for the refresh-token grace period. Not implemented yet — see `docs/poa.md` P1 #13 follow-up.

---

## 2. DATABASE_URL (NeonDB)

### When to rotate
- After a NeonDB password reset (manual via NeonDB dashboard).
- After a contractor/vendor with access to the Vercel project leaves.
- If `pg_dump` artifacts have been shared with anyone outside the team.

### How
1. NeonDB → your project → **Connection Details → Reset password**. Save the new connection string (use the **pooled** endpoint, host ends `-pooler.neon.tech`).
2. Vercel → backend project → **Settings → Environment Variables** → edit `DATABASE_URL` → paste new value.
3. GitHub repo → **Settings → Secrets and variables → Actions** → edit `PROD_DATABASE_URL` (used by the nightly backup workflow) → paste new value.
4. Vercel: redeploy backend (cache off).
5. Verify: `curl https://hospital-c3k5.vercel.app/api/ready` returns `{"ready":true}`.

The frontend never sees `DATABASE_URL`, so no FE redeploy needed.

---

## 3. SENTRY_DSN

### When to rotate
- Yearly, or if you suspect log noise from an unauthorized source.

### How
1. Sentry → project → **Settings → Client Keys (DSN)** → **Generate New Key** → revoke the old one.
2. Vercel: update `SENTRY_DSN` env var, redeploy.

---

## 4. CORS_ORIGIN

Not a secret per se, but tracked here because adding/removing frontend domains follows the same flow:

1. Vercel backend → Environment Variables → edit `CORS_ORIGIN` → comma-separated list, e.g.
   ```
   https://hospital-vnyb.vercel.app,https://hospital-opal-two.vercel.app,https://erp.example.com
   ```
2. Redeploy.

The backend logs every denied origin (`[cors] denied origin "X" — add it to CORS_ORIGIN ...`) so misconfiguration is visible immediately.

---

## 5. Seeded admin password

The seed script (`backend/src/seed.ts`) requires `SEED_ADMIN_PASSWORD` env var of at least 12 characters. **Never re-use this value at runtime** — it's seed-only.

If you ran the seed against production:
1. Log in as admin with the seeded password.
2. **System Control → Users → admin → Reset Password.** Use a new strong value.
3. Audit Log will show `PASSWORD_RESET_REQUESTED` and `PASSWORD_RESET_COMPLETED`.

---

## 6. Pre-commit secret scanning

Recommended (not yet wired):

```bash
brew install git-secrets
git secrets --install
git secrets --register-aws
git secrets --add 'postgres(ql)?://[^\\s]+'
git secrets --add 'eyJ[A-Za-z0-9_-]+\\.eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+'  # JWT shape
```

Add this to onboarding docs once enabled.

---

## Audit-log expectations

After every rotation, the next login should write a `LOGIN_SUCCESS` row in the AuditLog table (visible at `/audit-log`). Use that as the simplest "did the rotation work" smoke test.

---

## Calendar reminder

Add a recurring quarterly calendar invite:
- **Title**: Hospital ERP secret rotation
- **Cadence**: Q1/Q2/Q3/Q4, last Friday of the quarter
- **Description**: Run `docs/secrets-rotation.md`. ~30 min.
