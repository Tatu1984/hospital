// Auth data-access. Reads/writes the existing User table so a single account
// works on both web and mobile.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

// Resolve the Patient row (if any) linked to this User. Linkage convention:
// the User's email matches a Patient's email within the same tenant. This
// is the path of least resistance for the existing seed data; a future
// migration will add an explicit User.patientId FK.
export async function findLinkedPatient(tenantId: string, userEmail: string | null) {
  if (!userEmail) return null;
  return prisma.patient.findFirst({
    where: { tenantId, email: userEmail },
    select: { id: true },
  });
}
