import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, Alert,
  KeyboardAvoidingView, Platform, Animated, PanResponder
} from 'react-native';
import Slider from '@react-native-community/slider';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS
} from '@/constants/theme';

const CATEGORIES = [
  { name: 'CHEST',     emoji: '💪', color: COLORS.primary },
  { name: 'BACK',      emoji: '🏋️', color: COLORS.accent },
  { name: 'LEGS',      emoji: '🦵', color: COLORS.neonGreen },
  { name: 'SHOULDERS', emoji: '🏆', color: COLORS.neonBlue },
  { name: 'ARMS',      emoji: '💯', color: COLORS.neonYellow },
  { name: 'ABS',       emoji: '🔥', color: COLORS.neonOrange },
];

const COMMON_EXERCISES: Record<string, string[]> = {
  CHEST: ['Bench Press', 'Incline Bench Press', 'Push-Ups', 'Dumbbell Press', 'Chest Fly', 'Cable Crossover', 'Dips'],
  BACK: ['Pull-Ups', 'Deadlift', 'Lat Pulldown', 'Bent-Over Row', 'Seated Row', 'T-Bar Row', 'Face Pull'],
  LEGS: ['Squat', 'Leg Press', 'Lunges', 'Leg Curl', 'Leg Extension', 'Calf Raise', 'Romanian Deadlift'],
  SHOULDERS: ['Overhead Press', 'Lateral Raise', 'Front Raise', 'Arnold Press', 'Shrugs', 'Rear Delt Fly', 'Upright Row'],
  ARMS: ['Bicep Curl', 'Tricep Extension', 'Hammer Curl', 'Skull Crushers', 'Cable Curl', 'Tricep Dips', 'Preacher Curl'],
  ABS: ['Crunches', 'Plank', 'Leg Raises', 'Russian Twists', 'Sit-Ups', 'Mountain Climbers', 'Cable Woodchopper'],
};

interface SetEntry {
  reps: string;
  weight: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (log: any) => void;
  initialCategory?: string;
}

export default function WorkoutLog({ visible, onClose, onSaved, initialCategory }: Props) {
  const { user } = useAuth();
  const { isImperial } = useProfile();
  const weightUnit = isImperial ? 'lbs' : 'kg';

  const [category, setCategory] = useState(initialCategory || 'CHEST');
  const [name, setName] = useState('');
  const [customName, setCustomName] = useState('');
  const [sets, setSets] = useState<SetEntry[]>([{ reps: '', weight: '' }]);
  const [duration, setDuration] = useState(30);
  const [saving, setSaving] = useState(false);

  const slideAnim = useRef(new Animated.Value(600)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (initialCategory) setCategory(initialCategory);
  }, [initialCategory]);

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

  const reset = () => {
    setName('');
    setCustomName('');
    setSets([{ reps: '', weight: '' }]);
    setDuration(30);
  };
  const handleClose = () => { reset(); onClose(); };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setName('');
    setCustomName('');
  };

  const handleSelectExercise = (exercise: string) => {
    setName(exercise);
    setCustomName('');
  };

  const addSet = () => setSets(prev => [...prev, { reps: '', weight: '' }]);
  const removeSet = (index: number) => setSets(prev => prev.filter((_, i) => i !== index));
  const updateSet = (index: number, field: keyof SetEntry, value: string) => {
    setSets(prev => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const finalName = customName.trim() || name;

  const handleSave = async () => {
    if (!finalName.trim()) { Alert.alert('Missing Info', 'Please select or enter an exercise name'); return; }
    if (!user) return;

    const cleanSets = sets
      .filter(s => s.reps.trim() && s.weight.trim())
      .map(s => ({ reps: Number(s.reps), weight: Number(s.weight) }));

    const hasInvalidSet = cleanSets.some(
      s => s.reps <= 0 || s.reps > 200 || s.weight < 0 || s.weight > 2000
    );
    if (hasInvalidSet) {
      Alert.alert('Invalid Set', 'Please enter realistic reps and weight values');
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        name: finalName.trim(),
        category,
        duration: `${duration} min`,
        calories: 0,
        sets: cleanSets,
      })
      .select()
      .single();

    setSaving(false);

    if (error) { Alert.alert('Error', error.message); return; }
    if (data) { onSaved(data); reset(); onClose(); }
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

          <Text style={styles.title}>◈ LOG WORKOUT</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>CATEGORY</Text>
            <View style={styles.typeGrid}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.name}
                  style={[styles.typeCard, category === c.name && { borderColor: c.color, backgroundColor: c.color + '22' }]}
                  onPress={() => handleCategoryChange(c.name)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.typeEmoji}>{c.emoji}</Text>
                  <Text style={[styles.typeName, category === c.name && { color: c.color }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>EXERCISE</Text>
            <View style={styles.exerciseGrid}>
              {(COMMON_EXERCISES[category] ?? []).map((exercise) => (
                <TouchableOpacity
                  key={exercise}
                  style={[
                    styles.exerciseChip,
                    name === exercise && !customName.trim() && styles.exerciseChipActive,
                  ]}
                  onPress={() => handleSelectExercise(exercise)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.exerciseChipText,
                    name === exercise && !customName.trim() && styles.exerciseChipTextActive,
                  ]}>
                    {exercise}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: SPACING.md }]}>OR ENTER CUSTOM NAME (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              value={customName}
              onChangeText={setCustomName}
              placeholder="e.g. Cable Lateral Raise"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={[styles.label, { marginTop: SPACING.md }]}>SETS</Text>
            {sets.map((s, i) => (
              <View key={i} style={styles.setRow}>
                <Text style={styles.setIndex}>{i + 1}</Text>
                <TextInput
                  style={[styles.input, styles.setInput]}
                  value={s.reps}
                  onChangeText={(v) => updateSet(i, 'reps', v)}
                  placeholder="reps"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.setInput]}
                  value={s.weight}
                  onChangeText={(v) => updateSet(i, 'weight', v)}
                  placeholder={weightUnit}
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                />
                {sets.length > 1 && (
                  <TouchableOpacity onPress={() => removeSet(i)} style={styles.removeSetButton}>
                    <Text style={styles.removeSetText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity onPress={addSet} style={styles.addSetButton} activeOpacity={0.7}>
              <Text style={styles.addSetText}>+ ADD SET</Text>
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: SPACING.md }]}>DURATION — {duration} MIN</Text>
            <Slider
              style={[styles.slider, { marginBottom: SPACING.lg }]}
              minimumValue={5}
              maximumValue={180}
              step={5}
              value={duration}
              onValueChange={setDuration}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.borderDefault}
              thumbTintColor={COLORS.primary}
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={saving}
            >
              <Text style={styles.saveText}>{saving ? 'SAVING...' : '▸ SAVE WORKOUT'}</Text>
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
    backgroundColor: COLORS.bgSecondary,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.primary + '88', borderBottomWidth: 0,
    maxHeight: '85%', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl,
    ...SHADOWS.purple,
  },
  handleArea: { alignItems: 'center', paddingVertical: SPACING.md },
  handleBar: { width: 40, height: 4, backgroundColor: COLORS.borderDefault, borderRadius: RADIUS.full },
  title: {
    fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.black, color: COLORS.textPrimary,
    fontFamily: 'monospace', letterSpacing: 3, marginBottom: SPACING.lg, textAlign: 'center',
  },
  label: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, fontFamily: 'monospace', letterSpacing: 2, marginBottom: SPACING.sm },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  typeCard: {
    width: '30.6%', backgroundColor: COLORS.bgTertiary, borderColor: COLORS.borderDefault,
    borderWidth: 1, borderRadius: RADIUS.md, alignItems: 'center', paddingVertical: SPACING.md,
  },
  typeEmoji: { fontSize: FONT_SIZES.xl, marginBottom: 4 },
  typeName: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontFamily: 'monospace', fontWeight: FONT_WEIGHTS.bold },
  exerciseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  exerciseChip: {
    backgroundColor: COLORS.bgTertiary, borderColor: COLORS.borderDefault, borderWidth: 1,
    borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  exerciseChipActive: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primary,
  },
  exerciseChipText: {
    fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontFamily: 'monospace', fontWeight: FONT_WEIGHTS.bold,
  },
  exerciseChipTextActive: {
    color: COLORS.textInverse,
  },
  input: {
    backgroundColor: COLORS.bgTertiary, borderColor: COLORS.borderDefault, borderWidth: 1,
    borderRadius: RADIUS.sm, padding: SPACING.md, color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md, fontFamily: 'monospace',
  },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  setIndex: { color: COLORS.textMuted, fontFamily: 'monospace', fontSize: FONT_SIZES.sm, width: 16 },
  setInput: { flex: 1 },
  removeSetButton: { padding: SPACING.sm },
  removeSetText: { color: COLORS.textMuted, fontSize: FONT_SIZES.md },
  addSetButton: { alignSelf: 'flex-start', marginBottom: SPACING.md },
  addSetText: { color: COLORS.primary, fontFamily: 'monospace', fontSize: FONT_SIZES.xs, letterSpacing: 2, fontWeight: FONT_WEIGHTS.bold },
  slider: { width: '100%', height: 40 },
  saveButton: {
    backgroundColor: COLORS.primary + 'dd', borderRadius: RADIUS.md,
    padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.sm, ...SHADOWS.purple,
  },
  saveText: { color: COLORS.bgPrimary, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.md, fontFamily: 'monospace', letterSpacing: 3 },
  cancelButton: { padding: SPACING.lg, alignItems: 'center' },
  cancelText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, fontFamily: 'monospace', letterSpacing: 2 },
});
