import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Modal, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS, CARD
} from '@/constants/theme';

const initialMeals = [
  { name: 'Oatmeal with Banana', calories: 350, time: '8:00 AM' },
  { name: 'Grilled Chicken Salad', calories: 480, time: '12:30 PM' },
  { name: 'Protein Shake', calories: 220, time: '3:00 PM' },
];

const GOAL = 2000;

export default function Calories() {
  const [meals, setMeals] = useState(initialMeals);
  const [modalVisible, setModalVisible] = useState(false);
  const [mealName, setMealName] = useState('');
  const [mealCalories, setMealCalories] = useState('');

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const remaining = GOAL - totalCalories;
  const percentage = Math.min((totalCalories / GOAL) * 100, 100);

  const protein = 80;
  const carbs = 140;
  const fat = 45;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const handleAddMeal = () => {
    if (!mealName || !mealCalories) {
      Alert.alert('Missing Info', 'Please enter a meal name and calories');
      return;
    }
    const cal = parseInt(mealCalories);
    if (isNaN(cal) || cal <= 0) {
      Alert.alert('Invalid', 'Please enter a valid calorie amount');
      return;
    }
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    setMeals([...meals, { name: mealName, calories: cal, time }]);
    setMealName('');
    setMealCalories('');
    setModalVisible(false);
  };

  const getProgressColor = () => {
    if (percentage >= 100) return COLORS.accent;
    if (percentage >= 75) return COLORS.neonYellow;
    return COLORS.primary;
  };

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

        {/* Quick Add Row */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>◈ QUICK ADD</Text>
          <View style={styles.quickRow}>
            {[100, 250, 500, 750].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={styles.quickButton}
                activeOpacity={0.7}
                onPress={() => {
                  const now = new Date();
                  const time = now.toLocaleTimeString('en-US', {
                    hour: 'numeric', minute: '2-digit'
                  });
                  setMeals([...meals, {
                    name: `Quick Add`,
                    calories: amount,
                    time,
                  }]);
                }}
              >
                <Text style={styles.quickButtonText}>+{amount}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Meals List */}
        <Text style={styles.sectionTitle}>◈ TODAY'S MEALS</Text>

        {meals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>NO MEALS LOGGED YET</Text>
            <Text style={styles.emptySubText}>Tap + ADD to log your first meal</Text>
          </View>
        ) : (
          meals.map((meal, i) => (
            <View key={i} style={styles.mealCard}>
              <View style={styles.mealLeft}>
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealTime}>{meal.time}</Text>
              </View>
              <View style={styles.mealRight}>
                <Text style={styles.mealCalories}>
                  {meal.calories.toLocaleString()}
                </Text>
                <Text style={styles.mealKcal}>kcal</Text>
              </View>
            </View>
          ))
        )}

      </ScrollView>

      {/* Add Meal Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>◈ LOG MEAL</Text>

            <Text style={styles.inputLabel}>MEAL NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Grilled Chicken"
              placeholderTextColor={COLORS.textMuted}
              value={mealName}
              onChangeText={setMealName}
              autoCapitalize="words"
            />

            <Text style={styles.inputLabel}>CALORIES</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 450"
              placeholderTextColor={COLORS.textMuted}
              value={mealCalories}
              onChangeText={setMealCalories}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.modalAddButton}
              onPress={handleAddMeal}
              activeOpacity={0.8}
            >
              <Text style={styles.modalAddText}>▸ ADD MEAL</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

  // Quick Add
  quickRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  quickButton: {
    flex: 1,
    borderColor: COLORS.primary,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  quickButtonText: {
    color: COLORS.primaryLight,
    fontSize: FONT_SIZES.sm,
    fontFamily: 'monospace',
    fontWeight: FONT_WEIGHTS.bold,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.bgOverlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    ...CARD.default,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderColor: COLORS.borderFocus,
    padding: SPACING.xl,
    ...SHADOWS.purple,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
    letterSpacing: 3,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.bgTertiary,
    borderColor: COLORS.borderDefault,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    fontFamily: 'monospace',
    marginBottom: SPACING.lg,
  },
  modalAddButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.purple,
  },
  modalAddText: {
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: FONT_SIZES.md,
    fontFamily: 'monospace',
    letterSpacing: 3,
  },
  modalCancelButton: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  modalCancelText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
});