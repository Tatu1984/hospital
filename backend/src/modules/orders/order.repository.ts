import { prisma } from '../../shared/prisma';

// Pending orders for a patient — both lab and radiology in one query so the
// doctor can scan the chart in one network call. Tenant scope is enforced
// upstream via the Patient row (the controller validates the patient
// belongs to req.user.tenantId before getting here).
export async function listForPatient(patientId: string) {
  return prisma.order.findMany({
    where: { patientId, orderType: { in: ['lab', 'radiology'] } },
    orderBy: { orderedAt: 'desc' },
    include: { results: { select: { id: true } } },
    take: 50,
  });
}

export async function findById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: { patient: { select: { tenantId: true, name: true, mrn: true } } },
  });
}

// Atomic write: create the Result + flip the parent Order to completed.
// Both rows land or neither — protects against half-state if the db
// connection drops between writes.
export async function submitResult(orderId: string, resultData: any, verifiedBy: string, isCritical: boolean) {
  return prisma.$transaction(async (tx) => {
    const result = await tx.result.create({
      data: {
        orderId,
        resultData,
        verifiedBy,
        isCritical,
      },
    });
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'completed' },
    });
    return result;
  });
}
