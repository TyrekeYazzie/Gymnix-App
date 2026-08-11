import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, Alert, Dimensions,
  KeyboardAvoidingView, Platform, Animated, PanResponder
} from 'react-native';
import Slider from '@react-native-community/slider';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import { awardXP, calcCardioXP } from '@/lib/xp';
import NumberWheel from '@/components/NumberWheel';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS
} from '@/constants/theme';

export const CARDIO_TYPES: { name: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { name: 'Run',   icon: 'speedometer-outline', color: COLORS.neonGreen },
  { name: 'Bike',  icon: 'bicycle-outline',     color: COLORS.neonBlue },
  { name: 'Swim',  icon: 'water-outline',       color: COLORS.primary },
  { name: 'Walk',  icon: 'walk-outline',        color: COLORS.neonYellow },
  { name: 'HIIT',  icon: 'flash-outline',       color: COLORS.accent },
  { name: 'Row',   icon: 'boat-outline',        color: COLORS.neonOrange },
];

const DURATION_MIN = 1;
const DURATION_MAX = 120;
const DURATION_OPTIONS = Array.from({ length: DURATION_MAX - DURATION_MIN + 1 }, (_, i) => DURATION_MIN + i);
const TENTH_OPTIONS = Array.from({ length: 10 }, (_, i) => i);

const CALORIE_CHIPS = [150, 300, 500, 750];

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
  const { isImperial, refreshProfile } = useProfile();
  const [type, setType] = useState('');
  // distance is captured in whichever unit is currently displayed (mi or km), split into whole + tenth wheels
  const [distanceWhole, setDistanceWhole] = useState(5);
  const [distanceTenth, setDistanceTenth] = useState(0);
  const [duration, setDuration] = useState(30);
  const [calories, setCalories] = useState(280);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isEditing = !!editEntry;

  const slideAnim = useRef(new Animated.Value(SLIDE_DISTANCE)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const distanceUnit = isImperial ? 'mi' : 'km';
  const distanceMaxWhole = isImperial ? 26 : 42;
  const WHOLE_OPTIONS = Array.from({ length: distanceMaxWhole + 1 }, (_, i) => i);
  const displayDistance = distanceWhole + distanceTenth / 10;
  // always stored to the database as km
  const distanceKm = isImperial ? displayDistance / KM_TO_MI : displayDistance;

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

  useEffect(() => {
    if (visible) {
      if (editEntry) {
        setType(editEntry.type);
        setDuration(parseInt(editEntry.duration ?? '30', 10) || 30);
        setCalories(editEntry.calories ?? 280);
        const distKm = editEntry.distance_km ?? 0;
        const disp = isImperial ? distKm * KM_TO_MI : distKm;
        let whole = Math.floor(disp);
        let tenth = Math.round((disp - whole) * 10);
        if (tenth >= 10) { whole += 1; tenth = 0; }
        setDistanceWhole(Math.min(Math.max(whole, 0), distanceMaxWhole));
        setDistanceTenth(tenth);
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
    setDistanceWhole(5);
    setDistanceTenth(0);
    setDuration(30);
    setCalories(280);
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
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.accent} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>

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
                    color={type === t.name ? t.color : COLORS.textSecondary}
                    style={styles.typeIcon}
                  />
                  <Text style={[styles.typeName, type === t.name && { color: t.color }]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Distance + Duration wheels, side by side */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCol}>
                <Text style={[styles.label, { textAlign: 'center' }]}>Distance — {displayDistance.toFixed(1)} {distanceUnit}</Text>
                <View style={styles.distanceWheelsRow}>
                  <NumberWheel
                    options={WHOLE_OPTIONS}
                    value={distanceWhole}
                    onChange={setDistanceWhole}
                    width={60}
                    accentColor={COLORS.neonGreen}
                  />
                  <Text style={styles.distanceDot}>.</Text>
                  <NumberWheel
                    options={TENTH_OPTIONS}
                    value={distanceTenth}
                    onChange={setDistanceTenth}
                    width={50}
                    accentColor={COLORS.neonGreen}
                  />
                </View>
                <Text style={styles.wheelUnit}>{distanceUnit}</Text>
              </View>

              <View style={styles.metricCol}>
                <Text style={[styles.label, { textAlign: 'center' }]}>Duration</Text>
                <NumberWheel
                  options={DURATION_OPTIONS}
                  value={duration}
                  onChange={setDuration}
                  width={90}
                  accentColor={COLORS.primary}
                />
                <Text style={styles.wheelUnit}>minutes</Text>
              </View>
            </View>
            <Text style={styles.wheelHint}>Tap a number to type it directly</Text>

            {/* Auto pace */}
            {displayDistance > 0 && duration > 0 && (
              <View style={styles.paceBox}>
                <Text style={styles.paceLabel}>Average pace</Text>
                <Text style={styles.paceValue}>{pace}</Text>
              </View>
            )}

            {/* Calories quick-picks */}
            <Text style={[styles.label, { marginTop: SPACING.md }]}>Calories — {calories} kcal</Text>
            <View style={styles.chipRow}>
              {CALORIE_CHIPS.map((c) => {
                const selected = calories === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, selected && { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '22' }]}
                    onPress={() => setCalories(c)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, selected && { color: COLORS.accentLight }]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Slider
              style={[styles.slider, { marginBottom: SPACING.lg }]}
              minimumValue={50}
              maximumValue={1500}
              step={10}
              value={calories}
              onValueChange={setCalories}
              minimumTrackTintColor={COLORS.accent}
              maximumTrackTintColor={COLORS.borderDefault}
              thumbTintColor={COLORS.accent}
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
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.bgOverlay },
  sheet: {
    backgroundColor: COLORS.bgSecondary,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.neonGreen + '88',
    borderBottomWidth: 0,
    maxHeight: '85%',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    ...SHADOWS.green,
  },
  handleArea: { alignItems: 'center', paddingVertical: SPACING.md },
  handleBar: { width: 40, height: 4, backgroundColor: COLORS.borderDefault, borderRadius: RADIUS.full },
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
    fontSize: FONT_SIZES.xs, color: COLORS.textMuted,
  },
  typeGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: SPACING.sm, marginBottom: SPACING.lg,
  },
  typeCard: {
    width: '30.6%', backgroundColor: COLORS.bgTertiary,
    borderColor: COLORS.borderDefault, borderWidth: 1,
    borderRadius: RADIUS.md, alignItems: 'center', paddingVertical: SPACING.md,
  },
  typeIcon: { marginBottom: 4 },
  typeName: {
    fontSize: FONT_SIZES.xs, color: COLORS.textSecondary,
  },
  slider: { width: '100%', height: 40 },
  chipRow: {
    flexDirection: 'row', gap: SPACING.sm,
    marginTop: SPACING.xs, marginBottom: SPACING.sm,
  },
  chip: {
    flex: 1, backgroundColor: COLORS.bgTertiary,
    borderColor: COLORS.borderDefault, borderWidth: 1,
    borderRadius: RADIUS.sm, alignItems: 'center', paddingVertical: SPACING.sm,
  },
  chipText: {
    fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textSecondary,
  },
  metricsRow: {
    flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start',
    marginTop: SPACING.md,
  },
  metricCol: { alignItems: 'center' },
  distanceWheelsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 2, marginTop: SPACING.xs,
  },
  distanceDot: {
    fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.black, color: COLORS.textMuted,
    marginHorizontal: 2,
  },
  wheelUnit: {
    fontSize: FONT_SIZES.xs, color: COLORS.textMuted, textAlign: 'center',
    letterSpacing: 1, marginTop: 2,
  },
  wheelHint: {
    fontSize: FONT_SIZES.xs, color: COLORS.textMuted, textAlign: 'center',
    marginTop: SPACING.xs, fontStyle: 'italic',
  },
  paceBox: {
    backgroundColor: COLORS.bgTertiary, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', marginVertical: SPACING.md,
    borderWidth: 1, borderColor: COLORS.borderDefault,
  },
  paceLabel: {
    fontSize: FONT_SIZES.xs, color: COLORS.textMuted,
  },
  paceValue: {
    fontSize: FONT_SIZES.xl, color: COLORS.neonGreen,
  },
  saveButton: {
    backgroundColor: COLORS.neonGreen + 'dd', borderRadius: RADIUS.md,
    padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.sm,
    ...SHADOWS.green,
  },
  saveText: {
    color: COLORS.bgPrimary, fontWeight: FONT_WEIGHTS.bold,
  },
  cancelButton: { padding: SPACING.lg, alignItems: 'center' },
  cancelText: {
    color: COLORS.textMuted, fontSize: FONT_SIZES.sm,
  },
});
