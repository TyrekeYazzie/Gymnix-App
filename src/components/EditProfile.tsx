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
  SPACING, RADIUS, SHADOWS, CARD
} from '@/constants/theme'

export default function EditProfile() {
  const { user } = useAuth()
  const { profile, setProfile, isImperial } = useProfile()

  const [name, setName] = useState(profile?.full_name ?? '')
  const [age, setAge] = useState(profile?.age?.toString() ?? '')
  const [goal, setGoal] = useState(profile?.goal ?? '')
  const [units, setUnits] = useState<'metric' | 'imperial'>(profile?.units ?? 'metric')
  const [saved, setSaved] = useState(false)

  // height state — stored internally as cm always
  const [heightCm, setHeightCm] = useState(profile?.height_cm ?? 170)
  // Round the total inches once so ft/in are always derived from the same
  // whole number — rounding ft and in independently can disagree (e.g. both
  // rounding up) and produce an invalid "5'12"" instead of "6'0"".
  const initialTotalIn = profile?.height_cm ? Math.round(profile.height_cm / 2.54) : null
  const [heightFt, setHeightFt] = useState(
    initialTotalIn !== null ? Math.floor(initialTotalIn / 12).toString() : '5'
  )
  const [heightIn, setHeightIn] = useState(
    initialTotalIn !== null ? (initialTotalIn % 12).toString() : '7'
  )
  // display buffer for the metric cm field — kept separate from heightCm so
  // clearing the box to type a new number doesn't snap the real value to 0
  // (Number('') === 0) and trip the "unrealistic height" check mid-edit
  const [heightCmDisplay, setHeightCmDisplay] = useState(heightCm.toString())

  // weight state — stored internally as kg always
  const [weightKg, setWeightKg] = useState(profile?.weight_kg ?? 70)
  const [weightDisplay, setWeightDisplay] = useState(
    profile?.weight_kg
      ? units === 'imperial'
        ? (profile.weight_kg * 2.2046).toFixed(1)
        : profile.weight_kg.toString()
      : ''
  )

  const handleUnitsChange = (newUnits: 'metric' | 'imperial') => {
    setUnits(newUnits)
    // convert displayed weight
    if (newUnits === 'imperial' && weightKg) {
      setWeightDisplay((weightKg * 2.2046).toFixed(1))
    } else if (newUnits === 'metric' && weightKg) {
      setWeightDisplay(weightKg.toString())
    }
    // convert displayed height — otherwise switching units mid-edit shows
    // stale ft/in or cm that no longer matches the real heightCm
    if (newUnits === 'imperial') {
      const totalIn = Math.round(heightCm / 2.54)
      setHeightFt(Math.floor(totalIn / 12).toString())
      setHeightIn((totalIn % 12).toString())
    } else {
      setHeightCmDisplay(Math.round(heightCm).toString())
    }
  }

  const handleWeightChange = (val: string) => {
    setWeightDisplay(val)
    const num = parseFloat(val)
    if (!isNaN(num)) {
      setWeightKg(units === 'imperial' ? num * 0.4536 : num)
    }
  }

  const handleHeightFtChange = (ft: string) => {
    setHeightFt(ft)
    const totalIn = (parseInt(ft) || 0) * 12 + (parseInt(heightIn) || 0)
    setHeightCm(totalIn * 2.54)
  }

  const handleHeightInChange = (inches: string) => {
    setHeightIn(inches)
    const totalIn = (parseInt(heightFt) || 0) * 12 + (parseInt(inches) || 0)
    setHeightCm(totalIn * 2.54)
  }

  const handleHeightCmChange = (val: string) => {
    setHeightCmDisplay(val)
    const num = parseFloat(val)
    if (!isNaN(num)) setHeightCm(num)
  }

  const saveProfile = async () => {
    if (!user) return

    const ageNum = Number(age)
    if (age && (isNaN(ageNum) || ageNum < 1 || ageNum > 120)) {
      Alert.alert('Invalid Age', 'Please enter an age between 1 and 120')
      return
    }
    if (heightCm < 50 || heightCm > 300) {
      Alert.alert('Invalid Height', 'Please enter a realistic height')
      return
    }
    if (weightKg < 20 || weightKg > 500) {
      Alert.alert('Invalid Weight', 'Please enter a realistic weight')
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: name,
        age: Math.round(ageNum),
        // height_cm is an integer column — the imperial ft/in -> cm
        // conversion (totalIn * 2.54) almost always lands on a decimal
        // (e.g. 5'7" -> 170.18), which Postgres's integer parser rejects
        // outright ("invalid input syntax for type integer"). Round here
        // regardless of units so this can never slip through again.
        height_cm: Math.round(heightCm),
        weight_kg: weightKg,
        goal,
        units,
      })
      .select()
      .single()

    if (error) {
      Alert.alert('Error', `Could not save profile: ${error.message}`)
      return
    }

    if (data) {
      setProfile(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >

      {/* Units toggle — first so user sets this before entering values */}
      <Text style={styles.sectionTitle}>Units</Text>
      <View style={styles.unitsRow}>
        <TouchableOpacity
          style={[styles.unitButton, units === 'metric' && styles.unitButtonActive]}
          onPress={() => handleUnitsChange('metric')}
          activeOpacity={0.7}
        >
          <Text style={[styles.unitButtonText, units === 'metric' && styles.unitButtonTextActive]}>
            Metric
          </Text>
          <Text style={[styles.unitSub, units === 'metric' && { color: COLORS.primary }]}>
            kg · cm · km
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.unitButton, units === 'imperial' && styles.unitButtonActive]}
          onPress={() => handleUnitsChange('imperial')}
          activeOpacity={0.7}
        >
          <Text style={[styles.unitButtonText, units === 'imperial' && styles.unitButtonTextActive]}>
            Imperial
          </Text>
          <Text style={[styles.unitSub, units === 'imperial' && { color: COLORS.primary }]}>
            lbs · ft/in · mi
          </Text>
        </TouchableOpacity>
      </View>

      {/* Identity */}
      <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>About you</Text>

      <Text style={styles.label}>Full name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Jamie Smith"
        placeholderTextColor={COLORS.textMuted}
      />

      <Text style={styles.label}>Age</Text>
      <TextInput
        style={styles.input}
        value={age}
        onChangeText={setAge}
        placeholder="25"
        placeholderTextColor={COLORS.textMuted}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Goal</Text>
      <TextInput
        style={styles.input}
        value={goal}
        onChangeText={setGoal}
        placeholder="e.g. Build muscle, Lose weight"
        placeholderTextColor={COLORS.textMuted}
      />

      {/* Stats */}
      <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>Body stats</Text>

      {/* Height */}
      <Text style={styles.label}>Height {units === 'imperial' ? '(ft / in)' : '(cm)'}</Text>
      {units === 'imperial' ? (
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: SPACING.sm }}>
            <TextInput
              style={styles.input}
              value={heightFt}
              onChangeText={handleHeightFtChange}
              placeholder="5"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              value={heightIn}
              onChangeText={handleHeightInChange}
              placeholder="7"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
            />
          </View>
        </View>
      ) : (
        <TextInput
          style={styles.input}
          value={heightCmDisplay}
          onChangeText={handleHeightCmChange}
          placeholder="175"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
        />
      )}

      {/* Weight */}
      <Text style={styles.label}>Weight ({units === 'imperial' ? 'lbs' : 'kg'})</Text>
      <TextInput
        style={styles.input}
        value={weightDisplay}
        onChangeText={handleWeightChange}
        placeholder={units === 'imperial' ? '154' : '70'}
        placeholderTextColor={COLORS.textMuted}
        keyboardType="numeric"
      />

      <TouchableOpacity
        style={[styles.button, saved && styles.buttonSaved]}
        onPress={saveProfile}
        activeOpacity={0.8}
      >
        <Text style={[styles.buttonText, saved && { color: COLORS.neonGreen }]}>
          {saved ? '✓ Saved' : 'Save Profile'}
        </Text>
      </TouchableOpacity>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
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
  },
  row: { flexDirection: 'row' },
  unitsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  unitButton: {
    flex: 1,
    ...CARD.default,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  unitButtonActive: {
    borderColor: COLORS.primary,
    ...SHADOWS.purple,
  },
  unitButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  unitButtonTextActive: {
    color: COLORS.primary,
  },
  unitSub: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 4,
    letterSpacing: 1,
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
  buttonSaved: { borderColor: COLORS.neonGreen },
  buttonText: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: FONT_SIZES.md,
    letterSpacing: 0.5,
  },
})
