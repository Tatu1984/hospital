/* eslint-disable no-console */
// One-time-heal-then-deploy for Prisma migrations.
//
// The live DB drifted: most historical migration files were applied to the
// schema but never recorded in `_prisma_migrations`. One was recorded as
// failed. `prisma migrate deploy` therefore kept tripping with "table
// already exists" or "previous migration failed" and refusing to apply our
// new ones.
//
// Strategy:
//   1. For every historical migration whose tables exist in the DB, mark it
//      `--applied` (Prisma adds the tracking row without running SQL).
//   2. For the orphan failed migration, mark it `--rolled-back`.
//   3. Run `migrate deploy` — only NEW migrations have any work to do; all
//      the resolve calls are idempotent on subsequent deploys (the `|| true`
//      pattern via try/catch).
//
// After this deploy succeeds once, this script remains a no-op on every
// later build (each `migrate resolve` returns non-zero and we swallow it),
// then `migrate deploy` finds nothing pending unless we add a new migration.

const { execSync } = require('node:child_process');
const path = require('node:path');

const PRISMA = path.join(__dirname, '..', 'node_modules', '.bin', 'prisma');

// Migrations whose SQL has already been applied to the live DB (manually or
// via a prior, lost _prisma_migrations row). Mark each as --applied so
// migrate deploy skips its SQL.
const ALREADY_APPLIED = [
  '20251205083642_init',
  '20251205093844_add_master_data_and_modules',
  '20251206045747_add_broker_accounts_doctor_systems',
  '20251206065445_add_appointments',
  '20251212033828_complete_all_modules',
  '20251217123457_hosptial_erp',
];

// Migrations recorded as failed in _prisma_migrations. Clear them.
const ROLLED_BACK = [
  '20251231000000_add_prescription_pharmacy_integration',
];

function tryRun(args) {
  const cmd = `${PRISMA} ${args}`;
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (e) {
    // Idempotent — if the resolve has already happened or the migration
    // isn't tracked, Prisma exits non-zero. That's fine.
    console.log(`[migrate.js] (ignored) ${args}`);
  }
}

console.log('[migrate.js] Healing migration history…');
for (const m of ALREADY_APPLIED) tryRun(`migrate resolve --applied ${m}`);
for (const m of ROLLED_BACK) tryRun(`migrate resolve --rolled-back ${m}`);

console.log('[migrate.js] Running migrate deploy…');
execSync(`${PRISMA} migrate deploy`, { stdio: 'inherit' });
