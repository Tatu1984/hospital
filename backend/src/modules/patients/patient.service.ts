// Business logic for patient-facing mobile features. Never sees req/res.
// Calls the repository; assembles DTOs the controller can JSON-serialise.

import * as repo from './patient.repository';
import { PatientHomeDTO, UpdateMyProfileInput } from './patient.model';

export class PatientNotFoundError extends Error {
  constructor() { super('Patient not found'); }
}

// Aggregates everything the mobile home dashboard needs in one round-trip.
// Each section is fetched in parallel with Promise.all; one failing section
// rejects the whole call (the controller catches and returns 500). Tighter
// per-section error handling can be added later if a specific section is
// flaky in production.
export async function getHome(tenantId: string, patientId: string): Promise<PatientHomeDTO> {
  const patient = await repo.findById(tenantId, patientId);
  if (!patient) throw new PatientNotFoundError();

  const [
    upcoming,
    latestRxId,
    bills,
    activeAdmissionId,
    surgeryTokens,
  ] = await Promise.all([
    repo.findUpcomingAppointment(tenantId, patientId),
    repo.findLatestPrescriptionId(tenantId, patientId),
    repo.findOutstandingBills(tenantId, patientId),
    repo.findActiveAdmissionId(tenantId, patientId),
    repo.findActiveSurgeryTrackerTokens(tenantId, patient.contact),
  ]);

  return {
    patient: {
      id: patient.id,
      mrn: patient.mrn,
      name: patient.name,
      bloodGroup: patient.bloodGroup,
      allergies: patient.allergies,
      contact: patient.contact,
      email: patient.email,
    },
    upcomingAppointment: upcoming
      ? {
          id: upcoming.id,
          doctorName: upcoming.doctor?.name || 'Unknown',
          appointmentDate: upcoming.appointmentDate.toISOString(),
          appointmentTime: upcoming.appointmentTime,
          type: upcoming.type,
          status: upcoming.status,
        }
      : null,
    latestPrescriptionId: latestRxId,
    outstandingBillTotal: bills.total,
    outstandingBillCount: bills.count,
    activeAdmissionId,
    activeSurgeryTrackerTokens: surgeryTokens,
  };
}

export async function updateMyProfile(
  tenantId: string,
  patientId: string,
  input: UpdateMyProfileInput,
) {
  const updated = await repo.updateProfile(tenantId, patientId, input);
  if (!updated) throw new PatientNotFoundError();
  // Don't echo every column back — the home payload shape is the canonical
  // patient view. The caller can re-fetch it after a successful update.
  return {
    id: updated.id,
    mrn: updated.mrn,
    name: updated.name,
    contact: updated.contact,
    email: updated.email,
    address: updated.address,
    emergencyContact: updated.emergencyContact,
    bloodGroup: updated.bloodGroup,
    allergies: updated.allergies,
  };
}

// Comprehensive patient chart — every clinical record on file. Used by the
// doctor's portal and by the doctor app's patient detail screen so a
// clinician sees the full picture without flipping between tabs.
export async function getChart(tenantId: string, patientId: string) {
  const data = await repo.chartFor(tenantId, patientId);
  if (!data) throw new PatientNotFoundError();
  const { patient, admissions, encounters, orders, prescriptions, invoices, surgeries, dialysisSessions, wardName, userName } = data;

  return {
    patient: {
      id: patient.id,
      mrn: patient.mrn,
      name: patient.name,
      dob: patient.dob,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      contact: patient.contact,
      email: patient.email,
      address: patient.address,
      allergies: patient.allergies,
      emergencyContact: patient.emergencyContact,
      photo: patient.photo,
      purpose: patient.purpose,
      createdAt: patient.createdAt.toISOString(),
    },
    admissions: admissions.map((a: any) => ({
      id: a.id,
      admissionDate: a.admissionDate.toISOString(),
      dischargeDate: a.dischargeDate?.toISOString() || null,
      status: a.status,
      diagnosis: a.diagnosis,
      bedNumber: a.bed?.bedNumber || null,
      wardName: a.bed?.wardId ? (wardName[a.bed.wardId] || null) : null,
      doctorName: a.admittingDoctor?.name || null,
      doctorId: a.admittingDoctor?.id || null,
      ipdNotes: (a.ipdNotes || []).map((n: any) => ({
        id: n.id,
        noteType: n.noteType,
        note: n.note,
        authorId: n.authorId,
        authorName: n.authorId ? (userName[n.authorId] || null) : null,
        createdAt: n.createdAt.toISOString(),
      })),
    })),
    encounters: encounters.map((e: any) => ({
      id: e.id,
      type: e.type,
      visitDate: e.visitDate.toISOString(),
      status: e.status,
      chiefComplaint: e.chiefComplaint,
      doctorId: e.doctor?.id || null,
      doctorName: e.doctor?.name || null,
      latestNote: e.opdNotes?.[0] ? {
        id: e.opdNotes[0].id,
        vitals: e.opdNotes[0].vitals,
        examination: e.opdNotes[0].examination,
        assessment: e.opdNotes[0].assessment,
        plan: e.opdNotes[0].plan,
        createdAt: e.opdNotes[0].createdAt.toISOString(),
      } : null,
    })),
    orders: orders.map((o: any) => ({
      id: o.id,
      category: o.orderType, // 'lab' | 'radiology' | other
      orderedAt: o.orderedAt.toISOString(),
      status: o.status,
      priority: o.priority,
      details: o.details,
      results: (o.results || []).map((r: any) => ({
        id: r.id,
        resultedAt: r.resultedAt.toISOString(),
        resultData: r.resultData,
        verifiedBy: r.verifiedBy,
        isCritical: r.isCritical,
      })),
    })),
    prescriptions: prescriptions.map((rx: any) => ({
      id: rx.id,
      issuedAt: rx.createdAt.toISOString(),
      doctorId: rx.doctor?.id || null,
      doctorName: rx.doctor?.name || null,
      drugs: rx.drugs,
      notes: rx.notes,
      instructions: rx.instructions,
      status: rx.status,
    })),
    invoices: invoices.map((inv: any) => ({
      id: inv.id,
      type: inv.type,
      createdAt: inv.createdAt.toISOString(),
      status: inv.status,
      subtotal: Number(inv.subtotal),
      discount: Number(inv.discount),
      tax: Number(inv.tax),
      total: Number(inv.total),
      paid: Number(inv.paid),
      balance: Number(inv.balance),
      // items: raw JSON line items (see backend/src/shared/ipdBilling.ts
      // LineItem shape for the auto-billed entries). Older invoices
      // may carry a different shape; the FE renders defensively.
      items: Array.isArray(inv.items) ? inv.items : [],
      payments: (inv.payments || []).map((p: any) => ({
        id: p.id,
        amount: Number(p.amount),
        mode: p.mode,
        transactionRef: p.transactionRef,
        paidAt: p.paidAt.toISOString(),
      })),
    })),
    surgeries: surgeries.map((s: any) => ({
      id: s.id,
      procedureName: s.procedureName,
      surgeonId: s.surgeonId,
      surgeonName: s.surgeonName,
      scheduledDate: s.scheduledDate.toISOString(),
      scheduledTime: s.scheduledTime,
      status: s.status,
      currentStage: s.currentStage,
    })),
    dialysisSessions: dialysisSessions.map((d: any) => ({
      id: d.id,
      scheduledDate: d.scheduledDate.toISOString(),
      scheduledTime: d.scheduledTime,
      slot: d.slot,
      startedAt: d.startedAt?.toISOString() || null,
      endedAt: d.endedAt?.toISOString() || null,
      durationMin: d.durationMin,
      modality: d.modality,
      vascularAccess: d.vascularAccess,
      dialyzer: d.dialyzer,
      bloodFlowRate: d.bloodFlowRate,
      dialysateFlow: d.dialysateFlow,
      ufGoalMl: d.ufGoalMl,
      ufActualMl: d.ufActualMl,
      preWeightKg: d.preWeightKg !== null && d.preWeightKg !== undefined ? Number(d.preWeightKg) : null,
      postWeightKg: d.postWeightKg !== null && d.postWeightKg !== undefined ? Number(d.postWeightKg) : null,
      preBpSys: d.preBpSys,
      preBpDia: d.preBpDia,
      postBpSys: d.postBpSys,
      postBpDia: d.postBpDia,
      heparin: d.heparin,
      complications: d.complications,
      notes: d.notes,
      status: d.status,
      nephrologistId: d.nephrologistId,
      nephrologistName: d.nephrologistId ? (userName[d.nephrologistId] || null) : null,
      nurseId: d.nurseId,
      nurseName: d.nurseId ? (userName[d.nurseId] || null) : null,
    })),
    // Cross-cutting rollups. Computed server-side so every consumer
    // (web profile, mobile app, mobile doctor app) gets identical lists.
    // - doctorsVisited: union of doctors across encounters, admissions,
    //   prescriptions, surgeries — first-seen + last-seen + visit count.
    // - diagnoses: dedup'd assessment/diagnosis strings with date + source
    //   (admission or OPD note) for the diagnoses-history tab.
    doctorsVisited: rollupDoctors(encounters, admissions, prescriptions, surgeries),
    diagnoses: rollupDiagnoses(encounters, admissions),
  };
}

function rollupDoctors(
  encounters: any[],
  admissions: any[],
  prescriptions: any[],
  surgeries: any[],
): Array<{ doctorId: string | null; name: string; firstSeen: string; lastSeen: string; encounters: number; sources: string[] }> {
  const acc = new Map<string, { doctorId: string | null; name: string; firstSeen: Date; lastSeen: Date; encounters: number; sources: Set<string> }>();
  const bump = (id: string | null, name: string | null, when: Date, source: string) => {
    if (!name) return;
    const key = id || `name:${name}`;
    const existing = acc.get(key);
    if (existing) {
      existing.encounters += 1;
      if (when < existing.firstSeen) existing.firstSeen = when;
      if (when > existing.lastSeen) existing.lastSeen = when;
      existing.sources.add(source);
    } else {
      acc.set(key, {
        doctorId: id,
        name,
        firstSeen: when,
        lastSeen: when,
        encounters: 1,
        sources: new Set([source]),
      });
    }
  };
  for (const e of encounters) bump(e.doctor?.id || null, e.doctor?.name || null, e.visitDate, 'encounter');
  for (const a of admissions) bump(a.admittingDoctor?.id || null, a.admittingDoctor?.name || null, a.admissionDate, 'admission');
  for (const rx of prescriptions) bump(rx.doctor?.id || null, rx.doctor?.name || null, rx.createdAt, 'prescription');
  for (const s of surgeries) bump(s.surgeonId || null, s.surgeonName || null, s.scheduledDate, 'surgery');
  return Array.from(acc.values())
    .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime())
    .map((d) => ({
      doctorId: d.doctorId,
      name: d.name,
      firstSeen: d.firstSeen.toISOString(),
      lastSeen: d.lastSeen.toISOString(),
      encounters: d.encounters,
      sources: Array.from(d.sources),
    }));
}

function rollupDiagnoses(
  encounters: any[],
  admissions: any[],
): Array<{ source: 'admission' | 'encounter'; sourceId: string; date: string; doctorName: string | null; text: string }> {
  const items: Array<{ source: 'admission' | 'encounter'; sourceId: string; date: string; doctorName: string | null; text: string; sortKey: number }> = [];
  for (const a of admissions) {
    if (a.diagnosis && String(a.diagnosis).trim()) {
      items.push({
        source: 'admission',
        sourceId: a.id,
        date: a.admissionDate.toISOString(),
        doctorName: a.admittingDoctor?.name || null,
        text: String(a.diagnosis).trim(),
        sortKey: a.admissionDate.getTime(),
      });
    }
  }
  for (const e of encounters) {
    const note = e.opdNotes?.[0];
    const raw = note?.assessment;
    const text = typeof raw === 'string' ? raw.trim() : raw ? JSON.stringify(raw) : '';
    if (text) {
      items.push({
        source: 'encounter',
        sourceId: e.id,
        date: (note?.createdAt || e.visitDate).toISOString(),
        doctorName: e.doctor?.name || null,
        text,
        sortKey: (note?.createdAt || e.visitDate).getTime(),
      });
    }
  }
  return items
    .sort((a, b) => b.sortKey - a.sortKey)
    .map(({ sortKey: _omit, ...rest }) => rest);
}
