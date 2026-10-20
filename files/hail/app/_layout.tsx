import '../global.css';
import '@/lib/locationTask'; // registers the background location task on native
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Sora_600SemiBold, Sora_700Bold, useFonts } from '@expo-google-fonts/sora';
import { Button } from '@/components/ui';
import { queryClient } from '@/lib/query';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { HOME_BY_ROLE } from '@/features/auth/routes';

void SplashScreen.preventAutoHideAsync();

/** Sends signed-out users to /sign-in and everyone else to the route group for their role. */
function AuthGate() {
  const { session, profile, loading, profileError, refreshProfile, signOut } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const group = segments[0] as string | undefined;

  useEffect(() => {
    if (loading) return;
    if (!session) {
      if (group !== '(auth)') router.replace('/(auth)/sign-in');
      return;
    }
    if (!profile) return;
    const home = HOME_BY_ROLE[profile.role];
    if (group !== home.group) router.replace(home.path);
  }, [loading, session, profile, group, router]);

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);

  if (!loading && session && !profile) {
    return (
      <View className="screen items-center justify-center gap-4 p-6">
        <Text className="title text-center">Couldn&apos;t load your account</Text>
        <Text className="subtitle text-center">
          {profileError ?? 'Your profile is missing. Sign out and try again.'}
        </Text>
        <Button title="Try again" onPress={() => void refreshProfile()} />
        <Button title="Sign out" variant="ghost" onPress={() => void signOut()} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Sora_600SemiBold, Sora_700Bold, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold,
  });
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="dark" />
            <AuthGate />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
