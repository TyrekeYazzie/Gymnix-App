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
  textOnOverlay:    '#f7f3e9',   // over photos, modal washes, the + button
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

  // ── GLASS (tab bar, + button, quick-log orbs) ───────────────
  glassHighlight:   'rgba(255, 255, 255, 0.55)',
  glassBorder:      'rgba(255, 255, 255, 0.6)',
}

// Night mode — same "fountain pen on paper" identity, dark espresso paper
// instead of cream, parchment ink instead of soft-black ink. Tuned for
// low-light reading: body text sits around 11:1 on the page (instead of a
// glaring ~15:1), accents are desaturated so nothing "glows", and muted text
// stays above 4:1 so it's still readable rather than just dim.
export const DARK_COLORS = {
  // ── BACKGROUNDS ──────────────────────────────────────────
  bgPrimary:        '#1b1815',   // page — deep warm espresso
  bgSecondary:      '#201c18',   // panel
  bgTertiary:       '#2a2520',   // well — inputs, tertiary surfaces
  bgElevated:       '#26211c',   // sheet — raised card
  bgOverlay:        'rgba(0, 0, 0, 0.6)',

  // ── BORDERS ──────────────────────────────────────────────
  borderDefault:    '#36302a',
  borderFocus:      '#7f9888',
  borderAccent:     '#c08264',

  // ── PRIMARY — SAGE INK ─────────────────────────────────────
  primary:          '#7f9888',   // soft sage — legible on dark paper
  primaryLight:     '#9fb2a5',
  primaryDark:      '#4a6b5a',
  primaryGlow:      'rgba(127, 152, 136, 0.16)',

  // ── ACCENT — RED PEN ───────────────────────────────────────
  accent:           '#c08264',   // soft terracotta
  accentLight:      '#d4a287',
  accentDark:       '#b0664c',
  accentGlow:       'rgba(192, 130, 100, 0.16)',

  // ── INK — SIGNAL COLORS ─────────────────────────────────
  neonGreen:        '#83a28c',
  neonBlue:         '#8098b0',
  neonYellow:       '#c4a85e',
  neonOrange:       '#c08f6a',

  // ── TEXT ─────────────────────────────────────────────────
  textPrimary:      '#d9cfbc',   // soft parchment — not bright white
  textSecondary:    '#a89c88',
  textMuted:        '#877c6b',
  // Text/icons ON filled buttons, chips and badges (primary/accent/category
  // fills). Those fills are light-ish sage/terracotta at night, so the ink
  // goes dark here — cream on them was only ~2.7:1, espresso is ~5.6:1.
  // Anything drawn over a photo, modal wash or the dark + button uses
  // textOnOverlay instead, which stays light in both themes.
  textInverse:      '#1b1815',
  textOnOverlay:    '#f3ecdd',
  textAccent:       '#7f9888',
  textNeon:         '#83a28c',

  // ── GAME UI ──────────────────────────────────────────────
  healthFull:       '#83a28c',
  healthMid:        '#c4a85e',
  healthLow:        '#c08f6a',
  energyBar:        '#8098b0',
  expBar:           '#7f9888',
  bossBar:          '#c08264',

  // ── GRAPH / CHART ────────────────────────────────────────
  graphLine:        '#7f9888',
  graphFill:        'rgba(127, 152, 136, 0.12)',
  graphDot:         '#8098b0',
  graphDotToday:    '#c08264',
  graphGrid:        '#312b25',
  graphGoalLine:    '#c4a85e',
  graphAxisText:    '#877c6b',

  // ── CIRCLE PROGRESS ──────────────────────────────────────
  circleTrack:      '#312b25',
  circleFill:       '#7f9888',
  circleComplete:   '#83a28c',
  circleOver:       '#c08264',

  // ── STATUS ───────────────────────────────────────────────
  success:          '#83a28c',
  warning:          '#c4a85e',
  error:            '#c08264',
  info:             '#8098b0',

  // ── SPECIAL EFFECTS — soft tints, no glow ─────────────────
  glowAmber:        'rgba(127, 152, 136, 0.10)',
  glowCrimson:      'rgba(192, 130, 100, 0.10)',
  glowMint:         'rgba(131, 162, 140, 0.10)',
  glowBlue:         'rgba(128, 152, 176, 0.10)',
  pixelBorder:      '#7f9888',
  scanline:         'rgba(0, 0, 0, 0.08)',

  // ── GLASS (tab bar, + button, quick-log orbs) ───────────────
  // A faint parchment sheen instead of the day theme's bright white glare.
  glassHighlight:   'rgba(217, 207, 188, 0.08)',
  glassBorder:      'rgba(217, 207, 188, 0.16)',
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
