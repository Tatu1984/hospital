// MTP Register (Medical Termination of Pregnancy Act, 2021) — statutorily
// confidential. The list itself is gated to MEDICAL_DIRECTOR / DOCTOR /
// ADMIN; every read is audit-logged.
//
// UI-enforced legal gates (backend enforces these too as defence in depth):
//   • Weeks >= 20: board concurrence required (two RMPs must sign). The
//     "Save" button is disabled until secondDoctor + boardConcurrence
//     are filled.
//   • Weeks > 24: only permissible for substantial foetal anomaly.
//     The indication dropdown is locked to foetal_anomaly.

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
  FileWarning, Plus, Search, AlertTriangle, FileSignature, ShieldAlert, Lock,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import MrnLink from '../components/MrnLink';

interface PatientLite {
  id: string;
  mrn: string;
  name: string;
  dob?: string | null;
  gender?: string | null;
  address?: string | null;
  contact?: string | null;
}

interface MTPRecord {
  id: string;
  registerNumber?: string | null;
  patientId: string;
  patient?: PatientLite | null;
  patientAge: number;
  husbandOrFatherName: string;
  address: string;
  contact?: string | null;
  gravida?: number | null;
  parity?: number | null;
  livingChildren?: number | null;
  lmpDate?: string | null;
  gestationWeeks: number;
  indication: string;
  indicationDetails?: string | null;
  method: string;
  primaryDoctorName: string;
  primaryDoctorRegNo: string;
  secondDoctorName?: string | null;
  secondDoctorRegNo?: string | null;
  boardConcurrence?: boolean | null;
  procedureAt: string;
  outcome?: string | null;
  complications?: string | null;
  notes?: string | null;
  signedAt?: string | null;
  signedBy?: string | null;
  createdAt: string;
}

const INDICATIONS = [
  { value: 'risk_to_life',         label: 'Risk to life of woman',      tint: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'risk_grave_injury',    label: 'Grave injury to health',     tint: 'bg-rose-50 text-rose-700 border-rose-200' },
  { value: 'foetal_anomaly',       label: 'Substantial foetal anomaly', tint: 'bg-violet-50 text-violet-700 border-violet-200' },
  { value: 'contraceptive_failure',label: 'Contraceptive failure',      tint: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'rape_pregnancy',       label: 'Rape (presumed mental anguish)', tint: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'mental_health',        label: 'Mental health',              tint: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
];

const METHODS = [
  { value: 'medical_abortion',          label: 'Medical (mifepristone + misoprostol)' },
  { value: 'suction_aspiration',        label: 'Suction / vacuum aspiration' },
  { value: 'd_and_c',                   label: 'D&C' },
  { value: 'second_trimester_induction',label: '2nd-trimester induction' },
];

export default function MTPRegister() {
  const [records, setRecords] = useState<MTPRecord[]>([]);
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [detail, setDetail] = useState<MTPRecord | null>(null);
  const [signing, setSigning] = useState(false);
  const toast = useToast();

  function emptyForm() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    return {
      patientId: '',
      patientAge: '',
      husbandOrFatherName: '',
      address: '',
      contact: '',
      gravida: '',
      parity: '',
      livingChildren: '',
      lmpDate: '',
      gestationWeeks: '',
      indication: 'contraceptive_failure',
      indicationDetails: '',
      method: 'medical_abortion',
      primaryDoctorName: '',
      primaryDoctorRegNo: '',
      secondDoctorName: '',
      secondDoctorRegNo: '',
      boardConcurrence: false,
      procedureAt: local,
      outcome: '',
      complications: '',
      notes: '',
    };
  }

  async function load() {
    setLoading(true);
    try {
      const params: any = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (search.trim()) params.search = search.trim();
      const [r, p] = await Promise.all([
        api.get('/api/mtp', { params }).catch(() => ({ data: [] })),
        api.get('/api/patients', { params: { limit: 500 } }).catch(() => ({ data: [] })),
      ]);
      setRecords(Array.isArray(r.data) ? r.data : (r.data?.items || []));
      const raw = Array.isArray(p.data) ? p.data : (p.data?.items || []);
      setPatients(raw.map((x: any) => ({
        id: x.id, mrn: x.mrn, name: x.name,
        dob: x.dob, gender: x.gender, address: x.address, contact: x.contact,
      })));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const t = setTimeout(() => { void load(); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, search]);

  function openNew() { setForm(emptyForm()); setDialogOpen(true); }

  // -------- legal gates --------
  const gw = Number(form.gestationWeeks);
  const needsBoard = !isNaN(gw) && gw >= 20;
  const overTwentyFour = !isNaN(gw) && gw > 24;
  const boardConcurrenceComplete = !!form.secondDoctorName && !!form.secondDoctorRegNo && !!form.boardConcurrence;
  const indicationLockedToAnomaly = overTwentyFour;

  // When weeks crosses 24, force indication = foetal_anomaly.
  useEffect(() => {
    if (overTwentyFour && form.indication !== 'foetal_anomaly') {
      setForm((f: any) => ({ ...f, indication: 'foetal_anomaly' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overTwentyFour]);

  const canSave = !!form.patientId
    && !!form.patientAge
    && !!form.husbandOrFatherName
    && !!form.address
    && !!form.gestationWeeks
    && !!form.indication
    && !!form.method
    && !!form.primaryDoctorName
    && !!form.primaryDoctorRegNo
    && (!needsBoard || boardConcurrenceComplete);

  async function save() {
    if (!canSave) {
      if (needsBoard && !boardConcurrenceComplete) {
        toast.error('Board concurrence missing', 'Two RMPs must sign for ≥20-week MTPs.');
      } else {
        toast.error('Fill all required fields');
      }
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...form };
      payload.patientAge = Number(payload.patientAge);
      payload.gestationWeeks = Number(payload.gestationWeeks);
      ['gravida', 'parity', 'livingChildren'].forEach(k => {
        if (payload[k] === '' || payload[k] === null) delete payload[k];
        else payload[k] = Number(payload[k]);
      });
      payload.procedureAt = new Date(payload.procedureAt).toISOString();
      if (payload.lmpDate) payload.lmpDate = new Date(payload.lmpDate).toISOString();
      Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] === null) delete payload[k]; });
      await api.post('/api/mtp', payload);
      setDialogOpen(false);
      toast.success('MTP record saved', 'Draft — sign to commit.');
      void load();
    } catch (e: any) {
      toast.error('Save failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function sign(rec: MTPRecord) {
    setSigning(true);
    try {
      await api.post(`/api/mtp/${rec.id}/sign`);
      toast.success('MTP record signed', 'Now immutable.');
      void load();
      setDetail(null);
    } catch (e: any) {
      toast.error('Sign failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSigning(false);
    }
  }

  // -------- derived data --------
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const thisMonthCount = records.filter(r => new Date(r.procedureAt) >= monthStart).length;
  const u12 = records.filter(r => r.gestationWeeks < 12).length;
  const w12to20 = records.filter(r => r.gestationWeeks >= 12 && r.gestationWeeks < 20).length;
  const w20to24 = records.filter(r => r.gestationWeeks >= 20 && r.gestationWeeks <= 24).length;
  const boardApprovedOver20 = records.filter(r => r.gestationWeeks >= 20 && r.boardConcurrence).length;

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (activeFilter && r.indication !== activeFilter) return false;
      return true;
    });
  }, [records, activeFilter]);

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* ============ HEADER ============ */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center ring-1 ring-rose-100">
              <FileWarning className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">MTP Register</h1>
              <p className="text-sm text-slate-500 mt-0.5">Medical Termination of Pregnancy Act, 2021</p>
            </div>
          </div>
          <Button onClick={openNew} className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4" /> New MTP
          </Button>
        </div>

        {/* ============ PRIVACY BANNER ============ */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-5 py-4 flex gap-3">
          <Lock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-rose-900">MTP register is statutorily confidential.</div>
            <div className="text-rose-800/90 mt-0.5">
              Every read of this page is audit-logged. Disclosing patient identity outside the treating team is a criminal offence under Section 7 of the MTP Act.
            </div>
          </div>
        </div>

        {/* ============ STATS ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <StatCard label="This month" value={thisMonthCount} tint="bg-rose-50 ring-rose-100" icon={<FileWarning className="w-4 h-4 text-rose-600" />} loading={loading} />
          <StatCard label="< 12 weeks" value={u12} tint="bg-emerald-50 ring-emerald-100" icon={<span className="text-xs text-emerald-700 font-bold">&lt;12</span>} loading={loading} />
          <StatCard label="12 – 20 weeks" value={w12to20} tint="bg-amber-50 ring-amber-100" icon={<span className="text-xs text-amber-700 font-bold">12–20</span>} loading={loading} />
          <StatCard label="≥ 20 weeks (board)" value={boardApprovedOver20} sub={`of ${w20to24} 20–24w cases`} tint="bg-violet-50 ring-violet-100" icon={<ShieldAlert className="w-4 h-4 text-violet-600" />} loading={loading} />
        </div>

        {/* ============ LIST ============ */}
        <Card className="rounded-2xl border-slate-200/70 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base text-slate-900">
                All MTP records
                {filtered.length !== records.length && <span className="text-slate-500 font-normal text-sm"> — {filtered.length} shown</span>}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <Input
                    className="pl-9 h-9 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white w-64"
                    placeholder="Search MRN or doctor…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-xl w-36" />
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-xl w-36" />
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <Chip active={activeFilter === null} onClick={() => setActiveFilter(null)}>All</Chip>
              {INDICATIONS.map(i => (
                <Chip
                  key={i.value}
                  active={activeFilter === i.value}
                  onClick={() => setActiveFilter(activeFilter === i.value ? null : i.value)}
                >
                  {i.label}
                </Chip>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState onAdd={openNew} hasRecords={records.length > 0} />
            ) : (
              <div>
                {filtered.map((r) => {
                  const ind = INDICATIONS.find(x => x.value === r.indication);
                  return (
                    <button
                      key={r.id}
                      onClick={() => setDetail(r)}
                      className="w-full text-left flex items-center gap-4 px-6 py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-rose-50 ring-1 ring-rose-100 flex items-center justify-center shrink-0">
                        <FileWarning className="w-5 h-5 text-rose-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900 truncate">{r.patient?.name || '(redacted)'}</span>
                          {r.patientId && r.patient?.mrn && (
                            <MrnLink mrn={r.patient.mrn} patientId={r.patientId} />
                          )}
                          <span className="text-xs text-slate-500 tabular-nums">{r.patientAge} yrs</span>
                          <span className="text-xs text-slate-500 tabular-nums">· {r.gestationWeeks}w gestation</span>
                          <Badge variant="outline" className={`text-[10px] font-normal ${ind?.tint || ''}`}>{ind?.label || r.indication}</Badge>
                          {r.boardConcurrence && (
                            <Badge variant="outline" className="text-[10px] font-normal bg-violet-50 text-violet-700 border-violet-200 gap-1">
                              <ShieldAlert className="w-2.5 h-2.5" /> board
                            </Badge>
                          )}
                          {r.signedAt ? (
                            <Badge variant="outline" className="text-[10px] font-normal bg-emerald-50 text-emerald-700 border-emerald-200">signed</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-normal bg-amber-50 text-amber-700 border-amber-200">draft</Badge>
                          )}
                          {r.registerNumber && (
                            <span className="text-[10px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-mono">{r.registerNumber}</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                          <span>Primary: <span className="text-slate-700">Dr. {r.primaryDoctorName}</span></span>
                          <span className="tabular-nums">{new Date(r.procedureAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
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

      {/* ============ DETAIL SHEET ============ */}
      <Sheet open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <SheetContent width="max-w-lg">
          {detail && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 ring-1 ring-rose-100 flex items-center justify-center">
                    <FileWarning className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <SheetTitle>{detail.patient?.name || '(redacted)'}</SheetTitle>
                    <SheetDescription>
                      MTP #{detail.registerNumber || detail.id.slice(0, 8).toUpperCase()} · {new Date(detail.procedureAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <SheetBody>
                {detail.signedAt ? (
                  <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-800 flex items-center gap-2">
                    <FileSignature className="w-3.5 h-3.5" /> Read-only — signed at {new Date(detail.signedAt).toLocaleString('en-IN')}
                  </div>
                ) : (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" /> Draft — sign to commit. Once signed the record is immutable.
                  </div>
                )}
                <DetailGroup title="Patient">
                  <Kv k="MRN" v={detail.patient?.mrn || '—'} />
                  <Kv k="Age" v={`${detail.patientAge} yrs`} />
                  <Kv k="Husband / Father" v={detail.husbandOrFatherName} />
                  <Kv k="Address" v={detail.address} />
                  <Kv k="Contact" v={detail.contact || '—'} />
                  <Kv k="Gravida / Parity / Living" v={`G${detail.gravida ?? '—'} P${detail.parity ?? '—'} L${detail.livingChildren ?? '—'}`} />
                </DetailGroup>
                <DetailGroup title="Clinical">
                  <Kv k="LMP" v={detail.lmpDate ? new Date(detail.lmpDate).toLocaleDateString('en-IN') : '—'} />
                  <Kv k="Gestation" v={`${detail.gestationWeeks} weeks`} />
                  <Kv k="Indication" v={INDICATIONS.find(i => i.value === detail.indication)?.label || detail.indication} />
                  <Kv k="Details" v={detail.indicationDetails || '—'} />
                  <Kv k="Method" v={METHODS.find(m => m.value === detail.method)?.label || detail.method} />
                </DetailGroup>
                <DetailGroup title="Practitioner(s)">
                  <Kv k="Primary doctor" v={`Dr. ${detail.primaryDoctorName} (${detail.primaryDoctorRegNo})`} />
                  {detail.secondDoctorName && (
                    <Kv k="Second doctor" v={`Dr. ${detail.secondDoctorName} (${detail.secondDoctorRegNo})`} />
                  )}
                  <Kv k="Board concurrence" v={detail.boardConcurrence ? 'Yes' : 'No / not required'} />
                </DetailGroup>
                <DetailGroup title="Outcome">
                  <Kv k="Outcome" v={detail.outcome || '—'} />
                  <Kv k="Complications" v={detail.complications || 'None'} />
                  <Kv k="Notes" v={detail.notes || '—'} />
                </DetailGroup>
              </SheetBody>
              <SheetFooter>
                <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
                {!detail.signedAt && (
                  <Button onClick={() => sign(detail)} disabled={signing} className="gap-1.5 bg-slate-900 hover:bg-slate-800">
                    <FileSignature className="w-4 h-4" /> {signing ? 'Signing…' : 'Sign MTP'}
                  </Button>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ============ CREATE DIALOG ============ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">New MTP record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Legal-gate banners */}
            {needsBoard && !overTwentyFour && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-semibold text-amber-900">Board concurrence required (≥ 20 weeks)</div>
                  <div className="text-amber-800/90">
                    Per the MTP Act 2021, two registered medical practitioners must sign for terminations at or beyond 20 weeks. Fill second doctor's details and tick the board-concurrence checkbox below.
                  </div>
                </div>
              </div>
            )}
            {overTwentyFour && (
              <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 flex gap-3">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-semibold text-red-900">&gt; 24 weeks — restricted to foetal anomaly</div>
                  <div className="text-red-800/90">
                    Beyond 24 weeks of gestation, MTP is permissible <strong>only</strong> for substantial foetal anomaly diagnosed by a Medical Board, per Rule 3B of the MTP Rules. Indication has been locked to "Substantial foetal anomaly".
                  </div>
                </div>
              </div>
            )}

            <Section title="Patient">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs text-slate-500">Patient *</Label>
                  <PatientPicker
                    patients={patients}
                    value={form.patientId}
                    onChange={(p) => setForm({
                      ...form,
                      patientId: p?.id || '',
                      address: p?.address || form.address,
                      contact: p?.contact || form.contact,
                      patientAge: p?.dob
                        ? String(Math.max(0, new Date().getFullYear() - new Date(p.dob).getFullYear()))
                        : form.patientAge,
                    })}
                  />
                </div>
                <FormInput label="Age (yrs) *" type="number" value={form.patientAge} onChange={(v) => setForm({ ...form, patientAge: v })} />
                <FormInput label="Husband / Father name *" value={form.husbandOrFatherName} onChange={(v) => setForm({ ...form, husbandOrFatherName: v })} />
                <div className="col-span-2">
                  <Label className="text-xs text-slate-500">Address *</Label>
                  <Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-lg" />
                </div>
                <FormInput label="Contact" value={form.contact} onChange={(v) => setForm({ ...form, contact: v })} />
                <div />
                <FormInput label="Gravida" type="number" value={form.gravida} onChange={(v) => setForm({ ...form, gravida: v })} />
                <FormInput label="Parity" type="number" value={form.parity} onChange={(v) => setForm({ ...form, parity: v })} />
                <FormInput label="Living children" type="number" value={form.livingChildren} onChange={(v) => setForm({ ...form, livingChildren: v })} />
              </div>
            </Section>

            <Section title="Clinical">
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="LMP" type="date" value={form.lmpDate} onChange={(v) => setForm({ ...form, lmpDate: v })} />
                <FormInput label="Gestation (weeks) *" type="number" value={form.gestationWeeks} onChange={(v) => setForm({ ...form, gestationWeeks: v })} />
                <div className="col-span-2">
                  <Label className="text-xs text-slate-500">Indication * {indicationLockedToAnomaly && <Lock className="inline w-3 h-3 ml-1" />}</Label>
                  <Select value={form.indication} onValueChange={(v) => setForm({ ...form, indication: v })} disabled={indicationLockedToAnomaly}>
                    <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INDICATIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-slate-500">Indication details</Label>
                  <Textarea rows={2} value={form.indicationDetails} onChange={(e) => setForm({ ...form, indicationDetails: e.target.value })} className="rounded-lg" />
                </div>
                <FormSelect label="Method *" value={form.method} onChange={(v) => setForm({ ...form, method: v })} options={METHODS} />
                <FormInput label="Procedure date/time *" type="datetime-local" value={form.procedureAt} onChange={(v) => setForm({ ...form, procedureAt: v })} />
              </div>
            </Section>

            <Section title={needsBoard ? 'Practitioners (board concurrence required)' : 'Practitioner'}>
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Primary doctor name *" value={form.primaryDoctorName} onChange={(v) => setForm({ ...form, primaryDoctorName: v })} />
                <FormInput label="Primary doctor reg. no. *" value={form.primaryDoctorRegNo} onChange={(v) => setForm({ ...form, primaryDoctorRegNo: v })} />
                {needsBoard && (
                  <>
                    <FormInput label="Second doctor name *" value={form.secondDoctorName} onChange={(v) => setForm({ ...form, secondDoctorName: v })} />
                    <FormInput label="Second doctor reg. no. *" value={form.secondDoctorRegNo} onChange={(v) => setForm({ ...form, secondDoctorRegNo: v })} />
                    <label className="col-span-2 flex items-center gap-2 text-sm text-slate-700 mt-1 p-2 border border-amber-200 bg-amber-50/40 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!form.boardConcurrence}
                        onChange={(e) => setForm({ ...form, boardConcurrence: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span>I confirm both RMPs have examined the case and concurred per the MTP Act 2021.</span>
                    </label>
                  </>
                )}
              </div>
            </Section>

            <Section title="Outcome (optional)">
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Outcome" value={form.outcome} placeholder="e.g. completed, incomplete, ongoing" onChange={(v) => setForm({ ...form, outcome: v })} />
                <FormInput label="Complications" value={form.complications} onChange={(v) => setForm({ ...form, complications: v })} />
                <div className="col-span-2">
                  <Label className="text-xs text-slate-500">Notes</Label>
                  <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-lg" />
                </div>
              </div>
            </Section>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving || !canSave} className="bg-slate-900 hover:bg-slate-800">
              {saving ? 'Saving…' : 'Save draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ====================== sub-components ======================

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

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? 'text-xs px-3 py-1 rounded-full bg-slate-900 text-white font-medium transition-colors'
          : 'text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors'
      }
    >
      {children}
    </button>
  );
}

function EmptyState({ onAdd, hasRecords }: { onAdd: () => void; hasRecords: boolean }) {
  return (
    <div className="py-16 px-6 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 ring-1 ring-rose-100 flex items-center justify-center mb-4">
        <FileWarning className="w-8 h-8 text-rose-500" />
      </div>
      <h3 className="text-base font-medium text-slate-900">
        {hasRecords ? 'No matching records' : 'No MTP records yet'}
      </h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        {hasRecords
          ? 'Try clearing the filter or date range.'
          : 'Every MTP procedure must be logged here per the MTP Act 2021.'}
      </p>
      {!hasRecords && (
        <Button onClick={onAdd} className="gap-1.5 mt-5 rounded-xl bg-slate-900 hover:bg-slate-800">
          <Plus className="w-4 h-4" /> Add first MTP
        </Button>
      )}
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
      <dd className="text-slate-900 text-right break-words tabular-nums">{v ?? '—'}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-semibold">{title}</div>
      {children}
    </div>
  );
}

function FormInput({ label, value, onChange, type = 'text', placeholder }: { label: string; value: any; onChange: (v: any) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs text-slate-500">{label}</Label>
      <Input type={type as any} value={value === null || value === undefined ? '' : value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="rounded-lg" />
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
    ? patients.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || (p.mrn || '').toLowerCase().includes(q.toLowerCase()))
        .slice(0, 12)
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
              <div className="text-xs text-slate-500">{p.mrn} · {p.gender || '—'}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
