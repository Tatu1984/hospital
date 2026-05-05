-- OT live-status feature.
-- Adds:
--   1. surgeries.currentStage (free-text canonical code)
--   2. surgery_stage_events (append-only log per stage transition)
--   3. surgery_family_contacts (registered family members + tracking token)
--
-- All existing surgeries get currentStage = NULL; the staff UI treats that
-- as "no stages recorded yet" and the family tracker just shows the legacy
-- coarse status field. Fully backwards-compatible.

ALTER TABLE "surgeries" ADD COLUMN IF NOT EXISTS "currentStage" TEXT;

CREATE TABLE IF NOT EXISTS "surgery_stage_events" (
  "id"          TEXT NOT NULL,
  "tenantId"    TEXT NOT NULL,
  "surgeryId"   TEXT NOT NULL,
  "stage"       TEXT NOT NULL,
  "note"        TEXT,
  "recordedBy"  TEXT NOT NULL,
  "recordedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notifiedAt"  TIMESTAMP(3),
  CONSTRAINT "surgery_stage_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "surgery_stage_events_surgeryId_recordedAt_idx"
  ON "surgery_stage_events"("surgeryId", "recordedAt");
CREATE INDEX IF NOT EXISTS "surgery_stage_events_tenantId_idx"
  ON "surgery_stage_events"("tenantId");

ALTER TABLE "surgery_stage_events"
  ADD CONSTRAINT "surgery_stage_events_surgeryId_fkey"
  FOREIGN KEY ("surgeryId") REFERENCES "surgeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "surgery_family_contacts" (
  "id"            TEXT NOT NULL,
  "tenantId"      TEXT NOT NULL,
  "surgeryId"     TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "relation"      TEXT NOT NULL,
  "phone"         TEXT NOT NULL,
  "whatsapp"      TEXT,
  "email"         TEXT,
  "trackingToken" TEXT NOT NULL,
  "channels"      TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "surgery_family_contacts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "surgery_family_contacts_trackingToken_key"
  ON "surgery_family_contacts"("trackingToken");
CREATE INDEX IF NOT EXISTS "surgery_family_contacts_surgeryId_idx"
  ON "surgery_family_contacts"("surgeryId");
CREATE INDEX IF NOT EXISTS "surgery_family_contacts_tenantId_idx"
  ON "surgery_family_contacts"("tenantId");

ALTER TABLE "surgery_family_contacts"
  ADD CONSTRAINT "surgery_family_contacts_surgeryId_fkey"
  FOREIGN KEY ("surgeryId") REFERENCES "surgeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
