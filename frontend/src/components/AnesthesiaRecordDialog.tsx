// Anesthesia record dialog — captures the pre-op assessment, drug log
// (induction / maintenance / reversal), intra-op event timeline (vitals
// snapshots), PACU recovery and final Aldrete score. "Sign & lock"
// freezes the record. The drug log and event timeline are free-form lists
// the anaesthetist appends as the case proceeds.

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Stethoscope, Plus, Lock, Activity, Save, ShieldCheck, Trash2,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from './Toast';

interface DoctorOption { id: string; name: string }

interface AnesthesiaEvent {
  id?: string;
  type?: string;
  bp?: string;
  hr?: string | number;
  spo2?: string | number;
  etco2?: string | number;
  notes?: string;
  createdAt?: string;
}

interface DrugLogEntry {
  phase: 'induction' | 'maintenance' | 'reversal';
  name: string;
  dose: string;
  route?: string;
  time?: string;
  notes?: string;
}

interface AnesthesiaRecord {
  id?: string;
  anesthetistId?: string | null;
  type?: string | null;
  asaScore?: number | null;
  preOpAssessment?: string | null;
  drugLog?: DrugLogEntry[] | null;
  pacuRecovery?: string | null;
  aldreteScore?: number | null;
  events?: AnesthesiaEvent[] | null;
  signedAt?: string | null;
  signedBy?: string | null;
}

const ANESTHESIA_TYPES = ['General', 'Spinal', 'Epidural', 'Regional block', 'MAC / Sedation', 'Local'];
const ASA_OPTIONS = [
  { value: '1', label: 'ASA I — Healthy patient' },
  { value: '2', label: 'ASA II — Mild systemic disease' },
  { value: '3', label: 'ASA III — Severe systemic disease' },
  { value: '4', label: 'ASA IV — Severe & life-threatening' },
  { value: '5', label: 'ASA V — Moribund' },
  { value: '6', label: 'ASA VI — Brain dead, donor' },
];
const EVENT_TYPES = ['vitals', 'induction', 'incision', 'extubation', 'complication', 'medication', 'other'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surgeryId: string | null;
  surgeryLabel?: string;
  onSigned?: () => void;
}

export default function AnesthesiaRecordDialog({ open, onOpenChange, surgeryId, surgeryLabel, onSigned }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);

  const [record, setRecord] = useState<AnesthesiaRecord | null>(null);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);

  // editable form mirrors record
  const [form, setForm] = useState({
    anesthetistId: '',
    type: 'General',
    asaScore: 2,
    preOpAssessment: '',
    pacuRecovery: '',
    aldreteScore: 10,
    drugLog: [] as DrugLogEntry[],
  });

  // event modal
  const [eventOpen, setEventOpen] = useState(false);
  const [eventForm, setEventForm] = useState<AnesthesiaEvent>({ type: 'vitals', bp: '', hr: '', spo2: '', etco2: '', notes: '' });
  const [eventSaving, setEventSaving] = useState(false);

  const locked = !!record?.signedAt;

  // load
  async function load() {
    if (!surgeryId) return;
    setLoading(true);
    try {
      const [r, d] = await Promise.all([
        api.get(`/api/surgeries/${surgeryId}/anesthesia`).catch((e) => {
          if (e?.response?.status === 404) return { data: null };
          throw e;
        }),
        doctors.length > 0 ? Promise.resolve({ data: doctors }) : api.get('/api/doctors').catch(() => ({ data: [] })),
      ]);
      const data: AnesthesiaRecord | null = r.data || null;
      setRecord(data);
      const ds = (d.data || []).map((x: any) => ({ id: x.id, name: x.name }));
      setDoctors(ds);
      setForm({
        anesthetistId: data?.anesthetistId || '',
        type: data?.type || 'General',
        asaScore: data?.asaScore || 2,
        preOpAssessment: data?.preOpAssessment || '',
        pacuRecovery: data?.pacuRecovery || '',
        aldreteScore: data?.aldreteScore ?? 10,
        drugLog: data?.drugLog || [],
      });
    } catch (e: any) {
      toast.error('Load failed', e?.response?.data?.error || 'Try again');
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (open && surgeryId) void load(); }, [open, surgeryId]);

  // sorted events (already sorted by backend, but ensure)
  const events: AnesthesiaEvent[] = useMemo(() => {
    const list = record?.events || [];
    return [...list].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb;
    });
  }, [record]);

  // --- save (upsert) ---
  async function save() {
    if (!surgeryId) return;
    if (locked) return;
    setSaving(true);
    try {
      const payload: any = {
        type: form.type,
        asaScore: Number(form.asaScore),
        preOpAssessment: form.preOpAssessment,
        pacuRecovery: form.pacuRecovery,
        aldreteScore: Number(form.aldreteScore),
        drugLog: form.drugLog,
      };
      if (form.anesthetistId) payload.anesthetistId = form.anesthetistId;
      const r = await api.put(`/api/surgeries/${surgeryId}/anesthesia`, payload);
      setRecord(r.data || record);
      toast.success('Saved');
    } catch (e: any) {
      toast.error('Save failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  // --- add event ---
  async function addEvent() {
    if (!surgeryId) return;
    if (locked) return;
    if (!eventForm.type) { toast.error('Event type required'); return; }
    setEventSaving(true);
    try {
      const payload: any = {
        type: eventForm.type,
      };
      if (eventForm.bp)    payload.bp = eventForm.bp;
      if (eventForm.hr)    payload.hr = eventForm.hr;
      if (eventForm.spo2)  payload.spo2 = eventForm.spo2;
      if (eventForm.etco2) payload.etco2 = eventForm.etco2;
      if (eventForm.notes) payload.notes = eventForm.notes;
      await api.post(`/api/surgeries/${surgeryId}/anesthesia/event`, payload);
      toast.success('Event logged');
      setEventOpen(false);
      setEventForm({ type: 'vitals', bp: '', hr: '', spo2: '', etco2: '', notes: '' });
      void load();
    } catch (e: any) {
      toast.error('Could not log event', e?.response?.data?.error || 'Try again');
    } finally {
      setEventSaving(false);
    }
  }

  // --- sign & lock ---
  async function signAndLock() {
    if (!surgeryId) return;
    if (locked) return;
    if (!confirm('Sign & lock — the anesthesia record will become read-only. Continue?')) return;
    setSigning(true);
    try {
      // Persist any unsaved edits first so the signed snapshot is current.
      const payload: any = {
        type: form.type,
        asaScore: Number(form.asaScore),
        preOpAssessment: form.preOpAssessment,
        pacuRecovery: form.pacuRecovery,
        aldreteScore: Number(form.aldreteScore),
        drugLog: form.drugLog,
      };
      if (form.anesthetistId) payload.anesthetistId = form.anesthetistId;
      await api.put(`/api/surgeries/${surgeryId}/anesthesia`, payload);
      const r = await api.post(`/api/surgeries/${surgeryId}/anesthesia/sign`, {});
      setRecord(r.data || record);
      toast.success('Signed & locked');
      onSigned?.();
    } catch (e: any) {
      toast.error('Sign failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSigning(false);
    }
  }

  // --- drug log handlers ---
  function addDrug(phase: DrugLogEntry['phase']) {
    if (locked) return;
    setForm(f => ({ ...f, drugLog: [...f.drugLog, { phase, name: '', dose: '', route: '', time: '', notes: '' }] }));
  }
  function updateDrug(idx: number, key: keyof DrugLogEntry, value: any) {
    setForm(f => ({ ...f, drugLog: f.drugLog.map((d, i) => i === idx ? { ...d, [key]: value } : d) }));
  }
  function removeDrug(idx: number) {
    setForm(f => ({ ...f, drugLog: f.drugLog.filter((_, i) => i !== idx) }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 ring-1 ring-violet-100 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">Anesthesia Record</DialogTitle>
              {surgeryLabel && <p className="text-xs text-slate-500 mt-1">{surgeryLabel}</p>}
              {locked && (
                <Badge variant="outline" className="mt-2 bg-slate-100 text-slate-700 border-slate-200 gap-1">
                  <Lock className="w-3 h-3" /> Signed & locked
                  {record?.signedAt && ` · ${new Date(record.signedAt).toLocaleString('en-IN')}`}
                  {record?.signedBy && ` · ${record.signedBy}`}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* PRE-OP ASSESSMENT */}
            <Card className="rounded-2xl border-slate-200/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-slate-900">Pre-op assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500">Anesthetist</Label>
                    <Select value={form.anesthetistId || '_'}
                      onValueChange={(v) => setForm({ ...form, anesthetistId: v === '_' ? '' : v })}
                      disabled={locked}>
                      <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_">— None —</SelectItem>
                        {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Anesthesia type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })} disabled={locked}>
                      <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ANESTHESIA_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">ASA score</Label>
                    <Select value={String(form.asaScore)} onValueChange={(v) => setForm({ ...form, asaScore: Number(v) })} disabled={locked}>
                      <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ASA_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Pre-op assessment</Label>
                  <Textarea value={form.preOpAssessment} onChange={(e) => setForm({ ...form, preOpAssessment: e.target.value })}
                    disabled={locked} className="min-h-[80px] rounded-lg"
                    placeholder="Airway (Mallampati), cardio-resp status, NPO time, allergies, prior anaesthesia history…" />
                </div>
              </CardContent>
            </Card>

            {/* DRUG LOG */}
            <Card className="rounded-2xl border-slate-200/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-slate-900">Drug log</CardTitle>
                <p className="text-xs text-slate-500">Induction, maintenance and reversal agents — name, dose, route, time</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {(['induction', 'maintenance', 'reversal'] as const).map(phase => {
                  const entries = form.drugLog.map((d, i) => ({ d, i })).filter(x => x.d.phase === phase);
                  return (
                    <div key={phase} className="border border-slate-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{phase}</div>
                        {!locked && (
                          <Button size="sm" variant="outline" onClick={() => addDrug(phase)} className="h-7 gap-1">
                            <Plus className="w-3 h-3" /> Add
                          </Button>
                        )}
                      </div>
                      {entries.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No entries</p>
                      ) : (
                        <div className="space-y-2">
                          {entries.map(({ d, i }) => (
                            <div key={i} className="grid grid-cols-12 gap-2 items-end">
                              <div className="col-span-3">
                                <Label className="text-[10px] text-slate-400">Drug</Label>
                                <Input value={d.name} onChange={(e) => updateDrug(i, 'name', e.target.value)}
                                  disabled={locked} placeholder="e.g. Propofol" className="rounded-lg h-9" />
                              </div>
                              <div className="col-span-2">
                                <Label className="text-[10px] text-slate-400">Dose</Label>
                                <Input value={d.dose} onChange={(e) => updateDrug(i, 'dose', e.target.value)}
                                  disabled={locked} placeholder="e.g. 100 mg" className="rounded-lg h-9" />
                              </div>
                              <div className="col-span-2">
                                <Label className="text-[10px] text-slate-400">Route</Label>
                                <Input value={d.route || ''} onChange={(e) => updateDrug(i, 'route', e.target.value)}
                                  disabled={locked} placeholder="IV" className="rounded-lg h-9" />
                              </div>
                              <div className="col-span-2">
                                <Label className="text-[10px] text-slate-400">Time</Label>
                                <Input value={d.time || ''} onChange={(e) => updateDrug(i, 'time', e.target.value)}
                                  disabled={locked} placeholder="HH:MM" className="rounded-lg h-9" />
                              </div>
                              <div className="col-span-2">
                                <Label className="text-[10px] text-slate-400">Notes</Label>
                                <Input value={d.notes || ''} onChange={(e) => updateDrug(i, 'notes', e.target.value)}
                                  disabled={locked} className="rounded-lg h-9" />
                              </div>
                              <div className="col-span-1">
                                {!locked && (
                                  <Button size="sm" variant="ghost" onClick={() => removeDrug(i)} className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* EVENT TIMELINE */}
            <Card className="rounded-2xl border-slate-200/70">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base text-slate-900">Intra-op events</CardTitle>
                    <p className="text-xs text-slate-500">Vitals checkpoints and notable events</p>
                  </div>
                  {!locked && (
                    <Button size="sm" variant="outline" onClick={() => setEventOpen(true)} className="gap-1">
                      <Plus className="w-3.5 h-3.5" /> Add event
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No events logged yet</p>
                ) : (
                  <ul className="space-y-2">
                    {events.map((ev, i) => (
                      <li key={ev.id || i} className="flex items-start gap-3 p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                        <div className="w-8 h-8 rounded-lg bg-violet-50 ring-1 ring-violet-100 flex items-center justify-center shrink-0">
                          <Activity className="w-4 h-4 text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] font-normal bg-white">{ev.type || 'event'}</Badge>
                            <span className="text-[11px] text-slate-400">
                              {ev.createdAt ? new Date(ev.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '—'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-700 mt-1 flex items-center gap-3 flex-wrap tabular-nums">
                            {ev.bp    && <span>BP <span className="font-medium">{ev.bp}</span></span>}
                            {ev.hr    && <span>HR <span className="font-medium">{ev.hr}</span></span>}
                            {ev.spo2  && <span>SpO₂ <span className="font-medium">{ev.spo2}%</span></span>}
                            {ev.etco2 && <span>EtCO₂ <span className="font-medium">{ev.etco2}</span></span>}
                          </div>
                          {ev.notes && <p className="text-xs text-slate-600 mt-1">{ev.notes}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* PACU + ALDRETE */}
            <Card className="rounded-2xl border-slate-200/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-slate-900">Recovery (PACU)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-slate-500">PACU recovery notes</Label>
                  <Textarea value={form.pacuRecovery} onChange={(e) => setForm({ ...form, pacuRecovery: e.target.value })}
                    disabled={locked} className="min-h-[80px] rounded-lg"
                    placeholder="Recovery, complications, time to discharge from PACU…" />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">
                    Aldrete score on discharge: <span className="text-slate-900 font-semibold">{form.aldreteScore}/10</span>
                  </Label>
                  <input type="range" min={0} max={10} step={1} value={form.aldreteScore}
                    onChange={(e) => setForm({ ...form, aldreteScore: Number(e.target.value) })}
                    disabled={locked} className="w-full" />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>0</span><span>5</span><span>10 — ready</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {!locked && (
            <>
              <Button onClick={save} disabled={saving} variant="outline" className="gap-1.5">
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button onClick={signAndLock} disabled={signing} className="bg-slate-900 hover:bg-slate-800 gap-1.5">
                <ShieldCheck className="w-4 h-4" /> {signing ? 'Signing…' : 'Sign & lock'}
              </Button>
            </>
          )}
        </DialogFooter>

        {/* ADD EVENT SUB-DIALOG */}
        <Dialog open={eventOpen} onOpenChange={setEventOpen}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg">Log intra-op event</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs text-slate-500">Event type *</Label>
                <Select value={eventForm.type} onValueChange={(v) => setEventForm({ ...eventForm, type: v })}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500">BP (sys/dia)</Label>
                  <Input value={eventForm.bp || ''} onChange={(e) => setEventForm({ ...eventForm, bp: e.target.value })}
                    placeholder="120/80" className="rounded-lg" />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">HR</Label>
                  <Input value={String(eventForm.hr ?? '')} onChange={(e) => setEventForm({ ...eventForm, hr: e.target.value })}
                    placeholder="bpm" className="rounded-lg" />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">SpO₂ %</Label>
                  <Input value={String(eventForm.spo2 ?? '')} onChange={(e) => setEventForm({ ...eventForm, spo2: e.target.value })}
                    placeholder="98" className="rounded-lg" />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">EtCO₂</Label>
                  <Input value={String(eventForm.etco2 ?? '')} onChange={(e) => setEventForm({ ...eventForm, etco2: e.target.value })}
                    placeholder="mmHg" className="rounded-lg" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Notes</Label>
                <Textarea value={eventForm.notes || ''} onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                  placeholder="Brief context — what happened?" className="min-h-[60px] rounded-lg" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEventOpen(false)} disabled={eventSaving}>Cancel</Button>
              <Button onClick={addEvent} disabled={eventSaving} className="bg-slate-900 hover:bg-slate-800">
                {eventSaving ? 'Saving…' : 'Log event'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
