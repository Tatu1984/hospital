-- Adds equipment manifest + free-text notes to ambulance_vehicles.
-- equipment is a JSONB array of canonical equipment codes (see
-- backend/src/shared/ambulanceTypes.ts) so dispatch can match a trip's
-- needs (defibrillator / ventilator / incubator) against the kit each
-- vehicle actually carries. notes is a free-form column for service
-- annotations like "battery replaced 2026-03" or custom fit-out details.
--
-- IF NOT EXISTS makes the migration safe to re-run on installs where the
-- columns were already added out-of-band (e.g. dev databases that got
-- manual ALTERs while iterating).

ALTER TABLE "ambulance_vehicles" ADD COLUMN IF NOT EXISTS "equipment" JSONB;
ALTER TABLE "ambulance_vehicles" ADD COLUMN IF NOT EXISTS "notes"     TEXT;
