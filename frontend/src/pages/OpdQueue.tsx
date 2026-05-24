// OPD Queue — staff-side queue manager. Front desk issues a token to a
// new arrival; doctor / nurse calls, starts, and marks done. Mirrors the
// classic OPD waiting-area workflow: Waiting → Called → In Consult →
// Done.
//
// Public big-screen counterpart (no auth) is /kiosk/:tenantId — that one
// reads from /api/public/kiosk and only displays state.

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Hash, Plus, Phone, Clock, PlayCircle, CheckCircle2, XCircle, UserX, AlertCircle, Star,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/Toast';

interface QueueRow {
  id: string;
  tokenNumber: number | string;
  patientId: string;
  patientName: string;
  patientMRN?: string | null;
  doctorId?: string | null;
  doctorName?: string | null;
  department?: string | null;
  priority: 'normal' | 'urgent' | 'follow_up';
  status: 'waiting' | 'called' | 'in_consult' | 'done' | 'no_show' | 'cancelled';
  issuedAt: string;
  calledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

interface DoctorLite { id: string; name: string }
interface PatientLite { id: string; name: string; mrn?: string | null }

const COLUMNS: { key: QueueRow['status']; label: string; tint: string }[] = [
  { key: 'waiting',    label: 'Waiting',     tint: 'bg-amber-50 text-amber-700 ring-amber-100' },
  { key: 'called',     label: 'Called',      tint: 'bg-blue-50 text-blue-700 ring-blue-100' },
  { key: 'in_consult', label: 'In Consult',  tint: 'bg-violet-50 text-violet-700 ring-violet-100' },
  { key: 'done',       label: 'Done today',  tint: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
];

const PRIORITY_TINT: Record<QueueRow['priority'], string> = {
  normal: 'bg-slate-100 text-slate-700',
  urgent: 'bg-red-100 text-red-700',
  follow_up: 'bg-blue-100 text-blue-700',
};

export default function OpdQueue() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [doctors, setDoctors] = useState<DoctorLite[]>([]);
  const [doctorFilter, setDoctorFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const params: any = { date: today.toISOString() };
      if (doctorFilter !== 'all') params.doctorId = doctorFilter;
      const [q, d] = await Promise.all([
        api.get<QueueRow[]>('/api/opd-queue', { params }).catch(() => ({ data: [] })),
        api.get<DoctorLite[]>('/api/doctors').catch(() => ({ data: [] })),
      ]);
      setRows((q.data || []) as QueueRow[]);
      setDoctors((d.data || []).map((x: any) => ({ id: x.id, name: x.name })));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [doctorFilter]);

  // Auto-refresh every 15s so staff see updates without manual reload.
  useEffect(() => {
    const t = setInterval(() => { void load(); }, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorFilter]);

  async function transition(row: QueueRow, action: 'call' | 'start' | 'done' | 'no-show' | 'cancel') {
    try {
      await api.post(`/api/opd-queue/${row.id}/${action}`);
      toast.success(`Token ${row.tokenNumber} marked ${action.replace('-', ' ')}`);
      void load();
    } catch (e: any) {
      toast.error('Action failed', e?.response?.data?.error || 'Try again');
    }
  }

  const grouped = useMemo(() => {
    const m: Record<string, QueueRow[]> = { waiting: [], called: [], in_consult: [], done: [] };
    for (const r of rows) {
      if (m[r.status]) m[r.status].push(r);
    }
    // Sort waiting by priority (urgent first) then issuedAt.
    m.waiting.sort((a, b) => {
      const order = { urgent: 0, normal: 1, follow_up: 2 } as const;
      const d = (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
      if (d !== 0) return d;
      return new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime();
    });
    return m;
  }, [rows]);

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center ring-1 ring-blue-100">
              <Hash className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">OPD Queue</h1>
              <p className="text-sm text-slate-500 mt-0.5">Issue tokens, call patients, and track consult flow in real time</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-56">
              <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="All doctors" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All doctors</SelectItem>
                  {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setIssueOpen(true)} className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
              <Plus className="w-4 h-4" /> Issue token
            </Button>
          </div>
        </div>

        {/* COLUMNS */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {COLUMNS.map(col => (
            <Card key={col.key} className="rounded-2xl border-slate-200/70 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-white pb-3">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ring-1 ${col.tint}`}>
                    {col.label}
                  </span>
                  <span className="text-xs text-slate-500">{grouped[col.key]?.length || 0}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2 max-h-[70vh] overflow-y-auto">
                {(grouped[col.key] || []).length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">No tokens here</div>
                ) : (
                  (grouped[col.key] || []).map(row => (
                    <QueueCard
                      key={row.id}
                      row={row}
                      onAction={(a) => transition(row, a)}
                    />
                  ))
                )}
                {loading && (grouped[col.key] || []).length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400">Loading…</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <IssueTokenDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        doctors={doctors}
        onIssued={() => void load()}
      />
    </div>
  );
}

function QueueCard({ row, onAction }: { row: QueueRow; onAction: (a: 'call' | 'start' | 'done' | 'no-show' | 'cancel') => void }) {
  const waited = useMemo(() => waitingTime(row.issuedAt), [row.issuedAt]);
  return (
    <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white text-sm font-semibold flex items-center justify-center shrink-0">
            #{row.tokenNumber}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-slate-900 text-sm truncate">{row.patientName}</div>
            <div className="text-[11px] text-slate-500 truncate">
              {row.patientMRN || '—'} {row.doctorName && `· Dr. ${row.doctorName}`}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className={`text-[10px] font-normal border-transparent ${PRIORITY_TINT[row.priority]}`}>
          {row.priority === 'urgent' && <AlertCircle className="w-2.5 h-2.5 mr-0.5 inline" />}
          {row.priority === 'follow_up' && <Star className="w-2.5 h-2.5 mr-0.5 inline" />}
          {row.priority.replace('_', ' ')}
        </Badge>
        <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
          <Clock className="w-3 h-3" /> {waited}
        </span>
      </div>
      <div className="flex items-center gap-1.5 pt-1">
        {row.status === 'waiting' && (
          <>
            <Button size="sm" variant="outline" className="h-7 gap-1 rounded-lg text-xs" onClick={() => onAction('call')}>
              <Phone className="w-3 h-3" /> Call
            </Button>
            <Button size="sm" variant="ghost" className="h-7 gap-1 rounded-lg text-xs text-slate-500" onClick={() => onAction('no-show')}>
              <UserX className="w-3 h-3" /> No-show
            </Button>
          </>
        )}
        {row.status === 'called' && (
          <Button size="sm" className="h-7 gap-1 rounded-lg text-xs bg-violet-600 hover:bg-violet-700" onClick={() => onAction('start')}>
            <PlayCircle className="w-3 h-3" /> Start consult
          </Button>
        )}
        {row.status === 'in_consult' && (
          <Button size="sm" className="h-7 gap-1 rounded-lg text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => onAction('done')}>
            <CheckCircle2 className="w-3 h-3" /> Done
          </Button>
        )}
        {row.status === 'done' && (
          <span className="text-[11px] text-emerald-700 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        )}
        {(row.status === 'waiting' || row.status === 'called') && (
          <Button size="sm" variant="ghost" className="h-7 gap-1 rounded-lg text-xs text-slate-400 ml-auto" onClick={() => onAction('cancel')}>
            <XCircle className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

function waitingTime(issuedAt: string): string {
  const ms = Date.now() - new Date(issuedAt).getTime();
  if (ms < 60_000) return 'just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m`;
}

// ---------- Issue token dialog ----------
function IssueTokenDialog({
  open, onOpenChange, doctors, onIssued,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doctors: DoctorLite[];
  onIssued: () => void;
}) {
  const [patient, setPatient] = useState<PatientLite | null>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PatientLite[]>([]);
  const [doctorId, setDoctorId] = useState<string>('');
  const [priority, setPriority] = useState<QueueRow['priority']>('normal');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setPatient(null); setQ(''); setResults([]); setDoctorId(''); setPriority('normal');
    }
  }, [open]);

  useEffect(() => {
    if (!q.trim() || patient) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await api.get('/api/patients', { params: { search: q, limit: 8 } });
        const raw = Array.isArray(r.data) ? r.data : (r.data?.items || []);
        setResults(raw.map((x: any) => ({ id: x.id, name: x.name, mrn: x.mrn })).slice(0, 8));
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, patient]);

  async function issue() {
    if (!patient) { toast.error('Pick a patient first'); return; }
    setSaving(true);
    try {
      const doc = doctors.find(d => d.id === doctorId);
      await api.post('/api/opd-queue/issue', {
        patientId: patient.id,
        doctorId: doctorId || undefined,
        doctorName: doc?.name,
        priority,
      });
      toast.success('Token issued');
      onIssued();
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Issue failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">Issue OPD token</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-slate-500">Patient *</Label>
            {patient ? (
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-2.5 bg-slate-50/60">
                <div className="flex-1 text-sm">
                  <span className="font-medium text-slate-900">{patient.name}</span>{' '}
                  <span className="text-slate-500 text-xs">({patient.mrn || '—'})</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => { setPatient(null); setQ(''); }} className="h-7">Change</Button>
              </div>
            ) : (
              <div className="relative">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or MRN…" className="rounded-lg" />
                {results.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-10">
                    {results.map(p => (
                      <button key={p.id} type="button"
                        onClick={() => { setPatient(p); setQ(''); setResults([]); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-b-0">
                        <div className="font-medium text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-500">{p.mrn || '—'}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs text-slate-500">Doctor</Label>
            <Select value={doctorId || '_'} onValueChange={(v) => setDoctorId(v === '_' ? '' : v)}>
              <SelectTrigger className="rounded-lg"><SelectValue placeholder="(any)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">— Unassigned —</SelectItem>
                {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Priority</Label>
            <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="follow_up">Follow up</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={issue} disabled={saving || !patient} className="bg-slate-900 hover:bg-slate-800">
            {saving ? 'Issuing…' : 'Issue token'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
