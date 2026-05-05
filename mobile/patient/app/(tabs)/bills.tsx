import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Stub. Phase-1 builds list of invoices and a Razorpay checkout sheet for
// outstanding balances. Razorpay wiring depends on RAZORPAY_KEY_ID/SECRET
// being set in the backend's Vercel env (same checkout backend the desktop
// portal uses).
export default function BillsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="p-4">
        <Text className="text-2xl font-bold text-slate-900">Bills</Text>
        <Text className="text-sm text-slate-500 mt-1">Coming in next iteration</Text>
      </View>
    </SafeAreaView>
  );
}
