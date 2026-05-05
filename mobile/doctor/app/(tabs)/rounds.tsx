import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Stub. IPD ward round flow: list of admitted patients under this doctor,
// quick-tap to enter daily progress note + new orders.
export default function RoundsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="p-4">
        <Text className="text-2xl font-bold text-slate-900">IPD rounds</Text>
        <Text className="text-sm text-slate-500 mt-1">Bed list + progress-note entry coming next iteration.</Text>
      </View>
    </SafeAreaView>
  );
}
