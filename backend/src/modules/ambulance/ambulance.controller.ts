import { Request, Response } from 'express';
import * as service from './ambulance.service';
import { PatientNotFoundError } from './ambulance.service';
import { bookTripSchema } from './ambulance.model';

type AuthedReq = Request & { user?: { userId: string; tenantId: string; patientId?: string } };

export async function bookTrip(req: AuthedReq, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const patientId = req.user!.patientId;
    if (!patientId) return res.status(403).json({ error: 'This account is not linked to a patient profile' });

    const parsed = bookTripSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const trip = await service.bookTrip(tenantId, patientId, parsed.data);
    res.status(201).json(trip);
  } catch (err: any) {
    if (err instanceof PatientNotFoundError) return res.status(404).json({ error: err.message });
    // eslint-disable-next-line no-console
    console.error('bookTrip error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listMyTrips(req: AuthedReq, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const patientId = req.user!.patientId;
    if (!patientId) return res.status(403).json({ error: 'This account is not linked to a patient profile' });

    const trips = await service.listMyTrips(tenantId, patientId);
    res.json({ trips });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('listMyTrips error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
