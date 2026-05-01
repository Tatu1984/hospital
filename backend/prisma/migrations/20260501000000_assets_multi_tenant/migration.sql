-- Make Asset and MaintenanceLog multi-tenant.
-- Strategy: add nullable columns first, backfill from the only existing tenant
-- (the demo tenant 'tenant-1'), then enforce NOT NULL where needed and adjust
-- indexes. This is safe to run on a populated DB.

-- 1. Add columns as nullable
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "maintenance_logs" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- 2. Backfill existing rows. If there are multiple tenants, this will need a
-- per-row decision — at this stage there's only the seed 'tenant-1'.
UPDATE "assets"
SET "tenantId" = COALESCE(
  "tenantId",
  (SELECT id FROM "tenants" ORDER BY "createdAt" ASC LIMIT 1)
)
WHERE "tenantId" IS NULL;

UPDATE "maintenance_logs" ml
SET "tenantId" = COALESCE(
  ml."tenantId",
  (SELECT a."tenantId" FROM "assets" a WHERE a.id = ml."assetId")
)
WHERE ml."tenantId" IS NULL;

-- 3. Enforce NOT NULL for tenantId
ALTER TABLE "assets" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "maintenance_logs" ALTER COLUMN "tenantId" SET NOT NULL;

-- 4. Replace the global unique index on assetCode with a per-tenant one,
-- so two tenants can each have their own AST00001.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'assets_assetCode_key') THEN
    ALTER TABLE "assets" DROP CONSTRAINT IF EXISTS "assets_assetCode_key";
    DROP INDEX IF EXISTS "assets_assetCode_key";
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS "assets_tenantId_assetCode_key"
  ON "assets"("tenantId", "assetCode");

-- 5. Add filtering indexes
CREATE INDEX IF NOT EXISTS "assets_tenantId_isActive_idx"
  ON "assets"("tenantId", "isActive");

CREATE INDEX IF NOT EXISTS "maintenance_logs_tenantId_idx"
  ON "maintenance_logs"("tenantId");
