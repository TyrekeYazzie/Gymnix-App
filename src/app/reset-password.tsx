import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { signOut } from '@/lib/auth';
import { validatePassword } from '@/utils/validation';
import { FONT_SIZES, FONT_WEIGHTS, RADIUS, Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

// Module-level so it survives this screen unmounting and remounting.
let exchangedCode: string | null = null;

export default function ResetPassword() {
  const { theme } = useTheme();
  const { colors, INPUT } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();

  const [exchanging, setExchanging] = useState(true);
  const [linkError, setLinkError] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!code) {
        setLinkError('This reset link is invalid or missing. Request a new one from the login screen.');
        setExchanging(false);
        return;
      }
      // The code is single-use (supabase deletes its PKCE verifier after the
      // first exchange). If this screen remounts after exchanging it, the
      // recovery session it created is already in place: reuse that rather
      // than fail a second exchange and wrongly report the link as expired.
      if (code === exchangedCode) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) setLinkError('This reset link has expired or already been used. Request a new one from the login screen.');
        setExchanging(false);
        return;
      }
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setLinkError('This reset link has expired or already been used. Request a new one from the login screen.');
      } else {
        exchangedCode = code;
      }
      setExchanging(false);
    })();
  }, [code]);

  const handleSave = async () => {
    setFormError('');

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) {
      setFormError(passwordCheck.errors!.join('\n'));
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    // The recovery session is single-purpose — sign out and require a
    // fresh login with the new password rather than leaving it active.
    await signOut();
    Alert.alert('Password updated', 'Please log in with your new password.');
    router.replace('/(auth)/login');
  };

  if (exchanging) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (linkError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>Link Problem</Text>
          <Text style={styles.subtitle}>{linkError}</Text>
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
        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.subtitle}>Choose a new password for your account</Text>

        {formError ? <Text style={styles.error}>{formError}</Text> : null}

        <TextInput
          style={INPUT.default}
          placeholder="New password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={(text) => { setPassword(text); setFormError(''); }}
          secureTextEntry
          editable={!saving}
        />
        <Text style={styles.hint}>
          8+ characters, with an uppercase letter, a number, and a symbol
        </Text>

        <TouchableOpacity
          style={[styles.button, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={colors.textInverse} />
            : <Text style={styles.buttonText}>Save New Password</Text>
          }
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
    centerContent: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 32, fontWeight: FONT_WEIGHTS.black, color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 24, textAlign: 'center' },
    hint: { color: colors.textMuted, fontSize: 12, marginTop: 8, marginBottom: 8 },
    button: {
      backgroundColor: colors.primary, borderRadius: RADIUS.md,
      padding: 16, alignItems: 'center', marginTop: 16
    },
    buttonText: { color: colors.textInverse, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.md },
    error: { color: colors.error, marginBottom: 16 },
  });
}
