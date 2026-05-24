-- Phase 1: Clinical EMR core (vitals, allergies, diagnoses, consultations,
-- discharge summary, medication reconciliation, drug interactions).
-- All operations are idempotent so this migration can re-run safely.

-- ============================================================
-- 1. VITALS
-- ============================================================
CREATE TABLE IF NOT EXISTS "vitals" (
  "id"            TEXT PRIMARY KEY,
  "patientId"     TEXT NOT NULL,
  "encounterId"   TEXT,
  "admissionId"   TEXT,
  "capturedById"  TEXT,
  "capturedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "temperatureC"  DOUBLE PRECISION,
  "bpSystolic"    INTEGER,
  "bpDiastolic"   INTEGER,
  "heartRate"     INTEGER,
  "respRate"      INTEGER,
  "spo2"          INTEGER,
  "weightKg"      DOUBLE PRECISION,
  "heightCm"      DOUBLE PRECISION,
  "bmi"           DOUBLE PRECISION,
  "painScore"     INTEGER,
  "glucoseMgDl"   INTEGER,
  "notes"         TEXT
);

CREATE INDEX IF NOT EXISTS "vitals_patientId_capturedAt_idx" ON "vitals" ("patientId", "capturedAt");
CREATE INDEX IF NOT EXISTS "vitals_encounterId_idx"          ON "vitals" ("encounterId");
CREATE INDEX IF NOT EXISTS "vitals_admissionId_idx"          ON "vitals" ("admissionId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vitals_patientId_fkey') THEN
    ALTER TABLE "vitals" ADD CONSTRAINT "vitals_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vitals_encounterId_fkey') THEN
    ALTER TABLE "vitals" ADD CONSTRAINT "vitals_encounterId_fkey"
      FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vitals_admissionId_fkey') THEN
    ALTER TABLE "vitals" ADD CONSTRAINT "vitals_admissionId_fkey"
      FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vitals_capturedById_fkey') THEN
    ALTER TABLE "vitals" ADD CONSTRAINT "vitals_capturedById_fkey"
      FOREIGN KEY ("capturedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 2. ALLERGIES
-- ============================================================
CREATE TABLE IF NOT EXISTS "allergies" (
  "id"         TEXT PRIMARY KEY,
  "patientId"  TEXT NOT NULL,
  "substance"  TEXT NOT NULL,
  "category"   TEXT NOT NULL DEFAULT 'drug',
  "reaction"   TEXT,
  "severity"   TEXT NOT NULL DEFAULT 'moderate',
  "notedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notedById"  TEXT,
  "active"     BOOLEAN NOT NULL DEFAULT TRUE,
  "notes"      TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS "allergies_patientId_substance_key" ON "allergies" ("patientId", "substance");
CREATE INDEX IF NOT EXISTS "allergies_patientId_active_idx" ON "allergies" ("patientId", "active");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'allergies_patientId_fkey') THEN
    ALTER TABLE "allergies" ADD CONSTRAINT "allergies_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 3. DIAGNOSES
-- ============================================================
CREATE TABLE IF NOT EXISTS "diagnoses" (
  "id"            TEXT PRIMARY KEY,
  "patientId"     TEXT NOT NULL,
  "encounterId"   TEXT,
  "admissionId"   TEXT,
  "icd10Code"     TEXT NOT NULL,
  "icd10Title"    TEXT NOT NULL,
  "notes"         TEXT,
  "isPrimary"     BOOLEAN NOT NULL DEFAULT FALSE,
  "status"        TEXT NOT NULL DEFAULT 'active',
  "diagnosedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "diagnosedById" TEXT,
  "resolvedAt"    TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "diagnoses_patientId_status_idx" ON "diagnoses" ("patientId", "status");
CREATE INDEX IF NOT EXISTS "diagnoses_icd10Code_idx"        ON "diagnoses" ("icd10Code");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'diagnoses_patientId_fkey') THEN
    ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'diagnoses_encounterId_fkey') THEN
    ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_encounterId_fkey"
      FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'diagnoses_admissionId_fkey') THEN
    ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_admissionId_fkey"
      FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 4. CONSULTATIONS (inter-department)
-- ============================================================
CREATE TABLE IF NOT EXISTS "consultations" (
  "id"            TEXT PRIMARY KEY,
  "tenantId"      TEXT NOT NULL,
  "patientId"     TEXT NOT NULL,
  "encounterId"   TEXT,
  "admissionId"   TEXT,
  "requestedById" TEXT NOT NULL,
  "toDepartment"  TEXT NOT NULL,
  "assignedToId"  TEXT,
  "urgency"       TEXT NOT NULL DEFAULT 'routine',
  "question"      TEXT NOT NULL,
  "status"        TEXT NOT NULL DEFAULT 'requested',
  "response"      TEXT,
  "respondedById" TEXT,
  "respondedAt"   TIMESTAMP(3),
  "requestedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "consultations_tenantId_status_idx"   ON "consultations" ("tenantId", "status");
CREATE INDEX IF NOT EXISTS "consultations_assignedToId_status_idx" ON "consultations" ("assignedToId", "status");
CREATE INDEX IF NOT EXISTS "consultations_patientId_idx"          ON "consultations" ("patientId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consultations_patientId_fkey') THEN
    ALTER TABLE "consultations" ADD CONSTRAINT "consultations_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consultations_encounterId_fkey') THEN
    ALTER TABLE "consultations" ADD CONSTRAINT "consultations_encounterId_fkey"
      FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consultations_admissionId_fkey') THEN
    ALTER TABLE "consultations" ADD CONSTRAINT "consultations_admissionId_fkey"
      FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consultations_requestedById_fkey') THEN
    ALTER TABLE "consultations" ADD CONSTRAINT "consultations_requestedById_fkey"
      FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consultations_assignedToId_fkey') THEN
    ALTER TABLE "consultations" ADD CONSTRAINT "consultations_assignedToId_fkey"
      FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consultations_respondedById_fkey') THEN
    ALTER TABLE "consultations" ADD CONSTRAINT "consultations_respondedById_fkey"
      FOREIGN KEY ("respondedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 5. DISCHARGE SUMMARIES
-- ============================================================
CREATE TABLE IF NOT EXISTS "discharge_summaries" (
  "id"                   TEXT PRIMARY KEY,
  "admissionId"          TEXT NOT NULL UNIQUE,
  "finalDiagnosis"       TEXT NOT NULL,
  "proceduresDone"       TEXT,
  "treatmentSummary"     TEXT,
  "conditionAtDischarge" TEXT,
  "dischargeMedications" JSONB,
  "followUpDate"         TIMESTAMP(3),
  "followUpNotes"        TEXT,
  "instructions"         TEXT,
  "signedById"           TEXT NOT NULL,
  "signedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discharge_summaries_admissionId_fkey') THEN
    ALTER TABLE "discharge_summaries" ADD CONSTRAINT "discharge_summaries_admissionId_fkey"
      FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discharge_summaries_signedById_fkey') THEN
    ALTER TABLE "discharge_summaries" ADD CONSTRAINT "discharge_summaries_signedById_fkey"
      FOREIGN KEY ("signedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 6. MEDICATION RECONCILIATION
-- ============================================================
CREATE TABLE IF NOT EXISTS "medication_reconciliations" (
  "id"             TEXT PRIMARY KEY,
  "admissionId"    TEXT NOT NULL,
  "source"         TEXT NOT NULL,
  "drugName"       TEXT NOT NULL,
  "drugId"         TEXT,
  "dose"           TEXT,
  "frequency"      TEXT,
  "action"         TEXT,
  "reason"         TEXT,
  "reconciledById" TEXT,
  "reconciledAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "med_recs_admissionId_source_idx" ON "medication_reconciliations" ("admissionId", "source");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'med_recs_admissionId_fkey') THEN
    ALTER TABLE "medication_reconciliations" ADD CONSTRAINT "med_recs_admissionId_fkey"
      FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 7. DRUG INTERACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS "drug_interactions" (
  "id"          TEXT PRIMARY KEY,
  "drugAId"     TEXT NOT NULL,
  "drugBId"     TEXT NOT NULL,
  "severity"    TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "advice"      TEXT,
  "source"      TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS "drug_interactions_drugAId_drugBId_key" ON "drug_interactions" ("drugAId", "drugBId");
CREATE INDEX IF NOT EXISTS "drug_interactions_drugAId_idx" ON "drug_interactions" ("drugAId");
CREATE INDEX IF NOT EXISTS "drug_interactions_drugBId_idx" ON "drug_interactions" ("drugBId");
