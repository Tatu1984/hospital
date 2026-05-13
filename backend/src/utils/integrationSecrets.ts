// Column-level encryption for Integration.credentials.
//
// Wire format: { __enc: 'aes-256-gcm:v1', ct: '<encryptPHI output>' }
// We wrap encryptPHI's iv:tag:ct string inside a small envelope so:
//   (1) DB-side anyone reading the column can tell at a glance it's
//       ciphertext, not plaintext config (the legacy format is a flat
//       object of key/value pairs);
//   (2) decryptCredentials can distinguish ciphertext from legacy
//       plaintext rows that pre-date this commit and decrypt only the
//       former (legacy rows are returned as-is — they migrate on the
//       next write).
//
// Choose AES-GCM via the existing helper rather than a separate
// implementation so we have one auditable encryption surface keyed
// by PHI_ENCRYPTION_KEY (the same key the rest of the PHI layer uses).

import { encryptPHI, decryptPHI } from '../middleware/hipaa';

const ENVELOPE_MARK = 'aes-256-gcm:v1';

export type StoredCredentials = { __enc: typeof ENVELOPE_MARK; ct: string };

export function isEncryptedCredentials(value: unknown): value is StoredCredentials {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as any).__enc === ENVELOPE_MARK &&
    typeof (value as any).ct === 'string'
  );
}

// Encrypt a plaintext credentials object for storage. Returns the
// envelope object to be persisted in the JSON column. null/undefined
// input is preserved so callers don't have to special-case it.
export function encryptCredentials(plain: unknown): StoredCredentials | null {
  if (plain == null) return null;
  const json = JSON.stringify(plain);
  return { __enc: ENVELOPE_MARK, ct: encryptPHI(json) };
}

// Decrypt for in-process use. Legacy plaintext rows (objects without
// the envelope) are returned as-is — they'll be re-encrypted on the
// next write so we don't need a one-shot migration script.
export function decryptCredentials(stored: unknown): Record<string, any> {
  if (stored == null) return {};
  if (isEncryptedCredentials(stored)) {
    const json = decryptPHI(stored.ct);
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? parsed : {};
  }
  // Legacy plaintext row.
  return typeof stored === 'object' ? (stored as Record<string, any>) : {};
}
