import React, { useMemo, useState } from 'react'
import {
  View, Text, ScrollView,
  TouchableOpacity, StyleSheet
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'expo-router'
import { useSwipeTabs } from '@/hooks/useSwipeTabs'
import { useProfile } from '@/context/ProfileContext'
import { useTheme } from '@/context/ThemeContext'
import EditProfile from '@/components/EditProfile'
import Ionicons from '@expo/vector-icons/Ionicons'
import {
  FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, Theme
} from '@/constants/theme'
import { xpProgress } from '@/lib/xp'
import { getRank } from '@/constants/ranks'
import RankMedallion from '@/components/RankMedallion'
import { ACTIVITY_LEVELS } from '@/constants/nutrition'

function DataRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <View style={styles.dataDots} />
      <Text style={[styles.dataValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  )
}

export default function Profile() {
  const router = useRouter()
  const { profile, isImperial } = useProfile()
  const { theme } = useTheme()
  const { colors } = theme
  const styles = useMemo(() => makeStyles(theme), [theme])
  const [editing, setEditing] = useState(false)
  const swipeHandlers = useSwipeTabs()

  const xp = xpProgress(profile?.total_xp ?? 0)
  const rank = getRank(xp.level)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  const heightDisplay = (() => {
    if (!profile?.height_cm) return '—'
    if (!isImperial) return `${Math.round(profile.height_cm)} CM`
    const totalIn = Math.round(profile.height_cm / 2.54)
    const ft = Math.floor(totalIn / 12)
    const inches = totalIn % 12
    return `${ft}'${inches}"`
  })()

  const weightDisplay = (() => {
    if (!profile?.weight_kg) return '—'
    if (!isImperial) return `${Math.round(profile.weight_kg)} KG`
    return `${Math.round(profile.weight_kg * 2.2046)} LBS`
  })()

  if (editing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.editHeader}>
            <TouchableOpacity onPress={() => setEditing(false)} style={styles.backRow} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={16} color={colors.primary} />
              <Text style={styles.backText}>BACK</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>EDIT PROFILE</Text>
          </View>
          <View style={styles.dividerLine} />
          <EditProfile />
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']} {...swipeHandlers}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerLabel}>Profile</Text>
            <Text style={styles.screenTitle}>
              {profile?.full_name || 'Your Profile'}
            </Text>
          </View>
          <View style={[styles.idTag, { borderColor: rank.color }]}>
            <Text style={[styles.idTagText, { color: rank.color }]}>Level {xp.level}</Text>
          </View>
        </View>
        <View style={styles.dividerLine} />

        {/* Avatar + quick stats card */}
        <View style={styles.hudCard}>
          <View style={styles.hudInner}>
            {/* Avatar panel */}
            <View style={styles.avatarPanel}>
              <View style={styles.avatarFrame}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              </View>
            </View>

            {/* Data panel */}
            <View style={styles.dataPanel}>
              <DataRow label="Age" value={profile?.age ? `${profile.age} yrs` : '—'} />
              <View style={styles.dataRowDivider} />
              <DataRow label="Height" value={heightDisplay} valueColor={colors.neonBlue} />
              <View style={styles.dataRowDivider} />
              <DataRow label="Weight" value={weightDisplay} valueColor={colors.neonBlue} />
              <View style={styles.dataRowDivider} />
              <DataRow
                label="Units"
                value={isImperial ? 'Imperial' : 'Metric'}
                valueColor={colors.textMuted}
              />
            </View>
          </View>
        </View>

        {/* Level / XP bar — tap through to the full rank chart */}
        <TouchableOpacity
          style={styles.clearanceCard}
          onPress={() => router.push('/rank-chart')}
          activeOpacity={0.8}
        >
          <View style={styles.clearanceHeader}>
            <RankMedallion rank={rank} size={40} />
            <View style={styles.clearanceHeaderText}>
              <Text style={styles.clearanceLabel}>Level {xp.level}</Text>
              <View style={[styles.rankBadge, { borderColor: rank.color }]}>
                <Text style={[styles.rankText, { color: rank.color }]}>{rank.name}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${xp.percent}%` as any, backgroundColor: rank.color }]} />
          </View>
          <View style={styles.xpFooter}>
            <Text style={styles.xpLabel}>{xp.current} XP</Text>
            <Text style={styles.xpLabel}>{(profile?.total_xp ?? 0).toLocaleString()} total</Text>
            <Text style={styles.xpLabel}>{xp.needed} to next</Text>
          </View>
        </TouchableOpacity>

        {/* About me */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>About Me</Text>
          <View style={styles.sectionLine} />
        </View>
        <View style={[styles.missionCard]}>
          <DataRow
            label="Goal"
            value={profile?.goal || 'Not set'}
            valueColor={colors.neonGreen}
          />
          <View style={styles.dataRowDivider} />
          <DataRow
            label="Activity"
            value={ACTIVITY_LEVELS.find(a => a.value === profile?.activity_level)?.label
              || profile?.activity_level
              || 'Not set'}
            valueColor={colors.neonGreen}
          />
        </View>

        {/* More */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>More</Text>
          <View style={styles.sectionLine} />
        </View>
        <View style={styles.systemCard}>
          <TouchableOpacity
            style={styles.systemRow}
            onPress={() => router.push('/progress')}
            activeOpacity={0.7}
          >
            <View style={[styles.sysIcon, { borderColor: colors.neonGreen }]}>
              <Ionicons name="trending-up-outline" size={14} color={colors.neonGreen} />
            </View>
            <Text style={styles.systemLabel}>Progress</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.dataRowDivider} />
          <TouchableOpacity
            style={styles.systemRow}
            onPress={() => router.push('/insights')}
            activeOpacity={0.7}
          >
            <View style={[styles.sysIcon, { borderColor: colors.neonBlue }]}>
              <Ionicons name="bar-chart-outline" size={14} color={colors.neonBlue} />
            </View>
            <Text style={styles.systemLabel}>Weekly Recap</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.dataRowDivider} />
          <TouchableOpacity
            style={styles.systemRow}
            onPress={() => router.push('/leaderboard')}
            activeOpacity={0.7}
          >
            <View style={[styles.sysIcon, { borderColor: colors.neonYellow }]}>
              <Ionicons name="trophy-outline" size={14} color={colors.neonYellow} />
            </View>
            <Text style={styles.systemLabel}>Leaderboard</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.dataRowDivider} />
          <TouchableOpacity
            style={styles.systemRow}
            onPress={() => router.push('/achievements')}
            activeOpacity={0.7}
          >
            <View style={[styles.sysIcon, { borderColor: colors.neonOrange }]}>
              <Ionicons name="ribbon-outline" size={14} color={colors.neonOrange} />
            </View>
            <Text style={styles.systemLabel}>Achievements</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.dataRowDivider} />
          <TouchableOpacity
            style={styles.systemRow}
            onPress={() => setEditing(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.sysIcon, { borderColor: colors.primary }]}>
              <Ionicons name="person-outline" size={14} color={colors.primary} />
            </View>
            <Text style={styles.systemLabel}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.dataRowDivider} />
          <TouchableOpacity
            style={styles.systemRow}
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
          >
            <View style={[styles.sysIcon, { borderColor: colors.accent }]}>
              <Ionicons name="settings-outline" size={14} color={colors.accent} />
            </View>
            <Text style={styles.systemLabel}>App Settings</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={16} color={colors.neonOrange} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>FitnessApp v1.0.0</Text>

      </ScrollView>
    </SafeAreaView>
  )
}

function makeStyles(theme: Theme) {
  const { colors, CARD, SHADOWS } = theme
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: SPACING.sm,
  },
  headerLabel: {
    fontSize: FONT_SIZES.xs,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.black,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  idTag: {
    borderWidth: 1,
    borderRadius: RADIUS.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  idTagText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.black,
    letterSpacing: 0.3,
  },
  dividerLine: {
    height: 1,
    backgroundColor: colors.primary,
    width: 40,
    marginBottom: SPACING.lg,
  },

  editHeader: { marginBottom: SPACING.sm },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: SPACING.sm },
  backText: {
    color: colors.primary,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 1,
  },

  // HUD card
  hudCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    position: 'relative',
    ...SHADOWS.purple,
  },
  hudInner: { flexDirection: 'row', gap: SPACING.lg, alignItems: 'center' },
  avatarPanel: { alignItems: 'center', gap: SPACING.xs },
  avatarFrame: {
    width: 80,
    height: 80,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  avatar: {
    width: 68,
    height: 68,
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.black,
  },
  dataPanel: { flex: 1, gap: 2 },
  dataRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  dataLabel: {
    color: colors.textMuted,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 1,
    width: 60,
  },
  dataDots: { flex: 1, borderBottomWidth: 1, borderBottomColor: colors.borderDefault, borderStyle: 'dotted', marginHorizontal: SPACING.xs },
  dataValue: {
    color: colors.textPrimary,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 1,
  },
  dataRowDivider: { height: 1, backgroundColor: colors.borderDefault },

  // Clearance card
  clearanceCard: {
    ...CARD.default,
    ...SHADOWS.purple,
    marginBottom: SPACING.lg,
  },
  clearanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  clearanceHeaderText: {
    flex: 1,
    gap: SPACING.xs,
  },
  clearanceLabel: {
    color: colors.textMuted,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 0.3,
  },
  rankBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: RADIUS.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  rankText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.black,
    letterSpacing: 0.3,
  },
  xpTrack: {
    height: 6,
    backgroundColor: colors.bgTertiary,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  xpFill: { height: '100%', borderRadius: RADIUS.full },
  xpFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  xpLabel: {
    color: colors.textMuted,
    fontSize: 9,
    letterSpacing: 1,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 0.5,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: colors.borderDefault },

  // Mission card
  missionCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    position: 'relative',
    gap: 2,
  },

  // System card
  systemCard: {
    ...CARD.default,
    marginBottom: SPACING.lg,
    gap: 0,
    padding: 0,
    overflow: 'hidden',
  },
  systemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  sysIcon: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: FONT_SIZES.md,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: colors.neonOrange + '66',
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  logoutText: {
    color: colors.neonOrange,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: FONT_SIZES.sm,
    letterSpacing: 0.5,
  },
  version: {
    color: colors.textMuted,
    fontSize: 9,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  })
}
