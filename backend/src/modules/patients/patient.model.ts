// Zod input schemas + TypeScript DTOs for the patients module.
// Anything the controller validates from req.body or req.query is defined
// here; anything the service returns to the controller is also typed here.

import { z } from 'zod';

// Mobile clients send a thin patient-update form (phone, address, emergency
// contact). Other fields like MRN or tenantId are server-controlled.
export const updateMyProfileSchema = z.object({
  contact: z.string().min(7).max(20).optional(),
  email: z.string().email().optional(),
  address: z.string().max(500).optional(),
  emergencyContact: z.string().max(500).optional(),
  bloodGroup: z.string().max(10).optional(),
  allergies: z.string().max(2000).optional(),
});
export type UpdateMyProfileInput = z.infer<typeof updateMyProfileSchema>;

// DTO returned by the home aggregator. Designed to fit a mobile dashboard
// in one network call — any individual section that can't be loaded falls
// back to null/[] rather than failing the whole response.
export interface PatientHomeDTO {
  patient: {
    id: string;
    mrn: string;
    name: string;
    bloodGroup: string | null;
    allergies: string | null;
    contact: string | null;
    email: string | null;
  };
  upcomingAppointment: {
    id: string;
    doctorName: string;
    appointmentDate: string;
    appointmentTime: string;
    type: string;
    status: string;
  } | null;
  latestPrescriptionId: string | null;
  outstandingBillTotal: number;
  outstandingBillCount: number;
  activeAdmissionId: string | null;
  // Family OT tracker tokens — if the patient (or a linked family member) is
  // listed as an OT family contact, the mobile home shows a "Surgery in
  // progress" card with a tap-through.
  activeSurgeryTrackerTokens: string[];
}
