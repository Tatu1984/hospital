import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Users, Bed, AlertCircle, Heart, Pill, Droplet, Receipt, RefreshCw } from 'lucide-react';
import { dashboardAPI } from '../services/api';

interface DashboardStats {
  todayOPD?: number;
  todayIPD?: number;
  todayAdmissions?: number;
  todayDischarges?: number;
  bedsOccupied?: number;
  bedsAvailable?: number;
  emergencyCases?: number;
  icuOccupancy?: number;
  pharmacyDispensed?: number;
  bloodBankUnits?: number;
  todayRevenue?: number;
  pendingInvoices?: number;
  [key: string]: number | undefined;
}

const REFRESH_MS = 30_000;

export default function LiveDashboard() {
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

  const tiles: Array<{ label: string; value: number | string; icon: any; tone: string }> = [
    { label: 'Today OPD',        value: stats.todayOPD ?? 0,        icon: Activity,    tone: 'bg-blue-50 text-blue-700' },
    { label: 'Today IPD',        value: stats.todayIPD ?? 0,        icon: Users,       tone: 'bg-cyan-50 text-cyan-700' },
    { label: 'Admissions',       value: stats.todayAdmissions ?? 0, icon: Bed,         tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Discharges',       value: stats.todayDischarges ?? 0, icon: Bed,         tone: 'bg-teal-50 text-teal-700' },
    { label: 'Beds Occupied',    value: stats.bedsOccupied ?? 0,    icon: Bed,         tone: 'bg-amber-50 text-amber-700' },
    { label: 'Beds Available',   value: stats.bedsAvailable ?? 0,   icon: Bed,         tone: 'bg-lime-50 text-lime-700' },
    { label: 'ER Cases',         value: stats.emergencyCases ?? 0,  icon: AlertCircle, tone: 'bg-red-50 text-red-700' },
    { label: 'ICU Occupancy',    value: stats.icuOccupancy ?? 0,    icon: Heart,       tone: 'bg-pink-50 text-pink-700' },
    { label: 'Pharmacy Today',   value: stats.pharmacyDispensed ?? 0, icon: Pill,      tone: 'bg-indigo-50 text-indigo-700' },
    { label: 'Blood Units',      value: stats.bloodBankUnits ?? 0,  icon: Droplet,     tone: 'bg-rose-50 text-rose-700' },
    { label: 'Revenue Today (₹)',value: stats.todayRevenue ?? 0,    icon: Receipt,     tone: 'bg-purple-50 text-purple-700' },
    { label: 'Pending Invoices', value: stats.pendingInvoices ?? 0, icon: Receipt,     tone: 'bg-orange-50 text-orange-700' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Live Dashboard</h1>
          <p className="text-sm text-slate-500">
            Auto-refreshes every {REFRESH_MS / 1000}s
            {updatedAt ? ` · last updated ${updatedAt.toLocaleTimeString()}` : ''}
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{t.label}</p>
                    <p className="text-2xl font-bold mt-1 text-slate-900">{t.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.tone}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
