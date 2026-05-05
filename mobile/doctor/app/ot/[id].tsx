// In-OT stage updater for surgeons. Mirrors the web dialog's behaviour:
//   1. Tap a stage → POST /api/surgeries/:id/stage → fan-out SMS to family.
//   2. List of registered family contacts (read-only here; coordinators add
//      from the web before/at start of surgery).
//   3. Reverse-chronological timeline.
//
// Optimised for the realistic context: surgeon's gloved-up assistant or a
// circulating nurse holds a phone/tablet in the OT. Big tap targets, no
// nested modals, optimistic UI (the stepper updates before the API call
// returns).
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { CheckCircle2, ChevronLeft, RefreshCw, Phone } from 'lucide-react-native';
import { otAPI } from '@/lib/api';

interface SurgeryStage { code: string; label: string; familyLabel: string; terminal?: boolean; }
interface StageEvent { id: string; stage: string; note: string | null; recordedAt: string; }
interface FamilyContact { id: string; name: string; relation: string; phone: string; }

export default function OTStageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [stages, setStages] = useState<SurgeryStage[]>([]);
  const [events, setEvents] = useState<StageEvent[]>([]);
  const [contacts, setContacts] = useState<FamilyContact[]>([]);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyStage, setBusyStage] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    try {
      const [sRes, hRes, cRes] = await Promise.all([
        stages.length ? Promise.resolve({ data: stages }) : otAPI.stages(),
        otAPI.history(id),
        otAPI.familyContacts(id),
      ]);
      if (!stages.length) setStages(sRes.data);
      setEvents(hRes.data || []);
      setContacts(cRes.data || []);
      const lastEvent = hRes.data?.[hRes.data.length - 1];
      if (lastEvent) setCurrentStage(lastEvent.stage);
    } catch (e: any) {
      Alert.alert('Could not load surgery', e?.response?.data?.error || 'Try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { void load(); }, [id]);

  async function recordStage(code: string) {
    if (!id) return;
    setBusyStage(code);
    // Optimistic: highlight the new stage immediately. If the API call
    // fails we roll back and surface the error.
    const prevStage = currentStage;
    setCurrentStage(code);
    try {
      const res = await otAPI.postStage(id, code);
      const count = res.data?.notifiedFamilyCount ?? 0;
      Alert.alert('Stage recorded', count > 0 ? `${count} family contact${count === 1 ? '' : 's'} notified.` : 'No family contacts registered yet.');
      await load();
    } catch (e: any) {
      setCurrentStage(prevStage);
      Alert.alert('Could not record stage', e?.response?.data?.error || 'Try again.');
    } finally {
      setBusyStage(null);
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#14b8a6" />
      </SafeAreaView>
    );
  }

  const currentIdx = stages.findIndex((s) => s.code === currentStage);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="px-4 py-3 bg-white border-b border-slate-200 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2"><ChevronLeft color="#0f172a" size={24} /></TouchableOpacity>
        <Text className="flex-1 text-base font-semibold text-slate-900">OT live status</Text>
        <TouchableOpacity onPress={() => { setRefreshing(true); void load(); }} className="p-2 -mr-2"><RefreshCw color="#64748b" size={20} /></TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
      >
        <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">Stage</Text>
        <View>
          {stages.map((s, idx) => {
            const isCurrent = s.code === currentStage;
            const isPast = currentIdx > -1 && idx < currentIdx;
            return (
              <TouchableOpacity
                key={s.code}
                disabled={busyStage !== null}
                onPress={() => recordStage(s.code)}
                className={`mb-2 rounded-xl p-4 flex-row items-center ${
                  isCurrent ? 'bg-primary-600' : isPast ? 'bg-white border border-slate-200' : 'bg-white border border-slate-200'
                }`}
              >
                {isPast && <CheckCircle2 color="#10b981" size={18} />}
                <Text className={`flex-1 ml-2 font-medium ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                  {s.label}
                </Text>
                {busyStage === s.code && <ActivityIndicator size="small" color={isCurrent ? '#fff' : '#14b8a6'} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mt-6 mb-2">Family contacts ({contacts.length})</Text>
        {contacts.length === 0 ? (
          <View className="bg-white rounded-xl p-4">
            <Text className="text-sm text-slate-500">No family contacts. The OT coordinator can add them from the web portal.</Text>
          </View>
        ) : (
          contacts.map((c) => (
            <View key={c.id} className="bg-white rounded-xl p-4 mb-2 flex-row items-center">
              <View className="flex-1">
                <Text className="font-medium text-slate-900">{c.name} <Text className="text-xs text-slate-500">({c.relation})</Text></Text>
                <Text className="text-sm text-slate-600 mt-0.5">{c.phone}</Text>
              </View>
              <Phone color="#14b8a6" size={18} />
            </View>
          ))
        )}

        <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mt-6 mb-2">Timeline</Text>
        {events.length === 0 ? (
          <View className="bg-white rounded-xl p-4"><Text className="text-sm text-slate-500">No stages recorded yet.</Text></View>
        ) : (
          events.map((e) => {
            const meta = stages.find((s) => s.code === e.stage);
            return (
              <View key={e.id} className="bg-white rounded-xl p-4 mb-2">
                <Text className="text-xs text-slate-500">{new Date(e.recordedAt).toLocaleTimeString()}</Text>
                <Text className="font-medium text-slate-900 mt-0.5">{meta?.label || e.stage}</Text>
                {e.note && <Text className="text-sm text-slate-600 mt-1">{e.note}</Text>}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
