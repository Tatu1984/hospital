-- Invoice and Order have no direct tenantId (scoped through Patient), and
-- until now carried zero indexes despite being filtered by patientId,
-- status/orderType, and sorted by createdAt/orderedAt in every billing and
-- lab/radiology order route (server.ts: /api/invoices, /api/bills,
-- /api/lab-orders, /api/radiology-orders, dashboard revenue aggregates).
-- Every one of those queries has been doing a full table scan.

CREATE INDEX IF NOT EXISTS "orders_patientId_idx" ON "orders"("patientId");
CREATE INDEX IF NOT EXISTS "orders_orderType_idx" ON "orders"("orderType");
CREATE INDEX IF NOT EXISTS "orders_orderedAt_idx" ON "orders"("orderedAt");

CREATE INDEX IF NOT EXISTS "invoices_patientId_idx" ON "invoices"("patientId");
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "invoices"("status");
CREATE INDEX IF NOT EXISTS "invoices_createdAt_idx" ON "invoices"("createdAt");
