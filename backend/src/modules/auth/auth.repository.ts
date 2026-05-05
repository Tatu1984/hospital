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
