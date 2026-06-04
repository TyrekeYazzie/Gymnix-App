import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/context/ProfileContext'
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, CARD
} from '@/constants/theme'

export default function EditProfile() {
  const { user } = useAuth()
  const { profile, setProfile } = useProfile()

  const [name, setName] = useState(profile?.full_name ?? '')
  const [age, setAge] = useState(profile?.age?.toString() ?? '')
  const [height, setHeight] = useState(profile?.height_cm?.toString() ?? '')
  const [weight, setWeight] = useState(profile?.weight_kg?.toString() ?? '')
  const [goal, setGoal] = useState(profile?.goal ?? '')
  const [activity, setActivity] = useState(profile?.activity_level ?? '')
  const [saved, setSaved] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const saveProfile = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: name,
        age: Number(age),
        height_cm: Number(height),
        weight_kg: Number(weight),
        goal,
        activity_level: activity,
      })
      .select()
      .single()

    if (error) {
      console.log('Supabase error:', JSON.stringify(error))
      Alert.alert('Error', 'Could not save profile. Try again.')
      return
    }

    if (data) {
      setProfile(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ]

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionTitle}>◈ IDENTITY</Text>

      <Text style={styles.label}>Full name</Text>
      <TextInput
        style={inputStyle('name')}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Spike Spiegel"
        placeholderTextColor={COLORS.textMuted}
        onFocus={() => setFocusedField('name')}
        onBlur={() => setFocusedField(null)}
      />

      <Text style={styles.label}>Goal</Text>
      <TextInput
        style={inputStyle('goal')}
        value={goal}
        onChangeText={setGoal}
        placeholder="e.g. Build muscle, Lose weight"
        placeholderTextColor={COLORS.textMuted}
        onFocus={() => setFocusedField('goal')}
        onBlur={() => setFocusedField(null)}
      />

      <Text style={styles.label}>Activity level</Text>
      <TextInput
        style={inputStyle('activity')}
        value={activity}
        onChangeText={setActivity}
        placeholder="e.g. Moderate, Very active"
        placeholderTextColor={COLORS.textMuted}
        onFocus={() => setFocusedField('activity')}
        onBlur={() => setFocusedField(null)}
      />

      <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>◈ STATS</Text>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.label}>Age</Text>
          <TextInput
            style={inputStyle('age')}
            value={age}
            onChangeText={setAge}
            placeholder="25"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            onFocus={() => setFocusedField('age')}
            onBlur={() => setFocusedField(null)}
          />
        </View>
        <View style={styles.halfField}>
          <Text style={styles.label}>Height (cm)</Text>
          <TextInput
            style={inputStyle('height')}
            value={height}
            onChangeText={setHeight}
            placeholder="175"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            onFocus={() => setFocusedField('height')}
            onBlur={() => setFocusedField(null)}
          />
        </View>
      </View>

      <Text style={styles.label}>Weight (kg)</Text>
      <TextInput
        style={inputStyle('weight')}
        value={weight}
        onChangeText={setWeight}
        placeholder="70"
        placeholderTextColor={COLORS.textMuted}
        keyboardType="numeric"
        onFocus={() => setFocusedField('weight')}
        onBlur={() => setFocusedField(null)}
      />

      <TouchableOpacity
        style={[styles.button, saved && styles.buttonSaved]}
        onPress={saveProfile}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>
          {saved ? '✓ SAVED' : '▸ SAVE PROFILE'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 3,
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
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
  },
  inputFocused: {
    borderColor: COLORS.primary,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfField: {
    flex: 1,
  },
  button: {
    backgroundColor: 'transparent',
    borderColor: COLORS.primary,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.xl * 3,
  },
  buttonSaved: {
    borderColor: COLORS.neonGreen,
  },
  buttonText: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: FONT_SIZES.md,
    fontFamily: 'monospace',
    letterSpacing: 3,
  },
})