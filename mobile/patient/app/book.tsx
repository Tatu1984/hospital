// Book new appointment. Three-step flow on a single screen so the user
// always sees where they are: pick doctor → pick date → pick slot. The
// final action posts to /api/mobile/v1/appointments and routes back to the
// appointments tab where the new entry shows up via the focus refresh.
import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Stethoscope, CalendarDays } from 'lucide-react-native';
import { MotiView } from 'moti';
import { appointmentsAPI } from '@/lib/api';

interface DoctorOption { id: string; name: string; speciality: string | null; }

export default function BookScreen() {
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await appointmentsAPI.doctors();
        setDoctors(res.data || []);
      } catch (e: any) {
        Alert.alert('Could not load doctors', e?.response?.data?.error || 'Try again.');
      } finally {
        setLoadingDoctors(false);
      }
    })();
  }, []);

  // Next 7 days as date chips. Future iteration: a real calendar picker.
  const upcomingDates = useMemo(() => {
    const out: { iso: string; label: string; sub: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + i);
      out.push({
        iso: d.toISOString().slice(0, 10),
        label: i === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' }),
        sub: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      });
    }
    return out;
  }, []);

  useEffect(() => {
    if (!doctorId || !date) {
      setSlots(null);
      setTime(null);
      return;
    }
    setLoadingSlots(true);
    appointmentsAPI.slots(doctorId, date)
      .then((res) => setSlots(res.data?.slots || []))
      .catch((e) => Alert.alert('Could not load slots', e?.response?.data?.error || 'Try again.'))
      .finally(() => setLoadingSlots(false));
    setTime(null);
  }, [doctorId, date]);

  async function onConfirm() {
    if (!doctorId || !date || !time) return;
    setBusy(true);
    try {
      await appointmentsAPI.book({
        doctorId,
        appointmentDate: date,
        appointmentTime: time,
        type: 'consultation',
        reason: reason.trim() || undefined,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Booking failed', e?.response?.data?.error || 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="px-4 py-3 bg-white border-b border-slate-200 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2"><ChevronLeft color="#0f172a" size={24} /></TouchableOpacity>
        <Text className="flex-1 text-base font-semibold text-slate-900">Book appointment</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        {/* Step 1 — doctor */}
        <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">1. Choose doctor</Text>
        {loadingDoctors ? (
          <ActivityIndicator color="#2563eb" />
        ) : doctors.length === 0 ? (
          <View className="bg-white rounded-xl p-4">
            <Text className="text-sm text-slate-500">No doctors available right now.</Text>
          </View>
        ) : (
          doctors.map((d) => {
            const selected = doctorId === d.id;
            return (
              <TouchableOpacity
                key={d.id}
                onPress={() => setDoctorId(d.id)}
                className={`rounded-xl p-4 mb-2 flex-row items-center ${selected ? 'bg-primary-600' : 'bg-white'}`}
              >
                <Stethoscope color={selected ? 'white' : '#2563eb'} size={20} />
                <View className="flex-1 ml-3">
                  <Text className={`font-semibold ${selected ? 'text-white' : 'text-slate-900'}`}>{d.name}</Text>
                  {d.speciality && <Text className={`text-xs mt-0.5 ${selected ? 'text-white/80' : 'text-slate-500'}`}>{d.speciality}</Text>}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Step 2 — date */}
        {doctorId && (
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 250 }}>
            <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mt-6 mb-2">2. Pick date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {upcomingDates.map((d) => {
                const selected = d.iso === date;
                return (
                  <TouchableOpacity
                    key={d.iso}
                    onPress={() => setDate(d.iso)}
                    className={`mr-2 rounded-xl px-4 py-3 items-center ${selected ? 'bg-primary-600' : 'bg-white'}`}
                  >
                    <Text className={`text-xs ${selected ? 'text-white/80' : 'text-slate-500'}`}>{d.label}</Text>
                    <Text className={`font-semibold mt-0.5 ${selected ? 'text-white' : 'text-slate-900'}`}>{d.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </MotiView>
        )}

        {/* Step 3 — slot */}
        {doctorId && date && (
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 250 }}>
            <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mt-6 mb-2">3. Pick a slot</Text>
            {loadingSlots ? (
              <ActivityIndicator color="#2563eb" />
            ) : slots && slots.length === 0 ? (
              <View className="bg-white rounded-xl p-4">
                <Text className="text-sm text-slate-500">No slots available on this day. Try another date.</Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap">
                {(slots || []).map((s) => {
                  const selected = s === time;
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setTime(s)}
                      className={`mr-2 mb-2 rounded-xl px-4 py-2 ${selected ? 'bg-primary-600' : 'bg-white border border-slate-200'}`}
                    >
                      <Text className={selected ? 'text-white font-semibold' : 'text-slate-900'}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </MotiView>
        )}

        {/* Reason */}
        {doctorId && date && time && (
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 250 }}>
            <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mt-6 mb-2">Reason (optional)</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="What is this visit for?"
              multiline
              numberOfLines={3}
              className="bg-white border border-slate-200 rounded-xl p-4 text-base"
              style={{ textAlignVertical: 'top', minHeight: 80 }}
            />
          </MotiView>
        )}
      </ScrollView>

      {doctorId && date && time && (
        <View className="absolute left-0 right-0 bottom-0 bg-white border-t border-slate-200 p-4">
          <TouchableOpacity
            disabled={busy}
            onPress={onConfirm}
            className={`rounded-xl py-4 items-center ${busy ? 'bg-primary-600/60' : 'bg-primary-600'}`}
          >
            <Text className="text-white font-semibold text-base">{busy ? 'Booking…' : 'Confirm appointment'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
