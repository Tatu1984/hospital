// Birth Records — captures the delivery event for live or stillbirths.
// Creating a record auto-registers the newborn as a Patient (MRN +
// branch + DOB = birth date) so paediatric / NICU workflows can hang
// notes off the same Patient row immediately.
//
// "Issue Certificate" calls the backend to mint a sequential
// certificate number (BC-YYYY-NNNN, tenant-scoped) and stamps the
// row. The printable PDF (India Form 1 style) is then generated
// client-side via jsPDF. The wet-ink signature on the printed copy is
// the legal artefact — this is the hospital's intake document, not
// the municipal civil-registration certificate.

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Baby, Plus, FileText, Printer } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { generateBirthCertificatePDF } from '../utils/pdfGenerator';
import PdfPreviewDialog, { PdfDoc } from '../components/PdfPreviewDialog';

interface PatientLite {
  id: string;
  mrn: string;
  name: string;
  dob?: string | null;
  gender?: string | null;
  address?: string | null;
  contact?: string | null;
}

interface DoctorLite { id: string; name: string }

interface BirthRecord {
  id: string;
  babyName?: string | null;
  babyGender: string;
  birthDate: string;
  placeOfBirth?: string | null;
  deliveryType: string;
  weightGrams?: number | null;
  lengthCm?: number | null;
  apgar1Min?: number | null;
  apgar5Min?: number | null;
  liveBirth: boolean;
  outcome?: string | null;
  motherPatientId: string;
  babyPatientId?: string | null;
  motherPatient?: PatientLite | null;
  babyPatient?: PatientLite | null;
  attendingDoctor?: DoctorLite | null;
  attendingDoctorName?: string | null;
  fatherName?: string | null;
  fatherOccupation?: string | null;
  motherOccupation?: string | null;
  motherAgeAtBirth?: number | null;
  parentsAddress?: string | null;
  parentsNationality?: string | null;
  certificateNumber?: string | null;
  certificateIssuedAt?: string | null;
  notes?: string | null;
}

const DELIVERY_TYPES = [
  { value: 'normal',   label: 'Normal (vaginal)' },
  { value: 'csection', label: 'C-section' },
  { value: 'assisted', label: 'Assisted (forceps/vacuum)' },
  { value: 'twin',     label: 'Twin / Multiple' },
  { value: 'still',    label: 'Stillbirth' },
];

export default function BirthRecords() {
  const [records, setRecords] = useState<BirthRecord[]>([]);
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [doctors, setDoctors] = useState<DoctorLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [pdf, setPdf] = useState<PdfDoc | null>(null);
  const toast = useToast();

  function emptyForm() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    return {
      motherPatientId: '',
      babyName: '',
      babyGender: 'Male',
      birthDate: local,
      placeOfBirth: 'Labour Room',
      deliveryType: 'normal',
      birthOrder: 1,
      weightGrams: '',
      lengthCm: '',
      headCircumferenceCm: '',
      apgar1Min: '',
      apgar5Min: '',
      liveBirth: true,
      outcome: 'alive',
      attendingDoctorId: '',
      fatherName: '',
      fatherOccupation: '',
      motherOccupation: '',
      motherAgeAtBirth: '',
      parentsAddress: '',
      parentsReligion: '',
      parentsNationality: 'Indian',
      notes: '',
    };
  }

  async function load() {
    setLoading(true);
    try {
      const [r, p, d] = await Promise.all([
        api.get('/api/birth-records').catch(() => ({ data: [] })),
        api.get('/api/patients', { params: { limit: 500 } }).catch(() => ({ data: [] })),
        api.get('/api/doctors').catch(() => ({ data: [] })),
      ]);
      setRecords(r.data || []);
      // /api/patients may return either an array or { items: [...] }
      const raw = Array.isArray(p.data) ? p.data : (p.data?.items || []);
      setPatients(raw.map((x: any) => ({
        id: x.id, mrn: x.mrn, name: x.name,
        dob: x.dob, gender: x.gender, address: x.address, contact: x.contact,
      })));
      setDoctors((d.data || []).map((x: any) => ({ id: x.id, name: x.name })));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  function openNew() { setForm(emptyForm()); setDialogOpen(true); }

  async function save() {
    if (!form.motherPatientId) { toast.error('Pick the mother (search by name or MRN)'); return; }
    if (!form.birthDate)       { toast.error('Date/time of birth is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      ['weightGrams','lengthCm','headCircumferenceCm','apgar1Min','apgar5Min','motherAgeAtBirth','birthOrder']
        .forEach(k => { payload[k] = payload[k] === '' || payload[k] === null ? null : Number(payload[k]); });
      payload.birthDate = new Date(payload.birthDate).toISOString();
      if (payload.deliveryType === 'still') { payload.liveBirth = false; payload.outcome = 'stillborn'; }
      if (form.attendingDoctorId) {
        const d = doctors.find(x => x.id === form.attendingDoctorId);
        if (d) payload.attendingDoctorName = d.name;
      }
      await api.post('/api/birth-records', payload);
      setDialogOpen(false);
      toast.success('Birth recorded', 'Newborn registered as Patient.');
      void load();
    } catch (e: any) {
      toast.error('Save failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function issueAndPrint(rec: BirthRecord) {
    try {
      // Re-issue is safe — backend keeps the existing cert # if already
      // present and only updates issued-at + issued-by timestamps.
      const r = await api.post(`/api/birth-records/${rec.id}/issue-certificate`);
      const full = r.data;
      const motherAge = full.motherAgeAtBirth || (full.motherPatient?.dob
        ? Math.max(0, new Date(full.birthDate).getFullYear() - new Date(full.motherPatient.dob).getFullYear())
        : undefined);
      const out = generateBirthCertificatePDF({
        certificateNumber: full.certificateNumber,
        hospitalName: full.branch?.name,
        branchAddress: full.branch?.address,
        babyName: full.babyName || (full.babyPatient?.name || ''),
        babyGender: full.babyGender,
        birthDate: new Date(full.birthDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
        birthTime: new Date(full.birthDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        placeOfBirth: full.placeOfBirth || 'Hospital',
        deliveryType: DELIVERY_TYPES.find(t => t.value === full.deliveryType)?.label || full.deliveryType,
        weightGrams: full.weightGrams || undefined,
        motherName: full.motherPatient?.name || '',
        motherMRN: full.motherPatient?.mrn || '',
        motherAge,
        motherAddress: full.parentsAddress || full.motherPatient?.address || undefined,
        motherOccupation: full.motherOccupation || undefined,
        motherNationality: full.parentsNationality || 'Indian',
        fatherName: full.fatherName || undefined,
        fatherOccupation: full.fatherOccupation || undefined,
        attendingDoctor: full.attendingDoctor?.name || full.attendingDoctorName || undefined,
        issuedAt: new Date(full.certificateIssuedAt || Date.now()).toLocaleDateString('en-IN'),
        issuedBy: 'Hospital Records',
      });
      setPdf(out);
      void load();
    } catch (e: any) {
      toast.error('Certificate issue failed', e?.response?.data?.error || 'Try again');
    }
  }

  const today = new Date(); today.setHours(0,0,0,0);
  const todayCount    = records.filter(r => new Date(r.birthDate) >= today).length;
  const liveCount     = records.filter(r => r.liveBirth).length;
  const stillbornCnt  = records.filter(r => !r.liveBirth).length;
  const issuedCount   = records.filter(r => !!r.certificateNumber).length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center">
          <Baby className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Birth Records</h1>
          <p className="text-sm text-slate-500">Delivery log, newborn registration & hospital birth certificate</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total births" value={records.length} />
        <Stat label="Today" value={todayCount} accent="text-blue-700" />
        <Stat label="Live births" value={liveCount} accent="text-emerald-700" />
        <Stat label="Certificates issued" value={issuedCount} sub={stillbornCnt ? `${stillbornCnt} stillborn` : ''} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Births</CardTitle>
          <Button onClick={openNew} className="gap-1"><Plus className="w-4 h-4" /> Record birth</Button>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>
          : records.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              No birth records yet. Click "Record birth" to log the first delivery.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Baby</TableHead>
                    <TableHead>Mother</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>APGAR</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Certificate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">
                        {new Date(r.birthDate).toLocaleDateString('en-IN')}<br />
                        <span className="text-slate-500">{new Date(r.birthDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{r.babyName || '(unnamed)'}</div>
                        <div className="text-xs text-slate-500">{r.babyPatient?.mrn || '—'} · {r.babyGender}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{r.motherPatient?.name || '—'}</div>
                        <div className="text-xs text-slate-500">{r.motherPatient?.mrn || ''}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{DELIVERY_TYPES.find(t => t.value === r.deliveryType)?.label || r.deliveryType}</Badge></TableCell>
                      <TableCell>{r.weightGrams ? `${r.weightGrams} g` : '—'}</TableCell>
                      <TableCell className="text-xs">{r.apgar1Min ?? '—'} / {r.apgar5Min ?? '—'}</TableCell>
                      <TableCell>
                        {r.liveBirth
                          ? <Badge className="bg-emerald-100 text-emerald-800">live</Badge>
                          : <Badge className="bg-slate-200 text-slate-800">stillborn</Badge>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.certificateNumber
                          ? <span className="font-mono">{r.certificateNumber}</span>
                          : <span className="text-slate-400">not issued</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => issueAndPrint(r)} className="gap-1">
                          {r.certificateNumber ? <Printer className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                          {r.certificateNumber ? 'Print' : 'Issue cert.'}
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

      {/* Create / record-birth modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record birth</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Section title="Mother">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs text-slate-500">Mother (search by name or MRN) *</Label>
                  <PatientPicker patients={patients} value={form.motherPatientId} onChange={(p) => setForm({ ...form, motherPatientId: p?.id || '', parentsAddress: p?.address || form.parentsAddress })} />
                </div>
                <FormInput label="Mother age at birth (yrs)" type="number" value={form.motherAgeAtBirth} onChange={(v) => setForm({ ...form, motherAgeAtBirth: v })} />
                <FormInput label="Mother occupation" value={form.motherOccupation} onChange={(v) => setForm({ ...form, motherOccupation: v })} />
              </div>
            </Section>

            <Section title="Baby">
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Baby name (optional — can be added later)" value={form.babyName} onChange={(v) => setForm({ ...form, babyName: v })} />
                <FormSelect label="Sex *" value={form.babyGender} onChange={(v) => setForm({ ...form, babyGender: v })}
                  options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]} />
                <FormInput label="Date & time of birth *" type="datetime-local" value={form.birthDate} onChange={(v) => setForm({ ...form, birthDate: v })} />
                <FormInput label="Place of birth" value={form.placeOfBirth} onChange={(v) => setForm({ ...form, placeOfBirth: v })} />
                <FormSelect label="Type of delivery *" value={form.deliveryType} onChange={(v) => setForm({ ...form, deliveryType: v })}
                  options={DELIVERY_TYPES} />
                <FormInput label="Birth order" type="number" value={form.birthOrder} onChange={(v) => setForm({ ...form, birthOrder: v })} />
                <FormInput label="Weight (g)" type="number" value={form.weightGrams} onChange={(v) => setForm({ ...form, weightGrams: v })} />
                <FormInput label="Length (cm)" type="number" value={form.lengthCm} onChange={(v) => setForm({ ...form, lengthCm: v })} />
                <FormInput label="Head circ. (cm)" type="number" value={form.headCircumferenceCm} onChange={(v) => setForm({ ...form, headCircumferenceCm: v })} />
                <FormInput label="APGAR @ 1 min" type="number" value={form.apgar1Min} onChange={(v) => setForm({ ...form, apgar1Min: v })} />
                <FormInput label="APGAR @ 5 min" type="number" value={form.apgar5Min} onChange={(v) => setForm({ ...form, apgar5Min: v })} />
              </div>
            </Section>

            <Section title="Father / Family">
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Father's name" value={form.fatherName} onChange={(v) => setForm({ ...form, fatherName: v })} />
                <FormInput label="Father's occupation" value={form.fatherOccupation} onChange={(v) => setForm({ ...form, fatherOccupation: v })} />
                <div className="col-span-2">
                  <Label className="text-xs text-slate-500">Address (parents)</Label>
                  <Input value={form.parentsAddress || ''} onChange={(e) => setForm({ ...form, parentsAddress: e.target.value })} />
                </div>
                <FormInput label="Religion" value={form.parentsReligion} onChange={(v) => setForm({ ...form, parentsReligion: v })} />
                <FormInput label="Nationality" value={form.parentsNationality} onChange={(v) => setForm({ ...form, parentsNationality: v })} />
              </div>
            </Section>

            <Section title="Attending Doctor & Notes">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500">Attending doctor</Label>
                  <Select value={form.attendingDoctorId || '_'} onValueChange={(v) => setForm({ ...form, attendingDoctorId: v === '_' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_">— None —</SelectItem>
                      {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-slate-500">Notes</Label>
                  <textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full min-h-[60px] p-2 border rounded text-sm" />
                </div>
              </div>
            </Section>

            <p className="text-xs text-slate-500 px-1">
              Saving creates a new Patient row for the baby (MRN auto-assigned). For stillbirth, no Patient is created.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save & register newborn'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PdfPreviewDialog pdf={pdf} onClose={() => setPdf(null)} title="Birth Certificate" />
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-md p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-2 font-semibold">{title}</div>
      {children}
    </div>
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

// Inline searchable patient picker. Filters by name / MRN as the user
// types; once selected, the chosen patient's MRN + name is shown and
// the search box collapses. Click the X to clear and pick again.
function PatientPicker({ patients, value, onChange }: { patients: PatientLite[]; value: string; onChange: (p: PatientLite | null) => void }) {
  const [q, setQ] = useState('');
  const selected = patients.find(p => p.id === value);
  if (selected) {
    return (
      <div className="flex items-center gap-2 border rounded p-2 bg-slate-50">
        <div className="flex-1 text-sm">
          <span className="font-medium">{selected.name}</span>{' '}
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
      <Input placeholder="Type name or MRN…" value={q} onChange={(e) => setQ(e.target.value)} />
      {filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border rounded shadow z-10">
          {filtered.map(p => (
            <button key={p.id} type="button"
              onClick={() => { onChange(p); setQ(''); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b last:border-b-0">
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-slate-500">{p.mrn} · {p.gender || '—'}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
