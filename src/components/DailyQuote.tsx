import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getQuoteOfDay } from '@/lib/quoteOfDay';
import { COLORS, FONT_FAMILIES, FONT_SIZES, SPACING } from '@/constants/theme';

// A daily line of philosophy under the Dashboard date — same quote for
// everyone on a given calendar day (see getQuoteOfDay). Deliberately set in
// its own typography (Cormorant Garamond italic + Cinzel byline) so it reads
// as a different register from the rest of the app's UI.
export default function DailyQuote() {
  const quote = getQuoteOfDay();

  return (
    <View style={styles.wrap}>
      <Text style={styles.quote}>“{quote.text}”</Text>
      <Text style={styles.byline}>— {quote.author}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.xs,
  },
  quote: {
    fontFamily: FONT_FAMILIES.quote,
    fontSize: FONT_SIZES.lg,
    lineHeight: 24,
    color: COLORS.textSecondary,
    textAlign: 'center',
    // A soft, warm halo behind the text rather than a hard drop shadow —
    // the "glow" belongs to the quote's light, not to a UI element.
    textShadowColor: COLORS.neonYellow + '40',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  byline: {
    fontFamily: FONT_FAMILIES.byline,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: COLORS.neonYellow,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
