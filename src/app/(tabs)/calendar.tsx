import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import { useTheme } from '@/context/ThemeContext';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import { WORKOUT_CATEGORIES } from '@/constants/workoutCategories';
import { getCardioTypes } from '@/components/logs/CardioLog';
import { getSignedPhotoUrls } from '@/utils/workoutPhotos';
import { Workout, CardioLogEntry, WaterLogEntry, WeightLogEntry, Meal } from '@/types';
import {
  FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, Theme, Colors
} from '@/constants/theme';

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const VIEWER_WIDTH = Math.min(SCREEN_WIDTH - SPACING.xl * 2, 340);
const VIEWER_HEIGHT = Math.min(VIEWER_WIDTH * 1.25, SCREEN_HEIGHT * 0.6);

type LogType = 'workout' | 'cardio' | 'water' | 'meal' | 'weight';

function getLogTypeColors(colors: Colors): Record<LogType, string> {
  return {
    workout: colors.primary,
    cardio:  colors.neonGreen,
    meal:    colors.neonYellow,
    water:   colors.neonBlue,
    weight:  colors.neonOrange,
  };
}

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
  const { theme } = useTheme();
  const { colors, CARD } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const LOG_TYPE_COLORS = useMemo(() => getLogTypeColors(colors), [colors]);
  const CARDIO_TYPES = useMemo(() => getCardioTypes(colors), [colors]);
  const swipeHandlers = useSwipeTabs();

  const [monthDate, setMonthDate] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
  const [selected, setSelected] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [cardio, setCardio] = useState<CardioLogEntry[]>([]);
  const [water, setWater] = useState<WaterLogEntry[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [weights, setWeights] = useState<WeightLogEntry[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

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

    const photoPaths = (w.data ?? [])
      .map((row: Workout) => row.photo_path)
      .filter((p): p is string => !!p);
    setPhotoUrls(photoPaths.length > 0 ? await getSignedPhotoUrls(photoPaths) : {});
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

  // All photo paths logged on each day, oldest first. The corner badge shows
  // the last one (most recent); tapping a photo day opens all of them.
  const dayPhotos = useMemo(() => {
    const map = new Map<string, string[]>();
    const byTime = [...workouts].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    byTime.forEach(w => {
      if (!w.photo_path) return;
      const key = new Date(w.created_at).toDateString();
      const arr = map.get(key) ?? [];
      arr.push(w.photo_path);
      map.set(key, arr);
    });
    return map;
  }, [workouts]);

  const [viewerDay, setViewerDay] = useState<{ date: Date; paths: string[] } | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);

  const openDay = (date: Date) => {
    // Only offer paths whose signed URL has actually resolved, so the viewer
    // never opens onto a broken/loading image.
    const paths = (dayPhotos.get(date.toDateString()) ?? []).filter(p => photoUrls[p]);
    if (paths.length > 0) {
      setViewerDay({ date, paths });
      setViewerIndex(0);
    } else {
      setSelected(date);
    }
  };

  const closeViewer = () => setViewerDay(null);
  const advanceViewer = () => {
    if (!viewerDay) return;
    setViewerIndex(i => (i + 1) % viewerDay.paths.length);
  };
  const viewerUrl = viewerDay ? photoUrls[viewerDay.paths[viewerIndex]] : undefined;

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
      {/* Fixed top — the month grid stays put so you can always jump to a
          different day; only the selected day's details below it scroll. */}
      <View style={styles.fixedTop}>

        <Text style={styles.screenTitle}>Calendar</Text>
        <View style={styles.dividerLine} />

        {/* Month header */}
        <View style={styles.monthHeader}>
          <TouchableOpacity
            onPress={() => goMonth(-1)}
            style={styles.monthArrow}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
          >
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity
            onPress={() => goMonth(1)}
            style={styles.monthArrow}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Next month"
          >
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
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
              const dayPaths = dayPhotos.get(date.toDateString());
              const photoPath = dayPaths?.[dayPaths.length - 1];
              const photoUrl = photoPath ? photoUrls[photoPath] : undefined;
              const dayLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
              const logsLabel = types.length > 0 ? `, ${types.join(', ')} logged` : ', no logs';
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.cell}
                  onPress={() => openDay(date)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${dayLabel}${logsLabel}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={styles.cellCircleWrap}>
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
                    {photoUrl && <Image source={{ uri: photoUrl }} style={styles.cellPhotoBadge} />}
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

        {/* Selected day detail section title stays fixed with the grid above it */}
        <Text style={styles.sectionTitle}>
          {selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
      </View>

      <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
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
                      <Text style={styles.detailRowText}>
                        <Ionicons name={cat?.icon ?? 'barbell-outline'} size={13} color={cat?.color ?? colors.primary} /> {w.name}
                      </Text>
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
                      <Text style={styles.detailRowText}>
                        <Ionicons name={t?.icon ?? 'heart-outline'} size={13} color={t?.color ?? colors.neonGreen} /> {c.type}
                      </Text>
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

      {/* Photo viewer — dark backdrop closes, tapping the photo advances to the next one */}
      <Modal visible={!!viewerDay} transparent animationType="fade" onRequestClose={closeViewer}>
        <TouchableOpacity
          style={styles.viewerBackdrop}
          activeOpacity={1}
          onPress={closeViewer}
          accessibilityRole="button"
          accessibilityLabel="Close photo viewer"
        />
        {viewerDay && (
          <View style={styles.viewerCenter} pointerEvents="box-none">
            <Text style={styles.viewerDate}>
              {viewerDay.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={advanceViewer}
              style={styles.viewerImageWrap}
              accessibilityRole="button"
              accessibilityLabel={
                viewerDay.paths.length > 1
                  ? `Photo ${viewerIndex + 1} of ${viewerDay.paths.length}, tap for next photo`
                  : 'Workout photo'
              }
            >
              {viewerUrl && <Image source={{ uri: viewerUrl }} style={styles.viewerImage} resizeMode="cover" />}
            </TouchableOpacity>
            {viewerDay.paths.length > 1 && (
              <View style={styles.viewerDots}>
                {viewerDay.paths.map((_, i) => (
                  <View key={i} style={[styles.viewerDot, i === viewerIndex && styles.viewerDotActive]} />
                ))}
              </View>
            )}
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, CARD, SHADOWS } = theme;
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  fixedTop: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  listScroll: { flex: 1 },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl },

  screenTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.black,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  dividerLine: { height: 1, backgroundColor: colors.primary, width: 40, marginBottom: SPACING.lg },

  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  monthArrow: {
    width: 32, height: 32, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgTertiary,
  },
  monthLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.textPrimary,
  },

  calendarCard: { ...SHADOWS.purple, marginBottom: SPACING.lg },
  weekdayRow: { flexDirection: 'row', marginBottom: SPACING.sm },
  weekdayLabel: {
    width: `${100 / 7}%`, textAlign: 'center',
    fontSize: FONT_SIZES.xs, color: colors.textMuted, fontWeight: FONT_WEIGHTS.bold,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', marginBottom: SPACING.sm },
  cellCircleWrap: { position: 'relative' },
  cellCircle: {
    width: 30, height: 30, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  cellCircleToday: { borderWidth: 1.5, borderColor: colors.primary },
  cellCircleSelected: { backgroundColor: colors.primary },
  cellPhotoBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 13,
    height: 13,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: colors.bgElevated,
  },
  cellText: { fontSize: FONT_SIZES.sm, color: colors.textSecondary },
  cellTextToday: { color: colors.primary, fontWeight: FONT_WEIGHTS.bold },
  cellTextSelected: { color: colors.textInverse, fontWeight: FONT_WEIGHTS.bold },
  dotRow: { flexDirection: 'row', gap: 3, height: 8, marginTop: 3, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: RADIUS.full },

  sectionTitle: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, color: colors.textMuted, letterSpacing: 0.5, marginBottom: SPACING.md },

  detailCard: { marginBottom: SPACING.md },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  detailDot: { width: 8, height: 8, borderRadius: RADIUS.full },
  detailTitle: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: colors.textPrimary },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  detailRowText: { fontSize: FONT_SIZES.sm, color: colors.textSecondary },
  detailRowMeta: { fontSize: FONT_SIZES.xs, color: colors.textMuted },

  emptyState: { ...CARD.default, alignItems: 'center', paddingVertical: SPACING.xl },
  emptyText: { color: colors.textMuted, fontSize: FONT_SIZES.sm },

  // Photo viewer
  viewerBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.bgOverlay },
  viewerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  viewerDate: {
    color: colors.textInverse,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  viewerImageWrap: {
    width: VIEWER_WIDTH,
    height: VIEWER_HEIGHT,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: colors.bgTertiary,
    ...SHADOWS.purple,
  },
  viewerImage: { width: '100%', height: '100%' },
  viewerDots: { flexDirection: 'row', gap: 6, marginTop: SPACING.lg },
  viewerDot: { width: 6, height: 6, borderRadius: RADIUS.full, backgroundColor: 'rgba(247, 243, 233, 0.35)' },
  viewerDotActive: { backgroundColor: colors.textInverse, width: 16 },
  });
}
