// Implants register — track every prosthesis / device implanted into a
// patient with its lot/serial/expiry/warranty fields so we can recall a
// specific batch if the manufacturer issues a notice. Mirrors the
// BirthRecords visual language: rounded-2xl, soft icon chips, drawer-less
// list with inline "Remove" dialog.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Box, Plus, Search, Trash2, ShieldAlert, CalendarClock, PackageOpen } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/Toast';

interface PatientLite { id: string; mrn: string; name: string }

interface Implant {
  id: string;
  patientId: string;
  patient?: PatientLite | null;
  surgeryId?: string | null;
  implantType: string;
  manufacturer: string;
  brandName?: string | null;
  modelNumber?: string | null;
  serialNumber: string;
  batchLotNumber?: string | null;
  expiryDate?: string | null;
  side?: string | null;
  anatomicalSite?: string | null;
  implantedAt: string;
  implantedById?: string | null;
  implantedByName?: string | null;
  warrantyExpiresAt?: string | null;
  notes?: string | null;
  removedAt?: string | null;
  removalReason?: string | null;
}

const IMPLANT_TYPES: Array<{ value: string; label: string; tint: string }> = [
  { value: 'hip',           label: 'Hip prosthesis',  tint: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'knee',          label: 'Knee prosthesis', tint: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'cardiac_stent', label: 'Cardiac stent',   tint: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'mesh',          label: 'Mesh',            tint: 'bg-violet-50 text-violet-700 border-violet-200' },
  { value: 'iol',           label: 'IOL (eye lens)',  tint: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'pacemaker',     label: 'Pacemaker',       tint: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'other',         label: 'Other',           tint: 'bg-slate-100 text-slate-700 border-slate-200' },
];

const SIDES = ['left', 'right', 'bilateral', 'midline'];

export default function Implants() {
  const toast = useToast();
  const [implants, setImplants] = useState<Implant[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Implant | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<any>(emptyForm());
  const [removeForm, setRemoveForm] = useState({ removalReason: '', removedAt: '' });

  function emptyForm() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    return {
      patientId: '',
      patient: null as PatientLite | null,
      surgeryId: '',
      implantType: 'other',
      manufacturer: '',
      brandName: '',
      modelNumber: '',
      serialNumber: '',
      batchLotNumber: '',
      expiryDate: '',
      side: '',
      anatomicalSite: '',
      implantedAt: local,
      warrantyExpiresAt: '',
      notes: '',
    };
  }

  async function load() {
    setLoading(true);
    try {
      const params: any = {};
      if (typeFilter !== 'all') params.type = typeFilter;
      if (search.trim()) params.search = search.trim();
      const r = await api.get('/api/implants', { params });
      setImplants(Array.isArray(r.data) ? r.data : []);
    } catch (e: any) {
      toast.error('Load failed', e?.response?.data?.error || 'Try again');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [typeFilter]);
  // Debounce search → reload
  useEffect(() => {
    const t = setTimeout(() => { void load(); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // --- derived stats ---
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const in30 = new Date(now); in30.setDate(in30.getDate() + 30);
    const active = implants.filter(i => !i.removedAt);
    const newThisMonth = implants.filter(i => new Date(i.implantedAt) >= monthStart).length;
    const dueWarranty = active.filter(i => i.warrantyExpiresAt &&
      new Date(i.warrantyExpiresAt) >= now && new Date(i.warrantyExpiresAt) <= in30).length;
    const removedThisMonth = implants.filter(i => i.removedAt && new Date(i.removedAt) >= monthStart).length;
    return { active: active.length, newThisMonth, dueWarranty, removedThisMonth };
  }, [implants]);

  // --- create ---
  async function save() {
    if (!form.patientId)         { toast.error('Pick a patient'); return; }
    if (!form.implantType)       { toast.error('Implant type required'); return; }
    if (!form.manufacturer)      { toast.error('Manufacturer required'); return; }
    if (!form.serialNumber)      { toast.error('Serial # is mandatory for traceability'); return; }
    if (!form.implantedAt)       { toast.error('Implanted at date is required'); return; }
    setSaving(true);
    try {
      const payload: any = {
        patientId: form.patientId,
        implantType: form.implantType,
        manufacturer: form.manufacturer,
        serialNumber: form.serialNumber,
        implantedAt: new Date(form.implantedAt).toISOString(),
      };
      if (form.surgeryId)         payload.surgeryId = form.surgeryId;
      if (form.brandName)         payload.brandName = form.brandName;
      if (form.modelNumber)       payload.modelNumber = form.modelNumber;
      if (form.batchLotNumber)    payload.batchLotNumber = form.batchLotNumber;
      if (form.expiryDate)        payload.expiryDate = new Date(form.expiryDate).toISOString();
      if (form.side)              payload.side = form.side;
      if (form.anatomicalSite)    payload.anatomicalSite = form.anatomicalSite;
      if (form.warrantyExpiresAt) payload.warrantyExpiresAt = new Date(form.warrantyExpiresAt).toISOString();
      if (form.notes)             payload.notes = form.notes;
      await api.post('/api/implants', payload);
      toast.success('Implant logged');
      setAddOpen(false);
      setForm(emptyForm());
      void load();
    } catch (e: any) {
      toast.error('Save failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  // --- remove ---
  function openRemove(i: Implant) {
    const now = new Date();
    setRemoveTarget(i);
    setRemoveForm({
      removalReason: '',
      removedAt: new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    });
  }
  async function doRemove() {
    if (!removeTarget) return;
    if (!removeForm.removalReason.trim()) { toast.error('Removal reason required'); return; }
    setSaving(true);
    try {
      const payload: any = { removalReason: removeForm.removalReason.trim() };
      if (removeForm.removedAt) payload.removedAt = new Date(removeForm.removedAt).toISOString();
      await api.post(`/api/implants/${removeTarget.id}/remove`, payload);
      toast.success('Marked as removed');
      setRemoveTarget(null);
      void load();
    } catch (e: any) {
      toast.error('Remove failed', e?.response?.data?.error || 'Try again');
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
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center ring-1 ring-amber-100">
              <Box className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Implants Register</h1>
              <p className="text-sm text-slate-500 mt-0.5">Traceability log — serial/lot, expiry & warranty for every implanted device.</p>
            </div>
          </div>
          <Button onClick={() => { setForm(emptyForm()); setAddOpen(true); }}
            className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4" /> Add implant
          </Button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active implants" value={stats.active}
            icon={<Box className="w-4 h-4 text-amber-600" />} tint="bg-amber-50 ring-amber-100" loading={loading} />
          <StatCard label="New this month" value={stats.newThisMonth}
            icon={<PackageOpen className="w-4 h-4 text-blue-600" />} tint="bg-blue-50 ring-blue-100" accent="text-blue-700" loading={loading} />
          <StatCard label="Warranty due ≤30d" value={stats.dueWarranty}
            icon={<CalendarClock className="w-4 h-4 text-orange-600" />} tint="bg-orange-50 ring-orange-100" accent="text-orange-700" loading={loading} />
          <StatCard label="Removed this month" value={stats.removedThisMonth}
            icon={<Trash2 className="w-4 h-4 text-slate-600" />} tint="bg-slate-100 ring-slate-200" loading={loading} />
        </div>

        {/* LIST */}
        <Card className="rounded-2xl border-slate-200/70 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base text-slate-900">All implants</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <Input
                    className="pl-9 h-9 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white w-[260px]"
                    placeholder="Search serial, manufacturer, brand…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 rounded-xl w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {IMPLANT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : implants.length === 0 ? (
              <EmptyState onAdd={() => { setForm(emptyForm()); setAddOpen(true); }} />
            ) : (
              <div>
                {implants.map(i => {
                  const t = IMPLANT_TYPES.find(x => x.value === i.implantType);
                  return (
                    <div key={i.id} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 ${i.removedAt ? 'bg-slate-100 ring-slate-200' : 'bg-amber-50 ring-amber-100'}`}>
                        <Box className={`w-5 h-5 ${i.removedAt ? 'text-slate-400' : 'text-amber-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900 truncate">{i.manufacturer}{i.brandName ? ` · ${i.brandName}` : ''}</span>
                          <Badge variant="outline" className={`text-[10px] font-normal ${t?.tint || ''}`}>{t?.label || i.implantType}</Badge>
                          {i.removedAt && <Badge variant="outline" className="text-[10px] font-normal bg-red-50 text-red-700 border-red-200">REMOVED</Badge>}
                          {i.side && <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded uppercase">{i.side}</span>}
                          <span className="text-[10px] text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded font-mono">SN {i.serialNumber}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                          {i.patient && (
                            <Link to={`/app/patients/${i.patient.id}`} onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 hover:underline">
                              {i.patient.name} · {i.patient.mrn}
                            </Link>
                          )}
                          <span>Implanted {new Date(i.implantedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          {i.implantedByName && <span>by {i.implantedByName}</span>}
                          {i.anatomicalSite && <span>· {i.anatomicalSite}</span>}
                          {i.batchLotNumber && <span className="font-mono">lot {i.batchLotNumber}</span>}
                          {i.warrantyExpiresAt && <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> warranty {new Date(i.warrantyExpiresAt).toLocaleDateString('en-IN')}</span>}
                        </div>
                      </div>
                      {!i.removedAt ? (
                        <Button size="sm" variant="outline" onClick={() => openRemove(i)} className="gap-1 h-9 rounded-lg shrink-0">
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic shrink-0">
                          removed {new Date(i.removedAt).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ADD IMPLANT DIALOG */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Log new implant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Section title="Patient">
              <ApiPatientPicker value={form.patient} onChange={(p) => setForm({ ...form, patient: p, patientId: p?.id || '' })} />
            </Section>
            <Section title="Device">
              <div className="grid grid-cols-2 gap-3">
                <FormSelect label="Implant type *" value={form.implantType} onChange={(v) => setForm({ ...form, implantType: v })}
                  options={IMPLANT_TYPES} />
                <FormInput label="Manufacturer *" value={form.manufacturer} onChange={(v) => setForm({ ...form, manufacturer: v })} />
                <FormInput label="Brand name" value={form.brandName} onChange={(v) => setForm({ ...form, brandName: v })} />
                <FormInput label="Model number" value={form.modelNumber} onChange={(v) => setForm({ ...form, modelNumber: v })} />
                <FormInput label="Serial number *" value={form.serialNumber} onChange={(v) => setForm({ ...form, serialNumber: v })} />
                <FormInput label="Batch / lot #" value={form.batchLotNumber} onChange={(v) => setForm({ ...form, batchLotNumber: v })} />
                <FormInput label="Expiry date" type="date" value={form.expiryDate} onChange={(v) => setForm({ ...form, expiryDate: v })} />
                <FormInput label="Warranty expires" type="date" value={form.warrantyExpiresAt} onChange={(v) => setForm({ ...form, warrantyExpiresAt: v })} />
              </div>
            </Section>
            <Section title="Implantation">
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Implanted at *" type="datetime-local" value={form.implantedAt} onChange={(v) => setForm({ ...form, implantedAt: v })} />
                <FormInput label="Surgery ID (optional)" value={form.surgeryId} onChange={(v) => setForm({ ...form, surgeryId: v })} placeholder="Link to OT case" />
                <FormSelect label="Side" value={form.side || '_'} onChange={(v) => setForm({ ...form, side: v === '_' ? '' : v })}
                  options={[{ value: '_', label: '— None —' }, ...SIDES.map(s => ({ value: s, label: s }))]} />
                <FormInput label="Anatomical site" value={form.anatomicalSite} onChange={(v) => setForm({ ...form, anatomicalSite: v })} placeholder="e.g. Right femoral head" />
              </div>
              <div className="mt-3">
                <Label className="text-xs text-slate-500">Notes</Label>
                <textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full min-h-[60px] p-2 border rounded-lg text-sm" />
              </div>
            </Section>
            <p className="text-xs text-slate-500 px-1 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              Serial # is mandatory — it's what lets us recall a specific patient if the lot is flagged.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Saving…' : 'Save implant'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REMOVE DIALOG */}
      <Dialog open={!!removeTarget} onOpenChange={(o) => { if (!o) setRemoveTarget(null); }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Mark implant removed</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {removeTarget && (
              <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="font-medium text-slate-900">{removeTarget.manufacturer}{removeTarget.brandName && ` · ${removeTarget.brandName}`}</div>
                <div className="font-mono mt-0.5">SN {removeTarget.serialNumber}</div>
              </div>
            )}
            <FormInput label="Removed at" type="datetime-local"
              value={removeForm.removedAt}
              onChange={(v) => setRemoveForm({ ...removeForm, removedAt: v })} />
            <div>
              <Label className="text-xs text-slate-500">Reason for removal *</Label>
              <textarea
                value={removeForm.removalReason}
                onChange={(e) => setRemoveForm({ ...removeForm, removalReason: e.target.value })}
                placeholder="e.g. revision surgery, infection, mechanical failure…"
                className="w-full min-h-[80px] p-2 border rounded-lg text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)} disabled={saving}>Cancel</Button>
            <Button onClick={doRemove} disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Saving…' : 'Confirm removal'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== sub-components ==============

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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="py-16 px-6 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 ring-1 ring-amber-100 flex items-center justify-center mb-4">
        <Box className="w-8 h-8 text-amber-500" />
      </div>
      <h3 className="text-base font-medium text-slate-900">No implants logged yet</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">Log the first device — serial / lot are recorded so a recall later can find the patient.</p>
      <Button onClick={onAdd} className="gap-1.5 mt-5 rounded-xl bg-slate-900 hover:bg-slate-800">
        <Plus className="w-4 h-4" /> Log first implant
      </Button>
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
      <Input type={type as any} value={value === null || value === undefined ? '' : value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="rounded-lg" />
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

/**
 * Patient picker that queries /api/patients?search= on every keystroke
 * (debounced). Used in dialogs where the operator might be searching
 * across a huge patient pool. Renders a result list below the input.
 */
function ApiPatientPicker({ value, onChange }: { value: PatientLite | null; onChange: (p: PatientLite | null) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PatientLite[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (value) return;
    if (!q.trim()) { setResults([]); return; }
    const ctl = new AbortController();
    setBusy(true);
    const tid = setTimeout(async () => {
      try {
        const r = await api.get('/api/patients', { params: { search: q.trim(), limit: 10 }, signal: ctl.signal as any });
        const raw = Array.isArray(r.data) ? r.data : (r.data?.items || []);
        setResults(raw.map((x: any) => ({ id: x.id, mrn: x.mrn, name: x.name })));
      } catch {/* ignore aborts */}
      finally { setBusy(false); }
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
      {(results.length > 0 || busy) && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-10">
          {busy && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-400">Searching…</div>
          )}
          {results.map(p => (
            <button key={p.id} type="button"
              onClick={() => { onChange(p); setQ(''); setResults([]); }}
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
