// Home dashboard. Single network call to /api/mobile/v1/patients/me which
// aggregates everything we need into one payload.
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Calendar, Pill, Receipt, Radio, ChevronRight } from 'lucide-react-native';
import { patientsAPI } from '@/lib/api';

interface HomeData {
  patient: { id: string; mrn: string; name: string };
  upcomingAppointment: { id: string; doctorName: string; appointmentDate: string; appointmentTime: string; type: string } | null;
  latestPrescriptionId: string | null;
  outstandingBillTotal: number;
  outstandingBillCount: number;
  activeAdmissionId: string | null;
  activeSurgeryTrackerTokens: string[];
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://hospital-c3k5.vercel.app';

export default function HomeScreen() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await patientsAPI.getMyHome();
      setData(res.data);
      setError(null);
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
        <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
          <Text className="text-sm text-slate-500">Welcome back</Text>
          <Text className="text-2xl font-bold text-slate-900">{data?.patient.name || 'Patient'}</Text>
          <Text className="text-xs text-slate-400 mt-1">MRN: {data?.patient.mrn}</Text>
        </MotiView>

        {error && (
          <View className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <Text className="text-sm text-amber-800">{error}</Text>
          </View>
        )}

        {data?.activeSurgeryTrackerTokens && data.activeSurgeryTrackerTokens.length > 0 && (
          <DashboardCard
            delay={50}
            tone="urgent"
            icon={<Radio color="white" size={20} />}
            title="Surgery in progress"
            subtitle="Tap to follow live status"
            onPress={() => Linking.openURL(`${API_URL}/track/${data.activeSurgeryTrackerTokens[0]}`).catch(() => undefined)}
          />
        )}

        <DashboardCard
          delay={100}
          icon={<Calendar color="white" size={20} />}
          title={data?.upcomingAppointment ? 'Upcoming appointment' : 'No upcoming appointment'}
          subtitle={data?.upcomingAppointment
            ? `${data.upcomingAppointment.doctorName} • ${new Date(data.upcomingAppointment.appointmentDate).toLocaleDateString()} ${data.upcomingAppointment.appointmentTime}`
            : 'Tap to book one'}
          onPress={() => undefined}
        />

        <DashboardCard
          delay={150}
          icon={<Pill color="white" size={20} />}
          title="Latest prescription"
          subtitle={data?.latestPrescriptionId ? 'Tap to view' : 'No prescriptions yet'}
          onPress={() => undefined}
          disabled={!data?.latestPrescriptionId}
        />

        <DashboardCard
          delay={200}
          icon={<Receipt color="white" size={20} />}
          title={data && data.outstandingBillCount > 0 ? `Outstanding bills (${data.outstandingBillCount})` : 'No outstanding bills'}
          subtitle={data && data.outstandingBillTotal > 0 ? `₹${data.outstandingBillTotal.toLocaleString()}` : 'You\'re all caught up'}
          onPress={() => undefined}
          disabled={!data || data.outstandingBillCount === 0}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

interface DashboardCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  delay?: number;
  disabled?: boolean;
  tone?: 'default' | 'urgent';
}

function DashboardCard({ icon, title, subtitle, onPress, delay = 0, disabled, tone = 'default' }: DashboardCardProps) {
  const bg = tone === 'urgent' ? 'bg-orange-500' : 'bg-primary-600';
  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300, delay }}
    >
      <TouchableOpacity
        disabled={disabled}
        onPress={onPress}
        className={`mt-3 bg-white rounded-2xl p-4 flex-row items-center ${disabled ? 'opacity-60' : ''}`}
        style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}
      >
        <View className={`w-10 h-10 rounded-xl items-center justify-center ${bg}`}>{icon}</View>
        <View className="flex-1 ml-3">
          <Text className="font-semibold text-slate-900">{title}</Text>
          <Text className="text-xs text-slate-500 mt-0.5">{subtitle}</Text>
        </View>
        {!disabled && <ChevronRight color="#94a3b8" size={18} />}
      </TouchableOpacity>
    </MotiView>
  );
}
