import { describe, it, expect } from 'vitest';
import { toArray } from '../utils/list';

describe('toArray()', () => {
  it('returns the same array if given an array', () => {
    const a = [1, 2, 3];
    expect(toArray<number>(a)).toEqual([1, 2, 3]);
  });

  it('unwraps a paginated response', () => {
    expect(toArray<{ id: number }>({ items: [{ id: 1 }] })).toEqual([{ id: 1 }]);
    expect(toArray({ data: ['x'] })).toEqual(['x']);
    expect(toArray({ results: [42] })).toEqual([42]);
  });

  it('falls back to empty array for unrecognized shapes', () => {
    expect(toArray(null)).toEqual([]);
    expect(toArray(undefined)).toEqual([]);
    expect(toArray('not an array')).toEqual([]);
    expect(toArray(123)).toEqual([]);
    expect(toArray({})).toEqual([]);
    expect(toArray({ foo: 'bar' })).toEqual([]);
    expect(toArray({ items: 'not an array either' })).toEqual([]);
  });
});
