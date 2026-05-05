import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  function onLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="p-4">
        <Text className="text-2xl font-bold text-slate-900">Profile</Text>
        {user && (
          <View className="mt-4 bg-white rounded-2xl p-4">
            <Text className="font-semibold text-slate-900">{user.name}</Text>
            <Text className="text-sm text-slate-500 mt-0.5">{user.email}</Text>
          </View>
        )}
        <TouchableOpacity onPress={onLogout} className="mt-4 bg-white rounded-2xl p-4 flex-row items-center">
          <LogOut color="#dc2626" size={20} />
          <Text className="ml-3 font-semibold text-red-600">Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
