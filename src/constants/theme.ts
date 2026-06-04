// FitnessApp Theme — Retro Vintage Anime
// Inspired by: Cowboy Bebop — jazz noir, faded neon, deep space,
// cigarette smoke, rust and chrome, analog warmth, bounty hunter grit

export const COLORS = {
  // ── BACKGROUNDS ──────────────────────────────────────────
  // Deep space and smoky jazz bar blacks
  bgPrimary:        '#0d0d14',   // deep space void
  bgSecondary:      '#13131f',   // smoke-filled bar
  bgTertiary:       '#1c1c2e',   // dark indigo shadow
  bgElevated:       '#242438',   // raised panel — ship console
  bgOverlay:        'rgba(13, 13, 20, 0.88)', // noir overlay

  // ── BORDERS ──────────────────────────────────────────────
  borderDefault:    '#2e2e45',   // faded hull metal
  borderFocus:      '#e8a030',   // warm amber glow
  borderAccent:     '#c0392b',   // rust red danger

  // ── PRIMARY — BEBOP AMBER / GOLD ─────────────────────────
  // Warm jazz lights, analog warmth, Ein's collar
  primary:          '#e8a030',   // bebop amber
  primaryLight:     '#f0bc60',   // warm gold
  primaryDark:      '#b07820',   // burnt brass
  primaryGlow:      'rgba(232, 160, 48, 0.22)', // amber haze

  // ── ACCENT — FAYE CRIMSON ────────────────────────────────
  // Faye Valentine's red jacket, danger, heat
  accent:           '#c0392b',   // faye crimson
  accentLight:      '#e05a4e',   // faded rust
  accentDark:       '#922b21',   // deep blood rust
  accentGlow:       'rgba(192, 57, 43, 0.25)', // crimson smoke

  // ── NEON — FADED SIGN GLOW ───────────────────────────────
  // Old neon bar signs half broken, flickering
  neonGreen:        '#4ecb8d',   // faded mint — success
  neonBlue:         '#5b9bd5',   // hazy cerulean — info
  neonYellow:       '#f5d76e',   // nicotine gold — warning
  neonOrange:       '#e67e22',   // ember glow — alert

  // ── TEXT ─────────────────────────────────────────────────
  textPrimary:      '#ede8d8',   // aged paper white
  textSecondary:    '#8c8a7a',   // smoke grey
  textMuted:        '#4a4858',   // faded ink
  textInverse:      '#0d0d14',   // dark on light
  textAccent:       '#e8a030',   // amber highlight
  textNeon:         '#4ecb8d',   // mint score text

  // ── GAME UI ──────────────────────────────────────────────
  // Bebop bounty board stats and health
  healthFull:       '#4ecb8d',   // mint full health
  healthMid:        '#f5d76e',   // gold mid health
  healthLow:        '#c0392b',   // rust low health
  energyBar:        '#5b9bd5',   // hazy blue energy
  expBar:           '#e8a030',   // amber exp bar
  bossBar:          '#c0392b',   // crimson boss bar

  // ── GRAPH / CHART ────────────────────────────────────────
  graphLine:        '#e8a030',   // amber line
  graphFill:        'rgba(232, 160, 48, 0.10)', // warm fill
  graphDot:         '#c0392b',   // rust dot
  graphDotToday:    '#4ecb8d',   // mint today
  graphGrid:        '#1c1c2e',   // barely visible grid
  graphGoalLine:    '#c0392b',   // rust goal line
  graphAxisText:    '#4a4858',   // faded axis

  // ── CIRCLE PROGRESS ──────────────────────────────────────
  circleTrack:      '#2e2e45',   // empty ring
  circleFill:       '#e8a030',   // amber progress
  circleComplete:   '#4ecb8d',   // mint complete
  circleOver:       '#c0392b',   // rust over goal

  // ── STATUS ───────────────────────────────────────────────
  success:          '#4ecb8d',   // mint victory
  warning:          '#f5d76e',   // gold caution
  error:            '#c0392b',   // rust failure
  info:             '#5b9bd5',   // hazy blue hint

  // ── SPECIAL EFFECTS ──────────────────────────────────────
  glowAmber:        'rgba(232, 160, 48, 0.4)',
  glowCrimson:      'rgba(192, 57, 43, 0.4)',
  glowMint:         'rgba(78, 203, 141, 0.4)',
  glowBlue:         'rgba(91, 155, 213, 0.4)',
  pixelBorder:      '#e8a030',   // amber retro border
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
    shadowColor:   '#e8a030',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius:  8,
    elevation:     6,
  },
  crimson: {
    shadowColor:   '#c0392b',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius:  8,
    elevation:     6,
  },
  green: {
    shadowColor:   '#4ecb8d',
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
    backgroundColor:  '#13131f',
    borderColor:      '#2e2e45',
    borderWidth:      1,
    borderRadius:     12,
    padding:          16,
  },
  glowing: {
    backgroundColor:  '#13131f',
    borderColor:      '#e8a030',
    borderWidth:      1,
    borderRadius:     12,
    padding:          16,
    shadowColor:      '#e8a030',
    shadowOffset:     { width: 0, height: 0 },
    shadowOpacity:    0.35,
    shadowRadius:     8,
    elevation:        6,
  },
  danger: {
    backgroundColor:  '#1a1014',
    borderColor:      '#c0392b',
    borderWidth:      1,
    borderRadius:     12,
    padding:          16,
  },
}

// ── BUTTON STYLES ──────────────────────────────────────────
export const BUTTON = {
  primary: {
    backgroundColor:  '#e8a030',
    borderRadius:     10,
    paddingVertical:  14,
    paddingHorizontal: 24,
    alignItems:       'center' as const,
  },
  secondary: {
    backgroundColor:  'transparent',
    borderColor:      '#e8a030',
    borderWidth:      1,
    borderRadius:     10,
    paddingVertical:  14,
    paddingHorizontal: 24,
    alignItems:       'center' as const,
  },
  danger: {
    backgroundColor:  '#c0392b',
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
    backgroundColor:  '#1c1c2e',
    borderColor:      '#2e2e45',
    borderWidth:      1,
    borderRadius:     10,
    padding:          14,
    color:            '#ede8d8',
    fontSize:         16,
  },
  focused: {
    backgroundColor:  '#1c1c2e',
    borderColor:      '#e8a030',
    borderWidth:      1,
    borderRadius:     10,
    padding:          14,
    color:            '#ede8d8',
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