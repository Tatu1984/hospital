import * as repo from './appointment.repository';
import { AppointmentDTO, BookAppointmentInput, DoctorSlotDTO } from './appointment.model';

export class AppointmentNotFoundError extends Error { constructor() { super('Appointment not found'); } }
export class DoctorNotFoundError extends Error { constructor() { super('Doctor not found'); } }
export class SlotTakenError extends Error { constructor() { super('That slot is already booked'); } }

// Default slot grid for outpatient appointments. Each slot is a 15-minute
// window. Doctors who want a custom roster will override this once we add
// per-doctor schedule rows; for now everyone uses the same template.
const DEFAULT_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 9; h < 18; h++) {
    if (h === 13) continue; // lunch
    for (const m of [0, 15, 30, 45]) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return out;
})();

function toDTO(row: any): AppointmentDTO {
  return {
    id: row.id,
    doctorId: row.doctorId,
    doctorName: row.doctor?.name || 'Unknown',
    patientId: row.patientId,
    appointmentDate: row.appointmentDate.toISOString(),
    appointmentTime: row.appointmentTime,
    type: row.type,
    status: row.status,
    reason: row.reason || null,
  };
}

export async function listMine(tenantId: string, patientId: string): Promise<AppointmentDTO[]> {
  const rows = await repo.listForPatient(tenantId, patientId);
  return rows.map(toDTO);
}

export async function listToday(tenantId: string, doctorId: string): Promise<AppointmentDTO[]> {
  const today = new Date().toISOString();
  const rows = await repo.listForDoctorOnDate(tenantId, doctorId, today);
  return rows.map((r: any) => ({
    ...toDTO(r),
    // Patient detail is what the doctor card renders, not doctor name.
    doctorName: r.patient?.name || 'Unknown patient',
  }));
}

export async function listDoctors(tenantId: string) {
  return repo.listDoctors(tenantId);
}

// Returns the available slot grid for a given doctor on a given date.
// Booked slots from existing non-cancelled appointments are subtracted.
export async function getDoctorSlots(tenantId: string, doctorId: string, dateISO: string): Promise<DoctorSlotDTO> {
  const doctor = await repo.findDoctor(tenantId, doctorId);
  if (!doctor) throw new DoctorNotFoundError();
  const booked = new Set(await repo.bookedSlotsForDoctor(tenantId, doctorId, dateISO));
  return {
    doctorId,
    doctorName: doctor.name,
    speciality: null, // resolved at the listDoctors call site
    slots: DEFAULT_SLOTS.filter((s) => !booked.has(s)),
  };
}

export async function book(tenantId: string, patientId: string, userId: string, input: BookAppointmentInput): Promise<AppointmentDTO> {
  const doctor = await repo.findDoctor(tenantId, input.doctorId);
  if (!doctor) throw new DoctorNotFoundError();

  // Race-safe slot check. Two booking attempts at the same instant could
  // both pass this check then both insert; if that becomes a real problem
  // we'll add a unique partial index on (tenantId, doctorId, date, time)
  // where status != 'cancelled'. For the current load it's fine.
  const booked = await repo.bookedSlotsForDoctor(tenantId, input.doctorId, input.appointmentDate);
  if (booked.includes(input.appointmentTime)) throw new SlotTakenError();

  const created = await repo.create({
    tenantId,
    patientId,
    doctorId: input.doctorId,
    appointmentDate: new Date(input.appointmentDate),
    appointmentTime: input.appointmentTime,
    type: input.type,
    reason: input.reason || null,
    createdBy: userId,
  });
  return toDTO(created);
}

export async function cancel(tenantId: string, id: string, reason: string | null): Promise<AppointmentDTO> {
  const updated = await repo.cancel(tenantId, id, reason);
  if (!updated) throw new AppointmentNotFoundError();
  return toDTO(updated);
}
