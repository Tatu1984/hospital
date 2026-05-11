// Canonical list of ward / room categories used across the hospital.
// Single source of truth for both validation and the admin dropdown. Keep
// this file in sync with frontend/src/lib/wardCategories.ts — the two are
// duplicated rather than shared because the backend is a separate package
// (no monorepo workspaces wired up yet).
//
// `type` is the discriminator used by Ward.type. The seed defaults below
// are starting points an admin can tweak from Master Data.

export interface WardCategory {
  type: string;          // canonical code stored in Ward.type
  label: string;         // human-readable label shown in UI
  group: 'general' | 'critical' | 'special';
  // Default tariff in INR/day. Admin can override per ward.
  defaultTariff: number;
  // Default seed: how many beds the seed script creates for this category.
  defaultBeds: number;
  // Indicative description for the Master Data dropdown.
  description: string;
}

export const WARD_CATEGORIES: WardCategory[] = [
  { type: 'PVT_CABIN',    label: 'Private Cabin',      group: 'special',  defaultTariff: 4500, defaultBeds: 8,  description: 'Single-occupancy private room with attached bath.' },
  { type: 'SHARE_2',      label: '2-share',            group: 'general',  defaultTariff: 2500, defaultBeds: 12, description: 'Twin-share room.' },
  { type: 'SHARE_3',      label: '3-share',            group: 'general',  defaultTariff: 1800, defaultBeds: 12, description: '3-bed share room.' },
  { type: 'SHARE_4',      label: '4-share',            group: 'general',  defaultTariff: 1200, defaultBeds: 16, description: '4-bed share room.' },
  { type: 'WARD_MEN',     label: "Men's Ward",         group: 'general',  defaultTariff: 800,  defaultBeds: 20, description: 'Open ward for male patients.' },
  { type: 'WARD_WOMEN',   label: "Women's Ward",       group: 'general',  defaultTariff: 800,  defaultBeds: 20, description: 'Open ward for female patients.' },
  { type: 'NURSERY',      label: 'Nursery',            group: 'special',  defaultTariff: 1500, defaultBeds: 10, description: 'Neonatal nursery (well-baby care).' },
  { type: 'ITU',          label: 'ITU',                group: 'critical', defaultTariff: 6000, defaultBeds: 6,  description: 'Intensive Therapy Unit.' },
  { type: 'HDU',          label: 'HDU',                group: 'critical', defaultTariff: 4500, defaultBeds: 8,  description: 'High Dependency Unit (step-down from ICU).' },
  { type: 'ICCU',         label: 'ICCU',               group: 'critical', defaultTariff: 7000, defaultBeds: 6,  description: 'Intensive Cardiac Care Unit.' },
];

export const WARD_CATEGORY_BY_TYPE: Record<string, WardCategory> =
  Object.fromEntries(WARD_CATEGORIES.map((c) => [c.type, c]));

// Convenience: which categories belong on the ICU page vs the IPD page.
// ICCU/ITU/HDU live with ICU (clinical grouping); the rest live on IPD.
export const CRITICAL_CARE_TYPES = WARD_CATEGORIES
  .filter((c) => c.group === 'critical')
  .map((c) => c.type);

export const IPD_WARD_TYPES = WARD_CATEGORIES
  .filter((c) => c.group !== 'critical')
  .map((c) => c.type);

export function isValidWardType(t: string): boolean {
  return t in WARD_CATEGORY_BY_TYPE;
}
