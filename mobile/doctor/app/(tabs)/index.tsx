// Today's schedule. Two parallel fetches: appointments (filtered to today)
// and surgeries. Composed into one chronological list with an explicit
// type tag so the UI can route taps appropriately.
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { CalendarDays, Stethoscope, Radio } from 'lucide-react-native';
import { router } from 'expo-router';
import { scheduleAPI } from '@/lib/api';

interface ScheduleItem {
  id: string;
  type: 'appointment' | 'surgery';
  time: string;
  patientName: string;
  subtitle: string;
  status?: string;
  surgeryId?: string;
}

export default function TodayScreen() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const [apptRes, surgRes] = await Promise.all([
        scheduleAPI.appointments({ date: todayStr }).catch(() => ({ data: [] })),
        scheduleAPI.surgeries().catch(() => ({ data: [] })),
      ]);

      const appointments: ScheduleItem[] = (apptRes.data || []).map((a: any) => ({
        id: a.id,
        type: 'appointment' as const,
        time: a.appointmentTime || '',
        patientName: a.patient?.name || a.patientName || 'Unknown patient',
        subtitle: a.type ? `${a.type} • ${a.reason || 'no reason'}` : 'consultation',
        status: a.status,
      }));

      const surgeries: ScheduleItem[] = (surgRes.data || [])
        .filter((s: any) => {
          const d = new Date(s.scheduledDate);
          return d.toISOString().slice(0, 10) === todayStr;
        })
        .map((s: any) => ({
          id: s.id,
          type: 'surgery' as const,
          time: s.scheduledTime || '',
          patientName: s.patientName || 'Unknown patient',
          subtitle: s.procedureName,
          status: s.status,
          surgeryId: s.id,
        }));

      const merged = [...appointments, ...surgeries].sort((a, b) => a.time.localeCompare(b.time));
      setItems(merged);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Could not load your schedule.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { void load(); }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#14b8a6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
      >
        <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
          <Text className="text-sm text-slate-500">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          <Text className="text-2xl font-bold text-slate-900">Today's schedule</Text>
          <Text className="text-xs text-slate-400 mt-1">{items.length} item{items.length === 1 ? '' : 's'}</Text>
        </MotiView>

        {error && (
          <View className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <Text className="text-sm text-amber-800">{error}</Text>
          </View>
        )}

        {items.length === 0 && !error && (
          <View className="mt-12 items-center">
            <CalendarDays color="#cbd5e1" size={48} />
            <Text className="text-slate-400 mt-2">No items scheduled today.</Text>
          </View>
        )}

        {items.map((item, idx) => (
          <MotiView
            key={`${item.type}-${item.id}`}
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300, delay: idx * 40 }}
          >
            <TouchableOpacity
              onPress={() => {
                if (item.type === 'surgery' && item.surgeryId) {
                  router.push({ pathname: '/ot/[id]', params: { id: item.surgeryId } });
                }
              }}
              className="mt-3 bg-white rounded-2xl p-4 flex-row items-center"
              style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}
            >
              <View className="w-14 items-center">
                <Text className="text-lg font-bold text-slate-900">{item.time}</Text>
              </View>
              <View className={`w-10 h-10 rounded-xl items-center justify-center ${item.type === 'surgery' ? 'bg-orange-500' : 'bg-primary-600'}`}>
                {item.type === 'surgery' ? <Radio color="white" size={18} /> : <Stethoscope color="white" size={18} />}
              </View>
              <View className="flex-1 ml-3">
                <Text className="font-semibold text-slate-900">{item.patientName}</Text>
                <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>{item.subtitle}</Text>
              </View>
            </TouchableOpacity>
          </MotiView>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
