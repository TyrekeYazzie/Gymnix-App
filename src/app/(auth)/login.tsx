import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING, RADIUS, BUTTON, INPUT } from '@/constants/theme';

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

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Incorrect email or password');
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
        <Text style={{ fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.black, color: COLORS.textPrimary, fontFamily: 'monospace', letterSpacing: 2, marginBottom: SPACING.xs }}>FitnessApp</Text>
        <Text style={{ fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontFamily: 'monospace', marginBottom: SPACING.xl, letterSpacing: 1 }}>Your fitness journey starts here</Text>
        {error ? (
          <View style={{ backgroundColor: COLORS.bgElevated, borderColor: COLORS.borderAccent, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.lg, marginBottom: SPACING.xl }}>
            <Text style={{ color: COLORS.error, fontSize: FONT_SIZES.md, fontFamily: 'monospace', textAlign: 'center' }}>{error}</Text>
          </View>
        ) : null}

        <Text style={{ fontSize: FONT_SIZES.lg, color: COLORS.textPrimary, fontFamily: 'monospace', marginBottom: SPACING.sm }}>Email Address</Text>
        <TextInput
          style={[INPUT.default, { borderColor: COLORS.borderDefault }]}
          placeholder="you@example.com"
          placeholderTextColor={COLORS.textMuted}
          value={email}
          onChangeText={(text) => { setEmail(text); setError(''); }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!loading}
        />

        <Text style={{ fontSize: FONT_SIZES.lg, color: COLORS.textPrimary, fontFamily: 'monospace', marginBottom: SPACING.sm }}>Password</Text>
        <TextInput
          style={[INPUT.default, { borderColor: COLORS.borderDefault }]}
          placeholder="Enter your password"
          placeholderTextColor={COLORS.textMuted}
          value={password}
          onChangeText={(text) => { setPassword(text); setError(''); }}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          style={[BUTTON.primary, loading && BUTTON.ghost]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.textPrimary} />
          ) : (
            <Text style={{ color: COLORS.textPrimary, fontSize: FONT_SIZES.lg, fontFamily: 'monospace' }}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/signup')}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={{ color: COLORS.primary, textAlign: 'center', marginTop: SPACING.md, fontSize: FONT_SIZES.sm, fontFamily: 'monospace' }}>Don't have an account? Sign up</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
