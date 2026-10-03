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
import { useTheme } from '@/context/ThemeContext';
import {
  FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, Theme, Colors
} from '@/constants/theme';

function getToneColor(colors: Colors): Record<Insight['tone'], string> {
  return {
    positive: colors.neonGreen,
    negative: colors.accent,
    neutral: colors.neonBlue,
  };
}

function formatRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}

// A signed, colored "+2 vs last wk" line. goodWhenUp controls color:
// true = more is better (green up), false = less is better (green down),
// null = direction doesn't imply better/worse (e.g. body weight) so it
// always renders muted regardless of sign.
function Delta({ diff, suffix, goodWhenUp }: { diff: number; suffix: string; goodWhenUp: boolean | null }) {
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  if (diff === 0) {
    return <Text style={styles.tileDeltaFlat}>Same as last wk</Text>;
  }
  const up = diff > 0;
  const color = goodWhenUp === null ? colors.textMuted : (up === goodWhenUp ? colors.neonGreen : colors.accent);
  return (
    <View style={styles.tileDeltaRow}>
      <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={11} color={color} />
      <Text style={[styles.tileDeltaText, { color }]}>{Math.abs(diff)}{suffix} vs last wk</Text>
    </View>
  );
}

function StatTile({
  icon, iconColor, label, value, unit, caption, delta,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  unit?: string;
  caption?: string;
  delta?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.statTile}>
      <View style={styles.tileHeader}>
        <View style={[styles.tileIcon, { borderColor: iconColor }]}>
          <Ionicons name={icon} size={13} color={iconColor} />
        </View>
        <Text style={styles.tileLabel} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={styles.tileValue}>
        {value}{unit ? <Text style={styles.tileUnit}> {unit}</Text> : null}
      </Text>
      {caption && <Text style={styles.tileCaption}>{caption}</Text>}
      {delta}
    </View>
  );
}

export default function InsightsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, isImperial } = useProfile();
  const { theme } = useTheme();
  const { colors, CARD, SHADOWS } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const TONE_COLOR = useMemo(() => getToneColor(colors), [colors]);
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

    setThisWeek(computePeriodStats(thisWindow, w.data ?? [], c.data ?? [], wt.data ?? [], m.data ?? [], wg.data ?? [], DAILY_GOAL_ML, isImperial));
    setLastWeek(computePeriodStats(lastWindow, w.data ?? [], c.data ?? [], wt.data ?? [], m.data ?? [], wg.data ?? [], DAILY_GOAL_ML, isImperial));

    getMyWorkoutStreak().then(s => setStreak(s?.current_streak ?? 0));
    setLoading(false);
  }, [user, isImperial]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const thisWindow = currentWeekWindow();
  const lastWindow = previousWeekWindow(thisWindow);

  const weightUnit = isImperial ? 'lbs' : 'kg';
  const toDisplayWeight = (kg: number) => isImperial ? kg * 2.2046 : kg;
  const distanceUnit = isImperial ? 'mi' : 'km';
  const toDisplayDistance = (km: number) => isImperial ? km * 0.6213712 : km;

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
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Weekly Recap</Text>
        <Text style={styles.rangeText}>{formatRange(thisWindow.start, new Date())}</Text>
        <View style={styles.dividerLine} />

        {loading || !thisWeek || !lastWeek ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Highlights */}
            <Text style={styles.sectionTitle}>Highlights</Text>
            {insights.length === 0 ? (
              <View style={[CARD.default, styles.emptyState]}>
                <Text style={styles.emptyText}>Log a bit more this week to see insights here.</Text>
              </View>
            ) : (
              <View style={styles.insightsList}>
                {insights.map((insight, i) => (
                  <View key={i} style={[styles.insightCard, SHADOWS.subtle]}>
                    <View style={[styles.insightIcon, { borderColor: TONE_COLOR[insight.tone] }]}>
                      <Ionicons name={insight.icon} size={17} color={TONE_COLOR[insight.tone]} />
                    </View>
                    <Text style={styles.insightText}>{insight.text}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* This week vs last week */}
            <Text style={styles.sectionTitle}>This week vs last week</Text>
            <Text style={styles.rangeSubtext}>
              {formatRange(thisWindow.start, new Date())} compared to {formatRange(lastWindow.start, new Date(lastWindow.end.getTime() - 1))}
            </Text>

            <View style={styles.statsGrid}>
              <StatTile
                icon="barbell-outline" iconColor={colors.primary} label="WORKOUTS"
                value={`${thisWeek.workoutCount}`}
                delta={<Delta diff={thisWeek.workoutCount - lastWeek.workoutCount} suffix="" goodWhenUp={true} />}
              />
              <StatTile
                icon="trending-up-outline" iconColor={colors.primaryLight} label="VOLUME"
                value={thisWeek.workoutVolume.toLocaleString()} unit={weightUnit}
                delta={
                  lastWeek.workoutVolume > 0 && thisWeek.workoutVolume > 0
                    ? <Delta diff={Math.round(((thisWeek.workoutVolume - lastWeek.workoutVolume) / lastWeek.workoutVolume) * 100)} suffix="%" goodWhenUp={true} />
                    : undefined
                }
              />
              <StatTile
                icon="heart-outline" iconColor={colors.neonGreen} label="CARDIO"
                value={`${thisWeek.cardioMinutes}`} unit="min"
                caption={thisWeek.cardioDistanceKm > 0 ? `${toDisplayDistance(thisWeek.cardioDistanceKm).toFixed(1)} ${distanceUnit}` : undefined}
                delta={<Delta diff={thisWeek.cardioMinutes - lastWeek.cardioMinutes} suffix=" min" goodWhenUp={true} />}
              />
              <StatTile
                icon="water-outline" iconColor={colors.neonBlue} label="WATER GOAL"
                value={`${thisWeek.waterGoalDays}/7`} caption="days met"
                delta={<Delta diff={thisWeek.waterGoalDays - lastWeek.waterGoalDays} suffix=" days" goodWhenUp={true} />}
              />
              <StatTile
                icon="nutrition-outline" iconColor={colors.neonYellow} label="CALORIES"
                value={thisWeek.caloriesLoggedDays > 0 ? Math.round(thisWeek.caloriesAvgPerLoggedDay).toLocaleString() : '—'}
                unit={thisWeek.caloriesLoggedDays > 0 ? 'kcal/day' : undefined}
                caption={thisWeek.caloriesLoggedDays > 0 && targets.calorieGoal > 0 ? `${Math.round((thisWeek.caloriesAvgPerLoggedDay / targets.calorieGoal) * 100)}% of ${targets.calorieGoal.toLocaleString()} goal` : 'No meals logged'}
              />
              <StatTile
                icon="body-outline" iconColor={colors.neonOrange} label="WEIGHT"
                value={thisWeek.weightLast !== null ? toDisplayWeight(thisWeek.weightLast).toFixed(1) : '—'}
                unit={thisWeek.weightLast !== null ? weightUnit : undefined}
                delta={
                  thisWeek.weightLast !== null && lastWeek.weightLast !== null
                    ? <Delta diff={Math.round((toDisplayWeight(thisWeek.weightLast) - toDisplayWeight(lastWeek.weightLast)) * 10) / 10} suffix={` ${weightUnit}`} goodWhenUp={null} />
                    : undefined
                }
              />
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, CARD, SHADOWS } = theme;
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: SPACING.sm, alignSelf: 'flex-start' },
  backText: { color: colors.primary, fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, letterSpacing: 1 },
  screenTitle: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.black, color: colors.textPrimary, letterSpacing: 0.5 },
  rangeText: { fontSize: FONT_SIZES.md, color: colors.textSecondary, marginTop: SPACING.xs },
  dividerLine: { height: 1, backgroundColor: colors.primary, width: 40, marginTop: SPACING.md, marginBottom: SPACING.xl },

  loadingWrap: { paddingVertical: SPACING.xxxl, alignItems: 'center' },

  sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: colors.textPrimary, marginBottom: SPACING.xs },
  rangeSubtext: { fontSize: FONT_SIZES.sm, color: colors.textMuted, marginBottom: SPACING.lg },

  emptyState: { alignItems: 'center', paddingVertical: SPACING.xl, marginBottom: SPACING.xl },
  emptyText: { color: colors.textMuted, fontSize: FONT_SIZES.sm, textAlign: 'center' },

  // Highlights — each insight is its own card with real breathing room,
  // rather than tightly divided rows packed into one block.
  insightsList: { gap: SPACING.sm, marginBottom: SPACING.xl },
  insightCard: {
    ...CARD.default,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  insightIcon: { width: 40, height: 40, borderRadius: RADIUS.full, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  insightText: { flex: 1, fontSize: FONT_SIZES.md, color: colors.textPrimary, lineHeight: 22 },

  // This-week-vs-last-week — a 2-column grid of stat tiles instead of a
  // dense list, so each number gets its own space and a big, legible type
  // size instead of two tiers of small text crammed into one row.
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  statTile: {
    ...CARD.default,
    ...SHADOWS.subtle,
    flexBasis: '47%',
    flexGrow: 1,
  },
  tileHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.sm },
  tileIcon: { width: 24, height: 24, borderRadius: RADIUS.full, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tileLabel: { flex: 1, fontSize: 10, fontWeight: FONT_WEIGHTS.bold, color: colors.textMuted, letterSpacing: 0.5 },
  tileValue: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.black, color: colors.textPrimary },
  tileUnit: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.medium, color: colors.textMuted },
  tileCaption: { fontSize: FONT_SIZES.xs, color: colors.textMuted, marginTop: 2 },
  tileDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: SPACING.sm },
  tileDeltaText: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold },
  tileDeltaFlat: { fontSize: FONT_SIZES.xs, color: colors.textMuted, marginTop: SPACING.sm },
  });
}
