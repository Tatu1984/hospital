// Patient self-signup — creates a User + Patient row in one call
// (POST /api/mobile/v1/auth/signup) and logs the new account straight in.
// Field set mirrors the desktop staff registration form
// (frontend/src/pages/PatientRegistration.tsx) minus staff-only fields
// (referral source, ABHA linking) which patients don't self-manage.

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { MotiView } from 'moti';
import { ArrowLeft, Stethoscope } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';

const GENDERS = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function SignupScreen() {
  const { signup } = useAuth();
  const [busy, setBusy] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState<string | null>(null);
  const [allergies, setAllergies] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  function validate(): string | null {
    if (!username.trim() || username.trim().length < 3) return 'Username must be at least 3 characters.';
    if (!password || password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirm) return 'Passwords do not match.';
    if (!name.trim()) return 'Full name is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.';
    if (!/^[+]?[\d\s-]{10,15}$/.test(contact.trim())) return 'Enter a valid phone number.';
    return null;
  }

  async function onSubmit() {
    const error = validate();
    if (error) {
      Alert.alert('Check the form', error);
      return;
    }
    setBusy(true);
    try {
      await signup({
        username: username.trim(),
        password,
        name: name.trim(),
        email: email.trim(),
        contact: contact.trim(),
        dob: dob.trim() || null,
        gender,
        address: address.trim() || null,
        bloodGroup,
        allergies: allergies.trim() || null,
        emergencyContact: emergencyContact.trim() || null,
      });
    } catch (e: any) {
      Alert.alert('Sign-up failed', e?.response?.data?.error || 'Please check your details and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center px-4 pt-14 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ArrowLeft color="#0f1729" size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
          className="items-center mb-8"
        >
          <View className="w-16 h-16 bg-primary-600 rounded-3xl items-center justify-center mb-3">
            <Stethoscope color="white" size={30} />
          </View>
          <Text className="text-2xl font-bold text-slate-900">Create your account</Text>
          <Text className="text-slate-500 mt-1 text-center">
            Register once to book appointments, view reports, and request an ambulance.
          </Text>
        </MotiView>

        <SectionLabel>Account</SectionLabel>
        <Field label="Username" value={username} onChange={setUsername} autoCapitalize="none" placeholder="Choose a username" />
        <Field label="Password" value={password} onChange={setPassword} secureTextEntry placeholder="At least 6 characters" />
        <Field label="Confirm password" value={confirm} onChange={setConfirm} secureTextEntry placeholder="Re-enter password" />

        <SectionLabel>Personal details</SectionLabel>
        <Field label="Full name" value={name} onChange={setName} placeholder="As on your ID" />
        <Field label="Email" value={email} onChange={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
        <Field label="Phone number" value={contact} onChange={setContact} keyboardType="phone-pad" placeholder="e.g. +91 98xxxxxx00" />
        <Field label="Date of birth" value={dob} onChange={setDob} placeholder="YYYY-MM-DD" />

        <Text className="text-sm font-medium text-slate-700 mb-2">Gender</Text>
        <ChipRow options={GENDERS} value={gender} onChange={setGender} />

        <Field label="Address" value={address} onChange={setAddress} multiline placeholder="Street, city, state, PIN" />

        <SectionLabel>Medical (optional but recommended)</SectionLabel>
        <Text className="text-sm font-medium text-slate-700 mb-2">Blood group</Text>
        <ChipRow options={BLOOD_GROUPS} value={bloodGroup} onChange={setBloodGroup} />
        <Field
          label="Allergies"
          value={allergies}
          onChange={setAllergies}
          multiline
          placeholder="e.g. Penicillin, peanuts. Leave blank if none."
        />
        <Field
          label="Emergency contact"
          value={emergencyContact}
          onChange={setEmergencyContact}
          placeholder="Name and phone of someone we can call"
        />

        <TouchableOpacity
          disabled={busy}
          onPress={onSubmit}
          className={`rounded-xl py-4 items-center mt-4 ${busy ? 'bg-primary-600/60' : 'bg-primary-600'}`}
        >
          {busy ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Create account</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-3 mt-2">{children}</Text>;
}

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2 mb-4">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            className={`px-3 py-2 rounded-lg border ${active ? 'bg-primary-600 border-primary-600' : 'bg-white border-slate-300'}`}
          >
            <Text className={active ? 'text-white text-sm font-medium' : 'text-slate-700 text-sm'}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
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
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences';
  multiline?: boolean;
  secureTextEntry?: boolean;
}) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-slate-700 mb-1">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        numberOfLines={multiline ? 3 : 1}
        className="border border-slate-300 rounded-xl px-4 py-3 text-base bg-white text-slate-900"
        style={multiline ? { minHeight: 70, textAlignVertical: 'top' } : undefined}
      />
    </View>
  );
}
