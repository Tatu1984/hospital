-- Schema/DB drift fix.
--
-- The Prisma schema has `branchId String?` on Employee, InventoryItem, and
-- PurchaseOrder — added in a schema edit that never produced a migration.
-- Result: every read of these tables crashes with Prisma P2022 ("column
-- does not exist") because the generated client tries to SELECT a column
-- the live DB doesn't have.
--
-- Affected endpoints in production:
--   - GET /api/hr/employees / /api/employees       → 500
--   - GET /api/inventory/items                     → 500
--   - GET /api/inventory/purchase-orders           → 500
--
-- Fix: ADD COLUMN IF NOT EXISTS for each. Nullable (the schema marks them
-- String?) so this is a zero-data-loss, zero-downtime migration. Idempotent
-- on installs that already happen to have the column.

ALTER TABLE "employees"        ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "inventory_items"  ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "purchase_orders"  ADD COLUMN IF NOT EXISTS "branchId" TEXT;
