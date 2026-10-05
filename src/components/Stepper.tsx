import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS, RADIUS, Theme } from '@/constants/theme';

// A −/+ stepper with a tap-to-type-directly center value, generalizing the
// same pattern template-editor.tsx already uses inline for target
// sets/reps (plus NumberWheel's tap-to-edit) — but without a scrollable
// wheel, which is fiddly to grab accurately when it's nested inside a
// modal's own vertically-scrolling sheet (two gesture areas fighting for
// the same vertical drag). One clear numeric value plus two big buttons is
// easier to hit precisely and to reason about while scrolling past it.
interface Props {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Decimal places the value is rounded/displayed to. 0 = whole numbers only. */
  decimals?: number;
  accentColor?: string;
  suffix?: string;
  width?: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function roundTo(v: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

export default function Stepper({
  value, onChange, min, max, step = 1, decimals = 0, accentColor, suffix, width = 150,
}: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const color = accentColor ?? colors.primary;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  // Starts the draft genuinely empty (not a literal "0" character) so
  // there's nothing to delete before typing — a faint "0" placeholder
  // hints at it instead. Blurring/submitting without typing anything
  // leaves the value unchanged (empty parses to NaN, which commitEdit
  // ignores) rather than zeroing it out.
  const startEditing = () => {
    setDraft('');
    setEditing(true);
  };

  const commitEdit = () => {
    const num = decimals > 0 ? parseFloat(draft) : parseInt(draft, 10);
    if (!isNaN(num)) onChange(clamp(roundTo(num, decimals), min, max));
    setEditing(false);
    Keyboard.dismiss();
  };

  const bump = (dir: 1 | -1) => onChange(clamp(roundTo(value + dir * step, decimals), min, max));

  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View style={[styles.wrap, { width }]}>
      <TouchableOpacity
        onPress={() => bump(-1)}
        style={[styles.btn, { borderColor: color }, atMin && styles.btnDisabled]}
        activeOpacity={0.7}
        disabled={atMin}
        accessibilityRole="button"
        accessibilityLabel={`Decrease${suffix ? ' ' + suffix : ''}`}
        accessibilityState={{ disabled: atMin }}
      >
        <Text style={[styles.btnText, { color }]}>−</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={startEditing} style={styles.valueWrap} activeOpacity={0.7}>
        {editing ? (
          <TextInput
            style={[styles.input, { color }]}
            value={draft}
            onChangeText={(t) => setDraft(t.replace(decimals > 0 ? /[^0-9.]/g : /[^0-9]/g, ''))}
            onBlur={commitEdit}
            onSubmitEditing={commitEdit}
            keyboardType={decimals > 0 ? 'decimal-pad' : 'number-pad'}
            returnKeyType="done"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            autoFocus
            maxLength={6}
          />
        ) : (
          <>
            <Text style={[styles.valueText, { color }]}>{value.toFixed(decimals)}</Text>
            {suffix && <Text style={styles.suffixText}>{suffix}</Text>}
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => bump(1)}
        style={[styles.btn, { borderColor: color }, atMax && styles.btnDisabled]}
        activeOpacity={0.7}
        disabled={atMax}
        accessibilityRole="button"
        accessibilityLabel={`Increase${suffix ? ' ' + suffix : ''}`}
        accessibilityState={{ disabled: atMax }}
      >
        <Text style={[styles.btnText, { color }]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors } = theme;
  return StyleSheet.create({
  // Centered: a fixed-width control on a full-width sheet looked pushed to the left.
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'center' },
  btn: {
    width: 38, height: 38, borderRadius: RADIUS.full, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.3 },
  btnText: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, lineHeight: FONT_SIZES.xl },
  valueWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  valueText: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.black },
  suffixText: { fontSize: FONT_SIZES.xs, color: colors.textMuted, marginTop: 2 },
  input: {
    fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.black, textAlign: 'center',
    minWidth: 70, padding: 0,
  },
  });
}
