import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { WORKOUT_CATEGORIES } from '@/constants/workoutCategories';
import { COMMON_EXERCISES } from '@/constants/exercises';
import { TemplateExercise } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import {
  FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, Theme
} from '@/constants/theme';

export default function TemplateEditor() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);

  // Draft "add exercise" sub-form
  const [exCategory, setExCategory] = useState('CHEST');
  const [exName, setExName] = useState('');
  const [exCustomName, setExCustomName] = useState('');
  const [exSets, setExSets] = useState(3);
  const [exReps, setExReps] = useState(10);

  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      setLoading(false);
      if (error || !data) {
        Alert.alert('Error', 'Could not load that template.');
        router.back();
        return;
      }
      setName(data.name);
      setExercises(data.exercises ?? []);
    })();
  }, [id]);

  const activeCat = WORKOUT_CATEGORIES.find(c => c.name === exCategory)!;

  const handleCategoryChange = (cat: string) => {
    setExCategory(cat);
    setExName('');
    setExCustomName('');
  };

  const handleAddExercise = () => {
    const finalName = exCustomName.trim() || exName;
    if (!finalName) { Alert.alert('Missing Exercise', 'Tap an exercise or type a custom name.'); return; }
    setExercises(prev => [...prev, { name: finalName, category: exCategory, targetSets: exSets, targetReps: exReps }]);
    setExName('');
    setExCustomName('');
  };

  const removeExercise = (index: number) => setExercises(prev => prev.filter((_, i) => i !== index));

  const moveExercise = (index: number, dir: -1 | 1) => {
    setExercises(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) { Alert.alert('Missing Name', 'Give your template a name.'); return; }
    if (exercises.length === 0) { Alert.alert('No Exercises', 'Add at least one exercise below.'); return; }
    if (!user) return;

    setSaving(true);
    const { error } = isEditing
      ? await supabase.from('workout_templates').update({ name: trimmedName, exercises }).eq('id', id)
      : await supabase.from('workout_templates').insert({ user_id: user.id, name: trimmedName, exercises });
    setSaving(false);

    if (error) { Alert.alert('Error', error.message); return; }
    router.back();
  };

  const handleDeleteTemplate = () => {
    Alert.alert(
      'Delete Template',
      `Remove "${name}"? This won't affect workouts you've already logged.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const { error } = await supabase.from('workout_templates').delete().eq('id', id);
            setDeleting(false);
            if (error) { Alert.alert('Error', error.message); return; }
            router.back();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: SPACING.xxxl }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButtonRow}>
              <Ionicons name="chevron-back" size={18} color={colors.primary} />
              <Text style={styles.backButton}>Back</Text>
            </TouchableOpacity>
            {isEditing && (
              <TouchableOpacity
                onPress={handleDeleteTemplate}
                disabled={deleting}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Delete template"
              >
                <Ionicons name="trash-outline" size={18} color={colors.accent} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.screenTitle}>{isEditing ? 'Edit Template' : 'New Template'}</Text>
          <View style={styles.dividerLine} />

          <Text style={styles.label}>Template name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Push Day A"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          {/* Draft exercise list */}
          <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Exercises</Text>
          {exercises.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>No exercises added yet — build the list below.</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {exercises.map((ex, i) => {
                const cat = WORKOUT_CATEGORIES.find(c => c.name === ex.category);
                return (
                  <View key={`${ex.name}-${i}`}>
                    <View style={styles.exerciseRow}>
                      <View style={[styles.exerciseIcon, { borderColor: cat?.color ?? colors.borderDefault }]}>
                        <Ionicons name={cat?.icon ?? 'barbell-outline'} size={16} color={cat?.color ?? colors.textMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.exerciseName}>{ex.name}</Text>
                        <Text style={styles.exerciseMeta}>{ex.targetSets} sets × {ex.targetReps} reps</Text>
                      </View>
                      <View style={styles.reorderCol}>
                        <TouchableOpacity
                          onPress={() => moveExercise(i, -1)}
                          disabled={i === 0}
                          hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
                          accessibilityRole="button"
                          accessibilityLabel={`Move ${ex.name} up`}
                        >
                          <Ionicons name="chevron-up" size={16} color={i === 0 ? colors.borderDefault : colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => moveExercise(i, 1)}
                          disabled={i === exercises.length - 1}
                          hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
                          accessibilityRole="button"
                          accessibilityLabel={`Move ${ex.name} down`}
                        >
                          <Ionicons name="chevron-down" size={16} color={i === exercises.length - 1 ? colors.borderDefault : colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        onPress={() => removeExercise(i)}
                        style={styles.removeExerciseBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${ex.name}`}
                      >
                        <Ionicons name="close" size={16} color={colors.accent} />
                      </TouchableOpacity>
                    </View>
                    {i < exercises.length - 1 && <View style={styles.rowDivider} />}
                  </View>
                );
              })}
            </View>
          )}

          {/* Add-exercise builder */}
          <Text style={styles.sectionTitle}>Add an exercise</Text>
          <View style={styles.card}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              <View style={styles.categoryRow}>
                {WORKOUT_CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.name}
                    style={[
                      styles.categoryPill,
                      exCategory === c.name && { backgroundColor: c.color, borderColor: c.color },
                    ]}
                    onPress={() => handleCategoryChange(c.name)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={c.icon} size={14} color={exCategory === c.name ? colors.textInverse : c.color} />
                    <Text style={[styles.categoryName, exCategory === c.name && { color: colors.textInverse }]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.exerciseGrid}>
              {(COMMON_EXERCISES[exCategory] ?? []).map((ex) => {
                const isSelected = exName === ex && !exCustomName.trim();
                return (
                  <TouchableOpacity
                    key={ex}
                    style={[styles.exerciseChip, isSelected && { backgroundColor: activeCat.color + '22', borderColor: activeCat.color }]}
                    onPress={() => { setExName(ex); setExCustomName(''); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.exerciseChipText, isSelected && { color: activeCat.color, fontWeight: FONT_WEIGHTS.bold }]}>
                      {ex}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.input}
              value={exCustomName}
              onChangeText={setExCustomName}
              placeholder="Or type a custom exercise name…"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.stepperGrid}>
              <View style={styles.stepperCol}>
                <Text style={styles.label}>Target sets</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    onPress={() => setExSets(s => Math.max(1, s - 1))}
                    style={styles.stepperBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease target sets"
                  >
                    <Text style={styles.stepperBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{exSets}</Text>
                  <TouchableOpacity
                    onPress={() => setExSets(s => Math.min(10, s + 1))}
                    style={styles.stepperBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Increase target sets"
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.stepperCol}>
                <Text style={styles.label}>Target reps</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    onPress={() => setExReps(r => Math.max(1, r - 1))}
                    style={styles.stepperBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease target reps"
                  >
                    <Text style={styles.stepperBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{exReps}</Text>
                  <TouchableOpacity
                    onPress={() => setExReps(r => Math.min(100, r + 1))}
                    style={styles.stepperBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Increase target reps"
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.addExerciseButton} onPress={handleAddExercise} activeOpacity={0.8}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.addExerciseButtonText}>Add to Template</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Save Template'}</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, CARD, SHADOWS } = theme;
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  backButtonRow: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  backButton: {
    color: colors.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 1,
  },
  screenTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.black,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  dividerLine: {
    height: 1,
    backgroundColor: colors.primary,
    width: 40,
    marginBottom: SPACING.xl,
  },
  label: {
    fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, color: colors.textMuted,
    letterSpacing: 1.5, marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: colors.bgTertiary, borderColor: colors.borderDefault, borderWidth: 1,
    borderRadius: RADIUS.sm, padding: SPACING.md, color: colors.textPrimary,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  card: {
    ...CARD.default,
    ...SHADOWS.purple,
    marginBottom: SPACING.lg,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm, color: colors.textMuted, lineHeight: 18,
  },

  exerciseRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm,
  },
  exerciseIcon: {
    width: 32, height: 32, borderRadius: RADIUS.full, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  exerciseName: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: colors.textPrimary },
  exerciseMeta: { fontSize: FONT_SIZES.xs, color: colors.textMuted, marginTop: 2 },
  reorderCol: { alignItems: 'center', gap: 2 },
  removeExerciseBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  rowDivider: { height: 1, backgroundColor: colors.borderDefault },

  categoryRow: { flexDirection: 'row', gap: SPACING.sm, paddingBottom: 4 },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full,
    backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.borderDefault,
  },
  categoryName: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, color: colors.textSecondary, letterSpacing: 0.5 },

  exerciseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  exerciseChip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.full,
    backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.borderDefault,
  },
  exerciseChipText: { fontSize: FONT_SIZES.sm, color: colors.textSecondary, fontWeight: FONT_WEIGHTS.medium },

  stepperGrid: { flexDirection: 'row', gap: SPACING.lg, marginBottom: SPACING.lg },
  stepperCol: { flex: 1 },
  stepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.borderDefault,
    borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm,
  },
  stepperBtn: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepperBtnText: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: colors.primary },
  stepperValue: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: colors.textPrimary },

  addExerciseButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.primary, borderRadius: RADIUS.sm, paddingVertical: SPACING.sm,
  },
  addExerciseButtonText: { color: colors.primary, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.sm },

  saveButton: {
    backgroundColor: colors.primary, borderRadius: RADIUS.md, paddingVertical: 16, alignItems: 'center',
  },
  saveButtonText: {
    color: colors.textInverse, fontWeight: FONT_WEIGHTS.black, fontSize: FONT_SIZES.lg, letterSpacing: 0.5,
  },
  });
}
