import React, { createContext, useContext, useMemo } from 'react';
import { useProfile } from './ProfileContext';
import { LIGHT_THEME, DARK_THEME, Theme } from '@/constants/theme';

type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null)

// Derives the active theme from profile.dark_mode_enabled — see Settings
// for where that flag actually gets written (handleDarkModeToggle), the
// same update-then-setProfile pattern as units/reminders_enabled. Defaults
// to light whenever there's no profile yet (logged out, or still loading),
// which matches profiles.dark_mode_enabled's own db default.
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { profile } = useProfile()
  const isDark = profile?.dark_mode_enabled ?? false
  // LIGHT_THEME/DARK_THEME are each built once at module load (see
  // constants/theme.ts), so this is just picking one of two stable
  // references — cheap, and safe to depend on for downstream useMemos.
  const theme = useMemo(() => (isDark ? DARK_THEME : LIGHT_THEME), [isDark])

  return (
    <ThemeContext.Provider value={{ theme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used inside ThemeProvider")
  return context
}
