// Public OPD waiting-area kiosk — big-screen display intended for a TV
// in the OPD lobby. NO auth, NO sidebar/header chrome.
//
// Polls /api/public/kiosk/:tenantId every 5 seconds and renders three
// strata: NOW CALLING (huge, dominant), UP NEXT (5 tokens), and a small
// per-doctor grid. Visual contrast is deliberately high (dark
// background, white text, neon accent) so it reads from across a room.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Hospital, Volume2, UserRound } from 'lucide-react';

interface CallingItem {
  tokenNumber: number | string;
  patientName?: string | null;
  doctorName?: string | null;
  room?: string | null;
}

interface DoctorRow {
  doctorId: string;
  doctorName: string;
  callingToken?: number | string | null;
  waiting: number;
}

interface KioskState {
  now_calling: CallingItem[];
  up_next: CallingItem[];
  doctors: DoctorRow[];
}

export default function KioskBoard() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [state, setState] = useState<KioskState>({ now_calling: [], up_next: [], doctors: [] });
  const [clock, setClock] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);

  // Poll the public endpoint. We don't use the regular `api` instance —
  // this view must work without any logged-in session, so we hit the
  // PUBLIC URL directly.
  useEffect(() => {
    if (!tenantId) return;
    const base = (import.meta as any).env?.VITE_API_URL || '';
    let cancelled = false;
    async function poll() {
      try {
        const r = await fetch(`${base}/api/public/kiosk/${tenantId}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (cancelled) return;
        setState({
          now_calling: data?.now_calling || [],
          up_next: data?.up_next || [],
          doctors: data?.doctors || [],
        });
        setError(null);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Unable to refresh');
      }
    }
    void poll();
    const t = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, [tenantId]);

  // Independent clock tick — runs once per second so the displayed time
  // stays accurate between 5s data polls.
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const primary = state.now_calling[0];
  const otherCalls = state.now_calling.slice(1, 3);

  return (
    <div className="min-h-screen w-full bg-slate-900 text-white overflow-hidden">
      {/* Top bar — hospital + clock */}
      <header className="flex items-center justify-between px-10 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
            <Hospital className="w-7 h-7 text-cyan-300" />
          </div>
          <div>
            <div className="text-2xl font-semibold tracking-tight">HospitalPro</div>
            <div className="text-sm text-slate-400">OPD Patient Information Display</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-light tabular-nums">
            {clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-sm text-slate-400">
            {clock.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' })}
          </div>
        </div>
      </header>

      <main className="p-10 grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* NOW CALLING — dominates the screen */}
        <section className="xl:col-span-2 rounded-3xl bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 ring-1 ring-white/10 p-10">
          <div className="flex items-center gap-3 text-cyan-300 text-lg font-medium tracking-widest uppercase">
            <Volume2 className="w-6 h-6 animate-pulse" /> Now calling
          </div>

          {primary ? (
            <>
              <div className="mt-6">
                <div className="text-[14rem] leading-none font-bold text-white tabular-nums tracking-tighter">
                  {primary.tokenNumber}
                </div>
                <div className="mt-3 text-4xl text-slate-100 font-medium truncate">
                  {primary.patientName || '—'}
                </div>
                <div className="mt-2 text-2xl text-cyan-200/90">
                  {primary.doctorName ? `Dr. ${primary.doctorName}` : 'Please proceed to consultation'}
                  {primary.room && <span className="ml-3 px-3 py-1 rounded-xl bg-white/10 text-xl">Room {primary.room}</span>}
                </div>
              </div>

              {otherCalls.length > 0 && (
                <div className="mt-10 pt-6 border-t border-white/10 grid grid-cols-2 gap-6">
                  {otherCalls.map((c, i) => (
                    <div key={i} className="text-slate-200">
                      <div className="text-xs uppercase tracking-widest text-slate-400">also calling</div>
                      <div className="text-5xl font-semibold tabular-nums">{c.tokenNumber}</div>
                      <div className="text-lg text-slate-300 truncate">{c.patientName || '—'}</div>
                      {c.doctorName && <div className="text-base text-cyan-200/80">Dr. {c.doctorName}</div>}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="mt-12 text-5xl font-medium text-slate-300">
              No tokens calling
              <div className="mt-3 text-xl text-slate-400">Please wait — staff will call your token shortly.</div>
            </div>
          )}
        </section>

        {/* UP NEXT */}
        <section className="rounded-3xl bg-white/[0.04] ring-1 ring-white/10 p-8">
          <div className="text-cyan-300 text-lg font-medium tracking-widest uppercase">Up next</div>
          {state.up_next.length === 0 ? (
            <div className="mt-8 text-2xl text-slate-400">Queue is empty</div>
          ) : (
            <ul className="mt-6 space-y-3">
              {state.up_next.slice(0, 5).map((c, i) => (
                <li
                  key={i}
                  className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-white/[0.04] ring-1 ring-white/5"
                >
                  <div className="w-14 h-14 rounded-xl bg-cyan-500/20 text-cyan-200 text-2xl font-semibold flex items-center justify-center tabular-nums shrink-0">
                    {c.tokenNumber}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xl text-slate-100 truncate">{c.patientName || '—'}</div>
                    {c.doctorName && <div className="text-sm text-slate-400 truncate">Dr. {c.doctorName}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {/* BY DOCTOR — small grid spanning full width */}
      {state.doctors.length > 0 && (
        <section className="px-10 pb-10">
          <div className="text-cyan-300 text-sm font-medium tracking-widest uppercase mb-3">By doctor</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {state.doctors.map((d) => (
              <div
                key={d.doctorId}
                className="rounded-2xl bg-white/[0.04] ring-1 ring-white/5 px-4 py-3"
              >
                <div className="flex items-center gap-2 text-slate-200">
                  <UserRound className="w-4 h-4 text-cyan-300" />
                  <span className="font-medium truncate">Dr. {d.doctorName}</span>
                </div>
                <div className="flex items-end justify-between mt-1">
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Calling</div>
                    <div className="text-3xl font-semibold tabular-nums text-white">
                      {d.callingToken ?? '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Waiting</div>
                    <div className="text-xl font-semibold text-cyan-300 tabular-nums">{d.waiting}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {error && (
        <div className="fixed bottom-6 left-6 px-4 py-2 rounded-xl bg-red-900/40 text-red-200 text-sm ring-1 ring-red-500/40">
          Connection issue: {error} — retrying…
        </div>
      )}
    </div>
  );
}
