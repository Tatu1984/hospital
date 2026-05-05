/* eslint-disable no-console */
// One-shot backfill for PHI encryption on the Patient table.
//
// Why a script and not a SQL migration: encryption uses crypto.scrypt +
// AES-256-GCM via the same code path as runtime, so we need Node + the
// env's PHI_ENCRYPTION_KEY rather than pure SQL.
//
// Idempotent — uses the `phi1:` prefix sentinel introduced by
// shared/phi-encryption.ts to detect "already encrypted" rows. Re-running
// after a partial failure picks up where it left off, and after the first
// full run it becomes a no-op (nothing to encrypt).
//
// Encryption logic is duplicated here (not imported from the .ts source)
// because this script runs from `node scripts/migrate.js` at deploy time,
// before the TS sources are compiled. Keep the format in lockstep with
// src/middleware/hipaa.ts (encryptPHI) and src/shared/phi-encryption.ts
// (PATIENT_ENCRYPTED_FIELDS, ENCRYPTION_PREFIX). If those move, move
// these too.

const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

const PATIENT_ENCRYPTED_FIELDS = [
  'address',
  'allergies',
  'emergencyContact',
  'photo',
  'biometricTemplate',
];
const ENCRYPTION_PREFIX = 'phi1:';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey() {
  const secret = process.env.PHI_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) throw new Error('PHI_ENCRYPTION_KEY (or JWT_SECRET fallback) must be set');
  return crypto.scryptSync(secret, 'phi-salt', KEY_LENGTH);
}

function encryptPHI(plaintext) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(ENCRYPTION_PREFIX);
}

function encryptValue(plaintext) {
  if (plaintext == null) return null;
  const text = String(plaintext);
  if (text.startsWith(ENCRYPTION_PREFIX)) return text;
  return ENCRYPTION_PREFIX + encryptPHI(text);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const total = await prisma.patient.count();
    console.log(`[backfill-phi] ${total} patient row(s) to scan`);

    let scanned = 0;
    let updated = 0;
    let skipped = 0;
    const PAGE = 200;

    for (let cursor; ; ) {
      const rows = await prisma.patient.findMany({
        take: PAGE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
        select: Object.fromEntries(
          ['id', ...PATIENT_ENCRYPTED_FIELDS].map((f) => [f, true]),
        ),
      });
      if (rows.length === 0) break;

      for (const row of rows) {
        scanned++;
        const data = {};
        let dirty = false;
        for (const f of PATIENT_ENCRYPTED_FIELDS) {
          const v = row[f];
          if (v == null) continue;
          if (isEncrypted(v)) continue;
          data[f] = encryptValue(v);
          dirty = true;
        }
        if (dirty) {
          await prisma.patient.updateMany({ where: { id: row.id }, data });
          updated++;
        } else {
          skipped++;
        }
      }

      cursor = rows[rows.length - 1].id;
      if (rows.length < PAGE) break;
    }

    console.log(`[backfill-phi] done — scanned=${scanned} updated=${updated} skipped=${skipped}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[backfill-phi] fatal:', err);
  process.exit(1);
});
