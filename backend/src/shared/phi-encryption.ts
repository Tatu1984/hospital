// Transparent PHI encryption for Patient demographics. Plugged into the
// shared Prisma client via $extends — every Patient read decrypts the
// listed fields, every Patient write encrypts them.
//
// Fields are split deliberately:
//
//   ENCRYPTED — clearly identifying, never used for SQL search or unique
//   constraints. A DB dump of these columns is unreadable without the
//   PHI_ENCRYPTION_KEY.
//
//   PLAINTEXT (kept) — name, mrn, contact, email, gender, bloodGroup.
//   These need search / display / unique-index support that random-IV
//   encryption breaks. A future iteration will introduce a deterministic-
//   encryption + blind-index column for `name` so we can drop it from this
//   list too.
//
// Storage format: encrypted values get a `phi1:` prefix so reads can tell
// encrypted from plaintext (matters during the backfill window, and keeps
// a sentinel for any future format upgrade to phi2:). Decrypt-or-passthrough
// means a half-encrypted DB never crashes a read.

import { encryptPHI, decryptPHI } from '../middleware/hipaa';
import { logger } from '../utils/logger';

// Note: `dob` would be in this list except its column is a Postgres
// TIMESTAMP, which can't store ciphertext without a column-type migration.
// Phase 2 of this work flips dob to TEXT with a backfill (ISO string ↔
// ciphertext), then adds it here. Until then dob stays plaintext.
export const PATIENT_ENCRYPTED_FIELDS = [
  'address',
  'allergies',
  'emergencyContact',
  'photo',
  'biometricTemplate',
] as const;

const ENCRYPTION_PREFIX = 'phi1:';

export function isEncrypted(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(ENCRYPTION_PREFIX);
}

export function encryptValue(plaintext: unknown): string | null {
  if (plaintext == null) return null;
  const text = String(plaintext);
  if (text.startsWith(ENCRYPTION_PREFIX)) return text; // already encrypted
  return ENCRYPTION_PREFIX + encryptPHI(text);
}

export function decryptValue(stored: unknown): string | null {
  if (stored == null) return null;
  if (typeof stored !== 'string') return stored as any;
  if (!stored.startsWith(ENCRYPTION_PREFIX)) return stored; // legacy plaintext row
  try {
    return decryptPHI(stored.slice(ENCRYPTION_PREFIX.length));
  } catch (err) {
    // A bad ciphertext (wrong key, corruption) is a serious operational
    // condition — surface it loudly but don't crash the whole response.
    // The route still returns the row with the field cleared so the UI
    // doesn't render `phi1:abc...` to a clinician.
    logger.error('PHI decrypt failed', { err });
    return null;
  }
}

// Helper: run an object through the encrypt or decrypt mapper for the
// configured Patient fields. Used by the Prisma extension below and by
// the one-shot backfill script.
export function encryptPatientFields<T extends Record<string, any>>(row: T): T {
  if (!row || typeof row !== 'object') return row;
  const out: any = { ...row };
  for (const f of PATIENT_ENCRYPTED_FIELDS) {
    if (f in out && out[f] != null) out[f] = encryptValue(out[f]);
  }
  return out;
}

export function decryptPatientFields<T extends Record<string, any>>(row: T): T {
  if (!row || typeof row !== 'object') return row;
  const out: any = { ...row };
  for (const f of PATIENT_ENCRYPTED_FIELDS) {
    if (f in out && out[f] != null) out[f] = decryptValue(out[f]);
  }
  return out;
}
