import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Linking, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import { useTheme } from '@/context/ThemeContext';
import { deleteAllWorkoutPhotos } from '@/utils/workoutPhotos';
import { FONT_SIZES, FONT_WEIGHTS, SPACING, RADIUS, Theme } from '@/constants/theme';

const SUPPORT_EMAIL = 'ifitsupportcenter@gmail.com';

function Toggle({ value, onValueChange, disabled, label }: { value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <TouchableOpacity
      style={[styles.toggleTrack, value && styles.toggleTrackActive]}
      onPress={() => !disabled && onValueChange(!value)}
      activeOpacity={0.8}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
    >
      <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
    </TouchableOpacity>
  );
}

function SettingsRow({
  icon, iconColor, label, labelColor, subtext, value, onPress, control,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  labelColor?: string;
  subtext?: string;
  value?: string;
  onPress?: () => void;
  control?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, { borderColor: iconColor }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, labelColor && { color: labelColor, fontWeight: FONT_WEIGHTS.bold }]}>{label}</Text>
        {subtext && <Text style={styles.rowSubtext}>{subtext}</Text>}
      </View>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      {control}
      {onPress && !control && <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />}
    </Wrapper>
  );
}

export default function Settings() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, setProfile } = useProfile();
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [savingUnits, setSavingUnits] = useState(false);
  const [savingReminders, setSavingReminders] = useState(false);
  const [savingDarkMode, setSavingDarkMode] = useState(false);
  const [savingQuotes, setSavingQuotes] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const isImperial = profile?.units === 'imperial';

  const handleUnitsToggle = async (value: boolean) => {
    if (!user || !profile) return;
    setSavingUnits(true);
    const newUnits = value ? 'imperial' : 'metric';
    const { data, error } = await supabase
      .from('profiles')
      .update({ units: newUnits })
      .eq('id', user.id)
      .select()
      .single();
    setSavingUnits(false);
    if (error) { Alert.alert('Error', 'Could not update units'); return; }
    if (data) setProfile(data);
  };

  const handleRemindersToggle = async (value: boolean) => {
    if (!user || !profile) return;
    setSavingReminders(true);
    const { data, error } = await supabase
      .from('profiles')
      .update({ reminders_enabled: value })
      .eq('id', user.id)
      .select()
      .single();
    setSavingReminders(false);
    if (error) { Alert.alert('Error', 'Could not update reminder settings'); return; }
    if (data) setProfile(data);
  };

  const handleDarkModeToggle = async (value: boolean) => {
    if (!user || !profile) return;
    setSavingDarkMode(true);
    const { data, error } = await supabase
      .from('profiles')
      .update({ dark_mode_enabled: value })
      .eq('id', user.id)
      .select()
      .single();
    setSavingDarkMode(false);
    if (error) { Alert.alert('Error', 'Could not update night mode'); return; }
    if (data) setProfile(data);
  };

  const handleQuotesToggle = async (value: boolean) => {
    if (!user || !profile) return;
    setSavingQuotes(true);
    const { data, error } = await supabase
      .from('profiles')
      .update({ daily_quotes_enabled: value })
      .eq('id', user.id)
      .select()
      .single();
    setSavingQuotes(false);
    if (error) { Alert.alert('Error', 'Could not update daily quotes'); return; }
    if (data) setProfile(data);
  };

  const performAccountDeletion = async () => {
    if (!user) return;
    setDeletingAccount(true);
    // Best-effort: storage objects aren't covered by the cascade the RPC
    // below relies on, so clean those up first (see deleteAllWorkoutPhotos).
    await deleteAllWorkoutPhotos(user.id);
    const { error } = await supabase.rpc('delete_user');
    if (error) {
      setDeletingAccount(false);
      Alert.alert('Error', 'Could not delete your account. Please try again, or contact support if this keeps happening.');
      return;
    }
    // The row behind this session is gone; clear the local session too and
    // drop back to the login screen rather than leaving a dead session hanging.
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account and all your data — workouts, logs, photos, and progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performAccountDeletion },
      ]
    );
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButtonRow}>
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.screenTitle}>Settings</Text>
        <View style={styles.dividerLine} />

        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <SettingsRow icon="mail-outline" iconColor={colors.neonBlue} label="Email" value={user?.email ?? '—'} />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon="swap-horizontal-outline"
            iconColor={colors.primary}
            label="Units"
            control={
              <View style={styles.toggleGroup}>
                <Text style={styles.toggleGroupLabel}>{isImperial ? 'Imperial' : 'Metric'}</Text>
                <Toggle value={isImperial} onValueChange={handleUnitsToggle} disabled={savingUnits} label="Use imperial units" />
              </View>
            }
          />
        </View>

        {/* Training */}
        <Text style={styles.sectionTitle}>Training</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="calendar-outline"
            iconColor={colors.neonGreen}
            label="Weekly Routine"
            subtext="Set your training split by day"
            onPress={() => router.push('/routine')}
          />
        </View>

        {/* Nutrition */}
        <Text style={styles.sectionTitle}>Nutrition</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="restaurant-outline"
            iconColor={colors.accent}
            label="Nutrition Goals"
            subtext="Weight goal, pace, and activity level"
            onPress={() => router.push('/nutrition-goals')}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon="fast-food-outline"
            iconColor={colors.neonYellow}
            label="Custom Meals"
            subtext="Save your own meals for one-tap logging"
            onPress={() => router.push('/custom-meals')}
          />
        </View>

        {/* Preferences */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="moon-outline"
            iconColor={colors.primary}
            label="Night Mode"
            subtext="Switch to a darker theme, easier on the eyes at night"
            control={
              <Toggle
                value={profile?.dark_mode_enabled ?? false}
                onValueChange={handleDarkModeToggle}
                disabled={savingDarkMode}
                label="Night mode"
              />
            }
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon="sparkles-outline"
            iconColor={colors.neonYellow}
            label="Daily Quotes"
            subtext="Show a quote of the day on your Dashboard"
            control={
              <Toggle
                value={profile?.daily_quotes_enabled ?? false}
                onValueChange={handleQuotesToggle}
                disabled={savingQuotes}
                label="Daily quotes"
              />
            }
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon="notifications-outline"
            iconColor={colors.neonYellow}
            label="Daily Reminders"
            subtext="Get nudged to log workouts and water"
            control={
              <Toggle
                value={profile?.reminders_enabled ?? true}
                onValueChange={handleRemindersToggle}
                disabled={savingReminders}
                label="Daily reminders"
              />
            }
          />
        </View>

        {/* Support */}
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="help-buoy-outline"
            iconColor={colors.neonGreen}
            label="Contact Support"
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          />
          <View style={styles.rowDivider} />
          <SettingsRow icon="information-circle-outline" iconColor={colors.textMuted} label="App Version" value={appVersion} />
        </View>

        {/* Danger Zone */}
        <Text style={styles.sectionTitle}>Danger zone</Text>
        <View style={[styles.card, styles.dangerCard]}>
          <SettingsRow
            icon="trash-outline"
            iconColor={colors.accent}
            label="Delete Account"
            labelColor={colors.accent}
            onPress={deletingAccount ? undefined : handleDeleteAccount}
            control={deletingAccount ? <ActivityIndicator color={colors.accent} /> : undefined}
          />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={colors.accent} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, CARD, SHADOWS } = theme;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
    header: { marginBottom: SPACING.sm },
    backButtonRow: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
    backButton: {
      color: colors.primary,
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.bold,
      letterSpacing: 1,
    },
    screenTitle: {
      fontSize: FONT_SIZES.xxl,
      fontWeight: FONT_WEIGHTS.black,
      color: colors.textPrimary,
      letterSpacing: 0.5,
      marginBottom: SPACING.sm,
    },
    dividerLine: {
      height: 1,
      backgroundColor: colors.primary,
      width: 40,
      marginBottom: SPACING.xl,
    },
    sectionTitle: {
      fontSize: FONT_SIZES.xs,
      fontWeight: FONT_WEIGHTS.bold,
      color: colors.textMuted,
      letterSpacing: 0.5,
      marginBottom: SPACING.md,
    },
    card: {
      ...CARD.default,
      ...SHADOWS.purple,
      marginBottom: SPACING.lg,
    },
    dangerCard: {
      ...CARD.danger,
      ...SHADOWS.crimson,
      marginBottom: SPACING.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    rowIcon: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.full,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: {
      color: colors.textSecondary,
      fontSize: FONT_SIZES.md,
    },
    rowSubtext: {
      color: colors.textMuted,
      fontSize: FONT_SIZES.xs,
      marginTop: SPACING.xs,
    },
    rowValue: {
      color: colors.textPrimary,
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.bold,
    },
    rowDivider: {
      height: 1,
      backgroundColor: colors.borderDefault,
    },
    toggleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    toggleGroupLabel: {
      color: colors.textPrimary,
      fontSize: FONT_SIZES.xs,
      fontWeight: FONT_WEIGHTS.bold,
    },
    toggleTrack: {
      width: 46,
      height: 26,
      borderRadius: RADIUS.full,
      backgroundColor: colors.bgTertiary,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      padding: 2,
      justifyContent: 'center',
    },
    toggleTrackActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    toggleThumb: {
      width: 20,
      height: 20,
      borderRadius: RADIUS.full,
      backgroundColor: colors.textMuted,
      alignSelf: 'flex-start',
    },
    toggleThumbActive: {
      backgroundColor: colors.textPrimary,
      alignSelf: 'flex-end',
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      backgroundColor: 'transparent',
      borderColor: colors.accent,
      borderWidth: 1,
      borderRadius: RADIUS.md,
      padding: SPACING.lg,
      marginTop: SPACING.sm,
      ...SHADOWS.crimson,
    },
    logoutText: {
      color: colors.accent,
      fontWeight: FONT_WEIGHTS.bold,
      fontSize: FONT_SIZES.md,
      letterSpacing: 0.5,
    },
  });
}
