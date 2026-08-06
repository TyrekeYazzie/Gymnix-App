import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, TextInput, Alert, Dimensions,
  KeyboardAvoidingView, Platform, Animated, PanResponder
} from 'react-native';
import Slider from '@react-native-community/slider';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import { awardXP, XP_MEAL } from '@/lib/xp';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS
} from '@/constants/theme';

// slide the sheet fully past the bottom edge regardless of device height or sheet content length
const SLIDE_DISTANCE = Dimensions.get('window').height + 100;

const MEAL_TYPES: { name: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { name: 'Breakfast', icon: 'sunny-outline',      color: COLORS.neonYellow },
  { name: 'Lunch',     icon: 'restaurant-outline', color: COLORS.primary },
  { name: 'Dinner',    icon: 'moon-outline',       color: COLORS.neonBlue },
  { name: 'Snack',     icon: 'fast-food-outline',  color: COLORS.neonGreen },
];

const QUICK_MEALS = [
  { name: 'Protein Shake', meal_type: 'Snack',     calories: 180, protein: 25, carbs: 8,  fat: 3  },
  { name: 'Chicken Rice',  meal_type: 'Lunch',     calories: 450, protein: 40, carbs: 50, fat: 8  },
  { name: 'Oatmeal',       meal_type: 'Breakfast', calories: 300, protein: 10, carbs: 55, fat: 6  },
  { name: 'Salad',         meal_type: 'Lunch',     calories: 220, protein: 8,  carbs: 20, fat: 12 },
  { name: 'Eggs',          meal_type: 'Breakfast', calories: 180, protein: 14, carbs: 1,  fat: 12 },
];

const CALORIE_GOAL = 2000;

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (log: any) => void;
}

export default function CaloriesLog({ visible, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const { refreshProfile } = useProfile();
  const [mealType, setMealType] = useState('');
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState(400);
  const [protein, setProtein] = useState(20);
  const [carbs, setCarbs] = useState(40);
  const [fat, setFat] = useState(10);
  const [showMacros, setShowMacros] = useState(false);
  const [todayCalories, setTodayCalories] = useState(0);
  const [saving, setSaving] = useState(false);

  const slideAnim = useRef(new Animated.Value(SLIDE_DISTANCE)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const remaining = CALORIE_GOAL - todayCalories;
  const progressPercent = Math.min((todayCalories / CALORIE_GOAL) * 100, 100);
  const progressColor = progressPercent >= 100 ? COLORS.accent : progressPercent >= 75 ? COLORS.neonYellow : COLORS.neonGreen;

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

  const reset = () => {
    setMealType(''); setMealName(''); setCalories(400);
    setProtein(20); setCarbs(40); setFat(10); setShowMacros(false);
  };

  const handleClose = () => { reset(); onClose(); };

  // plays the slide-down/fade-out first, then closes — used for backdrop taps and Cancel,
  // since Modal's `visible` prop hides the native modal instantly otherwise, cutting the animation short
  const animateClose = () => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: SLIDE_DISTANCE, useNativeDriver: true, damping: 20, stiffness: 200 }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => handleClose());
  };

  const getMealColor = (m: string) => MEAL_TYPES.find(t => t.name === m)?.color ?? COLORS.neonYellow;

  const applyQuickMeal = (m: typeof QUICK_MEALS[0]) => {
    setMealName(m.name); setMealType(m.meal_type);
    setCalories(m.calories); setProtein(m.protein);
    setCarbs(m.carbs); setFat(m.fat);
  };

  const handleSave = async () => {
    if (!mealName || !mealType) {
      Alert.alert('Missing Info', 'Please enter a meal name and type');
      return;
    }
    if (!user) return;
    setSaving(true);

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
      setTodayCalories(p => p + calories); onSaved(data); reset(); onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={animateClose} />
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
            <Text style={styles.title}>Log Meal</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
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
            <Text style={styles.label}>Quick add</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.lg }}>
              <View style={styles.chipRow}>
                {QUICK_MEALS.map((m) => (
                  <TouchableOpacity
                    key={m.name}
                    style={[styles.chip, mealName === m.name && {
                      borderColor: getMealColor(m.meal_type),
                      backgroundColor: getMealColor(m.meal_type) + '22',
                    }]}
                    onPress={() => applyQuickMeal(m)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, mealName === m.name && { color: getMealColor(m.meal_type) }]}>
                      {m.name}
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
                    color={mealType === t.name ? t.color : COLORS.textSecondary}
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
              placeholderTextColor={COLORS.textMuted}
              value={mealName}
              onChangeText={setMealName}
              autoCapitalize="words"
            />

            {/* Calories slider */}
            <Text style={styles.label}>Calories — {calories} kcal</Text>
            <Slider
              style={styles.slider}
              minimumValue={50} maximumValue={1500} step={10}
              value={calories} onValueChange={setCalories}
              minimumTrackTintColor={COLORS.neonYellow}
              maximumTrackTintColor={COLORS.borderDefault}
              thumbTintColor={COLORS.neonYellow}
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
                  minimumTrackTintColor={COLORS.neonGreen} maximumTrackTintColor={COLORS.borderDefault} thumbTintColor={COLORS.neonGreen} />

                <Text style={[styles.label, { marginTop: SPACING.sm }]}>Carbs — {carbs}g</Text>
                <Slider style={styles.slider} minimumValue={0} maximumValue={200} step={1}
                  value={carbs} onValueChange={setCarbs}
                  minimumTrackTintColor={COLORS.primary} maximumTrackTintColor={COLORS.borderDefault} thumbTintColor={COLORS.primary} />

                <Text style={[styles.label, { marginTop: SPACING.sm }]}>Fat — {fat}g</Text>
                <Slider style={[styles.slider, { marginBottom: SPACING.md }]} minimumValue={0} maximumValue={100} step={1}
                  value={fat} onValueChange={setFat}
                  minimumTrackTintColor={COLORS.accent} maximumTrackTintColor={COLORS.borderDefault} thumbTintColor={COLORS.accent} />
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              onPress={handleSave} activeOpacity={0.8} disabled={saving}
            >
              <Text style={styles.saveText}>{saving ? 'Saving…' : 'Log Meal'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={animateClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.bgOverlay },
  sheet: {
    backgroundColor: COLORS.bgSecondary, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.neonYellow + '88', borderBottomWidth: 0,
    maxHeight: '90%', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl,
  },
  handleArea: { alignItems: 'center', paddingVertical: SPACING.md },
  handleBar: { width: 40, height: 4, backgroundColor: COLORS.borderDefault, borderRadius: RADIUS.full },
  title: {
    fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.black, color: COLORS.textPrimary,
  },
  progressCard: {
    backgroundColor: COLORS.bgTertiary, borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.borderDefault,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  progressLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, letterSpacing: 1 },
  progressValue: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold },
  progressTrack: { height: 6, backgroundColor: COLORS.borderDefault, borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: SPACING.xs },
  progressFill: { height: '100%', borderRadius: RADIUS.full },
  remainingText: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, textAlign: 'center' },
  label: {
    fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textMuted,
    letterSpacing: 1.5, marginBottom: SPACING.sm,
  },
  chipRow: { flexDirection: 'row', gap: SPACING.sm, paddingBottom: SPACING.xs },
  chip: { borderColor: COLORS.borderDefault, borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
  chipText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontWeight: FONT_WEIGHTS.medium },
  mealTypeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  mealTypeCard: {
    flex: 1, backgroundColor: COLORS.bgTertiary, borderColor: COLORS.borderDefault,
    borderWidth: 1, borderRadius: RADIUS.md, alignItems: 'center', paddingVertical: SPACING.md,
  },
  mealIcon: { marginBottom: 4 },
  mealTypeName: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: FONT_WEIGHTS.bold },
  input: {
    backgroundColor: COLORS.bgTertiary, borderColor: COLORS.borderDefault, borderWidth: 1,
    borderRadius: RADIUS.sm, padding: SPACING.md, color: COLORS.textPrimary,
  },
  slider: { width: '100%', height: 40 },
  macroToggle: { marginBottom: SPACING.lg, paddingVertical: SPACING.sm },
  macroToggleText: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: FONT_WEIGHTS.bold },
  saveButton: { backgroundColor: COLORS.neonYellow + 'dd', borderRadius: RADIUS.md, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.sm },
  saveText: { color: COLORS.textPrimary, fontWeight: FONT_WEIGHTS.black, fontSize: FONT_SIZES.md, letterSpacing: 0.5 },
  cancelButton: { padding: SPACING.lg, alignItems: 'center' },
  cancelText: { color: COLORS.textMuted, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.sm, letterSpacing: 0.5 },
});
