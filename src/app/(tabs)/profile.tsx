import React, { useState } from 'react'
import {
  View, Text, ScrollView,
  TouchableOpacity, StyleSheet
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'expo-router'
import { useProfile } from '@/context/ProfileContext'
import EditProfile from '@/components/EditProfile'
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS, CARD
} from '@/constants/theme'

export default function Profile() {
  const router = useRouter()
  const { profile, isImperial } = useProfile()
  const [editing, setEditing] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  // get initials from name or fallback
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  const heightDisplay = (() => {
    if (!profile?.height_cm) return '—'
    if (!isImperial) return `${Math.round(profile.height_cm)}`
    const totalIn = profile.height_cm / 2.54
    const ft = Math.floor(totalIn / 12)
    const inches = Math.round(totalIn % 12)
    return `${ft}'${inches}"`
  })()

  const weightDisplay = (() => {
    if (!profile?.weight_kg) return '—'
    if (!isImperial) return `${Math.round(profile.weight_kg)}`
    return `${Math.round(profile.weight_kg * 2.2046)}`
  })()

  if (editing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Edit Header */}
          <View style={styles.editHeader}>
            <Text style={styles.screenTitle}>EDIT PROFILE</Text>
            <TouchableOpacity onPress={() => setEditing(false)}>
              <Text style={styles.doneButton}>✕ DONE</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dividerLine} />

          <EditProfile />
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.screenTitle}>PROFILE</Text>
        <View style={styles.dividerLine} />

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.name}>
            {profile?.full_name ? profile.full_name.toUpperCase() : 'NO NAME SET'}
          </Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>◈ NIGHT DRIVER</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {profile?.age ?? '—'}
            </Text>
            <Text style={styles.statLabel}>AGE</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {heightDisplay}
            </Text>
            <Text style={styles.statLabel}>HEIGHT {isImperial ? '' : 'CM'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {weightDisplay}
            </Text>
            <Text style={styles.statLabel}>WEIGHT {isImperial ? 'LBS' : 'KG'}</Text>
          </View>
        </View>

        {/* Goals Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>◈ MISSION</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Goal</Text>
            <Text style={styles.rowValue}>
              {profile?.goal ?? 'Not set'}
            </Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Activity level</Text>
            <Text style={styles.rowValue}>
              {profile?.activity_level ?? 'Not set'}
            </Text>
          </View>
        </View>

        {/* Settings Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>◈ SETTINGS</Text>
          {[
            { label: 'Edit Profile', onPress: () => setEditing(true) },
            { label: 'Notifications', onPress: () => {} },
            { label: 'Privacy', onPress: () => {} },
            { label: 'Help & Support', onPress: () => {} },
          ].map((item, index, arr) => (
            <View key={item.label}>
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <Text style={styles.settingsLabel}>{item.label}</Text>
                <Text style={styles.settingsArrow}>›</Text>
              </TouchableOpacity>
              {index < arr.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>▸ LOG OUT</Text>
        </TouchableOpacity>

        <Text style={styles.version}>FitnessApp v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  screenTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
    letterSpacing: 4,
    marginBottom: SPACING.sm,
  },
  dividerLine: {
    height: 1,
    backgroundColor: COLORS.primary,
    width: 40,
    marginBottom: SPACING.xl,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  doneButton: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.sm,
    fontFamily: 'monospace',
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 2,
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.purple,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderFocus,
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.black,
    fontFamily: 'monospace',
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.black,
    fontFamily: 'monospace',
    letterSpacing: 3,
    marginBottom: SPACING.md,
  },
  levelBadge: {
    borderColor: COLORS.accent,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  levelText: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.xs,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },

  // Stats
  statsRow: {
    ...CARD.default,
    ...SHADOWS.purple,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginTop: SPACING.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.borderDefault,
  },

  // Cards
  card: {
    ...CARD.default,
    ...SHADOWS.purple,
    marginBottom: SPACING.lg,
  },
  cardTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 3,
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  rowLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    fontFamily: 'monospace',
  },
  rowValue: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    fontFamily: 'monospace',
  },
  rowDivider: {
    height: 1,
    backgroundColor: COLORS.borderDefault,
  },

  // Settings
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  settingsLabel: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    fontFamily: 'monospace',
  },
  settingsArrow: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.xl,
    fontFamily: 'monospace',
  },

  // Logout
  logoutButton: {
    backgroundColor: 'transparent',
    borderColor: COLORS.accent,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.crimson,
  },
  logoutText: {
    color: COLORS.accent,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: FONT_SIZES.md,
    fontFamily: 'monospace',
    letterSpacing: 3,
  },
  version: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    fontFamily: 'monospace',
    textAlign: 'center',
    letterSpacing: 2,
  },
})