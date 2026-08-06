import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import CaloriesLog from '@/components/logs/CaloriesLog';
import { nutritionTargetsOrDefault } from '@/lib/nutrition';
import { WEIGHT_GOAL_LABELS } from '@/constants/nutrition';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS, CARD
} from '@/constants/theme';

const MEAL_TYPES: { name: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { name: 'Breakfast', icon: 'sunny-outline',      color: COLORS.neonYellow },
  { name: 'Lunch',     icon: 'restaurant-outline', color: COLORS.primary },
  { name: 'Dinner',    icon: 'moon-outline',       color: COLORS.neonBlue },
  { name: 'Snack',     icon: 'fast-food-outline',  color: COLORS.neonGreen },
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
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const targets = useMemo(() => nutritionTargetsOrDefault(profile), [profile]);
  const GOAL = targets.calorieGoal;

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const protein = meals.reduce((sum, m) => sum + (m.protein_g ?? 0), 0);
  const carbs = meals.reduce((sum, m) => sum + (m.carbs_g ?? 0), 0);
  const fat = meals.reduce((sum, m) => sum + (m.fat_g ?? 0), 0);
  const remaining = GOAL - totalCalories;
  const percentage = Math.min((totalCalories / GOAL) * 100, 100);

  const macroRows = [
    { label: 'Protein', consumed: protein, target: targets.proteinG, color: COLORS.neonBlue },
    { label: 'Carbs',   consumed: carbs,   target: targets.carbsG,   color: COLORS.neonYellow },
    { label: 'Fat',     consumed: fat,     target: targets.fatG,     color: COLORS.accent },
  ];

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

  const swipeHandlers = useSwipeTabs();

  return (
    <SafeAreaView style={styles.container} edges={['top']} {...swipeHandlers}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.screenTitle}>Calories</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dividerLine} />

        {/* Today's Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's intake</Text>

          <View style={styles.calorieRow}>
            <View>
              <Text style={styles.calorieNumber}>
                {totalCalories.toLocaleString()}
              </Text>
              <Text style={styles.calorieLabel}>Consumed</Text>
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
                {remaining < 0 ? 'Over goal' : 'Remaining'}
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
            <Text style={styles.goalText}>Goal: {GOAL.toLocaleString()} kcal</Text>
            <Text style={styles.goalText}>{GOAL.toLocaleString()}</Text>
          </View>
        </View>

        {/* Macros Row */}
        <View style={styles.macrosRow}>
          {macroRows.map((macro) => {
            const macroPct = targets.complete
              ? Math.min((macro.consumed / Math.max(macro.target, 1)) * 100, 100)
              : 0;
            return (
              <View key={macro.label} style={styles.macroCard}>
                <Text style={[styles.macroValue, { color: macro.color }]}>
                  {macro.consumed}g
                </Text>
                <Text style={styles.macroLabel}>{macro.label}</Text>
                {targets.complete && (
                  <>
                    <View style={styles.macroTrack}>
                      <View style={[styles.macroFill, { width: `${macroPct}%`, backgroundColor: macro.color }]} />
                    </View>
                    <Text style={styles.macroTarget}>of {macro.target}g</Text>
                  </>
                )}
              </View>
            );
          })}
        </View>

        {/* Goal insight — tap through to adjust in Settings */}
        <TouchableOpacity
          style={styles.insightCard}
          onPress={() => router.push('/nutrition-goals')}
          activeOpacity={0.7}
        >
          <View style={[styles.insightIcon, { borderColor: targets.complete ? COLORS.neonGreen : COLORS.accent }]}>
            <Ionicons
              name={targets.complete ? 'analytics-outline' : 'alert-circle-outline'}
              size={16}
              color={targets.complete ? COLORS.neonGreen : COLORS.accent}
            />
          </View>
          <View style={{ flex: 1 }}>
            {targets.complete ? (
              <>
                <Text style={styles.insightTitle}>
                  {WEIGHT_GOAL_LABELS[profile?.weight_goal_type ?? 'maintain']}
                </Text>
                <Text style={styles.insightSubtext}>
                  TDEE {targets.tdee.toLocaleString()} kcal · BMR {targets.bmr.toLocaleString()} kcal
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.insightTitle}>Get a personalized calorie goal</Text>
                <Text style={styles.insightSubtext}>Set up your nutrition goals for accurate targets</Text>
              </>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>

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
              <Text style={[styles.filterPillText, activeFilter === 'ALL' && styles.filterPillTextActive]}>All</Text>
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
                <Ionicons
                  name={type.icon}
                  size={14}
                  color={activeFilter === type.name ? COLORS.textInverse : type.color}
                />
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
          {activeFilter === 'ALL' ? "Today's meals" : activeFilter}
        </Text>

        {filteredMeals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No meals found</Text>
            <Text style={styles.emptySubText}>Tap + Add to log your first meal</Text>
          </View>
        ) : (
          filteredMeals.map((meal) => {
            const type = getMealType(meal.meal_type);
            return (
              <View key={meal.id} style={styles.mealCard}>
                <View style={[styles.mealIcon, { borderColor: type?.color ?? COLORS.primary }]}>
                  <Ionicons name={type?.icon ?? 'restaurant-outline'} size={18} color={type?.color ?? COLORS.primary} />
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
    letterSpacing: 0.5,
  },
  date: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
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
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0.3,
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
    letterSpacing: 0.5,
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
  },
  calorieLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    letterSpacing: 0.3,
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
    marginBottom: SPACING.xs,
  },
  macroLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  macroTrack: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.borderDefault,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  macroFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  macroTarget: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  // Goal insight
  insightCard: {
    ...CARD.default,
    ...SHADOWS.subtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: 2,
  },
  insightSubtext: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 0.3,
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

  // Meals
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
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
  mealLeft: {
    flex: 1,
  },
  mealName: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  mealTime: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 1,
  },
  mealRight: {
    alignItems: 'flex-end',
  },
  mealCalories: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.black,
  },
  mealKcal: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
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
    letterSpacing: 0.3,
    marginBottom: SPACING.sm,
  },
  emptySubText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
  },
});
