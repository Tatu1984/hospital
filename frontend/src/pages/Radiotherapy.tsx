// Radiotherapy — radiation treatment plans with fractionated delivery.
// Each plan has a totalDose, target fractions, and a stream of fraction
// records when the patient walks under the linac. Detail sheet handles
// per-fraction logging and plan completion.
//
// Backend: /api/radiotherapy.

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
import { Activity, Plus, Play, CheckCircle, Zap } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import MrnLink from '../components/MrnLink';

// -------------------- types --------------------

interface PatientLite { id: string; mrn: string; name: string }
interface DoctorLite { id: string; name: string }

interface Fraction {
  id: string;
  fractionNum: number;
  doseGy: number;
  deliveredAt: string;
  machine?: string | null;
  notes?: string | null;
}

interface Plan {
  id: string;
  patient?: PatientLite | null;
  patientId: string;
  technique: string;
  site: string;
  intent: string;
  totalDoseGy: number;
  fractions: number;
  dosePerFractionGy: number;
  status: string; // 'planned' | 'in_progress' | 'completed' | 'cancelled'
  oncologist?: DoctorLite | null;
  oncologistId?: string | null;
  fractionRecords?: Fraction[] | null;
  fractionsDelivered?: number | null;
  doseDeliveredGy?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
}

const TECHNIQUES = [
  { value: 'ebrt', label: 'EBRT' },
  { value: 'imrt', label: 'IMRT' },
  { value: 'vmat', label: 'VMAT' },
  { value: 'sbrt', label: 'SBRT' },
  { value: 'brachy', label: 'Brachytherapy' },
];

const TECHNIQUE_TINTS: Record<string, string> = {
  ebrt: 'bg-violet-50 text-violet-700 border-violet-200',
  imrt: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  vmat: 'bg-pink-50 text-pink-700 border-pink-200',
  sbrt: 'bg-red-50 text-red-700 border-red-200',
  brachy: 'bg-amber-50 text-amber-700 border-amber-200',
};

const INTENTS = [
  { value: 'curative', label: 'Curative' },
  { value: 'palliative', label: 'Palliative' },
  { value: 'adjuvant', label: 'Adjuvant' },
  { value: 'neoadjuvant', label: 'Neoadjuvant' },
];

const STATUS_TINTS: Record<string, string> = {
  planned: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

// -------------------- page --------------------

export default function Radiotherapy() {
  const toast = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [doctors, setDoctors] = useState<DoctorLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newOpen, setNewOpen] = useState(false);
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // forms
  const [newForm, setNewForm] = useState<any>(emptyNewForm());
  const [deliverForm, setDeliverForm] = useState<any>(emptyDeliverForm());

  function emptyNewForm() {
    return {
      patientId: '',
      technique: 'ebrt',
      site: '',
      intent: 'curative',
      totalDoseGy: '',
      fractions: '',
      dosePerFractionGy: '',
      oncologistId: '',
      notes: '',
    };
  }
  function emptyDeliverForm() {
    return { fractionNum: '', doseGy: '', machine: '', notes: '' };
  }

  // -------------------- load --------------------

  async function load() {
    setLoading(true);
    try {
      const [r, pa, dd] = await Promise.all([
        api.get('/api/radiotherapy').catch(() => ({ data: [] })),
        api.get('/api/patients', { params: { limit: 500 } }).catch(() => ({ data: [] })),
        api.get('/api/doctors').catch(() => ({ data: [] })),
      ]);
      setPlans(Array.isArray(r.data) ? r.data : []);
      const raw = Array.isArray(pa.data) ? pa.data : (pa.data?.items || []);
      setPatients(raw.map((x: any) => ({ id: x.id, mrn: x.mrn, name: x.name })));
      setDoctors((dd.data || []).map((x: any) => ({ id: x.id, name: x.name })));
    } catch (err: any) {
      toast.error('Could not load plans', err?.response?.data?.error || 'Try again');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  async function refreshPlan(id: string) {
    try {
      const r = await api.get('/api/radiotherapy', { params: { patientId: '' } });
      const list = Array.isArray(r.data) ? r.data : [];
      setPlans(list);
      const updated = list.find((p: Plan) => p.id === id);
      if (updated) setSelectedPlan(updated);
    } catch { /* ignore */ }
  }

  // -------------------- derived --------------------

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const stats = useMemo(() => {
    const activePlans = plans.filter((p) => p.status === 'in_progress' || p.status === 'planned').length;
    const completedThisMonth = plans.filter((p) =>
      p.status === 'completed' && p.completedAt && new Date(p.completedAt) >= startOfMonth
    ).length;
    let fractionsToday = 0;
    let totalDose = 0;
    let doseCount = 0;
    for (const p of plans) {
      for (const f of (p.fractionRecords || [])) {
        if (new Date(f.deliveredAt) >= today) fractionsToday++;
        totalDose += f.doseGy || 0;
        doseCount++;
      }
    }
    const meanDose = doseCount > 0 ? totalDose / doseCount : 0;
    return { activePlans, completedThisMonth, fractionsToday, meanDose };
  }, [plans]);

  // Group plans by status for the visual stack.
  const grouped = useMemo(() => {
    const byStatus: Record<string, Plan[]> = {};
    for (const p of plans) {
      const s = p.status || 'planned';
      if (!byStatus[s]) byStatus[s] = [];
      byStatus[s].push(p);
    }
    const order = ['in_progress', 'planned', 'completed', 'cancelled'];
    return order.filter((s) => byStatus[s]?.length).map((s) => ({ status: s, plans: byStatus[s] }));
  }, [plans]);

  // -------------------- handlers --------------------

  async function saveNew() {
    if (!newForm.patientId) { toast.error('Pick a patient'); return; }
    if (!newForm.site) { toast.error('Site required'); return; }
    const total = Number(newForm.totalDoseGy);
    const frx = Number(newForm.fractions);
    const dpf = Number(newForm.dosePerFractionGy);
    if (!(total > 0)) { toast.error('Total dose (Gy) required'); return; }
    if (!(frx > 0)) { toast.error('Number of fractions required'); return; }
    if (!(dpf > 0)) { toast.error('Dose per fraction required'); return; }
    if (Math.abs(total - frx * dpf) > 0.5) {
      toast.warning('Dose mismatch', `${frx} × ${dpf} = ${(frx * dpf).toFixed(2)} Gy doesn't match total ${total} Gy.`);
    }
    setSaving(true);
    try {
      const payload: any = {
        patientId: newForm.patientId,
        technique: newForm.technique,
        site: newForm.site,
        intent: newForm.intent,
        totalDoseGy: total,
        fractions: frx,
        dosePerFractionGy: dpf,
      };
      if (newForm.oncologistId) payload.oncologistId = newForm.oncologistId;
      if (newForm.notes) payload.notes = newForm.notes;
      await api.post('/api/radiotherapy', payload);
      setNewOpen(false);
      setNewForm(emptyNewForm());
      toast.success('Plan created');
      void load();
    } catch (e: any) {
      toast.error('Save failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function startPlan(p: Plan) {
    setSaving(true);
    try {
      await api.post(`/api/radiotherapy/${p.id}/start`);
      toast.success('Plan started');
      await load();
      void refreshPlan(p.id);
    } catch (e: any) {
      toast.error('Could not start', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function completePlan(p: Plan) {
    setSaving(true);
    try {
      await api.post(`/api/radiotherapy/${p.id}/complete`);
      toast.success('Plan completed');
      setPlanSheetOpen(false);
      void load();
    } catch (e: any) {
      toast.error('Complete failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function deliverFraction() {
    if (!selectedPlan) return;
    const fnum = Number(deliverForm.fractionNum);
    const dose = Number(deliverForm.doseGy);
    if (!(fnum > 0)) { toast.error('Fraction # required'); return; }
    if (!(dose > 0)) { toast.error('Dose (Gy) required'); return; }
    setSaving(true);
    try {
      const payload: any = { fractionNum: fnum, doseGy: dose };
      if (deliverForm.machine) payload.machine = deliverForm.machine;
      if (deliverForm.notes) payload.notes = deliverForm.notes;
      await api.post(`/api/radiotherapy/${selectedPlan.id}/deliver`, payload);
      setDeliverOpen(false);
      setDeliverForm(emptyDeliverForm());
      toast.success('Fraction delivered');
      await load();
      void refreshPlan(selectedPlan.id);
    } catch (e: any) {
      toast.error('Delivery save failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  function openDeliver(p: Plan) {
    const delivered = (p.fractionRecords || []).length;
    setDeliverForm({
      ...emptyDeliverForm(),
      fractionNum: String(delivered + 1),
      doseGy: String(p.dosePerFractionGy || ''),
    });
    setDeliverOpen(true);
  }

  // Auto-fill dosePerFractionGy as the user types totalDose and fractions.
  function recomputeDose(field: 'totalDoseGy' | 'fractions' | 'dosePerFractionGy', value: string) {
    const next = { ...newForm, [field]: value };
    const total = Number(next.totalDoseGy);
    const frx = Number(next.fractions);
    const dpf = Number(next.dosePerFractionGy);
    if (field !== 'dosePerFractionGy' && total > 0 && frx > 0) {
      next.dosePerFractionGy = +(total / frx).toFixed(2) as any;
    } else if (field === 'dosePerFractionGy' && total > 0 && dpf > 0) {
      next.fractions = String(Math.round(total / dpf)) as any;
    }
    setNewForm(next);
  }

  // -------------------- render --------------------

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center ring-1 ring-violet-100">
              <Activity className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Radiotherapy</h1>
              <p className="text-sm text-slate-500 mt-0.5">Radiation plans, fractionated delivery and machine logs</p>
            </div>
          </div>
          <Button onClick={() => { setNewForm(emptyNewForm()); setNewOpen(true); }}
            className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4" /> New plan
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active plans" value={stats.activePlans}
            icon={<Activity className="w-4 h-4 text-violet-600" />} tint="bg-violet-50 ring-violet-100"
            accent="text-violet-700" loading={loading} />
          <StatCard label="Completed this month" value={stats.completedThisMonth}
            icon={<CheckCircle className="w-4 h-4 text-emerald-600" />} tint="bg-emerald-50 ring-emerald-100"
            accent="text-emerald-700" loading={loading} />
          <StatCard label="Fractions today" value={stats.fractionsToday}
            icon={<Zap className="w-4 h-4 text-amber-600" />} tint="bg-amber-50 ring-amber-100"
            accent="text-amber-700" loading={loading} />
          <Card className="rounded-2xl border-slate-200/70 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Mean dose / fraction</div>
                <Zap className="w-4 h-4 text-slate-500" />
              </div>
              {loading
                ? <Skeleton className="h-8 w-16 mt-3" />
                : <div className="text-3xl font-semibold text-slate-900 mt-2 tracking-tight tabular-nums">{stats.meanDose.toFixed(2)} <span className="text-sm font-normal text-slate-500">Gy</span></div>}
            </CardContent>
          </Card>
        </div>

        {/* List grouped by status */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        ) : plans.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-12 text-center text-sm text-slate-500">No radiotherapy plans yet.</CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {grouped.map((g) => (
              <div key={g.status}>
                <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2 px-1">
                  {g.status.replace('_', ' ')} ({g.plans.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {g.plans.map((p) => {
                    const delivered = (p.fractionRecords || []).length || p.fractionsDelivered || 0;
                    const total = p.fractions || 0;
                    const pct = total > 0 ? Math.min(100, (delivered / total) * 100) : 0;
                    return (
                      <button key={p.id} onClick={() => { setSelectedPlan(p); setPlanSheetOpen(true); }}
                        className="text-left">
                        <Card className="rounded-2xl border-slate-200/70 shadow-sm hover:shadow-md transition-shadow">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <CardTitle className="text-base truncate">{p.patient?.name || 'Unknown patient'}</CardTitle>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  <MrnLink mrn={p.patient?.mrn} patientId={p.patient?.id} />
                                </p>
                              </div>
                              <Badge variant="outline" className={`text-[10px] font-normal ${TECHNIQUE_TINTS[p.technique] || ''}`}>
                                {p.technique.toUpperCase()}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-700">
                              <span className="text-slate-500">Site</span><span className="text-right">{p.site}</span>
                              <span className="text-slate-500">Intent</span><span className="text-right">{p.intent}</span>
                              <span className="text-slate-500">Total dose</span><span className="text-right tabular-nums">{p.totalDoseGy} Gy</span>
                              <span className="text-slate-500">Fractions</span><span className="text-right tabular-nums">{delivered} / {total}</span>
                            </div>
                            <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <Badge variant="outline" className={`text-[10px] font-normal ${STATUS_TINTS[p.status] || ''}`}>
                                {p.status.replace('_', ' ')}
                              </Badge>
                              <span className="text-[11px] text-slate-500 tabular-nums">{pct.toFixed(0)}%</span>
                            </div>
                          </CardContent>
                        </Card>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New plan dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>New radiotherapy plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-slate-500">Patient *</Label>
              <PatientPicker patients={patients} value={newForm.patientId}
                onChange={(p) => setNewForm({ ...newForm, patientId: p?.id || '' })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormSelect label="Technique *" value={newForm.technique}
                onChange={(v) => setNewForm({ ...newForm, technique: v })}
                options={TECHNIQUES} />
              <FormInput label="Site *" value={newForm.site}
                onChange={(v) => setNewForm({ ...newForm, site: v })}
                placeholder="e.g. left breast, prostate" />
              <FormSelect label="Intent *" value={newForm.intent}
                onChange={(v) => setNewForm({ ...newForm, intent: v })}
                options={INTENTS} />
              <div>
                <Label className="text-xs text-slate-500">Oncologist</Label>
                <Select value={newForm.oncologistId || '_'}
                  onValueChange={(v) => setNewForm({ ...newForm, oncologistId: v === '_' ? '' : v })}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">— None —</SelectItem>
                    {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <FormInput label="Total dose (Gy) *" type="number" value={newForm.totalDoseGy}
                onChange={(v) => recomputeDose('totalDoseGy', v)} />
              <FormInput label="Fractions *" type="number" value={newForm.fractions}
                onChange={(v) => recomputeDose('fractions', v)} />
              <FormInput label="Dose per fraction (Gy) *" type="number" value={newForm.dosePerFractionGy}
                onChange={(v) => recomputeDose('dosePerFractionGy', v)} />
              <div className="flex items-end text-xs text-slate-500">
                {newForm.totalDoseGy && newForm.fractions && newForm.dosePerFractionGy &&
                  `Verify: ${newForm.fractions} × ${newForm.dosePerFractionGy} ≈ ${(Number(newForm.fractions) * Number(newForm.dosePerFractionGy)).toFixed(2)} Gy`}
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Notes</Label>
              <Textarea value={newForm.notes}
                onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveNew} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
              {saving ? 'Saving…' : 'Create plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan detail Sheet */}
      <Sheet open={planSheetOpen} onOpenChange={(o) => { if (!o) setPlanSheetOpen(false); }}>
        <SheetContent width="max-w-xl">
          {selectedPlan && (() => {
            const delivered = (selectedPlan.fractionRecords || []).length;
            const total = selectedPlan.fractions || 0;
            const pct = total > 0 ? (delivered / total) * 100 : 0;
            const allDelivered = total > 0 && delivered >= total;
            return (
              <>
                <SheetHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 ring-1 ring-violet-100 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <SheetTitle>{selectedPlan.patient?.name || 'Plan'}</SheetTitle>
                      <SheetDescription>
                        MRN {selectedPlan.patient?.mrn} · {selectedPlan.site} · {selectedPlan.technique.toUpperCase()}
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>
                <SheetBody>
                  <div className="space-y-4">
                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/40">
                      <div className="grid grid-cols-2 gap-y-1.5 text-sm text-slate-700">
                        <span className="text-slate-500">Status</span>
                        <span className="text-right">
                          <Badge variant="outline" className={`text-[10px] font-normal ${STATUS_TINTS[selectedPlan.status] || ''}`}>
                            {selectedPlan.status.replace('_', ' ')}
                          </Badge>
                        </span>
                        <span className="text-slate-500">Intent</span><span className="text-right">{selectedPlan.intent}</span>
                        <span className="text-slate-500">Total dose</span><span className="text-right tabular-nums">{selectedPlan.totalDoseGy} Gy</span>
                        <span className="text-slate-500">Per fraction</span><span className="text-right tabular-nums">{selectedPlan.dosePerFractionGy} Gy</span>
                        <span className="text-slate-500">Fractions</span><span className="text-right tabular-nums">{delivered} / {total}</span>
                      </div>
                      <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    {selectedPlan.status === 'planned' && (
                      <Button onClick={() => startPlan(selectedPlan)} disabled={saving}
                        className="w-full gap-2 bg-slate-900 hover:bg-slate-800">
                        <Play className="w-4 h-4" /> Start plan
                      </Button>
                    )}

                    {selectedPlan.status === 'in_progress' && !allDelivered && (
                      <Button onClick={() => openDeliver(selectedPlan)}
                        className="w-full gap-2 bg-slate-900 hover:bg-slate-800">
                        <Zap className="w-4 h-4" /> Deliver fraction
                      </Button>
                    )}

                    {(selectedPlan.status === 'in_progress' && allDelivered) && (
                      <Button onClick={() => completePlan(selectedPlan)} disabled={saving}
                        className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <CheckCircle className="w-4 h-4" /> Complete plan
                      </Button>
                    )}

                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                        Fraction history ({delivered})
                      </div>
                      {delivered === 0 ? (
                        <p className="text-sm text-slate-500 italic">No fractions delivered yet.</p>
                      ) : (
                        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                          {(selectedPlan.fractionRecords || []).map((f) => (
                            <div key={f.id} className="border border-slate-100 rounded-xl p-2.5 bg-slate-50/40 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-slate-900">Fx #{f.fractionNum} · {f.doseGy} Gy</span>
                                <span className="text-slate-500">{new Date(f.deliveredAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                              </div>
                              {f.machine && <div className="text-slate-500 mt-0.5">Machine: {f.machine}</div>}
                              {f.notes && <div className="text-slate-600 mt-0.5">{f.notes}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedPlan.notes && (
                      <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/40 text-xs whitespace-pre-wrap">
                        {selectedPlan.notes}
                      </div>
                    )}
                  </div>
                </SheetBody>
                <SheetFooter>
                  <Button variant="outline" onClick={() => setPlanSheetOpen(false)}>Close</Button>
                </SheetFooter>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Deliver fraction dialog */}
      <Dialog open={deliverOpen} onOpenChange={setDeliverOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Deliver fraction</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Fraction # *" type="number" value={deliverForm.fractionNum}
                onChange={(v) => setDeliverForm({ ...deliverForm, fractionNum: v })} />
              <FormInput label="Dose (Gy) *" type="number" value={deliverForm.doseGy}
                onChange={(v) => setDeliverForm({ ...deliverForm, doseGy: v })} />
            </div>
            <FormInput label="Machine" value={deliverForm.machine}
              onChange={(v) => setDeliverForm({ ...deliverForm, machine: v })}
              placeholder="e.g. Linac-1" />
            <div>
              <Label className="text-xs text-slate-500">Notes</Label>
              <Textarea value={deliverForm.notes}
                onChange={(e) => setDeliverForm({ ...deliverForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliverOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={deliverFraction} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
              {saving ? 'Saving…' : 'Save fraction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =====================================================================

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
      <Select value={value || '_'} onValueChange={onChange}>
        <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function PatientPicker({ patients, value, onChange }: { patients: PatientLite[]; value: string; onChange: (p: PatientLite | null) => void }) {
  const [q, setQ] = useState('');
  const selected = patients.find(p => p.id === value);
  if (selected) {
    return (
      <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-2.5 bg-slate-50/60">
        <div className="flex-1 text-sm">
          <span className="font-medium text-slate-900">{selected.name}</span>{' '}
          <span className="text-slate-500 text-xs">({selected.mrn})</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => { onChange(null); setQ(''); }} className="h-7">Change</Button>
      </div>
    );
  }
  const filtered = q.trim()
    ? patients.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || (p.mrn || '').toLowerCase().includes(q.toLowerCase())).slice(0, 12)
    : [];
  return (
    <div className="relative">
      <Input placeholder="Type name or MRN…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-lg" />
      {filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-10">
          {filtered.map(p => (
            <button key={p.id} type="button"
              onClick={() => { onChange(p); setQ(''); }}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-b-0">
              <div className="font-medium text-slate-900">{p.name}</div>
              <div className="text-xs text-slate-500">{p.mrn}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
