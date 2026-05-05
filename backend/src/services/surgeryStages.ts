// Canonical surgery stages. Both backend (validation, fan-out templates) and
// frontend (stepper UI, family tracker labels) import from here so the list
// stays in lockstep.
//
// Order matters — index drives stepper position. New stages should be added
// in their logical chronological slot rather than appended.

export interface SurgeryStage {
  code: string;       // stored verbatim in DB; do not rename without a migration
  label: string;      // staff-facing label
  familyLabel: string; // softer wording for SMS/WhatsApp + family tracker page
  terminal?: boolean; // stages that imply the surgery is over
}

export const SURGERY_STAGES: SurgeryStage[] = [
  { code: 'SCHEDULED',           label: 'Scheduled',             familyLabel: 'Surgery is scheduled' },
  { code: 'PATIENT_RECEIVED',    label: 'Patient received',      familyLabel: 'Patient has been received in pre-op' },
  { code: 'IN_OT',               label: 'In OT',                 familyLabel: 'Patient has entered the operating room' },
  { code: 'ANESTHESIA_STARTED',  label: 'Anaesthesia started',   familyLabel: 'Anaesthesia is being administered' },
  { code: 'ANESTHESIA_DONE',     label: 'Anaesthesia complete',  familyLabel: 'Anaesthesia is complete; surgery will begin shortly' },
  { code: 'SURGERY_STARTED',     label: 'Surgery started',       familyLabel: 'Surgery has started' },
  { code: 'SURGERY_IN_PROGRESS', label: 'Surgery in progress',   familyLabel: 'Surgery is in progress' },
  { code: 'CLOSING',             label: 'Closing',               familyLabel: 'Surgery is wrapping up' },
  { code: 'SURGERY_COMPLETED',   label: 'Surgery complete',      familyLabel: 'Surgery is complete' },
  { code: 'IN_RECOVERY',         label: 'In recovery',           familyLabel: 'Patient is in the recovery room' },
  { code: 'SHIFTED_TO_WARD',     label: 'Shifted to ward',       familyLabel: 'Patient has been shifted to the ward', terminal: true },
  { code: 'SHIFTED_TO_ICU',      label: 'Shifted to ICU',        familyLabel: 'Patient has been shifted to the ICU', terminal: true },
  { code: 'CANCELLED',           label: 'Cancelled',             familyLabel: 'Surgery has been cancelled', terminal: true },
];

export const SURGERY_STAGE_CODES: ReadonlySet<string> = new Set(
  SURGERY_STAGES.map((s) => s.code),
);

export function getStage(code: string): SurgeryStage | undefined {
  return SURGERY_STAGES.find((s) => s.code === code);
}

export function isValidStage(code: string): boolean {
  return SURGERY_STAGE_CODES.has(code);
}

// Maps the legacy coarse `Surgery.status` field onto the new stage system, so
// surgeries that pre-date this feature still render sensibly on the family
// tracker page (which keys off currentStage with this fallback).
export function legacyStatusToStage(status: string): string {
  const map: Record<string, string> = {
    scheduled:    'SCHEDULED',
    in_progress:  'SURGERY_IN_PROGRESS',
    completed:    'SURGERY_COMPLETED',
    cancelled:    'CANCELLED',
    postponed:    'SCHEDULED',
  };
  return map[status] || 'SCHEDULED';
}
