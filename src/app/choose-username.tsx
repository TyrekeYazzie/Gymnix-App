import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { signOut } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import { useTheme } from '@/context/ThemeContext';
import { USERNAME_PATTERN, normalizeUsername, isUsernameAvailable } from '@/lib/friends';
import { FONT_SIZES, FONT_WEIGHTS, SPACING, RADIUS, Theme } from '@/constants/theme';

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error';

// Shown by _layout to any signed-in account without a username — new users
// right after signup (before onboarding), existing users once, on their next
// launch after usernames were added. Usernames are how friends find you.
export default function ChooseUsernameScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { setProfile } = useProfile();
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [username, setUsername] = useState('');
  const [availability, setAvailability] = useState<Availability>('idle');
  const [saving, setSaving] = useState(false);
  const checkSeq = useRef(0);

  // Debounced availability check; the sequence number drops stale answers
  // that come back after the user has kept typing.
  useEffect(() => {
    if (!username) { setAvailability('idle'); return; }
    if (!USERNAME_PATTERN.test(username)) { setAvailability('invalid'); return; }
    setAvailability('checking');
    const seq = ++checkSeq.current;
    const t = setTimeout(async () => {
      const ok = await isUsernameAvailable(username);
      if (seq !== checkSeq.current) return;
      setAvailability(ok === null ? 'error' : ok ? 'available' : 'taken');
    }, 400);
    return () => clearTimeout(t);
  }, [username]);

  const handleSave = async () => {
    if (!user || availability !== 'available') return;
    setSaving(true);
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, username })
      .select()
      .single();
    setSaving(false);
    if (error) {
      // 23505 = someone grabbed it between the check and the save.
      if (error.code === '23505') { setAvailability('taken'); return; }
      Alert.alert('Could not save', 'Check your connection and try again.');
      return;
    }
    // _layout moves on (to onboarding or the dashboard) once the profile has a username.
    if (data) setProfile(data);
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const hint: { text: string; color: string } = {
    idle:      { text: '3–20 characters: letters, numbers and _', color: colors.textMuted },
    checking:  { text: 'Checking…', color: colors.textMuted },
    available: { text: `@${username} is available`, color: colors.neonGreen },
    taken:     { text: `@${username} is taken — try another`, color: colors.accent },
    invalid:   { text: 'Use 3–20 letters, numbers or _', color: colors.accent },
    error:     { text: "Couldn't check — check your connection", color: colors.accent },
  }[availability];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
        <Text style={styles.title}>Pick a username</Text>
        <Text style={styles.subtitle}>
          Friends use this to find and add you. It's shown on your profile to friends.
        </Text>

        <View style={[styles.inputWrap, availability === 'available' && { borderColor: colors.neonGreen }]}>
          <Text style={styles.at}>@</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={(t) => setUsername(normalizeUsername(t))}
            placeholder="username"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            maxLength={20}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            editable={!saving}
          />
          {availability === 'checking' && <ActivityIndicator size="small" color={colors.textMuted} />}
          {availability === 'available' && <Ionicons name="checkmark-circle" size={20} color={colors.neonGreen} />}
        </View>
        <Text style={[styles.hint, { color: hint.color }]}>{hint.text}</Text>

        <TouchableOpacity
          style={[styles.button, (availability !== 'available' || saving) && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={availability !== 'available' || saving}
          activeOpacity={0.8}
        >
          {saving
            ? <ActivityIndicator color={colors.textInverse} />
            : <Text style={styles.buttonText}>Continue</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogout} activeOpacity={0.7} style={styles.logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors } = theme;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    inner: { flex: 1, padding: SPACING.lg, paddingTop: SPACING.xxl },
    title: {
      fontSize: FONT_SIZES.xxl,
      fontWeight: FONT_WEIGHTS.black,
      color: colors.textPrimary,
      marginBottom: SPACING.xs,
    },
    subtitle: { fontSize: FONT_SIZES.sm, color: colors.textSecondary, marginBottom: SPACING.xl, lineHeight: 20 },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      backgroundColor: colors.bgSecondary,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
    },
    at: { fontSize: FONT_SIZES.lg, color: colors.textMuted, fontWeight: FONT_WEIGHTS.bold },
    input: { flex: 1, fontSize: FONT_SIZES.lg, color: colors.textPrimary, paddingVertical: SPACING.md },
    hint: { fontSize: FONT_SIZES.xs, marginTop: SPACING.sm, marginBottom: SPACING.xl },
    button: {
      backgroundColor: colors.primary,
      borderRadius: RADIUS.md,
      paddingVertical: 14,
      alignItems: 'center',
    },
    buttonText: { color: colors.textInverse, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.md },
    logout: { alignItems: 'center', padding: SPACING.lg },
    logoutText: { color: colors.textMuted, fontSize: FONT_SIZES.sm },
  });
}
