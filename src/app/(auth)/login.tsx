import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING, RADIUS, BUTTON, INPUT } from '@/constants/theme';
import { recordFailedAttempt, isLockedOut, getRemainingLockoutTime, resetAttempts } from '@/utils/rateLimiter';

function formatLockoutTime(seconds: number): string {
  if (seconds <= 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (await isLockedOut(cleanEmail)) {
      const seconds = await getRemainingLockoutTime(cleanEmail);
      setError(`Too many failed attempts. Try again in ${formatLockoutTime(seconds)}.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          await recordFailedAttempt(cleanEmail);
          if (await isLockedOut(cleanEmail)) {
            const seconds = await getRemainingLockoutTime(cleanEmail);
            setError(`Too many failed attempts. Try again in ${formatLockoutTime(seconds)}.`);
          } else {
            setError('Incorrect email or password');
          }
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please verify your email before logging in');
        } else if (error.message.includes('Too many requests')) {
          setError('Too many attempts. Please wait a moment and try again');
        } else {
          setError('Something went wrong. Please try again');
        }
        return;
      }

      if (data.session) {
        await resetAttempts(cleanEmail);
        router.replace('/(tabs)/dashboard');
      }

    } catch (err) {
      setError('Something went wrong. Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bgPrimary }}>
      <ScrollView
        contentContainerStyle={{ padding: SPACING.lg, paddingTop: SPACING.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TextInput
          style={[INPUT.default, { borderColor: COLORS.borderDefault, marginBottom: SPACING.md }]}
          placeholder="you@example.com"
          placeholderTextColor={COLORS.textMuted}
          value={email}
          onChangeText={(text) => { setEmail(text); setError(''); }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          style={[INPUT.default, { borderColor: COLORS.borderDefault, marginBottom: SPACING.lg }]}
          placeholder="Enter your password"
          placeholderTextColor={COLORS.textMuted}
          value={password}
          onChangeText={(text) => { setPassword(text); setError(''); }}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          onPress={() => router.push('/(auth)/forgot-password')}
          disabled={loading}
          activeOpacity={0.7}
          style={{ alignSelf: 'flex-end', marginBottom: SPACING.lg }}
        >
          <Text style={[styles.linkText, { color: COLORS.primary }]}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.textInverse} />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push('/(auth)/signup')}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.linkText}>Don't have an account? <Text style={{ color: COLORS.primary }}>Sign Up</Text></Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  errorBox: {
    backgroundColor: COLORS.bgElevated,
    borderColor: COLORS.borderAccent,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.sm,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  buttonText: {
    color: COLORS.textInverse,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: FONT_SIZES.md,
  },
  linkRow: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  linkText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
});
