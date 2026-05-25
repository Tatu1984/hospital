import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// One-shot client-state purge on boot.
//
// We've seen Chrome profiles where a previously failed CORS preflight, a
// stale service worker from an earlier deploy, or aggressive cache-storage
// entries survive every documented "clear cache" path — including
// DevTools → Clear site data. The result: the SPA loads, every API call
// returns a fake CORS failure, and incognito works fine.
//
// Defensive cleanup: on every boot, unregister any service worker that's
// registered for our origin and delete every Cache Storage entry. This is
// cheap (we don't ship a service worker, so the call is a no-op on
// healthy sessions) and removes the only client-side state that survives
// the standard cache clears.
//
// Fire-and-forget. Failures are swallowed — if the browser refuses to
// expose either API we just continue booting.
(() => {
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => undefined);
    }
    if (typeof caches !== 'undefined') {
      caches.keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => undefined);
    }
  } catch {
    /* no-op — boot must continue regardless */
  }
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
