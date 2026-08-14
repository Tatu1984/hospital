import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useAuth } from '@/lib/auth';
import '../global.css';

export default function RootLayout() {
  const { user, hydrated, hydrate } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });

  useEffect(() => { hydrate().catch(() => undefined); }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    const first = segments[0];
    const inAuthGroup = first === '(tabs)';
    // Only bounce an authenticated user off the login screen (or the
    // unresolved root) — not off every other screen like /ot/[id] or
    // /patient/[id], which also live outside the '(tabs)' group.
    const onAuthScreen = first === 'login' || first === undefined;
    if (!user && inAuthGroup) router.replace('/login');
    else if (user && onAuthScreen) router.replace('/(tabs)');
  }, [user, hydrated, segments, router]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="ot/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="patient/[id]" options={{ presentation: 'card' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
