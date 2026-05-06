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
    unassigned: IpdPatient[]; // admissions with no bed yet
  };
  opd: {
    todayCount: number;
    nextUpAt: string | null;
    appointments: OpdAppointment[];
  };
  // Convenience counters for the dashboard's stat strip.
  pendingLabResults: number;     // lab orders ordered by this doctor still pending
  pendingRadiology: number;
  scheduledSurgeriesToday: number;
}
