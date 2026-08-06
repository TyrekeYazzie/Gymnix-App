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
import { computeNutritionTargets } from '@/lib/nutrition';
import { Sex, WeightGoalType, GoalPace, ActivityLevel, Profile } from '@/types';
import {
  ACTIVITY_LEVELS, GOAL_PACES, WEIGHT_GOAL_LABELS,
} from '@/constants/nutrition';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS, CARD
} from '@/constants/theme';

const WEIGHT_GOALS: { value: WeightGoalType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'lose',     label: 'Lose',     icon: 'trending-down-outline' },
  { value: 'maintain', label: 'Maintain', icon: 'remove-outline' },
  { value: 'gain',     label: 'Gain',     icon: 'trending-up-outline' },
];

export default function NutritionGoals() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, setProfile, isImperial } = useProfile();

  const [sex, setSex] = useState<Sex | null>(profile?.sex ?? null);
  const [goalType, setGoalType] = useState<WeightGoalType>(profile?.weight_goal_type ?? 'maintain');
  const [pace, setPace] = useState<GoalPace>(profile?.goal_pace ?? 'moderate');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    (ACTIVITY_LEVELS.find(a => a.value === profile?.activity_level)?.value ?? 'moderate') as ActivityLevel
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasBodyStats = !!(profile?.weight_kg && profile?.height_cm && profile?.age);

  // Live preview — recalculated from the in-progress selections so the
  // numbers below update before the user hits Save.
  const draftProfile: Profile | null = profile
    ? { ...profile, sex, weight_goal_type: goalType, goal_pace: pace, activity_level: activityLevel }
    : null;
  const targets = useMemo(() => computeNutritionTargets(draftProfile), [
    profile, sex, goalType, pace, activityLevel,
  ]);

  const paceLabel = (lbPerWeek: number) => {
    if (isImperial) return `~${lbPerWeek} lb/week`;
    const kg = lbPerWeek * 0.4536;
    return `~${kg.toFixed(kg < 1 ? 2 : 1)} kg/week`;
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('profiles')
      .update({
        sex,
        weight_goal_type: goalType,
        goal_pace: pace,
        activity_level: activityLevel,
      })
      .eq('id', user.id)
      .select()
      .single();
    setSaving(false);
    if (error) { Alert.alert('Error', `Could not save your nutrition goals: ${error.message}`); return; }
    if (data) {
      setProfile(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButtonRow}>
            <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.screenTitle}>Nutrition Goals</Text>
        <Text style={styles.subtitle}>
          These settings drive the calorie and macro targets on your Calories tab. They don't change what
          you log — your logs always just track what you actually ate.
        </Text>
        <View style={styles.dividerLine} />

        {!hasBodyStats && (
          <TouchableOpacity
            style={styles.warningCard}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>Add your body stats</Text>
              <Text style={styles.warningText}>
                Height, weight, and age are needed to calculate real numbers. Tap to edit your profile.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.accent} />
          </TouchableOpacity>
        )}

        {/* Weight goal */}
        <Text style={styles.sectionTitle}>Weight goal</Text>
        <View style={styles.segmentRow}>
          {WEIGHT_GOALS.map((g) => (
            <TouchableOpacity
              key={g.value}
              style={[styles.segmentButton, goalType === g.value && styles.segmentButtonActive]}
              onPress={() => setGoalType(g.value)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={g.icon}
                size={18}
                color={goalType === g.value ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.segmentText, goalType === g.value && styles.segmentTextActive]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pace — only meaningful once there's a direction to move in */}
        {goalType !== 'maintain' && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>Pace</Text>
            <View style={styles.card}>
              {GOAL_PACES.map((p, i) => (
                <React.Fragment key={p.value}>
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => setPace(p.value)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowLabel}>{p.label}</Text>
                      <Text style={styles.rowSubtext}>
                        {paceLabel(p.lbPerWeek)} · {p.deltaKcal} kcal/day {goalType === 'lose' ? 'deficit' : 'surplus'}
                      </Text>
                    </View>
                    <View style={[styles.radio, pace === p.value && styles.radioActive]}>
                      {pace === p.value && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                  {i < GOAL_PACES.length - 1 && <View style={styles.rowDivider} />}
                </React.Fragment>
              ))}
            </View>
          </>
        )}

        {/* Activity level */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>Activity level</Text>
        <View style={styles.card}>
          {ACTIVITY_LEVELS.map((a, i) => (
            <React.Fragment key={a.value}>
              <TouchableOpacity
                style={styles.row}
                onPress={() => setActivityLevel(a.value)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{a.label}</Text>
                  <Text style={styles.rowSubtext}>{a.description}</Text>
                </View>
                <View style={[styles.radio, activityLevel === a.value && styles.radioActive]}>
                  {activityLevel === a.value && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
              {i < ACTIVITY_LEVELS.length - 1 && <View style={styles.rowDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Sex — optional, used only for the BMR formula */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>Sex</Text>
        <Text style={styles.hint}>
          Used only to calculate your calorie needs (Mifflin-St Jeor formula). Skip it to use a
          sex-neutral average instead.
        </Text>
        <View style={styles.segmentRow}>
          {(['male', 'female'] as Sex[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.segmentButton, sex === s && styles.segmentButtonActive]}
              onPress={() => setSex(s)}
              activeOpacity={0.75}
            >
              <Text style={[styles.segmentText, sex === s && styles.segmentTextActive]}>
                {s === 'male' ? 'Male' : 'Female'}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.segmentButton, sex === null && styles.segmentButtonActive]}
            onPress={() => setSex(null)}
            activeOpacity={0.75}
          >
            <Text style={[styles.segmentText, sex === null && styles.segmentTextActive]}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Live preview */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>Your targets</Text>
        {targets ? (
          <View style={[styles.card, styles.previewCard]}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewGoalLabel}>{WEIGHT_GOAL_LABELS[goalType]}</Text>
              <Text style={styles.previewCalories}>{targets.calorieGoal.toLocaleString()} kcal/day</Text>
            </View>
            <View style={styles.previewMetaRow}>
              <Text style={styles.previewMeta}>BMR {targets.bmr.toLocaleString()}</Text>
              <Text style={styles.previewMeta}>TDEE {targets.tdee.toLocaleString()}</Text>
              <Text style={styles.previewMeta}>
                {targets.deltaKcal === 0 ? 'No adjustment' : `${targets.deltaKcal > 0 ? '+' : ''}${targets.deltaKcal} kcal`}
              </Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.macroPreviewRow}>
              <View style={styles.macroPreviewBox}>
                <Text style={[styles.macroPreviewValue, { color: COLORS.neonBlue }]}>{targets.proteinG}g</Text>
                <Text style={styles.macroPreviewLabel}>Protein</Text>
              </View>
              <View style={styles.macroPreviewBox}>
                <Text style={[styles.macroPreviewValue, { color: COLORS.neonYellow }]}>{targets.carbsG}g</Text>
                <Text style={styles.macroPreviewLabel}>Carbs</Text>
              </View>
              <View style={styles.macroPreviewBox}>
                <Text style={[styles.macroPreviewValue, { color: COLORS.accent }]}>{targets.fatG}g</Text>
                <Text style={styles.macroPreviewLabel}>Fat</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.card, styles.previewCard]}>
            <Text style={styles.rowSubtext}>
              Add your height, weight, and age to see your personalized numbers.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, saved && styles.saveButtonSaved, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={saving}
        >
          <Text style={[styles.saveText, saved && { color: COLORS.neonGreen }]}>
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  header: { marginBottom: SPACING.sm },
  backButtonRow: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  backButton: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 1,
  },
  screenTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  dividerLine: {
    height: 1,
    backgroundColor: COLORS.primary,
    width: 40,
    marginBottom: SPACING.xl,
  },

  warningCard: {
    ...CARD.danger,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  warningTitle: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: 2,
  },
  warningText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
  },

  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  hint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    lineHeight: 16,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
  },

  segmentRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  segmentButton: {
    flex: 1,
    ...CARD.default,
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING.md,
  },
  segmentButtonActive: {
    borderColor: COLORS.primary,
    ...SHADOWS.purple,
  },
  segmentText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  segmentTextActive: {
    color: COLORS.primary,
  },

  card: {
    ...CARD.default,
    ...SHADOWS.purple,
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  rowLabel: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  rowSubtext: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: COLORS.borderDefault,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },

  previewCard: { gap: SPACING.md },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewGoalLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.bold,
  },
  previewCalories: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHTS.black,
  },
  previewMetaRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  previewMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  macroPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroPreviewBox: { alignItems: 'center', flex: 1 },
  macroPreviewValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.black,
    marginBottom: 2,
  },
  macroPreviewLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },

  saveButton: {
    backgroundColor: 'transparent',
    borderColor: COLORS.primary,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  saveButtonSaved: { borderColor: COLORS.neonGreen },
  saveText: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: FONT_SIZES.md,
    letterSpacing: 0.5,
  },
});
