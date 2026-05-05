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
  // The live prescriptions table has both an opdNoteId (FK to OPDNote) AND
  // its own patientId column — schema drift from an earlier iteration. We
  // query by patientId directly via raw SQL to catch every row regardless
  // of how it was inserted, then re-join doctor.name in JS for the display.
  // Once the schema drift is reconciled (drop redundant patientId or
  // re-add it to Prisma), this can revert to a typed prisma.prescription
  // query.
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    doctorId: string;
    drugs: any;
    createdAt: Date;
  }>>`
    SELECT id, "doctorId", drugs, "createdAt"
    FROM "prescriptions"
    WHERE "patientId" = ${patientId}
    ORDER BY "createdAt" DESC
    LIMIT 50
  `;
  if (rows.length === 0) return [];
  const doctorIds = Array.from(new Set(rows.map((r) => r.doctorId).filter(Boolean)));
  const doctors = doctorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: doctorIds } },
        select: { id: true, name: true },
      })
    : [];
  const dn: Record<string, string> = Object.fromEntries(doctors.map((d) => [d.id, d.name]));
  return rows.map((r) => ({
    id: r.id,
    doctorId: r.doctorId,
    drugs: r.drugs,
    createdAt: r.createdAt,
    doctor: r.doctorId ? { name: dn[r.doctorId] || 'Unknown' } : null,
  }));
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
