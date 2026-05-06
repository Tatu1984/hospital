// Order detail + result-entry screen. Doctor opens this from the patient
// detail's Orders section. The form is category-aware:
//   - lab: dynamic rows of { name, value, unit, range, abnormal }
//   - radiology: free-text findings + impression
//
// Submit → POST /api/mobile/v1/orders/:id/result. Result is then visible
// in the patient's Records timeline immediately.
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, FlaskConical, Scan, Trash2, Plus, Send, AlertTriangle } from 'lucide-react-native';
import { ordersAPI } from '@/lib/api';

interface Order {
  id: string;
  orderType: string;
  status: string;
  priority: string;
  orderedAt: string;
  details: any;
  patient?: { id: string; name: string; mrn: string };
}

interface ValueRow { name: string; value: string; unit: string; range: string; abnormal: boolean }

export default function OrderResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lab form state — array of measurement rows.
  const [values, setValues] = useState<ValueRow[]>([{ name: '', value: '', unit: '', range: '', abnormal: false }]);
  // Radiology form state.
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [isCritical, setIsCritical] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    ordersAPI.byPatient(''); // no-op import warmer (zero-overhead)
    fetch();
    async function fetch() {
      try {
        // Doctor app uses the dedicated /api/mobile/v1/orders/:id endpoint
        // that returns a slim DTO including the patient header.
        const res = await (await import('@/lib/api')).api.get(`/api/mobile/v1/orders/${id}`);
        setOrder(res.data);
        // Pre-seed the form with the test names from the order so the
        // doctor doesn't have to retype "Haemoglobin" etc.
        if (res.data?.orderType === 'lab') {
          const tests = (res.data?.details?.tests || []) as Array<{ name?: string }>;
          if (tests.length) {
            setValues(tests.map((t) => ({ name: t.name || '', value: '', unit: '', range: '', abnormal: false })));
          }
        }
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Could not load order.');
      } finally {
        setLoading(false);
      }
    }
  }, [id]);

  function setRow(i: number, patch: Partial<ValueRow>) {
    setValues((v) => v.map((row, idx) => idx === i ? { ...row, ...patch } : row));
  }
  function addRow() { setValues((v) => [...v, { name: '', value: '', unit: '', range: '', abnormal: false }]); }
  function removeRow(i: number) { setValues((v) => v.filter((_, idx) => idx !== i)); }

  async function submit() {
    if (!order) return;
    let resultData: any;
    if (order.orderType === 'lab') {
      const filled = values.filter((r) => r.name.trim() && r.value.trim());
      if (filled.length === 0) {
        Alert.alert('No values', 'Please enter at least one test name + value.');
        return;
      }
      resultData = { values: filled };
    } else if (order.orderType === 'radiology') {
      if (!findings.trim() && !impression.trim()) {
        Alert.alert('Empty report', 'Please enter findings or an impression.');
        return;
      }
      resultData = { findings: findings.trim(), impression: impression.trim() };
    } else {
      resultData = { note: findings.trim() };
    }

    setSubmitting(true);
    try {
      await ordersAPI.submitResult(order.id, resultData, isCritical);
      Alert.alert(
        'Result saved',
        'The patient will see this in their Records tab immediately.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e: any) {
      Alert.alert('Could not save', e?.response?.data?.error || 'Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#14b8a6" />
      </SafeAreaView>
    );
  }
  if (!order) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <Text className="text-slate-500">{error || 'Order not found.'}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 px-4 py-2 bg-primary-600 rounded-xl"><Text className="text-white font-medium">Go back</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isLab = order.orderType === 'lab';
  const Icon = isLab ? FlaskConical : Scan;
  const tint = isLab ? 'bg-blue-500' : 'bg-purple-500';
  const tests = (order.details?.tests || []) as Array<{ name?: string; instructions?: string }>;
  const title = isLab
    ? (tests[0]?.name ? `${tests[0].name}${tests.length > 1 ? ` +${tests.length - 1}` : ''}` : 'Lab order')
    : `${order.details?.modality || 'Imaging'} ${order.details?.bodyPart || ''}`.trim();
  const alreadyResulted = order.status === 'completed';

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="px-4 py-3 bg-white border-b border-slate-200 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2"><ChevronLeft color="#0f172a" size={24} /></TouchableOpacity>
        <Text className="flex-1 text-base font-semibold text-slate-900 capitalize">{order.orderType} order</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }} keyboardShouldPersistTaps="handled">
          {/* Header card */}
          <View className="bg-white rounded-2xl p-5 mb-4 flex-row items-center"
            style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}>
            <View className={`w-14 h-14 rounded-2xl items-center justify-center ${tint}`}>
              <Icon color="white" size={26} />
            </View>
            <View className="flex-1 ml-4">
              <Text className="text-lg font-bold text-slate-900">{title}</Text>
              {order.patient && (
                <Text className="text-xs text-slate-500 mt-0.5">{order.patient.name} • MRN {order.patient.mrn}</Text>
              )}
              <Text className="text-xs text-slate-400 mt-0.5">
                {new Date(order.orderedAt).toLocaleString()} • Priority {order.priority} • Status {order.status}
              </Text>
            </View>
          </View>

          {alreadyResulted && (
            <View className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 flex-row items-start">
              <AlertTriangle color="#059669" size={18} />
              <Text className="ml-2 flex-1 text-sm text-emerald-800">
                This order is already marked completed. Submitting again will append a new result row.
              </Text>
            </View>
          )}

          {isLab ? (
            <>
              <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">
                Result values ({values.length})
              </Text>
              {values.map((row, i) => (
                <View key={i} className="bg-white rounded-xl p-3 mb-2"
                  style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
                  <View className="flex-row items-center mb-2">
                    <TextInput
                      placeholder="Test name (e.g. Haemoglobin)"
                      value={row.name}
                      onChangeText={(t) => setRow(i, { name: t })}
                      className="flex-1 text-slate-900 text-base"
                    />
                    <TouchableOpacity onPress={() => removeRow(i)} className="p-1">
                      <Trash2 color="#dc2626" size={16} />
                    </TouchableOpacity>
                  </View>
                  <View className="flex-row gap-2">
                    <TextInput
                      placeholder="Value"
                      value={row.value}
                      onChangeText={(t) => setRow(i, { value: t })}
                      keyboardType="numbers-and-punctuation"
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-slate-900"
                    />
                    <TextInput
                      placeholder="Unit"
                      value={row.unit}
                      onChangeText={(t) => setRow(i, { unit: t })}
                      className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </View>
                  <View className="flex-row gap-2 mt-2 items-center">
                    <TextInput
                      placeholder="Reference range (e.g. 13-17)"
                      value={row.range}
                      onChangeText={(t) => setRow(i, { range: t })}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm"
                    />
                    <TouchableOpacity
                      onPress={() => setRow(i, { abnormal: !row.abnormal })}
                      className={`px-3 py-2 rounded-lg border ${row.abnormal ? 'bg-red-50 border-red-300' : 'border-slate-200'}`}
                    >
                      <Text className={`text-xs ${row.abnormal ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>
                        {row.abnormal ? 'Abnormal ✓' : 'Normal'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                onPress={addRow}
                className="bg-white border border-dashed border-slate-300 rounded-xl py-3 items-center mt-1 flex-row justify-center"
              >
                <Plus color="#64748b" size={16} />
                <Text className="text-slate-600 ml-2">Add another value</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">Findings</Text>
              <TextInput
                value={findings}
                onChangeText={setFindings}
                placeholder="Describe the radiological findings…"
                multiline
                className="bg-white rounded-xl p-4 text-slate-900 mb-4"
                style={{ minHeight: 120, textAlignVertical: 'top' }}
              />
              <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">Impression</Text>
              <TextInput
                value={impression}
                onChangeText={setImpression}
                placeholder="Concise diagnostic impression…"
                multiline
                className="bg-white rounded-xl p-4 text-slate-900"
                style={{ minHeight: 80, textAlignVertical: 'top' }}
              />
            </>
          )}

          <View className="bg-white rounded-xl p-4 mt-4 flex-row items-center">
            <View className="flex-1">
              <Text className="font-medium text-slate-900">Mark as critical</Text>
              <Text className="text-xs text-slate-500 mt-0.5">Triggers a high-priority alert to the patient.</Text>
            </View>
            <Switch value={isCritical} onValueChange={setIsCritical} trackColor={{ true: '#14b8a6', false: '#cbd5e1' }} />
          </View>
        </ScrollView>

        <View className="absolute left-0 right-0 bottom-0 bg-white border-t border-slate-200 p-4">
          <TouchableOpacity
            onPress={submit}
            disabled={submitting}
            className={`rounded-xl py-4 items-center flex-row justify-center ${submitting ? 'bg-primary-600/60' : 'bg-primary-600'}`}
          >
            <Send color="white" size={16} />
            <Text className="text-white font-semibold text-base ml-2">
              {submitting ? 'Saving…' : 'Save result'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
