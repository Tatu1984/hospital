import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { normalizePatient, genderToBackend, genderToDisplay } from '../utils/patient';

describe('normalizePatient()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('maps backend `contact` to `phone` and computes age from dob', () => {
    const out = normalizePatient({
      id: 'p1',
      mrn: 'MRN0001',
      name: 'Ada Lovelace',
      contact: '+91 9999 12 12 12',
      dob: '1990-05-01',
      gender: 'FEMALE',
      createdAt: '2026-01-15T10:00:00Z',
    });
    expect(out.phone).toBe('+91 9999 12 12 12');
    expect(out.age).toBe(36);
    expect(out.name).toBe('Ada Lovelace');
    expect(out.mrn).toBe('MRN0001');
    expect(out.gender).toBe('FEMALE');
    expect(out.registrationDate).not.toBe('');
  });

  it('prefers the first-class purpose column when present', () => {
    const out = normalizePatient({
      purpose: 'Annual checkup',
      allergies: 'Allergies: peanuts',
    });
    expect(out.purpose).toBe('Annual checkup');
  });

  it('falls back to extracting purpose from legacy allergies prefix', () => {
    const out = normalizePatient({
      allergies: 'Purpose: Routine OPD\nAllergies: peanuts',
    });
    expect(out.purpose).toBe('Routine OPD');
  });

  it('returns empty purpose when neither field carries it', () => {
    expect(normalizePatient({ allergies: 'Allergies: peanuts' }).purpose).toBe('');
    expect(normalizePatient({}).purpose).toBe('');
  });

  it('resolves referralDoctor from the supplied refMap', () => {
    const out = normalizePatient(
      { referralSourceId: 'doc-1' },
      { 'doc-1': 'Dr. House' }
    );
    expect(out.referralDoctor).toBe('Dr. House');
    expect(out.referralSourceId).toBe('doc-1');
  });

  it('treats isActive=false as Inactive status', () => {
    expect(normalizePatient({ isActive: false }).status).toBe('Inactive');
    expect(normalizePatient({}).status).toBe('Active');
  });

  it('handles missing dob gracefully (age 0)', () => {
    expect(normalizePatient({}).age).toBe(0);
  });
});

describe('genderToBackend / genderToDisplay', () => {
  it('uppercases on the way out', () => {
    expect(genderToBackend('Male')).toBe('MALE');
    expect(genderToBackend('female')).toBe('FEMALE');
    expect(genderToBackend('')).toBe('');
  });
  it('title-cases on the way back', () => {
    expect(genderToDisplay('MALE')).toBe('Male');
    expect(genderToDisplay('FEMALE')).toBe('Female');
    expect(genderToDisplay('')).toBe('');
  });
});
