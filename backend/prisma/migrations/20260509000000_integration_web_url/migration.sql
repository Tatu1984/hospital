-- Add user-facing web URL to integrations. Distinct from baseUrl
-- (which is the API endpoint) — used by module pages to embed an
-- iframe of the third-party UI and provide a "Launch in new tab"
-- button. Optional: integrations that are pure-API have it null.

ALTER TABLE "integrations"
  ADD COLUMN IF NOT EXISTS "webUrl" TEXT;
