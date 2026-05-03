-- POA P0 #1: finish the multi-tenant audit.
-- Adds (or hardens) `tenantId` on every model that was either missing one or
-- had it as nullable, then enforces NOT NULL after backfilling. Strategy
-- mirrors 20260501000000_assets_multi_tenant: nullable → backfill → NOT NULL.
--
-- Backfill priority for each row:
--   1. existing tenantId (no-op)
--   2. tenantId reachable through a related FK (patient.tenantId,
--      employee.tenantId, item.tenantId, donor.tenantId, …)
--   3. fallback to the oldest tenant in `tenants` (single-tenant install)

-- ---------------------------------------------------------------------------
-- 1. Add the column where missing. The schema author assumed the second
--    set (blood_*, employees*, inventory_items, stocks, purchase_orders)
--    already had a nullable tenantId from earlier migrations, but the live
--    DB never grew that column on those tables. IF NOT EXISTS keeps this
--    safe to re-run on installs that *did* have the column.
-- ---------------------------------------------------------------------------
ALTER TABLE "icu_beds"             ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "icu_vitals"           ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "housekeeping_tasks"   ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "diet_orders"          ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ambulance_trips"      ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "incidents"            ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "feedbacks"            ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

ALTER TABLE "blood_donors"         ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "blood_donations"      ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "blood_inventory"      ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "blood_requests"       ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "blood_issuances"      ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

ALTER TABLE "employees"            ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "employee_attendances" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "leave_requests"       ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

ALTER TABLE "inventory_items"      ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "stocks"               ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "purchase_orders"      ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- ---------------------------------------------------------------------------
-- 2. Backfill via FK paths first, then default tenant for everything else.
-- ---------------------------------------------------------------------------

-- DietOrder → patient.tenantId (patientId is NOT NULL, so this covers all rows)
UPDATE "diet_orders" d
SET "tenantId" = p."tenantId"
FROM "patients" p
WHERE d."patientId" = p.id AND d."tenantId" IS NULL;

-- ICUVitals → patient.tenantId where patientId is set
UPDATE "icu_vitals" v
SET "tenantId" = p."tenantId"
FROM "patients" p
WHERE v."patientId" = p.id AND v."tenantId" IS NULL;

-- ICUVitals → icuBed.tenantId for the rest (needs ICUBed backfilled first,
-- so we run this again later). For now noop here.

-- AmbulanceTrip → patient.tenantId where patientId is set
UPDATE "ambulance_trips" t
SET "tenantId" = p."tenantId"
FROM "patients" p
WHERE t."patientId" = p.id AND t."tenantId" IS NULL;

-- Incident → patient.tenantId where patientId is set
UPDATE "incidents" i
SET "tenantId" = p."tenantId"
FROM "patients" p
WHERE i."patientId" = p.id AND i."tenantId" IS NULL;

-- Feedback → patient.tenantId where patientId is set
UPDATE "feedbacks" f
SET "tenantId" = p."tenantId"
FROM "patients" p
WHERE f."patientId" = p.id AND f."tenantId" IS NULL;

-- Stock → inventoryItem.tenantId
UPDATE "stocks" s
SET "tenantId" = i."tenantId"
FROM "inventory_items" i
WHERE s."itemId" = i.id AND s."tenantId" IS NULL;

-- BloodDonation → donor.tenantId
UPDATE "blood_donations" bd
SET "tenantId" = d."tenantId"
FROM "blood_donors" d
WHERE bd."donorId" = d.id AND bd."tenantId" IS NULL;

-- BloodInventory → donation.tenantId where donationId is set
UPDATE "blood_inventory" bi
SET "tenantId" = bd."tenantId"
FROM "blood_donations" bd
WHERE bi."donationId" = bd.id AND bi."tenantId" IS NULL;

-- BloodIssuance → request.tenantId
UPDATE "blood_issuances" bi
SET "tenantId" = br."tenantId"
FROM "blood_requests" br
WHERE bi."requestId" = br.id AND bi."tenantId" IS NULL;

-- EmployeeAttendance → employee.tenantId
UPDATE "employee_attendances" a
SET "tenantId" = e."tenantId"
FROM "employees" e
WHERE a."employeeId" = e.id AND a."tenantId" IS NULL;

-- LeaveRequest → employee.tenantId
UPDATE "leave_requests" l
SET "tenantId" = e."tenantId"
FROM "employees" e
WHERE l."employeeId" = e.id AND l."tenantId" IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Default-tenant fallback for anything still NULL (single-tenant install).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  default_tenant TEXT;
BEGIN
  SELECT id INTO default_tenant FROM "tenants" ORDER BY "createdAt" ASC LIMIT 1;
  IF default_tenant IS NULL THEN
    RAISE EXCEPTION 'No tenant rows exist; run seed before this migration.';
  END IF;

  UPDATE "icu_beds"            SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;
  UPDATE "icu_vitals"          SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;
  UPDATE "housekeeping_tasks"  SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;
  UPDATE "diet_orders"         SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;
  UPDATE "ambulance_trips"     SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;
  UPDATE "incidents"           SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;
  UPDATE "feedbacks"           SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;

  UPDATE "blood_donors"        SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;
  UPDATE "blood_donations"     SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;
  UPDATE "blood_inventory"     SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;
  UPDATE "blood_requests"      SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;
  UPDATE "blood_issuances"     SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;

  UPDATE "employees"           SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;
  UPDATE "employee_attendances" SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;
  UPDATE "leave_requests"      SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;

  UPDATE "inventory_items"     SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;
  UPDATE "stocks"              SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;
  UPDATE "purchase_orders"     SET "tenantId" = default_tenant WHERE "tenantId" IS NULL;
END$$;

-- Now backfill ICUVitals from icuBed (icuBed.tenantId is populated above).
UPDATE "icu_vitals" v
SET "tenantId" = b."tenantId"
FROM "icu_beds" b
WHERE v."icuBedId" = b.id AND v."tenantId" IS NULL;

-- ---------------------------------------------------------------------------
-- 4. Enforce NOT NULL.
-- ---------------------------------------------------------------------------
ALTER TABLE "icu_beds"            ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "icu_vitals"          ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "housekeeping_tasks"  ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "diet_orders"         ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ambulance_trips"     ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "incidents"           ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "feedbacks"           ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "blood_donors"        ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "blood_donations"     ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "blood_inventory"     ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "blood_requests"      ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "blood_issuances"     ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "employees"           ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "employee_attendances" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "leave_requests"      ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "inventory_items"     ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "stocks"              ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "purchase_orders"     ALTER COLUMN "tenantId" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. Replace the global unique index on icu_beds.bedNumber with a per-tenant
--    one, so two tenants can each have ICU bed `MICU-01`.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'icu_beds_bedNumber_key') THEN
    ALTER TABLE "icu_beds" DROP CONSTRAINT IF EXISTS "icu_beds_bedNumber_key";
    DROP INDEX IF EXISTS "icu_beds_bedNumber_key";
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS "icu_beds_tenantId_bedNumber_key"
  ON "icu_beds"("tenantId", "bedNumber");

-- ---------------------------------------------------------------------------
-- 6. Indexes for the newly-added tenantId columns.
--    (Models that already had `@@index([tenantId])` skip this section.)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "icu_beds_tenantId_idx"           ON "icu_beds"("tenantId");
CREATE INDEX IF NOT EXISTS "icu_vitals_tenantId_idx"         ON "icu_vitals"("tenantId");
CREATE INDEX IF NOT EXISTS "housekeeping_tasks_tenantId_idx" ON "housekeeping_tasks"("tenantId");
CREATE INDEX IF NOT EXISTS "diet_orders_tenantId_idx"        ON "diet_orders"("tenantId");
CREATE INDEX IF NOT EXISTS "ambulance_trips_tenantId_idx"    ON "ambulance_trips"("tenantId");
CREATE INDEX IF NOT EXISTS "incidents_tenantId_idx"          ON "incidents"("tenantId");
CREATE INDEX IF NOT EXISTS "feedbacks_tenantId_idx"          ON "feedbacks"("tenantId");
