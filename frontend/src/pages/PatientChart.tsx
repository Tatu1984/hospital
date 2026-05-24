// Comprehensive patient chart — the doctor's deep-dive view of one patient.
// Reached from the doctor dashboard's lists (IPD/OPD/OT/labs/imaging) by
// clicking any patient row. One round-trip to /api/mobile/v1/patients/:id/chart
// returns demographics + every clinical record on file; this page renders it
// in tabbed sections (Overview, Visits, Admissions, Orders, Prescriptions,
// Surgeries, Bills).

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ArrowLeft,
  User,
  Phone,
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
  FileText,
} from 'lucide-react';
import api from '../services/api';

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
}

interface Encounter {
  id: string;
  type: string;
  visitDate: string;
  status: string;
  chiefComplaint: string | null;
  doctorId: string | null;
  doctorName: string | null;
  latestNote: {
    id: string;
    vitals: any;
    examination: any;
    assessment: any;
    plan: any;
    createdAt: string;
  } | null;
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
  category: string;
  orderedAt: string;
  status: string;
  priority: string;
  details: any;
  results: OrderResult[];
}

interface Prescription {
  id: string;
  issuedAt: string;
  doctorName: string | null;
  drugs: any;
}

interface Invoice {
  id: string;
  type: string;
  createdAt: string;
  status: string;
  total: number;
  paid: number;
  balance: number;
}

interface Surgery {
  id: string;
  procedureName: string;
  surgeonName: string | null;
  scheduledDate: string;
  scheduledTime: string | null;
  status: string;
  currentStage: string | null;
}

interface ChartData {
  patient: ChartPatient;
  admissions: Admission[];
  encounters: Encounter[];
  orders: Order[];
  prescriptions: Prescription[];
  invoices: Invoice[];
  surgeries: Surgery[];
}

function ageFromDob(dob: string | null): string {
  if (!dob) return '—';
  const d = new Date(dob);
  if (isNaN(d.getTime())) return '—';
  const ms = Date.now() - d.getTime();
  const years = Math.floor(ms / (365.25 * 24 * 3600 * 1000));
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

export default function PatientChart() {
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
      setError(e?.response?.data?.error || e?.message || 'Failed to load patient chart');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { void load(); }, [patientId]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading patient chart…</div>;
  }
  if (error || !data) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-3">{error || 'No data'}</p>
        <Button onClick={load}>Retry</Button>
      </div>
    );
  }

  const p = data.patient;
  const labOrders = data.orders.filter((o) => o.category === 'lab');
  const radOrders = data.orders.filter((o) => o.category === 'radiology');

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-full max-w-[1500px] mx-auto">
      {/* Page header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 ring-1 ring-violet-100 flex items-center justify-center">
            <FileText className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Patient Chart</h1>
            <p className="text-sm text-slate-500 mt-0.5">Clinical record across visits, admissions, and orders</p>
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
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
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
                {p.bloodGroup && <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{p.bloodGroup}</Badge>}
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
                  <div className="flex items-center gap-2 truncate" title={p.email}>📧 <span className="truncate">{p.email}</span></div>
                )}
                {p.address && (
                  <div className="flex items-center gap-2 truncate" title={p.address}><MapPin className="w-4 h-4 text-slate-400 shrink-0" /> <span className="truncate">{p.address}</span></div>
                )}
              </div>
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <CountCard icon={CalendarDays} tint="blue" label="Visits" value={data.encounters.length} />
        <CountCard icon={BedDouble} tint="emerald" label="Admissions" value={data.admissions.length} />
        <CountCard icon={FlaskConical} tint="cyan" label="Lab orders" value={labOrders.length} />
        <CountCard icon={Scan} tint="purple" label="Imaging" value={radOrders.length} />
        <CountCard icon={Pill} tint="pink" label="Prescriptions" value={data.prescriptions.length} />
        <CountCard icon={Activity} tint="orange" label="Surgeries" value={data.surgeries.length} />
      </div>

      {/* Sections — tabbed */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="visits">Visits ({data.encounters.length})</TabsTrigger>
          <TabsTrigger value="admissions">Admissions ({data.admissions.length})</TabsTrigger>
          <TabsTrigger value="orders">Lab & Imaging ({data.orders.length})</TabsTrigger>
          <TabsTrigger value="prescriptions">Rx ({data.prescriptions.length})</TabsTrigger>
          <TabsTrigger value="surgeries">Surgeries ({data.surgeries.length})</TabsTrigger>
          <TabsTrigger value="bills">Bills ({data.invoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewSection data={data} /></TabsContent>
        <TabsContent value="visits"><VisitsSection encounters={data.encounters} /></TabsContent>
        <TabsContent value="admissions"><AdmissionsSection admissions={data.admissions} /></TabsContent>
        <TabsContent value="orders"><OrdersSection orders={data.orders} /></TabsContent>
        <TabsContent value="prescriptions"><PrescriptionsSection prescriptions={data.prescriptions} /></TabsContent>
        <TabsContent value="surgeries"><SurgeriesSection surgeries={data.surgeries} /></TabsContent>
        <TabsContent value="bills"><BillsSection invoices={data.invoices} /></TabsContent>
      </Tabs>
    </div>
  );
}

function CountCard({ icon: Icon, tint, label, value }: { icon: any; tint: string; label: string; value: number }) {
  // tint is a Tailwind color stem (blue / emerald / cyan / purple / pink / orange)
  const tintClasses: Record<string, { bg: string; ring: string; text: string }> = {
    blue:    { bg: 'bg-blue-50',    ring: 'ring-blue-100',    text: 'text-blue-600'    },
    emerald: { bg: 'bg-emerald-50', ring: 'ring-emerald-100', text: 'text-emerald-600' },
    cyan:    { bg: 'bg-cyan-50',    ring: 'ring-cyan-100',    text: 'text-cyan-600'    },
    purple:  { bg: 'bg-purple-50',  ring: 'ring-purple-100',  text: 'text-purple-600'  },
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

function OverviewSection({ data }: { data: ChartData }) {
  // Lift the most-recently-recorded vitals from any OPD note we have.
  const latestNote = data.encounters.find((e) => e.latestNote)?.latestNote || null;
  const latestEncounter = data.encounters[0] || null;
  const activeAdmission = data.admissions.find((a) => a.status === 'active' || a.status === 'admitted') || null;
  const upcomingSurgery = data.surgeries.find((s) => s.status !== 'completed' && s.status !== 'cancelled') || null;
  const outstanding = data.invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);

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
        <CardHeader><CardTitle className="text-base">Latest assessment & plan</CardTitle></CardHeader>
        <CardContent>
          {latestNote ? (
            <div className="space-y-2 text-sm">
              {latestNote.examination && <Section label="Examination" body={latestNote.examination} />}
              {latestNote.assessment && <Section label="Assessment" body={latestNote.assessment} />}
              {latestNote.plan && <Section label="Plan" body={latestNote.plan} />}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No clinical notes recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Section({ label, body }: { label: string; body: any }) {
  const text = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
  return (
    <div>
      <div className="text-xs uppercase text-slate-400">{label}</div>
      <div className="text-slate-800 whitespace-pre-wrap">{text}</div>
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
                    <div className="text-slate-800 truncate">{typeof e.latestNote.assessment === 'string' ? e.latestNote.assessment : JSON.stringify(e.latestNote.assessment)}</div>
                  </div>
                )}
                {e.latestNote.plan && (
                  <div>
                    <div className="text-xs uppercase text-slate-400">Plan</div>
                    <div className="text-slate-800 truncate">{typeof e.latestNote.plan === 'string' ? e.latestNote.plan : JSON.stringify(e.latestNote.plan)}</div>
                  </div>
                )}
                {e.latestNote.vitals && (
                  <div>
                    <div className="text-xs uppercase text-slate-400">Vitals</div>
                    <div className="text-slate-800 truncate">{typeof e.latestNote.vitals === 'string' ? e.latestNote.vitals : JSON.stringify(e.latestNote.vitals)}</div>
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OrdersSection({ orders }: { orders: Order[] }) {
  if (!orders.length) return <Empty text="No lab or imaging orders on record." />;
  return (
    <div className="space-y-2">
      {orders.map((o) => {
        const isLab = o.category === 'lab';
        const summary = isLab
          ? (() => {
              const tests = (o.details?.tests || []) as Array<{ name?: string }>;
              const names = tests.map((t) => t.name).filter(Boolean);
              return names.length ? names.join(', ') : 'Lab order';
            })()
          : `${o.details?.modality || 'Imaging'} ${o.details?.bodyPart || ''}`.trim();
        return (
          <Card key={o.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {isLab ? <FlaskConical className="w-4 h-4 text-cyan-600" /> : <Scan className="w-4 h-4 text-purple-600" />}
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
                        <div className="text-xs text-slate-500">Resulted {fmtDateTime(r.resultedAt)}</div>
                        {r.isCritical && <Badge className="bg-red-600">Critical</Badge>}
                      </div>
                      <pre className="mt-1 text-xs text-slate-800 whitespace-pre-wrap font-mono">
                        {typeof r.resultData === 'string' ? r.resultData : JSON.stringify(r.resultData, null, 2)}
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
                  <div className="text-xs text-slate-500">{rx.doctorName ? `Dr. ${rx.doctorName}` : 'Unsigned'}</div>
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
            </CardContent>
          </Card>
        );
      })}
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

function BillsSection({ invoices }: { invoices: Invoice[] }) {
  if (!invoices.length) return <Empty text="No bills on record." />;
  return (
    <div className="space-y-2">
      {invoices.map((inv) => (
        <Card key={inv.id}>
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-400" />
              <div>
                <div className="font-semibold text-slate-900">{inv.type} — {fmtDate(inv.createdAt)}</div>
                <div className="text-xs text-slate-500">
                  Total ₹{inv.total.toLocaleString()} • Paid ₹{inv.paid.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-semibold ${inv.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                ₹{inv.balance.toLocaleString()}
              </div>
              <Badge variant="outline">{inv.status}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Card><CardContent className="p-8 text-center text-sm text-slate-500">{text}</CardContent></Card>
  );
}
