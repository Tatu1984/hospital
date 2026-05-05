// My appointments — list of upcoming + past with cancel action and a CTA
// to book a new one. Tapping "Book new" pushes /book inside the same stack.
import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Plus, Calendar, X, ChevronRight } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { appointmentsAPI } from '@/lib/api';

interface Appointment {
  id: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  type: string;
  status: string;
  reason: string | null;
}

export default function AppointmentsScreen() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await appointmentsAPI.listMine();
      setItems(res.data || []);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Could not load appointments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Refresh when this tab regains focus — e.g. after returning from /book.
  useFocusEffect(useCallback(() => { void load(); }, []));

  useEffect(() => { void load(); }, []);

  async function onCancel(id: string) {
    Alert.alert('Cancel appointment?', 'You can book a new one any time.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await appointmentsAPI.cancel(id);
            await load();
          } catch (e: any) {
            Alert.alert('Could not cancel', e?.response?.data?.error || 'Try again.');
          }
        },
      },
    ]);
  }

  const now = Date.now();
  const upcoming = items.filter((a) => a.status === 'scheduled' && new Date(a.appointmentDate).getTime() >= now - 24 * 3600_000);
  const past = items.filter((a) => !upcoming.includes(a));

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-slate-900">Appointments</Text>
          <TouchableOpacity onPress={() => router.push('/book')} className="bg-primary-600 rounded-full px-4 py-2 flex-row items-center">
            <Plus color="white" size={16} />
            <Text className="text-white font-semibold ml-1">Book</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <Text className="text-sm text-amber-800">{error}</Text>
          </View>
        )}

        {upcoming.length === 0 && past.length === 0 && !error && (
          <View className="mt-12 items-center">
            <Calendar color="#cbd5e1" size={48} />
            <Text className="text-slate-400 mt-2">No appointments yet.</Text>
            <TouchableOpacity onPress={() => router.push('/book')} className="mt-4 bg-primary-600 rounded-xl px-6 py-3">
              <Text className="text-white font-semibold">Book your first appointment</Text>
            </TouchableOpacity>
          </View>
        )}

        {upcoming.length > 0 && (
          <>
            <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mt-6 mb-2">Upcoming</Text>
            {upcoming.map((a, idx) => (
              <Card key={a.id} appointment={a} onCancel={() => onCancel(a.id)} delay={idx * 40} cancellable />
            ))}
          </>
        )}

        {past.length > 0 && (
          <>
            <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mt-6 mb-2">Past</Text>
            {past.map((a, idx) => (
              <Card key={a.id} appointment={a} delay={idx * 40} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ appointment, onCancel, delay = 0, cancellable }: { appointment: Appointment; onCancel?: () => void; delay?: number; cancellable?: boolean }) {
  const date = new Date(appointment.appointmentDate);
  const dateLabel = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay }}>
      <View
        className="bg-white rounded-2xl p-4 mb-2 flex-row items-center"
        style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}
      >
        <View className="w-14 items-center">
          <Text className="text-xs text-slate-500">{date.toLocaleDateString(undefined, { month: 'short' })}</Text>
          <Text className="text-2xl font-bold text-slate-900">{date.getDate()}</Text>
        </View>
        <View className="flex-1 ml-3">
          <Text className="font-semibold text-slate-900">{appointment.doctorName}</Text>
          <Text className="text-xs text-slate-500 mt-0.5">{appointment.appointmentTime} • {appointment.type}{appointment.status === 'cancelled' ? ' • cancelled' : ''}</Text>
          {appointment.reason && <Text className="text-xs text-slate-400 mt-0.5" numberOfLines={1}>{appointment.reason}</Text>}
        </View>
        {cancellable && onCancel ? (
          <TouchableOpacity onPress={onCancel} className="p-2"><X color="#ef4444" size={18} /></TouchableOpacity>
        ) : (
          <ChevronRight color="#cbd5e1" size={18} />
        )}
      </View>
    </MotiView>
  );
}
