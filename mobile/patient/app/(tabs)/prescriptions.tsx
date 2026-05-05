import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Stub. Phase-1 builds the list screen reading /api/prescriptions filtered
// by patientId; the detail screen embeds a PDF viewer (expo-pdf or
// react-native-pdf).
export default function PrescriptionsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="p-4">
        <Text className="text-2xl font-bold text-slate-900">Prescriptions</Text>
        <Text className="text-sm text-slate-500 mt-1">Coming in next iteration</Text>
      </View>
    </SafeAreaView>
  );
}
