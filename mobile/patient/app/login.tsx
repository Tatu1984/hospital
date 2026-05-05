// Patient login. Username + password against /api/mobile/v1/auth/login.
// Once OTP login is enabled (phase 2), this screen gets a "Sign in with
// phone OTP" toggle that swaps the form.
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { MotiView } from 'moti';
import { Stethoscope } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!username || !password) return;
    setBusy(true);
    try {
      await login(username, password);
    } catch (e: any) {
      Alert.alert('Sign-in failed', e?.response?.data?.error || 'Please check your username and password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-white">
      <View className="flex-1 px-6 justify-center">
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
          className="items-center mb-12"
        >
          <View className="w-20 h-20 bg-primary-600 rounded-3xl items-center justify-center mb-4">
            <Stethoscope color="white" size={36} />
          </View>
          <Text className="text-3xl font-bold text-slate-900">Welcome back</Text>
          <Text className="text-slate-500 mt-1">Sign in to your patient account</Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 100 }}
          className="space-y-4"
        >
          <View>
            <Text className="text-sm font-medium text-slate-700 mb-1">Username</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
              placeholder="Your username"
              className="border border-slate-300 rounded-xl px-4 py-3 text-base bg-white"
            />
          </View>
          <View>
            <Text className="text-sm font-medium text-slate-700 mb-1">Password</Text>
            <TextInput
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              className="border border-slate-300 rounded-xl px-4 py-3 text-base bg-white"
            />
          </View>
          <TouchableOpacity
            disabled={busy}
            onPress={onSubmit}
            className={`rounded-xl py-4 items-center mt-2 ${busy ? 'bg-primary-600/60' : 'bg-primary-600'}`}
          >
            <Text className="text-white font-semibold text-base">{busy ? 'Signing in…' : 'Sign in'}</Text>
          </TouchableOpacity>

          <Text className="text-center text-xs text-slate-400 mt-6">
            Phone-OTP login coming soon. Use your username and password for now.
          </Text>
        </MotiView>
      </View>
    </KeyboardAvoidingView>
  );
}
