# Clinical Record Retention Policy

## Statement

The hospital ERP retains clinical records — patient demographics, admissions
(IPD), encounters (OPD), dialysis sessions, lab and radiology orders + their
results, prescriptions, OPD/IPD notes, surgeries, invoices, and any other
record linked to a `Patient` row — for **a minimum of ten (10) years from
the date the record was created or last updated, whichever is later**.

This applies to all admission types:

- IPD (in-patient department)
- OPD (out-patient department)
- Dialysis / nephrology
- Emergency / ER
- ICU
- Day-care / day-surgery
- Health check-up packages
- Any future workflow that creates a record linked to a patient

## Scope

Records covered include, but are not limited to:

| Domain               | Tables / Models                                            |
| -------------------- | ---------------------------------------------------------- |
| Patient demographics | `patients`, `patient_insurances`                           |
| Admissions (IPD)     | `admissions`, `ipd_notes`, `beds` allocation history       |
| Encounters (OPD)     | `encounters`, `opd_notes`, `appointments`                  |
| Dialysis             | `dialysis_sessions`                                        |
| Diagnostics          | `orders`, `results` (lab, radiology, pathology)            |
| Prescriptions        | `prescriptions`                                            |
| Surgeries            | `surgeries`, `surgery_stage_events`                        |
| Financials           | `invoices` and related payment/credit-note tables          |
| Mortuary             | `mortuary_records` (kept indefinitely per legal practice)  |

## Default behaviour

There is **no scheduled job that deletes clinical records**. Neon Postgres
holds them on the primary instance; the production backup policy snapshots
the database daily. Retention is therefore satisfied passively.

## Hard-delete guardrail

If a hard-delete code path is ever introduced (for example, an admin "purge"
endpoint, a GDPR right-to-erasure flow, or a tenant off-boarding script), it
**MUST** call `assertRetentionEligible()` from
`backend/src/shared/retention.ts` before deleting any record whose age is
under the retention threshold. The helper throws unless one of:

1. The record is at least 10 years old.
2. The caller passes `{ override: 'admin', reason: '<audit log message>' }`
   AND is acting under an `admin:purge` permission token.

The override path writes an `AuditLog` entry with the reason so the deletion
is traceable.

## Soft-delete preferred

For any "remove" action the operator initiates from the UI (e.g. correcting
a duplicate registration), prefer a soft-delete pattern (a `deletedAt`
timestamp or a `status = 'archived'` flag) over a hard delete. This keeps
the row available for the retention window and audit history while hiding
it from default queries.

## Backups

Database backups inherit the retention policy. Backup snapshots older than
10 years may be expired only after the corresponding row's age has also
exceeded the retention window.

## Review

This policy is reviewed annually by the compliance lead. Changes require
sign-off from medical records, legal, and the engineering owner of the
HMS backend.
