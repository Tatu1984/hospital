-- Comprehensive user profile fields driven by admin user-management form.
--
-- phone + bloodGroup are first-class so admin-search-by-phone can hit a
-- B-tree index later if needed. Everything else (address, emergency
-- contact, KYC, education, licenses, banking, qualifications, etc.) lives
-- in the `profile` JSONB column — flexible enough to evolve the form
-- without a migration per field.
--
-- All three columns are nullable for back-compat; existing rows get NULL.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bloodGroup" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile" JSONB;
