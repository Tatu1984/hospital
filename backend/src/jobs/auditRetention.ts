import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

/**
 * Audit log retention.
 *
 * HIPAA-equivalent practice: keep audit logs long enough that an investigator
 * can reconstruct who did what during an incident, then delete them so we're
 * not storing PHI longer than necessary.
 *
 * - AUDIT_RETENTION_DAYS (default 365): rows older than this are deleted.
 * - AUDIT_RETENTION_BATCH (default 5000): max rows deleted per tick, so a
 *   first run on a populated DB doesn't lock the table.
 * - AUDIT_RETENTION_INTERVAL_MS (default 24h): how often the job runs in-
 *   process. In CI/test the env can disable it (set to 0).
 *
 * Single-instance assumption: in a multi-pod deployment two pods would race.
 * Cheap mitigation here: a Postgres advisory lock so only one pod's tick
 * actually runs the DELETE.
 */

const ADVISORY_LOCK_KEY = 7426; // arbitrary, pick once and don't change

interface RetentionResult {
  ranAt: string;
  deleted: number;
  skipped: boolean;
  reason?: string;
}

export async function runAuditRetention(prisma: PrismaClient): Promise<RetentionResult> {
  const days = parseInt(process.env.AUDIT_RETENTION_DAYS || '365', 10);
  const batch = parseInt(process.env.AUDIT_RETENTION_BATCH || '5000', 10);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // pg_try_advisory_lock returns true if we got the lock, false if another
  // process already holds it. We don't want to wait — just skip this tick.
  const lockRows = await prisma.$queryRawUnsafe<Array<{ acquired: boolean }>>(
    'SELECT pg_try_advisory_lock($1) AS acquired',
    ADVISORY_LOCK_KEY,
  );
  const acquired = !!lockRows?.[0]?.acquired;
  if (!acquired) {
    return { ranAt: new Date().toISOString(), deleted: 0, skipped: true, reason: 'lock-held' };
  }

  try {
    // Cap to `batch` per tick. The next tick picks up the next slice.
    const deleted = await prisma.$executeRawUnsafe(
      `DELETE FROM "audit_logs"
       WHERE id IN (
         SELECT id FROM "audit_logs"
         WHERE "timestamp" < $1
         ORDER BY "timestamp" ASC
         LIMIT $2
       )`,
      cutoff,
      batch,
    );

    if (deleted > 0) {
      logger.info('audit retention sweep', {
        cutoff: cutoff.toISOString(),
        retentionDays: days,
        deleted,
      });
    }

    return { ranAt: new Date().toISOString(), deleted, skipped: false };
  } finally {
    await prisma.$executeRawUnsafe('SELECT pg_advisory_unlock($1)', ADVISORY_LOCK_KEY);
  }
}

/**
 * Wire the retention job to a setInterval. Call once at boot. Returns the
 * timer so callers can stop it (mainly useful in tests).
 *
 * Disable entirely with AUDIT_RETENTION_INTERVAL_MS=0.
 */
export function startAuditRetentionJob(prisma: PrismaClient): NodeJS.Timeout | null {
  const intervalMs = parseInt(process.env.AUDIT_RETENTION_INTERVAL_MS || String(24 * 60 * 60 * 1000), 10);
  if (!intervalMs) {
    logger.info('audit retention job disabled (AUDIT_RETENTION_INTERVAL_MS=0)');
    return null;
  }

  // Stagger the first run by 60s so a fleet of pods doesn't hammer the DB
  // simultaneously on deploy.
  const handle = setInterval(() => {
    runAuditRetention(prisma).catch((e) => {
      logger.error('audit retention job failed', { error: e?.message });
    });
  }, intervalMs);

  setTimeout(() => {
    runAuditRetention(prisma).catch((e) => {
      logger.error('audit retention initial run failed', { error: e?.message });
    });
  }, 60_000);

  logger.info('audit retention job scheduled', {
    intervalMs,
    retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '365', 10),
  });
  return handle;
}
