// FitnessApp Theme — Journal
// Inspired by: an open notebook page — warm cream paper, soft ink,
// a sage-green fountain pen for primary actions, a terracotta red
// pen for accents and warnings. Flat, quiet, easy to sit with.

export const COLORS = {
  // ── BACKGROUNDS ──────────────────────────────────────────
  bgPrimary:        '#f7f3e9',   // page — warm cream
  bgSecondary:      '#fbf8f1',   // panel — lighter cream
  bgTertiary:       '#efe8d8',   // well — inputs, tertiary surfaces
  bgElevated:       '#fffdf8',   // sheet — raised card, near-white
  bgOverlay:        'rgba(43, 38, 32, 0.45)',  // soft ink wash for modals

  // ── BORDERS ──────────────────────────────────────────────
  borderDefault:    '#e0d8c3',   // faint rule line
  borderFocus:      '#4a6b5a',   // sage ink — active state
  borderAccent:     '#a8452f',   // red pen accent

  // ── PRIMARY — SAGE INK ─────────────────────────────────────
  primary:          '#4a6b5a',   // fountain-pen sage
  primaryLight:     '#7a9284',   // faded sage
  primaryDark:      '#33493d',   // deep sage
  primaryGlow:      'rgba(74, 107, 90, 0.14)',

  // ── ACCENT — RED PEN ───────────────────────────────────────
  accent:           '#a8452f',   // terracotta / red pen
  accentLight:      '#c97b5c',   // faded terracotta
  accentDark:       '#7a3220',   // deep terracotta
  accentGlow:       'rgba(168, 69, 47, 0.14)',

  // ── INK — SIGNAL COLORS ─────────────────────────────────
  neonGreen:        '#5b8266',   // sage green — success
  neonBlue:         '#5b7c99',   // dusty blue — info
  neonYellow:       '#c9a227',   // mustard highlighter — warning
  neonOrange:       '#c1703f',   // warm rust — alert

  // ── TEXT ─────────────────────────────────────────────────
  textPrimary:      '#2b2620',   // soft ink black
  textSecondary:    '#6b5f4f',   // warm brown-grey
  textMuted:        '#a89b85',   // faded pencil
  textInverse:      '#f7f3e9',   // cream, for filled buttons
  textAccent:       '#4a6b5a',
  textNeon:         '#5b8266',

  // ── GAME UI ──────────────────────────────────────────────
  healthFull:       '#5b8266',
  healthMid:        '#c9a227',
  healthLow:        '#c1703f',
  energyBar:        '#5b7c99',
  expBar:           '#4a6b5a',
  bossBar:          '#a8452f',

  // ── GRAPH / CHART ────────────────────────────────────────
  graphLine:        '#4a6b5a',
  graphFill:        'rgba(74, 107, 90, 0.10)',
  graphDot:         '#5b7c99',
  graphDotToday:    '#a8452f',
  graphGrid:        '#e8e0cd',
  graphGoalLine:    '#c9a227',
  graphAxisText:    '#a89b85',

  // ── CIRCLE PROGRESS ──────────────────────────────────────
  circleTrack:      '#e8e0cd',
  circleFill:       '#4a6b5a',
  circleComplete:   '#5b8266',
  circleOver:       '#a8452f',

  // ── STATUS ───────────────────────────────────────────────
  success:          '#5b8266',
  warning:          '#c9a227',
  error:            '#a8452f',
  info:             '#5b7c99',

  // ── SPECIAL EFFECTS — soft tints, no glow ─────────────────
  glowAmber:        'rgba(74, 107, 90, 0.10)',
  glowCrimson:      'rgba(168, 69, 47, 0.10)',
  glowMint:         'rgba(91, 130, 102, 0.10)',
  glowBlue:         'rgba(91, 124, 153, 0.10)',
  pixelBorder:      '#4a6b5a',
  scanline:         'rgba(43, 38, 32, 0.04)',
}

// ── TYPOGRAPHY ─────────────────────────────────────────────
export const FONT_SIZES = {
  xs:   10,
  sm:   12,
  md:   14,
  lg:   16,
  xl:   20,
  xxl:  28,
  xxxl: 36,
  hero: 48,
}

export const FONT_WEIGHTS = {
  regular:  '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
  black:    '900' as const,
}

// ── SPACING ────────────────────────────────────────────────
export const SPACING = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   10,
  xxl:  10,
  xxxl: 48,
}

// ── BORDER RADIUS — softer, paper-card corners ──────────────
export const RADIUS = {
  none: 0,
  xs:   6,
  sm:   10,
  md:   14,
  lg:   18,
  xl:   26,
  full: 999,
}

// ── SHADOWS — flat and soft, like paper on a desk ───────────
export const SHADOWS = {
  purple: {
    shadowColor:   '#2b2620',
    shadowOffset:  { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius:  8,
    elevation:     2,
  },
  crimson: {
    shadowColor:   '#2b2620',
    shadowOffset:  { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius:  8,
    elevation:     2,
  },
  green: {
    shadowColor:   '#2b2620',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius:  6,
    elevation:     1,
  },
  subtle: {
    shadowColor:   '#2b2620',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius:  4,
    elevation:     1,
  },
}

// ── CARD STYLES ────────────────────────────────────────────
export const CARD = {
  default: {
    backgroundColor: '#fffdf8',
    borderColor:     '#e0d8c3',
    borderWidth:     1,
    borderRadius:    18,
    padding:         16,
  },
  glowing: {
    backgroundColor: '#fffdf8',
    borderColor:     '#4a6b5a',
    borderWidth:     1,
    borderRadius:    18,
    padding:         16,
    shadowColor:     '#2b2620',
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.08,
    shadowRadius:    8,
    elevation:       2,
  },
  danger: {
    backgroundColor: '#fdf3ee',
    borderColor:     '#a8452f',
    borderWidth:     1,
    borderRadius:    18,
    padding:         16,
  },
}

// ── BUTTON STYLES ──────────────────────────────────────────
export const BUTTON = {
  primary: {
    backgroundColor:   '#4a6b5a',
    borderRadius:      10,
    paddingVertical:   14,
    paddingHorizontal: 24,
    alignItems:        'center' as const,
  },
  secondary: {
    backgroundColor:   'transparent',
    borderColor:       '#4a6b5a',
    borderWidth:       1,
    borderRadius:      10,
    paddingVertical:   14,
    paddingHorizontal: 24,
    alignItems:        'center' as const,
  },
  danger: {
    backgroundColor:   '#a8452f',
    borderRadius:      10,
    paddingVertical:   14,
    paddingHorizontal: 24,
    alignItems:        'center' as const,
  },
  ghost: {
    backgroundColor:   'transparent',
    borderRadius:      10,
    paddingVertical:   14,
    paddingHorizontal: 24,
    alignItems:        'center' as const,
  },
}

// ── INPUT STYLES ───────────────────────────────────────────
export const INPUT = {
  default: {
    backgroundColor: '#fbf8f1',
    borderColor:     '#e0d8c3',
    borderWidth:     1,
    borderRadius:    10,
    padding:         14,
    color:           '#2b2620',
    fontSize:        14,
  },
  focused: {
    backgroundColor: '#fbf8f1',
    borderColor:     '#4a6b5a',
    borderWidth:     1,
    borderRadius:    10,
    padding:         14,
    color:           '#2b2620',
    fontSize:        14,
  },
}
