import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Stub. Phase-1 search + list keyed by /api/patients?search=, then taps
// open a patient detail screen with demographics, allergies, recent
// encounters, and quick actions (write Rx, order lab/radiology).
export default function PatientsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="p-4">
        <Text className="text-2xl font-bold text-slate-900">Patients</Text>
        <Text className="text-sm text-slate-500 mt-1">Search + detail screens coming next iteration.</Text>
      </View>
    </SafeAreaView>
  );
}
