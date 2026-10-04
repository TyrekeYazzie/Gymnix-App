import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfile } from './ProfileContext';
import { LIGHT_THEME, DARK_THEME, Theme } from '@/constants/theme';

type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null)

// Device-local copy of the last signed-in user's night mode setting.
const LAST_DARK_MODE_KEY = 'theme.lastDarkMode'

// Derives the active theme from profile.dark_mode_enabled — see Settings
// for where that flag actually gets written (handleDarkModeToggle), the
// same update-then-setProfile pattern as units. With no profile (logged
// out, or still loading at launch) it uses the last setting seen on this
// device, so Log Out doesn't flash to light, or else the phone's own
// light/dark setting for a first launch.
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { profile } = useProfile()
  const systemDark = useColorScheme() === 'dark'
  const [lastDark, setLastDark] = useState<boolean | null>(null)

  useEffect(() => {
    AsyncStorage.getItem(LAST_DARK_MODE_KEY)
      .then(v => { if (v !== null) setLastDark(v === 'true') })
      .catch(() => {})
  }, [])

  const profileDark = profile ? !!profile.dark_mode_enabled : null
  useEffect(() => {
    if (profileDark === null) return
    setLastDark(profileDark)
    AsyncStorage.setItem(LAST_DARK_MODE_KEY, String(profileDark)).catch(() => {})
  }, [profileDark])

  const isDark = profileDark ?? lastDark ?? systemDark
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
