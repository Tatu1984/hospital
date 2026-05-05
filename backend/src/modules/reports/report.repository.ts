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
  return prisma.prescription.findMany({
    where: { opdNote: { patientId } },
    orderBy: { createdAt: 'desc' },
    include: { doctor: { select: { name: true } } },
    take: 50,
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
  return prisma.prescription.findFirst({
    where: { id, opdNote: { patientId } },
    include: { doctor: { select: { name: true } } },
  });
}

export async function findInvoice(patientId: string, id: string) {
  return prisma.invoice.findFirst({
    where: { id, patientId },
  });
}
