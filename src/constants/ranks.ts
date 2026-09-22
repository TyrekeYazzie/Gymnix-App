import { Colors } from './theme';
import Ionicons from '@expo/vector-icons/Ionicons';

// Gym-culture rank ladder, styled after arena/place names (Warm-Up Yard →
// Legends' Summit) rather than plain status words — each tier reads as a
// space you're standing in, escalating in scale as you climb. Colors ramp
// from muted to increasingly saturated, ending on gold (neonYellow) for the
// top rank only, so "Legends' Summit" reads as the one true prestige color.
//
// Tiers store a palette key rather than a hex so the color follows the
// active theme — resolve them with getRanks(colors)/getRank(level, colors).
export interface RankTier {
  minLevel: number;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  colorKey: keyof Colors;
  description: string;
}

export interface Rank extends RankTier {
  color: string;
}

export const RANKS: RankTier[] = [
  {
    minLevel: 0,
    name: 'WARM-UP YARD',
    icon: 'footsteps-outline',
    colorKey: 'textMuted',
    description: 'Everyone starts here. Show up and stretch it out.',
  },
  {
    minLevel: 2,
    name: 'IRON GYM',
    icon: 'barbell-outline',
    colorKey: 'textSecondary',
    description: 'First reps in the books.',
  },
  {
    minLevel: 4,
    name: 'THE GRIND HOUSE',
    icon: 'repeat-outline',
    colorKey: 'neonBlue',
    description: 'Consistency starts to compound.',
  },
  {
    minLevel: 6,
    name: 'BEAST DEN',
    icon: 'flame-outline',
    colorKey: 'neonGreen',
    description: 'The work gets serious.',
  },
  {
    minLevel: 9,
    name: 'POWERHOUSE PIT',
    icon: 'flash-outline',
    colorKey: 'primary',
    description: 'Strength becomes your identity.',
  },
  {
    minLevel: 12,
    name: "TITAN'S FORGE",
    icon: 'hammer-outline',
    colorKey: 'neonOrange',
    description: 'Where the dedicated are forged.',
  },
  {
    minLevel: 15,
    name: 'IRON COLOSSEUM',
    icon: 'shield-outline',
    colorKey: 'accent',
    description: 'Compete against who you were yesterday.',
  },
  {
    minLevel: 20,
    name: 'JUGGERNAUT STADIUM',
    icon: 'rocket-outline',
    colorKey: 'accentDark',
    description: "Unstoppable, and everyone can see it.",
  },
  {
    minLevel: 25,
    name: "LEGENDS' SUMMIT",
    icon: 'trophy-outline',
    colorKey: 'neonYellow',
    description: 'Rare air. Few ever stand here.',
  },
];

export function getRanks(colors: Colors): Rank[] {
  return RANKS.map((tier) => ({ ...tier, color: colors[tier.colorKey] }));
}

export function getRank(level: number, colors: Colors): Rank {
  const tier = RANKS[getRankIndex(level)];
  return { ...tier, color: colors[tier.colorKey] };
}

export function getRankIndex(level: number): number {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (level >= RANKS[i].minLevel) return i;
  }
  return 0;
}
