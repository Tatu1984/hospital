// HAI (Hospital-Acquired Infection) Surveillance — track CLABSI / CAUTI /
// VAP / SSI / C. diff / MDRO incidents per admission. Drawer detail with
// outcome updates and ICC reporting timestamp. Visual style matches
// BirthRecords / Mortuary.

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertOctagon, Plus, ShieldOff, ClipboardCheck, Bug, AlertCircle,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import api from '../services/api';
import { useToast } from '../components/Toast';
import MrnLink from '../components/MrnLink';

interface PatientLite { id: string; mrn: string; name: string }

interface HAICase {
  id: string;
  patientId: string;
  patient?: PatientLite | null;
  encounterId?: string | null;
  admissionId?: string | null;
  infectionType: string;
  organism?: string | null;
  sensitivityPattern?: string | null;
  onsetDate: string;
  isolationRequired?: boolean;
  isolationStarted?: string | null;
  isolationEnded?: string | null;
  reportedToICCAt?: string | null;
  outcomeStatus?: string | null;
  status?: string | null;
  notes?: string | null;
}

const TYPES: Array<{ value: string; label: string; tint: string; color: string }> = [
  { value: 'CLABSI',  label: 'CLABSI (central line)', tint: 'bg-red-50 text-red-700 border-red-200',         color: '#dc2626' },
  { value: 'CAUTI',   label: 'CAUTI (catheter UTI)',  tint: 'bg-amber-50 text-amber-700 border-amber-200',   color: '#d97706' },
  { value: 'VAP',     label: 'VAP (ventilator)',      tint: 'bg-orange-50 text-orange-700 border-orange-200',color: '#ea580c' },
  { value: 'SSI',     label: 'SSI (surgical site)',   tint: 'bg-violet-50 text-violet-700 border-violet-200',color: '#7c3aed' },
  { value: 'C_DIFF',  label: 'C. difficile',          tint: 'bg-emerald-50 text-emerald-700 border-emerald-200', color: '#059669' },
  { value: 'MDRO',    label: 'MDRO',                  tint: 'bg-blue-50 text-blue-700 border-blue-200',      color: '#2563eb' },
  { value: 'OTHER',   label: 'Other HAI',             tint: 'bg-slate-100 text-slate-700 border-slate-200',  color: '#64748b' },
];

const OUTCOME_OPTIONS: Array<{ value: string; label: string; tint: string }> = [
  { value: 'recovering', label: 'Recovering',  tint: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'recovered',  label: 'Recovered',   tint: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'transferred',label: 'Transferred', tint: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'died',       label: 'Died',        tint: 'bg-red-50 text-red-700 border-red-200' },
];

export default function HAISurveillance() {
  const toast = useToast();
  const [cases, setCases] = useState<HAICase[]>([]);
  const [loading, setLoading] = useState(false);

  // filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<HAICase | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<any>(emptyForm());
  // outcome edit panel state
  const [outcomeForm, setOutcomeForm] = useState<{ outcomeStatus: string; isolationEnded: string; notes: string }>({
    outcomeStatus: '', isolationEnded: '', notes: '',
  });

  function emptyForm() {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    return {
      patient: null as PatientLite | null,
      patientId: '',
      encounterId: '',
      admissionId: '',
      infectionType: 'CLABSI',
      organism: '',
      sensitivityPattern: '',
      onsetDate: today,
      isolationRequired: false,
      isolationStarted: '',
      notes: '',
    };
  }

  async function load() {
    setLoading(true);
    try {
      const params: any = {};
      if (typeFilter !== 'all')   params.type = typeFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (fromDate)               params.from = fromDate;
      if (toDate)                 params.to = toDate;
      const r = await api.get('/api/hai-cases', { params });
      setCases(Array.isArray(r.data) ? r.data : []);
    } catch (e: any) {
      toast.error('Load failed', e?.response?.data?.error || 'Try again');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [typeFilter, statusFilter, fromDate, toDate]);

  // derived stats
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = cases.filter(c => new Date(c.onsetDate) >= monthStart);
    const isolationActive = cases.filter(c => c.isolationStarted && !c.isolationEnded).length;
    const iccPending = cases.filter(c => !c.reportedToICCAt && c.outcomeStatus !== 'recovered' && c.outcomeStatus !== 'died').length;

    const byType: Record<string, number> = {};
    for (const c of thisMonth) byType[c.infectionType] = (byType[c.infectionType] || 0) + 1;
    const donut = TYPES
      .map(t => ({ name: t.label.split(' ')[0], key: t.value, value: byType[t.value] || 0, color: t.color }))
      .filter(x => x.value > 0);

    return { thisMonth: thisMonth.length, isolationActive, iccPending, donut };
  }, [cases]);

  async function save() {
    if (!form.patientId)     { toast.error('Pick a patient'); return; }
    if (!form.infectionType) { toast.error('Infection type required'); return; }
    if (!form.onsetDate)     { toast.error('Onset date required'); return; }
    setSaving(true);
    try {
      const payload: any = {
        patientId: form.patientId,
        infectionType: form.infectionType,
        onsetDate: new Date(form.onsetDate).toISOString(),
      };
      if (form.encounterId)        payload.encounterId = form.encounterId;
      if (form.admissionId)        payload.admissionId = form.admissionId;
      if (form.organism)           payload.organism = form.organism;
      if (form.sensitivityPattern) payload.sensitivityPattern = form.sensitivityPattern;
      if (form.isolationRequired)  payload.isolationRequired = true;
      if (form.isolationStarted)   payload.isolationStarted = new Date(form.isolationStarted).toISOString();
      if (form.notes)              payload.notes = form.notes;
      await api.post('/api/hai-cases', payload);
      toast.success('HAI case logged');
      setAddOpen(false);
      setForm(emptyForm());
      void load();
    } catch (e: any) {
      toast.error('Save failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  function openDetail(c: HAICase) {
    setDetail(c);
    setOutcomeForm({
      outcomeStatus: c.outcomeStatus || '',
      isolationEnded: c.isolationEnded ? c.isolationEnded.slice(0, 10) : '',
      notes: c.notes || '',
    });
  }

  async function saveOutcome() {
    if (!detail) return;
    setSaving(true);
    try {
      const payload: any = {};
      if (outcomeForm.outcomeStatus)  payload.outcomeStatus = outcomeForm.outcomeStatus;
      if (outcomeForm.isolationEnded) payload.isolationEnded = new Date(outcomeForm.isolationEnded).toISOString();
      if (outcomeForm.notes)          payload.notes = outcomeForm.notes;
      await api.put(`/api/hai-cases/${detail.id}`, payload);
      toast.success('Updated');
      setDetail(null);
      void load();
    } catch (e: any) {
      toast.error('Update failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function reportToICC() {
    if (!detail) return;
    setSaving(true);
    try {
      await api.put(`/api/hai-cases/${detail.id}`, { reportedToICCAt: new Date().toISOString() });
      toast.success('Reported to ICC');
      setDetail({ ...detail, reportedToICCAt: new Date().toISOString() });
      void load();
    } catch (e: any) {
      toast.error('Report failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center ring-1 ring-red-100">
              <AlertOctagon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">HAI Surveillance</h1>
              <p className="text-sm text-slate-500 mt-0.5">Hospital-acquired infection register & infection control committee reporting</p>
            </div>
          </div>
          <Button onClick={() => { setForm(emptyForm()); setAddOpen(true); }}
            className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4" /> New case
          </Button>
        </div>

        {/* STATS + DONUT */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <StatCard label="Cases this month" value={stats.thisMonth}
            icon={<AlertOctagon className="w-4 h-4 text-red-600" />} tint="bg-red-50 ring-red-100" accent="text-red-700" loading={loading} />
          <StatCard label="Isolation active" value={stats.isolationActive}
            icon={<ShieldOff className="w-4 h-4 text-orange-600" />} tint="bg-orange-50 ring-orange-100" accent="text-orange-700" loading={loading} />
          <StatCard label="ICC reports pending" value={stats.iccPending}
            icon={<ClipboardCheck className="w-4 h-4 text-amber-600" />} tint="bg-amber-50 ring-amber-100" accent="text-amber-700" loading={loading} />
          <Card className="rounded-2xl border-slate-200/70 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">By type — this month</CardTitle>
            </CardHeader>
            <CardContent className="h-24 flex items-center pt-0">
              {loading ? <Skeleton className="w-full h-full rounded-xl" /> : stats.donut.length === 0 ? (
                <p className="text-xs text-slate-400 mx-auto">No cases yet</p>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  <ResponsiveContainer width="50%" height={90}>
                    <PieChart>
                      <Pie data={stats.donut} dataKey="value" nameKey="name" innerRadius={22} outerRadius={42} paddingAngle={2}>
                        {stats.donut.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="flex-1 text-[11px] space-y-0.5">
                    {stats.donut.map(d => (
                      <li key={d.key} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span className="truncate text-slate-700">{d.name}</span>
                        <span className="ml-auto text-slate-500">{d.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* FILTERS + LIST */}
        <Card className="rounded-2xl border-slate-200/70 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white space-y-3">
            <CardTitle className="text-base text-slate-900">Cases</CardTitle>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Chip active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>All types</Chip>
              {TYPES.map(t => (
                <Chip key={t.value} active={typeFilter === t.value} onClick={() => setTypeFilter(typeFilter === t.value ? 'all' : t.value)}>
                  {t.label.split(' ')[0]}
                </Chip>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wide text-slate-500">Status</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 rounded-xl w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wide text-slate-500">From</span>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 rounded-xl w-[150px]" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wide text-slate-500">To</span>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 rounded-xl w-[150px]" />
              </div>
              {(fromDate || toDate || typeFilter !== 'all' || statusFilter !== 'all') && (
                <Button variant="ghost" size="sm" onClick={() => { setFromDate(''); setToDate(''); setTypeFilter('all'); setStatusFilter('all'); }}>
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : cases.length === 0 ? (
              <EmptyState onAdd={() => { setForm(emptyForm()); setAddOpen(true); }} />
            ) : (
              <div>
                {cases.map(c => {
                  const t = TYPES.find(x => x.value === c.infectionType);
                  const o = OUTCOME_OPTIONS.find(x => x.value === c.outcomeStatus);
                  const isolationActive = c.isolationStarted && !c.isolationEnded;
                  return (
                    <button key={c.id} onClick={() => openDetail(c)}
                      className="w-full text-left flex items-start gap-4 px-6 py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-red-50 ring-1 ring-red-100 flex items-center justify-center shrink-0">
                        <Bug className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900 truncate">{c.patient?.name || '—'}</span>
                          <MrnLink mrn={c.patient?.mrn} patientId={c.patient?.id} />
                          <Badge variant="outline" className={`text-[10px] font-normal ${t?.tint || ''}`}>{t?.label || c.infectionType}</Badge>
                          {isolationActive && <Badge variant="outline" className="text-[10px] font-normal bg-orange-50 text-orange-700 border-orange-200">isolation</Badge>}
                          {o && <Badge variant="outline" className={`text-[10px] font-normal ${o.tint}`}>{o.label}</Badge>}
                          {c.reportedToICCAt && <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">ICC ✓</span>}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                          <span>Onset {new Date(c.onsetDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          {c.organism && <span>· {c.organism}</span>}
                          {c.sensitivityPattern && <span className="text-slate-400 truncate max-w-[280px]">· {c.sensitivityPattern}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DETAIL DRAWER */}
      <Sheet open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <SheetContent width="max-w-lg">
          {detail && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 ring-1 ring-red-100 flex items-center justify-center">
                    <Bug className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <SheetTitle>{detail.patient?.name || '—'}</SheetTitle>
                    <SheetDescription>{detail.patient?.mrn} · onset {new Date(detail.onsetDate).toLocaleDateString('en-IN')}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <SheetBody>
                <DetailGroup title="Infection">
                  <Kv k="Type" v={TYPES.find(t => t.value === detail.infectionType)?.label || detail.infectionType} />
                  <Kv k="Organism" v={detail.organism} />
                  <Kv k="Sensitivity" v={detail.sensitivityPattern} />
                  <Kv k="Onset" v={new Date(detail.onsetDate).toLocaleDateString('en-IN')} />
                </DetailGroup>
                <DetailGroup title="Isolation & reporting">
                  <Kv k="Isolation required" v={detail.isolationRequired ? 'Yes' : 'No'} />
                  <Kv k="Isolation started" v={detail.isolationStarted ? new Date(detail.isolationStarted).toLocaleDateString('en-IN') : '—'} />
                  <Kv k="Isolation ended" v={detail.isolationEnded ? new Date(detail.isolationEnded).toLocaleDateString('en-IN') : '—'} />
                  <Kv k="ICC reported at" v={detail.reportedToICCAt ? new Date(detail.reportedToICCAt).toLocaleString('en-IN') : 'pending'} />
                </DetailGroup>

                <section className="mb-5">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Update outcome</div>
                  <div className="space-y-3 border border-slate-200 rounded-xl p-4 bg-slate-50/40">
                    <div>
                      <Label className="text-xs text-slate-500">Outcome status</Label>
                      <Select value={outcomeForm.outcomeStatus || '_'} onValueChange={(v) => setOutcomeForm({ ...outcomeForm, outcomeStatus: v === '_' ? '' : v })}>
                        <SelectTrigger className="rounded-lg"><SelectValue placeholder="No change" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_">— No change —</SelectItem>
                          {OUTCOME_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">End isolation on</Label>
                      <Input type="date" value={outcomeForm.isolationEnded} onChange={(e) => setOutcomeForm({ ...outcomeForm, isolationEnded: e.target.value })} className="rounded-lg" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Notes</Label>
                      <Textarea value={outcomeForm.notes} onChange={(e) => setOutcomeForm({ ...outcomeForm, notes: e.target.value })}
                        placeholder="Treatment, contact tracing, follow-up…" className="min-h-[80px] rounded-lg" />
                    </div>
                  </div>
                </section>
              </SheetBody>
              <SheetFooter>
                {!detail.reportedToICCAt && (
                  <Button variant="outline" onClick={reportToICC} disabled={saving} className="gap-1.5">
                    <ClipboardCheck className="w-4 h-4" /> Report to ICC
                  </Button>
                )}
                <Button variant="outline" onClick={() => setDetail(null)} disabled={saving}>Close</Button>
                <Button onClick={saveOutcome} disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Saving…' : 'Save changes'}</Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* NEW CASE DIALOG */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Log HAI case</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="border border-slate-200 rounded-xl p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-semibold">Patient</div>
              <ApiPatientPicker value={form.patient} onChange={(p) => setForm({ ...form, patient: p, patientId: p?.id || '' })} />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <FormInput label="Encounter ID (optional)" value={form.encounterId} onChange={(v) => setForm({ ...form, encounterId: v })} />
                <FormInput label="Admission ID (optional)" value={form.admissionId} onChange={(v) => setForm({ ...form, admissionId: v })} />
              </div>
            </div>
            <div className="border border-slate-200 rounded-xl p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-semibold">Infection</div>
              <div className="grid grid-cols-2 gap-3">
                <FormSelect label="Type *" value={form.infectionType} onChange={(v) => setForm({ ...form, infectionType: v })} options={TYPES} />
                <FormInput label="Onset date *" type="date" value={form.onsetDate} onChange={(v) => setForm({ ...form, onsetDate: v })} />
                <FormInput label="Organism" value={form.organism} onChange={(v) => setForm({ ...form, organism: v })} placeholder="e.g. MRSA, K. pneumoniae" />
                <FormInput label="Sensitivity pattern" value={form.sensitivityPattern} onChange={(v) => setForm({ ...form, sensitivityPattern: v })} placeholder="e.g. Vancomycin S, Cefoxitin R" />
              </div>
            </div>
            <div className="border border-slate-200 rounded-xl p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-semibold">Isolation</div>
              <label className="flex items-center gap-2 text-sm text-slate-700 mb-3">
                <input type="checkbox" checked={!!form.isolationRequired} onChange={(e) => setForm({ ...form, isolationRequired: e.target.checked })} />
                Isolation required
              </label>
              {form.isolationRequired && (
                <FormInput label="Isolation started" type="date" value={form.isolationStarted} onChange={(v) => setForm({ ...form, isolationStarted: v })} />
              )}
            </div>
            <div>
              <Label className="text-xs text-slate-500">Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Brief clinical context, source, transmission risks…" className="min-h-[80px] rounded-lg" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Saving…' : 'Log case'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ sub-components ============

function StatCard({ label, value, icon, tint, accent, loading }: {
  label: string; value: number; icon: React.ReactNode; tint: string; accent?: string; loading?: boolean;
}) {
  return (
    <Card className="rounded-2xl border-slate-200/70 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</div>
          <div className={`w-8 h-8 rounded-lg ${tint} ring-1 flex items-center justify-center`}>{icon}</div>
        </div>
        {loading
          ? <Skeleton className="h-8 w-16 mt-3" />
          : <div className={`text-3xl font-semibold ${accent || 'text-slate-900'} mt-2 tracking-tight tabular-nums`}>{value}</div>}
      </CardContent>
    </Card>
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={active
        ? 'text-xs px-3 py-1 rounded-full bg-slate-900 text-white font-medium transition-colors'
        : 'text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors'}>
      {children}
    </button>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="py-16 px-6 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 ring-1 ring-red-100 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-base font-medium text-slate-900">No HAI cases logged</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">Use this register so the Infection Control Committee can spot clusters early.</p>
      <Button onClick={onAdd} className="gap-1.5 mt-5 rounded-xl bg-slate-900 hover:bg-slate-800">
        <Plus className="w-4 h-4" /> New case
      </Button>
    </div>
  );
}

function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">{title}</div>
      <dl className="divide-y divide-slate-100 border border-slate-100 rounded-xl bg-slate-50/40">
        {children}
      </dl>
    </section>
  );
}

function Kv({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-2 text-sm">
      <dt className="text-slate-500 shrink-0">{k}</dt>
      <dd className="text-slate-900 text-right break-words">{v || '—'}</dd>
    </div>
  );
}

function FormInput({ label, value, onChange, type = 'text', placeholder }: { label: string; value: any; onChange: (v: any) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs text-slate-500">{label}</Label>
      <Input type={type as any} value={value === null || value === undefined ? '' : value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="rounded-lg" />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <div>
      <Label className="text-xs text-slate-500">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function ApiPatientPicker({ value, onChange }: { value: PatientLite | null; onChange: (p: PatientLite | null) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PatientLite[]>([]);

  useEffect(() => {
    if (value || !q.trim()) { setResults([]); return; }
    const ctl = new AbortController();
    const tid = setTimeout(async () => {
      try {
        const r = await api.get('/api/patients', { params: { search: q.trim(), limit: 10 }, signal: ctl.signal as any });
        const raw = Array.isArray(r.data) ? r.data : (r.data?.items || []);
        setResults(raw.map((x: any) => ({ id: x.id, mrn: x.mrn, name: x.name })));
      } catch {/* ignore */}
    }, 250);
    return () => { clearTimeout(tid); ctl.abort(); };
  }, [q, value]);

  if (value) {
    return (
      <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-2.5 bg-slate-50/60">
        <div className="flex-1 text-sm">
          <span className="font-medium text-slate-900">{value.name}</span>{' '}
          <span className="text-slate-500 text-xs font-mono">({value.mrn})</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => { onChange(null); setQ(''); }} className="h-7">Change</Button>
      </div>
    );
  }
  return (
    <div className="relative">
      <Input placeholder="Type name or MRN…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-lg" />
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-10">
          {results.map(p => (
            <button key={p.id} type="button" onClick={() => { onChange(p); setQ(''); setResults([]); }}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-b-0">
              <div className="font-medium text-slate-900">{p.name}</div>
              <div className="text-xs text-slate-500 font-mono">{p.mrn}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
