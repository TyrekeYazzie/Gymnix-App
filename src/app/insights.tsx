import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import { getMyWorkoutStreak } from '@/lib/streaks';
import { nutritionTargetsOrDefault } from '@/lib/nutrition';
import { DAILY_GOAL_ML } from '@/components/logs/WaterLog';
import {
  currentWeekWindow, previousWeekWindow, computePeriodStats, generateInsights,
  PeriodStats, Insight,
} from '@/lib/insights';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS, CARD
} from '@/constants/theme';

const TONE_COLOR: Record<Insight['tone'], string> = {
  positive: COLORS.neonGreen,
  negative: COLORS.accent,
  neutral: COLORS.neonBlue,
};

function formatRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}

function CompareRow({
  icon, iconColor, label, thisValue, lastValue,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  thisValue: string;
  lastValue: string;
}) {
  return (
    <View style={styles.compareRow}>
      <View style={[styles.compareIcon, { borderColor: iconColor }]}>
        <Ionicons name={icon} size={14} color={iconColor} />
      </View>
      <Text style={styles.compareLabel}>{label}</Text>
      <View style={styles.compareValues}>
        <Text style={styles.compareThis}>{thisValue}</Text>
        <Text style={styles.compareLast}>last: {lastValue}</Text>
      </View>
    </View>
  );
}

export default function InsightsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, isImperial } = useProfile();
  const [loading, setLoading] = useState(true);
  const [thisWeek, setThisWeek] = useState<PeriodStats | null>(null);
  const [lastWeek, setLastWeek] = useState<PeriodStats | null>(null);
  const [streak, setStreak] = useState(0);

  const targets = useMemo(() => nutritionTargetsOrDefault(profile), [profile]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const thisWindow = currentWeekWindow();
    const lastWindow = previousWeekWindow(thisWindow);
    const rangeStart = lastWindow.start.toISOString();

    const [w, c, wt, m, wg] = await Promise.all([
      supabase.from('workouts').select('sets, created_at').eq('user_id', user.id).gte('created_at', rangeStart),
      supabase.from('cardio_logs').select('duration, distance_km, created_at').eq('user_id', user.id).gte('created_at', rangeStart),
      supabase.from('water_logs').select('amount_ml, created_at').eq('user_id', user.id).gte('created_at', rangeStart),
      supabase.from('calorie_logs').select('calories, created_at').eq('user_id', user.id).gte('created_at', rangeStart),
      supabase.from('weight_logs').select('weight_kg, created_at').eq('user_id', user.id).gte('created_at', rangeStart),
    ]);
    [w, c, wt, m, wg].forEach(r => { if (r.error) console.error('Failed to load insights data:', r.error.message); });

    setThisWeek(computePeriodStats(thisWindow, w.data ?? [], c.data ?? [], wt.data ?? [], m.data ?? [], wg.data ?? [], DAILY_GOAL_ML));
    setLastWeek(computePeriodStats(lastWindow, w.data ?? [], c.data ?? [], wt.data ?? [], m.data ?? [], wg.data ?? [], DAILY_GOAL_ML));

    getMyWorkoutStreak().then(s => setStreak(s?.current_streak ?? 0));
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const thisWindow = currentWeekWindow();
  const lastWindow = previousWeekWindow(thisWindow);

  const weightUnit = isImperial ? 'lbs' : 'kg';
  const toDisplayWeight = (kg: number) => isImperial ? kg * 2.2046 : kg;
  const distanceUnit = isImperial ? 'mi' : 'km';
  const toDisplayDistance = (km: number) => isImperial ? km * 0.6213712 : km;
  const waterUnit = isImperial ? 'fl oz' : 'ml';
  const toDisplayWater = (ml: number) => isImperial ? ml * 0.033814 : ml;

  const insights = thisWeek && lastWeek
    ? generateInsights(thisWeek, lastWeek, {
        currentStreak: streak,
        weightUnit,
        toDisplayWeight,
        calorieGoal: targets.calorieGoal,
      })
    : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backRow}>
          <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Weekly Recap</Text>
        <Text style={styles.rangeText}>{formatRange(thisWindow.start, new Date())}</Text>
        <View style={styles.dividerLine} />

        {loading || !thisWeek || !lastWeek ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : (
          <>
            {/* Insight callouts */}
            <Text style={styles.sectionTitle}>THIS WEEK</Text>
            {insights.length === 0 ? (
              <View style={[CARD.default, styles.emptyState]}>
                <Text style={styles.emptyText}>Log a bit more this week to see insights here.</Text>
              </View>
            ) : (
              <View style={[CARD.default, SHADOWS.subtle, styles.insightsCard]}>
                {insights.map((insight, i) => (
                  <View key={i}>
                    {i > 0 && <View style={styles.rowDivider} />}
                    <View style={styles.insightRow}>
                      <View style={[styles.insightIcon, { borderColor: TONE_COLOR[insight.tone] }]}>
                        <Ionicons name={insight.icon} size={16} color={TONE_COLOR[insight.tone]} />
                      </View>
                      <Text style={styles.insightText}>{insight.text}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* This week vs last week */}
            <Text style={styles.sectionTitle}>THIS WEEK VS LAST WEEK</Text>
            <Text style={styles.rangeSubtext}>Last week: {formatRange(lastWindow.start, new Date(lastWindow.end.getTime() - 1))}</Text>
            <View style={[CARD.default, SHADOWS.subtle, styles.compareCard]}>
              <CompareRow
                icon="barbell-outline" iconColor={COLORS.primary} label="Workouts"
                thisValue={`${thisWeek.workoutCount}`} lastValue={`${lastWeek.workoutCount}`}
              />
              <View style={styles.rowDivider} />
              <CompareRow
                icon="trending-up-outline" iconColor={COLORS.primaryLight} label={`Volume (${weightUnit})`}
                thisValue={thisWeek.workoutVolume.toLocaleString()} lastValue={lastWeek.workoutVolume.toLocaleString()}
              />
              <View style={styles.rowDivider} />
              <CompareRow
                icon="heart-outline" iconColor={COLORS.neonGreen} label={`Cardio (min)`}
                thisValue={`${thisWeek.cardioMinutes}`} lastValue={`${lastWeek.cardioMinutes}`}
              />
              <View style={styles.rowDivider} />
              <CompareRow
                icon="navigate-outline" iconColor={COLORS.neonGreen} label={`Distance (${distanceUnit})`}
                thisValue={toDisplayDistance(thisWeek.cardioDistanceKm).toFixed(1)} lastValue={toDisplayDistance(lastWeek.cardioDistanceKm).toFixed(1)}
              />
              <View style={styles.rowDivider} />
              <CompareRow
                icon="water-outline" iconColor={COLORS.neonBlue} label="Water goal days"
                thisValue={`${thisWeek.waterGoalDays}/7`} lastValue={`${lastWeek.waterGoalDays}/7`}
              />
              <View style={styles.rowDivider} />
              <CompareRow
                icon="nutrition-outline" iconColor={COLORS.neonYellow} label="Avg kcal/day logged"
                thisValue={thisWeek.caloriesLoggedDays > 0 ? Math.round(thisWeek.caloriesAvgPerLoggedDay).toLocaleString() : '—'}
                lastValue={lastWeek.caloriesLoggedDays > 0 ? Math.round(lastWeek.caloriesAvgPerLoggedDay).toLocaleString() : '—'}
              />
              <View style={styles.rowDivider} />
              <CompareRow
                icon="body-outline" iconColor={COLORS.neonOrange} label={`Weight (${weightUnit})`}
                thisValue={thisWeek.weightLast !== null ? toDisplayWeight(thisWeek.weightLast).toFixed(1) : '—'}
                lastValue={lastWeek.weightLast !== null ? toDisplayWeight(lastWeek.weightLast).toFixed(1) : '—'}
              />
            </View>
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
  screenTitle: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.black, color: COLORS.textPrimary, letterSpacing: 0.5 },
  rangeText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  dividerLine: { height: 1, backgroundColor: COLORS.primary, width: 40, marginTop: SPACING.md, marginBottom: SPACING.xl },

  loadingWrap: { paddingVertical: SPACING.xxxl, alignItems: 'center' },

  sectionTitle: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginBottom: SPACING.sm },
  rangeSubtext: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: -SPACING.xs, marginBottom: SPACING.sm },

  emptyState: { alignItems: 'center', paddingVertical: SPACING.xl, marginBottom: SPACING.xl },
  emptyText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, textAlign: 'center' },

  insightsCard: { padding: SPACING.sm, marginBottom: SPACING.xl },
  insightRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm },
  insightIcon: { width: 32, height: 32, borderRadius: RADIUS.full, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  insightText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, lineHeight: 18 },
  rowDivider: { height: 1, backgroundColor: COLORS.borderDefault },

  compareCard: { padding: SPACING.sm },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm },
  compareIcon: { width: 28, height: 28, borderRadius: RADIUS.full, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  compareLabel: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  compareValues: { alignItems: 'flex-end' },
  compareThis: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
  compareLast: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
});
