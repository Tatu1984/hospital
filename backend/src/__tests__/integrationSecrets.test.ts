import { describe, it, expect, beforeAll } from 'vitest';

// Env vars must land BEFORE the helpers are loaded — middleware/hipaa
// transitively imports src/config which process.exit(1)s on a missing
// DATABASE_URL or JWT_SECRET. Same pattern other DB-light tests use
// (authAndAdmissions.test.ts, routeCoverage.test.ts).

type SecretsModule = typeof import('../utils/integrationSecrets');
let mod: SecretsModule;

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-chars-or-longer-for-coverage';
  mod = await import('../utils/integrationSecrets');
});

describe('integration credentials encryption', () => {
  it('roundtrips a credentials object', () => {
    const plain = { apiKey: 'sk_live_abc123', region: 'ap-south-1' };
    const stored = mod.encryptCredentials(plain);
    expect(stored).not.toBeNull();
    expect(mod.isEncryptedCredentials(stored)).toBe(true);
    // Ciphertext envelope must not contain the plaintext anywhere.
    expect(JSON.stringify(stored)).not.toContain('sk_live_abc123');
    const round = mod.decryptCredentials(stored);
    expect(round).toEqual(plain);
  });

  it('produces different ciphertext for the same plaintext (random IV)', () => {
    const plain = { apiKey: 'same-value' };
    const a = mod.encryptCredentials(plain);
    const b = mod.encryptCredentials(plain);
    expect(a?.ct).not.toBe(b?.ct);
  });

  it('returns null/empty for null input on encrypt and {} on decrypt', () => {
    expect(mod.encryptCredentials(null)).toBeNull();
    expect(mod.encryptCredentials(undefined)).toBeNull();
    expect(mod.decryptCredentials(null)).toEqual({});
    expect(mod.decryptCredentials(undefined)).toEqual({});
  });

  it('decryptCredentials passes legacy plaintext rows through unchanged', () => {
    // Rows written before this commit are plain JSON objects in the
    // column — must not be treated as ciphertext.
    const legacy = { apiKey: 'old-plaintext', secret: 'still-plain' };
    expect(mod.isEncryptedCredentials(legacy)).toBe(false);
    expect(mod.decryptCredentials(legacy)).toEqual(legacy);
  });

  it('refuses to be confused by an envelope-shaped plaintext object', () => {
    // A legacy row could theoretically have a "__enc" key by coincidence;
    // isEncryptedCredentials requires both __enc and ct to match the
    // exact format string + type.
    const sneaky = { __enc: 'something-else', ct: 'literal' };
    expect(mod.isEncryptedCredentials(sneaky)).toBe(false);
    expect(mod.decryptCredentials(sneaky)).toEqual(sneaky);
  });
});
