import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import type { AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { PRIVACY_URL, TERMS_URL } from '@/constants/links';
import { validateName, validateEmail, validatePassword, sanitizeInput } from '@/utils/validation';

// Plain-language versions of the sign-up errors people actually hit.
function signupErrorMessage(error: AuthError): string {
  const msg = error.message.toLowerCase();
  if (error.code === 'user_already_exists' || msg.includes('already registered')) {
    return 'An account with this email already exists. Log in instead, or use "Forgot password?" on the login screen.';
  }
  if (error.status === 429 || msg.includes('rate limit')) {
    return 'Too many sign-up attempts. Please wait a few minutes and try again.';
  }
  if (error.code === 'weak_password') return error.message;
  if (error.name === 'AuthRetryableFetchError') {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  return 'Something went wrong creating your account. Please try again.';
}

export default function Signup() {
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignup = async () => {
    setError('');

    const cleanName = sanitizeInput(fullName);
    const cleanEmail = email.trim().toLowerCase();

    const nameCheck = validateName(cleanName);
    if (!nameCheck.isValid) {
      setError(nameCheck.error!);
      return;
    }

    const emailCheck = validateEmail(cleanEmail);
    if (!emailCheck.isValid) {
      setError(emailCheck.error!);
      return;
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) {
      setError(passwordCheck.errors!.join('\n'));
      return;
    }

    setLoading(true);
    let signedIn = false;
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { full_name: cleanName } }
      });
      if (error) { setError(signupErrorMessage(error)); return; }
      // With email confirmation off, Supabase signs the new account straight
      // in. The root layout sees the session and moves on to choosing a
      // username, so keep the spinner up until it does instead of claiming a
      // confirmation email was sent.
      if (data.session) { signedIn = true; return; }
      // Confirmation on: no session until the emailed link is tapped.
      setSuccess(true);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      if (!signedIn) setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a confirmation link to {email.trim()}. Tap it, then log in.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.buttonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join Gymnix today</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor={colors.textMuted}
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Text style={styles.hint}>
          8+ characters, with upper and lowercase letters, a number, and a symbol
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.textInverse} />
            : <Text style={styles.buttonText}>Sign Up</Text>
          }
        </TouchableOpacity>

        <Text style={styles.legal}>
          By signing up, you agree to our{' '}
          <Text style={styles.legalLink} onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} accessibilityRole="link">
            Terms of Service
          </Text>
          {' '}and{' '}
          <Text style={styles.legalLink} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} accessibilityRole="link">
            Privacy Policy
          </Text>.
        </Text>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.link}>Already have an account? Login</Text>
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
    title: { fontSize: 32, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 },
    subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 40 },
    input: {
      backgroundColor: colors.bgTertiary, color: colors.textPrimary,
      borderColor: colors.borderDefault, borderWidth: 1,
      borderRadius: 12, padding: 16, marginBottom: 16
    },
    button: {
      backgroundColor: colors.primary, borderRadius: 12,
      padding: 16, alignItems: 'center', marginTop: 8
    },
    buttonText: { color: colors.textInverse, fontWeight: 'bold', fontSize: 16 },
    error: { color: colors.error, marginBottom: 16 },
    hint: { color: colors.textMuted, fontSize: 12, marginTop: -8, marginBottom: 16 },
    link: { color: colors.primary, textAlign: 'center', marginTop: 24 },
    legal: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 18 },
    legalLink: { color: colors.primary }
  });
}
