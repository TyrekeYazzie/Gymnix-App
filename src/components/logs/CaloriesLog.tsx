import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, TextInput, Alert, Dimensions,
  KeyboardAvoidingView, Platform, Animated, PanResponder, Keyboard
} from 'react-native';
import Slider from '@react-native-community/slider';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import { awardXP, XP_MEAL } from '@/lib/xp';
import { checkAndUnlockAchievements } from '@/lib/achievements';
import AchievementUnlockBanner from '@/components/AchievementUnlockBanner';
import { nutritionTargetsOrDefault } from '@/lib/nutrition';
import { CustomMeal, Meal, UnlockedAchievement } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import {
  FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, Theme, Colors
} from '@/constants/theme';

// slide the sheet fully past the bottom edge regardless of device height or sheet content length
const SLIDE_DISTANCE = Dimensions.get('window').height + 100;

// Kept in sync with the Slider's minimumValue/maximumValue below so typed
// entry (tap the calorie value to edit) and the drag control agree on range.
const CALORIE_MIN = 50;
const CALORIE_MAX = 1500;

function getMealTypes(colors: Colors): { name: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] {
  return [
    { name: 'Breakfast', icon: 'sunny-outline',      color: colors.neonYellow },
    { name: 'Lunch',     icon: 'restaurant-outline', color: colors.primary },
    { name: 'Dinner',    icon: 'moon-outline',       color: colors.neonBlue },
    { name: 'Snack',     icon: 'fast-food-outline',  color: colors.neonGreen },
  ];
}

const QUICK_MEALS = [
  { name: 'Protein Shake', meal_type: 'Snack',     calories: 180, protein: 25, carbs: 8,  fat: 3  },
  { name: 'Chicken Rice',  meal_type: 'Lunch',     calories: 450, protein: 40, carbs: 50, fat: 8  },
  { name: 'Oatmeal',       meal_type: 'Breakfast', calories: 300, protein: 10, carbs: 55, fat: 6  },
  { name: 'Salad',         meal_type: 'Lunch',     calories: 220, protein: 8,  carbs: 20, fat: 12 },
  { name: 'Eggs',          meal_type: 'Breakfast', calories: 180, protein: 14, carbs: 1,  fat: 12 },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (log: any) => void;
  /** When set, the sheet edits this meal in place instead of logging a new one. */
  editEntry?: Meal | null;
  onDeleted?: (id: string) => void;
}

export default function CaloriesLog({ visible, onClose, onSaved, editEntry, onDeleted }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const MEAL_TYPES = useMemo(() => getMealTypes(colors), [colors]);
  const CALORIE_GOAL = useMemo(() => nutritionTargetsOrDefault(profile).calorieGoal, [profile]);
  const [mealType, setMealType] = useState('');
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState(400);
  const [protein, setProtein] = useState(20);
  const [carbs, setCarbs] = useState(40);
  const [fat, setFat] = useState(10);
  const [showMacros, setShowMacros] = useState(false);
  const [todayCalories, setTodayCalories] = useState(0);
  const [saving, setSaving] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [customMeals, setCustomMeals] = useState<CustomMeal[]>([]);
  const [editingCalories, setEditingCalories] = useState(false);
  const [calorieDraft, setCalorieDraft] = useState(String(400));
  const [deleting, setDeleting] = useState(false);
  const isEditing = !!editEntry;

  const slideAnim = useRef(new Animated.Value(SLIDE_DISTANCE)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const unlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (unlockTimeoutRef.current) clearTimeout(unlockTimeoutRef.current); };
  }, []);

  const remaining = CALORIE_GOAL - todayCalories;
  const progressPercent = Math.min((todayCalories / CALORIE_GOAL) * 100, 100);
  const progressColor = progressPercent >= 100 ? colors.accent : progressPercent >= 75 ? colors.neonYellow : colors.neonGreen;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => { if (g.dy > 0) slideAnim.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100 || g.vy > 0.5) {
          animateClose();
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      loadTodayCalories();
      loadCustomMeals();
      if (editEntry) {
        setMealName(editEntry.meal_name);
        setMealType(editEntry.meal_type ?? '');
        setCalories(editEntry.calories ?? 0);
        setProtein(editEntry.protein_g ?? 0);
        setCarbs(editEntry.carbs_g ?? 0);
        setFat(editEntry.fat_g ?? 0);
        setShowMacros(!!(editEntry.protein_g || editEntry.carbs_g || editEntry.fat_g));
      } else {
        reset();
      }
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: SLIDE_DISTANCE, useNativeDriver: true, damping: 20, stiffness: 200 }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const loadTodayCalories = async () => {
    if (!user) return;
    const localMidnight = new Date();
    localMidnight.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from('calorie_logs')
      .select('calories')
      .eq('user_id', user.id)
      .gte('created_at', localMidnight.toISOString());
    if (error) { console.error('Failed to load today calories:', error.message); return; }
    if (data) setTodayCalories(data.reduce((sum, r) => sum + r.calories, 0));
  };

  const loadCustomMeals = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('custom_meals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (error) { console.error('Failed to load custom meals:', error.message); return; }
    if (data) setCustomMeals(data);
  };

  const reset = () => {
    setMealType(''); setMealName(''); setCalories(400);
    setProtein(20); setCarbs(40); setFat(10); setShowMacros(false);
    setEditingCalories(false);
    setUnlockedAchievements([]);
  };

  const handleClose = () => { reset(); onClose(); };

  // plays the slide-down/fade-out first, then closes — used for backdrop taps and Cancel,
  // since Modal's `visible` prop hides the native modal instantly otherwise, cutting the animation short.
  // Accepts an optional callback (e.g. navigating away) that runs after the sheet has fully closed.
  const animateClose = (after?: () => void) => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: SLIDE_DISTANCE, useNativeDriver: true, damping: 20, stiffness: 200 }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => { handleClose(); after?.(); });
  };

  const goToCustomMeals = () => animateClose(() => router.push('/custom-meals'));

  const getMealColor = (m: string) => MEAL_TYPES.find(t => t.name === m)?.color ?? colors.neonYellow;

  const applyQuickMeal = (m: typeof QUICK_MEALS[0]) => {
    setMealName(m.name); setMealType(m.meal_type);
    setCalories(m.calories); setProtein(m.protein);
    setCarbs(m.carbs); setFat(m.fat);
  };

  // Custom meals only carry a name + calorie count (see Settings > Nutrition >
  // Custom Meals) — meal type and macros are left for the user to fill in.
  const applyCustomMeal = (m: CustomMeal) => {
    setMealName(m.name); setCalories(m.calories);
    setProtein(0); setCarbs(0); setFat(0);
  };

  const startEditingCalories = () => {
    setCalorieDraft(String(calories));
    setEditingCalories(true);
  };

  const commitCalorieEdit = () => {
    const num = parseInt(calorieDraft, 10);
    if (!isNaN(num)) setCalories(Math.min(Math.max(num, CALORIE_MIN), CALORIE_MAX));
    setEditingCalories(false);
    Keyboard.dismiss();
  };

  // Quick-add chips: once the user has saved any custom meals, those fully
  // replace the hardcoded presets below (which only exist as a starting
  // point for a brand-new profile with nothing saved yet).
  const quickChips = customMeals.length > 0
    ? customMeals.map(m => ({
        key: m.id,
        label: m.name,
        color: colors.neonYellow,
        selected: mealName === m.name,
        onPress: () => applyCustomMeal(m),
      }))
    : QUICK_MEALS.map(m => ({
        key: m.name,
        label: m.name,
        color: getMealColor(m.meal_type),
        selected: mealName === m.name,
        onPress: () => applyQuickMeal(m),
      }));

  const handleSave = async () => {
    if (!mealName || !mealType) {
      Alert.alert('Missing Info', 'Please enter a meal name and type');
      return;
    }
    if (!user) return;
    setSaving(true);

    if (isEditing && editEntry) {
      const { data, error } = await supabase
        .from('calorie_logs')
        .update({
          meal_name: mealName,
          meal_type: mealType,
          calories,
          protein_g: protein,
          carbs_g: carbs,
          fat_g: fat,
        })
        .eq('id', editEntry.id)
        .select()
        .single();

      setSaving(false);
      if (error) { Alert.alert('Error', error.message); return; }
      if (data) {
        // Flat XP-per-meal (XP_MEAL) doesn't depend on the calorie value, so
        // an edit never changes how much XP was already earned — no award here.
        setTodayCalories(p => p - (editEntry.calories ?? 0) + calories);
        onSaved(data); reset(); onClose();
      }
      return;
    }

    const { data, error } = await supabase
      .from('calorie_logs')
      .insert({
        user_id: user.id,
        meal_name: mealName,
        meal_type: mealType,
        calories,
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
      })
      .select()
      .single();

    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    if (data) {
      await awardXP(user.id, XP_MEAL);
      await refreshProfile();
      setTodayCalories(p => p + calories);

      // Achievement check is new-logs-only, matching the same reasoning as
      // WorkoutLog's PR check — see supabase/migrations/20260815010000_achievements.sql.
      const newlyUnlocked = await checkAndUnlockAchievements();
      if (newlyUnlocked.length > 0) {
        setUnlockedAchievements(newlyUnlocked);
        setSaving(true);
        unlockTimeoutRef.current = setTimeout(() => {
          setSaving(false);
          onSaved(data); reset(); onClose();
        }, 1400);
        return;
      }

      onSaved(data); reset(); onClose();
    }
  };

  const handleDelete = () => {
    if (!editEntry) return;
    Alert.alert(
      'Delete Meal',
      `Remove "${editEntry.meal_name}" from today's log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setDeleting(true);
            const { error } = await supabase.from('calorie_logs').delete().eq('id', editEntry.id);
            if (error) { setDeleting(false); Alert.alert('Error', error.message); return; }
            await awardXP(user.id, -XP_MEAL);
            await refreshProfile();
            setDeleting(false);
            setTodayCalories(p => p - (editEntry.calories ?? 0));
            onDeleted?.(editEntry.id);
            reset(); onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => animateClose()} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Drag handle + title — swipe down anywhere here to close */}
          <View {...panResponder.panHandlers}>
            <View style={styles.handleArea}>
              <View style={styles.handleBar} />
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{isEditing ? 'Edit Meal' : 'Log Meal'}</Text>
              {isEditing && (
                <TouchableOpacity
                  onPress={handleDelete}
                  activeOpacity={0.7}
                  disabled={deleting}
                  style={styles.deleteIconBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Delete meal"
                >
                  <Ionicons name="trash-outline" size={18} color={colors.accent} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <AchievementUnlockBanner achievements={unlockedAchievements} />

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Progress */}
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Today</Text>
                <Text style={[styles.progressValue, { color: progressColor }]}>
                  {todayCalories} / {CALORIE_GOAL} kcal
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` as any, backgroundColor: progressColor }]} />
              </View>
              <Text style={styles.remainingText}>
                {remaining > 0 ? `${remaining} kcal remaining` : `${Math.abs(remaining)} kcal over goal`}
              </Text>
            </View>

            {/* Quick meals */}
            <View style={styles.quickAddHeader}>
              <Text style={styles.label}>Quick add</Text>
              <TouchableOpacity
                onPress={goToCustomMeals}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.manageLink}>{customMeals.length > 0 ? 'Manage' : 'Add your own'}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.lg }}>
              <View style={styles.chipRow}>
                {quickChips.map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    style={[styles.chip, c.selected && {
                      borderColor: c.color,
                      backgroundColor: c.color + '22',
                    }]}
                    onPress={c.onPress}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, c.selected && { color: c.color }]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Meal type */}
            <Text style={styles.label}>Meal type</Text>
            <View style={styles.mealTypeRow}>
              {MEAL_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.name}
                  style={[styles.mealTypeCard, mealType === t.name && { borderColor: t.color, backgroundColor: t.color + '22' }]}
                  onPress={() => setMealType(t.name)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={t.icon}
                    size={20}
                    color={mealType === t.name ? t.color : colors.textSecondary}
                    style={styles.mealIcon}
                  />
                  <Text style={[styles.mealTypeName, mealType === t.name && { color: t.color }]}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Meal name */}
            <Text style={styles.label}>Meal name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Chicken and rice"
              placeholderTextColor={colors.textMuted}
              value={mealName}
              onChangeText={setMealName}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />

            {/* Calories slider */}
            <View style={styles.calorieLabelRow}>
              <Text style={styles.label}>Calories</Text>
              {editingCalories ? (
                <TextInput
                  style={styles.calorieInput}
                  value={calorieDraft}
                  onChangeText={(t) => setCalorieDraft(t.replace(/[^0-9]/g, ''))}
                  onBlur={commitCalorieEdit}
                  onSubmitEditing={commitCalorieEdit}
                  keyboardType="number-pad"
                  autoFocus
                  selectTextOnFocus
                  maxLength={4}
                />
              ) : (
                <TouchableOpacity
                  onPress={startEditingCalories}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.calorieValue}>{calories} kcal · tap to edit</Text>
                </TouchableOpacity>
              )}
            </View>
            <Slider
              style={styles.slider}
              minimumValue={CALORIE_MIN} maximumValue={CALORIE_MAX} step={10}
              value={calories} onValueChange={setCalories}
              minimumTrackTintColor={colors.neonYellow}
              maximumTrackTintColor={colors.borderDefault}
              thumbTintColor={colors.neonYellow}
            />

            {/* Macros toggle */}
            <TouchableOpacity
              style={styles.macroToggle}
              onPress={() => setShowMacros(!showMacros)}
              activeOpacity={0.7}
            >
              <Text style={styles.macroToggleText}>
                {showMacros ? 'Hide macros' : 'Add macros (optional)'}
              </Text>
            </TouchableOpacity>

            {showMacros && (
              <View>
                <Text style={styles.label}>Protein — {protein}g</Text>
                <Slider style={styles.slider} minimumValue={0} maximumValue={100} step={1}
                  value={protein} onValueChange={setProtein}
                  minimumTrackTintColor={colors.neonGreen} maximumTrackTintColor={colors.borderDefault} thumbTintColor={colors.neonGreen} />

                <Text style={[styles.label, { marginTop: SPACING.sm }]}>Carbs — {carbs}g</Text>
                <Slider style={styles.slider} minimumValue={0} maximumValue={200} step={1}
                  value={carbs} onValueChange={setCarbs}
                  minimumTrackTintColor={colors.primary} maximumTrackTintColor={colors.borderDefault} thumbTintColor={colors.primary} />

                <Text style={[styles.label, { marginTop: SPACING.sm }]}>Fat — {fat}g</Text>
                <Slider style={[styles.slider, { marginBottom: SPACING.md }]} minimumValue={0} maximumValue={100} step={1}
                  value={fat} onValueChange={setFat}
                  minimumTrackTintColor={colors.accent} maximumTrackTintColor={colors.borderDefault} thumbTintColor={colors.accent} />
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              onPress={handleSave} activeOpacity={0.8} disabled={saving}
            >
              <Text style={styles.saveText}>{saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Log Meal'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => animateClose()} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  const { colors } = theme;
  return StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.bgOverlay },
  sheet: {
    backgroundColor: colors.bgSecondary, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    borderWidth: 1, borderColor: colors.neonYellow + '88', borderBottomWidth: 0,
    maxHeight: '90%', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl,
  },
  handleArea: { alignItems: 'center', paddingVertical: SPACING.md },
  handleBar: { width: 40, height: 4, backgroundColor: colors.borderDefault, borderRadius: RADIUS.full },
  title: {
    fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.black, color: colors.textPrimary,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deleteIconBtn: {
    width: 32, height: 32, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  progressCard: {
    backgroundColor: colors.bgTertiary, borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.lg, borderWidth: 1, borderColor: colors.borderDefault,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  progressLabel: { fontSize: FONT_SIZES.xs, color: colors.textMuted, letterSpacing: 1 },
  progressValue: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold },
  progressTrack: { height: 6, backgroundColor: colors.borderDefault, borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: SPACING.xs },
  progressFill: { height: '100%', borderRadius: RADIUS.full },
  remainingText: { fontSize: FONT_SIZES.xs, color: colors.textMuted, textAlign: 'center' },
  label: {
    fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, color: colors.textMuted,
    letterSpacing: 1.5, marginBottom: SPACING.sm,
  },
  quickAddHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  manageLink: { fontSize: FONT_SIZES.xs, color: colors.primary, fontWeight: FONT_WEIGHTS.bold, marginBottom: SPACING.sm },
  chipRow: { flexDirection: 'row', gap: SPACING.sm, paddingBottom: SPACING.xs },
  chip: { borderColor: colors.borderDefault, borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
  chipText: { fontSize: FONT_SIZES.sm, color: colors.textSecondary, fontWeight: FONT_WEIGHTS.medium },
  mealTypeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  mealTypeCard: {
    flex: 1, backgroundColor: colors.bgTertiary, borderColor: colors.borderDefault,
    borderWidth: 1, borderRadius: RADIUS.md, alignItems: 'center', paddingVertical: SPACING.md,
  },
  mealIcon: { marginBottom: 4 },
  mealTypeName: { fontSize: FONT_SIZES.xs, color: colors.textSecondary, fontWeight: FONT_WEIGHTS.bold },
  input: {
    backgroundColor: colors.bgTertiary, borderColor: colors.borderDefault, borderWidth: 1,
    borderRadius: RADIUS.sm, padding: SPACING.md, color: colors.textPrimary,
  },
  slider: { width: '100%', height: 40 },
  calorieLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calorieValue: { fontSize: FONT_SIZES.sm, color: colors.neonYellow, fontWeight: FONT_WEIGHTS.bold, marginBottom: SPACING.sm },
  calorieInput: {
    backgroundColor: colors.bgTertiary, borderColor: colors.neonYellow, borderWidth: 1,
    borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 4,
    color: colors.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold,
    minWidth: 70, textAlign: 'right', marginBottom: SPACING.xs,
  },
  macroToggle: { marginBottom: SPACING.lg, paddingVertical: SPACING.sm },
  macroToggleText: { fontSize: FONT_SIZES.sm, color: colors.primary, fontWeight: FONT_WEIGHTS.bold },
  saveButton: { backgroundColor: colors.neonYellow + 'dd', borderRadius: RADIUS.md, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.sm },
  saveText: { color: colors.textPrimary, fontWeight: FONT_WEIGHTS.black, fontSize: FONT_SIZES.md, letterSpacing: 0.5 },
  cancelButton: { padding: SPACING.lg, alignItems: 'center' },
  cancelText: { color: colors.textMuted, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.sm, letterSpacing: 0.5 },
  });
}
