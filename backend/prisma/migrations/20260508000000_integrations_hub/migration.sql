-- Integrations hub — third-party API connections registered by admins.
-- One row per connected service (SMS provider, payment gateway, PACS,
-- lab analyzer, custom REST endpoint, etc.). Admins manage these from
-- System Control → Integrations.

CREATE TABLE IF NOT EXISTS "integrations" (
  "id"             TEXT          PRIMARY KEY,
  "tenantId"       TEXT          NOT NULL,
  "name"           TEXT          NOT NULL,
  "category"       TEXT          NOT NULL,
  "provider"       TEXT          NOT NULL,
  "baseUrl"        TEXT,
  "authType"       TEXT          NOT NULL DEFAULT 'api_key',
  "credentials"    JSONB,
  "headers"        JSONB,
  "targetModules"  TEXT[]        NOT NULL DEFAULT '{}',
  "enabled"        BOOLEAN       NOT NULL DEFAULT true,
  "lastTestedAt"   TIMESTAMP(3),
  "lastTestStatus" TEXT,
  "lastTestResult" TEXT,
  "notes"          TEXT,
  "createdBy"      TEXT,
  "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "integrations_tenant_idx" ON "integrations"("tenantId");
CREATE INDEX IF NOT EXISTS "integrations_category_idx" ON "integrations"("category");
