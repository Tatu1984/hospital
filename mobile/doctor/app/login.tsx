import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { MotiView } from 'moti';
import { Stethoscope, Fingerprint } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '@/lib/auth';
import { tokens } from '@/lib/api';

export default function LoginScreen() {
  const { login, unlockBiometric } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // Show the biometric button only if (a) the device supports it and (b) we
  // have a stored access token from a prior session — otherwise biometric
  // can't unlock anything.
  useEffect(() => {
    void (async () => {
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const hasToken = !!(await tokens.getAccess());
      setBiometricAvailable(hasHw && enrolled && hasToken);
    })();
  }, []);

  async function onSubmit() {
    if (!username || !password) return;
    setBusy(true);
    try {
      await login(username, password);
    } catch (e: any) {
      Alert.alert('Sign-in failed', e?.response?.data?.error || 'Please check your credentials.');
    } finally {
      setBusy(false);
    }
  }

  async function onBiometric() {
    const ok = await unlockBiometric();
    if (!ok) Alert.alert('Could not unlock', 'Please sign in with your password.');
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-slate-900">
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
          <Text className="text-3xl font-bold text-white">Doctor</Text>
          <Text className="text-slate-400 mt-1">Sign in to your account</Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 100 }}
          className="space-y-4"
        >
          <View>
            <Text className="text-sm font-medium text-slate-300 mb-1">Username</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
              placeholderTextColor="#64748b"
              placeholder="Your username"
              className="border border-slate-700 rounded-xl px-4 py-3 text-base bg-slate-800 text-white"
            />
          </View>
          <View>
            <Text className="text-sm font-medium text-slate-300 mb-1">Password</Text>
            <TextInput
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
              placeholderTextColor="#64748b"
              placeholder="Your password"
              className="border border-slate-700 rounded-xl px-4 py-3 text-base bg-slate-800 text-white"
            />
          </View>
          <TouchableOpacity
            disabled={busy}
            onPress={onSubmit}
            className={`rounded-xl py-4 items-center mt-2 ${busy ? 'bg-primary-600/60' : 'bg-primary-600'}`}
          >
            <Text className="text-white font-semibold text-base">{busy ? 'Signing in…' : 'Sign in'}</Text>
          </TouchableOpacity>

          {biometricAvailable && (
            <TouchableOpacity
              onPress={onBiometric}
              className="rounded-xl py-4 items-center mt-2 border border-slate-700 flex-row justify-center"
            >
              <Fingerprint color="#14b8a6" size={20} />
              <Text className="text-primary-500 font-medium ml-2">Unlock with biometric</Text>
            </TouchableOpacity>
          )}
        </MotiView>
      </View>
    </KeyboardAvoidingView>
  );
}
