// Patient profile — the complete medical history for a single patient.
// One round-trip to GET /api/mobile/v1/patients/:patientId/chart returns
// demographics + every clinical record (admissions w/ IPD notes, OPD
// encounters w/ vitals + assessment, lab + radiology orders + results,
// prescriptions, dialysis sessions, surgeries, invoices). This page
// renders those into tabbed sections so a doctor sees the full picture
// without flipping between modules.
//
// Replaces the older PatientChart.tsx as the primary profile view.
// PatientChart is left in place to avoid breaking existing
// DoctorDashboard deep-links during the transition.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  CalendarDays,
  BedDouble,
  FlaskConical,
  Scan,
  Pill,
  Activity,
  Receipt,
  RefreshCw,
  Stethoscope,
  Droplet,
  ClipboardList,
  ChevronRight,
  Percent,
  IndianRupee,
  X,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// --- DTO shapes (mirror backend/src/modules/patients/patient.service.ts getChart) ---

interface ChartPatient {
  id: string;
  mrn: string;
  name: string;
  dob: string | null;
  gender: string | null;
  bloodGroup: string | null;
  contact: string | null;
  email: string | null;
  address: string | null;
  allergies: string | null;
  emergencyContact: string | null;
  photo: string | null;
  purpose: string | null;
  createdAt: string;
}
interface IPDNote {
  id: string;
  noteType: string;
  note: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
}
interface Admission {
  id: string;
  admissionDate: string;
  dischargeDate: string | null;
  status: string;
  diagnosis: string | null;
  bedNumber: string | null;
  wardName: string | null;
  doctorName: string | null;
  doctorId: string | null;
  ipdNotes: IPDNote[];
}
interface OPDNoteLatest {
  id: string;
  vitals: any;
  examination: any;
  assessment: any;
  plan: any;
  createdAt: string;
}
interface Encounter {
  id: string;
  type: string;
  visitDate: string;
  status: string;
  chiefComplaint: string | null;
  doctorId: string | null;
  doctorName: string | null;
  latestNote: OPDNoteLatest | null;
}
interface OrderResult {
  id: string;
  resultedAt: string;
  resultData: any;
  verifiedBy: string | null;
  isCritical: boolean;
}
interface Order {
  id: string;
  category: string; // 'lab' | 'radiology' | other
  orderedAt: string;
  status: string;
  priority: string;
  details: any;
  results: OrderResult[];
}
interface Prescription {
  id: string;
  issuedAt: string;
  doctorId: string | null;
  doctorName: string | null;
  drugs: any;
  notes: string | null;
  instructions: string | null;
  status: string;
}
interface InvoiceLineItem {
  id?: string;
  category?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
  sourceType?: string;
  sourceId?: string;
  occurredAt?: string;
  // Older invoices stored line items as { name, amount } pairs — keep
  // those keys readable too so the renderer doesn't blank them out.
  name?: string;
  amount?: number;
}
interface InvoicePayment {
  id: string;
  amount: number;
  mode: string | null;
  transactionRef: string | null;
  paidAt: string;
}
interface Invoice {
  id: string;
  type: string;
  createdAt: string;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
  items: InvoiceLineItem[];
  payments: InvoicePayment[];
}
interface Surgery {
  id: string;
  procedureName: string;
  surgeonId: string | null;
  surgeonName: string | null;
  scheduledDate: string;
  scheduledTime: string | null;
  status: string;
  currentStage: string | null;
}
interface DialysisSession {
  id: string;
  scheduledDate: string;
  scheduledTime: string | null;
  slot: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationMin: number | null;
  modality: string;
  vascularAccess: string | null;
  dialyzer: string | null;
  bloodFlowRate: number | null;
  dialysateFlow: number | null;
  ufGoalMl: number | null;
  ufActualMl: number | null;
  preWeightKg: number | null;
  postWeightKg: number | null;
  preBpSys: number | null;
  preBpDia: number | null;
  postBpSys: number | null;
  postBpDia: number | null;
  heparin: string | null;
  complications: string | null;
  notes: string | null;
  status: string;
  nephrologistId: string | null;
  nephrologistName: string | null;
  nurseId: string | null;
  nurseName: string | null;
}
interface DoctorVisited {
  doctorId: string | null;
  name: string;
  firstSeen: string;
  lastSeen: string;
  encounters: number;
  sources: string[];
}
interface DiagnosisEntry {
  source: 'admission' | 'encounter';
  sourceId: string;
  date: string;
  doctorName: string | null;
  text: string;
}

interface ChartData {
  patient: ChartPatient;
  admissions: Admission[];
  encounters: Encounter[];
  orders: Order[];
  prescriptions: Prescription[];
  invoices: Invoice[];
  surgeries: Surgery[];
  dialysisSessions: DialysisSession[];
  doctorsVisited: DoctorVisited[];
  diagnoses: DiagnosisEntry[];
}

// --- formatters ---

function ageFromDob(dob: string | null): string {
  if (!dob) return '—';
  const d = new Date(dob);
  if (isNaN(d.getTime())) return '—';
  const years = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  return `${years}y`;
}
function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function asText(v: any): string {
  if (v === null || v === undefined || v === '') return '';
  return typeof v === 'string' ? v : JSON.stringify(v);
}

// --- main component ---

export default function PatientProfile() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!patientId) return;
    try {
      setRefreshing(true);
      const r = await api.get(`/api/mobile/v1/patients/${patientId}/chart`);
      setData(r.data);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load patient profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [patientId]);

  // Separate lab from radiology + pathology — they're distinct workflows
  // for the lab tech, the radiologist, and the pathologist. The backend
  // returns them in a single `orders` array keyed on `category` so we
  // split client-side rather than running 3 different requests.
  const labOrders = useMemo(() => data?.orders.filter((o) => o.category === 'lab') || [], [data]);
  const radOrders = useMemo(() => data?.orders.filter((o) => o.category === 'radiology') || [], [data]);
  const pathOrders = useMemo(() => data?.orders.filter((o) => o.category === 'pathology') || [], [data]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading patient profile…</div>;
  if (error || !data) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-3">{error || 'No data'}</p>
        <Button onClick={load}>Retry</Button>
      </div>
    );
  }

  const p = data.patient;

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-full max-w-[1500px] mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Patient Profile</h1>
            <p className="text-sm text-slate-500 mt-0.5">Demographics, history, and clinical record</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Button onClick={load} disabled={refreshing} className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Demographics hero */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden shrink-0">
              {p.photo ? (
                <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900">{p.name}</h1>
                <Badge variant="secondary">MRN {p.mrn}</Badge>
                {p.bloodGroup && (
                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100 gap-1">
                    <Droplet className="w-3 h-3" /> {p.bloodGroup}
                  </Badge>
                )}
              </div>
              <div className="mt-1 text-sm text-slate-600 flex items-center gap-4 flex-wrap">
                <span>{ageFromDob(p.dob)}{p.gender ? ` • ${p.gender}` : ''}</span>
                {p.dob && <span>DOB {fmtDate(p.dob)}</span>}
                <span>Registered {fmtDate(p.createdAt)}</span>
              </div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-600">
                {p.contact && (
                  <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /> {p.contact}</div>
                )}
                {p.email && (
                  <div className="flex items-center gap-2 truncate" title={p.email}>
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" /> <span className="truncate">{p.email}</span>
                  </div>
                )}
                {p.address && (
                  <div className="flex items-center gap-2 truncate" title={p.address}>
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" /> <span className="truncate">{p.address}</span>
                  </div>
                )}
              </div>
              {p.purpose && (
                <div className="mt-2 text-sm text-slate-600">
                  <span className="text-xs uppercase text-slate-400 mr-2">Purpose of visit</span>
                  {p.purpose}
                </div>
              )}
              {p.allergies && (
                <div className="mt-3 flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span><span className="font-semibold">Allergies:</span> {p.allergies}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <CountCard icon={CalendarDays} tint="blue" label="Visits" value={data.encounters.length} />
        <CountCard icon={BedDouble} tint="emerald" label="Admissions" value={data.admissions.length} />
        <CountCard icon={Droplet} tint="purple" label="Dialysis" value={data.dialysisSessions.length} />
        <CountCard icon={FlaskConical} tint="cyan" label="Lab orders" value={labOrders.length} />
        <CountCard icon={Scan} tint="fuchsia" label="Radiology" value={radOrders.length} />
        <CountCard icon={Pill} tint="pink" label="Rx" value={data.prescriptions.length} />
        <CountCard icon={Activity} tint="orange" label="Surgeries" value={data.surgeries.length} />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="diagnoses">Diagnoses ({data.diagnoses.length})</TabsTrigger>
          <TabsTrigger value="doctors">Doctors ({data.doctorsVisited.length})</TabsTrigger>
          <TabsTrigger value="visits">Visits ({data.encounters.length})</TabsTrigger>
          <TabsTrigger value="admissions">Admissions ({data.admissions.length})</TabsTrigger>
          <TabsTrigger value="dialysis">Dialysis ({data.dialysisSessions.length})</TabsTrigger>
          <TabsTrigger value="pathology">Pathology ({pathOrders.length})</TabsTrigger>
          <TabsTrigger value="lab">Lab ({labOrders.length})</TabsTrigger>
          <TabsTrigger value="radiology">Radiology ({radOrders.length})</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions ({data.prescriptions.length})</TabsTrigger>
          <TabsTrigger value="ipd-notes">Doctor updates ({totalIpdNotes(data.admissions)})</TabsTrigger>
          <TabsTrigger value="surgeries">Surgeries ({data.surgeries.length})</TabsTrigger>
          <TabsTrigger value="bills">Bills ({data.invoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewSection data={data} /></TabsContent>
        <TabsContent value="diagnoses"><DiagnosesSection diagnoses={data.diagnoses} /></TabsContent>
        <TabsContent value="doctors"><DoctorsSection doctors={data.doctorsVisited} /></TabsContent>
        <TabsContent value="visits"><VisitsSection encounters={data.encounters} /></TabsContent>
        <TabsContent value="admissions"><AdmissionsSection admissions={data.admissions} /></TabsContent>
        <TabsContent value="dialysis"><DialysisSectionView sessions={data.dialysisSessions} /></TabsContent>
        <TabsContent value="pathology"><OrdersSection orders={pathOrders} kind="pathology" /></TabsContent>
        <TabsContent value="lab"><OrdersSection orders={labOrders} kind="lab" /></TabsContent>
        <TabsContent value="radiology"><OrdersSection orders={radOrders} kind="radiology" /></TabsContent>
        <TabsContent value="prescriptions"><PrescriptionsSection prescriptions={data.prescriptions} /></TabsContent>
        <TabsContent value="ipd-notes"><IPDNotesSection admissions={data.admissions} /></TabsContent>
        <TabsContent value="surgeries"><SurgeriesSection surgeries={data.surgeries} /></TabsContent>
        <TabsContent value="bills"><BillsSection invoices={data.invoices} onChanged={load} /></TabsContent>
      </Tabs>
    </div>
  );
}

function totalIpdNotes(admissions: Admission[]): number {
  return admissions.reduce((s, a) => s + (a.ipdNotes?.length || 0), 0);
}

function CountCard({ icon: Icon, tint, label, value }: { icon: any; tint: string; label: string; value: number }) {
  // tint is a Tailwind color stem (blue / emerald / purple / cyan / fuchsia / pink / orange)
  const tintClasses: Record<string, { bg: string; ring: string; text: string }> = {
    blue:    { bg: 'bg-blue-50',    ring: 'ring-blue-100',    text: 'text-blue-600'    },
    emerald: { bg: 'bg-emerald-50', ring: 'ring-emerald-100', text: 'text-emerald-600' },
    purple:  { bg: 'bg-purple-50',  ring: 'ring-purple-100',  text: 'text-purple-600'  },
    cyan:    { bg: 'bg-cyan-50',    ring: 'ring-cyan-100',    text: 'text-cyan-600'    },
    fuchsia: { bg: 'bg-fuchsia-50', ring: 'ring-fuchsia-100', text: 'text-fuchsia-600' },
    pink:    { bg: 'bg-pink-50',    ring: 'ring-pink-100',    text: 'text-pink-600'    },
    orange:  { bg: 'bg-orange-50',  ring: 'ring-orange-100',  text: 'text-orange-600'  },
  };
  const t = tintClasses[tint] || tintClasses.blue;
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</div>
          <div className={`w-8 h-8 rounded-lg ${t.bg} ring-1 ${t.ring} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${t.text}`} />
          </div>
        </div>
        <div className="text-3xl font-semibold text-slate-900 mt-2 tracking-tight tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

// --- sections ---

function OverviewSection({ data }: { data: ChartData }) {
  const latestNote = data.encounters.find((e) => e.latestNote)?.latestNote || null;
  const latestEncounter = data.encounters[0] || null;
  const activeAdmission = data.admissions.find((a) => a.status === 'active' || a.status === 'admitted') || null;
  const upcomingSurgery = data.surgeries.find((s) => s.status !== 'completed' && s.status !== 'cancelled') || null;
  const upcomingDialysis = data.dialysisSessions.find((d) => d.status === 'scheduled' || d.status === 'in_progress') || null;
  const outstanding = data.invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
  const recentDiagnoses = data.diagnoses.slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Latest vitals</CardTitle></CardHeader>
        <CardContent>
          {latestNote?.vitals ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {Object.entries(latestNote.vitals as Record<string, any>).map(([k, v]) => (
                <div key={k} className="flex flex-col">
                  <span className="text-xs uppercase text-slate-400">{k}</span>
                  <span className="font-medium text-slate-900">{String(v ?? '—')}</span>
                </div>
              ))}
              <div className="col-span-2 text-xs text-slate-400 pt-2 border-t mt-1">
                Recorded {fmtDateTime(latestNote.createdAt)}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No vitals recorded yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Current status</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {activeAdmission ? (
            <div className="p-2 rounded bg-emerald-50 border border-emerald-200">
              <div className="font-semibold text-emerald-900">Currently admitted</div>
              <div className="text-emerald-800">
                {activeAdmission.wardName || 'Ward'}{activeAdmission.bedNumber ? ` • Bed ${activeAdmission.bedNumber}` : ''}
                {activeAdmission.doctorName ? ` • Dr. ${activeAdmission.doctorName}` : ''}
              </div>
              <div className="text-xs text-emerald-700">Since {fmtDate(activeAdmission.admissionDate)}</div>
            </div>
          ) : (
            <div className="text-slate-600">Not currently admitted.</div>
          )}
          {upcomingDialysis && (
            <div className="p-2 rounded bg-purple-50 border border-purple-200">
              <div className="font-semibold text-purple-900">Dialysis: {upcomingDialysis.modality}</div>
              <div className="text-xs text-purple-700">
                {fmtDate(upcomingDialysis.scheduledDate)}{upcomingDialysis.scheduledTime ? ` at ${upcomingDialysis.scheduledTime}` : ''} • {upcomingDialysis.status}
              </div>
            </div>
          )}
          {upcomingSurgery && (
            <div className="p-2 rounded bg-orange-50 border border-orange-200">
              <div className="font-semibold text-orange-900">Surgery: {upcomingSurgery.procedureName}</div>
              <div className="text-xs text-orange-700">
                {fmtDate(upcomingSurgery.scheduledDate)}{upcomingSurgery.scheduledTime ? ` at ${upcomingSurgery.scheduledTime}` : ''} • {upcomingSurgery.status}
              </div>
            </div>
          )}
          {latestEncounter && (
            <div className="text-slate-600">
              Last visit: <span className="text-slate-900 font-medium">{fmtDate(latestEncounter.visitDate)}</span>
              {latestEncounter.doctorName ? ` with Dr. ${latestEncounter.doctorName}` : ''}
            </div>
          )}
          {outstanding > 0 && (
            <div className="text-slate-600">
              Outstanding balance: <span className="text-red-600 font-semibold">₹{outstanding.toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Recent diagnoses</CardTitle></CardHeader>
        <CardContent>
          {recentDiagnoses.length === 0 ? (
            <p className="text-sm text-slate-500">No diagnoses recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentDiagnoses.map((d) => (
                <li key={`${d.source}-${d.sourceId}`} className="flex items-start gap-2 border-l-2 border-slate-200 pl-3">
                  <ClipboardList className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-900">{d.text}</div>
                    <div className="text-xs text-slate-500">
                      {fmtDate(d.date)}{d.doctorName ? ` • Dr. ${d.doctorName}` : ''} • {d.source}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Latest assessment & plan</CardTitle></CardHeader>
        <CardContent>
          {latestNote ? (
            <div className="space-y-2 text-sm">
              {latestNote.examination && <KeyValue label="Examination" body={latestNote.examination} />}
              {latestNote.assessment && <KeyValue label="Assessment" body={latestNote.assessment} />}
              {latestNote.plan && <KeyValue label="Plan" body={latestNote.plan} />}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No clinical notes recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KeyValue({ label, body }: { label: string; body: any }) {
  const text = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
  return (
    <div>
      <div className="text-xs uppercase text-slate-400">{label}</div>
      <div className="text-slate-800 whitespace-pre-wrap">{text}</div>
    </div>
  );
}

function DiagnosesSection({ diagnoses }: { diagnoses: DiagnosisEntry[] }) {
  if (!diagnoses.length) return <Empty text="No diagnoses on record." />;
  return (
    <div className="space-y-2">
      {diagnoses.map((d) => (
        <Card key={`${d.source}-${d.sourceId}-${d.date}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="font-semibold text-slate-900">{d.text}</div>
              <Badge variant="outline">{d.source}</Badge>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {fmtDate(d.date)}{d.doctorName ? ` • Dr. ${d.doctorName}` : ''}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DoctorsSection({ doctors }: { doctors: DoctorVisited[] }) {
  if (!doctors.length) return <Empty text="No doctors on record." />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {doctors.map((d) => (
        <Card key={d.doctorId || d.name}>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5 text-slate-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900">Dr. {d.name}</div>
              <div className="text-xs text-slate-500">
                {d.encounters} encounter{d.encounters === 1 ? '' : 's'} • First {fmtDate(d.firstSeen)} • Last {fmtDate(d.lastSeen)}
              </div>
              <div className="mt-1 flex gap-1 flex-wrap">
                {d.sources.map((s) => (
                  <span key={s} className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{s}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function VisitsSection({ encounters }: { encounters: Encounter[] }) {
  if (!encounters.length) return <Empty text="No visits recorded yet." />;
  return (
    <div className="space-y-2">
      {encounters.map((e) => (
        <Card key={e.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="font-semibold text-slate-900">{fmtDate(e.visitDate)} — {e.type}</div>
                <div className="text-sm text-slate-500">
                  {e.doctorName ? `Dr. ${e.doctorName}` : 'Unassigned'} • {e.status}
                </div>
              </div>
              <Badge variant="outline">{e.status}</Badge>
            </div>
            {e.chiefComplaint && (
              <div className="mt-2 text-sm">
                <span className="text-slate-400 uppercase text-xs mr-2">Chief complaint</span>
                <span className="text-slate-800">{e.chiefComplaint}</span>
              </div>
            )}
            {e.latestNote && (
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm border-t pt-2">
                {e.latestNote.assessment && (
                  <div>
                    <div className="text-xs uppercase text-slate-400">Assessment</div>
                    <div className="text-slate-800 truncate">{asText(e.latestNote.assessment)}</div>
                  </div>
                )}
                {e.latestNote.plan && (
                  <div>
                    <div className="text-xs uppercase text-slate-400">Plan</div>
                    <div className="text-slate-800 truncate">{asText(e.latestNote.plan)}</div>
                  </div>
                )}
                {e.latestNote.vitals && (
                  <div>
                    <div className="text-xs uppercase text-slate-400">Vitals</div>
                    <div className="text-slate-800 truncate">{asText(e.latestNote.vitals)}</div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AdmissionsSection({ admissions }: { admissions: Admission[] }) {
  if (!admissions.length) return <Empty text="No admissions on record." />;
  return (
    <div className="space-y-2">
      {admissions.map((a) => (
        <Card key={a.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="font-semibold text-slate-900">
                  {fmtDate(a.admissionDate)} — {a.dischargeDate ? `Discharged ${fmtDate(a.dischargeDate)}` : 'Active'}
                </div>
                <div className="text-sm text-slate-500">
                  {a.wardName || 'Ward'}{a.bedNumber ? ` • Bed ${a.bedNumber}` : ''}{a.doctorName ? ` • Dr. ${a.doctorName}` : ''}
                </div>
              </div>
              <Badge variant={a.status === 'active' || a.status === 'admitted' ? 'default' : 'outline'}>{a.status}</Badge>
            </div>
            {a.diagnosis && (
              <div className="mt-2 text-sm">
                <span className="text-slate-400 uppercase text-xs mr-2">Diagnosis</span>
                <span className="text-slate-800">{a.diagnosis}</span>
              </div>
            )}
            {a.ipdNotes && a.ipdNotes.length > 0 && (
              <div className="mt-3 border-t pt-2">
                <div className="text-xs uppercase text-slate-400 mb-2">
                  {a.ipdNotes.length} doctor/nurse update{a.ipdNotes.length === 1 ? '' : 's'}
                </div>
                <ul className="space-y-2 text-sm">
                  {a.ipdNotes.slice(0, 3).map((n) => (
                    <li key={n.id} className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-slate-800 whitespace-pre-wrap">{n.note}</div>
                        <div className="text-xs text-slate-500">
                          {n.noteType} • {fmtDateTime(n.createdAt)}{n.authorName ? ` • ${n.authorName}` : ''}
                        </div>
                      </div>
                    </li>
                  ))}
                  {a.ipdNotes.length > 3 && (
                    <li className="text-xs text-slate-500">
                      …and {a.ipdNotes.length - 3} more — see the Doctor updates tab.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DialysisSectionView({ sessions }: { sessions: DialysisSession[] }) {
  if (!sessions.length) return <Empty text="No dialysis sessions on record." />;
  return (
    <div className="space-y-2">
      {sessions.map((s) => (
        <Card key={s.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="font-semibold text-slate-900">
                  {fmtDate(s.scheduledDate)} — {s.modality}{s.slot ? ` • ${s.slot}` : ''}
                </div>
                <div className="text-sm text-slate-500">
                  {s.nephrologistName ? `Dr. ${s.nephrologistName}` : 'Unassigned'}
                  {s.nurseName ? ` • Nurse ${s.nurseName}` : ''}
                  {s.durationMin ? ` • ${s.durationMin}min` : ''}
                </div>
              </div>
              <Badge variant={s.status === 'completed' ? 'default' : s.status === 'cancelled' ? 'outline' : 'secondary'}>
                {s.status}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {s.vascularAccess && <Field label="Access" value={s.vascularAccess} />}
              {s.dialyzer && <Field label="Dialyzer" value={s.dialyzer} />}
              {s.bloodFlowRate !== null && <Field label="Blood flow" value={`${s.bloodFlowRate} ml/min`} />}
              {s.dialysateFlow !== null && <Field label="Dialysate flow" value={`${s.dialysateFlow} ml/min`} />}
              {s.ufGoalMl !== null && <Field label="UF goal" value={`${s.ufGoalMl} ml`} />}
              {s.ufActualMl !== null && <Field label="UF actual" value={`${s.ufActualMl} ml`} />}
              {s.preWeightKg !== null && <Field label="Pre-weight" value={`${s.preWeightKg} kg`} />}
              {s.postWeightKg !== null && <Field label="Post-weight" value={`${s.postWeightKg} kg`} />}
              {(s.preBpSys !== null && s.preBpDia !== null) && <Field label="Pre BP" value={`${s.preBpSys}/${s.preBpDia}`} />}
              {(s.postBpSys !== null && s.postBpDia !== null) && <Field label="Post BP" value={`${s.postBpSys}/${s.postBpDia}`} />}
              {s.heparin && <Field label="Heparin" value={s.heparin} />}
            </div>
            {s.complications && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-900">
                <span className="font-semibold">Complications: </span>{s.complications}
              </div>
            )}
            {s.notes && (
              <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{s.notes}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-slate-400">{label}</div>
      <div className="text-slate-900 font-medium">{value}</div>
    </div>
  );
}

function OrdersSection({ orders, kind }: { orders: Order[]; kind: 'lab' | 'radiology' | 'pathology' }) {
  if (!orders.length) return <Empty text={`No ${kind} orders on record.`} />;
  const Icon = kind === 'lab' ? FlaskConical : kind === 'pathology' ? FlaskConical : Scan;
  const tint = kind === 'lab' ? 'text-cyan-600' : kind === 'pathology' ? 'text-amber-600' : 'text-fuchsia-600';
  return (
    <div className="space-y-2">
      {orders.map((o) => {
        const summary = kind === 'lab' || kind === 'pathology'
          ? (() => {
              const tests = (o.details?.tests || []) as Array<{ name?: string }>;
              const names = tests.map((t) => t.name).filter(Boolean);
              return names.length ? names.join(', ') : `${kind} order`;
            })()
          : `${o.details?.modality || 'Imaging'} ${o.details?.bodyPart || ''}`.trim();
        return (
          <Card key={o.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${tint}`} />
                  <div>
                    <div className="font-semibold text-slate-900">{summary}</div>
                    <div className="text-xs text-slate-500">Ordered {fmtDateTime(o.orderedAt)} • {o.priority}</div>
                  </div>
                </div>
                <Badge variant={o.status === 'pending' ? 'outline' : 'default'}>{o.status}</Badge>
              </div>
              {o.results.length > 0 && (
                <div className="mt-3 space-y-2 border-t pt-2">
                  {o.results.map((r) => (
                    <div key={r.id} className={`p-2 rounded text-sm ${r.isCritical ? 'bg-red-50 border border-red-200' : 'bg-slate-50'}`}>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-500">Resulted {fmtDateTime(r.resultedAt)}{r.verifiedBy ? ` • Verified by ${r.verifiedBy}` : ''}</div>
                        {r.isCritical && <Badge className="bg-red-600 hover:bg-red-600">Critical</Badge>}
                      </div>
                      <pre className="mt-1 text-xs text-slate-800 whitespace-pre-wrap font-mono">
                        {asText(r.resultData)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PrescriptionsSection({ prescriptions }: { prescriptions: Prescription[] }) {
  if (!prescriptions.length) return <Empty text="No prescriptions on record." />;
  return (
    <div className="space-y-2">
      {prescriptions.map((rx) => {
        const drugs = Array.isArray(rx.drugs) ? rx.drugs : [];
        return (
          <Card key={rx.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-semibold text-slate-900">{fmtDate(rx.issuedAt)}</div>
                  <div className="text-xs text-slate-500">
                    {rx.doctorName ? `Dr. ${rx.doctorName}` : 'Unsigned'} • {rx.status}
                  </div>
                </div>
                <Badge variant="outline">{drugs.length} item{drugs.length === 1 ? '' : 's'}</Badge>
              </div>
              {drugs.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm">
                  {drugs.map((d: any, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <Pill className="w-3.5 h-3.5 text-pink-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-slate-900 font-medium">{d.name || d.drug || 'Drug'}</div>
                        <div className="text-xs text-slate-500">
                          {[d.dose, d.frequency, d.duration].filter(Boolean).join(' • ')}
                          {d.instructions ? ` — ${d.instructions}` : ''}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {rx.notes && (
                <div className="mt-2 text-sm text-slate-700">
                  <span className="text-xs uppercase text-slate-400 mr-2">Notes</span>
                  {rx.notes}
                </div>
              )}
              {rx.instructions && (
                <div className="mt-1 text-sm text-slate-700">
                  <span className="text-xs uppercase text-slate-400 mr-2">Instructions</span>
                  {rx.instructions}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function IPDNotesSection({ admissions }: { admissions: Admission[] }) {
  // Flatten all IPD notes across admissions into one chronological stream.
  // Each note still carries its parent admission so the reader knows which
  // stay the update belongs to.
  const stream: Array<IPDNote & { admissionId: string; admissionDate: string }> = [];
  for (const a of admissions) {
    for (const n of a.ipdNotes || []) {
      stream.push({ ...n, admissionId: a.id, admissionDate: a.admissionDate });
    }
  }
  stream.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (!stream.length) return <Empty text="No doctor/nurse updates on record." />;
  return (
    <div className="space-y-2">
      {stream.map((n) => (
        <Card key={n.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs text-slate-500">
                {fmtDateTime(n.createdAt)}{n.authorName ? ` • ${n.authorName}` : ''} • Admission of {fmtDate(n.admissionDate)}
              </div>
              <Badge variant="outline">{n.noteType}</Badge>
            </div>
            <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">{n.note}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SurgeriesSection({ surgeries }: { surgeries: Surgery[] }) {
  if (!surgeries.length) return <Empty text="No surgeries on record." />;
  return (
    <div className="space-y-2">
      {surgeries.map((s) => (
        <Card key={s.id}>
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="font-semibold text-slate-900">{s.procedureName}</div>
              <div className="text-sm text-slate-500">
                {fmtDate(s.scheduledDate)}{s.scheduledTime ? ` • ${s.scheduledTime}` : ''}
                {s.surgeonName ? ` • Dr. ${s.surgeonName}` : ''}
                {s.currentStage ? ` • Stage: ${s.currentStage}` : ''}
              </div>
            </div>
            <Badge variant={s.status === 'completed' ? 'default' : s.status === 'cancelled' ? 'outline' : 'secondary'}>
              {s.status}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BillsSection({ invoices, onChanged }: { invoices: Invoice[]; onChanged: () => void | Promise<void> }) {
  // Two action surfaces — discount and part-payment — each gated on
  // its own permission. UI gating is a hint; the backend re-checks on
  // every POST. Permission grants are managed in backend/src/rbac.ts
  // (discount: ADMIN + BILLING; payment: ADMIN + BILLING + FRONT_DESK
  // + EMERGENCY by default). Tighten per-user via the existing
  // extra/revoked-permissions flow if needed.
  const { hasPermission } = useAuth();
  const canDiscount = hasPermission('invoices:discount');
  const canPay = hasPermission('invoices:payment');

  // Per-invoice toggles: which inline form (if any) is open for each
  // invoice id. Two separate maps so opening one doesn't close the
  // other on the same row.
  const [discountOpen, setDiscountOpen] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState<string | null>(null);
  const [itemsOpen, setItemsOpen] = useState<Set<string>>(new Set());

  function toggleItems(id: string) {
    setItemsOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!invoices.length) return <Empty text="No bills on record." />;
  return (
    <div className="space-y-3">
      {invoices.map((inv) => {
        const settled = inv.status === 'paid' && inv.balance <= 0;
        const isItemsOpen = itemsOpen.has(inv.id);
        const isDiscountOpen = discountOpen === inv.id;
        const isPaymentOpen = paymentOpen === inv.id;
        return (
          <Card key={inv.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="font-semibold text-slate-900">
                      {inv.type.toUpperCase()} — {fmtDate(inv.createdAt)}
                      {inv.type === 'ipd' && inv.status !== 'paid' && (
                        <span className="ml-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                          Live IPD bill
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      Subtotal ₹{inv.subtotal.toLocaleString()}
                      {inv.discount > 0 ? ` • Discount −₹${inv.discount.toLocaleString()}` : ''}
                      {inv.tax > 0 ? ` • Tax ₹${inv.tax.toLocaleString()}` : ''}
                      {' • '}Total ₹{inv.total.toLocaleString()} • Paid ₹{inv.paid.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(inv.items?.length ?? 0) > 0 && (
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => toggleItems(inv.id)}>
                      {isItemsOpen ? <X className="w-3.5 h-3.5" /> : <Receipt className="w-3.5 h-3.5" />}
                      {isItemsOpen ? 'Hide items' : `${inv.items.length} item${inv.items.length === 1 ? '' : 's'}`}
                    </Button>
                  )}
                  {canDiscount && !settled && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => { setDiscountOpen(isDiscountOpen ? null : inv.id); setPaymentOpen(null); }}
                    >
                      {isDiscountOpen ? <X className="w-3.5 h-3.5" /> : <Percent className="w-3.5 h-3.5" />}
                      {isDiscountOpen ? 'Cancel' : 'Discount'}
                    </Button>
                  )}
                  {canPay && !settled && (
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => { setPaymentOpen(isPaymentOpen ? null : inv.id); setDiscountOpen(null); }}
                    >
                      {isPaymentOpen ? <X className="w-3.5 h-3.5" /> : <IndianRupee className="w-3.5 h-3.5" />}
                      {isPaymentOpen ? 'Cancel' : 'Record payment'}
                    </Button>
                  )}
                  <div className="text-right">
                    <div className={`font-semibold ${inv.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      ₹{inv.balance.toLocaleString()}
                    </div>
                    <Badge variant="outline">{inv.status}</Badge>
                  </div>
                </div>
              </div>

              {isItemsOpen && <InvoiceItemsTable items={inv.items} />}

              {(inv.payments?.length ?? 0) > 0 && (
                <PaymentHistory payments={inv.payments} />
              )}

              {isDiscountOpen && (
                <DiscountForm
                  invoiceId={inv.id}
                  onClose={() => setDiscountOpen(null)}
                  onApplied={async () => {
                    setDiscountOpen(null);
                    await onChanged();
                  }}
                />
              )}
              {isPaymentOpen && (
                <PaymentForm
                  invoiceId={inv.id}
                  outstandingBalance={inv.balance}
                  onClose={() => setPaymentOpen(null)}
                  onRecorded={async () => {
                    setPaymentOpen(null);
                    await onChanged();
                  }}
                />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function InvoiceItemsTable({ items }: { items: InvoiceLineItem[] }) {
  // Group by category for readability — IPD invoices typically have a
  // long list (lab + rad + pharmacy + procedure + bed). Within each
  // category items stay in append order so the user can correlate
  // with the clinical timeline.
  const grouped = items.reduce<Record<string, InvoiceLineItem[]>>((acc, it) => {
    const cat = (it.category || 'other').toLowerCase();
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(it);
    return acc;
  }, {});
  const categoryOrder = ['bed', 'consultation', 'lab', 'radiology', 'pathology', 'pharmacy', 'procedure', 'other'];
  const orderedKeys = [
    ...categoryOrder.filter((k) => grouped[k]),
    ...Object.keys(grouped).filter((k) => !categoryOrder.includes(k)),
  ];
  return (
    <div className="mt-3 border-t pt-3 space-y-3 text-sm">
      {orderedKeys.map((cat) => (
        <div key={cat}>
          <div className="text-xs uppercase text-slate-400 mb-1">{cat}</div>
          <table className="w-full">
            <thead>
              <tr className="text-xs text-slate-500 text-left">
                <th className="font-normal">Description</th>
                <th className="font-normal text-right">Qty</th>
                <th className="font-normal text-right">Unit ₹</th>
                <th className="font-normal text-right">Total ₹</th>
              </tr>
            </thead>
            <tbody>
              {grouped[cat].map((it, i) => (
                <tr key={it.id || `${cat}-${i}`} className="border-t border-slate-100">
                  <td className="py-1 text-slate-800">
                    {it.description || it.name || '—'}
                    {it.occurredAt && (
                      <span className="ml-2 text-xs text-slate-400">{fmtDate(it.occurredAt)}</span>
                    )}
                  </td>
                  <td className="py-1 text-right text-slate-600">{it.quantity ?? 1}</td>
                  <td className="py-1 text-right text-slate-600">
                    {(it.unitPrice ?? (it.amount && it.quantity ? it.amount / it.quantity : it.amount) ?? 0).toLocaleString()}
                  </td>
                  <td className="py-1 text-right font-medium text-slate-900">
                    {((it.total ?? it.amount) ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function PaymentHistory({ payments }: { payments: InvoicePayment[] }) {
  return (
    <div className="mt-3 border-t pt-2">
      <div className="text-xs uppercase text-slate-400 mb-1">
        {payments.length} payment{payments.length === 1 ? '' : 's'}
      </div>
      <ul className="space-y-1 text-sm">
        {payments.map((p) => (
          <li key={p.id} className="flex items-center justify-between border-b border-slate-100 last:border-0 py-1">
            <div>
              <span className="font-medium text-slate-900">₹{p.amount.toLocaleString()}</span>
              <span className="ml-2 text-xs uppercase text-slate-500">{p.mode || 'cash'}</span>
              {p.transactionRef && <span className="ml-2 text-xs text-slate-500">Ref: {p.transactionRef}</span>}
            </div>
            <div className="text-xs text-slate-500">{fmtDateTime(p.paidAt)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PaymentForm({
  invoiceId,
  outstandingBalance,
  onClose,
  onRecorded,
}: {
  invoiceId: string;
  outstandingBalance: number;
  onClose: () => void;
  onRecorded: () => void | Promise<void>;
}) {
  const [amount, setAmount] = useState<string>('');
  const [mode, setMode] = useState<string>('cash');
  const [reference, setReference] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const numeric = parseFloat(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (numeric > outstandingBalance + 0.01) {
      // Soft guard: backend will accept overpayment, but most front-desk
      // operators don't mean to overpay. Show a confirm rather than a
      // hard block in case the family is genuinely pre-paying for
      // future care during a long IPD stay.
      if (!window.confirm(`Amount ₹${numeric.toLocaleString()} exceeds outstanding ₹${outstandingBalance.toLocaleString()}. Record anyway?`)) return;
    }
    setSubmitting(true);
    try {
      await api.post(`/api/invoices/${invoiceId}/payment`, {
        amount: numeric,
        mode,
        transactionRef: reference.trim() || undefined,
      });
      await onRecorded();
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 403) setError('You don\'t have permission to record payments.');
      else setError(e?.response?.data?.error || e?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  }

  const modes = [
    { id: 'cash', label: 'Cash' },
    { id: 'card', label: 'Card' },
    { id: 'upi', label: 'UPI' },
    { id: 'bank', label: 'Bank transfer' },
    { id: 'cheque', label: 'Cheque' },
    { id: 'tpa', label: 'TPA / Insurance' },
  ];

  return (
    <div className="mt-3 p-3 border border-slate-200 rounded bg-slate-50 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <IndianRupee className="w-4 h-4" /> Record part payment
        </div>
        <div className="text-xs text-slate-500">
          Outstanding: <span className="font-semibold text-red-600">₹{outstandingBalance.toLocaleString()}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={
              'px-3 py-1 rounded-full text-xs border ' +
              (mode === m.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400')
            }
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount in ₹"
            className="w-full px-3 py-1.5 pr-8 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
        </div>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Reference / UTR / cheque no. (optional)"
          className="flex-[2] px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button size="sm" onClick={submit} disabled={submitting || !amount}>
          {submitting ? 'Recording…' : 'Record payment'}
        </Button>
      </div>
    </div>
  );
}

function DiscountForm({
  invoiceId,
  onClose,
  onApplied,
}: {
  invoiceId: string;
  onClose: () => void;
  onApplied: () => void | Promise<void>;
}) {
  const [type, setType] = useState<'percent' | 'flat'>('percent');
  const [value, setValue] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const numeric = parseFloat(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      setError('Enter a non-negative number.');
      return;
    }
    if (type === 'percent' && numeric > 100) {
      setError('Percent cannot exceed 100.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/api/invoices/${invoiceId}/discount`, {
        type,
        value: numeric,
        reason: reason.trim() || undefined,
      });
      await onApplied();
    } catch (e: any) {
      const status = e?.response?.status;
      // 403 surfaces if the operator's permission was revoked between
      // page load and submit — the gating check on render is a UI hint,
      // not the authority. Show a clear message rather than a generic
      // network error so they can stop trying.
      if (status === 403) setError('You don\'t have permission to apply discounts.');
      else setError(e?.response?.data?.error || e?.message || 'Failed to apply discount');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 p-3 border border-slate-200 rounded bg-slate-50 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <Percent className="w-4 h-4" /> Apply discount
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setType('percent')}
          className={
            'flex-1 px-3 py-1.5 rounded border text-sm flex items-center justify-center gap-1 ' +
            (type === 'percent' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400')
          }
        >
          <Percent className="w-3.5 h-3.5" /> Percent
        </button>
        <button
          type="button"
          onClick={() => setType('flat')}
          className={
            'flex-1 px-3 py-1.5 rounded border text-sm flex items-center justify-center gap-1 ' +
            (type === 'flat' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400')
          }
        >
          <IndianRupee className="w-3.5 h-3.5" /> Flat ₹
        </button>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max={type === 'percent' ? 100 : undefined}
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={type === 'percent' ? '0–100' : 'Amount in ₹'}
            className="w-full px-3 py-1.5 pr-8 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {type === 'percent' ? '%' : '₹'}
          </span>
        </div>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional, written to audit log)"
          className="flex-[2] px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button size="sm" onClick={submit} disabled={submitting || !value}>
          {submitting ? 'Applying…' : 'Apply discount'}
        </Button>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Card><CardContent className="p-8 text-center text-sm text-slate-500">{text}</CardContent></Card>
  );
}
