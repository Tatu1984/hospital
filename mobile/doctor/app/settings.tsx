// Settings — local-only preferences for now (notifications enable/disable,
// biometric unlock toggle). When the backend exposes a notifications
// preference endpoint we'll persist these server-side. For v1 we just
// store toggles in SecureStore so they survive app reinstalls on the same
// device.

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  ArrowLeft,
  Bell,
  Fingerprint,
  Globe,
  Smartphone,
  Trash2,
} from 'lucide-react-native';

const KEY_PUSH_ENABLED = 'pref.push.enabled';
const KEY_BIO_ENABLED = 'pref.biometric.enabled';

export default function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    void (async () => {
      const [p, b, hw, enrolled] = await Promise.all([
        SecureStore.getItemAsync(KEY_PUSH_ENABLED),
        SecureStore.getItemAsync(KEY_BIO_ENABLED),
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      setPushEnabled(p !== '0');
      setBioEnabled(b === '1');
      setBioAvailable(hw && enrolled);
    })();
  }, []);

  async function setPush(v: boolean) {
    setPushEnabled(v);
    await SecureStore.setItemAsync(KEY_PUSH_ENABLED, v ? '1' : '0');
  }

  async function setBio(v: boolean) {
    if (v && !bioAvailable) {
      Alert.alert(
        'Biometric not available',
        'Set up Touch ID / Face ID / fingerprint in your device settings first.',
      );
      return;
    }
    setBioEnabled(v);
    await SecureStore.setItemAsync(KEY_BIO_ENABLED, v ? '1' : '0');
  }

  async function clearCache() {
    Alert.alert(
      'Clear cached data?',
      'This removes cached schedule, patient lists, and other local data. You will need to re-fetch from the server. Sign-in is preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            // Clear non-auth keys only. Auth keys live in 'auth.access' /
            // 'auth.refresh' which we deliberately preserve.
            const keys = ['cache.schedule', 'cache.patients', 'cache.dashboard'];
            await Promise.all(keys.map((k) => SecureStore.deleteItemAsync(k).catch(() => undefined)));
            Alert.alert('Done', 'Cached data cleared.');
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center px-4 py-3 border-b border-slate-200 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ArrowLeft color="#0f172a" size={22} />
        </TouchableOpacity>
        <Text className="ml-2 text-lg font-bold text-slate-900">Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text className="text-xs uppercase tracking-wide text-slate-500 mb-2">
          Notifications
        </Text>
        <ToggleRow
          icon={<Bell color="#0284c7" size={18} />}
          tint="bg-sky-50"
          label="Push notifications"
          sub="New patient alerts, OT updates, critical lab results"
          value={pushEnabled}
          onChange={setPush}
        />

        <Text className="text-xs uppercase tracking-wide text-slate-500 mt-5 mb-2">
          Security
        </Text>
        <ToggleRow
          icon={<Fingerprint color="#7c3aed" size={18} />}
          tint="bg-purple-50"
          label="Unlock with biometrics"
          sub={
            bioAvailable
              ? 'Use Face ID / Touch ID / fingerprint to skip password'
              : 'Not available on this device'
          }
          value={bioEnabled}
          onChange={setBio}
          disabled={!bioAvailable}
        />

        <Text className="text-xs uppercase tracking-wide text-slate-500 mt-5 mb-2">
          App
        </Text>
        <RowButton
          icon={<Globe color="#475569" size={18} />}
          tint="bg-slate-100"
          label="Language"
          value="English (system default)"
          onPress={() => Alert.alert('Coming soon', 'Hindi and regional languages are on the roadmap.')}
        />
        <RowButton
          icon={<Smartphone color="#475569" size={18} />}
          tint="bg-slate-100"
          label="Device & app info"
          value="View details"
          onPress={() => router.push('/about')}
        />
        <RowButton
          icon={<Trash2 color="#dc2626" size={18} />}
          tint="bg-red-50"
          label="Clear cached data"
          value="Free up space"
          onPress={clearCache}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({
  icon,
  tint,
  label,
  sub,
  value,
  onChange,
  disabled,
}: {
  icon: React.ReactNode;
  tint: string;
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View className="bg-white rounded-2xl p-4 mb-2 flex-row items-center">
      <View className={`w-9 h-9 rounded-xl ${tint} items-center justify-center mr-3`}>
        {icon}
      </View>
      <View className="flex-1">
        <Text className="font-medium text-slate-900">{label}</Text>
        <Text className="text-xs text-slate-500 mt-0.5">{sub}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} />
    </View>
  );
}

function RowButton({
  icon,
  tint,
  label,
  value,
  onPress,
}: {
  icon: React.ReactNode;
  tint: string;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-2xl p-4 mb-2 flex-row items-center"
    >
      <View className={`w-9 h-9 rounded-xl ${tint} items-center justify-center mr-3`}>
        {icon}
      </View>
      <View className="flex-1">
        <Text className="font-medium text-slate-900">{label}</Text>
        {value && <Text className="text-xs text-slate-500 mt-0.5">{value}</Text>}
      </View>
    </TouchableOpacity>
  );
}
