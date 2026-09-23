import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import Avatar from '@/components/Avatar';
import RankMedallion from '@/components/RankMedallion';
import { getRank } from '@/constants/ranks';
import { FriendProfile, getFriendProfile, removeFriend } from '@/lib/friends';
import { blockUser } from '@/lib/moderation';
import { AchievementDef } from '@/types';
import { FONT_SIZES, FONT_WEIGHTS, SPACING, RADIUS, Theme } from '@/constants/theme';

// Read-only view of a friend's public stats (get_friend_profile only
// returns a row for accepted friends — never weight, meals, notes or photos).
export default function FriendProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [friend, setFriend] = useState<FriendProfile | null>(null);
  const [catalog, setCatalog] = useState<AchievementDef[]>([]);
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      if (!id) return;
      setLoading(true);
      const [profile, { data: defs }] = await Promise.all([
        getFriendProfile(id),
        supabase.from('achievements').select('*').order('sort_order'),
      ]);
      if (!active) return;
      setFriend(profile);
      setCatalog(defs ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]));

  const name = friend?.full_name || (friend?.username ? `@${friend.username}` : 'Friend');

  const handleRemove = () => {
    if (!friend) return;
    Alert.alert(
      `Remove ${name}?`,
      "You'll no longer see each other on your Friends leaderboard. They won't be notified.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            const ok = await removeFriend(friend.user_id);
            setBusy(false);
            if (!ok) { Alert.alert('Error', 'Could not remove this friend. Please try again.'); return; }
            router.back();
          },
        },
      ]
    );
  };

  const handleBlock = () => {
    if (!friend) return;
    Alert.alert(
      `Block ${name}?`,
      "This also removes them as a friend. You won't see each other on the leaderboards. You can unblock them in Settings.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            const ok = await blockUser(friend.user_id);
            setBusy(false);
            if (!ok) { Alert.alert('Error', 'Could not block this user. Please try again.'); return; }
            router.back();
          },
        },
      ]
    );
  };

  const rank = getRank(friend?.level ?? 0, colors);
  const unlocked = new Set(friend?.achievement_keys ?? []);
  const unlockedDefs = catalog.filter(a => unlocked.has(a.key));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButtonRow}>
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : !friend ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>This profile isn't available. You may no longer be friends.</Text>
          </View>
        ) : (
          <>
            {/* Identity */}
            <View style={styles.identity}>
              <Avatar path={friend.avatar_path} name={friend.full_name} size={72} />
              <View style={{ flex: 1 }}>
                <Text style={styles.screenTitle} numberOfLines={1}>{name}</Text>
                {friend.username && <Text style={styles.username}>@{friend.username}</Text>}
                <Text style={styles.since}>Friends since {new Date(friend.friends_since).toLocaleDateString()}</Text>
              </View>
            </View>
            <View style={styles.dividerLine} />

            {/* Rank */}
            <View style={[styles.card, styles.rankCard]}>
              <RankMedallion rank={rank} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rankLevel}>Level {friend.level}</Text>
                <Text style={[styles.rankName, { color: rank.color }]}>{rank.name}</Text>
              </View>
              <Text style={styles.xpText}>{friend.total_xp.toLocaleString()} XP</Text>
            </View>

            {/* Stats */}
            <View style={styles.statGrid}>
              <View style={styles.statTile}>
                <Ionicons name="flame-outline" size={18} color={colors.neonOrange} />
                <Text style={styles.statValue}>{friend.current_streak}</Text>
                <Text style={styles.statLabel}>day streak</Text>
              </View>
              <View style={styles.statTile}>
                <Ionicons name="barbell-outline" size={18} color={colors.accent} />
                <Text style={styles.statValue}>{friend.workout_count.toLocaleString()}</Text>
                <Text style={styles.statLabel}>workouts</Text>
              </View>
              <View style={styles.statTile}>
                <Ionicons name="heart-outline" size={18} color={colors.neonGreen} />
                <Text style={styles.statValue}>{friend.cardio_count.toLocaleString()}</Text>
                <Text style={styles.statLabel}>cardio</Text>
              </View>
            </View>

            {/* Achievements */}
            <Text style={styles.sectionTitle}>
              Achievements ({unlockedDefs.length}/{catalog.length})
            </Text>
            <View style={styles.card}>
              {unlockedDefs.length === 0 ? (
                <Text style={styles.emptyText}>No achievements unlocked yet.</Text>
              ) : (
                unlockedDefs.map((a, i) => (
                  <View key={a.key}>
                    {i > 0 && <View style={styles.rowDivider} />}
                    <View style={styles.row}>
                      <Ionicons name={a.icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.neonYellow} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.achName}>{a.name}</Text>
                        <Text style={styles.achDesc}>{a.description}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Actions */}
            <TouchableOpacity style={styles.actionBtn} onPress={handleRemove} disabled={busy} activeOpacity={0.7}>
              <Ionicons name="person-remove-outline" size={16} color={colors.textMuted} />
              <Text style={styles.actionText}>Remove friend</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleBlock} disabled={busy} activeOpacity={0.7}>
              <Ionicons name="ban-outline" size={16} color={colors.accent} />
              <Text style={[styles.actionText, { color: colors.accent }]}>Block</Text>
            </TouchableOpacity>
          </>
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
    header: { marginBottom: SPACING.md },
    backButtonRow: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
    backButton: {
      color: colors.primary,
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.bold,
      letterSpacing: 1,
    },
    loadingWrap: { paddingVertical: SPACING.xxxl, alignItems: 'center' },
    emptyText: { fontSize: FONT_SIZES.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20, padding: SPACING.sm },
    identity: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
    screenTitle: {
      fontSize: FONT_SIZES.xxl,
      fontWeight: FONT_WEIGHTS.black,
      color: colors.textPrimary,
    },
    username: { fontSize: FONT_SIZES.sm, color: colors.textSecondary, marginTop: 2 },
    since: { fontSize: FONT_SIZES.xs, color: colors.textMuted, marginTop: SPACING.xs },
    dividerLine: {
      height: 1,
      backgroundColor: colors.primary,
      width: 40,
      marginBottom: SPACING.xl,
    },
    sectionTitle: {
      fontSize: FONT_SIZES.xs,
      fontWeight: FONT_WEIGHTS.bold,
      color: colors.textMuted,
      letterSpacing: 0.5,
      marginBottom: SPACING.md,
    },
    card: {
      ...CARD.default,
      ...SHADOWS.purple,
      marginBottom: SPACING.lg,
      padding: SPACING.sm,
    },
    rankCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md },
    rankLevel: { fontSize: FONT_SIZES.md, color: colors.textPrimary, fontWeight: FONT_WEIGHTS.black },
    rankName: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, marginTop: 2 },
    xpText: { fontSize: FONT_SIZES.sm, color: colors.textSecondary, fontWeight: FONT_WEIGHTS.bold },
    statGrid: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
    statTile: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
      backgroundColor: colors.bgSecondary,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      borderRadius: RADIUS.md,
      paddingVertical: SPACING.md,
    },
    statValue: { fontSize: FONT_SIZES.xl, color: colors.textPrimary, fontWeight: FONT_WEIGHTS.black },
    statLabel: { fontSize: FONT_SIZES.xs, color: colors.textMuted },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.sm,
    },
    rowDivider: { height: 1, backgroundColor: colors.borderDefault },
    achName: { fontSize: FONT_SIZES.sm, color: colors.textPrimary, fontWeight: FONT_WEIGHTS.medium },
    achDesc: { fontSize: FONT_SIZES.xs, color: colors.textMuted, marginTop: 1 },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      padding: SPACING.md,
    },
    actionText: { fontSize: FONT_SIZES.sm, color: colors.textMuted, fontWeight: FONT_WEIGHTS.bold },
  });
}
