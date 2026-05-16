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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, UserPlus, Activity } from 'lucide-react';
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

const FILTER_OPTIONS: { key: AdmissionFilter; label: string; description: string }[] = [
  { key: 'all', label: 'All', description: 'Every registered patient' },
  { key: 'ipd', label: 'IPD', description: 'Has at least one admission' },
  { key: 'opd', label: 'OPD', description: 'Has at least one OPD encounter' },
  { key: 'dialysis', label: 'Dialysis', description: 'Has at least one dialysis session' },
];

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
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function badgeForActivity(type: PatientRow['lastActivityType']) {
  if (!type) return null;
  const cls = type === 'IPD'
    ? 'bg-emerald-100 text-emerald-800'
    : type === 'OPD'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-purple-100 text-purple-800';
  return <span className={`text-xs px-2 py-0.5 rounded ${cls}`}>{type}</span>;
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

  // Counts shown next to each filter tab. Computed off the currently-loaded
  // page so they stay in sync with what the user sees; for a true global
  // tally the backend would need separate aggregate endpoints.
  const filterCounts = useMemo(() => {
    return {
      all: patients.length,
      ipd: patients.filter((p) => p.counts.admissions > 0).length,
      opd: patients.filter((p) => p.counts.encounters > 0).length,
      dialysis: patients.filter((p) => p.counts.dialysisSessions > 0).length,
    };
  }, [patients]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
          <p className="text-sm text-slate-600">
            Unified directory across IPD, OPD, Dialysis, and every other intake.
            Click any row to open the full medical history.
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/app/patient-registration')}>
          <UserPlus className="w-4 h-4" />
          Register New Patient
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>All Registered Patients</CardTitle>
              <CardDescription>
                Clinical records are retained for at least 10 years per the
                hospital's retention policy.
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search MRN, name, or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-slate-400" />
            {FILTER_OPTIONS.map((f) => {
              const active = filter === f.key;
              const count = filterCounts[f.key];
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  title={f.description}
                  className={
                    `text-sm px-3 py-1 rounded-full border transition ` +
                    (active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400')
                  }
                >
                  {f.label}
                  <span className={`ml-2 text-xs ${active ? 'text-slate-300' : 'text-slate-400'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-3 mb-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MRN</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Age/Sex</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Blood</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead>Last doctor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Visits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-slate-500 py-8">
                    Loading patients…
                  </TableCell>
                </TableRow>
              )}
              {!loading && patients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-slate-500 py-8">
                    No patients match the current filter.
                  </TableCell>
                </TableRow>
              )}
              {!loading && patients.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => navigate(`/app/patients/${p.id}`)}
                >
                  <TableCell className="font-mono text-xs">{p.mrn}</TableCell>
                  <TableCell className="font-medium">
                    {p.name}
                    {p.purpose && (
                      <div className="text-xs text-slate-500 truncate max-w-[220px]" title={p.purpose}>
                        {p.purpose}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{ageFromDob(p.dob)} / {p.gender || '—'}</TableCell>
                  <TableCell className="text-slate-600">{p.contact || '—'}</TableCell>
                  <TableCell>{p.bloodGroup || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {badgeForActivity(p.lastActivityType)}
                      <span className="text-xs text-slate-500">{fmtDate(p.lastActivityAt)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{p.lastDoctorName || '—'}</TableCell>
                  <TableCell>
                    {p.activeAdmission ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1">
                        <Activity className="w-3 h-3" /> Admitted
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs text-slate-600">
                    <div title={`IPD ${p.counts.admissions} • OPD ${p.counts.encounters} • Dialysis ${p.counts.dialysisSessions}`}>
                      {p.counts.admissions + p.counts.encounters + p.counts.dialysisSessions}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!loading && patients.length >= 100 && (
            <div className="mt-3 text-xs text-slate-500">
              Showing first 100 rows. Refine your search to see more.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
