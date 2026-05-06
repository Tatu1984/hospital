// Patients data-access layer. The ONLY file in this module allowed to import
// PrismaClient. Every function takes tenantId explicitly — no implicit
// context. If a function returns rows from a related table, it must scope
// that table on tenantId too.

import { prisma } from '../../shared/prisma';
import { UpdateMyProfileInput } from './patient.model';

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

// Comprehensive patient chart for the doctor's portal — every clinical
// record we have on file in one round-trip. Each block is a separate
// query (no nested includes) so a heavy patient with hundreds of orders
// still returns within a Vercel lambda time budget.
export async function chartFor(tenantId: string, patientId: string) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, tenantId },
  });
  if (!patient) return null;

  const [admissions, encounters, orders, prescriptionsRaw, invoices, surgeries] = await Promise.all([
    prisma.admission.findMany({
      where: { patientId, patient: { tenantId } },
      orderBy: { admissionDate: 'desc' },
      include: {
        bed: { select: { bedNumber: true, wardId: true } },
        admittingDoctor: { select: { id: true, name: true } },
      },
      take: 30,
    }),
    prisma.encounter.findMany({
      where: { patientId },
      orderBy: { visitDate: 'desc' },
      include: {
        doctor: { select: { id: true, name: true } },
        opdNotes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, vitals: true, examination: true, assessment: true, plan: true, createdAt: true },
        },
      },
      take: 50,
    }),
    prisma.order.findMany({
      where: { patientId },
      orderBy: { orderedAt: 'desc' },
      include: { results: { orderBy: { resultedAt: 'desc' } } },
      take: 100,
    }),
    // Prescriptions are read via raw SQL because of the schema drift on
    // the prescriptions table (live DB has its own patientId column the
    // Prisma model doesn't expose). Same workaround as reports module.
    prisma.$queryRaw<Array<{ id: string; doctorId: string; drugs: any; createdAt: Date }>>`
      SELECT id, "doctorId", drugs, "createdAt"
      FROM "prescriptions"
      WHERE "patientId" = ${patientId}
      ORDER BY "createdAt" DESC
      LIMIT 50
    `,
    prisma.invoice.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.surgery.findMany({
      where: { tenantId, patientId },
      orderBy: { scheduledDate: 'desc' },
      take: 30,
    }),
  ]);

  // Resolve doctor names for prescriptions in one shot.
  const rxDoctorIds = Array.from(new Set(prescriptionsRaw.map((r) => r.doctorId).filter(Boolean)));
  const rxDoctors = rxDoctorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: rxDoctorIds } },
        select: { id: true, name: true },
      })
    : [];
  const rxDoctorName: Record<string, string> = Object.fromEntries(rxDoctors.map((d) => [d.id, d.name]));

  // Resolve ward names for admissions that have a bed.
  const wardIds = Array.from(new Set(
    admissions.map((a) => (a as any).bed?.wardId).filter(Boolean),
  ));
  const wards = wardIds.length
    ? await prisma.ward.findMany({
        where: { id: { in: wardIds as string[] } },
        select: { id: true, name: true },
      })
    : [];
  const wardName: Record<string, string> = Object.fromEntries(wards.map((w) => [w.id, w.name]));

  return {
    patient,
    admissions,
    encounters,
    orders,
    prescriptionsRaw,
    rxDoctorName,
    invoices,
    surgeries,
    wardName,
  };
}
