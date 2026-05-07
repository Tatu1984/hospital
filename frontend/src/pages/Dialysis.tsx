// Dialysis module — for the Nephrology department. Two tabs: Sessions
// (clinical scheduling + per-session record) and Machines (the unit
// inventory). Sessions capture pre/post weights, UF volume, blood-flow
// rates, vascular access, complications — the headline numbers for a
// haemodialysis run.

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Activity, Plus, Pencil, Trash2, Cog } from 'lucide-react';
import api from '../services/api';
import { StatusBadge, fmtDate } from '../components/modules/ResourceListPage';

interface DialysisMachine {
  id: string;
  machineName: string;
  machineCode: string;
  modality: string;
  manufacturer?: string | null;
  status: string;
  location?: string | null;
}

interface DialysisSession {
  id: string;
  patientId: string;
  machineId?: string | null;
  scheduledDate: string;
  scheduledTime?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  modality: string;
  vascularAccess?: string | null;
  preWeightKg?: string | number | null;
  postWeightKg?: string | number | null;
  ufGoalMl?: number | null;
  ufActualMl?: number | null;
  bloodFlowRate?: number | null;
  status: string;
  complications?: string | null;
  notes?: string | null;
  machine?: { machineName: string; machineCode: string } | null;
}

interface PatientLite { id: string; mrn: string; name: string; }

export default function Dialysis() {
  const [tab, setTab] = useState<'sessions' | 'machines'>('sessions');
  const [machines, setMachines] = useState<DialysisMachine[]>([]);
  const [sessions, setSessions] = useState<DialysisSession[]>([]);
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [m, s, p] = await Promise.all([
        api.get('/api/dialysis/machines').catch(() => ({ data: [] })),
        api.get('/api/dialysis/sessions').catch(() => ({ data: [] })),
        api.get('/api/patients', { params: { limit: 200 } }).catch(() => ({ data: [] })),
      ]);
      setMachines(m.data);
      setSessions(s.data);
      setPatients((p.data || []).map((x: any) => ({ id: x.id, mrn: x.mrn, name: x.name })));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  const machineCount = machines.length;
  const machinesAvailable = machines.filter((m) => m.status === 'available').length;
  const sessionsToday = sessions.filter((s) => {
    const d = new Date(s.scheduledDate); d.setHours(0, 0, 0, 0);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return d.getTime() === now.getTime();
  }).length;
  const inProgress = sessions.filter((s) => s.status === 'in_progress').length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dialysis</h1>
          <p className="text-sm text-slate-500">Nephrology unit — sessions, machines, vascular access</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Machines" value={machineCount} sub={`${machinesAvailable} available`} />
        <Stat label="Sessions today" value={sessionsToday} />
        <Stat label="In progress" value={inProgress} accent="text-blue-700" />
        <Stat label="Total this month" value={sessions.length} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="sessions">Sessions ({sessions.length})</TabsTrigger>
          <TabsTrigger value="machines">Machines ({machines.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4 mt-4">
          <SessionsPanel
            sessions={sessions}
            machines={machines}
            patients={patients}
            onChanged={load}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="machines" className="space-y-4 mt-4">
          <MachinesPanel machines={machines} onChanged={load} loading={loading} />
        </TabsContent>
      </Tabs>
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

// ============= SESSIONS PANEL =============
function SessionsPanel({
  sessions, machines, patients, onChanged, loading,
}: { sessions: DialysisSession[]; machines: DialysisMachine[]; patients: PatientLite[]; onChanged: () => void; loading: boolean }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DialysisSession | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  function openNew() {
    const today = new Date().toISOString().slice(0, 10);
    setForm({
      patientId: '', machineId: '', scheduledDate: today, scheduledTime: '',
      modality: 'HD', vascularAccess: 'AVF',
      preWeightKg: '', postWeightKg: '', ufGoalMl: '', ufActualMl: '',
      bloodFlowRate: 300, dialysateFlow: 500, durationMin: 240,
      status: 'scheduled', complications: '', notes: '',
    });
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(s: DialysisSession) {
    setForm({
      ...s,
      scheduledDate: s.scheduledDate ? new Date(s.scheduledDate).toISOString().slice(0, 10) : '',
    });
    setEditing(s);
    setDialogOpen(true);
  }

  async function save() {
    if (!form.patientId) { alert('Pick a patient'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      // Normalize numeric/date fields
      ['preWeightKg','postWeightKg','ufGoalMl','ufActualMl','bloodFlowRate','dialysateFlow','durationMin','preBpSys','preBpDia','postBpSys','postBpDia']
        .forEach(k => { if (payload[k] === '') payload[k] = null; else if (payload[k] !== null && payload[k] !== undefined) payload[k] = Number(payload[k]); });
      if (editing) {
        await api.put(`/api/dialysis/sessions/${editing.id}`, payload);
      } else {
        await api.post('/api/dialysis/sessions', payload);
      }
      setDialogOpen(false);
      onChanged();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to save session');
    } finally {
      setSaving(false);
    }
  }
  async function remove(s: DialysisSession) {
    if (!confirm('Delete this session?')) return;
    try {
      await api.delete(`/api/dialysis/sessions/${s.id}`);
      onChanged();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Delete failed');
    }
  }

  const patientName = (id: string) => patients.find((p) => p.id === id)?.name || id.slice(0, 8);
  const patientMrn = (id: string) => patients.find((p) => p.id === id)?.mrn || '';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Sessions</CardTitle>
        <Button onClick={openNew} className="gap-1"><Plus className="w-4 h-4" /> Schedule session</Button>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>
        : sessions.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            No dialysis sessions on record. Click "Schedule session" to add the first one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Modality</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>UF (goal/actual)</TableHead>
                  <TableHead>Wt pre→post</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap">
                      {fmtDate(s.scheduledDate)}
                      {s.scheduledTime && <div className="text-xs text-slate-500">{s.scheduledTime}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{patientName(s.patientId)}</div>
                      <div className="text-xs text-slate-500">{patientMrn(s.patientId)}</div>
                    </TableCell>
                    <TableCell>{s.machine?.machineName || '—'}</TableCell>
                    <TableCell>{s.modality}</TableCell>
                    <TableCell>{s.vascularAccess || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {s.ufGoalMl || '—'} / {s.ufActualMl || '—'} mL
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {s.preWeightKg ? `${s.preWeightKg} → ` : '—'}{s.postWeightKg || ''} kg
                    </TableCell>
                    <TableCell><StatusBadge value={s.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)} className="h-7 w-7 p-0"><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(s)} className="h-7 w-7 p-0 text-red-600"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit dialysis session' : 'Schedule dialysis session'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 py-2">
            <FormSelect label="Patient *" value={form.patientId || ''} onChange={(v) => setForm({ ...form, patientId: v })}
              options={patients.map((p) => ({ value: p.id, label: `${p.name} (${p.mrn})` }))} placeholder="Select patient…" />
            <FormSelect
              label="Machine"
              value={form.machineId || '_none'}
              onChange={(v) => setForm({ ...form, machineId: v === '_none' ? null : v })}
              options={[
                { value: '_none', label: 'Unassigned' },
                ...machines.map((m) => ({ value: m.id, label: m.machineName })),
              ]}
            />
            <FormSelect label="Modality" value={form.modality || 'HD'} onChange={(v) => setForm({ ...form, modality: v })}
              options={[{ value: 'HD', label: 'Haemodialysis' }, { value: 'HDF', label: 'Haemodiafiltration' }, { value: 'PD', label: 'Peritoneal' }, { value: 'SLED', label: 'SLED' }]} />

            <FormInput label="Date" type="date" value={form.scheduledDate || ''} onChange={(v) => setForm({ ...form, scheduledDate: v })} />
            <FormInput label="Time" placeholder="e.g. 09:30" value={form.scheduledTime || ''} onChange={(v) => setForm({ ...form, scheduledTime: v })} />
            <FormSelect label="Status" value={form.status || 'scheduled'} onChange={(v) => setForm({ ...form, status: v })}
              options={['scheduled','in_progress','completed','cancelled','missed'].map(v => ({ value: v, label: v }))} />

            <FormSelect label="Vascular access" value={form.vascularAccess || 'AVF'} onChange={(v) => setForm({ ...form, vascularAccess: v })}
              options={['AVF','AVG','Central catheter (R-IJ)','Central catheter (L-IJ)','Central catheter (Femoral)','Peritoneal','Other'].map(v => ({ value: v, label: v }))} />
            <FormInput label="Dialyzer" placeholder="e.g. F60S 1.3 m²" value={form.dialyzer || ''} onChange={(v) => setForm({ ...form, dialyzer: v })} />
            <FormInput label="Duration (min)" type="number" value={form.durationMin ?? ''} onChange={(v) => setForm({ ...form, durationMin: v })} />

            <FormInput label="Pre weight (kg)" type="number" value={form.preWeightKg ?? ''} onChange={(v) => setForm({ ...form, preWeightKg: v })} />
            <FormInput label="Post weight (kg)" type="number" value={form.postWeightKg ?? ''} onChange={(v) => setForm({ ...form, postWeightKg: v })} />
            <FormInput label="UF goal (mL)" type="number" value={form.ufGoalMl ?? ''} onChange={(v) => setForm({ ...form, ufGoalMl: v })} />
            <FormInput label="UF actual (mL)" type="number" value={form.ufActualMl ?? ''} onChange={(v) => setForm({ ...form, ufActualMl: v })} />
            <FormInput label="Blood flow (mL/min)" type="number" value={form.bloodFlowRate ?? ''} onChange={(v) => setForm({ ...form, bloodFlowRate: v })} />
            <FormInput label="Dialysate (mL/min)" type="number" value={form.dialysateFlow ?? ''} onChange={(v) => setForm({ ...form, dialysateFlow: v })} />

            <FormInput label="Pre BP sys" type="number" value={form.preBpSys ?? ''} onChange={(v) => setForm({ ...form, preBpSys: v })} />
            <FormInput label="Pre BP dia" type="number" value={form.preBpDia ?? ''} onChange={(v) => setForm({ ...form, preBpDia: v })} />
            <FormInput label="Post BP sys" type="number" value={form.postBpSys ?? ''} onChange={(v) => setForm({ ...form, postBpSys: v })} />
            <FormInput label="Post BP dia" type="number" value={form.postBpDia ?? ''} onChange={(v) => setForm({ ...form, postBpDia: v })} />
            <FormInput label="Heparin" placeholder="e.g. 2000 U bolus + 1000 U/h" value={form.heparin || ''} onChange={(v) => setForm({ ...form, heparin: v })} />

            <div className="col-span-3">
              <Label className="text-xs text-slate-500">Complications</Label>
              <textarea value={form.complications || ''} onChange={(e) => setForm({ ...form, complications: e.target.value })}
                placeholder="Hypotension, cramps, clotting, fever, etc." className="w-full min-h-[60px] p-2 border rounded text-sm" />
            </div>
            <div className="col-span-3">
              <Label className="text-xs text-slate-500">Notes</Label>
              <textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full min-h-[60px] p-2 border rounded text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============= MACHINES PANEL =============
function MachinesPanel({ machines, onChanged, loading }: { machines: DialysisMachine[]; onChanged: () => void; loading: boolean }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DialysisMachine | null>(null);
  const [form, setForm] = useState<any>({});

  function openNew() {
    setForm({ machineName: '', machineCode: '', modality: 'HD', manufacturer: '', model: '', status: 'available', location: '' });
    setEditing(null); setDialogOpen(true);
  }
  function openEdit(m: DialysisMachine) { setForm({ ...m }); setEditing(m); setDialogOpen(true); }

  async function save() {
    if (!form.machineName || !form.machineCode) { alert('Name and code are required'); return; }
    try {
      if (editing) await api.put(`/api/dialysis/machines/${editing.id}`, form);
      else await api.post('/api/dialysis/machines', form);
      setDialogOpen(false);
      onChanged();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Save failed');
    }
  }
  async function remove(m: DialysisMachine) {
    if (!confirm('Delete this machine?')) return;
    try { await api.delete(`/api/dialysis/machines/${m.id}`); onChanged(); }
    catch (e: any) { alert(e?.response?.data?.error || 'Delete failed'); }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Cog className="w-4 h-4 text-slate-600" /> Machines</CardTitle>
        <Button onClick={openNew} className="gap-1"><Plus className="w-4 h-4" /> Add machine</Button>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>
        : machines.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">No machines registered yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Modality</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.machineName}</TableCell>
                  <TableCell><Badge variant="outline">{m.machineCode}</Badge></TableCell>
                  <TableCell>{m.modality}</TableCell>
                  <TableCell>{m.manufacturer || '—'}</TableCell>
                  <TableCell><StatusBadge value={m.status} /></TableCell>
                  <TableCell className="text-xs text-slate-500">{m.location || '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(m)} className="h-7 w-7 p-0"><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(m)} className="h-7 w-7 p-0 text-red-600"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit machine' : 'Add dialysis machine'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <FormInput label="Name *" value={form.machineName || ''} onChange={(v) => setForm({ ...form, machineName: v })} />
            <FormInput label="Code *" value={form.machineCode || ''} onChange={(v) => setForm({ ...form, machineCode: v })} />
            <FormSelect label="Modality" value={form.modality || 'HD'} onChange={(v) => setForm({ ...form, modality: v })}
              options={[{ value: 'HD', label: 'HD' }, { value: 'HDF', label: 'HDF' }, { value: 'PD', label: 'PD' }, { value: 'SLED', label: 'SLED' }]} />
            <FormSelect label="Status" value={form.status || 'available'} onChange={(v) => setForm({ ...form, status: v })}
              options={['available','in_use','maintenance','retired'].map(v => ({ value: v, label: v }))} />
            <FormInput label="Manufacturer" value={form.manufacturer || ''} onChange={(v) => setForm({ ...form, manufacturer: v })} />
            <FormInput label="Model" value={form.model || ''} onChange={(v) => setForm({ ...form, model: v })} />
            <FormInput label="Serial" value={form.serialNumber || ''} onChange={(v) => setForm({ ...form, serialNumber: v })} />
            <FormInput label="Location" value={form.location || ''} onChange={(v) => setForm({ ...form, location: v })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============= SHARED FORM HELPERS =============
function FormInput({ label, value, onChange, type = 'text', placeholder }: { label: string; value: any; onChange: (v: any) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs text-slate-500">{label}</Label>
      <Input type={type as any} value={value === null || value === undefined ? '' : value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
function FormSelect({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }>; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs text-slate-500">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
