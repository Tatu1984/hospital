// My Earnings — doctor's personal finance / payout view. Mirrors the web
// DoctorFinance page. One backend call returns today / week / month
// aggregates, lifetime totals, 6-month trend, and recent revenue +
// payout history. Accessed from the Profile tab.

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import {
  ArrowLeft,
  Wallet,
  CheckCircle2,
  Clock,
  CalendarRange,
  TrendingUp,
  Receipt,
  Banknote,
} from 'lucide-react-native';
import { doctorAPI } from '@/lib/api';

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

const fmt = (n: number) =>
  `₹${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
};
const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: 'short',
    year: '2-digit',
  });
};

export default function DoctorFinanceScreen() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const r = await doctorAPI.myFinance();
      setData(r.data);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load earnings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator color="#14b8a6" />
        <Text className="mt-2 text-slate-500">Loading earnings…</Text>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Text className="text-red-600 text-center">{error || 'No data'}</Text>
        <TouchableOpacity
          onPress={() => {
            setLoading(true);
            load().catch(() => undefined);
          }}
          className="mt-4 bg-teal-600 px-6 py-3 rounded-2xl"
        >
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center px-4 py-3 border-b border-slate-200 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ArrowLeft color="#0f172a" size={22} />
        </TouchableOpacity>
        <Text className="ml-2 text-lg font-bold text-slate-900">My Earnings</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load().catch(() => undefined);
            }}
            tintColor="#14b8a6"
          />
        }
      >
        {/* Contract banner */}
        <View className="bg-white rounded-2xl p-4 mb-3">
          <Text className="text-xs uppercase tracking-wide text-slate-500">Contract</Text>
          {data.contract ? (
            <Text className="mt-1 font-medium text-slate-800">
              {data.contract.contractNumber} •{' '}
              {data.contract.revenueShareType.replace(/_/g, ' ')} {data.contract.revenueShareValue}% •{' '}
              paid {data.contract.paymentCycle}
            </Text>
          ) : (
            <Text className="mt-1 text-slate-500 italic">
              No revenue-share contract on file. Contact admin to set one up.
            </Text>
          )}
        </View>

        {/* Period cards */}
        <PeriodCard title="Today" period={data.today} accent="bg-blue-500" />
        <PeriodCard title="This week" period={data.week} accent="bg-emerald-500" />
        <PeriodCard title="This month" period={data.month} accent="bg-purple-500" />

        {/* Lifetime tiles */}
        <Text className="mt-4 mb-2 text-xs uppercase tracking-wide text-slate-500">
          Lifetime
        </Text>
        <View className="flex-row gap-2">
          <Tile
            icon={<Wallet color="white" size={18} />}
            tint="bg-slate-700"
            label="Earned"
            value={fmt(data.lifetime.earned)}
          />
          <Tile
            icon={<CheckCircle2 color="white" size={18} />}
            tint="bg-emerald-600"
            label="Paid out"
            value={fmt(data.lifetime.paid)}
          />
          <Tile
            icon={<Clock color="white" size={18} />}
            tint="bg-amber-500"
            label="Pending"
            value={fmt(data.lifetime.pending)}
          />
        </View>

        {/* Trend */}
        <View className="mt-4 bg-white rounded-2xl p-4">
          <View className="flex-row items-center mb-3">
            <TrendingUp color="#2563eb" size={16} />
            <Text className="ml-2 font-semibold text-slate-900">Last 6 months</Text>
          </View>
          <TrendChart trend={data.trend} />
        </View>

        {/* Recent revenues */}
        <Text className="mt-5 mb-2 font-semibold text-slate-900">
          Recent earnings ({data.recentRevenues.length})
        </Text>
        {data.recentRevenues.length === 0 ? (
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-center text-slate-500 text-sm">
              No revenue lines in the last 6 months.
            </Text>
          </View>
        ) : (
          data.recentRevenues.slice(0, 20).map((r) => (
            <View
              key={r.id}
              className="bg-white rounded-2xl p-3 mb-1.5 flex-row items-center"
            >
              <View className="w-9 h-9 rounded-md bg-slate-100 items-center justify-center mr-3">
                <Receipt color="#475569" size={16} />
              </View>
              <View className="flex-1">
                <Text className="font-medium text-slate-900" numberOfLines={1}>
                  {r.patientName || 'Patient'}
                  {r.mrn ? ` · MRN ${r.mrn}` : ''}
                </Text>
                <Text className="text-xs text-slate-500" numberOfLines={1}>
                  {r.revenueType} · {r.invoiceType || 'invoice'} · {fmtDateTime(r.createdAt)}
                </Text>
              </View>
              <View className="items-end ml-2">
                <Text className="font-semibold text-slate-900">{fmt(r.shareAmount)}</Text>
                <Text
                  className={`text-[10px] uppercase ${
                    r.status === 'paid'
                      ? 'text-emerald-700'
                      : r.status === 'approved'
                      ? 'text-blue-700'
                      : 'text-slate-500'
                  }`}
                >
                  {r.status}
                </Text>
              </View>
            </View>
          ))
        )}

        {/* Payout history */}
        <Text className="mt-5 mb-2 font-semibold text-slate-900">
          Payout history ({data.recentPayouts.length})
        </Text>
        {data.recentPayouts.length === 0 ? (
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-center text-slate-500 text-sm">
              No payouts processed yet.
            </Text>
          </View>
        ) : (
          data.recentPayouts.map((p) => (
            <View
              key={p.id}
              className="bg-white rounded-2xl p-3 mb-1.5 flex-row items-center"
            >
              <View className="w-9 h-9 rounded-md bg-emerald-50 items-center justify-center mr-3">
                <Banknote color="#059669" size={16} />
              </View>
              <View className="flex-1">
                <Text className="font-medium text-slate-900" numberOfLines={1}>
                  {p.payoutNumber}
                </Text>
                <Text className="text-xs text-slate-500" numberOfLines={1}>
                  {fmtDate(p.fromDate)} – {fmtDate(p.toDate)} · {p.paymentMode}
                </Text>
              </View>
              <View className="items-end ml-2">
                <Text className="font-semibold text-emerald-700">{fmt(p.netAmount)}</Text>
                <Text className="text-[10px] uppercase text-slate-500">{p.status}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PeriodCard({
  title,
  period,
  accent,
}: {
  title: string;
  period: FinancePeriod;
  accent: string;
}) {
  return (
    <View className="bg-white rounded-2xl p-4 mb-2">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <View className={`w-8 h-8 rounded-md ${accent} items-center justify-center mr-2`}>
            <CalendarRange color="white" size={16} />
          </View>
          <Text className="text-xs uppercase tracking-wide text-slate-500">{title}</Text>
        </View>
        <Text className="text-xs text-slate-400">
          {period.count} item{period.count === 1 ? '' : 's'}
        </Text>
      </View>
      <Text className="text-3xl font-bold text-slate-900">{fmt(period.earned)}</Text>
      <View className="flex-row gap-2 mt-2">
        <View className="flex-1 bg-emerald-50 rounded px-2 py-1.5">
          <Text className="text-[10px] uppercase tracking-wide text-emerald-700/80">Done</Text>
          <Text className="text-sm font-semibold text-emerald-800">{fmt(period.paid)}</Text>
        </View>
        <View className="flex-1 bg-amber-50 rounded px-2 py-1.5">
          <Text className="text-[10px] uppercase tracking-wide text-amber-700/80">Left</Text>
          <Text className="text-sm font-semibold text-amber-800">{fmt(period.pending)}</Text>
        </View>
      </View>
    </View>
  );
}

function Tile({
  icon,
  tint,
  label,
  value,
}: {
  icon: React.ReactNode;
  tint: string;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 bg-white rounded-2xl p-3">
      <View className={`w-9 h-9 rounded-xl ${tint} items-center justify-center mb-2`}>
        {icon}
      </View>
      <Text className="text-[10px] uppercase tracking-wide text-slate-500">{label}</Text>
      <Text className="text-base font-bold text-slate-900 mt-0.5">{value}</Text>
    </View>
  );
}

function TrendChart({ trend }: { trend: FinanceData['trend'] }) {
  const max = Math.max(1, ...trend.map((t) => t.earned));
  return (
    <View className="flex-row items-end justify-between h-32 gap-1">
      {trend.map((t) => {
        const earnedH = Math.max(2, Math.round((t.earned / max) * 100));
        const paidH = Math.max(2, Math.round((t.paid / max) * 100));
        return (
          <View key={t.month} className="flex-1 items-center">
            <View className="flex-1 w-full flex-row items-end gap-0.5 px-0.5">
              <View
                className="flex-1 bg-blue-200 rounded-t"
                style={{ height: `${earnedH}%` }}
              />
              <View
                className="flex-1 bg-emerald-500 rounded-t"
                style={{ height: `${paidH}%` }}
              />
            </View>
            <Text className="text-[10px] text-slate-500 mt-1">{monthLabel(t.month)}</Text>
          </View>
        );
      })}
    </View>
  );
}
