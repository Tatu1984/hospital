// Unified patients directory. One row per Patient, regardless of whether
// the record originated from IPD admission, OPD encounter, dialysis, ER,
// or any other workflow. The same row shows the patient's most recent
// activity across all of those — so a staffer can locate any patient by
// MRN/name/phone and pivot into their full medical history without first
// knowing which intake type they came from.
//
// Backed by GET /api/patients which accepts ?admissionType=ipd|opd|dialysis|all
// and returns a flat DTO (see backend/src/server.ts handler). Row click
// navigates to /app/patients/:patientId — the comprehensive profile page.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, UserPlus, Activity, Users, Bed, Stethoscope, Droplet } from 'lucide-react';
import api from '../services/api';

type AdmissionFilter = 'all' | 'ipd' | 'opd' | 'dialysis';

interface PatientRow {
  id: string;
  mrn: string;
  name: string;
  dob: string | null;
  gender: string | null;
  contact: string | null;
  email: string | null;
  bloodGroup: string | null;
  purpose: string | null;
  address: string | null;
  branchName: string | null;
  createdAt: string;
  counts: { admissions: number; encounters: number; dialysisSessions: number };
  lastActivityType: 'IPD' | 'OPD' | 'Dialysis' | null;
  lastActivityAt: string | null;
  lastDoctorName: string | null;
  activeAdmission: { id: string; admissionDate: string; diagnosis: string | null } | null;
}

const FILTER_OPTIONS: { key: AdmissionFilter; label: string; description: string; icon: any; tint: string }[] = [
  { key: 'all',      label: 'All',      description: 'Every registered patient',         icon: Users,       tint: 'bg-slate-100  text-slate-700  ring-slate-200' },
  { key: 'ipd',      label: 'IPD',      description: 'Has at least one admission',       icon: Bed,         tint: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  { key: 'opd',      label: 'OPD',      description: 'Has at least one OPD encounter',   icon: Stethoscope, tint: 'bg-blue-50    text-blue-700    ring-blue-100' },
  { key: 'dialysis', label: 'Dialysis', description: 'Has at least one dialysis session',icon: Droplet,     tint: 'bg-rose-50    text-rose-700    ring-rose-100' },
];

const ACTIVITY_TINT: Record<string, string> = {
  IPD:      'bg-emerald-50 text-emerald-700 ring-emerald-100',
  OPD:      'bg-blue-50    text-blue-700    ring-blue-100',
  Dialysis: 'bg-rose-50    text-rose-700    ring-rose-100',
};

function ageFromDob(dob: string | null): string {
  if (!dob) return '—';
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return '—';
  const years = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  return `${Math.max(0, years)}Y`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// Deterministic avatar tint per patient so the same patient always gets
// the same pastel chip — purely visual aid, no semantic meaning.
const AVATAR_TINTS = [
  'bg-blue-100   text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100  text-amber-700',
  'bg-pink-100   text-pink-700',
  'bg-cyan-100   text-cyan-700',
  'bg-rose-100   text-rose-700',
  'bg-indigo-100 text-indigo-700',
];
function avatarFor(id: string) {
  let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TINTS[h % AVATAR_TINTS.length];
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() || '').join('') || '?';
}

export default function PatientsList() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AdmissionFilter>('all');
  // Debounce the search input so we don't refetch on every keystroke. 300ms
  // is comfortable for human typing speed and keeps the server load low even
  // on a slow keyboard.
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let aborted = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string> = { limit: '100' };
        if (debouncedSearch) params.search = debouncedSearch;
        if (filter !== 'all') params.admissionType = filter;
        const res = await api.get('/api/patients', { params });
        if (aborted) return;
        const data = Array.isArray(res.data) ? res.data : [];
        setPatients(data as PatientRow[]);
      } catch (e: any) {
        if (aborted) return;
        setError(e?.response?.data?.message || e?.message || 'Failed to load patients');
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    load();
    return () => { aborted = true; };
  }, [debouncedSearch, filter]);

  const filterCounts = useMemo(() => {
    return {
      all:      patients.length,
      ipd:      patients.filter((p) => p.counts.admissions > 0).length,
      opd:      patients.filter((p) => p.counts.encounters > 0).length,
      dialysis: patients.filter((p) => p.counts.dialysisSessions > 0).length,
    };
  }, [patients]);

  return (
    <div className="min-h-screen">
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Patients</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Unified directory across IPD, OPD, Dialysis & every other intake
              </p>
            </div>
          </div>
          <Button onClick={() => navigate('/app/patient-registration')} className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
            <UserPlus className="w-4 h-4" />
            Register patient
          </Button>
        </div>

        {/* Filter cards as KPI tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {FILTER_OPTIONS.map((f) => {
            const active = filter === f.key;
            const count = filterCounts[f.key];
            const Icon = f.icon;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                title={f.description}
                className={`text-left rounded-2xl border p-4 transition-all duration-150 ${
                  active
                    ? 'border-slate-900 bg-white shadow-sm ring-1 ring-slate-900'
                    : 'border-slate-200/70 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">{f.label}</div>
                  <div className={`w-8 h-8 rounded-lg ${f.tint} ring-1 flex items-center justify-center`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                {loading
                  ? <Skeleton className="h-8 w-12 mt-2" />
                  : <div className="text-3xl font-semibold text-slate-900 mt-2 tracking-tight tabular-nums">{count}</div>}
                <div className="text-[11px] text-slate-500 mt-1">{f.description}</div>
              </button>
            );
          })}
        </div>

        {/* List */}
        <Card className="rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-white flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search MRN, name, or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white"
              />
            </div>
            <span className="text-xs text-slate-500 ml-auto">
              {patients.length} patient{patients.length === 1 ? '' : 's'} {filter !== 'all' && `· ${filter.toUpperCase()}`}
            </span>
          </div>
          <CardContent className="p-0">
            {error && (
              <div className="mx-5 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}
            {loading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : patients.length === 0 ? (
              <EmptyState onAdd={() => navigate('/app/patient-registration')} hasFilter={filter !== 'all' || !!search} />
            ) : (
              <div>
                {patients.map((p) => {
                  const total = p.counts.admissions + p.counts.encounters + p.counts.dialysisSessions;
                  return (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/app/patients/${p.id}`)}
                      className="w-full text-left flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-full ${avatarFor(p.id)} flex items-center justify-center shrink-0 font-medium text-[13px]`}>
                        {initials(p.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900 truncate">{p.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{p.mrn}</span>
                          {p.activeAdmission && (
                            <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 uppercase tracking-wider font-medium">
                              <Activity className="w-2.5 h-2.5" /> Admitted
                            </span>
                          )}
                          {p.lastActivityType && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ring-1 uppercase tracking-wider font-medium ${ACTIVITY_TINT[p.lastActivityType]}`}>
                              {p.lastActivityType}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                          <span>{ageFromDob(p.dob)} · {p.gender || '—'}</span>
                          {p.contact && <span>{p.contact}</span>}
                          {p.bloodGroup && <span className="text-rose-700 font-medium">{p.bloodGroup}</span>}
                          {p.lastDoctorName && <span>Dr. {p.lastDoctorName}</span>}
                          {p.lastActivityAt && <span>Last visit · {fmtDate(p.lastActivityAt)}</span>}
                        </div>
                        {p.purpose && (
                          <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[600px]" title={p.purpose}>
                            {p.purpose}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-medium text-slate-900 tabular-nums">{total}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">visits</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {!loading && patients.length >= 100 && (
              <div className="px-5 py-3 text-xs text-slate-500 border-t border-slate-100 bg-slate-50/40">
                Showing first 100 rows. Refine your search to see more.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyState({ onAdd, hasFilter }: { onAdd: () => void; hasFilter: boolean }) {
  return (
    <div className="py-16 px-6 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center mb-4">
        <Users className="w-8 h-8 text-blue-500" />
      </div>
      <h3 className="text-base font-medium text-slate-900">
        {hasFilter ? 'No patients match the filter' : 'No patients registered yet'}
      </h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        {hasFilter ? 'Try clearing the search or switching the filter.' : 'Register your first patient to start building the directory.'}
      </p>
      {!hasFilter && (
        <Button onClick={onAdd} className="gap-1.5 mt-5 rounded-xl bg-slate-900 hover:bg-slate-800">
          <UserPlus className="w-4 h-4" /> Register first patient
        </Button>
      )}
    </div>
  );
}
