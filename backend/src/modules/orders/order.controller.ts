import { Request, Response } from 'express';
import * as service from './order.service';
import { OrderNotFoundError, CrossTenantError } from './order.service';
import { submitResultSchema } from './order.model';

type AuthedReq = Request & { user?: { userId: string; tenantId: string } };

export async function listForPatient(req: AuthedReq, res: Response) {
  try {
    const { patientId } = req.params;
    if (!patientId) return res.status(400).json({ error: 'patientId is required' });
    const items = await service.listForPatient(patientId);
    res.json(items);
  } catch (err: any) {
    console.error('orders listForPatient error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getOne(req: AuthedReq, res: Response) {
  try {
    const dto = await service.getOne(req.params.id, req.user!.tenantId);
    res.json(dto);
  } catch (err: any) {
    if (err instanceof OrderNotFoundError) return res.status(404).json({ error: err.message });
    if (err instanceof CrossTenantError) return res.status(403).json({ error: err.message });
    console.error('orders getOne error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function submitResult(req: AuthedReq, res: Response) {
  try {
    const parsed = submitResultSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const result = await service.submitResult(
      req.params.id,
      req.user!.tenantId,
      req.user!.userId,
      parsed.data,
    );
    res.status(201).json(result);
  } catch (err: any) {
    if (err instanceof OrderNotFoundError) return res.status(404).json({ error: err.message });
    if (err instanceof CrossTenantError) return res.status(403).json({ error: err.message });
    console.error('orders submitResult error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
