// Clinical-record retention guardrail. See docs/retention-policy.md.
//
// Any code path that hard-deletes a row from a clinical table (patients,
// admissions, encounters, opd_notes, ipd_notes, orders, results,
// prescriptions, dialysis_sessions, surgeries, invoices, …) MUST call
// assertRetentionEligible() with the row's created-or-updated timestamp.
// The helper throws unless the row is at least 10 years old or the
// caller supplies an authenticated admin override.
//
// There is intentionally no scheduled deletion job — clinical records
// are kept passively. This helper exists so that if and when a delete
// path is added later, the retention rule can't quietly be bypassed.

export const RETENTION_YEARS = 10;
export const RETENTION_MS = RETENTION_YEARS * 365.25 * 24 * 60 * 60 * 1000;

export class RetentionPolicyError extends Error {
  code = 'RETENTION_POLICY_VIOLATION';
  constructor(message: string) {
    super(message);
    this.name = 'RetentionPolicyError';
  }
}

export interface RetentionOverride {
  // Only 'admin' is valid today. Kept as a union so a future legal/erasure
  // override can be added without changing call sites that don't use it.
  override: 'admin';
  // Free-text reason recorded in the audit log when the override is used.
  // Required because the audit-log entry is what makes the bypass legally
  // defensible — never silently allow a delete without a reason.
  reason: string;
}

export interface RetentionContext {
  // The created-or-updated timestamp of the record being considered for
  // deletion. Use the LATER of createdAt and updatedAt — the retention
  // window restarts on every clinically-meaningful change.
  recordTimestamp: Date;
  // Optional override block. If present, the function still throws if
  // either field is missing or the reason is blank.
  override?: RetentionOverride;
}

export function assertRetentionEligible(ctx: RetentionContext): void {
  const ageMs = Date.now() - ctx.recordTimestamp.getTime();
  if (ageMs >= RETENTION_MS) return;

  if (ctx.override) {
    if (ctx.override.override !== 'admin') {
      throw new RetentionPolicyError(
        `Unknown retention override: ${String(ctx.override.override)}`,
      );
    }
    if (!ctx.override.reason || !ctx.override.reason.trim()) {
      throw new RetentionPolicyError(
        'Retention override requires a non-empty reason for the audit log.',
      );
    }
    return;
  }

  const years = (ageMs / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1);
  throw new RetentionPolicyError(
    `Record is ${years} years old; retention policy requires ${RETENTION_YEARS}+ years. ` +
      `Pass { override: 'admin', reason: '<audit reason>' } to bypass (admin only).`,
  );
}
