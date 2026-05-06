// Patient edit profile — surface for the PATCH /api/mobile/v1/patients/me
// endpoint. Only fields the patient is allowed to self-edit are shown:
// contact, email, address, allergies, emergency contact. Demographics
// (name, DOB, gender, MRN) come from registration and are read-only.

import { useEffect, useState } from 'react';
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
import { ArrowLeft, Save } from 'lucide-react-native';
import { patientsAPI } from '@/lib/api';

interface PatientProfile {
  contact: string | null;
  email: string | null;
  address: string | null;
  allergies: string | null;
  emergencyContact: string | null;
}

export default function EditProfileScreen() {
  const [form, setForm] = useState<PatientProfile>({
    contact: '',
    email: '',
    address: '',
    allergies: '',
    emergencyContact: '',
  });
  const [name, setName] = useState('');
  const [mrn, setMrn] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await patientsAPI.getMyHome();
        const p = r.data?.patient;
        if (p) {
          setForm({
            contact: p.contact || '',
            email: p.email || '',
            address: p.address || '',
            allergies: p.allergies || '',
            emergencyContact: p.emergencyContact || '',
          });
          setName(p.name || '');
          setMrn(p.mrn || '');
        }
      } catch (e: any) {
        Alert.alert('Error', e?.response?.data?.error || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function update<K extends keyof PatientProfile>(field: K, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      // Send only the editable fields. Empty strings → null so the
      // server can clear a field (instead of storing an empty string).
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v?.trim() ? v.trim() : null]),
      );
      await patientsAPI.updateMyProfile(payload);
      Alert.alert('Saved', 'Your profile was updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center px-4 py-3 border-b border-slate-200 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ArrowLeft color="#0f172a" size={22} />
        </TouchableOpacity>
        <Text className="ml-2 text-lg font-bold text-slate-900 flex-1">Edit profile</Text>
        <TouchableOpacity
          onPress={save}
          disabled={saving}
          className="bg-blue-600 px-4 py-2 rounded-xl flex-row items-center"
        >
          {saving ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Save color="white" size={14} />
              <Text className="text-white font-medium ml-1.5 text-sm">Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {/* Read-only identity */}
          <View className="bg-white rounded-2xl p-4 mb-3">
            <Text className="text-xs uppercase tracking-wide text-slate-500 mb-2">
              Identity (read-only)
            </Text>
            <Text className="font-semibold text-slate-900">{name}</Text>
            <Text className="text-xs text-slate-500 mt-0.5">MRN {mrn}</Text>
            <Text className="text-[11px] text-slate-400 mt-2 italic">
              Name, date of birth, and gender are set during registration. Contact the front desk
              if any of these need to be corrected.
            </Text>
          </View>

          {/* Editable fields */}
          <Field
            label="Phone number"
            value={form.contact || ''}
            onChange={(v) => update('contact', v)}
            placeholder="e.g. +91 98xxxxxx00"
            keyboardType="phone-pad"
          />
          <Field
            label="Email"
            value={form.email || ''}
            onChange={(v) => update('email', v)}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Address"
            value={form.address || ''}
            onChange={(v) => update('address', v)}
            placeholder="Street, city, state, PIN"
            multiline
          />
          <Field
            label="Allergies"
            value={form.allergies || ''}
            onChange={(v) => update('allergies', v)}
            placeholder="e.g. Penicillin, peanuts. Leave blank if none."
            multiline
            tint="bg-red-50"
            help="This is shown to every clinician treating you. Be specific."
          />
          <Field
            label="Emergency contact"
            value={form.emergencyContact || ''}
            onChange={(v) => update('emergencyContact', v)}
            placeholder="Name and phone of someone we can call"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  autoCapitalize,
  multiline,
  tint,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences';
  multiline?: boolean;
  tint?: string;
  help?: string;
}) {
  return (
    <View className={`rounded-2xl p-4 mb-2 ${tint || 'bg-white'}`}>
      <Text className="text-xs uppercase tracking-wide text-slate-500 mb-1">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        className="text-base text-slate-900 py-1"
        style={multiline ? { minHeight: 70, textAlignVertical: 'top' } : undefined}
      />
      {help && <Text className="text-[11px] text-slate-500 mt-1 italic">{help}</Text>}
    </View>
  );
}
