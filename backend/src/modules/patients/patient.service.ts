// Business logic for patient-facing mobile features. Never sees req/res.
// Calls the repository; assembles DTOs the controller can JSON-serialise.

import * as repo from './patient.repository';
import { PatientHomeDTO, UpdateMyProfileInput } from './patient.model';

export class PatientNotFoundError extends Error {
  constructor() { super('Patient not found'); }
}

// Aggregates everything the mobile home dashboard needs in one round-trip.
// Each section is fetched in parallel with Promise.all; one failing section
// rejects the whole call (the controller catches and returns 500). Tighter
// per-section error handling can be added later if a specific section is
// flaky in production.
export async function getHome(tenantId: string, patientId: string): Promise<PatientHomeDTO> {
  const patient = await repo.findById(tenantId, patientId);
  if (!patient) throw new PatientNotFoundError();

  const [
    upcoming,
    latestRxId,
    bills,
    activeAdmissionId,
    surgeryTokens,
  ] = await Promise.all([
    repo.findUpcomingAppointment(tenantId, patientId),
    repo.findLatestPrescriptionId(tenantId, patientId),
    repo.findOutstandingBills(tenantId, patientId),
    repo.findActiveAdmissionId(tenantId, patientId),
    repo.findActiveSurgeryTrackerTokens(tenantId, patient.contact),
  ]);

  return {
    patient: {
      id: patient.id,
      mrn: patient.mrn,
      name: patient.name,
      bloodGroup: patient.bloodGroup,
      allergies: patient.allergies,
      contact: patient.contact,
      email: patient.email,
    },
    upcomingAppointment: upcoming
      ? {
          id: upcoming.id,
          doctorName: upcoming.doctor?.name || 'Unknown',
          appointmentDate: upcoming.appointmentDate.toISOString(),
          appointmentTime: upcoming.appointmentTime,
          type: upcoming.type,
          status: upcoming.status,
        }
      : null,
    latestPrescriptionId: latestRxId,
    outstandingBillTotal: bills.total,
    outstandingBillCount: bills.count,
    activeAdmissionId,
    activeSurgeryTrackerTokens: surgeryTokens,
  };
}

export async function updateMyProfile(
  tenantId: string,
  patientId: string,
  input: UpdateMyProfileInput,
) {
  const updated = await repo.updateProfile(tenantId, patientId, input);
  if (!updated) throw new PatientNotFoundError();
  // Don't echo every column back — the home payload shape is the canonical
  // patient view. The caller can re-fetch it after a successful update.
  return {
    id: updated.id,
    mrn: updated.mrn,
    name: updated.name,
    contact: updated.contact,
    email: updated.email,
    address: updated.address,
    emergencyContact: updated.emergencyContact,
    bloodGroup: updated.bloodGroup,
    allergies: updated.allergies,
  };
}

// Comprehensive patient chart — every clinical record on file. Used by the
// doctor's portal and by the doctor app's patient detail screen so a
// clinician sees the full picture without flipping between tabs.
export async function getChart(tenantId: string, patientId: string) {
  const data = await repo.chartFor(tenantId, patientId);
  if (!data) throw new PatientNotFoundError();
  const { patient, admissions, encounters, orders, prescriptionsRaw, rxDoctorName, invoices, surgeries, wardName } = data;

  return {
    patient: {
      id: patient.id,
      mrn: patient.mrn,
      name: patient.name,
      dob: patient.dob,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      contact: patient.contact,
      email: patient.email,
      address: patient.address,
      allergies: patient.allergies,
      emergencyContact: patient.emergencyContact,
      photo: patient.photo,
      purpose: patient.purpose,
      createdAt: patient.createdAt.toISOString(),
    },
    admissions: admissions.map((a: any) => ({
      id: a.id,
      admissionDate: a.admissionDate.toISOString(),
      dischargeDate: a.dischargeDate?.toISOString() || null,
      status: a.status,
      diagnosis: a.diagnosis,
      bedNumber: a.bed?.bedNumber || null,
      wardName: a.bed?.wardId ? (wardName[a.bed.wardId] || null) : null,
      doctorName: a.admittingDoctor?.name || null,
      doctorId: a.admittingDoctor?.id || null,
    })),
    encounters: encounters.map((e: any) => ({
      id: e.id,
      type: e.type,
      visitDate: e.visitDate.toISOString(),
      status: e.status,
      chiefComplaint: e.chiefComplaint,
      doctorId: e.doctor?.id || null,
      doctorName: e.doctor?.name || null,
      latestNote: e.opdNotes?.[0] ? {
        id: e.opdNotes[0].id,
        vitals: e.opdNotes[0].vitals,
        examination: e.opdNotes[0].examination,
        assessment: e.opdNotes[0].assessment,
        plan: e.opdNotes[0].plan,
        createdAt: e.opdNotes[0].createdAt.toISOString(),
      } : null,
    })),
    orders: orders.map((o: any) => ({
      id: o.id,
      category: o.orderType, // 'lab' | 'radiology' | other
      orderedAt: o.orderedAt.toISOString(),
      status: o.status,
      priority: o.priority,
      details: o.details,
      results: (o.results || []).map((r: any) => ({
        id: r.id,
        resultedAt: r.resultedAt.toISOString(),
        resultData: r.resultData,
        verifiedBy: r.verifiedBy,
        isCritical: r.isCritical,
      })),
    })),
    prescriptions: prescriptionsRaw.map((rx: any) => ({
      id: rx.id,
      issuedAt: rx.createdAt.toISOString(),
      doctorName: rxDoctorName[rx.doctorId] || null,
      drugs: rx.drugs,
    })),
    invoices: invoices.map((inv: any) => ({
      id: inv.id,
      type: inv.type,
      createdAt: inv.createdAt.toISOString(),
      status: inv.status,
      total: Number(inv.total),
      paid: Number(inv.paid),
      balance: Number(inv.balance),
    })),
    surgeries: surgeries.map((s: any) => ({
      id: s.id,
      procedureName: s.procedureName,
      surgeonName: s.surgeonName,
      scheduledDate: s.scheduledDate.toISOString(),
      scheduledTime: s.scheduledTime,
      status: s.status,
      currentStage: s.currentStage,
    })),
  };
}
