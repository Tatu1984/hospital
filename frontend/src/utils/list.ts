/**
 * Normalize an API response into a plain array, regardless of whether the
 * backend returned `[...]`, `{ items: [...] }`, `{ data: [...] }` or
 * `{ results: [...] }`. Anything else (including null/undefined) yields `[]`.
 *
 * Used by every list page so the UI never crashes with
 * `items.filter is not a function`.
 */
export function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items as T[];
    if (Array.isArray(o.data)) return o.data as T[];
    if (Array.isArray(o.results)) return o.results as T[];
  }
  return [];
}
