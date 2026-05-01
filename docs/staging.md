# Staging environment

Production today is `main` → Vercel auto-deploy. This is fine while it's just us, but every push lands in front of real users. A staging environment lets us:

- merge to `develop`, deploy to staging, smoke-test, then promote to `main`
- run Playwright against an isolated URL without polluting production data
- verify schema migrations on real Postgres before they touch production

Set up once. After that, the day-to-day flow is `develop` → staging, `main` → production.

---

## What you'll create

| Resource | Production | Staging |
|---|---|---|
| Vercel frontend project | `hospital-vnyb` | `hospital-vnyb-staging` |
| Vercel backend project | `hospital-c3k5` | `hospital-c3k5-staging` |
| NeonDB project | existing | new branch `staging` |
| GitHub branch rule | `main` protected | `develop` is the integration branch |

---

## 1. NeonDB staging branch

NeonDB lets you branch a database in seconds. Don't share the production DB with staging — corrupt staging data will leak into prod.

1. https://console.neon.tech → your project → **Branches → Create Branch**.
2. Name: `staging`. Parent: `main` (or whichever branch holds production data).
3. After it's created, copy its **Pooled connection string** (host ends `-pooler.neon.tech`).

---

## 2. Staging Vercel projects

Repeat for backend and frontend:

1. https://vercel.com/dashboard → **Add New → Project**.
2. Pick the same `Tatu1984/hospital` GitHub repo.
3. **Production Branch**: `develop`.
4. **Root Directory**:
   - Backend project: `backend`
   - Frontend project: `frontend`
5. **Framework Preset**: `Other` for backend; `Vite` for frontend.
6. **Environment Variables** — copy production values, override these:

   **Backend staging:**
   | Var | Value |
   |---|---|
   | `DATABASE_URL` | the NeonDB **staging** branch URL (from step 1) |
   | `JWT_SECRET` | new random — `openssl rand -hex 32` |
   | `REFRESH_TOKEN_SECRET` | new random — different from JWT_SECRET |
   | `CORS_ORIGIN` | `https://<your-staging-frontend>.vercel.app` |
   | `NODE_ENV` | `production` (yes, even on staging — turns on stricter cookie flags) |
   | `EXPOSE_API_DOCS` | `true` (handy for staging poking around Swagger) |
   | `STRICT_BODY_VALIDATION` | `true` (catches missing schemas before prod) |
   | `SENTRY_DSN` | a separate Sentry project so staging noise stays separate |

   **Frontend staging:**
   | Var | Value |
   |---|---|
   | `VITE_API_URL` | `https://<your-staging-backend>.vercel.app` |

7. Deploy. Verify with the smoke script:
   ```bash
   ./scripts/smoke-check.sh https://<your-staging-backend>.vercel.app admin <staging-password>
   ```

---

## 3. GitHub branch protection

1. GitHub repo → **Settings → Branches → Add branch protection rule**.
2. Branch name pattern: `main`.
3. Tick:
   - **Require a pull request before merging** (1 review).
   - **Require status checks**: select `Backend CI` and `Frontend CI` from the dropdown (they appear once a CI run has happened).
   - **Require linear history** (optional but cleaner).
   - **Do not allow bypassing the above settings** (admin force-push protection).

The same flow can be applied to `develop`, with looser rules.

---

## 4. Day-to-day flow

```
feat-branch → PR → develop ───┐
                              ├─→ Vercel staging redeploy (auto)
                              ├─→ smoke-check + Playwright run
                              │
develop  ───── PR ─────→ main ─┴─→ Vercel production redeploy (auto)
```

After merging to `develop`:
- Vercel staging projects auto-deploy.
- Run `./scripts/smoke-check.sh https://<staging-backend>.vercel.app admin <pwd>` (or wire it into the CI workflow as a post-staging step).
- If green, open a PR `develop → main`.

---

## 5. Cost notes

- Free Vercel Hobby: limit of 100 deployments/day (we won't hit). Staging projects are **personal-account separate quota** unless you upgrade to Team — not a problem at this scale.
- NeonDB free: 0.5 GB storage/branch. Staging branch counts against this. Trim it (drop tables) periodically if you import dumps.
- Sentry free: 5K errors/mo total — split between projects. Plenty for staging + prod.

---

## 6. Tear-down

If you stop using staging, the cleanup is:
1. Delete the two Vercel staging projects (Settings → General → bottom).
2. Delete the NeonDB staging branch.
3. Revoke the staging Sentry DSN.
