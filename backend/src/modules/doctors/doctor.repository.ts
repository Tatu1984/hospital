import { prisma } from '../../shared/prisma';

export async function findDoctorWithDepartments(userId: string, tenantId: string) {
  const u = await prisma.user.findFirst({
    where: { id: userId, tenantId },
  });
  if (!u) return null;
  const departmentIds = u.departmentIds || [];
  const departments = departmentIds.length
    ? await prisma.department.findMany({
        where: { id: { in: departmentIds } },
        select: { id: true, name: true },
      })
    : [];
  return { user: u, departments };
}

export async function activeAdmissionsByDoctor(tenantId: string, doctorId: string) {
  return prisma.admission.findMany({
    where: {
      admittingDoctorId: doctorId,
      status: 'active',
      patient: { tenantId },
    },
    orderBy: { admissionDate: 'desc' },
    include: {
      patient: { select: { id: true, name: true, mrn: true } },
      bed: { select: { id: true, bedNumber: true, wardId: true } },
    },
  });
}

export async function wardsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return prisma.ward.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, type: true, floor: true },
  });
}

export async function todaysAppointmentsForDoctor(tenantId: string, doctorId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return prisma.appointment.findMany({
    where: {
      tenantId,
      doctorId,
      appointmentDate: { gte: start, lt: end },
      status: { notIn: ['cancelled'] },
    },
    orderBy: { appointmentTime: 'asc' },
    include: { patient: { select: { id: true, name: true, mrn: true } } },
  });
}

// Pending lab + radiology orders this doctor placed, with patient header
// inlined so the dashboard can drill in without a follow-up fetch.
export async function pendingOrdersForDoctor(tenantId: string, doctorId: string) {
  return prisma.order.findMany({
    where: {
      orderedBy: doctorId,
      status: 'pending',
      orderType: { in: ['lab', 'radiology'] },
      patient: { tenantId },
    },
    orderBy: { orderedAt: 'desc' },
    include: {
      patient: { select: { id: true, name: true, mrn: true } },
    },
    take: 100,
  });
}

// All revenue rows attributable to this doctor since `from`. Status
// drives the done/pending split: 'paid' = done, anything else = left.
// Per-row metadata (invoice id, revenue type) is included so the UI can
// render a recent-activity feed without a second roundtrip.
export async function doctorRevenuesSince(doctorId: string, from: Date) {
  return prisma.doctorRevenue.findMany({
    where: { doctorId, createdAt: { gte: from } },
    orderBy: { createdAt: 'desc' },
    include: {
      invoice: {
        select: {
          id: true,
          type: true,
          total: true,
          patient: { select: { id: true, name: true, mrn: true } },
        },
      },
    },
    take: 500,
  });
}

// Doctor's own contract — used to surface payment-cycle / share rate on
// the finance page so they understand how the numbers were derived.
export async function doctorContract(doctorId: string) {
  return prisma.doctorContract.findUnique({ where: { doctorId } });
}

// Last N payouts processed for this doctor, newest first.
export async function doctorPayouts(doctorId: string, take = 24) {
  return prisma.doctorPayout.findMany({
    where: { doctorId },
    orderBy: { paymentDate: 'desc' },
    take,
  });
}

// Surgeries the doctor is on for today (scheduled or in progress).
// Returns rows with patient header so the dashboard's OT card drill-down
// renders names, MRNs and times in one round-trip.
export async function todaysSurgeriesForDoctor(tenantId: string, doctorId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return prisma.surgery.findMany({
    where: {
      tenantId,
      surgeonId: doctorId,
      scheduledDate: { gte: start, lt: end },
      status: { notIn: ['cancelled', 'completed'] },
    },
    orderBy: { scheduledTime: 'asc' },
  });
}
