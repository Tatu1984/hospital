import { Request, Response } from 'express';
import * as service from './appointment.service';
import { AppointmentNotFoundError, DoctorNotFoundError, SlotTakenError } from './appointment.service';
import { bookAppointmentSchema, cancelAppointmentSchema } from './appointment.model';

type AuthedReq = Request & {
  user?: { userId: string; tenantId: string; branchId?: string; patientId?: string; isDoctor?: boolean };
};

function mapDomainError(err: any, res: Response): boolean {
  if (err instanceof AppointmentNotFoundError) { res.status(404).json({ error: err.message }); return true; }
  if (err instanceof DoctorNotFoundError) { res.status(404).json({ error: err.message }); return true; }
  if (err instanceof SlotTakenError) { res.status(409).json({ error: err.message }); return true; }
  return false;
}

export async function listMine(req: AuthedReq, res: Response) {
  try {
    const patientId = req.user!.patientId;
    if (!patientId) return res.status(403).json({ error: 'Not linked to a patient profile' });
    const dto = await service.listMine(req.user!.tenantId, patientId);
    res.json(dto);
  } catch (err: any) {
    if (mapDomainError(err, res)) return;
    console.error('listMine appointments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Doctor-side. Requires the user to be a doctor; returns the day's list.
export async function listToday(req: AuthedReq, res: Response) {
  try {
    if (!req.user!.isDoctor) return res.status(403).json({ error: 'Doctor account required' });
    const dto = await service.listToday(req.user!.tenantId, req.user!.userId);
    res.json(dto);
  } catch (err: any) {
    console.error('listToday appointments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listDoctors(req: AuthedReq, res: Response) {
  try {
    const list = await service.listDoctors(req.user!.tenantId);
    res.json(list);
  } catch (err: any) {
    console.error('listDoctors error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/mobile/v1/appointments/slots?doctorId=...&date=YYYY-MM-DD
export async function getDoctorSlots(req: AuthedReq, res: Response) {
  try {
    const doctorId = String(req.query.doctorId || '');
    const date = String(req.query.date || '');
    if (!doctorId || !date) return res.status(400).json({ error: 'doctorId and date are required' });
    const dto = await service.getDoctorSlots(req.user!.tenantId, doctorId, date);
    res.json(dto);
  } catch (err: any) {
    if (mapDomainError(err, res)) return;
    console.error('getDoctorSlots error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function book(req: AuthedReq, res: Response) {
  try {
    const patientId = req.user!.patientId;
    if (!patientId) return res.status(403).json({ error: 'Not linked to a patient profile' });
    const parsed = bookAppointmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    const dto = await service.book(req.user!.tenantId, patientId, req.user!.userId, parsed.data);
    res.status(201).json(dto);
  } catch (err: any) {
    if (mapDomainError(err, res)) return;
    console.error('book appointment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function cancel(req: AuthedReq, res: Response) {
  try {
    const parsed = cancelAppointmentSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
    const dto = await service.cancel(req.user!.tenantId, req.params.id, parsed.data.reason || null);
    res.json(dto);
  } catch (err: any) {
    if (mapDomainError(err, res)) return;
    console.error('cancel appointment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
