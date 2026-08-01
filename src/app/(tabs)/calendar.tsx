import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import { WORKOUT_CATEGORIES } from '@/constants/workoutCategories';
import { CARDIO_TYPES } from '@/components/logs/CardioLog';
import { Workout, CardioLogEntry, WaterLogEntry, WeightLogEntry, Meal } from '@/types';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS, CARD
} from '@/constants/theme';

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type LogType = 'workout' | 'cardio' | 'water' | 'meal' | 'weight';

const LOG_TYPE_COLORS: Record<LogType, string> = {
  workout: COLORS.primary,
  cardio:  COLORS.neonGreen,
  meal:    COLORS.neonYellow,
  water:   COLORS.neonBlue,
  weight:  COLORS.neonOrange,
};

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

function buildGrid(monthDate: Date): (Date | null)[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const jsDow = new Date(year, month, 1).getDay(); // 0 = Sunday
  const leading = jsDow === 0 ? 6 : jsDow - 1; // Monday-first offset
  const cells: (Date | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarScreen() {
  const { user } = useAuth();
  const { isImperial } = useProfile();
  const swipeHandlers = useSwipeTabs();

  const [monthDate, setMonthDate] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
  const [selected, setSelected] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [cardio, setCardio] = useState<CardioLogEntry[]>([]);
  const [water, setWater] = useState<WaterLogEntry[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [weights, setWeights] = useState<WeightLogEntry[]>([]);

  const loadMonth = useCallback(async () => {
    if (!user) return;
    const start = monthDate;
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

    const [w, c, wt, m, wg] = await Promise.all([
      supabase.from('workouts').select('*').eq('user_id', user.id).gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
      supabase.from('cardio_logs').select('*').eq('user_id', user.id).gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
      supabase.from('water_logs').select('*').eq('user_id', user.id).gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
      supabase.from('calorie_logs').select('*').eq('user_id', user.id).gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
      supabase.from('weight_logs').select('*').eq('user_id', user.id).gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
    ]);
    if (!w.error) setWorkouts(w.data ?? []);
    if (!c.error) setCardio(c.data ?? []);
    if (!wt.error) setWater(wt.data ?? []);
    if (!m.error) setMeals(m.data ?? []);
    if (!wg.error) setWeights(wg.data ?? []);
  }, [user, monthDate]);

  useFocusEffect(useCallback(() => { loadMonth(); }, [loadMonth]));

  const dayTypes = useMemo(() => {
    const map = new Map<string, Set<LogType>>();
    const add = (dateStr: string, type: LogType) => {
      const key = new Date(dateStr).toDateString();
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(type);
    };
    workouts.forEach(w => add(w.created_at, 'workout'));
    cardio.forEach(c => add(c.created_at, 'cardio'));
    water.forEach(w => add(w.created_at, 'water'));
    meals.forEach(m => add(m.created_at, 'meal'));
    weights.forEach(w => add(w.created_at, 'weight'));
    return map;
  }, [workouts, cardio, water, meals, weights]);

  const grid = useMemo(() => buildGrid(monthDate), [monthDate]);
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const goMonth = (delta: number) => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + delta, 1));

  const selectedKey = selected.toDateString();
  const dayWorkouts = workouts.filter(w => new Date(w.created_at).toDateString() === selectedKey);
  const dayCardio = cardio.filter(c => new Date(c.created_at).toDateString() === selectedKey);
  const dayWater = water.filter(w => new Date(w.created_at).toDateString() === selectedKey);
  const dayMeals = meals.filter(m => new Date(m.created_at).toDateString() === selectedKey);
  const dayWeights = weights.filter(w => new Date(w.created_at).toDateString() === selectedKey);
  const hasAnyLogs = dayWorkouts.length + dayCardio.length + dayWater.length + dayMeals.length + dayWeights.length > 0;

  const totalWaterMl = dayWater.reduce((s, w) => s + w.amount_ml, 0);
  const totalCalories = dayMeals.reduce((s, m) => s + (m.calories ?? 0), 0);

  const weightUnit = isImperial ? 'lbs' : 'kg';
  const waterUnit = isImperial ? 'fl oz' : 'ml';
  const displayWeight = (kg: number) => isImperial ? kg * 2.2046 : kg;
  const displayWater = (ml: number) => isImperial ? ml * 0.033814 : ml;

  const getWorkoutCat = (name: string) => WORKOUT_CATEGORIES.find(c => c.name === name);
  const getCardioType = (name: string) => CARDIO_TYPES.find(c => c.name === name);

  return (
    <SafeAreaView style={styles.container} edges={['top']} {...swipeHandlers}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Text style={styles.screenTitle}>Calendar</Text>
        <View style={styles.dividerLine} />

        {/* Month header */}
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={() => goMonth(-1)} style={styles.monthArrow} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => goMonth(1)} style={styles.monthArrow} activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={[CARD.default, styles.calendarCard]}>
          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((l, i) => <Text key={i} style={styles.weekdayLabel}>{l}</Text>)}
          </View>

          <View style={styles.grid}>
            {grid.map((date, i) => {
              if (!date) return <View key={i} style={styles.cell} />;
              const types = Array.from(dayTypes.get(date.toDateString()) ?? []);
              const isToday = sameDay(date, today);
              const isSelected = sameDay(date, selected);
              return (
                <TouchableOpacity key={i} style={styles.cell} onPress={() => setSelected(date)} activeOpacity={0.7}>
                  <View style={[
                    styles.cellCircle,
                    isSelected && styles.cellCircleSelected,
                    isToday && !isSelected && styles.cellCircleToday,
                  ]}>
                    <Text style={[
                      styles.cellText,
                      isSelected && styles.cellTextSelected,
                      isToday && !isSelected && styles.cellTextToday,
                    ]}>
                      {date.getDate()}
                    </Text>
                  </View>
                  <View style={styles.dotRow}>
                    {types.slice(0, 4).map((t) => (
                      <View key={t} style={[styles.dot, { backgroundColor: LOG_TYPE_COLORS[t] }]} />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected day detail */}
        <Text style={styles.sectionTitle}>
          {selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        {!hasAnyLogs ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No logs for this day</Text>
          </View>
        ) : (
          <>
            {dayWorkouts.length > 0 && (
              <View style={[CARD.default, styles.detailCard]}>
                <View style={styles.detailHeader}>
                  <View style={[styles.detailDot, { backgroundColor: LOG_TYPE_COLORS.workout }]} />
                  <Text style={styles.detailTitle}>Workouts</Text>
                </View>
                {dayWorkouts.map((w) => {
                  const cat = w.category ? getWorkoutCat(w.category) : null;
                  return (
                    <View key={w.id} style={styles.detailRow}>
                      <Text style={styles.detailRowText}>{cat?.emoji ?? '🏋️'} {w.name}</Text>
                      <Text style={styles.detailRowMeta}>{w.sets?.length ?? 0} sets</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {dayCardio.length > 0 && (
              <View style={[CARD.default, styles.detailCard]}>
                <View style={styles.detailHeader}>
                  <View style={[styles.detailDot, { backgroundColor: LOG_TYPE_COLORS.cardio }]} />
                  <Text style={styles.detailTitle}>Cardio</Text>
                </View>
                {dayCardio.map((c) => {
                  const t = getCardioType(c.type);
                  return (
                    <View key={c.id} style={styles.detailRow}>
                      <Text style={styles.detailRowText}>{t?.emoji ?? '🏃'} {c.type}</Text>
                      <Text style={styles.detailRowMeta}>{c.duration ?? ''}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {dayMeals.length > 0 && (
              <View style={[CARD.default, styles.detailCard]}>
                <View style={styles.detailHeader}>
                  <View style={[styles.detailDot, { backgroundColor: LOG_TYPE_COLORS.meal }]} />
                  <Text style={styles.detailTitle}>Meals · {totalCalories} kcal</Text>
                </View>
                {dayMeals.map((m) => (
                  <View key={m.id} style={styles.detailRow}>
                    <Text style={styles.detailRowText}>{m.meal_name}</Text>
                    <Text style={styles.detailRowMeta}>{m.calories ?? 0} kcal</Text>
                  </View>
                ))}
              </View>
            )}

            {dayWater.length > 0 && (
              <View style={[CARD.default, styles.detailCard]}>
                <View style={styles.detailHeader}>
                  <View style={[styles.detailDot, { backgroundColor: LOG_TYPE_COLORS.water }]} />
                  <Text style={styles.detailTitle}>Water · {displayWater(totalWaterMl).toFixed(0)} {waterUnit}</Text>
                </View>
                <Text style={styles.detailRowMeta}>{dayWater.length} log{dayWater.length === 1 ? '' : 's'}</Text>
              </View>
            )}

            {dayWeights.length > 0 && (
              <View style={[CARD.default, styles.detailCard]}>
                <View style={styles.detailHeader}>
                  <View style={[styles.detailDot, { backgroundColor: LOG_TYPE_COLORS.weight }]} />
                  <Text style={styles.detailTitle}>Weight</Text>
                </View>
                {dayWeights.map((w) => (
                  <View key={w.id} style={styles.detailRow}>
                    <Text style={styles.detailRowText}>{displayWeight(w.weight_kg).toFixed(1)} {weightUnit}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },

  screenTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  dividerLine: { height: 1, backgroundColor: COLORS.primary, width: 40, marginBottom: SPACING.lg },

  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  monthArrow: {
    width: 32, height: 32, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgTertiary,
  },
  monthLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },

  calendarCard: { ...SHADOWS.purple, marginBottom: SPACING.lg },
  weekdayRow: { flexDirection: 'row', marginBottom: SPACING.sm },
  weekdayLabel: {
    width: `${100 / 7}%`, textAlign: 'center',
    fontSize: FONT_SIZES.xs, color: COLORS.textMuted, fontWeight: FONT_WEIGHTS.bold,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', marginBottom: SPACING.sm },
  cellCircle: {
    width: 30, height: 30, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  cellCircleToday: { borderWidth: 1.5, borderColor: COLORS.primary },
  cellCircleSelected: { backgroundColor: COLORS.primary },
  cellText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  cellTextToday: { color: COLORS.primary, fontWeight: FONT_WEIGHTS.bold },
  cellTextSelected: { color: COLORS.textInverse, fontWeight: FONT_WEIGHTS.bold },
  dotRow: { flexDirection: 'row', gap: 3, height: 8, marginTop: 3, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: RADIUS.full },

  sectionTitle: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textMuted, letterSpacing: 0.5, marginBottom: SPACING.md },

  detailCard: { marginBottom: SPACING.md },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  detailDot: { width: 8, height: 8, borderRadius: RADIUS.full },
  detailTitle: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  detailRowText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  detailRowMeta: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted },

  emptyState: { ...CARD.default, alignItems: 'center', paddingVertical: SPACING.xl },
  emptyText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm },
});
