-- Phase 2: Surgical & NABH (safety checklist, anesthesia record, implants,
-- HAI surveillance, BMW log, M&M reviews). Idempotent.

-- 1. surgical_safety_checklists
CREATE TABLE IF NOT EXISTS "surgical_safety_checklists" (
  "id"          TEXT PRIMARY KEY,
  "surgeryId"   TEXT NOT NULL UNIQUE,
  "signInAt"    TIMESTAMP(3),
  "signInById"  TEXT,
  "signInData"  JSONB,
  "timeOutAt"   TIMESTAMP(3),
  "timeOutById" TEXT,
  "timeOutData" JSONB,
  "signOutAt"   TIMESTAMP(3),
  "signOutById" TEXT,
  "signOutData" JSONB,
  "isComplete"  BOOLEAN NOT NULL DEFAULT FALSE,
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'surgical_safety_checklists_surgeryId_fkey') THEN
    ALTER TABLE "surgical_safety_checklists" ADD CONSTRAINT "surgical_safety_checklists_surgeryId_fkey"
      FOREIGN KEY ("surgeryId") REFERENCES "surgeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 2. anesthesia_records
CREATE TABLE IF NOT EXISTS "anesthesia_records" (
  "id"               TEXT PRIMARY KEY,
  "surgeryId"        TEXT NOT NULL UNIQUE,
  "anesthetistId"    TEXT,
  "type"             TEXT NOT NULL,
  "asaScore"         INTEGER,
  "preOpAssessment"  TEXT,
  "preOpAt"          TIMESTAMP(3),
  "inductionDrugs"   JSONB,
  "inductionAt"      TIMESTAMP(3),
  "maintenanceDrugs" JSONB,
  "reversalDrugs"    JSONB,
  "reversalAt"       TIMESTAMP(3),
  "intraOpEvents"    JSONB,
  "pacuStart"        TIMESTAMP(3),
  "pacuEnd"          TIMESTAMP(3),
  "aldreteScore"     INTEGER,
  "complications"    TEXT,
  "notes"            TEXT,
  "signedAt"         TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "anesthesia_records_anesthetistId_idx" ON "anesthesia_records" ("anesthetistId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'anesthesia_records_surgeryId_fkey') THEN
    ALTER TABLE "anesthesia_records" ADD CONSTRAINT "anesthesia_records_surgeryId_fkey"
      FOREIGN KEY ("surgeryId") REFERENCES "surgeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'anesthesia_records_anesthetistId_fkey') THEN
    ALTER TABLE "anesthesia_records" ADD CONSTRAINT "anesthesia_records_anesthetistId_fkey"
      FOREIGN KEY ("anesthetistId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 3. implants
CREATE TABLE IF NOT EXISTS "implants" (
  "id"                TEXT PRIMARY KEY,
  "tenantId"          TEXT NOT NULL,
  "patientId"         TEXT NOT NULL,
  "surgeryId"         TEXT,
  "implantType"       TEXT NOT NULL,
  "manufacturer"      TEXT NOT NULL,
  "brandName"         TEXT,
  "modelNumber"       TEXT,
  "serialNumber"      TEXT NOT NULL,
  "batchLotNumber"    TEXT,
  "expiryDate"        TIMESTAMP(3),
  "side"              TEXT NOT NULL DEFAULT 'na',
  "anatomicalSite"    TEXT,
  "implantedAt"       TIMESTAMP(3) NOT NULL,
  "implantedById"     TEXT,
  "removedAt"         TIMESTAMP(3),
  "removedById"       TEXT,
  "removalReason"     TEXT,
  "warrantyExpiresAt" TIMESTAMP(3),
  "notes"             TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "implants_tenantId_manufacturer_serialNumber_key"
  ON "implants" ("tenantId", "manufacturer", "serialNumber");
CREATE INDEX IF NOT EXISTS "implants_tenantId_idx"  ON "implants" ("tenantId");
CREATE INDEX IF NOT EXISTS "implants_patientId_idx" ON "implants" ("patientId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'implants_tenantId_fkey') THEN
    ALTER TABLE "implants" ADD CONSTRAINT "implants_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'implants_patientId_fkey') THEN
    ALTER TABLE "implants" ADD CONSTRAINT "implants_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'implants_surgeryId_fkey') THEN
    ALTER TABLE "implants" ADD CONSTRAINT "implants_surgeryId_fkey"
      FOREIGN KEY ("surgeryId") REFERENCES "surgeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'implants_implantedById_fkey') THEN
    ALTER TABLE "implants" ADD CONSTRAINT "implants_implantedById_fkey"
      FOREIGN KEY ("implantedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'implants_removedById_fkey') THEN
    ALTER TABLE "implants" ADD CONSTRAINT "implants_removedById_fkey"
      FOREIGN KEY ("removedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 4. hai_cases
CREATE TABLE IF NOT EXISTS "hai_cases" (
  "id"                 TEXT PRIMARY KEY,
  "tenantId"           TEXT NOT NULL,
  "patientId"          TEXT NOT NULL,
  "encounterId"        TEXT,
  "admissionId"        TEXT,
  "infectionType"      TEXT NOT NULL,
  "organism"           TEXT,
  "sensitivityPattern" TEXT,
  "onsetDate"          TIMESTAMP(3) NOT NULL,
  "identifiedDate"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "identifiedById"     TEXT,
  "isolationRequired"  BOOLEAN NOT NULL DEFAULT FALSE,
  "isolationStarted"   TIMESTAMP(3),
  "isolationEnded"     TIMESTAMP(3),
  "outcomeStatus"      TEXT NOT NULL DEFAULT 'recovering',
  "notes"              TEXT,
  "reportedToICCAt"    TIMESTAMP(3),
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "hai_cases_tenantId_identifiedDate_idx" ON "hai_cases" ("tenantId", "identifiedDate");
CREATE INDEX IF NOT EXISTS "hai_cases_patientId_idx" ON "hai_cases" ("patientId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hai_cases_tenantId_fkey') THEN
    ALTER TABLE "hai_cases" ADD CONSTRAINT "hai_cases_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hai_cases_patientId_fkey') THEN
    ALTER TABLE "hai_cases" ADD CONSTRAINT "hai_cases_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hai_cases_identifiedById_fkey') THEN
    ALTER TABLE "hai_cases" ADD CONSTRAINT "hai_cases_identifiedById_fkey"
      FOREIGN KEY ("identifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 5. bmw_logs
CREATE TABLE IF NOT EXISTS "bmw_logs" (
  "id"                TEXT PRIMARY KEY,
  "tenantId"          TEXT NOT NULL,
  "branchId"          TEXT NOT NULL,
  "category"          TEXT NOT NULL,
  "weightKg"          DOUBLE PRECISION NOT NULL,
  "source"            TEXT NOT NULL,
  "collectedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "collectedById"     TEXT,
  "handoverAt"        TIMESTAMP(3),
  "handoverTo"        TEXT,
  "bspName"           TEXT,
  "bspManifestNumber" TEXT,
  "notes"             TEXT
);
CREATE INDEX IF NOT EXISTS "bmw_logs_tenantId_collectedAt_idx" ON "bmw_logs" ("tenantId", "collectedAt");
CREATE INDEX IF NOT EXISTS "bmw_logs_branchId_collectedAt_idx" ON "bmw_logs" ("branchId", "collectedAt");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bmw_logs_tenantId_fkey') THEN
    ALTER TABLE "bmw_logs" ADD CONSTRAINT "bmw_logs_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bmw_logs_branchId_fkey') THEN
    ALTER TABLE "bmw_logs" ADD CONSTRAINT "bmw_logs_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bmw_logs_collectedById_fkey') THEN
    ALTER TABLE "bmw_logs" ADD CONSTRAINT "bmw_logs_collectedById_fkey"
      FOREIGN KEY ("collectedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 6. mnm_reviews
CREATE TABLE IF NOT EXISTS "mnm_reviews" (
  "id"                  TEXT PRIMARY KEY,
  "tenantId"            TEXT NOT NULL,
  "patientId"           TEXT NOT NULL,
  "admissionId"         TEXT,
  "isMortality"         BOOLEAN NOT NULL DEFAULT TRUE,
  "presentationSummary" TEXT,
  "diagnosis"           TEXT,
  "clinicalCourse"      TEXT,
  "outcome"             TEXT,
  "rootCause"           TEXT,
  "learningPoints"      TEXT,
  "preventabilityScore" INTEGER,
  "reviewers"           JSONB,
  "reviewedAt"          TIMESTAMP(3),
  "status"              TEXT NOT NULL DEFAULT 'pending',
  "notes"               TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "mnm_reviews_tenantId_status_idx" ON "mnm_reviews" ("tenantId", "status");
CREATE INDEX IF NOT EXISTS "mnm_reviews_patientId_idx"        ON "mnm_reviews" ("patientId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mnm_reviews_tenantId_fkey') THEN
    ALTER TABLE "mnm_reviews" ADD CONSTRAINT "mnm_reviews_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mnm_reviews_patientId_fkey') THEN
    ALTER TABLE "mnm_reviews" ADD CONSTRAINT "mnm_reviews_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
