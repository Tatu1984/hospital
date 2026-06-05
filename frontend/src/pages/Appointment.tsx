import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Clock, CheckCircle, UserX, UserPlus, Ticket } from 'lucide-react';
import api from '../services/api';
import MrnLink from '../components/MrnLink';

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string | null;
  patient?: { id: string; name: string; mrn?: string; contact?: string };
  doctor?: { id: string; name: string };
  appointmentDate: string; // ISO string from API; YYYY-MM-DD when posted
  appointmentTime: string | null;
  department?: string;
  type: string;
  status: string;
  reason?: string;
}

interface PatientLite { id: string; name: string; mrn?: string; contact?: string; }
interface DoctorLite { id: string; name: string; department?: string; }

const DEPARTMENTS = ['Cardiology', 'Orthopedics', 'Neurology', 'Pediatrics', 'Dermatology', 'ENT', 'General Medicine'];
const APPT_TYPES = ['In-Person', 'Teleconsultation'];

// Backend stores status as lowercase ('scheduled'|'confirmed'|'cancelled'|'completed'|'checked-in'|'no-show').
// UI displays capitalized.
const displayStatus = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const isFinal = (s: string) => s === 'cancelled' || s === 'completed';

const toDateInput = (iso: string): string => {
  if (!iso) return '';
  // Accept either 'YYYY-MM-DD' or full ISO datetime
  return iso.length >= 10 ? iso.slice(0, 10) : iso;
};

export default function Appointment() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [doctors, setDoctors] = useState<DoctorLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Walk-in flow: receptionist registers a patient who arrived without a
  // prior appointment, picks a doctor, and issues an OPD token in one shot.
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [walkInSubmitting, setWalkInSubmitting] = useState(false);
  const [walkInError, setWalkInError] = useState<string | null>(null);
  const emptyWalkIn = { name: '', contact: '', gender: '', dob: '', doctorId: '', reason: '', priority: 'normal' };
  const [walkIn, setWalkIn] = useState({ ...emptyWalkIn });
  type WalkInResult = {
    patient: { id: string; name: string; mrn: string; contact: string | null; isNew: boolean };
    appointment: { id: string; status: string; appointmentTime: string | null };
    token: { id: string; tokenNumber: number; displayCode: string; doctorName: string | null; department: string | null };
  };
  const [walkInResult, setWalkInResult] = useState<WalkInResult | null>(null);

  const emptyForm = {
    patientId: '',
    doctorId: '',
    department: '',
    date: '',
    time: '',
    type: 'In-Person',
    reason: '',
    priority: 'Normal',
  };
  const [formData, setFormData] = useState(emptyForm);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [aptRes, patRes, docRes] = await Promise.all([
        api.get('/api/appointments'),
        api.get('/api/patients').catch(() => ({ data: [] })),
        api.get('/api/doctors').catch(() => ({ data: [] })),
      ]);
      const aptList = Array.isArray(aptRes.data) ? aptRes.data : (aptRes.data?.data || []);
      setAppointments(aptList);
      setPatients(Array.isArray(patRes.data) ? patRes.data : (patRes.data?.data || []));
      setDoctors(Array.isArray(docRes.data) ? docRes.data : (docRes.data?.data || []));
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSubmit = async () => {
    if (!formData.patientId || !formData.doctorId || !formData.date || !formData.time) {
      alert('Patient, doctor, date and time are required.');
      return;
    }
    try {
      await api.post('/api/appointments', {
        patientId: formData.patientId,
        doctorId: formData.doctorId,
        appointmentDate: formData.date,
        appointmentTime: formData.time,
        type: formData.type,
        reason: formData.reason,
        department: formData.department,
      });
      setIsDialogOpen(false);
      setFormData(emptyForm);
      await fetchAll();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to create appointment');
    }
  };

  const handleConfirmAppointment = async (appointment: Appointment) => {
    try {
      await api.put(`/api/appointments/${appointment.id}`, { status: 'confirmed' });
      await fetchAll();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to confirm appointment');
    }
  };

  const handleReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setFormData({
      ...emptyForm,
      date: toDateInput(appointment.appointmentDate),
      time: appointment.appointmentTime || '',
    });
    setIsRescheduleDialogOpen(true);
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedAppointment) return;
    if (!formData.date || !formData.time) {
      alert('New date and time are required.');
      return;
    }
    try {
      await api.put(`/api/appointments/${selectedAppointment.id}`, {
        appointmentDate: formData.date,
        appointmentTime: formData.time,
        status: 'scheduled',
      });
      setIsRescheduleDialogOpen(false);
      setSelectedAppointment(null);
      await fetchAll();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to reschedule appointment');
    }
  };

  const handleCancelAppointment = async (appointment: Appointment) => {
    const who = appointment.patient?.name || 'this patient';
    if (!confirm(`Are you sure you want to cancel the appointment for ${who}?`)) return;
    try {
      await api.post(`/api/appointments/${appointment.id}/cancel`);
      await fetchAll();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to cancel appointment');
    }
  };

  const submitWalkIn = async () => {
    if (walkInSubmitting) return;
    if (!walkIn.name.trim() || !walkIn.contact.trim()) {
      setWalkInError('Name and contact (phone) are required.');
      return;
    }
    setWalkInError(null);
    setWalkInSubmitting(true);
    try {
      const r = await api.post('/api/walk-ins', {
        name: walkIn.name.trim(),
        contact: walkIn.contact.trim(),
        gender: walkIn.gender || undefined,
        dob: walkIn.dob || undefined,
        doctorId: walkIn.doctorId || undefined,
        reason: walkIn.reason.trim() || undefined,
        priority: walkIn.priority,
      });
      setWalkInResult(r.data as WalkInResult);
      await fetchAll();
    } catch (e: any) {
      setWalkInError(e?.response?.data?.error || e?.response?.data?.detail || 'Walk-in registration failed.');
    } finally {
      setWalkInSubmitting(false);
    }
  };

  const closeWalkIn = () => {
    setIsWalkInOpen(false);
    setWalkIn({ ...emptyWalkIn });
    setWalkInError(null);
    setWalkInResult(null);
  };

  const getStatusColor = (status: string): any => {
    const colors: Record<string, string> = {
      scheduled: 'secondary',
      confirmed: 'default',
      'checked-in': 'default',
      completed: 'default',
      cancelled: 'destructive',
      'no-show': 'destructive',
    };
    return colors[status] || 'secondary';
  };

  // Stats computed from the loaded list — replace previously hardcoded numbers.
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todays = appointments.filter(a => toDateInput(a.appointmentDate) === today);
    return {
      today: todays.length,
      confirmed: todays.filter(a => a.status === 'confirmed').length,
      pending: todays.filter(a => a.status === 'scheduled').length,
      noShows: todays.filter(a => a.status === 'no-show').length,
    };
  }, [appointments]);

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-full max-w-[1500px] mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Appointment Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Schedule and manage patient appointments</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
        <Dialog
          open={isWalkInOpen}
          onOpenChange={(open) => { if (open) setIsWalkInOpen(true); else closeWalkIn(); }}
        >
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="gap-1.5 h-10 px-4 rounded-xl shadow-sm border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
            >
              <UserPlus className="w-4 h-4" />
              Walk-in
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            {!walkInResult ? (
              <>
                <DialogHeader>
                  <DialogTitle>Walk-in Registration</DialogTitle>
                  <DialogDescription>
                    Register a patient who arrived without an appointment. Creates the
                    patient (if new), opens a same-day appointment, and issues an OPD token.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-2">
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="wi-name">Full name *</Label>
                    <Input id="wi-name" value={walkIn.name}
                      onChange={(e) => setWalkIn(s => ({ ...s, name: e.target.value }))}
                      placeholder="e.g. Asha Verma" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wi-contact">Phone *</Label>
                    <Input id="wi-contact" value={walkIn.contact}
                      onChange={(e) => setWalkIn(s => ({ ...s, contact: e.target.value }))}
                      placeholder="+91 …" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wi-gender">Gender</Label>
                    <Select value={walkIn.gender || undefined}
                      onValueChange={(v) => setWalkIn(s => ({ ...s, gender: v }))}>
                      <SelectTrigger id="wi-gender"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {['Male', 'Female', 'Other'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wi-dob">Date of birth</Label>
                    <Input id="wi-dob" type="date" value={walkIn.dob}
                      onChange={(e) => setWalkIn(s => ({ ...s, dob: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wi-doctor">Doctor</Label>
                    <Select value={walkIn.doctorId || undefined}
                      onValueChange={(v) => setWalkIn(s => ({ ...s, doctorId: v }))}>
                      <SelectTrigger id="wi-doctor">
                        <SelectValue placeholder={doctors.length ? 'Assign now (optional)' : 'No doctors available'} />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map(d => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}{d.department ? ` — ${d.department}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="wi-reason">Chief complaint</Label>
                    <Input id="wi-reason" value={walkIn.reason}
                      onChange={(e) => setWalkIn(s => ({ ...s, reason: e.target.value }))}
                      placeholder="e.g. Chest pain, fever 3 days, follow-up" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Priority</Label>
                    <Select value={walkIn.priority}
                      onValueChange={(v) => setWalkIn(s => ({ ...s, priority: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="follow_up">Follow-up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {walkInError && (
                    <div className="col-span-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {walkInError}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={closeWalkIn} disabled={walkInSubmitting}>Cancel</Button>
                  <Button onClick={submitWalkIn} disabled={walkInSubmitting}
                    className="bg-amber-600 hover:bg-amber-700 text-white">
                    {walkInSubmitting ? 'Registering…' : 'Register & Issue Token'}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" /> Token issued
                  </DialogTitle>
                  <DialogDescription>
                    Hand this token to the patient and direct them to the OPD waiting area.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
                    <div className="flex items-center justify-center gap-2 text-amber-700 text-xs uppercase tracking-wider font-semibold">
                      <Ticket className="w-4 h-4" /> OPD Token
                    </div>
                    <div className="mt-2 text-4xl font-bold tracking-tight text-amber-900">
                      {walkInResult.token.displayCode}
                    </div>
                    {walkInResult.token.doctorName && (
                      <div className="mt-1 text-sm text-amber-800">
                        For {walkInResult.token.doctorName}
                        {walkInResult.token.department ? ` · ${walkInResult.token.department}` : ''}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-slate-500 text-xs">Patient</div>
                      <div className="font-medium text-slate-900">{walkInResult.patient.name}</div>
                      <div className="text-slate-500">{walkInResult.patient.mrn}{walkInResult.patient.isNew ? ' · NEW' : ''}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-xs">Appointment</div>
                      <div className="font-medium text-slate-900 capitalize">{walkInResult.appointment.status}</div>
                      <div className="text-slate-500">{walkInResult.appointment.appointmentTime || '—'} today</div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => window.print()}>Print</Button>
                  <Button onClick={closeWalkIn} className="bg-slate-900 hover:bg-slate-800">Done</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
              <Plus className="w-4 h-4" />
              Schedule Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule New Appointment</DialogTitle>
              <DialogDescription>
                Book an appointment for a patient with a doctor
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="patient">Patient *</Label>
                <Select value={formData.patientId} onValueChange={(value) => setFormData(prev => ({ ...prev, patientId: value }))}>
                  <SelectTrigger id="patient"><SelectValue placeholder={patients.length ? 'Select patient' : 'No patients available'} /></SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}{p.mrn ? ` — ${p.mrn}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doctor">Doctor *</Label>
                <Select value={formData.doctorId} onValueChange={(value) => setFormData(prev => ({ ...prev, doctorId: value }))}>
                  <SelectTrigger id="doctor"><SelectValue placeholder={doctors.length ? 'Select doctor' : 'No doctors available'} /></SelectTrigger>
                  <SelectContent>
                    {doctors.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}>
                  <SelectTrigger id="department"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Appointment Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Appointment Date *</Label>
                <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Appointment Time *</Label>
                <Input id="time" type="time" value={formData.time} onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))} required />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="reason">Reason for Visit</Label>
                <Input id="reason" value={formData.reason} onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))} placeholder="Brief description" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>Schedule Appointment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Today's Appointments</div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-slate-900 mt-2 tracking-tight tabular-nums">{stats.today}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Confirmed</div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-emerald-700 mt-2 tracking-tight tabular-nums">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Pending</div>
              <div className="w-8 h-8 rounded-lg bg-amber-50 ring-1 ring-amber-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-amber-700 mt-2 tracking-tight tabular-nums">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">No-Shows</div>
              <div className="w-8 h-8 rounded-lg bg-red-50 ring-1 ring-red-100 flex items-center justify-center">
                <UserX className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-red-700 mt-2 tracking-tight tabular-nums">{stats.noShows}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointment Schedule</CardTitle>
          <CardDescription>View and manage all appointments</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>MRN</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && appointments.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-sm text-slate-500 py-8">Loading…</TableCell></TableRow>
              ) : appointments.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-sm text-slate-500 py-8">No appointments yet. Click "Schedule Appointment" to create one.</TableCell></TableRow>
              ) : appointments.map((appointment) => (
                <TableRow key={appointment.id} data-testid={`apt-row-${appointment.id}`}>
                  <TableCell className="font-medium">{appointment.patient?.name || '—'}</TableCell>
                  <TableCell><MrnLink mrn={appointment.patient?.mrn} patientId={appointment.patient?.id} /></TableCell>
                  <TableCell>{appointment.doctor?.name || '—'}</TableCell>
                  <TableCell>{appointment.department || '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1" data-testid={`apt-date-${appointment.id}`}>
                        <Calendar className="w-4 h-4" />
                        {toDateInput(appointment.appointmentDate)}
                      </span>
                      <span className="flex items-center gap-1 text-sm text-gray-500" data-testid={`apt-time-${appointment.id}`}>
                        <Clock className="w-4 h-4" />
                        {appointment.appointmentTime || '—'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{appointment.type}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(appointment.status)} data-testid={`apt-status-${appointment.id}`}>
                      {displayStatus(appointment.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleConfirmAppointment(appointment)}
                        disabled={appointment.status === 'confirmed' || isFinal(appointment.status)}>
                        Confirm
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleReschedule(appointment)}
                        disabled={isFinal(appointment.status)}>
                        Reschedule
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleCancelAppointment(appointment)}
                        disabled={isFinal(appointment.status)}>
                        Cancel
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              {selectedAppointment && `Reschedule appointment for ${selectedAppointment.patient?.name || 'patient'}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reschedule-date">New Date</Label>
              <Input
                id="reschedule-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reschedule-time">New Time</Label>
              <Input
                id="reschedule-time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRescheduleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRescheduleSubmit}>Confirm Reschedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
