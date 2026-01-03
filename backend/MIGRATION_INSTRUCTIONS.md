# Migration Instructions for Billing Integration

## Current Status

The billing integration code has been implemented, but the database schema changes cannot be applied yet because there are pending migrations that need to be applied first.

## Steps to Apply

### 1. Apply Pending Migrations

Before applying the billing integration migration, you need to apply the pending migrations:

```bash
cd /Users/sudipto/Desktop/projects/hospitalerp/backend

# Apply all pending migrations
npx prisma migrate deploy
```

OR if you're in development:

```bash
npx prisma migrate dev
```

This will apply these pending migrations:
- 20251205093844_add_master_data_and_modules
- 20251206045747_add_broker_accounts_doctor_systems
- 20251206065445_add_appointments
- 20251212033828_complete_all_modules

### 2. Create and Apply Billing Integration Migration

After the pending migrations are applied, create the billing integration migration:

```bash
# Create the migration
npx prisma migrate dev --name add_billing_to_orders
```

This will:
1. Create a new migration file
2. Add the following columns to the `orders` table:
   - `admissionId` (String, nullable) - Links order to IPD admission
   - `billingStatus` (String, default 'unbilled') - Tracks billing state
   - `invoiceId` (String, nullable) - Links order to invoice
   - `chargeAmount` (Decimal, nullable) - Stores the charge amount

### 3. Verify Migration

After applying, verify the schema is correct:

```bash
npx prisma db pull
```

Check that the `Order` model in `schema.prisma` has the new fields.

## Alternative: Manual SQL Migration

If you prefer to apply the migration manually, here's the SQL:

```sql
-- Add billing fields to orders table
ALTER TABLE "orders" ADD COLUMN "admissionId" TEXT;
ALTER TABLE "orders" ADD COLUMN "billingStatus" TEXT NOT NULL DEFAULT 'unbilled';
ALTER TABLE "orders" ADD COLUMN "invoiceId" TEXT;
ALTER TABLE "orders" ADD COLUMN "chargeAmount" DECIMAL(10,2);

-- Add index for faster lookups
CREATE INDEX "orders_admissionId_idx" ON "orders"("admissionId");
CREATE INDEX "orders_billingStatus_idx" ON "orders"("billingStatus");
CREATE INDEX "orders_invoiceId_idx" ON "orders"("invoiceId");
```

Then mark the migration as applied:

```bash
npx prisma migrate resolve --applied add_billing_to_orders
```

## Post-Migration Steps

After the migration is complete:

1. **Register Billing Routes**: Add to `server.ts`
   ```typescript
   import billingRoutes from './routes/billing';
   app.use('/api/billing', billingRoutes);
   ```

2. **Apply Radiology Order Patch**: Follow instructions in `src/routes/orders-patch.ts`

3. **Update Invoice Payment Handler**: Add call to `markOrdersAsPaid()` when invoices are paid

4. **Test the Integration**: Follow the testing steps in `BILLING_INTEGRATION_GUIDE.md`

## Files Modified

- `/Users/sudipto/Desktop/projects/hospitalerp/backend/prisma/schema.prisma`
- `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/server.ts`
- `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/validators/index.ts`
- `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/routes/index.ts`

## Files Created

- `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/services/billing.ts`
- `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/routes/billing.ts`
- `/Users/sudipto/Desktop/projects/hospitalerp/backend/src/routes/orders-patch.ts`
- `/Users/sudipto/Desktop/projects/hospitalerp/backend/BILLING_INTEGRATION_GUIDE.md`
- `/Users/sudipto/Desktop/projects/hospitalerp/backend/MIGRATION_INSTRUCTIONS.md`

## Troubleshooting

### Issue: Migration fails with "table does not exist"
**Solution**: Apply pending migrations first using `npx prisma migrate deploy`

### Issue: "Shadow database" error
**Solution**: This is normal in development. Use `npx prisma migrate dev` instead

### Issue: Changes not reflecting
**Solution**: Regenerate Prisma Client:
```bash
npx prisma generate
```

## Rollback (if needed)

If you need to rollback the billing integration:

```sql
ALTER TABLE "orders" DROP COLUMN "admissionId";
ALTER TABLE "orders" DROP COLUMN "billingStatus";
ALTER TABLE "orders" DROP COLUMN "invoiceId";
ALTER TABLE "orders" DROP COLUMN "chargeAmount";
```

Then remove the migration from `prisma/migrations/` and restore the schema.prisma file.
