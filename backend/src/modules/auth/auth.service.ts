// Mobile auth business logic. Reuses the same JWT secret + RBAC permission
// resolver as the desktop portal so a single user can move between web and
// mobile. The only thing that's different is the response shape: mobile
// clients want the refresh token in the JSON body (no cookies in RN).

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as repo from './auth.repository';
import { getUserPermissions } from '../../rbac';
import { MobileLoginInput, MobileLoginResponse, SignupInput } from './auth.model';
import {
  checkAccountLockout,
  recordFailedLogin,
  clearFailedLogins,
} from '../../shared/auth-security';

export class InvalidCredentialsError extends Error {
  constructor() { super('Invalid username or password'); }
}
export class AccountLockedError extends Error {
  unlockAt?: Date;
  constructor(unlockAt?: Date) {
    super(unlockAt
      ? `Account temporarily locked. Try again at ${unlockAt.toISOString()}.`
      : 'Account temporarily locked.');
    this.unlockAt = unlockAt;
  }
}
export class UsernameOrEmailTakenError extends Error {
  constructor() { super('That username or email is already registered'); }
}

const DOCTOR_ROLE_IDS = new Set(['DOCTOR', 'CONSULTANT', 'SURGEON']);

// Shared by login and signup — mints the same access/refresh token pair and
// response shape for a given User row + its (possibly just-created) linked
// Patient row.
function issueTokens(
  user: { id: string; username: string; tenantId: string; branchId: string; roleIds: string[]; extraPermissions?: string[] | null; revokedPermissions?: string[] | null; name: string; email: string },
  linkedPatient: { id: string } | null,
): MobileLoginResponse {
  const accessTokenPayload = {
    userId: user.id,
    username: user.username,
    tenantId: user.tenantId,
    branchId: user.branchId,
    roleIds: user.roleIds,
    extraPermissions: user.extraPermissions || [],
    revokedPermissions: user.revokedPermissions || [],
    patientId: linkedPatient?.id || null,
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

export async function signup(input: SignupInput): Promise<MobileLoginResponse> {
  const taken = await repo.usernameOrEmailTaken(input.username, input.email);
  if (taken) throw new UsernameOrEmailTakenError();

  const passwordHash = await bcrypt.hash(input.password, 10);
  const { user, patient } = await repo.createPatientAccount({
    username: input.username,
    passwordHash,
    name: input.name,
    email: input.email,
    contact: input.contact,
    dob: input.dob,
    gender: input.gender,
    address: input.address,
    bloodGroup: input.bloodGroup,
    allergies: input.allergies,
    emergencyContact: input.emergencyContact,
  });

  return issueTokens(user, patient);
}

export async function loginWithPassword(input: MobileLoginInput): Promise<MobileLoginResponse> {
  const user = await repo.findUserByUsername(input.username);
  if (!user) throw new InvalidCredentialsError();

  const lock = await checkAccountLockout(user.id);
  if (lock.locked) throw new AccountLockedError(lock.unlockAt);

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    await recordFailedLogin(user.id);
    throw new InvalidCredentialsError();
  }
  await clearFailedLogins(user.id);

  // Resolve linked Patient row, if any. Doctors won't have one; patient-app
  // users will. Used by patient.controller.ts to decide which Patient to
  // load on /me.
  const linkedPatient = await repo.findLinkedPatient(user.tenantId, user.email);

  // lastLoginAt is already stamped inside clearFailedLogins above.

  return issueTokens(user, linkedPatient);
}
