import * as repo from './ambulance.repository';
import * as patientRepo from '../patients/patient.repository';
import { BookTripInput } from './ambulance.model';

export class PatientNotFoundError extends Error {
  constructor() { super('Patient not found'); }
}

export async function bookTrip(tenantId: string, patientId: string, input: BookTripInput) {
  const patient = await patientRepo.findById(tenantId, patientId);
  if (!patient) throw new PatientNotFoundError();

  const trip = await repo.createTripForPatient(tenantId, patientId, patient.name, patient.contact, input);
  return {
    id: trip.id,
    status: trip.status,
    tripType: trip.tripType,
    pickupLocation: trip.pickupLocation,
    dropLocation: trip.dropLocation,
    vehicleNumber: trip.vehicleNumber,
    driverName: trip.driverName,
    driverContact: trip.driverContact,
    startTime: trip.startTime.toISOString(),
    endTime: trip.endTime?.toISOString() || null,
  };
}

export async function listMyTrips(tenantId: string, patientId: string) {
  const trips = await repo.listTripsForPatient(tenantId, patientId);
  return trips.map((trip) => ({
    id: trip.id,
    status: trip.status,
    tripType: trip.tripType,
    pickupLocation: trip.pickupLocation,
    dropLocation: trip.dropLocation,
    vehicleNumber: trip.vehicleNumber,
    driverName: trip.driverName,
    driverContact: trip.driverContact,
    startTime: trip.startTime.toISOString(),
    endTime: trip.endTime?.toISOString() || null,
  }));
}
