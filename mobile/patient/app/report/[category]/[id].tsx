// Single screen that renders any of the four report-detail categories
// (lab / radiology / prescription / invoice). Each category has its own
// renderer below — the wire shape from /api/mobile/v1/reports/:cat/:id is
// already category-specific so we just dispatch on the `category` field.
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, FlaskConical, Scan, Pill, Receipt, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { reportsAPI } from '@/lib/api';

export default function ReportDetailScreen() {
  const { category, id } = useLocalSearchParams<{ category: string; id: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!category || !id) return;
    reportsAPI.detail(category, id)
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.error || 'Could not load this report.'));
  }, [category, id]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="px-4 py-3 bg-white border-b border-slate-200 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2"><ChevronLeft color="#0f172a" size={24} /></TouchableOpacity>
        <Text className="flex-1 text-base font-semibold text-slate-900 capitalize">{category} report</Text>
      </View>

      {error && (
        <View className="m-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <Text className="text-sm text-amber-800">{error}</Text>
        </View>
      )}

      {!data && !error && (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#2563eb" /></View>
      )}

      {data && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {data.category === 'lab' && <LabBody data={data} />}
          {data.category === 'radiology' && <RadiologyBody data={data} />}
          {data.category === 'prescription' && <PrescriptionBody data={data} />}
          {data.category === 'invoice' && <InvoiceBody data={data} />}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// --- Category renderers ---------------------------------------------------

function Header({ icon: Icon, color, title, subtitle }: { icon: any; color: string; title: string; subtitle: string }) {
  return (
    <View className="bg-white rounded-2xl p-5 mb-4 flex-row items-center"
      style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}>
      <View className={`w-14 h-14 rounded-2xl items-center justify-center ${color}`}>
        <Icon color="white" size={26} />
      </View>
      <View className="flex-1 ml-4">
        <Text className="text-lg font-bold text-slate-900">{title}</Text>
        <Text className="text-xs text-slate-500 mt-0.5">{subtitle}</Text>
      </View>
    </View>
  );
}

function LabBody({ data }: { data: any }) {
  const tests = (data.details?.tests || []) as Array<{ name?: string; instructions?: string }>;
  return (
    <>
      <Header
        icon={FlaskConical}
        color="bg-blue-500"
        title={`Lab order — ${tests[0]?.name || 'Tests'}`}
        subtitle={`Ordered ${new Date(data.orderedAt).toLocaleString()} • Status: ${data.status}`}
      />

      {data.doctorName && (
        <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">Ordered by</Text>
      )}
      {data.doctorName && (
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-slate-900 font-medium">{data.doctorName}</Text>
        </View>
      )}

      <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">Tests requested</Text>
      <View className="bg-white rounded-xl p-4 mb-4">
        {tests.length === 0 ? (
          <Text className="text-sm text-slate-500">No structured test list.</Text>
        ) : (
          tests.map((t, i) => (
            <View key={i} className={i > 0 ? 'mt-3 pt-3 border-t border-slate-100' : ''}>
              <Text className="font-medium text-slate-900">{t.name || `Test ${i + 1}`}</Text>
              {t.instructions && <Text className="text-xs text-slate-500 mt-0.5">{t.instructions}</Text>}
            </View>
          ))
        )}
      </View>

      <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">
        Results ({data.results.length})
      </Text>
      {data.results.length === 0 ? (
        <View className="bg-white rounded-xl p-4 flex-row items-center">
          <AlertCircle color="#f59e0b" size={18} />
          <Text className="text-sm text-slate-600 ml-2">Pending — results will appear here once your lab completes the test.</Text>
        </View>
      ) : (
        data.results.map((r: any, i: number) => (
          <View key={r.id} className={`bg-white rounded-xl p-4 ${i > 0 ? 'mt-2' : ''}`}>
            <View className="flex-row items-center mb-2">
              <CheckCircle2 color="#10b981" size={16} />
              <Text className="text-xs text-slate-500 ml-2">Resulted {new Date(r.resultedAt).toLocaleString()}</Text>
            </View>
            <ResultDataRenderer data={r.resultData} />
            {r.verifiedBy && <Text className="text-xs text-slate-400 mt-3">Verified by {r.verifiedBy}</Text>}
          </View>
        ))
      )}
    </>
  );
}

function RadiologyBody({ data }: { data: any }) {
  const d = data.details || {};
  return (
    <>
      <Header
        icon={Scan}
        color="bg-purple-500"
        title={`${d.modality || 'Imaging'} — ${d.bodyPart || ''}`.trim()}
        subtitle={`Ordered ${new Date(data.orderedAt).toLocaleString()} • Status: ${data.status}`}
      />

      {d.indication && (
        <>
          <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">Indication</Text>
          <View className="bg-white rounded-xl p-4 mb-4">
            <Text className="text-slate-700">{d.indication}</Text>
          </View>
        </>
      )}

      <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">Findings</Text>
      {data.results.length === 0 ? (
        <View className="bg-white rounded-xl p-4 flex-row items-center">
          <AlertCircle color="#f59e0b" size={18} />
          <Text className="text-sm text-slate-600 ml-2">Pending — radiologist's report will appear here.</Text>
        </View>
      ) : (
        data.results.map((r: any) => (
          <View key={r.id} className="bg-white rounded-xl p-4 mb-2">
            <Text className="text-xs text-slate-500 mb-2">Reported {new Date(r.resultedAt).toLocaleString()}</Text>
            <ResultDataRenderer data={r.resultData} />
            {r.verifiedBy && <Text className="text-xs text-slate-400 mt-3">Reviewed by {r.verifiedBy}</Text>}
          </View>
        ))
      )}
    </>
  );
}

function PrescriptionBody({ data }: { data: any }) {
  const drugs = Array.isArray(data.drugs) ? data.drugs : [];
  return (
    <>
      <Header
        icon={Pill}
        color="bg-emerald-500"
        title="Prescription"
        subtitle={`Issued ${new Date(data.issuedAt).toLocaleString()}${data.doctorName ? ` • ${data.doctorName}` : ''}`}
      />

      <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">
        Medications ({drugs.length})
      </Text>
      {drugs.length === 0 ? (
        <View className="bg-white rounded-xl p-4">
          <Text className="text-sm text-slate-500">No drug list attached.</Text>
        </View>
      ) : (
        drugs.map((d: any, i: number) => (
          <View key={i} className="bg-white rounded-xl p-4 mb-2"
            style={{ shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 }}>
            <Text className="font-semibold text-slate-900">{d.name || d.drugName || `Drug ${i + 1}`}</Text>
            <View className="flex-row flex-wrap mt-1">
              {d.dose && <Pill_Tag label={`${d.dose}`} />}
              {d.frequency && <Pill_Tag label={d.frequency} />}
              {d.days && <Pill_Tag label={`${d.days} days`} />}
              {d.route && <Pill_Tag label={d.route} />}
            </View>
            {d.instructions && (
              <Text className="text-sm text-slate-600 mt-2 italic">{d.instructions}</Text>
            )}
          </View>
        ))
      )}
    </>
  );
}

function Pill_Tag({ label }: { label: string }) {
  return (
    <View className="mr-2 mt-1 bg-emerald-50 px-2 py-0.5 rounded-full">
      <Text className="text-xs text-emerald-700">{label}</Text>
    </View>
  );
}

function InvoiceBody({ data }: { data: any }) {
  const items = Array.isArray(data.items) ? data.items : [];
  const balance = Number(data.balance);
  return (
    <>
      <Header
        icon={Receipt}
        color={balance > 0 ? 'bg-amber-500' : 'bg-emerald-500'}
        title={`${data.type || 'Invoice'} — ₹${Number(data.total).toFixed(2)}`}
        subtitle={`${new Date(data.createdAt).toLocaleDateString()} • ${data.status}`}
      />

      <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">Line items</Text>
      <View className="bg-white rounded-xl p-4 mb-4">
        {items.length === 0 ? (
          <Text className="text-sm text-slate-500">No itemised breakdown.</Text>
        ) : (
          items.map((it: any, i: number) => (
            <View key={i} className={`flex-row justify-between ${i > 0 ? 'mt-2 pt-2 border-t border-slate-100' : ''}`}>
              <View className="flex-1 pr-3">
                <Text className="text-sm text-slate-900">{it.name || it.description || `Item ${i + 1}`}</Text>
                {it.quantity && <Text className="text-xs text-slate-500 mt-0.5">Qty {it.quantity}</Text>}
              </View>
              <Text className="text-sm font-medium text-slate-900">₹{Number(it.amount || it.total || it.price || 0).toFixed(2)}</Text>
            </View>
          ))
        )}
      </View>

      <Text className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">Summary</Text>
      <View className="bg-white rounded-xl p-4">
        <Row label="Subtotal" value={`₹${Number(data.subtotal).toFixed(2)}`} />
        {Number(data.discount) > 0 && <Row label="Discount" value={`-₹${Number(data.discount).toFixed(2)}`} />}
        {Number(data.tax) > 0 && <Row label="Tax" value={`₹${Number(data.tax).toFixed(2)}`} />}
        <Row label="Total" value={`₹${Number(data.total).toFixed(2)}`} bold />
        <Row label="Paid" value={`₹${Number(data.paid).toFixed(2)}`} />
        <Row label="Balance" value={`₹${balance.toFixed(2)}`} bold accent={balance > 0 ? 'text-amber-600' : 'text-emerald-600'} />
      </View>
    </>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: string }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text className={`${bold ? 'font-semibold' : ''} text-slate-700`}>{label}</Text>
      <Text className={`${bold ? 'font-semibold' : ''} ${accent || 'text-slate-900'}`}>{value}</Text>
    </View>
  );
}

// resultData is JSON whose shape varies by lab system. Best-effort render:
//   - { values: [{ name, value, unit, range, abnormal }] } → row table
//   - { findings: "string", impression: "string" }         → text blocks
//   - any other shape                                     → key/value dump
function ResultDataRenderer({ data }: { data: any }) {
  if (!data) return null;
  if (Array.isArray(data?.values)) {
    return (
      <View>
        {data.values.map((v: any, i: number) => (
          <View key={i} className={`flex-row justify-between py-1 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
            <View className="flex-1 pr-3">
              <Text className="text-sm text-slate-900">{v.name}</Text>
              {v.range && <Text className="text-xs text-slate-400 mt-0.5">Range: {v.range}</Text>}
            </View>
            <Text className={`text-sm font-medium ${v.abnormal ? 'text-red-600' : 'text-slate-900'}`}>
              {v.value}{v.unit ? ` ${v.unit}` : ''}
            </Text>
          </View>
        ))}
      </View>
    );
  }
  if (data?.findings || data?.impression) {
    return (
      <View>
        {data.findings && (
          <View>
            <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Findings</Text>
            <Text className="text-sm text-slate-700 leading-5">{data.findings}</Text>
          </View>
        )}
        {data.impression && (
          <View className="mt-3">
            <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">Impression</Text>
            <Text className="text-sm text-slate-700 leading-5">{data.impression}</Text>
          </View>
        )}
      </View>
    );
  }
  // Generic JSON fallback
  return (
    <Text className="text-xs text-slate-600 font-mono">{JSON.stringify(data, null, 2)}</Text>
  );
}
