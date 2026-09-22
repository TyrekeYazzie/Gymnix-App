import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { topSetWeight, mostLoggedExercise } from '@/lib/workouts';
import { pickPaceType, paceTrend, formatPace } from '@/lib/cardioTrends';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import { useTheme } from '@/context/ThemeContext';
import {
  FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, Theme, Colors
} from '@/constants/theme';

// A compact, at-a-glance companion to the full charts on the Progress screen
// (src/app/progress.tsx) — same three trend-worthy categories, just a small
// chart instead of the full tabbed view + history list. Tapping "View all"
// is the only way to reach the detailed view; the tabs here only swap which
// chart is showing.
//
// Each metric is picked to actually show progress at a glance:
//   - Weight:   bodyweight per weigh-in (line).
//   - Strength: top-set weight for your most-logged exercise (line) — the
//               same measure the Progress screen charts per exercise. Summed
//               volume across mixed exercises was too noisy to read.
//   - Cardio:   pace (min per mile/km) for your most-logged distance
//               activity, per session (line). The line is drawn inverted so
//               a faster pace plots HIGHER — "up is progress", same as
//               Strength. The Progress screen also has weekly minutes.
type Metric = 'weight' | 'strength' | 'cardio';

function getTabs(colors: Colors): { key: Metric; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] {
  return [
    { key: 'weight',   label: 'Body Weight', icon: 'body-outline',    color: colors.neonBlue },
    { key: 'strength', label: 'Strength',    icon: 'barbell-outline', color: colors.primary },
    { key: 'cardio',   label: 'Cardio',      icon: 'heart-outline',   color: colors.neonGreen },
  ];
}

const SPARK_HEIGHT = 46;
const POINTS_LIMIT = 10;
// Enough recent workouts to reliably find the most-logged exercise and still
// have up to POINTS_LIMIT sessions of it to chart.
const WORKOUT_FETCH_LIMIT = 60;
// Same idea for cardio — enough to find the main activity's recent sessions.
const CARDIO_FETCH_LIMIT = 60;

interface WeightRow { weight_kg: number; created_at: string; }
interface WorkoutRow { name: string; sets: { reps: number; weight: number }[]; created_at: string; }
interface CardioRow { type: string; distance_km: number | null; duration: string | null; created_at: string; }

// maps values onto an evenly-spaced x axis within [0, width], scaled to fit
// [0, height] with a little breathing room — same approach as progress.tsx's
// linePoints, just kept local since it's only a few lines.
function linePoints(values: number[], width: number, height: number): { x: number; y: number }[] {
  if (values.length === 0 || width === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.15 || Math.max(Math.abs(max) * 0.1, 1);
  const lo = min - pad;
  const hi = max + pad;
  const span = hi - lo || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  return values.map((v, i) => ({
    x: values.length > 1 ? i * stepX : width / 2,
    y: height - ((v - lo) / span) * height,
  }));
}

export default function ProgressPreviewCard() {
  const router = useRouter();
  const { user } = useAuth();
  const { isImperial } = useProfile();
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const TABS = useMemo(() => getTabs(colors), [colors]);

  const [metric, setMetric] = useState<Metric>('weight');
  const [cardWidth, setCardWidth] = useState(0);

  const [weightVals, setWeightVals] = useState<number[]>([]);
  const [strengthVals, setStrengthVals] = useState<number[]>([]);
  const [strengthExercise, setStrengthExercise] = useState<string | null>(null);
  const [cardioRows, setCardioRows] = useState<CardioRow[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const toLbs = (kg: number) => kg * 2.2046;

    const [w, s, c] = await Promise.all([
      supabase.from('weight_logs').select('weight_kg, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(POINTS_LIMIT),
      supabase.from('workouts').select('name, sets, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(WORKOUT_FETCH_LIMIT),
      supabase.from('cardio_logs').select('type, distance_km, duration, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(CARDIO_FETCH_LIMIT),
    ]);

    if (w.error) console.error('Failed to load weight trend:', w.error.message);
    else setWeightVals((w.data as WeightRow[] ?? []).reverse().map(e => isImperial ? toLbs(e.weight_kg) : e.weight_kg));

    if (s.error) console.error('Failed to load strength trend:', s.error.message);
    else {
      const rows = (s.data as WorkoutRow[] ?? []);
      const exercise = mostLoggedExercise(rows);
      setStrengthExercise(exercise);
      setStrengthVals(
        rows
          .filter(r => r.name === exercise)
          .slice(0, POINTS_LIMIT)
          .reverse()
          .map(r => topSetWeight(r.sets))
      );
    }

    if (c.error) console.error('Failed to load cardio trend:', c.error.message);
    else setCardioRows(c.data as CardioRow[] ?? []);
  }, [user, isImperial]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const activeTab = TABS.find(t => t.key === metric)!;
  const isCardio = metric === 'cardio';
  const paceType = useMemo(() => pickPaceType(cardioRows), [cardioRows]);
  const pace = useMemo(
    () => paceType ? paceTrend(cardioRows, paceType, isImperial, POINTS_LIMIT) : { paces: [], average: null },
    [cardioRows, paceType, isImperial],
  );

  const values = metric === 'weight' ? weightVals : metric === 'strength' ? strengthVals : pace.paces;
  // Pace is plotted negated so faster (smaller) paces sit higher on the line.
  const points = linePoints(isCardio ? values.map(v => -v) : values, cardWidth, SPARK_HEIGHT);
  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');

  // Every metric compares its latest point against the first one shown.
  const current = values[values.length - 1];
  const first = values[0];
  const delta = current !== undefined && first !== undefined ? current - first : null;

  // Strength trending up is improvement; bodyweight and pace trending DOWN
  // are (lighter, faster) — matches the convention progress.tsx uses.
  const deltaIsGood = delta !== null && (metric === 'strength' ? delta >= 0 : delta <= 0);
  const deltaColor = delta === null || delta === 0 ? colors.textMuted : deltaIsGood ? colors.neonGreen : colors.accent;

  const weightUnit = isImperial ? 'lbs' : 'kg';
  const paceUnit = isImperial ? '/mi' : '/km';
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });

  const headline = isCardio
    ? { value: pace.average !== null ? formatPace(pace.average) : '—', unit: paceUnit, label: `avg ${paceType ?? ''} pace` }
    : { value: current !== undefined ? fmt(current) : '—', unit: weightUnit, label: metric === 'strength' ? `top set · ${strengthExercise ?? ''}` : null };
  const deltaText = delta === null ? '' : isCardio
    ? `${delta > 0 ? '+' : '−'}${formatPace(delta)} ${paceUnit} ${delta < 0 ? 'faster' : 'slower'} since first`
    : `${delta > 0 ? '+' : ''}${fmt(delta)} ${weightUnit} since first`;
  const emptyText = isCardio
    ? 'Log a run, walk, ride or row with a distance to see your pace'
    : `No ${activeTab.label.toLowerCase()} logs yet`;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
        <TouchableOpacity onPress={() => router.push('/progress')} activeOpacity={0.7} style={styles.viewAll}>
          <Text style={styles.viewAllText}>View all</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const active = t.key === metric;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, active && { borderColor: t.color, backgroundColor: t.color + '14' }]}
              onPress={() => setMetric(t.key)}
              activeOpacity={0.7}
            >
              <Ionicons name={t.icon} size={13} color={active ? t.color : colors.textMuted} />
              <Text style={[styles.tabLabel, active && { color: t.color, fontWeight: FONT_WEIGHTS.bold }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {values.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      ) : (
        <>
          <View style={styles.statsRow}>
            <Text style={styles.currentValue}>
              {headline.value} <Text style={styles.unit}>{headline.unit}</Text>
            </Text>
            {headline.label && (
              <Text style={styles.currentLabel} numberOfLines={1}>{headline.label}</Text>
            )}
          </View>
          {delta !== null && Math.abs(delta) >= (isCardio ? 1 / 60 : 0.05) && (
            <Text style={[styles.delta, { color: deltaColor }]}>{deltaText}</Text>
          )}

          <View style={styles.sparkWrap} onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}>
            {cardWidth > 0 && (
              <Svg width={cardWidth} height={SPARK_HEIGHT}>
                {points.length > 1 && (
                  <Polyline points={polyline} fill="none" stroke={activeTab.color} strokeWidth={2} />
                )}
                {points.map((p, i) => (
                  <Circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={i === points.length - 1 ? 4 : 2.5}
                    fill={i === points.length - 1 ? activeTab.color : colors.graphDot}
                  />
                ))}
              </Svg>
            )}
          </View>
        </>
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, CARD, SHADOWS } = theme;
  return StyleSheet.create({
  card: {
    ...CARD.default,
    ...SHADOWS.purple,
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.textPrimary,
  },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { fontSize: FONT_SIZES.xs, color: colors.textMuted, letterSpacing: 0.3 },

  tabRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.xs,
  },
  tabLabel: { fontSize: 10, color: colors.textMuted, letterSpacing: 0.2 },

  statsRow: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm, marginBottom: SPACING.xs },
  currentValue: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.black, color: colors.textPrimary },
  unit: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.medium, color: colors.textMuted },
  currentLabel: { flexShrink: 1, fontSize: FONT_SIZES.xs, color: colors.textSecondary },
  delta: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, marginBottom: SPACING.xs },

  sparkWrap: { width: '100%', height: SPARK_HEIGHT },

  emptyWrap: { paddingVertical: SPACING.lg, alignItems: 'center' },
  emptyText: { fontSize: FONT_SIZES.xs, color: colors.textMuted },
  });
}
