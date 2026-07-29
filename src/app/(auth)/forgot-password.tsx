import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { validateEmail } from '@/utils/validation';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING, RADIUS, INPUT } from '@/constants/theme';

export default function ForgotPassword() {
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
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: Linking.createURL('/reset-password'),
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
          placeholderTextColor={COLORS.textMuted}
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
            ? <ActivityIndicator color={COLORS.textInverse} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  content: { padding: 24, paddingTop: 60 },
  title: { fontSize: 32, fontWeight: FONT_WEIGHTS.black, color: COLORS.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 40 },
  button: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    padding: 16, alignItems: 'center', marginTop: 16
  },
  buttonText: { color: COLORS.textInverse, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.md },
  error: { color: COLORS.error, marginBottom: 16 },
  link: { color: COLORS.primary, textAlign: 'center', marginTop: 24, fontSize: FONT_SIZES.sm },
});
