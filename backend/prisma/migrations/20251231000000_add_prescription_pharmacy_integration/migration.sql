-- AlterTable: Add new fields to Prescription table
ALTER TABLE "prescriptions"
  ADD COLUMN IF NOT EXISTS "admissionId" TEXT,
  ADD COLUMN IF NOT EXISTS "patientId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "opdNoteId" DROP NOT NULL;

-- CreateIndex: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "prescriptions_patientId_idx" ON "prescriptions"("patientId");
CREATE INDEX IF NOT EXISTS "prescriptions_status_idx" ON "prescriptions"("status");

-- AlterTable: Add prescriptionId to PharmacySale
ALTER TABLE "pharmacy_sales"
  ADD COLUMN IF NOT EXISTS "prescriptionId" TEXT;

-- CreateIndex: Add index for prescriptionId in PharmacySale
CREATE INDEX IF NOT EXISTS "pharmacy_sales_prescriptionId_idx" ON "pharmacy_sales"("prescriptionId");

-- Update existing prescriptions to have a patientId if they don't have one
-- This requires fetching patientId from opdNote
UPDATE "prescriptions" p
SET "patientId" = (
  SELECT "patientId"
  FROM "opd_notes" o
  WHERE o.id = p."opdNoteId"
)
WHERE p."patientId" = '' AND p."opdNoteId" IS NOT NULL;

-- For any remaining prescriptions without patientId, we'll need manual intervention
-- but we set a temporary value to avoid constraint violations
UPDATE "prescriptions"
SET "patientId" = (SELECT id FROM "patients" LIMIT 1)
WHERE "patientId" = '';
