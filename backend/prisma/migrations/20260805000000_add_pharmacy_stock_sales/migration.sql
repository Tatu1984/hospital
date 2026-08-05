-- New table: batch-level pharmacy stock for a Drug.
CREATE TABLE "drug_stocks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "purchasePrice" DECIMAL(10,2) NOT NULL,
    "mrp" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drug_stocks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "drug_stocks_tenantId_idx" ON "drug_stocks"("tenantId");
CREATE INDEX "drug_stocks_drugId_idx" ON "drug_stocks"("drugId");

ALTER TABLE "drug_stocks" ADD CONSTRAINT "drug_stocks_drugId_fkey"
    FOREIGN KEY ("drugId") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- pharmacy_sales / pharmacy_sale_items already exist from a prior
-- (reverted) migration and are empty — add the one missing column
-- (tenantId) plus the matching indexes needed by the Prisma model.
ALTER TABLE "pharmacy_sales" ADD COLUMN "tenantId" TEXT NOT NULL;
CREATE INDEX "pharmacy_sales_tenantId_idx" ON "pharmacy_sales"("tenantId");

CREATE INDEX "pharmacy_sale_items_saleId_idx" ON "pharmacy_sale_items"("saleId");
