/**
 * One-off: create a second full-admin account.
 *
 *   username: admin2
 *   password: 12345678
 *   role:     ADMIN (all permissions)
 *
 * Idempotent — re-running updates the password / role of the existing
 * admin2 rather than erroring. Tenant + branch are copied from the
 * existing `admin` user so this works against any environment without
 * hard-coding seed IDs.
 *
 * Run:  cd backend && npx tsx scripts/create-admin2.ts
 *
 * Access: full ADMIN role, EXCEPT the "Admin & Reports" section is
 * view-only — enforced by the readOnlyGuard middleware via the
 * profile.readOnlyModules = ['admin-reports'] flag set below. admin2 can
 * see everything in that section (reports, audit log, activity monitor,
 * master data, quality, registers) but cannot create / edit / delete there.
 *
 * NOTE: this account is monitored exactly like every other user via the
 * built-in Activity Monitor (page views + time-per-page + audit trail).
 * Nothing extra is needed to track it.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const USERNAME = 'admin2';
const PASSWORD = '12345678';
const EMAIL = 'admin2@hospital.com';
const NAME = 'Secondary Administrator';
// Sections this account may VIEW but not modify. Enforced by readOnlyGuard.
const READ_ONLY_MODULES = ['admin-reports'];

async function main() {
  // Anchor tenant/branch to the existing admin so the new account lives
  // in the same tenant and can see the same data.
  const base = await prisma.user.findFirst({
    where: { username: 'admin' },
    select: { tenantId: true, branchId: true, departmentIds: true },
  });
  if (!base) {
    throw new Error("No existing 'admin' user found to copy tenant/branch from. Run the seed first.");
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { username: USERNAME },
    update: {
      passwordHash,
      roleIds: ['ADMIN'],
      isActive: true,
      profile: { readOnlyModules: READ_ONLY_MODULES },
    },
    create: {
      username: USERNAME,
      email: EMAIL,
      name: NAME,
      passwordHash,
      tenantId: base.tenantId,
      branchId: base.branchId,
      roleIds: ['ADMIN'],
      departmentIds: base.departmentIds ?? [],
      isActive: true,
      profile: { readOnlyModules: READ_ONLY_MODULES },
    },
    select: { id: true, username: true, email: true, roleIds: true, tenantId: true, isActive: true, profile: true },
  });

  console.log('✅ Admin account ready:', user);
  console.log(`   login -> username: ${USERNAME}  password: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('❌ Failed to create admin2:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
