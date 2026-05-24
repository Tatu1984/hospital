-- Phase 5: OPD queue/KIOSK + NPS + patient portal OTP/session. Idempotent.

CREATE TABLE IF NOT EXISTS "opd_tokens" (
  "id"               TEXT PRIMARY KEY,
  "tenantId"         TEXT NOT NULL,
  "branchId"         TEXT NOT NULL,
  "tokenNumber"      INTEGER NOT NULL,
  "displayCode"      TEXT NOT NULL,
  "patientId"        TEXT NOT NULL,
  "doctorId"         TEXT,
  "doctorName"       TEXT,
  "department"       TEXT,
  "status"           TEXT NOT NULL DEFAULT 'waiting',
  "issuedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "calledAt"         TIMESTAMP(3),
  "consultStartedAt" TIMESTAMP(3),
  "doneAt"           TIMESTAMP(3),
  "priority"         TEXT NOT NULL DEFAULT 'normal',
  "notes"            TEXT
);
CREATE INDEX IF NOT EXISTS "opd_tokens_tenantId_doctorId_issuedAt_idx" ON "opd_tokens" ("tenantId", "doctorId", "issuedAt");
CREATE INDEX IF NOT EXISTS "opd_tokens_tenantId_status_idx"             ON "opd_tokens" ("tenantId", "status");

CREATE TABLE IF NOT EXISTS "nps_responses" (
  "id"          TEXT PRIMARY KEY,
  "tenantId"    TEXT NOT NULL,
  "patientId"   TEXT,
  "encounterId" TEXT,
  "admissionId" TEXT,
  "source"      TEXT NOT NULL,
  "score"       INTEGER NOT NULL,
  "comment"     TEXT,
  "ratings"     JSONB,
  "category"    TEXT,
  "contact"     TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "nps_responses_tenantId_submittedAt_idx" ON "nps_responses" ("tenantId", "submittedAt");
CREATE INDEX IF NOT EXISTS "nps_responses_tenantId_source_idx"      ON "nps_responses" ("tenantId", "source");

CREATE TABLE IF NOT EXISTS "patient_otps" (
  "id"        TEXT PRIMARY KEY,
  "tenantId"  TEXT NOT NULL,
  "phone"     TEXT NOT NULL,
  "codeHash"  TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt"    TIMESTAMP(3),
  "attempts"  INTEGER NOT NULL DEFAULT 0,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "patient_otps_tenantId_phone_createdAt_idx" ON "patient_otps" ("tenantId", "phone", "createdAt");

CREATE TABLE IF NOT EXISTS "patient_portal_sessions" (
  "id"         TEXT PRIMARY KEY,
  "tenantId"   TEXT NOT NULL,
  "patientId"  TEXT NOT NULL,
  "tokenHash"  TEXT NOT NULL UNIQUE,
  "issuedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"  TIMESTAMP(3) NOT NULL,
  "revokedAt"  TIMESTAMP(3),
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "patient_portal_sessions_tenantId_patientId_idx" ON "patient_portal_sessions" ("tenantId", "patientId");
