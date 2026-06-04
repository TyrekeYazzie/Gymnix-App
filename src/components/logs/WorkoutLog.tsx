import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, TextInput, Alert,
  KeyboardAvoidingView, Platform, Animated
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS
} from '@/constants/theme';
import { useRef } from 'react';
import { PanResponder } from 'react-native';
const categories = [
  { name: 'CHEST',     emoji: '💪', color: COLORS.primary },
  { name: 'BACK',      emoji: '🏋️', color: COLORS.accent },
  { name: 'LEGS',      emoji: '🦵', color: COLORS.neonGreen },
  { name: 'SHOULDERS', emoji: '🏆', color: COLORS.neonBlue },
  { name: 'ARMS',      emoji: '💯', color: COLORS.neonYellow },
  { name: 'CARDIO',    emoji: '🏃', color: COLORS.neonOrange },
];

const SUGGESTED_WORKOUTS = [
  { name: 'Chest Day',   category: 'CHEST',     duration: '45', calories: '320' },
  { name: 'Pull Day',    category: 'BACK',      duration: '50', calories: '380' },
  { name: 'Leg Day',     category: 'LEGS',      duration: '60', calories: '420' },
  { name: 'Push Day',    category: 'SHOULDERS', duration: '45', calories: '300' },
  { name: 'Morning Run', category: 'CARDIO',    duration: '30', calories: '280' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (workout: any) => void;       // tells parent a new workout was saved
  initialCategory?: string;             // optional — preselect a category
}

export default function WorkoutLog({ visible, onClose, onSaved, initialCategory }: Props) {
  const { user } = useAuth();
  const [workoutName, setWorkoutName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory ?? '');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [saving, setSaving] = useState(false);

  const slideAnim = useRef(new Animated.Value(600)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // animate in when visible changes
  React.useEffect(() => {
    if (visible) {
      if (initialCategory) setSelectedCategory(initialCategory);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 600,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const reset = () => {
    setWorkoutName('');
    setSelectedCategory(initialCategory ?? '');
    setDuration('');
    setCalories('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const getCategoryColor = (cat: string) =>
    categories.find(c => c.name === cat)?.color ?? COLORS.primary;

  const applySuggestion = (s: typeof SUGGESTED_WORKOUTS[0]) => {
    setWorkoutName(s.name);
    setSelectedCategory(s.category);
    setDuration(s.duration);
    setCalories(s.calories);
  };

  const handleSave = async () => {
    if (!workoutName || !selectedCategory) {
      Alert.alert('Missing Info', 'Please enter a name and select a category');
      return;
    }
    if (!user) return;

    setSaving(true);

    const { data, error } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        name: workoutName,
        category: selectedCategory,
        duration: duration ? `${duration} min` : 'N/A',
        calories: parseInt(calories) || 0,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.log('Workout save error:', JSON.stringify(error));
      Alert.alert('Error', 'Could not save workout. Try again.');
      return;
    }

    if (data) {
      onSaved(data);   // pass saved workout back to parent
      reset();
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent:'flex-end' }}
      >
        {/* Overlay */}
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.handleBar} />
          <Text style={styles.title}>◈ LOG WORKOUT</Text>

          {/* Quick add suggestions */}
          <Text style={styles.label}>QUICK ADD</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: SPACING.lg }}
          >
            <View style={styles.chipRow}>
              {SUGGESTED_WORKOUTS.map((s) => (
                <TouchableOpacity
                  key={s.name}
                  style={[
                    styles.chip,
                    workoutName === s.name && {
                      borderColor: getCategoryColor(s.category),
                      backgroundColor: getCategoryColor(s.category) + '22',
                    },
                  ]}
                  onPress={() => applySuggestion(s)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.chipText,
                    workoutName === s.name && { color: getCategoryColor(s.category) },
                  ]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Workout name */}
          <Text style={styles.label}>WORKOUT NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Chest Day"
            placeholderTextColor={COLORS.textMuted}
            value={workoutName}
            onChangeText={setWorkoutName}
            autoCapitalize="words"
          />

          {/* Category */}
          <Text style={styles.label}>CATEGORY</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: SPACING.lg }}
          >
            <View style={styles.chipRow}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.name}
                  style={[
                    styles.chip,
                    selectedCategory === cat.name && {
                      backgroundColor: cat.color,
                      borderColor: cat.color,
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat.name)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.chipText,
                    selectedCategory === cat.name && { color: COLORS.bgPrimary },
                  ]}>
                    {cat.emoji} {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Duration + Calories */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: SPACING.sm }}>
              <Text style={styles.label}>DURATION (MIN)</Text>
              <TextInput
                style={styles.input}
                placeholder="45"
                placeholderTextColor={COLORS.textMuted}
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>CALORIES</Text>
              <TextInput
                style={styles.input}
                placeholder="320"
                placeholderTextColor={COLORS.textMuted}
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={saving}
          >
            <Text style={styles.saveText}>
              {saving ? 'SAVING...' : '▸ SAVE WORKOUT'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>CANCEL</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.bgOverlay,
  },
  sheet: {
    backgroundColor: COLORS.bgSecondary,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderFocus,
    borderBottomWidth: 0,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    ...SHADOWS.purple,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.borderDefault,
    borderRadius: RADIUS.full,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
    letterSpacing: 3,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  label: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.bgTertiary,
    borderColor: COLORS.borderDefault,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    fontFamily: 'monospace',
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
  },
  chipRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  chip: {
    borderColor: COLORS.borderDefault,
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.purple,
  },
  saveText: {
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: FONT_SIZES.md,
    fontFamily: 'monospace',
    letterSpacing: 3,
  },
  cancelButton: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  cancelText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
});