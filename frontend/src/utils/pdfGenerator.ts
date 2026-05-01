import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface HospitalInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
}

const hospitalInfo: HospitalInfo = {
  name: 'Busitema Referral Hospital',
  address: 'Tororo Road, Busitema, Uganda',
  phone: '+256 454 123 456',
  email: 'info@busitemahospital.ug'
};

// Generate a header for all PDF reports
function addHeader(doc: jsPDF, title: string) {
  // Hospital name
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(hospitalInfo.name, 105, 20, { align: 'center' });

  // Hospital address
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(hospitalInfo.address, 105, 27, { align: 'center' });
  doc.text(`Tel: ${hospitalInfo.phone} | Email: ${hospitalInfo.email}`, 105, 32, { align: 'center' });

  // Horizontal line
  doc.setLineWidth(0.5);
  doc.line(20, 36, 190, 36);

  // Report title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 105, 45, { align: 'center' });

  return 50; // Return starting Y position for content
}

// Generate Bill PDF
export function generateBillPDF(billData: {
  billNumber: string;
  date: string;
  patientName: string;
  patientMRN: string;
  patientPhone?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  paymentMode?: string;
  paidAmount?: number;
  balance?: number;
}) {
  const doc = new jsPDF();

  let yPos = addHeader(doc, 'BILL / INVOICE');

  // Bill details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Left column
  doc.text(`Bill No: ${billData.billNumber}`, 20, yPos);
  doc.text(`Date: ${billData.date}`, 20, yPos + 5);

  // Right column
  doc.text(`Patient: ${billData.patientName}`, 120, yPos);
  doc.text(`MRN: ${billData.patientMRN}`, 120, yPos + 5);
  if (billData.patientPhone) {
    doc.text(`Phone: ${billData.patientPhone}`, 120, yPos + 10);
  }

  yPos += 20;

  // Items table
  doc.autoTable({
    startY: yPos,
    head: [['#', 'Description', 'Qty', 'Unit Price', 'Total']],
    body: billData.items.map((item, idx) => [
      idx + 1,
      item.description,
      item.quantity,
      `Rs. ${item.unitPrice.toFixed(2)}`,
      `Rs. ${item.total.toFixed(2)}`
    ]),
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 80 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' }
    }
  });

  // Get the final Y position after the table
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Totals
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', 140, finalY);
  doc.text(`Rs. ${billData.subtotal.toFixed(2)}`, 190, finalY, { align: 'right' });

  if (billData.discount) {
    doc.text('Discount:', 140, finalY + 5);
    doc.text(`Rs. ${billData.discount.toFixed(2)}`, 190, finalY + 5, { align: 'right' });
  }

  if (billData.tax) {
    doc.text('Tax:', 140, finalY + 10);
    doc.text(`Rs. ${billData.tax.toFixed(2)}`, 190, finalY + 10, { align: 'right' });
  }

  doc.setFont('helvetica', 'bold');
  const totalY = finalY + (billData.discount ? 15 : 10);
  doc.text('Total:', 140, totalY);
  doc.text(`Rs. ${billData.total.toFixed(2)}`, 190, totalY, { align: 'right' });

  if (billData.paidAmount !== undefined) {
    doc.setFont('helvetica', 'normal');
    doc.text('Paid:', 140, totalY + 5);
    doc.text(`Rs. ${billData.paidAmount.toFixed(2)}`, 190, totalY + 5, { align: 'right' });

    if (billData.balance !== undefined) {
      doc.text('Balance:', 140, totalY + 10);
      doc.text(`Rs. ${billData.balance.toFixed(2)}`, 190, totalY + 10, { align: 'right' });
    }
  }

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for choosing our hospital. Get well soon!', 105, 280, { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });

  // Save
  doc.save(`Bill_${billData.billNumber}.pdf`);
}

// Generate Lab Report PDF
export function generateLabReportPDF(reportData: {
  reportNumber: string;
  date: string;
  patientName: string;
  patientMRN: string;
  patientAge?: string;
  patientGender?: string;
  referringDoctor?: string;
  tests: Array<{
    testName: string;
    result: string;
    unit?: string;
    normalRange?: string;
    flag?: 'normal' | 'high' | 'low' | 'critical';
  }>;
  collectionDate?: string;
  reportDate?: string;
  technician?: string;
  pathologist?: string;
}) {
  const doc = new jsPDF();

  let yPos = addHeader(doc, 'LABORATORY REPORT');

  // Patient details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Left column
  doc.text(`Report No: ${reportData.reportNumber}`, 20, yPos);
  doc.text(`Patient: ${reportData.patientName}`, 20, yPos + 5);
  doc.text(`MRN: ${reportData.patientMRN}`, 20, yPos + 10);
  if (reportData.patientAge) {
    doc.text(`Age/Gender: ${reportData.patientAge}/${reportData.patientGender || 'N/A'}`, 20, yPos + 15);
  }

  // Right column
  doc.text(`Report Date: ${reportData.date}`, 120, yPos);
  if (reportData.collectionDate) {
    doc.text(`Collection Date: ${reportData.collectionDate}`, 120, yPos + 5);
  }
  if (reportData.referringDoctor) {
    doc.text(`Referring Doctor: ${reportData.referringDoctor}`, 120, yPos + 10);
  }

  yPos += 25;

  // Tests table
  doc.autoTable({
    startY: yPos,
    head: [['Test Name', 'Result', 'Unit', 'Normal Range', 'Status']],
    body: reportData.tests.map((test) => [
      test.testName,
      test.result,
      test.unit || '-',
      test.normalRange || '-',
      test.flag ? test.flag.toUpperCase() : 'NORMAL'
    ]),
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 40, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' }
    },
    didParseCell: (data: any) => {
      // Color code the status column
      if (data.column.index === 4 && data.section === 'body') {
        const value = data.cell.text[0];
        if (value === 'HIGH' || value === 'CRITICAL') {
          data.cell.styles.textColor = [255, 0, 0];
          data.cell.styles.fontStyle = 'bold';
        } else if (value === 'LOW') {
          data.cell.styles.textColor = [255, 165, 0];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // Get the final Y position after the table
  const finalY = (doc as any).lastAutoTable.finalY + 15;

  // Signatures
  if (reportData.technician) {
    doc.text(`Lab Technician: ${reportData.technician}`, 20, finalY);
  }
  if (reportData.pathologist) {
    doc.text(`Pathologist: ${reportData.pathologist}`, 120, finalY);
  }

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('This is a computer generated report.', 105, 275, { align: 'center' });
  doc.text('Please consult your doctor for interpretation of results.', 105, 280, { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });

  // Save
  doc.save(`LabReport_${reportData.reportNumber}.pdf`);
}

// Generate Discharge Summary PDF
export function generateDischargeSummaryPDF(data: {
  patientName: string;
  patientMRN: string;
  patientAge?: string;
  patientGender?: string;
  admissionDate: string;
  dischargeDate: string;
  ward?: string;
  bed?: string;
  admittingDoctor: string;
  diagnosis: string;
  treatmentSummary: string;
  procedures?: string[];
  medications?: Array<{ name: string; dosage: string; frequency: string; duration: string }>;
  followUp?: string;
  instructions?: string;
}) {
  const doc = new jsPDF();

  let yPos = addHeader(doc, 'DISCHARGE SUMMARY');

  // Patient info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.text(`Patient: ${data.patientName}`, 20, yPos);
  doc.text(`MRN: ${data.patientMRN}`, 120, yPos);
  yPos += 5;

  if (data.patientAge) {
    doc.text(`Age/Gender: ${data.patientAge}/${data.patientGender || 'N/A'}`, 20, yPos);
  }
  doc.text(`Ward/Bed: ${data.ward || 'N/A'} / ${data.bed || 'N/A'}`, 120, yPos);
  yPos += 5;

  doc.text(`Admission Date: ${data.admissionDate}`, 20, yPos);
  doc.text(`Discharge Date: ${data.dischargeDate}`, 120, yPos);
  yPos += 5;

  doc.text(`Attending Physician: ${data.admittingDoctor}`, 20, yPos);
  yPos += 10;

  // Diagnosis
  doc.setFont('helvetica', 'bold');
  doc.text('Diagnosis:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  yPos += 5;
  const diagnosisLines = doc.splitTextToSize(data.diagnosis, 170);
  doc.text(diagnosisLines, 20, yPos);
  yPos += diagnosisLines.length * 5 + 5;

  // Treatment Summary
  doc.setFont('helvetica', 'bold');
  doc.text('Treatment Summary:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  yPos += 5;
  const treatmentLines = doc.splitTextToSize(data.treatmentSummary, 170);
  doc.text(treatmentLines, 20, yPos);
  yPos += treatmentLines.length * 5 + 5;

  // Procedures
  if (data.procedures && data.procedures.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Procedures Performed:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 5;
    data.procedures.forEach((proc) => {
      doc.text(`- ${proc}`, 25, yPos);
      yPos += 5;
    });
    yPos += 5;
  }

  // Medications
  if (data.medications && data.medications.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Discharge Medications:', 20, yPos);
    yPos += 5;

    doc.autoTable({
      startY: yPos,
      head: [['Medication', 'Dosage', 'Frequency', 'Duration']],
      body: data.medications.map((med) => [med.name, med.dosage, med.frequency, med.duration]),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Follow-up
  if (data.followUp) {
    doc.setFont('helvetica', 'bold');
    doc.text('Follow-up:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(data.followUp, 55, yPos);
    yPos += 10;
  }

  // Instructions
  if (data.instructions) {
    doc.setFont('helvetica', 'bold');
    doc.text('Instructions:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 5;
    const instructionLines = doc.splitTextToSize(data.instructions, 170);
    doc.text(instructionLines, 20, yPos);
  }

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });

  // Save
  doc.save(`DischargeSummary_${data.patientMRN}_${data.dischargeDate.replace(/\//g, '-')}.pdf`);
}
