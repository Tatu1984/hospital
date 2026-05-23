-- Birth records + India Form-4 (Medical Certificate of Cause of Death)
-- extension fields on the existing mortuary_records table. All ops are
-- idempotent so the migration can re-run after a partial failure.

-- =============================================================
-- 1. birth_records (new table)
-- =============================================================
CREATE TABLE IF NOT EXISTS "birth_records" (
  "id"                  TEXT PRIMARY KEY,
  "tenantId"            TEXT NOT NULL,
  "branchId"            TEXT NOT NULL,
  "motherPatientId"     TEXT NOT NULL,
  "babyPatientId"       TEXT,
  "babyName"            TEXT,
  "babyGender"          TEXT NOT NULL,
  "birthDate"           TIMESTAMP(3) NOT NULL,
  "placeOfBirth"        TEXT,
  "deliveryType"        TEXT NOT NULL,
  "birthOrder"          INTEGER NOT NULL DEFAULT 1,
  "weightGrams"         INTEGER,
  "lengthCm"            DOUBLE PRECISION,
  "headCircumferenceCm" DOUBLE PRECISION,
  "apgar1Min"           INTEGER,
  "apgar5Min"           INTEGER,
  "liveBirth"           BOOLEAN NOT NULL DEFAULT true,
  "outcome"             TEXT,
  "notes"               TEXT,
  "fatherName"          TEXT,
  "fatherOccupation"    TEXT,
  "fatherEducation"     TEXT,
  "motherOccupation"    TEXT,
  "motherEducation"     TEXT,
  "motherAgeAtBirth"    INTEGER,
  "parentsAddress"      TEXT,
  "parentsReligion"     TEXT,
  "parentsNationality"  TEXT DEFAULT 'Indian',
  "attendingDoctorId"   TEXT,
  "attendingDoctorName" TEXT,
  "certificateNumber"   TEXT,
  "certificateIssuedAt" TIMESTAMP(3),
  "certificateIssuedBy" TEXT,
  "civilRegNumber"      TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "birth_records_babyPatientId_key"
  ON "birth_records" ("babyPatientId");

CREATE UNIQUE INDEX IF NOT EXISTS "birth_records_tenantId_certificateNumber_key"
  ON "birth_records" ("tenantId", "certificateNumber");

CREATE INDEX IF NOT EXISTS "birth_records_tenantId_idx"     ON "birth_records" ("tenantId");
CREATE INDEX IF NOT EXISTS "birth_records_motherPatientId_idx" ON "birth_records" ("motherPatientId");

-- FKs (wrap each in a DO block because PG has no IF NOT EXISTS for ADD CONSTRAINT).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'birth_records_tenantId_fkey') THEN
    ALTER TABLE "birth_records" ADD CONSTRAINT "birth_records_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'birth_records_branchId_fkey') THEN
    ALTER TABLE "birth_records" ADD CONSTRAINT "birth_records_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'birth_records_motherPatientId_fkey') THEN
    ALTER TABLE "birth_records" ADD CONSTRAINT "birth_records_motherPatientId_fkey"
      FOREIGN KEY ("motherPatientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'birth_records_babyPatientId_fkey') THEN
    ALTER TABLE "birth_records" ADD CONSTRAINT "birth_records_babyPatientId_fkey"
      FOREIGN KEY ("babyPatientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'birth_records_attendingDoctorId_fkey') THEN
    ALTER TABLE "birth_records" ADD CONSTRAINT "birth_records_attendingDoctorId_fkey"
      FOREIGN KEY ("attendingDoctorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- =============================================================
-- 2. mortuary_records — India Form-4 cause-of-death extension
-- =============================================================
ALTER TABLE "mortuary_records" ADD COLUMN IF NOT EXISTS "address"              TEXT;
ALTER TABLE "mortuary_records" ADD COLUMN IF NOT EXISTS "placeOfDeath"         TEXT;
ALTER TABLE "mortuary_records" ADD COLUMN IF NOT EXISTS "immediateCause"       TEXT;
ALTER TABLE "mortuary_records" ADD COLUMN IF NOT EXISTS "immediateInterval"    TEXT;
ALTER TABLE "mortuary_records" ADD COLUMN IF NOT EXISTS "antecedentCause1"     TEXT;
ALTER TABLE "mortuary_records" ADD COLUMN IF NOT EXISTS "antecedent1Interval"  TEXT;
ALTER TABLE "mortuary_records" ADD COLUMN IF NOT EXISTS "antecedentCause2"     TEXT;
ALTER TABLE "mortuary_records" ADD COLUMN IF NOT EXISTS "antecedent2Interval"  TEXT;
ALTER TABLE "mortuary_records" ADD COLUMN IF NOT EXISTS "contributingCauses"   TEXT;
ALTER TABLE "mortuary_records" ADD COLUMN IF NOT EXISTS "mannerOfDeath"        TEXT;
ALTER TABLE "mortuary_records" ADD COLUMN IF NOT EXISTS "modeOfDeath"          TEXT;
ALTER TABLE "mortuary_records" ADD COLUMN IF NOT EXISTS "certifyingDoctorId"   TEXT;
ALTER TABLE "mortuary_records" ADD COLUMN IF NOT EXISTS "certifyingDoctorName" TEXT;
ALTER TABLE "mortuary_records" ADD COLUMN IF NOT EXISTS "certifyingDoctorReg"  TEXT;
ALTER TABLE "mortuary_records" ADD COLUMN IF NOT EXISTS "certificateNumber"    TEXT;
ALTER TABLE "mortuary_records" ADD COLUMN IF NOT EXISTS "certificateIssuedAt"  TIMESTAMP(3);
ALTER TABLE "mortuary_records" ADD COLUMN IF NOT EXISTS "certificateIssuedBy"  TEXT;

CREATE INDEX IF NOT EXISTS "mortuary_records_patientId_idx" ON "mortuary_records" ("patientId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mortuary_records_patientId_fkey') THEN
    ALTER TABLE "mortuary_records" ADD CONSTRAINT "mortuary_records_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mortuary_records_certifyingDoctorId_fkey') THEN
    ALTER TABLE "mortuary_records" ADD CONSTRAINT "mortuary_records_certifyingDoctorId_fkey"
      FOREIGN KEY ("certifyingDoctorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
