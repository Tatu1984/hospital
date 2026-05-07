// Drop-in replacement for React.lazy that auto-recovers from stale-chunk
// failures.
//
// Symptom this fixes:
// User has the SPA loaded. A new build is deployed to Vercel —
// content-hashed chunk filenames change. User clicks a route whose
// chunk hasn't been fetched yet → browser tries to load a chunk that
// no longer exists on the CDN → "Failed to fetch dynamically imported
// module" → ErrorBoundary trips → "Something went wrong".
//
// Reload fixes it because the fresh index.html references the new
// chunk filenames. We automate that single reload here.
//
// Loop guard: if we've reloaded within the last 30 seconds, don't
// reload again — something else is wrong (network down, real bug,
// genuinely missing file). Throw so ErrorBoundary takes over and
// shows the user a "Reload page" button.

import { ComponentType, lazy, LazyExoticComponent } from 'react';

const RELOAD_TIMESTAMP_KEY = 'lazyWithRetry.lastReload';
const RELOAD_GUARD_MS = 30_000;

function isChunkLoadError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || '');
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Importing a module script failed') ||
    // Safari variant
    msg.includes('error loading dynamically imported module') ||
    // Edge / network failures during chunk fetch
    msg.includes('NetworkError when attempting to fetch')
  );
}

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (!isChunkLoadError(err)) throw err;

      const last = parseInt(sessionStorage.getItem(RELOAD_TIMESTAMP_KEY) || '0', 10);
      const now = Date.now();
      if (now - last > RELOAD_GUARD_MS) {
        // First failure (or first in a long while) — assume it's a
        // stale-chunk issue from a recent deploy and reload once.
        sessionStorage.setItem(RELOAD_TIMESTAMP_KEY, String(now));
        // eslint-disable-next-line no-console
        console.warn('[lazyWithRetry] chunk fetch failed, reloading:', err);
        window.location.reload();
        // Return a never-resolving promise so React doesn't render an
        // intermediate error UI between throw and reload.
        return new Promise<{ default: T }>(() => undefined);
      }

      // We just reloaded < 30 s ago and it failed again. Genuine issue.
      // Surface to the ErrorBoundary so the user sees the recovery UI.
      // eslint-disable-next-line no-console
      console.error('[lazyWithRetry] chunk fetch failed twice in 30 s — giving up:', err);
      throw err;
    }
  });
}
