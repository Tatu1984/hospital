import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ageFromDateString } from '../utils/age';

describe('ageFromDateString()', () => {
  // Pin "today" so test results don't drift over time.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty string for missing / invalid input', () => {
    expect(ageFromDateString('')).toBe('');
    expect(ageFromDateString('not a date')).toBe('');
  });

  it('computes whole years from a past DOB', () => {
    expect(ageFromDateString('2000-01-15')).toBe('26');
    expect(ageFromDateString('1990-12-31')).toBe('35');
  });

  it('subtracts a year when the birthday has not happened yet this year', () => {
    // Today is May 1, 2026; DOB is May 2 (birthday tomorrow) → 25 not 26.
    expect(ageFromDateString('2000-05-02')).toBe('25');
    // Same month, same year, day before today → already had birthday → 26.
    expect(ageFromDateString('2000-04-30')).toBe('26');
  });

  it('returns empty for future dates', () => {
    expect(ageFromDateString('2030-01-01')).toBe('');
  });

  it('handles leap day (29 Feb) on a non-leap year', () => {
    expect(ageFromDateString('2000-02-29')).toBe('26');
  });
});
