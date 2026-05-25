// Cardiology — Cath Lab procedure register. Schedule → start → complete
// lifecycle with findings, implants list, contrast volume, fluoroscopy
// time and complications captured at completion.
//
// Backend: /api/cath.

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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Heart, Plus, Play, CheckCircle, Activity, Calendar, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import MrnLink from '../components/MrnLink';

// -------------------- types --------------------

interface PatientLite { id: string; mrn: string; name: string }
interface DoctorLite { id: string; name: string }

interface CathProc {
  id: string;
  patient?: PatientLite | null;
  patientId: string;
  procedureType: string;
  indication?: string | null;
  approach?: string | null;
  vesselsInvolved?: string[] | null;
  findings?: string | null;
  interventionDetails?: string | null;
  implants?: any[] | null;
  contrastVolumeMl?: number | null;
  fluoroscopyMinutes?: number | null;
  complications?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  outcome?: string | null;
  status: string; // 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  cardiologist?: DoctorLite | null;
  cardiologistId?: string | null;
  scrubNurse?: DoctorLite | null;
  scrubNurseId?: string | null;
  notes?: string | null;
}

const PROCEDURE_TYPES = [
  { value: 'diagnostic_angio', label: 'Diagnostic angiography' },
  { value: 'ptca', label: 'PTCA (balloon angioplasty)' },
  { value: 'pci_stent', label: 'PCI with stent' },
  { value: 'rfa', label: 'Radiofrequency ablation' },
  { value: 'pacemaker', label: 'Pacemaker implant' },
  { value: 'icd', label: 'ICD implant' },
  { value: 'crt', label: 'CRT implant' },
  { value: 'tavr', label: 'TAVR' },
  { value: 'asd_closure', label: 'ASD closure' },
  { value: 'other', label: 'Other' },
];

const APPROACHES = [
  { value: 'radial', label: 'Radial' },
  { value: 'femoral', label: 'Femoral' },
  { value: 'brachial', label: 'Brachial' },
  { value: 'ulnar', label: 'Ulnar' },
];

const VESSELS = ['LAD', 'RCA', 'LCx', 'LMCA', 'OM', 'D1', 'D2', 'PDA', 'PLB'];

const OUTCOMES = [
  { value: 'successful', label: 'Successful' },
  { value: 'partial', label: 'Partial success' },
  { value: 'failed', label: 'Failed' },
  { value: 'aborted', label: 'Aborted' },
];

const STATUS_TINTS: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

const APPROACH_TINTS: Record<string, string> = {
  radial: 'bg-rose-50 text-rose-700 border-rose-200',
  femoral: 'bg-violet-50 text-violet-700 border-violet-200',
  brachial: 'bg-blue-50 text-blue-700 border-blue-200',
  ulnar: 'bg-slate-100 text-slate-700 border-slate-200',
};

// -------------------- page --------------------

export default function CathLab() {
  const toast = useToast();
  const [list, setList] = useState<CathProc[]>([]);
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [doctors, setDoctors] = useState<DoctorLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [activeProc, setActiveProc] = useState<CathProc | null>(null);

  // forms
  const [scheduleForm, setScheduleForm] = useState<any>(emptyScheduleForm());
  const [completeForm, setCompleteForm] = useState<any>(emptyCompleteForm());

  function emptyScheduleForm() {
    return {
      patientId: '',
      procedureType: 'diagnostic_angio',
      indication: '',
      approach: 'radial',
      vesselsInvolved: [] as string[],
      cardiologistId: '',
      scrubNurseId: '',
      startAt: '',
      notes: '',
    };
  }
  function emptyCompleteForm() {
    return {
      outcome: 'successful',
      findings: '',
      interventionDetails: '',
      complications: '',
      contrastVolumeMl: '',
      fluoroscopyMinutes: '',
      implants: [] as any[],
    };
  }

  // -------------------- load --------------------

  async function load() {
    setLoading(true);
    try {
      const [c, pa, dd] = await Promise.all([
        api.get('/api/cath').catch(() => ({ data: [] })),
        api.get('/api/patients', { params: { limit: 500 } }).catch(() => ({ data: [] })),
        api.get('/api/doctors').catch(() => ({ data: [] })),
      ]);
      setList(Array.isArray(c.data) ? c.data : []);
      const raw = Array.isArray(pa.data) ? pa.data : (pa.data?.items || []);
      setPatients(raw.map((x: any) => ({ id: x.id, mrn: x.mrn, name: x.name })));
      setDoctors((dd.data || []).map((x: any) => ({ id: x.id, name: x.name })));
    } catch (err: any) {
      toast.error('Could not load procedures', err?.response?.data?.error || 'Try again');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  // -------------------- derived --------------------

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const stats = useMemo(() => {
    const todayCount = list.filter((c) => c.startAt && new Date(c.startAt) >= today).length;
    const inProgress = list.filter((c) => c.status === 'in_progress').length;
    const completedThisMonth = list.filter((c) =>
      c.status === 'completed' && c.endAt && new Date(c.endAt) >= startOfMonth
    ).length;
    const radial = list.filter((c) => c.approach === 'radial').length;
    const femoral = list.filter((c) => c.approach === 'femoral').length;
    return { todayCount, inProgress, completedThisMonth, radial, femoral };
  }, [list]);

  // -------------------- handlers --------------------

  async function saveSchedule() {
    if (!scheduleForm.patientId) { toast.error('Pick a patient'); return; }
    if (!scheduleForm.procedureType) { toast.error('Procedure type required'); return; }
    setSaving(true);
    try {
      const payload: any = {
        patientId: scheduleForm.patientId,
        procedureType: scheduleForm.procedureType,
      };
      if (scheduleForm.indication) payload.indication = scheduleForm.indication;
      if (scheduleForm.approach) payload.approach = scheduleForm.approach;
      if (scheduleForm.vesselsInvolved.length > 0) payload.vesselsInvolved = scheduleForm.vesselsInvolved;
      if (scheduleForm.cardiologistId) payload.cardiologistId = scheduleForm.cardiologistId;
      if (scheduleForm.scrubNurseId) payload.scrubNurseId = scheduleForm.scrubNurseId;
      if (scheduleForm.startAt) payload.startAt = new Date(scheduleForm.startAt).toISOString();
      if (scheduleForm.notes) payload.notes = scheduleForm.notes;
      await api.post('/api/cath', payload);
      setScheduleOpen(false);
      setScheduleForm(emptyScheduleForm());
      toast.success('Procedure scheduled');
      void load();
    } catch (e: any) {
      toast.error('Schedule failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function startProcedure(c: CathProc) {
    setSaving(true);
    try {
      await api.post(`/api/cath/${c.id}/start`);
      toast.success('Procedure started');
      void load();
    } catch (e: any) {
      toast.error('Could not start', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function saveComplete() {
    if (!activeProc) return;
    setSaving(true);
    try {
      const payload: any = {
        outcome: completeForm.outcome,
        findings: completeForm.findings || undefined,
        interventionDetails: completeForm.interventionDetails || undefined,
        complications: completeForm.complications || undefined,
      };
      if (completeForm.contrastVolumeMl !== '') payload.contrastVolumeMl = Number(completeForm.contrastVolumeMl);
      if (completeForm.fluoroscopyMinutes !== '') payload.fluoroscopyMinutes = Number(completeForm.fluoroscopyMinutes);
      const implants = (completeForm.implants as any[]).filter((i) => (i.name || '').trim());
      if (implants.length > 0) payload.implants = implants;
      await api.post(`/api/cath/${activeProc.id}/complete`, payload);
      setCompleteOpen(false);
      setActiveProc(null);
      setCompleteForm(emptyCompleteForm());
      toast.success('Procedure completed');
      void load();
    } catch (e: any) {
      toast.error('Complete failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  function toggleVessel(v: string) {
    const has = scheduleForm.vesselsInvolved.includes(v);
    setScheduleForm({
      ...scheduleForm,
      vesselsInvolved: has
        ? scheduleForm.vesselsInvolved.filter((x: string) => x !== v)
        : [...scheduleForm.vesselsInvolved, v],
    });
  }

  function addImplant() {
    setCompleteForm({
      ...completeForm,
      implants: [...completeForm.implants, { name: '', size: '', manufacturer: '', lotNumber: '' }],
    });
  }
  function removeImplant(idx: number) {
    setCompleteForm({
      ...completeForm,
      implants: completeForm.implants.filter((_: any, i: number) => i !== idx),
    });
  }
  function updateImplant(idx: number, key: string, val: any) {
    const next = [...completeForm.implants];
    next[idx] = { ...next[idx], [key]: val };
    setCompleteForm({ ...completeForm, implants: next });
  }

  // -------------------- render --------------------

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center ring-1 ring-red-100">
              <Heart className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Cath Lab</h1>
              <p className="text-sm text-slate-500 mt-0.5">Cardiac catheterization scheduling and procedure register</p>
            </div>
          </div>
          <Button onClick={() => { setScheduleForm(emptyScheduleForm()); setScheduleOpen(true); }}
            className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4" /> Schedule procedure
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Today's procedures" value={stats.todayCount}
            icon={<Calendar className="w-4 h-4 text-blue-600" />} tint="bg-blue-50 ring-blue-100"
            accent="text-blue-700" loading={loading} />
          <StatCard label="In progress" value={stats.inProgress}
            icon={<Activity className="w-4 h-4 text-amber-600" />} tint="bg-amber-50 ring-amber-100"
            accent="text-amber-700" loading={loading} />
          <StatCard label="Completed this month" value={stats.completedThisMonth}
            icon={<CheckCircle className="w-4 h-4 text-emerald-600" />} tint="bg-emerald-50 ring-emerald-100"
            accent="text-emerald-700" loading={loading} />
          <Card className="rounded-2xl border-slate-200/70 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Approach</div>
                <Heart className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-sm text-slate-900 mt-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Radial</span>
                  <span className="font-semibold tabular-nums">{stats.radial}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Femoral</span>
                  <span className="font-semibold tabular-nums">{stats.femoral}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <Card className="rounded-2xl border-slate-200/70 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-base text-slate-900">Procedures</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : list.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                No procedures yet. Schedule one to get started.
              </div>
            ) : (
              <div>
                {list.map((c) => {
                  const procLabel = PROCEDURE_TYPES.find((p) => p.value === c.procedureType)?.label || c.procedureType;
                  return (
                    <div key={c.id} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-red-50 ring-1 ring-red-100 flex items-center justify-center shrink-0">
                        <Heart className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900 truncate">{c.patient?.name || 'Unknown patient'}</span>
                          <MrnLink mrn={c.patient?.mrn} patientId={c.patient?.id} />
                          <Badge variant="outline" className="text-[10px] font-normal bg-red-50 text-red-700 border-red-200">
                            {procLabel}
                          </Badge>
                          {c.approach && (
                            <Badge variant="outline" className={`text-[10px] font-normal ${APPROACH_TINTS[c.approach] || ''}`}>
                              {c.approach}
                            </Badge>
                          )}
                          <Badge variant="outline" className={`text-[10px] font-normal ${STATUS_TINTS[c.status] || ''}`}>
                            {c.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-3">
                          {c.cardiologist && <span>Cardiologist <span className="text-slate-700">{c.cardiologist.name}</span></span>}
                          {c.startAt && <span>Start <span className="text-slate-700">{new Date(c.startAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></span>}
                          {c.vesselsInvolved && c.vesselsInvolved.length > 0 && (
                            <span>Vessels <span className="text-slate-700">{c.vesselsInvolved.join(', ')}</span></span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {c.status === 'scheduled' && (
                          <Button size="sm" variant="outline" onClick={() => startProcedure(c)} className="gap-1 rounded-lg h-9" disabled={saving}>
                            <Play className="w-3.5 h-3.5" /> Start
                          </Button>
                        )}
                        {c.status === 'in_progress' && (
                          <Button size="sm" variant="outline"
                            onClick={() => { setActiveProc(c); setCompleteForm(emptyCompleteForm()); setCompleteOpen(true); }}
                            className="gap-1 rounded-lg h-9">
                            <CheckCircle className="w-3.5 h-3.5" /> Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schedule dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Schedule cath-lab procedure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-slate-500">Patient *</Label>
              <PatientPicker patients={patients} value={scheduleForm.patientId}
                onChange={(p) => setScheduleForm({ ...scheduleForm, patientId: p?.id || '' })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormSelect label="Procedure type *" value={scheduleForm.procedureType}
                onChange={(v) => setScheduleForm({ ...scheduleForm, procedureType: v })}
                options={PROCEDURE_TYPES} />
              <FormSelect label="Approach" value={scheduleForm.approach}
                onChange={(v) => setScheduleForm({ ...scheduleForm, approach: v })}
                options={APPROACHES} />
              <FormInput label="Start time" type="datetime-local" value={scheduleForm.startAt}
                onChange={(v) => setScheduleForm({ ...scheduleForm, startAt: v })} />
              <div>
                <Label className="text-xs text-slate-500">Cardiologist</Label>
                <Select value={scheduleForm.cardiologistId || '_'}
                  onValueChange={(v) => setScheduleForm({ ...scheduleForm, cardiologistId: v === '_' ? '' : v })}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">— None —</SelectItem>
                    {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Scrub nurse</Label>
                <Select value={scheduleForm.scrubNurseId || '_'}
                  onValueChange={(v) => setScheduleForm({ ...scheduleForm, scrubNurseId: v === '_' ? '' : v })}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">— None —</SelectItem>
                    {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Indication</Label>
              <Textarea value={scheduleForm.indication}
                onChange={(e) => setScheduleForm({ ...scheduleForm, indication: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-2 block">Vessels involved</Label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {VESSELS.map((v) => {
                  const selected = scheduleForm.vesselsInvolved.includes(v);
                  return (
                    <button key={v} type="button" onClick={() => toggleVessel(v)}
                      className={`text-xs px-3 py-1 rounded-full transition-colors ${
                        selected ? 'bg-slate-900 text-white font-medium' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}>
                      {v}
                    </button>
                  );
                })}
              </div>
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

      {/* Complete dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Complete procedure</DialogTitle>
            <p className="text-sm text-slate-500">
              {activeProc?.patient?.name} · {PROCEDURE_TYPES.find(p => p.value === activeProc?.procedureType)?.label}
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <FormSelect label="Outcome *" value={completeForm.outcome}
                onChange={(v) => setCompleteForm({ ...completeForm, outcome: v })}
                options={OUTCOMES} />
              <FormInput label="Contrast volume (mL)" type="number" value={completeForm.contrastVolumeMl}
                onChange={(v) => setCompleteForm({ ...completeForm, contrastVolumeMl: v })} />
              <FormInput label="Fluoroscopy (min)" type="number" value={completeForm.fluoroscopyMinutes}
                onChange={(v) => setCompleteForm({ ...completeForm, fluoroscopyMinutes: v })} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Findings</Label>
              <Textarea value={completeForm.findings}
                onChange={(e) => setCompleteForm({ ...completeForm, findings: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Intervention details</Label>
              <Textarea value={completeForm.interventionDetails}
                onChange={(e) => setCompleteForm({ ...completeForm, interventionDetails: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Complications</Label>
              <Textarea value={completeForm.complications}
                onChange={(e) => setCompleteForm({ ...completeForm, complications: e.target.value })} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Implants</Label>
                <Button size="sm" variant="outline" onClick={addImplant} className="gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add implant
                </Button>
              </div>
              {completeForm.implants.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No implants logged.</p>
              ) : (
                <div className="space-y-2">
                  {completeForm.implants.map((im: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end border border-slate-100 rounded-xl p-2.5 bg-slate-50/40">
                      <div className="col-span-4">
                        <Label className="text-[10px] text-slate-500">Implant name</Label>
                        <Input value={im.name || ''} onChange={(e) => updateImplant(idx, 'name', e.target.value)} className="rounded-lg" />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-[10px] text-slate-500">Size</Label>
                        <Input value={im.size || ''} onChange={(e) => updateImplant(idx, 'size', e.target.value)} className="rounded-lg" />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-[10px] text-slate-500">Manufacturer</Label>
                        <Input value={im.manufacturer || ''} onChange={(e) => updateImplant(idx, 'manufacturer', e.target.value)} className="rounded-lg" />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-[10px] text-slate-500">Lot #</Label>
                        <Input value={im.lotNumber || ''} onChange={(e) => updateImplant(idx, 'lotNumber', e.target.value)} className="rounded-lg" />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button size="sm" variant="ghost" onClick={() => removeImplant(idx)} className="text-red-600 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveComplete} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
              {saving ? 'Saving…' : 'Save & complete'}
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
