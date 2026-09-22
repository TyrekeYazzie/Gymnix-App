import { Colors } from './theme';
import Ionicons from '@expo/vector-icons/Ionicons';

export type WorkoutCategory = { name: string; icon: keyof typeof Ionicons.glyphMap; color: string };

// Takes the active palette (from useTheme) so category chips/icons pick up
// the night-mode inks too — call it inside a useMemo keyed on colors.
export function getWorkoutCategories(colors: Colors): WorkoutCategory[] {
  return [
    { name: 'CHEST',     icon: 'body-outline',    color: colors.primary },
    { name: 'BACK',      icon: 'fitness-outline', color: colors.accent },
    { name: 'LEGS',      icon: 'walk-outline',    color: colors.neonGreen },
    { name: 'SHOULDERS', icon: 'barbell-outline', color: colors.neonBlue },
    { name: 'ARMS',      icon: 'flash-outline',   color: colors.neonYellow },
    { name: 'ABS',       icon: 'flame-outline',   color: colors.neonOrange },
  ];
}
