// About — app metadata + support contacts. Most fields are static; the
// version is read from the bundled app.json via expo-constants.

import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import Constants from 'expo-constants';
import {
  ArrowLeft,
  Stethoscope,
  Mail,
  Phone,
  Globe,
  ExternalLink,
} from 'lucide-react-native';

export default function AboutScreen() {
  const version = Constants.expoConfig?.version || '1.0.0';
  const sdkVersion = Constants.expoConfig?.sdkVersion || '52';
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://hospital-c3k5.vercel.app';

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center px-4 py-3 border-b border-slate-200 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ArrowLeft color="#0f172a" size={22} />
        </TouchableOpacity>
        <Text className="ml-2 text-lg font-bold text-slate-900">About</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="bg-white rounded-2xl p-5 items-center">
          <View className="w-16 h-16 rounded-2xl bg-blue-50 items-center justify-center">
            <Stethoscope color="#2563eb" size={28} />
          </View>
          <Text className="mt-3 text-xl font-bold text-slate-900">HospitalPro Patient</Text>
          <Text className="text-xs text-slate-500 mt-1">Your hospital, in your pocket</Text>
          <Text className="text-xs text-slate-400 mt-2">Version {version} · Expo SDK {sdkVersion}</Text>
        </View>

        <Text className="text-xs uppercase tracking-wide text-slate-500 mt-5 mb-2">
          Support
        </Text>
        <Row
          icon={<Mail color="#0284c7" size={18} />}
          tint="bg-sky-50"
          label="Email support"
          value="support@hospitalpro.io"
          onPress={() => Linking.openURL('mailto:support@hospitalpro.io')}
        />
        <Row
          icon={<Phone color="#059669" size={18} />}
          tint="bg-emerald-50"
          label="24×7 helpdesk"
          value="+91 80 4567 8900"
          onPress={() => Linking.openURL('tel:+918045678900')}
        />
        <Row
          icon={<Globe color="#7c3aed" size={18} />}
          tint="bg-purple-50"
          label="Website"
          value="hospitalpro.io"
          onPress={() => Linking.openURL('https://hospitalpro.io')}
        />

        <Text className="text-xs uppercase tracking-wide text-slate-500 mt-5 mb-2">
          Legal
        </Text>
        <Row
          icon={<ExternalLink color="#475569" size={18} />}
          tint="bg-slate-100"
          label="Privacy policy"
          onPress={() => Linking.openURL('https://hospitalpro.io/privacy')}
        />
        <Row
          icon={<ExternalLink color="#475569" size={18} />}
          tint="bg-slate-100"
          label="Terms of service"
          onPress={() => Linking.openURL('https://hospitalpro.io/terms')}
        />

        <Text className="text-xs uppercase tracking-wide text-slate-500 mt-5 mb-2">
          Connection
        </Text>
        <View className="bg-white rounded-2xl p-4">
          <Text className="text-xs text-slate-500">API endpoint</Text>
          <Text className="text-xs font-mono text-slate-700 mt-1" numberOfLines={1}>
            {apiUrl}
          </Text>
        </View>

        <Text className="text-center text-[10px] text-slate-400 mt-8">
          © 2026 HospitalPro. Built with care for healthcare.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
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
