import { COLORS } from './theme';

export const RANKS = [
  { minLevel: 0,  name: 'ROOKIE',    color: COLORS.textSecondary },
  { minLevel: 2,  name: 'TRAINEE',   color: COLORS.neonBlue },
  { minLevel: 4,  name: 'ATHLETE',   color: COLORS.neonGreen },
  { minLevel: 6,  name: 'WARRIOR',   color: COLORS.neonYellow },
  { minLevel: 9,  name: 'CONTENDER', color: COLORS.primary },
  { minLevel: 12, name: 'CHAMPION',  color: COLORS.primaryLight },
  { minLevel: 15, name: 'ELITE',     color: COLORS.accent },
  { minLevel: 20, name: 'LEGEND',    color: COLORS.accentLight },
  { minLevel: 25, name: 'IMMORTAL',  color: COLORS.neonBlue },
];

export function getRank(level: number) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (level >= RANKS[i].minLevel) return RANKS[i];
  }
  return RANKS[0];
}
