import { Request, Response } from 'express';
import * as service from './doctor.service';
import { NotADoctorError } from './doctor.service';

type AuthedReq = Request & { user?: { userId: string; tenantId: string } };

export async function getMyDashboard(req: AuthedReq, res: Response) {
  try {
    const dto = await service.getMyDashboard(req.user!.userId, req.user!.tenantId);
    res.json(dto);
  } catch (err: any) {
    if (err instanceof NotADoctorError) return res.status(403).json({ error: err.message });
    console.error('doctor dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
