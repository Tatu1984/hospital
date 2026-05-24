// Hospital-wide emergency-alert subscriber. Polls /api/alerts/active
// every 3 seconds while the portal is open and broadcasts the result
// to whoever consumes `useAlerts()`. AlertBanner / RaiseAlarmButton are
// the typical consumers.
//
// Why polling and not SSE / WebSocket: the backend is Vercel-only and
// serverless functions don't reliably hold long-lived connections.
// 3-second worst-case latency is well within "fast response" norms for
// code-blue announcements, and the request is tiny (active alerts list,
// usually empty or 1 row). Adds ~20 req/min/user — negligible.

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

export interface Alert {
  id: string;
  code: string;
  severity: 'critical' | 'warning' | 'info';
  location: string;
  message?: string | null;
  raisedAt: string;
  resolvedAt?: string | null;
  raisedBy?: { id: string; name: string } | null;
  ackedByMe?: boolean;
}

interface AlertContextValue {
  alerts: Alert[];
  raise: (input: { code: string; severity: Alert['severity']; location: string; message?: string }) => Promise<void>;
  acknowledge: (id: string) => Promise<void>;
  resolve: (id: string) => Promise<void>;
  muted: boolean;
  setMuted: (v: boolean) => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);
const POLL_MS = 3000;
const MUTE_KEY = 'hms.alerts.muted';

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [muted, _setMuted] = useState<boolean>(() => {
    try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
  });
  const previousIdsRef = useRef<Set<string>>(new Set());

  const setMuted = useCallback((v: boolean) => {
    _setMuted(v);
    try { localStorage.setItem(MUTE_KEY, v ? '1' : '0'); } catch { /* private mode */ }
  }, []);

  async function poll() {
    try {
      const r = await api.get<Alert[]>('/api/alerts/active');
      const next = r.data || [];
      // Detect newly-arrived alerts so we can play the beep ONCE per
      // alert, not on every poll. Compare ids against the previous set.
      const prev = previousIdsRef.current;
      const fresh = next.filter(a => !prev.has(a.id));
      previousIdsRef.current = new Set(next.map(a => a.id));
      setAlerts(next);
      if (fresh.length > 0 && !muted) {
        const hasCritical = fresh.some(a => a.severity === 'critical');
        playBeep(hasCritical);
      }
    } catch {
      // Network blip or auth expired — swallow; next poll will recover.
    }
  }

  // Start polling only when authenticated. Stop when logged out.
  useEffect(() => {
    if (!token) {
      setAlerts([]);
      previousIdsRef.current = new Set();
      return;
    }
    void poll();
    const id = setInterval(() => { void poll(); }, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const raise = useCallback(async (input: { code: string; severity: Alert['severity']; location: string; message?: string }) => {
    await api.post('/api/alerts', input);
    void poll(); // immediate refresh so the raiser sees their own alert at once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const acknowledge = useCallback(async (id: string) => {
    await api.post(`/api/alerts/${id}/acknowledge`);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, ackedByMe: true } : a));
  }, []);

  const resolve = useCallback(async (id: string) => {
    await api.post(`/api/alerts/${id}/resolve`);
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const value = useMemo(() => ({ alerts, raise, acknowledge, resolve, muted, setMuted }),
    [alerts, raise, acknowledge, resolve, muted, setMuted]);

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
}

export function useAlerts() {
  const v = useContext(AlertContext);
  if (!v) throw new Error('useAlerts must be used inside <AlertProvider>');
  return v;
}

// Synthesize a beep using the Web Audio API — avoids shipping a sound
// file. Two short beeps for critical, one for others. Lazy-instantiates
// the AudioContext on the first call (browsers block before user
// interaction; in practice the user has clicked Login by then).
let audioCtx: AudioContext | null = null;
function playBeep(critical: boolean) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtx;
    const playTone = (freq: number, when: number, duration = 0.2) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, ctx.currentTime + when);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + when + 0.01);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + when + duration - 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + when + duration);
      osc.start(ctx.currentTime + when);
      osc.stop(ctx.currentTime + when + duration);
    };
    if (critical) {
      // Three rising tones, urgent.
      playTone(880, 0);
      playTone(1100, 0.25);
      playTone(1320, 0.5);
    } else {
      playTone(660, 0, 0.18);
    }
  } catch {
    /* AudioContext blocked or unsupported — silently no-op. */
  }
}
