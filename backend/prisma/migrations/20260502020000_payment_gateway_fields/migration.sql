-- Razorpay (and future gateway) bookkeeping on the Payment row.
-- All four columns are nullable — manual cash/card-at-counter payments
-- leave them null, only online gateway-handled payments populate them.

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "gateway"          TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "gatewayOrderId"   TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "gatewayPaymentId" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "gatewaySignature" TEXT;

-- Lookup paths for the verify + webhook handlers.
CREATE INDEX IF NOT EXISTS "payments_gatewayOrderId_idx"   ON "payments"("gatewayOrderId");
CREATE INDEX IF NOT EXISTS "payments_gatewayPaymentId_idx" ON "payments"("gatewayPaymentId");
