import * as repo from './doctor.repository';
import {
  DoctorDashboardDTO,
  IpdPatient,
  IpdWardGroup,
  OpdAppointment,
  SurgeryListItem,
  PendingOrderItem,
  DoctorFinanceDTO,
  FinancePeriod,
  RevenueLine,
  PayoutLine,
} from './doctor.model';

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

  // Pending orders + today's surgeries — full lists, not just counts, so
  // the dashboard's stat cards can drill down into them.
  const pendingOrders = await repo.pendingOrdersForDoctor(tenantId, userId);
  const surgeriesTodayRows = await repo.todaysSurgeriesForDoctor(tenantId, userId);

  const labItems: PendingOrderItem[] = [];
  const radItems: PendingOrderItem[] = [];
  for (const o of pendingOrders) {
    const details = (o.details as any) || {};
    const isLab = o.orderType === 'lab';
    const summary = isLab
      ? (() => {
          const tests = (details.tests || []) as Array<{ name?: string }>;
          const names = tests.map((t) => t.name).filter(Boolean);
          if (!names.length) return 'Lab order';
          return names.length > 1 ? `${names[0]} +${names.length - 1} more` : names[0]!;
        })()
      : `${details.modality || 'Imaging'} ${details.bodyPart || ''}`.trim();
    const item: PendingOrderItem = {
      id: o.id,
      category: isLab ? 'lab' : 'radiology',
      patientId: (o as any).patient?.id || o.patientId,
      patientName: (o as any).patient?.name || 'Unknown',
      mrn: (o as any).patient?.mrn || '',
      orderedAt: o.orderedAt.toISOString(),
      priority: o.priority,
      summary,
    };
    if (isLab) labItems.push(item);
    else radItems.push(item);
  }

  const otToday: SurgeryListItem[] = surgeriesTodayRows.map((s) => ({
    id: s.id,
    patientId: s.patientId || '',
    patientName: s.patientName || 'Unknown',
    mrn: s.patientMRN || '',
    scheduledTime: s.scheduledTime || null,
    procedureName: s.procedureName,
    status: s.status,
    priority: s.priority,
    otRoom: s.otRoom || null,
  }));

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
    ot: {
      todayCount: otToday.length,
      today: otToday,
    },
    pendingLabs: {
      count: labItems.length,
      items: labItems,
    },
    pendingImaging: {
      count: radItems.length,
      items: radItems,
    },
    // Legacy flat counters retained for back-compat.
    pendingLabResults: labItems.length,
    pendingRadiology: radItems.length,
    scheduledSurgeriesToday: otToday.length,
  };
}

// Doctor finance / earnings — daily / weekly / monthly breakdown, lifetime
// totals, 6-month trend, and recent revenue + payout lines. Backed by the
// DoctorRevenue + DoctorPayout tables. If the doctor has no contract on file
// every aggregate is zero — the page still renders, prompting admin to set
// up a contract.
export async function getMyFinance(userId: string, tenantId: string): Promise<DoctorFinanceDTO> {
  const meta = await repo.findDoctorWithDepartments(userId, tenantId);
  if (!meta) throw new NotADoctorError();
  const { user } = meta;

  // Pull six months of revenue rows in one query — covers today, this week,
  // this month, and the trend chart. Anything older is shown via the
  // payout history list (which has its own query).
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [revenues, contract, payouts] = await Promise.all([
    repo.doctorRevenuesSince(userId, sixMonthsAgo),
    repo.doctorContract(userId),
    repo.doctorPayouts(userId, 24),
  ]);

  // Today / week / month windows.
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday-start
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const aggregate = (from: Date): FinancePeriod => {
    let earned = 0, paid = 0, count = 0;
    for (const r of revenues) {
      if (new Date(r.createdAt) < from) continue;
      const amt = Number(r.shareAmount);
      earned += amt;
      if (r.status === 'paid') paid += amt;
      count += 1;
    }
    return {
      windowStart: from.toISOString(),
      earned: Number(earned.toFixed(2)),
      paid: Number(paid.toFixed(2)),
      pending: Number((earned - paid).toFixed(2)),
      count,
    };
  };

  const today = aggregate(startOfDay);
  const week = aggregate(startOfWeek);
  const month = aggregate(startOfMonth);

  // 6-month trend — bucket revenues by YYYY-MM. Oldest → newest so a
  // chart can render left-to-right without sorting.
  const buckets: Record<string, { earned: number; paid: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets[key] = { earned: 0, paid: 0 };
  }
  for (const r of revenues) {
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!buckets[key]) continue;
    const amt = Number(r.shareAmount);
    buckets[key].earned += amt;
    if (r.status === 'paid') buckets[key].paid += amt;
  }
  const trend = Object.entries(buckets).map(([month, v]) => ({
    month,
    earned: Number(v.earned.toFixed(2)),
    paid: Number(v.paid.toFixed(2)),
  }));

  // Lifetime totals: sum of all paid payouts (authoritative for "done")
  // plus pending = revenues since the cutoff that aren't paid yet.
  // We approximate lifetime earned as paid + pending since older paid
  // revenues are captured in the payouts table too.
  const lifetimePaid = payouts.reduce(
    (sum, p) => sum + (p.status === 'cancelled' ? 0 : Number(p.netAmount)),
    0,
  );
  const sixMonthPending = revenues.reduce(
    (sum, r) => sum + (r.status === 'paid' ? 0 : Number(r.shareAmount)),
    0,
  );
  const lifetime = {
    earned: Number((lifetimePaid + sixMonthPending).toFixed(2)),
    paid: Number(lifetimePaid.toFixed(2)),
    pending: Number(sixMonthPending.toFixed(2)),
  };

  const recentRevenues: RevenueLine[] = revenues.slice(0, 50).map((r: any) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    revenueType: r.revenueType,
    shareAmount: Number(r.shareAmount),
    status: r.status,
    invoiceId: r.invoiceId,
    invoiceType: r.invoice?.type || null,
    patientId: r.invoice?.patient?.id || null,
    patientName: r.invoice?.patient?.name || null,
    mrn: r.invoice?.patient?.mrn || null,
  }));

  const recentPayouts: PayoutLine[] = payouts.map((p) => ({
    id: p.id,
    payoutNumber: p.payoutNumber,
    fromDate: p.fromDate.toISOString(),
    toDate: p.toDate.toISOString(),
    totalShare: Number(p.totalShare),
    deductions: Number(p.deductions),
    netAmount: Number(p.netAmount),
    paymentMode: p.paymentMode,
    paymentReference: p.paymentReference,
    paymentDate: p.paymentDate.toISOString(),
    status: p.status,
  }));

  return {
    doctor: { id: user.id, name: user.name },
    contract: contract
      ? {
          contractNumber: contract.contractNumber,
          revenueShareType: contract.revenueShareType,
          revenueShareValue: Number(contract.revenueShareValue),
          paymentCycle: contract.paymentCycle,
          isActive: contract.isActive,
        }
      : null,
    today,
    week,
    month,
    trend,
    lifetime,
    recentRevenues,
    recentPayouts,
  };
}
