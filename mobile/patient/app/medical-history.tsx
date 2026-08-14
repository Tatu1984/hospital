// Medical history — a chronological timeline built from the same
// aggregation the doctor app's patient chart uses
// (GET /api/mobile/v1/patients/me/history -> patient.service.ts getChart),
// self-scoped to the signed-in patient. Merges encounters + admissions into
// one feed, plus a dedicated diagnoses list and a doctors-visited summary.

import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { ArrowLeft, Stethoscope, BedDouble, ClipboardList, UserRound } from 'lucide-react-native';
import { patientsAPI } from '@/lib/api';

interface Encounter {
  id: string;
  type: string;
  visitDate: string;
  status: string;
  chiefComplaint: string | null;
  doctorName: string | null;
  latestNote: { assessment: string | null; plan: string | null } | null;
}
interface Admission {
  id: string;
  admissionDate: string;
  dischargeDate: string | null;
  status: string;
  diagnosis: string | null;
  wardName: string | null;
  doctorName: string | null;
}
interface Diagnosis {
  source: 'admission' | 'encounter';
  sourceId: string;
  date: string;
  doctorName: string | null;
  text: string;
}
interface DoctorVisited {
  doctorId: string | null;
  name: string;
  lastSeen: string;
  encounters: number;
}
interface HistoryDTO {
  encounters: Encounter[];
  admissions: Admission[];
  diagnoses: Diagnosis[];
  doctorsVisited: DoctorVisited[];
}

type TimelineItem =
  | { kind: 'encounter'; date: string; data: Encounter }
  | { kind: 'admission'; date: string; data: Admission };

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function MedicalHistoryScreen() {
  const [data, setData] = useState<HistoryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await patientsAPI.getMyHistory();
      setData(r.data);
    } catch {
      /* keep stale */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const timeline: TimelineItem[] = data
    ? [
        ...data.encounters.map((e): TimelineItem => ({ kind: 'encounter', date: e.visitDate, data: e })),
        ...data.admissions.map((a): TimelineItem => ({ kind: 'admission', date: a.admissionDate, data: a })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center px-4 py-3 border-b border-slate-200 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ArrowLeft color="#0f1729" size={22} />
        </TouchableOpacity>
        <Text className="ml-2 text-lg font-bold text-slate-900 flex-1">Medical history</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0f1729" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load().catch(() => undefined);
              }}
            />
          }
        >
          {data && data.doctorsVisited.length > 0 && (
            <View className="mb-4">
              <Text className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">
                Doctors you've seen
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {data.doctorsVisited.map((d) => (
                  <View key={d.doctorId || d.name} className="bg-white rounded-2xl p-3 mr-2 w-40">
                    <View className="w-8 h-8 rounded-full bg-primary-50 items-center justify-center mb-2">
                      <UserRound color="#0f1729" size={16} />
                    </View>
                    <Text className="font-semibold text-slate-900 text-sm" numberOfLines={1}>{d.name}</Text>
                    <Text className="text-xs text-slate-500 mt-0.5">
                      {d.encounters} visit{d.encounters === 1 ? '' : 's'} · last {fmtDate(d.lastSeen)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {data && data.diagnoses.length > 0 && (
            <View className="mb-4 bg-white rounded-2xl p-4">
              <Text className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">
                Diagnoses
              </Text>
              {data.diagnoses.map((dx, i) => (
                <View key={`${dx.source}-${dx.sourceId}-${i}`} className={i > 0 ? 'mt-3 pt-3 border-t border-slate-100' : ''}>
                  <Text className="text-sm text-slate-900">{dx.text}</Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    {fmtDate(dx.date)}{dx.doctorName ? ` · ${dx.doctorName}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Text className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">
            Timeline
          </Text>
          {timeline.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center">
              <ClipboardList color="#94a3b8" size={28} />
              <Text className="text-slate-500 mt-2 text-center">No visits on record yet.</Text>
            </View>
          ) : (
            timeline.map((item) =>
              item.kind === 'encounter' ? (
                <EncounterCard key={`enc-${item.data.id}`} e={item.data} />
              ) : (
                <AdmissionCard key={`adm-${item.data.id}`} a={item.data} />
              ),
            )
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function EncounterCard({ e }: { e: Encounter }) {
  return (
    <View className="bg-white rounded-2xl p-4 mb-2 flex-row">
      <View className="w-9 h-9 rounded-xl bg-primary-50 items-center justify-center mr-3">
        <Stethoscope color="#0f1729" size={16} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold text-slate-900">{e.type || 'Visit'}</Text>
          <Text className="text-xs text-slate-400">{fmtDate(e.visitDate)}</Text>
        </View>
        {e.doctorName && <Text className="text-xs text-slate-500 mt-0.5">{e.doctorName}</Text>}
        {e.chiefComplaint && <Text className="text-sm text-slate-700 mt-1.5">{e.chiefComplaint}</Text>}
        {e.latestNote?.assessment && (
          <Text className="text-xs text-slate-500 mt-1" numberOfLines={2}>
            Assessment: {e.latestNote.assessment}
          </Text>
        )}
      </View>
    </View>
  );
}

function AdmissionCard({ a }: { a: Admission }) {
  return (
    <View className="bg-white rounded-2xl p-4 mb-2 flex-row">
      <View className="w-9 h-9 rounded-xl bg-red-50 items-center justify-center mr-3">
        <BedDouble color="#dc2828" size={16} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold text-slate-900">Admission{a.wardName ? ` · ${a.wardName}` : ''}</Text>
          <Text className="text-xs text-slate-400">{fmtDate(a.admissionDate)}</Text>
        </View>
        {a.doctorName && <Text className="text-xs text-slate-500 mt-0.5">{a.doctorName}</Text>}
        {a.diagnosis && <Text className="text-sm text-slate-700 mt-1.5">{a.diagnosis}</Text>}
        <Text className="text-xs text-slate-500 mt-1">
          {a.dischargeDate ? `Discharged ${fmtDate(a.dischargeDate)}` : `Status: ${a.status}`}
        </Text>
      </View>
    </View>
  );
}
