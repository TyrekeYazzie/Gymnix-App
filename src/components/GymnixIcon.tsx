import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { GYMNIX_ICONS, GymnixIconName } from '@/constants/gymnixIcons';

interface Props {
  name: GymnixIconName;
  size?: number;
  color: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

// Drop-in for the Ionicons glyphs the app's own concepts used (tabs, log
// types, cardio, meals, progress): same size/color props, drawn from
// constants/gymnixIcons.ts.
export default function GymnixIcon({ name, size = 24, color, strokeWidth = 2, style }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {GYMNIX_ICONS[name].map((d, i) => <Path key={i} d={d} />)}
    </Svg>
  );
}
