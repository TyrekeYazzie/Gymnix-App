import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, Alert,
  KeyboardAvoidingView, Platform, Animated, PanResponder
} from 'react-native';
import Slider from '@react-native-community/slider';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS
} from '@/constants/theme';

const CARDIO_TYPES = [
  { name: 'Run',   emoji: '🏃', color: COLORS.neonGreen },
  { name: 'Bike',  emoji: '🚴', color: COLORS.neonBlue },
  { name: 'Swim',  emoji: '🏊', color: COLORS.primary },
  { name: 'Walk',  emoji: '🚶', color: COLORS.neonYellow },
  { name: 'HIIT',  emoji: '⚡', color: COLORS.accent },
  { name: 'Row',   emoji: '🚣', color: COLORS.neonOrange },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (log: any) => void;
}

export default function CardioLog({ visible, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [type, setType] = useState('');
  const [distance, setDistance] = useState(5.0);
  const [duration, setDuration] = useState(30);
  const [calories, setCalories] = useState(280);
  const [saving, setSaving] = useState(false);

  const slideAnim = useRef(new Animated.Value(600)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const pace = type === 'Swim'
    ? `${Math.floor(duration / distance)}:${String(Math.round(((duration / distance) % 1) * 60)).padStart(2, '0')} /100m`
    : `${Math.floor(duration / distance)}:${String(Math.round(((duration / distance) % 1) * 60)).padStart(2, '0')} /km`;

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

  const reset = () => {
    setType('');
    setDistance(5.0);
    setDuration(30);
    setCalories(280);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    if (!type) {
      Alert.alert('Missing Info', 'Please select a cardio type');
      return;
    }
    if (!user) return;
    setSaving(true);

    const { data, error } = await supabase
      .from('cardio_logs')
      .insert({
        user_id: user.id,
        type,
        distance_km: distance,
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

    if (data) { onSaved(data); reset(); onClose(); }
  };

  const getTypeColor = (t: string) =>
    CARDIO_TYPES.find(c => c.name === t)?.color ?? COLORS.neonGreen;

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

          <Text style={styles.title}>◈ LOG CARDIO</Text>

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Type selector */}
            <Text style={styles.label}>TYPE</Text>
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
                  <Text style={styles.typeEmoji}>{t.emoji}</Text>
                  <Text style={[styles.typeName, type === t.name && { color: t.color }]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Distance slider */}
            <Text style={styles.label}>DISTANCE — {distance.toFixed(1)} KM</Text>
            <Slider
              style={styles.slider}
              minimumValue={0.5}
              maximumValue={42}
              step={0.5}
              value={distance}
              onValueChange={setDistance}
              minimumTrackTintColor={COLORS.neonGreen}
              maximumTrackTintColor={COLORS.borderDefault}
              thumbTintColor={COLORS.neonGreen}
            />

            {/* Duration slider */}
            <Text style={[styles.label, { marginTop: SPACING.md }]}>DURATION — {duration} MIN</Text>
            <Slider
              style={styles.slider}
              minimumValue={5}
              maximumValue={180}
              step={5}
              value={duration}
              onValueChange={setDuration}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.borderDefault}
              thumbTintColor={COLORS.primary}
            />

            {/* Auto pace */}
            {distance > 0 && duration > 0 && (
              <View style={styles.paceBox}>
                <Text style={styles.paceLabel}>AVG PACE</Text>
                <Text style={styles.paceValue}>{pace}</Text>
              </View>
            )}

            {/* Calories slider */}
            <Text style={[styles.label, { marginTop: SPACING.md }]}>CALORIES — {calories} KCAL</Text>
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
              <Text style={styles.saveText}>{saving ? 'SAVING...' : '▸ SAVE CARDIO'}</Text>
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
    color: COLORS.textPrimary, fontFamily: 'monospace',
    letterSpacing: 3, marginBottom: SPACING.lg, textAlign: 'center',
  },
  label: {
    fontSize: FONT_SIZES.xs, color: COLORS.textMuted,
    fontFamily: 'monospace', letterSpacing: 2, marginBottom: SPACING.sm,
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
  typeEmoji: { fontSize: FONT_SIZES.xl, marginBottom: 4 },
  typeName: {
    fontSize: FONT_SIZES.xs, color: COLORS.textSecondary,
    fontFamily: 'monospace', fontWeight: FONT_WEIGHTS.bold,
  },
  slider: { width: '100%', height: 40 },
  paceBox: {
    backgroundColor: COLORS.bgTertiary, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', marginVertical: SPACING.md,
    borderWidth: 1, borderColor: COLORS.borderDefault,
  },
  paceLabel: {
    fontSize: FONT_SIZES.xs, color: COLORS.textMuted,
    fontFamily: 'monospace', letterSpacing: 2,
  },
  paceValue: {
    fontSize: FONT_SIZES.xl, color: COLORS.neonGreen,
    fontFamily: 'monospace', fontWeight: FONT_WEIGHTS.black,
  },
  saveButton: {
    backgroundColor: COLORS.neonGreen + 'dd', borderRadius: RADIUS.md,
    padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.sm,
    ...SHADOWS.green,
  },
  saveText: {
    color: COLORS.bgPrimary, fontWeight: FONT_WEIGHTS.bold,
    fontSize: FONT_SIZES.md, fontFamily: 'monospace', letterSpacing: 3,
  },
  cancelButton: { padding: SPACING.lg, alignItems: 'center' },
  cancelText: {
    color: COLORS.textMuted, fontSize: FONT_SIZES.sm,
    fontFamily: 'monospace', letterSpacing: 2,
  },
});