import { MD3LightTheme, configureFonts } from 'react-native-paper';

/**
 * A kiosk is read standing up, at arm's length, often by someone who left their
 * glasses at home. Every size here is deliberately larger than a phone app's,
 * and the palette holds a 4.5:1 contrast ratio against its background so the
 * screen stays legible under library fluorescents.
 */

/**
 * Named colour tokens.
 *
 * The home screen's redesign fixed an exact palette, so those values live here
 * as tokens rather than inline hexes. Existing names are unchanged: the other
 * screens still reference them, and this pass deliberately does not restyle
 * them.
 */
export const palette = {
  /** Deep navy: hero ground, headings, emphasised nouns. */
  navy: '#10243A',
  /** Accent, pressed state. */
  accentPressed: '#17517F',
  /** Body copy on light ground. */
  body: '#3D4C5C',
  /** Idle icon tint. */
  iconIdle: '#8494A4',
  /** Card border. */
  border: '#C3CEDA',
  /** Hairline rule. */
  rule: '#DCE3EB',
  /** Card pressed fill. */
  pressedFill: '#F1F5F9',

  primary: '#1B5E9C',
  onPrimary: '#FFFFFF',
  primaryContainer: '#D6E6F5',
  success: '#1B6B3A',
  successContainer: '#DCF0E3',
  warning: '#8A5300',
  warningContainer: '#FBEBD2',
  danger: '#A32020',
  dangerContainer: '#FBE0E0',
  surface: '#FFFFFF',
  background: '#F4F7FB',
  outline: '#5A6B7C',
  text: '#152331',
  textMuted: '#4A5A6A',
} as const;

/** Minimum touch target. Exceeds the 44pt/48dp platform guidance on purpose. */
export const TOUCH_TARGET = 72;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Measurements the redesigned home screen specifies exactly. */
export const kiosk = {
  heroHeight: 456,
  heroInset: 40,
  heroTopInset: 36,
  logoSize: 64,
  actionPaddingTop: 32,
  primaryHeight: 132,
  cardHeight: 88,
  cardPaddingH: 22,
  gearSize: 56,
  radiusSmall: 8,
  radiusLarge: 14,
  /** Drop shadow beneath the primary action. */
  primaryShadow: {
    shadowColor: '#1B5E9C',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

/** Scrim over the hero photo, so text stays legible on any image. */
export const HERO_SCRIM = {
  colors: ['rgba(16,36,58,0.72)', 'rgba(16,36,58,0.35)', 'rgba(16,36,58,0.92)'] as const,
  locations: [0, 0.42, 1] as const,
};

const fontConfig = {
  displayLarge: { fontSize: 52, lineHeight: 60, fontWeight: '700' as const, letterSpacing: 0 },
  headlineLarge: { fontSize: 40, lineHeight: 48, fontWeight: '700' as const, letterSpacing: 0 },
  headlineMedium: { fontSize: 32, lineHeight: 40, fontWeight: '600' as const, letterSpacing: 0 },
  titleLarge: { fontSize: 26, lineHeight: 34, fontWeight: '600' as const, letterSpacing: 0 },
  titleMedium: { fontSize: 22, lineHeight: 30, fontWeight: '600' as const, letterSpacing: 0 },
  bodyLarge: { fontSize: 21, lineHeight: 30, fontWeight: '400' as const, letterSpacing: 0 },
  bodyMedium: { fontSize: 18, lineHeight: 26, fontWeight: '400' as const, letterSpacing: 0 },
  labelLarge: { fontSize: 20, lineHeight: 28, fontWeight: '600' as const, letterSpacing: 0 },
};

export const theme = {
  ...MD3LightTheme,
  roundness: 12,
  colors: {
    ...MD3LightTheme.colors,
    primary: palette.primary,
    onPrimary: palette.onPrimary,
    primaryContainer: palette.primaryContainer,
    secondary: palette.outline,
    background: palette.background,
    surface: palette.surface,
    error: palette.danger,
    errorContainer: palette.dangerContainer,
    onSurface: palette.text,
    onSurfaceVariant: palette.textMuted,
    outline: palette.outline,
  },
  fonts: configureFonts({ config: fontConfig }),
};

export type AppTheme = typeof theme;
