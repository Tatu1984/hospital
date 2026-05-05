// Patient detail screen for the doctor app. Loads demographics +
// recent encounters in parallel so the doctor sees a quick chart-style
// summary before tapping into a specific visit.
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { MotiView } from 'moti';
import { ChevronLeft, Phone, Mail, Cake, Droplet, AlertTriangle, MapPin, ClipboardList, Stethoscope } from 'lucide-react-native';
import { patientsAPI } from '@/lib/api';

interface PatientDetail {
  id: string;
  mrn: string;
  name: string;
  dob: string | null;
  gender: string | null;
  contact: string | null;
  email: string | null;
  address: string | null;
  bloodGroup: string | null;
  allergies: string | null;
  emergencyContact: string | null;
}

interface EncounterRow {
  id: string;
  type: string;
  visitDate: string;
  chiefComplaint: string | null;
  doctor?: { name?: string };
  status: string;
}

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [encounters, setEncounters] = useState<EncounterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.allSettled([patientsAPI.byId(id), patientsAPI.encounters(id)])
      .then(([p, e]) => {
        if (p.status === 'fulfilled') setPatient(p.value.data);
        else setError('Could not load patient.');
        if (e.status === 'fulfilled') setEncounters(e.value.data || []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  function callPhone(num: string) {
    const url = `tel:${num.replace(/[^\d+]/g, '')}`;
    Linking.canOpenURL(url).then((ok) => ok ? Linking.openURL(url) : Alert.alert('Cannot place call'));
  }

  function calcAge(dob: string | null) {
    if (!dob) return null;
    const d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#14b8a6" />
      </SafeAreaView>
    );
  }

  if (!patient) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <Text className="text-slate-500">{error || 'Patient not found.'}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 px-4 py-2 bg-primary-600 rounded-xl">
          <Text className="text-white font-medium">Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const age = calcAge(patient.dob);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="px-4 py-3 bg-white border-b border-slate-200 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2"><ChevronLeft color="#0f172a" size={24} /></TouchableOpacity>
        <Text className="flex-1 text-base font-semibold text-slate-900">Patient</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Header card */}
        <MotiView from={{ opacity: 0, translateY: 6 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 250 }}>
          <View className="bg-white rounded-2xl p-5"
            style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}>
            <View className="flex-row items-center">
              <View className="w-14 h-14 rounded-full bg-primary-50 items-center justify-center">
                <Text className="text-primary-700 font-bold text-lg">{(patient.name || '?').slice(0, 2).toUpperCase()}</Text>
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-lg font-bold text-slate-900">{patient.name}</Text>
                <View className="flex-row items-center mt-0.5">
                  <Text className="text-xs text-slate-500">MRN {patient.mrn}</Text>
                  {age != null && <Text className="text-xs text-slate-400 ml-2">• {age}y</Text>}
                  {patient.gender && <Text className="text-xs text-slate-400 ml-2">• {patient.gender}</Text>}
                </View>
              </View>
            </View>

            <View className="flex-row mt-4 gap-2">
              {patient.contact && (
                <TouchableOpacity onPress={() => callPhone(patient.contact!)} className="flex-1 bg-primary-600 rounded-xl py-2.5 items-center flex-row justify-center">
                  <Phone color="white" size={14} />
                  <Text className="text-white font-medium ml-2 text-sm">Call</Text>
                </TouchableOpacity>
              )}
              {patient.email && (
                <TouchableOpacity onPress={() => Linking.openURL(`mailto:${patient.email}`).catch(() => undefined)} className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 items-center flex-row justify-center">
                  <Mail color="#475569" size={14} />
                  <Text className="text-slate-700 font-medium ml-2 text-sm">Email</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </MotiView>

        {/* Vitals/quick info chips */}
        <View className="flex-row flex-wrap mt-4 gap-2">
          {patient.bloodGroup && <Chip icon={Droplet} color="#dc2626" label="Blood" value={patient.bloodGroup} />}
          {patient.dob && <Chip icon={Cake} color="#7c3aed" label="DOB" value={new Date(patient.dob).toLocaleDateString()} />}
        </View>

        {/* Allergies — call this out clearly */}
        {patient.allergies && (
          <MotiView from={{ opacity: 0, translateY: 4 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 250, delay: 50 }}>
            <View className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex-row">
              <AlertTriangle color="#dc2626" size={18} />
              <View className="ml-2 flex-1">
                <Text className="text-xs uppercase tracking-wide font-semibold text-red-700">Allergies</Text>
                <Text className="text-sm text-red-900 mt-0.5">{patient.allergies}</Text>
              </View>
            </View>
          </MotiView>
        )}

        {/* Address */}
        {patient.address && (
          <View className="mt-4 bg-white rounded-xl p-4 flex-row items-start">
            <MapPin color="#64748b" size={16} />
            <Text className="ml-2 flex-1 text-sm text-slate-700">{patient.address}</Text>
          </View>
        )}

        {/* Emergency contact */}
        {patient.emergencyContact && (
          <View className="mt-2 bg-white rounded-xl p-4">
            <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1">Emergency contact</Text>
            <Text className="text-sm text-slate-700">{patient.emergencyContact}</Text>
          </View>
        )}

        {/* Recent encounters */}
        <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mt-6 mb-2">
          Recent visits ({encounters.length})
        </Text>
        {encounters.length === 0 ? (
          <View className="bg-white rounded-xl p-4 flex-row items-center">
            <ClipboardList color="#cbd5e1" size={18} />
            <Text className="ml-2 text-sm text-slate-500">No prior visits on record.</Text>
          </View>
        ) : (
          encounters.map((e, idx) => (
            <MotiView key={e.id} from={{ opacity: 0, translateY: 4 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 200, delay: idx * 20 }}>
              <View className="bg-white rounded-xl p-4 mb-2 flex-row">
                <View className="w-9 h-9 rounded-xl bg-primary-50 items-center justify-center">
                  <Stethoscope color="#14b8a6" size={16} />
                </View>
                <View className="flex-1 ml-3">
                  <View className="flex-row items-center">
                    <Text className="text-xs text-slate-500">{new Date(e.visitDate).toLocaleDateString()}</Text>
                    <Text className="text-xs text-slate-400 ml-2">• {e.type}</Text>
                    <Text className="text-xs text-slate-400 ml-2">• {e.status}</Text>
                  </View>
                  <Text className="font-medium text-slate-900 mt-0.5" numberOfLines={2}>
                    {e.chiefComplaint || 'No chief complaint recorded'}
                  </Text>
                  {e.doctor?.name && <Text className="text-xs text-slate-500 mt-0.5">Seen by {e.doctor.name}</Text>}
                </View>
              </View>
            </MotiView>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value: string }) {
  return (
    <View className="flex-row items-center bg-white border border-slate-200 rounded-full px-3 py-1.5">
      <Icon color={color} size={12} />
      <Text className="text-xs text-slate-500 ml-1">{label}:</Text>
      <Text className="text-xs font-semibold text-slate-900 ml-1">{value}</Text>
    </View>
  );
}
