// IPD ward round screen. Lists currently-admitted patients (Admission rows
// with status='active'). Tap → patient detail. A future iteration adds
// inline progress-note + new-orders entry from this screen.
import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { BedDouble, ChevronRight, ClipboardList } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { patientsAPI } from '@/lib/api';

interface AdmissionRow {
  id: string;
  patientId: string;
  admissionDate: string;
  status: string;
  diagnosis?: string | null;
  patient?: { id: string; name: string; mrn: string };
  bed?: { bedNumber?: string; category?: string };
  admittingDoctor?: { name?: string };
}

export default function RoundsScreen() {
  const [items, setItems] = useState<AdmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await patientsAPI.admissions({ status: 'active' });
      setItems(res.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Could not load admissions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function lengthOfStay(admissionDate: string) {
    const ms = Date.now() - new Date(admissionDate).getTime();
    const days = Math.floor(ms / (24 * 3600 * 1000));
    return `${days}d`;
  }

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
        <Text className="text-2xl font-bold text-slate-900">IPD rounds</Text>
        <Text className="text-sm text-slate-500 mt-0.5">
          {items.length} active admission{items.length === 1 ? '' : 's'}
        </Text>

        {error && (
          <View className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <Text className="text-sm text-amber-800">{error}</Text>
          </View>
        )}

        {items.length === 0 && !error && (
          <View className="mt-12 items-center">
            <ClipboardList color="#cbd5e1" size={48} />
            <Text className="text-slate-400 mt-2">No active admissions on the floor.</Text>
          </View>
        )}

        {items.map((a, idx) => (
          <MotiView
            key={a.id}
            from={{ opacity: 0, translateY: 6 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 200, delay: idx * 30 }}
          >
            <TouchableOpacity
              onPress={() => a.patient && router.push({ pathname: '/patient/[id]', params: { id: a.patient.id } })}
              className="mt-3 bg-white rounded-2xl p-4 flex-row items-center"
              style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}
            >
              <View className="w-12 h-12 rounded-xl bg-primary-50 items-center justify-center">
                <BedDouble color="#14b8a6" size={20} />
                {a.bed?.bedNumber && (
                  <Text className="text-[10px] text-primary-700 font-bold mt-0.5">{a.bed.bedNumber}</Text>
                )}
              </View>
              <View className="flex-1 ml-3">
                <Text className="font-semibold text-slate-900" numberOfLines={1}>{a.patient?.name || 'Unknown patient'}</Text>
                <View className="flex-row items-center mt-0.5">
                  <Text className="text-xs text-slate-500">MRN {a.patient?.mrn || '—'}</Text>
                  <Text className="text-xs text-slate-400 ml-2">• Day {lengthOfStay(a.admissionDate)}</Text>
                  {a.bed?.category && <Text className="text-xs text-slate-400 ml-2">• {a.bed.category}</Text>}
                </View>
                {a.diagnosis && (
                  <Text className="text-xs text-slate-600 mt-1" numberOfLines={1}>Dx: {a.diagnosis}</Text>
                )}
                {a.admittingDoctor?.name && (
                  <Text className="text-xs text-slate-500 mt-0.5">Under {a.admittingDoctor.name}</Text>
                )}
              </View>
              <ChevronRight color="#cbd5e1" size={18} />
            </TouchableOpacity>
          </MotiView>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
