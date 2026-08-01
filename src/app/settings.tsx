import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS, CARD
} from '@/constants/theme';

const SUPPORT_EMAIL = 'support@fitnessapp.example';

function Toggle({ value, onValueChange, disabled }: { value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.toggleTrack, value && styles.toggleTrackActive]}
      onPress={() => !disabled && onValueChange(!value)}
      activeOpacity={0.8}
      disabled={disabled}
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
      {onPress && !control && <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />}
    </Wrapper>
  );
}

export default function Settings() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, setProfile } = useProfile();
  const [savingUnits, setSavingUnits] = useState(false);
  const [savingReminders, setSavingReminders] = useState(false);

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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Account deletion requires manual confirmation for security. Email support and we\'ll process it within 48 hours.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Email Support',
          onPress: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Delete My Account&body=Please delete my account (${user?.email}).`),
        },
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
            <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.screenTitle}>Settings</Text>
        <View style={styles.dividerLine} />

        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <SettingsRow icon="mail-outline" iconColor={COLORS.neonBlue} label="Email" value={user?.email ?? '—'} />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon="swap-horizontal-outline"
            iconColor={COLORS.primary}
            label="Units"
            control={
              <View style={styles.toggleGroup}>
                <Text style={styles.toggleGroupLabel}>{isImperial ? 'Imperial' : 'Metric'}</Text>
                <Toggle value={isImperial} onValueChange={handleUnitsToggle} disabled={savingUnits} />
              </View>
            }
          />
        </View>

        {/* Training */}
        <Text style={styles.sectionTitle}>Training</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="calendar-outline"
            iconColor={COLORS.neonGreen}
            label="Weekly Routine"
            subtext="Set your training split by day"
            onPress={() => router.push('/routine')}
          />
        </View>

        {/* Preferences */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="notifications-outline"
            iconColor={COLORS.neonYellow}
            label="Daily Reminders"
            subtext="Get nudged to log workouts and water"
            control={
              <Toggle
                value={profile?.reminders_enabled ?? true}
                onValueChange={handleRemindersToggle}
                disabled={savingReminders}
              />
            }
          />
        </View>

        {/* Support */}
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="help-buoy-outline"
            iconColor={COLORS.neonGreen}
            label="Contact Support"
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          />
          <View style={styles.rowDivider} />
          <SettingsRow icon="information-circle-outline" iconColor={COLORS.textMuted} label="App Version" value={appVersion} />
        </View>

        {/* Danger Zone */}
        <Text style={styles.sectionTitle}>Danger zone</Text>
        <View style={[styles.card, styles.dangerCard]}>
          <SettingsRow
            icon="trash-outline"
            iconColor={COLORS.accent}
            label="Delete Account"
            labelColor={COLORS.accent}
            onPress={handleDeleteAccount}
          />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.accent} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  header: { marginBottom: SPACING.sm },
  backButtonRow: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  backButton: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 1,
  },
  screenTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  dividerLine: {
    height: 1,
    backgroundColor: COLORS.primary,
    width: 40,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textMuted,
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
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
  },
  rowSubtext: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },
  rowValue: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
  },
  rowDivider: {
    height: 1,
    backgroundColor: COLORS.borderDefault,
  },
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  toggleGroupLabel: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
  },
  toggleTrack: {
    width: 46,
    height: 26,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgTertiary,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    padding: 2,
    justifyContent: 'center',
  },
  toggleTrackActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.textMuted,
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    backgroundColor: COLORS.textPrimary,
    alignSelf: 'flex-end',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: 'transparent',
    borderColor: COLORS.accent,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginTop: SPACING.sm,
    ...SHADOWS.crimson,
  },
  logoutText: {
    color: COLORS.accent,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: FONT_SIZES.md,
    letterSpacing: 0.5,
  },
});
