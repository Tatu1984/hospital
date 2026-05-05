import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Phase 1 stub. Real implementation comes in week 2:
// - GET /api/appointments?patientId=me — list past + upcoming
// - "Book new" CTA → speciality → doctor → slot picker
// - Cancel / reschedule modals
export default function AppointmentsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="p-4">
        <Text className="text-2xl font-bold text-slate-900">Appointments</Text>
        <Text className="text-sm text-slate-500 mt-1">Coming in next iteration</Text>
      </View>
    </SafeAreaView>
  );
}
