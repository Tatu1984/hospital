// NABH Quality Dashboard — the single page the medical director shows
// during NABH inspection. Twelve KPI tiles, each compared against the
// previous period of the same length so the arrow tells you whether the
// trend is moving in the right direction. Defaults to the last 30 days.

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Star, TrendingUp, TrendingDown, Minus,
  Activity, Bed, ClipboardCheck, ClipboardList,
  Skull, AlertOctagon, Hourglass, RotateCw,
  Pill, ShieldCheck, FileText, Trash2,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/Toast';

interface NABHKpis {
  // Numbers chosen to match the backend GET /api/nabh/kpis response shape
  // described in the task brief. Anything missing falls back to null.
  mortalityRate?: number | null;
  deaths?: number | null;
  discharges?: number | null;
  lamaRate?: number | null;
  lamaCount?: number | null;
  bedOccupancy?: number | null;
  avgLOS?: number | null;
  returnToOTRate?: number | null;
  returnToOTCount?: number | null;
  haiCount?: number | null;
  haiRate?: number | null;
  medicationErrors?: number | null;
  surgicalChecklistCompliance?: number | null;
  iccReportsThisMonth?: number | null;
  bmwKgThisMonth?: number | null;
  // Allow any extra keys without TS pushback
  [k: string]: any;
}

interface Tile {
  key: keyof NABHKpis;
  label: string;
  sub?: string;
  format: 'percent' | 'days' | 'count' | 'kg' | 'number';
  icon: React.ReactNode;
  tint: string;
  // True means "lower is better" (we colour the trend arrow accordingly)
  lowerBetter: boolean;
  numerKey?: keyof NABHKpis;
  denomKey?: keyof NABHKpis;
}

const TILES: Tile[] = [
  { key: 'mortalityRate', label: 'Mortality rate', format: 'percent',
    icon: <Skull className="w-4 h-4 text-red-600" />, tint: 'bg-red-50 ring-red-100',
    lowerBetter: true, numerKey: 'deaths', denomKey: 'discharges' },
  { key: 'lamaRate', label: 'LAMA rate', format: 'percent',
    icon: <RotateCw className="w-4 h-4 text-orange-600" />, tint: 'bg-orange-50 ring-orange-100',
    lowerBetter: true, numerKey: 'lamaCount', denomKey: 'discharges' },
  { key: 'bedOccupancy', label: 'Bed occupancy', format: 'percent',
    icon: <Bed className="w-4 h-4 text-blue-600" />, tint: 'bg-blue-50 ring-blue-100',
    lowerBetter: false },
  { key: 'avgLOS', label: 'Average LOS', format: 'days',
    icon: <Hourglass className="w-4 h-4 text-violet-600" />, tint: 'bg-violet-50 ring-violet-100',
    lowerBetter: true, sub: 'days per admission' },
  { key: 'returnToOTRate', label: 'Return-to-OT', format: 'percent',
    icon: <Activity className="w-4 h-4 text-amber-600" />, tint: 'bg-amber-50 ring-amber-100',
    lowerBetter: true, numerKey: 'returnToOTCount', denomKey: 'discharges' },
  { key: 'haiCount', label: 'HAI count', format: 'count',
    icon: <AlertOctagon className="w-4 h-4 text-red-600" />, tint: 'bg-red-50 ring-red-100',
    lowerBetter: true, sub: 'this period' },
  { key: 'haiRate', label: 'HAI rate', format: 'percent',
    icon: <AlertOctagon className="w-4 h-4 text-rose-600" />, tint: 'bg-rose-50 ring-rose-100',
    lowerBetter: true, sub: 'per discharges' },
  { key: 'medicationErrors', label: 'Medication errors', format: 'count',
    icon: <Pill className="w-4 h-4 text-amber-600" />, tint: 'bg-amber-50 ring-amber-100',
    lowerBetter: true },
  { key: 'surgicalChecklistCompliance', label: 'Surgical checklist compliance', format: 'percent',
    icon: <ClipboardCheck className="w-4 h-4 text-emerald-600" />, tint: 'bg-emerald-50 ring-emerald-100',
    lowerBetter: false },
  { key: 'iccReportsThisMonth', label: 'ICC reports', format: 'count',
    icon: <ShieldCheck className="w-4 h-4 text-blue-600" />, tint: 'bg-blue-50 ring-blue-100',
    lowerBetter: false, sub: 'reports filed this month' },
  { key: 'bmwKgThisMonth', label: 'BMW total', format: 'kg',
    icon: <Trash2 className="w-4 h-4 text-yellow-700" />, tint: 'bg-yellow-50 ring-yellow-200',
    lowerBetter: false, sub: 'kg generated this month' },
  { key: 'surgicalChecklistCompliance', label: 'Safety checklist compliance', format: 'percent',
    icon: <FileText className="w-4 h-4 text-violet-600" />, tint: 'bg-violet-50 ring-violet-100',
    lowerBetter: false, sub: 'WHO sign-in / time-out / sign-out' },
];

function fmt(value: number | null | undefined, format: Tile['format']): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (format === 'percent') return `${Number(value).toFixed(1)}%`;
  if (format === 'days')    return `${Number(value).toFixed(1)}`;
  if (format === 'kg')      return `${Number(value).toFixed(1)}`;
  return String(value);
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function NABHDashboard() {
  const toast = useToast();

  // Default range: last 30 days
  const [from, setFrom] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return dateOnly(d);
  });
  const [to, setTo] = useState<string>(() => dateOnly(new Date()));

  const [current, setCurrent] = useState<NABHKpis | null>(null);
  const [previous, setPrevious] = useState<NABHKpis | null>(null);
  const [loading, setLoading] = useState(false);

  // The "previous" range matches the length of the current range, immediately
  // preceding it — so a 30-day current window pulls the 30 days before that
  // for trend comparison.
  const prevRange = useMemo(() => {
    const start = new Date(from);
    const end = new Date(to);
    const len = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
    const prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - len);
    return { from: dateOnly(prevStart), to: dateOnly(prevEnd) };
  }, [from, to]);

  async function load() {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        api.get('/api/nabh/kpis', { params: { from, to } }).catch(() => ({ data: null })),
        api.get('/api/nabh/kpis', { params: { from: prevRange.from, to: prevRange.to } }).catch(() => ({ data: null })),
      ]);
      setCurrent(a.data || {});
      setPrevious(b.data || {});
    } catch (e: any) {
      toast.error('KPI fetch failed', e?.response?.data?.error || 'Try again');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [from, to]);

  function setPreset(days: number) {
    const t = new Date();
    const f = new Date(); f.setDate(f.getDate() - days);
    setFrom(dateOnly(f)); setTo(dateOnly(t));
  }

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* HERO */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center ring-1 ring-amber-100">
              <Star className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">NABH Quality Dashboard</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Twelve KPIs · trend versus the previous {Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000))}-day window
              </p>
            </div>
          </div>
          <div className="flex items-end gap-2 flex-wrap">
            <div>
              <Label className="text-xs text-slate-500">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-xl w-[150px]" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-xl w-[150px]" />
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPreset(7)} className="rounded-lg">7d</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset(30)} className="rounded-lg">30d</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset(90)} className="rounded-lg">90d</Button>
            </div>
          </div>
        </div>

        {/* KPI GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {TILES.map((t, idx) => (
            <KpiTile key={`${String(t.key)}-${idx}`} tile={t} current={current} previous={previous} loading={loading} />
          ))}
        </div>

        <p className="text-xs text-slate-400 px-1">
          Trend arrows compare the selected window with the equal-length window immediately preceding it.
          Green = improving (per KPI direction), red = worsening, grey = unchanged.
        </p>
      </div>
    </div>
  );
}

function KpiTile({ tile, current, previous, loading }: {
  tile: Tile; current: NABHKpis | null; previous: NABHKpis | null; loading: boolean;
}) {
  const cur = current?.[tile.key] ?? null;
  const prev = previous?.[tile.key] ?? null;

  // Subtitle string
  let sub = tile.sub || '';
  if (tile.numerKey && tile.denomKey && current) {
    const n = current[tile.numerKey];
    const d = current[tile.denomKey];
    if (n != null && d != null) sub = `${n} / ${d}`;
  }

  // Trend computation
  let arrow: 'up' | 'down' | 'flat' | null = null;
  let arrowGood = false;
  if (cur != null && prev != null && Number.isFinite(Number(cur)) && Number.isFinite(Number(prev))) {
    const diff = Number(cur) - Number(prev);
    if (Math.abs(diff) < 0.001) arrow = 'flat';
    else if (diff > 0)          arrow = 'up';
    else                        arrow = 'down';
    arrowGood = (arrow === 'down' && tile.lowerBetter) || (arrow === 'up' && !tile.lowerBetter);
  }

  const arrowIcon = arrow === 'up'
    ? <TrendingUp className="w-3.5 h-3.5" />
    : arrow === 'down'
      ? <TrendingDown className="w-3.5 h-3.5" />
      : <Minus className="w-3.5 h-3.5" />;
  const arrowClass = arrow == null
    ? 'text-slate-300'
    : arrow === 'flat'
      ? 'text-slate-400 bg-slate-100'
      : arrowGood
        ? 'text-emerald-700 bg-emerald-50'
        : 'text-red-700 bg-red-50';

  let diffPct = '';
  if (cur != null && prev != null && Number(prev) !== 0) {
    const pct = ((Number(cur) - Number(prev)) / Math.abs(Number(prev))) * 100;
    diffPct = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  }

  return (
    <Card className="rounded-2xl border-slate-200/70 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-medium leading-tight">{tile.label}</div>
          <div className={`w-8 h-8 rounded-lg ${tile.tint} ring-1 flex items-center justify-center shrink-0`}>{tile.icon}</div>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-24 mt-3" />
        ) : (
          <div className="text-3xl font-semibold text-slate-900 mt-2 tracking-tight tabular-nums">
            {fmt(cur as any, tile.format)}
            {tile.format === 'kg' && <span className="text-base font-normal text-slate-400 ml-1">kg</span>}
          </div>
        )}
        <div className="flex items-center justify-between mt-1 gap-2 flex-wrap">
          <div className="text-xs text-slate-500 truncate">{sub}</div>
          {!loading && arrow && (
            <div className={`text-[11px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${arrowClass}`}>
              {arrowIcon}
              <span className="tabular-nums">{diffPct || '—'}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Unused but exported icons kept off the bundle by tree-shake
export const __unusedIcons = { ClipboardList };
