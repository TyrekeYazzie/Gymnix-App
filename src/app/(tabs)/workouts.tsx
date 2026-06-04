import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import WorkoutLog from '@/components/logs/WorkoutLog';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS, CARD
} from '@/constants/theme';

const categories = [
  { name: 'CHEST',     emoji: '💪', color: COLORS.primary },
  { name: 'BACK',      emoji: '🏋️', color: COLORS.accent },
  { name: 'LEGS',      emoji: '🦵', color: COLORS.neonGreen },
  { name: 'SHOULDERS', emoji: '🏆', color: COLORS.neonBlue },
  { name: 'ARMS',      emoji: '💯', color: COLORS.neonYellow },
  { name: 'CARDIO',    emoji: '🏃', color: COLORS.neonOrange },
];

interface Workout {
  id?: string;
  name: string;
  category: string;
  duration: string;
  calories: number;
  created_at?: string;
}

export default function Workouts() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');

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
    setWorkouts(prev => [workout, ...prev]);
  };

  const openModal = (category = '') => {
    setSelectedCategory(category);
    setModalVisible(true);
  };

  const getCategoryColor = (cat: string) =>
    categories.find(c => c.name === cat)?.color ?? COLORS.primary;

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.screenTitle}>WORKOUTS</Text>
            <Text style={styles.subtitle}>{totalThisWeek} sessions this week</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => openModal()}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>+ LOG</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dividerLine} />

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryNumber}>{workouts.length}</Text>
            <Text style={styles.summaryLabel}>TOTAL</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryBox}>
            <Text style={styles.summaryNumber}>{totalThisWeek}</Text>
            <Text style={styles.summaryLabel}>THIS WEEK</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryBox}>
            <Text style={styles.summaryNumber}>
              {workouts.reduce((s, w) => s + w.calories, 0).toLocaleString()}
            </Text>
            <Text style={styles.summaryLabel}>CAL BURNED</Text>
          </View>
        </View>

        {/* Categories */}
        <Text style={styles.sectionTitle}>◈ CATEGORIES</Text>
        <View style={styles.grid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.name}
              style={[styles.categoryCard, { borderColor: cat.color }]}
              onPress={() => openModal(cat.name)}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[styles.categoryName, { color: cat.color }]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Workouts */}
        <Text style={styles.sectionTitle}>◈ RECENT WORKOUTS</Text>

        {workouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>NO WORKOUTS LOGGED YET</Text>
            <Text style={styles.emptySubText}>Tap + LOG to start tracking</Text>
          </View>
        ) : (
          workouts.map((workout, i) => (
            <View key={workout.id ?? i} style={styles.workoutCard}>
              <View style={styles.workoutLeft}>
                <View style={styles.workoutNameRow}>
                  <View style={[styles.categoryDot, {
                    backgroundColor: getCategoryColor(workout.category)
                  }]} />
                  <Text style={styles.workoutName}>{workout.name}</Text>
                </View>
                <Text style={styles.workoutMeta}>
                  {workout.category} • {workout.duration}
                </Text>
              </View>
              <View style={styles.workoutRight}>
                <Text style={styles.workoutDate}>{formatDate(workout.created_at)}</Text>
                <Text style={styles.workoutCalories}>
                  {workout.calories > 0 ? `${workout.calories} kcal` : ''}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* WorkoutLog modal — imported from components/logs */}
      <WorkoutLog
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={handleSaved}
        initialCategory={selectedCategory}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  screenTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
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
    fontFamily: 'monospace',
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 2,
  },
  dividerLine: {
    height: 1,
    backgroundColor: COLORS.primary,
    width: 40,
    marginBottom: SPACING.lg,
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
    fontFamily: 'monospace',
  },
  summaryLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginTop: SPACING.xs,
  },
  summaryDivider: { width: 1, height: 40, backgroundColor: COLORS.borderDefault },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 3,
    marginBottom: SPACING.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  categoryCard: {
    width: '30.6%',
    ...CARD.default,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderWidth: 1,
  },
  categoryEmoji: { fontSize: FONT_SIZES.xxl, marginBottom: SPACING.sm },
  categoryName: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  workoutCard: {
    ...CARD.default,
    ...SHADOWS.subtle,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  workoutLeft: { flex: 1 },
  workoutNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    marginRight: SPACING.sm,
  },
  workoutName: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    fontFamily: 'monospace',
    fontWeight: FONT_WEIGHTS.bold,
  },
  workoutMeta: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    fontFamily: 'monospace',
    letterSpacing: 1,
    paddingLeft: SPACING.lg,
  },
  workoutRight: { alignItems: 'flex-end' },
  workoutDate: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  workoutCalories: {
    color: COLORS.neonGreen,
    fontSize: FONT_SIZES.xs,
    fontFamily: 'monospace',
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
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },
  emptySubText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    fontFamily: 'monospace',
  },
});