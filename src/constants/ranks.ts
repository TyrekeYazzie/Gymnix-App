import { COLORS } from './theme';
import Ionicons from '@expo/vector-icons/Ionicons';

// Gym-culture rank ladder, styled after arena/place names (Warm-Up Yard →
// Legends' Summit) rather than plain status words — each tier reads as a
// space you're standing in, escalating in scale as you climb. Colors ramp
// from muted to increasingly saturated, ending on gold (neonYellow) for the
// top rank only, so "Legends' Summit" reads as the one true prestige color.
export interface Rank {
  minLevel: number;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  description: string;
}

export const RANKS: Rank[] = [
  {
    minLevel: 0,
    name: 'WARM-UP YARD',
    icon: 'footsteps-outline',
    color: COLORS.textMuted,
    description: 'Everyone starts here. Show up and stretch it out.',
  },
  {
    minLevel: 2,
    name: 'IRON GYM',
    icon: 'barbell-outline',
    color: COLORS.textSecondary,
    description: 'First reps in the books.',
  },
  {
    minLevel: 4,
    name: 'THE GRIND HOUSE',
    icon: 'repeat-outline',
    color: COLORS.neonBlue,
    description: 'Consistency starts to compound.',
  },
  {
    minLevel: 6,
    name: 'BEAST DEN',
    icon: 'flame-outline',
    color: COLORS.neonGreen,
    description: 'The work gets serious.',
  },
  {
    minLevel: 9,
    name: 'POWERHOUSE PIT',
    icon: 'flash-outline',
    color: COLORS.primary,
    description: 'Strength becomes your identity.',
  },
  {
    minLevel: 12,
    name: "TITAN'S FORGE",
    icon: 'hammer-outline',
    color: COLORS.neonOrange,
    description: 'Where the dedicated are forged.',
  },
  {
    minLevel: 15,
    name: 'IRON COLOSSEUM',
    icon: 'shield-outline',
    color: COLORS.accent,
    description: 'Compete against who you were yesterday.',
  },
  {
    minLevel: 20,
    name: 'JUGGERNAUT STADIUM',
    icon: 'rocket-outline',
    color: COLORS.accentDark,
    description: "Unstoppable, and everyone can see it.",
  },
  {
    minLevel: 25,
    name: "LEGENDS' SUMMIT",
    icon: 'trophy-outline',
    color: COLORS.neonYellow,
    description: 'Rare air. Few ever stand here.',
  },
];

export function getRank(level: number): Rank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (level >= RANKS[i].minLevel) return RANKS[i];
  }
  return RANKS[0];
}

export function getRankIndex(level: number): number {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (level >= RANKS[i].minLevel) return i;
  }
  return 0;
}
