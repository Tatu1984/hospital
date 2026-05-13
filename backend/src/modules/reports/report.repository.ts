import { prisma } from '../../shared/prisma';

// All four queries are scoped via patient.tenantId in the service layer
// (the controller validates the JWT's patientId belongs to the tenant
// before getting here). Each repo function takes patientId only because
// the parent Patient row already gates the tenant.

export async function listLabAndRadiologyOrders(patientId: string) {
  return prisma.order.findMany({
    where: { patientId, orderType: { in: ['lab', 'radiology'] } },
    orderBy: { orderedAt: 'desc' },
    include: { results: { orderBy: { resultedAt: 'desc' } } },
    take: 50,
  });
}

export async function listPrescriptions(patientId: string) {
  // Migration 20260513000000_reconcile_prescriptions brought the live
  // table back in line with the Prisma model, so this can now be a
  // typed prisma.prescription query — the raw $queryRaw + manual
  // doctor join is gone.
  return prisma.prescription.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      doctorId: true,
      drugs: true,
      createdAt: true,
      doctor: { select: { name: true } },
    },
  });
}

export async function listInvoices(patientId: string) {
  return prisma.invoice.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function findOrder(patientId: string, id: string) {
  return prisma.order.findFirst({
    where: { id, patientId },
    include: {
      results: { orderBy: { resultedAt: 'desc' } },
      encounter: { include: { doctor: { select: { name: true } } } },
    },
  });
}

export async function findPrescription(patientId: string, id: string) {
  // Same schema-drift workaround as listPrescriptions above. Query by
  // (id, patientId) directly so we don't depend on opdNote being set or
  // joining cleanly.
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    doctorId: string;
    drugs: any;
    createdAt: Date;
  }>>`
    SELECT id, "doctorId", drugs, "createdAt"
    FROM "prescriptions"
    WHERE id = ${id} AND "patientId" = ${patientId}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const r = rows[0];
  const doctor = r.doctorId
    ? await prisma.user.findUnique({ where: { id: r.doctorId }, select: { name: true } })
    : null;
  return {
    id: r.id,
    doctorId: r.doctorId,
    drugs: r.drugs,
    createdAt: r.createdAt,
    doctor: doctor ? { name: doctor.name } : null,
  };
}

export async function findInvoice(patientId: string, id: string) {
  return prisma.invoice.findFirst({
    where: { id, patientId },
  });
}
