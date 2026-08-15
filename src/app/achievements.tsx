import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getMyAchievements } from '@/lib/achievements';
import { MyAchievement } from '@/types';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS, CARD
} from '@/constants/theme';

// Matches the category strings seeded in
// supabase/migrations/20260815010000_achievements.sql. 'streak' color
// reuses neonOrange to match the flame iconography already established on
// the Dashboard streak card and the Leaderboard's Streak tab.
const CATEGORY_META: Record<string, { label: string; color: string }> = {
  strength:    { label: 'Strength',    color: COLORS.accent },
  cardio:      { label: 'Cardio',      color: COLORS.neonGreen },
  nutrition:   { label: 'Nutrition',   color: COLORS.neonYellow },
  hydration:   { label: 'Hydration',   color: COLORS.neonBlue },
  consistency: { label: 'Consistency', color: COLORS.neonOrange },
  level:       { label: 'Level',       color: COLORS.primary },
};

function formatUnlockedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AchievementsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<MyAchievement[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setAchievements(await getMyAchievements());
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const unlockedCount = achievements.filter(a => a.unlocked_at).length;
  const percent = achievements.length ? Math.round((unlockedCount / achievements.length) * 100) : 0;

  const categories = Array.from(new Set(achievements.map(a => a.category)));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backRow}>
          <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Achievements</Text>
        <View style={styles.dividerLine} />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : (
          <>
            {/* Summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="trophy" size={22} color={COLORS.neonYellow} />
                <Text style={styles.summaryText}>{unlockedCount} of {achievements.length} unlocked</Text>
              </View>
              <View style={styles.summaryTrack}>
                <View style={[styles.summaryFill, { width: `${percent}%` as any }]} />
              </View>
            </View>

            {/* Grouped by category */}
            {categories.map(cat => {
              const meta = CATEGORY_META[cat] ?? { label: cat, color: COLORS.textMuted };
              const rows = achievements.filter(a => a.category === cat);
              return (
                <View key={cat}>
                  <Text style={styles.sectionTitle}>{meta.label.toUpperCase()}</Text>
                  <View style={styles.card}>
                    {rows.map((a, i) => {
                      const unlocked = !!a.unlocked_at;
                      return (
                        <View key={a.key}>
                          {i > 0 && <View style={styles.rowDivider} />}
                          <View style={styles.row}>
                            <View style={[
                              styles.badgeIcon,
                              { borderColor: unlocked ? meta.color : COLORS.borderDefault },
                            ]}>
                              <Ionicons
                                name={a.icon as keyof typeof Ionicons.glyphMap}
                                size={18}
                                color={unlocked ? meta.color : COLORS.textMuted}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.achName, !unlocked && styles.achNameLocked]}>{a.name}</Text>
                              <Text style={styles.achDescription}>{a.description}</Text>
                            </View>
                            {unlocked ? (
                              <View style={styles.unlockedBadge}>
                                <Ionicons name="checkmark" size={12} color={COLORS.neonGreen} />
                                <Text style={styles.unlockedText}>{formatUnlockedDate(a.unlocked_at!)}</Text>
                              </View>
                            ) : (
                              <Ionicons name="lock-closed-outline" size={16} color={COLORS.textMuted} />
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: SPACING.sm, alignSelf: 'flex-start' },
  backText: { color: COLORS.primary, fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, letterSpacing: 1 },
  screenTitle: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.black, color: COLORS.textPrimary, letterSpacing: 0.5, marginBottom: SPACING.sm },
  dividerLine: { height: 1, backgroundColor: COLORS.primary, width: 40, marginBottom: SPACING.xl },

  loadingWrap: { paddingVertical: SPACING.xxxl, alignItems: 'center' },

  summaryCard: { ...CARD.default, ...SHADOWS.purple, marginBottom: SPACING.xl },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  summaryText: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.black, color: COLORS.textPrimary },
  summaryTrack: { height: 8, backgroundColor: COLORS.bgTertiary, borderRadius: RADIUS.full, overflow: 'hidden' },
  summaryFill: { height: '100%', backgroundColor: COLORS.neonYellow, borderRadius: RADIUS.full },

  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },

  card: { ...CARD.default, ...SHADOWS.subtle, marginBottom: SPACING.lg, padding: SPACING.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  rowDivider: { height: 1, backgroundColor: COLORS.borderDefault },

  badgeIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achName: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
  achNameLocked: { color: COLORS.textMuted },
  achDescription: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 2 },

  unlockedBadge: { alignItems: 'flex-end', gap: 2 },
  unlockedText: { fontSize: 10, color: COLORS.textMuted, fontWeight: FONT_WEIGHTS.medium },
});
