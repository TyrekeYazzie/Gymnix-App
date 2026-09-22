import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, Alert, Dimensions,
  KeyboardAvoidingView, Platform, Animated, PanResponder
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import { awardXP, calcCardioXP } from '@/lib/xp';
import { checkAndUnlockAchievements } from '@/lib/achievements';
import AchievementUnlockBanner from '@/components/AchievementUnlockBanner';
import { UnlockedAchievement } from '@/types';
import Stepper from '@/components/Stepper';
import { estimateCardioCalories } from '@/lib/cardioCalories';
import { useTheme } from '@/context/ThemeContext';
import {
  FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, Theme, Colors
} from '@/constants/theme';

// Exported (rather than a plain array) so calendar.tsx — which looks up
// cardio type icon/color for its day-detail rows — can build the same
// theme-aware list from its own useTheme() colors instead of importing a
// palette baked to one theme.
export function getCardioTypes(colors: Colors): { name: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] {
  return [
    { name: 'Run',   icon: 'speedometer-outline', color: colors.neonGreen },
    { name: 'Bike',  icon: 'bicycle-outline',     color: colors.neonBlue },
    { name: 'Swim',  icon: 'water-outline',       color: colors.primary },
    { name: 'Walk',  icon: 'walk-outline',        color: colors.neonYellow },
    { name: 'HIIT',  icon: 'flash-outline',       color: colors.accent },
    { name: 'Row',   icon: 'boat-outline',        color: colors.neonOrange },
  ];
}

const DURATION_MIN = 0;
const DURATION_MAX = 120;

// slide the sheet fully past the bottom edge regardless of device height or sheet content length
const SLIDE_DISTANCE = Dimensions.get('window').height + 100;

// Minimal shape needed to edit an existing cardio_logs row — mirrors the
// local interface progress.tsx already queries (no user_id needed since
// updates/deletes are scoped by RLS via auth.uid(), not a client-sent id).
export interface CardioEntry {
  id: string;
  type: string;
  distance_km: number | null;
  duration: string | null;
  calories: number | null;
  created_at: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (log: any) => void;
  /** When set, the sheet edits this session in place instead of logging a new one. */
  editEntry?: CardioEntry | null;
  onDeleted?: (id: string) => void;
}

export const KM_TO_MI = 0.621371;

export default function CardioLog({ visible, onClose, onSaved, editEntry, onDeleted }: Props) {
  const { user } = useAuth();
  const { profile, isImperial, refreshProfile } = useProfile();
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const CARDIO_TYPES = useMemo(() => getCardioTypes(colors), [colors]);
  const [type, setType] = useState('');
  // captured in whichever unit is currently displayed (mi or km) — both
  // start at 0 (not a guessed default) so a new log opens ready to type.
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [calories, setCalories] = useState(0);
  // Once true, `calories` is a manual override and stops auto-recomputing
  // from type/distance/duration — set whenever the user directly edits it
  // (via the Stepper) or when opening an existing entry (its saved value
  // should be respected as-is, not silently replaced by a fresh estimate).
  const [caloriesOverridden, setCaloriesOverridden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [deleting, setDeleting] = useState(false);
  const isEditing = !!editEntry;

  const slideAnim = useRef(new Animated.Value(SLIDE_DISTANCE)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const unlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (unlockTimeoutRef.current) clearTimeout(unlockTimeoutRef.current); };
  }, []);

  const distanceUnit = isImperial ? 'mi' : 'km';
  const distanceMax = isImperial ? 26.9 : 42.9;
  const displayDistance = distance;
  // always stored to the database as km
  const distanceKm = isImperial ? displayDistance / KM_TO_MI : displayDistance;

  // Live-recomputes the calorie estimate as type/distance/duration change,
  // unless the user has taken manual control via the Stepper (see
  // caloriesOverridden above) — mirrors the auto-recomputing pace box
  // below, just with an escape hatch since calories can't be derived with
  // full confidence the way pace can.
  useEffect(() => {
    if (caloriesOverridden) return;
    setCalories(estimateCardioCalories(type, distanceKm, duration, profile?.weight_kg));
  }, [type, distanceKm, duration, profile?.weight_kg, caloriesOverridden]);

  const pace = type === 'Swim'
    ? `${Math.floor(duration / distanceKm)}:${String(Math.round(((duration / distanceKm) % 1) * 60)).padStart(2, '0')} /100m`
    : `${Math.floor(duration / displayDistance)}:${String(Math.round(((duration / displayDistance) % 1) * 60)).padStart(2, '0')} /${isImperial ? 'mi' : 'km'}`;

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
      if (editEntry) {
        setType(editEntry.type);
        setDuration(parseInt(editEntry.duration ?? '30', 10) || 30);
        setCalories(editEntry.calories ?? 0);
        setCaloriesOverridden(true); // respect the saved value, don't silently re-estimate over it
        const distKm = editEntry.distance_km ?? 0;
        const disp = isImperial ? distKm * KM_TO_MI : distKm;
        setDistance(Math.min(Math.max(Math.round(disp * 10) / 10, 0), distanceMax));
      } else {
        reset();
      }
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
  }, [visible, editEntry]);

  const reset = () => {
    setType('');
    setDistance(0);
    setDuration(0);
    setCaloriesOverridden(false);
    setUnlockedAchievements([]);
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

  const handleSave = async () => {
    if (!type) {
      Alert.alert('Missing Info', 'Please select a cardio type');
      return;
    }
    // Duration now starts at 0 (see reset()), so this is the one thing
    // every cardio type genuinely needs before a session means anything —
    // unlike distance, which HIIT legitimately has none of.
    if (duration <= 0) {
      Alert.alert('Missing Info', 'Please enter a duration');
      return;
    }
    if (!user) return;
    setSaving(true);

    if (isEditing && editEntry) {
      const { data, error } = await supabase
        .from('cardio_logs')
        .update({ type, distance_km: distanceKm, duration: `${duration} min`, calories })
        .eq('id', editEntry.id)
        .select()
        .single();

      setSaving(false);
      if (error) { Alert.alert('Error', error.message); return; }
      if (data) {
        // Cardio XP depends on duration, so an edit can change how much was
        // earned — reconcile with just the delta instead of a flat award.
        const oldDuration = parseInt(editEntry.duration ?? '0', 10) || 0;
        const delta = calcCardioXP(duration) - calcCardioXP(oldDuration);
        if (delta !== 0) await awardXP(user.id, delta);
        await refreshProfile();
        onSaved(data); reset(); onClose();
      }
      return;
    }

    const { data, error } = await supabase
      .from('cardio_logs')
      .insert({
        user_id: user.id,
        type,
        distance_km: distanceKm,
        duration: `${duration} min`,
        calories,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.log('Cardio save error:', JSON.stringify(error));
      Alert.alert('Error', error.message);
      return;
    }

    if (data) {
      const xp = calcCardioXP(duration);
      await awardXP(user.id, xp);
      await refreshProfile();

      // Achievement check is new-logs-only, matching the same reasoning as
      // WorkoutLog's PR check — see supabase/migrations/20260815010000_achievements.sql.
      const newlyUnlocked = await checkAndUnlockAchievements();
      if (newlyUnlocked.length > 0) {
        setUnlockedAchievements(newlyUnlocked);
        setSaving(true);
        unlockTimeoutRef.current = setTimeout(() => {
          setSaving(false);
          onSaved(data); reset(); onClose();
        }, 1400);
        return;
      }

      onSaved(data); reset(); onClose();
    }
  };

  const handleDelete = () => {
    if (!editEntry) return;
    Alert.alert(
      'Delete Cardio',
      `Remove this ${editEntry.type} session from your log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setDeleting(true);
            const { error } = await supabase.from('cardio_logs').delete().eq('id', editEntry.id);
            if (error) { setDeleting(false); Alert.alert('Error', error.message); return; }
            const oldDuration = parseInt(editEntry.duration ?? '0', 10) || 0;
            const xp = calcCardioXP(oldDuration);
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
          {/* Drag handle + title — swipe down anywhere here to close */}
          <View {...panResponder.panHandlers}>
            <View style={styles.handleArea}>
              <View style={styles.handleBar} />
            </View>
            <View style={[styles.titleRow, { justifyContent: isEditing ? 'space-between' : 'center' }]}>
              <Text style={[styles.title, { marginBottom: 0 }]}>{isEditing ? 'Edit Cardio' : 'Log Cardio'}</Text>
              {isEditing && (
                <TouchableOpacity
                  onPress={handleDelete}
                  activeOpacity={0.7}
                  disabled={deleting}
                  style={styles.deleteIconBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Delete cardio session"
                >
                  <Ionicons name="trash-outline" size={18} color={colors.accent} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <AchievementUnlockBanner achievements={unlockedAchievements} />

          <View {...bodyPanResponder.panHandlers}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={(e) => { scrollOffsetY.current = e.nativeEvent.contentOffset.y; }}
            scrollEventThrottle={16}
          >

            {/* Type selector */}
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeGrid}>
              {CARDIO_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.name}
                  style={[
                    styles.typeCard,
                    type === t.name && { borderColor: t.color, backgroundColor: t.color + '22' }
                  ]}
                  onPress={() => setType(t.name)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={t.icon}
                    size={22}
                    color={type === t.name ? t.color : colors.textSecondary}
                    style={styles.typeIcon}
                  />
                  <Text style={[styles.typeName, type === t.name && { color: t.color }]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Distance + Duration steppers */}
            <Text style={styles.label}>Distance</Text>
            <Stepper
              value={distance}
              onChange={setDistance}
              min={0}
              max={distanceMax}
              step={0.1}
              decimals={1}
              suffix={distanceUnit}
              accentColor={colors.neonGreen}
              width={220}
            />

            <Text style={[styles.label, { marginTop: SPACING.lg }]}>Duration</Text>
            <Stepper
              value={duration}
              onChange={setDuration}
              min={DURATION_MIN}
              max={DURATION_MAX}
              step={1}
              suffix="min"
              accentColor={colors.primary}
              width={220}
            />

            {/* Auto pace */}
            {displayDistance > 0 && duration > 0 && (
              <View style={styles.paceBox}>
                <Text style={styles.paceLabel}>Average pace</Text>
                <Text style={styles.paceValue}>{pace}</Text>
              </View>
            )}

            {/* Calories — live-estimated from type/distance/duration/body
                weight (see lib/cardioCalories.ts), editable via the same
                tap-to-type Stepper pattern; editing it switches to a manual
                override until "Reset to estimate" is tapped. */}
            <View style={[styles.calorieLabelRow, { marginTop: SPACING.lg }]}>
              <Text style={styles.label}>{caloriesOverridden ? 'Calories' : 'Estimated calories'}</Text>
              {caloriesOverridden && (
                <TouchableOpacity onPress={() => setCaloriesOverridden(false)} activeOpacity={0.7}>
                  <Text style={styles.resetEstimateText}>Reset to estimate</Text>
                </TouchableOpacity>
              )}
            </View>
            <Stepper
              value={calories}
              onChange={(v) => { setCalories(v); setCaloriesOverridden(true); }}
              min={0}
              max={4000}
              step={10}
              suffix="kcal"
              accentColor={colors.accent}
              width={220}
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={saving}
            >
              <Text style={styles.saveText}>{saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Save Cardio'}</Text>
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
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: colors.neonGreen + '88',
    borderBottomWidth: 0,
    maxHeight: '85%',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    ...SHADOWS.green,
  },
  handleArea: { alignItems: 'center', paddingVertical: SPACING.md },
  handleBar: { width: 40, height: 4, backgroundColor: colors.borderDefault, borderRadius: RADIUS.full },
  title: {
    fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.black,
    letterSpacing: 0.5, marginBottom: SPACING.lg, textAlign: 'center',
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  deleteIconBtn: {
    width: 32, height: 32, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    fontSize: FONT_SIZES.xs, color: colors.textMuted,
  },
  typeGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: SPACING.sm, marginBottom: SPACING.lg,
  },
  typeCard: {
    width: '30.6%', backgroundColor: colors.bgTertiary,
    borderColor: colors.borderDefault, borderWidth: 1,
    borderRadius: RADIUS.md, alignItems: 'center', paddingVertical: SPACING.md,
  },
  typeIcon: { marginBottom: 4 },
  typeName: {
    fontSize: FONT_SIZES.xs, color: colors.textSecondary,
  },
  calorieLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  resetEstimateText: {
    fontSize: FONT_SIZES.xs, color: colors.primary, fontWeight: FONT_WEIGHTS.bold,
  },
  paceBox: {
    backgroundColor: colors.bgTertiary, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', marginVertical: SPACING.md,
    borderWidth: 1, borderColor: colors.borderDefault,
  },
  paceLabel: {
    fontSize: FONT_SIZES.xs, color: colors.textMuted,
  },
  paceValue: {
    fontSize: FONT_SIZES.xl, color: colors.neonGreen,
  },
  saveButton: {
    backgroundColor: colors.neonGreen + 'dd', borderRadius: RADIUS.md,
    padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.sm,
    ...SHADOWS.green,
  },
  saveText: {
    color: colors.bgPrimary, fontWeight: FONT_WEIGHTS.bold,
  },
  cancelButton: { padding: SPACING.lg, alignItems: 'center' },
  cancelText: {
    color: colors.textMuted, fontSize: FONT_SIZES.sm,
  },
  });
}
