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

export async function pendingOrderCounts(doctorId: string) {
  // Lab + radiology orders ordered by this doctor still in 'pending' state.
  // Order has no tenantId column itself; ordering is via the patient.
  const orders = await prisma.order.groupBy({
    by: ['orderType'],
    where: { orderedBy: doctorId, status: 'pending' },
    _count: { id: true },
  });
  let lab = 0;
  let rad = 0;
  for (const r of orders) {
    if (r.orderType === 'lab') lab = r._count.id;
    else if (r.orderType === 'radiology') rad = r._count.id;
  }
  return { lab, rad };
}

export async function todaysSurgeriesForDoctor(tenantId: string, doctorId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return prisma.surgery.count({
    where: {
      tenantId,
      surgeonId: doctorId,
      scheduledDate: { gte: start, lt: end },
      status: { notIn: ['cancelled', 'completed'] },
    },
  });
}
