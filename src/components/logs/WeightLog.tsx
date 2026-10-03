import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, TextInput, Alert, Dimensions,
  KeyboardAvoidingView, Platform, Animated, PanResponder, Keyboard
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import { checkAndUnlockAchievements } from '@/lib/achievements';
import AchievementUnlockBanner from '@/components/AchievementUnlockBanner';
import { UnlockedAchievement } from '@/types';
import WeightRuler from '@/components/WeightRuler';
import { useTheme } from '@/context/ThemeContext';
import {
  FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, Theme
} from '@/constants/theme';

// slide the sheet fully past the bottom edge regardless of device height or sheet content length
const SLIDE_DISTANCE = Dimensions.get('window').height + 100;

interface WeightEntry { id?: string; weight_kg: number; notes?: string | null; created_at: string; }

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (log: any) => void;
  /** When set, the sheet opens editing this entry (any day, e.g. from the Calendar) instead of logging a new one. */
  editEntry?: WeightEntry | null;
}

export default function WeightLog({ visible, onClose, onSaved, editEntry }: Props) {
  const { user } = useAuth();
  const { profile, isImperial, refreshProfile } = useProfile();
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // always stored as kg internally
  const startKg = profile?.weight_kg ?? 70;
  const [weightKg, setWeightKg] = useState(startKg);
  const [notes, setNotes] = useState('');
  const [lastEntry, setLastEntry] = useState<WeightEntry | null>(null);
  const [recentEntries, setRecentEntries] = useState<WeightEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);

  const slideAnim = useRef(new Animated.Value(SLIDE_DISTANCE)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const unlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The real double-submit guard — see the same ref in WorkoutLog.
  const savingRef = useRef(false);

  useEffect(() => {
    return () => { if (unlockTimeoutRef.current) clearTimeout(unlockTimeoutRef.current); };
  }, []);

  // display helpers
  const toDisplay = (kg: number) => isImperial ? kg * 2.2046 : kg;
  const fromDisplay = (val: number) => isImperial ? val / 2.2046 : val;
  const displayUnit = isImperial ? 'lbs' : 'kg';
  const displayWeight = toDisplay(weightKg);

  // Ruler always spans the same real bodyweight range (50–500 lbs) — the
  // metric bounds are just that range converted, so switching units never
  // changes what the ruler can actually represent.
  const ruler = isImperial
    ? { min: 50, max: 500, step: 1, minorStep: 5, majorStep: 50 }
    : { min: Math.round(50 / 2.2046), max: Math.round(500 / 2.2046), step: 0.5, minorStep: 5, majorStep: 25 };

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
      loadLastEntry(!!editEntry);
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

  // preserveForm: the sheet opened to edit an entry, so keep the ruler on
  // that entry's value instead of jumping to the latest weigh-in.
  const loadLastEntry = async (preserveForm = false) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('weight_logs')
      .select('id, weight_kg, notes, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) { console.error('Failed to load weight history:', error.message); return; }
    if (!data) return;
    // Always sync fully (not just on a non-empty result) — this now also runs
    // after a delete, and if that delete removed someone's only entry, the
    // stale lastEntry/recentEntries from before would otherwise stick around
    // pointing at a row that no longer exists.
    setRecentEntries(data);
    if (data.length > 0) {
      setLastEntry(data[0]);
      if (!preserveForm) setWeightKg(data[0].weight_kg);
    } else {
      setLastEntry(null);
      if (!preserveForm) setWeightKg(startKg);
    }
  };

  const formatDate = (d: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return `${diff} days ago`;
  };

  const diffKg = lastEntry ? weightKg - lastEntry.weight_kg : null;
  const diffDisplay = diffKg !== null ? toDisplay(Math.abs(diffKg)).toFixed(1) : null;
  const diffSign = diffKg !== null && diffKg > 0 ? '+' : '-';
  const diffColor = diffKg === null ? colors.textMuted : diffKg < 0 ? colors.neonGreen : diffKg > 0 ? colors.accent : colors.textMuted;

  const startEditingEntry = (entry: WeightEntry) => {
    setEditingEntry(entry);
    setWeightKg(entry.weight_kg);
    setNotes(entry.notes ?? '');
  };

  useEffect(() => {
    if (visible && editEntry) startEditingEntry(editEntry);
  }, [visible, editEntry]);

  const cancelEditingEntry = () => {
    setEditingEntry(null);
    setWeightKg(lastEntry?.weight_kg ?? startKg);
    setNotes('');
  };

  const handleDeleteEntry = (entry: WeightEntry) => {
    if (!entry.id) return;
    Alert.alert(
      'Delete Entry',
      `Remove this entry from ${formatDate(entry.created_at)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setDeletingId(entry.id!);
            const { error } = await supabase.from('weight_logs').delete().eq('id', entry.id);
            setDeletingId(null);
            if (error) { Alert.alert('Error', error.message); return; }
            await refreshProfile();
            // Deleted the one entry this sheet was opened to edit: nothing left to do here.
            if (editEntry?.id === entry.id) { handleClose(); return; }
            if (editingEntry?.id === entry.id) cancelEditingEntry();
            await loadLastEntry();
          },
        },
      ]
    );
  };

  const handleClose = () => { setNotes(''); setEditingEntry(null); setUnlockedAchievements([]); onClose(); };

  // plays the slide-down/fade-out first, then closes — used for backdrop taps and Cancel,
  // since Modal's `visible` prop hides the native modal instantly otherwise, cutting the animation short
  const animateClose = () => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: SLIDE_DISTANCE, useNativeDriver: true, damping: 20, stiffness: 200 }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => handleClose());
  };

  const handleSave = async () => {
    if (!user) return;
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    // Set when the achievement banner holds the sheet open; its timer
    // finishes the save, so `finally` must not release the guard early.
    let heldOpen = false;

    try {
      if (editingEntry) {
        const { data, error } = await supabase
          .from('weight_logs')
          .update({ weight_kg: weightKg, notes })
          .eq('id', editingEntry.id)
          .select()
          .single();

        if (error) { Alert.alert('Error', error.message); return; }
        if (data) {
          onSaved(data);
          setEditingEntry(null);
          setNotes('');
          onClose();
        }
        return;
      }

      const { data, error } = await supabase
        .from('weight_logs')
        .insert({ user_id: user.id, weight_kg: weightKg, notes })
        .select()
        .single();

      if (error) { Alert.alert('Error', error.message); return; }
      if (data) {
        await refreshProfile();
        setRecentEntries(p => [data, ...p].slice(0, 5));

        // Achievement check is new-logs-only, matching the same reasoning as
        // WorkoutLog's PR check — see supabase/migrations/20260815010000_achievements.sql.
        const newlyUnlocked = await checkAndUnlockAchievements();
        if (newlyUnlocked.length > 0) {
          setUnlockedAchievements(newlyUnlocked);
          heldOpen = true;
          unlockTimeoutRef.current = setTimeout(() => {
            savingRef.current = false;
            setSaving(false);
            onSaved(data); setNotes(''); onClose();
          }, 1400);
          return;
        }

        onSaved(data);
        setNotes('');
        onClose();
      }
    } catch (err) {
      console.error('Failed to save weight:', err);
      Alert.alert('Error', 'Something went wrong while saving. Check your recent entries before trying again.');
    } finally {
      if (!heldOpen) { savingRef.current = false; setSaving(false); }
    }
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
            <View style={styles.titleRow}>
              <Text style={styles.title}>{editingEntry ? 'Edit Weight' : 'Log Weight'}</Text>
              {editingEntry && (
                <View style={styles.editActions}>
                  <TouchableOpacity
                    onPress={() => handleDeleteEntry(editingEntry)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Delete this entry"
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.accent} />
                  </TouchableOpacity>
                  {/* Opened to edit one entry (e.g. from the Calendar): cancelling
                      closes the sheet rather than switching to logging a new one. */}
                  <TouchableOpacity
                    onPress={editEntry ? animateClose : cancelEditingEntry}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.cancelEditLink}>Cancel edit</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <AchievementUnlockBanner achievements={unlockedAchievements} />

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {lastEntry && (
              <TouchableOpacity
                style={[styles.lastEntry, editingEntry?.id === lastEntry.id && styles.lastEntryActive]}
                onPress={() => startEditingEntry(lastEntry)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.lastLabel}>Last logged — tap to edit</Text>
                  <Text style={styles.lastValue}>
                    {toDisplay(lastEntry.weight_kg).toFixed(1)} {displayUnit} — {formatDate(lastEntry.created_at)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteEntry(lastEntry)}
                  disabled={deletingId === lastEntry.id}
                  style={styles.historyDeleteBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Delete last logged weight entry"
                >
                  <Ionicons name="trash-outline" size={16} color={colors.accent} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}

            <View style={styles.weightDisplay}>
              <Text style={styles.weightNumber}>{displayWeight.toFixed(1)}</Text>
              <Text style={styles.weightUnit}>{displayUnit}</Text>
            </View>

            {diffDisplay && diffKg !== 0 && (
              <Text style={[styles.weightDiff, { color: diffColor }]}>
                {diffSign}{diffDisplay} {displayUnit.toLowerCase()} from last entry
              </Text>
            )}

            <WeightRuler
              value={displayWeight}
              onChange={(val) => setWeightKg(fromDisplay(val))}
              min={ruler.min}
              max={ruler.max}
              step={ruler.step}
              minorStep={ruler.minorStep}
              majorStep={ruler.majorStep}
              accentColor={colors.accent}
            />
            <View style={{ marginBottom: SPACING.lg }} />

            {recentEntries.length > 1 && (
              <View style={{ marginBottom: SPACING.lg }}>
                <Text style={styles.label}>Recent entries — tap to edit</Text>
                {recentEntries.slice(1).map((entry, i) => (
                  <TouchableOpacity
                    key={entry.id ?? i}
                    style={[styles.historyRow, editingEntry?.id === entry.id && styles.historyRowActive]}
                    onPress={() => startEditingEntry(entry)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.historyAmount}>{toDisplay(entry.weight_kg).toFixed(1)} {displayUnit}</Text>
                    <View style={styles.historyRightGroup}>
                      <Text style={styles.historyTime}>{formatDate(entry.created_at)}</Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteEntry(entry)}
                        disabled={deletingId === entry.id}
                        style={styles.historyDeleteBtn}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${toDisplay(entry.weight_kg).toFixed(1)} ${displayUnit} weight entry`}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.accent} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, { marginBottom: SPACING.lg }]}
              placeholder="e.g. Morning, after workout..."
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={saving}
            >
              <Text style={styles.saveText}>{saving ? 'Saving…' : editingEntry ? 'Save Changes' : 'Log Weight'}</Text>
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

function makeStyles(theme: Theme) {
  const { colors, SHADOWS } = theme;
  return StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.bgOverlay },
  sheet: {
    backgroundColor: colors.bgSecondary, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    borderWidth: 1, borderColor: colors.accent + '88', borderBottomWidth: 0,
    maxHeight: '85%', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl, ...SHADOWS.crimson,
  },
  handleArea: { alignItems: 'center', paddingVertical: SPACING.md },
  handleBar: { width: 40, height: 4, backgroundColor: colors.borderDefault, borderRadius: RADIUS.full },
  title: {
    fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.black, color: colors.textPrimary,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  editActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  cancelEditLink: { fontSize: FONT_SIZES.xs, color: colors.primary, fontWeight: FONT_WEIGHTS.bold },
  lastEntry: {
    backgroundColor: colors.bgTertiary, borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.lg, borderWidth: 1, borderColor: colors.borderDefault,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  lastEntryActive: { borderColor: colors.accent },
  lastLabel: { fontSize: FONT_SIZES.xs, color: colors.textMuted, letterSpacing: 1 },
  lastValue: { fontSize: FONT_SIZES.sm, color: colors.textPrimary, fontWeight: FONT_WEIGHTS.bold },
  weightDisplay: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginBottom: SPACING.sm },
  weightNumber: { fontSize: FONT_SIZES.xxxl, fontWeight: FONT_WEIGHTS.black, color: colors.textPrimary, marginRight: SPACING.xs },
  weightUnit: { fontSize: FONT_SIZES.lg, color: colors.textMuted, marginBottom: SPACING.xs },
  weightDiff: { fontSize: FONT_SIZES.xs, textAlign: 'center', marginBottom: SPACING.lg },
  label: {
    fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, color: colors.textMuted,
    letterSpacing: 1.5, marginBottom: SPACING.sm,
  },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: colors.borderDefault,
  },
  historyRowActive: { backgroundColor: colors.accentGlow },
  historyRightGroup: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  historyDeleteBtn: {
    width: 32, height: 32, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  historyAmount: { fontSize: FONT_SIZES.sm, color: colors.textPrimary, fontWeight: FONT_WEIGHTS.medium },
  historyTime: { fontSize: FONT_SIZES.xs, color: colors.textMuted },
  input: {
    backgroundColor: colors.bgTertiary, borderColor: colors.borderDefault, borderWidth: 1,
    borderRadius: RADIUS.sm, padding: SPACING.md, color: colors.textPrimary,
  },
  saveButton: { backgroundColor: colors.accent, borderRadius: RADIUS.md, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.sm, ...SHADOWS.crimson },
  saveText: { color: colors.textInverse, fontWeight: FONT_WEIGHTS.black, fontSize: FONT_SIZES.md, letterSpacing: 0.5 },
  cancelButton: { padding: SPACING.lg, alignItems: 'center' },
  cancelText: { color: colors.textMuted, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.sm, letterSpacing: 0.5 },
  });
}
