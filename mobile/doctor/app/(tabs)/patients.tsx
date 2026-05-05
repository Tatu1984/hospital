// Patient search + list. Calls /api/patients with the optional `search`
// query so the doctor can find anyone by name or MRN. Tap → patient detail
// at /patient/[id] (registered in the root stack).
import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Search, User, ChevronRight, Phone } from 'lucide-react-native';
import { router } from 'expo-router';
import { patientsAPI } from '@/lib/api';

interface PatientRow {
  id: string;
  mrn: string;
  name: string;
  contact: string | null;
  email: string | null;
  gender: string | null;
  bloodGroup: string | null;
  dob: string | null;
}

export default function PatientsScreen() {
  const [items, setItems] = useState<PatientRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Debounce the search call so every keystroke doesn't fire a request.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string) => {
    setError(null);
    try {
      const res = await patientsAPI.list({ search: q || undefined, limit: 50 });
      setItems(res.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Could not load patients.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(''); }, [load]);

  function onSearchChange(v: string) {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { void load(v); }, 250);
  }

  function calcAge(dob: string | null) {
    if (!dob) return null;
    const d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    const ms = Date.now() - d.getTime();
    return Math.floor(ms / (365.25 * 24 * 3600 * 1000));
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="px-4 pt-2 pb-3">
        <Text className="text-2xl font-bold text-slate-900">Patients</Text>
        <Text className="text-sm text-slate-500 mt-0.5">
          {loading ? 'Loading…' : `${items.length} patient${items.length === 1 ? '' : 's'}`}
        </Text>

        <View className="mt-3 flex-row items-center bg-white rounded-xl px-3 py-2.5 border border-slate-200">
          <Search color="#94a3b8" size={18} />
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search by name or MRN"
            className="flex-1 ml-2 text-base text-slate-900"
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(search); }} />}
      >
        {error && (
          <View className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <Text className="text-sm text-amber-800">{error}</Text>
          </View>
        )}

        {loading && items.length === 0 && (
          <View className="mt-12 items-center"><ActivityIndicator color="#14b8a6" /></View>
        )}

        {!loading && items.length === 0 && !error && (
          <View className="mt-12 items-center">
            <User color="#cbd5e1" size={48} />
            <Text className="text-slate-400 mt-2">{search ? 'No patients match.' : 'No patients yet.'}</Text>
          </View>
        )}

        {items.map((p, idx) => {
          const age = calcAge(p.dob);
          return (
            <MotiView
              key={p.id}
              from={{ opacity: 0, translateY: 6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 200, delay: idx * 20 }}
            >
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/patient/[id]', params: { id: p.id } })}
                className="bg-white rounded-2xl p-4 mb-2 flex-row items-center"
                style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}
              >
                <View className="w-11 h-11 rounded-full bg-primary-50 items-center justify-center">
                  <Text className="text-primary-700 font-bold text-base">{(p.name || '?').slice(0, 2).toUpperCase()}</Text>
                </View>
                <View className="flex-1 ml-3">
                  <Text className="font-semibold text-slate-900" numberOfLines={1}>{p.name}</Text>
                  <View className="flex-row items-center mt-0.5">
                    <Text className="text-xs text-slate-500">MRN {p.mrn}</Text>
                    {age != null && <Text className="text-xs text-slate-400 ml-2">• {age}y</Text>}
                    {p.gender && <Text className="text-xs text-slate-400 ml-2">• {p.gender}</Text>}
                    {p.bloodGroup && <Text className="text-xs font-semibold text-red-600 ml-2">{p.bloodGroup}</Text>}
                  </View>
                  {p.contact && (
                    <View className="flex-row items-center mt-1">
                      <Phone color="#94a3b8" size={11} />
                      <Text className="text-xs text-slate-500 ml-1">{p.contact}</Text>
                    </View>
                  )}
                </View>
                <ChevronRight color="#cbd5e1" size={18} />
              </TouchableOpacity>
            </MotiView>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
