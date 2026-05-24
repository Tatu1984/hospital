-- Hospital-wide emergency alert broadcast (Code Blue / Red / Pink / etc.).
-- Idempotent so the migration can re-run after a partial failure.

CREATE TABLE IF NOT EXISTS "alerts" (
  "id"           TEXT PRIMARY KEY,
  "tenantId"     TEXT NOT NULL,
  "code"         TEXT NOT NULL,
  "severity"     TEXT NOT NULL,
  "location"     TEXT NOT NULL,
  "message"      TEXT,
  "raisedById"   TEXT NOT NULL,
  "raisedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedById" TEXT,
  "resolvedAt"   TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "alerts_tenantId_resolvedAt_idx" ON "alerts" ("tenantId", "resolvedAt");
CREATE INDEX IF NOT EXISTS "alerts_tenantId_raisedAt_idx"   ON "alerts" ("tenantId", "raisedAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alerts_tenantId_fkey') THEN
    ALTER TABLE "alerts" ADD CONSTRAINT "alerts_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alerts_raisedById_fkey') THEN
    ALTER TABLE "alerts" ADD CONSTRAINT "alerts_raisedById_fkey"
      FOREIGN KEY ("raisedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alerts_resolvedById_fkey') THEN
    ALTER TABLE "alerts" ADD CONSTRAINT "alerts_resolvedById_fkey"
      FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "alert_acks" (
  "id"             TEXT PRIMARY KEY,
  "alertId"        TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "alert_acks_alertId_userId_key" ON "alert_acks" ("alertId", "userId");
CREATE INDEX IF NOT EXISTS "alert_acks_userId_idx" ON "alert_acks" ("userId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alert_acks_alertId_fkey') THEN
    ALTER TABLE "alert_acks" ADD CONSTRAINT "alert_acks_alertId_fkey"
      FOREIGN KEY ("alertId") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alert_acks_userId_fkey') THEN
    ALTER TABLE "alert_acks" ADD CONSTRAINT "alert_acks_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
