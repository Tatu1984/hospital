// Neonatal ICU — bed grid + admission lifecycle for newborns. Mirrors
// the ICU.tsx bed-card pattern but lighter (no ventilator vitals trend
// in v1) and pink to match BirthRecords' visual family.
//
// Backend: /api/nicu/{beds,stays} family.

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
import { Baby, Plus, Bed, Settings, LogOut, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/Toast';

// -------------------- types --------------------

interface PatientLite { id: string; mrn: string; name: string; dob?: string | null }

interface NICUStay {
  id: string;
  babyPatientId: string;
  babyPatient?: PatientLite | null;
  nicuBedId?: string | null;
  reason: string;
  reasonDetails?: string | null;
  birthWeightGrams?: number | null;
  gestationWeeksAtBirth?: number | null;
  apgar1Min?: number | null;
  apgar5Min?: number | null;
  status: string; // 'active' | 'discharged'
  admittedAt: string;
  dischargedAt?: string | null;
  outcome?: string | null;
  notes?: string | null;
}

interface NICUBed {
  id: string;
  bedNumber: string;
  level: number; // 1, 2 or 3
  equipment?: string[] | null;
  isolationCapable?: boolean | null;
  status: string; // 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'
  currentStay?: NICUStay | null;
}

const REASONS = [
  { value: 'prematurity', label: 'Prematurity' },
  { value: 'low_birth_weight', label: 'Low birth weight' },
  { value: 'rds', label: 'Respiratory distress (RDS)' },
  { value: 'sepsis', label: 'Sepsis' },
  { value: 'jaundice', label: 'Jaundice / hyperbilirubinemia' },
  { value: 'asphyxia', label: 'Birth asphyxia' },
  { value: 'other', label: 'Other' },
];

const OUTCOMES = [
  { value: 'home', label: 'Discharged home' },
  { value: 'transferred', label: 'Transferred out' },
  { value: 'death', label: 'Death' },
  { value: 'lama', label: 'Left against medical advice' },
];

const LEVEL_TINTS: Record<number, string> = {
  1: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  2: 'bg-amber-50 text-amber-700 border-amber-200',
  3: 'bg-red-50 text-red-700 border-red-200',
};

// -------------------- page --------------------

export default function NICU() {
  const toast = useToast();
  const [beds, setBeds] = useState<NICUBed[]>([]);
  const [stays, setStays] = useState<NICUStay[]>([]);
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // dialogs
  const [admitOpen, setAdmitOpen] = useState(false);
  const [admitBedId, setAdmitBedId] = useState<string | null>(null);
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [dischargeBed, setDischargeBed] = useState<NICUBed | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  // forms
  const [admitForm, setAdmitForm] = useState<any>(emptyAdmitForm());
  const [dischargeForm, setDischargeForm] = useState<any>({ outcome: 'home', notes: '' });
  const [newBedForm, setNewBedForm] = useState<any>(emptyBedForm());
  const [editingBedId, setEditingBedId] = useState<string | null>(null);

  function emptyAdmitForm() {
    return {
      babyPatientId: '',
      nicuBedId: '',
      reason: 'prematurity',
      reasonDetails: '',
      birthWeightGrams: '',
      gestationWeeksAtBirth: '',
      apgar1Min: '',
      apgar5Min: '',
      notes: '',
    };
  }
  function emptyBedForm() {
    return { bedNumber: '', level: '2', equipmentText: '', isolationCapable: false };
  }

  // -------------------- load --------------------

  async function load() {
    setLoading(true);
    try {
      const [b, s, p] = await Promise.all([
        api.get('/api/nicu/beds').catch(() => ({ data: [] })),
        api.get('/api/nicu/stays', { params: { status: 'active' } }).catch(() => ({ data: [] })),
        api.get('/api/patients', { params: { limit: 500 } }).catch(() => ({ data: [] })),
      ]);
      setBeds(Array.isArray(b.data) ? b.data : []);
      setStays(Array.isArray(s.data) ? s.data : []);
      const raw = Array.isArray(p.data) ? p.data : (p.data?.items || []);
      setPatients(raw.map((x: any) => ({ id: x.id, mrn: x.mrn, name: x.name, dob: x.dob })));
    } catch (err: any) {
      toast.error('Could not load NICU data', err?.response?.data?.error || 'Try again');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  // -------------------- derived --------------------

  // Map active stays onto their beds (in case backend doesn't already nest currentStay).
  const bedsWithStay = useMemo(() => {
    const byBed = new Map<string, NICUStay>();
    for (const s of stays) {
      if (s.nicuBedId) byBed.set(s.nicuBedId, s);
    }
    return beds.map((b) => ({
      ...b,
      currentStay: b.currentStay || byBed.get(b.id) || null,
    }));
  }, [beds, stays]);

  const stats = useMemo(() => {
    const total = bedsWithStay.length;
    const occupied = bedsWithStay.filter((b) => b.status === 'OCCUPIED' || b.currentStay).length;
    const l3Occupied = bedsWithStay.filter((b) => (b.level === 3) && (b.status === 'OCCUPIED' || b.currentStay)).length;
    const currentAdmissions = stays.filter((s) => s.status === 'active').length;
    return { total, occupied, l3Occupied, currentAdmissions };
  }, [bedsWithStay, stays]);

  const vacantBeds = bedsWithStay.filter((b) => !(b.status === 'OCCUPIED' || b.currentStay));

  // -------------------- handlers --------------------

  function openAdmit(bedId?: string) {
    setAdmitForm({ ...emptyAdmitForm(), nicuBedId: bedId || '' });
    setAdmitBedId(bedId || null);
    setAdmitOpen(true);
  }

  function openDischarge(bed: NICUBed) {
    setDischargeBed(bed);
    setDischargeForm({ outcome: 'home', notes: '' });
    setDischargeOpen(true);
  }

  async function saveAdmit() {
    if (!admitForm.babyPatientId) { toast.error('Pick the baby (patient)'); return; }
    if (!admitForm.reason) { toast.error('Pick an admission reason'); return; }
    setSaving(true);
    try {
      const payload: any = { ...admitForm };
      ['birthWeightGrams', 'gestationWeeksAtBirth', 'apgar1Min', 'apgar5Min'].forEach((k) => {
        payload[k] = payload[k] === '' || payload[k] === null ? null : Number(payload[k]);
      });
      if (!payload.nicuBedId) delete payload.nicuBedId;
      if (!payload.reasonDetails) delete payload.reasonDetails;
      if (!payload.notes) delete payload.notes;
      await api.post('/api/nicu/stays', payload);
      setAdmitOpen(false);
      toast.success('Baby admitted to NICU');
      void load();
    } catch (e: any) {
      toast.error('Could not admit', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function saveDischarge() {
    if (!dischargeBed?.currentStay) return;
    if (!dischargeForm.outcome) { toast.error('Pick an outcome'); return; }
    setSaving(true);
    try {
      await api.post(`/api/nicu/stays/${dischargeBed.currentStay.id}/discharge`, {
        outcome: dischargeForm.outcome,
        notes: dischargeForm.notes || undefined,
      });
      setDischargeOpen(false);
      toast.success('Stay discharged');
      void load();
    } catch (e: any) {
      toast.error('Discharge failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function saveBed() {
    if (!newBedForm.bedNumber.trim()) { toast.error('Bed number required'); return; }
    setSaving(true);
    try {
      const equipment = (newBedForm.equipmentText || '')
        .split(',').map((s: string) => s.trim()).filter(Boolean);
      const payload: any = {
        bedNumber: newBedForm.bedNumber.trim(),
        level: Number(newBedForm.level) || 2,
        equipment,
        isolationCapable: !!newBedForm.isolationCapable,
      };
      if (editingBedId) {
        await api.put(`/api/nicu/beds/${editingBedId}`, payload);
        toast.success('Bed updated');
      } else {
        await api.post('/api/nicu/beds', payload);
        toast.success('Bed added');
      }
      setNewBedForm(emptyBedForm());
      setEditingBedId(null);
      void load();
    } catch (e: any) {
      toast.error('Save failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  function startEditBed(b: NICUBed) {
    setEditingBedId(b.id);
    setNewBedForm({
      bedNumber: b.bedNumber,
      level: String(b.level || 2),
      equipmentText: (b.equipment || []).join(', '),
      isolationCapable: !!b.isolationCapable,
    });
  }

  // -------------------- render --------------------

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center ring-1 ring-pink-100">
              <Baby className="w-6 h-6 text-pink-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Neonatal ICU</h1>
              <p className="text-sm text-slate-500 mt-0.5">Newborn bed status, admissions and discharges</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setManageOpen(true)} className="gap-1.5 rounded-xl">
              <Settings className="w-4 h-4" /> Manage beds
            </Button>
            <Button onClick={() => openAdmit()} className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
              <Plus className="w-4 h-4" /> Admit baby
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total beds" value={stats.total}
            icon={<Bed className="w-4 h-4 text-slate-700" />} tint="bg-slate-100 ring-slate-200" loading={loading} />
          <StatCard label="Occupied" value={stats.occupied}
            icon={<Baby className="w-4 h-4 text-blue-600" />} tint="bg-blue-50 ring-blue-100"
            accent="text-blue-700" loading={loading} />
          <StatCard label="Level-3 occupied" value={stats.l3Occupied}
            icon={<AlertCircle className="w-4 h-4 text-red-600" />} tint="bg-red-50 ring-red-100"
            accent="text-red-700" loading={loading} />
          <StatCard label="Current admissions" value={stats.currentAdmissions}
            icon={<Baby className="w-4 h-4 text-pink-600" />} tint="bg-pink-50 ring-pink-100"
            accent="text-pink-700" loading={loading} />
        </div>

        {/* Bed grid */}
        <Card className="rounded-2xl border-slate-200/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Bed status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
              </div>
            ) : bedsWithStay.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                No NICU beds yet. Click <span className="font-medium">Manage beds</span> to add one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bedsWithStay.map((b) => {
                  const occupied = !!b.currentStay;
                  return (
                    <Card key={b.id} className={`rounded-2xl ${occupied ? 'bg-pink-50/40 border-pink-200' : 'hover:border-slate-300'}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg tracking-tight">{b.bedNumber}</CardTitle>
                            <div className="text-xs text-slate-500 mt-0.5">NICU</div>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] font-normal ${LEVEL_TINTS[b.level] || ''}`}>
                              L{b.level}
                            </Badge>
                            {b.isolationCapable && (
                              <Badge variant="outline" className="text-[10px] font-normal bg-violet-50 text-violet-700 border-violet-200">isolation</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {b.equipment && b.equipment.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap mb-3">
                            {b.equipment.map((eq, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {eq}
                              </span>
                            ))}
                          </div>
                        )}

                        {occupied && b.currentStay ? (
                          <div className="space-y-2">
                            <div>
                              <div className="font-medium text-slate-900 truncate">
                                {b.currentStay.babyPatient?.name || 'Baby'}
                              </div>
                              <div className="text-xs text-slate-500">
                                MRN {b.currentStay.babyPatient?.mrn || '—'}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 text-xs gap-y-1 text-slate-700">
                              {b.currentStay.birthWeightGrams != null && (
                                <span>BW <span className="tabular-nums">{b.currentStay.birthWeightGrams} g</span></span>
                              )}
                              {b.currentStay.gestationWeeksAtBirth != null && (
                                <span>GA <span className="tabular-nums">{b.currentStay.gestationWeeksAtBirth}w</span></span>
                              )}
                              {b.currentStay.apgar1Min != null && (
                                <span>APGAR 1: {b.currentStay.apgar1Min}</span>
                              )}
                              {b.currentStay.apgar5Min != null && (
                                <span>APGAR 5: {b.currentStay.apgar5Min}</span>
                              )}
                              <span className="col-span-2 text-slate-500">
                                Admitted {new Date(b.currentStay.admittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </span>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => openDischarge(b)} className="w-full gap-1 mt-2">
                              <LogOut className="w-3.5 h-3.5" /> Discharge
                            </Button>
                          </div>
                        ) : (
                          <div className="py-4 text-center text-slate-500">
                            <Bed className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <div className="text-sm">Vacant</div>
                            <Button size="sm" variant="outline" onClick={() => openAdmit(b.id)} className="mt-3 gap-1">
                              <Plus className="w-3.5 h-3.5" /> Admit here
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admit dialog */}
      <Dialog open={admitOpen} onOpenChange={setAdmitOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Admit baby to NICU</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-slate-500">Baby (patient) *</Label>
              <PatientPicker
                patients={patients}
                value={admitForm.babyPatientId}
                onChange={(p) => setAdmitForm({ ...admitForm, babyPatientId: p?.id || '' })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormSelect label="Target bed (vacant only)" value={admitForm.nicuBedId || '_'}
                onChange={(v) => setAdmitForm({ ...admitForm, nicuBedId: v === '_' ? '' : v })}
                options={[
                  { value: '_', label: '— No bed yet —' },
                  ...vacantBeds.map((b) => ({ value: b.id, label: `${b.bedNumber} (L${b.level})` })),
                  ...(admitBedId && !vacantBeds.find(b => b.id === admitBedId)
                    ? [{ value: admitBedId, label: `Bed selected` }] : []),
                ]} />
              <FormSelect label="Reason *" value={admitForm.reason}
                onChange={(v) => setAdmitForm({ ...admitForm, reason: v })}
                options={REASONS} />
              <FormInput label="Birth weight (g)" type="number" value={admitForm.birthWeightGrams}
                onChange={(v) => setAdmitForm({ ...admitForm, birthWeightGrams: v })} />
              <FormInput label="Gestation @ birth (wks)" type="number" value={admitForm.gestationWeeksAtBirth}
                onChange={(v) => setAdmitForm({ ...admitForm, gestationWeeksAtBirth: v })} />
              <FormInput label="APGAR 1 min" type="number" value={admitForm.apgar1Min}
                onChange={(v) => setAdmitForm({ ...admitForm, apgar1Min: v })} />
              <FormInput label="APGAR 5 min" type="number" value={admitForm.apgar5Min}
                onChange={(v) => setAdmitForm({ ...admitForm, apgar5Min: v })} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Reason details</Label>
              <Textarea value={admitForm.reasonDetails}
                onChange={(e) => setAdmitForm({ ...admitForm, reasonDetails: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Notes</Label>
              <Textarea value={admitForm.notes}
                onChange={(e) => setAdmitForm({ ...admitForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdmitOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveAdmit} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
              {saving ? 'Saving…' : 'Admit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discharge dialog */}
      <Dialog open={dischargeOpen} onOpenChange={setDischargeOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Discharge from NICU</DialogTitle>
            <p className="text-sm text-slate-500">
              {dischargeBed?.currentStay?.babyPatient?.name} · Bed {dischargeBed?.bedNumber}
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FormSelect label="Outcome *" value={dischargeForm.outcome}
              onChange={(v) => setDischargeForm({ ...dischargeForm, outcome: v })}
              options={OUTCOMES} />
            <div>
              <Label className="text-xs text-slate-500">Notes</Label>
              <Textarea value={dischargeForm.notes}
                onChange={(e) => setDischargeForm({ ...dischargeForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDischargeOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveDischarge} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
              {saving ? 'Saving…' : 'Discharge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage beds dialog */}
      <Dialog open={manageOpen} onOpenChange={(o) => { if (!o) { setManageOpen(false); setEditingBedId(null); setNewBedForm(emptyBedForm()); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Manage NICU beds</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="border border-slate-200 rounded-xl p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-semibold">
                {editingBedId ? 'Edit bed' : 'Add new bed'}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Bed number *" value={newBedForm.bedNumber}
                  onChange={(v) => setNewBedForm({ ...newBedForm, bedNumber: v })} />
                <FormSelect label="Level" value={newBedForm.level}
                  onChange={(v) => setNewBedForm({ ...newBedForm, level: v })}
                  options={[
                    { value: '1', label: 'Level 1 — basic' },
                    { value: '2', label: 'Level 2 — special care' },
                    { value: '3', label: 'Level 3 — intensive' },
                  ]} />
                <div className="col-span-2">
                  <Label className="text-xs text-slate-500">Equipment (comma-separated)</Label>
                  <Input value={newBedForm.equipmentText}
                    onChange={(e) => setNewBedForm({ ...newBedForm, equipmentText: e.target.value })}
                    placeholder="e.g. ventilator, CPAP, phototherapy, incubator" />
                </div>
                <label className="flex items-center gap-2 text-sm col-span-2">
                  <input type="checkbox" checked={!!newBedForm.isolationCapable}
                    onChange={(e) => setNewBedForm({ ...newBedForm, isolationCapable: e.target.checked })} />
                  Isolation capable
                </label>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Button onClick={saveBed} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
                  {saving ? 'Saving…' : (editingBedId ? 'Update bed' : 'Add bed')}
                </Button>
                {editingBedId && (
                  <Button variant="outline" onClick={() => { setEditingBedId(null); setNewBedForm(emptyBedForm()); }}>
                    Cancel edit
                  </Button>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-semibold">Existing beds</div>
              {bedsWithStay.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No beds yet.</p>
              ) : (
                <div className="space-y-2">
                  {bedsWithStay.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-3 border border-slate-100 rounded-xl p-3 bg-slate-50/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900">{b.bedNumber}</span>
                          <Badge variant="outline" className={`text-[10px] font-normal ${LEVEL_TINTS[b.level] || ''}`}>L{b.level}</Badge>
                          {b.isolationCapable && <Badge variant="outline" className="text-[10px] font-normal bg-violet-50 text-violet-700 border-violet-200">isolation</Badge>}
                          {b.currentStay && <Badge variant="outline" className="text-[10px] font-normal bg-blue-50 text-blue-700 border-blue-200">occupied</Badge>}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">
                          {(b.equipment || []).join(', ') || '—'}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => startEditBed(b)}>Edit</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setManageOpen(false); setEditingBedId(null); setNewBedForm(emptyBedForm()); }}>Close</Button>
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
      <Input placeholder="Type baby's name or MRN…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-lg" />
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
