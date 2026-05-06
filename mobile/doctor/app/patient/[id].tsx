// Patient detail / chart for the doctor app. Single backend call —
// /api/mobile/v1/patients/:id/chart — returns demographics + admissions
// + encounters + orders/results + prescriptions + surgeries + bills.
// Sections render top-to-bottom with the most actionable surfaces first
// (pending orders), then visit history, then long-tail records.

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import {
  ChevronLeft,
  Phone,
  Mail,
  Cake,
  Droplet,
  AlertTriangle,
  MapPin,
  ClipboardList,
  Stethoscope,
  FlaskConical,
  Scan,
  ChevronRight,
  CheckCircle2,
  BedDouble,
  Pill,
  Activity,
  Receipt,
} from 'lucide-react-native';
import { chartAPI } from '@/lib/api';

interface ChartPatient {
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
  photo: string | null;
  purpose: string | null;
  createdAt: string;
}
interface Admission {
  id: string;
  admissionDate: string;
  dischargeDate: string | null;
  status: string;
  diagnosis: string | null;
  bedNumber: string | null;
  wardName: string | null;
  doctorName: string | null;
}
interface Encounter {
  id: string;
  type: string;
  visitDate: string;
  status: string;
  chiefComplaint: string | null;
  doctorName: string | null;
  latestNote: any | null;
}
interface OrderResult {
  id: string;
  resultedAt: string;
  resultData: any;
  isCritical: boolean;
}
interface Order {
  id: string;
  category: string;
  orderedAt: string;
  status: string;
  priority: string;
  details: any;
  results: OrderResult[];
}
interface Prescription {
  id: string;
  issuedAt: string;
  doctorName: string | null;
  drugs: any;
}
interface Invoice {
  id: string;
  type: string;
  createdAt: string;
  status: string;
  total: number;
  paid: number;
  balance: number;
}
interface Surgery {
  id: string;
  procedureName: string;
  surgeonName: string | null;
  scheduledDate: string;
  scheduledTime: string | null;
  status: string;
  currentStage: string | null;
}
interface ChartData {
  patient: ChartPatient;
  admissions: Admission[];
  encounters: Encounter[];
  orders: Order[];
  prescriptions: Prescription[];
  invoices: Invoice[];
  surgeries: Surgery[];
}

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
};
const fmt = (n: number) => `₹${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
function calcAge(dob: string | null) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

export default function PatientChartScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    try {
      const r = await chartAPI.forPatient(id);
      setData(r.data);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Could not load patient chart.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    void reload();
  }, [id, reload]);

  // Refresh whenever the screen regains focus — covers the
  // "doctor entered a result, came back" round-trip without manual pull.
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  function callPhone(num: string) {
    const url = `tel:${num.replace(/[^\d+]/g, '')}`;
    Linking.canOpenURL(url).then((ok) => (ok ? Linking.openURL(url) : Alert.alert('Cannot place call')));
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#14b8a6" />
      </SafeAreaView>
    );
  }
  if (!data) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <Text className="text-slate-500">{error || 'Patient not found.'}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 px-4 py-2 bg-teal-600 rounded-xl">
          <Text className="text-white font-medium">Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const p = data.patient;
  const age = calcAge(p.dob);
  const activeAdmission = data.admissions.find((a) => a.status === 'active' || a.status === 'admitted');
  const upcomingSurgery = data.surgeries.find((s) => s.status !== 'completed' && s.status !== 'cancelled');
  const outstanding = data.invoices.reduce((s, i) => s + (i.balance || 0), 0);
  const pendingOrders = data.orders.filter((o) => o.status === 'pending');

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="px-4 py-3 bg-white border-b border-slate-200 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft color="#0f172a" size={24} />
        </TouchableOpacity>
        <Text className="flex-1 text-base font-semibold text-slate-900">Patient chart</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void reload();
            }}
            tintColor="#14b8a6"
          />
        }
      >
        {/* Header card */}
        <MotiView from={{ opacity: 0, translateY: 6 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 250 }}>
          <View
            className="bg-white rounded-2xl p-5"
            style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}
          >
            <View className="flex-row items-center">
              <View className="w-14 h-14 rounded-full bg-teal-50 items-center justify-center">
                <Text className="text-teal-700 font-bold text-lg">{(p.name || '?').slice(0, 2).toUpperCase()}</Text>
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-lg font-bold text-slate-900">{p.name}</Text>
                <View className="flex-row items-center mt-0.5">
                  <Text className="text-xs text-slate-500">MRN {p.mrn}</Text>
                  {age != null && <Text className="text-xs text-slate-400 ml-2">• {age}y</Text>}
                  {p.gender && <Text className="text-xs text-slate-400 ml-2">• {p.gender}</Text>}
                </View>
              </View>
            </View>

            <View className="flex-row mt-4 gap-2">
              {p.contact && (
                <TouchableOpacity onPress={() => callPhone(p.contact!)} className="flex-1 bg-teal-600 rounded-xl py-2.5 items-center flex-row justify-center">
                  <Phone color="white" size={14} />
                  <Text className="text-white font-medium ml-2 text-sm">Call</Text>
                </TouchableOpacity>
              )}
              {p.email && (
                <TouchableOpacity onPress={() => Linking.openURL(`mailto:${p.email}`).catch(() => undefined)} className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 items-center flex-row justify-center">
                  <Mail color="#475569" size={14} />
                  <Text className="text-slate-700 font-medium ml-2 text-sm">Email</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </MotiView>

        {/* Quick chips */}
        <View className="flex-row flex-wrap mt-4 gap-2">
          {p.bloodGroup && <Chip icon={Droplet} color="#dc2626" label="Blood" value={p.bloodGroup} />}
          {p.dob && <Chip icon={Cake} color="#7c3aed" label="DOB" value={fmtDate(p.dob)} />}
        </View>

        {/* Active admission banner */}
        {activeAdmission && (
          <View className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex-row">
            <BedDouble color="#059669" size={18} />
            <View className="ml-2 flex-1">
              <Text className="text-xs uppercase tracking-wide font-semibold text-emerald-700">Currently admitted</Text>
              <Text className="text-sm text-emerald-900 mt-0.5">
                {activeAdmission.wardName || 'Ward'}
                {activeAdmission.bedNumber ? ` · Bed ${activeAdmission.bedNumber}` : ''}
                {activeAdmission.doctorName ? ` · Dr. ${activeAdmission.doctorName}` : ''}
              </Text>
              <Text className="text-xs text-emerald-700">Since {fmtDate(activeAdmission.admissionDate)}</Text>
            </View>
          </View>
        )}

        {/* Allergies */}
        {p.allergies && (
          <View className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex-row">
            <AlertTriangle color="#dc2626" size={18} />
            <View className="ml-2 flex-1">
              <Text className="text-xs uppercase tracking-wide font-semibold text-red-700">Allergies</Text>
              <Text className="text-sm text-red-900 mt-0.5">{p.allergies}</Text>
            </View>
          </View>
        )}

        {/* Upcoming surgery */}
        {upcomingSurgery && (
          <View className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4 flex-row">
            <Activity color="#ea580c" size={18} />
            <View className="ml-2 flex-1">
              <Text className="text-xs uppercase tracking-wide font-semibold text-orange-700">Upcoming surgery</Text>
              <Text className="text-sm text-orange-900 mt-0.5 font-medium">{upcomingSurgery.procedureName}</Text>
              <Text className="text-xs text-orange-700 mt-0.5">
                {fmtDate(upcomingSurgery.scheduledDate)}
                {upcomingSurgery.scheduledTime ? ` · ${upcomingSurgery.scheduledTime}` : ''} · {upcomingSurgery.status}
              </Text>
            </View>
          </View>
        )}

        {/* Outstanding bills */}
        {outstanding > 0 && (
          <View className="mt-2 bg-white rounded-xl p-4 flex-row items-center">
            <Receipt color="#64748b" size={16} />
            <Text className="ml-2 text-sm text-slate-700">Outstanding balance</Text>
            <Text className="ml-auto text-sm font-semibold text-red-600">{fmt(outstanding)}</Text>
          </View>
        )}

        {/* Address */}
        {p.address && (
          <View className="mt-4 bg-white rounded-xl p-4 flex-row items-start">
            <MapPin color="#64748b" size={16} />
            <Text className="ml-2 flex-1 text-sm text-slate-700">{p.address}</Text>
          </View>
        )}

        {/* Emergency contact */}
        {p.emergencyContact && (
          <View className="mt-2 bg-white rounded-xl p-4">
            <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1">
              Emergency contact
            </Text>
            <Text className="text-sm text-slate-700">{p.emergencyContact}</Text>
          </View>
        )}

        {/* Pending orders */}
        {data.orders.length > 0 && (
          <>
            <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mt-6 mb-2">
              Orders ({pendingOrders.length} pending)
            </Text>
            {data.orders.map((o, idx) => {
              const isLab = o.category === 'lab';
              const Icon = isLab ? FlaskConical : Scan;
              const tint = isLab ? 'bg-blue-500' : 'bg-purple-500';
              const tests = (o.details?.tests || []) as Array<{ name?: string }>;
              const title = isLab
                ? tests[0]?.name
                  ? tests.length > 1
                    ? `${tests[0].name} +${tests.length - 1} more`
                    : tests[0].name
                  : 'Lab order'
                : `${o.details?.modality || 'Imaging'} ${o.details?.bodyPart || ''}`.trim();
              const hasResult = o.results.length > 0;
              return (
                <MotiView
                  key={o.id}
                  from={{ opacity: 0, translateY: 4 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 200, delay: idx * 25 }}
                >
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/order/[id]', params: { id: o.id } })}
                    className="bg-white rounded-xl p-4 mb-2 flex-row items-center"
                  >
                    <View className={`w-10 h-10 rounded-xl items-center justify-center ${tint}`}>
                      <Icon color="white" size={18} />
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className="font-medium text-slate-900" numberOfLines={1}>
                        {title}
                      </Text>
                      <View className="flex-row items-center mt-0.5">
                        <Text className="text-xs text-slate-500">{fmtDate(o.orderedAt)}</Text>
                        <Text className="text-xs text-slate-400 ml-2">· {o.priority}</Text>
                        {hasResult ? (
                          <View className="flex-row items-center ml-2">
                            <CheckCircle2 color="#10b981" size={11} />
                            <Text className="text-xs text-emerald-600 ml-0.5">Resulted</Text>
                          </View>
                        ) : (
                          <Text className="text-xs text-amber-600 ml-2 font-medium">Pending</Text>
                        )}
                      </View>
                    </View>
                    <ChevronRight color="#cbd5e1" size={18} />
                  </TouchableOpacity>
                </MotiView>
              );
            })}
          </>
        )}

        {/* Recent visits */}
        <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mt-6 mb-2">
          Recent visits ({data.encounters.length})
        </Text>
        {data.encounters.length === 0 ? (
          <View className="bg-white rounded-xl p-4 flex-row items-center">
            <ClipboardList color="#cbd5e1" size={18} />
            <Text className="ml-2 text-sm text-slate-500">No prior visits on record.</Text>
          </View>
        ) : (
          data.encounters.slice(0, 10).map((e) => (
            <View key={e.id} className="bg-white rounded-xl p-4 mb-2 flex-row">
              <View className="w-9 h-9 rounded-xl bg-teal-50 items-center justify-center">
                <Stethoscope color="#14b8a6" size={16} />
              </View>
              <View className="flex-1 ml-3">
                <View className="flex-row items-center">
                  <Text className="text-xs text-slate-500">{fmtDate(e.visitDate)}</Text>
                  <Text className="text-xs text-slate-400 ml-2">· {e.type}</Text>
                  <Text className="text-xs text-slate-400 ml-2">· {e.status}</Text>
                </View>
                <Text className="font-medium text-slate-900 mt-0.5" numberOfLines={2}>
                  {e.chiefComplaint || 'No chief complaint recorded'}
                </Text>
                {e.doctorName && (
                  <Text className="text-xs text-slate-500 mt-0.5">Seen by Dr. {e.doctorName}</Text>
                )}
              </View>
            </View>
          ))
        )}

        {/* Admissions */}
        {data.admissions.length > 0 && (
          <>
            <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mt-6 mb-2">
              Admissions ({data.admissions.length})
            </Text>
            {data.admissions.slice(0, 8).map((a) => (
              <View key={a.id} className="bg-white rounded-xl p-4 mb-2">
                <View className="flex-row items-center">
                  <BedDouble color="#059669" size={14} />
                  <Text className="ml-2 font-medium text-slate-900">
                    {fmtDate(a.admissionDate)} —{' '}
                    {a.dischargeDate ? `Discharged ${fmtDate(a.dischargeDate)}` : 'Active'}
                  </Text>
                </View>
                <Text className="text-xs text-slate-500 mt-1">
                  {a.wardName || 'Ward'}
                  {a.bedNumber ? ` · Bed ${a.bedNumber}` : ''}
                  {a.doctorName ? ` · Dr. ${a.doctorName}` : ''}
                </Text>
                {a.diagnosis && <Text className="text-xs text-slate-700 mt-1">{a.diagnosis}</Text>}
              </View>
            ))}
          </>
        )}

        {/* Prescriptions */}
        {data.prescriptions.length > 0 && (
          <>
            <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mt-6 mb-2">
              Prescriptions ({data.prescriptions.length})
            </Text>
            {data.prescriptions.slice(0, 6).map((rx) => {
              const drugs = Array.isArray(rx.drugs) ? rx.drugs : [];
              return (
                <View key={rx.id} className="bg-white rounded-xl p-4 mb-2">
                  <View className="flex-row items-center">
                    <Pill color="#ec4899" size={14} />
                    <Text className="ml-2 font-medium text-slate-900">{fmtDate(rx.issuedAt)}</Text>
                    {rx.doctorName && (
                      <Text className="ml-2 text-xs text-slate-500">· Dr. {rx.doctorName}</Text>
                    )}
                    <Text className="ml-auto text-xs text-slate-400">
                      {drugs.length} item{drugs.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                  {drugs.slice(0, 3).map((d: any, i: number) => (
                    <Text key={i} className="text-xs text-slate-700 mt-1" numberOfLines={1}>
                      • {d.name || d.drug || 'Drug'}
                      {d.dose ? ` — ${d.dose}` : ''}
                      {d.frequency ? `, ${d.frequency}` : ''}
                    </Text>
                  ))}
                  {drugs.length > 3 && (
                    <Text className="text-xs text-slate-400 mt-1">
                      and {drugs.length - 3} more…
                    </Text>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* Surgeries */}
        {data.surgeries.length > 0 && (
          <>
            <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mt-6 mb-2">
              Surgeries ({data.surgeries.length})
            </Text>
            {data.surgeries.slice(0, 6).map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => router.push({ pathname: '/ot/[id]', params: { id: s.id } })}
                className="bg-white rounded-xl p-4 mb-2 flex-row items-center"
              >
                <View className="w-9 h-9 rounded-xl bg-orange-50 items-center justify-center">
                  <Activity color="#ea580c" size={16} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="font-medium text-slate-900" numberOfLines={1}>
                    {s.procedureName}
                  </Text>
                  <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                    {fmtDate(s.scheduledDate)}
                    {s.scheduledTime ? ` · ${s.scheduledTime}` : ''}
                    {s.surgeonName ? ` · Dr. ${s.surgeonName}` : ''}
                  </Text>
                </View>
                <View className="ml-2">
                  <Text
                    className={`text-[10px] uppercase font-medium ${
                      s.status === 'completed'
                        ? 'text-emerald-600'
                        : s.status === 'cancelled'
                        ? 'text-slate-400'
                        : 'text-orange-600'
                    }`}
                  >
                    {s.status}
                  </Text>
                </View>
                <ChevronRight color="#cbd5e1" size={18} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Bills */}
        {data.invoices.length > 0 && (
          <>
            <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mt-6 mb-2">
              Bills ({data.invoices.length})
            </Text>
            {data.invoices.slice(0, 6).map((inv) => (
              <View key={inv.id} className="bg-white rounded-xl p-4 mb-2 flex-row items-center">
                <Receipt color="#64748b" size={16} />
                <View className="flex-1 ml-3">
                  <Text className="font-medium text-slate-900">
                    {inv.type} — {fmtDate(inv.createdAt)}
                  </Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    Total {fmt(inv.total)} · Paid {fmt(inv.paid)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text
                    className={`font-semibold ${
                      inv.balance > 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    {fmt(inv.balance)}
                  </Text>
                  <Text className="text-[10px] uppercase text-slate-500">{inv.status}</Text>
                </View>
              </View>
            ))}
          </>
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
