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

// Migrations recorded as failed in _prisma_migrations. Clear them so
// `migrate deploy` will retry. Idempotent — already-applied or
// already-resolved migrations exit non-zero and we swallow that.
const ROLLED_BACK = [
  '20251231000000_add_prescription_pharmacy_integration',
  '20260502000000_tenant_isolation_audit',
  // Dialysis booking-register migration. Tried + likely partially applied
  // on a prior deploy; force a retry with the now-fully-idempotent SQL.
  '20260512000000_dialysis',
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
// Fail-soft on the deploy call itself: if a brand-new migration is
// broken in some way we haven't seen yet, we'd rather ship the build
// (so the new application code lands) than block the entire deploy
// behind a single SQL error. The application code is designed to
// surface "columns missing — run migrate deploy" as a 503 from the
// affected endpoint instead of crashing.
try {
  execSync(`${PRISMA} migrate deploy`, { stdio: 'inherit' });
} catch (e) {
  console.error('[migrate.js] migrate deploy FAILED — continuing build so app code still ships:');
  console.error(`[migrate.js]   ${e?.message || e}`);
  console.error('[migrate.js] Investigate via Vercel logs and re-deploy after fixing the migration.');
}

// One-shot PHI backfill. Idempotent — re-running on already-encrypted
// rows is a no-op (cheap select-and-skip). Runs after migrate deploy so
// any new columns introduced by the migration are present before we read.
console.log('[migrate.js] Running PHI backfill…');
try {
  execSync(`node ${path.join(__dirname, 'backfill-phi-encryption.js')}`, { stdio: 'inherit' });
} catch (e) {
  // Fail-soft: if backfill crashes (e.g. PHI_ENCRYPTION_KEY missing), the
  // deploy still goes through — better to ship a working build with stale
  // plaintext rows than to block production behind a script error. The
  // logged stderr above tells the operator to retry.
  console.error('[migrate.js] PHI backfill failed; continuing deploy.');
}
