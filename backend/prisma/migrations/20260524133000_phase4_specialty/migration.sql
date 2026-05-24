-- Phase 4: Specialty modules (Obstetrics ANC + Partograph, NICU,
-- Oncology chemo, Cardiology cath, Radiotherapy). Idempotent.

-- ============================================================
-- 1. pregnancies
-- ============================================================
CREATE TABLE IF NOT EXISTS "pregnancies" (
  "id"             TEXT PRIMARY KEY,
  "patientId"      TEXT NOT NULL,
  "lmpDate"        TIMESTAMP(3),
  "eddDate"        TIMESTAMP(3),
  "gravida"        INTEGER NOT NULL DEFAULT 1,
  "parity"         INTEGER NOT NULL DEFAULT 0,
  "abortions"     INTEGER NOT NULL DEFAULT 0,
  "livingChildren" INTEGER NOT NULL DEFAULT 0,
  "riskCategory"   TEXT NOT NULL DEFAULT 'low',
  "bloodGroup"     TEXT,
  "rhFactor"       TEXT,
  "status"         TEXT NOT NULL DEFAULT 'ongoing',
  "outcomeAt"      TIMESTAMP(3),
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "pregnancies_patientId_status_idx" ON "pregnancies" ("patientId", "status");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pregnancies_patientId_fkey') THEN
    ALTER TABLE "pregnancies" ADD CONSTRAINT "pregnancies_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 2. anc_visits
-- ============================================================
CREATE TABLE IF NOT EXISTS "anc_visits" (
  "id"                TEXT PRIMARY KEY,
  "pregnancyId"       TEXT NOT NULL,
  "visitNumber"       INTEGER NOT NULL,
  "visitDate"         TIMESTAMP(3) NOT NULL,
  "gestationWeeks"    INTEGER,
  "weightKg"          DOUBLE PRECISION,
  "bpSystolic"        INTEGER,
  "bpDiastolic"       INTEGER,
  "fundalHeightCm"    DOUBLE PRECISION,
  "foetalHeartRate"   INTEGER,
  "presentation"      TEXT,
  "urineAlbumin"      TEXT,
  "urineSugar"        TEXT,
  "haemoglobin"       DOUBLE PRECISION,
  "ifaSupplementGiven" BOOLEAN NOT NULL DEFAULT FALSE,
  "tdtVaccineGiven"   BOOLEAN NOT NULL DEFAULT FALSE,
  "complaints"        TEXT,
  "examination"       TEXT,
  "advicePlan"        TEXT,
  "visitedById"       TEXT
);
CREATE INDEX IF NOT EXISTS "anc_visits_pregnancyId_visitDate_idx" ON "anc_visits" ("pregnancyId", "visitDate");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'anc_visits_pregnancyId_fkey') THEN
    ALTER TABLE "anc_visits" ADD CONSTRAINT "anc_visits_pregnancyId_fkey"
      FOREIGN KEY ("pregnancyId") REFERENCES "pregnancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 3. partograph_events
-- ============================================================
CREATE TABLE IF NOT EXISTS "partograph_events" (
  "id"                  TEXT PRIMARY KEY,
  "pregnancyId"         TEXT NOT NULL,
  "recordedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cervixDilationCm"    INTEGER,
  "cervixEffacementPct" INTEGER,
  "foetalHeartRate"     INTEGER,
  "membraneStatus"      TEXT,
  "bpSystolic"          INTEGER,
  "bpDiastolic"         INTEGER,
  "pulse"               INTEGER,
  "tempC"               DOUBLE PRECISION,
  "contractions10min"   INTEGER,
  "contractionIntensity" TEXT,
  "station"             INTEGER,
  "oxytocinUnits"       DOUBLE PRECISION,
  "ivFluids"            TEXT,
  "notes"               TEXT,
  "recordedById"        TEXT
);
CREATE INDEX IF NOT EXISTS "partograph_events_pregnancyId_recordedAt_idx" ON "partograph_events" ("pregnancyId", "recordedAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partograph_events_pregnancyId_fkey') THEN
    ALTER TABLE "partograph_events" ADD CONSTRAINT "partograph_events_pregnancyId_fkey"
      FOREIGN KEY ("pregnancyId") REFERENCES "pregnancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 4. nicu_beds
-- ============================================================
CREATE TABLE IF NOT EXISTS "nicu_beds" (
  "id"               TEXT PRIMARY KEY,
  "tenantId"         TEXT NOT NULL,
  "bedNumber"        TEXT NOT NULL,
  "level"            TEXT NOT NULL DEFAULT 'L2',
  "equipment"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status"           TEXT NOT NULL DEFAULT 'vacant',
  "isolationCapable" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "nicu_beds_tenantId_bedNumber_key" ON "nicu_beds" ("tenantId", "bedNumber");
CREATE INDEX IF NOT EXISTS "nicu_beds_tenantId_status_idx" ON "nicu_beds" ("tenantId", "status");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nicu_beds_tenantId_fkey') THEN
    ALTER TABLE "nicu_beds" ADD CONSTRAINT "nicu_beds_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 5. nicu_stays
-- ============================================================
CREATE TABLE IF NOT EXISTS "nicu_stays" (
  "id"                   TEXT PRIMARY KEY,
  "tenantId"             TEXT NOT NULL,
  "babyPatientId"        TEXT NOT NULL,
  "nicuBedId"            TEXT,
  "reason"               TEXT NOT NULL,
  "reasonDetails"        TEXT,
  "birthWeightGrams"     INTEGER,
  "gestationWeeksAtBirth" INTEGER,
  "apgar1Min"            INTEGER,
  "apgar5Min"            INTEGER,
  "admittedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dischargedAt"         TIMESTAMP(3),
  "outcome"              TEXT,
  "notes"                TEXT,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "nicu_stays_tenantId_admittedAt_idx" ON "nicu_stays" ("tenantId", "admittedAt");
CREATE INDEX IF NOT EXISTS "nicu_stays_babyPatientId_idx" ON "nicu_stays" ("babyPatientId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nicu_stays_tenantId_fkey') THEN
    ALTER TABLE "nicu_stays" ADD CONSTRAINT "nicu_stays_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nicu_stays_babyPatientId_fkey') THEN
    ALTER TABLE "nicu_stays" ADD CONSTRAINT "nicu_stays_babyPatientId_fkey"
      FOREIGN KEY ("babyPatientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nicu_stays_nicuBedId_fkey') THEN
    ALTER TABLE "nicu_stays" ADD CONSTRAINT "nicu_stays_nicuBedId_fkey"
      FOREIGN KEY ("nicuBedId") REFERENCES "nicu_beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 6. chemo_protocols
-- ============================================================
CREATE TABLE IF NOT EXISTS "chemo_protocols" (
  "id"            TEXT PRIMARY KEY,
  "tenantId"      TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "abbreviation"  TEXT,
  "indication"    TEXT NOT NULL,
  "cycleLength"   INTEGER NOT NULL,
  "totalCycles"   INTEGER NOT NULL,
  "drugs"         JSONB NOT NULL,
  "premedications" JSONB,
  "notes"         TEXT,
  "isActive"      BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "chemo_protocols_tenantId_name_key" ON "chemo_protocols" ("tenantId", "name");
CREATE INDEX IF NOT EXISTS "chemo_protocols_tenantId_isActive_idx" ON "chemo_protocols" ("tenantId", "isActive");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chemo_protocols_tenantId_fkey') THEN
    ALTER TABLE "chemo_protocols" ADD CONSTRAINT "chemo_protocols_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 7. chemo_cycles
-- ============================================================
CREATE TABLE IF NOT EXISTS "chemo_cycles" (
  "id"            TEXT PRIMARY KEY,
  "tenantId"      TEXT NOT NULL,
  "patientId"     TEXT NOT NULL,
  "protocolId"    TEXT NOT NULL,
  "cycleNumber"   INTEGER NOT NULL,
  "scheduledDate" TIMESTAMP(3) NOT NULL,
  "actualDate"    TIMESTAMP(3),
  "preLabs"       JSONB,
  "bsa"           DOUBLE PRECISION,
  "doses"         JSONB,
  "toxicities"    TEXT,
  "status"        TEXT NOT NULL DEFAULT 'scheduled',
  "notes"         TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "chemo_cycles_tenantId_scheduledDate_idx" ON "chemo_cycles" ("tenantId", "scheduledDate");
CREATE INDEX IF NOT EXISTS "chemo_cycles_patientId_cycleNumber_idx"  ON "chemo_cycles" ("patientId", "cycleNumber");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chemo_cycles_tenantId_fkey') THEN
    ALTER TABLE "chemo_cycles" ADD CONSTRAINT "chemo_cycles_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chemo_cycles_patientId_fkey') THEN
    ALTER TABLE "chemo_cycles" ADD CONSTRAINT "chemo_cycles_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chemo_cycles_protocolId_fkey') THEN
    ALTER TABLE "chemo_cycles" ADD CONSTRAINT "chemo_cycles_protocolId_fkey"
      FOREIGN KEY ("protocolId") REFERENCES "chemo_protocols"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 8. cath_procedures
-- ============================================================
CREATE TABLE IF NOT EXISTS "cath_procedures" (
  "id"                  TEXT PRIMARY KEY,
  "tenantId"            TEXT NOT NULL,
  "patientId"           TEXT NOT NULL,
  "procedureType"       TEXT NOT NULL,
  "indication"          TEXT,
  "approach"            TEXT,
  "vesselsInvolved"     TEXT,
  "findings"            TEXT,
  "interventionDetails" TEXT,
  "implants"            JSONB,
  "contrastVolumeMl"    INTEGER,
  "fluoroscopyMinutes"  DOUBLE PRECISION,
  "complications"       TEXT,
  "startAt"             TIMESTAMP(3),
  "endAt"               TIMESTAMP(3),
  "outcome"             TEXT,
  "cardiologistId"      TEXT,
  "scrubNurseId"        TEXT,
  "notes"               TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "cath_procedures_tenantId_startAt_idx" ON "cath_procedures" ("tenantId", "startAt");
CREATE INDEX IF NOT EXISTS "cath_procedures_patientId_idx"         ON "cath_procedures" ("patientId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cath_procedures_tenantId_fkey') THEN
    ALTER TABLE "cath_procedures" ADD CONSTRAINT "cath_procedures_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cath_procedures_patientId_fkey') THEN
    ALTER TABLE "cath_procedures" ADD CONSTRAINT "cath_procedures_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 9. radiotherapy_plans
-- ============================================================
CREATE TABLE IF NOT EXISTS "radiotherapy_plans" (
  "id"                 TEXT PRIMARY KEY,
  "tenantId"           TEXT NOT NULL,
  "patientId"          TEXT NOT NULL,
  "technique"          TEXT NOT NULL,
  "site"               TEXT NOT NULL,
  "intent"             TEXT NOT NULL,
  "totalDoseGy"        DOUBLE PRECISION NOT NULL,
  "fractions"          INTEGER NOT NULL,
  "dosePerFractionGy"  DOUBLE PRECISION NOT NULL,
  "startedAt"          TIMESTAMP(3),
  "completedAt"        TIMESTAMP(3),
  "deliveredFractions" JSONB,
  "oncologistId"       TEXT,
  "notes"              TEXT,
  "status"             TEXT NOT NULL DEFAULT 'planned',
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "radiotherapy_plans_tenantId_status_idx" ON "radiotherapy_plans" ("tenantId", "status");
CREATE INDEX IF NOT EXISTS "radiotherapy_plans_patientId_idx"        ON "radiotherapy_plans" ("patientId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'radiotherapy_plans_tenantId_fkey') THEN
    ALTER TABLE "radiotherapy_plans" ADD CONSTRAINT "radiotherapy_plans_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'radiotherapy_plans_patientId_fkey') THEN
    ALTER TABLE "radiotherapy_plans" ADD CONSTRAINT "radiotherapy_plans_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
