-- POA P0 #1 phase 2: close out the last five leaky models.
-- Same nullable→backfill→NOT NULL strategy as phase 1.
--
-- Models covered: AmbulanceVehicle, EmergencyCase, Surgery, OTRoom, AuditLog.

-- ---------------------------------------------------------------------------
-- 1. Add nullable tenantId columns.
-- ---------------------------------------------------------------------------
ALTER TABLE "ambulance_vehicles" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "emergency_cases"    ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "surgeries"          ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ot_rooms"           ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "audit_logs"         ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- ---------------------------------------------------------------------------
-- 2. Backfill via FK paths first.
-- ---------------------------------------------------------------------------

-- EmergencyCase → patient.tenantId where patientId is set
UPDATE "emergency_cases" e
SET "tenantId" = p."tenantId"
FROM "patients" p
WHERE e."patientId" = p.id AND e."tenantId" IS NULL;

-- Surgery → patient.tenantId where patientId is set
UPDATE "surgeries" s
SET "tenantId" = p."tenantId"
FROM "patients" p
WHERE s."patientId" = p.id AND s."tenantId" IS NULL;

-- AuditLog → user.tenantId via the userId or performedBy FKs
UPDATE "audit_logs" al
SET "tenantId" = u."tenantId"
FROM "users" u
WHERE al."userId" = u.id AND al."tenantId" IS NULL;

UPDATE "audit_logs" al
SET "tenantId" = u."tenantId"
FROM "users" u
WHERE al."performedBy" = u.id AND al."tenantId" IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Default-tenant fallback for unlinked rows + AmbulanceVehicle / OTRoom
--    (which have no FK to derive a tenant from).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  default_tenant TEXT;
BEGIN
  SELECT id INTO default_tenant FROM "tenants" ORDER BY "createdAt" ASC LIMIT 1;
  IF default_tenant IS NULL THEN
    RAISE EXCEPTION 'No tenant rows exist; run seed before this migration.';
  END IF;

  UPDATE "ambulance_vehicles" SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;
  UPDATE "emergency_cases"    SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;
  UPDATE "surgeries"          SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;
  UPDATE "ot_rooms"           SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;
  UPDATE "audit_logs"         SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;
END$$;

-- ---------------------------------------------------------------------------
-- 4. Enforce NOT NULL.
-- ---------------------------------------------------------------------------
ALTER TABLE "ambulance_vehicles" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "emergency_cases"    ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "surgeries"          ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ot_rooms"           ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "audit_logs"         ALTER COLUMN "tenantId" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. Replace global unique constraints with per-tenant ones so two tenants
--    can independently claim AMB-001 / OT-1 / etc.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ambulance_vehicles_vehicleNumber_key') THEN
    ALTER TABLE "ambulance_vehicles" DROP CONSTRAINT IF EXISTS "ambulance_vehicles_vehicleNumber_key";
    DROP INDEX IF EXISTS "ambulance_vehicles_vehicleNumber_key";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ot_rooms_name_key') THEN
    ALTER TABLE "ot_rooms" DROP CONSTRAINT IF EXISTS "ot_rooms_name_key";
    DROP INDEX IF EXISTS "ot_rooms_name_key";
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS "ambulance_vehicles_tenantId_vehicleNumber_key"
  ON "ambulance_vehicles"("tenantId", "vehicleNumber");

CREATE UNIQUE INDEX IF NOT EXISTS "ot_rooms_tenantId_name_key"
  ON "ot_rooms"("tenantId", "name");

-- ---------------------------------------------------------------------------
-- 6. Filtering indexes.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "ambulance_vehicles_tenantId_idx" ON "ambulance_vehicles"("tenantId");
CREATE INDEX IF NOT EXISTS "emergency_cases_tenantId_idx"    ON "emergency_cases"("tenantId");
CREATE INDEX IF NOT EXISTS "surgeries_tenantId_idx"          ON "surgeries"("tenantId");
CREATE INDEX IF NOT EXISTS "ot_rooms_tenantId_idx"           ON "ot_rooms"("tenantId");
CREATE INDEX IF NOT EXISTS "audit_logs_tenantId_timestamp_idx" ON "audit_logs"("tenantId", "timestamp");
