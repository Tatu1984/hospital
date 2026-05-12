-- Extend existing dialysis_sessions for the booking-register flow.
-- Two new columns: `bedId` (the chair / bed the patient occupies for the
-- session) and `slot` (one of SLOT_1..SLOT_4). Both nullable so older
-- clinical-style sessions without a fixed slot continue to validate.
ALTER TABLE "dialysis_sessions" ADD COLUMN "bedId" TEXT;
ALTER TABLE "dialysis_sessions" ADD COLUMN "slot" TEXT;

-- Prevent double-booking: at most one session per (machine, date, slot)
-- and per (bed, date, slot). PostgreSQL treats NULLs as distinct in
-- unique indexes by default, so legacy rows without a slot don't trip
-- the constraint.
CREATE UNIQUE INDEX "dialysis_sessions_machineId_scheduledDate_slot_key"
  ON "dialysis_sessions" ("machineId", "scheduledDate", "slot");
CREATE UNIQUE INDEX "dialysis_sessions_bedId_scheduledDate_slot_key"
  ON "dialysis_sessions" ("bedId", "scheduledDate", "slot");

-- Wire the Patient FK that Prisma now expects. The relation already
-- existed at the schema level via patientId; only the explicit constraint
-- was missing.
ALTER TABLE "dialysis_sessions"
  ADD CONSTRAINT "dialysis_sessions_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
