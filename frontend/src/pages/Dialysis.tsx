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
import { Activity, Plus, Pencil, Trash2, Cog, CalendarDays } from 'lucide-react';
import api from '../services/api';
import { StatusBadge, fmtDate } from '../components/modules/ResourceListPage';
import { DIALYSIS_SLOTS, slotLabel } from '../lib/dialysisSlots';
import { useToast } from '../components/Toast';
import MrnLink from '../components/MrnLink';

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
  const [tab, setTab] = useState<'register' | 'sessions' | 'machines'>('register');
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
    <div className="p-6 lg:p-8 space-y-6 min-h-full max-w-[1500px] mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 ring-1 ring-rose-100 flex items-center justify-center">
            <Activity className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Dialysis</h1>
            <p className="text-sm text-slate-500 mt-0.5">Nephrology unit — sessions, machines, vascular access</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Machines" value={machineCount} sub={`${machinesAvailable} available`} icon={<Cog className="w-4 h-4 text-slate-700" />} />
        <Stat label="Sessions today" value={sessionsToday} icon={<CalendarDays className="w-4 h-4 text-rose-600" />} tint="rose" />
        <Stat label="In progress" value={inProgress} accent="text-blue-700" icon={<Activity className="w-4 h-4 text-blue-600" />} tint="blue" />
        <Stat label="Total this month" value={sessions.length} icon={<Activity className="w-4 h-4 text-slate-700" />} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="register">Register (slots)</TabsTrigger>
          <TabsTrigger value="sessions">Sessions ({sessions.length})</TabsTrigger>
          <TabsTrigger value="machines">Machines ({machines.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-4 mt-4">
          <DialysisRegisterPanel
            machines={machines}
            patients={patients}
            onChanged={load}
          />
        </TabsContent>

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

function Stat({ label, value, sub, accent, icon, tint }: { label: string; value: number; sub?: string; accent?: string; icon?: React.ReactNode; tint?: 'rose' | 'blue' | 'slate' }) {
  const tintBg = tint === 'rose' ? 'bg-rose-50 ring-rose-100' : tint === 'blue' ? 'bg-blue-50 ring-blue-100' : 'bg-slate-100 ring-slate-200';
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</div>
          {icon && (
            <div className={`w-8 h-8 rounded-lg ring-1 flex items-center justify-center ${tintBg}`}>
              {icon}
            </div>
          )}
        </div>
        <div className={`text-3xl font-semibold ${accent || 'text-slate-900'} mt-2 tracking-tight tabular-nums`}>{value}</div>
        {sub && <div className="text-[11px] text-slate-500 mt-1">{sub}</div>}
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
                      <div className="text-xs text-slate-500 mt-0.5">
                        <MrnLink mrn={patientMrn(s.patientId)} patientId={s.patientId} />
                      </div>
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

// ---------------------------------------------------------------------------
// Dialysis booking register. 4 fixed slots × N beds, with a date picker.
// Each slot row shows the patient/machine/bed assignments for that slot.
// Empty cells offer a "+ Book" button to create a session.
// ---------------------------------------------------------------------------

interface DialysisBed {
  id: string;
  bedNumber: string;
  status: string;
  floor?: string | null;
}

interface SlotRow {
  id: string;
  patientId: string;
  machineId?: string | null;
  bedId?: string | null;
  slot: string;
  status: string;
  notes?: string | null;
  patient?: { id: string; name: string; mrn: string } | null;
  machine?: { id: string; machineName: string; machineCode: string; status: string } | null;
  // Flattened "treating doctor" — pulled from the patient's latest
  // admission's admittingDoctor on the backend.
  patientDoctor?: string | null;
}

function todayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Last day of the same month as the given YYYY-MM-DD. Used as the
// default "Repeat until" target so a permanent patient gets the rest
// of the current month booked in one click.
function endOfMonthYMD(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return ymd;
  const eom = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return eom.toISOString().slice(0, 10);
}

function DialysisRegisterPanel({
  machines,
  patients,
  onChanged,
}: {
  machines: DialysisMachine[];
  patients: PatientLite[];
  onChanged: () => void | Promise<void>;
}) {
  const toast = useToast();
  const [date, setDate] = useState<string>(todayYMD());
  const [beds, setBeds] = useState<DialysisBed[]>([]);
  const [sessions, setSessions] = useState<SlotRow[]>([]);
  const [loading, setLoading] = useState(false);
  // New-booking dialog state.
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<string>('SLOT_1');
  const [bookingPatient, setBookingPatient] = useState<string>('');
  const [bookingMachine, setBookingMachine] = useState<string>('');
  const [bookingBed, setBookingBed] = useState<string>('');
  const [bookingNotes, setBookingNotes] = useState<string>('');
  // Recurrence — for a "permanent" patient who comes the same day +
  // slot every week. Operator picks "Repeat until <date>"; we compute
  // the number of weeks from start to that date.
  const [bookingRepeat, setBookingRepeat] = useState(false);
  const [bookingRepeatUntil, setBookingRepeatUntil] = useState<string>('');

  async function load() {
    setLoading(true);
    try {
      const [b, s] = await Promise.all([
        api.get('/api/dialysis/beds').catch(() => ({ data: [] })),
        api.get('/api/dialysis/sessions', { params: { date } }).catch(() => ({ data: [] })),
      ]);
      setBeds(Array.isArray(b.data) ? b.data : []);
      setSessions(Array.isArray(s.data) ? s.data : []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [date]);

  const machineCount = machines.filter((m) => m.status !== 'retired').length;
  const bedCount = beds.length;
  const ratioOk = bedCount === 0 || machineCount >= Math.ceil(bedCount * 1.5);

  function openBookingFor(slot: string, bedId?: string) {
    setBookingSlot(slot);
    setBookingPatient('');
    setBookingMachine('');
    setBookingBed(bedId || '');
    setBookingNotes('');
    setBookingRepeat(false);
    // Default "until" = last day of the same month as `date`.
    setBookingRepeatUntil(endOfMonthYMD(date));
    setBookingOpen(true);
  }

  async function seedDialysis() {
    try {
      const res = await api.post('/api/dialysis/seed');
      const s = res.data?.summary;
      await load();
      await onChanged();
      toast.success(
        'Dialysis seeded',
        `Beds: ${s?.beds?.total ?? 10} (added ${s?.beds?.created ?? 0}). Machines: ${s?.machines?.total ?? 15} (added ${s?.machines?.created ?? 0}).`,
      );
    } catch (err: any) {
      toast.error('Could not seed dialysis', err?.response?.data?.error || err?.message || 'Try again.');
    }
  }

  async function submitBooking() {
    if (!bookingPatient || !bookingMachine) {
      toast.warning('Patient and machine are required');
      return;
    }
    // Compute the number of weekly repeats. Inclusive of start; rounded
    // down to whole weeks. 1 = just today (no recurrence).
    let repeatWeeks = 1;
    if (bookingRepeat && bookingRepeatUntil) {
      const start = new Date(`${date}T00:00:00.000Z`).getTime();
      const until = new Date(`${bookingRepeatUntil}T00:00:00.000Z`).getTime();
      if (until < start) {
        toast.warning('Until date is before the start', 'Pick an "until" date on or after the booking date.');
        return;
      }
      const days = Math.floor((until - start) / (1000 * 60 * 60 * 24));
      repeatWeeks = Math.min(52, Math.floor(days / 7) + 1);
    }
    try {
      const res = await api.post('/api/dialysis/sessions', {
        patientId: bookingPatient,
        machineId: bookingMachine,
        bedId: bookingBed || null,
        sessionDate: date,
        slot: bookingSlot,
        notes: bookingNotes || null,
        repeatWeeks,
      });
      setBookingOpen(false);
      await load();
      await onChanged();
      if (repeatWeeks === 1) {
        toast.success('Session booked', `Patient added to ${slotLabel(bookingSlot)}.`);
      } else {
        const data = res.data;
        const created = data?.created?.length ?? 0;
        const skipped = data?.skipped?.length ?? 0;
        toast.success(
          'Recurring sessions booked',
          `${created} of ${repeatWeeks} weeks scheduled${skipped > 0 ? ` · ${skipped} skipped (conflicts)` : ''}.`,
        );
      }
    } catch (err: any) {
      // Dump the full server response to the console so an operator can
      // copy-paste it back if the toast text isn't enough. The toast
      // already shows server-supplied error if there is one.
      // eslint-disable-next-line no-console
      console.error('[dialysis booking] error response:', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      });
      const detail = err?.response?.data?.error
        || err?.response?.data?.message
        || err?.message
        || 'Try again.';
      const code = err?.response?.data?.code ? ` (${err.response.data.code})` : '';
      toast.error('Could not book', `${detail}${code}`);
    }
  }

  // Download the week containing `date` as CSV — for the on-ground team
  // to print and pin up. We hit /api/dialysis/sessions with from/to so
  // the server returns one week's worth of bookings (sorted by date,
  // slot, then bed). Falls back gracefully if the range query isn't
  // supported yet (still produces the visible-day CSV).
  async function downloadWeekly() {
    const start = new Date(`${date}T00:00:00.000Z`);
    // Anchor on Monday of the week containing `date`. JS getUTCDay()
    // returns 0 for Sunday; shift to a Mon=0 index.
    const dow = (start.getUTCDay() + 6) % 7;
    const monday = new Date(start.getTime() - dow * 86400000);
    const sunday = new Date(monday.getTime() + 6 * 86400000);
    const fromYmd = monday.toISOString().slice(0, 10);
    const toYmd = sunday.toISOString().slice(0, 10);
    try {
      const res = await api.get('/api/dialysis/sessions', { params: { from: fromYmd, to: toYmd } });
      const rows: SlotRow[] = Array.isArray(res.data) ? res.data : [];
      // Group by date for readable export ordering.
      const order: Record<string, number> = { SLOT_1: 1, SLOT_2: 2, SLOT_3: 3, SLOT_4: 4 };
      rows.sort((a, b) => {
        const da = (a as any).scheduledDate || '';
        const db = (b as any).scheduledDate || '';
        if (da !== db) return da < db ? -1 : 1;
        return (order[a.slot] || 99) - (order[b.slot] || 99);
      });
      const header = ['Date', 'Slot', 'Bed', 'Patient', 'MRN', 'Doctor', 'Machine', 'Status', 'Notes'];
      const escape = (v: any) => {
        if (v == null) return '';
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const lines = [header.join(',')];
      for (const r of rows) {
        const bed = beds.find((b) => b.id === r.bedId);
        const dt = ((r as any).scheduledDate || '').slice(0, 10);
        lines.push([
          dt,
          slotLabel(r.slot),
          bed?.bedNumber || (r.bedId || ''),
          r.patient?.name || '',
          r.patient?.mrn || '',
          r.patientDoctor ? `Dr ${r.patientDoctor}` : '',
          r.machine?.machineCode || r.machine?.machineName || '',
          r.status || '',
          (r as any).notes || '',
        ].map(escape).join(','));
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dialysis-week-${fromYmd}-to-${toYmd}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Schedule downloaded', `${rows.length} bookings for ${fromYmd} → ${toYmd}.`);
    } catch (err: any) {
      toast.error('Could not download', err?.response?.data?.error || err?.message || 'Try again.');
    }
  }

  async function cancelSession(id: string) {
    if (!confirm('Cancel this session? The slot will free up immediately.')) return;
    try {
      await api.delete(`/api/dialysis/sessions/${id}`);
      await load();
      await onChanged();
      toast.success('Session cancelled');
    } catch (err: any) {
      toast.error('Could not cancel', err?.response?.data?.error || err?.message || 'Try again.');
    }
  }

  const sessionsBySlot: Record<string, SlotRow[]> = {};
  for (const s of sessions) {
    if (!s.slot) continue; // older clinical sessions without a slot
    if (!sessionsBySlot[s.slot]) sessionsBySlot[s.slot] = [];
    sessionsBySlot[s.slot].push(s);
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-slate-500" />
            <Label className="text-xs text-slate-500">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-44"
            />
          </div>
          <Button size="sm" variant="outline" onClick={downloadWeekly}>
            Download week (CSV)
          </Button>
          <div className="text-xs text-slate-500">
            <span className="font-medium">{bedCount}</span> bed{bedCount === 1 ? '' : 's'} ·{' '}
            <span className="font-medium">{machineCount}</span> machine{machineCount === 1 ? '' : 's'}
          </div>
          {!ratioOk && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-900">
              Recommend ≥ {Math.ceil(bedCount * 1.5)} machines for {bedCount} beds
            </Badge>
          )}
          {bedCount === 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-rose-100 text-rose-900">
                No dialysis beds configured
              </Badge>
              <Button size="sm" onClick={seedDialysis}>
                <Plus className="w-3 h-3 mr-1" />
                Seed 10 beds + 15 machines
              </Button>
            </div>
          )}
          {bedCount > 0 && machineCount === 0 && (
            <Button size="sm" variant="outline" onClick={seedDialysis}>
              <Plus className="w-3 h-3 mr-1" />
              Add 15 machines
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Per-slot view: one card per slot containing a 5-wide grid of
          bed tiles. Each tile shows the booking (patient + treating
          doctor) or a + Book action. The bed becomes the primary unit
          of UI — the operator sees "Bed DLY-03 is booked for Suresh K.
          under Dr Sharma" at a glance. */}
      {DIALYSIS_SLOTS.map((s) => {
        const slotSessions = sessionsBySlot[s.code] || [];
        const sessionByBedId: Record<string, SlotRow> = {};
        for (const row of slotSessions) {
          if (row.bedId) sessionByBedId[row.bedId] = row;
        }
        // Sessions without a bedId — render as extra tiles at the end so
        // the operator can still see / cancel them.
        const unassignedSessions = slotSessions.filter((r) => !r.bedId);
        return (
          <Card key={s.code}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {s.label}
                <Badge variant="secondary" className="font-normal">
                  {slotSessions.length} / {bedCount || 0} booked
                </Badge>
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openBookingFor(s.code)}
                disabled={loading || machineCount === 0}
              >
                <Plus className="w-3 h-3 mr-1" />
                Book without bed
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {beds.length === 0 ? (
                <div className="text-sm text-slate-500 italic py-3">
                  No dialysis beds yet. Use the "Seed 10 beds + 15 machines" button above.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {beds.map((bed) => {
                    const sess = sessionByBedId[bed.id];
                    if (sess) {
                      return (
                        <div
                          key={bed.id}
                          className="rounded-md border-2 border-blue-200 bg-blue-50 p-2"
                        >
                          <div className="flex items-baseline justify-between gap-1">
                            <div className="font-medium text-sm">{bed.bedNumber}</div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => cancelSession(sess.id)}
                              title="Cancel session"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="text-xs font-medium text-slate-900 mt-0.5 line-clamp-1">
                            {sess.patient?.name || 'Unknown'}
                          </div>
                          <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                            <MrnLink mrn={sess.patient?.mrn} patientId={sess.patient?.id} />
                          </div>
                          <div className="text-[10px] text-slate-600 mt-1 line-clamp-1">
                            {sess.patientDoctor ? `Dr ${sess.patientDoctor}` : 'No doctor assigned'}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                            {sess.machine?.machineCode || sess.machine?.machineName || ''}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={bed.id}
                        type="button"
                        onClick={() => openBookingFor(s.code, bed.id)}
                        disabled={loading || machineCount === 0}
                        className="text-left rounded-md border-2 border-dashed border-slate-200 bg-white p-2 hover:border-slate-400 hover:bg-slate-50 transition disabled:opacity-50"
                      >
                        <div className="font-medium text-sm">{bed.bedNumber}</div>
                        <div className="text-xs text-slate-400 italic mt-0.5">Vacant</div>
                        <div className="text-[10px] text-blue-600 mt-2 flex items-center gap-0.5">
                          <Plus className="w-3 h-3" /> Book
                        </div>
                      </button>
                    );
                  })}

                  {unassignedSessions.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-md border-2 border-amber-200 bg-amber-50 p-2"
                    >
                      <div className="flex items-baseline justify-between gap-1">
                        <div className="text-[10px] uppercase tracking-wide text-amber-700">No bed</div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => cancelSession(row.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="text-xs font-medium text-slate-900 mt-0.5 line-clamp-1">
                        {row.patient?.name || 'Unknown'}
                      </div>
                      <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                        <MrnLink mrn={row.patient?.mrn} patientId={row.patient?.id} />
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1 line-clamp-1">
                        {row.patientDoctor ? `Dr ${row.patientDoctor}` : 'No doctor assigned'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Book dialysis slot</DialogTitle>
            <div className="text-sm text-slate-500">
              {fmtDate(date)} · {slotLabel(bookingSlot)}
            </div>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Patient *</Label>
              <Select value={bookingPatient} onValueChange={setBookingPatient}>
                <SelectTrigger><SelectValue placeholder="Pick a patient" /></SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {p.mrn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Exclude any machine/bed already booked for the chosen
                slot on this date. The register tab already loaded the
                sessions for today's date; if the operator changes the
                date inside the dialog (recurrence), the conflict-check
                still happens server-side on submit. */}
            {(() => {
              const busyMachineIds = new Set<string>();
              const busyBedIds = new Set<string>();
              for (const s of sessions) {
                if (s.slot !== bookingSlot) continue;
                if (s.machineId) busyMachineIds.add(s.machineId);
                if (s.bedId) busyBedIds.add(s.bedId);
              }
              const freeMachines = machines.filter(
                (m) => m.status !== 'retired' && !busyMachineIds.has(m.id),
              );
              const freeBeds = beds.filter((b) => !busyBedIds.has(b.id));
              return (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Machine *
                      <span className="ml-1 text-slate-400 font-normal">
                        ({freeMachines.length} of {machines.length} free)
                      </span>
                    </Label>
                    <Select value={bookingMachine} onValueChange={setBookingMachine}>
                      <SelectTrigger>
                        <SelectValue placeholder={freeMachines.length ? 'Pick a free machine' : 'All machines booked for this slot'} />
                      </SelectTrigger>
                      <SelectContent>
                        {freeMachines.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.machineName} · {m.machineCode} · {m.status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {freeMachines.length === 0 && (
                      <div className="text-[11px] text-rose-700">
                        No machines free for {slotLabel(bookingSlot)}. Either cancel an existing booking or pick a different slot.
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Bed (optional)
                      <span className="ml-1 text-slate-400 font-normal">
                        ({freeBeds.length} of {beds.length} free)
                      </span>
                    </Label>
                    <Select value={bookingBed} onValueChange={setBookingBed}>
                      <SelectTrigger><SelectValue placeholder="No specific bed" /></SelectTrigger>
                      <SelectContent>
                        {freeBeds.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.bedNumber}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              );
            })()}
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Notes</Label>
              <Input
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="Anything the team should know"
              />
            </div>

            {/* Recurrence — for permanent dialysis patients who come on
                the same weekday + slot every week. We book the whole
                run in one click; conflicts on individual weeks are
                reported in the success toast. */}
            <div className="col-span-2 border rounded-md p-3 bg-slate-50 space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={bookingRepeat}
                  onChange={(e) => setBookingRepeat(e.target.checked)}
                  className="w-4 h-4"
                />
                Repeat weekly — same day + slot
              </label>
              {bookingRepeat && (
                <div className="flex flex-wrap items-end gap-2 ml-6">
                  <div className="space-y-1">
                    <Label className="text-xs">Until (inclusive)</Label>
                    <Input
                      type="date"
                      value={bookingRepeatUntil}
                      onChange={(e) => setBookingRepeatUntil(e.target.value)}
                      min={date}
                      className="w-44"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => setBookingRepeatUntil(endOfMonthYMD(date))}
                  >
                    End of month
                  </Button>
                  {bookingRepeatUntil && bookingRepeatUntil >= date && (
                    <div className="text-xs text-slate-500">
                      {(() => {
                        const days = Math.floor(
                          (new Date(`${bookingRepeatUntil}T00:00:00.000Z`).getTime() -
                            new Date(`${date}T00:00:00.000Z`).getTime()) / 86400000,
                        );
                        const weeks = Math.min(52, Math.floor(days / 7) + 1);
                        return `→ ${weeks} session${weeks === 1 ? '' : 's'} will be booked`;
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingOpen(false)}>Cancel</Button>
            <Button onClick={submitBooking}>
              {bookingRepeat ? 'Book recurring sessions' : 'Book session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
