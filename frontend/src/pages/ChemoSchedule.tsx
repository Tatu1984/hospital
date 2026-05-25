// Chemotherapy — two-tab view: regimen library (Protocols) and the
// patient cycle calendar (Cycles). Each cycle threads through start →
// complete / delay actions. Drug doses are stored as JSON arrays so a
// protocol-level row editor keeps the data model clean.
//
// Backend: /api/chemo/{protocols,cycles}.

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Activity, Plus, FlaskConical, CalendarClock, Play, CheckCircle, Clock, Trash2,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import MrnLink from '../components/MrnLink';

// -------------------- types --------------------

interface PatientLite { id: string; mrn: string; name: string }

interface DrugSpec {
  drug: string;
  doseMgPerSqM?: number | string;
  route?: string;
  day?: number | string;
  infusionMin?: number | string;
}

interface Protocol {
  id: string;
  name: string;
  abbreviation?: string | null;
  indication: string;
  cycleLength: number;
  totalCycles: number;
  drugs: DrugSpec[];
  premedications?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

interface Cycle {
  id: string;
  patient?: PatientLite | null;
  patientId: string;
  protocolId: string;
  protocol?: Protocol | null;
  cycleNumber: number;
  scheduledDate: string;
  status: string; // 'scheduled' | 'in_progress' | 'completed' | 'delayed' | 'cancelled'
  bsa?: number | null;
  doses?: any | null;
  preLabs?: any | null;
  toxicities?: any | null;
  notes?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

const STATUS_TINTS: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  delayed: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

// -------------------- helpers --------------------

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const diff = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}

function fmtShort(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// -------------------- page --------------------

export default function ChemoSchedule() {
  const toast = useToast();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // dialogs
  const [protocolDialogOpen, setProtocolDialogOpen] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<Protocol | null>(null);
  const [cycleDialogOpen, setCycleDialogOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [delayOpen, setDelayOpen] = useState(false);

  const [expandedProtocol, setExpandedProtocol] = useState<string | null>(null);

  // forms
  const [protocolForm, setProtocolForm] = useState<any>(emptyProtocolForm());
  const [scheduleForm, setScheduleForm] = useState<any>(emptyScheduleForm());
  const [completeForm, setCompleteForm] = useState<any>({ toxicities: '', notes: '' });
  const [delayForm, setDelayForm] = useState<any>({ rescheduledTo: '', reason: '' });

  function emptyProtocolForm() {
    return {
      name: '',
      abbreviation: '',
      indication: '',
      cycleLength: '21',
      totalCycles: '6',
      premedications: '',
      notes: '',
      drugs: [{ drug: '', doseMgPerSqM: '', route: 'IV', day: '1', infusionMin: '' }] as DrugSpec[],
    };
  }
  function emptyScheduleForm() {
    return {
      patientId: '',
      protocolId: '',
      cycleNumber: '1',
      scheduledDate: new Date().toISOString().slice(0, 10),
      bsa: '',
      preLabs: '',
      notes: '',
      doses: '',
    };
  }

  // -------------------- load --------------------

  async function load() {
    setLoading(true);
    try {
      const [pr, cy, pa] = await Promise.all([
        api.get('/api/chemo/protocols').catch(() => ({ data: [] })),
        api.get('/api/chemo/cycles').catch(() => ({ data: [] })),
        api.get('/api/patients', { params: { limit: 500 } }).catch(() => ({ data: [] })),
      ]);
      setProtocols((Array.isArray(pr.data) ? pr.data : []).map((p: any) => ({
        ...p,
        drugs: Array.isArray(p.drugs) ? p.drugs : (typeof p.drugs === 'string' ? safeParse(p.drugs) : []),
      })));
      setCycles(Array.isArray(cy.data) ? cy.data : []);
      const raw = Array.isArray(pa.data) ? pa.data : (pa.data?.items || []);
      setPatients(raw.map((x: any) => ({ id: x.id, mrn: x.mrn, name: x.name })));
    } catch (err: any) {
      toast.error('Could not load chemo data', err?.response?.data?.error || 'Try again');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  function safeParse(s: string): any[] {
    try { const x = JSON.parse(s); return Array.isArray(x) ? x : []; } catch { return []; }
  }

  // -------------------- protocol flow --------------------

  function openNewProtocol() {
    setEditingProtocol(null);
    setProtocolForm(emptyProtocolForm());
    setProtocolDialogOpen(true);
  }
  function openEditProtocol(p: Protocol) {
    setEditingProtocol(p);
    setProtocolForm({
      name: p.name,
      abbreviation: p.abbreviation || '',
      indication: p.indication,
      cycleLength: String(p.cycleLength),
      totalCycles: String(p.totalCycles),
      premedications: p.premedications || '',
      notes: p.notes || '',
      drugs: (p.drugs && p.drugs.length > 0)
        ? p.drugs.map((d) => ({ ...d }))
        : [{ drug: '', doseMgPerSqM: '', route: 'IV', day: '1', infusionMin: '' }],
    });
    setProtocolDialogOpen(true);
  }

  async function saveProtocol() {
    if (!protocolForm.name.trim()) { toast.error('Protocol name required'); return; }
    if (!protocolForm.indication.trim()) { toast.error('Indication required'); return; }
    setSaving(true);
    try {
      const drugs = (protocolForm.drugs as DrugSpec[])
        .filter((d) => (d.drug || '').trim())
        .map((d) => ({
          drug: String(d.drug).trim(),
          doseMgPerSqM: d.doseMgPerSqM === '' ? null : Number(d.doseMgPerSqM),
          route: d.route || 'IV',
          day: d.day === '' ? 1 : Number(d.day),
          infusionMin: d.infusionMin === '' ? null : Number(d.infusionMin),
        }));
      const payload: any = {
        name: protocolForm.name.trim(),
        abbreviation: protocolForm.abbreviation || undefined,
        indication: protocolForm.indication.trim(),
        cycleLength: Number(protocolForm.cycleLength) || 21,
        totalCycles: Number(protocolForm.totalCycles) || 6,
        drugs,
        premedications: protocolForm.premedications || undefined,
        notes: protocolForm.notes || undefined,
      };
      if (editingProtocol) {
        await api.put(`/api/chemo/protocols/${editingProtocol.id}`, payload);
        toast.success('Protocol updated');
      } else {
        await api.post('/api/chemo/protocols', payload);
        toast.success('Protocol added');
      }
      setProtocolDialogOpen(false);
      void load();
    } catch (e: any) {
      toast.error('Save failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  function addDrugRow() {
    setProtocolForm({
      ...protocolForm,
      drugs: [...protocolForm.drugs, { drug: '', doseMgPerSqM: '', route: 'IV', day: '1', infusionMin: '' }],
    });
  }
  function removeDrugRow(idx: number) {
    setProtocolForm({
      ...protocolForm,
      drugs: protocolForm.drugs.filter((_: any, i: number) => i !== idx),
    });
  }
  function updateDrug(idx: number, key: keyof DrugSpec, val: any) {
    const next = [...protocolForm.drugs];
    next[idx] = { ...next[idx], [key]: val };
    setProtocolForm({ ...protocolForm, drugs: next });
  }

  // -------------------- cycle flow --------------------

  async function saveSchedule() {
    if (!scheduleForm.patientId) { toast.error('Pick a patient'); return; }
    if (!scheduleForm.protocolId) { toast.error('Pick a protocol'); return; }
    if (!scheduleForm.scheduledDate) { toast.error('Scheduled date required'); return; }
    setSaving(true);
    try {
      const payload: any = {
        patientId: scheduleForm.patientId,
        protocolId: scheduleForm.protocolId,
        cycleNumber: Number(scheduleForm.cycleNumber) || 1,
        scheduledDate: scheduleForm.scheduledDate,
        bsa: scheduleForm.bsa === '' ? null : Number(scheduleForm.bsa),
      };
      // doses / preLabs accept JSON text — only attach when parseable.
      if (scheduleForm.doses) { try { payload.doses = JSON.parse(scheduleForm.doses); } catch { /* ignore */ } }
      if (scheduleForm.preLabs) { try { payload.preLabs = JSON.parse(scheduleForm.preLabs); } catch { /* ignore */ } }
      if (scheduleForm.notes) payload.notes = scheduleForm.notes;
      await api.post('/api/chemo/cycles', payload);
      setScheduleOpen(false);
      setScheduleForm(emptyScheduleForm());
      toast.success('Cycle scheduled');
      void load();
    } catch (e: any) {
      toast.error('Schedule failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function startCycle(c: Cycle) {
    setSaving(true);
    try {
      await api.post(`/api/chemo/cycles/${c.id}/start`);
      toast.success('Cycle started');
      const next = { ...c, status: 'in_progress', startedAt: new Date().toISOString() };
      setSelectedCycle(next);
      void load();
    } catch (e: any) {
      toast.error('Could not start cycle', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function completeCycle(c: Cycle) {
    setSaving(true);
    try {
      const payload: any = {};
      if (completeForm.toxicities) {
        try { payload.toxicities = JSON.parse(completeForm.toxicities); } catch { payload.toxicities = completeForm.toxicities; }
      }
      if (completeForm.notes) payload.notes = completeForm.notes;
      await api.post(`/api/chemo/cycles/${c.id}/complete`, payload);
      toast.success('Cycle completed');
      setCycleDialogOpen(false);
      void load();
    } catch (e: any) {
      toast.error('Complete failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function delayCycle(c: Cycle) {
    if (!delayForm.rescheduledTo) { toast.error('Pick a new date'); return; }
    setSaving(true);
    try {
      await api.post(`/api/chemo/cycles/${c.id}/delay`, {
        rescheduledTo: delayForm.rescheduledTo,
        reason: delayForm.reason || undefined,
      });
      toast.success('Cycle delayed');
      setDelayOpen(false);
      setDelayForm({ rescheduledTo: '', reason: '' });
      setCycleDialogOpen(false);
      void load();
    } catch (e: any) {
      toast.error('Delay failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  // -------------------- derived --------------------

  const protocolById = useMemo(() => {
    const m = new Map<string, Protocol>();
    for (const p of protocols) m.set(p.id, p);
    return m;
  }, [protocols]);

  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const scheduledThisWeek = cycles.filter((c) => {
      const d = new Date(c.scheduledDate);
      return d >= weekStart && d < weekEnd;
    }).length;
    const completedThisMonth = cycles.filter((c) =>
      c.status === 'completed' && c.completedAt && new Date(c.completedAt) >= monthStart
    ).length;
    const delayed = cycles.filter((c) => c.status === 'delayed').length;
    return { scheduledThisWeek, completedThisMonth, delayed };
  }, [cycles]);

  // Group cycles by week of scheduled date.
  const grouped = useMemo(() => {
    const m = new Map<string, Cycle[]>();
    for (const c of cycles) {
      const w = startOfWeek(new Date(c.scheduledDate));
      const key = w.toISOString().slice(0, 10);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(c);
    }
    return Array.from(m.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, list]) => ({
        key,
        weekStart: new Date(key),
        cycles: list.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)),
      }));
  }, [cycles]);

  // -------------------- render --------------------

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 flex items-center justify-center ring-1 ring-fuchsia-100">
              <Activity className="w-6 h-6 text-fuchsia-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Chemotherapy</h1>
              <p className="text-sm text-slate-500 mt-0.5">Regimen library, cycle calendar and toxicity tracking</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="cycles">
          <TabsList>
            <TabsTrigger value="cycles">Cycles ({cycles.length})</TabsTrigger>
            <TabsTrigger value="protocols">Protocols ({protocols.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="cycles" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard label="Scheduled this week" value={stats.scheduledThisWeek}
                icon={<CalendarClock className="w-4 h-4 text-blue-600" />} tint="bg-blue-50 ring-blue-100"
                accent="text-blue-700" loading={loading} />
              <StatCard label="Completed this month" value={stats.completedThisMonth}
                icon={<CheckCircle className="w-4 h-4 text-emerald-600" />} tint="bg-emerald-50 ring-emerald-100"
                accent="text-emerald-700" loading={loading} />
              <StatCard label="Delayed" value={stats.delayed}
                icon={<Clock className="w-4 h-4 text-red-600" />} tint="bg-red-50 ring-red-100"
                accent="text-red-700" loading={loading} />
            </div>

            <Card className="rounded-2xl border-slate-200/70 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-base text-slate-900">Cycle schedule</CardTitle>
                  <Button onClick={() => { setScheduleForm(emptyScheduleForm()); setScheduleOpen(true); }}
                    className="gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800">
                    <Plus className="w-4 h-4" /> Schedule cycle
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
                  </div>
                ) : grouped.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-500">
                    No cycles scheduled yet.
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {grouped.map((g) => (
                      <div key={g.key}>
                        <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2 px-2">
                          Week of {g.weekStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="space-y-2">
                          {g.cycles.map((c) => {
                            const proto = c.protocol || protocolById.get(c.protocolId);
                            return (
                              <button key={c.id}
                                onClick={() => {
                                  setSelectedCycle(c);
                                  setCompleteForm({ toxicities: '', notes: '' });
                                  setCycleDialogOpen(true);
                                }}
                                className="w-full flex items-center gap-3 border border-slate-100 rounded-xl p-3 bg-slate-50/40 hover:bg-slate-50 text-left">
                                <div className="w-9 h-9 rounded-lg bg-fuchsia-50 ring-1 ring-fuchsia-100 flex items-center justify-center shrink-0">
                                  <FlaskConical className="w-4 h-4 text-fuchsia-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-slate-900 truncate">{c.patient?.name || 'Unknown patient'}</span>
                                    <MrnLink mrn={c.patient?.mrn} patientId={c.patient?.id} />
                                    {proto && (
                                      <Badge variant="outline" className="text-[10px] font-normal bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200">
                                        {proto.abbreviation || proto.name}
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className={`text-[10px] font-normal ${STATUS_TINTS[c.status] || ''}`}>
                                      {c.status.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    Cycle {c.cycleNumber}{proto ? ` of ${proto.totalCycles}` : ''} · {fmtShort(c.scheduledDate)}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="protocols" className="mt-4 space-y-4">
            <div className="flex items-center justify-end">
              <Button onClick={openNewProtocol} className="gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800">
                <Plus className="w-4 h-4" /> New protocol
              </Button>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
              </div>
            ) : protocols.length === 0 ? (
              <Card className="rounded-2xl">
                <CardContent className="py-12 text-center text-sm text-slate-500">No protocols yet.</CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {protocols.map((p) => {
                  const expanded = expandedProtocol === p.id;
                  return (
                    <Card key={p.id} className="rounded-2xl border-slate-200/70 shadow-sm">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">
                              {p.name}
                              {p.abbreviation && <span className="text-slate-500 font-normal text-sm ml-2">({p.abbreviation})</span>}
                            </CardTitle>
                            <p className="text-xs text-slate-500 mt-1">{p.indication}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-normal bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200">
                            {p.drugs.length} drug{p.drugs.length === 1 ? '' : 's'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 text-xs gap-y-1 text-slate-700">
                          <span>Cycle length <span className="tabular-nums">{p.cycleLength}d</span></span>
                          <span>Total cycles <span className="tabular-nums">{p.totalCycles}</span></span>
                        </div>
                        {expanded && (
                          <div className="mt-3 border border-slate-100 rounded-lg overflow-hidden text-xs">
                            <table className="w-full">
                              <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                  <th className="text-left px-2 py-1.5">Drug</th>
                                  <th className="text-right px-2 py-1.5">Dose (mg/m²)</th>
                                  <th className="text-left px-2 py-1.5">Route</th>
                                  <th className="text-right px-2 py-1.5">Day</th>
                                  <th className="text-right px-2 py-1.5">Inf (min)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(p.drugs || []).map((d, i) => (
                                  <tr key={i} className="border-t border-slate-100">
                                    <td className="px-2 py-1.5">{d.drug}</td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">{d.doseMgPerSqM ?? '—'}</td>
                                    <td className="px-2 py-1.5">{d.route || '—'}</td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">{d.day ?? '—'}</td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">{d.infusionMin ?? '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <Button size="sm" variant="outline" onClick={() => setExpandedProtocol(expanded ? null : p.id)}>
                            {expanded ? 'Hide drugs' : 'View drugs'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEditProtocol(p)}>Edit</Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* New / Edit protocol dialog */}
      <Dialog open={protocolDialogOpen} onOpenChange={setProtocolDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingProtocol ? 'Edit protocol' : 'New protocol'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Name *" value={protocolForm.name}
                onChange={(v) => setProtocolForm({ ...protocolForm, name: v })} />
              <FormInput label="Abbreviation" value={protocolForm.abbreviation}
                onChange={(v) => setProtocolForm({ ...protocolForm, abbreviation: v })} />
              <FormInput label="Indication *" value={protocolForm.indication}
                onChange={(v) => setProtocolForm({ ...protocolForm, indication: v })} />
              <div />
              <FormInput label="Cycle length (days) *" type="number" value={protocolForm.cycleLength}
                onChange={(v) => setProtocolForm({ ...protocolForm, cycleLength: v })} />
              <FormInput label="Total cycles *" type="number" value={protocolForm.totalCycles}
                onChange={(v) => setProtocolForm({ ...protocolForm, totalCycles: v })} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Premedications</Label>
              <Textarea value={protocolForm.premedications}
                onChange={(e) => setProtocolForm({ ...protocolForm, premedications: e.target.value })} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Drugs</Label>
                <Button size="sm" variant="outline" onClick={addDrugRow} className="gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add drug
                </Button>
              </div>
              <div className="space-y-2">
                {protocolForm.drugs.map((d: DrugSpec, idx: number) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border border-slate-100 rounded-xl p-2.5 bg-slate-50/40">
                    <div className="col-span-3">
                      <Label className="text-[10px] text-slate-500">Drug</Label>
                      <Input value={d.drug} onChange={(e) => updateDrug(idx, 'drug', e.target.value)} className="rounded-lg" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[10px] text-slate-500">Dose (mg/m²)</Label>
                      <Input type="number" value={d.doseMgPerSqM ?? ''} onChange={(e) => updateDrug(idx, 'doseMgPerSqM', e.target.value)} className="rounded-lg" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[10px] text-slate-500">Route</Label>
                      <Select value={d.route || 'IV'} onValueChange={(v) => updateDrug(idx, 'route', v)}>
                        <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IV">IV</SelectItem>
                          <SelectItem value="PO">PO</SelectItem>
                          <SelectItem value="SC">SC</SelectItem>
                          <SelectItem value="IM">IM</SelectItem>
                          <SelectItem value="IT">IT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[10px] text-slate-500">Day</Label>
                      <Input type="number" value={d.day ?? ''} onChange={(e) => updateDrug(idx, 'day', e.target.value)} className="rounded-lg" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[10px] text-slate-500">Inf (min)</Label>
                      <Input type="number" value={d.infusionMin ?? ''} onChange={(e) => updateDrug(idx, 'infusionMin', e.target.value)} className="rounded-lg" />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button size="sm" variant="ghost" onClick={() => removeDrugRow(idx)} className="text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Notes</Label>
              <Textarea value={protocolForm.notes}
                onChange={(e) => setProtocolForm({ ...protocolForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProtocolDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveProtocol} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
              {saving ? 'Saving…' : (editingProtocol ? 'Update protocol' : 'Add protocol')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule cycle dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Schedule cycle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-slate-500">Patient *</Label>
              <PatientPicker patients={patients} value={scheduleForm.patientId}
                onChange={(p) => setScheduleForm({ ...scheduleForm, patientId: p?.id || '' })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Protocol *</Label>
                <Select value={scheduleForm.protocolId || '_'}
                  onValueChange={(v) => setScheduleForm({ ...scheduleForm, protocolId: v === '_' ? '' : v })}>
                  <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select protocol" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">— Select —</SelectItem>
                    {protocols.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.abbreviation || p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FormInput label="Cycle number *" type="number" value={scheduleForm.cycleNumber}
                onChange={(v) => setScheduleForm({ ...scheduleForm, cycleNumber: v })} />
              <FormInput label="Scheduled date *" type="date" value={scheduleForm.scheduledDate}
                onChange={(v) => setScheduleForm({ ...scheduleForm, scheduledDate: v })} />
              <FormInput label="BSA (m²)" type="number" value={scheduleForm.bsa}
                onChange={(v) => setScheduleForm({ ...scheduleForm, bsa: v })} placeholder="Auto-compute from vitals if known" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Per-drug dose adjustments (JSON, optional)</Label>
              <Textarea value={scheduleForm.doses}
                onChange={(e) => setScheduleForm({ ...scheduleForm, doses: e.target.value })}
                placeholder='[{"drug":"Cisplatin","actualDoseMg":120}]' />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Pre-labs (JSON, optional)</Label>
              <Textarea value={scheduleForm.preLabs}
                onChange={(e) => setScheduleForm({ ...scheduleForm, preLabs: e.target.value })}
                placeholder='{"hb":11.2,"wbc":4200,"plt":180000,"anc":2100}' />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Notes</Label>
              <Textarea value={scheduleForm.notes}
                onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveSchedule} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
              {saving ? 'Saving…' : 'Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cycle detail sheet */}
      <Sheet open={cycleDialogOpen} onOpenChange={(o) => { if (!o) setCycleDialogOpen(false); }}>
        <SheetContent width="max-w-xl">
          {selectedCycle && (() => {
            const proto = selectedCycle.protocol || protocolById.get(selectedCycle.protocolId);
            return (
              <>
                <SheetHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-fuchsia-50 ring-1 ring-fuchsia-100 flex items-center justify-center">
                      <FlaskConical className="w-5 h-5 text-fuchsia-600" />
                    </div>
                    <div className="flex-1">
                      <SheetTitle>{selectedCycle.patient?.name || 'Cycle'}</SheetTitle>
                      <SheetDescription>
                        {proto?.abbreviation || proto?.name} · Cycle {selectedCycle.cycleNumber}
                        {proto && ` of ${proto.totalCycles}`} · {fmtShort(selectedCycle.scheduledDate)}
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>
                <SheetBody>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs font-normal ${STATUS_TINTS[selectedCycle.status] || ''}`}>
                        {selectedCycle.status.replace('_', ' ')}
                      </Badge>
                      {selectedCycle.bsa != null && <span className="text-xs text-slate-500">BSA {selectedCycle.bsa} m²</span>}
                    </div>

                    {proto && (
                      <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/40">
                        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Protocol drugs</div>
                        <table className="w-full text-xs">
                          <thead className="text-slate-500">
                            <tr>
                              <th className="text-left py-1">Drug</th>
                              <th className="text-right py-1">Dose</th>
                              <th className="text-left py-1">Route</th>
                              <th className="text-right py-1">Day</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(proto.drugs || []).map((d, i) => (
                              <tr key={i} className="border-t border-slate-100">
                                <td className="py-1">{d.drug}</td>
                                <td className="py-1 text-right tabular-nums">{d.doseMgPerSqM ?? '—'}</td>
                                <td className="py-1">{d.route || '—'}</td>
                                <td className="py-1 text-right tabular-nums">{d.day ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {selectedCycle.status === 'scheduled' && (
                      <Button onClick={() => startCycle(selectedCycle)} disabled={saving} className="w-full gap-2 bg-slate-900 hover:bg-slate-800">
                        <Play className="w-4 h-4" /> Start cycle
                      </Button>
                    )}

                    {selectedCycle.status === 'in_progress' && (
                      <div className="space-y-3 border border-slate-100 rounded-xl p-3">
                        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Complete cycle</div>
                        <div>
                          <Label className="text-xs text-slate-500">Toxicities (JSON or free text)</Label>
                          <Textarea value={completeForm.toxicities}
                            onChange={(e) => setCompleteForm({ ...completeForm, toxicities: e.target.value })}
                            placeholder='[{"name":"neutropenia","grade":2}]' />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Notes</Label>
                          <Textarea value={completeForm.notes}
                            onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })} />
                        </div>
                        <Button onClick={() => completeCycle(selectedCycle)} disabled={saving}
                          className="w-full gap-2 bg-slate-900 hover:bg-slate-800">
                          <CheckCircle className="w-4 h-4" /> Mark complete
                        </Button>
                      </div>
                    )}

                    {(selectedCycle.status === 'scheduled' || selectedCycle.status === 'in_progress') && (
                      <Button variant="outline" onClick={() => { setDelayForm({ rescheduledTo: '', reason: '' }); setDelayOpen(true); }} className="w-full gap-2">
                        <Clock className="w-4 h-4" /> Delay cycle
                      </Button>
                    )}

                    {selectedCycle.notes && (
                      <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/40 text-xs whitespace-pre-wrap">
                        {selectedCycle.notes}
                      </div>
                    )}
                  </div>
                </SheetBody>
                <SheetFooter>
                  <Button variant="outline" onClick={() => setCycleDialogOpen(false)}>Close</Button>
                </SheetFooter>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Delay dialog */}
      <Dialog open={delayOpen} onOpenChange={setDelayOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delay cycle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <FormInput label="Rescheduled to *" type="date" value={delayForm.rescheduledTo}
              onChange={(v) => setDelayForm({ ...delayForm, rescheduledTo: v })} />
            <div>
              <Label className="text-xs text-slate-500">Reason</Label>
              <Textarea value={delayForm.reason}
                onChange={(e) => setDelayForm({ ...delayForm, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelayOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={() => selectedCycle && delayCycle(selectedCycle)} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
              {saving ? 'Saving…' : 'Delay'}
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
