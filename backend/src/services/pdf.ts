import PDFDocument from 'pdfkit';
import { logger } from '../utils/logger';

interface HospitalInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin?: string;
  logo?: Buffer;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  patient: {
    name: string;
    mrn: string;
    contact?: string;
    address?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
  paymentMode?: string;
  notes?: string;
}

interface LabReportData {
  reportNumber: string;
  reportDate: Date;
  patient: {
    name: string;
    mrn: string;
    age?: number;
    gender?: string;
  };
  referringDoctor?: string;
  tests: Array<{
    name: string;
    result: string;
    unit?: string;
    referenceRange?: string;
    isCritical?: boolean;
  }>;
  remarks?: string;
  verifiedBy?: string;
}

interface DischargeData {
  admissionNumber: string;
  patient: {
    name: string;
    mrn: string;
    age?: number;
    gender?: string;
    address?: string;
  };
  admissionDate: Date;
  dischargeDate: Date;
  ward: string;
  bed: string;
  attendingDoctor: string;
  diagnosis: string;
  treatmentGiven: string;
  conditionAtDischarge: string;
  followUpInstructions?: string;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
}

class PDFService {
  private defaultHospitalInfo: HospitalInfo = {
    name: 'Hospital ERP',
    address: '123 Healthcare Avenue, Medical District',
    phone: '+91-XXXXXXXXXX',
    email: 'info@hospital.com',
    gstin: 'XXXXXXXXXXXX',
  };

  /**
   * Generate Invoice PDF
   */
  async generateInvoice(data: InvoiceData, hospitalInfo?: HospitalInfo): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const hospital = hospitalInfo || this.defaultHospitalInfo;

        // Header
        this.addHeader(doc, hospital, 'TAX INVOICE');

        // Invoice details
        doc.fontSize(10);
        doc.text(`Invoice No: ${data.invoiceNumber}`, 50, 150);
        doc.text(`Date: ${data.invoiceDate.toLocaleDateString('en-IN')}`, 400, 150);

        // Patient details
        doc.rect(50, 180, 250, 80).stroke();
        doc.fontSize(9).font('Helvetica-Bold').text('Bill To:', 55, 185);
        doc.font('Helvetica');
        doc.text(data.patient.name, 55, 200);
        doc.text(`MRN: ${data.patient.mrn}`, 55, 215);
        if (data.patient.contact) doc.text(`Phone: ${data.patient.contact}`, 55, 230);
        if (data.patient.address) doc.text(data.patient.address, 55, 245, { width: 240 });

        // Items table
        const tableTop = 280;
        this.drawTableHeader(doc, tableTop, ['S.No', 'Description', 'Qty', 'Rate', 'Amount']);

        let y = tableTop + 25;
        data.items.forEach((item, index) => {
          doc.fontSize(9);
          doc.text((index + 1).toString(), 55, y, { width: 30 });
          doc.text(item.description, 90, y, { width: 220 });
          doc.text(item.quantity.toString(), 320, y, { width: 40, align: 'center' });
          doc.text(item.unitPrice.toFixed(2), 370, y, { width: 70, align: 'right' });
          doc.text(item.amount.toFixed(2), 450, y, { width: 90, align: 'right' });
          y += 20;
        });

        // Totals
        y += 20;
        doc.moveTo(350, y).lineTo(545, y).stroke();
        y += 10;

        doc.text('Subtotal:', 350, y);
        doc.text(data.subtotal.toFixed(2), 450, y, { width: 90, align: 'right' });
        y += 15;

        if (data.discount > 0) {
          doc.text('Discount:', 350, y);
          doc.text(`-${data.discount.toFixed(2)}`, 450, y, { width: 90, align: 'right' });
          y += 15;
        }

        if (data.tax > 0) {
          doc.text('Tax:', 350, y);
          doc.text(data.tax.toFixed(2), 450, y, { width: 90, align: 'right' });
          y += 15;
        }

        doc.font('Helvetica-Bold');
        doc.text('Total:', 350, y);
        doc.text(data.total.toFixed(2), 450, y, { width: 90, align: 'right' });
        y += 15;

        doc.font('Helvetica');
        doc.text('Paid:', 350, y);
        doc.text(data.paid.toFixed(2), 450, y, { width: 90, align: 'right' });
        y += 15;

        doc.font('Helvetica-Bold');
        doc.text('Balance:', 350, y);
        doc.text(data.balance.toFixed(2), 450, y, { width: 90, align: 'right' });

        // Footer
        this.addFooter(doc, 'Thank you for your visit. Get well soon!');

        doc.end();
        logger.info('PDF_INVOICE_GENERATED', { invoiceNumber: data.invoiceNumber });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Lab Report PDF
   */
  async generateLabReport(data: LabReportData, hospitalInfo?: HospitalInfo): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const hospital = hospitalInfo || this.defaultHospitalInfo;

        // Header
        this.addHeader(doc, hospital, 'LABORATORY REPORT');

        // Report details
        doc.fontSize(10);
        doc.text(`Report No: ${data.reportNumber}`, 50, 150);
        doc.text(`Date: ${data.reportDate.toLocaleDateString('en-IN')}`, 400, 150);

        // Patient details
        doc.rect(50, 175, 500, 50).stroke();
        doc.fontSize(9);
        doc.text(`Patient: ${data.patient.name}`, 55, 180);
        doc.text(`MRN: ${data.patient.mrn}`, 300, 180);
        doc.text(`Age/Gender: ${data.patient.age || '-'} / ${data.patient.gender || '-'}`, 55, 195);
        if (data.referringDoctor) doc.text(`Ref. Doctor: ${data.referringDoctor}`, 300, 195);

        // Test results table
        const tableTop = 245;
        this.drawTableHeader(doc, tableTop, ['Test Name', 'Result', 'Unit', 'Reference Range']);

        let y = tableTop + 25;
        data.tests.forEach(test => {
          doc.fontSize(9);
          if (test.isCritical) doc.fillColor('red');
          doc.text(test.name, 55, y, { width: 180 });
          doc.text(test.result, 240, y, { width: 80, align: 'center' });
          doc.text(test.unit || '-', 330, y, { width: 60, align: 'center' });
          doc.text(test.referenceRange || '-', 400, y, { width: 140 });
          doc.fillColor('black');
          y += 20;
        });

        // Remarks
        if (data.remarks) {
          y += 20;
          doc.font('Helvetica-Bold').text('Remarks:', 50, y);
          y += 15;
          doc.font('Helvetica').text(data.remarks, 50, y, { width: 500 });
        }

        // Signature
        y = 700;
        doc.text(`Verified By: ${data.verifiedBy || 'Lab In-charge'}`, 350, y);

        // Footer
        this.addFooter(doc, 'This is a computer-generated report.');

        doc.end();
        logger.info('PDF_LAB_REPORT_GENERATED', { reportNumber: data.reportNumber });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Discharge Summary PDF
   */
  async generateDischargeSummary(data: DischargeData, hospitalInfo?: HospitalInfo): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const hospital = hospitalInfo || this.defaultHospitalInfo;

        // Header
        this.addHeader(doc, hospital, 'DISCHARGE SUMMARY');

        let y = 150;

        // Admission details
        doc.fontSize(10);
        doc.text(`Admission No: ${data.admissionNumber}`, 50, y);
        y += 20;

        // Patient details box
        doc.rect(50, y, 500, 70).stroke();
        y += 10;
        doc.fontSize(9);
        doc.text(`Patient: ${data.patient.name}`, 55, y);
        doc.text(`MRN: ${data.patient.mrn}`, 300, y);
        y += 15;
        doc.text(`Age/Gender: ${data.patient.age || '-'} / ${data.patient.gender || '-'}`, 55, y);
        doc.text(`Ward/Bed: ${data.ward} / ${data.bed}`, 300, y);
        y += 15;
        if (data.patient.address) doc.text(`Address: ${data.patient.address}`, 55, y, { width: 490 });
        y += 30;

        // Dates
        doc.text(`Admission Date: ${data.admissionDate.toLocaleDateString('en-IN')}`, 55, y);
        doc.text(`Discharge Date: ${data.dischargeDate.toLocaleDateString('en-IN')}`, 300, y);
        y += 20;
        doc.text(`Attending Doctor: ${data.attendingDoctor}`, 55, y);
        y += 25;

        // Clinical details
        doc.font('Helvetica-Bold').text('Diagnosis:', 50, y);
        y += 15;
        doc.font('Helvetica').text(data.diagnosis, 50, y, { width: 500 });
        y += 40;

        doc.font('Helvetica-Bold').text('Treatment Given:', 50, y);
        y += 15;
        doc.font('Helvetica').text(data.treatmentGiven, 50, y, { width: 500 });
        y += 40;

        doc.font('Helvetica-Bold').text('Condition at Discharge:', 50, y);
        y += 15;
        doc.font('Helvetica').text(data.conditionAtDischarge, 50, y, { width: 500 });
        y += 30;

        // Medications
        if (data.medications && data.medications.length > 0) {
          doc.font('Helvetica-Bold').text('Medications:', 50, y);
          y += 15;
          data.medications.forEach((med, i) => {
            doc.font('Helvetica').text(
              `${i + 1}. ${med.name} - ${med.dosage}, ${med.frequency} for ${med.duration}`,
              55, y, { width: 490 }
            );
            y += 15;
          });
          y += 10;
        }

        // Follow-up
        if (data.followUpInstructions) {
          doc.font('Helvetica-Bold').text('Follow-up Instructions:', 50, y);
          y += 15;
          doc.font('Helvetica').text(data.followUpInstructions, 50, y, { width: 500 });
        }

        // Footer
        this.addFooter(doc, 'Wishing you a speedy recovery!');

        doc.end();
        logger.info('PDF_DISCHARGE_GENERATED', { admissionNumber: data.admissionNumber });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Payment Receipt PDF
   */
  async generateReceipt(
    data: {
      receiptNumber: string;
      receiptDate: Date;
      patient: { name: string; mrn: string };
      amount: number;
      paymentMode: string;
      transactionRef?: string;
      invoiceNumber: string;
      receivedBy?: string;
    },
    hospitalInfo?: HospitalInfo
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A5', margin: 40 });
        const chunks: Buffer[] = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const hospital = hospitalInfo || this.defaultHospitalInfo;

        // Header
        doc.fontSize(16).font('Helvetica-Bold').text(hospital.name, { align: 'center' });
        doc.fontSize(10).font('Helvetica').text(hospital.address, { align: 'center' });
        doc.text(`Phone: ${hospital.phone}`, { align: 'center' });
        doc.moveDown();

        doc.fontSize(14).font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center' });
        doc.moveDown();

        // Receipt details
        doc.fontSize(10).font('Helvetica');
        doc.text(`Receipt No: ${data.receiptNumber}`);
        doc.text(`Date: ${data.receiptDate.toLocaleDateString('en-IN')}`);
        doc.moveDown();

        doc.text(`Patient: ${data.patient.name}`);
        doc.text(`MRN: ${data.patient.mrn}`);
        doc.text(`Invoice: ${data.invoiceNumber}`);
        doc.moveDown();

        doc.rect(40, doc.y, 350, 60).stroke();
        const boxY = doc.y + 10;
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(`Amount Received: Rs. ${data.amount.toFixed(2)}`, 50, boxY);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Payment Mode: ${data.paymentMode}`, 50, boxY + 20);
        if (data.transactionRef) {
          doc.text(`Reference: ${data.transactionRef}`, 50, boxY + 35);
        }

        doc.moveDown(4);
        if (data.receivedBy) {
          doc.text(`Received By: ${data.receivedBy}`, { align: 'right' });
        }

        doc.end();
        logger.info('PDF_RECEIPT_GENERATED', { receiptNumber: data.receiptNumber });
      } catch (error) {
        reject(error);
      }
    });
  }

  private addHeader(doc: PDFKit.PDFDocument, hospital: HospitalInfo, title: string): void {
    doc.fontSize(18).font('Helvetica-Bold').text(hospital.name, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(hospital.address, { align: 'center' });
    doc.text(`Phone: ${hospital.phone} | Email: ${hospital.email}`, { align: 'center' });
    if (hospital.gstin) doc.text(`GSTIN: ${hospital.gstin}`, { align: 'center' });

    doc.moveDown();
    doc.moveTo(50, 120).lineTo(545, 120).stroke();
    doc.fontSize(14).font('Helvetica-Bold').text(title, { align: 'center' });
  }

  private drawTableHeader(doc: PDFKit.PDFDocument, y: number, headers: string[]): void {
    doc.rect(50, y, 495, 20).fill('#f0f0f0').stroke();
    doc.fillColor('black').font('Helvetica-Bold').fontSize(9);

    const widths = [35, 225, 50, 80, 100];
    let x = 55;
    headers.forEach((header, i) => {
      doc.text(header, x, y + 5, { width: widths[i] || 80 });
      x += widths[i] || 80;
    });
    doc.font('Helvetica');
  }

  private addFooter(doc: PDFKit.PDFDocument, message: string): void {
    doc.fontSize(8).text(message, 50, 780, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
  }
}

export const pdfService = new PDFService();
export { InvoiceData, LabReportData, DischargeData, HospitalInfo };
