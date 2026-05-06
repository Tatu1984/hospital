-- Lab test parameters — one row per measured analyte on a panel test.
-- A simple test (e.g. "Random blood sugar") has one parameter; a panel
-- like CBC has many (Hb, RBC, WBC, Platelets, MCV, MCH, ...). Reference
-- ranges live on the parameter so reports can flag out-of-range values.
--
-- Backwards-compatible: existing labTestMaster rows continue to work
-- via their flat unit/normalRange fields. New configurations migrate
-- to per-parameter rows.

-- Add specimen + methodology to the master so the report header has them.
ALTER TABLE "lab_test_master"
  ADD COLUMN IF NOT EXISTS "sampleType"  TEXT,
  ADD COLUMN IF NOT EXISTS "methodology" TEXT;

CREATE TABLE IF NOT EXISTS "lab_test_parameters" (
  "id"              TEXT          PRIMARY KEY,
  "testId"          TEXT          NOT NULL,
  "name"            TEXT          NOT NULL,
  "code"            TEXT,
  "unit"            TEXT,
  "resultType"      TEXT          NOT NULL DEFAULT 'numeric',
  "refLow"          DECIMAL(14,4),
  "refHigh"         DECIMAL(14,4),
  "criticalLow"     DECIMAL(14,4),
  "criticalHigh"    DECIMAL(14,4),
  "decimals"        INTEGER       NOT NULL DEFAULT 2,
  "choices"         JSONB,
  "ageGenderRanges" JSONB,
  "displayOrder"    INTEGER       NOT NULL DEFAULT 0,
  "isActive"        BOOLEAN       NOT NULL DEFAULT true,
  "createdAt"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "lab_test_parameters_test_fk"
    FOREIGN KEY ("testId") REFERENCES "lab_test_master"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "lab_test_parameters_testId_idx"
  ON "lab_test_parameters"("testId");
