import { z } from 'zod';

// Mobile booking form. doctorId comes from the speciality/doctor picker;
// the slot picker yields date + time. Reason is short free-text from the
// patient.
export const bookAppointmentSchema = z.object({
  doctorId: z.string().min(1),
  appointmentDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date'),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  type: z.enum(['consultation', 'follow_up', 'emergency']).default('consultation'),
  reason: z.string().max(500).optional(),
});
export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;

export const cancelAppointmentSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

// DTO returned to mobile clients. We flatten doctor.name into a single
// string so the UI doesn't have to walk relations.
export interface AppointmentDTO {
  id: string;
  doctorId: string;
  doctorName: string;
  patientId: string;
  appointmentDate: string;
  appointmentTime: string;
  type: string;
  status: string;
  reason: string | null;
}

export interface DoctorSlotDTO {
  doctorId: string;
  doctorName: string;
  speciality: string | null;
  // Available slots for the requested date, in HH:MM. Empty array = doctor
  // is fully booked or unavailable that day.
  slots: string[];
}
