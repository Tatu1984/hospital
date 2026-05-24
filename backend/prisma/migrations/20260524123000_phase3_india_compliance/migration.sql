-- Phase 3: India statutory compliance — PCPNDT Form-F, MTP register,
-- ABDM link events, PMJAY claims, GST on invoices, ABHA on patient.
-- Idempotent.

-- ============================================================
-- Patient: ABHA + Aadhaar last4
-- ============================================================
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "abhaNumber"   TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "abhaAddress"  TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "abhaLinkedAt" TIMESTAMP(3);
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "aadhaarLast4" TEXT;

-- ============================================================
-- Invoice: GST + e-invoicing fields
-- ============================================================
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "gstinPatient"  TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "gstinHospital" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "hsnSac"        TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "cgst"          DECIMAL(10, 2);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "sgst"          DECIMAL(10, 2);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "igst"          DECIMAL(10, 2);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "placeOfSupply" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "irn"           TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "irnAckNumber"  TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "irnAckDate"    TIMESTAMP(3);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "qrCode"        TEXT;

-- ============================================================
-- 1. ultrasound_form_f
-- ============================================================
CREATE TABLE IF NOT EXISTS "ultrasound_form_f" (
  "id"                     TEXT PRIMARY KEY,
  "tenantId"               TEXT NOT NULL,
  "formFNumber"            TEXT NOT NULL,
  "patientId"              TEXT,
  "patientName"            TEXT NOT NULL,
  "patientAge"             INTEGER NOT NULL,
  "patientHusbandOrFather" TEXT NOT NULL,
  "patientAddress"         TEXT NOT NULL,
  "spouseName"             TEXT,
  "priorChildren"          INTEGER NOT NULL DEFAULT 0,
  "priorChildrenGender"    TEXT,
  "referredById"           TEXT,
  "referredByName"         TEXT,
  "referrerRegNo"          TEXT,
  "lmpDate"                TIMESTAMP(3),
  "gestationWeeks"         INTEGER,
  "obstetricHistory"       TEXT,
  "indication"             TEXT NOT NULL,
  "indicationOther"        TEXT,
  "procedure"              TEXT NOT NULL,
  "sonologistId"           TEXT,
  "sonologistName"         TEXT NOT NULL,
  "sonologistRegNo"        TEXT NOT NULL,
  "sonologistPcpndtCertNo" TEXT NOT NULL,
  "performedAt"            TIMESTAMP(3) NOT NULL,
  "findings"               TEXT,
  "signedAt"               TIMESTAMP(3),
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ultrasound_form_f_tenantId_formFNumber_key"
  ON "ultrasound_form_f" ("tenantId", "formFNumber");
CREATE INDEX IF NOT EXISTS "ultrasound_form_f_tenantId_performedAt_idx"
  ON "ultrasound_form_f" ("tenantId", "performedAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ultrasound_form_f_tenantId_fkey') THEN
    ALTER TABLE "ultrasound_form_f" ADD CONSTRAINT "ultrasound_form_f_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ultrasound_form_f_patientId_fkey') THEN
    ALTER TABLE "ultrasound_form_f" ADD CONSTRAINT "ultrasound_form_f_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 2. mtp_records
-- ============================================================
CREATE TABLE IF NOT EXISTS "mtp_records" (
  "id"                  TEXT PRIMARY KEY,
  "tenantId"            TEXT NOT NULL,
  "patientId"           TEXT NOT NULL,
  "registerNumber"      TEXT NOT NULL,
  "patientAge"          INTEGER NOT NULL,
  "husbandOrFatherName" TEXT NOT NULL,
  "address"             TEXT NOT NULL,
  "contact"             TEXT,
  "gravida"             INTEGER,
  "parity"              INTEGER,
  "livingChildren"      INTEGER,
  "lmpDate"             TIMESTAMP(3),
  "gestationWeeks"      INTEGER NOT NULL,
  "indication"          TEXT NOT NULL,
  "indicationDetails"   TEXT,
  "method"              TEXT NOT NULL,
  "primaryDoctorId"     TEXT,
  "primaryDoctorName"   TEXT NOT NULL,
  "primaryDoctorRegNo"  TEXT NOT NULL,
  "secondDoctorName"    TEXT,
  "secondDoctorRegNo"   TEXT,
  "boardConcurrence"    BOOLEAN NOT NULL DEFAULT FALSE,
  "procedureAt"         TIMESTAMP(3) NOT NULL,
  "outcome"             TEXT,
  "complications"       TEXT,
  "signedAt"            TIMESTAMP(3),
  "notes"               TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "mtp_records_tenantId_registerNumber_key"
  ON "mtp_records" ("tenantId", "registerNumber");
CREATE INDEX IF NOT EXISTS "mtp_records_tenantId_procedureAt_idx"
  ON "mtp_records" ("tenantId", "procedureAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mtp_records_tenantId_fkey') THEN
    ALTER TABLE "mtp_records" ADD CONSTRAINT "mtp_records_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mtp_records_patientId_fkey') THEN
    ALTER TABLE "mtp_records" ADD CONSTRAINT "mtp_records_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 3. abdm_link_events
-- ============================================================
CREATE TABLE IF NOT EXISTS "abdm_link_events" (
  "id"           TEXT PRIMARY KEY,
  "tenantId"     TEXT NOT NULL,
  "patientId"    TEXT NOT NULL,
  "eventType"    TEXT NOT NULL,
  "abdmTxnId"    TEXT,
  "payload"      JSONB,
  "status"       TEXT NOT NULL DEFAULT 'pending',
  "errorMessage" TEXT,
  "occurredAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "abdm_link_events_tenantId_patientId_idx"
  ON "abdm_link_events" ("tenantId", "patientId");
CREATE INDEX IF NOT EXISTS "abdm_link_events_patientId_occurredAt_idx"
  ON "abdm_link_events" ("patientId", "occurredAt");

-- ============================================================
-- 4. pmjay_claims
-- ============================================================
CREATE TABLE IF NOT EXISTS "pmjay_claims" (
  "id"                TEXT PRIMARY KEY,
  "tenantId"          TEXT NOT NULL,
  "patientId"         TEXT NOT NULL,
  "admissionId"       TEXT,
  "invoiceId"         TEXT,
  "pmjayId"           TEXT NOT NULL,
  "hospitalCode"      TEXT,
  "packageCode"       TEXT NOT NULL,
  "packageName"       TEXT NOT NULL,
  "packageAmount"     DECIMAL(12, 2) NOT NULL,
  "status"            TEXT NOT NULL DEFAULT 'eligibility_pending',
  "preAuthAt"         TIMESTAMP(3),
  "preAuthNumber"     TEXT,
  "preAuthApprovedAt" TIMESTAMP(3),
  "claimSubmittedAt"  TIMESTAMP(3),
  "claimNumber"       TEXT,
  "claimApprovedAt"   TIMESTAMP(3),
  "amountApproved"    DECIMAL(12, 2),
  "paidAt"            TIMESTAMP(3),
  "amountPaid"        DECIMAL(12, 2),
  "rejectionReason"   TEXT,
  "documents"         JSONB,
  "notes"             TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "pmjay_claims_tenantId_status_idx" ON "pmjay_claims" ("tenantId", "status");
CREATE INDEX IF NOT EXISTS "pmjay_claims_patientId_idx"        ON "pmjay_claims" ("patientId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pmjay_claims_tenantId_fkey') THEN
    ALTER TABLE "pmjay_claims" ADD CONSTRAINT "pmjay_claims_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pmjay_claims_patientId_fkey') THEN
    ALTER TABLE "pmjay_claims" ADD CONSTRAINT "pmjay_claims_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
