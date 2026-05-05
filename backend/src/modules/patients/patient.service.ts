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
