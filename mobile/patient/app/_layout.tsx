// Root layout. Loads stored auth state on mount, then either renders the
// authenticated tabs or the login screen via expo-router's redirect logic.
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

  useEffect(() => {
    hydrate().catch(() => undefined);
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    const first = segments[0];
    const inAuthGroup = first === '(tabs)';
    // Only bounce an already-authenticated user off the login/signup screens
    // (or the unresolved root) — NOT off every other screen. Screens like
    // /book, /ambulance, /edit-profile aren't in the '(tabs)' group either,
    // and a naive `!inAuthGroup` check here would redirect straight back to
    // the tabs the instant you navigate to any of them.
    const onAuthScreen = first === 'login' || first === 'signup' || first === undefined;
    if (!user && inAuthGroup) {
      router.replace('/login');
    } else if (user && onAuthScreen) {
      router.replace('/(tabs)');
    }
  }, [user, hydrated, segments, router]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" options={{ presentation: 'modal' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="book" options={{ presentation: 'modal' }} />
        <Stack.Screen name="ambulance" options={{ presentation: 'card' }} />
        <Stack.Screen name="medical-history" options={{ presentation: 'card' }} />
        <Stack.Screen name="report/[category]/[id]" options={{ presentation: 'card' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
