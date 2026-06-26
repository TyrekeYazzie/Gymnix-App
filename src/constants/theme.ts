// FitnessApp Theme — Dark Deco Outrun
// Inspired by: Streamline Moderne / Gotham noir architecture, glowing
// geometric window panes, 1940s film-noir shadow, 80s synthwave twilight,
// and Hiroshi Nagai–style City Pop album art — a vintage sports car
// parked outside a sleek mansion above a glittering city grid at dusk

export const COLORS = {
  // ── BACKGROUNDS ──────────────────────────────────────────
  // Gotham noir navy, near-black with a cool violet undertone
  bgPrimary:        '#07060f',   // noir void
  bgSecondary:      '#0f0d1f',   // dusk interior
  bgTertiary:       '#181530',   // deco shadow
  bgElevated:       '#221d42',   // raised panel — penthouse glass
  bgOverlay:        'rgba(7, 6, 15, 0.88)', // noir overlay

  // ── BORDERS ──────────────────────────────────────────────
  borderDefault:    '#2c2750',   // dark architectural line
  borderFocus:      '#f2941c',   // glowing amber window pane
  borderAccent:     '#38bdf8',   // city-grid cyan

  // ── PRIMARY — DECO AMBER ──────────────────────────────────
  // Glowing geometric window panes, neon sign gold, chrome trim
  primary:          '#f2941c',   // deco amber
  primaryLight:     '#ffc66d',   // warm gold glow
  primaryDark:      '#b9790f',   // burnished brass
  primaryGlow:      'rgba(245, 166, 35, 0.25)', // amber haze

  // ── ACCENT — TWILIGHT MAGENTA ─────────────────────────────
  // Horizon glow, taillights, danger
  accent:           '#e619c9',   // twilight magenta
  accentLight:      '#ec8ef7',   // orchid glow
  accentDark:       '#a21caf',   // deep violet
  accentGlow:       'rgba(217, 70, 239, 0.25)', // magenta haze

  // ── NEON — CITY GRID GLOW ─────────────────────────────────
  neonGreen:        '#2dd4bf',   // teal mint — success
  neonBlue:         '#38bdf8',   // electric cyan — info / city grid
  neonYellow:       '#fbbf24',   // gold — warning / window light
  neonOrange:       '#fb7185',   // sunset rose — alert

  // ── TEXT ─────────────────────────────────────────────────
  textPrimary:      '#f3eee0',   // warm deco ivory
  textSecondary:    '#a89cc8',   // muted lavender grey
  textMuted:        '#5b5380',   // faded violet ink
  textInverse:      '#07060f',   // dark on light
  textAccent:       '#f2941c',   // amber highlight
  textNeon:         '#2dd4bf',   // teal score text

  // ── GAME UI ──────────────────────────────────────────────
  healthFull:       '#2dd4bf',   // teal full health
  healthMid:        '#fbbf24',   // gold mid health
  healthLow:        '#e619c9',   // magenta low health
  energyBar:        '#38bdf8',   // cyan energy
  expBar:           '#f2941c',   // amber exp bar
  bossBar:          '#e619c9',   // magenta boss bar

  // ── GRAPH / CHART ────────────────────────────────────────
  graphLine:        '#f2941c',   // amber line
  graphFill:        'rgba(245, 166, 35, 0.10)', // amber fill
  graphDot:         '#38bdf8',   // cyan dot
  graphDotToday:    '#2dd4bf',   // teal today
  graphGrid:        '#181530',   // barely visible grid
  graphGoalLine:    '#e619c9',   // magenta goal line
  graphAxisText:    '#5b5380',   // faded axis

  // ── CIRCLE PROGRESS ──────────────────────────────────────
  circleTrack:      '#2c2750',   // empty ring
  circleFill:       '#f2941c',   // amber progress
  circleComplete:   '#2dd4bf',   // teal complete
  circleOver:       '#e619c9',   // magenta over goal

  // ── STATUS ───────────────────────────────────────────────
  success:          '#2dd4bf',   // teal victory
  warning:          '#fbbf24',   // gold caution
  error:            '#e619c9',   // magenta failure
  info:             '#38bdf8',   // cyan hint

  // ── SPECIAL EFFECTS ──────────────────────────────────────
  glowAmber:        'rgba(245, 166, 35, 0.4)',
  glowCrimson:      'rgba(217, 70, 239, 0.4)',
  glowMint:         'rgba(45, 212, 191, 0.4)',
  glowBlue:         'rgba(56, 189, 248, 0.4)',
  pixelBorder:      '#f2941c',   // amber retro border
  scanline:         'rgba(0, 0, 0, 0.12)', // analog scanline
}

// ── TYPOGRAPHY ─────────────────────────────────────────────
export const FONT_SIZES = {
  xs:     10,
  sm:     12,
  md:     14,
  lg:     16,
  xl:     20,
  xxl:    28,
  xxxl:   36,
  hero:   48,
}

export const FONT_WEIGHTS = {
  regular:    '400' as const,
  medium:     '500' as const,
  semibold:   '600' as const,
  bold:       '700' as const,
  black:      '900' as const,
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

// ── BORDER RADIUS ──────────────────────────────────────────
export const RADIUS = {
  none:   0,
  xs:     4,
  sm:     8,
  md:     12,
  lg:     16,
  xl:     24,
  full:   999,
}

// ── SHADOWS ────────────────────────────────────────────────
export const SHADOWS = {
  purple: {
    shadowColor:   '#f2941c',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius:  8,
    elevation:     6,
  },
  crimson: {
    shadowColor:   '#e619c9',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius:  8,
    elevation:     6,
  },
  green: {
    shadowColor:   '#2dd4bf',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius:  8,
    elevation:     6,
  },
  subtle: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius:  4,
    elevation:     4,
  },
}

// ── CARD STYLES ────────────────────────────────────────────
export const CARD = {
  default: {
    backgroundColor:  '#0f0d1f',
    borderColor:      '#2c2750',
    borderWidth:      1,
    borderRadius:     12,
    padding:          16,
  },
  glowing: {
    backgroundColor:  '#0f0d1f',
    borderColor:      '#f2941c',
    borderWidth:      1,
    borderRadius:     12,
    padding:          16,
    shadowColor:      '#f2941c',
    shadowOffset:     { width: 0, height: 0 },
    shadowOpacity:    0.35,
    shadowRadius:     8,
    elevation:        6,
  },
  danger: {
    backgroundColor:  '#160a1c',
    borderColor:      '#e619c9',
    borderWidth:      1,
    borderRadius:     12,
    padding:          16,
  },
}

// ── BUTTON STYLES ──────────────────────────────────────────
export const BUTTON = {
  primary: {
    backgroundColor:  '#f2941c',
    borderRadius:     10,
    paddingVertical:  14,
    paddingHorizontal: 24,
    alignItems:       'center' as const,
  },
  secondary: {
    backgroundColor:  'transparent',
    borderColor:      '#f2941c',
    borderWidth:      1,
    borderRadius:     10,
    paddingVertical:  14,
    paddingHorizontal: 24,
    alignItems:       'center' as const,
  },
  danger: {
    backgroundColor:  '#e619c9',
    borderRadius:     10,
    paddingVertical:  14,
    paddingHorizontal: 24,
    alignItems:       'center' as const,
  },
  ghost: {
    backgroundColor:  'transparent',
    borderRadius:     10,
    paddingVertical:  14,
    paddingHorizontal: 24,
    alignItems:       'center' as const,
  },
}

// ── INPUT STYLES ───────────────────────────────────────────
export const INPUT = {
  default: {
    backgroundColor:  '#181530',
    borderColor:      '#2c2750',
    borderWidth:      1,
    borderRadius:     10,
    padding:          14,
    color:            '#f3eee0',
    fontSize:         16,
  },
  focused: {
    backgroundColor:  '#181530',
    borderColor:      '#f2941c',
    borderWidth:      1,
    borderRadius:     10,
    padding:          14,
    color:            '#f3eee0',
    fontSize:         16,
  },
}

// ── THEME OBJECT ───────────────────────────────────────────
export const theme = {
  colors:     COLORS,
  fontSize:   FONT_SIZES,
  fontWeight: FONT_WEIGHTS,
  spacing:    SPACING,
  radius:     RADIUS,
  shadows:    SHADOWS,
  card:       CARD,
  button:     BUTTON,
  input:      INPUT,
}

export default theme
