-- Plug-and-play scanner support: barcode + RFID tag columns on Drug.
-- Both nullable; existing rows are unaffected. Unique-when-set so a single
-- physical tag never resolves to two drugs.

ALTER TABLE "drugs" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
ALTER TABLE "drugs" ADD COLUMN IF NOT EXISTS "rfidTag" TEXT;

-- Partial unique indexes — null rows are allowed to repeat (Postgres treats
-- NULLs as distinct by default, but being explicit makes the intent clear
-- and matches Prisma's expectation for `String? @unique`).
CREATE UNIQUE INDEX IF NOT EXISTS "drugs_barcode_key" ON "drugs"("barcode") WHERE "barcode" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "drugs_rfidTag_key" ON "drugs"("rfidTag") WHERE "rfidTag" IS NOT NULL;
