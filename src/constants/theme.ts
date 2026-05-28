// FitnessApp Theme — Retro Gothic Video Game
// Inspired by: classic RPG dark dungeons, pixel horror games,
// gothic castles, neon arcades, and 8-bit death screens
export const COLORS = {
// ── BACKGROUNDS ──────────────────────────────────────────
// Deep dungeon blacks and dark stone greys
bgPrimary:        '#080808',   // void black — main screen bg
bgSecondary:      '#111111',   // dark stone — card bg
bgTertiary:       '#1a1a1a',   // shadow grey — input bg
bgElevated:       '#222222',   // raised stone — modal bg
bgOverlay:        'rgba(8, 8, 8, 0.85)', // dark overlay
// ── BORDERS ──────────────────────────────────────────────
borderDefault:    '#2a2a2a',   // dungeon wall border
borderFocus:      '#8b00ff',   // glowing magic border
borderAccent:     '#ff2d6b',   // danger border
// ── PRIMARY — ARCANE PURPLE ───────────────────────────────
// The magic of the dungeon wizard
primary:          '#8b00ff',   // arcane purple
primaryLight:     '#b44fff',   // soft violet glow
primaryDark:      '#5c00aa',   // deep magic
primaryGlow:      'rgba(139, 0, 255, 0.25)', // purple aura
// ── ACCENT — BLOOD CRIMSON ────────────────────────────────
// The danger, health bars, and boss warnings
accent:           '#ff2d6b',   // blood crimson
accentLight:      '#ff6b9d',   // faded rose
accentDark:       '#cc0044',   // deep blood
accentGlow:       'rgba(255, 45, 107, 0.25)', // crimson aura
// ── NEON — PIXEL SCREEN GLOW ─────────────────────────────
// Old CRT monitor vibes, arcade machine screens
neonGreen:        '#39ff14',   // 1UP green — success
neonBlue:         '#00f5ff',   // ice magic — info
neonYellow:       '#fff01f',   // gold coin — warning
neonOrange:       '#ff6600',   // fire spell — alert
// ── TEXT ─────────────────────────────────────────────────
textPrimary:      '#f0e6ff',   // pale ghost white
textSecondary:    '#9b8fb0',   // faded tombstone grey
textMuted:        '#5a5068',   // invisible ink
textInverse:      '#080808',   // dark on light
textAccent:       '#ff2d6b',   // highlighted danger
textNeon:         '#39ff14',   // pixel score text
// ── GAME UI ──────────────────────────────────────────────
// Classic RPG health and energy bars
healthFull:       '#39ff14',   // full health neon green
healthMid:        '#fff01f',   // half health yellow
healthLow:        '#ff2d6b',   // critical health red
energyBar:        '#00f5ff',   // mana bar cyan
expBar:           '#8b00ff',   // experience purple
bossBar:          '#ff2d6b',   // boss health crimson
// ── GRAPH / CHART ────────────────────────────────────────
// For the calories stock chart
graphLine:        '#8b00ff',   // arcane line
graphFill:        'rgba(139, 0, 255, 0.12)', // transparent fill
graphDot:         '#ff2d6b',   // blood dot
graphDotToday:    '#39ff14',   // today neon green
graphGrid:        '#1e1e1e',   // barely visible grid
graphGoalLine:    '#ff2d6b',   // goal danger line
graphAxisText:    '#5a5068',   // axis labels
// ── CIRCLE PROGRESS ──────────────────────────────────────
circleTrack:      '#2a2a2a',   // empty ring
circleFill:       '#8b00ff',   // progress ring
circleComplete:   '#39ff14',   // 100% complete
circleOver:       '#ff2d6b',   // over goal warning
// ── STATUS ────────────────────────────────────────────────
success:          '#39ff14',   // neon green victory
warning:          '#fff01f',   // yellow caution
error:            '#ff2d6b',   // crimson failure
info:             '#00f5ff',   // cyan hint
// ── SPECIAL EFFECTS ──────────────────────────────────────
// Decorative glow effects and pixel borders
glowPurple:       'rgba(139, 0, 255, 0.4)',
glowCrimson:      'rgba(255, 45, 107, 0.4)',
glowGreen:        'rgba(57, 255, 20, 0.4)',
glowCyan:         'rgba(0, 245, 255, 0.4)',
pixelBorder:      '#8b00ff',   // retro pixel border color
scanline:         'rgba(0, 0, 0, 0.15)', // CRT scanline overlay
}
// ── TYPOGRAPHY ─────────────────────────────────────────────
// Font sizes following retro game UI hierarchy
export const FONT_SIZES = {
xs:     10,   // tiny pixel labels
sm:     12,   // small UI text
md:     14,   // body text
lg:     16,   // card titles
xl:     20,   // section headers
xxl:    28,   // screen titles
xxxl:   36,   // big score numbers
hero:   48,   // hero display numbers
}
export const FONT_WEIGHTS = {
regular:    '400' as const,
medium:     '500' as const,
semibold:   '600' as const,
bold:       '700' as const,
black:      '900' as const,
}
// ── SPACING ────────────────────────────────────────────────
// Consistent spacing scale across all screens
export const SPACING = {
xs:   4,
sm:   8,
md:   12,
lg:   16,
xl:   24,
xxl:  32,
xxxl: 48,
}
// ── BORDER RADIUS ──────────────────────────────────────────
// Mostly sharp for retro pixel feel with some soft options
export const RADIUS = {
none:   0,    // hard pixel corners
xs:     4,    // slight rounding
sm:     8,    // small cards
md:     12,   // standard cards
lg:     16,   // large cards
xl:     24,   // pills
full:   999,  // perfect circles
}
// ── SHADOWS ────────────────────────────────────────────────
// Neon glow shadows for the gothic arcade feel
export const SHADOWS = {
purple: {
shadowColor:   '#8b00ff',
shadowOffset:  { width: 0, height: 0 },
shadowOpacity: 0.5,
shadowRadius:  8,
elevation:     6,
},
crimson: {
shadowColor:   '#ff2d6b',
shadowOffset:  { width: 0, height: 0 },
shadowOpacity: 0.5,
shadowRadius:  8,
elevation:     6,
},
green: {
shadowColor:   '#39ff14',
shadowOffset:  { width: 0, height: 0 },
shadowOpacity: 0.4,
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
// Reusable card base styles
export const CARD = {
default: {
backgroundColor:  '#111111',
borderColor:      '#2a2a2a',
borderWidth:      1,
borderRadius:     12,
padding:          16,
},
glowing: {
backgroundColor:  '#111111',
borderColor:      '#8b00ff',
borderWidth:      1,
borderRadius:     12,
padding:          16,
shadowColor:      '#8b00ff',
shadowOffset:     { width: 0, height: 0 },
shadowOpacity:    0.4,
shadowRadius:     8,
elevation:        6,
},
danger: {
backgroundColor:  '#1a0808',
borderColor:      '#ff2d6b',
borderWidth:      1,
borderRadius:     12,
padding:          16,
},
}
// ── BUTTON STYLES ──────────────────────────────────────────
export const BUTTON = {
primary: {
backgroundColor:  '#8b00ff',
borderRadius:     10,
paddingVertical:  14,
paddingHorizontal: 24,
alignItems:       'center' as const,
},
secondary: {
backgroundColor:  'transparent',
borderColor:      '#8b00ff',
borderWidth:      1,
borderRadius:     10,
paddingVertical:  14,
paddingHorizontal: 24,
alignItems:       'center' as const,
},
danger: {
backgroundColor:  '#ff2d6b',
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
backgroundColor:  '#1a1a1a',
borderColor:      '#2a2a2a',
borderWidth:      1,
borderRadius:     10,
padding:          14,
color:            '#f0e6ff',
fontSize:         16,
},
focused: {
backgroundColor:  '#1a1a1a',
borderColor:      '#8b00ff',
borderWidth:      1,
borderRadius:     10,
padding:          14,
color:            '#f0e6ff',
fontSize:         16,
},
}
// ── THEME OBJECT ───────────────────────────────────────────
// Single import option — import { theme } from '@/constants/theme'
export const theme = {
colors:   COLORS,
fontSize: FONT_SIZES,
fontWeight: FONT_WEIGHTS,
spacing:  SPACING,
radius:   RADIUS,
shadows:  SHADOWS,
card:     CARD,
button:   BUTTON,
input:    INPUT,
}
export default theme
