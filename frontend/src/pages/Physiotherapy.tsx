// Physiotherapy — two related resources: treatment Plans (multi-week
// courses) and Sessions (individual therapy appointments under a plan).

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Activity } from 'lucide-react';
import api from '../services/api';
import { StatusBadge, fmtDate } from '../components/modules/ResourceListPage';

interface PhysioPlan {
  id: string;
  patientId: string;
  therapistId?: string | null;
  diagnosis?: string | null;
  goals?: string | null;
  protocol?: string | null;
  totalSessions: number;
  completedCount: number;
  startDate: string;
  endDate?: string | null;
  status: string;
}
interface PhysioSession {
  id: string;
  planId?: string | null;
  patientId: string;
  scheduledDate: string;
  scheduledTime?: string | null;
  durationMin?: number | null;
  modalities?: string | null;
  exercises?: string | null;
  painPre?: number | null;
  painPost?: number | null;
  status: string;
}

export default function Physiotherapy() {
  const [tab, setTab] = useState<'plans' | 'sessions'>('plans');
  const [plans, setPlans] = useState<PhysioPlan[]>([]);
  const [sessions, setSessions] = useState<PhysioSession[]>([]);

  async function load() {
    const [p, s] = await Promise.all([
      api.get('/api/physio/plans').catch(() => ({ data: [] })),
      api.get('/api/physio/sessions').catch(() => ({ data: [] })),
    ]);
    setPlans(p.data); setSessions(s.data);
  }
  useEffect(() => { void load(); }, []);

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-full max-w-[1500px] mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 ring-1 ring-cyan-100 flex items-center justify-center">
            <Activity className="w-6 h-6 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Physiotherapy</h1>
            <p className="text-sm text-slate-500 mt-0.5">Treatment plans + individual session records</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          ['Active plans', plans.filter((p) => p.status === 'active').length, 'cyan'],
          ['Total plans', plans.length, 'slate'],
          ['Sessions today', sessions.filter((s) => fmtDate(s.scheduledDate) === fmtDate(new Date())).length, 'cyan'],
          ['Completed sessions', sessions.filter((s) => s.status === 'completed').length, 'slate'],
        ] as Array<[string, number, 'cyan' | 'slate']>).map(([label, value, tint]) => {
          const tintBg = tint === 'cyan' ? 'bg-cyan-50 ring-cyan-100' : 'bg-slate-100 ring-slate-200';
          const iconColor = tint === 'cyan' ? 'text-cyan-600' : 'text-slate-700';
          return (
            <Card key={label} className="rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</div>
                  <div className={`w-8 h-8 rounded-lg ring-1 flex items-center justify-center ${tintBg}`}>
                    <Activity className={`w-4 h-4 ${iconColor}`} />
                  </div>
                </div>
                <div className="text-3xl font-semibold text-slate-900 mt-2 tracking-tight tabular-nums">{value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="plans">Treatment plans ({plans.length})</TabsTrigger>
          <TabsTrigger value="sessions">Sessions ({sessions.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="mt-4">
          <PlansPanel plans={plans} onChanged={load} />
        </TabsContent>
        <TabsContent value="sessions" className="mt-4">
          <SessionsPanel sessions={sessions} plans={plans} onChanged={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlansPanel({ plans, onChanged }: { plans: PhysioPlan[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PhysioPlan | null>(null);
  const [form, setForm] = useState<any>({});

  function newOne() {
    const today = new Date().toISOString().slice(0, 10);
    setForm({ patientId: '', diagnosis: '', goals: '', protocol: '', totalSessions: 10, completedCount: 0, startDate: today, status: 'active' });
    setEditing(null); setOpen(true);
  }
  function edit(p: PhysioPlan) {
    setForm({ ...p, startDate: p.startDate.slice(0, 10), endDate: p.endDate?.slice(0, 10) || '' });
    setEditing(p); setOpen(true);
  }
  async function save() {
    if (!form.patientId) { alert('Patient ID required'); return; }
    try {
      const payload = { ...form };
      ['totalSessions','completedCount'].forEach(k => payload[k] = Number(payload[k] || 0));
      if (editing) await api.put(`/api/physio/plans/${editing.id}`, payload);
      else await api.post('/api/physio/plans', payload);
      setOpen(false); onChanged();
    } catch (e: any) { alert(e?.response?.data?.error || 'Save failed'); }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Plans</CardTitle>
        <Button onClick={newOne} className="gap-1"><Plus className="w-4 h-4" /> New plan</Button>
      </CardHeader>
      <CardContent>
        {plans.length === 0 ? <p className="text-sm text-slate-500 py-6 text-center">No plans yet.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Patient</TableHead><TableHead>Diagnosis</TableHead>
              <TableHead>Sessions</TableHead><TableHead>Started</TableHead>
              <TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {plans.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.patientId.slice(0, 8)}</TableCell>
                  <TableCell>{p.diagnosis || '—'}</TableCell>
                  <TableCell>{p.completedCount} / {p.totalSessions}</TableCell>
                  <TableCell>{fmtDate(p.startDate)}</TableCell>
                  <TableCell><StatusBadge value={p.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => edit(p)} className="h-7 w-7 p-0"><Pencil className="w-3.5 h-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'New'} plan</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <Field label="Patient ID *" value={form.patientId} onChange={(v) => setForm({ ...form, patientId: v })} />
            <Field label="Therapist ID" value={form.therapistId} onChange={(v) => setForm({ ...form, therapistId: v })} />
            <Field label="Total sessions" type="number" value={form.totalSessions} onChange={(v) => setForm({ ...form, totalSessions: v })} />
            <Field label="Completed" type="number" value={form.completedCount} onChange={(v) => setForm({ ...form, completedCount: v })} />
            <Field label="Start date" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
            <Field label="End date" type="date" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} />
            <SelectField label="Status" value={form.status || 'active'} onChange={(v) => setForm({ ...form, status: v })}
              options={['active','paused','completed','cancelled']} />
            <div className="col-span-2">
              <Label className="text-xs text-slate-500">Diagnosis</Label>
              <Input value={form.diagnosis || ''} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-slate-500">Goals</Label>
              <textarea value={form.goals || ''} onChange={(e) => setForm({ ...form, goals: e.target.value })} className="w-full min-h-[60px] p-2 border rounded text-sm" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-slate-500">Protocol</Label>
              <textarea value={form.protocol || ''} onChange={(e) => setForm({ ...form, protocol: e.target.value })} className="w-full min-h-[60px] p-2 border rounded text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SessionsPanel({ sessions, plans, onChanged }: { sessions: PhysioSession[]; plans: PhysioPlan[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PhysioSession | null>(null);
  const [form, setForm] = useState<any>({});

  function newOne() {
    setForm({
      patientId: '', planId: '_none', scheduledDate: new Date().toISOString().slice(0, 10),
      scheduledTime: '', durationMin: 45, status: 'scheduled', painPre: '', painPost: '',
    });
    setEditing(null); setOpen(true);
  }
  function edit(s: PhysioSession) {
    setForm({ ...s, planId: s.planId || '_none', scheduledDate: s.scheduledDate.slice(0, 10) });
    setEditing(s); setOpen(true);
  }
  async function save() {
    if (!form.patientId) { alert('Patient ID required'); return; }
    try {
      const payload = { ...form, planId: form.planId === '_none' ? null : form.planId };
      ['durationMin','painPre','painPost'].forEach(k => { if (payload[k] === '' || payload[k] === null) payload[k] = null; else payload[k] = Number(payload[k]); });
      if (editing) await api.put(`/api/physio/sessions/${editing.id}`, payload);
      else await api.post('/api/physio/sessions', payload);
      setOpen(false); onChanged();
    } catch (e: any) { alert(e?.response?.data?.error || 'Save failed'); }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Sessions</CardTitle>
        <Button onClick={newOne} className="gap-1"><Plus className="w-4 h-4" /> New session</Button>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? <p className="text-sm text-slate-500 py-6 text-center">No sessions yet.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Patient</TableHead>
              <TableHead>Modalities</TableHead><TableHead>Pain VAS</TableHead>
              <TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{fmtDate(s.scheduledDate)} {s.scheduledTime && <span className="text-xs text-slate-500">{s.scheduledTime}</span>}</TableCell>
                  <TableCell className="font-mono text-xs">{s.patientId.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs">{s.modalities || '—'}</TableCell>
                  <TableCell>{s.painPre ?? '—'} → {s.painPost ?? '—'}</TableCell>
                  <TableCell><StatusBadge value={s.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => edit(s)} className="h-7 w-7 p-0"><Pencil className="w-3.5 h-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'New'} session</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <Field label="Patient ID *" value={form.patientId} onChange={(v) => setForm({ ...form, patientId: v })} />
            <SelectField label="Plan" value={form.planId || '_none'} onChange={(v) => setForm({ ...form, planId: v })}
              options={['_none', ...plans.map((p) => p.id)]}
              labels={{ _none: '— none —', ...Object.fromEntries(plans.map((p) => [p.id, `${p.diagnosis || 'Plan'} (${p.id.slice(0, 8)})`])) }} />
            <Field label="Date *" type="date" value={form.scheduledDate} onChange={(v) => setForm({ ...form, scheduledDate: v })} />
            <Field label="Time" placeholder="HH:MM" value={form.scheduledTime} onChange={(v) => setForm({ ...form, scheduledTime: v })} />
            <Field label="Duration (min)" type="number" value={form.durationMin} onChange={(v) => setForm({ ...form, durationMin: v })} />
            <SelectField label="Status" value={form.status || 'scheduled'} onChange={(v) => setForm({ ...form, status: v })}
              options={['scheduled','completed','no_show','cancelled']} />
            <Field label="Pain pre (VAS 0-10)" type="number" value={form.painPre} onChange={(v) => setForm({ ...form, painPre: v })} />
            <Field label="Pain post" type="number" value={form.painPost} onChange={(v) => setForm({ ...form, painPost: v })} />
            <div className="col-span-2">
              <Label className="text-xs text-slate-500">Modalities</Label>
              <Input value={form.modalities || ''} onChange={(e) => setForm({ ...form, modalities: e.target.value })} placeholder="Ultrasound, TENS, IFT, hot pack..." />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-slate-500">Exercises</Label>
              <textarea value={form.exercises || ''} onChange={(e) => setForm({ ...form, exercises: e.target.value })} className="w-full min-h-[60px] p-2 border rounded text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: any; onChange: (v: any) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs text-slate-500">{label}</Label>
      <Input type={type as any} value={value === null || value === undefined ? '' : value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
function SelectField({ label, value, onChange, options, labels }: { label: string; value: string; onChange: (v: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <div>
      <Label className="text-xs text-slate-500">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o}>{labels?.[o] || o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
