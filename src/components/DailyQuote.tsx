import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getQuoteOfDay } from '@/lib/quoteOfDay';
import { useTheme } from '@/context/ThemeContext';
import { FONT_FAMILIES, FONT_SIZES, SPACING, Theme } from '@/constants/theme';

// A daily line of philosophy under the Dashboard date — same quote for
// everyone on a given calendar day (see getQuoteOfDay). Deliberately set in
// its own typography (Cormorant Garamond italic + Cinzel byline) so it reads
// as a different register from the rest of the app's UI. Rendering is
// gated by profile.daily_quotes_enabled at the call site (see Dashboard) —
// this component always renders when mounted.
export default function DailyQuote() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const quote = getQuoteOfDay();

  return (
    <View style={styles.wrap}>
      <Text style={styles.quote}>“{quote.text}”</Text>
      <Text style={styles.byline}>— {quote.author}</Text>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors } = theme;
  return StyleSheet.create({
    wrap: {
      marginBottom: SPACING.lg,
      paddingHorizontal: SPACING.xs,
    },
    quote: {
      fontFamily: FONT_FAMILIES.quote,
      fontSize: FONT_SIZES.lg,
      lineHeight: 24,
      color: colors.textSecondary,
      textAlign: 'center',
      // A soft, warm halo behind the text rather than a hard drop shadow —
      // the "glow" belongs to the quote's light, not to a UI element.
      textShadowColor: colors.neonYellow + '40',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 8,
    },
    byline: {
      fontFamily: FONT_FAMILIES.byline,
      fontSize: 11,
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: colors.neonYellow,
      textAlign: 'center',
      marginTop: SPACING.sm,
    },
  });
}
