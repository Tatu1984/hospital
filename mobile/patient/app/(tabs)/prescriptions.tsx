// Health Records timeline. Replaces the original prescriptions stub —
// renamed conceptually to "Records" in the tab bar while keeping the
// route file name (prescriptions.tsx) so we don't have to rewire the
// tabs layout. Lists every lab order, radiology order, prescription,
// and invoice the patient owns, sorted reverse-chronologically.
import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { FileText, Activity, Pill, Receipt, ChevronRight, FlaskConical, Scan } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { reportsAPI } from '@/lib/api';

interface ReportItem {
  id: string;
  category: 'lab' | 'radiology' | 'prescription' | 'invoice' | 'visit';
  title: string;
  date: string;
  status: string;
  summary: string;
}

const CATEGORY_META: Record<ReportItem['category'], { label: string; color: string; icon: any }> = {
  lab: { label: 'Lab', color: 'bg-blue-500', icon: FlaskConical },
  radiology: { label: 'Imaging', color: 'bg-purple-500', icon: Scan },
  prescription: { label: 'Rx', color: 'bg-emerald-500', icon: Pill },
  invoice: { label: 'Bill', color: 'bg-amber-500', icon: Receipt },
  visit: { label: 'Visit', color: 'bg-slate-500', icon: Activity },
};

export default function HealthRecordsScreen() {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | ReportItem['category']>('all');

  async function load() {
    try {
      const res = await reportsAPI.listMine();
      setItems(res.data || []);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Could not load your records.');
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

  const filtered = filter === 'all' ? items : items.filter((i) => i.category === filter);

  const filterChips: Array<{ key: 'all' | ReportItem['category']; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'lab', label: 'Lab' },
    { key: 'radiology', label: 'Imaging' },
    { key: 'prescription', label: 'Rx' },
    { key: 'invoice', label: 'Bills' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="px-4 pt-2 pb-3">
        <Text className="text-2xl font-bold text-slate-900">Health Records</Text>
        <Text className="text-sm text-slate-500 mt-0.5">
          {items.length} record{items.length === 1 ? '' : 's'} on file
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
      >
        {filterChips.map((c) => {
          const active = c.key === filter;
          return (
            <TouchableOpacity
              key={c.key}
              onPress={() => setFilter(c.key)}
              className={`mr-2 rounded-full px-4 py-1.5 ${active ? 'bg-primary-600' : 'bg-white border border-slate-200'}`}
            >
              <Text className={active ? 'text-white text-sm font-medium' : 'text-slate-700 text-sm'}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
      >
        {error && (
          <View className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <Text className="text-sm text-amber-800">{error}</Text>
          </View>
        )}

        {filtered.length === 0 && !error && (
          <View className="mt-12 items-center">
            <FileText color="#cbd5e1" size={48} />
            <Text className="text-slate-400 mt-2">No records yet.</Text>
          </View>
        )}

        {filtered.map((item, idx) => {
          const meta = CATEGORY_META[item.category];
          const Icon = meta.icon;
          return (
            <MotiView
              key={`${item.category}-${item.id}`}
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 250, delay: idx * 30 }}
            >
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/report/[category]/[id]', params: { category: item.category, id: item.id } })}
                className="bg-white rounded-2xl p-4 mb-2 flex-row items-center"
                style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}
              >
                <View className={`w-10 h-10 rounded-xl items-center justify-center ${meta.color}`}>
                  <Icon color="white" size={18} />
                </View>
                <View className="flex-1 ml-3">
                  <View className="flex-row items-center">
                    <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-2">{meta.label}</Text>
                    <Text className="text-xs text-slate-400">{new Date(item.date).toLocaleDateString()}</Text>
                  </View>
                  <Text className="font-semibold text-slate-900 mt-0.5" numberOfLines={1}>{item.title}</Text>
                  <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>{item.summary}</Text>
                </View>
                <ChevronRight color="#cbd5e1" size={18} />
              </TouchableOpacity>
            </MotiView>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
