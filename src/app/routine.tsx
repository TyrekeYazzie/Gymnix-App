import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import { getWorkoutCategories } from '@/constants/workoutCategories';
import { toDayCategories } from '@/utils/routine';
import { DayOfWeek, WeeklyRoutine } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import {
  FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, Theme
} from '@/constants/theme';

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'monday',    label: 'Monday' },
  { key: 'tuesday',   label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday',  label: 'Thursday' },
  { key: 'friday',    label: 'Friday' },
  { key: 'saturday',  label: 'Saturday' },
  { key: 'sunday',    label: 'Sunday' },
];

const normalizeRoutine = (raw: WeeklyRoutine | null | undefined): WeeklyRoutine => {
  const result: WeeklyRoutine = {};
  DAYS.forEach(({ key }) => { result[key] = toDayCategories(raw?.[key]); });
  return result;
};

export default function Routine() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, setProfile } = useProfile();
  const { theme } = useTheme();
  const { colors } = theme;
  const WORKOUT_CATEGORIES = useMemo(() => getWorkoutCategories(colors), [colors]);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [routine, setRoutine] = useState<WeeklyRoutine>(() => normalizeRoutine(profile?.weekly_routine));
  const [expandedDay, setExpandedDay] = useState<DayOfWeek | null>(null);
  const [savingDay, setSavingDay] = useState<DayOfWeek | null>(null);

  const getCategory = (name: string) => WORKOUT_CATEGORIES.find(c => c.name === name);

  const saveDay = async (day: DayOfWeek, categories: string[]) => {
    if (!user || !profile) return;
    const previous = routine;
    const updated = { ...routine, [day]: categories };
    setRoutine(updated);
    setSavingDay(day);

    const { data, error } = await supabase
      .from('profiles')
      .update({ weekly_routine: updated })
      .eq('id', user.id)
      .select()
      .single();

    setSavingDay(null);
    if (error) {
      setRoutine(previous);
      Alert.alert('Error', 'Could not update your routine');
      return;
    }
    if (data) setProfile(data);
  };

  const toggleCategory = (day: DayOfWeek, categoryName: string) => {
    const current = routine[day] ?? [];
    const updated = current.includes(categoryName)
      ? current.filter(c => c !== categoryName)
      : [...current, categoryName];
    saveDay(day, updated);
  };

  const clearDay = (day: DayOfWeek) => saveDay(day, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButtonRow}>
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.screenTitle}>Weekly Routine</Text>
        <Text style={styles.subtitle}>
          Assign one or more muscle groups to each day (e.g. Chest + Shoulders for a push day). Logging a workout on that day will narrow down to just those groups and pull in your last numbers for each exercise.
        </Text>
        <View style={styles.dividerLine} />

        <View style={styles.card}>
          {DAYS.map((day, i) => {
            const selected = routine[day.key] ?? [];
            const isExpanded = expandedDay === day.key;
            const isSaving = savingDay === day.key;

            const summary = selected.length === 0
              ? 'Rest'
              : selected.length === 1
                ? (
                    <>
                      <Ionicons name={getCategory(selected[0])?.icon ?? 'ellipse-outline'} size={12} color={colors.primary} /> {selected[0]}
                    </>
                  )
                : selected.map((c, i) => (
                    <React.Fragment key={c}>
                      {i > 0 ? ' ' : ''}
                      <Ionicons name={getCategory(c)?.icon ?? 'ellipse-outline'} size={12} color={colors.primary} />
                    </React.Fragment>
                  ));

            return (
              <View key={day.key}>
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => setExpandedDay(isExpanded ? null : day.key)}
                  activeOpacity={0.7}
                  disabled={isSaving}
                >
                  <Text style={styles.dayLabel}>{day.label}</Text>
                  <View style={[styles.pill, selected.length > 0 && styles.pillActive]}>
                    <Text style={[styles.pillText, selected.length > 0 && styles.pillTextActive]}>
                      {summary}
                    </Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.pickerRow}>
                    <TouchableOpacity
                      style={[styles.chip, selected.length === 0 && styles.chipActiveRest]}
                      onPress={() => clearDay(day.key)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, selected.length === 0 && styles.chipTextActive]}>Rest</Text>
                    </TouchableOpacity>
                    {WORKOUT_CATEGORIES.map((c) => {
                      const isOn = selected.includes(c.name);
                      return (
                        <TouchableOpacity
                          key={c.name}
                          style={[styles.chip, isOn && { backgroundColor: c.color, borderColor: c.color }]}
                          onPress={() => toggleCategory(day.key, c.name)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.chipText, isOn && styles.chipTextActive]}>
                            <Ionicons name={c.icon} size={12} color={isOn ? colors.textInverse : colors.textSecondary} /> {c.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {i < DAYS.length - 1 && <View style={styles.rowDivider} />}
              </View>
            );
          })}
        </View>

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
  card: {
    ...CARD.default,
    ...SHADOWS.purple,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  dayLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  pill: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.bgTertiary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    maxWidth: 170,
  },
  pillActive: {
    backgroundColor: colors.primaryGlow,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  pillTextActive: {
    color: colors.primary,
  },
  rowDivider: { height: 1, backgroundColor: colors.borderDefault },

  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  chipActiveRest: {
    backgroundColor: colors.textMuted,
    borderColor: colors.textMuted,
  },
  chipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.textInverse,
  },
  });
}
