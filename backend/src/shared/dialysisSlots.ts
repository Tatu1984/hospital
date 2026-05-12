// Fixed-window dialysis slots. Encoded as enum-like strings so the DB
// stores a stable identifier independent of clock/timezone math. Each
// slot is 4 hours; the centre runs 4 slots per day from 08:00 to 24:00.
export interface DialysisSlot {
  code: 'SLOT_1' | 'SLOT_2' | 'SLOT_3' | 'SLOT_4';
  label: string;
  startHour: number;
  endHour: number;
}

export const DIALYSIS_SLOTS: DialysisSlot[] = [
  { code: 'SLOT_1', label: '08:00 – 12:00', startHour: 8,  endHour: 12 },
  { code: 'SLOT_2', label: '12:00 – 16:00', startHour: 12, endHour: 16 },
  { code: 'SLOT_3', label: '16:00 – 20:00', startHour: 16, endHour: 20 },
  { code: 'SLOT_4', label: '20:00 – 24:00', startHour: 20, endHour: 24 },
];

export const DIALYSIS_SLOT_CODES = DIALYSIS_SLOTS.map((s) => s.code);

export function isValidSlot(s: string): boolean {
  return (DIALYSIS_SLOT_CODES as string[]).includes(s);
}

// Recommended ratio: 1.5 machines per bed (i.e. 50% spare capacity)
// so a single failed machine never cascades into a cancelled slot.
export const DIALYSIS_MACHINE_TO_BED_RATIO = 1.5;
