// Self-service change password. Calls POST /api/auth/change-password
// which verifies the current password before hashing the new one. Same
// screen shape used in the patient app — see ../../patient/app/change-password.tsx.

import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { ArrowLeft, KeyRound, Eye, EyeOff } from 'lucide-react-native';
import { api } from '@/lib/api';

export default function ChangePasswordScreen() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);

  function validate(): string | null {
    if (!current) return 'Enter your current password';
    if (next.length < 8) return 'New password must be at least 8 characters';
    if (next === current) return 'New password must be different from the current one';
    if (next !== confirm) return 'Confirmation does not match the new password';
    return null;
  }

  async function save() {
    const err = validate();
    if (err) {
      Alert.alert('Cannot save', err);
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/auth/change-password', {
        currentPassword: current,
        newPassword: next,
      });
      Alert.alert('Password updated', 'Your password has been changed.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.error || 'Could not change password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center px-4 py-3 border-b border-slate-200 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ArrowLeft color="#0f172a" size={22} />
        </TouchableOpacity>
        <Text className="ml-2 text-lg font-bold text-slate-900">Change password</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View className="bg-purple-50 rounded-2xl p-4 flex-row items-start">
            <KeyRound color="#7c3aed" size={18} />
            <Text className="ml-2 flex-1 text-sm text-purple-900">
              Choose a strong password — at least 8 characters, mix of letters and numbers
              recommended. Avoid passwords you've used elsewhere.
            </Text>
          </View>

          <PasswordField
            label="Current password"
            value={current}
            onChange={setCurrent}
            visible={showCurrent}
            toggleVisible={() => setShowCurrent((v) => !v)}
          />

          <PasswordField
            label="New password"
            value={next}
            onChange={setNext}
            visible={showNext}
            toggleVisible={() => setShowNext((v) => !v)}
          />

          <PasswordField
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            visible={showNext}
            toggleVisible={() => setShowNext((v) => !v)}
          />

          <TouchableOpacity
            onPress={save}
            disabled={saving}
            className="mt-4 bg-teal-600 rounded-2xl p-4 flex-row items-center justify-center"
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold">Update password</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  toggleVisible,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  toggleVisible: () => void;
}) {
  return (
    <View className="bg-white rounded-2xl p-4 mt-3 flex-row items-end">
      <View className="flex-1">
        <Text className="text-xs uppercase tracking-wide text-slate-500 mb-1">{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChange}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          className="text-base text-slate-900 py-1"
        />
      </View>
      <TouchableOpacity onPress={toggleVisible} className="p-1.5">
        {visible ? <EyeOff color="#64748b" size={18} /> : <Eye color="#64748b" size={18} />}
      </TouchableOpacity>
    </View>
  );
}
