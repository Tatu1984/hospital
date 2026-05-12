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
