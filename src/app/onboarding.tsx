import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import { supabase } from '@/lib/supabase';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS, CARD, BUTTON
} from '@/constants/theme';

const STEP_COUNT = 4;

const GOAL_SUGGESTIONS = ['Build muscle', 'Lose weight', 'Get stronger', 'Improve endurance', 'Stay healthy'];

const TOUR_ITEMS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string; color: string }[] = [
  { icon: 'barbell-outline',  title: 'Log everything',        body: 'Workouts, cardio, meals, water, and weight — all in one place.', color: COLORS.primary },
  { icon: 'trophy-outline',   title: 'Earn XP & rank up',      body: 'Every log earns XP. Climb through ranks as you build consistency.', color: COLORS.neonYellow },
  { icon: 'ribbon-outline',   title: 'Unlock achievements',    body: 'Hit milestones and streaks to unlock badges.', color: COLORS.neonOrange },
  { icon: 'podium-outline',   title: 'Compete on leaderboards', body: 'See how your streak, strength, and cardio stack up against others.', color: COLORS.neonGreen },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, setProfile, refreshProfile } = useProfile();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(profile?.full_name ?? '');
  const [age, setAge] = useState(profile?.age?.toString() ?? '');
  const [goal, setGoal] = useState(profile?.goal ?? '');
  const [units, setUnits] = useState<'metric' | 'imperial'>(profile?.units ?? 'metric');

  // Height/weight state duplicates the conversion logic in
  // src/components/EditProfile.tsx (stored internally as cm/kg, displayed
  // per the units toggle) rather than sharing a hook — this screen only
  // runs once per account, so the duplication is a smaller risk than
  // refactoring an already-working, frequently-used settings screen to
  // share it.
  const [heightCm, setHeightCm] = useState(profile?.height_cm ?? 170);
  const initialTotalIn = profile?.height_cm ? Math.round(profile.height_cm / 2.54) : null;
  const [heightFt, setHeightFt] = useState(initialTotalIn !== null ? Math.floor(initialTotalIn / 12).toString() : '5');
  const [heightIn, setHeightIn] = useState(initialTotalIn !== null ? (initialTotalIn % 12).toString() : '7');
  const [heightCmDisplay, setHeightCmDisplay] = useState(heightCm.toString());

  const [weightKg, setWeightKg] = useState(profile?.weight_kg ?? 70);
  const [weightDisplay, setWeightDisplay] = useState(
    profile?.weight_kg ? (units === 'imperial' ? (profile.weight_kg * 2.2046).toFixed(1) : profile.weight_kg.toString()) : ''
  );

  const handleUnitsChange = (newUnits: 'metric' | 'imperial') => {
    setUnits(newUnits);
    if (newUnits === 'imperial') {
      if (weightKg) setWeightDisplay((weightKg * 2.2046).toFixed(1));
      const totalIn = Math.round(heightCm / 2.54);
      setHeightFt(Math.floor(totalIn / 12).toString());
      setHeightIn((totalIn % 12).toString());
    } else {
      if (weightKg) setWeightDisplay(weightKg.toString());
      setHeightCmDisplay(Math.round(heightCm).toString());
    }
  };

  const handleWeightChange = (val: string) => {
    setWeightDisplay(val);
    const num = parseFloat(val);
    if (!isNaN(num)) setWeightKg(units === 'imperial' ? num * 0.4536 : num);
  };

  const handleHeightFtChange = (ft: string) => {
    setHeightFt(ft);
    const totalIn = (parseInt(ft) || 0) * 12 + (parseInt(heightIn) || 0);
    setHeightCm(totalIn * 2.54);
  };

  const handleHeightInChange = (inches: string) => {
    setHeightIn(inches);
    const totalIn = (parseInt(heightFt) || 0) * 12 + (parseInt(inches) || 0);
    setHeightCm(totalIn * 2.54);
  };

  const handleHeightCmChange = (val: string) => {
    setHeightCmDisplay(val);
    const num = parseFloat(val);
    if (!isNaN(num)) setHeightCm(num);
  };

  const finish = async () => {
    if (!user) return;
    setSaving(true);

    const ageNum = Number(age);
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: name.trim() || profile?.full_name || null,
        age: age && !isNaN(ageNum) && ageNum > 0 && ageNum <= 120 ? Math.round(ageNum) : null,
        height_cm: Math.round(heightCm),
        weight_kg: weightKg,
        goal: goal.trim() || null,
        units,
        onboarding_completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    setSaving(false);
    if (error) { console.error('Failed to save onboarding:', error.message); return; }
    if (data) setProfile(data);
    else await refreshProfile();
    router.replace('/(tabs)/dashboard');
  };

  const next = () => {
    if (step < STEP_COUNT - 1) setStep(step + 1);
    else finish();
  };
  const back = () => { if (step > 0) setStep(step - 1); };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Progress dots + skip */}
        <View style={styles.topRow}>
          <View style={styles.dots}>
            {Array.from({ length: STEP_COUNT }).map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>
          <TouchableOpacity onPress={finish} disabled={saving} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {step === 0 && (
          <View style={styles.stepBlock}>
            <Text style={styles.title}>Welcome to FitnessApp</Text>
            <Text style={styles.subtitle}>
              A quick setup so your dashboard, goals, and gamification start off accurate — takes under a minute.
            </Text>
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepBlock}>
            <Text style={styles.title}>About you</Text>
            <Text style={styles.subtitle}>Used to personalize your calorie/macro targets later — you can change any of this in Settings.</Text>

            <View style={styles.unitsRow}>
              <TouchableOpacity
                style={[styles.unitButton, units === 'metric' && styles.unitButtonActive]}
                onPress={() => handleUnitsChange('metric')}
                activeOpacity={0.7}
              >
                <Text style={[styles.unitButtonText, units === 'metric' && styles.unitButtonTextActive]}>Metric</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitButton, units === 'imperial' && styles.unitButtonActive]}
                onPress={() => handleUnitsChange('imperial')}
                activeOpacity={0.7}
              >
                <Text style={[styles.unitButtonText, units === 'imperial' && styles.unitButtonTextActive]}>Imperial</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={COLORS.textMuted} />

            <Text style={styles.label}>Age</Text>
            <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="25" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />

            <Text style={styles.label}>Height {units === 'imperial' ? '(ft / in)' : '(cm)'}</Text>
            {units === 'imperial' ? (
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1, marginRight: SPACING.sm }]} value={heightFt} onChangeText={handleHeightFtChange} placeholder="5" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
                <TextInput style={[styles.input, { flex: 1 }]} value={heightIn} onChangeText={handleHeightInChange} placeholder="7" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
              </View>
            ) : (
              <TextInput style={styles.input} value={heightCmDisplay} onChangeText={handleHeightCmChange} placeholder="175" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
            )}

            <Text style={styles.label}>Weight ({units === 'imperial' ? 'lbs' : 'kg'})</Text>
            <TextInput style={styles.input} value={weightDisplay} onChangeText={handleWeightChange} placeholder={units === 'imperial' ? '154' : '70'} placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepBlock}>
            <Text style={styles.title}>What's your goal?</Text>
            <Text style={styles.subtitle}>Pick one or write your own.</Text>

            <View style={styles.chipRow}>
              {GOAL_SUGGESTIONS.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.chip, goal === g && styles.chipActive]}
                  onPress={() => setGoal(g)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, goal === g && styles.chipTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Goal</Text>
            <TextInput style={styles.input} value={goal} onChangeText={setGoal} placeholder="e.g. Build muscle" placeholderTextColor={COLORS.textMuted} />
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepBlock}>
            <Text style={styles.title}>Quick tour</Text>
            <Text style={styles.subtitle}>Here's what you can do.</Text>

            <View style={styles.tourCard}>
              {TOUR_ITEMS.map((t, i) => (
                <View key={t.title}>
                  {i > 0 && <View style={styles.tourDivider} />}
                  <View style={styles.tourRow}>
                    <View style={[styles.tourIcon, { borderColor: t.color }]}>
                      <Ionicons name={t.icon} size={18} color={t.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tourTitle}>{t.title}</Text>
                      <Text style={styles.tourBody}>{t.body}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.navRow}>
          {step > 0 ? (
            <TouchableOpacity onPress={back} style={styles.backButton} activeOpacity={0.7} disabled={saving}>
              <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          ) : <View />}

          <TouchableOpacity style={[BUTTON.primary, styles.nextButton]} onPress={next} activeOpacity={0.85} disabled={saving}>
            <Text style={styles.nextButtonText}>
              {saving ? 'Saving…' : step === STEP_COUNT - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  content: { padding: SPACING.lg, paddingTop: SPACING.xxxl, paddingBottom: SPACING.xxxl, flexGrow: 1 },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xl },
  dots: { flexDirection: 'row', gap: SPACING.xs },
  dot: { width: 8, height: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.borderDefault },
  dotActive: { backgroundColor: COLORS.primary, width: 20 },
  skipText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold },

  stepBlock: { flex: 1 },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.black, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: SPACING.xl, lineHeight: 20 },

  unitsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  unitButton: { flex: 1, ...CARD.default, alignItems: 'center', paddingVertical: SPACING.md },
  unitButtonActive: { borderColor: COLORS.primary, ...SHADOWS.purple },
  unitButtonText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textMuted },
  unitButtonTextActive: { color: COLORS.primary },

  label: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, letterSpacing: 1, marginBottom: SPACING.xs, marginTop: SPACING.md },
  input: {
    backgroundColor: COLORS.bgTertiary, borderColor: COLORS.borderDefault, borderWidth: 1,
    borderRadius: RADIUS.sm, padding: SPACING.md, color: COLORS.textPrimary, fontSize: FONT_SIZES.md,
  },
  row: { flexDirection: 'row' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgTertiary, borderWidth: 1, borderColor: COLORS.borderDefault,
  },
  chipActive: { backgroundColor: COLORS.primary + '22', borderColor: COLORS.primary },
  chipText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontWeight: FONT_WEIGHTS.medium },
  chipTextActive: { color: COLORS.primary, fontWeight: FONT_WEIGHTS.bold },

  tourCard: { ...CARD.default, ...SHADOWS.purple, padding: SPACING.sm },
  tourRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm },
  tourDivider: { height: 1, backgroundColor: COLORS.borderDefault },
  tourIcon: { width: 36, height: 36, borderRadius: RADIUS.full, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  tourTitle: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
  tourBody: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 2, lineHeight: 16 },

  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.xl },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: SPACING.sm },
  backButtonText: { color: COLORS.primary, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold },
  nextButton: { paddingHorizontal: SPACING.xxxl, marginLeft: 'auto' },
  nextButtonText: { color: COLORS.textInverse, fontWeight: FONT_WEIGHTS.black, fontSize: FONT_SIZES.md },
});
