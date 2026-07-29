import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView as SafeAreaProvider,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { COLORS } from '@/constants/theme';
import { validateName, validateEmail, validatePassword, sanitizeInput } from '@/utils/validation';

export default function Signup() {
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
    const { error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { full_name: cleanName } }
    });
    if (error) setError(error.message);
    else setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <SafeAreaProvider style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a confirmation link to {email}
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.buttonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join FitnessApp today</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor={COLORS.textMuted}
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor={COLORS.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={COLORS.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Text style={styles.hint}>
          8+ characters, with an uppercase letter, a number, and a symbol
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={COLORS.textInverse} />
            : <Text style={styles.buttonText}>Sign Up</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.link}>Already have an account? Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  content: { padding: 24, paddingTop: 60 },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 40 },
  input: {
    backgroundColor: COLORS.bgTertiary, color: COLORS.textPrimary,
    borderColor: COLORS.borderDefault, borderWidth: 1,
    borderRadius: 12, padding: 16, marginBottom: 16
  },
  button: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8
  },
  buttonText: { color: COLORS.textInverse, fontWeight: 'bold', fontSize: 16 },
  error: { color: COLORS.error, marginBottom: 16 },
  hint: { color: COLORS.textMuted, fontSize: 12, marginTop: -8, marginBottom: 16 },
  link: { color: COLORS.primary, textAlign: 'center', marginTop: 24 }
});