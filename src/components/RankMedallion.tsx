import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Rank } from '@/constants/ranks';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  rank: Rank;
  size?: number;
  /** Rank not yet reached — renders greyed out with a small lock badge. */
  locked?: boolean;
  /** Slightly thicker ring, used to mark the user's current rank in a strip of medallions. */
  emphasized?: boolean;
}

const TICK_COUNT = 16;
const CENTER = 50;
const OUTER_R = 40;
const INNER_R = 34;
const TICK_INNER_R = 44;
const TICK_OUTER_R = 48;

// A wax-seal / medallion badge: an embossed double ring with radial tick
// marks (like a stamped seal or a dial), and the rank's icon centered on
// top. One consistent shape for every rank — only the color and icon
// change — so climbing ranks reads as "the same seal, more prestigious ink"
// rather than a totally different bespoke illustration each time.
export default function RankMedallion({ rank, size = 64, locked = false, emphasized = false }: Props) {
  const { theme: { colors } } = useTheme();
  const color = locked ? colors.borderDefault : rank.color;

  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const angle = (i / TICK_COUNT) * 2 * Math.PI;
    return {
      x1: CENTER + TICK_INNER_R * Math.cos(angle),
      y1: CENTER + TICK_INNER_R * Math.sin(angle),
      x2: CENTER + TICK_OUTER_R * Math.cos(angle),
      y2: CENTER + TICK_OUTER_R * Math.sin(angle),
    };
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {ticks.map((t, i) => (
          <Line
            key={i}
            x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={color}
            strokeWidth={1.5}
            opacity={locked ? 0.3 : 0.45}
          />
        ))}
        <Circle
          cx={CENTER} cy={CENTER} r={OUTER_R}
          fill={colors.bgElevated}
          stroke={color}
          strokeWidth={emphasized ? 4 : 3}
        />
        <Circle
          cx={CENTER} cy={CENTER} r={INNER_R}
          fill="none"
          stroke={color}
          strokeWidth={1}
          opacity={locked ? 0.3 : 0.5}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.iconWrap]} pointerEvents="none">
        <Ionicons name={rank.icon} size={size * 0.36} color={color} />
      </View>
      {locked && (
        <View style={[styles.lockBadge, { backgroundColor: colors.bgElevated, borderColor: colors.borderDefault }]}>
          <Ionicons name="lock-closed" size={Math.max(size * 0.18, 11)} color={colors.textMuted} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  lockBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderRadius: 999,
    padding: 3,
    borderWidth: 1,
  },
});
