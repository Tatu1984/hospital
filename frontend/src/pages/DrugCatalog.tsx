// Drug master catalog browser. Read-only view of every CDSCO/NLEM
// approved drug seeded into DrugMaster. Doctors land here to discover
// what's available; admins use it to verify the catalog after a refresh.

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Pill, Search, Star } from 'lucide-react';
import api from '../services/api';

interface DrugMasterRow {
  id: string;
  genericName: string;
  brandNames: string[];
  manufacturer?: string | null;
  therapeuticClass: string;
  atcCode?: string | null;
  strength?: string | null;
  form?: string | null;
  schedule: string;
  isEssential: boolean;
  hsnCode?: string | null;
  pregnancyCategory?: string | null;
  indications?: string | null;
  contraindications?: string | null;
  source: string;
}

const SCHEDULE_TINT: Record<string, string> = {
  'H':  'bg-amber-50 text-amber-700 ring-amber-200',
  'H1': 'bg-orange-50 text-orange-700 ring-orange-200',
  'X':  'bg-red-50 text-red-700 ring-red-200',
  'G':  'bg-slate-50 text-slate-700 ring-slate-200',
  'K':  'bg-violet-50 text-violet-700 ring-violet-200',
  '':   'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

const SCHEDULE_LABEL: Record<string, string> = {
  'H':  'Schedule H — Rx',
  'H1': 'Schedule H1 — Rx (3-yr record)',
  'X':  'Schedule X — narcotic',
  'G':  'Schedule G — warning',
  'K':  'Ayurvedic',
  '':   'OTC',
};

export default function DrugCatalog() {
  const [rows, setRows] = useState<DrugMasterRow[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [nlemOnly, setNlemOnly] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q.trim()), 250); return () => clearTimeout(t); }, [q]);

  useEffect(() => {
    api.get<string[]>('/api/drug-catalog/classes').then(r => setClasses(r.data || [])).catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: any = { limit: 200 };
    if (debouncedQ) params.q = debouncedQ;
    if (classFilter) params.class = classFilter;
    if (nlemOnly) params.nlem = 'true';
    api.get<DrugMasterRow[]>('/api/drug-catalog/search', { params })
      .then(r => setRows(r.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [debouncedQ, classFilter, nlemOnly]);

  const totalNlem = useMemo(() => rows.filter(r => r.isEssential).length, [rows]);

  return (
    <div className="min-h-screen">
      <div className="p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 ring-1 ring-teal-100 flex items-center justify-center">
              <Pill className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Drug catalog</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                CDSCO-approved + NLEM 2022 essential medicines. Seed source = curated; refresh with <span className="font-mono">scripts/seedDrugMaster.ts</span>.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Showing</div>
              <div className="text-3xl font-semibold text-slate-900 mt-2 tracking-tight tabular-nums">{rows.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">drugs matching filters</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">NLEM essentials</div>
              <div className="text-3xl font-semibold text-emerald-700 mt-2 tracking-tight tabular-nums">{totalNlem}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Classes</div>
              <div className="text-3xl font-semibold text-slate-900 mt-2 tracking-tight tabular-nums">{classes.length}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Quick filter</div>
              <button
                onClick={() => setNlemOnly(v => !v)}
                className={`mt-2 inline-flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg ring-1 transition-colors ${
                  nlemOnly
                    ? 'bg-emerald-600 text-white ring-emerald-600'
                    : 'bg-white text-slate-700 ring-slate-200 hover:ring-slate-300'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                NLEM essentials only
              </button>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-white space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search generic, brand, manufacturer, or therapeutic class…"
                className="pl-9 h-9 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setClassFilter(null)}
                className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${
                  classFilter === null ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >All classes ({classes.length})</button>
              {classes.slice(0, 25).map(c => (
                <button
                  key={c}
                  onClick={() => setClassFilter(c === classFilter ? null : c)}
                  className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${
                    c === classFilter ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >{c}</button>
              ))}
              {classes.length > 25 && (
                <span className="text-[11px] text-slate-400">+{classes.length - 25} more</span>
              )}
            </div>
          </div>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-5 space-y-2.5">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : rows.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500">
                No drugs match the current filters.
              </div>
            ) : (
              <div>
                {rows.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-teal-50 ring-1 ring-teal-100 flex items-center justify-center shrink-0">
                      <Pill className="w-4 h-4 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900">{r.genericName}</span>
                        {r.strength && <span className="text-[12px] text-slate-500">· {r.strength}</span>}
                        {r.form && <span className="text-[12px] text-slate-500">· {r.form}</span>}
                        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full ring-1 font-medium ${SCHEDULE_TINT[r.schedule] || SCHEDULE_TINT['']}`}>
                          {SCHEDULE_LABEL[r.schedule] ?? r.schedule}
                        </span>
                        {r.isEssential && (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200 font-medium inline-flex items-center gap-1">
                            <Star className="w-2.5 h-2.5" /> NLEM
                          </span>
                        )}
                        {r.pregnancyCategory && (
                          <span className="text-[10px] text-slate-600 px-1.5 py-0.5 rounded-full bg-slate-100">
                            Preg {r.pregnancyCategory}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                        <span className="italic">{r.therapeuticClass}</span>
                        {r.atcCode && <span className="font-mono">{r.atcCode}</span>}
                        {r.brandNames.length > 0 && (
                          <span className="truncate">Brands: {r.brandNames.slice(0, 4).join(' · ')}{r.brandNames.length > 4 ? ` +${r.brandNames.length - 4}` : ''}</span>
                        )}
                      </div>
                      {r.indications && (
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">{r.indications}</div>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider shrink-0">
                      {r.source}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
