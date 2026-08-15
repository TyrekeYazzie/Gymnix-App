import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { UnlockedAchievement } from '@/types';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING, RADIUS } from '@/constants/theme';

// Dropped into each log modal's insert-save path, right after
// checkAndUnlockAchievements() resolves — same amber/gold banner treatment
// as the PR banner in WorkoutLog.tsx, generalized so all 5 log types share
// one component instead of five copies of the same styling. Usually
// renders at most one row, but a single save can cross more than one
// threshold at once (e.g. a workout that both hits 50 logged AND a 7-day
// streak), so this maps over the full list.
export default function AchievementUnlockBanner({ achievements }: { achievements: UnlockedAchievement[] }) {
  if (achievements.length === 0) return null;
  return (
    <>
      {achievements.map(a => (
        <View key={a.key} style={styles.banner}>
          <Ionicons name="ribbon" size={16} color={COLORS.neonYellow} />
          <Text style={styles.text}>Achievement unlocked: {a.name}!</Text>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.neonYellow + '18',
    borderWidth: 1, borderColor: COLORS.neonYellow,
  },
  text: { color: COLORS.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold },
});
