import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function listForPatient(tenantId: string, patientId: string) {
  return prisma.appointment.findMany({
    where: { tenantId, patientId },
    orderBy: { appointmentDate: 'desc' },
    include: { doctor: { select: { id: true, name: true } } },
  });
}

export async function listForDoctorOnDate(tenantId: string, doctorId: string, dateISO: string) {
  // Date-only filter — appointments are scheduled by date + time string.
  // We fetch the whole day window then trust appointmentTime for ordering.
  const start = new Date(dateISO);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return prisma.appointment.findMany({
    where: {
      tenantId,
      doctorId,
      appointmentDate: { gte: start, lt: end },
    },
    orderBy: { appointmentTime: 'asc' },
    include: { patient: { select: { id: true, name: true, mrn: true } } },
  });
}

export async function findById(tenantId: string, id: string) {
  return prisma.appointment.findFirst({
    where: { id, tenantId },
    include: { doctor: { select: { name: true } } },
  });
}

export async function create(input: {
  tenantId: string;
  patientId: string;
  doctorId: string;
  appointmentDate: Date;
  appointmentTime: string;
  type: string;
  reason: string | null;
  createdBy: string;
}) {
  return prisma.appointment.create({
    data: {
      tenantId: input.tenantId,
      patientId: input.patientId,
      doctorId: input.doctorId,
      appointmentDate: input.appointmentDate,
      appointmentTime: input.appointmentTime,
      type: input.type,
      status: 'scheduled',
      reason: input.reason,
      createdBy: input.createdBy,
    },
    include: { doctor: { select: { name: true } } },
  });
}

export async function cancel(tenantId: string, id: string, reason: string | null) {
  const result = await prisma.appointment.updateMany({
    where: { id, tenantId, status: { notIn: ['cancelled', 'completed'] } },
    data: { status: 'cancelled', notes: reason },
  });
  if (result.count === 0) return null;
  return findById(tenantId, id);
}

// Booked slots for a doctor on a given date — used to compute availability.
export async function bookedSlotsForDoctor(tenantId: string, doctorId: string, dateISO: string) {
  const start = new Date(dateISO);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const rows = await prisma.appointment.findMany({
    where: {
      tenantId,
      doctorId,
      appointmentDate: { gte: start, lt: end },
      status: { notIn: ['cancelled'] },
    },
    select: { appointmentTime: true },
  });
  return rows.map((r) => r.appointmentTime);
}

// Doctors directory. We don't have a Doctor table — they live as User rows
// with a 'DOCTOR' role; departmentIds is an array. Speciality is best-effort
// from the first department name (the existing data model doesn't have a
// dedicated speciality column on User).
const DOCTOR_ROLE_IDS = new Set(['DOCTOR', 'CONSULTANT', 'SURGEON']);

export async function listDoctors(tenantId: string) {
  const rows = await prisma.user.findMany({
    where: { tenantId, isActive: true, roleIds: { hasSome: Array.from(DOCTOR_ROLE_IDS) } },
    select: { id: true, name: true, departmentIds: true },
    orderBy: { name: 'asc' },
  });
  // Resolve department names in a single follow-up query.
  const departmentIds = Array.from(new Set(rows.flatMap((r) => r.departmentIds || [])));
  const departments = departmentIds.length
    ? await prisma.department.findMany({
        where: { id: { in: departmentIds } },
        select: { id: true, name: true },
      })
    : [];
  const deptName: Record<string, string> = Object.fromEntries(departments.map((d) => [d.id, d.name]));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    speciality: (r.departmentIds || []).map((id) => deptName[id]).find(Boolean) || null,
  }));
}

export async function findDoctor(tenantId: string, doctorId: string) {
  return prisma.user.findFirst({
    where: { id: doctorId, tenantId, isActive: true },
    select: { id: true, name: true, departmentIds: true },
  });
}
