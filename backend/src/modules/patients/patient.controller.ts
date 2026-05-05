// Thin Express handlers for the patients module. Parse → validate → call
// service → map domain errors to HTTP. No Prisma, no business rules.

import { Request, Response } from 'express';
import * as service from './patient.service';
import { PatientNotFoundError } from './patient.service';
import { updateMyProfileSchema } from './patient.model';

// Mobile auth attaches the user's tenantId + the patientId they were issued
// against (see auth/auth.service.ts when we add OTP). For the username/
// password phase we resolve patientId via the User row's metadata.
type AuthedReq = Request & {
  user?: {
    userId: string;
    tenantId: string;
    branchId?: string;
    patientId?: string; // present iff this user maps to a patient row
  };
};

export async function getMyHome(req: AuthedReq, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const patientId = req.user!.patientId;
    if (!patientId) return res.status(403).json({ error: 'This account is not linked to a patient profile' });

    const dto = await service.getHome(tenantId, patientId);
    res.json(dto);
  } catch (err: any) {
    if (err instanceof PatientNotFoundError) return res.status(404).json({ error: err.message });
    // eslint-disable-next-line no-console
    console.error('getMyHome error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateMyProfile(req: AuthedReq, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const patientId = req.user!.patientId;
    if (!patientId) return res.status(403).json({ error: 'This account is not linked to a patient profile' });

    const parsed = updateMyProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const dto = await service.updateMyProfile(tenantId, patientId, parsed.data);
    res.json(dto);
  } catch (err: any) {
    if (err instanceof PatientNotFoundError) return res.status(404).json({ error: err.message });
    // eslint-disable-next-line no-console
    console.error('updateMyProfile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
