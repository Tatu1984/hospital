// Biomedical Waste (BMW) tracking — Indian BMW Rules 2016 colour-coded
// log. Four streams: yellow (anatomical/soiled), red (contaminated
// plastics), white (sharps), blue (glass/metal). Each log records weight
// kg + source, and handover to the Biomedical-waste Service Provider
// (BSP) closes the audit chain with a manifest number.

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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Trash2, Plus, Truck, FileCheck2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid,
} from 'recharts';
import api from '../services/api';
import { useToast } from '../components/Toast';

interface BMWLog {
  id: string;
  category: 'yellow' | 'red' | 'white' | 'blue';
  weightKg: number;
  source: string;
  branchId?: string | null;
  collectedAt: string;
  handoverTo?: string | null;
  bspName?: string | null;
  bspManifestNumber?: string | null;
  handoverAt?: string | null;
  notes?: string | null;
}

interface CategoryMeta {
  value: BMWLog['category'];
  label: string;
  desc: string;
  swatch: string;
  ring: string;
  text: string;
  bg: string;
  chartFill: string;
}

const CATEGORIES: CategoryMeta[] = [
  { value: 'yellow', label: 'Yellow',
    desc: 'Anatomical / soiled dressings',
    swatch: 'bg-yellow-400', ring: 'ring-yellow-300',
    text: 'text-yellow-800', bg: 'bg-yellow-50',
    chartFill: '#eab308' },
  { value: 'red', label: 'Red',
    desc: 'Contaminated plastics, tubing',
    swatch: 'bg-red-500', ring: 'ring-red-300',
    text: 'text-red-800', bg: 'bg-red-50',
    chartFill: '#dc2626' },
  { value: 'white', label: 'White',
    desc: 'Sharps (needles, blades)',
    swatch: 'bg-slate-200', ring: 'ring-slate-300',
    text: 'text-slate-800', bg: 'bg-slate-50',
    chartFill: '#94a3b8' },
  { value: 'blue', label: 'Blue',
    desc: 'Glass & medicinal metal',
    swatch: 'bg-blue-500', ring: 'ring-blue-300',
    text: 'text-blue-800', bg: 'bg-blue-50',
    chartFill: '#2563eb' },
];

const SOURCES = ['Ward', 'Lab', 'OT', 'Labour Room', 'OPD', 'ICU', 'Emergency', 'Pharmacy', 'Other'];

export default function BMWTracking() {
  const toast = useToast();
  const [logs, setLogs] = useState<BMWLog[]>([]);
  const [loading, setLoading] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [handoverTarget, setHandoverTarget] = useState<BMWLog | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<any>(emptyForm());
  const [handoverForm, setHandoverForm] = useState({ handoverTo: '', bspName: '', bspManifestNumber: '', handoverAt: '' });

  function emptyForm() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    return {
      category: 'yellow',
      weightKg: '',
      source: 'Ward',
      notes: '',
      collectedAt: local,
    };
  }

  async function load() {
    setLoading(true);
    try {
      const params: any = {};
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const r = await api.get('/api/bmw', { params });
      setLogs(Array.isArray(r.data) ? r.data : []);
    } catch (e: any) {
      toast.error('Load failed', e?.response?.data?.error || 'Try again');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [categoryFilter, fromDate, toDate]);

  // stats — per-category this month
  const monthStats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const result: Record<string, { kg: number; count: number }> = {};
    for (const c of CATEGORIES) result[c.value] = { kg: 0, count: 0 };
    for (const l of logs) {
      if (new Date(l.collectedAt) >= monthStart) {
        result[l.category].kg += Number(l.weightKg || 0);
        result[l.category].count += 1;
      }
    }
    return result;
  }, [logs]);

  // 14-day stacked bar — kg by category per day
  const dailyData = useMemo(() => {
    const days: Array<Record<string, any>> = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const row: Record<string, any> = { d: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) };
      for (const c of CATEGORIES) row[c.value] = 0;
      for (const l of logs) {
        const t = new Date(l.collectedAt).getTime();
        if (t >= d.getTime() && t < next.getTime()) row[l.category] += Number(l.weightKg || 0);
      }
      // Round each cat to 2 decimals
      for (const c of CATEGORIES) row[c.value] = Math.round((row[c.value] as number) * 100) / 100;
      days.push(row);
    }
    return days;
  }, [logs]);

  async function save() {
    const weight = parseFloat(form.weightKg);
    if (!form.category)          { toast.error('Pick a category'); return; }
    if (!form.source)            { toast.error('Source required'); return; }
    if (!Number.isFinite(weight) || weight <= 0) { toast.error('Weight must be > 0 kg'); return; }
    setSaving(true);
    try {
      const payload: any = {
        category: form.category,
        weightKg: weight,
        source: form.source,
      };
      if (form.notes)       payload.notes = form.notes;
      if (form.collectedAt) payload.collectedAt = new Date(form.collectedAt).toISOString();
      await api.post('/api/bmw', payload);
      toast.success('Log added');
      setAddOpen(false);
      setForm(emptyForm());
      void load();
    } catch (e: any) {
      toast.error('Save failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  function openHandover(l: BMWLog) {
    const now = new Date();
    setHandoverTarget(l);
    setHandoverForm({
      handoverTo: '',
      bspName: '',
      bspManifestNumber: '',
      handoverAt: new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    });
  }

  async function doHandover() {
    if (!handoverTarget) return;
    if (!handoverForm.handoverTo.trim())        { toast.error('Hand-over to (name) required'); return; }
    if (!handoverForm.bspName.trim())           { toast.error('BSP name required'); return; }
    if (!handoverForm.bspManifestNumber.trim()) { toast.error('Manifest number required'); return; }
    setSaving(true);
    try {
      const payload: any = {
        handoverTo: handoverForm.handoverTo.trim(),
        bspName: handoverForm.bspName.trim(),
        bspManifestNumber: handoverForm.bspManifestNumber.trim(),
      };
      if (handoverForm.handoverAt) payload.handoverAt = new Date(handoverForm.handoverAt).toISOString();
      await api.post(`/api/bmw/${handoverTarget.id}/handover`, payload);
      toast.success('Handed over');
      setHandoverTarget(null);
      void load();
    } catch (e: any) {
      toast.error('Handover failed', e?.response?.data?.error || 'Try again');
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
            <div className="w-12 h-12 rounded-2xl bg-yellow-50 flex items-center justify-center ring-1 ring-yellow-200">
              <Trash2 className="w-6 h-6 text-yellow-700" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Biomedical Waste</h1>
              <p className="text-sm text-slate-500 mt-0.5">BMW Rules 2016 — colour-coded daily log & BSP handover register</p>
            </div>
          </div>
          <Button onClick={() => { setForm(emptyForm()); setAddOpen(true); }}
            className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4" /> New log
          </Button>
        </div>

        {/* COLOUR STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map(c => (
            <Card key={c.value} className="rounded-2xl border-slate-200/70 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">{c.label} bin</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{c.desc}</div>
                  </div>
                  <div className={`w-8 h-8 rounded-lg ${c.bg} ring-1 ${c.ring} flex items-center justify-center`}>
                    <span className={`w-3 h-3 rounded-full ${c.swatch}`} />
                  </div>
                </div>
                {loading ? <Skeleton className="h-8 w-20 mt-3" /> : (
                  <>
                    <div className={`text-3xl font-semibold ${c.text} mt-2 tracking-tight tabular-nums`}>
                      {monthStats[c.value].kg.toFixed(2)} <span className="text-base text-slate-400">kg</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 tabular-nums">{monthStats[c.value].count} entries this month</div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* DAILY BAR CHART */}
        <Card className="rounded-2xl border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600">Last 14 days — kg by category</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-0">
            {loading ? <Skeleton className="w-full h-full rounded-xl" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {CATEGORIES.map(c => (
                    <Bar key={c.value} dataKey={c.value} stackId="bmw" fill={c.chartFill} name={c.label} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* LIST */}
        <Card className="rounded-2xl border-slate-200/70 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base text-slate-900">Recent logs</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 rounded-xl w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 rounded-xl w-[150px]" />
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 rounded-xl w-[150px]" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 px-6 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-yellow-50 ring-1 ring-yellow-200 flex items-center justify-center mb-4">
                  <Trash2 className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-base font-medium text-slate-900">No logs in this range</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">Each shift should log waste collected — required by BMW Rules 2016.</p>
                <Button onClick={() => { setForm(emptyForm()); setAddOpen(true); }} className="gap-1.5 mt-5 rounded-xl bg-slate-900 hover:bg-slate-800">
                  <Plus className="w-4 h-4" /> First log
                </Button>
              </div>
            ) : (
              <div>
                {logs.map(l => {
                  const c = CATEGORIES.find(x => x.value === l.category);
                  return (
                    <div key={l.id} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors">
                      <div className={`w-10 h-10 rounded-xl ${c?.bg} ring-1 ${c?.ring} flex items-center justify-center shrink-0`}>
                        <span className={`w-4 h-4 rounded-full ${c?.swatch}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900 tabular-nums">{Number(l.weightKg).toFixed(2)} kg</span>
                          <Badge variant="outline" className={`text-[10px] font-normal ${c?.bg} ${c?.text} border-slate-200`}>{c?.label}</Badge>
                          <span className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{l.source}</span>
                          {l.handoverAt && (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
                              manifest {l.bspManifestNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                          <span>{new Date(l.collectedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          {l.handoverAt && (
                            <span>→ handed to {l.handoverTo} ({l.bspName}) at {new Date(l.handoverAt).toLocaleString('en-IN', { day: '2-digit', month: 'short' })}</span>
                          )}
                          {l.notes && <span className="truncate max-w-[280px]">· {l.notes}</span>}
                        </div>
                      </div>
                      {!l.handoverAt ? (
                        <Button size="sm" variant="outline" onClick={() => openHandover(l)} className="gap-1 h-9 rounded-lg shrink-0">
                          <Truck className="w-3.5 h-3.5" /> Hand over
                        </Button>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-700 italic shrink-0">
                          <FileCheck2 className="w-3.5 h-3.5" /> handed
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

      {/* NEW LOG DIALOG */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">New BMW log</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-slate-500 mb-2 block">Category *</Label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(c => (
                  <button key={c.value} type="button" onClick={() => setForm({ ...form, category: c.value })}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      form.category === c.value
                        ? `border-slate-900 ${c.bg}`
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}>
                    <span className={`w-4 h-4 rounded-full ${c.swatch} ring-1 ${c.ring}`} />
                    <div className="text-left">
                      <div className={`text-sm font-medium ${c.text}`}>{c.label}</div>
                      <div className="text-[10px] text-slate-500 leading-tight">{c.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Weight (kg) *" type="number" value={form.weightKg} onChange={(v) => setForm({ ...form, weightKg: v })} placeholder="0.00" />
              <FormSelect label="Source *" value={form.source} onChange={(v) => setForm({ ...form, source: v })}
                options={SOURCES.map(s => ({ value: s, label: s }))} />
              <FormInput label="Collected at" type="datetime-local" value={form.collectedAt} onChange={(v) => setForm({ ...form, collectedAt: v })} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Notes</Label>
              <textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full min-h-[60px] p-2 border rounded-lg text-sm" placeholder="Anything unusual (e.g. cytotoxic, sharp injury)…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Saving…' : 'Save log'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HANDOVER DIALOG */}
      <Dialog open={!!handoverTarget} onOpenChange={(o) => { if (!o) setHandoverTarget(null); }}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Hand over to BSP</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {handoverTarget && (
              <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-200">
                <span className="font-medium text-slate-900">
                  {Number(handoverTarget.weightKg).toFixed(2)} kg
                </span>{' '}
                · {CATEGORIES.find(c => c.value === handoverTarget.category)?.label} ·{' '}
                {handoverTarget.source} ·{' '}
                {new Date(handoverTarget.collectedAt).toLocaleString('en-IN')}
              </div>
            )}
            <FormInput label="Hand over to (name) *" value={handoverForm.handoverTo}
              onChange={(v) => setHandoverForm({ ...handoverForm, handoverTo: v })}
              placeholder="Person collecting the bag" />
            <FormInput label="BSP (Biomedical Service Provider) *" value={handoverForm.bspName}
              onChange={(v) => setHandoverForm({ ...handoverForm, bspName: v })}
              placeholder="e.g. SMS Envoclean" />
            <FormInput label="Manifest number *" value={handoverForm.bspManifestNumber}
              onChange={(v) => setHandoverForm({ ...handoverForm, bspManifestNumber: v })}
              placeholder="Printed on BSP slip" />
            <FormInput label="Handover at" type="datetime-local" value={handoverForm.handoverAt}
              onChange={(v) => setHandoverForm({ ...handoverForm, handoverAt: v })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHandoverTarget(null)} disabled={saving}>Cancel</Button>
            <Button onClick={doHandover} disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Saving…' : 'Confirm handover'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========= sub-components =========

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
