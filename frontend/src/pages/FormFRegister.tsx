// Form-F Register (PCPNDT Act 1994) — statutory ultrasound register.
//
// Compliance notes baked into the UI:
//   • Sex of foetus is NOT collectable here. The form deliberately
//     omits any field that would let an operator enter / disclose it.
//   • Once signed, a row is immutable. Edits are blocked client-side;
//     the backend also rejects PUTs to signed rows as defence in depth.
//   • The Form-F PDF mirrors the statutory printed form so the wet-ink
//     signed copy can be attached to the clinic's monthly inspection
//     binder.

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
  Scan, Plus, Printer, Search, ShieldAlert, FileSignature, AlertTriangle,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { generateFormFPDF } from '../utils/pdfGenerator';
import PdfPreviewDialog, { type PdfDoc } from '../components/PdfPreviewDialog';
import MrnLink from '../components/MrnLink';

interface PatientLite {
  id: string;
  mrn: string;
  name: string;
  dob?: string | null;
  gender?: string | null;
  address?: string | null;
}

interface FormF {
  id: string;
  formNumber?: string | null;
  patientId?: string | null;
  patient?: PatientLite | null;
  patientName: string;
  patientAge: number;
  patientHusbandOrFather: string;
  patientAddress: string;
  spouseName?: string | null;
  priorChildren?: number | null;
  priorChildrenGender?: string | null;
  referredByName?: string | null;
  referrerRegNo?: string | null;
  lmpDate?: string | null;
  gestationWeeks?: number | null;
  obstetricHistory?: string | null;
  indication: string;
  indicationOther?: string | null;
  procedure: string;
  findings?: string | null;
  sonologistName: string;
  sonologistRegNo: string;
  sonologistPcpndtCertNo: string;
  performedAt: string;
  signedAt?: string | null;
  signedBy?: string | null;
  signedByName?: string | null;
  createdAt: string;
}

const INDICATIONS = [
  { value: 'anomaly_screening',   label: 'Anomaly screening',     tint: 'bg-rose-50 text-rose-700 border-rose-200' },
  { value: 'growth_monitoring',   label: 'Growth monitoring',     tint: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'placenta_location',   label: 'Placenta location',     tint: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'liquor_volume',       label: 'Liquor volume',         tint: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { value: 'biophysical_profile', label: 'Biophysical profile',   tint: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'twin_pregnancy',      label: 'Twin pregnancy',        tint: 'bg-violet-50 text-violet-700 border-violet-200' },
  { value: 'cervical_length',     label: 'Cervical length',       tint: 'bg-pink-50 text-pink-700 border-pink-200' },
  { value: 'doppler_study',       label: 'Doppler study',         tint: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'other',               label: 'Other',                 tint: 'bg-slate-100 text-slate-700 border-slate-200' },
];

const PROCEDURES = [
  { value: 'usg_abdominal',     label: 'USG — Abdominal' },
  { value: 'usg_transvaginal',  label: 'USG — Transvaginal' },
  { value: 'doppler',           label: 'Doppler' },
];

const PIE_COLORS = ['#f43f5e', '#3b82f6', '#f59e0b', '#06b6d4', '#10b981', '#8b5cf6', '#ec4899', '#6366f1', '#94a3b8'];

export default function FormFRegister() {
  const [records, setRecords] = useState<FormF[]>([]);
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [detail, setDetail] = useState<FormF | null>(null);
  const [pdf, setPdf] = useState<PdfDoc | null>(null);
  const [signing, setSigning] = useState(false);
  const toast = useToast();

  function emptyForm() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    return {
      patientId: '',
      patientName: '',
      patientAge: '',
      patientHusbandOrFather: '',
      patientAddress: '',
      spouseName: '',
      priorChildren: '',
      priorChildrenGender: '',
      referredByName: '',
      referrerRegNo: '',
      lmpDate: '',
      gestationWeeks: '',
      obstetricHistory: '',
      indication: 'anomaly_screening',
      indicationOther: '',
      procedure: 'usg_abdominal',
      sonologistName: '',
      sonologistRegNo: '',
      sonologistPcpndtCertNo: '',
      performedAt: local,
      findings: '',
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
        api.get('/api/form-f', { params }).catch(() => ({ data: [] })),
        api.get('/api/patients', { params: { limit: 500 } }).catch(() => ({ data: [] })),
      ]);
      setRecords(Array.isArray(r.data) ? r.data : (r.data?.items || []));
      const raw = Array.isArray(p.data) ? p.data : (p.data?.items || []);
      setPatients(raw.map((x: any) => ({
        id: x.id, mrn: x.mrn, name: x.name,
        dob: x.dob, gender: x.gender, address: x.address,
      })));
    } finally {
      setLoading(false);
    }
  }
  // Reload on filter/search change with a small debounce.
  useEffect(() => {
    const t = setTimeout(() => { void load(); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, search]);

  function openNew() { setForm(emptyForm()); setDialogOpen(true); }

  async function save() {
    // Required-field gate (mirrors backend schema, gives a friendly client error).
    if (!form.patientName) { toast.error('Patient name is required'); return; }
    if (!form.patientAge)  { toast.error('Patient age is required'); return; }
    if (!form.patientHusbandOrFather) { toast.error('Husband / Father name is required'); return; }
    if (!form.patientAddress) { toast.error('Patient address is required'); return; }
    if (!form.indication) { toast.error('Indication is required'); return; }
    if (form.indication === 'other' && !form.indicationOther) {
      toast.error('Specify the "other" indication');
      return;
    }
    if (!form.procedure) { toast.error('Procedure is required'); return; }
    if (!form.sonologistName || !form.sonologistRegNo || !form.sonologistPcpndtCertNo) {
      toast.error('Sonologist name + reg no + PCPNDT cert are required');
      return;
    }
    if (!form.performedAt) { toast.error('Performed-at is required'); return; }

    setSaving(true);
    try {
      const payload: any = { ...form };
      payload.patientAge = Number(payload.patientAge);
      if (payload.priorChildren !== '' && payload.priorChildren !== null) payload.priorChildren = Number(payload.priorChildren);
      else delete payload.priorChildren;
      if (payload.gestationWeeks !== '' && payload.gestationWeeks !== null) payload.gestationWeeks = Number(payload.gestationWeeks);
      else delete payload.gestationWeeks;
      payload.performedAt = new Date(payload.performedAt).toISOString();
      if (payload.lmpDate) payload.lmpDate = new Date(payload.lmpDate).toISOString();
      // Strip empties so the backend doesn't see "" for optional string fields.
      Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] === null) delete payload[k]; });
      await api.post('/api/form-f', payload);
      setDialogOpen(false);
      toast.success('Form-F saved', 'Draft — remember to sign before EOD.');
      void load();
    } catch (e: any) {
      toast.error('Save failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function sign(rec: FormF) {
    setSigning(true);
    try {
      await api.post(`/api/form-f/${rec.id}/sign`);
      toast.success('Form-F signed', 'Record is now immutable.');
      // Re-fetch the row so detail drawer reflects the signedAt timestamp.
      const r = await api.get(`/api/form-f/${rec.id}`);
      setDetail(r.data);
      void load();
    } catch (e: any) {
      toast.error('Sign failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSigning(false);
    }
  }

  function printPdf(rec: FormF) {
    const out = generateFormFPDF({
      formNumber: rec.formNumber || rec.id.slice(0, 8).toUpperCase(),
      patientName: rec.patientName,
      patientAge: rec.patientAge,
      patientHusbandOrFather: rec.patientHusbandOrFather,
      patientAddress: rec.patientAddress,
      spouseName: rec.spouseName || undefined,
      priorChildren: rec.priorChildren ?? undefined,
      priorChildrenGender: rec.priorChildrenGender || undefined,
      referredByName: rec.referredByName || undefined,
      referrerRegNo: rec.referrerRegNo || undefined,
      lmpDate: rec.lmpDate ? new Date(rec.lmpDate).toLocaleDateString('en-IN') : undefined,
      gestationWeeks: rec.gestationWeeks ?? undefined,
      obstetricHistory: rec.obstetricHistory || undefined,
      indication: INDICATIONS.find(i => i.value === rec.indication)?.label || rec.indication,
      indicationOther: rec.indicationOther || undefined,
      procedure: PROCEDURES.find(p => p.value === rec.procedure)?.label || rec.procedure,
      findings: rec.findings || undefined,
      sonologistName: rec.sonologistName,
      sonologistRegNo: rec.sonologistRegNo,
      sonologistPcpndtCertNo: rec.sonologistPcpndtCertNo,
      performedAt: new Date(rec.performedAt).toLocaleString('en-IN'),
      signedAt: rec.signedAt ? new Date(rec.signedAt).toLocaleString('en-IN') : undefined,
    });
    setPdf(out);
  }

  // -------- derived data --------
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const thisMonthCount = records.filter(r => new Date(r.performedAt) >= monthStart).length;
  const draftCount = records.filter(r => !r.signedAt).length;
  const signedCount = records.filter(r => !!r.signedAt).length;

  const donutData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of records) map[r.indication] = (map[r.indication] || 0) + 1;
    return INDICATIONS
      .map(i => ({ name: i.label, key: i.value, value: map[i.value] || 0 }))
      .filter(x => x.value > 0);
  }, [records]);

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
            <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center ring-1 ring-pink-100">
              <Scan className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Form-F Register</h1>
              <p className="text-sm text-slate-500 mt-0.5">PCPNDT Act 1994 — Pre-natal ultrasound register</p>
            </div>
          </div>
          <Button onClick={openNew} className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4" /> New Form-F
          </Button>
        </div>

        {/* ============ STATUTORY WARNING ============ */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4 flex gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-amber-900">Form-F is mandatory per the PCPNDT Act 1994.</div>
            <div className="text-amber-800/90 mt-0.5">
              Sex determination of the foetus is <strong>prohibited</strong> by law and is not collectable here. Disclosure to the patient, family, or any third party is a punishable offence.
            </div>
          </div>
        </div>

        {/* ============ STATS ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <StatCard label="This month" value={thisMonthCount} tint="bg-pink-50 ring-pink-100" icon={<Scan className="w-4 h-4 text-pink-600" />} loading={loading} />
          <StatCard label="Drafts (unsigned)" value={draftCount} accent="text-amber-700" tint="bg-amber-50 ring-amber-100" icon={<AlertTriangle className="w-4 h-4 text-amber-600" />} loading={loading} sub={draftCount ? 'Sign before EOD' : 'all signed'} />
          <StatCard label="Signed" value={signedCount} accent="text-emerald-700" tint="bg-emerald-50 ring-emerald-100" icon={<FileSignature className="w-4 h-4 text-emerald-600" />} loading={loading} />
          <Card className="rounded-2xl border-slate-200/70 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">By indication</CardTitle>
            </CardHeader>
            <CardContent className="h-24 flex items-center pt-0">
              {loading ? <Skeleton className="w-full h-full rounded-xl" /> : donutData.length === 0 ? (
                <p className="text-xs text-slate-400 mx-auto">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={90}>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={22} outerRadius={38} paddingAngle={2}>
                      {donutData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ============ LIST ============ */}
        <Card className="rounded-2xl border-slate-200/70 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base text-slate-900">
                All Form-F records
                {filtered.length !== records.length && <span className="text-slate-500 font-normal text-sm"> — {filtered.length} shown</span>}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <Input
                    className="pl-9 h-9 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white w-64"
                    placeholder="Search patient or sonologist…"
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
                      <div className="w-10 h-10 rounded-xl bg-pink-50 ring-1 ring-pink-100 flex items-center justify-center shrink-0">
                        <Scan className="w-5 h-5 text-pink-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900 truncate">{r.patientName}</span>
                          {r.patientId && r.patient?.mrn && (
                            <MrnLink mrn={r.patient.mrn} patientId={r.patientId} />
                          )}
                          <span className="text-xs text-slate-500 tabular-nums">{r.patientAge} yrs</span>
                          <span className="text-xs text-slate-500">· w/o {r.patientHusbandOrFather}</span>
                          <Badge variant="outline" className={`text-[10px] font-normal ${ind?.tint || ''}`}>{ind?.label || r.indication}</Badge>
                          {r.signedAt ? (
                            <Badge variant="outline" className="text-[10px] font-normal bg-emerald-50 text-emerald-700 border-emerald-200">signed</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-normal bg-amber-50 text-amber-700 border-amber-200">draft</Badge>
                          )}
                          {r.formNumber && (
                            <span className="text-[10px] text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded font-mono">{r.formNumber}</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                          <span>Sonologist: <span className="text-slate-700">{r.sonologistName}</span></span>
                          <span className="tabular-nums">{new Date(r.performedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })} · {new Date(r.performedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); printPdf(r); }} className="gap-1 h-9 rounded-lg shrink-0">
                        <Printer className="w-3.5 h-3.5" /> Print
                      </Button>
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
                  <div className="w-10 h-10 rounded-xl bg-pink-50 ring-1 ring-pink-100 flex items-center justify-center">
                    <Scan className="w-5 h-5 text-pink-600" />
                  </div>
                  <div>
                    <SheetTitle>{detail.patientName}</SheetTitle>
                    <SheetDescription>
                      Form-F #{detail.formNumber || detail.id.slice(0, 8).toUpperCase()} · {new Date(detail.performedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
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
                  <Kv k="Age" v={`${detail.patientAge} yrs`} />
                  <Kv k="Husband / Father" v={detail.patientHusbandOrFather} />
                  <Kv k="Spouse" v={detail.spouseName || '—'} />
                  <Kv k="Address" v={detail.patientAddress} />
                  <Kv k="Prior children" v={detail.priorChildren != null ? `${detail.priorChildren} (${detail.priorChildrenGender || '—'})` : '—'} />
                </DetailGroup>
                <DetailGroup title="Referrer">
                  <Kv k="Name" v={detail.referredByName || '—'} />
                  <Kv k="Reg. No." v={detail.referrerRegNo || '—'} />
                </DetailGroup>
                <DetailGroup title="Clinical">
                  <Kv k="LMP" v={detail.lmpDate ? new Date(detail.lmpDate).toLocaleDateString('en-IN') : '—'} />
                  <Kv k="Gestation (weeks)" v={detail.gestationWeeks ?? '—'} />
                  <Kv k="Obstetric history" v={detail.obstetricHistory || '—'} />
                </DetailGroup>
                <DetailGroup title="Indication & procedure">
                  <Kv k="Indication" v={INDICATIONS.find(i => i.value === detail.indication)?.label || detail.indication} />
                  <Kv k="Other" v={detail.indicationOther || '—'} />
                  <Kv k="Procedure" v={PROCEDURES.find(p => p.value === detail.procedure)?.label || detail.procedure} />
                  <Kv k="Findings" v={detail.findings || '—'} />
                </DetailGroup>
                <DetailGroup title="Sonologist">
                  <Kv k="Name" v={detail.sonologistName} />
                  <Kv k="Reg. No." v={detail.sonologistRegNo} />
                  <Kv k="PCPNDT cert" v={detail.sonologistPcpndtCertNo} />
                </DetailGroup>
              </SheetBody>
              <SheetFooter>
                <Button variant="outline" onClick={() => printPdf(detail)} className="gap-1.5">
                  <Printer className="w-4 h-4" /> Print
                </Button>
                {!detail.signedAt && (
                  <Button onClick={() => sign(detail)} disabled={signing} className="gap-1.5 bg-slate-900 hover:bg-slate-800">
                    <FileSignature className="w-4 h-4" /> {signing ? 'Signing…' : 'Sign Form-F'}
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
            <DialogTitle className="text-xl">New Form-F</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Section title="Patient">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs text-slate-500">Existing patient (optional)</Label>
                  <PatientPicker
                    patients={patients}
                    value={form.patientId}
                    onChange={(p) => setForm({
                      ...form,
                      patientId: p?.id || '',
                      patientName: p?.name || form.patientName,
                      patientAddress: p?.address || form.patientAddress,
                      patientAge: p?.dob
                        ? String(Math.max(0, new Date().getFullYear() - new Date(p.dob).getFullYear()))
                        : form.patientAge,
                    })}
                  />
                </div>
                <FormInput label="Patient name *" value={form.patientName} onChange={(v) => setForm({ ...form, patientName: v })} />
                <FormInput label="Age (yrs) *" type="number" value={form.patientAge} onChange={(v) => setForm({ ...form, patientAge: v })} />
                <FormInput label="Husband / Father name *" value={form.patientHusbandOrFather} onChange={(v) => setForm({ ...form, patientHusbandOrFather: v })} />
                <FormInput label="Spouse name" value={form.spouseName} onChange={(v) => setForm({ ...form, spouseName: v })} />
                <div className="col-span-2">
                  <Label className="text-xs text-slate-500">Address *</Label>
                  <Textarea rows={2} value={form.patientAddress} onChange={(e) => setForm({ ...form, patientAddress: e.target.value })} className="rounded-lg" />
                </div>
                <FormInput label="Prior living children" type="number" value={form.priorChildren} onChange={(v) => setForm({ ...form, priorChildren: v })} />
                <FormInput label="Prior children gender mix" value={form.priorChildrenGender} placeholder="e.g. 2M 1F" onChange={(v) => setForm({ ...form, priorChildrenGender: v })} />
              </div>
            </Section>

            <Section title="Referring RMP">
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Referrer name" value={form.referredByName} onChange={(v) => setForm({ ...form, referredByName: v })} />
                <FormInput label="Referrer reg. no." value={form.referrerRegNo} onChange={(v) => setForm({ ...form, referrerRegNo: v })} />
              </div>
            </Section>

            <Section title="Clinical">
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="LMP" type="date" value={form.lmpDate} onChange={(v) => setForm({ ...form, lmpDate: v })} />
                <FormInput label="Gestation (weeks)" type="number" value={form.gestationWeeks} onChange={(v) => setForm({ ...form, gestationWeeks: v })} />
                <div className="col-span-2">
                  <Label className="text-xs text-slate-500">Obstetric history</Label>
                  <Textarea rows={2} value={form.obstetricHistory} onChange={(e) => setForm({ ...form, obstetricHistory: e.target.value })} className="rounded-lg" />
                </div>
              </div>
            </Section>

            <Section title="Indication">
              <div className="grid grid-cols-2 gap-3">
                <FormSelect label="Indication *" value={form.indication} onChange={(v) => setForm({ ...form, indication: v })} options={INDICATIONS} />
                {form.indication === 'other' && (
                  <FormInput label='Specify "other" indication *' value={form.indicationOther} onChange={(v) => setForm({ ...form, indicationOther: v })} />
                )}
              </div>
            </Section>

            <Section title="Procedure">
              <div className="grid grid-cols-2 gap-3">
                <FormSelect label="Procedure *" value={form.procedure} onChange={(v) => setForm({ ...form, procedure: v })} options={PROCEDURES} />
                <FormInput label="Performed at *" type="datetime-local" value={form.performedAt} onChange={(v) => setForm({ ...form, performedAt: v })} />
                <div className="col-span-2">
                  <Label className="text-xs text-slate-500">Findings (excl. sex of foetus)</Label>
                  <Textarea rows={3} value={form.findings} onChange={(e) => setForm({ ...form, findings: e.target.value })} className="rounded-lg" placeholder="Describe relevant findings. DO NOT record the sex of the foetus." />
                </div>
              </div>
            </Section>

            <Section title="Sonologist">
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Sonologist name *" value={form.sonologistName} onChange={(v) => setForm({ ...form, sonologistName: v })} />
                <FormInput label="MCI / SMC Reg. No. *" value={form.sonologistRegNo} onChange={(v) => setForm({ ...form, sonologistRegNo: v })} />
                <FormInput label="PCPNDT Certificate No. *" value={form.sonologistPcpndtCertNo} onChange={(v) => setForm({ ...form, sonologistPcpndtCertNo: v })} />
              </div>
            </Section>

            <p className="text-xs text-amber-700 px-1 bg-amber-50 border border-amber-200 rounded-lg py-2">
              <strong>Reminder:</strong> Disclosing the sex of the foetus is a punishable offence under the PCPNDT Act 1994.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Saving…' : 'Save draft'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PdfPreviewDialog pdf={pdf} onClose={() => setPdf(null)} title="Form-F" />
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
      <div className="w-16 h-16 rounded-2xl bg-pink-50 ring-1 ring-pink-100 flex items-center justify-center mb-4">
        <Scan className="w-8 h-8 text-pink-500" />
      </div>
      <h3 className="text-base font-medium text-slate-900">
        {hasRecords ? 'No matching records' : 'No Form-F records yet'}
      </h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        {hasRecords
          ? 'Try clearing the filter or date range.'
          : 'Every prenatal ultrasound must be logged here per the PCPNDT Act.'}
      </p>
      {!hasRecords && (
        <Button onClick={onAdd} className="gap-1.5 mt-5 rounded-xl bg-slate-900 hover:bg-slate-800">
          <Plus className="w-4 h-4" /> Add first Form-F
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
