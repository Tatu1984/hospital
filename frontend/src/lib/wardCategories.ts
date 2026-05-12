// Canonical ward / room categories. Mirrors backend/src/shared/wardCategories.ts.
// Kept in two files because the frontend and backend aren't yet wired up
// as workspaces. Keep them in sync — drift here vs there will show up as
// wards being rejected by the backend Zod validator.

export interface WardCategory {
  type: string;
  label: string;
  group: 'general' | 'critical' | 'special';
  defaultTariff: number;
  defaultBeds: number;
  description: string;
}

export const WARD_CATEGORIES: WardCategory[] = [
  { type: 'PVT_CABIN',    label: 'Private Cabin',      group: 'special',  defaultTariff: 4500, defaultBeds: 8,  description: 'Single-occupancy private room with attached bath.' },
  { type: 'SHARE_2',      label: '2-share',            group: 'general',  defaultTariff: 2500, defaultBeds: 12, description: 'Twin-share room.' },
  { type: 'SHARE_3',      label: '3-share',            group: 'general',  defaultTariff: 1800, defaultBeds: 12, description: '3-bed share room.' },
  { type: 'SHARE_4',      label: 'General Ward',       group: 'general',  defaultTariff: 1200, defaultBeds: 16, description: 'General ward — open 4-bed share room.' },
  { type: 'WARD_MEN',     label: "Men's Ward",         group: 'general',  defaultTariff: 800,  defaultBeds: 20, description: 'Open ward for male patients.' },
  { type: 'WARD_WOMEN',   label: "Women's Ward",       group: 'general',  defaultTariff: 800,  defaultBeds: 20, description: 'Open ward for female patients.' },
  { type: 'NURSERY',      label: 'Nursery',            group: 'special',  defaultTariff: 1500, defaultBeds: 10, description: 'Neonatal nursery (well-baby care).' },
  { type: 'DIALYSIS',     label: 'Dialysis',           group: 'special',  defaultTariff: 2000, defaultBeds: 10, description: 'Dialysis chairs — bookable by 4-hour slot.' },
  { type: 'ICU',          label: 'ICU',                group: 'critical', defaultTariff: 8000, defaultBeds: 8,  description: 'General Intensive Care Unit.' },
  { type: 'ITU',          label: 'ITU',                group: 'critical', defaultTariff: 6000, defaultBeds: 6,  description: 'Intensive Therapy Unit.' },
  { type: 'HDU',          label: 'HDU',                group: 'critical', defaultTariff: 4500, defaultBeds: 8,  description: 'High Dependency Unit (step-down from ICU).' },
  { type: 'ICCU',         label: 'ICCU',               group: 'critical', defaultTariff: 7000, defaultBeds: 6,  description: 'Intensive Cardiac Care Unit.' },
];

export const WARD_CATEGORY_BY_TYPE: Record<string, WardCategory> =
  Object.fromEntries(WARD_CATEGORIES.map((c) => [c.type, c]));

export const CRITICAL_CARE_TYPES = WARD_CATEGORIES
  .filter((c) => c.group === 'critical')
  .map((c) => c.type);

export const IPD_WARD_TYPES = WARD_CATEGORIES
  .filter((c) => c.group !== 'critical')
  .map((c) => c.type);

export function labelFor(type: string | null | undefined): string {
  if (!type) return 'Uncategorized';
  return WARD_CATEGORY_BY_TYPE[type]?.label || type;
}
