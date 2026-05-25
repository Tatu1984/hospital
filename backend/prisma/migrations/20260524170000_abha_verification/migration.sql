-- ABHA verification fields on Patient. abhaLinkedAt was already there
-- (set when staff entered the number); abhaVerifiedAt is the new source
-- of truth for "actually verified against the NHA gateway via OTP".
-- Idempotent.

ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "abhaVerifiedAt"   TIMESTAMP(3);
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "abhaVerifiedBy"   TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "abhaVerifyMethod" TEXT;
