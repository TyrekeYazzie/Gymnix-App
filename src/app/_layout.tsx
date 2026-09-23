import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useFonts } from 'expo-font';
import { CormorantGaramond_500Medium_Italic } from '@expo-google-fonts/cormorant-garamond';
import { Cinzel_600SemiBold } from '@expo-google-fonts/cinzel';
import { SPACING, RADIUS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProfileProvider, useProfile } from '@/context/ProfileContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { Sentry } from '@/lib/sentry';
import ErrorFallback from '@/components/ErrorFallback';

function Layout() {
  const router = useRouter();
  const segments = useSegments();
  const { session, loading: authLoading } = useAuth();
  // ProfileProvider now wraps Layout (see RootLayout below) specifically so
  // this can read profile.onboarding_completed_at here — it couldn't when
  // ProfileProvider was rendered from inside Layout's own return, since that
  // put Layout's hooks outside the provider's subtree.
  const { profile, loading: profileLoading, loadFailed, refreshProfile } = useProfile();
  const { theme } = useTheme();
  const [fontsLoaded] = useFonts({ CormorantGaramond_500Medium_Italic, Cinzel_600SemiBold });
  const [retrying, setRetrying] = useState(false);
  // Only wait on the profile fetch once there's a session to fetch one for —
  // profileLoading never resolves to false until a user exists (see
  // ProfileContext), so gating on it unconditionally would hang the loading
  // screen forever on the logged-out login/signup screens.
  const loading = authLoading || !fontsLoaded || (!!session && profileLoading);
  // Signed in but the profile fetch failed (offline, Supabase down/paused).
  // Must not fall through to the onboarding redirect below — a missing
  // profile there means "never onboarded", and re-running onboarding would
  // overwrite the real profile with whatever the user re-enters.
  const profileUnavailable = !loading && !!session && !profile && loadFailed;

  const handleRetry = async () => {
    setRetrying(true);
    await refreshProfile();
    setRetrying(false);
  };

  useEffect(() => {
    if (loading || profileUnavailable) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inOnboarding = segments[0] === 'onboarding';
    const needsOnboarding = !!session && !profile?.onboarding_completed_at;

    if (!session && inTabsGroup) {
      router.replace('/(auth)/login');
    } else if (needsOnboarding && !inOnboarding) {
      router.replace('/onboarding');
    } else if (session && !needsOnboarding && (inAuthGroup || inOnboarding)) {
      router.replace('/(tabs)/dashboard');
    }
  }, [session, loading, profileUnavailable, segments, profile]);

  // Always wrap everything in SafeAreaProvider
  // including the loading screen
  return (
    <SafeAreaProvider>
      {loading ? (
        <View style={{
          flex: 1,
          backgroundColor: theme.colors.bgPrimary,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{
            color: theme.colors.textSecondary,
            marginTop: SPACING.lg,
          }}>
            Loading...
          </Text>
        </View>
      ) : profileUnavailable ? (
        <View style={{
          flex: 1,
          backgroundColor: theme.colors.bgPrimary,
          justifyContent: 'center',
          alignItems: 'center',
          padding: SPACING.xl,
        }}>
          <Text style={{ color: theme.colors.textPrimary, fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.black, marginBottom: SPACING.sm }}>
            Couldn't load your profile
          </Text>
          <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', marginBottom: SPACING.xl }}>
            Check your connection and try again.
          </Text>
          <TouchableOpacity
            onPress={handleRetry}
            disabled={retrying}
            activeOpacity={0.8}
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: RADIUS.md,
              paddingVertical: SPACING.md,
              paddingHorizontal: SPACING.xxl,
              opacity: retrying ? 0.6 : 1,
            }}
          >
            {retrying
              ? <ActivityIndicator color={theme.colors.textInverse} />
              : <Text style={{ color: theme.colors.textInverse, fontWeight: FONT_WEIGHTS.bold }}>Try again</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        // A real Stack (rather than a bare Slot) keeps (tabs) — and whichever
        // tab was active — mounted underneath pushed screens like /templates
        // or /achievements, so router.back() restores it instead of
        // recreating the tabs group fresh on its first tab (Dashboard).
        // Matches the pattern (auth)/_layout.tsx already uses one level down.
        <Stack screenOptions={{ headerShown: false }} />
      )}
    </SafeAreaProvider>
  );
}

// Catches render/lifecycle errors anywhere below it (auth state, fonts, and
// the entire routed app) that would otherwise crash to a blank screen or
// the native red-box, shows ErrorFallback instead, and reports the error to
// Sentry when EXPO_PUBLIC_SENTRY_DSN is configured (see src/lib/sentry.ts).
// Sentry.wrap also adds automatic touch/navigation breadcrumbs.
function RootLayout() {
  return (
    <Sentry.ErrorBoundary fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}>
      <ProfileProvider>
        <ThemeProvider>
          <Layout />
        </ThemeProvider>
      </ProfileProvider>
    </Sentry.ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
