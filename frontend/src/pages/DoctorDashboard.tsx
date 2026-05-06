// Doctor's personal landing inside the portal. Replaces the generic
// 34-tile dashboard for users with a doctor role so the first thing
// they see is their actual chart workload:
//
//   • Top-of-page identity card with name + qualifications + dept(s)
//   • Stat strip: today's OPD count, today's IPD admits, pending lab,
//     pending radiology, surgeries scheduled today
//   • IPD section grouped by ward (Cardiac ICU / Surgical Ward / etc.)
//   • OPD lineup for today, sorted by appointment time
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

interface DashboardData {
  doctor: {
    id: string;
    name: string;
    qualifications: string | null;
    specialization: string | null;
    departments: string[];
    displayName: string;
    displaySubtitle: string | null;
  };
  ipd: { totalActive: number; byWard: IpdWardGroup[]; unassigned: IpdPatient[] };
  opd: { todayCount: number; nextUpAt: string | null; appointments: OpdAppt[] };
  pendingLabResults: number;
  pendingRadiology: number;
  scheduledSurgeriesToday: number;
}

export default function DoctorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    return (
      <div className="p-8 text-center text-slate-500">Loading your dashboard…</div>
    );
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

  const totalIpd = data.ipd.totalActive;
  const totalOpd = data.opd.todayCount;

  return (
    <div className="p-6 space-y-6">
      {/* Identity card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Stethoscope className="w-7 h-7 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900">{data.doctor.displayName}</h1>
              {data.doctor.displaySubtitle && (
                <p className="text-sm text-slate-500 mt-0.5">{data.doctor.displaySubtitle}</p>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => { setRefreshing(true); void load(); }}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={CalendarDays} tint="bg-blue-500" label="OPD today" value={totalOpd} sub={data.opd.nextUpAt ? `Next at ${data.opd.nextUpAt}` : 'No more today'} />
        <StatCard icon={BedDouble} tint="bg-emerald-500" label="IPD under care" value={totalIpd} sub={`${data.ipd.byWard.length} ward${data.ipd.byWard.length === 1 ? '' : 's'}`} />
        <StatCard icon={Activity} tint="bg-orange-500" label="OT today" value={data.scheduledSurgeriesToday} sub="Scheduled / in progress" />
        <StatCard icon={FlaskConical} tint="bg-cyan-500" label="Pending labs" value={data.pendingLabResults} sub="Awaiting results" />
        <StatCard icon={Scan} tint="bg-purple-500" label="Pending imaging" value={data.pendingRadiology} sub="Awaiting reports" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* IPD by ward */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-emerald-600" /> IPD patients under your care
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {totalIpd === 0 && (
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
                    <PatientRow key={p.admissionId} p={p} onClick={() => navigate(`/app/inpatient`)} />
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
                    <PatientRow key={p.admissionId} p={p} onClick={() => navigate(`/app/inpatient`)} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* OPD lineup */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-600" /> Today's OPD lineup
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalOpd === 0 && (
              <p className="text-sm text-slate-500">No OPD appointments today.</p>
            )}
            <div className="space-y-1.5">
              {data.opd.appointments.map((a) => (
                <button
                  key={a.appointmentId}
                  onClick={() => navigate(`/app/opd`)}
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
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, tint, label, value, sub }: { icon: any; tint: string; label: string; value: number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tint}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
          <div className="text-2xl font-bold text-slate-900 leading-tight">{value}</div>
          {sub && <div className="text-[11px] text-slate-400 truncate">{sub}</div>}
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
