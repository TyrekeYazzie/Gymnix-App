import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { FONT_WEIGHTS, RADIUS, Theme } from '@/constants/theme';
import { avatarUrl } from '@/utils/avatar';

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
}

interface Props {
  path: string | null | undefined;   // profiles.avatar_path
  name: string | null | undefined;   // for the initials fallback
  size: number;
  radius?: number;                   // defaults to a circle
}

// Profile picture if the user has one, otherwise their initials — also falls
// back to initials if the image fails to load (deleted file, offline).
export default function Avatar({ path, name, size, radius = RADIUS.full }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const uri = avatarUrl(path);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [uri]);

  const box = { width: size, height: size, borderRadius: radius };

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={[styles.frame, box]}
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <View style={[styles.frame, box]}>
      <Text style={[styles.initials, { fontSize: Math.round(size * 0.36) }]}>{getInitials(name)}</Text>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors } = theme;
  return StyleSheet.create({
    frame: {
      backgroundColor: colors.bgTertiary,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    initials: {
      color: colors.primary,
      fontWeight: FONT_WEIGHTS.black,
    },
  });
}
