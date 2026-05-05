// Mobile auth business logic. Reuses the same JWT secret + RBAC permission
// resolver as the desktop portal so a single user can move between web and
// mobile. The only thing that's different is the response shape: mobile
// clients want the refresh token in the JSON body (no cookies in RN).

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as repo from './auth.repository';
import { getUserPermissions } from '../../rbac';
import { MobileLoginInput, MobileLoginResponse } from './auth.model';

export class InvalidCredentialsError extends Error {
  constructor() { super('Invalid username or password'); }
}

const DOCTOR_ROLE_IDS = new Set(['DOCTOR', 'CONSULTANT', 'SURGEON']);

export async function loginWithPassword(input: MobileLoginInput): Promise<MobileLoginResponse> {
  const user = await repo.findUserByUsername(input.username);
  if (!user) throw new InvalidCredentialsError();

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw new InvalidCredentialsError();

  // Resolve linked Patient row, if any. Doctors won't have one; patient-app
  // users will. Used by patient.controller.ts to decide which Patient to
  // load on /me.
  const linkedPatient = await repo.findLinkedPatient(user.tenantId, user.email);

  const accessTokenPayload = {
    userId: user.id,
    username: user.username,
    tenantId: user.tenantId,
    branchId: user.branchId,
    roleIds: user.roleIds,
    patientId: linkedPatient?.id || null,
    // Mobile flag so the auth middleware can branch its rate-limit / refresh
    // policy if we add per-platform tuning later. Harmless if unused.
    plat: 'mobile' as const,
  };
  const token = jwt.sign(
    accessTokenPayload,
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' } as jwt.SignOptions,
  );
  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh', plat: 'mobile' },
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d' } as jwt.SignOptions,
  );

  await repo.updateLastLogin(user.id);

  const isDoctor = user.roleIds.some((r) => DOCTOR_ROLE_IDS.has(r));
  const isPatient = !!linkedPatient;

  return {
    token,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      roleIds: user.roleIds,
      permissions: getUserPermissions(user.roleIds),
      tenantId: user.tenantId,
      branchId: user.branchId,
      patientId: linkedPatient?.id || null,
      isDoctor,
      isPatient,
    },
  };
}
