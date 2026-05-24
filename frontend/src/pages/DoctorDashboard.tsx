// Doctor's personal landing inside the portal. Replaces the generic
// 34-tile dashboard for users with a doctor role so the first thing
// they see is their actual chart workload.
//
// Layout:
//   1. Identity hero card (name + qualifications + departments)
//   2. 5-card stat strip — every card is CLICKABLE and selects the
//      "active view". The section below the strip shows the matching
//      patient list:
//         OPD TODAY      → today's OPD lineup
//         IPD UNDER CARE → admissions grouped by ward + unassigned
//         OT TODAY       → today's surgeries this doctor is on
//         PENDING LABS   → lab orders awaiting result
//         PENDING IMAGING→ radiology orders awaiting report
//   3. Each patient row routes to /app/chart/:patientId — the
//      comprehensive chart page (demographics, history, reports,
//      prescriptions, bills, surgeries — everything).
//
// Single network call to /api/mobile/v1/doctors/me/dashboard which
// aggregates everything server-side.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Stethoscope,
  BedDouble,
  CalendarDays,
  FlaskConical,
  Scan,
  Activity,
  Clock,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import api from '../services/api';

interface IpdPatient {
  admissionId: string;
  patientId: string;
  patientName: string;
  mrn: string;
  bedNumber: string | null;
  admissionDate: string;
  daysInWard: number;
  diagnosis: string | null;
}
interface IpdWardGroup {
  wardId: string;
  wardName: string;
  wardType: string | null;
  floor: string | null;
  patients: IpdPatient[];
}
interface OpdAppt {
  appointmentId: string;
  patientId: string;
  patientName: string;
  mrn: string;
  appointmentTime: string;
  type: string;
  status: string;
  reason: string | null;
}
interface SurgeryListItem {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  scheduledTime: string | null;
  procedureName: string;
  status: string;
  priority: string;
  otRoom: string | null;
}
interface PendingOrder {
  id: string;
  category: 'lab' | 'radiology';
  patientId: string;
  patientName: string;
  mrn: string;
  orderedAt: string;
  priority: string;
  summary: string;
}
interface DashboardData {
  doctor: { id: string; name: string; qualifications: string | null; specialization: string | null; departments: string[]; displayName: string; displaySubtitle: string | null };
  ipd: { totalActive: number; byWard: IpdWardGroup[]; unassigned: IpdPatient[] };
  opd: { todayCount: number; nextUpAt: string | null; appointments: OpdAppt[] };
  ot: { todayCount: number; today: SurgeryListItem[] };
  pendingLabs: { count: number; items: PendingOrder[] };
  pendingImaging: { count: number; items: PendingOrder[] };
  pendingLabResults: number;
  pendingRadiology: number;
  scheduledSurgeriesToday: number;
}

type ActiveView = 'opd' | 'ipd' | 'ot' | 'lab' | 'imaging';

export default function DoctorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // No card selected on landing — the section below stays empty until the
  // doctor clicks one. Keeps the dashboard visually quiet and avoids the
  // "why is IPD always highlighted" question on first load.
  const [active, setActive] = useState<ActiveView | null>(null);
  const navigate = useNavigate();

  async function load() {
    setError(null);
    try {
      const r = await api.get('/api/mobile/v1/doctors/me/dashboard');
      setData(r.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Could not load your dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  useEffect(() => { void load(); }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading your dashboard…</div>;
  }
  if (error || !data) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-slate-600">{error || 'No data.'}</p>
            <Button onClick={() => { setLoading(true); void load(); }} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const goChart = (patientId: string) => navigate(`/app/chart/${patientId}`);

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-full max-w-[1500px] mx-auto">
      {/* Page header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{data.doctor.displayName}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {data.doctor.displaySubtitle || 'Doctor dashboard'}
            </p>
          </div>
        </div>
        <Button
          onClick={() => { setRefreshing(true); void load(); }}
          disabled={refreshing}
          className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Stat strip — clickable, drives the section below */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          icon={CalendarDays} tint="blue"
          label="OPD today" value={data.opd.todayCount}
          sub={data.opd.nextUpAt ? `Next at ${data.opd.nextUpAt}` : 'No more today'}
          active={active === 'opd'} onClick={() => setActive('opd')}
        />
        <StatCard
          icon={BedDouble} tint="emerald"
          label="IPD under care" value={data.ipd.totalActive}
          sub={`${data.ipd.byWard.length} ward${data.ipd.byWard.length === 1 ? '' : 's'}`}
          active={active === 'ipd'} onClick={() => setActive('ipd')}
        />
        <StatCard
          icon={Activity} tint="orange"
          label="OT today" value={data.ot.todayCount}
          sub="Scheduled / in progress"
          active={active === 'ot'} onClick={() => setActive('ot')}
        />
        <StatCard
          icon={FlaskConical} tint="cyan"
          label="Pending labs" value={data.pendingLabs.count}
          sub="Awaiting results"
          active={active === 'lab'} onClick={() => setActive('lab')}
        />
        <StatCard
          icon={Scan} tint="purple"
          label="Pending imaging" value={data.pendingImaging.count}
          sub="Awaiting reports"
          active={active === 'imaging'} onClick={() => setActive('imaging')}
        />
      </div>

      {/* Active section — render based on which card is selected */}
      {active === 'ipd' && <IpdSection data={data} onPatientClick={goChart} />}
      {active === 'opd' && <OpdSection data={data} onPatientClick={goChart} />}
      {active === 'ot' && <OtSection data={data} onPatientClick={goChart} />}
      {active === 'lab' && <PendingOrdersSection items={data.pendingLabs.items} title="Pending lab orders" emptyText="No pending lab orders." onPatientClick={goChart} />}
      {active === 'imaging' && <PendingOrdersSection items={data.pendingImaging.items} title="Pending imaging orders" emptyText="No pending imaging orders." onPatientClick={goChart} />}
    </div>
  );
}

function StatCard({ icon: Icon, tint, label, value, sub, active, onClick }: {
  icon: any; tint: string; label: string; value: number; sub?: string; active?: boolean; onClick?: () => void;
}) {
  // tint is a Tailwind color stem (blue / emerald / orange / cyan / purple)
  const tintClasses: Record<string, { bg: string; ring: string; text: string }> = {
    blue:    { bg: 'bg-blue-50',    ring: 'ring-blue-100',    text: 'text-blue-600'    },
    emerald: { bg: 'bg-emerald-50', ring: 'ring-emerald-100', text: 'text-emerald-600' },
    orange:  { bg: 'bg-orange-50',  ring: 'ring-orange-100',  text: 'text-orange-600'  },
    cyan:    { bg: 'bg-cyan-50',    ring: 'ring-cyan-100',    text: 'text-cyan-600'    },
    purple:  { bg: 'bg-purple-50',  ring: 'ring-purple-100',  text: 'text-purple-600'  },
  };
  const t = tintClasses[tint] || tintClasses.blue;
  return (
    <button
      onClick={onClick}
      className={`text-left transition-all rounded-2xl ${active ? 'ring-2 ring-slate-900' : 'hover:shadow-md'}`}
    >
      <Card className={`rounded-2xl ${active ? 'border-slate-900' : ''}`}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</div>
            <div className={`w-8 h-8 rounded-lg ${t.bg} ring-1 ${t.ring} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${t.text}`} />
            </div>
          </div>
          <div className="text-3xl font-semibold text-slate-900 mt-2 tracking-tight tabular-nums">{value}</div>
          {sub && <div className="text-[11px] text-slate-400 truncate mt-1">{sub}</div>}
        </CardContent>
      </Card>
    </button>
  );
}

function IpdSection({ data, onPatientClick }: { data: DashboardData; onPatientClick: (id: string) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BedDouble className="w-4 h-4 text-emerald-600" /> IPD patients under your care ({data.ipd.totalActive})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.ipd.totalActive === 0 && (
          <p className="text-sm text-slate-500">No active admissions on your roster.</p>
        )}

        {data.ipd.byWard.map((ward) => (
          <div key={ward.wardId}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-slate-900">{ward.wardName}</h3>
                {(ward.wardType || ward.floor) && (
                  <p className="text-xs text-slate-500">
                    {[ward.wardType, ward.floor && `Floor ${ward.floor}`].filter(Boolean).join(' • ')}
                  </p>
                )}
              </div>
              <Badge variant="secondary">{ward.patients.length}</Badge>
            </div>
            <div className="space-y-1.5">
              {ward.patients.map((p) => (
                <PatientRow key={p.admissionId} p={p} onClick={() => onPatientClick(p.patientId)} />
              ))}
            </div>
          </div>
        ))}

        {data.ipd.unassigned.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-900">Awaiting bed assignment</h3>
              <Badge variant="outline">{data.ipd.unassigned.length}</Badge>
            </div>
            <div className="space-y-1.5">
              {data.ipd.unassigned.map((p) => (
                <PatientRow key={p.admissionId} p={p} onClick={() => onPatientClick(p.patientId)} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OpdSection({ data, onPatientClick }: { data: DashboardData; onPatientClick: (id: string) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-600" /> Today's OPD lineup ({data.opd.todayCount})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.opd.todayCount === 0 && (
          <p className="text-sm text-slate-500">No OPD appointments today.</p>
        )}
        <div className="space-y-1.5">
          {data.opd.appointments.map((a) => (
            <button
              key={a.appointmentId}
              onClick={() => onPatientClick(a.patientId)}
              className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <div className="w-14 text-center">
                <div className="text-base font-semibold text-slate-900 leading-tight">{a.appointmentTime}</div>
                <div className="text-[10px] text-slate-400 uppercase mt-0.5">{a.status}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate">{a.patientName}</div>
                <div className="text-xs text-slate-500 truncate">
                  {a.mrn ? `MRN ${a.mrn}` : ''}{a.reason ? ` • ${a.reason}` : ''}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function OtSection({ data, onPatientClick }: { data: DashboardData; onPatientClick: (id: string) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-orange-600" /> OT scheduled today ({data.ot.todayCount})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.ot.todayCount === 0 && (
          <p className="text-sm text-slate-500">No surgeries scheduled for you today.</p>
        )}
        <div className="space-y-1.5">
          {data.ot.today.map((s) => (
            <button
              key={s.id}
              onClick={() => s.patientId && onPatientClick(s.patientId)}
              disabled={!s.patientId}
              className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-60"
            >
              <div className="w-14 text-center">
                <div className="text-base font-semibold text-slate-900 leading-tight">{s.scheduledTime || '—'}</div>
                {s.otRoom && <div className="text-[10px] text-slate-400 uppercase mt-0.5">{s.otRoom}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate">{s.patientName}</div>
                <div className="text-xs text-slate-500 truncate">
                  {s.procedureName} • {s.priority} • {s.status}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PendingOrdersSection({ items, title, emptyText, onPatientClick }: {
  items: PendingOrder[]; title: string; emptyText: string; onPatientClick: (id: string) => void;
}) {
  const isImaging = items[0]?.category === 'radiology';
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {isImaging ? <Scan className="w-4 h-4 text-purple-600" /> : <FlaskConical className="w-4 h-4 text-cyan-600" />}
          {title} ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 && <p className="text-sm text-slate-500">{emptyText}</p>}
        <div className="space-y-1.5">
          {items.map((o) => (
            <button
              key={o.id}
              onClick={() => onPatientClick(o.patientId)}
              className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <div className="w-12 h-12 rounded-md bg-cyan-50 flex items-center justify-center">
                {o.category === 'radiology' ? <Scan className="w-5 h-5 text-purple-600" /> : <FlaskConical className="w-5 h-5 text-cyan-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate">{o.patientName} <span className="text-xs text-slate-500">• MRN {o.mrn}</span></div>
                <div className="text-xs text-slate-500 truncate">{o.summary}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Ordered {new Date(o.orderedAt).toLocaleString()} • {o.priority}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PatientRow({ p, onClick }: { p: IpdPatient; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 p-2.5 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors"
    >
      {p.bedNumber && (
        <div className="w-10 h-10 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-bold">
          {p.bedNumber}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-900 truncate">{p.patientName}</div>
        <div className="text-xs text-slate-500 truncate">
          MRN {p.mrn || '—'} • Day {p.daysInWard} {p.diagnosis ? `• ${p.diagnosis}` : ''}
        </div>
      </div>
      <Clock className="w-4 h-4 text-slate-400" />
    </button>
  );
}
