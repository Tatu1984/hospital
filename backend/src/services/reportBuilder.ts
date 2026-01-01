/**
 * Report Builder Service
 *
 * Provides customizable reporting capabilities with dynamic query building,
 * data aggregation, and export functionality (Excel, PDF, CSV).
 */

import { PrismaClient, Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const prisma = new PrismaClient();

// Type definitions
export interface ReportColumn {
  field: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'between';
  value: any;
  defaultValue?: any;
}

export interface ReportSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ReportParameters {
  templateId: string;
  filters?: Record<string, any>;
  format?: 'excel' | 'pdf' | 'csv' | 'json';
  tenantId: string;
  generatedBy: string;
}

export interface QueryBuilderResult {
  sql: string;
  params: any[];
}

/**
 * Execute a report based on template ID and filters
 */
export async function executeReport(params: ReportParameters): Promise<any> {
  const { templateId, filters = {}, format = 'excel', tenantId, generatedBy } = params;

  // Fetch the template
  const template = await prisma.reportTemplate.findFirst({
    where: { id: templateId, tenantId, isActive: true }
  });

  if (!template) {
    throw new Error('Report template not found or inactive');
  }

  // Parse template configuration
  const columns = template.columns as unknown as ReportColumn[];
  const templateFilters = template.filters as unknown as ReportFilter[];
  const groupBy = template.groupBy as string[] | null;
  const sortBy = template.sortBy as ReportSort[] | null;

  // Build query
  const { query, countQuery } = buildQuery(
    template.dataSource,
    columns,
    templateFilters,
    filters,
    groupBy,
    sortBy,
    tenantId
  );

  // Execute query
  const data = await prisma.$queryRawUnsafe(query);
  const countResult: any = await prisma.$queryRawUnsafe(countQuery);
  const rowCount = parseInt(countResult[0]?.count || '0');

  // Export to requested format
  let filePath: string | null = null;
  if (format !== 'json') {
    filePath = await exportReport(data as any[], columns, template.name, format);
  }

  // Save generated report metadata
  const generatedReport = await prisma.generatedReport.create({
    data: {
      tenantId,
      templateId,
      name: template.name,
      parameters: filters as any,
      filePath,
      format,
      rowCount,
      generatedBy,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  });

  return {
    reportId: generatedReport.id,
    data: format === 'json' ? data : null,
    filePath,
    rowCount,
    generatedAt: generatedReport.generatedAt
  };
}

/**
 * Build dynamic SQL query based on template configuration
 */
function buildQuery(
  dataSource: string,
  columns: ReportColumn[],
  templateFilters: ReportFilter[],
  userFilters: Record<string, any>,
  groupBy: string[] | null,
  sortBy: ReportSort[] | null,
  tenantId: string
): { query: string; countQuery: string } {
  // Map data sources to table names
  const tableMap: Record<string, string> = {
    patients: 'patients',
    appointments: 'appointments',
    billing: 'invoices',
    payments: 'payments',
    lab_orders: 'orders',
    pharmacy_sales: 'pharmacy_sales',
    admissions: 'admissions',
    opd_encounters: 'encounters',
    employees: 'employees',
    attendance: 'attendance_logs',
    ipd_charges: 'ipd_charges',
    commissions: 'commissions',
    doctor_revenues: 'doctor_revenues'
  };

  const tableName = tableMap[dataSource] || dataSource;

  // Build SELECT clause
  let selectClause = columns
    .map(col => {
      if (col.aggregate) {
        return `${col.aggregate.toUpperCase()}("${col.field}") as "${col.label}"`;
      }
      return `"${col.field}" as "${col.label}"`;
    })
    .join(', ');

  // If groupBy, add to select
  if (groupBy && groupBy.length > 0) {
    const groupFields = groupBy.map(f => `"${f}"`).join(', ');
    selectClause = `${groupFields}, ${selectClause}`;
  }

  // Build WHERE clause
  const whereConditions: string[] = [`"tenantId" = '${tenantId}'`];

  // Apply template filters with user overrides
  templateFilters.forEach(filter => {
    const value = userFilters[filter.field] ?? filter.defaultValue;
    if (value !== undefined && value !== null) {
      const condition = buildFilterCondition(filter.field, filter.operator, value);
      if (condition) whereConditions.push(condition);
    }
  });

  const whereClause = whereConditions.length > 0
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  // Build GROUP BY clause
  const groupByClause = groupBy && groupBy.length > 0
    ? `GROUP BY ${groupBy.map(f => `"${f}"`).join(', ')}`
    : '';

  // Build ORDER BY clause
  const orderByClause = sortBy && sortBy.length > 0
    ? `ORDER BY ${sortBy.map(s => `"${s.field}" ${s.direction.toUpperCase()}`).join(', ')}`
    : '';

  // Construct final query
  const query = `
    SELECT ${selectClause}
    FROM "${tableName}"
    ${whereClause}
    ${groupByClause}
    ${orderByClause}
  `.trim();

  // Count query
  const countQuery = `
    SELECT COUNT(*) as count
    FROM "${tableName}"
    ${whereClause}
  `.trim();

  return { query, countQuery };
}

/**
 * Build filter condition for WHERE clause
 */
function buildFilterCondition(field: string, operator: string, value: any): string | null {
  const fieldName = `"${field}"`;

  switch (operator) {
    case 'eq':
      return typeof value === 'string'
        ? `${fieldName} = '${value}'`
        : `${fieldName} = ${value}`;
    case 'ne':
      return typeof value === 'string'
        ? `${fieldName} != '${value}'`
        : `${fieldName} != ${value}`;
    case 'gt':
      return `${fieldName} > ${typeof value === 'string' ? `'${value}'` : value}`;
    case 'gte':
      return `${fieldName} >= ${typeof value === 'string' ? `'${value}'` : value}`;
    case 'lt':
      return `${fieldName} < ${typeof value === 'string' ? `'${value}'` : value}`;
    case 'lte':
      return `${fieldName} <= ${typeof value === 'string' ? `'${value}'` : value}`;
    case 'contains':
      return `${fieldName} ILIKE '%${value}%'`;
    case 'in':
      const inValues = Array.isArray(value) ? value : [value];
      const inList = inValues.map(v => typeof v === 'string' ? `'${v}'` : v).join(', ');
      return `${fieldName} IN (${inList})`;
    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        const [start, end] = value;
        return `${fieldName} BETWEEN ${typeof start === 'string' ? `'${start}'` : start} AND ${typeof end === 'string' ? `'${end}'` : end}`;
      }
      return null;
    default:
      return null;
  }
}

/**
 * Export report data to specified format
 */
async function exportReport(
  data: any[],
  columns: ReportColumn[],
  reportName: string,
  format: 'excel' | 'pdf' | 'csv'
): Promise<string> {
  const reportsDir = join(process.cwd(), 'generated_reports');

  // Create directory if it doesn't exist
  try {
    await mkdir(reportsDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  const timestamp = Date.now();
  const fileName = `${reportName.replace(/[^a-z0-9]/gi, '_')}_${timestamp}`;

  switch (format) {
    case 'excel':
      return await exportToExcel(data, columns, fileName, reportsDir);
    case 'pdf':
      return await exportToPDF(data, columns, reportName, fileName, reportsDir);
    case 'csv':
      return await exportToCSV(data, columns, fileName, reportsDir);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * Export data to Excel format
 */
async function exportToExcel(
  data: any[],
  columns: ReportColumn[],
  fileName: string,
  dir: string
): Promise<string> {
  const filePath = join(dir, `${fileName}.xlsx`);

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(data);

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');

  // Write to file
  XLSX.writeFile(wb, filePath);

  return filePath;
}

/**
 * Export data to PDF format
 */
async function exportToPDF(
  data: any[],
  columns: ReportColumn[],
  title: string,
  fileName: string,
  dir: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const filePath = join(dir, `${fileName}.pdf`);
    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    const stream = createWriteStream(filePath);

    doc.pipe(stream);

    // Title
    doc.fontSize(16).text(title, { align: 'center' });
    doc.moveDown();

    // Date
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown();

    // Table header
    doc.fontSize(10);
    const columnWidth = 100;
    let x = 50;
    const headerY = doc.y;

    columns.forEach((col, i) => {
      doc.text(col.label, x, headerY, { width: columnWidth, align: 'left' });
      x += columnWidth;
    });

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Table rows
    data.forEach((row, rowIndex) => {
      if (doc.y > 500) {
        doc.addPage();
        doc.y = 50;
      }

      x = 50;
      const rowY = doc.y;
      columns.forEach((col, i) => {
        const value = row[col.label] !== undefined ? String(row[col.label]) : '';
        doc.text(value.substring(0, 30), x, rowY, { width: columnWidth, align: 'left' });
        x += columnWidth;
      });
      doc.moveDown(0.8);
    });

    // Footer
    doc.fontSize(8).text(`Total Records: ${data.length}`, 50, doc.page.height - 50);

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

/**
 * Export data to CSV format
 */
async function exportToCSV(
  data: any[],
  columns: ReportColumn[],
  fileName: string,
  dir: string
): Promise<string> {
  const filePath = join(dir, `${fileName}.csv`);

  // Create CSV content
  const headers = columns.map(col => col.label).join(',');
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col.label] !== undefined ? row[col.label] : '';
      // Escape commas and quotes
      return typeof value === 'string' && (value.includes(',') || value.includes('"'))
        ? `"${value.replace(/"/g, '""')}"`
        : value;
    }).join(',')
  );

  const csv = [headers, ...rows].join('\n');

  // Write to file
  const fs = require('fs').promises;
  await fs.writeFile(filePath, csv, 'utf8');

  return filePath;
}

/**
 * Schedule a report to run automatically
 */
export async function scheduleReport(scheduleId: string): Promise<void> {
  const schedule = await prisma.reportSchedule.findUnique({
    where: { id: scheduleId },
    include: { template: true }
  });

  if (!schedule || !schedule.isActive) {
    throw new Error('Report schedule not found or inactive');
  }

  // Execute the report
  const filters = schedule.filters as Record<string, any> || {};

  await executeReport({
    templateId: schedule.templateId,
    filters,
    format: schedule.format as 'excel' | 'pdf' | 'csv',
    tenantId: schedule.template.tenantId,
    generatedBy: 'system'
  });

  // Update schedule
  await prisma.reportSchedule.update({
    where: { id: scheduleId },
    data: {
      lastRunAt: new Date(),
      nextRunAt: calculateNextRunTime(schedule.frequency, schedule.dayOfWeek, schedule.dayOfMonth, schedule.time)
    }
  });

  // TODO: Send email to recipients with the report
  // This would integrate with the notification service
}

/**
 * Calculate next run time for scheduled report
 */
function calculateNextRunTime(
  frequency: string,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  time: string
): Date {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const next = new Date(now);

  switch (frequency) {
    case 'daily':
      next.setHours(hours, minutes, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      break;

    case 'weekly':
      next.setHours(hours, minutes, 0, 0);
      const currentDay = next.getDay();
      const targetDay = dayOfWeek || 0;
      const daysUntilNext = (targetDay - currentDay + 7) % 7 || 7;
      next.setDate(next.getDate() + daysUntilNext);
      break;

    case 'monthly':
      next.setHours(hours, minutes, 0, 0);
      next.setDate(dayOfMonth || 1);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      break;

    default:
      next.setHours(hours, minutes, 0, 0);
  }

  return next;
}

/**
 * Get pre-built report templates
 */
export function getSystemReportTemplates(tenantId: string, createdBy: string) {
  return [
    {
      tenantId,
      name: 'Daily Patient Census',
      description: 'Daily count of patient registrations and visits',
      category: 'clinical',
      dataSource: 'patients',
      columns: [
        { field: 'createdAt::date', label: 'Date', type: 'date' },
        { field: 'id', label: 'Total Patients', type: 'number', aggregate: 'count' }
      ],
      filters: [
        { field: 'createdAt', operator: 'between', defaultValue: null }
      ],
      groupBy: ['createdAt::date'],
      sortBy: [{ field: 'createdAt::date', direction: 'desc' }],
      chartType: 'line',
      isSystem: true,
      createdBy
    },
    {
      tenantId,
      name: 'Monthly Revenue Summary',
      description: 'Total revenue collected by month',
      category: 'financial',
      dataSource: 'payments',
      columns: [
        { field: 'paidAt::date', label: 'Date', type: 'date' },
        { field: 'amount', label: 'Total Amount', type: 'number', aggregate: 'sum' },
        { field: 'mode', label: 'Payment Mode', type: 'string' }
      ],
      filters: [
        { field: 'paidAt', operator: 'between', defaultValue: null }
      ],
      groupBy: ['paidAt::date', 'mode'],
      sortBy: [{ field: 'paidAt::date', direction: 'desc' }],
      chartType: 'bar',
      isSystem: true,
      createdBy
    },
    {
      tenantId,
      name: 'OPD Statistics',
      description: 'OPD encounter statistics by date',
      category: 'clinical',
      dataSource: 'opd_encounters',
      columns: [
        { field: 'visitDate::date', label: 'Visit Date', type: 'date' },
        { field: 'id', label: 'Total Encounters', type: 'number', aggregate: 'count' },
        { field: 'status', label: 'Status', type: 'string' }
      ],
      filters: [
        { field: 'visitDate', operator: 'between', defaultValue: null },
        { field: 'type', operator: 'eq', defaultValue: 'opd' }
      ],
      groupBy: ['visitDate::date', 'status'],
      sortBy: [{ field: 'visitDate::date', direction: 'desc' }],
      chartType: 'table',
      isSystem: true,
      createdBy
    },
    {
      tenantId,
      name: 'IPD Occupancy Report',
      description: 'IPD bed occupancy statistics',
      category: 'operational',
      dataSource: 'admissions',
      columns: [
        { field: 'admissionDate::date', label: 'Admission Date', type: 'date' },
        { field: 'id', label: 'Total Admissions', type: 'number', aggregate: 'count' },
        { field: 'status', label: 'Status', type: 'string' }
      ],
      filters: [
        { field: 'admissionDate', operator: 'between', defaultValue: null }
      ],
      groupBy: ['admissionDate::date', 'status'],
      sortBy: [{ field: 'admissionDate::date', direction: 'desc' }],
      chartType: 'bar',
      isSystem: true,
      createdBy
    },
    {
      tenantId,
      name: 'Pharmacy Sales Report',
      description: 'Pharmacy sales summary',
      category: 'financial',
      dataSource: 'pharmacy_sales',
      columns: [
        { field: 'createdAt::date', label: 'Sale Date', type: 'date' },
        { field: 'total', label: 'Total Sales', type: 'number', aggregate: 'sum' },
        { field: 'paymentMode', label: 'Payment Mode', type: 'string' }
      ],
      filters: [
        { field: 'createdAt', operator: 'between', defaultValue: null }
      ],
      groupBy: ['createdAt::date', 'paymentMode'],
      sortBy: [{ field: 'createdAt::date', direction: 'desc' }],
      chartType: 'bar',
      isSystem: true,
      createdBy
    },
    {
      tenantId,
      name: 'Outstanding Dues Report',
      description: 'Invoices with pending balance',
      category: 'financial',
      dataSource: 'billing',
      columns: [
        { field: 'createdAt::date', label: 'Invoice Date', type: 'date' },
        { field: 'total', label: 'Total Amount', type: 'number', aggregate: 'sum' },
        { field: 'balance', label: 'Outstanding Balance', type: 'number', aggregate: 'sum' }
      ],
      filters: [
        { field: 'balance', operator: 'gt', defaultValue: 0 },
        { field: 'createdAt', operator: 'between', defaultValue: null }
      ],
      groupBy: ['createdAt::date'],
      sortBy: [{ field: 'createdAt::date', direction: 'desc' }],
      chartType: 'table',
      isSystem: true,
      createdBy
    },
    {
      tenantId,
      name: 'Doctor-wise Revenue',
      description: 'Revenue generated by each doctor',
      category: 'financial',
      dataSource: 'doctor_revenues',
      columns: [
        { field: 'doctorId', label: 'Doctor ID', type: 'string' },
        { field: 'revenueAmount', label: 'Total Revenue', type: 'number', aggregate: 'sum' },
        { field: 'shareAmount', label: 'Doctor Share', type: 'number', aggregate: 'sum' }
      ],
      filters: [
        { field: 'createdAt', operator: 'between', defaultValue: null },
        { field: 'status', operator: 'eq', defaultValue: 'approved' }
      ],
      groupBy: ['doctorId'],
      sortBy: [{ field: 'revenueAmount', direction: 'desc' }],
      chartType: 'pie',
      isSystem: true,
      createdBy
    },
    {
      tenantId,
      name: 'Commission Report',
      description: 'Referral commission summary',
      category: 'financial',
      dataSource: 'commissions',
      columns: [
        { field: 'createdAt::date', label: 'Date', type: 'date' },
        { field: 'referralSourceId', label: 'Referral Source', type: 'string' },
        { field: 'commissionAmount', label: 'Commission Amount', type: 'number', aggregate: 'sum' },
        { field: 'status', label: 'Status', type: 'string' }
      ],
      filters: [
        { field: 'createdAt', operator: 'between', defaultValue: null },
        { field: 'status', operator: 'in', defaultValue: ['pending', 'approved'] }
      ],
      groupBy: ['createdAt::date', 'referralSourceId', 'status'],
      sortBy: [{ field: 'createdAt::date', direction: 'desc' }],
      chartType: 'table',
      isSystem: true,
      createdBy
    },
    {
      tenantId,
      name: 'Employee Attendance Report',
      description: 'Employee attendance summary',
      category: 'hr',
      dataSource: 'attendance',
      columns: [
        { field: 'punchTime::date', label: 'Date', type: 'date' },
        { field: 'userId', label: 'Employee', type: 'string' },
        { field: 'punchType', label: 'Punch Type', type: 'string' },
        { field: 'id', label: 'Count', type: 'number', aggregate: 'count' }
      ],
      filters: [
        { field: 'punchTime', operator: 'between', defaultValue: null }
      ],
      groupBy: ['punchTime::date', 'userId', 'punchType'],
      sortBy: [{ field: 'punchTime::date', direction: 'desc' }],
      chartType: 'table',
      isSystem: true,
      createdBy
    }
  ];
}

/**
 * Clean up expired generated reports
 */
export async function cleanupExpiredReports(): Promise<number> {
  const fs = require('fs').promises;

  // Find expired reports
  const expiredReports = await prisma.generatedReport.findMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  });

  // Delete files
  for (const report of expiredReports) {
    if (report.filePath) {
      try {
        await fs.unlink(report.filePath);
      } catch (error) {
        console.error(`Failed to delete file: ${report.filePath}`, error);
      }
    }
  }

  // Delete database records
  const result = await prisma.generatedReport.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  });

  return result.count;
}
