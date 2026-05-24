// Morbidity & Mortality reviews — clinical governance log. Every death
// auto-becomes a "pending mortality" review the medical team has to close
// with a root-cause + learning-points note. Morbidities (significant
// adverse event without death) can also be entered manually. Visual style
// mirrors Consultations: 3-tab list, drawer detail.

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  Scale, Plus, ClipboardCheck, ClipboardList, Skull, TrendingUp,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/Toast';

interface PatientLite { id: string; mrn: string; name: string }

interface MnMCase {
  id: string;
  patient?: PatientLite | null;
  patientId: string;
  admissionId?: string | null;
  isMortality: boolean;
  presentationSummary?: string | null;
  diagnosis?: string | null;
  clinicalCourse?: string | null;
  outcome?: string | null;
  rootCause?: string | null;
  learningPoints?: string | null;
  preventabilityScore?: number | null;
  reviewers?: string | null;
  status: 'pending' | 'reviewed';
  notes?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

const PREVENTABILITY_LABELS: Record<number, string> = {
  1: 'Definitely not preventable',
  2: 'Probably not preventable',
  3: 'Possibly preventable',
  4: 'Probably preventable',
  5: 'Definitely preventable',
};

export default function MnMReviews() {
  const toast = useToast();
  const [cases, setCases] = useState<MnMCase[]>([]);
  const [loading, setLoading] = useState(false);

  const [tab, setTab] = useState<'pending' | 'reviewed' | 'all'>('pending');
  const [mortalityFilter, setMortalityFilter] = useState<'all' | 'mortalities' | 'morbidities'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<MnMCase | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<any>(emptyForm());
  const [reviewForm, setReviewForm] = useState({
    rootCause: '',
    learningPoints: '',
    preventabilityScore: 3,
    reviewers: '',
    status: 'reviewed' as 'reviewed' | 'pending',
    notes: '',
  });

  function emptyForm() {
    return {
      patient: null as PatientLite | null,
      patientId: '',
      admissionId: '',
      isMortality: false,
      presentationSummary: '',
      diagnosis: '',
      clinicalCourse: '',
      outcome: '',
      notes: '',
    };
  }

  async function load() {
    setLoading(true);
    try {
      const params: any = {};
      if (tab !== 'all')                params.status = tab;
      if (mortalityFilter === 'mortalities')  params.isMortality = 'true';
      if (mortalityFilter === 'morbidities')  params.isMortality = 'false';
      if (fromDate)                     params.from = fromDate;
      if (toDate)                       params.to = toDate;
      const r = await api.get('/api/mnm', { params });
      setCases(Array.isArray(r.data) ? r.data : []);
    } catch (e: any) {
      toast.error('Load failed', e?.response?.data?.error || 'Try again');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [tab, mortalityFilter, fromDate, toDate]);

  // stats are based on the currently loaded filtered list, except month bucket
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const pending = cases.filter(c => c.status === 'pending').length;
    const reviewedThisMonth = cases.filter(c => c.status === 'reviewed' && c.reviewedAt && new Date(c.reviewedAt) >= monthStart).length;
    const mortalities = cases.filter(c => c.isMortality).length;
    const total = cases.length;
    const mortalityRate = total > 0 ? Math.round((mortalities / total) * 1000) / 10 : 0;
    const reviewedCases = cases.filter(c => c.preventabilityScore != null);
    const preventAvg = reviewedCases.length
      ? Math.round((reviewedCases.reduce((a, c) => a + (c.preventabilityScore || 0), 0) / reviewedCases.length) * 10) / 10
      : 0;
    return { pending, reviewedThisMonth, mortalityRate, preventAvg };
  }, [cases]);

  async function save() {
    if (!form.patientId) { toast.error('Pick a patient'); return; }
    setSaving(true);
    try {
      const payload: any = {
        patientId: form.patientId,
        isMortality: !!form.isMortality,
      };
      if (form.admissionId)         payload.admissionId = form.admissionId;
      if (form.presentationSummary) payload.presentationSummary = form.presentationSummary;
      if (form.diagnosis)           payload.diagnosis = form.diagnosis;
      if (form.clinicalCourse)      payload.clinicalCourse = form.clinicalCourse;
      if (form.outcome)             payload.outcome = form.outcome;
      if (form.notes)               payload.notes = form.notes;
      await api.post('/api/mnm', payload);
      toast.success('Case logged for review');
      setAddOpen(false);
      setForm(emptyForm());
      void load();
    } catch (e: any) {
      toast.error('Save failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  function openDetail(c: MnMCase) {
    setDetail(c);
    setReviewForm({
      rootCause: c.rootCause || '',
      learningPoints: c.learningPoints || '',
      preventabilityScore: c.preventabilityScore || 3,
      reviewers: c.reviewers || '',
      status: (c.status === 'reviewed' ? 'reviewed' : 'reviewed'),
      notes: c.notes || '',
    });
  }

  async function submitReview() {
    if (!detail) return;
    setSaving(true);
    try {
      const payload: any = {
        status: reviewForm.status,
      };
      if (reviewForm.rootCause)      payload.rootCause = reviewForm.rootCause;
      if (reviewForm.learningPoints) payload.learningPoints = reviewForm.learningPoints;
      if (reviewForm.preventabilityScore) payload.preventabilityScore = reviewForm.preventabilityScore;
      if (reviewForm.reviewers)      payload.reviewers = reviewForm.reviewers;
      if (reviewForm.notes)          payload.notes = reviewForm.notes;
      await api.put(`/api/mnm/${detail.id}/review`, payload);
      toast.success('Review saved');
      setDetail(null);
      void load();
    } catch (e: any) {
      toast.error('Save failed', e?.response?.data?.error || 'Try again');
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
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center ring-1 ring-slate-200">
              <Scale className="w-6 h-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">M&amp;M Reviews</h1>
              <p className="text-sm text-slate-500 mt-0.5">Morbidity & mortality clinical governance — root-cause analysis and learning points</p>
            </div>
          </div>
          <Button onClick={() => { setForm(emptyForm()); setAddOpen(true); }}
            className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4" /> New review
          </Button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Pending review" value={stats.pending}
            icon={<ClipboardList className="w-4 h-4 text-amber-600" />} tint="bg-amber-50 ring-amber-100" accent="text-amber-700" loading={loading} />
          <StatCard label="Reviewed this month" value={stats.reviewedThisMonth}
            icon={<ClipboardCheck className="w-4 h-4 text-emerald-600" />} tint="bg-emerald-50 ring-emerald-100" accent="text-emerald-700" loading={loading} />
          <StatCard label="Mortality rate" value={`${stats.mortalityRate}%`}
            icon={<Skull className="w-4 h-4 text-red-600" />} tint="bg-red-50 ring-red-100" accent="text-red-700" loading={loading}
            sub="deaths / total reviewed" />
          <StatCard label="Preventability avg" value={stats.preventAvg.toFixed(1)}
            icon={<TrendingUp className="w-4 h-4 text-violet-600" />} tint="bg-violet-50 ring-violet-100" accent="text-violet-700" loading={loading}
            sub="1 = not preventable · 5 = definitely" />
        </div>

        {/* TABS + LIST */}
        <Card className="rounded-2xl border-slate-200/70 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <TabsList className="bg-slate-100">
                  <TabsTrigger value="pending" className="gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5" /> Pending
                  </TabsTrigger>
                  <TabsTrigger value="reviewed" className="gap-1.5">
                    <ClipboardCheck className="w-3.5 h-3.5" /> Reviewed
                  </TabsTrigger>
                  <TabsTrigger value="all" className="gap-1.5">
                    <Scale className="w-3.5 h-3.5" /> All
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="pending" className="mt-0" />
                <TabsContent value="reviewed" className="mt-0" />
                <TabsContent value="all" className="mt-0" />
              </Tabs>
              <div className="flex items-center gap-2">
                <Select value={mortalityFilter} onValueChange={(v) => setMortalityFilter(v as any)}>
                  <SelectTrigger className="h-9 rounded-xl w-[170px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cases</SelectItem>
                    <SelectItem value="mortalities">Mortalities only</SelectItem>
                    <SelectItem value="morbidities">Morbidities only</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 rounded-xl w-[150px]" />
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 rounded-xl w-[150px]" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : cases.length === 0 ? (
              <div className="py-16 px-6 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center mb-4">
                  <Scale className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-base font-medium text-slate-900">No cases in this view</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">
                  Deaths during admission auto-create a pending review. Add a morbidity case manually if needed.
                </p>
              </div>
            ) : (
              <div>
                {cases.map(c => (
                  <button key={c.id} onClick={() => openDetail(c)}
                    className="w-full text-left flex items-start gap-4 px-6 py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80 transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 ${
                      c.isMortality ? 'bg-red-50 ring-red-100' : 'bg-amber-50 ring-amber-100'
                    }`}>
                      {c.isMortality
                        ? <Skull className="w-5 h-5 text-red-600" />
                        : <Scale className="w-5 h-5 text-amber-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900 truncate">{c.patient?.name || '—'}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{c.patient?.mrn}</span>
                        <Badge variant="outline" className={`text-[10px] font-normal ${
                          c.isMortality
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {c.isMortality ? 'mortality' : 'morbidity'}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] font-normal ${
                          c.status === 'reviewed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {c.status}
                        </Badge>
                        {c.preventabilityScore && (
                          <span className="text-[10px] text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">
                            preventability {c.preventabilityScore}/5
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                        {c.diagnosis && <span className="truncate max-w-[300px]">{c.diagnosis}</span>}
                        {c.outcome && <span>· outcome: {c.outcome}</span>}
                        <span className="text-slate-400">· {new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DETAIL DRAWER */}
      <Sheet open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <SheetContent width="max-w-xl">
          {detail && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ring-1 ${
                    detail.isMortality ? 'bg-red-50 ring-red-100' : 'bg-amber-50 ring-amber-100'
                  }`}>
                    {detail.isMortality ? <Skull className="w-5 h-5 text-red-600" /> : <Scale className="w-5 h-5 text-amber-600" />}
                  </div>
                  <div>
                    <SheetTitle>{detail.patient?.name || '—'}</SheetTitle>
                    <SheetDescription>
                      {detail.patient?.mrn} · {detail.isMortality ? 'Mortality' : 'Morbidity'} · created {new Date(detail.createdAt).toLocaleDateString('en-IN')}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <SheetBody>
                <DetailGroup title="Case summary">
                  <Kv k="Diagnosis" v={detail.diagnosis} />
                  <Kv k="Presentation" v={detail.presentationSummary} />
                  <Kv k="Clinical course" v={detail.clinicalCourse} />
                  <Kv k="Outcome" v={detail.outcome} />
                </DetailGroup>

                <section className="mb-5">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                    {detail.status === 'reviewed' ? 'Review' : 'Complete the review'}
                  </div>
                  <div className="space-y-3 border border-slate-200 rounded-xl p-4 bg-slate-50/40">
                    <div>
                      <Label className="text-xs text-slate-500">Root cause</Label>
                      <Textarea value={reviewForm.rootCause} onChange={(e) => setReviewForm({ ...reviewForm, rootCause: e.target.value })}
                        placeholder="What primary failure or condition caused the outcome?" className="min-h-[80px] rounded-lg" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Learning points</Label>
                      <Textarea value={reviewForm.learningPoints} onChange={(e) => setReviewForm({ ...reviewForm, learningPoints: e.target.value })}
                        placeholder="Action items, protocol changes, training needs…" className="min-h-[80px] rounded-lg" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">
                        Preventability score: <span className="text-slate-900 font-semibold">{reviewForm.preventabilityScore}</span>
                        <span className="text-slate-400 ml-1">— {PREVENTABILITY_LABELS[reviewForm.preventabilityScore]}</span>
                      </Label>
                      <input type="range" min={1} max={5} step={1}
                        value={reviewForm.preventabilityScore}
                        onChange={(e) => setReviewForm({ ...reviewForm, preventabilityScore: Number(e.target.value) })}
                        className="w-full" />
                      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                        <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Reviewers</Label>
                      <Input value={reviewForm.reviewers} onChange={(e) => setReviewForm({ ...reviewForm, reviewers: e.target.value })}
                        placeholder="Names of the M&M committee members who reviewed" className="rounded-lg" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Notes</Label>
                      <Textarea value={reviewForm.notes} onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
                        placeholder="Additional notes or follow-up plan…" className="min-h-[60px] rounded-lg" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Status</Label>
                      <Select value={reviewForm.status} onValueChange={(v) => setReviewForm({ ...reviewForm, status: v as any })}>
                        <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending — keep open</SelectItem>
                          <SelectItem value="reviewed">Mark reviewed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </section>
              </SheetBody>
              <SheetFooter>
                <Button variant="outline" onClick={() => setDetail(null)} disabled={saving}>Close</Button>
                <Button onClick={submitReview} disabled={saving} className="gap-1.5 bg-slate-900 hover:bg-slate-800">
                  <ClipboardCheck className="w-4 h-4" /> {saving ? 'Saving…' : 'Save review'}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* NEW REVIEW DIALOG */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Log new M&amp;M case</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="border border-slate-200 rounded-xl p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-semibold">Patient</div>
              <ApiPatientPicker value={form.patient} onChange={(p) => setForm({ ...form, patient: p, patientId: p?.id || '' })} />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <FormInput label="Admission ID (optional)" value={form.admissionId} onChange={(v) => setForm({ ...form, admissionId: v })} />
                <div>
                  <Label className="text-xs text-slate-500">Case type *</Label>
                  <Select value={form.isMortality ? 'mortality' : 'morbidity'} onValueChange={(v) => setForm({ ...form, isMortality: v === 'mortality' })}>
                    <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morbidity">Morbidity (significant adverse event)</SelectItem>
                      <SelectItem value="mortality">Mortality (death)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Presentation summary</Label>
              <Textarea value={form.presentationSummary} onChange={(e) => setForm({ ...form, presentationSummary: e.target.value })}
                placeholder="Brief: how patient presented, key signs/symptoms…" className="min-h-[80px] rounded-lg" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Diagnosis</Label>
              <Input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                placeholder="Working / final diagnosis" className="rounded-lg" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Clinical course</Label>
              <Textarea value={form.clinicalCourse} onChange={(e) => setForm({ ...form, clinicalCourse: e.target.value })}
                placeholder="Treatment, complications, interventions…" className="min-h-[80px] rounded-lg" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Outcome</Label>
              <Input value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                placeholder="What happened — DAMA, expired, transferred, recovered…" className="rounded-lg" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Saving…' : 'Log for review'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========= sub-components =========

function StatCard({ label, value, sub, icon, tint, accent, loading }: {
  label: string; value: number | string; sub?: string; icon: React.ReactNode; tint: string; accent?: string; loading?: boolean;
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
        {sub && !loading && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      </CardContent>
    </Card>
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
