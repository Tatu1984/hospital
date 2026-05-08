// Tenant letterhead cache. The PDF generators run synchronously, so we
// can't do an async fetch at PDF-generation time. Instead the AuthContext
// calls loadLetterhead() once after login, which fetches and caches the
// letterhead data URL in module memory + localStorage. Generators read
// the cached value via getLetterhead() — synchronous, no I/O.
//
// localStorage backup means the letterhead survives a hard reload before
// the AuthContext has refetched.

import api from '../services/api';

const STORAGE_KEY = 'tenant.letterhead';
let cached: string | null = null;

// Initialize from localStorage so the first PDF generated after a hard
// reload (before loadLetterhead has finished) still gets the letterhead.
try {
  cached = localStorage.getItem(STORAGE_KEY);
} catch { /* SSR or sandboxed iframe */ }

export function getLetterhead(): string | null {
  return cached;
}

export function setLetterhead(url: string | null): void {
  cached = url;
  try {
    if (url) localStorage.setItem(STORAGE_KEY, url);
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* storage full / private mode */ }
}

// Fetch from server. Called from AuthContext after login + on hydrate.
// Failures are swallowed — letterhead is best-effort, not critical.
export async function loadLetterhead(): Promise<void> {
  try {
    const r = await api.get('/api/tenant/letterhead');
    setLetterhead(r.data?.letterhead || null);
  } catch {
    // 401/403/network — leave cached value alone
  }
}
