// DTOs for the doctor's personal dashboard. Returned by
// GET /api/mobile/v1/doctors/me/dashboard so the doctor's portal landing
// has every chart-style block in one round-trip.

export interface IpdPatient {
  admissionId: string;
  patientId: string;
  patientName: string;
  mrn: string;
  bedNumber: string | null;
  admissionDate: string; // ISO
  daysInWard: number;
  diagnosis: string | null;
}

export interface IpdWardGroup {
  wardId: string;
  wardName: string;
  wardType: string | null;
  floor: string | null;
  patients: IpdPatient[];
}

export interface OpdAppointment {
  appointmentId: string;
  patientId: string;
  patientName: string;
  mrn: string;
  appointmentTime: string;
  type: string;
  status: string;
  reason: string | null;
}

// Surgery scheduled for the doctor today, drilled-down version of the
// "OT TODAY" stat card so the dashboard can show the actual list.
export interface SurgeryListItem {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  scheduledTime: string | null;
  procedureName: string;
  status: string;
  priority: string;
  otRoom: string | null;
}

// Pending lab/radiology order ordered by this doctor still awaiting result.
// Both categories share the same shape — only `category` differs.
export interface PendingOrderItem {
  id: string;
  category: 'lab' | 'radiology';
  patientId: string;
  patientName: string;
  mrn: string;
  orderedAt: string;
  priority: string;
  // For lab: "CBC, LFT" — joined test names. For radiology: "X-Ray Chest".
  summary: string;
}

export interface DoctorDashboardDTO {
  doctor: {
    id: string;
    name: string;
    qualifications: string | null;
    specialization: string | null;
    departments: string[];
    displayName: string;
    displaySubtitle: string | null;
  };
  ipd: {
    totalActive: number;
    byWard: IpdWardGroup[];
    unassigned: IpdPatient[];
  };
  opd: {
    todayCount: number;
    nextUpAt: string | null;
    appointments: OpdAppointment[];
  };
  // Drilldown lists for the OT / lab / imaging stat cards. Each card on
  // the dashboard is clickable and switches the section below to render
  // its corresponding list.
  ot: {
    todayCount: number;
    today: SurgeryListItem[];
  };
  pendingLabs: {
    count: number;
    items: PendingOrderItem[];
  };
  pendingImaging: {
    count: number;
    items: PendingOrderItem[];
  };
  // Legacy flat counters retained for backwards-compat with the previous
  // dashboard payload shape.
  pendingLabResults: number;
  pendingRadiology: number;
  scheduledSurgeriesToday: number;
}

// One revenue line attributable to the doctor. Backed by a DoctorRevenue
// row (which links back to the invoice that generated the revenue).
export interface RevenueLine {
  id: string;
  createdAt: string;
  revenueType: string;     // 'consultation' | 'procedure' | 'investigation'
  shareAmount: number;     // doctor's earned share for this line
  status: string;          // 'pending' | 'approved' | 'paid'
  invoiceId: string;
  invoiceType: string | null;
  patientId: string | null;
  patientName: string | null;
  mrn: string | null;
}

// One processed payout to the doctor — a transfer they actually got.
export interface PayoutLine {
  id: string;
  payoutNumber: string;
  fromDate: string;
  toDate: string;
  totalShare: number;
  deductions: number;
  netAmount: number;
  paymentMode: string;
  paymentReference: string | null;
  paymentDate: string;
  status: string;
}

// Aggregate counters for one window (today / week / month).
export interface FinancePeriod {
  windowStart: string;
  earned: number;   // sum of shareAmount in window (any status)
  paid: number;     // sum where status = 'paid'
  pending: number;  // earned - paid
  count: number;    // number of revenue lines
}

export interface DoctorFinanceDTO {
  doctor: { id: string; name: string };
  contract: {
    contractNumber: string;
    revenueShareType: string;
    revenueShareValue: number;
    paymentCycle: string;
    isActive: boolean;
  } | null;
  today: FinancePeriod;
  week: FinancePeriod;
  month: FinancePeriod;
  // 6-month trend, oldest → newest, for the chart on the finance page.
  trend: Array<{ month: string; earned: number; paid: number }>;
  // Lifetime totals so the doctor sees what they've made overall.
  lifetime: { earned: number; paid: number; pending: number };
  recentRevenues: RevenueLine[];
  recentPayouts: PayoutLine[];
}
