// Bills tab. Filters the unified reports timeline down to invoices only.
// A future iteration will add Razorpay checkout for outstanding balances —
// the backend already has the schema columns + webhook verification, just
// needs the order-create endpoint and the RN Razorpay SDK on this screen.
import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Receipt, ChevronRight } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { reportsAPI } from '@/lib/api';

interface Invoice {
  id: string;
  category: 'invoice';
  title: string;
  date: string;
  status: string;
  summary: string;
}

export default function BillsScreen() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await reportsAPI.listMine();
      setItems((res.data || []).filter((i: any) => i.category === 'invoice'));
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Could not load bills.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { void load(); }, []);
  useFocusEffect(useCallback(() => { void load(); }, []));

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  const outstanding = items.filter((i) => i.status === 'pending' || i.status === 'partial');
  const paid = items.filter((i) => !outstanding.includes(i));

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
      >
        <Text className="text-2xl font-bold text-slate-900">Bills</Text>
        <Text className="text-sm text-slate-500 mt-0.5">
          {outstanding.length > 0
            ? `${outstanding.length} outstanding • ${paid.length} paid`
            : `All ${items.length} bills paid`}
        </Text>

        {error && (
          <View className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <Text className="text-sm text-amber-800">{error}</Text>
          </View>
        )}

        {items.length === 0 && !error && (
          <View className="mt-12 items-center">
            <Receipt color="#cbd5e1" size={48} />
            <Text className="text-slate-400 mt-2">No bills on file.</Text>
          </View>
        )}

        {outstanding.length > 0 && (
          <>
            <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mt-6 mb-2">Outstanding</Text>
            {outstanding.map((bill, idx) => (
              <BillCard key={bill.id} bill={bill} delay={idx * 30} highlight />
            ))}
          </>
        )}

        {paid.length > 0 && (
          <>
            <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mt-6 mb-2">Paid</Text>
            {paid.map((bill, idx) => (
              <BillCard key={bill.id} bill={bill} delay={idx * 30} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BillCard({ bill, delay = 0, highlight }: { bill: Invoice; delay?: number; highlight?: boolean }) {
  return (
    <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 250, delay }}>
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/report/[category]/[id]', params: { category: 'invoice', id: bill.id } })}
        className={`rounded-2xl p-4 mb-2 flex-row items-center ${highlight ? 'bg-amber-50 border border-amber-200' : 'bg-white'}`}
        style={!highlight ? { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 } : undefined}
      >
        <View className={`w-10 h-10 rounded-xl items-center justify-center ${highlight ? 'bg-amber-500' : 'bg-slate-400'}`}>
          <Receipt color="white" size={18} />
        </View>
        <View className="flex-1 ml-3">
          <Text className="font-semibold text-slate-900">{bill.title}</Text>
          <Text className="text-xs text-slate-500 mt-0.5">{new Date(bill.date).toLocaleDateString()}</Text>
          <Text className={`text-sm font-medium mt-1 ${highlight ? 'text-amber-700' : 'text-slate-700'}`}>{bill.summary}</Text>
        </View>
        <ChevronRight color="#cbd5e1" size={18} />
      </TouchableOpacity>
    </MotiView>
  );
}
