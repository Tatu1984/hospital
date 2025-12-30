import * as XLSX from 'xlsx';
import { logger } from '../utils/logger';

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  formatter?: (value: any) => string;
}

interface ExportOptions {
  sheetName?: string;
  title?: string;
  dateFormat?: string;
}

class ExportService {
  /**
   * Export data to Excel buffer
   */
  toExcel(
    data: Record<string, any>[],
    columns: ExportColumn[],
    options: ExportOptions = {}
  ): Buffer {
    const { sheetName = 'Sheet1' } = options;

    // Transform data according to columns
    const rows = data.map(item => {
      const row: Record<string, any> = {};
      columns.forEach(col => {
        let value = this.getNestedValue(item, col.key);
        if (col.formatter) {
          value = col.formatter(value);
        }
        row[col.header] = value;
      });
      return row;
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    const colWidths = columns.map(col => ({ wch: col.width || 15 }));
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    logger.info('EXCEL_EXPORT', { rowCount: data.length, sheetName });
    return buffer;
  }

  /**
   * Export multiple sheets to Excel
   */
  toExcelMultiSheet(
    sheets: Array<{
      name: string;
      data: Record<string, any>[];
      columns: ExportColumn[];
    }>
  ): Buffer {
    const workbook = XLSX.utils.book_new();

    sheets.forEach(sheet => {
      const rows = sheet.data.map(item => {
        const row: Record<string, any> = {};
        sheet.columns.forEach(col => {
          let value = this.getNestedValue(item, col.key);
          if (col.formatter) {
            value = col.formatter(value);
          }
          row[col.header] = value;
        });
        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const colWidths = sheet.columns.map(col => ({ wch: col.width || 15 }));
      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Export to CSV
   */
  toCSV(data: Record<string, any>[], columns: ExportColumn[]): string {
    const headers = columns.map(col => col.header).join(',');
    const rows = data.map(item => {
      return columns.map(col => {
        let value = this.getNestedValue(item, col.key);
        if (col.formatter) {
          value = col.formatter(value);
        }
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string') {
          value = value.replace(/"/g, '""');
          if (value.includes(',') || value.includes('\n')) {
            value = `"${value}"`;
          }
        }
        return value ?? '';
      }).join(',');
    });

    return [headers, ...rows].join('\n');
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  // Pre-defined column configurations for common exports
  readonly patientColumns: ExportColumn[] = [
    { header: 'MRN', key: 'mrn', width: 15 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Gender', key: 'gender', width: 10 },
    { header: 'Date of Birth', key: 'dob', width: 15, formatter: (v) => v ? new Date(v).toLocaleDateString() : '' },
    { header: 'Contact', key: 'contact', width: 15 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Blood Group', key: 'bloodGroup', width: 12 },
    { header: 'Address', key: 'address', width: 40 },
    { header: 'Created At', key: 'createdAt', width: 15, formatter: (v) => new Date(v).toLocaleDateString() },
  ];

  readonly appointmentColumns: ExportColumn[] = [
    { header: 'Date', key: 'appointmentDate', width: 12, formatter: (v) => new Date(v).toLocaleDateString() },
    { header: 'Time', key: 'appointmentTime', width: 10 },
    { header: 'Patient Name', key: 'patient.name', width: 25 },
    { header: 'Patient MRN', key: 'patient.mrn', width: 15 },
    { header: 'Doctor', key: 'doctor.name', width: 25 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Type', key: 'type', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Reason', key: 'reason', width: 30 },
  ];

  readonly invoiceColumns: ExportColumn[] = [
    { header: 'Invoice #', key: 'id', width: 15, formatter: (v) => v?.slice(0, 8).toUpperCase() },
    { header: 'Date', key: 'createdAt', width: 12, formatter: (v) => new Date(v).toLocaleDateString() },
    { header: 'Patient Name', key: 'patient.name', width: 25 },
    { header: 'Patient MRN', key: 'patient.mrn', width: 15 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Subtotal', key: 'subtotal', width: 12, formatter: (v) => Number(v).toFixed(2) },
    { header: 'Discount', key: 'discount', width: 12, formatter: (v) => Number(v).toFixed(2) },
    { header: 'Total', key: 'total', width: 12, formatter: (v) => Number(v).toFixed(2) },
    { header: 'Paid', key: 'paid', width: 12, formatter: (v) => Number(v || 0).toFixed(2) },
    { header: 'Balance', key: 'balance', width: 12, formatter: (v) => Number(v).toFixed(2) },
    { header: 'Status', key: 'status', width: 12 },
  ];

  readonly paymentColumns: ExportColumn[] = [
    { header: 'Receipt #', key: 'id', width: 15, formatter: (v) => v?.slice(0, 8).toUpperCase() },
    { header: 'Date', key: 'paidAt', width: 12, formatter: (v) => new Date(v).toLocaleDateString() },
    { header: 'Invoice #', key: 'invoiceId', width: 15, formatter: (v) => v?.slice(0, 8).toUpperCase() },
    { header: 'Patient Name', key: 'invoice.patient.name', width: 25 },
    { header: 'Amount', key: 'amount', width: 12, formatter: (v) => Number(v).toFixed(2) },
    { header: 'Mode', key: 'mode', width: 12 },
    { header: 'Reference', key: 'transactionRef', width: 20 },
    { header: 'Received By', key: 'receivedBy', width: 20 },
  ];

  readonly labOrderColumns: ExportColumn[] = [
    { header: 'Order #', key: 'id', width: 15, formatter: (v) => v?.slice(0, 8).toUpperCase() },
    { header: 'Date', key: 'createdAt', width: 12, formatter: (v) => new Date(v).toLocaleDateString() },
    { header: 'Patient Name', key: 'patient.name', width: 25 },
    { header: 'Patient MRN', key: 'patient.mrn', width: 15 },
    { header: 'Test', key: 'orderType', width: 20 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Ordered By', key: 'orderedBy.name', width: 20 },
  ];

  readonly inventoryColumns: ExportColumn[] = [
    { header: 'Item Code', key: 'code', width: 15 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Current Stock', key: 'currentStock', width: 15 },
    { header: 'Reorder Level', key: 'reorderLevel', width: 15 },
    { header: 'Unit', key: 'unit', width: 10 },
    { header: 'Unit Price', key: 'unitPrice', width: 12, formatter: (v) => Number(v).toFixed(2) },
    { header: 'Status', key: 'status', width: 12 },
  ];

  readonly employeeColumns: ExportColumn[] = [
    { header: 'Employee ID', key: 'employeeId', width: 15 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Designation', key: 'designation', width: 20 },
    { header: 'Joining Date', key: 'joiningDate', width: 15, formatter: (v) => v ? new Date(v).toLocaleDateString() : '' },
    { header: 'Status', key: 'status', width: 12 },
  ];

  readonly admissionColumns: ExportColumn[] = [
    { header: 'Admission #', key: 'id', width: 15, formatter: (v) => v?.slice(0, 8).toUpperCase() },
    { header: 'Admitted On', key: 'admittedAt', width: 15, formatter: (v) => new Date(v).toLocaleDateString() },
    { header: 'Patient Name', key: 'patient.name', width: 25 },
    { header: 'Patient MRN', key: 'patient.mrn', width: 15 },
    { header: 'Ward', key: 'bed.ward.name', width: 20 },
    { header: 'Bed', key: 'bed.bedNumber', width: 10 },
    { header: 'Diagnosis', key: 'diagnosis', width: 30 },
    { header: 'Doctor', key: 'admittingDoctor.name', width: 25 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Discharged On', key: 'dischargedAt', width: 15, formatter: (v) => v ? new Date(v).toLocaleDateString() : '' },
  ];
}

export const exportService = new ExportService();
export { ExportColumn, ExportOptions };
