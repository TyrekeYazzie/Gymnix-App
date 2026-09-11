// FitnessApp Theme — Journal
// Inspired by: an open notebook page — warm cream paper, soft ink,
// a sage-green fountain pen for primary actions, a terracotta red
// pen for accents and warnings. Flat, quiet, easy to sit with.
//
// Two palettes: LIGHT_COLORS (the original "cream paper" look) and
// DARK_COLORS (night mode — same ink colors, lightened just enough to read
// on dark paper instead of cream). Screens that are theme-aware pull the
// active one via useTheme() (see src/context/ThemeContext.tsx) rather than
// importing a palette directly.
//
// COLORS/CARD/BUTTON/INPUT/SHADOWS below stay as plain LIGHT_COLORS-backed
// exports for the handful of pre-auth screens (login/signup/forgot-password/
// reset-password) — there's no profile, and therefore no dark-mode
// preference, to read before a user is signed in, so those always render in
// the light theme.

export const LIGHT_COLORS = {
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

// Night mode — same "fountain pen on paper" identity, dark espresso paper
// instead of cream, parchment ink instead of soft-black ink. Every accent
// hue keeps its light-theme counterpart's identity but is lightened enough
// to stay legible (and not eye-searing) against a dark background.
export const DARK_COLORS = {
  // ── BACKGROUNDS ──────────────────────────────────────────
  bgPrimary:        '#1c1815',   // page — deep warm espresso
  bgSecondary:      '#221d18',   // panel
  bgTertiary:       '#2a2420',   // well — inputs, tertiary surfaces
  bgElevated:       '#2f2921',   // sheet — raised card
  bgOverlay:        'rgba(0, 0, 0, 0.6)',

  // ── BORDERS ──────────────────────────────────────────────
  borderDefault:    '#3a332b',
  borderFocus:      '#7a9284',
  borderAccent:     '#c97b5c',

  // ── PRIMARY — SAGE INK ─────────────────────────────────────
  primary:          '#7a9284',   // lightened sage — legible on dark paper
  primaryLight:     '#9db3a5',
  primaryDark:      '#4a6b5a',
  primaryGlow:      'rgba(122, 146, 132, 0.18)',

  // ── ACCENT — RED PEN ───────────────────────────────────────
  accent:           '#c97b5c',   // lightened terracotta
  accentLight:      '#dba084',
  accentDark:       '#a8452f',
  accentGlow:       'rgba(201, 123, 92, 0.18)',

  // ── INK — SIGNAL COLORS ─────────────────────────────────
  neonGreen:        '#7fa88c',
  neonBlue:         '#7fa0bf',
  neonYellow:       '#d9b84f',
  neonOrange:       '#d18a5c',

  // ── TEXT ─────────────────────────────────────────────────
  textPrimary:      '#f0e9d8',   // warm parchment
  textSecondary:    '#bfb29c',
  textMuted:        '#7a6f5e',
  // NOT literally "inverse of textPrimary" — this sits on top of filled,
  // saturated buttons/badges (primary/accent/category colors), which stay
  // roughly as dark in both themes, so it stays light in both too. Flipping
  // it to a dark color here would make button/badge text disappear.
  textInverse:      '#f7f3e9',
  textAccent:       '#7a9284',
  textNeon:         '#7fa88c',

  // ── GAME UI ──────────────────────────────────────────────
  healthFull:       '#7fa88c',
  healthMid:        '#d9b84f',
  healthLow:        '#d18a5c',
  energyBar:        '#7fa0bf',
  expBar:           '#7a9284',
  bossBar:          '#c97b5c',

  // ── GRAPH / CHART ────────────────────────────────────────
  graphLine:        '#7a9284',
  graphFill:        'rgba(122, 146, 132, 0.14)',
  graphDot:         '#7fa0bf',
  graphDotToday:    '#c97b5c',
  graphGrid:        '#332c24',
  graphGoalLine:    '#d9b84f',
  graphAxisText:    '#7a6f5e',

  // ── CIRCLE PROGRESS ──────────────────────────────────────
  circleTrack:      '#332c24',
  circleFill:       '#7a9284',
  circleComplete:   '#7fa88c',
  circleOver:       '#c97b5c',

  // ── STATUS ───────────────────────────────────────────────
  success:          '#7fa88c',
  warning:          '#d9b84f',
  error:            '#c97b5c',
  info:             '#7fa0bf',

  // ── SPECIAL EFFECTS — soft tints, no glow ─────────────────
  glowAmber:        'rgba(122, 146, 132, 0.10)',
  glowCrimson:      'rgba(201, 123, 92, 0.10)',
  glowMint:         'rgba(127, 168, 140, 0.10)',
  glowBlue:         'rgba(127, 160, 191, 0.10)',
  pixelBorder:      '#7a9284',
  scanline:         'rgba(0, 0, 0, 0.08)',
}

export type Colors = typeof LIGHT_COLORS;

// ── TYPOGRAPHY ─────────────────────────────────────────────
// Unaffected by theme — type scale and weights don't change with dark mode.
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

// Loaded via useFonts in the root layout (see src/app/_layout.tsx) — used
// for the daily quote, which is meant to read as something other than the
// app's normal UI voice. Everything else stays on the system font.
export const FONT_FAMILIES = {
  quote:  'CormorantGaramond_500Medium_Italic',
  byline: 'Cinzel_600SemiBold',
}

// ── SPACING ────────────────────────────────────────────────
export const SPACING = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
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

// Derives the color-dependent style bundles (SHADOWS/CARD/BUTTON/INPUT) from
// a palette. Called once per palette below — not per render — so consumers
// just pick LIGHT_THEME or DARK_THEME rather than recomputing anything.
function buildDerivedStyles(colors: Colors, shadowColor: string) {
  const SHADOWS = {
    purple: {
      shadowColor,
      shadowOffset:  { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius:  8,
      elevation:     2,
    },
    crimson: {
      shadowColor,
      shadowOffset:  { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius:  8,
      elevation:     2,
    },
    green: {
      shadowColor,
      shadowOffset:  { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius:  6,
      elevation:     1,
    },
    subtle: {
      shadowColor,
      shadowOffset:  { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius:  4,
      elevation:     1,
    },
  }

  const CARD = {
    default: {
      backgroundColor: colors.bgElevated,
      borderColor:     colors.borderDefault,
      borderWidth:     1,
      borderRadius:    18,
      padding:         16,
    },
    glowing: {
      backgroundColor: colors.bgElevated,
      borderColor:     colors.primary,
      borderWidth:     1,
      borderRadius:    18,
      padding:         16,
      shadowColor,
      shadowOffset:    { width: 0, height: 3 },
      shadowOpacity:   0.08,
      shadowRadius:    8,
      elevation:       2,
    },
    danger: {
      backgroundColor: colors.bgSecondary,
      borderColor:     colors.accent,
      borderWidth:     1,
      borderRadius:    18,
      padding:         16,
    },
  }

  const BUTTON = {
    primary: {
      backgroundColor:   colors.primary,
      borderRadius:      10,
      paddingVertical:   14,
      paddingHorizontal: 24,
      alignItems:        'center' as const,
    },
    secondary: {
      backgroundColor:   'transparent',
      borderColor:       colors.primary,
      borderWidth:       1,
      borderRadius:      10,
      paddingVertical:   14,
      paddingHorizontal: 24,
      alignItems:        'center' as const,
    },
    danger: {
      backgroundColor:   colors.accent,
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

  const INPUT = {
    default: {
      backgroundColor: colors.bgSecondary,
      borderColor:     colors.borderDefault,
      borderWidth:     1,
      borderRadius:    10,
      padding:         14,
      color:           colors.textPrimary,
      fontSize:        14,
    },
    focused: {
      backgroundColor: colors.bgSecondary,
      borderColor:     colors.primary,
      borderWidth:     1,
      borderRadius:    10,
      padding:         14,
      color:           colors.textPrimary,
      fontSize:        14,
    },
  }

  return { SHADOWS, CARD, BUTTON, INPUT }
}

export const LIGHT_THEME = { colors: LIGHT_COLORS, ...buildDerivedStyles(LIGHT_COLORS, '#2b2620') }
export const DARK_THEME  = { colors: DARK_COLORS,  ...buildDerivedStyles(DARK_COLORS, '#000000') }

export type Theme = typeof LIGHT_THEME;

// ── STATIC (ALWAYS-LIGHT) EXPORTS ───────────────────────────
// Kept for the pre-auth screens (login/signup/forgot-password/
// reset-password) — there's no signed-in profile yet to read a dark-mode
// preference from, so those stay on the light theme and can keep importing
// these directly instead of going through useTheme().
export const COLORS = LIGHT_COLORS;
export const { SHADOWS, CARD, BUTTON, INPUT } = LIGHT_THEME;
