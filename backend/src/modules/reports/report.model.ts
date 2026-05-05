// DTOs for the patient-facing reports timeline. The list view is a flat,
// reverse-chrono feed of every health record the patient owns; tapping an
// item fetches the type-specific detail view.

export type ReportCategory = 'lab' | 'radiology' | 'prescription' | 'invoice' | 'visit';

export interface ReportListItem {
  id: string;
  category: ReportCategory;
  title: string;          // human-readable headline (e.g. "Complete Blood Count")
  date: string;           // ISO timestamp — drives the chronological sort
  status: string;         // category-appropriate status (pending / resulted / paid)
  // Tiny preview line shown in the list. For a lab order with results this
  // might be "5 values resulted"; for an invoice "₹4,500 outstanding".
  summary: string;
}

// Each report-type detail keeps its own DTO. Mobile renders a different
// component per category and benefits from typed payloads rather than a
// shared bag-of-fields shape.

export interface LabReportDetail {
  id: string;
  category: 'lab';
  orderedAt: string;
  status: string;
  details: any;          // ordered tests, instructions, etc.
  results: Array<{
    id: string;
    resultedAt: string;
    resultData: any;     // structured test → value rows
    verifiedBy: string | null;
  }>;
  doctorName: string | null;
}

export interface RadiologyReportDetail {
  id: string;
  category: 'radiology';
  orderedAt: string;
  status: string;
  details: any;          // modality, body part, indication
  results: Array<{
    id: string;
    resultedAt: string;
    resultData: any;     // findings text + impressions
    verifiedBy: string | null;
  }>;
  doctorName: string | null;
}

export interface PrescriptionDetail {
  id: string;
  category: 'prescription';
  issuedAt: string;
  doctorName: string | null;
  drugs: any;            // [{ name, dose, frequency, days, instructions }]
}

export interface InvoiceDetail {
  id: string;
  category: 'invoice';
  type: string;
  createdAt: string;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
  items: any;
}

export type ReportDetail =
  | LabReportDetail
  | RadiologyReportDetail
  | PrescriptionDetail
  | InvoiceDetail;
