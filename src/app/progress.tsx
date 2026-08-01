import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Polyline, Circle, Line, Rect } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import { CARDIO_TYPES, KM_TO_MI } from '@/components/logs/CardioLog';
import { DAILY_GOAL_ML } from '@/components/logs/WaterLog';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS, CARD
} from '@/constants/theme';

const TABS = ['Weight', 'Strength', 'Water', 'Cardio'] as const;
type Tab = typeof TABS[number];

const CHART_WIDTH = Dimensions.get('window').width - (SPACING.lg + CARD.default.padding) * 2;
const CHART_HEIGHT = 140;

interface WeightEntry { id: string; weight_kg: number; created_at: string; }
interface WaterEntry { amount_ml: number; created_at: string; }
interface CardioEntry { id: string; type: string; distance_km: number | null; duration: string | null; calories: number | null; created_at: string; }
interface WorkoutEntry { id: string; name: string; sets: { reps: number; weight: number }[]; created_at: string; }

// maps values onto an evenly-spaced x axis within [0, width], scaled to fit [0, height] with a little breathing room
function linePoints(values: number[], width: number, height: number): { x: number; y: number }[] {
  if (values.length === 0) return [];
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

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff} days ago`;
};

export default function Progress() {
  const router = useRouter();
  const { user } = useAuth();
  const { isImperial } = useProfile();
  const [tab, setTab] = useState<Tab>('Weight');
  const [loading, setLoading] = useState(true);

  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);
  const [cardioEntries, setCardioEntries] = useState<CardioEntry[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntry[]>([]);
  const [cardioFilter, setCardioFilter] = useState('ALL');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [weightRes, waterRes, cardioRes, workoutRes] = await Promise.all([
      supabase.from('weight_logs').select('id,weight_kg,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
      supabase.from('water_logs').select('amount_ml,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(300),
      supabase.from('cardio_logs').select('id,type,distance_km,duration,calories,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
      supabase.from('workouts').select('id,name,sets,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200),
    ]);
    if (weightRes.error) console.error('Failed to load weight history:', weightRes.error.message);
    else setWeightEntries(weightRes.data ?? []);
    if (waterRes.error) console.error('Failed to load water history:', waterRes.error.message);
    else setWaterEntries(waterRes.data ?? []);
    if (cardioRes.error) console.error('Failed to load cardio history:', cardioRes.error.message);
    else setCardioEntries(cardioRes.data ?? []);
    if (workoutRes.error) console.error('Failed to load workout history:', workoutRes.error.message);
    else setWorkoutEntries(workoutRes.data ?? []);
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  // ── Weight ──────────────────────────────────────────────
  const toLbs = (kg: number) => kg * 2.2046;
  const displayWeight = (kg: number) => isImperial ? toLbs(kg) : kg;
  const weightUnit = isImperial ? 'lbs' : 'kg';
  const weightChrono = [...weightEntries].reverse();
  const weightValues = weightChrono.map(e => displayWeight(e.weight_kg));
  const weightPoints = linePoints(weightValues, CHART_WIDTH, CHART_HEIGHT);
  const weightPolyline = weightPoints.map(p => `${p.x},${p.y}`).join(' ');
  const currentWeight = weightEntries[0]?.weight_kg;
  const startWeight = weightChrono[0]?.weight_kg;
  const weightDelta = currentWeight !== undefined && startWeight !== undefined ? currentWeight - startWeight : null;

  // ── Strength ────────────────────────────────────────────
  // Sets don't carry their own unit — the number stored is whatever unit was
  // selected when logged, same assumption WorkoutLog's input already makes.
  const exerciseNames = Array.from(new Set(workoutEntries.map(w => w.name)));
  const activeExercise = selectedExercise && exerciseNames.includes(selectedExercise) ? selectedExercise : exerciseNames[0];
  const exerciseDesc = workoutEntries.filter(w => w.name === activeExercise);
  const exerciseChrono = [...exerciseDesc].reverse();
  const topSetWeight = (w: WorkoutEntry) => w.sets.length ? Math.max(...w.sets.map(s => s.weight)) : 0;
  const exerciseValues = exerciseChrono.map(topSetWeight);
  const exercisePoints = linePoints(exerciseValues, CHART_WIDTH, CHART_HEIGHT);
  const exercisePolyline = exercisePoints.map(p => `${p.x},${p.y}`).join(' ');
  const currentTop = exerciseValues[exerciseValues.length - 1];
  const startTop = exerciseValues[0];
  const exerciseDelta = currentTop !== undefined && startTop !== undefined ? currentTop - startTop : null;

  // ── Water ───────────────────────────────────────────────
  const toFlOz = (ml: number) => ml * 0.033814;
  const displayWater = (ml: number) => isImperial ? toFlOz(ml) : ml;
  const waterUnit = isImperial ? 'fl oz' : 'ml';
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return { date: d, totalMl: 0 };
  });
  waterEntries.forEach((e) => {
    const ed = new Date(e.created_at);
    ed.setHours(0, 0, 0, 0);
    const bucket = last7Days.find(d => d.date.getTime() === ed.getTime());
    if (bucket) bucket.totalMl += e.amount_ml;
  });
  const waterMax = Math.max(DAILY_GOAL_ML, ...last7Days.map(d => d.totalMl)) * 1.1;
  const daysMetGoal = last7Days.filter(d => d.totalMl >= DAILY_GOAL_ML).length;
  const avg7Day = last7Days.reduce((s, d) => s + d.totalMl, 0) / 7;

  // ── Cardio ──────────────────────────────────────────────
  const displayDistance = (km: number) => isImperial ? km * KM_TO_MI : km;
  const distanceUnit = isImperial ? 'mi' : 'km';
  const filteredCardio = cardioEntries.filter(e => cardioFilter === 'ALL' || e.type === cardioFilter);
  const totalDistanceKm = cardioEntries.reduce((s, e) => s + (e.distance_km ?? 0), 0);
  const totalDurationMin = cardioEntries.reduce((s, e) => s + (parseInt(e.duration ?? '0', 10) || 0), 0);
  const getCardioType = (t: string) => CARDIO_TYPES.find(c => c.name === t);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backRow}>
          <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Progress</Text>
        <View style={styles.dividerLine} />

        {/* Tabs */}
        <View style={styles.tabRow}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabButton, tab === t && styles.tabButtonActive]}
              onPress={() => setTab(t)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabButtonText, tab === t && styles.tabButtonTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── WEIGHT ── */}
        {tab === 'Weight' && (
          weightEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No weight logs yet</Text>
              <Text style={styles.emptySubText}>Log your weight to see your trend here</Text>
            </View>
          ) : (
            <>
              <View style={styles.summaryRow}>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryNumber}>{displayWeight(currentWeight!).toFixed(1)}</Text>
                  <Text style={styles.summaryLabel}>Current {weightUnit}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryBox}>
                  <Text style={[
                    styles.summaryNumber,
                    weightDelta !== null && { color: weightDelta < 0 ? COLORS.neonGreen : weightDelta > 0 ? COLORS.accent : COLORS.textPrimary },
                  ]}>
                    {weightDelta !== null ? `${weightDelta > 0 ? '+' : ''}${displayWeight(weightDelta).toFixed(1)}` : '—'}
                  </Text>
                  <Text style={styles.summaryLabel}>Change</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryNumber}>{weightEntries.length}</Text>
                  <Text style={styles.summaryLabel}>Entries</Text>
                </View>
              </View>

              <View style={[CARD.default, styles.chartCard]}>
                <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                  {[0, 0.5, 1].map((f) => (
                    <Line key={f} x1={0} x2={CHART_WIDTH} y1={CHART_HEIGHT * f} y2={CHART_HEIGHT * f} stroke={COLORS.graphGrid} strokeWidth={1} />
                  ))}
                  {weightPoints.length > 1 && (
                    <Polyline points={weightPolyline} fill="none" stroke={COLORS.graphLine} strokeWidth={2} />
                  )}
                  {weightPoints.map((p, i) => (
                    <Circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={i === weightPoints.length - 1 ? 4 : 3}
                      fill={i === weightPoints.length - 1 ? COLORS.graphDotToday : COLORS.graphDot}
                    />
                  ))}
                </Svg>
              </View>

              <Text style={styles.sectionTitle}>Recent entries</Text>
              {weightEntries.map((entry) => (
                <View key={entry.id} style={styles.listCard}>
                  <View style={[styles.listIcon, { borderColor: COLORS.neonBlue }]}>
                    <Ionicons name="body-outline" size={16} color={COLORS.neonBlue} />
                  </View>
                  <View style={styles.listLeft}>
                    <Text style={styles.listName}>{displayWeight(entry.weight_kg).toFixed(1)} {weightUnit}</Text>
                  </View>
                  <Text style={styles.listDate}>{formatDate(entry.created_at)}</Text>
                </View>
              ))}
            </>
          )
        )}

        {/* ── STRENGTH ── */}
        {tab === 'Strength' && (
          exerciseNames.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No workouts logged yet</Text>
              <Text style={styles.emptySubText}>Log a workout to see your strength trend here</Text>
            </View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.lg }}>
                <View style={styles.filterRow}>
                  {exerciseNames.map((name) => (
                    <TouchableOpacity
                      key={name}
                      style={[styles.filterPill, activeExercise === name && styles.filterPillActive]}
                      onPress={() => setSelectedExercise(name)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.filterPillText, activeExercise === name && styles.filterPillTextActive]}>{name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.summaryRow}>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryNumber}>{currentTop ?? '—'}</Text>
                  <Text style={styles.summaryLabel}>Top set now</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryBox}>
                  <Text style={[
                    styles.summaryNumber,
                    exerciseDelta !== null && { color: exerciseDelta > 0 ? COLORS.neonGreen : exerciseDelta < 0 ? COLORS.accent : COLORS.textPrimary },
                  ]}>
                    {exerciseDelta !== null ? `${exerciseDelta > 0 ? '+' : ''}${exerciseDelta}` : '—'}
                  </Text>
                  <Text style={styles.summaryLabel}>Change</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryNumber}>{exerciseDesc.length}</Text>
                  <Text style={styles.summaryLabel}>Sessions</Text>
                </View>
              </View>

              <View style={[CARD.default, styles.chartCard]}>
                <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                  {[0, 0.5, 1].map((f) => (
                    <Line key={f} x1={0} x2={CHART_WIDTH} y1={CHART_HEIGHT * f} y2={CHART_HEIGHT * f} stroke={COLORS.graphGrid} strokeWidth={1} />
                  ))}
                  {exercisePoints.length > 1 && (
                    <Polyline points={exercisePolyline} fill="none" stroke={COLORS.graphLine} strokeWidth={2} />
                  )}
                  {exercisePoints.map((p, i) => (
                    <Circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={i === exercisePoints.length - 1 ? 4 : 3}
                      fill={i === exercisePoints.length - 1 ? COLORS.graphDotToday : COLORS.graphDot}
                    />
                  ))}
                </Svg>
              </View>

              <Text style={styles.sectionTitle}>Recent sessions</Text>
              {exerciseDesc.map((entry) => (
                <View key={entry.id} style={styles.listCard}>
                  <View style={[styles.listIcon, { borderColor: COLORS.primary }]}>
                    <Ionicons name="barbell-outline" size={16} color={COLORS.primary} />
                  </View>
                  <View style={styles.listLeft}>
                    <Text style={styles.listName}>{topSetWeight(entry)} top set</Text>
                    <Text style={styles.listMeta}>{entry.sets.length} set{entry.sets.length === 1 ? '' : 's'}</Text>
                  </View>
                  <Text style={styles.listDate}>{formatDate(entry.created_at)}</Text>
                </View>
              ))}
            </>
          )
        )}

        {/* ── WATER ── */}
        {tab === 'Water' && (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryNumber}>{displayWater(avg7Day).toFixed(0)}</Text>
                <Text style={styles.summaryLabel}>Avg/day {waterUnit}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryBox}>
                <Text style={styles.summaryNumber}>{daysMetGoal}/7</Text>
                <Text style={styles.summaryLabel}>Goal met</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryBox}>
                <Text style={styles.summaryNumber}>{displayWater(Math.max(...last7Days.map(d => d.totalMl))).toFixed(0)}</Text>
                <Text style={styles.summaryLabel}>Best day</Text>
              </View>
            </View>

            <View style={[CARD.default, styles.chartCard]}>
              <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                <Line
                  x1={0} x2={CHART_WIDTH}
                  y1={CHART_HEIGHT - (DAILY_GOAL_ML / waterMax) * CHART_HEIGHT}
                  y2={CHART_HEIGHT - (DAILY_GOAL_ML / waterMax) * CHART_HEIGHT}
                  stroke={COLORS.graphGoalLine} strokeWidth={1} strokeDasharray="4,4"
                />
                {last7Days.map((d, i) => {
                  const barWidth = (CHART_WIDTH / 7) * 0.5;
                  const barHeight = Math.max((d.totalMl / waterMax) * CHART_HEIGHT, 2);
                  const x = (CHART_WIDTH / 7) * i + (CHART_WIDTH / 7 - barWidth) / 2;
                  const met = d.totalMl >= DAILY_GOAL_ML;
                  return (
                    <Rect
                      key={i}
                      x={x}
                      y={CHART_HEIGHT - barHeight}
                      width={barWidth}
                      height={barHeight}
                      rx={3}
                      fill={met ? COLORS.graphDotToday : COLORS.graphDot}
                    />
                  );
                })}
              </Svg>
              <View style={styles.weekdayRow}>
                {last7Days.map((d, i) => (
                  <Text key={i} style={styles.weekdayLabel}>
                    {d.date.toLocaleDateString('en-US', { weekday: 'narrow' })}
                  </Text>
                ))}
              </View>
            </View>

            <Text style={styles.sectionTitle}>Recent entries</Text>
            {waterEntries.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No water logs yet</Text>
                <Text style={styles.emptySubText}>Log water to see your trend here</Text>
              </View>
            ) : (
              waterEntries.slice(0, 15).map((entry, i) => (
                <View key={i} style={styles.listCard}>
                  <View style={[styles.listIcon, { borderColor: COLORS.neonBlue }]}>
                    <Ionicons name="water-outline" size={16} color={COLORS.neonBlue} />
                  </View>
                  <View style={styles.listLeft}>
                    <Text style={styles.listName}>{displayWater(entry.amount_ml).toFixed(0)} {waterUnit}</Text>
                  </View>
                  <Text style={styles.listDate}>{formatDate(entry.created_at)}</Text>
                </View>
              ))
            )}
          </>
        )}

        {/* ── CARDIO ── */}
        {tab === 'Cardio' && (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryNumber}>{cardioEntries.length}</Text>
                <Text style={styles.summaryLabel}>Sessions</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryBox}>
                <Text style={styles.summaryNumber}>{displayDistance(totalDistanceKm).toFixed(1)}</Text>
                <Text style={styles.summaryLabel}>{distanceUnit} total</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryBox}>
                <Text style={styles.summaryNumber}>{totalDurationMin}</Text>
                <Text style={styles.summaryLabel}>Min total</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.lg }}>
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[styles.filterPill, cardioFilter === 'ALL' && styles.filterPillActive]}
                  onPress={() => setCardioFilter('ALL')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterPillText, cardioFilter === 'ALL' && styles.filterPillTextActive]}>All</Text>
                </TouchableOpacity>
                {CARDIO_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.name}
                    style={[
                      styles.filterPill,
                      cardioFilter === t.name && { backgroundColor: t.color, borderColor: t.color },
                    ]}
                    onPress={() => setCardioFilter(t.name)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.filterPillEmoji}>{t.emoji}</Text>
                    <Text style={[styles.filterPillText, cardioFilter === t.name && styles.filterPillTextActive]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.sectionTitle}>
              {cardioFilter === 'ALL' ? 'Recent sessions' : cardioFilter}
            </Text>
            {filteredCardio.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No cardio logs found</Text>
                <Text style={styles.emptySubText}>Log a session to see it here</Text>
              </View>
            ) : (
              filteredCardio.map((entry) => {
                const t = getCardioType(entry.type);
                return (
                  <View key={entry.id} style={styles.listCard}>
                    <View style={[styles.listIcon, { borderColor: t?.color ?? COLORS.neonGreen }]}>
                      <Text style={styles.listIconEmoji}>{t?.emoji ?? '🏃'}</Text>
                    </View>
                    <View style={styles.listLeft}>
                      <Text style={styles.listName}>{entry.type}</Text>
                      <Text style={styles.listMeta}>
                        {entry.distance_km != null ? `${displayDistance(entry.distance_km).toFixed(1)} ${distanceUnit} • ` : ''}
                        {entry.duration ?? ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.listDate}>{formatDate(entry.created_at)}</Text>
                      {entry.calories != null && <Text style={styles.listCalories}>{entry.calories} kcal</Text>}
                    </View>
                  </View>
                );
              })
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

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: SPACING.sm },
  backText: { color: COLORS.primary, fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, letterSpacing: 1 },
  screenTitle: {
    fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.black,
    color: COLORS.textPrimary, letterSpacing: 0.3,
  },
  dividerLine: { height: 1, backgroundColor: COLORS.primary, width: 40, marginTop: SPACING.sm, marginBottom: SPACING.lg },

  tabRow: {
    flexDirection: 'row', backgroundColor: COLORS.bgTertiary,
    borderRadius: RADIUS.md, padding: 4, marginBottom: SPACING.lg,
  },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm, borderRadius: RADIUS.sm },
  tabButtonActive: { backgroundColor: COLORS.primary },
  tabButtonText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: FONT_WEIGHTS.bold, letterSpacing: 1 },
  tabButtonTextActive: { color: COLORS.textInverse },

  summaryRow: {
    ...CARD.default, ...SHADOWS.purple,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.lg, paddingVertical: SPACING.lg,
  },
  summaryBox: { flex: 1, alignItems: 'center' },
  summaryNumber: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.black, color: COLORS.textPrimary },
  summaryLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, letterSpacing: 0.5, marginTop: SPACING.xs, textAlign: 'center' },
  summaryDivider: { width: 1, height: 40, backgroundColor: COLORS.borderDefault },

  chartCard: { marginBottom: SPACING.lg, alignItems: 'center' },
  weekdayRow: { flexDirection: 'row', width: CHART_WIDTH, marginTop: SPACING.xs },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: FONT_SIZES.xs, color: COLORS.textMuted },

  filterRow: { flexDirection: 'row', gap: SPACING.sm },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.bgTertiary, borderColor: COLORS.borderDefault, borderWidth: 1,
    borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  filterPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterPillEmoji: { fontSize: FONT_SIZES.sm },
  filterPillText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: FONT_WEIGHTS.bold, letterSpacing: 1 },
  filterPillTextActive: { color: COLORS.textInverse },

  sectionTitle: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textMuted, letterSpacing: 0.5, marginBottom: SPACING.md },

  listCard: {
    ...CARD.default, ...SHADOWS.subtle,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm,
  },
  listIcon: { width: 42, height: 42, borderRadius: RADIUS.full, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  listIconEmoji: { fontSize: FONT_SIZES.lg },
  listLeft: { flex: 1 },
  listName: { color: COLORS.textPrimary, fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, marginBottom: SPACING.xs },
  listMeta: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs, letterSpacing: 0.5 },
  listDate: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, letterSpacing: 1 },
  listCalories: { color: COLORS.neonGreen, fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, marginTop: SPACING.xs },

  emptyState: { ...CARD.default, alignItems: 'center', paddingVertical: SPACING.xxxl },
  emptyText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, letterSpacing: 0.3, marginBottom: SPACING.sm },
  emptySubText: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },
});
