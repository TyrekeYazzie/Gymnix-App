import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { PASSWORD_RESET_URL } from '@/constants/links';
import { validateEmail } from '@/utils/validation';
import { FONT_SIZES, FONT_WEIGHTS, SPACING, RADIUS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

export default function ForgotPassword() {
  const { theme } = useTheme();
  const { colors, INPUT } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    const emailCheck = validateEmail(cleanEmail);
    if (!emailCheck.isValid) {
      setError(emailCheck.error!);
      return;
    }

    setLoading(true);
    // The email links to an https hand-off page; `to` tells it where this
    // copy of the app listens (gymnix://… in a build, exp://… in Expo Go).
    const appUrl = Linking.createURL('/reset-password');
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${PASSWORD_RESET_URL}?to=${encodeURIComponent(appUrl)}`,
    });
    setLoading(false);

    // Always show the same confirmation regardless of whether the email is
    // registered — otherwise this becomes an account-enumeration oracle.
    if (error) console.error('resetPasswordForEmail failed:', error.message);
    setSent(true);
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            If an account exists for {email.trim()}, we've sent a link to reset your password.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.buttonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your email and we'll send you a reset link</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={INPUT.default}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={(text) => { setEmail(text); setError(''); }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.textInverse} />
            : <Text style={styles.buttonText}>Send Reset Link</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} disabled={loading}>
          <Text style={styles.link}>Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors } = theme;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    content: { padding: 24, paddingTop: 60 },
    title: { fontSize: 32, fontWeight: FONT_WEIGHTS.black, color: colors.textPrimary, marginBottom: 8 },
    subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 40 },
    button: {
      backgroundColor: colors.primary, borderRadius: RADIUS.md,
      padding: 16, alignItems: 'center', marginTop: 16
    },
    buttonText: { color: colors.textInverse, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.md },
    error: { color: colors.error, marginBottom: 16 },
    link: { color: colors.primary, textAlign: 'center', marginTop: 24, fontSize: FONT_SIZES.sm },
  });
}
