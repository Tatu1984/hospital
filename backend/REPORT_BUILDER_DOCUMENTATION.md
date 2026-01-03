# Hospital ERP - Report Builder System

## Overview

The Report Builder system provides a comprehensive, customizable reporting solution for the Hospital ERP. It allows users to create, schedule, and export reports in multiple formats (Excel, PDF, CSV) with dynamic filtering, grouping, and aggregation capabilities.

## Features

- **Pre-built Report Templates**: 9 system templates covering clinical, financial, operational, and HR reports
- **Custom Report Builder**: Create custom reports with flexible column selection, filters, and aggregations
- **Multiple Export Formats**: Excel (.xlsx), PDF, and CSV exports
- **Scheduled Reports**: Automated report generation on daily, weekly, or monthly schedules
- **Email Distribution**: Send reports to multiple recipients automatically
- **Data Aggregation**: Support for SUM, AVG, COUNT, MIN, MAX aggregations
- **Dynamic Filtering**: Advanced filtering with operators (eq, ne, gt, gte, lt, lte, contains, in, between)
- **Grouping & Sorting**: Group by multiple fields and custom sort orders
- **Report History**: Track all generated reports with automatic cleanup

## Database Schema

### ReportTemplate
Stores report template configurations:
- `id`: UUID primary key
- `tenantId`: Tenant identifier
- `name`: Template name (unique per tenant)
- `description`: Optional description
- `category`: clinical | financial | operational | hr
- `dataSource`: Source table (patients, appointments, billing, etc.)
- `columns`: JSON array of column definitions
- `filters`: JSON array of filter definitions
- `groupBy`: Optional JSON array of grouping fields
- `sortBy`: Optional JSON array of sort configurations
- `chartType`: bar | line | pie | table
- `isSystem`: Boolean flag for system templates
- `isActive`: Boolean flag for active status
- `createdBy`: User ID who created the template
- `createdAt`, `updatedAt`: Timestamps

### ReportSchedule
Stores scheduled report configurations:
- `id`: UUID primary key
- `templateId`: Reference to ReportTemplate
- `frequency`: daily | weekly | monthly
- `dayOfWeek`: 0-6 for weekly schedules
- `dayOfMonth`: 1-31 for monthly schedules
- `time`: HH:MM format (e.g., "08:00")
- `recipients`: Array of email addresses
- `format`: excel | pdf | csv
- `filters`: Optional JSON object with filter overrides
- `isActive`: Boolean flag
- `lastRunAt`, `nextRunAt`: Timestamps
- `createdAt`: Timestamp

### GeneratedReport
Stores metadata for generated reports:
- `id`: UUID primary key
- `tenantId`: Tenant identifier
- `templateId`: Reference to ReportTemplate
- `name`: Report name
- `parameters`: JSON object with applied filters
- `filePath`: Path to generated file
- `format`: excel | pdf | csv | json
- `rowCount`: Number of rows in report
- `generatedBy`: User ID or 'system'
- `generatedAt`: Generation timestamp
- `expiresAt`: Expiration timestamp (default: 7 days)

## API Endpoints

### Template Management

#### GET /api/reports/templates
List all report templates
- **Query Parameters**:
  - `category`: Filter by category
  - `search`: Search in name/description
- **Returns**: Array of templates

#### GET /api/reports/templates/:id
Get template details
- **Returns**: Full template configuration

#### POST /api/reports/templates
Create custom report template
- **Body**: Template configuration (see schema below)
- **Returns**: Created template

#### PUT /api/reports/templates/:id
Update report template (system templates cannot be modified)
- **Body**: Updated template configuration
- **Returns**: Updated template

#### DELETE /api/reports/templates/:id
Deactivate report template (soft delete, system templates cannot be deleted)
- **Returns**: Success message

### Report Generation

#### POST /api/reports/generate
Generate a report
- **Body**:
  ```json
  {
    "templateId": "uuid",
    "filters": {
      "createdAt": ["2024-01-01", "2024-12-31"],
      "status": "active"
    },
    "format": "excel" // excel | pdf | csv | json
  }
  ```
- **Returns**:
  ```json
  {
    "reportId": "uuid",
    "rowCount": 150,
    "filePath": "/path/to/file.xlsx",
    "data": [...], // Only if format is 'json'
    "generatedAt": "2024-12-31T10:00:00Z",
    "downloadUrl": "/api/reports/generated/uuid/download"
  }
  ```

#### GET /api/reports/generated
List generated reports
- **Query Parameters**:
  - `templateId`: Filter by template
  - `limit`: Results per page (default: 20)
  - `offset`: Pagination offset (default: 0)
- **Returns**: Array of generated reports with pagination info

#### GET /api/reports/generated/:id/download
Download generated report file
- **Returns**: File stream with appropriate Content-Type and Content-Disposition headers

### Schedule Management

#### POST /api/reports/schedule
Create report schedule
- **Body**:
  ```json
  {
    "templateId": "uuid",
    "frequency": "daily", // daily | weekly | monthly
    "dayOfWeek": 1, // 0-6 for weekly (optional)
    "dayOfMonth": 1, // 1-31 for monthly (optional)
    "time": "08:00", // HH:MM format
    "recipients": ["user@example.com"],
    "format": "excel", // excel | pdf | csv
    "filters": {} // Optional filter overrides
  }
  ```
- **Returns**: Created schedule

#### GET /api/reports/schedules
List report schedules
- **Query Parameters**:
  - `templateId`: Filter by template
  - `isActive`: Filter by active status
- **Returns**: Array of schedules with template info

#### PUT /api/reports/schedules/:id
Update report schedule
- **Body**: Updated schedule configuration
- **Returns**: Updated schedule

#### DELETE /api/reports/schedules/:id
Delete report schedule
- **Returns**: Success message

### System Operations

#### POST /api/reports/system/seed
Seed system report templates (admin only)
- **Returns**: Number of templates created

#### POST /api/reports/cleanup
Cleanup expired reports (admin only)
- **Returns**: Number of reports deleted

## Pre-built Report Templates

### 1. Daily Patient Census
- **Category**: Clinical
- **Description**: Daily count of patient registrations and visits
- **Data Source**: Patients
- **Columns**: Date, Total Patients (count)
- **Group By**: Date
- **Chart Type**: Line

### 2. Monthly Revenue Summary
- **Category**: Financial
- **Description**: Total revenue collected by month
- **Data Source**: Payments
- **Columns**: Date, Total Amount (sum), Payment Mode
- **Group By**: Date, Payment Mode
- **Chart Type**: Bar

### 3. OPD Statistics
- **Category**: Clinical
- **Description**: OPD encounter statistics by date
- **Data Source**: Encounters
- **Columns**: Visit Date, Total Encounters (count), Status
- **Group By**: Visit Date, Status
- **Chart Type**: Table

### 4. IPD Occupancy Report
- **Category**: Operational
- **Description**: IPD bed occupancy statistics
- **Data Source**: Admissions
- **Columns**: Admission Date, Total Admissions (count), Status
- **Group By**: Admission Date, Status
- **Chart Type**: Bar

### 5. Pharmacy Sales Report
- **Category**: Financial
- **Description**: Pharmacy sales summary
- **Data Source**: Pharmacy Sales
- **Columns**: Sale Date, Total Sales (sum), Payment Mode
- **Group By**: Sale Date, Payment Mode
- **Chart Type**: Bar

### 6. Outstanding Dues Report
- **Category**: Financial
- **Description**: Invoices with pending balance
- **Data Source**: Invoices
- **Columns**: Invoice Date, Total Amount (sum), Outstanding Balance (sum)
- **Filter**: Balance > 0
- **Chart Type**: Table

### 7. Doctor-wise Revenue
- **Category**: Financial
- **Description**: Revenue generated by each doctor
- **Data Source**: Doctor Revenues
- **Columns**: Doctor ID, Total Revenue (sum), Doctor Share (sum)
- **Group By**: Doctor ID
- **Chart Type**: Pie

### 8. Commission Report
- **Category**: Financial
- **Description**: Referral commission summary
- **Data Source**: Commissions
- **Columns**: Date, Referral Source, Commission Amount (sum), Status
- **Group By**: Date, Referral Source, Status
- **Chart Type**: Table

### 9. Employee Attendance Report
- **Category**: HR
- **Description**: Employee attendance summary
- **Data Source**: Attendance Logs
- **Columns**: Date, Employee, Punch Type, Count
- **Group By**: Date, Employee, Punch Type
- **Chart Type**: Table

## Template Configuration Schema

```typescript
interface ReportTemplate {
  name: string;
  description?: string;
  category: 'clinical' | 'financial' | 'operational' | 'hr';
  dataSource: string; // Table name
  columns: ReportColumn[];
  filters: ReportFilter[];
  groupBy?: string[];
  sortBy?: ReportSort[];
  chartType?: 'bar' | 'line' | 'pie' | 'table';
}

interface ReportColumn {
  field: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

interface ReportFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'between';
  defaultValue?: any;
}

interface ReportSort {
  field: string;
  direction: 'asc' | 'desc';
}
```

## Data Sources

Supported data sources:
- `patients`: Patient records
- `appointments`: Appointment records
- `billing`: Invoice records
- `payments`: Payment records
- `lab_orders`: Lab order records
- `pharmacy_sales`: Pharmacy sales records
- `admissions`: Admission records
- `opd_encounters`: OPD encounter records
- `employees`: Employee records
- `attendance`: Attendance logs
- `ipd_charges`: IPD charge records
- `commissions`: Commission records
- `doctor_revenues`: Doctor revenue records

## Scheduled Reports

### Cron Jobs

The system includes two cron jobs:

1. **Report Scheduler** (`src/jobs/reportScheduler.ts`)
   - Runs every 15 minutes
   - Checks for due scheduled reports
   - Executes reports and updates next run time
   - Sends email notifications to recipients

2. **Cleanup Job**
   - Runs daily at 2 AM
   - Deletes expired reports (older than 7 days)
   - Cleans up associated files

### Email Integration

To enable email delivery for scheduled reports:
1. Configure SMTP settings in environment variables
2. Integrate with the notification service
3. Customize email templates in `src/services/notification.ts`

## File Storage

Generated reports are stored in:
- **Directory**: `generated_reports/` (relative to project root)
- **Naming**: `{report_name}_{timestamp}.{extension}`
- **Retention**: 7 days (configurable via `expiresAt`)

## Security & Permissions

Required permissions:
- `reports:view` - View templates and generated reports
- `reports:create` - Create custom templates
- `reports:edit` - Edit custom templates
- `reports:delete` - Delete custom templates
- `reports:generate` - Generate reports
- `reports:schedule` - Create and manage schedules
- `master_data:edit` - Seed system templates and run cleanup

## Usage Examples

### Creating a Custom Report Template

```bash
POST /api/reports/templates
Content-Type: application/json

{
  "name": "Weekly Lab Orders",
  "description": "Lab orders grouped by week",
  "category": "clinical",
  "dataSource": "lab_orders",
  "columns": [
    {
      "field": "orderedAt::date",
      "label": "Order Date",
      "type": "date"
    },
    {
      "field": "id",
      "label": "Total Orders",
      "type": "number",
      "aggregate": "count"
    },
    {
      "field": "status",
      "label": "Status",
      "type": "string"
    }
  ],
  "filters": [
    {
      "field": "orderedAt",
      "operator": "between",
      "defaultValue": null
    },
    {
      "field": "status",
      "operator": "in",
      "defaultValue": ["pending", "completed"]
    }
  ],
  "groupBy": ["orderedAt::date", "status"],
  "sortBy": [
    {
      "field": "orderedAt::date",
      "direction": "desc"
    }
  ],
  "chartType": "bar"
}
```

### Generating a Report

```bash
POST /api/reports/generate
Content-Type: application/json

{
  "templateId": "550e8400-e29b-41d4-a716-446655440000",
  "filters": {
    "orderedAt": ["2024-12-01", "2024-12-31"],
    "status": ["completed"]
  },
  "format": "excel"
}
```

### Creating a Schedule

```bash
POST /api/reports/schedule
Content-Type: application/json

{
  "templateId": "550e8400-e29b-41d4-a716-446655440000",
  "frequency": "weekly",
  "dayOfWeek": 1,
  "time": "08:00",
  "recipients": [
    "manager@hospital.com",
    "reports@hospital.com"
  ],
  "format": "pdf",
  "filters": {
    "status": ["completed"]
  }
}
```

## Seeding System Templates

To seed the pre-built system templates:

```typescript
import { seedReportTemplates } from './src/seeds/reportTemplates';

// In your seed script:
await seedReportTemplates('tenant-id', 'admin-user-id');
```

Or via API:
```bash
POST /api/reports/system/seed
Authorization: Bearer {admin-token}
```

## Migration Guide

1. **Run Prisma Migration**:
   ```bash
   npx prisma migrate dev --name add_report_builder
   ```

2. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

3. **Seed System Templates**:
   ```bash
   npx tsx src/seeds/reportTemplates.ts
   # Or use the API endpoint
   ```

4. **Start Report Scheduler** (in production):
   ```typescript
   import { startReportScheduler, startCleanupJob } from './src/jobs/reportScheduler';

   startReportScheduler();
   startCleanupJob();
   ```

## Troubleshooting

### Reports not generating
- Check database connection
- Verify template configuration is valid
- Check server logs for errors
- Ensure required permissions are granted

### Scheduled reports not running
- Verify cron jobs are started
- Check `nextRunAt` timestamps
- Verify schedule is active (`isActive: true`)
- Check email configuration for delivery

### File download issues
- Verify file exists at `filePath`
- Check file permissions
- Ensure report hasn't expired
- Verify Content-Type headers

### Performance issues
- Add indexes on frequently filtered columns
- Limit date ranges for large datasets
- Use pagination for large result sets
- Consider caching frequently accessed reports

## Future Enhancements

- Dashboard widgets with real-time data
- Interactive chart builder UI
- Export to additional formats (Word, JSON, XML)
- Advanced analytics with data visualization
- Report sharing and collaboration
- Drill-down capabilities
- Custom SQL query builder
- API rate limiting for report generation
- Webhook notifications for scheduled reports
- Multi-language report templates
