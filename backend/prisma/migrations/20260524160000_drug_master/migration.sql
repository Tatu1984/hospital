-- Phase 6: DrugMaster catalog (CDSCO + NLEM seed). Idempotent.

CREATE TABLE IF NOT EXISTS "drug_master" (
  "id"                TEXT PRIMARY KEY,
  "genericName"       TEXT NOT NULL,
  "brandNames"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "manufacturer"      TEXT,
  "therapeuticClass"  TEXT NOT NULL,
  "atcCode"           TEXT,
  "strength"          TEXT,
  "form"              TEXT,
  "schedule"          TEXT NOT NULL DEFAULT '',
  "isEssential"       BOOLEAN NOT NULL DEFAULT FALSE,
  "hsnCode"           TEXT,
  "pregnancyCategory" TEXT,
  "indications"       TEXT,
  "contraindications" TEXT,
  "isActive"          BOOLEAN NOT NULL DEFAULT TRUE,
  "source"            TEXT NOT NULL DEFAULT 'manual',
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "drug_master_genericName_idx"
  ON "drug_master" ("genericName");
CREATE INDEX IF NOT EXISTS "drug_master_therapeuticClass_isActive_idx"
  ON "drug_master" ("therapeuticClass", "isActive");
CREATE INDEX IF NOT EXISTS "drug_master_isEssential_isActive_idx"
  ON "drug_master" ("isEssential", "isActive");

-- Trigram-style index for ILIKE search on generic + brand. Use the
-- pg_trgm extension when available; fall back silently otherwise.
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN insufficient_privilege THEN
  -- Managed Postgres (Neon etc.) restricts extension creation; skip.
  NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "drug_master_genericName_trgm_idx" ON "drug_master" USING GIN ("genericName" gin_trgm_ops)';
  END IF;
END $$;
