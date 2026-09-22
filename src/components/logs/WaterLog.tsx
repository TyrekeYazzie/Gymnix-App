import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { checkAndUnlockAchievements } from '@/lib/achievements';
import AchievementUnlockBanner from '@/components/AchievementUnlockBanner';
import { UnlockedAchievement } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import {
  FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, Theme
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
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // always stored as ml internally
  const [amountMl, setAmountMl] = useState(250);
  const [todayTotalMl, setTodayTotalMl] = useState(0);
  const [todayEntries, setTodayEntries] = useState<WaterEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WaterEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);

  const slideAnim = useRef(new Animated.Value(SLIDE_DISTANCE)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const unlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (unlockTimeoutRef.current) clearTimeout(unlockTimeoutRef.current); };
  }, []);

  // display conversions
  const toDisplay = (ml: number) => isImperial ? ml * 0.033814 : ml;
  const fromDisplay = (val: number) => isImperial ? val / 0.033814 : val;
  const displayAmount = toDisplay(amountMl);
  const quickAmounts = isImperial ? QUICK_AMOUNTS_IMPERIAL : QUICK_AMOUNTS_METRIC;

  const progressPercent = Math.min((todayTotalMl / DAILY_GOAL_ML) * 100, 100);
  const progressColor = progressPercent >= 100 ? colors.neonGreen : progressPercent >= 60 ? colors.neonBlue : colors.accent;

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

  const startEditingEntry = (entry: WaterEntry) => {
    setEditingEntry(entry);
    setAmountMl(entry.amount_ml);
  };

  const cancelEditingEntry = () => {
    setEditingEntry(null);
    setAmountMl(250);
  };

  const handleDeleteEntry = (entry: WaterEntry) => {
    Alert.alert(
      'Delete Entry',
      `Remove this ${formatDisplay(entry.amount_ml)} entry?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setDeletingId(entry.id);
            const { error } = await supabase.from('water_logs').delete().eq('id', entry.id);
            setDeletingId(null);
            if (error) { Alert.alert('Error', error.message); return; }
            await awardXP(user.id, -XP_WATER);
            await refreshProfile();
            if (editingEntry?.id === entry.id) cancelEditingEntry();
            await loadTodayTotal();
          },
        },
      ]
    );
  };

  const handleClose = () => { setAmountMl(250); setEditingEntry(null); setUnlockedAchievements([]); onClose(); };

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

    if (editingEntry) {
      const { data, error } = await supabase
        .from('water_logs')
        .update({ amount_ml: amountMl })
        .eq('id', editingEntry.id)
        .select()
        .single();

      setSaving(false);
      if (error) { Alert.alert('Error', error.message); return; }
      if (data) {
        // Flat XP_WATER doesn't depend on the amount, so editing never
        // changes how much was already earned — no award here.
        onSaved(data);
        setEditingEntry(null);
        setAmountMl(250);
        onClose();
      }
      return;
    }

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

      // Achievement check is new-logs-only, matching the same reasoning as
      // WorkoutLog's PR check — see supabase/migrations/20260815010000_achievements.sql.
      const newlyUnlocked = await checkAndUnlockAchievements();
      if (newlyUnlocked.length > 0) {
        setUnlockedAchievements(newlyUnlocked);
        setSaving(true);
        unlockTimeoutRef.current = setTimeout(() => {
          setSaving(false);
          onSaved(data); setAmountMl(250); onClose();
        }, 1400);
        return;
      }

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
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Drag handle + title — swipe down anywhere here to close */}
          <View {...panResponder.panHandlers}>
            <View style={styles.handleArea}>
              <View style={styles.handleBar} />
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{editingEntry ? 'Edit Water' : 'Log Water'}</Text>
              {editingEntry && (
                <TouchableOpacity
                  onPress={cancelEditingEntry}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.cancelEditLink}>Cancel edit</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <AchievementUnlockBanner achievements={unlockedAchievements} />

          <View {...bodyPanResponder.panHandlers}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            onScroll={(e) => { scrollOffsetY.current = e.nativeEvent.contentOffset.y; }}
            scrollEventThrottle={16}
          >
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
                  style={[styles.quickCard, amountMl === q.value && { borderColor: colors.neonBlue, backgroundColor: colors.neonBlue + '22' }]}
                  onPress={() => setAmountMl(q.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={WATER_ICON}
                    size={22}
                    color={amountMl === q.value ? colors.neonBlue : colors.textSecondary}
                    style={styles.quickIcon}
                  />
                  <Text style={[styles.quickLabel, amountMl === q.value && { color: colors.neonBlue }]}>{q.label}</Text>
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
              minimumTrackTintColor={colors.neonBlue}
              maximumTrackTintColor={colors.borderDefault}
              thumbTintColor={colors.neonBlue}
            />
            <View style={[styles.sliderRangeRow, { marginBottom: SPACING.lg }]}>
              <Text style={styles.sliderRangeText}>{isImperial ? '1 fl oz' : '50 ml'}</Text>
              <Text style={styles.sliderRangeText}>{isImperial ? '68 fl oz' : '2L'}</Text>
            </View>

            {todayEntries.length > 0 && (
              <View style={{ marginBottom: SPACING.lg }}>
                <Text style={[styles.label, { marginTop: SPACING.sm }]}>Today's log — tap to edit</Text>
                {todayEntries.slice(0, 5).map((entry) => (
                  <TouchableOpacity
                    key={entry.id}
                    style={[styles.historyRow, editingEntry?.id === entry.id && styles.historyRowActive]}
                    onPress={() => startEditingEntry(entry)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.historyAmount}>{formatDisplay(entry.amount_ml)}</Text>
                    <View style={styles.historyRightGroup}>
                      <Text style={styles.historyTime}>{formatTime(entry.created_at)}</Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteEntry(entry)}
                        disabled={deletingId === entry.id}
                        style={styles.historyDeleteBtn}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${formatDisplay(entry.amount_ml)} water entry`}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.accent} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={saving}
            >
              <Text style={styles.saveText}>{saving ? 'Saving…' : editingEntry ? 'Save Changes' : 'Log Water'}</Text>
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
  const { colors } = theme;
  return StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.bgOverlay },
  sheet: {
    backgroundColor: colors.bgSecondary, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    borderWidth: 1, borderColor: colors.neonBlue + '88', borderBottomWidth: 0,
    maxHeight: '85%', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl,
  },
  handleArea: { alignItems: 'center', paddingVertical: SPACING.md },
  handleBar: { width: 40, height: 4, backgroundColor: colors.borderDefault, borderRadius: RADIUS.full },
  title: {
    fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.black, color: colors.textPrimary,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cancelEditLink: { fontSize: FONT_SIZES.xs, color: colors.neonBlue, fontWeight: FONT_WEIGHTS.bold },
  progressCard: {
    backgroundColor: colors.bgTertiary, borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.lg, borderWidth: 1, borderColor: colors.borderDefault,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  progressLabel: { fontSize: FONT_SIZES.xs, color: colors.textMuted, letterSpacing: 1 },
  progressValue: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold },
  progressTrack: { height: 6, backgroundColor: colors.borderDefault, borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: SPACING.xs },
  progressFill: { height: '100%', borderRadius: RADIUS.full },
  progressPercent: { fontSize: FONT_SIZES.xs, color: colors.textMuted, textAlign: 'center' },
  label: {
    fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, color: colors.textMuted,
    letterSpacing: 1.5, marginBottom: SPACING.sm,
  },
  quickRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  quickCard: {
    flex: 1, backgroundColor: colors.bgTertiary, borderColor: colors.borderDefault,
    borderWidth: 1, borderRadius: RADIUS.md, alignItems: 'center', paddingVertical: SPACING.md,
  },
  quickIcon: { marginBottom: 4 },
  quickLabel: { fontSize: FONT_SIZES.xs, color: colors.textSecondary, fontWeight: FONT_WEIGHTS.bold, marginTop: 2 },
  slider: { width: '100%', height: 40 },
  sliderThick: { transform: [{ scaleY: 1.4 }] },
  sliderRangeRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: -SPACING.xs,
  },
  sliderRangeText: { fontSize: FONT_SIZES.xs, color: colors.textMuted },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: colors.borderDefault,
  },
  historyRowActive: { backgroundColor: colors.glowBlue },
  historyRightGroup: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  historyDeleteBtn: {
    width: 32, height: 32, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  historyAmount: { fontSize: FONT_SIZES.sm, color: colors.textPrimary, fontWeight: FONT_WEIGHTS.medium },
  historyTime: { fontSize: FONT_SIZES.xs, color: colors.textMuted },
  saveButton: { backgroundColor: colors.neonBlue + 'dd', borderRadius: RADIUS.md, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.sm },
  saveText: { color: colors.textInverse, fontWeight: FONT_WEIGHTS.black, fontSize: FONT_SIZES.md, letterSpacing: 0.5 },
  cancelButton: { padding: SPACING.lg, alignItems: 'center' },
  cancelText: { color: colors.textMuted, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.sm, letterSpacing: 0.5 },
  });
}
