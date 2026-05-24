// Doctor's personal finance / earnings page. Sidebar entry only shown to
// users with a doctor role (gated in MainLayout). One backend call —
// /api/mobile/v1/doctors/me/finance — returns:
//   • today / week / month aggregate (earned vs. paid vs. pending)
//   • 6-month trend (for the bar chart)
//   • lifetime totals
//   • recent revenue lines (per-invoice contributions)
//   • payout history (actual transfers to the doctor)
// "Done" = paid / netAmount on a payout. "Left" = pending revenue not yet
// included in a payout.

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  CalendarRange,
  RefreshCw,
  Receipt,
  Banknote,
} from 'lucide-react';
import api from '../services/api';

interface FinancePeriod {
  windowStart: string;
  earned: number;
  paid: number;
  pending: number;
  count: number;
}
interface RevenueLine {
  id: string;
  createdAt: string;
  revenueType: string;
  shareAmount: number;
  status: string;
  invoiceId: string;
  invoiceType: string | null;
  patientId: string | null;
  patientName: string | null;
  mrn: string | null;
}
interface PayoutLine {
  id: string;
  payoutNumber: string;
  fromDate: string;
  toDate: string;
  totalShare: number;
  deductions: number;
  netAmount: number;
  paymentMode: string;
  paymentReference: string | null;
  paymentDate: string;
  status: string;
}
interface FinanceData {
  doctor: { id: string; name: string };
  contract: {
    contractNumber: string;
    revenueShareType: string;
    revenueShareValue: number;
    paymentCycle: string;
    isActive: boolean;
  } | null;
  today: FinancePeriod;
  week: FinancePeriod;
  month: FinancePeriod;
  trend: Array<{ month: string; earned: number; paid: number }>;
  lifetime: { earned: number; paid: number; pending: number };
  recentRevenues: RevenueLine[];
  recentPayouts: PayoutLine[];
}

const fmt = (n: number) => `₹${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const monthLabel = (key: string) => {
  // key is "YYYY-MM"
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

export default function DoctorFinance() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setRefreshing(true);
      const r = await api.get('/api/mobile/v1/doctors/me/finance');
      setData(r.data);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load finance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  useEffect(() => { void load(); }, []);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading earnings…</div>;
  if (error || !data) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-3">{error || 'No data'}</p>
        <Button onClick={load}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-full max-w-[1500px] mx-auto">
      {/* Page header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Earnings</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {data.contract
                ? `Contract ${data.contract.contractNumber} • ${data.contract.revenueShareType.replace(/_/g, ' ')} ${data.contract.revenueShareValue}% • paid ${data.contract.paymentCycle}`
                : 'No revenue-share contract on file. Contact admin to set one up.'}
            </p>
          </div>
        </div>
        <Button onClick={load} disabled={refreshing} className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Lifetime + period summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PeriodCard title="Today" period={data.today} accent="bg-blue-500" />
        <PeriodCard title="This week" period={data.week} accent="bg-emerald-500" />
        <PeriodCard title="This month" period={data.month} accent="bg-purple-500" />
      </div>

      {/* Lifetime + Done / Left tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Tile
          icon={Wallet} tint="slate"
          label="Lifetime earned"
          value={fmt(data.lifetime.earned)}
          sub="Paid out + outstanding"
        />
        <Tile
          icon={CheckCircle2} tint="emerald"
          label="Paid out (done)"
          value={fmt(data.lifetime.paid)}
          sub={`${data.recentPayouts.length} payout${data.recentPayouts.length === 1 ? '' : 's'}`}
        />
        <Tile
          icon={Clock} tint="amber"
          label="Pending (left)"
          value={fmt(data.lifetime.pending)}
          sub="Awaiting next payout cycle"
        />
      </div>

      {/* 6-month trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" /> Last 6 months
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart trend={data.trend} />
        </CardContent>
      </Card>

      {/* Tabs: revenue lines / payouts history */}
      <Tabs defaultValue="revenues" className="space-y-3">
        <TabsList>
          <TabsTrigger value="revenues">Recent earnings ({data.recentRevenues.length})</TabsTrigger>
          <TabsTrigger value="payouts">Payout history ({data.recentPayouts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="revenues">
          <RevenuesList revenues={data.recentRevenues} />
        </TabsContent>
        <TabsContent value="payouts">
          <PayoutsList payouts={data.recentPayouts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PeriodCard({ title, period, accent }: { title: string; period: FinancePeriod; accent: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${accent}`}>
              <CalendarRange className="w-4 h-4 text-white" />
            </div>
            <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
          </div>
          <Badge variant="outline">{period.count} item{period.count === 1 ? '' : 's'}</Badge>
        </div>
        <div className="text-3xl font-bold text-slate-900">{fmt(period.earned)}</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-emerald-50 text-emerald-800 rounded px-2 py-1.5">
            <div className="uppercase tracking-wide opacity-70">Done</div>
            <div className="font-semibold">{fmt(period.paid)}</div>
          </div>
          <div className="bg-amber-50 text-amber-800 rounded px-2 py-1.5">
            <div className="uppercase tracking-wide opacity-70">Left</div>
            <div className="font-semibold">{fmt(period.pending)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Tile({ icon: Icon, tint, label, value, sub }: { icon: any; tint: string; label: string; value: string; sub?: string }) {
  // tint is a Tailwind color stem (slate / emerald / amber)
  const tintClasses: Record<string, { bg: string; ring: string; text: string }> = {
    slate:   { bg: 'bg-slate-50',   ring: 'ring-slate-200',   text: 'text-slate-700'   },
    emerald: { bg: 'bg-emerald-50', ring: 'ring-emerald-100', text: 'text-emerald-600' },
    amber:   { bg: 'bg-amber-50',   ring: 'ring-amber-100',   text: 'text-amber-600'   },
  };
  const t = tintClasses[tint] || tintClasses.slate;
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
        {sub && <div className="text-[11px] text-slate-400 truncate mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function TrendChart({ trend }: { trend: FinanceData['trend'] }) {
  const max = Math.max(1, ...trend.map((t) => t.earned));
  return (
    <div className="grid grid-cols-6 gap-3 items-end h-44">
      {trend.map((t) => {
        const earnedH = Math.round((t.earned / max) * 100);
        const paidH = Math.round((t.paid / max) * 100);
        return (
          <div key={t.month} className="flex flex-col items-center gap-1">
            <div className="text-[10px] text-slate-500 font-medium">{fmt(t.earned)}</div>
            <div className="w-full h-32 flex items-end gap-1">
              <div
                className="flex-1 bg-blue-200 rounded-t"
                style={{ height: `${earnedH}%` }}
                title={`Earned ${fmt(t.earned)}`}
              />
              <div
                className="flex-1 bg-emerald-500 rounded-t"
                style={{ height: `${paidH}%` }}
                title={`Paid ${fmt(t.paid)}`}
              />
            </div>
            <div className="text-xs text-slate-600">{monthLabel(t.month)}</div>
          </div>
        );
      })}
    </div>
  );
}

function RevenuesList({ revenues }: { revenues: RevenueLine[] }) {
  if (!revenues.length) {
    return <Card><CardContent className="p-8 text-center text-sm text-slate-500">No revenue lines in the last 6 months.</CardContent></Card>;
  }
  return (
    <div className="space-y-1.5">
      {revenues.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-slate-50 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 truncate">
                {r.patientName || 'Patient'} {r.mrn && <span className="text-xs text-slate-500">• MRN {r.mrn}</span>}
              </div>
              <div className="text-xs text-slate-500">
                {r.revenueType} • {r.invoiceType || 'invoice'} • {fmtDateTime(r.createdAt)}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-slate-900">{fmt(r.shareAmount)}</div>
              <Badge variant={r.status === 'paid' ? 'default' : r.status === 'approved' ? 'secondary' : 'outline'}>
                {r.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PayoutsList({ payouts }: { payouts: PayoutLine[] }) {
  if (!payouts.length) {
    return <Card><CardContent className="p-8 text-center text-sm text-slate-500">No payouts processed yet.</CardContent></Card>;
  }
  return (
    <div className="space-y-1.5">
      {payouts.map((p) => (
        <Card key={p.id}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-50 flex items-center justify-center">
              <Banknote className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 truncate">
                {p.payoutNumber}
                <span className="text-xs text-slate-500 ml-2">
                  {fmtDate(p.fromDate)} – {fmtDate(p.toDate)}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {p.paymentMode}{p.paymentReference ? ` • Ref ${p.paymentReference}` : ''} • Paid {fmtDate(p.paymentDate)}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-emerald-700">{fmt(p.netAmount)}</div>
              {p.deductions > 0 && (
                <div className="text-[11px] text-slate-500">
                  Share {fmt(p.totalShare)} − Ded {fmt(p.deductions)}
                </div>
              )}
              <Badge variant={p.status === 'cancelled' ? 'outline' : 'default'}>{p.status}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
