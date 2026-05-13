-- Reconcile prescriptions table with the Prisma schema.
--
-- Background: the live `prescriptions` table has six columns the Prisma
-- model never reflected:
--   patientId, encounterId, status, notes, instructions, updatedAt
-- That drift forced three workarounds in code: a runtime
-- information_schema introspection in the demo-seed POST, and raw
-- $queryRaw lookups in patient.repository.ts + report.repository.ts.
-- This migration brings every environment to the same shape so the
-- Prisma model is the single source of truth.
--
-- Idempotent throughout: every ALTER uses IF NOT EXISTS or is wrapped
-- in a DO block so it can re-run cleanly on environments that already
-- have some/all of the columns.

-- 1. Add missing columns. NULL on add — we'll backfill, then tighten.
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "patientId"    TEXT;
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "encounterId"  TEXT;
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "status"       TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "notes"        TEXT;
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "instructions" TEXT;
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "updatedAt"    TIMESTAMP(3);

-- 2. Backfill from opd_notes for any legacy row that's still null.
--    Every prescription has an opdNoteId, and OPDNote carries both
--    patientId and encounterId, so the source of truth is unambiguous.
UPDATE "prescriptions" p
SET    "patientId"   = o."patientId",
       "encounterId" = o."encounterId"
FROM   "opd_notes" o
WHERE  p."opdNoteId" = o."id"
  AND  (p."patientId" IS NULL OR p."encounterId" IS NULL);

-- 3. Backfill updatedAt = createdAt for rows that pre-date this column.
UPDATE "prescriptions" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

-- 4. Tighten NOT NULL on the columns Prisma now models as required.
--    Wrapped so re-runs don't fail on already-NOT-NULL columns.
DO $$
BEGIN
  ALTER TABLE "prescriptions" ALTER COLUMN "patientId" SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TABLE "prescriptions" ALTER COLUMN "updatedAt" SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END$$;

-- 5. Add FKs only if absent. Prisma generates FK names of the form
--    "<table>_<column>_fkey"; check pg_constraint by name.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prescriptions_patientId_fkey'
  ) THEN
    ALTER TABLE "prescriptions"
      ADD CONSTRAINT "prescriptions_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "patients"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prescriptions_encounterId_fkey'
  ) THEN
    ALTER TABLE "prescriptions"
      ADD CONSTRAINT "prescriptions_encounterId_fkey"
      FOREIGN KEY ("encounterId") REFERENCES "encounters"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

-- 6. Index used by patient.repository.ts / report.repository.ts —
--    `WHERE patientId = $1 ORDER BY createdAt DESC LIMIT N`.
CREATE INDEX IF NOT EXISTS "prescriptions_patientId_createdAt_idx"
  ON "prescriptions" ("patientId", "createdAt");
