// Ambulance booking — self-service version of the staff dispatch console
// (frontend/src/pages/Ambulance.tsx). Same trip-type/urgency vocabulary.
// POSTs to /api/mobile/v1/ambulance/trips (backend/src/modules/ambulance),
// which is separate from the staff-only /api/ambulance/* routes.

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { ArrowLeft, Siren, MapPin, Clock } from 'lucide-react-native';
import { ambulanceAPI } from '@/lib/api';

const TRIP_TYPES: { value: 'EMERGENCY' | 'TRANSFER' | 'DISCHARGE' | 'ROUTINE'; label: string }[] = [
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'TRANSFER', label: 'Inter-hospital transfer' },
  { value: 'DISCHARGE', label: 'Discharge transport' },
  { value: 'ROUTINE', label: 'Routine transport' },
];
const URGENCIES: { value: 'HIGH' | 'MEDIUM' | 'LOW'; label: string }[] = [
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

interface Trip {
  id: string;
  status: string;
  tripType: string;
  pickupLocation: string;
  dropLocation: string;
  vehicleNumber: string;
  driverName: string | null;
  driverContact: string | null;
  startTime: string;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending' },
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'On the way' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Completed' },
};

export default function AmbulanceScreen() {
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [tripType, setTripType] = useState<typeof TRIP_TYPES[number]['value']>('EMERGENCY');
  const [urgency, setUrgency] = useState<typeof URGENCIES[number]['value']>('HIGH');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);

  const loadTrips = useCallback(async () => {
    try {
      const r = await ambulanceAPI.listMine();
      setTrips(r.data?.trips || []);
    } catch {
      /* keep stale */
    } finally {
      setLoadingTrips(false);
    }
  }, []);

  useEffect(() => {
    loadTrips().catch(() => undefined);
  }, [loadTrips]);

  async function onSubmit() {
    if (!pickup.trim() || !drop.trim()) {
      Alert.alert('Missing details', 'Pickup and drop locations are both required.');
      return;
    }
    setBusy(true);
    try {
      await ambulanceAPI.book({
        pickupLocation: pickup.trim(),
        dropLocation: drop.trim(),
        tripType,
        urgency,
        notes: notes.trim() || null,
      });
      setPickup('');
      setDrop('');
      setNotes('');
      Alert.alert('Request sent', 'Dispatch has been notified. We\'ll update the status here.');
      loadTrips().catch(() => undefined);
    } catch (e: any) {
      Alert.alert('Could not send request', e?.response?.data?.error || 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center px-4 py-3 border-b border-slate-200 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ArrowLeft color="#0f1729" size={22} />
        </TouchableOpacity>
        <Text className="ml-2 text-lg font-bold text-slate-900 flex-1">Ambulance</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <View className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 mb-4 flex-row">
            <Siren color="#dc2828" size={18} />
            <Text className="ml-2 flex-1 text-sm text-slate-700">
              For life-threatening emergencies, also call your local emergency number — this request
              is routed to hospital dispatch and may take a few minutes to be picked up.
            </Text>
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-3">
              New request
            </Text>

            <Field label="Pickup location" value={pickup} onChange={setPickup} placeholder="Where should we come?" />
            <Field label="Drop location" value={drop} onChange={setDrop} placeholder="Destination" />

            <Text className="text-sm font-medium text-slate-700 mb-2">Trip type</Text>
            <ChipRow options={TRIP_TYPES} value={tripType} onChange={setTripType} />

            <Text className="text-sm font-medium text-slate-700 mb-2">Urgency</Text>
            <ChipRow options={URGENCIES} value={urgency} onChange={setUrgency} />

            <Field label="Notes (optional)" value={notes} onChange={setNotes} placeholder="Anything dispatch should know" multiline />

            <TouchableOpacity
              disabled={busy}
              onPress={onSubmit}
              className={`rounded-xl py-4 items-center mt-2 ${busy ? 'bg-destructive/60' : 'bg-destructive'}`}
            >
              {busy ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Request ambulance</Text>}
            </TouchableOpacity>
          </View>

          <Text className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">
            Your requests
          </Text>
          {loadingTrips ? (
            <ActivityIndicator color="#0f1729" />
          ) : trips.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center">
              <Text className="text-slate-500 text-center">No ambulance requests yet.</Text>
            </View>
          ) : (
            trips.map((t) => <TripCard key={t.id} t={t} />)
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TripCard({ t }: { t: Trip }) {
  const style = STATUS_STYLE[t.status] || { bg: 'bg-slate-100', text: 'text-slate-700', label: t.status };
  return (
    <View className="bg-white rounded-2xl p-4 mb-2">
      <View className="flex-row items-center justify-between">
        <View className={`px-2 py-1 rounded-full ${style.bg}`}>
          <Text className={`text-xs font-semibold ${style.text}`}>{style.label}</Text>
        </View>
        <Text className="text-xs text-slate-400">{new Date(t.startTime).toLocaleString()}</Text>
      </View>
      <View className="flex-row items-start mt-3">
        <MapPin color="#64748b" size={14} />
        <Text className="ml-2 text-sm text-slate-800 flex-1">{t.pickupLocation} → {t.dropLocation}</Text>
      </View>
      <View className="flex-row items-center mt-1.5">
        <Clock color="#64748b" size={14} />
        <Text className="ml-2 text-xs text-slate-500">{t.tripType.replace('_', ' ')}</Text>
      </View>
      {t.vehicleNumber !== 'UNASSIGNED' && (
        <Text className="text-xs text-slate-500 mt-1.5">
          Vehicle {t.vehicleNumber}{t.driverName ? ` · ${t.driverName}` : ''}
        </Text>
      )}
    </View>
  );
}

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2 mb-4">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`px-3 py-2 rounded-lg border ${active ? 'bg-primary-600 border-primary-600' : 'bg-white border-slate-300'}`}
          >
            <Text className={active ? 'text-white text-sm font-medium' : 'text-slate-700 text-sm'}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-slate-700 mb-1">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        className="border border-slate-300 rounded-xl px-4 py-3 text-base bg-white text-slate-900"
        style={multiline ? { minHeight: 70, textAlignVertical: 'top' } : undefined}
      />
    </View>
  );
}
