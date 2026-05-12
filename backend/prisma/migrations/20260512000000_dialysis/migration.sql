-- Extend existing dialysis_sessions for the booking-register flow.
-- All operations are idempotent so the migration can re-run after a
-- partial failure without exploding.

-- bedId + slot columns — IF NOT EXISTS is supported on ADD COLUMN
-- since PG 9.6.
ALTER TABLE "dialysis_sessions" ADD COLUMN IF NOT EXISTS "bedId" TEXT;
ALTER TABLE "dialysis_sessions" ADD COLUMN IF NOT EXISTS "slot" TEXT;

-- Prevent double-booking on either resource. IF NOT EXISTS is supported
-- on CREATE UNIQUE INDEX since PG 9.5. PostgreSQL treats NULLs as
-- distinct in unique indexes, so legacy rows without a slot don't trip
-- the constraint.
CREATE UNIQUE INDEX IF NOT EXISTS "dialysis_sessions_machineId_scheduledDate_slot_key"
  ON "dialysis_sessions" ("machineId", "scheduledDate", "slot");
CREATE UNIQUE INDEX IF NOT EXISTS "dialysis_sessions_bedId_scheduledDate_slot_key"
  ON "dialysis_sessions" ("bedId", "scheduledDate", "slot");

-- Patient FK — Prisma expected this to exist (the schema now has
-- `patient Patient @relation`). Wrap in a DO block because PG has no
-- IF NOT EXISTS for ADD CONSTRAINT.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dialysis_sessions_patientId_fkey'
  ) THEN
    ALTER TABLE "dialysis_sessions"
      ADD CONSTRAINT "dialysis_sessions_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "patients"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END$$;
