# Report Builder System - Setup Instructions

## Quick Setup Guide

Follow these steps to set up the Report Builder system in your Hospital ERP:

### 1. Database Migration

Run the Prisma migration to create the required tables:

```bash
# Create and apply migration
npx prisma migrate dev --name add_report_builder_system

# If migration already exists, just apply it
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

This will create three new tables:
- `report_templates` - Stores report configurations
- `report_schedules` - Stores scheduled report configurations
- `generated_reports` - Stores metadata for generated reports
- `radiology_studies` - Stores radiology study records (required relation)

### 2. Create Reports Directory

The system stores generated reports in a directory. Create it:

```bash
mkdir -p generated_reports
```

Or it will be created automatically on first report generation.

### 3. Seed System Templates

Seed the 9 pre-built report templates:

**Option A: Via API (Recommended)**
```bash
curl -X POST http://localhost:4000/api/reports/system/seed \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Option B: Via Script**
```typescript
import { PrismaClient } from '@prisma/client';
import { seedReportTemplates } from './src/seeds/reportTemplates';

const prisma = new PrismaClient();

async function seed() {
  const tenant = await prisma.tenant.findFirst();
  const admin = await prisma.user.findFirst({ where: { username: 'admin' } });

  if (tenant && admin) {
    await seedReportTemplates(tenant.id, admin.id);
    console.log('Report templates seeded successfully!');
  }
}

seed();
```

### 4. Start Background Jobs (Production Only)

In your server startup (for production deployment):

```typescript
// In src/server.ts or your main entry point
import { startReportScheduler, startCleanupJob } from './src/jobs/reportScheduler';

// After server initialization
if (process.env.NODE_ENV === 'production') {
  startReportScheduler(); // Runs every 15 minutes
  startCleanupJob();      // Runs daily at 2 AM
}
```

**Note**: For serverless deployments (Vercel), use a separate cron service or external scheduler.

### 5. Configure Environment (Optional)

Add these optional environment variables:

```env
# Report Generation
REPORTS_DIR=generated_reports
REPORTS_RETENTION_DAYS=7

# Email Configuration (for scheduled reports)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Hospital ERP <noreply@hospital.com>
```

### 6. Test the System

#### Test 1: List Templates
```bash
curl http://localhost:4000/api/reports/templates \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Test 2: Generate a Report
```bash
curl -X POST http://localhost:4000/api/reports/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "TEMPLATE_ID",
    "filters": {
      "createdAt": ["2024-01-01", "2024-12-31"]
    },
    "format": "excel"
  }'
```

#### Test 3: Download Report
```bash
curl http://localhost:4000/api/reports/generated/REPORT_ID/download \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output report.xlsx
```

### 7. Add Permissions to Roles

Update your RBAC configuration to grant report permissions:

```typescript
// Example: Grant all report permissions to Admin role
const adminRole = {
  name: 'Admin',
  permissions: [
    // ... existing permissions
    'reports:view',
    'reports:create',
    'reports:edit',
    'reports:delete',
    'reports:generate',
    'reports:schedule'
  ]
};

// Example: Grant view and generate to Managers
const managerRole = {
  name: 'Manager',
  permissions: [
    // ... existing permissions
    'reports:view',
    'reports:generate'
  ]
};
```

## Verification Checklist

- [ ] Prisma migration completed successfully
- [ ] `generated_reports` directory exists
- [ ] System templates seeded (9 templates)
- [ ] Can list templates via API
- [ ] Can generate a test report
- [ ] Can download generated report
- [ ] Background jobs started (production)
- [ ] Permissions configured for roles
- [ ] Email configuration tested (if using schedules)

## Common Issues

### Migration Fails
- Ensure PostgreSQL is running
- Check database connection string
- Verify no conflicting table names
- Check Prisma version compatibility

### Templates Not Showing
- Verify seeding completed
- Check tenant ID matches
- Ensure `isActive: true` and correct tenantId filter

### Report Generation Fails
- Check database permissions
- Verify data exists in source tables
- Review server logs for SQL errors
- Ensure required columns exist

### File Download Issues
- Verify `generated_reports` directory exists
- Check file system permissions
- Ensure report hasn't expired (7 day default)

### Scheduled Reports Not Running
- Verify cron jobs started
- Check `nextRunAt` timestamps are in future
- Ensure schedules are active
- Review background job logs

## Next Steps

1. **Customize Templates**: Create custom report templates for your specific needs
2. **Schedule Reports**: Set up automated daily/weekly/monthly reports
3. **Dashboard Integration**: Display key reports on dashboard
4. **Email Configuration**: Configure SMTP for scheduled report delivery
5. **Performance Tuning**: Add indexes on frequently queried columns
6. **User Training**: Train staff on report builder usage

## Support

For issues or questions:
1. Check the main documentation: `REPORT_BUILDER_DOCUMENTATION.md`
2. Review server logs: `logs/combined.log`
3. Check Prisma logs for database issues
4. Verify API permissions and authentication

## Files Created

This setup includes the following files:

### Core Files
- `/prisma/schema.prisma` - Database models (updated)
- `/src/services/reportBuilder.ts` - Report generation service
- `/src/routes/reports.ts` - API endpoints
- `/src/seeds/reportTemplates.ts` - Template seed data
- `/src/jobs/reportScheduler.ts` - Background jobs

### Documentation
- `/REPORT_BUILDER_DOCUMENTATION.md` - Complete documentation
- `/REPORT_BUILDER_SETUP.md` - This setup guide

### Directories
- `/generated_reports/` - Storage for generated report files

Happy reporting!
