import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, TextInput, Alert,
  KeyboardAvoidingView, Platform, Animated, PanResponder
} from 'react-native';
import Slider from '@react-native-community/slider';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS
} from '@/constants/theme';

const MEAL_TYPES = [
  { name: 'Breakfast', emoji: '🌅', color: COLORS.neonYellow },
  { name: 'Lunch',     emoji: '☀️', color: COLORS.primary },
  { name: 'Dinner',    emoji: '🌙', color: COLORS.neonBlue },
  { name: 'Snack',     emoji: '🍎', color: COLORS.neonGreen },
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
  const [mealType, setMealType] = useState('');
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState(400);
  const [protein, setProtein] = useState(20);
  const [carbs, setCarbs] = useState(40);
  const [fat, setFat] = useState(10);
  const [showMacros, setShowMacros] = useState(false);
  const [todayCalories, setTodayCalories] = useState(0);
  const [saving, setSaving] = useState(false);

  const slideAnim = useRef(new Animated.Value(600)).current;
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
          Animated.spring(slideAnim, { toValue: 600, useNativeDriver: true, damping: 20, stiffness: 200 })
            .start(() => handleClose());
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
        Animated.spring(slideAnim, { toValue: 600, useNativeDriver: true, damping: 20, stiffness: 200 }),
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
    if (data) { setTodayCalories(p => p + calories); onSaved(data); reset(); onClose(); }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={styles.handleBar} />
          </View>

          <Text style={styles.title}>◈ LOG MEAL</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Progress */}
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>TODAY</Text>
                <Text style={[styles.progressValue, { color: progressColor }]}>
                  {todayCalories} / {CALORIE_GOAL} KCAL
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
            <Text style={styles.label}>QUICK ADD</Text>
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
            <Text style={styles.label}>MEAL TYPE</Text>
            <View style={styles.mealTypeRow}>
              {MEAL_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.name}
                  style={[styles.mealTypeCard, mealType === t.name && { borderColor: t.color, backgroundColor: t.color + '22' }]}
                  onPress={() => setMealType(t.name)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.mealEmoji}>{t.emoji}</Text>
                  <Text style={[styles.mealTypeName, mealType === t.name && { color: t.color }]}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Meal name */}
            <Text style={styles.label}>MEAL NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Chicken and rice"
              placeholderTextColor={COLORS.textMuted}
              value={mealName}
              onChangeText={setMealName}
              autoCapitalize="words"
            />

            {/* Calories slider */}
            <Text style={styles.label}>CALORIES — {calories} KCAL</Text>
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
                {showMacros ? '▾ HIDE MACROS' : '▸ ADD MACROS (OPTIONAL)'}
              </Text>
            </TouchableOpacity>

            {showMacros && (
              <View>
                <Text style={styles.label}>PROTEIN — {protein}G</Text>
                <Slider style={styles.slider} minimumValue={0} maximumValue={100} step={1}
                  value={protein} onValueChange={setProtein}
                  minimumTrackTintColor={COLORS.neonGreen} maximumTrackTintColor={COLORS.borderDefault} thumbTintColor={COLORS.neonGreen} />

                <Text style={[styles.label, { marginTop: SPACING.sm }]}>CARBS — {carbs}G</Text>
                <Slider style={styles.slider} minimumValue={0} maximumValue={200} step={1}
                  value={carbs} onValueChange={setCarbs}
                  minimumTrackTintColor={COLORS.primary} maximumTrackTintColor={COLORS.borderDefault} thumbTintColor={COLORS.primary} />

                <Text style={[styles.label, { marginTop: SPACING.sm }]}>FAT — {fat}G</Text>
                <Slider style={[styles.slider, { marginBottom: SPACING.md }]} minimumValue={0} maximumValue={100} step={1}
                  value={fat} onValueChange={setFat}
                  minimumTrackTintColor={COLORS.accent} maximumTrackTintColor={COLORS.borderDefault} thumbTintColor={COLORS.accent} />
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              onPress={handleSave} activeOpacity={0.8} disabled={saving}
            >
              <Text style={styles.saveText}>{saving ? 'SAVING...' : '▸ LOG MEAL'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={handleClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>CANCEL</Text>
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
    fontFamily: 'monospace', letterSpacing: 3, marginBottom: SPACING.lg, textAlign: 'center',
  },
  label: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, fontFamily: 'monospace', letterSpacing: 2, marginBottom: SPACING.sm },
  progressCard: {
    backgroundColor: COLORS.bgTertiary, borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.borderDefault,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  progressLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, fontFamily: 'monospace', letterSpacing: 2 },
  progressValue: { fontSize: FONT_SIZES.xs, fontFamily: 'monospace', fontWeight: FONT_WEIGHTS.bold },
  progressTrack: { height: 6, backgroundColor: COLORS.borderDefault, borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: SPACING.xs },
  progressFill: { height: '100%', borderRadius: RADIUS.full },
  remainingText: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, fontFamily: 'monospace', textAlign: 'right' },
  chipRow: { flexDirection: 'row', gap: SPACING.sm, paddingBottom: SPACING.xs },
  chip: { borderColor: COLORS.borderDefault, borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
  chipText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, fontFamily: 'monospace', letterSpacing: 1 },
  mealTypeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  mealTypeCard: {
    flex: 1, backgroundColor: COLORS.bgTertiary, borderColor: COLORS.borderDefault,
    borderWidth: 1, borderRadius: RADIUS.md, alignItems: 'center', paddingVertical: SPACING.md,
  },
  mealEmoji: { fontSize: FONT_SIZES.lg, marginBottom: 4 },
  mealTypeName: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontFamily: 'monospace', fontWeight: FONT_WEIGHTS.bold },
  input: {
    backgroundColor: COLORS.bgTertiary, borderColor: COLORS.borderDefault, borderWidth: 1,
    borderRadius: RADIUS.sm, padding: SPACING.md, color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md, fontFamily: 'monospace', marginBottom: SPACING.lg,
  },
  slider: { width: '100%', height: 40 },
  macroToggle: { marginBottom: SPACING.lg, paddingVertical: SPACING.sm },
  macroToggleText: { color: COLORS.primary, fontSize: FONT_SIZES.xs, fontFamily: 'monospace', letterSpacing: 2, fontWeight: FONT_WEIGHTS.bold },
  saveButton: { backgroundColor: COLORS.neonYellow + 'dd', borderRadius: RADIUS.md, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.sm },
  saveText: { color: COLORS.bgPrimary, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.md, fontFamily: 'monospace', letterSpacing: 3 },
  cancelButton: { padding: SPACING.lg, alignItems: 'center' },
  cancelText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, fontFamily: 'monospace', letterSpacing: 2 },
});