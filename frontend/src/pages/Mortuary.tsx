// Mortuary — refreshed UI. Body-storage register + India Form-4
// Medical Certificate of Cause of Death issuance. Same visual
// patterns as BirthRecords: soft cards, drawer detail, skeleton
// loaders, illustrated empty state.

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  Cross, Plus, Pencil, FileText, Printer, Search, Archive, ArrowRight,
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip,
} from 'recharts';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { generateDeathCertificatePDF } from '../utils/pdfGenerator';
import PdfPreviewDialog, { PdfDoc } from '../components/PdfPreviewDialog';

interface MortuaryRecord {
  id: string;
  bodyNumber: string;
  deceasedName: string;
  age?: number | null;
  gender?: string | null;
  contact?: string | null;
  address?: string | null;
  dateOfDeath: string;
  placeOfDeath?: string | null;
  causeOfDeath?: string | null;
  doctorOnDuty?: string | null;
  fridgeUnit?: string | null;
  shelfNumber?: string | null;
  storedAt?: string | null;
  releasedAt?: string | null;
  releasedTo?: string | null;
  releaseAuthBy?: string | null;
  autopsyRequired?: boolean;
  remarks?: string | null;
  status: string;
  immediateCause?: string | null;
  immediateInterval?: string | null;
  antecedentCause1?: string | null;
  antecedent1Interval?: string | null;
  antecedentCause2?: string | null;
  antecedent2Interval?: string | null;
  contributingCauses?: string | null;
  mannerOfDeath?: string | null;
  modeOfDeath?: string | null;
  certifyingDoctorName?: string | null;
  certifyingDoctorReg?: string | null;
  certificateNumber?: string | null;
  certificateIssuedAt?: string | null;
}

const STATUS_OPTIONS = ['stored', 'released', 'autopsy', 'transferred'];
const STATUS_TINTS: Record<string, string> = {
  stored:      'bg-blue-50 text-blue-700 border-blue-200',
  released:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  autopsy:     'bg-amber-50 text-amber-700 border-amber-200',
  transferred: 'bg-slate-100 text-slate-700 border-slate-200',
};
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const MANNER_OPTIONS = ['natural', 'accident', 'suicide', 'homicide', 'pending investigation'];

export default function Mortuary() {
  const [records, setRecords] = useState<MortuaryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [recordDialog, setRecordDialog] = useState(false);
  const [certDialog, setCertDialog] = useState(false);
  const [editing, setEditing] = useState<MortuaryRecord | null>(null);
  const [form, setForm] = useState<any>({});
  const [certForm, setCertForm] = useState<any>({});
  const [certTarget, setCertTarget] = useState<MortuaryRecord | null>(null);
  const [pdf, setPdf] = useState<PdfDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [detail, setDetail] = useState<MortuaryRecord | null>(null);
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/api/mortuary');
      setRecords(Array.isArray(r.data) ? r.data : []);
    } catch (e: any) {
      toast.error('Load failed', e?.response?.data?.error || 'Try again');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  function openNew() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditing(null);
    setForm({
      bodyNumber: '', deceasedName: '', age: '', gender: 'Male',
      contact: '', address: '', dateOfDeath: local, placeOfDeath: '',
      doctorOnDuty: '', fridgeUnit: '', shelfNumber: '',
      status: 'stored', remarks: '',
    });
    setRecordDialog(true);
  }

  function openEdit(r: MortuaryRecord) {
    setEditing(r);
    setForm({
      ...r,
      dateOfDeath: r.dateOfDeath ? new Date(r.dateOfDeath).toISOString().slice(0, 16) : '',
      storedAt: r.storedAt ? new Date(r.storedAt).toISOString().slice(0, 16) : '',
      releasedAt: r.releasedAt ? new Date(r.releasedAt).toISOString().slice(0, 16) : '',
    });
    setRecordDialog(true);
    setDetail(null);
  }

  async function save() {
    if (!form.deceasedName) { toast.error('Deceased name is required'); return; }
    if (!form.dateOfDeath)  { toast.error('Date of death is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      ['age'].forEach(k => { payload[k] = payload[k] === '' || payload[k] === null ? null : Number(payload[k]); });
      if (editing) await api.put(`/api/mortuary/${editing.id}`, payload);
      else         await api.post('/api/mortuary', payload);
      toast.success(editing ? 'Updated' : 'Body registered');
      setRecordDialog(false);
      void load();
    } catch (e: any) {
      toast.error('Save failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  function openIssueCert(r: MortuaryRecord) {
    setCertTarget(r);
    setCertForm({
      address:              r.address || '',
      placeOfDeath:         r.placeOfDeath || '',
      immediateCause:       r.immediateCause || r.causeOfDeath || '',
      immediateInterval:    r.immediateInterval || '',
      antecedentCause1:     r.antecedentCause1 || '',
      antecedent1Interval:  r.antecedent1Interval || '',
      antecedentCause2:     r.antecedentCause2 || '',
      antecedent2Interval:  r.antecedent2Interval || '',
      contributingCauses:   r.contributingCauses || '',
      mannerOfDeath:        r.mannerOfDeath || 'natural',
      modeOfDeath:          r.modeOfDeath || '',
      certifyingDoctorName: r.certifyingDoctorName || r.doctorOnDuty || '',
      certifyingDoctorReg:  r.certifyingDoctorReg || '',
    });
    setCertDialog(true);
    setDetail(null);
  }

  async function issueAndPrint() {
    if (!certTarget) return;
    if (!certForm.immediateCause)       { toast.error('Immediate cause of death is required'); return; }
    if (!certForm.certifyingDoctorName) { toast.error('Certifying doctor name is required'); return; }
    setSaving(true);
    try {
      const r = await api.post(`/api/mortuary/${certTarget.id}/issue-certificate`, certForm);
      const full = r.data;
      const out = generateDeathCertificatePDF({
        certificateNumber: full.certificateNumber,
        deceasedName: full.deceasedName,
        age: full.age ?? undefined,
        gender: full.gender ?? undefined,
        address: full.address ?? undefined,
        dateOfDeath: new Date(full.dateOfDeath).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' }),
        placeOfDeath: full.placeOfDeath ?? undefined,
        immediateCause: full.immediateCause,
        immediateInterval: full.immediateInterval ?? undefined,
        antecedentCause1: full.antecedentCause1 ?? undefined,
        antecedent1Interval: full.antecedent1Interval ?? undefined,
        antecedentCause2: full.antecedentCause2 ?? undefined,
        antecedent2Interval: full.antecedent2Interval ?? undefined,
        contributingCauses: full.contributingCauses ?? undefined,
        mannerOfDeath: full.mannerOfDeath ?? undefined,
        modeOfDeath: full.modeOfDeath ?? undefined,
        certifyingDoctorName: full.certifyingDoctorName,
        certifyingDoctorReg: full.certifyingDoctorReg ?? undefined,
        issuedAt: new Date(full.certificateIssuedAt || Date.now()).toLocaleDateString('en-IN'),
        issuedBy: 'Hospital Records',
      });
      setPdf(out);
      setCertDialog(false);
      void load();
    } catch (e: any) {
      toast.error('Issue failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  // ---- derived ----
  const total    = records.length;
  const stored   = records.filter(r => r.status === 'stored').length;
  const released = records.filter(r => r.status === 'released').length;
  const issued   = records.filter(r => !!r.certificateNumber).length;

  const sparkData = useMemo(() => {
    const days: { d: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const next = new Date(day); next.setDate(next.getDate() + 1);
      const count = records.filter(r => {
        const t = new Date(r.dateOfDeath).getTime();
        return t >= day.getTime() && t < next.getTime();
      }).length;
      days.push({ d: day.toLocaleDateString('en-IN', { weekday: 'short' }), count });
    }
    return days;
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (activeFilter && r.status !== activeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.deceasedName.toLowerCase().includes(q) ||
          (r.bodyNumber || '').toLowerCase().includes(q) ||
          (r.certificateNumber || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, search, activeFilter]);

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center">
              <Cross className="w-6 h-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Mortuary</h1>
              <p className="text-sm text-slate-500 mt-0.5">Body storage register & Medical Certificate of Cause of Death (Form 4)</p>
            </div>
          </div>
          <Button onClick={openNew} className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4" /> Register body
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <StatCard label="Total cases"        value={total}    icon={<Archive className="w-4 h-4 text-slate-700" />}    tint="bg-slate-100 ring-slate-200" loading={loading} />
          <StatCard label="In storage"         value={stored}   icon={<Archive className="w-4 h-4 text-blue-600" />}     tint="bg-blue-50 ring-blue-100"    accent="text-blue-700" loading={loading} />
          <StatCard label="Released"           value={released} icon={<ArrowRight className="w-4 h-4 text-emerald-600" />} tint="bg-emerald-50 ring-emerald-100" accent="text-emerald-700" loading={loading} />
          <StatCard label="Certificates issued" value={issued}  sub={`of ${total}`}
                    icon={<FileText className="w-4 h-4 text-violet-600" />} tint="bg-violet-50 ring-violet-100"
                    accent="text-violet-700" loading={loading} />
        </div>

        {/* Chart strip */}
        <Card className="rounded-2xl border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600">Last 7 days — cases registered</CardTitle>
            <span className="text-xs text-slate-500">{sparkData.reduce((a, b) => a + b.count, 0)} this week</span>
          </CardHeader>
          <CardContent className="h-28 pt-0">
            {loading ? <Skeleton className="w-full h-full rounded-xl" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mcolor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#64748b" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#64748b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip cursor={{ stroke: '#64748b', strokeDasharray: 3 }} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" stroke="#64748b" strokeWidth={2} fill="url(#mcolor)" dot={{ r: 3, fill: '#64748b' }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* List */}
        <Card className="rounded-2xl border-slate-200/70 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base text-slate-900">
                All cases {filtered.length !== records.length && <span className="text-slate-500 font-normal text-sm">— {filtered.length} shown</span>}
              </CardTitle>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <Input
                  className="pl-9 h-9 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white"
                  placeholder="Search deceased, body #, cert #…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <Chip active={activeFilter === null} onClick={() => setActiveFilter(null)}>All</Chip>
              {STATUS_OPTIONS.map(s => (
                <Chip key={s} active={activeFilter === s} onClick={() => setActiveFilter(activeFilter === s ? null : s)}>{s}</Chip>
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
                {filtered.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setDetail(r)}
                    className="w-full text-left flex items-center gap-4 px-6 py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center shrink-0">
                      <Cross className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900 truncate">{r.deceasedName}</span>
                        <Badge variant="outline" className={`text-[10px] font-normal ${STATUS_TINTS[r.status] || ''}`}>{r.status}</Badge>
                        <span className="text-[10px] text-slate-500 font-mono">{r.bodyNumber}</span>
                        {r.certificateNumber && (
                          <span className="text-[10px] text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded font-mono">{r.certificateNumber}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                        <span>{r.age ?? '—'} yrs · {r.gender ?? '—'}</span>
                        <span>{new Date(r.dateOfDeath).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · {new Date(r.dateOfDeath).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        {(r.fridgeUnit || r.shelfNumber) && <span>{r.fridgeUnit || '—'} / {r.shelfNumber || '—'}</span>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); openIssueCert(r); }}
                      className="gap-1 h-9 rounded-lg shrink-0"
                    >
                      {r.certificateNumber ? <Printer className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                      {r.certificateNumber ? 'Reprint' : 'Issue'}
                    </Button>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail drawer */}
      <Sheet open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <SheetContent width="max-w-lg">
          {detail && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center">
                    <Cross className="w-5 h-5 text-slate-700" />
                  </div>
                  <div>
                    <SheetTitle>{detail.deceasedName}</SheetTitle>
                    <SheetDescription>
                      {new Date(detail.dateOfDeath).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      {detail.bodyNumber && ` · ${detail.bodyNumber}`}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <SheetBody>
                <DetailGroup title="Deceased">
                  <Kv k="Age / Sex" v={`${detail.age ?? '—'} / ${detail.gender ?? '—'}`} />
                  <Kv k="Family contact" v={detail.contact} />
                  <Kv k="Address" v={detail.address} />
                  <Kv k="Place of death" v={detail.placeOfDeath} />
                  <Kv k="Doctor on duty" v={detail.doctorOnDuty} />
                  <Kv k="Cause (summary)" v={detail.causeOfDeath} />
                </DetailGroup>
                <DetailGroup title="Storage">
                  <Kv k="Status" v={detail.status} />
                  <Kv k="Fridge / Shelf" v={`${detail.fridgeUnit || '—'} / ${detail.shelfNumber || '—'}`} />
                  <Kv k="Stored at" v={detail.storedAt ? new Date(detail.storedAt).toLocaleString('en-IN') : '—'} />
                  <Kv k="Released at" v={detail.releasedAt ? new Date(detail.releasedAt).toLocaleString('en-IN') : '—'} />
                  <Kv k="Released to" v={detail.releasedTo} />
                </DetailGroup>
                <DetailGroup title="Form-4 Certificate">
                  <Kv k="Certificate #" v={detail.certificateNumber || 'not issued'} />
                  <Kv k="Immediate cause" v={detail.immediateCause} />
                  <Kv k="Antecedent (b)" v={detail.antecedentCause1} />
                  <Kv k="Antecedent (c)" v={detail.antecedentCause2} />
                  <Kv k="Manner" v={detail.mannerOfDeath} />
                  <Kv k="Certifying doctor" v={detail.certifyingDoctorName} />
                  <Kv k="Issued at" v={detail.certificateIssuedAt ? new Date(detail.certificateIssuedAt).toLocaleString('en-IN') : '—'} />
                </DetailGroup>
              </SheetBody>
              <SheetFooter>
                <Button variant="outline" onClick={() => openEdit(detail)} className="gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button onClick={() => openIssueCert(detail)} className="gap-1.5 bg-slate-900 hover:bg-slate-800">
                  {detail.certificateNumber ? <Printer className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  {detail.certificateNumber ? 'Reprint Form 4' : 'Issue Form 4'}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Register / edit body */}
      <Dialog open={recordDialog} onOpenChange={setRecordDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{editing ? 'Edit mortuary record' : 'Register body'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <FormInput label="Body # (auto if blank)" value={form.bodyNumber} onChange={(v) => setForm({ ...form, bodyNumber: v })} />
            <FormInput label="Deceased name *" value={form.deceasedName} onChange={(v) => setForm({ ...form, deceasedName: v })} />
            <FormInput label="Age" type="number" value={form.age} onChange={(v) => setForm({ ...form, age: v })} />
            <FormSelect label="Sex" value={form.gender || 'Male'} onChange={(v) => setForm({ ...form, gender: v })}
              options={GENDER_OPTIONS.map(g => ({ value: g, label: g }))} />
            <FormInput label="Family contact" value={form.contact} onChange={(v) => setForm({ ...form, contact: v })} />
            <FormInput label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
            <FormInput label="Date & time of death *" type="datetime-local" value={form.dateOfDeath} onChange={(v) => setForm({ ...form, dateOfDeath: v })} />
            <FormInput label="Place of death" value={form.placeOfDeath} onChange={(v) => setForm({ ...form, placeOfDeath: v })} placeholder="Ward, ICU, brought dead…" />
            <FormInput label="Doctor on duty" value={form.doctorOnDuty} onChange={(v) => setForm({ ...form, doctorOnDuty: v })} />
            <FormInput label="Cause of death (summary)" value={form.causeOfDeath} onChange={(v) => setForm({ ...form, causeOfDeath: v })} />
            <FormInput label="Fridge unit" value={form.fridgeUnit} onChange={(v) => setForm({ ...form, fridgeUnit: v })} />
            <FormInput label="Shelf #" value={form.shelfNumber} onChange={(v) => setForm({ ...form, shelfNumber: v })} />
            <FormSelect label="Status" value={form.status || 'stored'} onChange={(v) => setForm({ ...form, status: v })}
              options={STATUS_OPTIONS.map(s => ({ value: s, label: s }))} />
            <div className="col-span-2">
              <Label className="text-xs text-slate-500">Remarks</Label>
              <textarea value={form.remarks || ''} onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                className="w-full min-h-[60px] p-2 border rounded-lg text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordDialog(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form-4 dialog */}
      <Dialog open={certDialog} onOpenChange={setCertDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Form 4 — Medical Certificate of Cause of Death
            </DialogTitle>
            <p className="text-xs text-slate-500 pt-1">{certTarget?.deceasedName}</p>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-500 bg-slate-50/80 border border-slate-200 rounded-lg p-3">
              India Form-4 (RBD Rules, 1999). Filled by the treating doctor or
              the medical officer-in-charge. Print and sign in ink — the wet-ink
              signature is the legal artefact. Issue two copies: one for the
              family (to take to the municipal registrar), one for hospital records.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Address (deceased)" value={certForm.address} onChange={(v) => setCertForm({ ...certForm, address: v })} />
              <FormInput label="Place of death" value={certForm.placeOfDeath} onChange={(v) => setCertForm({ ...certForm, placeOfDeath: v })} />
            </div>
            <Section title='I. Cause of death (each line "due to" the next)'>
              <div className="grid grid-cols-3 gap-3">
                <FormInput label="(a) Immediate cause *" value={certForm.immediateCause} onChange={(v) => setCertForm({ ...certForm, immediateCause: v })} />
                <FormInput label="Interval" value={certForm.immediateInterval} onChange={(v) => setCertForm({ ...certForm, immediateInterval: v })} placeholder="e.g. 2 hours" />
                <div />
                <FormInput label="(b) Antecedent cause" value={certForm.antecedentCause1} onChange={(v) => setCertForm({ ...certForm, antecedentCause1: v })} />
                <FormInput label="Interval" value={certForm.antecedent1Interval} onChange={(v) => setCertForm({ ...certForm, antecedent1Interval: v })} />
                <div />
                <FormInput label="(c) Antecedent cause" value={certForm.antecedentCause2} onChange={(v) => setCertForm({ ...certForm, antecedentCause2: v })} />
                <FormInput label="Interval" value={certForm.antecedent2Interval} onChange={(v) => setCertForm({ ...certForm, antecedent2Interval: v })} />
              </div>
            </Section>
            <div>
              <Label className="text-xs text-slate-500">II. Other significant conditions contributing to death (not in causal chain)</Label>
              <textarea value={certForm.contributingCauses || ''} onChange={(e) => setCertForm({ ...certForm, contributingCauses: e.target.value })}
                className="w-full min-h-[60px] p-2 border rounded-lg text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormSelect label="Manner of death" value={certForm.mannerOfDeath || 'natural'} onChange={(v) => setCertForm({ ...certForm, mannerOfDeath: v })}
                options={MANNER_OPTIONS.map(m => ({ value: m, label: m }))} />
              <FormInput label="Mode of death" value={certForm.modeOfDeath} onChange={(v) => setCertForm({ ...certForm, modeOfDeath: v })} placeholder="coma, syncope, asphyxia…" />
            </div>
            <Section title="Certifying doctor">
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Doctor name *" value={certForm.certifyingDoctorName} onChange={(v) => setCertForm({ ...certForm, certifyingDoctorName: v })} />
                <FormInput label="MCI / State council regn #" value={certForm.certifyingDoctorReg} onChange={(v) => setCertForm({ ...certForm, certifyingDoctorReg: v })} />
              </div>
            </Section>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCertDialog(false)} disabled={saving}>Cancel</Button>
            <Button onClick={issueAndPrint} disabled={saving} className="gap-1 bg-slate-900 hover:bg-slate-800">
              {saving ? 'Issuing…' : <><FileText className="w-4 h-4" /> Issue & print</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PdfPreviewDialog pdf={pdf} onClose={() => setPdf(null)} title="Death Certificate (Form 4)" />
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
          : <div className={`text-3xl font-semibold ${accent || 'text-slate-900'} mt-2 tracking-tight`}>{value}</div>}
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
      <div className="w-16 h-16 rounded-2xl bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center mb-4">
        <Cross className="w-8 h-8 text-slate-500" />
      </div>
      <h3 className="text-base font-medium text-slate-900">
        {hasRecords ? 'No matching records' : 'No mortuary cases yet'}
      </h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        {hasRecords ? 'Try clearing the search or filter.' : 'Register the first body — fields cover Form-4 needs.'}
      </p>
      {!hasRecords && (
        <Button onClick={onAdd} className="gap-1.5 mt-5 rounded-xl bg-slate-900 hover:bg-slate-800">
          <Plus className="w-4 h-4" /> Register first case
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
      <dd className="text-slate-900 text-right break-words">{v || '—'}</dd>
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
