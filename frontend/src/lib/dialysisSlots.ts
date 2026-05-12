// Mirror of backend/src/shared/dialysisSlots.ts. Keep in sync.
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

export function slotLabel(code: string): string {
  return DIALYSIS_SLOTS.find((s) => s.code === code)?.label || code;
}
