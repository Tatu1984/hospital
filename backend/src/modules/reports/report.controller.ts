import { Request, Response } from 'express';
import * as service from './report.service';
import { ReportNotFoundError } from './report.service';

type AuthedReq = Request & { user?: { tenantId: string; patientId?: string | null } };

export async function listMine(req: AuthedReq, res: Response) {
  try {
    const patientId = req.user?.patientId;
    if (!patientId) return res.status(403).json({ error: 'No patient profile linked' });
    const items = await service.listMine(patientId);
    res.json(items);
  } catch (err: any) {
    console.error('reports listMine error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getDetail(req: AuthedReq, res: Response) {
  try {
    const patientId = req.user?.patientId;
    if (!patientId) return res.status(403).json({ error: 'No patient profile linked' });
    const { category, id } = req.params;
    const dto = await service.getDetail(patientId, category, id);
    res.json(dto);
  } catch (err: any) {
    if (err instanceof ReportNotFoundError) return res.status(404).json({ error: err.message });
    console.error('reports getDetail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
