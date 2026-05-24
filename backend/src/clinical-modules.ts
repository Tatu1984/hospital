// Backend endpoints for the new clinical/operational modules. Mounted by
// server.ts under existing prefixes so RBAC keys stay short.
//
// Pattern is intentionally repetitive — every module has list / create /
// update / delete + occasionally sub-resources. Resisting the urge to
// over-abstract; one straightforward handler per route keeps Swagger /
// route registry / debugging easy.
//
// Tenant isolation: every where-clause filters by req.user.tenantId.
// Auth + RBAC are applied at the route registration in server.ts.

import { Request, Response, Router, RequestHandler } from 'express';
import { prisma } from './shared/prisma';
import { authenticateToken } from './middleware';
import { writeAudit } from './utils/audit';
import { searchIcd10, getIcd10ByCode } from './data/icd10';
import { createHash, randomBytes } from 'crypto';

type AuthedReq = Request & { user?: { userId: string; tenantId: string; branchId?: string } };

// Mounted at '/api' by server.ts. Critical: do NOT use router.use(auth)
// here. Express runs router.use middleware for every request that
// matches the mount prefix, including /api/auth/login — which would
// then 401 on every login attempt because the user has no token yet.
//
// Instead, auth is attached per-route via the `auth` middleware short-
// hand below. Routes inside this file that aren't auth-gated would
// fall through to the rest of the app stack without disturbing them.
export const clinicalModulesRouter = Router();
const auth: RequestHandler = authenticateToken as any;

// =============== DIALYSIS ===============

// Machines: list / create / update / delete.
clinicalModulesRouter.get('/dialysis/machines', auth, async (req: AuthedReq, res: Response) => {
  try {
    const items = await prisma.dialysisMachine.findMany({
      where: { tenantId: req.user!.tenantId },
      orderBy: { machineName: 'asc' },
    });
    res.json(items);
  } catch (e) {
    console.error('list dialysis machines', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.post('/dialysis/machines', auth, async (req: AuthedReq, res: Response) => {
  try {
    const created = await prisma.dialysisMachine.create({
      data: { ...req.body, tenantId: req.user!.tenantId, branchId: req.body.branchId || req.user!.branchId },
    });
    res.status(201).json(created);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Machine code already exists' });
    console.error('create dialysis machine', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.put('/dialysis/machines/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.dialysisMachine.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!owned) return res.status(404).json({ error: 'Machine not found' });
    const updated = await prisma.dialysisMachine.update({ where: { id: req.params.id }, data: req.body });
    res.json(updated);
  } catch (e) {
    console.error('update dialysis machine', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.delete('/dialysis/machines/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.dialysisMachine.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!owned) return res.status(404).json({ error: 'Machine not found' });
    await prisma.dialysisMachine.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    console.error('delete dialysis machine', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sessions: list / create / update / delete + status flips.
//
// IMPORTANT — these routes mount FIRST under /api (before server.ts's
// own /api/dialysis/sessions handlers), so Express picks them up. The
// booking-register UI sends `sessionDate` + `slot` + `repeatWeeks`,
// while the clinical Sessions tab sends `scheduledDate` and the full
// clinical payload (pre/post weights etc.). The implementations below
// support BOTH shapes.
clinicalModulesRouter.get('/dialysis/sessions', auth, async (req: AuthedReq, res: Response) => {
  try {
    const { date, from, to, patientId, status } = req.query;
    const where: any = { tenantId: req.user!.tenantId };
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;
    if (from || to) {
      // Range query (used by the weekly CSV export).
      const range: any = {};
      if (from) {
        const d = new Date(`${from}T00:00:00.000Z`);
        if (!Number.isNaN(d.getTime())) range.gte = d;
      }
      if (to) {
        const d = new Date(`${to}T00:00:00.000Z`);
        if (!Number.isNaN(d.getTime())) range.lte = d;
      }
      where.scheduledDate = range;
    } else if (date) {
      const d = new Date(`${date}T00:00:00.000Z`);
      if (!Number.isNaN(d.getTime())) where.scheduledDate = d;
    }
    const items = await prisma.dialysisSession.findMany({
      where,
      include: {
        machine: { select: { id: true, machineName: true, machineCode: true, status: true } },
        patient: {
          select: {
            id: true, name: true, mrn: true,
            admissions: {
              orderBy: { admissionDate: 'desc' },
              take: 1,
              select: { admittingDoctor: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: (date || from || to)
        ? [{ slot: 'asc' }, { createdAt: 'asc' }]
        : [{ scheduledDate: 'desc' }, { scheduledTime: 'asc' }],
      take: 1000,
    });
    // Flatten the latest admitting doctor onto each row so the register
    // UI doesn't need to know about the admissions relation.
    const enriched = items.map((s: any) => ({
      ...s,
      patientDoctor: s.patient?.admissions?.[0]?.admittingDoctor?.name || null,
    }));
    res.json(enriched);
  } catch (e: any) {
    console.error('list dialysis sessions', e);
    res.status(500).json({ error: e?.message || 'Internal server error' });
  }
});

// Bulletproof create — handles BOTH the clinical Sessions form (sends
// `scheduledDate` + clinical fields) AND the booking-register UI (sends
// `sessionDate` + `slot` + optional `bedId` + `repeatWeeks`).
const DIALYSIS_BUILD = 'dialysis-v4-clinical-modules-2026-05-12';
clinicalModulesRouter.post('/dialysis/sessions', auth, async (req: AuthedReq, res: Response) => {
  const fail = (status: number, error: string, extra?: any) =>
    res.status(status).json({ error, build: DIALYSIS_BUILD, ...(extra || {}) });
  try {
    res.setHeader('X-Server-Build', DIALYSIS_BUILD);
    const body = req.body || {};
    const {
      patientId, machineId, bedId,
      // Accept either name for the date.
      sessionDate, scheduledDate: scheduledDateBody,
      slot, notes, repeatWeeks,
    } = body;
    const dateInput = sessionDate || scheduledDateBody;

    if (!patientId) return fail(400, 'patientId is required');
    if (!dateInput) return fail(400, 'sessionDate (YYYY-MM-DD) is required');

    const startDate = new Date(`${dateInput}T00:00:00.000Z`);
    if (Number.isNaN(startDate.getTime())) return fail(400, 'Invalid sessionDate — use YYYY-MM-DD');

    const isBookingShape = !!slot; // booking-register call
    const validSlots = ['SLOT_1', 'SLOT_2', 'SLOT_3', 'SLOT_4'];
    if (isBookingShape && !validSlots.includes(slot)) {
      return fail(400, 'slot must be SLOT_1/SLOT_2/SLOT_3/SLOT_4');
    }
    if (isBookingShape && !machineId) return fail(400, 'machineId is required for booking');

    const repeatCount = Math.max(
      1,
      Math.min(52, Number.isFinite(Number(repeatWeeks)) ? Math.floor(Number(repeatWeeks)) : 1),
    );

    // Tenant-scoped pre-checks; each wrapped so the actual error surfaces.
    try {
      const patient = await prisma.patient.findFirst({ where: { id: patientId, tenantId: req.user!.tenantId } });
      if (!patient) return fail(404, 'Patient not found in this tenant');
    } catch (e: any) {
      return fail(500, `Patient lookup failed: ${e?.message || e}`, { code: e?.code });
    }
    if (machineId) {
      try {
        const machine = await prisma.dialysisMachine.findFirst({
          where: { id: machineId, tenantId: req.user!.tenantId, status: { not: 'retired' } },
        });
        if (!machine) return fail(404, 'Machine not found or retired');
      } catch (e: any) {
        return fail(500, `Machine lookup failed: ${e?.message || e}`, { code: e?.code });
      }
    }
    if (bedId) {
      try {
        const bed = await prisma.bed.findFirst({
          where: { id: bedId, category: 'DIALYSIS' },
        });
        if (!bed) return fail(404, 'Bed not found or not a dialysis bed');
      } catch (e: any) {
        return fail(500, `Bed lookup failed: ${e?.message || e}`, { code: e?.code });
      }
    }

    // Clinical-style call (no slot, no repeat): one-shot create with the
    // full payload spread, only known scalar conversions applied. This
    // preserves the existing Sessions tab behaviour.
    if (!isBookingShape) {
      try {
        const data: any = { ...body, tenantId: req.user!.tenantId };
        delete data.sessionDate;
        delete data.repeatWeeks;
        if (data.scheduledDate) data.scheduledDate = new Date(data.scheduledDate);
        if (data.startedAt) data.startedAt = new Date(data.startedAt);
        if (data.endedAt) data.endedAt = new Date(data.endedAt);
        const created = await prisma.dialysisSession.create({ data });
        return res.status(201).json(created);
      } catch (e: any) {
        return fail(500, e?.meta?.message || e?.message || 'Could not create session', { code: e?.code });
      }
    }

    // Booking-register path: build dates for each week, pre-check
    // conflicts, then create one row per week with the slot pinned.
    const targetDates: Date[] = [];
    for (let i = 0; i < repeatCount; i++) {
      const d = new Date(startDate.getTime());
      d.setUTCDate(d.getUTCDate() + i * 7);
      targetDates.push(d);
    }

    let existingConflicts: any[] = [];
    try {
      existingConflicts = await prisma.dialysisSession.findMany({
        where: {
          tenantId: req.user!.tenantId,
          slot,
          scheduledDate: { in: targetDates },
          OR: [
            { machineId },
            ...(bedId ? [{ bedId } as any] : []),
          ],
        },
        select: { scheduledDate: true, machineId: true, bedId: true },
      });
    } catch (e: any) {
      const msg = String(e?.message || e || '');
      if (msg.includes('column') && (msg.includes('slot') || msg.includes('bedId'))) {
        return fail(503, 'Dialysis booking columns missing — run migrate deploy', {
          code: e?.code, detail: msg.slice(0, 240),
        });
      }
      return fail(500, `Conflict pre-check failed: ${msg.slice(0, 240)}`, { code: e?.code });
    }

    const conflictByDate: Record<string, { machine: boolean; bed: boolean }> = {};
    for (const c of existingConflicts) {
      const key = (c.scheduledDate as Date).toISOString().slice(0, 10);
      if (!conflictByDate[key]) conflictByDate[key] = { machine: false, bed: false };
      if (c.machineId === machineId) conflictByDate[key].machine = true;
      if (bedId && c.bedId === bedId) conflictByDate[key].bed = true;
    }

    const created: any[] = [];
    const skipped: Array<{ date: string; reason: string }> = [];

    for (const d of targetDates) {
      const yyyyMmDd = d.toISOString().slice(0, 10);
      const conflict = conflictByDate[yyyyMmDd];
      if (conflict?.machine) { skipped.push({ date: yyyyMmDd, reason: 'Machine already booked for that slot' }); continue; }
      if (conflict?.bed)     { skipped.push({ date: yyyyMmDd, reason: 'Bed already booked for that slot' }); continue; }
      try {
        const session = await prisma.dialysisSession.create({
          data: {
            tenantId: req.user!.tenantId,
            patientId,
            machineId,
            bedId: bedId || null,
            scheduledDate: d,
            slot,
            notes: notes || null,
            status: 'scheduled',
          },
          include: {
            machine: { select: { id: true, machineName: true, machineCode: true, status: true } },
          },
        });
        created.push(session);
      } catch (err: any) {
        const msg = err?.meta?.message || err?.message || String(err);
        console.error(`[dialysis] create failed for ${yyyyMmDd}:`, err);
        if (err?.code === 'P2002') {
          skipped.push({ date: yyyyMmDd, reason: 'Slot already taken (race)' });
        } else {
          skipped.push({ date: yyyyMmDd, reason: `${msg.slice(0, 180)}${err?.code ? ` (${err.code})` : ''}` });
        }
      }
    }

    if (repeatCount === 1) {
      if (created.length === 0) {
        return res.status(409).json({
          error: skipped[0]?.reason || 'Could not create session',
          build: DIALYSIS_BUILD,
        });
      }
      return res.status(201).json(created[0]);
    }
    return res.status(201).json({ created, skipped, totalRequested: repeatCount, build: DIALYSIS_BUILD });
  } catch (e: any) {
    console.error('create dialysis session', e);
    return fail(500, e?.meta?.message || e?.message || String(e) || 'Unknown error', { code: e?.code });
  }
});

clinicalModulesRouter.put('/dialysis/sessions/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.dialysisSession.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!owned) return res.status(404).json({ error: 'Session not found' });
    const data = { ...req.body };
    delete data.tenantId;
    if (data.scheduledDate) data.scheduledDate = new Date(data.scheduledDate);
    if (data.startedAt) data.startedAt = new Date(data.startedAt);
    if (data.endedAt) data.endedAt = new Date(data.endedAt);
    const updated = await prisma.dialysisSession.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (e) {
    console.error('update dialysis session', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.delete('/dialysis/sessions/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.dialysisSession.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!owned) return res.status(404).json({ error: 'Session not found' });
    await prisma.dialysisSession.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    console.error('delete dialysis session', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============== MORTUARY ===============

clinicalModulesRouter.get('/mortuary', auth, async (req: AuthedReq, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = { tenantId: req.user!.tenantId };
    if (status) where.status = status;
    const items = await prisma.mortuaryRecord.findMany({
      where, orderBy: { dateOfDeath: 'desc' }, take: 200,
    });
    res.json(items);
  } catch (e) {
    console.error('list mortuary', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.post('/mortuary', auth, async (req: AuthedReq, res: Response) => {
  try {
    const data = { ...req.body, tenantId: req.user!.tenantId };
    if (data.dateOfDeath) data.dateOfDeath = new Date(data.dateOfDeath);
    if (data.storedAt) data.storedAt = new Date(data.storedAt);
    if (!data.bodyNumber) data.bodyNumber = `BD${Date.now().toString().slice(-8)}`;
    const created = await prisma.mortuaryRecord.create({ data });
    res.status(201).json(created);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Body number already exists' });
    console.error('create mortuary', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.put('/mortuary/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.mortuaryRecord.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!owned) return res.status(404).json({ error: 'Record not found' });
    const data = { ...req.body };
    delete data.tenantId;
    if (data.dateOfDeath) data.dateOfDeath = new Date(data.dateOfDeath);
    if (data.storedAt) data.storedAt = new Date(data.storedAt);
    if (data.releasedAt) data.releasedAt = new Date(data.releasedAt);
    const updated = await prisma.mortuaryRecord.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (e) {
    console.error('update mortuary', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.delete('/mortuary/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.mortuaryRecord.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!owned) return res.status(404).json({ error: 'Record not found' });
    await prisma.mortuaryRecord.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    console.error('delete mortuary', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============== DEATH CERTIFICATE (India Form-4) ===============
// Issue / re-issue the Medical Certificate of Cause of Death for an
// existing mortuary record. The PDF itself is generated client-side
// (jspdf) — this endpoint records the certificate metadata, audits the
// issuance, and returns the row so the FE can hand it straight to the
// generator. Civil registration with the municipal registrar is the
// next-of-kin's responsibility; we provide the medical certificate
// the registrar requires.
clinicalModulesRouter.post('/mortuary/:id/issue-certificate', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.mortuaryRecord.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    if (!owned) return res.status(404).json({ error: 'Record not found' });

    const {
      address,
      placeOfDeath,
      immediateCause,
      immediateInterval,
      antecedentCause1,
      antecedent1Interval,
      antecedentCause2,
      antecedent2Interval,
      contributingCauses,
      mannerOfDeath,
      modeOfDeath,
      certifyingDoctorId,
      certifyingDoctorName,
      certifyingDoctorReg,
    } = req.body || {};

    if (!immediateCause) {
      return res.status(400).json({ error: 'Immediate cause of death is required' });
    }
    if (!certifyingDoctorName) {
      return res.status(400).json({ error: 'Certifying doctor name is required' });
    }

    // Issue a sequential certificate number scoped to tenant +
    // calendar year so different branches don't collide. Form: DC-YYYY-NNNN.
    const year = new Date().getFullYear();
    const prefix = `DC-${year}-`;
    const existing = await prisma.mortuaryRecord.findMany({
      where: { tenantId: req.user!.tenantId, certificateNumber: { startsWith: prefix } },
      select: { certificateNumber: true },
    });
    const maxN = existing.reduce((m, r) => {
      const n = parseInt(String(r.certificateNumber || '').replace(prefix, ''), 10);
      return Number.isFinite(n) && n > m ? n : m;
    }, 0);
    const certificateNumber = owned.certificateNumber || `${prefix}${String(maxN + 1).padStart(4, '0')}`;

    const updated = await prisma.mortuaryRecord.update({
      where: { id: owned.id },
      data: {
        address: address ?? owned.address,
        placeOfDeath: placeOfDeath ?? owned.placeOfDeath,
        immediateCause,
        immediateInterval: immediateInterval ?? null,
        antecedentCause1: antecedentCause1 ?? null,
        antecedent1Interval: antecedent1Interval ?? null,
        antecedentCause2: antecedentCause2 ?? null,
        antecedent2Interval: antecedent2Interval ?? null,
        contributingCauses: contributingCauses ?? null,
        mannerOfDeath: mannerOfDeath ?? null,
        modeOfDeath: modeOfDeath ?? null,
        certifyingDoctorId: certifyingDoctorId ?? null,
        certifyingDoctorName,
        certifyingDoctorReg: certifyingDoctorReg ?? null,
        certificateNumber,
        certificateIssuedAt: new Date(),
        certificateIssuedBy: req.user!.userId,
      },
    });

    void writeAudit({
      prisma, req,
      action: 'DEATH_CERTIFICATE_ISSUE',
      resource: 'MortuaryRecord',
      resourceId: owned.id,
      newValue: { certificateNumber, certifyingDoctorName },
    });

    res.json(updated);
  } catch (e: any) {
    console.error('issue death certificate', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// =============== BIRTH RECORDS ===============
// Captures the delivery event. Creates the newborn's Patient row in
// the same transaction (unless one was passed in) so the baby has an
// MRN immediately and downstream OPD / paediatric workflows can attach
// notes to a real patient. Certificate PDF is generated client-side;
// issue-certificate stamps the row with cert # + timestamp + issuer.

clinicalModulesRouter.get('/birth-records', auth, async (req: AuthedReq, res: Response) => {
  try {
    const { search } = req.query as { search?: string };
    const where: any = { tenantId: req.user!.tenantId };
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { babyName: { contains: q, mode: 'insensitive' } },
        { motherPatient: { name: { contains: q, mode: 'insensitive' } } },
        { motherPatient: { mrn: { contains: q, mode: 'insensitive' } } },
        { certificateNumber: { contains: q, mode: 'insensitive' } },
      ];
    }
    const items = await prisma.birthRecord.findMany({
      where,
      orderBy: { birthDate: 'desc' },
      take: 200,
      include: {
        motherPatient: { select: { id: true, name: true, mrn: true, contact: true, address: true } },
        babyPatient: { select: { id: true, name: true, mrn: true, gender: true, dob: true } },
        attendingDoctor: { select: { id: true, name: true } },
      },
    });
    res.json(items);
  } catch (e) {
    console.error('list birth records', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.get('/birth-records/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const item = await prisma.birthRecord.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: {
        motherPatient: { select: { id: true, name: true, mrn: true, contact: true, address: true, dob: true } },
        babyPatient: { select: { id: true, name: true, mrn: true, gender: true, dob: true } },
        attendingDoctor: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true, address: true } },
      },
    });
    if (!item) return res.status(404).json({ error: 'Birth record not found' });
    res.json(item);
  } catch (e) {
    console.error('get birth record', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.post('/birth-records', auth, async (req: AuthedReq, res: Response) => {
  try {
    const b = req.body || {};
    if (!b.motherPatientId) return res.status(400).json({ error: 'motherPatientId is required' });
    if (!b.birthDate) return res.status(400).json({ error: 'birthDate is required' });
    if (!b.babyGender) return res.status(400).json({ error: 'babyGender is required' });
    if (!b.deliveryType) return res.status(400).json({ error: 'deliveryType is required' });

    // Confirm mother belongs to this tenant.
    const mother = await prisma.patient.findFirst({
      where: { id: b.motherPatientId, tenantId: req.user!.tenantId },
      select: { id: true, branchId: true, name: true, mrn: true, address: true },
    });
    if (!mother) return res.status(404).json({ error: 'Mother patient not found' });

    const branchId = b.branchId || mother.branchId;
    const birthDate = new Date(b.birthDate);

    // Auto-register the newborn as a Patient unless babyPatientId
    // was supplied (re-using an existing row, e.g. an antenatally
    // registered baby).
    const created = await prisma.$transaction(async (tx) => {
      let babyPatientId: string | null = b.babyPatientId || null;

      if (!babyPatientId && b.liveBirth !== false) {
        // Mint a new MRN scoped to tenant. Same algorithm as the
        // POST /api/patients handler — read last MRN, increment.
        const lastPatient = await tx.patient.findFirst({
          where: { tenantId: req.user!.tenantId },
          orderBy: { createdAt: 'desc' },
          select: { mrn: true },
        });
        let mrnNumber = 1;
        if (lastPatient) {
          const n = parseInt(lastPatient.mrn.replace(/\D/g, ''));
          if (Number.isFinite(n)) mrnNumber = n + 1;
        }
        const mrn = `MRN${mrnNumber.toString().padStart(6, '0')}`;
        const babyName = (b.babyName && b.babyName.trim()) || `Baby of ${mother.name}`;
        const baby = await tx.patient.create({
          data: {
            tenantId: req.user!.tenantId,
            branchId,
            mrn,
            name: babyName,
            dob: birthDate,
            gender: b.babyGender,
            address: b.parentsAddress || mother.address || null,
            purpose: `Newborn — mother MRN ${mother.mrn}`,
          },
        });
        babyPatientId = baby.id;
      }

      const rec = await tx.birthRecord.create({
        data: {
          tenantId: req.user!.tenantId,
          branchId,
          motherPatientId: mother.id,
          babyPatientId,
          babyName: b.babyName || null,
          babyGender: b.babyGender,
          birthDate,
          placeOfBirth: b.placeOfBirth || null,
          deliveryType: b.deliveryType,
          birthOrder: b.birthOrder ?? 1,
          weightGrams: b.weightGrams ?? null,
          lengthCm: b.lengthCm ?? null,
          headCircumferenceCm: b.headCircumferenceCm ?? null,
          apgar1Min: b.apgar1Min ?? null,
          apgar5Min: b.apgar5Min ?? null,
          liveBirth: b.liveBirth ?? true,
          outcome: b.outcome || null,
          notes: b.notes || null,
          fatherName: b.fatherName || null,
          fatherOccupation: b.fatherOccupation || null,
          fatherEducation: b.fatherEducation || null,
          motherOccupation: b.motherOccupation || null,
          motherEducation: b.motherEducation || null,
          motherAgeAtBirth: b.motherAgeAtBirth ?? null,
          parentsAddress: b.parentsAddress || mother.address || null,
          parentsReligion: b.parentsReligion || null,
          parentsNationality: b.parentsNationality || 'Indian',
          attendingDoctorId: b.attendingDoctorId || null,
          attendingDoctorName: b.attendingDoctorName || null,
        },
        include: {
          motherPatient: { select: { id: true, name: true, mrn: true } },
          babyPatient: { select: { id: true, name: true, mrn: true } },
          attendingDoctor: { select: { id: true, name: true } },
        },
      });

      return rec;
    });

    void writeAudit({
      prisma, req,
      action: 'BIRTH_RECORD_CREATE',
      resource: 'BirthRecord',
      resourceId: created.id,
      newValue: {
        motherPatientId: created.motherPatientId,
        babyPatientId: created.babyPatientId,
        deliveryType: created.deliveryType,
      },
    });

    res.status(201).json(created);
  } catch (e: any) {
    console.error('create birth record', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.put('/birth-records/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.birthRecord.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    if (!owned) return res.status(404).json({ error: 'Birth record not found' });

    const data = { ...req.body };
    delete data.tenantId;
    delete data.id;
    delete data.babyPatientId; // never reassign baby after creation
    delete data.motherPatientId;
    if (data.birthDate) data.birthDate = new Date(data.birthDate);

    const updated = await prisma.birthRecord.update({
      where: { id: owned.id },
      data,
      include: {
        motherPatient: { select: { id: true, name: true, mrn: true } },
        babyPatient: { select: { id: true, name: true, mrn: true } },
      },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('update birth record', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// Issue (or re-issue) the hospital Birth Certificate. Stamps the row
// with a sequential certificate number scoped to tenant + year and
// records who issued it. The printable PDF is rendered client-side.
clinicalModulesRouter.post('/birth-records/:id/issue-certificate', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.birthRecord.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    if (!owned) return res.status(404).json({ error: 'Birth record not found' });

    const year = new Date(owned.birthDate).getFullYear();
    const prefix = `BC-${year}-`;
    let certificateNumber = owned.certificateNumber;
    if (!certificateNumber) {
      const existing = await prisma.birthRecord.findMany({
        where: { tenantId: req.user!.tenantId, certificateNumber: { startsWith: prefix } },
        select: { certificateNumber: true },
      });
      const maxN = existing.reduce((m, r) => {
        const n = parseInt(String(r.certificateNumber || '').replace(prefix, ''), 10);
        return Number.isFinite(n) && n > m ? n : m;
      }, 0);
      certificateNumber = `${prefix}${String(maxN + 1).padStart(4, '0')}`;
    }

    const updated = await prisma.birthRecord.update({
      where: { id: owned.id },
      data: {
        certificateNumber,
        certificateIssuedAt: new Date(),
        certificateIssuedBy: req.user!.userId,
      },
      include: {
        motherPatient: { select: { id: true, name: true, mrn: true, address: true, contact: true } },
        babyPatient: { select: { id: true, name: true, mrn: true } },
        attendingDoctor: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true, address: true } },
      },
    });

    void writeAudit({
      prisma, req,
      action: 'BIRTH_CERTIFICATE_ISSUE',
      resource: 'BirthRecord',
      resourceId: owned.id,
      newValue: { certificateNumber },
    });

    res.json(updated);
  } catch (e: any) {
    console.error('issue birth certificate', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// =============== EMERGENCY ALERTS (CODE BLUE/RED/etc.) ===============
// Hospital-wide broadcast. Any staff member can raise; every connected
// portal polls /api/alerts/active every 3s to pick up new alerts.
// Tenant-scoped — alerts never cross hospital groups.

const ALERT_CODES = new Set([
  'CODE_BLUE', 'CODE_RED', 'CODE_PINK', 'CODE_BLACK', 'CODE_ORANGE',
  'CODE_SILVER', 'CODE_GREY', 'CODE_YELLOW',
  'MASS_CASUALTY', 'EVACUATION', 'ANNOUNCEMENT',
]);
const ALERT_SEVERITIES = new Set(['critical', 'warning', 'info']);

clinicalModulesRouter.get('/alerts/active', auth, async (req: AuthedReq, res: Response) => {
  try {
    const userId = req.user!.userId;
    const alerts = await prisma.alert.findMany({
      where: { tenantId: req.user!.tenantId, resolvedAt: null },
      orderBy: { raisedAt: 'desc' },
      include: {
        raisedBy:   { select: { id: true, name: true } },
        acks:       { where: { userId }, select: { id: true } },
      },
      take: 20,
    });
    res.json(alerts.map(a => ({
      ...a,
      ackedByMe: a.acks.length > 0,
      acks: undefined,
    })));
  } catch (e) {
    console.error('list active alerts', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.post('/alerts', auth, async (req: AuthedReq, res: Response) => {
  try {
    const { code, severity, location, message } = req.body || {};
    if (!code || !ALERT_CODES.has(code))         return res.status(400).json({ error: 'Invalid alert code' });
    if (!severity || !ALERT_SEVERITIES.has(severity)) return res.status(400).json({ error: 'Invalid severity' });
    if (!location || !String(location).trim())    return res.status(400).json({ error: 'Location is required' });

    const created = await prisma.alert.create({
      data: {
        tenantId: req.user!.tenantId,
        code, severity,
        location: String(location).trim(),
        message: message ? String(message).trim() : null,
        raisedById: req.user!.userId,
      },
      include: { raisedBy: { select: { id: true, name: true } } },
    });

    void writeAudit({
      prisma, req,
      action: 'ALERT_RAISE',
      resource: 'Alert',
      resourceId: created.id,
      newValue: { code, severity, location, message },
    });

    res.status(201).json(created);
  } catch (e: any) {
    console.error('raise alert', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/alerts/:id/acknowledge', auth, async (req: AuthedReq, res: Response) => {
  try {
    const alert = await prisma.alert.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    await prisma.alertAck.upsert({
      where: { alertId_userId: { alertId: alert.id, userId: req.user!.userId } },
      create: { alertId: alert.id, userId: req.user!.userId },
      update: { acknowledgedAt: new Date() },
    });
    res.json({ ok: true });
  } catch (e: any) {
    console.error('ack alert', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.post('/alerts/:id/resolve', auth, async (req: AuthedReq, res: Response) => {
  try {
    const alert = await prisma.alert.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    if (alert.resolvedAt) return res.json(alert);

    const updated = await prisma.alert.update({
      where: { id: alert.id },
      data: { resolvedAt: new Date(), resolvedById: req.user!.userId },
      include: {
        raisedBy:   { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
    });

    void writeAudit({
      prisma, req,
      action: 'ALERT_RESOLVE',
      resource: 'Alert',
      resourceId: alert.id,
    });

    res.json(updated);
  } catch (e: any) {
    console.error('resolve alert', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============== PHASE 1: CLINICAL EMR CORE ===============

// ---------- VITALS ----------
// Capture a vitals row. patientId required; encounterId / admissionId
// optional. BMI is auto-derived if both weight and height present.
clinicalModulesRouter.post('/vitals', auth, async (req: AuthedReq, res: Response) => {
  try {
    const b = req.body || {};
    if (!b.patientId) return res.status(400).json({ error: 'patientId is required' });

    const patient = await prisma.patient.findFirst({
      where: { id: b.patientId, tenantId: req.user!.tenantId },
      select: { id: true },
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const num = (v: any) => v === '' || v === null || v === undefined ? null : Number(v);
    const weightKg = num(b.weightKg);
    const heightCm = num(b.heightCm);
    let bmi: number | null = null;
    if (weightKg && heightCm && heightCm > 0) {
      const m = heightCm / 100;
      bmi = Math.round((weightKg / (m * m)) * 10) / 10;
    }

    const created = await prisma.vitals.create({
      data: {
        patientId: patient.id,
        encounterId: b.encounterId || null,
        admissionId: b.admissionId || null,
        capturedById: req.user!.userId,
        temperatureC: num(b.temperatureC),
        bpSystolic:   num(b.bpSystolic),
        bpDiastolic:  num(b.bpDiastolic),
        heartRate:    num(b.heartRate),
        respRate:     num(b.respRate),
        spo2:         num(b.spo2),
        weightKg,
        heightCm,
        bmi,
        painScore:    num(b.painScore),
        glucoseMgDl:  num(b.glucoseMgDl),
        notes: b.notes || null,
      },
      include: { capturedBy: { select: { id: true, name: true } } },
    });

    void writeAudit({
      prisma, req,
      action: 'VITALS_CAPTURE', resource: 'Vitals', resourceId: created.id,
      newValue: { patientId: created.patientId, bp: `${created.bpSystolic}/${created.bpDiastolic}`, hr: created.heartRate, temp: created.temperatureC },
    });

    res.status(201).json(created);
  } catch (e: any) {
    console.error('vitals create', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.get('/patients/:id/vitals', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.patient.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: 'Patient not found' });

    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 500);
    const items = await prisma.vitals.findMany({
      where: { patientId: owned.id },
      orderBy: { capturedAt: 'desc' },
      take: limit,
      include: { capturedBy: { select: { id: true, name: true } } },
    });
    res.json(items);
  } catch (e: any) {
    console.error('vitals list', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- ALLERGIES ----------
clinicalModulesRouter.get('/patients/:id/allergies', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.patient.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: 'Patient not found' });
    const items = await prisma.allergy.findMany({
      where: { patientId: owned.id, active: true },
      orderBy: [{ severity: 'desc' }, { notedAt: 'desc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('allergies list', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.post('/patients/:id/allergies', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.patient.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: 'Patient not found' });

    const { substance, category, reaction, severity, notes } = req.body || {};
    if (!substance || !String(substance).trim()) return res.status(400).json({ error: 'substance is required' });

    const created = await prisma.allergy.upsert({
      where: { patientId_substance: { patientId: owned.id, substance: substance.trim() } },
      create: {
        patientId: owned.id,
        substance: substance.trim(),
        category: category || 'drug',
        reaction: reaction || null,
        severity: severity || 'moderate',
        notedById: req.user!.userId,
        notes: notes || null,
      },
      update: {
        category: category || 'drug',
        reaction: reaction || null,
        severity: severity || 'moderate',
        active: true,
        notes: notes || null,
      },
    });
    void writeAudit({
      prisma, req,
      action: 'ALLERGY_ADD', resource: 'Allergy', resourceId: created.id,
      newValue: { patientId: owned.id, substance: created.substance, severity: created.severity },
    });
    res.status(201).json(created);
  } catch (e: any) {
    console.error('allergy create', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.delete('/allergies/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const allergy = await prisma.allergy.findFirst({
      where: { id: req.params.id, patient: { tenantId: req.user!.tenantId } },
    });
    if (!allergy) return res.status(404).json({ error: 'Allergy not found' });
    await prisma.allergy.update({ where: { id: allergy.id }, data: { active: false } });
    res.status(204).end();
  } catch (e) {
    console.error('allergy soft-delete', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- ICD-10 SEARCH ----------
clinicalModulesRouter.get('/icd10/search', auth, async (req: AuthedReq, res: Response) => {
  try {
    const q = String(req.query.q || '');
    const limit = Math.min(parseInt(String(req.query.limit || '20'), 10) || 20, 50);
    res.json(searchIcd10(q, limit));
  } catch (e) {
    console.error('icd10 search', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- DIAGNOSES ----------
clinicalModulesRouter.get('/patients/:id/diagnoses', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.patient.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: 'Patient not found' });
    const items = await prisma.diagnosis.findMany({
      where: { patientId: owned.id },
      orderBy: [{ isPrimary: 'desc' }, { diagnosedAt: 'desc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('diagnoses list', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.post('/diagnoses', auth, async (req: AuthedReq, res: Response) => {
  try {
    const { patientId, encounterId, admissionId, icd10Code, notes, isPrimary, status } = req.body || {};
    if (!patientId || !icd10Code) return res.status(400).json({ error: 'patientId and icd10Code are required' });

    const owned = await prisma.patient.findFirst({
      where: { id: patientId, tenantId: req.user!.tenantId },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: 'Patient not found' });

    const lookup = getIcd10ByCode(icd10Code);
    if (!lookup) return res.status(400).json({ error: `Unknown ICD-10 code: ${icd10Code}` });

    // If marking primary, unset any existing primary for same encounter/admission.
    if (isPrimary) {
      await prisma.diagnosis.updateMany({
        where: {
          patientId: owned.id,
          ...(encounterId ? { encounterId } : {}),
          ...(admissionId ? { admissionId } : {}),
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    const created = await prisma.diagnosis.create({
      data: {
        patientId: owned.id,
        encounterId: encounterId || null,
        admissionId: admissionId || null,
        icd10Code: lookup.code,
        icd10Title: lookup.title,
        notes: notes || null,
        isPrimary: !!isPrimary,
        status: status || 'active',
        diagnosedById: req.user!.userId,
      },
    });

    void writeAudit({
      prisma, req,
      action: 'DIAGNOSIS_ADD', resource: 'Diagnosis', resourceId: created.id,
      newValue: { patientId: owned.id, icd10: lookup.code, title: lookup.title, primary: !!isPrimary },
    });
    res.status(201).json(created);
  } catch (e: any) {
    console.error('diagnosis create', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.put('/diagnoses/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const dx = await prisma.diagnosis.findFirst({
      where: { id: req.params.id, patient: { tenantId: req.user!.tenantId } },
    });
    if (!dx) return res.status(404).json({ error: 'Diagnosis not found' });
    const { status, notes, isPrimary } = req.body || {};
    const data: any = {};
    if (status !== undefined) {
      data.status = status;
      if (status === 'resolved') data.resolvedAt = new Date();
    }
    if (notes !== undefined) data.notes = notes;
    if (isPrimary !== undefined) data.isPrimary = !!isPrimary;
    const updated = await prisma.diagnosis.update({ where: { id: dx.id }, data });
    res.json(updated);
  } catch (e) {
    console.error('diagnosis update', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- CONSULTATIONS (inter-department) ----------
clinicalModulesRouter.get('/consultations', auth, async (req: AuthedReq, res: Response) => {
  try {
    const { status, mine, assignedToMe } = req.query as any;
    const where: any = { tenantId: req.user!.tenantId };
    if (status) where.status = status;
    if (mine === 'true') where.requestedById = req.user!.userId;
    if (assignedToMe === 'true') where.assignedToId = req.user!.userId;
    const items = await prisma.consultation.findMany({
      where,
      orderBy: [{ urgency: 'asc' }, { requestedAt: 'desc' }],
      take: 200,
      include: {
        patient:     { select: { id: true, name: true, mrn: true } },
        requestedBy: { select: { id: true, name: true } },
        assignedTo:  { select: { id: true, name: true } },
        respondedBy: { select: { id: true, name: true } },
      },
    });
    res.json(items);
  } catch (e) {
    console.error('consultations list', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.post('/consultations', auth, async (req: AuthedReq, res: Response) => {
  try {
    const { patientId, encounterId, admissionId, toDepartment, assignedToId, urgency, question } = req.body || {};
    if (!patientId || !toDepartment || !question) {
      return res.status(400).json({ error: 'patientId, toDepartment, and question are required' });
    }

    const owned = await prisma.patient.findFirst({
      where: { id: patientId, tenantId: req.user!.tenantId },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: 'Patient not found' });

    const created = await prisma.consultation.create({
      data: {
        tenantId: req.user!.tenantId,
        patientId: owned.id,
        encounterId: encounterId || null,
        admissionId: admissionId || null,
        requestedById: req.user!.userId,
        toDepartment,
        assignedToId: assignedToId || null,
        urgency: urgency || 'routine',
        question: String(question).trim(),
      },
      include: {
        patient:     { select: { id: true, name: true, mrn: true } },
        requestedBy: { select: { id: true, name: true } },
        assignedTo:  { select: { id: true, name: true } },
      },
    });

    void writeAudit({
      prisma, req,
      action: 'CONSULT_REQUEST', resource: 'Consultation', resourceId: created.id,
      newValue: { patientId: owned.id, toDepartment, urgency: created.urgency },
    });
    res.status(201).json(created);
  } catch (e: any) {
    console.error('consultation create', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/consultations/:id/respond', auth, async (req: AuthedReq, res: Response) => {
  try {
    const c = await prisma.consultation.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    if (!c) return res.status(404).json({ error: 'Consultation not found' });
    const { response } = req.body || {};
    if (!response || !String(response).trim()) return res.status(400).json({ error: 'response is required' });
    const updated = await prisma.consultation.update({
      where: { id: c.id },
      data: {
        response: String(response).trim(),
        respondedById: req.user!.userId,
        respondedAt: new Date(),
        status: 'responded',
      },
      include: {
        respondedBy: { select: { id: true, name: true } },
        patient:     { select: { id: true, name: true, mrn: true } },
      },
    });
    void writeAudit({
      prisma, req,
      action: 'CONSULT_RESPOND', resource: 'Consultation', resourceId: c.id,
    });
    res.json(updated);
  } catch (e: any) {
    console.error('consultation respond', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/consultations/:id/cancel', auth, async (req: AuthedReq, res: Response) => {
  try {
    const c = await prisma.consultation.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    if (!c) return res.status(404).json({ error: 'Consultation not found' });
    const updated = await prisma.consultation.update({
      where: { id: c.id },
      data: { status: 'cancelled' },
    });
    res.json(updated);
  } catch (e) {
    console.error('consultation cancel', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- DISCHARGE SUMMARY ----------
clinicalModulesRouter.get('/admissions/:id/discharge-summary', auth, async (req: AuthedReq, res: Response) => {
  try {
    const adm = await prisma.admission.findFirst({
      where: { id: req.params.id, patient: { tenantId: req.user!.tenantId } },
      select: { id: true },
    });
    if (!adm) return res.status(404).json({ error: 'Admission not found' });
    const summary = await prisma.dischargeSummary.findUnique({
      where: { admissionId: adm.id },
      include: { signedBy: { select: { id: true, name: true } } },
    });
    res.json(summary || null);
  } catch (e) {
    console.error('discharge fetch', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.put('/admissions/:id/discharge-summary', auth, async (req: AuthedReq, res: Response) => {
  try {
    const adm = await prisma.admission.findFirst({
      where: { id: req.params.id, patient: { tenantId: req.user!.tenantId } },
      select: { id: true },
    });
    if (!adm) return res.status(404).json({ error: 'Admission not found' });
    const b = req.body || {};
    if (!b.finalDiagnosis) return res.status(400).json({ error: 'finalDiagnosis is required' });

    const data = {
      finalDiagnosis: String(b.finalDiagnosis).trim(),
      proceduresDone: b.proceduresDone || null,
      treatmentSummary: b.treatmentSummary || null,
      conditionAtDischarge: b.conditionAtDischarge || null,
      dischargeMedications: b.dischargeMedications ?? null,
      followUpDate: b.followUpDate ? new Date(b.followUpDate) : null,
      followUpNotes: b.followUpNotes || null,
      instructions: b.instructions || null,
      signedById: req.user!.userId,
    };

    const summary = await prisma.dischargeSummary.upsert({
      where: { admissionId: adm.id },
      create: { ...data, admissionId: adm.id },
      update: data,
      include: { signedBy: { select: { id: true, name: true } } },
    });

    void writeAudit({
      prisma, req,
      action: 'DISCHARGE_SUMMARY_SAVE', resource: 'DischargeSummary',
      resourceId: summary.id,
    });
    res.json(summary);
  } catch (e: any) {
    console.error('discharge save', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// ---------- MEDICATION RECONCILIATION ----------
clinicalModulesRouter.get('/admissions/:id/med-rec', auth, async (req: AuthedReq, res: Response) => {
  try {
    const adm = await prisma.admission.findFirst({
      where: { id: req.params.id, patient: { tenantId: req.user!.tenantId } },
      select: { id: true },
    });
    if (!adm) return res.status(404).json({ error: 'Admission not found' });
    const items = await prisma.medicationReconciliation.findMany({
      where: { admissionId: adm.id },
      orderBy: { reconciledAt: 'desc' },
    });
    res.json(items);
  } catch (e) {
    console.error('medrec list', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.post('/admissions/:id/med-rec', auth, async (req: AuthedReq, res: Response) => {
  try {
    const adm = await prisma.admission.findFirst({
      where: { id: req.params.id, patient: { tenantId: req.user!.tenantId } },
      select: { id: true },
    });
    if (!adm) return res.status(404).json({ error: 'Admission not found' });
    const b = req.body || {};
    if (!b.source || !b.drugName) return res.status(400).json({ error: 'source and drugName are required' });
    if (!['home', 'admission', 'discharge'].includes(b.source)) {
      return res.status(400).json({ error: 'source must be home, admission, or discharge' });
    }
    const created = await prisma.medicationReconciliation.create({
      data: {
        admissionId: adm.id,
        source: b.source,
        drugName: String(b.drugName).trim(),
        drugId: b.drugId || null,
        dose: b.dose || null,
        frequency: b.frequency || null,
        action: b.action || null,
        reason: b.reason || null,
        reconciledById: req.user!.userId,
      },
    });
    res.status(201).json(created);
  } catch (e: any) {
    console.error('medrec create', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.delete('/med-rec/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const row = await prisma.medicationReconciliation.findFirst({
      where: { id: req.params.id, admission: { patient: { tenantId: req.user!.tenantId } } },
    });
    if (!row) return res.status(404).json({ error: 'Med-rec row not found' });
    await prisma.medicationReconciliation.delete({ where: { id: row.id } });
    res.status(204).end();
  } catch (e) {
    console.error('medrec delete', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- DRUG-DRUG INTERACTIONS ----------
// Checks an array of drug IDs against the static interaction table.
// Returns any pair that triggers an alert. Severity decides UI tier:
//   contraindicated → block prescription
//   major           → red warn (require ack)
//   moderate        → amber warn
//   minor           → grey info
clinicalModulesRouter.post('/drug-interactions/check', auth, async (req: AuthedReq, res: Response) => {
  try {
    const ids: string[] = Array.isArray(req.body?.drugIds) ? req.body.drugIds : [];
    if (ids.length < 2) return res.json({ interactions: [] });
    const uniqueIds = Array.from(new Set(ids));
    // Find any interactions where both drugA and drugB are in the set.
    const interactions = await prisma.drugInteraction.findMany({
      where: {
        OR: [
          { drugAId: { in: uniqueIds }, drugBId: { in: uniqueIds } },
        ],
      },
    });
    // Pull drug names for display.
    const drugs = await prisma.drug.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, name: true },
    });
    const nameById = Object.fromEntries(drugs.map(d => [d.id, d.name]));
    res.json({
      interactions: interactions.map(i => ({
        ...i,
        drugAName: nameById[i.drugAId] || '?',
        drugBName: nameById[i.drugBId] || '?',
      })),
    });
  } catch (e: any) {
    console.error('drug interaction check', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// =============== PHLEBOTOMY ROUNDS ===============

clinicalModulesRouter.get('/phlebotomy/rounds', auth, async (req: AuthedReq, res: Response) => {
  try {
    const { date, status } = req.query;
    const where: any = { tenantId: req.user!.tenantId };
    if (status) where.status = status;
    if (date) {
      const d = new Date(date as string); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      where.scheduledDate = { gte: d, lt: next };
    }
    const items = await prisma.phlebotomyRound.findMany({ where, orderBy: { scheduledDate: 'desc' }, take: 100 });
    res.json(items);
  } catch (e) {
    console.error('list phleb rounds', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.post('/phlebotomy/rounds', auth, async (req: AuthedReq, res: Response) => {
  try {
    const data = { ...req.body, tenantId: req.user!.tenantId, branchId: req.body.branchId || req.user!.branchId };
    if (data.scheduledDate) data.scheduledDate = new Date(data.scheduledDate);
    const created = await prisma.phlebotomyRound.create({ data });
    res.status(201).json(created);
  } catch (e) {
    console.error('create phleb round', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.put('/phlebotomy/rounds/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.phlebotomyRound.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!owned) return res.status(404).json({ error: 'Round not found' });
    const data = { ...req.body };
    delete data.tenantId;
    if (data.scheduledDate) data.scheduledDate = new Date(data.scheduledDate);
    const updated = await prisma.phlebotomyRound.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (e) {
    console.error('update phleb round', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============== PHYSIOTHERAPY ===============

clinicalModulesRouter.get('/physio/plans', auth, async (req: AuthedReq, res: Response) => {
  try {
    const { patientId, status } = req.query;
    const where: any = { tenantId: req.user!.tenantId };
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;
    const items = await prisma.physioPlan.findMany({
      where,
      include: { sessions: { take: 5, orderBy: { scheduledDate: 'desc' } } },
      orderBy: { startDate: 'desc' },
      take: 100,
    });
    res.json(items);
  } catch (e) {
    console.error('list physio plans', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.post('/physio/plans', auth, async (req: AuthedReq, res: Response) => {
  try {
    const data = { ...req.body, tenantId: req.user!.tenantId };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);
    const created = await prisma.physioPlan.create({ data });
    res.status(201).json(created);
  } catch (e) {
    console.error('create physio plan', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.put('/physio/plans/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.physioPlan.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!owned) return res.status(404).json({ error: 'Plan not found' });
    const data = { ...req.body }; delete data.tenantId;
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);
    const updated = await prisma.physioPlan.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (e) {
    console.error('update physio plan', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.get('/physio/sessions', auth, async (req: AuthedReq, res: Response) => {
  try {
    const { planId, patientId, date } = req.query;
    const where: any = { tenantId: req.user!.tenantId };
    if (planId) where.planId = planId;
    if (patientId) where.patientId = patientId;
    if (date) {
      const d = new Date(date as string); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      where.scheduledDate = { gte: d, lt: next };
    }
    const items = await prisma.physioSession.findMany({ where, orderBy: { scheduledDate: 'desc' }, take: 200 });
    res.json(items);
  } catch (e) {
    console.error('list physio sessions', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.post('/physio/sessions', auth, async (req: AuthedReq, res: Response) => {
  try {
    const data = { ...req.body, tenantId: req.user!.tenantId };
    if (data.scheduledDate) data.scheduledDate = new Date(data.scheduledDate);
    const created = await prisma.physioSession.create({ data });
    res.status(201).json(created);
  } catch (e) {
    console.error('create physio session', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.put('/physio/sessions/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.physioSession.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!owned) return res.status(404).json({ error: 'Session not found' });
    const data = { ...req.body }; delete data.tenantId;
    if (data.scheduledDate) data.scheduledDate = new Date(data.scheduledDate);
    const updated = await prisma.physioSession.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (e) {
    console.error('update physio session', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============== CSSD ===============

clinicalModulesRouter.get('/cssd/cycles', auth, async (req: AuthedReq, res: Response) => {
  try {
    const items = await prisma.sterilizationCycle.findMany({
      where: { tenantId: req.user!.tenantId },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
    res.json(items);
  } catch (e) {
    console.error('list cssd cycles', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.post('/cssd/cycles', auth, async (req: AuthedReq, res: Response) => {
  try {
    const data = { ...req.body, tenantId: req.user!.tenantId };
    if (!data.cycleNumber) data.cycleNumber = `CY${Date.now().toString().slice(-8)}`;
    if (data.startedAt) data.startedAt = new Date(data.startedAt);
    if (data.endedAt) data.endedAt = new Date(data.endedAt);
    const created = await prisma.sterilizationCycle.create({ data });
    res.status(201).json(created);
  } catch (e) {
    console.error('create cssd cycle', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.put('/cssd/cycles/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.sterilizationCycle.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!owned) return res.status(404).json({ error: 'Cycle not found' });
    const data = { ...req.body }; delete data.tenantId;
    if (data.startedAt) data.startedAt = new Date(data.startedAt);
    if (data.endedAt) data.endedAt = new Date(data.endedAt);
    const updated = await prisma.sterilizationCycle.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (e) {
    console.error('update cssd cycle', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.get('/cssd/instruments', auth, async (req: AuthedReq, res: Response) => {
  try {
    const items = await prisma.cSSDInstrument.findMany({
      where: { tenantId: req.user!.tenantId },
      orderBy: { name: 'asc' },
      take: 500,
    });
    res.json(items);
  } catch (e) {
    console.error('list cssd instruments', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.post('/cssd/instruments', auth, async (req: AuthedReq, res: Response) => {
  try {
    const data = { ...req.body, tenantId: req.user!.tenantId };
    const created = await prisma.cSSDInstrument.create({ data });
    res.status(201).json(created);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Instrument code already exists' });
    console.error('create cssd instrument', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============== PATHOLOGY ===============

clinicalModulesRouter.get('/pathology/cases', auth, async (req: AuthedReq, res: Response) => {
  try {
    const { status, priority, patientId } = req.query;
    const where: any = { tenantId: req.user!.tenantId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (patientId) where.patientId = patientId;
    const items = await prisma.pathologyCase.findMany({ where, orderBy: { receivedAt: 'desc' }, take: 200 });
    res.json(items);
  } catch (e) {
    console.error('list path cases', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.post('/pathology/cases', auth, async (req: AuthedReq, res: Response) => {
  try {
    const data = { ...req.body, tenantId: req.user!.tenantId };
    if (!data.caseNumber) data.caseNumber = `PA${Date.now().toString().slice(-8)}`;
    if (data.receivedAt) data.receivedAt = new Date(data.receivedAt);
    if (data.reportedAt) data.reportedAt = new Date(data.reportedAt);
    const created = await prisma.pathologyCase.create({ data });
    res.status(201).json(created);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Case number already exists' });
    console.error('create path case', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.put('/pathology/cases/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.pathologyCase.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!owned) return res.status(404).json({ error: 'Case not found' });
    const data = { ...req.body }; delete data.tenantId;
    if (data.receivedAt) data.receivedAt = new Date(data.receivedAt);
    if (data.reportedAt) data.reportedAt = new Date(data.reportedAt);
    const updated = await prisma.pathologyCase.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (e) {
    console.error('update path case', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============== EQUIPMENT MAINTENANCE ===============

clinicalModulesRouter.get('/maintenance/tickets', auth, async (req: AuthedReq, res: Response) => {
  try {
    const { status, priority } = req.query;
    const where: any = { tenantId: req.user!.tenantId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    const items = await prisma.maintenanceTicket.findMany({ where, orderBy: { reportedAt: 'desc' }, take: 200 });
    res.json(items);
  } catch (e) {
    console.error('list maintenance', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.post('/maintenance/tickets', auth, async (req: AuthedReq, res: Response) => {
  try {
    const data = { ...req.body, tenantId: req.user!.tenantId };
    if (!data.ticketNumber) data.ticketNumber = `MT${Date.now().toString().slice(-8)}`;
    if (data.reportedAt) data.reportedAt = new Date(data.reportedAt);
    const created = await prisma.maintenanceTicket.create({ data });
    res.status(201).json(created);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Ticket number already exists' });
    console.error('create maintenance', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

clinicalModulesRouter.put('/maintenance/tickets/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.maintenanceTicket.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!owned) return res.status(404).json({ error: 'Ticket not found' });
    const data = { ...req.body }; delete data.tenantId;
    if (data.reportedAt) data.reportedAt = new Date(data.reportedAt);
    if (data.startedAt) data.startedAt = new Date(data.startedAt);
    if (data.completedAt) data.completedAt = new Date(data.completedAt);
    const updated = await prisma.maintenanceTicket.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (e) {
    console.error('update maintenance', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============== PHASE 2: SURGICAL & NABH ===============
// Surgical Safety Checklist (WHO SSC), Anesthesia Record, Implant
// traceability, HAI surveillance, BMW segregation/handover, M&M
// committee reviews, and the NABH KPI dashboard. Each section follows
// the existing per-route auth pattern; tenant scoping is enforced via
// the parent Surgery / Patient row for child resources.

// Tenant-bound surgery lookup. Returns null if not owned by the user's
// tenant; callers should 404. Used by both checklist and anesthesia.
async function findOwnedSurgery(surgeryId: string, tenantId: string) {
  return prisma.surgery.findFirst({ where: { id: surgeryId, tenantId } });
}

// ---------- SURGICAL SAFETY CHECKLIST (WHO SSC) ----------
// One row per surgery (unique). Auto-created on first GET so the
// frontend doesn't need to know whether the row exists.
clinicalModulesRouter.get('/surgeries/:id/safety-checklist', auth, async (req: AuthedReq, res: Response) => {
  try {
    const surgery = await findOwnedSurgery(req.params.id, req.user!.tenantId);
    if (!surgery) return res.status(404).json({ error: 'Surgery not found' });
    let row = await prisma.surgicalSafetyChecklist.findUnique({ where: { surgeryId: surgery.id } });
    if (!row) {
      row = await prisma.surgicalSafetyChecklist.create({ data: { surgeryId: surgery.id } });
    }
    res.json(row);
  } catch (e: any) {
    console.error('get safety checklist', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.put('/surgeries/:id/safety-checklist/sign-in', auth, async (req: AuthedReq, res: Response) => {
  try {
    const surgery = await findOwnedSurgery(req.params.id, req.user!.tenantId);
    if (!surgery) return res.status(404).json({ error: 'Surgery not found' });
    const data = req.body?.data ?? {};
    const existing = await prisma.surgicalSafetyChecklist.findUnique({ where: { surgeryId: surgery.id } });
    const upserted = await prisma.surgicalSafetyChecklist.upsert({
      where: { surgeryId: surgery.id },
      create: { surgeryId: surgery.id, signInAt: new Date(), signInById: req.user!.userId, signInData: data },
      update: { signInAt: new Date(), signInById: req.user!.userId, signInData: data },
    });
    void writeAudit({
      prisma, req,
      action: 'SSC_SIGN_IN',
      resource: 'SurgicalSafetyChecklist',
      resourceId: upserted.id,
      oldValue: existing ? { signInAt: existing.signInAt } : null,
      newValue: { signInAt: upserted.signInAt },
    });
    res.json(upserted);
  } catch (e: any) {
    console.error('ssc sign-in', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.put('/surgeries/:id/safety-checklist/time-out', auth, async (req: AuthedReq, res: Response) => {
  try {
    const surgery = await findOwnedSurgery(req.params.id, req.user!.tenantId);
    if (!surgery) return res.status(404).json({ error: 'Surgery not found' });
    const data = req.body?.data ?? {};
    const existing = await prisma.surgicalSafetyChecklist.findUnique({ where: { surgeryId: surgery.id } });
    if (!existing || !existing.signInAt) {
      return res.status(400).json({ error: 'Sign-in must be completed first' });
    }
    const updated = await prisma.surgicalSafetyChecklist.update({
      where: { surgeryId: surgery.id },
      data: { timeOutAt: new Date(), timeOutById: req.user!.userId, timeOutData: data },
    });
    void writeAudit({
      prisma, req,
      action: 'SSC_TIME_OUT',
      resource: 'SurgicalSafetyChecklist',
      resourceId: updated.id,
      newValue: { timeOutAt: updated.timeOutAt },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('ssc time-out', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.put('/surgeries/:id/safety-checklist/sign-out', auth, async (req: AuthedReq, res: Response) => {
  try {
    const surgery = await findOwnedSurgery(req.params.id, req.user!.tenantId);
    if (!surgery) return res.status(404).json({ error: 'Surgery not found' });
    const data = req.body?.data ?? {};
    const existing = await prisma.surgicalSafetyChecklist.findUnique({ where: { surgeryId: surgery.id } });
    if (!existing || !existing.timeOutAt) {
      return res.status(400).json({ error: 'Time-out must be completed first' });
    }
    const updated = await prisma.surgicalSafetyChecklist.update({
      where: { surgeryId: surgery.id },
      data: {
        signOutAt: new Date(),
        signOutById: req.user!.userId,
        signOutData: data,
        isComplete: true,
      },
    });
    void writeAudit({
      prisma, req,
      action: 'SSC_SIGN_OUT',
      resource: 'SurgicalSafetyChecklist',
      resourceId: updated.id,
      newValue: { signOutAt: updated.signOutAt, isComplete: true },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('ssc sign-out', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// ---------- ANESTHESIA RECORD ----------
// One row per surgery. Locked once `signedAt` is set.
clinicalModulesRouter.get('/surgeries/:id/anesthesia', auth, async (req: AuthedReq, res: Response) => {
  try {
    const surgery = await findOwnedSurgery(req.params.id, req.user!.tenantId);
    if (!surgery) return res.status(404).json({ error: 'Surgery not found' });
    const row = await prisma.anesthesiaRecord.findUnique({ where: { surgeryId: surgery.id } });
    res.json(row);
  } catch (e: any) {
    console.error('get anesthesia', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.put('/surgeries/:id/anesthesia', auth, async (req: AuthedReq, res: Response) => {
  try {
    const surgery = await findOwnedSurgery(req.params.id, req.user!.tenantId);
    if (!surgery) return res.status(404).json({ error: 'Surgery not found' });
    const existing = await prisma.anesthesiaRecord.findUnique({ where: { surgeryId: surgery.id } });
    if (existing?.signedAt) return res.status(400).json({ error: 'Anesthesia record is locked (signed)' });
    if (!req.body?.type) return res.status(400).json({ error: 'type is required' });

    const body = req.body || {};
    const data: any = {
      anesthetistId: body.anesthetistId ?? null,
      type: body.type,
      asaScore: body.asaScore ?? null,
      preOpAssessment: body.preOpAssessment ?? null,
      inductionDrugs: body.inductionDrugs ?? undefined,
      inductionAt: body.inductionAt ? new Date(body.inductionAt) : null,
      maintenanceDrugs: body.maintenanceDrugs ?? undefined,
      reversalDrugs: body.reversalDrugs ?? undefined,
      reversalAt: body.reversalAt ? new Date(body.reversalAt) : null,
      intraOpEvents: body.intraOpEvents ?? undefined,
      pacuStart: body.pacuStart ? new Date(body.pacuStart) : null,
      pacuEnd: body.pacuEnd ? new Date(body.pacuEnd) : null,
      aldreteScore: body.aldreteScore ?? null,
      complications: body.complications ?? null,
      notes: body.notes ?? null,
    };

    const upserted = await prisma.anesthesiaRecord.upsert({
      where: { surgeryId: surgery.id },
      create: { surgeryId: surgery.id, ...data },
      update: data,
    });
    void writeAudit({
      prisma, req,
      action: existing ? 'ANESTHESIA_UPDATE' : 'ANESTHESIA_CREATE',
      resource: 'AnesthesiaRecord',
      resourceId: upserted.id,
      newValue: { type: upserted.type },
    });
    res.json(upserted);
  } catch (e: any) {
    console.error('upsert anesthesia', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/surgeries/:id/anesthesia/event', auth, async (req: AuthedReq, res: Response) => {
  try {
    const surgery = await findOwnedSurgery(req.params.id, req.user!.tenantId);
    if (!surgery) return res.status(404).json({ error: 'Surgery not found' });
    const existing = await prisma.anesthesiaRecord.findUnique({ where: { surgeryId: surgery.id } });
    if (!existing) return res.status(404).json({ error: 'Anesthesia record not found — create it first' });
    if (existing.signedAt) return res.status(400).json({ error: 'Anesthesia record is locked (signed)' });

    const { type, bp, hr, spo2, etco2, notes } = req.body || {};
    if (!type) return res.status(400).json({ error: 'event type is required' });

    const events = Array.isArray(existing.intraOpEvents) ? [...(existing.intraOpEvents as any[])] : [];
    events.push({
      at: new Date().toISOString(),
      type,
      bp: bp ?? null,
      hr: hr ?? null,
      spo2: spo2 ?? null,
      etco2: etco2 ?? null,
      notes: notes ?? null,
    });
    const updated = await prisma.anesthesiaRecord.update({
      where: { surgeryId: surgery.id },
      data: { intraOpEvents: events as any },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('append anesthesia event', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/surgeries/:id/anesthesia/sign', auth, async (req: AuthedReq, res: Response) => {
  try {
    const surgery = await findOwnedSurgery(req.params.id, req.user!.tenantId);
    if (!surgery) return res.status(404).json({ error: 'Surgery not found' });
    const existing = await prisma.anesthesiaRecord.findUnique({ where: { surgeryId: surgery.id } });
    if (!existing) return res.status(404).json({ error: 'Anesthesia record not found' });
    if (existing.signedAt) return res.status(400).json({ error: 'Already signed' });
    const updated = await prisma.anesthesiaRecord.update({
      where: { surgeryId: surgery.id },
      data: { signedAt: new Date() },
    });
    void writeAudit({
      prisma, req,
      action: 'ANESTHESIA_SIGN',
      resource: 'AnesthesiaRecord',
      resourceId: updated.id,
      newValue: { signedAt: updated.signedAt },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('sign anesthesia', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// ---------- IMPLANTS (lifetime register) ----------
clinicalModulesRouter.get('/implants', auth, async (req: AuthedReq, res: Response) => {
  try {
    const { patientId, type, search } = req.query;
    const where: any = { tenantId: req.user!.tenantId };
    if (patientId) where.patientId = patientId;
    if (type) where.implantType = type;
    if (search) {
      where.OR = [
        { manufacturer: { contains: String(search), mode: 'insensitive' } },
        { brandName: { contains: String(search), mode: 'insensitive' } },
        { modelNumber: { contains: String(search), mode: 'insensitive' } },
        { serialNumber: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    const items = await prisma.implant.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, mrn: true } },
        surgery: { select: { id: true, procedureName: true } },
      },
      orderBy: { implantedAt: 'desc' },
      take: 200,
    });
    res.json(items);
  } catch (e: any) {
    console.error('list implants', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/implants', auth, async (req: AuthedReq, res: Response) => {
  try {
    const body = req.body || {};
    if (!body.patientId || !body.implantType || !body.manufacturer || !body.serialNumber || !body.implantedAt) {
      return res.status(400).json({ error: 'patientId, implantType, manufacturer, serialNumber, implantedAt are required' });
    }
    // Verify patient is in tenant.
    const patient = await prisma.patient.findFirst({ where: { id: body.patientId, tenantId: req.user!.tenantId } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const data: any = {
      tenantId: req.user!.tenantId,
      patientId: body.patientId,
      surgeryId: body.surgeryId ?? null,
      implantType: body.implantType,
      manufacturer: body.manufacturer,
      brandName: body.brandName ?? null,
      modelNumber: body.modelNumber ?? null,
      serialNumber: body.serialNumber,
      batchLotNumber: body.batchLotNumber ?? null,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      side: body.side ?? 'na',
      anatomicalSite: body.anatomicalSite ?? null,
      implantedAt: new Date(body.implantedAt),
      implantedById: req.user!.userId,
      warrantyExpiresAt: body.warrantyExpiresAt ? new Date(body.warrantyExpiresAt) : null,
      notes: body.notes ?? null,
    };

    const created = await prisma.implant.create({ data });
    void writeAudit({
      prisma, req,
      action: 'IMPLANT_CREATE',
      resource: 'Implant',
      resourceId: created.id,
      newValue: { manufacturer: created.manufacturer, serialNumber: created.serialNumber, patientId: created.patientId },
    });
    res.status(201).json(created);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Implant with this manufacturer + serial number already exists' });
    console.error('create implant', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/implants/:id/remove', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.implant.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!owned) return res.status(404).json({ error: 'Implant not found' });
    if (owned.removedAt) return res.status(400).json({ error: 'Implant already marked removed' });
    const { removalReason, removedAt } = req.body || {};
    if (!removalReason) return res.status(400).json({ error: 'removalReason is required' });

    const updated = await prisma.implant.update({
      where: { id: owned.id },
      data: {
        removedAt: removedAt ? new Date(removedAt) : new Date(),
        removedById: req.user!.userId,
        removalReason,
      },
    });
    void writeAudit({
      prisma, req,
      action: 'IMPLANT_REMOVE',
      resource: 'Implant',
      resourceId: updated.id,
      newValue: { removedAt: updated.removedAt, removalReason },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('remove implant', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// ---------- HAI CASES ----------
clinicalModulesRouter.get('/hai-cases', auth, async (req: AuthedReq, res: Response) => {
  try {
    const { status, type, from, to } = req.query;
    const where: any = { tenantId: req.user!.tenantId };
    if (status) where.outcomeStatus = status;
    if (type) where.infectionType = type;

    // Default to last 90 days unless `from` provided.
    const fromDate = from ? new Date(String(from)) : (() => { const d = new Date(); d.setDate(d.getDate() - 90); return d; })();
    const toDate = to ? new Date(String(to)) : new Date();
    where.identifiedDate = { gte: fromDate, lte: toDate };

    const items = await prisma.hAICase.findMany({
      where,
      include: { patient: { select: { id: true, name: true, mrn: true } } },
      orderBy: { identifiedDate: 'desc' },
      take: 200,
    });
    res.json(items);
  } catch (e: any) {
    console.error('list hai cases', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/hai-cases', auth, async (req: AuthedReq, res: Response) => {
  try {
    const body = req.body || {};
    if (!body.patientId || !body.infectionType || !body.onsetDate) {
      return res.status(400).json({ error: 'patientId, infectionType, onsetDate are required' });
    }
    const patient = await prisma.patient.findFirst({ where: { id: body.patientId, tenantId: req.user!.tenantId } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const data: any = {
      tenantId: req.user!.tenantId,
      patientId: body.patientId,
      encounterId: body.encounterId ?? null,
      admissionId: body.admissionId ?? null,
      infectionType: body.infectionType,
      organism: body.organism ?? null,
      sensitivityPattern: body.sensitivityPattern ?? null,
      onsetDate: new Date(body.onsetDate),
      identifiedById: req.user!.userId,
      isolationRequired: !!body.isolationRequired,
      isolationStarted: body.isolationStarted ? new Date(body.isolationStarted) : null,
      notes: body.notes ?? null,
    };
    const created = await prisma.hAICase.create({ data });
    void writeAudit({
      prisma, req,
      action: 'HAI_CREATE',
      resource: 'HAICase',
      resourceId: created.id,
      newValue: { infectionType: created.infectionType, patientId: created.patientId },
    });
    res.status(201).json(created);
  } catch (e: any) {
    console.error('create hai case', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.put('/hai-cases/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.hAICase.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!owned) return res.status(404).json({ error: 'HAI case not found' });
    const body = req.body || {};
    const data: any = {};
    const passthrough = ['infectionType', 'organism', 'sensitivityPattern', 'isolationRequired', 'outcomeStatus', 'notes'];
    for (const k of passthrough) if (k in body) data[k] = body[k];
    if (body.onsetDate) data.onsetDate = new Date(body.onsetDate);
    if (body.isolationStarted) data.isolationStarted = new Date(body.isolationStarted);
    if (body.isolationEnded) data.isolationEnded = new Date(body.isolationEnded);
    if (body.reportedToICCAt) data.reportedToICCAt = new Date(body.reportedToICCAt);

    const updated = await prisma.hAICase.update({ where: { id: owned.id }, data });
    void writeAudit({
      prisma, req,
      action: 'HAI_UPDATE',
      resource: 'HAICase',
      resourceId: updated.id,
      newValue: data,
    });
    res.json(updated);
  } catch (e: any) {
    console.error('update hai case', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.get('/hai-cases/summary', auth, async (req: AuthedReq, res: Response) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(String(from)) : (() => { const d = new Date(); d.setDate(d.getDate() - 90); return d; })();
    const toDate = to ? new Date(String(to)) : new Date();
    const where: any = {
      tenantId: req.user!.tenantId,
      identifiedDate: { gte: fromDate, lte: toDate },
    };
    const cases = await prisma.hAICase.findMany({
      where,
      select: { infectionType: true, outcomeStatus: true, isolationStarted: true, isolationEnded: true },
    });
    const byType: Record<string, number> = {};
    const byOutcome: Record<string, number> = {};
    let isolationActive = 0;
    for (const c of cases) {
      byType[c.infectionType] = (byType[c.infectionType] || 0) + 1;
      byOutcome[c.outcomeStatus] = (byOutcome[c.outcomeStatus] || 0) + 1;
      if (c.isolationStarted && !c.isolationEnded) isolationActive++;
    }
    res.json({ total: cases.length, byType, byOutcome, isolationActive });
  } catch (e: any) {
    console.error('hai summary', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// ---------- BMW LOGS ----------
clinicalModulesRouter.get('/bmw', auth, async (req: AuthedReq, res: Response) => {
  try {
    const { category, from, to } = req.query;
    const where: any = { tenantId: req.user!.tenantId };
    if (category) where.category = category;
    const fromDate = from ? new Date(String(from)) : (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();
    const toDate = to ? new Date(String(to)) : new Date();
    where.collectedAt = { gte: fromDate, lte: toDate };
    const items = await prisma.bMWLog.findMany({ where, orderBy: { collectedAt: 'desc' }, take: 500 });
    res.json(items);
  } catch (e: any) {
    console.error('list bmw', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/bmw', auth, async (req: AuthedReq, res: Response) => {
  try {
    const body = req.body || {};
    if (!body.category || body.weightKg == null || !body.source) {
      return res.status(400).json({ error: 'category, weightKg, source are required' });
    }
    const branchId = body.branchId || req.user!.branchId;
    if (!branchId) return res.status(400).json({ error: 'branchId is required (and missing on user)' });

    const data: any = {
      tenantId: req.user!.tenantId,
      branchId,
      category: body.category,
      weightKg: Number(body.weightKg),
      source: body.source,
      collectedAt: body.collectedAt ? new Date(body.collectedAt) : new Date(),
      collectedById: req.user!.userId,
      notes: body.notes ?? null,
    };
    const created = await prisma.bMWLog.create({ data });
    void writeAudit({
      prisma, req,
      action: 'BMW_CREATE',
      resource: 'BMWLog',
      resourceId: created.id,
      newValue: { category: created.category, weightKg: created.weightKg, source: created.source },
    });
    res.status(201).json(created);
  } catch (e: any) {
    console.error('create bmw', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/bmw/:id/handover', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.bMWLog.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!owned) return res.status(404).json({ error: 'BMW log not found' });
    if (owned.handoverAt) return res.status(400).json({ error: 'BMW log already handed over' });
    const { handoverTo, bspName, bspManifestNumber, handoverAt } = req.body || {};
    if (!handoverTo || !bspName || !bspManifestNumber) {
      return res.status(400).json({ error: 'handoverTo, bspName, bspManifestNumber are required' });
    }
    const updated = await prisma.bMWLog.update({
      where: { id: owned.id },
      data: {
        handoverAt: handoverAt ? new Date(handoverAt) : new Date(),
        handoverTo,
        bspName,
        bspManifestNumber,
      },
    });
    void writeAudit({
      prisma, req,
      action: 'BMW_HANDOVER',
      resource: 'BMWLog',
      resourceId: updated.id,
      newValue: { handoverAt: updated.handoverAt, bspName, bspManifestNumber },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('bmw handover', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.get('/bmw/summary', auth, async (req: AuthedReq, res: Response) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(String(from)) : (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();
    const toDate = to ? new Date(String(to)) : new Date();
    const where: any = {
      tenantId: req.user!.tenantId,
      collectedAt: { gte: fromDate, lte: toDate },
    };
    const logs = await prisma.bMWLog.findMany({
      where,
      select: { category: true, weightKg: true, handoverAt: true },
    });
    let totalKg = 0;
    const byCategory: Record<string, number> = {};
    let pendingHandoverCount = 0;
    for (const l of logs) {
      totalKg += l.weightKg;
      byCategory[l.category] = (byCategory[l.category] || 0) + l.weightKg;
      if (!l.handoverAt) pendingHandoverCount++;
    }
    res.json({ totalKg, byCategory, pendingHandoverCount });
  } catch (e: any) {
    console.error('bmw summary', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// ---------- M&M REVIEWS ----------
clinicalModulesRouter.get('/mnm', auth, async (req: AuthedReq, res: Response) => {
  try {
    const { status, isMortality, from, to } = req.query;
    const where: any = { tenantId: req.user!.tenantId };
    if (status) where.status = status;
    if (typeof isMortality !== 'undefined') where.isMortality = String(isMortality) === 'true';
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = new Date(String(to));
    }
    const items = await prisma.mnMReview.findMany({
      where,
      include: { patient: { select: { id: true, name: true, mrn: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(items);
  } catch (e: any) {
    console.error('list mnm', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/mnm', auth, async (req: AuthedReq, res: Response) => {
  try {
    const body = req.body || {};
    if (!body.patientId || typeof body.isMortality === 'undefined') {
      return res.status(400).json({ error: 'patientId and isMortality are required' });
    }
    const patient = await prisma.patient.findFirst({ where: { id: body.patientId, tenantId: req.user!.tenantId } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const data: any = {
      tenantId: req.user!.tenantId,
      patientId: body.patientId,
      admissionId: body.admissionId ?? null,
      isMortality: !!body.isMortality,
      presentationSummary: body.presentationSummary ?? null,
      diagnosis: body.diagnosis ?? null,
      clinicalCourse: body.clinicalCourse ?? null,
      outcome: body.outcome ?? null,
      notes: body.notes ?? null,
      status: 'pending',
    };
    const created = await prisma.mnMReview.create({ data });
    void writeAudit({
      prisma, req,
      action: 'MNM_CREATE',
      resource: 'MnMReview',
      resourceId: created.id,
      newValue: { patientId: created.patientId, isMortality: created.isMortality },
    });
    res.status(201).json(created);
  } catch (e: any) {
    console.error('create mnm', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.put('/mnm/:id/review', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.mnMReview.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!owned) return res.status(404).json({ error: 'M&M review not found' });
    const body = req.body || {};
    const data: any = {};
    for (const k of ['rootCause', 'learningPoints', 'preventabilityScore', 'reviewers', 'status', 'notes']) {
      if (k in body) data[k] = body[k];
    }
    // Stamp reviewedAt if status moves to reviewed/closed.
    if (data.status === 'reviewed' || data.status === 'closed') {
      data.reviewedAt = new Date();
    }
    const updated = await prisma.mnMReview.update({ where: { id: owned.id }, data });
    void writeAudit({
      prisma, req,
      action: 'MNM_REVIEW',
      resource: 'MnMReview',
      resourceId: updated.id,
      newValue: { status: updated.status, reviewedAt: updated.reviewedAt },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('mnm review', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// ---------- NABH KPI DASHBOARD ----------
// One read-only endpoint that runs all KPI computations in parallel
// and gracefully degrades — a failed sub-query returns 0 instead of
// 500-ing the whole dashboard.
clinicalModulesRouter.get('/nabh/kpis', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { from, to } = req.query;
    const fromDate = from ? new Date(String(from)) : (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();
    const toDate = to ? new Date(String(to)) : new Date();

    // Current month bounds for "this month" buckets.
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const safe = async <T>(p: Promise<T>, fallback: T): Promise<T> => p.catch(() => fallback);

    // --- mortality + LAMA + LOS use patient.tenantId because Admission has none.
    const admissionWhere: any = {
      patient: { tenantId },
      admissionDate: { gte: fromDate, lte: toDate },
    };

    const [
      dischargesInWindow,
      deathsInWindow,
      lamaCount,
      totalBeds,
      occupiedAdmissions,
      admissionsForLOS,
      surgeriesInWindow,
      returnOTGroups,
      haiInWindow,
      admissionsCountInWindow,
      medErrorCount,
      checklistComplete,
      surgeriesScheduled,
      iccReportsThisMonth,
      bmwSumThisMonth,
    ] = await Promise.all([
      // dischargesInWindow
      safe(
        prisma.admission.count({
          where: { patient: { tenantId }, dischargeDate: { gte: fromDate, lte: toDate } },
        }),
        0,
      ),
      // deathsInWindow — discharges with status='died' or 'expired'
      safe(
        prisma.admission.count({
          where: {
            patient: { tenantId },
            dischargeDate: { gte: fromDate, lte: toDate },
            status: { in: ['died', 'expired'] },
          },
        }),
        0,
      ),
      // lamaCount
      safe(
        prisma.admission.count({
          where: {
            patient: { tenantId },
            dischargeDate: { gte: fromDate, lte: toDate },
            status: 'lama',
          },
        }),
        0,
      ),
      // totalBeds (tenant via branch)
      safe(
        prisma.bed.count({ where: { branch: { tenantId } } }),
        0,
      ),
      // occupiedAdmissions — active admissions right now
      safe(
        prisma.admission.count({
          where: { patient: { tenantId }, status: 'active', dischargeDate: null },
        }),
        0,
      ),
      // admissionsForLOS — completed admissions in the window
      safe(
        prisma.admission.findMany({
          where: { patient: { tenantId }, admissionDate: { gte: fromDate, lte: toDate }, dischargeDate: { not: null } },
          select: { admissionDate: true, dischargeDate: true },
        }),
        [] as { admissionDate: Date; dischargeDate: Date | null }[],
      ),
      // surgeriesInWindow
      safe(
        prisma.surgery.findMany({
          where: { tenantId, scheduledDate: { gte: fromDate, lte: toDate } },
          select: { id: true, patientId: true },
        }),
        [] as { id: string; patientId: string | null }[],
      ),
      // returnOTGroups — group surgeries by patient where same patient has >=2 in window
      safe(
        prisma.surgery.groupBy({
          by: ['patientId'],
          where: { tenantId, scheduledDate: { gte: fromDate, lte: toDate }, patientId: { not: null } },
          _count: { _all: true },
        }),
        [] as Array<{ patientId: string | null; _count: { _all: number } }>,
      ),
      // haiInWindow
      safe(
        prisma.hAICase.count({ where: { tenantId, identifiedDate: { gte: fromDate, lte: toDate } } }),
        0,
      ),
      // admissionsCountInWindow — for HAI rate denominator
      safe(prisma.admission.count({ where: admissionWhere }), 0),
      // medErrorCount — from audit log
      safe(
        prisma.auditLog.count({
          where: { tenantId, action: 'MEDICATION_ERROR', timestamp: { gte: fromDate, lte: toDate } },
        }),
        0,
      ),
      // checklistComplete — completed checklists for surgeries in window
      safe(
        prisma.surgicalSafetyChecklist.count({
          where: {
            isComplete: true,
            surgery: { tenantId, scheduledDate: { gte: fromDate, lte: toDate } },
          },
        }),
        0,
      ),
      // surgeriesScheduled — denominator for checklist compliance
      safe(
        prisma.surgery.count({ where: { tenantId, scheduledDate: { gte: fromDate, lte: toDate } } }),
        0,
      ),
      // iccReportsThisMonth
      safe(
        prisma.hAICase.count({
          where: { tenantId, reportedToICCAt: { gte: monthStart, lt: monthEnd } },
        }),
        0,
      ),
      // bmwSumThisMonth
      safe(
        prisma.bMWLog.aggregate({
          _sum: { weightKg: true },
          where: { tenantId, collectedAt: { gte: monthStart, lt: monthEnd } },
        }),
        { _sum: { weightKg: 0 } } as any,
      ),
    ]);

    const mortalityRate = dischargesInWindow > 0 ? (deathsInWindow / dischargesInWindow) * 100 : 0;
    const lamaRate = dischargesInWindow > 0 ? (lamaCount / dischargesInWindow) * 100 : 0;
    const bedOccupancyPct = totalBeds > 0 ? (occupiedAdmissions / totalBeds) * 100 : 0;

    let totalLOSDays = 0;
    let losSampleCount = 0;
    for (const a of admissionsForLOS) {
      if (a.dischargeDate && a.admissionDate) {
        const ms = a.dischargeDate.getTime() - a.admissionDate.getTime();
        if (ms > 0) {
          totalLOSDays += ms / (1000 * 60 * 60 * 24);
          losSampleCount++;
        }
      }
    }
    const averageLOS = losSampleCount > 0 ? totalLOSDays / losSampleCount : 0;

    const returnToOTPatients = returnOTGroups.filter(g => (g._count?._all ?? 0) >= 2).length;
    const totalSurgeries = surgeriesInWindow.length;
    const returnToOTRate = totalSurgeries > 0 ? (returnToOTPatients / totalSurgeries) * 100 : 0;

    const haiRatePerHundredAdmissions = admissionsCountInWindow > 0
      ? (haiInWindow / admissionsCountInWindow) * 100
      : 0;

    const surgicalChecklistCompliancePct = surgeriesScheduled > 0
      ? (checklistComplete / surgeriesScheduled) * 100
      : 0;

    res.json({
      windowFrom: fromDate.toISOString(),
      windowTo: toDate.toISOString(),
      mortalityRate: Number(mortalityRate.toFixed(2)),
      lamaRate: Number(lamaRate.toFixed(2)),
      bedOccupancyPct: Number(bedOccupancyPct.toFixed(2)),
      averageLOS: Number(averageLOS.toFixed(2)),
      returnToOTRate: Number(returnToOTRate.toFixed(2)),
      haiCount: haiInWindow,
      haiRatePerHundredAdmissions: Number(haiRatePerHundredAdmissions.toFixed(2)),
      medicationErrorCount: medErrorCount,
      surgicalChecklistCompliancePct: Number(surgicalChecklistCompliancePct.toFixed(2)),
      infectionControlReportsThisMonth: iccReportsThisMonth,
      bmwTotalKgThisMonth: Number(((bmwSumThisMonth as any)?._sum?.weightKg ?? 0).toFixed(2)),
      _meta: {
        dischargesInWindow,
        deathsInWindow,
        totalBeds,
        occupiedAdmissions,
        admissionsCountInWindow,
        totalSurgeries,
        checklistComplete,
        surgeriesScheduled,
      },
    });
  } catch (e: any) {
    console.error('nabh kpis', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// =============== PHASE 3: INDIA STATUTORY COMPLIANCE ===============
// PCPNDT Form-F (ultrasound register), MTP Act register, ABHA / ABDM
// scaffolds, PMJAY claim workflow, and GST / e-invoicing helpers.
//
// Legal notes:
//   • PCPNDT and MTP registers are privacy-critical — every READ is
//     audit-logged (action 'FORMF_READ' / 'MTP_READ') in addition to
//     every mutation. Sex determination is illegal; the Form-F schema
//     deliberately has no sex field.
//   • MTP Act 2021: ≤20 wks = one doctor's opinion; 20–24 wks = two
//     doctors must concur (boardConcurrence flag); >24 wks = only
//     legal ground is substantial foetal abnormality ('foetal_anomaly').
//   • ABDM, IRP (e-invoice), and PMJAY TMS integrations are STUBBED
//     locally — they generate deterministic IDs / acks so the workflow
//     can be exercised end-to-end without a live gateway.

// ---------- Form-F (PCPNDT) ULTRASOUND REGISTER ----------

const FORMF_ALLOWED_INDICATIONS = [
  'anomaly_screening', 'growth_monitoring', 'placenta_location',
  'liquor_volume', 'biophysical_profile', 'twin_pregnancy',
  'cervical_length', 'doppler_study', 'other',
];
const FORMF_ALLOWED_PROCEDURES = ['usg_abdominal', 'usg_transvaginal', 'doppler'];

clinicalModulesRouter.get('/form-f', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { from, to, search } = req.query;
    const where: any = { tenantId };
    if (from || to) {
      where.performedAt = {};
      if (from) where.performedAt.gte = new Date(String(from));
      if (to) where.performedAt.lte = new Date(String(to));
    }
    if (search) {
      const s = String(search);
      where.OR = [
        { formFNumber: { contains: s, mode: 'insensitive' } },
        { patientName: { contains: s, mode: 'insensitive' } },
        { sonologistName: { contains: s, mode: 'insensitive' } },
      ];
    }
    const rows = await prisma.ultrasoundFormF.findMany({
      where,
      take: 200,
      orderBy: { performedAt: 'desc' },
      include: { patient: { select: { id: true, name: true, mrn: true } } },
    });
    res.json(rows);
  } catch (e: any) {
    console.error('list form-f', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.get('/form-f/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const row = await prisma.ultrasoundFormF.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: { patient: { select: { id: true, name: true, mrn: true } } },
    });
    if (!row) return res.status(404).json({ error: 'Form-F not found' });
    // PCPNDT register is privacy-critical — audit every read.
    void writeAudit({
      prisma, req,
      action: 'FORMF_READ',
      resource: 'UltrasoundFormF',
      resourceId: row.id,
    });
    res.json(row);
  } catch (e: any) {
    console.error('get form-f', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/form-f', auth, async (req: AuthedReq, res: Response) => {
  try {
    const b = req.body || {};
    const tenantId = req.user!.tenantId;

    // Required field validation. patientAge, indication, procedure,
    // sonologist name+regNo+pcpndtCert, performedAt all mandatory.
    if (!b.patientName) return res.status(400).json({ error: 'patientName is required' });
    if (b.patientAge === undefined || b.patientAge === null) return res.status(400).json({ error: 'patientAge is required' });
    if (!b.patientHusbandOrFather) return res.status(400).json({ error: 'patientHusbandOrFather is required' });
    if (!b.patientAddress) return res.status(400).json({ error: 'patientAddress is required' });
    if (!b.indication) return res.status(400).json({ error: 'indication is required' });
    if (!FORMF_ALLOWED_INDICATIONS.includes(b.indication)) {
      return res.status(400).json({ error: `indication must be one of: ${FORMF_ALLOWED_INDICATIONS.join('|')}` });
    }
    if (!b.procedure) return res.status(400).json({ error: 'procedure is required' });
    if (!FORMF_ALLOWED_PROCEDURES.includes(b.procedure)) {
      return res.status(400).json({ error: `procedure must be one of: ${FORMF_ALLOWED_PROCEDURES.join('|')}` });
    }
    if (!b.sonologistName) return res.status(400).json({ error: 'sonologistName is required' });
    if (!b.sonologistRegNo) return res.status(400).json({ error: 'sonologistRegNo is required' });
    if (!b.sonologistPcpndtCertNo) return res.status(400).json({ error: 'sonologistPcpndtCertNo is required' });
    if (!b.performedAt) return res.status(400).json({ error: 'performedAt is required' });

    // If patientId supplied, confirm tenant ownership.
    if (b.patientId) {
      const p = await prisma.patient.findFirst({ where: { id: b.patientId, tenantId }, select: { id: true } });
      if (!p) return res.status(404).json({ error: 'Patient not found' });
    }

    // Mint formFNumber: F-YYYY-MM-NNNN scoped to tenant + current month.
    const performedAt = new Date(b.performedAt);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthCount = await prisma.ultrasoundFormF.count({
      where: { tenantId, createdAt: { gte: monthStart, lt: monthEnd } },
    });
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const seq = String(monthCount + 1).padStart(4, '0');
    const formFNumber = `F-${yyyy}-${mm}-${seq}`;

    const created = await prisma.ultrasoundFormF.create({
      data: {
        tenantId,
        formFNumber,
        patientId: b.patientId || null,
        patientName: b.patientName,
        patientAge: Number(b.patientAge),
        patientHusbandOrFather: b.patientHusbandOrFather,
        patientAddress: b.patientAddress,
        spouseName: b.spouseName || null,
        priorChildren: b.priorChildren ?? 0,
        priorChildrenGender: b.priorChildrenGender || null,
        referredById: b.referredById || null,
        referredByName: b.referredByName || null,
        referrerRegNo: b.referrerRegNo || null,
        lmpDate: b.lmpDate ? new Date(b.lmpDate) : null,
        gestationWeeks: b.gestationWeeks ?? null,
        obstetricHistory: b.obstetricHistory || null,
        indication: b.indication,
        indicationOther: b.indicationOther || null,
        procedure: b.procedure,
        sonologistId: req.user!.userId,
        sonologistName: b.sonologistName,
        sonologistRegNo: b.sonologistRegNo,
        sonologistPcpndtCertNo: b.sonologistPcpndtCertNo,
        performedAt,
        findings: b.findings || null,
      },
      include: { patient: { select: { id: true, name: true, mrn: true } } },
    });

    void writeAudit({
      prisma, req,
      action: 'FORMF_CREATE',
      resource: 'UltrasoundFormF',
      resourceId: created.id,
      newValue: { formFNumber: created.formFNumber, indication: created.indication, procedure: created.procedure },
    });

    res.status(201).json(created);
  } catch (e: any) {
    console.error('create form-f', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.put('/form-f/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.ultrasoundFormF.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    if (!owned) return res.status(404).json({ error: 'Form-F not found' });
    // Once signed, the legal artefact is frozen.
    if (owned.signedAt) {
      return res.status(400).json({ error: 'Form-F has been signed and is read-only. Create an amendment instead.' });
    }
    const data: any = { ...req.body };
    delete data.tenantId;
    delete data.id;
    delete data.formFNumber;
    delete data.signedAt;
    if (data.indication && !FORMF_ALLOWED_INDICATIONS.includes(data.indication)) {
      return res.status(400).json({ error: `indication must be one of: ${FORMF_ALLOWED_INDICATIONS.join('|')}` });
    }
    if (data.procedure && !FORMF_ALLOWED_PROCEDURES.includes(data.procedure)) {
      return res.status(400).json({ error: `procedure must be one of: ${FORMF_ALLOWED_PROCEDURES.join('|')}` });
    }
    if (data.performedAt) data.performedAt = new Date(data.performedAt);
    if (data.lmpDate) data.lmpDate = new Date(data.lmpDate);

    const updated = await prisma.ultrasoundFormF.update({
      where: { id: owned.id },
      data,
      include: { patient: { select: { id: true, name: true, mrn: true } } },
    });
    void writeAudit({
      prisma, req,
      action: 'FORMF_UPDATE',
      resource: 'UltrasoundFormF',
      resourceId: updated.id,
      newValue: { indication: updated.indication, procedure: updated.procedure },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('update form-f', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/form-f/:id/sign', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.ultrasoundFormF.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    if (!owned) return res.status(404).json({ error: 'Form-F not found' });
    if (owned.signedAt) return res.status(400).json({ error: 'Form-F already signed' });
    const updated = await prisma.ultrasoundFormF.update({
      where: { id: owned.id },
      data: { signedAt: new Date() },
    });
    void writeAudit({
      prisma, req,
      action: 'FORMF_SIGN',
      resource: 'UltrasoundFormF',
      resourceId: updated.id,
      newValue: { signedAt: updated.signedAt },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('sign form-f', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// ---------- MTP (Medical Termination of Pregnancy) REGISTER ----------

const MTP_ALLOWED_INDICATIONS = [
  'risk_to_life', 'risk_grave_injury', 'foetal_anomaly',
  'contraceptive_failure', 'rape_pregnancy', 'mental_health',
];
const MTP_ALLOWED_METHODS = [
  'medical_abortion', 'suction_aspiration', 'd_and_c', 'second_trimester_induction',
];

clinicalModulesRouter.get('/mtp', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { from, to, search } = req.query;
    const where: any = { tenantId };
    if (from || to) {
      where.procedureAt = {};
      if (from) where.procedureAt.gte = new Date(String(from));
      if (to) where.procedureAt.lte = new Date(String(to));
    }
    if (search) {
      const s = String(search);
      where.OR = [
        { registerNumber: { contains: s, mode: 'insensitive' } },
        { primaryDoctorName: { contains: s, mode: 'insensitive' } },
        { patient: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }
    const rows = await prisma.mTPRecord.findMany({
      where,
      take: 200,
      orderBy: { procedureAt: 'desc' },
      include: { patient: { select: { id: true, name: true, mrn: true } } },
    });
    // MTP Act confidentiality — log every read of the register, including
    // the specific row IDs that the caller saw.
    for (const r of rows) {
      void writeAudit({
        prisma, req,
        action: 'MTP_READ',
        resource: 'MTPRecord',
        resourceId: r.id,
      });
    }
    res.json(rows);
  } catch (e: any) {
    console.error('list mtp', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/mtp', auth, async (req: AuthedReq, res: Response) => {
  try {
    const b = req.body || {};
    const tenantId = req.user!.tenantId;

    if (!b.patientId) return res.status(400).json({ error: 'patientId is required' });
    if (b.patientAge === undefined) return res.status(400).json({ error: 'patientAge is required' });
    if (!b.husbandOrFatherName) return res.status(400).json({ error: 'husbandOrFatherName is required' });
    if (!b.address) return res.status(400).json({ error: 'address is required' });
    if (b.gestationWeeks === undefined || b.gestationWeeks === null) {
      return res.status(400).json({ error: 'gestationWeeks is required' });
    }
    if (!b.indication) return res.status(400).json({ error: 'indication is required' });
    if (!MTP_ALLOWED_INDICATIONS.includes(b.indication)) {
      return res.status(400).json({ error: `indication must be one of: ${MTP_ALLOWED_INDICATIONS.join('|')}` });
    }
    if (!b.method) return res.status(400).json({ error: 'method is required' });
    if (!MTP_ALLOWED_METHODS.includes(b.method)) {
      return res.status(400).json({ error: `method must be one of: ${MTP_ALLOWED_METHODS.join('|')}` });
    }
    if (!b.primaryDoctorName) return res.status(400).json({ error: 'primaryDoctorName is required' });
    if (!b.primaryDoctorRegNo) return res.status(400).json({ error: 'primaryDoctorRegNo is required' });
    if (!b.procedureAt) return res.status(400).json({ error: 'procedureAt is required' });

    const weeks = Number(b.gestationWeeks);

    // MTP Act 2021: 20-24 weeks requires board concurrence by two
    // registered medical practitioners.
    if (weeks >= 20 && weeks <= 24) {
      if (!b.secondDoctorName || !b.secondDoctorRegNo || b.boardConcurrence !== true) {
        return res.status(400).json({
          error: 'MTP Act: ≥20 weeks requires board concurrence by two registered medical practitioners.',
        });
      }
    }
    // >24 weeks: only substantial foetal abnormality (foetal_anomaly) is
    // legal grounds for termination under the MTP Act 2021.
    if (weeks > 24 && b.indication !== 'foetal_anomaly') {
      return res.status(400).json({
        error: 'MTP Act: termination beyond 24 weeks is permitted only on grounds of substantial foetal abnormality (indication=foetal_anomaly).',
      });
    }

    // Tenant ownership of patient.
    const patient = await prisma.patient.findFirst({
      where: { id: b.patientId, tenantId },
      select: { id: true },
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    // Mint registerNumber: MTP-YYYY-NNNN scoped to tenant + current year.
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
    const yearCount = await prisma.mTPRecord.count({
      where: { tenantId, createdAt: { gte: yearStart, lt: yearEnd } },
    });
    const registerNumber = `MTP-${now.getFullYear()}-${String(yearCount + 1).padStart(4, '0')}`;

    const created = await prisma.mTPRecord.create({
      data: {
        tenantId,
        patientId: patient.id,
        registerNumber,
        patientAge: Number(b.patientAge),
        husbandOrFatherName: b.husbandOrFatherName,
        address: b.address,
        contact: b.contact || null,
        gravida: b.gravida ?? null,
        parity: b.parity ?? null,
        livingChildren: b.livingChildren ?? null,
        lmpDate: b.lmpDate ? new Date(b.lmpDate) : null,
        gestationWeeks: weeks,
        indication: b.indication,
        indicationDetails: b.indicationDetails || null,
        method: b.method,
        primaryDoctorId: req.user!.userId,
        primaryDoctorName: b.primaryDoctorName,
        primaryDoctorRegNo: b.primaryDoctorRegNo,
        secondDoctorName: b.secondDoctorName || null,
        secondDoctorRegNo: b.secondDoctorRegNo || null,
        boardConcurrence: b.boardConcurrence === true,
        procedureAt: new Date(b.procedureAt),
        outcome: b.outcome || null,
        complications: b.complications || null,
        notes: b.notes || null,
      },
    });

    void writeAudit({
      prisma, req,
      action: 'MTP_CREATE',
      resource: 'MTPRecord',
      resourceId: created.id,
      newValue: {
        registerNumber: created.registerNumber,
        gestationWeeks: created.gestationWeeks,
        indication: created.indication,
      },
    });

    res.status(201).json(created);
  } catch (e: any) {
    console.error('create mtp', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.put('/mtp/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.mTPRecord.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    if (!owned) return res.status(404).json({ error: 'MTP record not found' });
    if (owned.signedAt) {
      return res.status(400).json({ error: 'MTP record has been signed and is read-only.' });
    }
    const data: any = { ...req.body };
    delete data.tenantId;
    delete data.id;
    delete data.registerNumber;
    delete data.signedAt;
    delete data.patientId;
    if (data.indication && !MTP_ALLOWED_INDICATIONS.includes(data.indication)) {
      return res.status(400).json({ error: `indication must be one of: ${MTP_ALLOWED_INDICATIONS.join('|')}` });
    }
    if (data.method && !MTP_ALLOWED_METHODS.includes(data.method)) {
      return res.status(400).json({ error: `method must be one of: ${MTP_ALLOWED_METHODS.join('|')}` });
    }
    // Re-validate gestational-age gates on edit so partial updates can't
    // sneak past the legal rule.
    const weeks = data.gestationWeeks !== undefined ? Number(data.gestationWeeks) : owned.gestationWeeks;
    const indication = data.indication ?? owned.indication;
    const secondDoctorName = data.secondDoctorName !== undefined ? data.secondDoctorName : owned.secondDoctorName;
    const secondDoctorRegNo = data.secondDoctorRegNo !== undefined ? data.secondDoctorRegNo : owned.secondDoctorRegNo;
    const boardConcurrence = data.boardConcurrence !== undefined ? data.boardConcurrence === true : owned.boardConcurrence;
    if (weeks >= 20 && weeks <= 24) {
      if (!secondDoctorName || !secondDoctorRegNo || !boardConcurrence) {
        return res.status(400).json({
          error: 'MTP Act: ≥20 weeks requires board concurrence by two registered medical practitioners.',
        });
      }
    }
    if (weeks > 24 && indication !== 'foetal_anomaly') {
      return res.status(400).json({
        error: 'MTP Act: termination beyond 24 weeks is permitted only on grounds of substantial foetal abnormality (indication=foetal_anomaly).',
      });
    }
    if (data.procedureAt) data.procedureAt = new Date(data.procedureAt);
    if (data.lmpDate) data.lmpDate = new Date(data.lmpDate);

    const updated = await prisma.mTPRecord.update({ where: { id: owned.id }, data });
    void writeAudit({
      prisma, req,
      action: 'MTP_UPDATE',
      resource: 'MTPRecord',
      resourceId: updated.id,
      newValue: { gestationWeeks: updated.gestationWeeks, indication: updated.indication },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('update mtp', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/mtp/:id/sign', auth, async (req: AuthedReq, res: Response) => {
  try {
    const owned = await prisma.mTPRecord.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    if (!owned) return res.status(404).json({ error: 'MTP record not found' });
    if (owned.signedAt) return res.status(400).json({ error: 'MTP record already signed' });
    const updated = await prisma.mTPRecord.update({
      where: { id: owned.id },
      data: { signedAt: new Date() },
    });
    void writeAudit({
      prisma, req,
      action: 'MTP_SIGN',
      resource: 'MTPRecord',
      resourceId: updated.id,
      newValue: { signedAt: updated.signedAt },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('sign mtp', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// ---------- ABHA / ABDM (Ayushman Bharat Digital Mission) ----------
// All gateway calls are STUBBED — a real deploy would call the ABDM M3
// gateway here (link request → OTP → verify). We assume verified success
// and record an AbdmLinkEvent so the audit trail looks identical to a
// real link.

const ABHA_REGEX = /^\d{14}$/;

clinicalModulesRouter.post('/patients/:id/abha/link', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const patient = await prisma.patient.findFirst({
      where: { id: req.params.id, tenantId },
      select: { id: true, abhaNumber: true },
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const abhaNumber: string = String(req.body?.abhaNumber || '').replace(/[-\s]/g, '');
    if (!ABHA_REGEX.test(abhaNumber)) {
      return res.status(400).json({ error: 'abhaNumber must be 14 digits' });
    }
    const abhaAddress: string | null = req.body?.abhaAddress ? String(req.body.abhaAddress) : null;

    const updated = await prisma.patient.update({
      where: { id: patient.id },
      data: {
        abhaNumber,
        abhaAddress,
        abhaLinkedAt: new Date(),
      },
      select: { id: true, abhaNumber: true, abhaAddress: true, abhaLinkedAt: true },
    });

    // Stub: real impl would record the ABDM gateway txn id here.
    await prisma.abdmLinkEvent.create({
      data: {
        tenantId,
        patientId: patient.id,
        eventType: 'link_verified',
        status: 'success',
        payload: { abhaAddress, source: 'stub' } as any,
      },
    });

    void writeAudit({
      prisma, req,
      action: 'ABHA_LINK',
      resource: 'Patient',
      resourceId: patient.id,
      oldValue: { abhaNumber: patient.abhaNumber },
      newValue: { abhaNumber: updated.abhaNumber, abhaAddress: updated.abhaAddress },
    });

    res.json(updated);
  } catch (e: any) {
    console.error('abha link', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.delete('/patients/:id/abha', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const patient = await prisma.patient.findFirst({
      where: { id: req.params.id, tenantId },
      select: { id: true, abhaNumber: true, abhaAddress: true },
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const updated = await prisma.patient.update({
      where: { id: patient.id },
      data: { abhaNumber: null, abhaAddress: null, abhaLinkedAt: null },
      select: { id: true, abhaNumber: true, abhaAddress: true, abhaLinkedAt: true },
    });

    await prisma.abdmLinkEvent.create({
      data: {
        tenantId,
        patientId: patient.id,
        eventType: 'link_revoked',
        status: 'success',
        payload: { previousAbhaAddress: patient.abhaAddress } as any,
      },
    });

    void writeAudit({
      prisma, req,
      action: 'ABHA_UNLINK',
      resource: 'Patient',
      resourceId: patient.id,
      oldValue: { abhaNumber: patient.abhaNumber },
    });

    res.json(updated);
  } catch (e: any) {
    console.error('abha unlink', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.get('/patients/:id/abdm-events', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const patient = await prisma.patient.findFirst({
      where: { id: req.params.id, tenantId },
      select: { id: true },
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const events = await prisma.abdmLinkEvent.findMany({
      where: { tenantId, patientId: patient.id },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });
    res.json(events);
  } catch (e: any) {
    console.error('abdm events', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// ---------- PMJAY (Ayushman Bharat) CLAIMS ----------

clinicalModulesRouter.get('/pmjay', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { status, search } = req.query;
    const where: any = { tenantId };
    if (status) where.status = String(status);
    if (search) {
      const s = String(search);
      where.OR = [
        { pmjayId: { contains: s, mode: 'insensitive' } },
        { packageCode: { contains: s, mode: 'insensitive' } },
        { packageName: { contains: s, mode: 'insensitive' } },
        { patient: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }
    const rows = await prisma.pMJAYClaim.findMany({
      where,
      take: 200,
      orderBy: { createdAt: 'desc' },
      include: { patient: { select: { id: true, name: true, mrn: true } } },
    });
    res.json(rows);
  } catch (e: any) {
    console.error('list pmjay', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/pmjay', auth, async (req: AuthedReq, res: Response) => {
  try {
    const b = req.body || {};
    const tenantId = req.user!.tenantId;
    if (!b.patientId) return res.status(400).json({ error: 'patientId is required' });
    if (!b.pmjayId) return res.status(400).json({ error: 'pmjayId is required' });
    if (!b.packageCode) return res.status(400).json({ error: 'packageCode is required' });
    if (!b.packageName) return res.status(400).json({ error: 'packageName is required' });
    if (b.packageAmount === undefined || b.packageAmount === null) {
      return res.status(400).json({ error: 'packageAmount is required' });
    }

    const patient = await prisma.patient.findFirst({
      where: { id: b.patientId, tenantId },
      select: { id: true },
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const created = await prisma.pMJAYClaim.create({
      data: {
        tenantId,
        patientId: patient.id,
        admissionId: b.admissionId || null,
        invoiceId: b.invoiceId || null,
        pmjayId: String(b.pmjayId),
        packageCode: String(b.packageCode),
        packageName: String(b.packageName),
        packageAmount: b.packageAmount,
        status: 'eligibility_pending',
      },
      include: { patient: { select: { id: true, name: true, mrn: true } } },
    });

    void writeAudit({
      prisma, req,
      action: 'PMJAY_CREATE',
      resource: 'PMJAYClaim',
      resourceId: created.id,
      newValue: { pmjayId: created.pmjayId, packageCode: created.packageCode, status: created.status },
    });

    res.status(201).json(created);
  } catch (e: any) {
    console.error('create pmjay', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// Helper: load a tenant-owned PMJAY claim or 404.
async function loadOwnedPMJAY(id: string, tenantId: string) {
  return prisma.pMJAYClaim.findFirst({ where: { id, tenantId } });
}

clinicalModulesRouter.post('/pmjay/:id/request-preauth', auth, async (req: AuthedReq, res: Response) => {
  try {
    const claim = await loadOwnedPMJAY(req.params.id, req.user!.tenantId);
    if (!claim) return res.status(404).json({ error: 'PMJAY claim not found' });
    // STUB: real impl would POST to the TMS pre-auth endpoint.
    const updated = await prisma.pMJAYClaim.update({
      where: { id: claim.id },
      data: {
        status: 'pre_auth_requested',
        preAuthAt: new Date(),
        preAuthNumber: req.body?.preAuthNumber || null,
      },
    });
    void writeAudit({
      prisma, req,
      action: 'PMJAY_PREAUTH_REQUEST',
      resource: 'PMJAYClaim',
      resourceId: updated.id,
      oldValue: { status: claim.status },
      newValue: { status: updated.status },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('pmjay preauth request', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/pmjay/:id/approve-preauth', auth, async (req: AuthedReq, res: Response) => {
  try {
    const claim = await loadOwnedPMJAY(req.params.id, req.user!.tenantId);
    if (!claim) return res.status(404).json({ error: 'PMJAY claim not found' });
    if (!req.body?.preAuthNumber) return res.status(400).json({ error: 'preAuthNumber is required' });
    const updated = await prisma.pMJAYClaim.update({
      where: { id: claim.id },
      data: {
        status: 'pre_auth_approved',
        preAuthNumber: String(req.body.preAuthNumber),
        preAuthApprovedAt: new Date(),
      },
    });
    void writeAudit({
      prisma, req,
      action: 'PMJAY_PREAUTH_APPROVE',
      resource: 'PMJAYClaim',
      resourceId: updated.id,
      oldValue: { status: claim.status },
      newValue: { status: updated.status, preAuthNumber: updated.preAuthNumber },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('pmjay preauth approve', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/pmjay/:id/reject-preauth', auth, async (req: AuthedReq, res: Response) => {
  try {
    const claim = await loadOwnedPMJAY(req.params.id, req.user!.tenantId);
    if (!claim) return res.status(404).json({ error: 'PMJAY claim not found' });
    if (!req.body?.rejectionReason) return res.status(400).json({ error: 'rejectionReason is required' });
    const updated = await prisma.pMJAYClaim.update({
      where: { id: claim.id },
      data: {
        status: 'pre_auth_rejected',
        rejectionReason: String(req.body.rejectionReason),
      },
    });
    void writeAudit({
      prisma, req,
      action: 'PMJAY_PREAUTH_REJECT',
      resource: 'PMJAYClaim',
      resourceId: updated.id,
      oldValue: { status: claim.status },
      newValue: { status: updated.status, rejectionReason: updated.rejectionReason },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('pmjay preauth reject', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/pmjay/:id/submit-claim', auth, async (req: AuthedReq, res: Response) => {
  try {
    const claim = await loadOwnedPMJAY(req.params.id, req.user!.tenantId);
    if (!claim) return res.status(404).json({ error: 'PMJAY claim not found' });
    const updated = await prisma.pMJAYClaim.update({
      where: { id: claim.id },
      data: {
        status: 'claim_submitted',
        claimSubmittedAt: new Date(),
        claimNumber: req.body?.claimNumber || null,
        documents: req.body?.documents ?? claim.documents ?? undefined,
      },
    });
    void writeAudit({
      prisma, req,
      action: 'PMJAY_CLAIM_SUBMIT',
      resource: 'PMJAYClaim',
      resourceId: updated.id,
      oldValue: { status: claim.status },
      newValue: { status: updated.status, claimNumber: updated.claimNumber },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('pmjay claim submit', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/pmjay/:id/approve-claim', auth, async (req: AuthedReq, res: Response) => {
  try {
    const claim = await loadOwnedPMJAY(req.params.id, req.user!.tenantId);
    if (!claim) return res.status(404).json({ error: 'PMJAY claim not found' });
    if (req.body?.amountApproved === undefined || req.body?.amountApproved === null) {
      return res.status(400).json({ error: 'amountApproved is required' });
    }
    const updated = await prisma.pMJAYClaim.update({
      where: { id: claim.id },
      data: {
        status: 'claim_approved',
        amountApproved: req.body.amountApproved,
        claimApprovedAt: new Date(),
      },
    });
    void writeAudit({
      prisma, req,
      action: 'PMJAY_CLAIM_APPROVE',
      resource: 'PMJAYClaim',
      resourceId: updated.id,
      oldValue: { status: claim.status },
      newValue: { status: updated.status, amountApproved: req.body.amountApproved },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('pmjay claim approve', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/pmjay/:id/mark-paid', auth, async (req: AuthedReq, res: Response) => {
  try {
    const claim = await loadOwnedPMJAY(req.params.id, req.user!.tenantId);
    if (!claim) return res.status(404).json({ error: 'PMJAY claim not found' });
    if (req.body?.amountPaid === undefined || req.body?.amountPaid === null) {
      return res.status(400).json({ error: 'amountPaid is required' });
    }
    const paidAt = req.body?.paidAt ? new Date(req.body.paidAt) : new Date();
    const updated = await prisma.pMJAYClaim.update({
      where: { id: claim.id },
      data: {
        status: 'paid',
        amountPaid: req.body.amountPaid,
        paidAt,
      },
    });
    void writeAudit({
      prisma, req,
      action: 'PMJAY_PAID',
      resource: 'PMJAYClaim',
      resourceId: updated.id,
      oldValue: { status: claim.status },
      newValue: { status: updated.status, amountPaid: req.body.amountPaid, paidAt },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('pmjay mark paid', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// ---------- GST / e-INVOICING HELPERS ----------

clinicalModulesRouter.post('/invoices/:id/gst', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    // Invoice has no direct tenantId — scope via patient.
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, patient: { tenantId } },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const b = req.body || {};
    // Pull the hospital GSTIN from tenant.config if present. Tenant.config
    // is JSON; we look for a top-level `gstin` key. Falls back to null.
    let gstinHospital: string | null = null;
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { config: true },
      });
      const cfg = (tenant?.config as any) || {};
      if (cfg && typeof cfg.gstin === 'string' && cfg.gstin.trim()) {
        gstinHospital = cfg.gstin.trim();
      }
    } catch {
      gstinHospital = null;
    }

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        gstinPatient: b.gstinPatient ?? invoice.gstinPatient,
        gstinHospital: gstinHospital ?? invoice.gstinHospital,
        hsnSac: b.hsnSac ?? invoice.hsnSac,
        cgst: b.cgst ?? invoice.cgst,
        sgst: b.sgst ?? invoice.sgst,
        igst: b.igst ?? invoice.igst,
        placeOfSupply: b.placeOfSupply ?? invoice.placeOfSupply,
      },
    });

    void writeAudit({
      prisma, req,
      action: 'INVOICE_GST_PATCH',
      resource: 'Invoice',
      resourceId: updated.id,
      oldValue: {
        gstinPatient: invoice.gstinPatient,
        hsnSac: invoice.hsnSac,
        placeOfSupply: invoice.placeOfSupply,
      },
      newValue: {
        gstinPatient: updated.gstinPatient,
        gstinHospital: updated.gstinHospital,
        hsnSac: updated.hsnSac,
        placeOfSupply: updated.placeOfSupply,
      },
    });

    res.json(updated);
  } catch (e: any) {
    console.error('invoice gst patch', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// STUB: generates a deterministic IRN locally so the e-invoice workflow
// can be exercised without calling the IRP gateway. In production, this
// handler would POST the invoice payload to the IRP / GSP API and stamp
// the returned irn, ack number, ack date, and signed QR code onto the
// invoice row. We mirror the same fields here.
clinicalModulesRouter.post('/invoices/:id/generate-irn', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, patient: { tenantId } },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.irn) {
      return res.status(400).json({ error: 'IRN already generated for this invoice' });
    }

    // Deterministic 64-char hex hash of invoiceId + total + createdAt.
    const totalStr = invoice.total.toString();
    const seed = `${invoice.id}|${totalStr}|${invoice.createdAt.toISOString()}`;
    const irn = createHash('sha256').update(seed).digest('hex'); // 64-char

    // 14-digit numeric ack number (mirrors IRP shape).
    const ackBytes = randomBytes(8);
    let ackNum = 0n;
    for (const byte of ackBytes) ackNum = (ackNum << 8n) | BigInt(byte);
    const irnAckNumber = (ackNum % 100000000000000n).toString().padStart(14, '0');

    const irnAckDate = new Date();
    const qrPayload = `${irn}|${totalStr}|${invoice.gstinHospital || ''}|${invoice.placeOfSupply || ''}`;
    const qrCode = Buffer.from(qrPayload, 'utf8').toString('base64');

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { irn, irnAckNumber, irnAckDate, qrCode },
    });

    void writeAudit({
      prisma, req,
      action: 'INVOICE_IRN_GENERATE',
      resource: 'Invoice',
      resourceId: updated.id,
      newValue: { irn: updated.irn, irnAckNumber: updated.irnAckNumber, irnAckDate: updated.irnAckDate },
    });

    res.json(updated);
  } catch (e: any) {
    console.error('invoice generate irn', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// =============== PHASE 4: SPECIALTY MODULES ===============
// Obstetrics (Pregnancy + ANC + Partograph), NICU (beds + neonatal stays),
// Oncology (chemo protocols + cycles, radiotherapy plans + per-fraction
// delivery log), and Cardiology (cath lab procedures).
//
// Tenant isolation note: Pregnancy, ANCVisit, and PartographEvent have
// no direct tenantId column — they hang off Patient, so every where-
// clause filters via `patient.tenantId` (or the parent pregnancy's
// patient). NICU / chemo / cath / radiotherapy rows carry tenantId
// directly.

// ---------- OBSTETRICS: PREGNANCY + ANC + PARTOGRAPH ----------

clinicalModulesRouter.get('/pregnancies', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { status, patientId } = req.query;
    const where: any = { patient: { tenantId } };
    if (status) where.status = String(status);
    if (patientId) where.patientId = String(patientId);
    const rows = await prisma.pregnancy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { patient: { select: { id: true, name: true, mrn: true } } },
    });
    res.json(rows);
  } catch (e: any) {
    console.error('list pregnancies', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/pregnancies', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const b = req.body || {};
    if (!b.patientId) return res.status(400).json({ error: 'patientId is required' });
    const patient = await prisma.patient.findFirst({ where: { id: b.patientId, tenantId }, select: { id: true } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    // Auto-compute EDD via Naegele's rule (lmp + 280d) when LMP given
    // and EDD omitted.
    const lmpDate = b.lmpDate ? new Date(b.lmpDate) : null;
    let eddDate = b.eddDate ? new Date(b.eddDate) : null;
    if (lmpDate && !eddDate) {
      eddDate = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
    }

    const created = await prisma.pregnancy.create({
      data: {
        patientId: b.patientId,
        lmpDate: lmpDate || undefined,
        eddDate: eddDate || undefined,
        gravida: b.gravida ?? 1,
        parity: b.parity ?? 0,
        abortions: b.abortions ?? 0,
        livingChildren: b.livingChildren ?? 0,
        riskCategory: b.riskCategory || 'low',
        bloodGroup: b.bloodGroup || null,
        rhFactor: b.rhFactor || null,
        status: 'ongoing',
        notes: b.notes || null,
      },
      include: { patient: { select: { id: true, name: true, mrn: true } } },
    });
    void writeAudit({
      prisma, req,
      action: 'PREGNANCY_CREATE',
      resource: 'Pregnancy',
      resourceId: created.id,
      newValue: { patientId: created.patientId, lmpDate: created.lmpDate, eddDate: created.eddDate },
    });
    res.status(201).json(created);
  } catch (e: any) {
    console.error('create pregnancy', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.get('/pregnancies/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const row = await prisma.pregnancy.findFirst({
      where: { id: req.params.id, patient: { tenantId } },
      include: {
        patient: { select: { id: true, name: true, mrn: true } },
        ancVisits: { orderBy: { visitDate: 'asc' } },
        partograph: { orderBy: { recordedAt: 'desc' }, take: 50 },
      },
    });
    if (!row) return res.status(404).json({ error: 'Pregnancy not found' });
    res.json(row);
  } catch (e: any) {
    console.error('get pregnancy', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.put('/pregnancies/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const owned = await prisma.pregnancy.findFirst({
      where: { id: req.params.id, patient: { tenantId } },
    });
    if (!owned) return res.status(404).json({ error: 'Pregnancy not found' });

    const b = req.body || {};
    const data: any = {};
    if (b.lmpDate !== undefined) data.lmpDate = b.lmpDate ? new Date(b.lmpDate) : null;
    if (b.eddDate !== undefined) data.eddDate = b.eddDate ? new Date(b.eddDate) : null;
    if (b.gravida !== undefined) data.gravida = b.gravida;
    if (b.parity !== undefined) data.parity = b.parity;
    if (b.abortions !== undefined) data.abortions = b.abortions;
    if (b.livingChildren !== undefined) data.livingChildren = b.livingChildren;
    if (b.riskCategory !== undefined) data.riskCategory = b.riskCategory;
    if (b.bloodGroup !== undefined) data.bloodGroup = b.bloodGroup;
    if (b.rhFactor !== undefined) data.rhFactor = b.rhFactor;
    if (b.status !== undefined) data.status = b.status;
    if (b.outcomeAt !== undefined) data.outcomeAt = b.outcomeAt ? new Date(b.outcomeAt) : null;
    if (b.notes !== undefined) data.notes = b.notes;

    const updated = await prisma.pregnancy.update({
      where: { id: owned.id },
      data,
      include: { patient: { select: { id: true, name: true, mrn: true } } },
    });
    void writeAudit({
      prisma, req,
      action: 'PREGNANCY_UPDATE',
      resource: 'Pregnancy',
      resourceId: updated.id,
      newValue: data,
    });
    res.json(updated);
  } catch (e: any) {
    console.error('update pregnancy', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

const PREGNANCY_CLOSE_STATUSES = ['delivered', 'aborted', 'terminated', 'lost'];

clinicalModulesRouter.post('/pregnancies/:id/close', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const b = req.body || {};
    if (!b.status || !PREGNANCY_CLOSE_STATUSES.includes(b.status)) {
      return res.status(400).json({ error: `status must be one of: ${PREGNANCY_CLOSE_STATUSES.join('|')}` });
    }
    const owned = await prisma.pregnancy.findFirst({
      where: { id: req.params.id, patient: { tenantId } },
    });
    if (!owned) return res.status(404).json({ error: 'Pregnancy not found' });
    const updated = await prisma.pregnancy.update({
      where: { id: owned.id },
      data: {
        status: b.status,
        outcomeAt: b.outcomeAt ? new Date(b.outcomeAt) : new Date(),
      },
    });
    void writeAudit({
      prisma, req,
      action: 'PREGNANCY_CLOSE',
      resource: 'Pregnancy',
      resourceId: updated.id,
      newValue: { status: updated.status, outcomeAt: updated.outcomeAt },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('close pregnancy', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/pregnancies/:id/anc-visits', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const b = req.body || {};
    if (!b.visitDate) return res.status(400).json({ error: 'visitDate is required' });
    const pregnancy = await prisma.pregnancy.findFirst({
      where: { id: req.params.id, patient: { tenantId } },
      select: { id: true },
    });
    if (!pregnancy) return res.status(404).json({ error: 'Pregnancy not found' });

    // Auto-assign visitNumber if missing.
    let visitNumber = b.visitNumber;
    if (visitNumber === undefined || visitNumber === null) {
      const last = await prisma.aNCVisit.findFirst({
        where: { pregnancyId: pregnancy.id },
        orderBy: { visitNumber: 'desc' },
        select: { visitNumber: true },
      });
      visitNumber = (last?.visitNumber ?? 0) + 1;
    }

    const created = await prisma.aNCVisit.create({
      data: {
        pregnancyId: pregnancy.id,
        visitNumber,
        visitDate: new Date(b.visitDate),
        gestationWeeks: b.gestationWeeks ?? null,
        weightKg: b.weightKg ?? null,
        bpSystolic: b.bpSystolic ?? null,
        bpDiastolic: b.bpDiastolic ?? null,
        fundalHeightCm: b.fundalHeightCm ?? null,
        foetalHeartRate: b.foetalHeartRate ?? null,
        presentation: b.presentation || null,
        urineAlbumin: b.urineAlbumin || null,
        urineSugar: b.urineSugar || null,
        haemoglobin: b.haemoglobin ?? null,
        ifaSupplementGiven: b.ifaSupplementGiven ?? false,
        tdtVaccineGiven: b.tdtVaccineGiven ?? false,
        complaints: b.complaints || null,
        examination: b.examination || null,
        advicePlan: b.advicePlan || null,
        visitedById: req.user!.userId,
      },
    });
    void writeAudit({
      prisma, req,
      action: 'ANC_VISIT_CREATE',
      resource: 'ANCVisit',
      resourceId: created.id,
      newValue: { pregnancyId: created.pregnancyId, visitNumber: created.visitNumber },
    });
    res.status(201).json(created);
  } catch (e: any) {
    console.error('create anc visit', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/pregnancies/:id/partograph', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const b = req.body || {};
    const pregnancy = await prisma.pregnancy.findFirst({
      where: { id: req.params.id, patient: { tenantId } },
      select: { id: true },
    });
    if (!pregnancy) return res.status(404).json({ error: 'Pregnancy not found' });

    const created = await prisma.partographEvent.create({
      data: {
        pregnancyId: pregnancy.id,
        recordedAt: b.recordedAt ? new Date(b.recordedAt) : new Date(),
        cervixDilationCm: b.cervixDilationCm ?? null,
        cervixEffacementPct: b.cervixEffacementPct ?? null,
        foetalHeartRate: b.foetalHeartRate ?? null,
        membraneStatus: b.membraneStatus || null,
        bpSystolic: b.bpSystolic ?? null,
        bpDiastolic: b.bpDiastolic ?? null,
        pulse: b.pulse ?? null,
        tempC: b.tempC ?? null,
        contractions10min: b.contractions10min ?? null,
        contractionIntensity: b.contractionIntensity || null,
        station: b.station ?? null,
        oxytocinUnits: b.oxytocinUnits ?? null,
        ivFluids: b.ivFluids || null,
        notes: b.notes || null,
        recordedById: req.user!.userId,
      },
    });
    void writeAudit({
      prisma, req,
      action: 'PARTOGRAPH_CREATE',
      resource: 'PartographEvent',
      resourceId: created.id,
      newValue: { pregnancyId: created.pregnancyId, recordedAt: created.recordedAt },
    });
    res.status(201).json(created);
  } catch (e: any) {
    console.error('create partograph event', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.get('/pregnancies/:id/partograph', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const pregnancy = await prisma.pregnancy.findFirst({
      where: { id: req.params.id, patient: { tenantId } },
      select: { id: true },
    });
    if (!pregnancy) return res.status(404).json({ error: 'Pregnancy not found' });
    const { from, to } = req.query;
    const where: any = { pregnancyId: pregnancy.id };
    if (from || to) {
      where.recordedAt = {};
      if (from) where.recordedAt.gte = new Date(String(from));
      if (to) where.recordedAt.lte = new Date(String(to));
    }
    const rows = await prisma.partographEvent.findMany({
      where,
      orderBy: { recordedAt: 'asc' },
    });
    res.json(rows);
  } catch (e: any) {
    console.error('list partograph events', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// ---------- NICU: BEDS + STAYS ----------

clinicalModulesRouter.get('/nicu/beds', auth, async (req: AuthedReq, res: Response) => {
  try {
    const rows = await prisma.nICUBed.findMany({
      where: { tenantId: req.user!.tenantId },
      orderBy: { bedNumber: 'asc' },
    });
    res.json(rows);
  } catch (e: any) {
    console.error('list nicu beds', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/nicu/beds', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const b = req.body || {};
    if (!b.bedNumber) return res.status(400).json({ error: 'bedNumber is required' });
    const created = await prisma.nICUBed.create({
      data: {
        tenantId,
        bedNumber: String(b.bedNumber),
        level: b.level || 'L2',
        equipment: Array.isArray(b.equipment) ? b.equipment : [],
        isolationCapable: !!b.isolationCapable,
      },
    });
    void writeAudit({
      prisma, req,
      action: 'NICU_BED_CREATE',
      resource: 'NICUBed',
      resourceId: created.id,
      newValue: { bedNumber: created.bedNumber, level: created.level },
    });
    res.status(201).json(created);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'bedNumber already exists for this tenant' });
    console.error('create nicu bed', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.put('/nicu/beds/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const owned = await prisma.nICUBed.findFirst({ where: { id: req.params.id, tenantId } });
    if (!owned) return res.status(404).json({ error: 'NICU bed not found' });
    const b = req.body || {};
    const data: any = {};
    if (b.bedNumber !== undefined) data.bedNumber = String(b.bedNumber);
    if (b.level !== undefined) data.level = b.level;
    if (b.equipment !== undefined) data.equipment = Array.isArray(b.equipment) ? b.equipment : [];
    if (b.status !== undefined) data.status = b.status;
    if (b.isolationCapable !== undefined) data.isolationCapable = !!b.isolationCapable;
    const updated = await prisma.nICUBed.update({ where: { id: owned.id }, data });
    void writeAudit({
      prisma, req,
      action: 'NICU_BED_UPDATE',
      resource: 'NICUBed',
      resourceId: updated.id,
      newValue: data,
    });
    res.json(updated);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'bedNumber already exists for this tenant' });
    console.error('update nicu bed', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.get('/nicu/stays', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { status, from, to } = req.query;
    const where: any = { tenantId };
    if (status === 'active') where.dischargedAt = null;
    else if (status === 'discharged') where.dischargedAt = { not: null };
    if (from || to) {
      where.admittedAt = where.admittedAt || {};
      if (from) where.admittedAt.gte = new Date(String(from));
      if (to) where.admittedAt.lte = new Date(String(to));
    }
    const rows = await prisma.nICUStay.findMany({
      where,
      orderBy: { admittedAt: 'desc' },
      include: {
        babyPatient: { select: { name: true, mrn: true, dob: true } },
        nicuBed: { select: { bedNumber: true, level: true } },
      },
    });
    res.json(rows);
  } catch (e: any) {
    console.error('list nicu stays', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/nicu/stays', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const b = req.body || {};
    if (!b.babyPatientId) return res.status(400).json({ error: 'babyPatientId is required' });
    if (!b.reason) return res.status(400).json({ error: 'reason is required' });

    const baby = await prisma.patient.findFirst({ where: { id: b.babyPatientId, tenantId }, select: { id: true } });
    if (!baby) return res.status(404).json({ error: 'Baby patient not found' });

    if (b.nicuBedId) {
      const bed = await prisma.nICUBed.findFirst({ where: { id: b.nicuBedId, tenantId } });
      if (!bed) return res.status(404).json({ error: 'NICU bed not found' });
      if (bed.status === 'occupied') return res.status(400).json({ error: 'NICU bed is already occupied' });
    }

    // Atomic create-stay + flip-bed via transaction so we don't leak an
    // orphan "occupied" bed if the stay insert fails.
    const created = await prisma.$transaction(async (tx) => {
      const stay = await tx.nICUStay.create({
        data: {
          tenantId,
          babyPatientId: b.babyPatientId,
          nicuBedId: b.nicuBedId || null,
          reason: b.reason,
          reasonDetails: b.reasonDetails || null,
          birthWeightGrams: b.birthWeightGrams ?? null,
          gestationWeeksAtBirth: b.gestationWeeksAtBirth ?? null,
          apgar1Min: b.apgar1Min ?? null,
          apgar5Min: b.apgar5Min ?? null,
          notes: b.notes || null,
        },
      });
      if (b.nicuBedId) {
        await tx.nICUBed.update({ where: { id: b.nicuBedId }, data: { status: 'occupied' } });
      }
      return stay;
    });

    void writeAudit({
      prisma, req,
      action: 'NICU_STAY_CREATE',
      resource: 'NICUStay',
      resourceId: created.id,
      newValue: { babyPatientId: created.babyPatientId, nicuBedId: created.nicuBedId, reason: created.reason },
    });
    res.status(201).json(created);
  } catch (e: any) {
    console.error('create nicu stay', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

const NICU_OUTCOMES = ['home', 'transferred', 'death', 'lama'];

clinicalModulesRouter.post('/nicu/stays/:id/discharge', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const b = req.body || {};
    if (!b.outcome || !NICU_OUTCOMES.includes(b.outcome)) {
      return res.status(400).json({ error: `outcome must be one of: ${NICU_OUTCOMES.join('|')}` });
    }
    const owned = await prisma.nICUStay.findFirst({ where: { id: req.params.id, tenantId } });
    if (!owned) return res.status(404).json({ error: 'NICU stay not found' });
    if (owned.dischargedAt) return res.status(400).json({ error: 'Stay already discharged' });

    const updated = await prisma.$transaction(async (tx) => {
      const stay = await tx.nICUStay.update({
        where: { id: owned.id },
        data: {
          dischargedAt: new Date(),
          outcome: b.outcome,
          notes: b.notes ?? owned.notes,
        },
      });
      if (owned.nicuBedId) {
        await tx.nICUBed.update({ where: { id: owned.nicuBedId }, data: { status: 'vacant' } });
      }
      return stay;
    });

    void writeAudit({
      prisma, req,
      action: 'NICU_STAY_DISCHARGE',
      resource: 'NICUStay',
      resourceId: updated.id,
      newValue: { outcome: updated.outcome, dischargedAt: updated.dischargedAt },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('discharge nicu stay', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// ---------- ONCOLOGY: CHEMO PROTOCOLS + CYCLES ----------

clinicalModulesRouter.get('/chemo/protocols', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { isActive, indication } = req.query;
    const where: any = { tenantId };
    if (isActive !== undefined) where.isActive = String(isActive) === 'true';
    if (indication) where.indication = String(indication);
    const rows = await prisma.chemoProtocol.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    res.json(rows);
  } catch (e: any) {
    console.error('list chemo protocols', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/chemo/protocols', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ error: 'name is required' });
    if (!b.indication) return res.status(400).json({ error: 'indication is required' });
    if (b.cycleLength === undefined || b.cycleLength === null) return res.status(400).json({ error: 'cycleLength is required' });
    if (b.totalCycles === undefined || b.totalCycles === null) return res.status(400).json({ error: 'totalCycles is required' });
    if (b.drugs === undefined || b.drugs === null) return res.status(400).json({ error: 'drugs is required' });

    const created = await prisma.chemoProtocol.create({
      data: {
        tenantId,
        name: b.name,
        abbreviation: b.abbreviation || null,
        indication: b.indication,
        cycleLength: Number(b.cycleLength),
        totalCycles: Number(b.totalCycles),
        drugs: b.drugs,
        premedications: b.premedications ?? undefined,
        notes: b.notes || null,
        isActive: b.isActive === undefined ? true : !!b.isActive,
      },
    });
    void writeAudit({
      prisma, req,
      action: 'CHEMO_PROTOCOL_CREATE',
      resource: 'ChemoProtocol',
      resourceId: created.id,
      newValue: { name: created.name, indication: created.indication },
    });
    res.status(201).json(created);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'protocol name already exists for this tenant' });
    console.error('create chemo protocol', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.put('/chemo/protocols/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const owned = await prisma.chemoProtocol.findFirst({ where: { id: req.params.id, tenantId } });
    if (!owned) return res.status(404).json({ error: 'Chemo protocol not found' });
    const b = req.body || {};
    const data: any = {};
    if (b.name !== undefined) data.name = b.name;
    if (b.abbreviation !== undefined) data.abbreviation = b.abbreviation;
    if (b.indication !== undefined) data.indication = b.indication;
    if (b.cycleLength !== undefined) data.cycleLength = Number(b.cycleLength);
    if (b.totalCycles !== undefined) data.totalCycles = Number(b.totalCycles);
    if (b.drugs !== undefined) data.drugs = b.drugs;
    if (b.premedications !== undefined) data.premedications = b.premedications;
    if (b.notes !== undefined) data.notes = b.notes;
    if (b.isActive !== undefined) data.isActive = !!b.isActive;

    const updated = await prisma.chemoProtocol.update({ where: { id: owned.id }, data });
    void writeAudit({
      prisma, req,
      action: 'CHEMO_PROTOCOL_UPDATE',
      resource: 'ChemoProtocol',
      resourceId: updated.id,
      newValue: data,
    });
    res.json(updated);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'protocol name already exists for this tenant' });
    console.error('update chemo protocol', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.get('/chemo/cycles', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { patientId, status, from, to } = req.query;
    const where: any = { tenantId };
    if (patientId) where.patientId = String(patientId);
    if (status) where.status = String(status);
    if (from || to) {
      where.scheduledDate = {};
      if (from) where.scheduledDate.gte = new Date(String(from));
      if (to) where.scheduledDate.lte = new Date(String(to));
    }
    const rows = await prisma.chemoCycle.findMany({
      where,
      orderBy: { scheduledDate: 'desc' },
      include: {
        patient: { select: { id: true, name: true, mrn: true } },
        protocol: { select: { id: true, name: true, abbreviation: true, cycleLength: true, totalCycles: true } },
      },
    });
    res.json(rows);
  } catch (e: any) {
    console.error('list chemo cycles', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/chemo/cycles', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const b = req.body || {};
    if (!b.patientId) return res.status(400).json({ error: 'patientId is required' });
    if (!b.protocolId) return res.status(400).json({ error: 'protocolId is required' });
    if (b.cycleNumber === undefined || b.cycleNumber === null) return res.status(400).json({ error: 'cycleNumber is required' });
    if (!b.scheduledDate) return res.status(400).json({ error: 'scheduledDate is required' });

    const patient = await prisma.patient.findFirst({ where: { id: b.patientId, tenantId }, select: { id: true } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const protocol = await prisma.chemoProtocol.findFirst({ where: { id: b.protocolId, tenantId }, select: { id: true } });
    if (!protocol) return res.status(404).json({ error: 'Chemo protocol not found' });

    const created = await prisma.chemoCycle.create({
      data: {
        tenantId,
        patientId: b.patientId,
        protocolId: b.protocolId,
        cycleNumber: Number(b.cycleNumber),
        scheduledDate: new Date(b.scheduledDate),
        bsa: b.bsa ?? null,
        doses: b.doses ?? undefined,
        preLabs: b.preLabs ?? undefined,
        notes: b.notes || null,
      },
    });
    void writeAudit({
      prisma, req,
      action: 'CHEMO_CYCLE_CREATE',
      resource: 'ChemoCycle',
      resourceId: created.id,
      newValue: { patientId: created.patientId, protocolId: created.protocolId, cycleNumber: created.cycleNumber },
    });
    res.status(201).json(created);
  } catch (e: any) {
    console.error('create chemo cycle', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/chemo/cycles/:id/start', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const owned = await prisma.chemoCycle.findFirst({ where: { id: req.params.id, tenantId } });
    if (!owned) return res.status(404).json({ error: 'Chemo cycle not found' });
    const b = req.body || {};
    const data: any = { actualDate: new Date() };
    if (b.preLabs !== undefined) data.preLabs = b.preLabs;
    if (b.bsa !== undefined) data.bsa = b.bsa;
    if (b.doses !== undefined) data.doses = b.doses;
    const updated = await prisma.chemoCycle.update({ where: { id: owned.id }, data });
    void writeAudit({
      prisma, req,
      action: 'CHEMO_CYCLE_START',
      resource: 'ChemoCycle',
      resourceId: updated.id,
      newValue: { actualDate: updated.actualDate },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('start chemo cycle', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/chemo/cycles/:id/complete', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const owned = await prisma.chemoCycle.findFirst({ where: { id: req.params.id, tenantId } });
    if (!owned) return res.status(404).json({ error: 'Chemo cycle not found' });
    const b = req.body || {};
    const data: any = { status: 'completed' };
    if (b.toxicities !== undefined) data.toxicities = b.toxicities;
    if (b.notes !== undefined) data.notes = b.notes;
    const updated = await prisma.chemoCycle.update({ where: { id: owned.id }, data });
    void writeAudit({
      prisma, req,
      action: 'CHEMO_CYCLE_COMPLETE',
      resource: 'ChemoCycle',
      resourceId: updated.id,
      newValue: { status: updated.status },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('complete chemo cycle', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/chemo/cycles/:id/delay', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const owned = await prisma.chemoCycle.findFirst({ where: { id: req.params.id, tenantId } });
    if (!owned) return res.status(404).json({ error: 'Chemo cycle not found' });
    const b = req.body || {};
    if (!b.rescheduledTo) return res.status(400).json({ error: 'rescheduledTo is required' });
    const updated = await prisma.chemoCycle.update({
      where: { id: owned.id },
      data: {
        scheduledDate: new Date(b.rescheduledTo),
        status: 'delayed',
        notes: b.reason ? `${owned.notes ? owned.notes + '\n' : ''}Delayed: ${b.reason}` : owned.notes,
      },
    });
    void writeAudit({
      prisma, req,
      action: 'CHEMO_CYCLE_DELAY',
      resource: 'ChemoCycle',
      resourceId: updated.id,
      newValue: { scheduledDate: updated.scheduledDate, status: updated.status, reason: b.reason },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('delay chemo cycle', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// ---------- CARDIOLOGY: CATH LAB ----------

clinicalModulesRouter.get('/cath', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { status, from, to, patientId } = req.query;
    const where: any = { tenantId };
    if (status) where.outcome = String(status);
    if (patientId) where.patientId = String(patientId);
    if (from || to) {
      where.startAt = {};
      if (from) where.startAt.gte = new Date(String(from));
      if (to) where.startAt.lte = new Date(String(to));
    }
    const rows = await prisma.cathProcedure.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { patient: { select: { id: true, name: true, mrn: true } } },
    });
    res.json(rows);
  } catch (e: any) {
    console.error('list cath procedures', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/cath', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const b = req.body || {};
    if (!b.patientId) return res.status(400).json({ error: 'patientId is required' });
    if (!b.procedureType) return res.status(400).json({ error: 'procedureType is required' });
    const patient = await prisma.patient.findFirst({ where: { id: b.patientId, tenantId }, select: { id: true } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const created = await prisma.cathProcedure.create({
      data: {
        tenantId,
        patientId: b.patientId,
        procedureType: b.procedureType,
        indication: b.indication || null,
        approach: b.approach || null,
        vesselsInvolved: b.vesselsInvolved || null,
        findings: b.findings || null,
        interventionDetails: b.interventionDetails || null,
        implants: b.implants ?? undefined,
        contrastVolumeMl: b.contrastVolumeMl ?? null,
        fluoroscopyMinutes: b.fluoroscopyMinutes ?? null,
        complications: b.complications || null,
        startAt: b.startAt ? new Date(b.startAt) : null,
        endAt: b.endAt ? new Date(b.endAt) : null,
        outcome: b.outcome || null,
        cardiologistId: b.cardiologistId || null,
        scrubNurseId: b.scrubNurseId || null,
        notes: b.notes || null,
      },
    });
    void writeAudit({
      prisma, req,
      action: 'CATH_CREATE',
      resource: 'CathProcedure',
      resourceId: created.id,
      newValue: { patientId: created.patientId, procedureType: created.procedureType },
    });
    res.status(201).json(created);
  } catch (e: any) {
    console.error('create cath procedure', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.put('/cath/:id', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const owned = await prisma.cathProcedure.findFirst({ where: { id: req.params.id, tenantId } });
    if (!owned) return res.status(404).json({ error: 'Cath procedure not found' });
    const b = req.body || {};
    const data: any = {};
    const passthrough = [
      'procedureType', 'indication', 'approach', 'vesselsInvolved', 'findings',
      'interventionDetails', 'implants', 'contrastVolumeMl', 'fluoroscopyMinutes',
      'complications', 'outcome', 'cardiologistId', 'scrubNurseId', 'notes',
    ];
    for (const k of passthrough) if (b[k] !== undefined) data[k] = b[k];
    if (b.startAt !== undefined) data.startAt = b.startAt ? new Date(b.startAt) : null;
    if (b.endAt !== undefined) data.endAt = b.endAt ? new Date(b.endAt) : null;
    const updated = await prisma.cathProcedure.update({ where: { id: owned.id }, data });
    void writeAudit({
      prisma, req,
      action: 'CATH_UPDATE',
      resource: 'CathProcedure',
      resourceId: updated.id,
      newValue: data,
    });
    res.json(updated);
  } catch (e: any) {
    console.error('update cath procedure', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/cath/:id/start', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const owned = await prisma.cathProcedure.findFirst({ where: { id: req.params.id, tenantId } });
    if (!owned) return res.status(404).json({ error: 'Cath procedure not found' });
    const b = req.body || {};
    const startAt = b.startAt ? new Date(b.startAt) : new Date();
    const updated = await prisma.cathProcedure.update({ where: { id: owned.id }, data: { startAt } });
    void writeAudit({
      prisma, req,
      action: 'CATH_START',
      resource: 'CathProcedure',
      resourceId: updated.id,
      newValue: { startAt: updated.startAt },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('start cath procedure', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/cath/:id/complete', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const owned = await prisma.cathProcedure.findFirst({ where: { id: req.params.id, tenantId } });
    if (!owned) return res.status(404).json({ error: 'Cath procedure not found' });
    const b = req.body || {};
    if (!b.outcome) return res.status(400).json({ error: 'outcome is required' });
    const data: any = {
      endAt: b.endAt ? new Date(b.endAt) : new Date(),
      outcome: b.outcome,
    };
    if (b.findings !== undefined) data.findings = b.findings;
    if (b.interventionDetails !== undefined) data.interventionDetails = b.interventionDetails;
    if (b.implants !== undefined) data.implants = b.implants;
    if (b.complications !== undefined) data.complications = b.complications;
    const updated = await prisma.cathProcedure.update({ where: { id: owned.id }, data });
    void writeAudit({
      prisma, req,
      action: 'CATH_COMPLETE',
      resource: 'CathProcedure',
      resourceId: updated.id,
      newValue: { endAt: updated.endAt, outcome: updated.outcome },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('complete cath procedure', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

// ---------- ONCOLOGY: RADIOTHERAPY ----------

clinicalModulesRouter.get('/radiotherapy', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { status, patientId } = req.query;
    const where: any = { tenantId };
    if (status) where.status = String(status);
    if (patientId) where.patientId = String(patientId);
    const rows = await prisma.radiotherapyPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { patient: { select: { id: true, name: true, mrn: true } } },
    });
    res.json(rows);
  } catch (e: any) {
    console.error('list radiotherapy plans', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/radiotherapy', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const b = req.body || {};
    if (!b.patientId) return res.status(400).json({ error: 'patientId is required' });
    if (!b.technique) return res.status(400).json({ error: 'technique is required' });
    if (!b.site) return res.status(400).json({ error: 'site is required' });
    if (!b.intent) return res.status(400).json({ error: 'intent is required' });
    if (b.totalDoseGy === undefined || b.totalDoseGy === null) return res.status(400).json({ error: 'totalDoseGy is required' });
    if (b.fractions === undefined || b.fractions === null) return res.status(400).json({ error: 'fractions is required' });
    if (b.dosePerFractionGy === undefined || b.dosePerFractionGy === null) return res.status(400).json({ error: 'dosePerFractionGy is required' });

    const totalDoseGy = Number(b.totalDoseGy);
    const fractions = Number(b.fractions);
    const dosePerFractionGy = Number(b.dosePerFractionGy);

    // Sanity-check fractions x dose-per-fraction = total dose (±5%).
    const computed = fractions * dosePerFractionGy;
    if (computed === 0 || Math.abs(computed - totalDoseGy) / totalDoseGy > 0.05) {
      return res.status(400).json({
        error: `totalDoseGy (${totalDoseGy}) does not match fractions * dosePerFractionGy (${computed}) within 5% tolerance`,
      });
    }

    const patient = await prisma.patient.findFirst({ where: { id: b.patientId, tenantId }, select: { id: true } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const created = await prisma.radiotherapyPlan.create({
      data: {
        tenantId,
        patientId: b.patientId,
        technique: b.technique,
        site: b.site,
        intent: b.intent,
        totalDoseGy,
        fractions,
        dosePerFractionGy,
        oncologistId: b.oncologistId || null,
        notes: b.notes || null,
      },
    });
    void writeAudit({
      prisma, req,
      action: 'RADIOTHERAPY_CREATE',
      resource: 'RadiotherapyPlan',
      resourceId: created.id,
      newValue: { patientId: created.patientId, technique: created.technique, totalDoseGy: created.totalDoseGy },
    });
    res.status(201).json(created);
  } catch (e: any) {
    console.error('create radiotherapy plan', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/radiotherapy/:id/start', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const owned = await prisma.radiotherapyPlan.findFirst({ where: { id: req.params.id, tenantId } });
    if (!owned) return res.status(404).json({ error: 'Radiotherapy plan not found' });
    const updated = await prisma.radiotherapyPlan.update({
      where: { id: owned.id },
      data: { startedAt: new Date(), status: 'ongoing' },
    });
    void writeAudit({
      prisma, req,
      action: 'RADIOTHERAPY_START',
      resource: 'RadiotherapyPlan',
      resourceId: updated.id,
      newValue: { startedAt: updated.startedAt, status: updated.status },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('start radiotherapy plan', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/radiotherapy/:id/deliver', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const owned = await prisma.radiotherapyPlan.findFirst({ where: { id: req.params.id, tenantId } });
    if (!owned) return res.status(404).json({ error: 'Radiotherapy plan not found' });
    const b = req.body || {};
    if (b.fractionNum === undefined || b.fractionNum === null) return res.status(400).json({ error: 'fractionNum is required' });
    if (b.doseGy === undefined || b.doseGy === null) return res.status(400).json({ error: 'doseGy is required' });

    // Append to deliveredFractions JSON.
    const existing = Array.isArray(owned.deliveredFractions) ? owned.deliveredFractions : [];
    const entry = {
      fractionNum: Number(b.fractionNum),
      deliveredAt: new Date().toISOString(),
      doseGy: Number(b.doseGy),
      machine: b.machine || null,
      notes: b.notes || null,
    };
    const next = [...existing, entry];

    const updated = await prisma.radiotherapyPlan.update({
      where: { id: owned.id },
      data: { deliveredFractions: next as any },
    });
    void writeAudit({
      prisma, req,
      action: 'RADIOTHERAPY_DELIVER',
      resource: 'RadiotherapyPlan',
      resourceId: updated.id,
      newValue: entry,
    });
    res.json(updated);
  } catch (e: any) {
    console.error('deliver radiotherapy fraction', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});

clinicalModulesRouter.post('/radiotherapy/:id/complete', auth, async (req: AuthedReq, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const owned = await prisma.radiotherapyPlan.findFirst({ where: { id: req.params.id, tenantId } });
    if (!owned) return res.status(404).json({ error: 'Radiotherapy plan not found' });
    const updated = await prisma.radiotherapyPlan.update({
      where: { id: owned.id },
      data: { completedAt: new Date(), status: 'completed' },
    });
    void writeAudit({
      prisma, req,
      action: 'RADIOTHERAPY_COMPLETE',
      resource: 'RadiotherapyPlan',
      resourceId: updated.id,
      newValue: { completedAt: updated.completedAt, status: updated.status },
    });
    res.json(updated);
  } catch (e: any) {
    console.error('complete radiotherapy plan', e);
    res.status(500).json({ error: 'Internal server error', detail: e?.message });
  }
});
