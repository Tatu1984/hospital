import * as repo from './doctor.repository';
import { DoctorDashboardDTO, IpdPatient, IpdWardGroup, OpdAppointment } from './doctor.model';

export class NotADoctorError extends Error { constructor() { super('User is not a doctor'); } }

const DOCTOR_ROLE_IDS = new Set(['DOCTOR', 'CONSULTANT', 'SURGEON', 'doctor']);

export async function getMyDashboard(userId: string, tenantId: string): Promise<DoctorDashboardDTO> {
  const meta = await repo.findDoctorWithDepartments(userId, tenantId);
  if (!meta) throw new NotADoctorError();
  const { user, departments } = meta;
  // Soft check — admin users + receptionists wouldn't get a meaningful
  // payload, but rather than 403 we let them see the empty-state dashboard
  // (their admissions/appointments lists will just be empty). Keeps the
  // single landing route useful for everyone.

  const profile = (user.profile as any) || {};
  const doctorProfile = profile.doctor || {};
  const departmentNames = departments.map((d) => d.name);

  // IPD admissions under this doctor's care, grouped by ward.
  const admissions = await repo.activeAdmissionsByDoctor(tenantId, userId);
  const wardIds = Array.from(new Set(
    admissions
      .map((a: any) => a.bed?.wardId)
      .filter((id: string | null): id is string => !!id),
  ));
  const wards = await repo.wardsByIds(wardIds);
  const wardById: Record<string, { name: string; type: string | null; floor: string | null }> =
    Object.fromEntries(wards.map((w) => [w.id, { name: w.name, type: w.type, floor: w.floor }]));

  const groupedByWard: Record<string, IpdPatient[]> = {};
  const unassigned: IpdPatient[] = [];
  for (const a of admissions) {
    const days = Math.max(0, Math.floor((Date.now() - new Date(a.admissionDate).getTime()) / (24 * 3600 * 1000)));
    const dto: IpdPatient = {
      admissionId: a.id,
      patientId: a.patient?.id || a.patientId,
      patientName: a.patient?.name || 'Unknown',
      mrn: a.patient?.mrn || '',
      bedNumber: (a as any).bed?.bedNumber || null,
      admissionDate: a.admissionDate.toISOString(),
      daysInWard: days,
      diagnosis: a.diagnosis || null,
    };
    const wardId = (a as any).bed?.wardId;
    if (!wardId) unassigned.push(dto);
    else (groupedByWard[wardId] = groupedByWard[wardId] || []).push(dto);
  }

  const byWard: IpdWardGroup[] = Object.entries(groupedByWard).map(([wardId, patients]) => ({
    wardId,
    wardName: wardById[wardId]?.name || 'Unknown ward',
    wardType: wardById[wardId]?.type || null,
    floor: wardById[wardId]?.floor || null,
    patients,
  })).sort((a, b) => a.wardName.localeCompare(b.wardName));

  // OPD lineup for today.
  const appts = await repo.todaysAppointmentsForDoctor(tenantId, userId);
  const opdAppointments: OpdAppointment[] = appts.map((ap: any) => ({
    appointmentId: ap.id,
    patientId: ap.patient?.id || ap.patientId,
    patientName: ap.patient?.name || 'Unknown',
    mrn: ap.patient?.mrn || '',
    appointmentTime: ap.appointmentTime,
    type: ap.type,
    status: ap.status,
    reason: ap.reason || null,
  }));
  const nextUpAt = opdAppointments
    .filter((a) => a.status === 'scheduled' || a.status === 'confirmed')
    .map((a) => a.appointmentTime)
    .find(Boolean) || null;

  const counts = await repo.pendingOrderCounts(userId);
  const surgeriesToday = await repo.todaysSurgeriesForDoctor(tenantId, userId);

  return {
    doctor: {
      id: user.id,
      name: user.name,
      qualifications: doctorProfile.qualifications || null,
      specialization: doctorProfile.specialization || null,
      departments: departmentNames,
      displayName: [
        user.name,
        doctorProfile.qualifications && `(${doctorProfile.qualifications})`,
      ].filter(Boolean).join(' '),
      displaySubtitle: [
        doctorProfile.specialization,
        departmentNames.length ? departmentNames.join(', ') : null,
      ].filter(Boolean).join(' • ') || null,
    },
    ipd: {
      totalActive: admissions.length,
      byWard,
      unassigned,
    },
    opd: {
      todayCount: opdAppointments.length,
      nextUpAt,
      appointments: opdAppointments,
    },
    pendingLabResults: counts.lab,
    pendingRadiology: counts.rad,
    scheduledSurgeriesToday: surgeriesToday,
  };
}
