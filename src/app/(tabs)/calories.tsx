import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import CaloriesLog from '@/components/logs/CaloriesLog';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS, CARD
} from '@/constants/theme';

const GOAL = 2000;

const MEAL_TYPES = [
  { name: 'Breakfast', emoji: '🌅', color: COLORS.neonYellow },
  { name: 'Lunch',     emoji: '☀️', color: COLORS.primary },
  { name: 'Dinner',    emoji: '🌙', color: COLORS.neonBlue },
  { name: 'Snack',     emoji: '🍎', color: COLORS.neonGreen },
];

interface Meal {
  id: string;
  meal_name: string;
  meal_type: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
}

function localMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Calories() {
  const { user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const protein = meals.reduce((sum, m) => sum + (m.protein_g ?? 0), 0);
  const carbs = meals.reduce((sum, m) => sum + (m.carbs_g ?? 0), 0);
  const fat = meals.reduce((sum, m) => sum + (m.fat_g ?? 0), 0);
  const remaining = GOAL - totalCalories;
  const percentage = Math.min((totalCalories / GOAL) * 100, 100);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const loadMeals = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('calorie_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', localMidnight().toISOString())
      .order('created_at', { ascending: true });
    if (error) { console.error('Failed to load meals:', error.message); return; }
    setMeals(data ?? []);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadMeals();
    }, [loadMeals])
  );

  const getProgressColor = () => {
    if (percentage >= 100) return COLORS.accent;
    if (percentage >= 75) return COLORS.neonYellow;
    return COLORS.primary;
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const getMealType = (name: string) => MEAL_TYPES.find(t => t.name === name);

  const filteredMeals = meals.filter(m => {
    const matchesFilter = activeFilter === 'ALL' || m.meal_type === activeFilter;
    const matchesSearch = m.meal_name.toLowerCase().includes(search.trim().toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.screenTitle}>CALORIES</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>+ ADD</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dividerLine} />

        {/* Today's Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>◈ TODAY'S INTAKE</Text>

          <View style={styles.calorieRow}>
            <View>
              <Text style={styles.calorieNumber}>
                {totalCalories.toLocaleString()}
              </Text>
              <Text style={styles.calorieLabel}>CONSUMED</Text>
            </View>
            <View style={styles.calorieDivider} />
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[
                styles.calorieNumber,
                { color: remaining < 0 ? COLORS.accent : COLORS.neonGreen }
              ]}>
                {Math.abs(remaining).toLocaleString()}
              </Text>
              <Text style={styles.calorieLabel}>
                {remaining < 0 ? 'OVER GOAL' : 'REMAINING'}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {
              width: `${percentage}%`,
              backgroundColor: getProgressColor(),
            }]} />
          </View>

          <View style={styles.goalRow}>
            <Text style={styles.goalText}>0</Text>
            <Text style={styles.goalText}>GOAL: {GOAL.toLocaleString()} kcal</Text>
            <Text style={styles.goalText}>{GOAL.toLocaleString()}</Text>
          </View>
        </View>

        {/* Macros Row */}
        <View style={styles.macrosRow}>
          {[
            { label: 'PROTEIN', value: `${protein}g`, color: COLORS.neonBlue },
            { label: 'CARBS', value: `${carbs}g`, color: COLORS.neonYellow },
            { label: 'FAT', value: `${fat}g`, color: COLORS.accent },
          ].map((macro) => (
            <View key={macro.label} style={styles.macroCard}>
              <Text style={[styles.macroValue, { color: macro.color }]}>
                {macro.value}
              </Text>
              <Text style={styles.macroLabel}>{macro.label}</Text>
            </View>
          ))}
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search meals"
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
              <Text style={[styles.filterPillText, activeFilter === 'ALL' && styles.filterPillTextActive]}>ALL</Text>
            </TouchableOpacity>
            {MEAL_TYPES.map((type) => (
              <TouchableOpacity
                key={type.name}
                style={[
                  styles.filterPill,
                  activeFilter === type.name && { backgroundColor: type.color, borderColor: type.color },
                ]}
                onPress={() => setActiveFilter(type.name)}
                activeOpacity={0.7}
              >
                <Text style={styles.filterPillEmoji}>{type.emoji}</Text>
                <Text style={[
                  styles.filterPillText,
                  activeFilter === type.name && styles.filterPillTextActive,
                ]}>
                  {type.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Meals List */}
        <Text style={styles.sectionTitle}>
          {activeFilter === 'ALL' ? "◈ TODAY'S MEALS" : `◈ ${activeFilter.toUpperCase()}`}
        </Text>

        {filteredMeals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>NO MEALS FOUND</Text>
            <Text style={styles.emptySubText}>Tap + ADD to log your first meal</Text>
          </View>
        ) : (
          filteredMeals.map((meal) => {
            const type = getMealType(meal.meal_type);
            return (
              <View key={meal.id} style={styles.mealCard}>
                <View style={[styles.mealIcon, { borderColor: type?.color ?? COLORS.primary }]}>
                  <Text style={styles.mealIconEmoji}>{type?.emoji ?? '🍽️'}</Text>
                </View>
                <View style={styles.mealLeft}>
                  <Text style={styles.mealName}>{meal.meal_name}</Text>
                  <Text style={styles.mealTime}>{formatTime(meal.created_at)}</Text>
                </View>
                <View style={styles.mealRight}>
                  <Text style={styles.mealCalories}>
                    {meal.calories.toLocaleString()}
                  </Text>
                  <Text style={styles.mealKcal}>kcal</Text>
                </View>
              </View>
            );
          })
        )}

      </ScrollView>

      <CaloriesLog
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={() => { setModalVisible(false); loadMeals(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },

  // Header
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
  date: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
    marginTop: SPACING.xs,
    letterSpacing: 1,
  },
  addButton: {
    borderColor: COLORS.primary,
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

  // Summary Card
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
  calorieRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  calorieNumber: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
  },
  calorieLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginTop: SPACING.xs,
  },
  calorieDivider: {
    width: 1,
    height: 50,
    backgroundColor: COLORS.borderDefault,
  },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.borderDefault,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },

  // Macros
  macrosRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  macroCard: {
    flex: 1,
    ...CARD.default,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  macroValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.black,
    fontFamily: 'monospace',
    marginBottom: SPACING.xs,
  },
  macroLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },

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
    fontFamily: 'monospace',
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
  filterPillEmoji: {
    fontSize: FONT_SIZES.sm,
  },
  filterPillText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 1,
  },
  filterPillTextActive: {
    color: COLORS.textInverse,
  },

  // Meals
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 3,
    marginBottom: SPACING.md,
  },
  mealCard: {
    ...CARD.default,
    ...SHADOWS.subtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  mealIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealIconEmoji: {
    fontSize: FONT_SIZES.lg,
  },
  mealLeft: {
    flex: 1,
  },
  mealName: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    fontFamily: 'monospace',
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  mealTime: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  mealRight: {
    alignItems: 'flex-end',
  },
  mealCalories: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.lg,
    fontFamily: 'monospace',
    fontWeight: FONT_WEIGHTS.black,
  },
  mealKcal: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    fontFamily: 'monospace',
  },

  // Empty State
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
