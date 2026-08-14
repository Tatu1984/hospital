import { prisma } from '../../shared/prisma';
import { BookTripInput } from './ambulance.model';

// AmbulanceTrip has no patientName/patientPhone columns (the staff console's
// POST /api/ambulance/trips doesn't persist them either — see server.ts —
// it only echoes them back in the response). We do have `patientId` as a
// plain, unlinked scalar though, so patient-booked trips at least carry a
// real reference the dispatch console can resolve, plus the caller's name/
// phone folded into `remarks` so the dispatcher sees it without a join.
export async function createTripForPatient(
  tenantId: string,
  patientId: string,
  patientName: string,
  patientPhone: string | null,
  input: BookTripInput,
) {
  // AmbulanceTrip also has no `urgency` column — folded into remarks
  // alongside the requester's name/phone since dispatch needs to see it.
  const remarksParts = [
    `Requested by patient: ${patientName}${patientPhone ? ` (${patientPhone})` : ''}`,
    `Urgency: ${input.urgency}`,
  ];
  if (input.notes?.trim()) remarksParts.push(input.notes.trim());

  return prisma.ambulanceTrip.create({
    data: {
      tenantId,
      patientId,
      vehicleNumber: 'UNASSIGNED',
      pickupLocation: input.pickupLocation,
      dropLocation: input.dropLocation,
      tripType: input.tripType,
      status: 'pending',
      remarks: remarksParts.join(' — '),
    },
  });
}

export async function listTripsForPatient(tenantId: string, patientId: string) {
  return prisma.ambulanceTrip.findMany({
    where: { tenantId, patientId },
    orderBy: { startTime: 'desc' },
  });
}
