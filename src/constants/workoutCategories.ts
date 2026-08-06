import { COLORS } from './theme';
import Ionicons from '@expo/vector-icons/Ionicons';

export const WORKOUT_CATEGORIES: { name: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { name: 'CHEST',     icon: 'body-outline',    color: COLORS.primary },
  { name: 'BACK',      icon: 'fitness-outline', color: COLORS.accent },
  { name: 'LEGS',      icon: 'walk-outline',    color: COLORS.neonGreen },
  { name: 'SHOULDERS', icon: 'barbell-outline', color: COLORS.neonBlue },
  { name: 'ARMS',      icon: 'flash-outline',   color: COLORS.neonYellow },
  { name: 'ABS',       icon: 'flame-outline',   color: COLORS.neonOrange },
];
