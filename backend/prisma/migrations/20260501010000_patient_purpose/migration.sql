-- Promote 'purpose-of-visit' from a hack inside `allergies` to its own column.
-- Backfill: anything in allergies that starts with 'Purpose:' moves to the
-- new column; the leftover allergies text is preserved (Allergies: + Chronic:
-- prefixes stay if present).

ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "purpose" TEXT;

-- Backfill the new column from the legacy "Purpose:" prefix in allergies.
-- Match captures everything between "Purpose:" and the next newline (or end).
UPDATE "patients"
SET "purpose" = TRIM(BOTH FROM SUBSTRING("allergies" FROM 'Purpose:\s*([^\n]+)'))
WHERE "allergies" ~* 'Purpose:\s*[^\n]+'
  AND ("purpose" IS NULL OR "purpose" = '');

-- Strip the "Purpose: ..." line from allergies once it's been moved out.
UPDATE "patients"
SET "allergies" = TRIM(BOTH FROM REGEXP_REPLACE("allergies", 'Purpose:\s*[^\n]*\n?', '', 'gi'))
WHERE "allergies" ~* 'Purpose:\s*[^\n]+';

-- Empty strings → NULL for tidiness
UPDATE "patients" SET "allergies" = NULL WHERE "allergies" = '';
