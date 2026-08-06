import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { useFonts } from 'expo-font';
import { CormorantGaramond_500Medium_Italic } from '@expo-google-fonts/cormorant-garamond';
import { Cinzel_600SemiBold } from '@expo-google-fonts/cinzel';
import { COLORS, SPACING } from '@/constants/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProfileProvider } from '@/context/ProfileContext';
import { useAuth } from '@/hooks/useAuth';

export default function Layout() {
  const router = useRouter();
  const segments = useSegments();
  const { session, loading: authLoading } = useAuth();
  const [fontsLoaded] = useFonts({ CormorantGaramond_500Medium_Italic, Cinzel_600SemiBold });
  const loading = authLoading || !fontsLoaded;

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!session && inTabsGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/dashboard');
    }
  }, [session, loading, segments]);

  // Always wrap everything in SafeAreaProvider
  // including the loading screen
  return (
    <ProfileProvider>
      <SafeAreaProvider>
        {loading ? (
          <View style={{
            flex: 1,
            backgroundColor: COLORS.bgPrimary,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{
              color: COLORS.textSecondary,
              marginTop: SPACING.lg,
            }}>
              Loading...
            </Text>
          </View>
        ) : (
          <Slot />
        )}
      </SafeAreaProvider>
    </ProfileProvider>
  );
}
