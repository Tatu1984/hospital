// Profile tab — patient's account hub. Shows demographics, allergies,
// emergency contact, with a quick-edit launcher. Tiles below for
// Settings, Change Password, and About. Sign-out at the bottom.

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  LogOut,
  User,
  Pencil,
  Settings,
  KeyRound,
  Info,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Cake,
  Droplet,
  AlertTriangle,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { patientsAPI } from '@/lib/api';

interface PatientProfile {
  id: string;
  mrn: string;
  name: string;
  dob: string | null;
  gender: string | null;
  bloodGroup: string | null;
  contact: string | null;
  email: string | null;
  address: string | null;
  allergies: string | null;
  emergencyContact: string | null;
}

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
};

export default function PatientProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    try {
      const r = await patientsAPI.getMyHome();
      setProfile(r.data?.patient || null);
    } catch {
      /* keep stale */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Refresh when returning from /edit-profile so the new values show.
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  function onLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void reload();
            }}
          />
        }
      >
        <Text className="text-2xl font-bold text-slate-900 mb-4">Profile</Text>

        {/* Identity card */}
        <View className="bg-white rounded-2xl p-5">
          <View className="flex-row items-center">
            <View className="w-14 h-14 rounded-full bg-blue-50 items-center justify-center">
              <User color="#2563eb" size={22} />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-lg font-bold text-slate-900">
                {profile?.name || user?.name || '—'}
              </Text>
              {profile?.mrn && (
                <Text className="text-xs text-slate-500 mt-0.5">MRN {profile.mrn}</Text>
              )}
              <Text className="text-xs text-slate-400 mt-0.5">{user?.email}</Text>
            </View>
            {loading && <ActivityIndicator size="small" color="#2563eb" />}
            {profile && (
              <TouchableOpacity
                onPress={() => router.push('/edit-profile')}
                className="ml-2 bg-blue-50 rounded-lg p-2"
              >
                <Pencil color="#2563eb" size={16} />
              </TouchableOpacity>
            )}
          </View>

          {profile && (
            <View className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              {profile.dob && <Row icon={Cake} label="DOB" value={`${fmtDate(profile.dob)}${profile.gender ? ` · ${profile.gender}` : ''}`} />}
              {profile.bloodGroup && <Row icon={Droplet} label="Blood group" value={profile.bloodGroup} color="#dc2626" />}
              {profile.contact && <Row icon={Phone} label="Phone" value={profile.contact} />}
              {profile.email && <Row icon={Mail} label="Email" value={profile.email} />}
              {profile.address && <Row icon={MapPin} label="Address" value={profile.address} />}
              {profile.emergencyContact && (
                <Row icon={Phone} label="Emergency" value={profile.emergencyContact} color="#ea580c" />
              )}
            </View>
          )}
        </View>

        {/* Allergies banner — visually distinct because clinically critical */}
        {profile?.allergies && (
          <View className="mt-3 bg-red-50 border border-red-200 rounded-2xl p-4 flex-row">
            <AlertTriangle color="#dc2626" size={18} />
            <View className="ml-2 flex-1">
              <Text className="text-xs uppercase tracking-wide font-semibold text-red-700">
                Allergies
              </Text>
              <Text className="text-sm text-red-900 mt-0.5">{profile.allergies}</Text>
            </View>
          </View>
        )}

        {/* Action tiles */}
        <View className="mt-4 bg-white rounded-2xl overflow-hidden">
          <Tile
            icon={<Pencil color="#2563eb" size={18} />}
            tint="bg-blue-50"
            label="Edit profile"
            sub="Contact, address, allergies, emergency contact"
            onPress={() => router.push('/edit-profile')}
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
          HospitalPro Patient · v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  color = '#64748b',
}: {
  icon: any;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View className="flex-row items-start">
      <Icon color={color} size={14} />
      <View className="ml-2 flex-1">
        <Text className="text-[10px] uppercase tracking-wide text-slate-500">{label}</Text>
        <Text className="text-sm text-slate-800" numberOfLines={2}>
          {value}
        </Text>
      </View>
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
