import jsPDF from 'jspdf';
// jspdf-autotable v5+ no longer monkey-patches the jsPDF prototype as a
// side effect of `import 'jspdf-autotable'`. The functional form is the
// only supported API: `autoTable(doc, options)`. We import it once and
// expose a tiny doc.autoTable(options) shim on each instance below so
// the existing call sites (~10 of them) keep working without a sweep.
import autoTable from 'jspdf-autotable';
import { getLetterhead } from '../lib/letterheadStore';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Wrap a fresh jsPDF instance with the autoTable shim. Call this
// instead of `new jsPDF()` directly anywhere in this file. Keeps the
// existing `doc.autoTable(...)` call sites valid without rewriting
// every report.
function newPdf(orientation: 'p' | 'l' = 'p'): jsPDF {
  const doc = new jsPDF(orientation);
  (doc as any).autoTable = (options: any) => {
    autoTable(doc, options);
    return doc;
  };
  return doc;
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

// Generate a header for all PDF reports.
//
// Two modes:
//   1. Letterhead uploaded — paint the user's letterhead image as a
//      full A4 background (210x297 mm). The hospital name/address that
//      we'd normally print is now embedded in the letterhead artwork,
//      so we only print the report title centered below the letterhead's
//      typical top-margin (~50 mm).
//   2. No letterhead — fall back to the typed text header (hospital
//      name, address, phone, line, then title).
function addHeader(doc: jsPDF, title: string) {
  const letterhead = getLetterhead();
  if (letterhead) {
    try {
      // A4 in jsPDF default mm units = 210 x 297. Stretch the image to
      // cover the whole page; the user's letterhead artwork is expected
      // to be A4-proportioned (the upload UI guides them on this).
      doc.addImage(letterhead, 'PNG', 0, 0, 210, 297);
    } catch {
      // Bad data URL → fall through to text header
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 105, 55, { align: 'center' });
    return 65; // start content lower to clear the letterhead's own header
  }

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
  const doc = newPdf();

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
  return { doc, filename: `Bill_${billData.billNumber}.pdf` };
}

// Convenience helper for callers that just want to trigger a download
// (back-compat with the old behaviour). New callers should pass the
// returned `{ doc, filename }` to <PdfPreviewDialog/> for in-app preview.
export function downloadPdf(p: { doc: jsPDF; filename: string }): void {
  p.doc.save(p.filename);
}

// Generate Radiology Report PDF. Same hospital header + patient block as
// the lab report; body is freeform text (findings + impression) instead
// of a tabular result list because radiology reports don't tabulate.
export function generateRadiologyReportPDF(reportData: {
  reportNumber: string;
  date: string;
  patientName: string;
  patientMRN: string;
  patientAge?: string;
  patientGender?: string;
  referringDoctor?: string;
  modality?: string;        // X-Ray / CT / MRI / Ultrasound
  bodyPart?: string;
  studyDate?: string;
  findings?: string;
  impression?: string;
  technique?: string;
  radiologist?: string;
}) {
  const doc = newPdf();
  let y = addHeader(doc, 'RADIOLOGY REPORT');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Patient block
  doc.text(`Report No: ${reportData.reportNumber}`, 20, y);
  doc.text(`Patient: ${reportData.patientName}`, 20, y + 5);
  doc.text(`MRN: ${reportData.patientMRN}`, 20, y + 10);
  if (reportData.patientAge) {
    doc.text(`Age/Gender: ${reportData.patientAge}/${reportData.patientGender || 'N/A'}`, 20, y + 15);
  }
  doc.text(`Report Date: ${reportData.date}`, 120, y);
  if (reportData.studyDate) doc.text(`Study Date: ${reportData.studyDate}`, 120, y + 5);
  if (reportData.referringDoctor) doc.text(`Referring Doctor: ${reportData.referringDoctor}`, 120, y + 10);
  y += 25;

  // Modality + body part highlighted
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Study: ${reportData.modality || 'Imaging'}${reportData.bodyPart ? ` — ${reportData.bodyPart}` : ''}`, 20, y);
  y += 8;

  const writeSection = (label: string, body: string | undefined) => {
    if (!body) return;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text(label, 20, y); y += 5;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(body, 170);
    doc.text(lines, 20, y);
    y += lines.length * 5 + 4;
  };
  writeSection('Technique:', reportData.technique);
  writeSection('Findings:', reportData.findings);
  writeSection('Impression:', reportData.impression);

  // Signature block
  if (reportData.radiologist) {
    y = Math.max(y, 240);
    doc.setFont('helvetica', 'normal');
    doc.text(`Radiologist: ${reportData.radiologist}`, 20, y);
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });

  return { doc, filename: `Radiology_${reportData.reportNumber}.pdf` };
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
  const doc = newPdf();

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
  return { doc, filename: `LabReport_${reportData.reportNumber}.pdf` };
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
  const doc = newPdf();

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
  return { doc, filename: `DischargeSummary_${data.patientMRN}_${data.dischargeDate.replace(/\//g, '-')}.pdf` };
}

// ---------- Birth Certificate (India Form 1 style) ----------
// Printable hospital birth certificate. The wet-ink signature of the
// attending doctor and Medical Superintendent on the printed copy is
// the legal artefact; this PDF reserves space for both. The civil
// registration certificate is issued separately by the municipal
// registrar — this is the hospital's intake document for that filing.
export function generateBirthCertificatePDF(data: {
  certificateNumber: string;
  hospitalName?: string;
  branchAddress?: string;
  babyName: string;
  babyGender: string;
  birthDate: string;          // pre-formatted human string
  birthTime?: string;
  placeOfBirth: string;
  deliveryType: string;       // normal / c-section / assisted
  weightGrams?: number;
  motherName: string;
  motherMRN: string;
  motherAge?: number;
  motherAddress?: string;
  motherOccupation?: string;
  motherNationality?: string;
  fatherName?: string;
  fatherOccupation?: string;
  attendingDoctor?: string;
  issuedAt: string;
  issuedBy?: string;
}) {
  const doc = newPdf();
  let yPos = addHeader(doc, 'CERTIFICATE OF BIRTH');

  // Sub-title
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('(Issued by the hospital — for use in civil registration under the', 105, yPos, { align: 'center' });
  doc.text('Registration of Births and Deaths Act, 1969 — Form 1 intake)', 105, yPos + 4, { align: 'center' });
  yPos += 12;

  // Certificate # + issue date
  doc.setFont('helvetica', 'normal');
  doc.text(`Certificate No: ${data.certificateNumber}`, 20, yPos);
  doc.text(`Date of Issue: ${data.issuedAt}`, 130, yPos);
  yPos += 8;

  // Row helper that prints "Label: value" with a thin underline below
  // value, mimicking a printed form.
  const labelW = 55;
  const row = (label: string, value: string, x = 20, w = 170) => {
    doc.setFont('helvetica', 'bold'); doc.text(label, x, yPos);
    doc.setFont('helvetica', 'normal');
    const valX = x + labelW;
    doc.text(value || '—', valX, yPos);
    doc.setDrawColor(180);
    doc.line(valX, yPos + 1.2, x + w, yPos + 1.2);
    yPos += 8;
  };

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('A. CHILD', 20, yPos); yPos += 6;
  doc.setFontSize(10);

  row('Name of child', data.babyName || `Baby (name yet to be declared)`);
  row('Sex', data.babyGender);
  row('Date of birth', data.birthDate + (data.birthTime ? `   Time: ${data.birthTime}` : ''));
  row('Place of birth', data.placeOfBirth);
  row('Type of delivery', data.deliveryType);
  if (data.weightGrams) row('Weight at birth', `${data.weightGrams} g`);

  yPos += 2;
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('B. MOTHER', 20, yPos); yPos += 6;
  doc.setFontSize(10);
  row('Name of mother', data.motherName);
  row('Mother MRN', data.motherMRN);
  if (data.motherAge) row('Age at birth (yrs)', String(data.motherAge));
  if (data.motherOccupation) row('Occupation', data.motherOccupation);
  if (data.motherNationality) row('Nationality', data.motherNationality);
  if (data.motherAddress) row('Address', data.motherAddress);

  yPos += 2;
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('C. FATHER', 20, yPos); yPos += 6;
  doc.setFontSize(10);
  row('Name of father', data.fatherName || '—');
  if (data.fatherOccupation) row('Occupation', data.fatherOccupation);

  // Signature blocks. Two parallel lines for ink signing.
  yPos = Math.max(yPos + 10, 230);
  doc.setDrawColor(0);
  doc.line(25, yPos, 90, yPos);
  doc.line(120, yPos, 185, yPos);
  doc.setFontSize(9);
  doc.text(data.attendingDoctor ? `Attending: ${data.attendingDoctor}` : 'Attending Doctor', 25, yPos + 5);
  doc.text('Medical Superintendent / Registrar', 120, yPos + 5);

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Issued by: ${data.issuedBy || '—'}    Generated: ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });
  doc.text(`${data.hospitalName || ''} ${data.branchAddress ? '· ' + data.branchAddress : ''}`.trim(), 105, 289, { align: 'center' });

  return { doc, filename: `BirthCertificate_${data.certificateNumber}.pdf` };
}

// ---------- Medical Certificate of Cause of Death (India Form 4) ----------
// Hospital in-patient version. The wet-ink signature of the certifying
// medical practitioner is the legal artefact. The form is given to the
// informant (usually next of kin) who carries it to the municipal
// registrar to obtain the civil death certificate.
export function generateDeathCertificatePDF(data: {
  certificateNumber: string;
  hospitalName?: string;
  branchAddress?: string;
  deceasedName: string;
  age?: number | string;
  gender?: string;
  address?: string;
  dateOfDeath: string;       // pre-formatted human string
  placeOfDeath?: string;
  // Causes — section I
  immediateCause: string;
  immediateInterval?: string;
  antecedentCause1?: string;
  antecedent1Interval?: string;
  antecedentCause2?: string;
  antecedent2Interval?: string;
  // Section II
  contributingCauses?: string;
  // Manner / mode
  mannerOfDeath?: string;
  modeOfDeath?: string;
  // Certifier
  certifyingDoctorName: string;
  certifyingDoctorReg?: string;
  issuedAt: string;
  issuedBy?: string;
}) {
  const doc = newPdf();
  let yPos = addHeader(doc, 'MEDICAL CERTIFICATE OF CAUSE OF DEATH');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('(Form No. 4 — Hospital In-patient. Issued under the Registration', 105, yPos, { align: 'center' });
  doc.text('of Births and Deaths Act, 1969 / RBD Rules, 1999)', 105, yPos + 4, { align: 'center' });
  yPos += 12;

  doc.setFont('helvetica', 'normal');
  doc.text(`Certificate No: ${data.certificateNumber}`, 20, yPos);
  doc.text(`Date of Issue: ${data.issuedAt}`, 130, yPos);
  yPos += 8;

  const labelW = 50;
  const row = (label: string, value: string, x = 20, w = 170) => {
    doc.setFont('helvetica', 'bold'); doc.text(label, x, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value || '—', x + labelW, yPos);
    doc.setDrawColor(180);
    doc.line(x + labelW, yPos + 1.2, x + w, yPos + 1.2);
    yPos += 7;
  };

  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('DECEASED', 20, yPos); yPos += 6;
  doc.setFontSize(10);
  row('Name', data.deceasedName);
  row('Age / Sex', `${data.age ?? '—'} / ${data.gender ?? '—'}`);
  if (data.address) row('Address', data.address);
  row('Date & time of death', data.dateOfDeath);
  if (data.placeOfDeath) row('Place of death', data.placeOfDeath);

  yPos += 2;
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('I. CAUSE OF DEATH', 20, yPos); yPos += 6;
  doc.setFontSize(9); doc.setFont('helvetica', 'italic');
  doc.text('Only one disease/condition per line. "Due to" links each line to the next.', 20, yPos);
  yPos += 6;
  doc.setFontSize(10);
  doc.autoTable({
    startY: yPos,
    head: [['', 'Disease / condition', 'Approx. interval onset → death']],
    body: [
      ['(a) Immediate cause',           data.immediateCause || '',     data.immediateInterval || ''],
      ['(b) due to (or as a consequence of)', data.antecedentCause1 || '', data.antecedent1Interval || ''],
      ['(c) due to (or as a consequence of)', data.antecedentCause2 || '', data.antecedent2Interval || ''],
    ],
    theme: 'grid',
    headStyles: { fillColor: [80, 80, 80] },
    styles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 90 }, 2: { cellWidth: 40 } },
    margin: { left: 20, right: 20 },
  });
  yPos = (doc as any).lastAutoTable.finalY + 6;

  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('II. OTHER SIGNIFICANT CONDITIONS', 20, yPos); yPos += 6;
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  const cc = doc.splitTextToSize(data.contributingCauses || '—', 170);
  doc.text(cc, 20, yPos);
  yPos += cc.length * 5 + 4;

  if (data.mannerOfDeath || data.modeOfDeath) {
    row('Manner of death', data.mannerOfDeath || '—');
    row('Mode of death', data.modeOfDeath || '—');
  }

  // Certifier
  yPos = Math.max(yPos + 8, 235);
  doc.setDrawColor(0);
  doc.line(25, yPos, 110, yPos);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`Certifying Doctor: ${data.certifyingDoctorName}`, 25, yPos + 5);
  if (data.certifyingDoctorReg) doc.text(`Regn. No.: ${data.certifyingDoctorReg}`, 25, yPos + 10);
  doc.line(130, yPos, 185, yPos);
  doc.text('Signature & Seal', 130, yPos + 5);

  // Footer
  doc.setFontSize(8); doc.setFont('helvetica', 'italic');
  doc.text(`Issued by: ${data.issuedBy || '—'}    Generated: ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });
  doc.text(`${data.hospitalName || ''} ${data.branchAddress ? '· ' + data.branchAddress : ''}`.trim(), 105, 289, { align: 'center' });

  return { doc, filename: `DeathCertificate_${data.certificateNumber}.pdf` };
}
