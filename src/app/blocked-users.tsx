import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/context/ThemeContext';
import Avatar from '@/components/Avatar';
import { BlockedUser, getMyBlockedUsers, unblockUser } from '@/lib/moderation';
import { displayName } from '@/lib/friends';
import { FONT_SIZES, FONT_WEIGHTS, SPACING, RADIUS, Theme } from '@/constants/theme';

// Settings > Blocked Users — lists everyone the user has blocked from the
// leaderboard (see src/lib/moderation.ts) and lets them unblock.
export default function BlockedUsersScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const rows = await getMyBlockedUsers();
      if (!active) return;
      setBlocked(rows);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []));

  const handleUnblock = (u: BlockedUser) => {
    Alert.alert(
      `Unblock ${displayName(u, 'this user')}?`,
      "You'll see each other on the leaderboards again.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            setUnblockingId(u.user_id);
            const ok = await unblockUser(u.user_id);
            setUnblockingId(null);
            if (!ok) { Alert.alert('Error', 'Could not unblock this user. Please try again.'); return; }
            setBlocked(p => p.filter(b => b.user_id !== u.user_id));
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButtonRow}>
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.screenTitle}>Blocked Users</Text>
        <View style={styles.dividerLine} />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : blocked.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>
              You haven't blocked anyone. To block someone, tap ••• next to their name on the leaderboard.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            {blocked.map((u, i) => (
              <View key={u.user_id}>
                {i > 0 && <View style={styles.rowDivider} />}
                <View style={styles.row}>
                  <Avatar path={u.avatar_path} name={u.full_name ?? u.username} size={32} />
                  <Text style={styles.name} numberOfLines={1}>{displayName(u)}</Text>
                  {unblockingId === u.user_id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <TouchableOpacity onPress={() => handleUnblock(u)} activeOpacity={0.7} style={styles.unblockBtn}>
                      <Text style={styles.unblockText}>Unblock</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, CARD, SHADOWS } = theme;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
    header: { marginBottom: SPACING.sm },
    backButtonRow: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
    backButton: {
      color: colors.primary,
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.bold,
      letterSpacing: 1,
    },
    screenTitle: {
      fontSize: FONT_SIZES.xxl,
      fontWeight: FONT_WEIGHTS.black,
      color: colors.textPrimary,
      letterSpacing: 0.5,
      marginBottom: SPACING.sm,
    },
    dividerLine: {
      height: 1,
      backgroundColor: colors.primary,
      width: 40,
      marginBottom: SPACING.xl,
    },
    loadingWrap: { paddingVertical: SPACING.xxxl, alignItems: 'center' },
    emptyText: { fontSize: FONT_SIZES.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
    card: {
      ...CARD.default,
      ...SHADOWS.purple,
      marginBottom: SPACING.lg,
      padding: SPACING.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.sm,
    },
    rowDivider: { height: 1, backgroundColor: colors.borderDefault },
    name: { flex: 1, fontSize: FONT_SIZES.sm, color: colors.textPrimary, fontWeight: FONT_WEIGHTS.medium },
    unblockBtn: {
      borderWidth: 1,
      borderColor: colors.borderDefault,
      borderRadius: RADIUS.full,
      paddingVertical: SPACING.xs,
      paddingHorizontal: SPACING.md,
    },
    unblockText: { fontSize: FONT_SIZES.xs, color: colors.textPrimary, fontWeight: FONT_WEIGHTS.bold },
  });
}
