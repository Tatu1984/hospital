// Top-of-screen broadcast banner for active hospital emergencies.
// Renders inside MainLayout above the page content so every authenticated
// route sees it. Critical alerts pulse red and stack at the very top of
// the viewport; warning/info alerts get an inline banner.

import { useAlerts, Alert } from '../contexts/AlertContext';
import {
  AlertTriangle, AlertOctagon, Megaphone, Bell, BellOff, X, Check,
  Heart, Flame, Baby, ShieldAlert, Users, LogOut,
} from 'lucide-react';
import { useState, ReactNode } from 'react';

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

interface Palette {
  bg: string;
  bgMuted: string;
  textMuted: string;
  resolveBtn: string;
  icon: ReactNode;
}

// Per-code palette + icon — each hospital code has a canonical color in
// the standard NCC code-colors taxonomy. We paint the banner that color
// so staff can identify the code from across a room without reading the
// text. Falls back to severity colors for any code not explicitly mapped.
const CODE_PALETTE: Record<string, Palette> = {
  CODE_BLUE:     mkPalette('blue',    <Heart        className="w-5 h-5 text-white" />),
  CODE_RED:      mkPalette('red',     <Flame        className="w-5 h-5 text-white" />),
  CODE_PINK:     mkPalette('pink',    <Baby         className="w-5 h-5 text-white" />),
  CODE_BLACK:    mkPaletteBlack(                    <AlertOctagon className="w-5 h-5 text-white" />),
  CODE_ORANGE:   mkPalette('orange',  <AlertTriangle className="w-5 h-5 text-white" />),
  CODE_SILVER:   mkPaletteSilver(                   <ShieldAlert  className="w-5 h-5 text-white" />),
  CODE_GREY:     mkPaletteGrey(                     <Users        className="w-5 h-5 text-white" />),
  CODE_YELLOW:   mkPaletteYellow(                   <AlertTriangle className="w-5 h-5 text-slate-900" />),
  MASS_CASUALTY: mkPaletteDeepRed(                  <Users        className="w-5 h-5 text-white" />),
  EVACUATION:    mkPalette('orange',  <LogOut       className="w-5 h-5 text-white" />),
  ANNOUNCEMENT:  mkPalette('sky',     <Megaphone    className="w-5 h-5 text-white" />),
};

const SEVERITY_FALLBACK: Record<Alert['severity'], Palette> = {
  critical: mkPalette('red',    <AlertOctagon  className="w-5 h-5 text-white" />),
  warning:  mkPalette('amber',  <AlertTriangle className="w-5 h-5 text-white" />),
  info:     mkPalette('sky',    <Megaphone     className="w-5 h-5 text-white" />),
};

// Standard palette: bg-{color}-600 main, -700 muted, -50 resolveBtn text.
function mkPalette(color: string, icon: ReactNode): Palette {
  const map: Record<string, Palette> = {
    blue:   { bg: 'bg-blue-600',   bgMuted: 'bg-blue-700',   textMuted: 'text-blue-100',   resolveBtn: 'bg-white text-blue-700 hover:bg-blue-50',     icon },
    red:    { bg: 'bg-red-600',    bgMuted: 'bg-red-700',    textMuted: 'text-red-100',    resolveBtn: 'bg-white text-red-700 hover:bg-red-50',       icon },
    pink:   { bg: 'bg-pink-600',   bgMuted: 'bg-pink-700',   textMuted: 'text-pink-100',   resolveBtn: 'bg-white text-pink-700 hover:bg-pink-50',     icon },
    orange: { bg: 'bg-orange-600', bgMuted: 'bg-orange-700', textMuted: 'text-orange-100', resolveBtn: 'bg-white text-orange-700 hover:bg-orange-50', icon },
    amber:  { bg: 'bg-amber-500',  bgMuted: 'bg-amber-600',  textMuted: 'text-amber-50',   resolveBtn: 'bg-white text-amber-700 hover:bg-amber-50',   icon },
    sky:    { bg: 'bg-sky-600',    bgMuted: 'bg-sky-700',    textMuted: 'text-sky-100',    resolveBtn: 'bg-white text-sky-700 hover:bg-sky-50',       icon },
  };
  return map[color];
}
// Special-cases — these don't fit the bg-{color}-600 pattern.
function mkPaletteBlack(icon: ReactNode): Palette {
  return { bg: 'bg-slate-900',  bgMuted: 'bg-black',       textMuted: 'text-slate-300', resolveBtn: 'bg-white text-slate-900 hover:bg-slate-100', icon };
}
function mkPaletteSilver(icon: ReactNode): Palette {
  return { bg: 'bg-slate-500',  bgMuted: 'bg-slate-600',   textMuted: 'text-slate-200', resolveBtn: 'bg-white text-slate-700 hover:bg-slate-100', icon };
}
function mkPaletteGrey(icon: ReactNode): Palette {
  return { bg: 'bg-slate-600',  bgMuted: 'bg-slate-700',   textMuted: 'text-slate-200', resolveBtn: 'bg-white text-slate-700 hover:bg-slate-100', icon };
}
function mkPaletteYellow(icon: ReactNode): Palette {
  // Yellow needs dark text — white on yellow fails contrast checks.
  return { bg: 'bg-yellow-400', bgMuted: 'bg-yellow-500',  textMuted: 'text-yellow-900',resolveBtn: 'bg-slate-900 text-white hover:bg-slate-800', icon };
}
function mkPaletteDeepRed(icon: ReactNode): Palette {
  return { bg: 'bg-red-700',    bgMuted: 'bg-red-800',     textMuted: 'text-red-100',   resolveBtn: 'bg-white text-red-700 hover:bg-red-50',     icon };
}

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

  // Pick color by CODE first (Code Blue = blue, Pink = pink, etc.), fall
  // back to severity for non-coded alerts. Yellow uses dark text/button
  // because white-on-yellow fails accessibility contrast.
  const palette = CODE_PALETTE[alert.code] || SEVERITY_FALLBACK[alert.severity];
  const isYellow = alert.code === 'CODE_YELLOW';
  const text = isYellow ? 'text-slate-900' : 'text-white';
  const button = isYellow
    ? 'bg-slate-900/10 hover:bg-slate-900/20 text-slate-900'
    : 'bg-white/15 hover:bg-white/25 text-white';
  // Color-agnostic pulse — brightness/saturation tick, not a colored
  // shadow. Works on any banner color without clashing.
  const pulse = alert.severity === 'critical' && !alert.ackedByMe
    ? 'animate-[banner-pulse_1.4s_ease-in-out_infinite]'
    : '';

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
    <div className={`w-full ${palette.bg} ${pulse} shadow-lg`}>
      <div className="px-4 py-2.5 flex items-center gap-3 max-w-[1600px] mx-auto">
        <div className={`shrink-0 w-9 h-9 rounded-lg ${palette.bgMuted} flex items-center justify-center`}>
          {palette.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-[15px] ${text} tracking-tight`}>{label}</span>
            <span className={`text-[13px] ${text} font-medium`}>·</span>
            <span className={`text-[13px] ${text} font-medium`}>{alert.location}</span>
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
            className={`h-8 w-8 inline-flex items-center justify-center rounded-md ${button} transition-colors`}
          >
            {muted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </button>
          {!alert.ackedByMe && (
            <button
              onClick={onAcknowledge}
              className={`h-8 px-3 inline-flex items-center gap-1 rounded-md ${button} text-[12px] font-medium transition-colors`}
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
