import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Users, Bed, AlertCircle, Heart, Pill, Droplet, Receipt, RefreshCw, UserPlus, BedDouble, Wallet, ArrowUpRight } from 'lucide-react';
import { dashboardAPI } from '../services/api';

interface DashboardStats {
  // Current-state metrics (always populated)
  totalPatients?: number;
  activeAdmissions?: number;
  bedsOccupied?: number;
  bedsAvailable?: number;
  icuOccupancy?: number;
  bloodBankUnits?: number;
  outstandingBalance?: number;
  pendingInvoices?: number;
  activeDialysisToday?: number;
  // Today's activity (zero on a quiet morning)
  todayRegistrations?: number;
  todayOPD?: number;
  todayIPD?: number;
  todayAdmissions?: number;
  todayDischarges?: number;
  emergencyCases?: number;
  pharmacyDispensed?: number;
  todayRevenue?: number;
  [key: string]: number | undefined;
}

const REFRESH_MS = 30_000;

export default function LiveDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({});
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await dashboardAPI.getStats();
      setStats(res.data || {});
      setUpdatedAt(new Date());
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  // Two sections so the dashboard tells a story even on a quiet
  // morning: current-state (always populated) on top, today's activity
  // below. Each tile maps to one DTO key returned by /api/dashboard/stats,
  // plus a `route` that the user is taken to when the card is clicked.
  // Routes are sidebar paths (no /app prefix) — the click handler adds it.
  const currentStateTiles: Array<{ label: string; value: number | string; icon: any; tone: string; route: string }> = [
    { label: 'Total Patients',     value: stats.totalPatients ?? 0,     icon: Users,       tone: 'bg-blue-50 text-blue-700',     route: '/patients' },
    { label: 'Active Admissions',  value: stats.activeAdmissions ?? 0,  icon: BedDouble,   tone: 'bg-emerald-50 text-emerald-700', route: '/inpatient' },
    { label: 'Beds Occupied',      value: stats.bedsOccupied ?? 0,      icon: Bed,         tone: 'bg-amber-50 text-amber-700',   route: '/inpatient' },
    { label: 'Beds Available',     value: stats.bedsAvailable ?? 0,     icon: Bed,         tone: 'bg-lime-50 text-lime-700',     route: '/inpatient' },
    { label: 'ICU Occupancy',      value: stats.icuOccupancy ?? 0,      icon: Heart,       tone: 'bg-pink-50 text-pink-700',     route: '/icu' },
    { label: 'Blood Units',        value: stats.bloodBankUnits ?? 0,    icon: Droplet,     tone: 'bg-rose-50 text-rose-700',     route: '/blood-bank' },
    { label: 'Outstanding (₹)',    value: `₹${(stats.outstandingBalance ?? 0).toLocaleString()}`, icon: Wallet, tone: 'bg-orange-50 text-orange-700', route: '/billing' },
    { label: 'Pending Invoices',   value: stats.pendingInvoices ?? 0,   icon: Receipt,     tone: 'bg-purple-50 text-purple-700', route: '/billing' },
  ];
  const todayTiles: Array<{ label: string; value: number | string; icon: any; tone: string; route: string }> = [
    { label: 'New Registrations',  value: stats.todayRegistrations ?? 0,  icon: UserPlus,    tone: 'bg-sky-50 text-sky-700',       route: '/patients' },
    { label: 'OPD Visits',         value: stats.todayOPD ?? 0,            icon: Activity,    tone: 'bg-blue-50 text-blue-700',     route: '/opd' },
    { label: 'IPD Encounters',     value: stats.todayIPD ?? 0,            icon: Users,       tone: 'bg-cyan-50 text-cyan-700',     route: '/inpatient' },
    { label: 'Admissions',         value: stats.todayAdmissions ?? 0,     icon: BedDouble,   tone: 'bg-emerald-50 text-emerald-700', route: '/inpatient' },
    { label: 'Discharges',         value: stats.todayDischarges ?? 0,     icon: BedDouble,   tone: 'bg-teal-50 text-teal-700',     route: '/inpatient' },
    { label: 'ER Cases',           value: stats.emergencyCases ?? 0,      icon: AlertCircle, tone: 'bg-red-50 text-red-700',       route: '/emergency' },
    { label: 'Dialysis Sessions',  value: stats.activeDialysisToday ?? 0, icon: Droplet,     tone: 'bg-violet-50 text-violet-700', route: '/dialysis' },
    { label: 'Rx Issued',          value: stats.pharmacyDispensed ?? 0,   icon: Pill,        tone: 'bg-indigo-50 text-indigo-700', route: '/pharmacy' },
    { label: 'Revenue (₹)',        value: `₹${(stats.todayRevenue ?? 0).toLocaleString()}`, icon: Receipt, tone: 'bg-purple-50 text-purple-700', route: '/billing' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-full max-w-[1500px] mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Live Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Auto-refreshes every {REFRESH_MS / 1000}s
              {updatedAt ? ` · last updated ${updatedAt.toLocaleTimeString()}` : ''}
            </p>
          </div>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 h-10 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 text-base">Couldn't load live stats</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <section>
        <h2 className="text-sm uppercase tracking-wide text-slate-500 mb-2">Right now</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {currentStateTiles.map((t) => <Tile key={t.label} tile={t} onClick={() => navigate(`/app${t.route}`)} />)}
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wide text-slate-500 mb-2">Today's activity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {todayTiles.map((t) => <Tile key={t.label} tile={t} onClick={() => navigate(`/app${t.route}`)} />)}
        </div>
      </section>
    </div>
  );
}

function Tile({ tile, onClick }: { tile: { label: string; value: number | string; icon: any; tone: string; route: string }; onClick: () => void }) {
  const Icon = tile.icon;
  return (
    // Whole card is one button — keyboard-accessible, focus-visible
    // ring, hover lift cues that it's interactive. group/group-hover
    // pulls in the chevron only when hovered so the resting state
    // stays clean.
    <button
      type="button"
      onClick={onClick}
      className="group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-lg"
      aria-label={`${tile.label}: ${tile.value}. Open ${tile.route}`}
    >
      <Card className="hover:shadow-md hover:border-slate-300 transition-all cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 flex items-center gap-1">
                {tile.label}
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
              </p>
              <p className="text-2xl font-bold mt-1 text-slate-900">{tile.value}</p>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tile.tone}`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
