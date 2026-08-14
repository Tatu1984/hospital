// Auth data-access. Reads/writes the existing User table so a single account
// works on both web and mobile.

import { prisma } from '../../shared/prisma';

export async function findUserByUsername(username: string) {
  return prisma.user.findFirst({
    where: { username, isActive: true },
  });
}

export async function updateLastLogin(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}

// Resolve the Patient row (if any) linked to this User. Linkage strategy:
//   1. Email match (production behaviour — a User's email == Patient's email)
//   2. Demo fallback: first Patient row in the tenant. So a freshly-seeded
//      admin / staff user can demo the patient-app screens without us
//      having to first create a Patient row whose email matches their
//      User row.
// A future migration will add an explicit User.patientId FK and drop the
// fallback.
// Single-tenant deployment today (see backend/src/seed.ts) — signup has no
// staff session to pull tenantId/branchId from, so it resolves against the
// oldest tenant/branch. Revisit if this ever becomes a multi-tenant signup
// surface (e.g. an invite code or subdomain picking the tenant).
export async function getDefaultTenantAndBranch() {
  const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!tenant) return null;
  const branch = await prisma.branch.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'asc' },
  });
  if (!branch) return null;
  return { tenantId: tenant.id, branchId: branch.id };
}

export async function usernameOrEmailTaken(username: string, email: string) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { id: true },
  });
  return !!existing;
}

// Same MRN scheme as the desktop registration flow (server.ts POST
// /api/patients): MRN + last patient's trailing digits + 1, zero-padded to 6.
async function nextMrn(tx: { patient: { findFirst: typeof prisma.patient.findFirst } }, tenantId: string) {
  const lastPatient = await tx.patient.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
  const lastMrnNum = lastPatient ? parseInt(lastPatient.mrn.replace(/\D/g, ''), 10) || 0 : 0;
  return `MRN${(lastMrnNum + 1).toString().padStart(6, '0')}`;
}

export interface CreatePatientAccountInput {
  username: string;
  passwordHash: string;
  name: string;
  email: string;
  contact: string;
  dob?: string | null;
  gender?: string | null;
  address?: string | null;
  bloodGroup?: string | null;
  allergies?: string | null;
  emergencyContact?: string | null;
}

// Creates the User (login credentials) and Patient (clinical record) rows
// together so findLinkedPatient's email match resolves on first login —
// they must share the same tenantId + email or the account would come up
// patient-less.
export async function createPatientAccount(input: CreatePatientAccountInput) {
  const tenantBranch = await getDefaultTenantAndBranch();
  if (!tenantBranch) throw new Error('No tenant configured for signup');
  const { tenantId, branchId } = tenantBranch;

  return prisma.$transaction(async (tx) => {
    const mrn = await nextMrn(tx, tenantId);

    const patient = await tx.patient.create({
      data: {
        tenantId,
        branchId,
        mrn,
        name: input.name,
        dob: input.dob ? new Date(input.dob) : null,
        gender: input.gender,
        contact: input.contact,
        email: input.email,
        address: input.address,
        bloodGroup: input.bloodGroup,
        allergies: input.allergies,
        emergencyContact: input.emergencyContact,
        purpose: 'Self-registered via patient app',
      },
    });

    const user = await tx.user.create({
      data: {
        tenantId,
        branchId,
        username: input.username,
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name,
        phone: input.contact,
        roleIds: [],
        isActive: true,
      },
    });

    return { user, patient };
  });
}

export async function findLinkedPatient(tenantId: string, userEmail: string | null) {
  if (userEmail) {
    const byEmail = await prisma.patient.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    });
    if (byEmail) return byEmail;
  }
  return prisma.patient.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
}
