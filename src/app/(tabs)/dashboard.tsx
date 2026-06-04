import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS, CARD
} from '@/constants/theme';

export default function DashboardScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>GOOD MORNING</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutText}>LOG OUT</Text>
          </TouchableOpacity>
        </View>

        {/* Decorative line */}
        <View style={styles.dividerLine} />

        {/* Stats Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>TODAY'S STATS</Text>

          <Text style={styles.statLabel}>Calories Consumed</Text>
          <Text style={styles.statValue}>1240 / 2000</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {
              width: '62%',
              backgroundColor: COLORS.primary
            }]} />
          </View>

          <View style={{ height: SPACING.lg }} />

          <Text style={styles.statLabel}>Workouts This Week</Text>
          <Text style={styles.statValue}>3 / 4</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {
              width: '75%',
              backgroundColor: COLORS.neonGreen
            }]} />
          </View>
        </View>

        {/* Streak Card */}
        <View style={[styles.card, styles.streakCard]}>
          <Text style={styles.streakNumber}>7</Text>
          <Text style={styles.streakLabel}>DAY STREAK 🔥</Text>
          <View style={styles.streakBadge}>
            <Text style={styles.streakBadgeText}>KEEP IT UP</Text>
          </View>
        </View>

        {/* Recent Workouts */}
        <Text style={styles.sectionTitle}>RECENT WORKOUTS</Text>

        {[
          { name: 'Chest Day', category: 'Upper Body', date: 'Today' },
          { name: 'Leg Press', category: 'Lower Body', date: 'Yesterday' },
          { name: 'Back & Biceps', category: 'Pull Day', date: '2 days ago' },
        ].map((workout, index) => (
          <View key={index} style={styles.workoutCard}>
            <View style={styles.workoutLeft}>
              <Text style={styles.workoutName}>{workout.name}</Text>
              <Text style={styles.workoutCategory}>{workout.category}</Text>
            </View>
            <Text style={styles.workoutDate}>{workout.date}</Text>
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  greeting: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  date: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
    marginTop: SPACING.xs,
    letterSpacing: 1,
  },
  logoutButton: {
    borderColor: COLORS.accent,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  logoutText: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.xs,
    fontFamily: 'monospace',
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 1,
  },
  dividerLine: {
    height: 1,
    backgroundColor: COLORS.primary,
    width: 40,
    marginBottom: SPACING.lg,
  },
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
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
    marginBottom: SPACING.sm,
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.borderDefault,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  streakCard: {
    ...SHADOWS.crimson,
    borderColor: COLORS.accent,
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  streakNumber: {
    fontSize: FONT_SIZES.hero,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.accent,
    fontFamily: 'monospace',
  },
  streakLabel: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginTop: SPACING.xs,
  },
  streakBadge: {
    marginTop: SPACING.md,
    borderColor: COLORS.neonGreen,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  streakBadgeText: {
    color: COLORS.neonGreen,
    fontSize: FONT_SIZES.xs,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 3,
    marginBottom: SPACING.md,
  },
  workoutCard: {
    ...CARD.default,
    ...SHADOWS.subtle,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  workoutLeft: {
    flex: 1,
  },
  workoutName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  workoutCategory: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  workoutDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
});