import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, TextInput, Alert,
  KeyboardAvoidingView, Platform, Animated, PanResponder
} from 'react-native';
import Slider from '@react-native-community/slider';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS
} from '@/constants/theme';

interface WeightEntry { id?: string; weight_kg: number; created_at: string; }

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (log: any) => void;
}

export default function WeightLog({ visible, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const { profile, isImperial } = useProfile();

  // always stored as kg internally
  const startKg = profile?.weight_kg ?? 70;
  const [weightKg, setWeightKg] = useState(startKg);
  const [notes, setNotes] = useState('');
  const [lastEntry, setLastEntry] = useState<WeightEntry | null>(null);
  const [recentEntries, setRecentEntries] = useState<WeightEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const slideAnim = useRef(new Animated.Value(600)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // display helpers
  const toDisplay = (kg: number) => isImperial ? kg * 2.2046 : kg;
  const fromDisplay = (val: number) => isImperial ? val / 2.2046 : val;
  const displayUnit = isImperial ? 'LBS' : 'KG';
  const displayWeight = toDisplay(weightKg);
  const sliderMin = isImperial ? 66 : 30;
  const sliderMax = isImperial ? 440 : 200;
  const sliderStep = isImperial ? 0.5 : 0.1;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => { if (g.dy > 0) slideAnim.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100 || g.vy > 0.5) {
          Animated.spring(slideAnim, { toValue: 600, useNativeDriver: true, damping: 20, stiffness: 200 })
            .start(() => handleClose());
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      loadLastEntry();
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 600, useNativeDriver: true, damping: 20, stiffness: 200 }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const loadLastEntry = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('weight_logs')
      .select('id, weight_kg, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) { console.error('Failed to load weight history:', error.message); return; }
    if (data && data.length > 0) {
      setLastEntry(data[0]);
      setWeightKg(data[0].weight_kg);
      setRecentEntries(data);
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
  const diffColor = diffKg === null ? COLORS.textMuted : diffKg < 0 ? COLORS.neonGreen : diffKg > 0 ? COLORS.accent : COLORS.textMuted;

  const handleClose = () => { setNotes(''); onClose(); };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { data, error } = await supabase
      .from('weight_logs')
      .insert({ user_id: user.id, weight_kg: weightKg, notes })
      .select()
      .single();

    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    if (data) {
      setRecentEntries(p => [data, ...p].slice(0, 5));
      onSaved(data);
      setNotes('');
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={styles.handleBar} />
          </View>

          <Text style={styles.title}>◈ LOG WEIGHT</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {lastEntry && (
              <View style={styles.lastEntry}>
                <Text style={styles.lastLabel}>LAST LOGGED</Text>
                <Text style={styles.lastValue}>
                  {toDisplay(lastEntry.weight_kg).toFixed(1)} {displayUnit} — {formatDate(lastEntry.created_at)}
                </Text>
              </View>
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

            <Slider
              style={[styles.slider, { marginBottom: SPACING.lg }]}
              minimumValue={sliderMin}
              maximumValue={sliderMax}
              step={sliderStep}
              value={displayWeight}
              onValueChange={(val) => setWeightKg(fromDisplay(val))}
              minimumTrackTintColor={COLORS.accent}
              maximumTrackTintColor={COLORS.borderDefault}
              thumbTintColor={COLORS.accent}
            />

            {recentEntries.length > 1 && (
              <View style={{ marginBottom: SPACING.lg }}>
                <Text style={styles.label}>RECENT ENTRIES</Text>
                {recentEntries.slice(1).map((entry, i) => (
                  <View key={entry.id ?? i} style={styles.historyRow}>
                    <Text style={styles.historyAmount}>{toDisplay(entry.weight_kg).toFixed(1)} {displayUnit}</Text>
                    <Text style={styles.historyTime}>{formatDate(entry.created_at)}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.label}>NOTES (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, { marginBottom: SPACING.lg }]}
              placeholder="e.g. Morning, after workout..."
              placeholderTextColor={COLORS.textMuted}
              value={notes}
              onChangeText={setNotes}
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={saving}
            >
              <Text style={styles.saveText}>{saving ? 'SAVING...' : '▸ LOG WEIGHT'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={handleClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>CANCEL</Text>
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
    borderWidth: 1, borderColor: COLORS.accent + '88', borderBottomWidth: 0,
    maxHeight: '85%', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl, ...SHADOWS.crimson,
  },
  handleArea: { alignItems: 'center', paddingVertical: SPACING.md },
  handleBar: { width: 40, height: 4, backgroundColor: COLORS.borderDefault, borderRadius: RADIUS.full },
  title: {
    fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.black, color: COLORS.textPrimary,
    fontFamily: 'monospace', letterSpacing: 3, marginBottom: SPACING.lg, textAlign: 'center',
  },
  label: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, fontFamily: 'monospace', letterSpacing: 2, marginBottom: SPACING.sm },
  lastEntry: {
    backgroundColor: COLORS.bgTertiary, borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.borderDefault,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  lastLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, fontFamily: 'monospace', letterSpacing: 2 },
  lastValue: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontFamily: 'monospace', fontWeight: FONT_WEIGHTS.bold },
  weightDisplay: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginBottom: SPACING.sm },
  weightNumber: { fontSize: FONT_SIZES.hero, fontWeight: FONT_WEIGHTS.black, color: COLORS.textPrimary, fontFamily: 'monospace' },
  weightUnit: { fontSize: FONT_SIZES.xl, color: COLORS.textMuted, fontFamily: 'monospace', marginBottom: 10, marginLeft: SPACING.sm },
  weightDiff: { fontSize: FONT_SIZES.sm, fontFamily: 'monospace', textAlign: 'center', marginBottom: SPACING.md, letterSpacing: 1 },
  slider: { width: '100%', height: 40 },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderDefault,
  },
  historyAmount: { color: COLORS.textPrimary, fontFamily: 'monospace', fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold },
  historyTime: { color: COLORS.textMuted, fontFamily: 'monospace', fontSize: FONT_SIZES.xs },
  input: {
    backgroundColor: COLORS.bgTertiary, borderColor: COLORS.borderDefault, borderWidth: 1,
    borderRadius: RADIUS.sm, padding: SPACING.md, color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md, fontFamily: 'monospace',
  },
  saveButton: { backgroundColor: COLORS.accent, borderRadius: RADIUS.md, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.sm, ...SHADOWS.crimson },
  saveText: { color: COLORS.textPrimary, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.md, fontFamily: 'monospace', letterSpacing: 3 },
  cancelButton: { padding: SPACING.lg, alignItems: 'center' },
  cancelText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, fontFamily: 'monospace', letterSpacing: 2 },
});