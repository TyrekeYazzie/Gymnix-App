import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import GymnixIcon from '@/components/GymnixIcon';
import { supabase } from '@/lib/supabase';
import { onLogsChanged } from '@/lib/logEvents';
import { containsPattern } from '@/lib/workouts';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import WorkoutLog from '@/components/logs/WorkoutLog';
import { getWorkoutCategories } from '@/constants/workoutCategories';
import { Workout, TemplateExercise } from '@/types';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useTabBarInset } from '@/hooks/useTabBarInset';
import {
  FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, Theme
} from '@/constants/theme';

// Sequencing state for an in-progress "Start Template" run — see the
// startTemplateId handling below and the pendingAdvanceRef dance in
// handleSaved/handleModalClose that steps through it.
interface ActiveTemplate {
  name: string;
  exercises: TemplateExercise[];
  index: number;
}

const PAGE_SIZE = 20;

export default function Workouts() {
  const router = useRouter();
  const { startTemplateId } = useLocalSearchParams<{ startTemplateId?: string }>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { colors } = theme;
  const categories = useMemo(() => getWorkoutCategories(colors), [colors]);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const refreshControl = usePullToRefresh(() => loadWorkouts());
  const tabBarInset = useTabBarInset();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [logCategory, setLogCategory] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [activeTemplate, setActiveTemplate] = useState<ActiveTemplate | null>(null);
  // Set by handleSaved (synchronously, before WorkoutLog calls onClose) so
  // handleModalClose can tell "saved, advance to the next exercise" apart
  // from "user backed out mid-sequence" without racing React's setState
  // batching — a ref reads back immediately, state wouldn't.
  const pendingAdvanceRef = useRef<{ index: number } | 'done' | null>(null);

  // Search and category filter run on the server (see fetchPage), so a
  // change reloads from the first page; typing waits for a pause.
  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => { loadWorkouts(); }, search.trim() ? 300 : 0);
    return () => clearTimeout(t);
  }, [user, activeFilter, search]);
  // Through a ref so the subscription doesn't capture a stale loadWorkouts.
  const loadWorkoutsRef = useRef<() => void>(() => {});
  loadWorkoutsRef.current = () => { if (user) loadWorkouts(); };
  useEffect(() => onLogsChanged(() => loadWorkoutsRef.current()), []);

  // Deep-linked in from src/app/templates.tsx's Start button. Loads the
  // template and opens WorkoutLog on its first exercise; startedIdRef guards
  // against re-triggering on every re-render once that's done.
  const startedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!startTemplateId || startTemplateId === startedIdRef.current) return;
    startedIdRef.current = startTemplateId;
    loadAndStartTemplate(startTemplateId);
  }, [startTemplateId]);

  const loadAndStartTemplate = async (id: string) => {
    const { data, error } = await supabase.from('workout_templates').select('*').eq('id', id).maybeSingle();
    // Clear the param as soon as it's been read, whichever way this goes, so
    // it can't get re-consumed by a later focus/remount of this screen.
    router.setParams({ startTemplateId: undefined });

    if (error) { Alert.alert('Error', 'Could not load that template.'); return; }
    // No row (or an empty one) most likely means the template was deleted —
    // in another tab, or by a race with this exact fetch — between the Start
    // tap and this resolving. That's not a surprising error worth alarming
    // over, just a no-op: nothing to start.
    if (!data || !data.exercises?.length) { console.warn(`Template ${id} not found or empty — skipping start.`); return; }

    setEditingWorkout(null);
    setLogCategory('');
    setActiveTemplate({ name: data.name, exercises: data.exercises, index: 0 });
    setModalVisible(true);
  };

  // The list used to load only the latest 20 workouts, ever: older ones were
  // unreachable, and search, the filters and the summary only covered those
  // 20. Now it pages through the whole history, 20 at a time.
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [stats, setStats] = useState({ total: 0, thisWeek: 0, sets: 0 });
  // Only the latest first-page load may write the list (a slow earlier
  // search must not overwrite a newer one), and "load more" is dropped if a
  // reload started meanwhile.
  const loadSeqRef = useRef(0);

  const fetchPage = (offset: number) => {
    let query = supabase.from('workouts').select('*').eq('user_id', user?.id);
    if (activeFilter !== 'ALL') query = query.eq('category', activeFilter);
    const term = search.trim();
    if (term) query = query.ilike('name', containsPattern(term));
    return query.order('created_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1);
  };

  // Summary numbers cover the whole history, not just the loaded pages.
  const loadStats = async () => {
    if (!user) return;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [all, week] = await Promise.all([
      supabase.from('workouts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('workouts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', weekAgo),
    ]);
    // Supabase returns at most 1000 rows per request, so add sets up in chunks.
    let sets = 0;
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from('workouts').select('sets').eq('user_id', user.id).order('id').range(from, from + 999);
      if (error || !data) break;
      sets += data.reduce((sum, w) => sum + (Array.isArray(w.sets) ? w.sets.length : 0), 0);
      if (data.length < 1000) break;
    }
    if (!all.error && !week.error) setStats({ total: all.count ?? 0, thisWeek: week.count ?? 0, sets });
  };

  const loadWorkouts = async () => {
    if (!user) return;
    const seq = ++loadSeqRef.current;
    const [{ data, error }] = await Promise.all([fetchPage(0), loadStats()]);
    if (seq !== loadSeqRef.current || error || !data) return;
    setWorkouts(data);
    setHasMore(data.length === PAGE_SIZE);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    const seq = loadSeqRef.current;
    setLoadingMore(true);
    const { data, error } = await fetchPage(workouts.length);
    setLoadingMore(false);
    if (seq !== loadSeqRef.current || error || !data) return;
    setWorkouts(prev => [...prev, ...data.filter(d => !prev.some(p => p.id === d.id))]);
    setHasMore(data.length === PAGE_SIZE);
  };

  const handleSaved = (workout: Workout) => {
    setWorkouts(prev => {
      const exists = prev.some(w => w.id === workout.id);
      return exists ? prev.map(w => (w.id === workout.id ? workout : w)) : [workout, ...prev];
    });
    loadStats();
    if (activeTemplate) {
      const nextIndex = activeTemplate.index + 1;
      pendingAdvanceRef.current = nextIndex < activeTemplate.exercises.length ? { index: nextIndex } : 'done';
    }
  };

  // WorkoutLog calls onSaved (above) then onClose on every successful save,
  // but only onClose when the user backs out without saving — pendingAdvanceRef
  // is how this tells those two cases apart for an in-progress template run.
  const handleModalClose = () => {
    if (activeTemplate) {
      const pending = pendingAdvanceRef.current;
      pendingAdvanceRef.current = null;
      if (pending && pending !== 'done') {
        setActiveTemplate({ ...activeTemplate, index: pending.index });
        return; // keep the sheet open — it re-fills itself for the next exercise
      }
      setActiveTemplate(null);
      setModalVisible(false);
      setEditingWorkout(null);
      if (pending === 'done') Alert.alert('Nice work! 💪', `Finished "${activeTemplate.name}".`);
      return;
    }
    setModalVisible(false);
    setEditingWorkout(null);
  };

  const handleDeleted = (id: string) => {
    setWorkouts(prev => prev.filter(w => w.id !== id));
    loadStats();
  };

  const getCategory = (cat: string | null) => categories.find(c => c.name === cat);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const diff = Math.floor(
      (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return `${diff} days ago`;
  };

  const totalThisWeek = stats.thisWeek;

  const filteredWorkouts = workouts.filter(w => {
    const matchesFilter = activeFilter === 'ALL' || w.category === activeFilter;
    const matchesSearch = w.name.toLowerCase().includes(search.trim().toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const swipeHandlers = useSwipeTabs();

  return (
    <SafeAreaView style={styles.container} edges={['top']} {...swipeHandlers}>
      {/* Fixed top — header, summary, search, filters all stay put; only the
          list below scrolls, so you never lose sight of these while browsing. */}
      <View style={styles.fixedTop}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.screenTitle}>Workouts</Text>
            <Text style={styles.subtitle}>{totalThisWeek} sessions this week</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.templatesButton}
              onPress={() => router.push('/templates')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Workout templates"
            >
              <GymnixIcon name="templates" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => { setActiveTemplate(null); setLogCategory(''); setEditingWorkout(null); setModalVisible(true); }}
              activeOpacity={0.8}
            >
              <Text style={styles.addButtonText}>+ Log</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryNumber}>{stats.total}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryBox}>
            <Text style={styles.summaryNumber}>{totalThisWeek}</Text>
            <Text style={styles.summaryLabel}>This week</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryBox}>
            <Text style={styles.summaryNumber}>{stats.sets}</Text>
            <Text style={styles.summaryLabel}>Total sets</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search workouts"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.lg }}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterPill, activeFilter === 'ALL' && styles.filterPillActive]}
              onPress={() => setActiveFilter('ALL')}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeFilter === 'ALL' }}
            >
              <Text style={[styles.filterPillText, activeFilter === 'ALL' && styles.filterPillTextActive]}>All</Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.name}
                style={[
                  styles.filterPill,
                  activeFilter === cat.name && { backgroundColor: cat.color, borderColor: cat.color },
                ]}
                onPress={() => setActiveFilter(cat.name)}
                onLongPress={() => { setActiveTemplate(null); setLogCategory(cat.name); setEditingWorkout(null); setModalVisible(true); }}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeFilter === cat.name }}
                accessibilityHint="Double tap and hold to log a workout directly in this category"
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={activeFilter === cat.name ? colors.textInverse : cat.color}
                />
                <Text style={[
                  styles.filterPillText,
                  activeFilter === cat.name && styles.filterPillTextActive,
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Workout list section title stays fixed with everything above it */}
        <Text style={styles.sectionTitle}>
          {activeFilter === 'ALL' ? 'Recent workouts' : activeFilter}
        </Text>
      </View>

      <ScrollView style={styles.listScroll} contentContainerStyle={[styles.listContent, { paddingBottom: tabBarInset }]} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
        {filteredWorkouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No workouts found</Text>
            <Text style={styles.emptySubText}>Tap + Log to start tracking</Text>
          </View>
        ) : (
          filteredWorkouts.map((workout, i) => {
            const cat = getCategory(workout.category);
            return (
              <TouchableOpacity
                key={workout.id ?? i}
                style={styles.workoutCard}
                onPress={() => { setActiveTemplate(null); setEditingWorkout(workout); setModalVisible(true); }}
                activeOpacity={0.7}
              >
                <View style={[styles.workoutIcon, { borderColor: cat?.color ?? colors.primary }]}>
                  <Ionicons name={cat?.icon ?? 'barbell-outline'} size={18} color={cat?.color ?? colors.primary} />
                </View>
                <View style={styles.workoutLeft}>
                  <Text style={styles.workoutName}>{workout.name}</Text>
                  <Text style={styles.workoutMeta}>
                    {workout.category} • {workout.duration}
                  </Text>
                </View>
                <View style={styles.workoutRight}>
                  <Text style={styles.workoutDate}>{formatDate(workout.created_at)}</Text>
                  {workout.sets && workout.sets.length > 0 && (
                    <Text style={styles.workoutCalories}>{workout.sets.length} sets</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
        {hasMore && filteredWorkouts.length > 0 && (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={loadMore}
            disabled={loadingMore}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Load older workouts"
          >
            {loadingMore
              ? <ActivityIndicator color={colors.primary} />
              : <Text style={styles.loadMoreText}>Load older workouts</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>

      <WorkoutLog
        visible={modalVisible}
        editEntry={editingWorkout}
        onClose={handleModalClose}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
        initialCategory={logCategory}
        templateStep={activeTemplate ? {
          exercise: activeTemplate.exercises[activeTemplate.index],
          index: activeTemplate.index,
          total: activeTemplate.exercises.length,
          templateName: activeTemplate.name,
        } : null}
      />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  screenTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.black,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    color: colors.textSecondary,
    marginTop: SPACING.xs,
    letterSpacing: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  templatesButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    borderColor: colors.primaryLight,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.purple,
  },
  addButton: {
    borderColor: colors.primaryLight,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    ...SHADOWS.purple,
  },
  addButtonText: {
    color: colors.primary,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0.3,
  },
  summaryRow: {
    ...CARD.default,
    ...SHADOWS.purple,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  summaryBox: { flex: 1, alignItems: 'center' },
  summaryNumber: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.black,
    color: colors.textPrimary,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.xs,
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: SPACING.xs,
  },
  summaryDivider: { width: 1, height: 40, backgroundColor: colors.borderDefault },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgTertiary,
    borderColor: colors.borderDefault,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: FONT_SIZES.sm,
    paddingVertical: SPACING.md,
  },

  // Filter pills
  filterRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: colors.bgTertiary,
    borderColor: colors.borderDefault,
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: FONT_SIZES.xs,
    color: colors.textSecondary,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 1,
  },
  filterPillTextActive: {
    color: colors.textInverse,
  },

  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },

  // Workout list
  workoutCard: {
    ...CARD.default,
    ...SHADOWS.subtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  workoutIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutLeft: { flex: 1 },
  workoutName: {
    color: colors.textPrimary,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  workoutMeta: {
    color: colors.textMuted,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 1,
  },
  workoutRight: { alignItems: 'flex-end' },
  workoutDate: {
    color: colors.textSecondary,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  workoutCalories: {
    color: colors.neonGreen,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
  },
  emptyState: {
    ...CARD.default,
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: FONT_SIZES.sm,
    letterSpacing: 0.3,
    marginBottom: SPACING.sm,
  },
  emptySubText: {
    color: colors.textMuted,
    fontSize: FONT_SIZES.xs,
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  loadMoreText: {
    color: colors.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
  },
  });
}
