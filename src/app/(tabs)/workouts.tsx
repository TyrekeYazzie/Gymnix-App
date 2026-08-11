import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import WorkoutLog from '@/components/logs/WorkoutLog';
import { WORKOUT_CATEGORIES as categories } from '@/constants/workoutCategories';
import { Workout } from '@/types';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS, CARD
} from '@/constants/theme';

export default function Workouts() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [logCategory, setLogCategory] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    loadWorkouts();
  }, [user]);

  const loadWorkouts = async () => {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) setWorkouts(data);
  };

  const handleSaved = (workout: Workout) => {
    setWorkouts(prev => {
      const exists = prev.some(w => w.id === workout.id);
      return exists ? prev.map(w => (w.id === workout.id ? workout : w)) : [workout, ...prev];
    });
  };

  const handleDeleted = (id: string) => {
    setWorkouts(prev => prev.filter(w => w.id !== id));
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

  const totalThisWeek = workouts.filter(w => {
    if (!w.created_at) return false;
    const diff = (new Date().getTime() - new Date(w.created_at).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  }).length;

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
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => { setLogCategory(''); setEditingWorkout(null); setModalVisible(true); }}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>+ Log</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryNumber}>{workouts.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryBox}>
            <Text style={styles.summaryNumber}>{totalThisWeek}</Text>
            <Text style={styles.summaryLabel}>This week</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryBox}>
            <Text style={styles.summaryNumber}>
              {workouts.reduce((s, w) => s + (w.sets?.length ?? 0), 0)}
            </Text>
            <Text style={styles.summaryLabel}>Total sets</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search workouts"
            placeholderTextColor={COLORS.textMuted}
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
                onLongPress={() => { setLogCategory(cat.name); setEditingWorkout(null); setModalVisible(true); }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={activeFilter === cat.name ? COLORS.textInverse : cat.color}
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

      <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
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
                onPress={() => { setEditingWorkout(workout); setModalVisible(true); }}
                activeOpacity={0.7}
              >
                <View style={[styles.workoutIcon, { borderColor: cat?.color ?? COLORS.primary }]}>
                  <Ionicons name={cat?.icon ?? 'barbell-outline'} size={18} color={cat?.color ?? COLORS.primary} />
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
      </ScrollView>

      <WorkoutLog
        visible={modalVisible}
        editEntry={editingWorkout}
        onClose={() => { setModalVisible(false); setEditingWorkout(null); }}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
        initialCategory={logCategory}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
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
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    letterSpacing: 1,
  },
  addButton: {
    borderColor: COLORS.primaryLight,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    ...SHADOWS.purple,
  },
  addButtonText: {
    color: COLORS.primary,
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
    color: COLORS.textPrimary,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginTop: SPACING.xs,
  },
  summaryDivider: { width: 1, height: 40, backgroundColor: COLORS.borderDefault },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgTertiary,
    borderColor: COLORS.borderDefault,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
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
    backgroundColor: COLORS.bgTertiary,
    borderColor: COLORS.borderDefault,
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 1,
  },
  filterPillTextActive: {
    color: COLORS.textInverse,
  },

  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textMuted,
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
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  workoutMeta: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 1,
  },
  workoutRight: { alignItems: 'flex-end' },
  workoutDate: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  workoutCalories: {
    color: COLORS.neonGreen,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
  },
  emptyState: {
    ...CARD.default,
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    letterSpacing: 0.3,
    marginBottom: SPACING.sm,
  },
  emptySubText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
  },
});
