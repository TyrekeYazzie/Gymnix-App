import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, Alert, Dimensions, Image,
  KeyboardAvoidingView, Platform, Animated, PanResponder
} from 'react-native';
import Slider from '@react-native-community/slider';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import { awardXP, calcWorkoutXP } from '@/lib/xp';
import { WORKOUT_CATEGORIES as CATEGORIES } from '@/constants/workoutCategories';
import { getTodayKey, toDayCategories } from '@/utils/routine';
import { pickWorkoutPhoto, uploadWorkoutPhoto } from '@/utils/workoutPhotos';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS
} from '@/constants/theme';

// slide the sheet fully past the bottom edge regardless of device height or sheet content length
const SLIDE_DISTANCE = Dimensions.get('window').height + 100;

const COMMON_EXERCISES: Record<string, string[]> = {
  CHEST:     ['Bench Press', 'Incline Press', 'Push-Ups', 'Dumbbell Press', 'Chest Fly', 'Cable Crossover', 'Dips'],
  BACK:      ['Pull-Ups', 'Deadlift', 'Lat Pulldown', 'Bent-Over Row', 'Seated Row', 'T-Bar Row', 'Face Pull'],
  LEGS:      ['Squat', 'Leg Press', 'Lunges', 'Leg Curl', 'Leg Extension', 'Calf Raise', 'Romanian Deadlift'],
  SHOULDERS: ['Overhead Press', 'Lateral Raise', 'Front Raise', 'Arnold Press', 'Shrugs', 'Rear Delt Fly', 'Upright Row'],
  ARMS:      ['Bicep Curl', 'Tricep Extension', 'Hammer Curl', 'Skull Crushers', 'Cable Curl', 'Tricep Dips', 'Preacher Curl'],
  ABS:       ['Crunches', 'Plank', 'Leg Raises', 'Russian Twists', 'Sit-Ups', 'Mountain Climbers', 'Cable Woodchopper'],
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
  const { profile, isImperial, refreshProfile } = useProfile();
  const weightUnit = isImperial ? 'lbs' : 'kg';

  const [category, setCategory] = useState(initialCategory || 'CHEST');
  const [name, setName] = useState('');
  const [customName, setCustomName] = useState('');
  const [sets, setSets] = useState<SetEntry[]>([{ reps: '', weight: '' }]);
  const [duration, setDuration] = useState(30);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const slideAnim = useRef(new Animated.Value(SLIDE_DISTANCE)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (initialCategory) setCategory(initialCategory);
  }, [initialCategory]);

  // Today's scheduled muscle groups — narrows the picker below unless the caller
  // explicitly requested a category (e.g. long-pressing a filter pill on the Workouts tab).
  const scheduledCategories = initialCategory ? [] : toDayCategories(profile?.weekly_routine?.[getTodayKey()]);
  const displayCategories = scheduledCategories.length > 0
    ? CATEGORIES.filter(c => scheduledCategories.includes(c.name))
    : CATEGORIES;

  // On open, default to the first scheduled group for today.
  useEffect(() => {
    if (!visible || initialCategory) return;
    if (scheduledCategories.length > 0) setCategory(scheduledCategories[0]);
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8,
      onPanResponderMove: (_, g) => { if (g.dy > 0) slideAnim.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 0.5) {
          animateClose();
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 180 }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: SLIDE_DISTANCE, useNativeDriver: true, damping: 20, stiffness: 200 }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const reset = () => {
    setName('');
    setCustomName('');
    setSets([{ reps: '', weight: '' }]);
    setDuration(30);
    setPhotoUri(null);
  };

  const handleAttachPhoto = async () => {
    const uri = await pickWorkoutPhoto();
    if (uri) setPhotoUri(uri);
  };
  const handleClose = () => { reset(); onClose(); };

  // plays the slide-down/fade-out first, then closes — used for backdrop taps and the close button,
  // since Modal's `visible` prop hides the native modal instantly otherwise, cutting the animation short
  const animateClose = () => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: SLIDE_DISTANCE, useNativeDriver: true, damping: 20, stiffness: 200 }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => handleClose());
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setName('');
    setCustomName('');
    setSets([{ reps: '', weight: '' }]);
  };

  // Pulls the most recent logged sets for this exact exercise name so the user
  // can just confirm/adjust numbers instead of retyping last week's workout.
  const loadPreviousSets = async (exerciseName: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('workouts')
      .select('sets')
      .eq('user_id', user.id)
      .eq('name', exerciseName)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.sets?.length) {
      setSets(data.sets.map((s: { reps: number; weight: number }) => ({ reps: String(s.reps), weight: String(s.weight) })));
    } else {
      setSets([{ reps: '', weight: '' }]);
    }
  };

  const handleExerciseSelect = (ex: string) => {
    setName(ex);
    setCustomName('');
    loadPreviousSets(ex);
  };

  const addSet = () => setSets(prev => [...prev, { reps: '', weight: '' }]);
  const removeSet = (index: number) => setSets(prev => prev.filter((_, i) => i !== index));
  const updateSet = (index: number, field: keyof SetEntry, value: string) =>
    setSets(prev => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));

  const finalName = customName.trim() || name;

  const activeCat = CATEGORIES.find(c => c.name === category)!;

  const handleSave = async () => {
    if (!finalName.trim()) { Alert.alert('Missing Exercise', 'Tap an exercise or type a custom name.'); return; }
    if (!user) return;

    const cleanSets = sets
      .filter(s => s.reps.trim() && s.weight.trim())
      .map(s => ({ reps: Number(s.reps), weight: Number(s.weight) }));

    if (cleanSets.some(s => s.reps <= 0 || s.reps > 200 || s.weight < 0 || s.weight > 2000)) {
      Alert.alert('Invalid Set', 'Check your reps and weight values.');
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from('workouts')
      .insert({ user_id: user.id, name: finalName.trim(), category, duration: `${duration} min`, calories: 0, sets: cleanSets })
      .select()
      .single();
    setSaving(false);

    if (error) { Alert.alert('Error', error.message); return; }
    if (data) {
      const xp = calcWorkoutXP(cleanSets);
      await awardXP(user.id, xp);
      await refreshProfile();

      let saved = data;
      if (photoUri) {
        const photoPath = await uploadWorkoutPhoto(user.id, data.id, photoUri);
        if (photoPath) {
          const { data: updated } = await supabase
            .from('workouts')
            .update({ photo_path: photoPath })
            .eq('id', data.id)
            .select()
            .single();
          if (updated) saved = updated;
        }
        // Upload failures are logged inside uploadWorkoutPhoto but shouldn't
        // block the workout itself from being saved — the sets are the point.
      }

      onSaved(saved); reset(); onClose();
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
          {/* Drag handle + header — swipe down anywhere here to close */}
          <View {...panResponder.panHandlers}>
            <View style={styles.handleArea}>
              <View style={styles.handleBar} />
            </View>

            {/* Header with active category accent */}
            <View style={[styles.sheetHeader, { borderLeftColor: activeCat.color }]}>
              <View>
                <Text style={styles.sheetLabel}>New workout</Text>
                <Text style={styles.sheetTitle}>
                  Log <Ionicons name={activeCat.icon} size={18} color={activeCat.color} /> {activeCat.name}
                </Text>
              </View>
              <View style={styles.headerActions}>
                <View style={styles.photoBtnWrap}>
                  <TouchableOpacity onPress={handleAttachPhoto} activeOpacity={0.7} style={styles.photoBtn}>
                    {photoUri ? (
                      <Image source={{ uri: photoUri }} style={styles.photoThumb} />
                    ) : (
                      <Ionicons name="camera-outline" size={18} color={COLORS.textMuted} />
                    )}
                  </TouchableOpacity>
                  {photoUri && (
                    <TouchableOpacity onPress={() => setPhotoUri(null)} activeOpacity={0.7} style={styles.photoRemoveBadge}>
                      <Ionicons name="close" size={10} color={COLORS.textInverse} />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity onPress={animateClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {/* Category selector — horizontal scroll, narrowed to today's routine when scheduled */}
            <Text style={styles.sectionLabel}>Muscle group</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.lg }}>
              <View style={styles.categoryRow}>
                {displayCategories.map((c) => (
                  <TouchableOpacity
                    key={c.name}
                    style={[
                      styles.categoryPill,
                      category === c.name && { backgroundColor: c.color, borderColor: c.color },
                    ]}
                    onPress={() => handleCategoryChange(c.name)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={c.icon}
                      size={16}
                      color={category === c.name ? COLORS.textInverse : c.color}
                    />
                    <Text style={[styles.categoryName, category === c.name && { color: COLORS.textInverse }]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Exercise picker */}
            <Text style={styles.sectionLabel}>Exercise</Text>
            <View style={styles.exerciseGrid}>
              {(COMMON_EXERCISES[category] ?? []).map((ex) => {
                const isSelected = name === ex && !customName.trim();
                return (
                  <TouchableOpacity
                    key={ex}
                    style={[styles.exerciseChip, isSelected && { backgroundColor: activeCat.color + '22', borderColor: activeCat.color }]}
                    onPress={() => handleExerciseSelect(ex)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.exerciseChipText, isSelected && { color: activeCat.color, fontWeight: FONT_WEIGHTS.bold }]}>
                      {ex}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom name */}
            <TextInput
              style={styles.customInput}
              value={customName}
              onChangeText={setCustomName}
              placeholder="Or type a custom exercise name…"
              placeholderTextColor={COLORS.textMuted}
            />

            {/* Sets */}
            <View style={styles.setsHeader}>
              <Text style={styles.sectionLabel}>Sets</Text>
              <TouchableOpacity onPress={addSet} style={styles.addSetBtn} activeOpacity={0.7}>
                <Text style={styles.addSetText}>+ Add Set</Text>
              </TouchableOpacity>
            </View>

            {/* Column headers */}
            <View style={styles.setColHeaders}>
              <Text style={[styles.setColLabel, { width: 32 }]}>#</Text>
              <Text style={[styles.setColLabel, { flex: 1 }]}>Reps</Text>
              <Text style={[styles.setColLabel, { flex: 1 }]}>{weightUnit}</Text>
              <View style={{ width: 32 }} />
            </View>

            {sets.map((s, i) => (
              <View key={i} style={styles.setRow}>
                <View style={styles.setNumCircle}>
                  <Text style={styles.setNum}>{i + 1}</Text>
                </View>
                <TextInput
                  style={styles.setInput}
                  value={s.reps}
                  onChangeText={(v) => updateSet(i, 'reps', v)}
                  placeholder="0"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.setInput}
                  value={s.weight}
                  onChangeText={(v) => updateSet(i, 'weight', v)}
                  placeholder="0"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  onPress={() => sets.length > 1 && removeSet(i)}
                  style={styles.removeBtn}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: sets.length > 1 ? COLORS.textMuted : 'transparent', fontSize: 16 }}>−</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Duration */}
            <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>DURATION — {duration} MIN</Text>
            <Slider
              style={styles.slider}
              minimumValue={5} maximumValue={180} step={5}
              value={duration} onValueChange={setDuration}
              minimumTrackTintColor={activeCat.color}
              maximumTrackTintColor={COLORS.borderDefault}
              thumbTintColor={activeCat.color}
            />

            {/* Save */}
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: activeCat.color }, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={saving}
            >
              <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save Workout'}</Text>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.primary + '88',
    borderBottomWidth: 0,
    maxHeight: '90%',
    paddingBottom: SPACING.xxxl,
    ...SHADOWS.purple,
  },
  handleArea: { alignItems: 'center', paddingVertical: 12 },
  handleBar: { width: 36, height: 4, backgroundColor: COLORS.borderDefault, borderRadius: RADIUS.full },

  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderLeftWidth: 3,
    marginLeft: SPACING.lg,
    paddingLeft: SPACING.md,
    marginBottom: SPACING.xs,
  },
  sheetLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontWeight: FONT_WEIGHTS.semibold,
    letterSpacing: 1,
    marginBottom: 2,
  },
  sheetTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  photoBtnWrap: {
    position: 'relative',
  },
  photoBtn: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.bgTertiary,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  photoRemoveBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.bgSecondary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.bgTertiary,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },

  sectionLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: SPACING.sm,
  },

  // Category pills
  categoryRow: { flexDirection: 'row', gap: SPACING.sm, paddingBottom: 4 },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgTertiary,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
  },
  categoryName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },

  // Exercise chips
  exerciseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  exerciseChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgTertiary,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
  },
  exerciseChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
  },

  customInput: {
    backgroundColor: COLORS.bgTertiary,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.lg,
  },

  // Sets
  setsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  addSetBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  addSetText: { color: COLORS.primary, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold },

  setColHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  setColLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 1,
    textAlign: 'center',
  },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  setNumCircle: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNum: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
  },
  setInput: {
    flex: 1,
    backgroundColor: COLORS.bgTertiary,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
  },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  slider: { width: '100%', height: 40, marginBottom: SPACING.lg },

  saveButton: {
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  saveText: {
    color: COLORS.textInverse,
    fontWeight: FONT_WEIGHTS.black,
    fontSize: FONT_SIZES.lg,
    letterSpacing: 0.5,
  },
});
