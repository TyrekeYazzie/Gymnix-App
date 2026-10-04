import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getWorkoutCategories } from '@/constants/workoutCategories';
import { WorkoutTemplate } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import {
  FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, Theme
} from '@/constants/theme';

export default function Templates() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { colors } = theme;
  const WORKOUT_CATEGORIES = useMemo(() => getWorkoutCategories(colors), [colors]);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const refreshControl = usePullToRefresh(() => loadTemplates());
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // A plain mount-only effect left this list stale after creating/editing/
  // deleting in /template-editor and coming back — the Stack keeps this
  // screen mounted underneath rather than remounting it, so nothing re-fetched.
  // Tapping a card that had since been deleted elsewhere then failed with
  // "Could not load that template." useFocusEffect re-syncs every time this
  // screen regains focus, including the very first time (no separate mount
  // effect needed).
  useFocusEffect(
    useCallback(() => { loadTemplates(); }, [user])
  );

  const loadTemplates = async () => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('workout_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    setLoading(false);
    if (error) { console.error('Failed to load workout templates:', error.message); return; }
    if (data) setTemplates(data);
  };

  const getCategory = (name: string) => WORKOUT_CATEGORIES.find(c => c.name === name);

  const categoriesInTemplate = (t: WorkoutTemplate) =>
    Array.from(new Set(t.exercises.map(ex => ex.category)));

  const handleDelete = (template: WorkoutTemplate) => {
    Alert.alert(
      'Delete Template',
      `Remove "${template.name}"? This won't affect workouts you've already logged.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(template.id);
            const { error } = await supabase.from('workout_templates').delete().eq('id', template.id);
            setDeletingId(null);
            if (error) { Alert.alert('Error', error.message); return; }
            setTemplates(prev => prev.filter(t => t.id !== template.id));
          },
        },
      ]
    );
  };

  // Hands off to the Workouts tab, which owns the WorkoutLog sheet and
  // walks the user through this template's exercises one at a time — see
  // the startTemplateId handling in src/app/(tabs)/workouts.tsx.
  const handleStart = (template: WorkoutTemplate) => {
    router.push({ pathname: '/(tabs)/workouts', params: { startTemplateId: template.id } });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButtonRow}>
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.screenTitle}>Workout Templates</Text>
            <Text style={styles.subtitle}>
              Build a reusable exercise list once, then start it to breeze through logging next time.
            </Text>
          </View>
        </View>
        <View style={styles.dividerLine} />

        <TouchableOpacity
          style={styles.newButton}
          onPress={() => router.push('/template-editor')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color={colors.textInverse} />
          <Text style={styles.newButtonText}>New Template</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: SPACING.xl }} />
        ) : templates.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>
              No templates yet. Build one above and it'll show up here ready to start.
            </Text>
          </View>
        ) : (
          templates.map((t) => (
            <View key={t.id} style={styles.card}>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/template-editor', params: { id: t.id } })}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.templateName}>{t.name}</Text>
                    <Text style={styles.templateMeta}>
                      {t.exercises.length} exercise{t.exercises.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDelete(t)}
                    disabled={deletingId === t.id}
                    style={styles.deleteButton}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${t.name}`}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.accent} />
                  </TouchableOpacity>
                </View>

                <View style={styles.categoryRow}>
                  {categoriesInTemplate(t).map((cat) => {
                    const c = getCategory(cat);
                    return (
                      <View key={cat} style={[styles.categoryPill, { borderColor: c?.color ?? colors.borderDefault }]}>
                        <Ionicons name={c?.icon ?? 'ellipse-outline'} size={12} color={c?.color ?? colors.textMuted} />
                        <Text style={[styles.categoryPillText, { color: c?.color ?? colors.textMuted }]}>{cat}</Text>
                      </View>
                    );
                  })}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.startButton}
                onPress={() => handleStart(t)}
                activeOpacity={0.85}
              >
                <Ionicons name="play" size={14} color={colors.textInverse} />
                <Text style={styles.startButtonText}>Start</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, CARD, SHADOWS } = theme;
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  header: { marginBottom: SPACING.sm },
  backButtonRow: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  backButton: {
    color: colors.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 1,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  screenTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.black,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: colors.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  dividerLine: {
    height: 1,
    backgroundColor: colors.primary,
    width: 40,
    marginBottom: SPACING.xl,
  },
  newButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
    backgroundColor: colors.primary, borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  newButtonText: {
    color: colors.textInverse, fontWeight: FONT_WEIGHTS.black, fontSize: FONT_SIZES.md, letterSpacing: 0.5,
  },
  card: {
    ...CARD.default,
    ...SHADOWS.purple,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm, color: colors.textMuted, lineHeight: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  templateName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  templateMeta: {
    fontSize: FONT_SIZES.xs,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  deleteButton: {
    width: 32, height: 32, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
  },
  categoryPillText: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold },
  startButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: RADIUS.sm, paddingVertical: SPACING.sm,
  },
  startButtonText: {
    color: colors.textInverse, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.sm, letterSpacing: 0.5,
  },
  });
}
