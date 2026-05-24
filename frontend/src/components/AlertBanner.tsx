// Top-of-screen broadcast banner for active hospital emergencies.
// Renders inside MainLayout above the page content so every authenticated
// route sees it. Critical alerts pulse red and stack at the very top of
// the viewport; warning/info alerts get an inline banner.

import { useAlerts, Alert } from '../contexts/AlertContext';
import { AlertTriangle, AlertOctagon, Megaphone, Bell, BellOff, X, Check } from 'lucide-react';
import { useState } from 'react';

const CODE_LABEL: Record<string, string> = {
  CODE_BLUE: 'Code Blue · Cardiac arrest',
  CODE_RED: 'Code Red · Fire',
  CODE_PINK: 'Code Pink · Infant abduction',
  CODE_BLACK: 'Code Black · Bomb threat',
  CODE_ORANGE: 'Code Orange · Hazardous material',
  CODE_SILVER: 'Code Silver · Weapon / active threat',
  CODE_GREY: 'Code Grey · Combative person',
  CODE_YELLOW: 'Code Yellow · Internal emergency',
  MASS_CASUALTY: 'Mass casualty incident',
  EVACUATION: 'Evacuation',
  ANNOUNCEMENT: 'Announcement',
};

export default function AlertBanner() {
  const { alerts, acknowledge, resolve, muted, setMuted } = useAlerts();
  if (!alerts.length) return null;

  // Sort: critical first, then warning, then info, newest within each.
  const sevOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  const sorted = [...alerts].sort((a, b) => {
    const s = (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9);
    return s !== 0 ? s : (new Date(b.raisedAt).getTime() - new Date(a.raisedAt).getTime());
  });

  return (
    <div className="sticky top-0 z-40 space-y-1">
      {sorted.map((a) => (
        <AlertRow
          key={a.id}
          alert={a}
          onAcknowledge={() => acknowledge(a.id)}
          onResolve={() => resolve(a.id)}
          muted={muted}
          onToggleMute={() => setMuted(!muted)}
        />
      ))}
    </div>
  );
}

function AlertRow({ alert, onAcknowledge, onResolve, muted, onToggleMute }: {
  alert: Alert;
  onAcknowledge: () => void;
  onResolve: () => void;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const palette = (() => {
    if (alert.severity === 'critical') {
      return {
        bg: 'bg-red-600',
        bgMuted: 'bg-red-700',
        text: 'text-white',
        textMuted: 'text-red-100',
        icon: <AlertOctagon className="w-5 h-5 text-white animate-pulse" />,
        pulse: !alert.ackedByMe ? 'animate-[banner-pulse_1.4s_ease-in-out_infinite]' : '',
        button: 'bg-white/15 hover:bg-white/25 text-white',
        resolveBtn: 'bg-white text-red-700 hover:bg-red-50',
      };
    }
    if (alert.severity === 'warning') {
      return {
        bg: 'bg-amber-500',
        bgMuted: 'bg-amber-600',
        text: 'text-white',
        textMuted: 'text-amber-50',
        icon: <AlertTriangle className="w-5 h-5 text-white" />,
        pulse: '',
        button: 'bg-white/15 hover:bg-white/25 text-white',
        resolveBtn: 'bg-white text-amber-700 hover:bg-amber-50',
      };
    }
    return {
      bg: 'bg-sky-600',
      bgMuted: 'bg-sky-700',
      text: 'text-white',
      textMuted: 'text-sky-100',
      icon: <Megaphone className="w-5 h-5 text-white" />,
      pulse: '',
      button: 'bg-white/15 hover:bg-white/25 text-white',
      resolveBtn: 'bg-white text-sky-700 hover:bg-sky-50',
    };
  })();

  const label = CODE_LABEL[alert.code] || alert.code.replace(/_/g, ' ');
  const ago = (() => {
    const sec = Math.max(1, Math.floor((Date.now() - new Date(alert.raisedAt).getTime()) / 1000));
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    return `${hr}h ago`;
  })();

  return (
    <div className={`w-full ${palette.bg} ${palette.pulse} shadow-lg`}>
      <div className="px-4 py-2.5 flex items-center gap-3 max-w-[1600px] mx-auto">
        <div className={`shrink-0 w-9 h-9 rounded-lg ${palette.bgMuted} flex items-center justify-center`}>
          {palette.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-[15px] ${palette.text} tracking-tight`}>{label}</span>
            <span className={`text-[13px] ${palette.text} font-medium`}>·</span>
            <span className={`text-[13px] ${palette.text} font-medium`}>{alert.location}</span>
            {alert.ackedByMe && (
              <span className={`text-[10px] ${palette.textMuted} bg-black/15 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-medium`}>
                acknowledged
              </span>
            )}
          </div>
          {alert.message && (
            <div className={`text-[12px] ${palette.textMuted} mt-0.5 line-clamp-1`}>{alert.message}</div>
          )}
          <div className={`text-[11px] ${palette.textMuted} mt-0.5`}>
            Raised by {alert.raisedBy?.name || 'unknown'} · {ago}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onToggleMute}
            title={muted ? 'Unmute alert sounds' : 'Mute alert sounds (this browser only)'}
            className={`h-8 w-8 inline-flex items-center justify-center rounded-md ${palette.button} transition-colors`}
          >
            {muted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </button>
          {!alert.ackedByMe && (
            <button
              onClick={onAcknowledge}
              className={`h-8 px-3 inline-flex items-center gap-1 rounded-md ${palette.button} text-[12px] font-medium transition-colors`}
            >
              <Check className="w-3.5 h-3.5" /> Acknowledge
            </button>
          )}
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className={`h-8 px-3 inline-flex items-center gap-1 rounded-md ${palette.resolveBtn} text-[12px] font-semibold transition-colors`}
            >
              Resolve
            </button>
          ) : (
            <div className={`h-8 px-2 inline-flex items-center gap-1 rounded-md bg-white/95 text-slate-900 text-[12px] font-medium`}>
              <span className="text-slate-500">Clear for all?</span>
              <button onClick={onResolve} className="h-6 px-2 rounded bg-slate-900 text-white hover:bg-slate-800">Yes</button>
              <button onClick={() => setConfirming(false)} className="h-6 w-6 inline-flex items-center justify-center rounded text-slate-500 hover:bg-slate-100"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
