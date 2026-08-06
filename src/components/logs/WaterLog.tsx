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
import { awardXP, XP_WATER } from '@/lib/xp';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS
} from '@/constants/theme';

// slide the sheet fully past the bottom edge regardless of device height or sheet content length
const SLIDE_DISTANCE = Dimensions.get('window').height + 100;

// Same icon across all four quick-amount presets — they're just different
// volumes of the same action (add water), so the label text carries the
// distinguishing info, not the icon.
const WATER_ICON: keyof typeof Ionicons.glyphMap = 'water-outline';

// metric quick amounts in ml
const QUICK_AMOUNTS_METRIC = [
  { label: '250ml', value: 250 },
  { label: '500ml', value: 500 },
  { label: '750ml', value: 750 },
  { label: '1L',    value: 1000 },
];

// imperial quick amounts in fl oz (stored as ml) — small bottle up to a huge 64 fl oz bottle
const QUICK_AMOUNTS_IMPERIAL = [
  { label: '8 fl oz',  value: 237 },
  { label: '16 fl oz', value: 473 },
  { label: '24 fl oz', value: 710 },
  { label: '64 fl oz', value: 1893 },
];

export const DAILY_GOAL_ML = 2500;
export const DAILY_GOAL_FLOZ = 84;

interface WaterEntry { id: string; amount_ml: number; created_at: string; }

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (log: any) => void;
}

export default function WaterLog({ visible, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const { isImperial, refreshProfile } = useProfile();

  // always stored as ml internally
  const [amountMl, setAmountMl] = useState(250);
  const [todayTotalMl, setTodayTotalMl] = useState(0);
  const [todayEntries, setTodayEntries] = useState<WaterEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const slideAnim = useRef(new Animated.Value(SLIDE_DISTANCE)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // display conversions
  const toDisplay = (ml: number) => isImperial ? ml * 0.033814 : ml;
  const fromDisplay = (val: number) => isImperial ? val / 0.033814 : val;
  const displayUnit = isImperial ? 'FL OZ' : 'ML';
  const dailyGoal = isImperial ? DAILY_GOAL_FLOZ : DAILY_GOAL_ML;
  const displayToday = toDisplay(todayTotalMl);
  const displayAmount = toDisplay(amountMl);
  const quickAmounts = isImperial ? QUICK_AMOUNTS_IMPERIAL : QUICK_AMOUNTS_METRIC;

  const progressPercent = Math.min((todayTotalMl / DAILY_GOAL_ML) * 100, 100);
  const progressColor = progressPercent >= 100 ? COLORS.neonGreen : progressPercent >= 60 ? COLORS.neonBlue : COLORS.accent;

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
      loadTodayTotal();
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
  }, [visible]);

  const loadTodayTotal = async () => {
    if (!user) return;
    const localMidnight = new Date();
    localMidnight.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from('water_logs')
      .select('id, amount_ml, created_at')
      .eq('user_id', user.id)
      .gte('created_at', localMidnight.toISOString())
      .order('created_at', { ascending: false });
    if (error) { console.error('Failed to load today water total:', error.message); return; }
    if (data) {
      setTodayTotalMl(data.reduce((sum, r) => sum + r.amount_ml, 0));
      setTodayEntries(data);
    }
  };

  const handleClose = () => { setAmountMl(250); onClose(); };

  // plays the slide-down/fade-out first, then closes — used for backdrop taps and Cancel,
  // since Modal's `visible` prop hides the native modal instantly otherwise, cutting the animation short
  const animateClose = () => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: SLIDE_DISTANCE, useNativeDriver: true, damping: 20, stiffness: 200 }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => handleClose());
  };

  const formatDisplay = (ml: number) => {
    if (isImperial) return `${toDisplay(ml).toFixed(0)} fl oz`;
    return ml >= 1000 ? `${(ml / 1000).toFixed(1)}L` : `${ml}ml`;
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { data, error } = await supabase
      .from('water_logs')
      .insert({ user_id: user.id, amount_ml: amountMl })
      .select()
      .single();

    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    if (data) {
      await awardXP(user.id, XP_WATER);
      await refreshProfile();
      setTodayTotalMl(p => p + amountMl);
      setTodayEntries(p => [data, ...p]);
      onSaved(data);
      setAmountMl(250);
      onClose();
    }
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

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
            <Text style={styles.title}>Log Water</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Progress */}
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Today</Text>
                <Text style={[styles.progressValue, { color: progressColor }]}>
                  {formatDisplay(todayTotalMl)} / {isImperial ? `${DAILY_GOAL_FLOZ} fl oz` : `${DAILY_GOAL_ML / 1000}L`}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` as any, backgroundColor: progressColor }]} />
              </View>
              <Text style={styles.progressPercent}>{Math.round(progressPercent)}% of daily goal</Text>
            </View>

            {/* Quick amounts */}
            <Text style={styles.label}>Quick add</Text>
            <View style={styles.quickRow}>
              {quickAmounts.map((q) => (
                <TouchableOpacity
                  key={q.value}
                  style={[styles.quickCard, amountMl === q.value && { borderColor: COLORS.neonBlue, backgroundColor: COLORS.neonBlue + '22' }]}
                  onPress={() => setAmountMl(q.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={WATER_ICON}
                    size={22}
                    color={amountMl === q.value ? COLORS.neonBlue : COLORS.textSecondary}
                    style={styles.quickIcon}
                  />
                  <Text style={[styles.quickLabel, amountMl === q.value && { color: COLORS.neonBlue }]}>{q.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom slider */}
            <Text style={styles.label}>Custom — {formatDisplay(amountMl)}</Text>
            <Slider
              style={[styles.slider, styles.sliderThick]}
              minimumValue={isImperial ? 1 : 50}
              maximumValue={isImperial ? 68 : 2000}
              step={isImperial ? 1 : 50}
              value={displayAmount}
              onValueChange={(val) => setAmountMl(Math.round(fromDisplay(val)))}
              minimumTrackTintColor={COLORS.neonBlue}
              maximumTrackTintColor={COLORS.borderDefault}
              thumbTintColor={COLORS.neonBlue}
            />
            <View style={[styles.sliderRangeRow, { marginBottom: SPACING.lg }]}>
              <Text style={styles.sliderRangeText}>{isImperial ? '1 fl oz' : '50 ml'}</Text>
              <Text style={styles.sliderRangeText}>{isImperial ? '68 fl oz' : '2L'}</Text>
            </View>

            {todayEntries.length > 0 && (
              <View style={{ marginBottom: SPACING.lg }}>
                <Text style={[styles.label, { marginTop: SPACING.sm }]}>Today's log</Text>
                {todayEntries.slice(0, 5).map((entry) => (
                  <View key={entry.id} style={styles.historyRow}>
                    <Text style={styles.historyAmount}>{formatDisplay(entry.amount_ml)}</Text>
                    <Text style={styles.historyTime}>{formatTime(entry.created_at)}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={saving}
            >
              <Text style={styles.saveText}>{saving ? 'Saving…' : 'Log Water'}</Text>
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
    backgroundColor: COLORS.bgSecondary, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.neonBlue + '88', borderBottomWidth: 0,
    maxHeight: '85%', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl,
  },
  handleArea: { alignItems: 'center', paddingVertical: SPACING.md },
  handleBar: { width: 40, height: 4, backgroundColor: COLORS.borderDefault, borderRadius: RADIUS.full },
  title: {
    fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.black, color: COLORS.textPrimary,
  },
  progressCard: {
    backgroundColor: COLORS.bgTertiary, borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.borderDefault,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  progressLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, letterSpacing: 1 },
  progressValue: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold },
  progressTrack: { height: 6, backgroundColor: COLORS.borderDefault, borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: SPACING.xs },
  progressFill: { height: '100%', borderRadius: RADIUS.full },
  progressPercent: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, textAlign: 'center' },
  label: {
    fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textMuted,
    letterSpacing: 1.5, marginBottom: SPACING.sm,
  },
  quickRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  quickCard: {
    flex: 1, backgroundColor: COLORS.bgTertiary, borderColor: COLORS.borderDefault,
    borderWidth: 1, borderRadius: RADIUS.md, alignItems: 'center', paddingVertical: SPACING.md,
  },
  quickIcon: { marginBottom: 4 },
  quickLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: FONT_WEIGHTS.bold, marginTop: 2 },
  slider: { width: '100%', height: 40 },
  sliderThick: { transform: [{ scaleY: 1.4 }] },
  sliderRangeRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: -SPACING.xs,
  },
  sliderRangeText: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderDefault,
  },
  historyAmount: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: FONT_WEIGHTS.medium },
  historyTime: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted },
  saveButton: { backgroundColor: COLORS.neonBlue + 'dd', borderRadius: RADIUS.md, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.sm },
  saveText: { color: COLORS.textInverse, fontWeight: FONT_WEIGHTS.black, fontSize: FONT_SIZES.md, letterSpacing: 0.5 },
  cancelButton: { padding: SPACING.lg, alignItems: 'center' },
  cancelText: { color: COLORS.textMuted, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.sm, letterSpacing: 0.5 },
});
