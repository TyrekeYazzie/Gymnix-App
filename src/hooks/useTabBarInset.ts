import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT, CENTER_BUTTON_RISE } from '@/components/TabBar';
import { SPACING } from '@/constants/theme';

// Bottom padding for a tab screen's scroll content. The tab bar floats over
// the screen (bar + the home-indicator gap below it + the "+" button rising
// above it), so without this the last items, like Profile's Log Out button,
// sit hidden underneath it.
export function useTabBarInset(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, SPACING.md) + CENTER_BUTTON_RISE + SPACING.lg;
}
