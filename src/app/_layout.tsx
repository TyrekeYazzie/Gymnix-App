import { supabase } from '@/lib/supabase';
import React, { useEffect } from 'react';
import { Slot, useNavigation, Redirect } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { COLORS, SPACING } from '@/constants/theme';

interface AuthContextType {
  session: any | null;
  loading: boolean;
}

export const AuthContext = React.createContext<AuthContextType>(
  { session: null, loading: true }
);

export function useAuth() {
  const authContext = React.useContext(AuthContext);
  if (!authContext) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return authContext;
}

export default function Layout() {
  const navigation = useNavigation();
  const [session, setSession] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bgPrimary, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.lg, fontFamily: 'monospace' }}>Loading...</Text>
      </View>
    );
  }

  if (session) {
    return <Slot href="/(tabs)/dashboard" />;
  }

  return <Slot href="/(auth)/login" />;
}