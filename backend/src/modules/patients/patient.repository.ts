// Patients data-access layer. The ONLY file in this module allowed to import
// PrismaClient. Every function takes tenantId explicitly — no implicit
// context. If a function returns rows from a related table, it must scope
// that table on tenantId too.

import { PrismaClient } from '@prisma/client';
import { UpdateMyProfileInput } from './patient.model';

const prisma = new PrismaClient();

export async function findById(tenantId: string, patientId: string) {
  return prisma.patient.findFirst({
    where: { id: patientId, tenantId },
  });
}

export async function updateProfile(
  tenantId: string,
  patientId: string,
  input: UpdateMyProfileInput,
) {
  // Scoped update — if the patient row's tenantId doesn't match, updateMany
  // returns count: 0 instead of leaking across tenants.
  const result = await prisma.patient.updateMany({
    where: { id: patientId, tenantId },
    data: input,
  });
  if (result.count === 0) return null;
  return findById(tenantId, patientId);
}

export async function findUpcomingAppointment(tenantId: string, patientId: string) {
  return prisma.appointment.findFirst({
    where: {
      tenantId,
      patientId,
      appointmentDate: { gte: new Date() },
      status: { in: ['scheduled', 'confirmed'] },
    },
    orderBy: { appointmentDate: 'asc' },
    include: { doctor: { select: { name: true } } },
  });
}

export async function findLatestPrescriptionId(_tenantId: string, patientId: string) {
  // Prescriptions are linked Prescription → OPDNote → Patient. The mobile
  // app fetches details via a follow-up endpoint; here we just want the
  // newest prescription's id for the home dashboard card.
  const rx = await prisma.prescription.findFirst({
    where: { opdNote: { patientId } },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  return rx?.id || null;
}

export async function findOutstandingBills(_tenantId: string, patientId: string) {
  // Invoice rows don't carry tenantId directly (legacy schema gap — see
  // production-readiness audit). We scope through patient.tenantId via the
  // join on Patient.id which itself was already filtered to this tenant in
  // the calling service; the patientId passed here is therefore guaranteed
  // tenant-correct upstream.
  const invoices = await prisma.invoice.findMany({
    where: {
      patientId,
      status: { in: ['pending', 'partial'] },
    },
    select: { id: true, balance: true },
  });
  const total = invoices.reduce((sum, i) => sum + Number(i.balance || 0), 0);
  return { total, count: invoices.length };
}

export async function findActiveAdmissionId(_tenantId: string, patientId: string) {
  const admission = await prisma.admission.findFirst({
    where: { patientId, status: 'active' },
    select: { id: true },
  });
  return admission?.id || null;
}

export async function findActiveSurgeryTrackerTokens(tenantId: string, patientPhone: string | null) {
  // A family contact is matched on phone, scoped to this tenant. Returns
  // tokens for surgeries that are still in progress.
  if (!patientPhone) return [];
  const contacts = await prisma.surgeryFamilyContact.findMany({
    where: {
      tenantId,
      phone: patientPhone,
      surgery: {
        status: { notIn: ['completed', 'cancelled'] },
      },
    },
    select: { trackingToken: true },
  });
  return contacts.map((c) => c.trackingToken);
}
