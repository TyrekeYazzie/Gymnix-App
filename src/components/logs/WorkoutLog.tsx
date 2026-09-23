import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, Alert, Dimensions, Image,
  KeyboardAvoidingView, Platform, Animated, PanResponder, Keyboard
} from 'react-native';
import Slider from '@react-native-community/slider';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import { awardXP, calcWorkoutXP } from '@/lib/xp';
import { checkAndUnlockAchievements } from '@/lib/achievements';
import AchievementUnlockBanner from '@/components/AchievementUnlockBanner';
import { getWorkoutCategories } from '@/constants/workoutCategories';
import { COMMON_EXERCISES } from '@/constants/exercises';
import { getTodayKey, toDayCategories } from '@/utils/routine';
import { pickWorkoutPhoto, uploadWorkoutPhoto } from '@/utils/workoutPhotos';
import { topSetWeight } from '@/lib/workouts';
import { Workout, UnlockedAchievement, TemplateExercise } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import {
  FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, Theme
} from '@/constants/theme';

// slide the sheet fully past the bottom edge regardless of device height or sheet content length
const SLIDE_DISTANCE = Dimensions.get('window').height + 100;

interface SetEntry {
  reps: string;
  weight: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (log: any) => void;
  initialCategory?: string;
  /** When set, the sheet edits this workout in place instead of logging a new one. */
  editEntry?: Workout | null;
  onDeleted?: (id: string) => void;
  /** When set, pre-fills the sheet for one step of a workout template's exercise
   * sequence (see the startTemplateId handling in (tabs)/workouts.tsx). Mutually
   * exclusive with editEntry — editing always wins if both are somehow set. */
  templateStep?: { exercise: TemplateExercise; index: number; total: number; templateName: string } | null;
}

export default function WorkoutLog({ visible, onClose, onSaved, initialCategory, editEntry, onDeleted, templateStep }: Props) {
  const { user } = useAuth();
  const { profile, isImperial, refreshProfile } = useProfile();
  const { theme } = useTheme();
  const { colors } = theme;
  const CATEGORIES = useMemo(() => getWorkoutCategories(colors), [colors]);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const weightUnit = isImperial ? 'lbs' : 'kg';

  const [category, setCategory] = useState(initialCategory || 'CHEST');
  const [name, setName] = useState('');
  const [customName, setCustomName] = useState('');
  const [sets, setSets] = useState<SetEntry[]>([{ reps: '', weight: '' }]);
  const [duration, setDuration] = useState(30);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [prBanner, setPrBanner] = useState<{ weight: number; name: string } | null>(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const isEditing = !!editEntry;

  const slideAnim = useRef(new Animated.Value(SLIDE_DISTANCE)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const prTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (prTimeoutRef.current) clearTimeout(prTimeoutRef.current); };
  }, []);

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

  // Editing an existing workout overrides whatever the effect above defaulted
  // to — runs after it so this wins.
  useEffect(() => {
    if (!visible) return;
    if (!editEntry) { reset(); return; }
    const cat = editEntry.category ?? 'CHEST';
    setCategory(cat);
    if ((COMMON_EXERCISES[cat] ?? []).includes(editEntry.name)) {
      setName(editEntry.name);
      setCustomName('');
    } else {
      setName('');
      setCustomName(editEntry.name);
    }
    setSets(
      editEntry.sets && editEntry.sets.length > 0
        ? editEntry.sets.map(s => ({ reps: String(s.reps), weight: String(s.weight) }))
        : [{ reps: '', weight: '' }]
    );
    setDuration(parseInt(editEntry.duration ?? '30', 10) || 30);
    setPhotoUri(null);
  }, [visible, editEntry]);

  // Workout-template "start" flow (src/app/templates.tsx -> the Workouts tab)
  // pre-fills the sheet for one template exercise at a time. Declared after
  // the editEntry effect above so it wins if both fired on the same open,
  // though callers are expected to pass editEntry XOR templateStep, never both.
  useEffect(() => {
    if (!visible || editEntry || !templateStep) return;
    const { exercise } = templateStep;
    setCategory(exercise.category);
    if ((COMMON_EXERCISES[exercise.category] ?? []).includes(exercise.name)) {
      setName(exercise.name);
      setCustomName('');
    } else {
      setName('');
      setCustomName(exercise.name);
    }
    loadPreviousSets(exercise.name, { sets: exercise.targetSets, reps: exercise.targetReps });
  }, [visible, templateStep]);

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

  // Tracks the form ScrollView's own offset so the swipe-to-close gesture
  // below only engages when the form is scrolled to the very top — lets a
  // downward swipe close the sheet from anywhere in the body without
  // hijacking an in-progress scroll further down the form.
  const scrollOffsetY = useRef(0);
  const bodyPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => false,
      // Capture (not the plain/bubble variant) so this claims the gesture
      // ahead of the ScrollView's own responder when the conditions match,
      // instead of losing the negotiation to it.
      onMoveShouldSetPanResponderCapture: (_, g) =>
        scrollOffsetY.current <= 2 && g.dy > 8 && g.dy > Math.abs(g.dx),
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
    setPrBanner(null);
    setUnlockedAchievements([]);
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
  // `fallback` (only passed by the template pre-fill effect above) seeds that
  // many blank rows at the target rep count when there's no prior history for
  // this exercise, instead of leaving a single empty row.
  const loadPreviousSets = async (exerciseName: string, fallback?: { sets: number; reps: number }) => {
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
    } else if (fallback) {
      setSets(Array.from({ length: fallback.sets }, () => ({ reps: String(fallback.reps), weight: '' })));
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

    if (isEditing && editEntry) {
      const { data, error } = await supabase
        .from('workouts')
        .update({ name: finalName.trim(), category, duration: `${duration} min`, sets: cleanSets })
        .eq('id', editEntry.id)
        .select()
        .single();

      if (error) { setSaving(false); Alert.alert('Error', error.message); return; }
      if (data) {
        // Workout XP depends on the sets logged, so an edit can change how much
        // was earned — reconcile with just the delta instead of a flat award.
        const delta = calcWorkoutXP(cleanSets) - calcWorkoutXP(editEntry.sets);
        if (delta !== 0) await awardXP(user.id, delta);
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
        }
        setSaving(false);
        onSaved(saved); reset(); onClose();
      } else {
        setSaving(false);
      }
      return;
    }

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

      // PR check is scoped to new logs only, not edits — v1. Fetches every
      // prior row for this exact exercise name (no limit — a partial
      // history could produce a false "New PR!" claim, which would be a
      // trust-eroding bug) and compares against the session just saved.
      const currentTop = topSetWeight(cleanSets);
      let isPR = false;
      if (currentTop > 0) {
        const { data: priorRows } = await supabase
          .from('workouts')
          .select('sets')
          .eq('user_id', user.id)
          .eq('name', finalName.trim())
          .neq('id', data.id);
        const previousBest = (priorRows ?? []).reduce((max, w) => Math.max(max, topSetWeight(w.sets)), 0);
        if (currentTop > previousBest) {
          isPR = true;
          setPrBanner({ weight: currentTop, name: finalName.trim() });
        }
      }

      // Achievement check is also new-logs-only, same reasoning as the PR
      // check above. Runs regardless of whether this save was a PR.
      const newlyUnlocked = await checkAndUnlockAchievements();

      if (isPR || newlyUnlocked.length > 0) {
        setUnlockedAchievements(newlyUnlocked);
        setSaving(true);
        prTimeoutRef.current = setTimeout(() => {
          setSaving(false);
          onSaved(saved); reset(); onClose();
        }, 1400);
        return;
      }

      onSaved(saved); reset(); onClose();
    }
  };

  const handleDelete = () => {
    if (!editEntry) return;
    Alert.alert(
      'Delete Workout',
      `Remove "${editEntry.name}" from your log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setDeleting(true);
            const { error } = await supabase.from('workouts').delete().eq('id', editEntry.id);
            if (error) { setDeleting(false); Alert.alert('Error', error.message); return; }
            const xp = calcWorkoutXP(editEntry.sets);
            if (xp !== 0) await awardXP(user.id, -xp);
            await refreshProfile();
            setDeleting(false);
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
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={animateClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Drag handle + header — swipe down anywhere here to close */}
          <View {...panResponder.panHandlers}>
            <View style={styles.handleArea}>
              <View style={styles.handleBar} />
            </View>

            {/* Title row — same layout as the other log sheets */}
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{isEditing ? 'Edit Workout' : 'Log Workout'}</Text>
                {templateStep && (
                  <Text style={styles.templateStepText}>
                    {templateStep.templateName} · Exercise {templateStep.index + 1} of {templateStep.total}
                  </Text>
                )}
              </View>
              <View style={styles.headerActions}>
                {isEditing && (
                  <TouchableOpacity
                    onPress={handleDelete}
                    disabled={deleting}
                    style={styles.deleteIconBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Delete workout"
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.accent} />
                  </TouchableOpacity>
                )}
                <View style={styles.photoBtnWrap}>
                  <TouchableOpacity
                    onPress={handleAttachPhoto}
                    activeOpacity={0.7}
                    style={styles.photoBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={photoUri ? 'Change attached photo' : 'Attach a photo'}
                  >
                    {photoUri ? (
                      <Image source={{ uri: photoUri }} style={styles.photoThumb} />
                    ) : (
                      <Ionicons name="camera-outline" size={18} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                  {photoUri && (
                    <TouchableOpacity
                      onPress={() => setPhotoUri(null)}
                      activeOpacity={0.7}
                      style={styles.photoRemoveBadge}
                      accessibilityRole="button"
                      accessibilityLabel="Remove attached photo"
                    >
                      <Ionicons name="close" size={10} color={colors.textInverse} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>

          {prBanner && (
            <View style={styles.prBanner}>
              <Ionicons name="trophy" size={16} color={colors.neonYellow} />
              <Text style={styles.prBannerText}>New PR! {prBanner.weight} {weightUnit} on {prBanner.name}</Text>
            </View>
          )}
          <AchievementUnlockBanner achievements={unlockedAchievements} />

          <View {...bodyPanResponder.panHandlers}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            onScroll={(e) => { scrollOffsetY.current = e.nativeEvent.contentOffset.y; }}
            scrollEventThrottle={16}
          >

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
                      color={category === c.name ? colors.textInverse : c.color}
                    />
                    <Text style={[styles.categoryName, category === c.name && { color: colors.textInverse }]}>
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
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
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
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
                <TextInput
                  style={styles.setInput}
                  value={s.weight}
                  onChangeText={(v) => updateSet(i, 'weight', v)}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
                <TouchableOpacity
                  onPress={() => sets.length > 1 && removeSet(i)}
                  style={styles.removeBtn}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: sets.length > 1 ? colors.textMuted : 'transparent', fontSize: 16 }}>−</Text>
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
              maximumTrackTintColor={colors.borderDefault}
              thumbTintColor={activeCat.color}
            />

            {/* Save */}
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: activeCat.color }, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={saving}
            >
              <Text style={styles.saveText}>
                {saving
                  ? 'Saving…'
                  : templateStep
                    ? (templateStep.index + 1 >= templateStep.total ? 'Save & Finish' : 'Save & Next')
                    : isEditing ? 'Save Changes' : 'Save Workout'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={animateClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

          </ScrollView>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  const { colors, SHADOWS } = theme;
  return StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.bgOverlay },
  sheet: {
    backgroundColor: colors.bgSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.primary + '88',
    borderBottomWidth: 0,
    maxHeight: '90%',
    paddingBottom: SPACING.xxxl,
    ...SHADOWS.purple,
  },
  handleArea: { alignItems: 'center', paddingVertical: SPACING.md },
  handleBar: { width: 40, height: 4, backgroundColor: colors.borderDefault, borderRadius: RADIUS.full },

  // Matches the title row in the other log sheets; horizontal padding lives
  // here (not on the sheet) because the scroll content pads itself.
  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.black, color: colors.textPrimary,
  },
  templateStepText: {
    fontSize: FONT_SIZES.xs, color: colors.textMuted, marginTop: 2,
  },
  deleteIconBtn: {
    width: 32, height: 32, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
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
    backgroundColor: colors.bgTertiary,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: colors.borderDefault,
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
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.bgSecondary,
  },

  scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },

  prBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: colors.neonYellow + '18',
    borderWidth: 1, borderColor: colors.neonYellow,
  },
  prBannerText: { color: colors.textPrimary, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold },

  sectionLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.textMuted,
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
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  categoryName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },

  // Exercise chips
  exerciseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  exerciseChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  exerciseChipText: {
    fontSize: FONT_SIZES.sm,
    color: colors.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
  },

  customInput: {
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: colors.textPrimary,
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.lg,
  },

  // Sets
  setsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  addSetBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  addSetText: { color: colors.primary, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold },

  setColHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  setColLabel: {
    fontSize: 10,
    color: colors.textMuted,
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
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNum: {
    color: colors.textMuted,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
  },
  setInput: {
    flex: 1,
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    color: colors.textPrimary,
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
  cancelButton: { padding: SPACING.lg, alignItems: 'center' },
  cancelText: { color: colors.textMuted, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.sm, letterSpacing: 0.5 },
  saveText: {
    color: colors.textInverse,
    fontWeight: FONT_WEIGHTS.black,
    fontSize: FONT_SIZES.lg,
    letterSpacing: 0.5,
  },
  });
}
