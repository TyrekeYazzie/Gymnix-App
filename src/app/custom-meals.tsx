import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { CustomMeal } from '@/types';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS, CARD
} from '@/constants/theme';

export default function CustomMeals() {
  const router = useRouter();
  const { user } = useAuth();
  const [meals, setMeals] = useState<CustomMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { loadMeals(); }, [user]);

  const loadMeals = async () => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('custom_meals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    setLoading(false);
    if (error) { console.error('Failed to load custom meals:', error.message); return; }
    if (data) setMeals(data);
  };

  const handleAdd = async () => {
    const trimmedName = name.trim();
    const cals = parseInt(calories, 10);
    if (!trimmedName) { Alert.alert('Missing Name', 'Enter a name for the meal.'); return; }
    if (!calories || isNaN(cals) || cals <= 0) { Alert.alert('Missing Calories', 'Enter the calories for this meal.'); return; }
    if (!user) return;

    setSaving(true);
    const { data, error } = await supabase
      .from('custom_meals')
      .insert({ user_id: user.id, name: trimmedName, calories: cals })
      .select()
      .single();
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    if (data) {
      setMeals(p => [...p, data]);
      setName('');
      setCalories('');
    }
  };

  const handleDelete = (meal: CustomMeal) => {
    Alert.alert(
      'Delete Meal',
      `Remove "${meal.name}" from your quick-add meals?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(meal.id);
            const { error } = await supabase.from('custom_meals').delete().eq('id', meal.id);
            setDeletingId(null);
            if (error) { Alert.alert('Error', error.message); return; }
            setMeals(p => p.filter(m => m.id !== meal.id));
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButtonRow}>
              <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
              <Text style={styles.backButton}>Back</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.screenTitle}>Custom Meals</Text>
          <Text style={styles.subtitle}>
            Save meals you eat often with their calories — they'll show up as one-tap options in the Log Meal quick add.
          </Text>
          <View style={styles.dividerLine} />

          {/* Add form */}
          <View style={styles.card}>
            <Text style={styles.label}>Meal name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Chicken and rice"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <Text style={[styles.label, { marginTop: SPACING.md }]}>Calories</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 450"
              placeholderTextColor={COLORS.textMuted}
              value={calories}
              onChangeText={(t) => setCalories(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={5}
            />
            <TouchableOpacity
              style={[styles.addButton, saving && { opacity: 0.6 }]}
              onPress={handleAdd}
              activeOpacity={0.8}
              disabled={saving}
            >
              <Ionicons name="add" size={18} color={COLORS.textInverse} />
              <Text style={styles.addButtonText}>{saving ? 'Adding…' : 'Add Meal'}</Text>
            </TouchableOpacity>
          </View>

          {/* List */}
          <Text style={styles.sectionTitle}>Your meals</Text>
          {loading ? (
            <Text style={styles.emptyText}>Loading…</Text>
          ) : meals.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>
                No custom meals yet. Add one above and it'll appear as a quick-add option when logging meals.
              </Text>
            </View>
          ) : (
            <View style={styles.card}>
              {meals.map((meal, i) => (
                <View key={meal.id}>
                  <View style={styles.mealRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mealName}>{meal.name}</Text>
                      <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(meal)}
                      activeOpacity={0.7}
                      disabled={deletingId === meal.id}
                      style={styles.deleteButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.accent} />
                    </TouchableOpacity>
                  </View>
                  {i < meals.length - 1 && <View style={styles.rowDivider} />}
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
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
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  card: {
    ...CARD.default,
    ...SHADOWS.purple,
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textMuted,
    letterSpacing: 1.5, marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.bgTertiary, borderColor: COLORS.borderDefault, borderWidth: 1,
    borderRadius: RADIUS.sm, padding: SPACING.md, color: COLORS.textPrimary,
  },
  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.md,
    marginTop: SPACING.lg,
  },
  addButtonText: {
    color: COLORS.textInverse, fontWeight: FONT_WEIGHTS.black, fontSize: FONT_SIZES.md, letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm, color: COLORS.textMuted, lineHeight: 18,
  },
  mealRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md,
  },
  mealName: {
    fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary,
  },
  mealCalories: {
    fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 2,
  },
  deleteButton: {
    width: 32, height: 32, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  rowDivider: {
    height: 1,
    backgroundColor: COLORS.borderDefault,
  },
});
