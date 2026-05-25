// Obstetrics & Maternity hub — combines antenatal-care tracking with the
// in-labour WHO partograph. One pregnancy row threads the entire journey
// from booking → ANC visits → labour → outcome.
//
// Visual language matches BirthRecords / NABHDashboard:
//   • rounded-2xl cards, soft pastel chips, slate-900 primary buttons
//   • Pink Baby icon as the page identity
//   • Sheet drawer for the partograph detail (recharts dilation + FHR)
//   • Modal dialog for record-creation flows
//
// Backend: /api/pregnancies family. EDD auto-computes from LMP+280d on
// the server when omitted, so the dialog only asks for what the
// clinician actually has at booking.

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
  Baby, Plus, Activity, AlertTriangle, ClipboardList, Search, CalendarDays, Stethoscope,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import api from '../services/api';
import { useToast } from '../components/Toast';
import MrnLink from '../components/MrnLink';

// -------------------- types --------------------

interface PatientLite { id: string; mrn: string; name: string }

interface AncVisit {
  id: string;
  visitNumber?: number | null;
  visitDate: string;
  gestationWeeks?: number | null;
  weightKg?: number | null;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  fundalHeightCm?: number | null;
  foetalHeartRate?: number | null;
  presentation?: string | null;
  urineAlbumin?: string | null;
  urineSugar?: string | null;
  haemoglobin?: number | null;
  ifaSupplementGiven?: boolean | null;
  tdtVaccineGiven?: boolean | null;
  complaints?: string | null;
  examination?: string | null;
  advicePlan?: string | null;
}

interface PartographEvent {
  id: string;
  recordedAt: string;
  cervixDilationCm?: number | null;
  cervixEffacementPct?: number | null;
  foetalHeartRate?: number | null;
  membraneStatus?: string | null;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  pulse?: number | null;
  tempC?: number | null;
  contractions10min?: number | null;
  contractionIntensity?: string | null;
  station?: string | null;
  oxytocinUnits?: number | null;
  ivFluids?: string | null;
  notes?: string | null;
}

interface Pregnancy {
  id: string;
  patient: PatientLite;
  status: string; // 'ongoing' | 'in_labour' | 'delivered' | 'lost' | 'closed'
  lmpDate?: string | null;
  eddDate?: string | null;
  gravida?: number | null;
  parity?: number | null;
  abortions?: number | null;
  livingChildren?: number | null;
  riskCategory?: string | null;
  bloodGroup?: string | null;
  rhFactor?: string | null;
  notes?: string | null;
  outcomeAt?: string | null;
  ancVisits?: AncVisit[];
  partographEvents?: PartographEvent[];
  lastAncDate?: string | null;
}

const RISK_TINTS: Record<string, string> = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  moderate: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_TINTS: Record<string, string> = {
  ongoing: 'bg-blue-50 text-blue-700 border-blue-200',
  in_labour: 'bg-pink-50 text-pink-700 border-pink-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  lost: 'bg-slate-100 text-slate-700 border-slate-200',
  closed: 'bg-slate-100 text-slate-500 border-slate-200',
};

// -------------------- helpers --------------------

function weeksSince(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (ms <= 0) return 0;
  return Math.round(ms / (1000 * 60 * 60 * 24 * 7));
}

function fmtShort(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

// -------------------- page --------------------

export default function Obstetrics() {
  const toast = useToast();
  const [pregnancies, setPregnancies] = useState<Pregnancy[]>([]);
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [ancDialogOpen, setAncDialogOpen] = useState(false);
  const [partographDialogOpen, setPartographDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedPregnancy, setSelectedPregnancy] = useState<Pregnancy | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // forms
  const [newForm, setNewForm] = useState<any>(emptyNewForm());
  const [ancForm, setAncForm] = useState<any>(emptyAncForm());
  const [eventForm, setEventForm] = useState<any>(emptyEventForm());

  function emptyNewForm() {
    return {
      patientId: '',
      lmpDate: '',
      eddDate: '',
      gravida: '',
      parity: '',
      abortions: '',
      livingChildren: '',
      riskCategory: 'low',
      bloodGroup: '',
      rhFactor: '',
      notes: '',
    };
  }

  function emptyAncForm() {
    const today = new Date().toISOString().slice(0, 10);
    return {
      visitDate: today,
      visitNumber: '',
      gestationWeeks: '',
      weightKg: '',
      bpSystolic: '',
      bpDiastolic: '',
      fundalHeightCm: '',
      foetalHeartRate: '',
      presentation: '',
      urineAlbumin: 'nil',
      urineSugar: 'nil',
      haemoglobin: '',
      ifaSupplementGiven: false,
      tdtVaccineGiven: false,
      complaints: '',
      examination: '',
      advicePlan: '',
    };
  }

  function emptyEventForm() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    return {
      recordedAt: local,
      cervixDilationCm: '',
      cervixEffacementPct: '',
      foetalHeartRate: '',
      membraneStatus: 'intact',
      bpSystolic: '',
      bpDiastolic: '',
      pulse: '',
      tempC: '',
      contractions10min: '',
      contractionIntensity: 'moderate',
      station: '',
      oxytocinUnits: '',
      ivFluids: '',
      notes: '',
    };
  }

  // -------------------- data --------------------

  async function load() {
    setLoading(true);
    try {
      const [p, pa] = await Promise.all([
        api.get('/api/pregnancies').catch(() => ({ data: [] })),
        api.get('/api/patients', { params: { limit: 500 } }).catch(() => ({ data: [] })),
      ]);
      setPregnancies(Array.isArray(p.data) ? p.data : []);
      const raw = Array.isArray(pa.data) ? pa.data : (pa.data?.items || []);
      setPatients(raw.map((x: any) => ({ id: x.id, mrn: x.mrn, name: x.name })));
    } catch (err: any) {
      toast.error('Could not load pregnancies', err?.response?.data?.error || 'Try again');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  async function openPartograph(preg: Pregnancy) {
    setSelectedPregnancy(preg);
    setPartographDialogOpen(true);
    setDetailLoading(true);
    try {
      const r = await api.get(`/api/pregnancies/${preg.id}`);
      setSelectedPregnancy(r.data);
    } catch {
      // keep the row-summary version if detail fetch fails
    } finally {
      setDetailLoading(false);
    }
  }

  function openAnc(preg: Pregnancy) {
    setSelectedPregnancy(preg);
    const ga = weeksSince(preg.lmpDate);
    setAncForm({ ...emptyAncForm(), gestationWeeks: ga ?? '' });
    setAncDialogOpen(true);
  }

  function openEvent() {
    setEventForm(emptyEventForm());
    setEventDialogOpen(true);
  }

  // -------------------- save flows --------------------

  async function saveNew() {
    if (!newForm.patientId) { toast.error('Pick a patient (mother)'); return; }
    setSaving(true);
    try {
      const payload: any = { ...newForm };
      ['gravida','parity','abortions','livingChildren'].forEach((k) => {
        payload[k] = payload[k] === '' || payload[k] === null ? null : Number(payload[k]);
      });
      if (!payload.lmpDate) delete payload.lmpDate;
      if (!payload.eddDate) delete payload.eddDate;
      if (!payload.bloodGroup) delete payload.bloodGroup;
      if (!payload.rhFactor) delete payload.rhFactor;
      if (!payload.notes) delete payload.notes;
      await api.post('/api/pregnancies', payload);
      setNewDialogOpen(false);
      setNewForm(emptyNewForm());
      toast.success('Pregnancy booked', 'EDD auto-calculated when LMP provided.');
      void load();
    } catch (e: any) {
      toast.error('Save failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function saveAncVisit() {
    if (!selectedPregnancy) return;
    if (!ancForm.visitDate) { toast.error('Visit date is required'); return; }
    setSaving(true);
    try {
      const payload: any = { ...ancForm };
      ['visitNumber','gestationWeeks','weightKg','bpSystolic','bpDiastolic','fundalHeightCm',
        'foetalHeartRate','haemoglobin'].forEach((k) => {
        payload[k] = payload[k] === '' || payload[k] === null ? null : Number(payload[k]);
      });
      Object.keys(payload).forEach((k) => { if (payload[k] === '') payload[k] = null; });
      await api.post(`/api/pregnancies/${selectedPregnancy.id}/anc-visits`, payload);
      setAncDialogOpen(false);
      toast.success('ANC visit recorded');
      void load();
    } catch (e: any) {
      toast.error('Save failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function saveEvent() {
    if (!selectedPregnancy) return;
    setSaving(true);
    try {
      const payload: any = { ...eventForm };
      ['cervixDilationCm','cervixEffacementPct','foetalHeartRate','bpSystolic','bpDiastolic',
        'pulse','tempC','contractions10min','oxytocinUnits'].forEach((k) => {
        payload[k] = payload[k] === '' || payload[k] === null ? null : Number(payload[k]);
      });
      if (payload.recordedAt) payload.recordedAt = new Date(payload.recordedAt).toISOString();
      Object.keys(payload).forEach((k) => { if (payload[k] === '') payload[k] = null; });
      await api.post(`/api/pregnancies/${selectedPregnancy.id}/partograph`, payload);
      setEventDialogOpen(false);
      toast.success('Partograph event saved');
      // refresh partograph drawer
      try {
        const r = await api.get(`/api/pregnancies/${selectedPregnancy.id}`);
        setSelectedPregnancy(r.data);
      } catch { /* ignore */ }
      void load();
    } catch (e: any) {
      toast.error('Save failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  // -------------------- derived --------------------

  const ongoing = pregnancies.filter((p) => p.status === 'ongoing' || p.status === 'in_labour');
  const inLabour = pregnancies.filter((p) => p.status === 'in_labour');
  const highRisk = ongoing.filter((p) => (p.riskCategory || '').toLowerCase() === 'high');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const deliveriesThisMonth = pregnancies.filter((p) =>
    p.status === 'delivered' && p.outcomeAt && new Date(p.outcomeAt) >= startOfMonth
  ).length;

  const filtered = useMemo(() => {
    if (!search.trim()) return pregnancies;
    const q = search.toLowerCase();
    return pregnancies.filter((p) =>
      (p.patient?.name || '').toLowerCase().includes(q) ||
      (p.patient?.mrn || '').toLowerCase().includes(q)
    );
  }, [pregnancies, search]);

  // -------------------- render --------------------

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center ring-1 ring-pink-100">
              <Baby className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Obstetrics & Maternity</h1>
              <p className="text-sm text-slate-500 mt-0.5">Pregnancy register, ANC visits, and WHO partograph in labour</p>
            </div>
          </div>
          <Button onClick={() => { setNewForm(emptyNewForm()); setNewDialogOpen(true); }}
            className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4" /> New pregnancy
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Ongoing pregnancies" value={ongoing.length}
            icon={<Baby className="w-4 h-4 text-pink-600" />} tint="bg-pink-50 ring-pink-100" loading={loading} />
          <StatCard label="High-risk" value={highRisk.length}
            icon={<AlertTriangle className="w-4 h-4 text-red-600" />} tint="bg-red-50 ring-red-100"
            accent="text-red-700" loading={loading} />
          <StatCard label="In labour now" value={inLabour.length}
            icon={<Activity className="w-4 h-4 text-amber-600" />} tint="bg-amber-50 ring-amber-100"
            accent="text-amber-700" loading={loading} />
          <StatCard label="Deliveries this month" value={deliveriesThisMonth}
            icon={<CalendarDays className="w-4 h-4 text-emerald-600" />} tint="bg-emerald-50 ring-emerald-100"
            accent="text-emerald-700" loading={loading} />
        </div>

        {/* Tabs */}
        <Card className="rounded-2xl border-slate-200/70 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base text-slate-900">Pregnancies</CardTitle>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <Input
                  className="pl-9 h-9 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white"
                  placeholder="Search mother by name or MRN…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="active">
              <TabsList className="m-4">
                <TabsTrigger value="active">Active pregnancies ({ongoing.length})</TabsTrigger>
                <TabsTrigger value="labour">Partograph — in labour ({inLabour.length})</TabsTrigger>
                <TabsTrigger value="all">All ({pregnancies.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                <PregnancyList
                  loading={loading}
                  rows={filtered.filter((p) => p.status === 'ongoing' || p.status === 'in_labour')}
                  onAnc={openAnc}
                  onPartograph={openPartograph}
                />
              </TabsContent>

              <TabsContent value="labour">
                <PregnancyList
                  loading={loading}
                  rows={filtered.filter((p) => p.status === 'in_labour')}
                  onAnc={openAnc}
                  onPartograph={openPartograph}
                  emptyHint="No patients currently in labour."
                />
              </TabsContent>

              <TabsContent value="all">
                <PregnancyList
                  loading={loading}
                  rows={filtered}
                  onAnc={openAnc}
                  onPartograph={openPartograph}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* New pregnancy dialog */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Book a pregnancy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-slate-500">Patient (mother) *</Label>
              <PatientPicker
                patients={patients}
                value={newForm.patientId}
                onChange={(p) => setNewForm({ ...newForm, patientId: p?.id || '' })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="LMP date" type="date" value={newForm.lmpDate}
                onChange={(v) => setNewForm({ ...newForm, lmpDate: v })} />
              <FormInput label="EDD (auto if blank)" type="date" value={newForm.eddDate}
                onChange={(v) => setNewForm({ ...newForm, eddDate: v })} />
              <FormInput label="Gravida (G)" type="number" value={newForm.gravida}
                onChange={(v) => setNewForm({ ...newForm, gravida: v })} />
              <FormInput label="Parity (P)" type="number" value={newForm.parity}
                onChange={(v) => setNewForm({ ...newForm, parity: v })} />
              <FormInput label="Abortions (A)" type="number" value={newForm.abortions}
                onChange={(v) => setNewForm({ ...newForm, abortions: v })} />
              <FormInput label="Living children (L)" type="number" value={newForm.livingChildren}
                onChange={(v) => setNewForm({ ...newForm, livingChildren: v })} />
              <FormSelect label="Risk category" value={newForm.riskCategory}
                onChange={(v) => setNewForm({ ...newForm, riskCategory: v })}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'moderate', label: 'Moderate' },
                  { value: 'high', label: 'High' },
                ]} />
              <FormSelect label="Blood group" value={newForm.bloodGroup}
                onChange={(v) => setNewForm({ ...newForm, bloodGroup: v })}
                options={[
                  { value: '_', label: '—' },
                  { value: 'A', label: 'A' }, { value: 'B', label: 'B' },
                  { value: 'AB', label: 'AB' }, { value: 'O', label: 'O' },
                ]} />
              <FormSelect label="Rh factor" value={newForm.rhFactor}
                onChange={(v) => setNewForm({ ...newForm, rhFactor: v })}
                options={[
                  { value: '_', label: '—' },
                  { value: 'positive', label: 'Positive' },
                  { value: 'negative', label: 'Negative' },
                ]} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Notes</Label>
              <Textarea value={newForm.notes}
                onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveNew} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
              {saving ? 'Saving…' : 'Save pregnancy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ANC visit dialog */}
      <Dialog open={ancDialogOpen} onOpenChange={setAncDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Antenatal visit</DialogTitle>
            <p className="text-sm text-slate-500">
              {selectedPregnancy?.patient.name} · {selectedPregnancy?.patient.mrn}
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <FormInput label="Visit date *" type="date" value={ancForm.visitDate}
                onChange={(v) => setAncForm({ ...ancForm, visitDate: v })} />
              <FormInput label="Visit #" type="number" value={ancForm.visitNumber}
                onChange={(v) => setAncForm({ ...ancForm, visitNumber: v })} />
              <FormInput label="Gestation (wks)" type="number" value={ancForm.gestationWeeks}
                onChange={(v) => setAncForm({ ...ancForm, gestationWeeks: v })} />
              <FormInput label="Weight (kg)" type="number" value={ancForm.weightKg}
                onChange={(v) => setAncForm({ ...ancForm, weightKg: v })} />
              <FormInput label="BP systolic" type="number" value={ancForm.bpSystolic}
                onChange={(v) => setAncForm({ ...ancForm, bpSystolic: v })} />
              <FormInput label="BP diastolic" type="number" value={ancForm.bpDiastolic}
                onChange={(v) => setAncForm({ ...ancForm, bpDiastolic: v })} />
              <FormInput label="Fundal ht (cm)" type="number" value={ancForm.fundalHeightCm}
                onChange={(v) => setAncForm({ ...ancForm, fundalHeightCm: v })} />
              <FormInput label="FHR (bpm)" type="number" value={ancForm.foetalHeartRate}
                onChange={(v) => setAncForm({ ...ancForm, foetalHeartRate: v })} />
              <FormSelect label="Presentation" value={ancForm.presentation || '_'}
                onChange={(v) => setAncForm({ ...ancForm, presentation: v === '_' ? '' : v })}
                options={[
                  { value: '_', label: '—' },
                  { value: 'cephalic', label: 'Cephalic' },
                  { value: 'breech', label: 'Breech' },
                  { value: 'transverse', label: 'Transverse' },
                  { value: 'oblique', label: 'Oblique' },
                ]} />
              <FormSelect label="Urine albumin" value={ancForm.urineAlbumin}
                onChange={(v) => setAncForm({ ...ancForm, urineAlbumin: v })}
                options={[
                  { value: 'nil', label: 'Nil' }, { value: 'trace', label: 'Trace' },
                  { value: '1+', label: '1+' }, { value: '2+', label: '2+' },
                  { value: '3+', label: '3+' }, { value: '4+', label: '4+' },
                ]} />
              <FormSelect label="Urine sugar" value={ancForm.urineSugar}
                onChange={(v) => setAncForm({ ...ancForm, urineSugar: v })}
                options={[
                  { value: 'nil', label: 'Nil' }, { value: 'trace', label: 'Trace' },
                  { value: '1+', label: '1+' }, { value: '2+', label: '2+' },
                  { value: '3+', label: '3+' }, { value: '4+', label: '4+' },
                ]} />
              <FormInput label="Haemoglobin (g/dL)" type="number" value={ancForm.haemoglobin}
                onChange={(v) => setAncForm({ ...ancForm, haemoglobin: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!ancForm.ifaSupplementGiven}
                  onChange={(e) => setAncForm({ ...ancForm, ifaSupplementGiven: e.target.checked })} />
                IFA supplement given
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!ancForm.tdtVaccineGiven}
                  onChange={(e) => setAncForm({ ...ancForm, tdtVaccineGiven: e.target.checked })} />
                TT vaccine given
              </label>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Complaints</Label>
              <Textarea value={ancForm.complaints}
                onChange={(e) => setAncForm({ ...ancForm, complaints: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Examination</Label>
              <Textarea value={ancForm.examination}
                onChange={(e) => setAncForm({ ...ancForm, examination: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Advice / plan</Label>
              <Textarea value={ancForm.advicePlan}
                onChange={(e) => setAncForm({ ...ancForm, advicePlan: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAncDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveAncVisit} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
              {saving ? 'Saving…' : 'Save ANC visit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partograph drawer */}
      <Sheet open={partographDialogOpen} onOpenChange={(o) => { if (!o) setPartographDialogOpen(false); }}>
        <SheetContent width="max-w-3xl">
          {selectedPregnancy && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 ring-1 ring-pink-100 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-pink-600" />
                  </div>
                  <div className="flex-1">
                    <SheetTitle>Partograph · {selectedPregnancy.patient.name}</SheetTitle>
                    <SheetDescription>
                      MRN {selectedPregnancy.patient.mrn} · {(selectedPregnancy.partographEvents || []).length} event(s)
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <SheetBody>
                {detailLoading ? (
                  <Skeleton className="w-full h-48 rounded-xl" />
                ) : (
                  <PartographView events={selectedPregnancy.partographEvents || []} />
                )}
                <div className="mt-4">
                  <Button onClick={openEvent} className="gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800">
                    <Plus className="w-4 h-4" /> Add partograph event
                  </Button>
                </div>
                <div className="mt-6 space-y-2">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Event timeline</div>
                  {(selectedPregnancy.partographEvents || []).length === 0 ? (
                    <p className="text-sm text-slate-500 italic">No events yet — start with cervical exam.</p>
                  ) : (
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                      {(selectedPregnancy.partographEvents || []).map((e) => (
                        <div key={e.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/40 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-slate-900">{fmtDateTime(e.recordedAt)}</span>
                            {e.membraneStatus && (
                              <Badge variant="outline" className="text-[10px]">{e.membraneStatus}</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 text-slate-700">
                            {e.cervixDilationCm != null && <span>Dilation {e.cervixDilationCm} cm</span>}
                            {e.cervixEffacementPct != null && <span>Effacement {e.cervixEffacementPct}%</span>}
                            {e.foetalHeartRate != null && <span>FHR {e.foetalHeartRate} bpm</span>}
                            {e.bpSystolic && <span>BP {e.bpSystolic}/{e.bpDiastolic ?? '—'}</span>}
                            {e.pulse && <span>Pulse {e.pulse}</span>}
                            {e.tempC && <span>Temp {e.tempC}°C</span>}
                            {e.contractions10min != null && <span>Contractions {e.contractions10min}/10m</span>}
                            {e.contractionIntensity && <span>Intensity {e.contractionIntensity}</span>}
                            {e.station && <span>Station {e.station}</span>}
                            {e.oxytocinUnits != null && <span>Oxytocin {e.oxytocinUnits} U</span>}
                            {e.ivFluids && <span>IV {e.ivFluids}</span>}
                          </div>
                          {e.notes && <div className="mt-1 text-slate-600">{e.notes}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SheetBody>
              <SheetFooter>
                <Button variant="outline" onClick={() => setPartographDialogOpen(false)}>Close</Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add partograph event dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Partograph event</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <FormInput label="Recorded at *" type="datetime-local" value={eventForm.recordedAt}
              onChange={(v) => setEventForm({ ...eventForm, recordedAt: v })} />
            <FormInput label="Cervix dilation (cm)" type="number" value={eventForm.cervixDilationCm}
              onChange={(v) => setEventForm({ ...eventForm, cervixDilationCm: v })} />
            <FormInput label="Effacement (%)" type="number" value={eventForm.cervixEffacementPct}
              onChange={(v) => setEventForm({ ...eventForm, cervixEffacementPct: v })} />
            <FormInput label="FHR (bpm)" type="number" value={eventForm.foetalHeartRate}
              onChange={(v) => setEventForm({ ...eventForm, foetalHeartRate: v })} />
            <FormSelect label="Membrane status" value={eventForm.membraneStatus}
              onChange={(v) => setEventForm({ ...eventForm, membraneStatus: v })}
              options={[
                { value: 'intact', label: 'Intact' },
                { value: 'ruptured_clear', label: 'Ruptured — clear' },
                { value: 'ruptured_meconium', label: 'Ruptured — meconium' },
                { value: 'ruptured_blood', label: 'Ruptured — blood' },
              ]} />
            <FormInput label="BP systolic" type="number" value={eventForm.bpSystolic}
              onChange={(v) => setEventForm({ ...eventForm, bpSystolic: v })} />
            <FormInput label="BP diastolic" type="number" value={eventForm.bpDiastolic}
              onChange={(v) => setEventForm({ ...eventForm, bpDiastolic: v })} />
            <FormInput label="Pulse" type="number" value={eventForm.pulse}
              onChange={(v) => setEventForm({ ...eventForm, pulse: v })} />
            <FormInput label="Temp (°C)" type="number" value={eventForm.tempC}
              onChange={(v) => setEventForm({ ...eventForm, tempC: v })} />
            <FormInput label="Contractions / 10 min" type="number" value={eventForm.contractions10min}
              onChange={(v) => setEventForm({ ...eventForm, contractions10min: v })} />
            <FormSelect label="Contraction intensity" value={eventForm.contractionIntensity}
              onChange={(v) => setEventForm({ ...eventForm, contractionIntensity: v })}
              options={[
                { value: 'mild', label: 'Mild' },
                { value: 'moderate', label: 'Moderate' },
                { value: 'strong', label: 'Strong' },
              ]} />
            <FormInput label="Station" value={eventForm.station}
              onChange={(v) => setEventForm({ ...eventForm, station: v })} />
            <FormInput label="Oxytocin (U)" type="number" value={eventForm.oxytocinUnits}
              onChange={(v) => setEventForm({ ...eventForm, oxytocinUnits: v })} />
            <FormInput label="IV fluids" value={eventForm.ivFluids}
              onChange={(v) => setEventForm({ ...eventForm, ivFluids: v })} />
            <div className="col-span-2">
              <Label className="text-xs text-slate-500">Notes</Label>
              <Textarea value={eventForm.notes}
                onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveEvent} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
              {saving ? 'Saving…' : 'Save event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =====================================================================
// Sub-components
// =====================================================================

function PregnancyList({ rows, loading, onAnc, onPartograph, emptyHint }: {
  rows: Pregnancy[];
  loading: boolean;
  onAnc: (p: Pregnancy) => void;
  onPartograph: (p: Pregnancy) => void;
  emptyHint?: string;
}) {
  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-slate-500">
        {emptyHint || 'No pregnancies match.'}
      </div>
    );
  }
  return (
    <div>
      {rows.map((p) => {
        const ga = weeksSince(p.lmpDate);
        const shorthand = `G${p.gravida ?? '?'}P${p.parity ?? '?'}A${p.abortions ?? '?'}L${p.livingChildren ?? '?'}`;
        const lastAnc = p.lastAncDate || p.ancVisits?.[0]?.visitDate;
        return (
          <div key={p.id} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-pink-50 ring-1 ring-pink-100 flex items-center justify-center shrink-0">
              <Baby className="w-5 h-5 text-pink-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-slate-900 truncate">{p.patient.name}</span>
                <MrnLink mrn={p.patient.mrn} patientId={p.patient.id} />
                <Badge variant="outline" className={`text-[10px] font-normal ${STATUS_TINTS[p.status] || ''}`}>
                  {p.status.replace('_', ' ')}
                </Badge>
                {p.riskCategory && (
                  <Badge variant="outline" className={`text-[10px] font-normal ${RISK_TINTS[p.riskCategory] || ''}`}>
                    {p.riskCategory} risk
                  </Badge>
                )}
                <span className="text-[11px] font-mono text-slate-700 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                  {shorthand}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                {ga != null && <span>GA <span className="tabular-nums text-slate-700">{ga}w</span></span>}
                {p.eddDate && <span>EDD <span className="text-slate-700">{fmtShort(p.eddDate)}</span></span>}
                {p.bloodGroup && <span>Blood <span className="text-slate-700">{p.bloodGroup}{p.rhFactor === 'positive' ? '+' : p.rhFactor === 'negative' ? '-' : ''}</span></span>}
                {lastAnc && <span>Last ANC <span className="text-slate-700">{fmtShort(lastAnc)}</span></span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => onAnc(p)} className="gap-1 rounded-lg h-9">
                <Stethoscope className="w-3.5 h-3.5" /> Add ANC visit
              </Button>
              <Button size="sm" variant="outline" onClick={() => onPartograph(p)} className="gap-1 rounded-lg h-9">
                <ClipboardList className="w-3.5 h-3.5" /> Open partograph
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PartographView({ events }: { events: PartographEvent[] }) {
  // Sort ascending for chart, descending for timeline. The chart uses
  // hours-since-start on X so spacing reflects real elapsed time.
  const sorted = [...events].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  const t0 = sorted.length > 0 ? new Date(sorted[0].recordedAt).getTime() : Date.now();
  const data = sorted.map((e) => ({
    t: +(((new Date(e.recordedAt).getTime() - t0) / (1000 * 60 * 60)).toFixed(2)),
    dilation: e.cervixDilationCm ?? null,
    fhr: e.foetalHeartRate ?? null,
  }));

  // WHO partograph alert line: 1cm/hr starting from 4cm. Action line
  // sits 4hr to the right. We compute the two ranges as data series
  // and overlay them as reference dashed lines.
  const alertLineData = [{ t: 0, alert: 4 }, { t: 6, alert: 10 }];
  const actionLineData = [{ t: 4, action: 4 }, { t: 10, action: 10 }];

  if (data.length === 0) {
    return (
      <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-sm text-slate-500">
        No partograph data yet. Add the first event to start the chart.
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-3">Cervical dilation & FHR</div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="t" tick={{ fontSize: 11 }} label={{ value: 'Hours since first event', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#64748b' }} />
          <YAxis yAxisId="left" domain={[0, 10]} tick={{ fontSize: 11 }} label={{ value: 'Dilation (cm)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748b' }} />
          <YAxis yAxisId="right" orientation="right" domain={[60, 200]} tick={{ fontSize: 11 }} label={{ value: 'FHR (bpm)', angle: 90, position: 'insideRight', fontSize: 10, fill: '#64748b' }} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {/* Reference lines for the WHO alert / action gradients.
              We draw two short segments (0-6h, 4-10h) of slope 1 using
              ReferenceLine with segment to make them dashed. */}
          <ReferenceLine yAxisId="left" segment={[{ x: alertLineData[0].t, y: alertLineData[0].alert }, { x: alertLineData[1].t, y: alertLineData[1].alert }]} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Alert', position: 'insideTopRight', fill: '#f59e0b', fontSize: 10 }} />
          <ReferenceLine yAxisId="left" segment={[{ x: actionLineData[0].t, y: actionLineData[0].action }, { x: actionLineData[1].t, y: actionLineData[1].action }]} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Action', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }} />
          <Line yAxisId="left" type="monotone" dataKey="dilation" stroke="#0f172a" strokeWidth={2} name="Dilation (cm)" dot={{ r: 3 }} connectNulls />
          <Line yAxisId="right" type="monotone" dataKey="fhr" stroke="#ec4899" strokeWidth={2} name="FHR (bpm)" dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({ label, value, sub, icon, tint, accent, loading }: {
  label: string; value: number; sub?: string; icon: React.ReactNode; tint: string; accent?: string; loading?: boolean;
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
