/**
 * Pure helpers used by PatientRegistration.tsx.
 * Extracted into a util so they can be unit-tested without spinning up
 * the full page component.
 */

import { ageFromDateString } from './age';

/** Map a backend patient record to the canonical UI shape. */
export interface NormalizedPatient {
  id: string;
  mrn: string;
  name: string;
  dob: string | null;
  age: number;
  gender: string;
  phone: string;
  email: string;
  address: string;
  bloodGroup: string;
  registrationDate: string;
  status: string;
  referralSourceId: string | null;
  referralDoctor: string;
  purpose: string;
}

/**
 * Normalize a raw API patient record into the UI shape.
 * - phone comes from `contact` OR `phone`
 * - age is derived from `dob`
 * - registrationDate is derived from `createdAt`
 * - purpose prefers the new top-level column; falls back to extracting
 *   "Purpose: ..." from the legacy allergies column.
 */
export function normalizePatient(
  raw: Record<string, any>,
  refMap: Record<string, string> = {}
): NormalizedPatient {
  let purpose: string = raw?.purpose || '';
  const allergies: string = raw?.allergies || '';
  if (!purpose) {
    const m = allergies.match(/(?:^|\b)Purpose\s*[:\-]\s*(.+?)(?:\n|$)/i);
    purpose = m ? m[1].trim() : '';
  }

  const dob: string | null = raw?.dob ?? null;
  const age = ageFromDateString(typeof dob === 'string' ? dob : '');
  const refId = raw?.referralSourceId ?? null;

  return {
    id: raw?.id || '',
    mrn: raw?.mrn || '',
    name: raw?.name || '',
    dob,
    age: age ? Number(age) : 0,
    gender: raw?.gender || '',
    phone: raw?.contact || raw?.phone || '',
    email: raw?.email || '',
    address: raw?.address || '',
    bloodGroup: raw?.bloodGroup || '',
    registrationDate: raw?.createdAt
      ? new Date(raw.createdAt).toLocaleDateString()
      : (raw?.registrationDate || ''),
    status: raw?.status || (raw?.isActive === false ? 'Inactive' : 'Active'),
    referralSourceId: refId,
    referralDoctor: refId ? (refMap[refId] || '') : '',
    purpose,
  };
}

/** UI gender label is human-cased ("Male"); backend enum is uppercase. */
export function genderToBackend(displayValue: string): string {
  return (displayValue || '').toUpperCase();
}

/** Inverse: turn a backend enum value into a human-cased label. */
export function genderToDisplay(backendValue: string): string {
  if (!backendValue) return '';
  const v = String(backendValue).toLowerCase();
  return v.charAt(0).toUpperCase() + v.slice(1);
}
