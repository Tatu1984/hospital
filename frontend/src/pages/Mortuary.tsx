// Mortuary — body storage register PLUS hospital-issued Medical
// Certificate of Cause of Death (India Form 4). The cert PDF is
// generated client-side; the wet-ink signature of the certifying
// doctor on the printed copy is the legal artefact. The informant
// (next of kin) carries the printed certificate to the municipal
// registrar to obtain the civil death certificate.

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Cross, Plus, Pencil, FileText, Printer } from 'lucide-react';
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
  // Form-4 fields
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
      bodyNumber: '',
      deceasedName: '',
      age: '',
      gender: 'Male',
      contact: '',
      address: '',
      dateOfDeath: local,
      placeOfDeath: '',
      doctorOnDuty: '',
      fridgeUnit: '',
      shelfNumber: '',
      status: 'stored',
      remarks: '',
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
  }

  async function save() {
    if (!form.deceasedName) { toast.error('Deceased name is required'); return; }
    if (!form.dateOfDeath)  { toast.error('Date of death is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      ['age'].forEach(k => { payload[k] = payload[k] === '' || payload[k] === null ? null : Number(payload[k]); });
      if (editing) {
        await api.put(`/api/mortuary/${editing.id}`, payload);
        toast.success('Updated');
      } else {
        await api.post('/api/mortuary', payload);
        toast.success('Body registered');
      }
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
      address:               r.address || '',
      placeOfDeath:          r.placeOfDeath || '',
      immediateCause:        r.immediateCause || r.causeOfDeath || '',
      immediateInterval:     r.immediateInterval || '',
      antecedentCause1:      r.antecedentCause1 || '',
      antecedent1Interval:   r.antecedent1Interval || '',
      antecedentCause2:      r.antecedentCause2 || '',
      antecedent2Interval:   r.antecedent2Interval || '',
      contributingCauses:    r.contributingCauses || '',
      mannerOfDeath:         r.mannerOfDeath || 'natural',
      modeOfDeath:           r.modeOfDeath || '',
      certifyingDoctorName:  r.certifyingDoctorName || r.doctorOnDuty || '',
      certifyingDoctorReg:   r.certifyingDoctorReg || '',
    });
    setCertDialog(true);
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

  const total    = records.length;
  const stored   = records.filter(r => r.status === 'stored').length;
  const released = records.filter(r => r.status === 'released').length;
  const issued   = records.filter(r => !!r.certificateNumber).length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
          <Cross className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mortuary</h1>
          <p className="text-sm text-slate-500">Deceased registry, body storage & Medical Certificate of Cause of Death (Form 4)</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total cases" value={total} />
        <Stat label="In storage" value={stored} accent="text-blue-700" />
        <Stat label="Released" value={released} accent="text-emerald-700" />
        <Stat label="Certificates issued" value={issued} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Cases</CardTitle>
          <Button onClick={openNew} className="gap-1"><Plus className="w-4 h-4" /> Register body</Button>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>
          : records.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Body #</TableHead>
                    <TableHead>Deceased</TableHead>
                    <TableHead>Age / Sex</TableHead>
                    <TableHead>Date of death</TableHead>
                    <TableHead>Fridge / Shelf</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Certificate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.bodyNumber}</TableCell>
                      <TableCell className="font-medium">{r.deceasedName}</TableCell>
                      <TableCell className="text-xs">{r.age ?? '—'} / {r.gender ?? '—'}</TableCell>
                      <TableCell className="text-xs">{new Date(r.dateOfDeath).toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-xs text-slate-500">{r.fridgeUnit || '—'} / {r.shelfNumber || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                      <TableCell className="text-xs">
                        {r.certificateNumber
                          ? <span className="font-mono">{r.certificateNumber}</span>
                          : <span className="text-slate-400">not issued</span>}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)} className="h-7 w-7 p-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openIssueCert(r)} className="gap-1 h-7">
                          {r.certificateNumber ? <Printer className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                          {r.certificateNumber ? 'Reprint' : 'Issue cert.'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Register/edit body */}
      <Dialog open={recordDialog} onOpenChange={setRecordDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit mortuary record' : 'Register body'}</DialogTitle>
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
                className="w-full min-h-[60px] p-2 border rounded text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordDialog(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue death-certificate dialog */}
      <Dialog open={certDialog} onOpenChange={setCertDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Issue Medical Certificate of Cause of Death — {certTarget?.deceasedName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-500">
              India Form-4 (RBD Rules, 1999). Filled by the treating doctor or
              the medical officer-in-charge. Print and sign in ink — the wet-ink
              signature is the legal artefact. Issue two copies: one for the
              family (to take to the municipal registrar), one for hospital records.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Address (deceased)" value={certForm.address} onChange={(v) => setCertForm({ ...certForm, address: v })} />
              <FormInput label="Place of death" value={certForm.placeOfDeath} onChange={(v) => setCertForm({ ...certForm, placeOfDeath: v })} />
            </div>

            <div className="border rounded-md p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-2 font-semibold">
                I. Cause of death (each line "due to" the next)
              </div>
              <div className="grid grid-cols-3 gap-3">
                <FormInput label="(a) Immediate cause *" value={certForm.immediateCause} onChange={(v) => setCertForm({ ...certForm, immediateCause: v })} />
                <FormInput label="Interval (e.g. 2 hours)" value={certForm.immediateInterval} onChange={(v) => setCertForm({ ...certForm, immediateInterval: v })} />
                <div />
                <FormInput label="(b) Antecedent cause" value={certForm.antecedentCause1} onChange={(v) => setCertForm({ ...certForm, antecedentCause1: v })} />
                <FormInput label="Interval" value={certForm.antecedent1Interval} onChange={(v) => setCertForm({ ...certForm, antecedent1Interval: v })} />
                <div />
                <FormInput label="(c) Antecedent cause" value={certForm.antecedentCause2} onChange={(v) => setCertForm({ ...certForm, antecedentCause2: v })} />
                <FormInput label="Interval" value={certForm.antecedent2Interval} onChange={(v) => setCertForm({ ...certForm, antecedent2Interval: v })} />
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-500">II. Other significant conditions contributing to death but not in causal chain</Label>
              <textarea value={certForm.contributingCauses || ''} onChange={(e) => setCertForm({ ...certForm, contributingCauses: e.target.value })}
                className="w-full min-h-[60px] p-2 border rounded text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormSelect label="Manner of death" value={certForm.mannerOfDeath || 'natural'} onChange={(v) => setCertForm({ ...certForm, mannerOfDeath: v })}
                options={MANNER_OPTIONS.map(m => ({ value: m, label: m }))} />
              <FormInput label="Mode of death (coma, syncope, asphyxia…)" value={certForm.modeOfDeath} onChange={(v) => setCertForm({ ...certForm, modeOfDeath: v })} />
            </div>

            <div className="border rounded-md p-3 bg-slate-50">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-2 font-semibold">Certifying doctor</div>
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Doctor name *" value={certForm.certifyingDoctorName} onChange={(v) => setCertForm({ ...certForm, certifyingDoctorName: v })} />
                <FormInput label="MCI / State council regn #" value={certForm.certifyingDoctorReg} onChange={(v) => setCertForm({ ...certForm, certifyingDoctorReg: v })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCertDialog(false)} disabled={saving}>Cancel</Button>
            <Button onClick={issueAndPrint} disabled={saving} className="gap-1">
              {saving ? 'Issuing…' : <><FileText className="w-4 h-4" /> Issue & print</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PdfPreviewDialog pdf={pdf} onClose={() => setPdf(null)} title="Death Certificate (Form 4)" />
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: number; sub?: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className={`text-2xl font-bold ${accent || 'text-slate-900'} mt-1`}>{value}</div>
        {sub && <div className="text-xs text-slate-500">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function FormInput({ label, value, onChange, type = 'text', placeholder }: { label: string; value: any; onChange: (v: any) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs text-slate-500">{label}</Label>
      <Input type={type as any} value={value === null || value === undefined ? '' : value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <div>
      <Label className="text-xs text-slate-500">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
