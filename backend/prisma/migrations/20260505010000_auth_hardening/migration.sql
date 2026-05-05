-- Auth hardening: per-account lockout state + refresh-token blacklist.
--
-- 1. users.failedLoginAttempts + users.lockedUntil
--    Added so a bad-password storm against a single account triggers an
--    auto-lockout instead of relying purely on the per-IP rate limiter
--    (which a botnet on different IPs trivially bypasses).
--
-- 2. token_blacklist
--    Logout adds the SHA-256 hash of the refresh token; /auth/refresh
--    checks before issuing a new access token. Storing only the hash
--    means a DB dump can't be used to mint new sessions. Cleanup job
--    deletes rows past expiresAt.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "token_blacklist" (
  "id"        TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId"    TEXT,
  "reason"    TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "token_blacklist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "token_blacklist_tokenHash_key" ON "token_blacklist"("tokenHash");
CREATE INDEX IF NOT EXISTS "token_blacklist_expiresAt_idx" ON "token_blacklist"("expiresAt");
CREATE INDEX IF NOT EXISTS "token_blacklist_userId_idx" ON "token_blacklist"("userId");
