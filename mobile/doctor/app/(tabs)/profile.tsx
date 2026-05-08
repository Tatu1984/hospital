// Profile tab — doctor's account hub. Surfaces identity card plus
// navigation tiles for Earnings, Settings, Change Password, About,
// then sign-out at the bottom. Doctor's clinical profile (qualifications,
// specialty, departments) lives in the user.profile JSON on the backend
// — surfaced via the dashboard endpoint and shown here as read-only.

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  LogOut,
  Wallet,
  Settings,
  KeyRound,
  Info,
  ChevronRight,
  Stethoscope,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { doctorAPI } from '@/lib/api';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [doctorMeta, setDoctorMeta] = useState<{
    name: string;
    qualifications: string | null;
    specialization: string | null;
    departments: string[];
    displaySubtitle: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Already chains .catch — no `void` operator needed.
    doctorAPI
      .myDashboard()
      .then((r) => setDoctorMeta(r.data?.doctor || null))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  function onLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout().catch(() => undefined) },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text className="text-2xl font-bold text-slate-900 mb-4">Profile</Text>

        {/* Identity card */}
        <View className="bg-white rounded-2xl p-5">
          <View className="flex-row items-center">
            <View className="w-14 h-14 rounded-full bg-teal-50 items-center justify-center">
              <Stethoscope color="#14b8a6" size={22} />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-lg font-bold text-slate-900">
                {doctorMeta?.name || user?.name || '—'}
              </Text>
              {(doctorMeta?.displaySubtitle || doctorMeta?.specialization) && (
                <Text className="text-sm text-slate-500 mt-0.5">
                  {doctorMeta?.displaySubtitle || doctorMeta?.specialization}
                </Text>
              )}
              {user?.email && <Text className="text-xs text-slate-400 mt-0.5">{user.email}</Text>}
            </View>
            {loading && <ActivityIndicator size="small" color="#14b8a6" />}
          </View>

          {doctorMeta && (doctorMeta.qualifications || doctorMeta.departments.length > 0) && (
            <View className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              {doctorMeta.qualifications && (
                <Row label="Qualifications" value={doctorMeta.qualifications} />
              )}
              {doctorMeta.departments.length > 0 && (
                <Row label="Department" value={doctorMeta.departments.join(', ')} />
              )}
              {doctorMeta.specialization && (
                <Row label="Specialization" value={doctorMeta.specialization} />
              )}
            </View>
          )}
        </View>

        {/* Action tiles */}
        <View className="mt-4 bg-white rounded-2xl overflow-hidden">
          <Tile
            icon={<Wallet color="#059669" size={18} />}
            tint="bg-emerald-50"
            label="My Earnings"
            sub="Daily, weekly, monthly payout"
            onPress={() => router.push('/finance')}
          />
          <Divider />
          <Tile
            icon={<Settings color="#475569" size={18} />}
            tint="bg-slate-100"
            label="Settings"
            sub="Notifications, preferences"
            onPress={() => router.push('/settings')}
          />
          <Divider />
          <Tile
            icon={<KeyRound color="#7c3aed" size={18} />}
            tint="bg-purple-50"
            label="Change password"
            sub="Update your sign-in password"
            onPress={() => router.push('/change-password')}
          />
          <Divider />
          <Tile
            icon={<Info color="#0284c7" size={18} />}
            tint="bg-sky-50"
            label="About"
            sub="App version, support"
            onPress={() => router.push('/about')}
          />
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={onLogout}
          className="mt-4 bg-white rounded-2xl p-4 flex-row items-center"
        >
          <LogOut color="#dc2626" size={20} />
          <Text className="ml-3 font-semibold text-red-600">Sign out</Text>
        </TouchableOpacity>

        <Text className="text-center text-xs text-slate-400 mt-6">
          HospitalPro Doctor · v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row">
      <Text className="text-xs uppercase tracking-wide text-slate-500 w-28">{label}</Text>
      <Text className="flex-1 text-sm text-slate-800" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function Tile({
  icon,
  tint,
  label,
  sub,
  onPress,
}: {
  icon: React.ReactNode;
  tint: string;
  label: string;
  sub?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} className="flex-row items-center px-4 py-3.5">
      <View className={`w-9 h-9 rounded-xl ${tint} items-center justify-center mr-3`}>
        {icon}
      </View>
      <View className="flex-1">
        <Text className="font-medium text-slate-900">{label}</Text>
        {sub && <Text className="text-xs text-slate-500 mt-0.5">{sub}</Text>}
      </View>
      <ChevronRight color="#cbd5e1" size={18} />
    </TouchableOpacity>
  );
}

function Divider() {
  return <View className="h-px bg-slate-100 mx-4" />;
}
