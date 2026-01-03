# Database Migration Guide - Anesthesia Records

## Prerequisites

Before running the migration, ensure:
1. You have a backup of your database
2. Node.js and npm are installed
3. Prisma CLI is available
4. Database connection is configured in `.env`

## Migration Steps

### Step 1: Review Schema Changes

The following models have been added/modified:

**New Models:**
- `AnesthesiaRecord` - Comprehensive anesthesia documentation
- `SurgeryComplication` - Track surgical complications
- `SurgeryImplant` - Track implants and devices used

**Modified Models:**
- `Surgery` - Added `preOpChecklistDetails` field and relations

### Step 2: Generate Migration

```bash
# Navigate to backend directory
cd /Users/sudipto/Desktop/projects/hospitalerp/backend

# Generate Prisma migration
npx prisma migrate dev --name add_anesthesia_records
```

This will:
1. Create migration SQL files in `prisma/migrations/`
2. Apply the migration to your development database
3. Regenerate Prisma Client with new models

### Step 3: Review Generated SQL

Check the generated migration file in `prisma/migrations/` to ensure:
- Tables are created with correct columns
- Indexes are added properly
- Foreign key constraints are correct
- No data loss will occur

### Step 4: Apply to Production (When Ready)

```bash
# For production deployment
npx prisma migrate deploy
```

Or if using a separate database URL:

```bash
DATABASE_URL="your-production-db-url" npx prisma migrate deploy
```

## Rollback Plan

If you need to rollback the migration:

```bash
# Rollback last migration
npx prisma migrate resolve --rolled-back <migration_name>
```

Then manually drop the tables:

```sql
DROP TABLE IF EXISTS "surgery_implants";
DROP TABLE IF EXISTS "surgery_complications";
DROP TABLE IF EXISTS "anesthesia_records";

-- Revert Surgery table changes
ALTER TABLE "surgeries" DROP COLUMN IF EXISTS "preOpChecklistDetails";
```

## Verification

After migration, verify the tables:

```bash
# Open Prisma Studio to inspect
npx prisma studio
```

Or run a quick query:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('anesthesia_records', 'surgery_complications', 'surgery_implants');
```

## Testing

1. Start the server:
```bash
npm run dev
```

2. Test the new endpoints:
```bash
# Health check
curl http://localhost:4000/api/health

# Check if routes are loaded (should return 401 without token)
curl http://localhost:4000/api/surgeries/test-id/anesthesia
```

3. Use the example data in `/examples/anesthesia_examples.json` for testing

## Production Deployment Checklist

- [ ] Database backup completed
- [ ] Migration tested in staging environment
- [ ] All existing surgeries verified to work
- [ ] New endpoints tested with sample data
- [ ] Error handling verified
- [ ] Logging confirmed working
- [ ] Documentation updated
- [ ] Frontend team notified of new endpoints
- [ ] Rollback plan prepared

## Expected Database Changes

### New Tables Created

1. **anesthesia_records**
   - Primary key: `id` (UUID)
   - Unique constraint: `surgeryId`
   - Foreign key: `surgeryId` → `surgeries.id`
   - Columns: 15+ including JSON fields for flexible data

2. **surgery_complications**
   - Primary key: `id` (UUID)
   - Foreign key: `surgeryId` → `surgeries.id`
   - Index: `surgeryId`

3. **surgery_implants**
   - Primary key: `id` (UUID)
   - Foreign key: `surgeryId` → `surgeries.id`
   - Index: `surgeryId`

### Modified Tables

1. **surgeries**
   - Added: `preOpChecklistDetails` (JSON, nullable)

## Common Issues & Solutions

### Issue: Migration fails with "column already exists"

**Solution:** Check if a previous partial migration was applied. Drop the column manually or skip to next migration.

```sql
ALTER TABLE surgeries DROP COLUMN IF EXISTS "preOpChecklistDetails";
```

### Issue: Foreign key constraint fails

**Solution:** Ensure no orphaned records exist. Clean up any surgeries with invalid references.

```sql
-- Check for orphaned records
SELECT id FROM surgeries WHERE id NOT IN (SELECT DISTINCT surgeryId FROM anesthesia_records WHERE surgeryId IS NOT NULL);
```

### Issue: Prisma Client generation fails

**Solution:** Clear Prisma cache and regenerate:

```bash
npx prisma generate --force
```

## Data Migration (If Existing Data)

If you have existing surgery data that needs to be migrated:

```sql
-- Example: Migrate existing complications from JSON field to new table
INSERT INTO surgery_complications (id, "surgeryId", type, description, severity, "managementDone", outcome, "reportedBy", "reportedAt")
SELECT
  gen_random_uuid(),
  id,
  'postoperative',
  complications,
  'minor',
  'See surgery notes',
  'See surgery notes',
  'system',
  "createdAt"
FROM surgeries
WHERE complications IS NOT NULL AND complications != '';

-- Example: Migrate existing implants from JSON field to new table
-- (Add your specific migration logic based on your JSON structure)
```

## Performance Considerations

The new tables include indexes on:
- `anesthesia_records.surgeryId` (unique)
- `surgery_complications.surgeryId`
- `surgery_implants.surgeryId`

These ensure efficient queries. Monitor query performance after deployment.

## Support

If you encounter issues during migration:

1. Check Prisma logs: `npx prisma migrate status`
2. Review migration history: `SELECT * FROM _prisma_migrations;`
3. Contact development team with error details
4. Have database backup ready for rollback

## Next Steps

After successful migration:

1. Update frontend to use new endpoints
2. Train staff on new anesthesia record features
3. Set up automated backups for critical anesthesia data
4. Configure monitoring and alerting
5. Review and optimize query performance

---

**Last Updated:** 2024-12-31
**Migration Version:** add_anesthesia_records
**Database:** PostgreSQL
**Prisma Version:** Latest
