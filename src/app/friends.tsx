import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/context/ThemeContext';
import { useProfile } from '@/context/ProfileContext';
import Avatar from '@/components/Avatar';
import {
  FriendEntry, Relation, UserSearchResult,
  getMyFriends, searchUsers, sendFriendRequest, respondToFriendRequest, removeFriend, displayName,
} from '@/lib/friends';
import { FONT_SIZES, FONT_WEIGHTS, SPACING, RADIUS, Theme } from '@/constants/theme';

// Profile > Friends — find people by username, handle requests, and open a
// friend's profile. Leaderboard rows offer the same add/accept actions.
export default function FriendsScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<FriendEntry[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const searchSeq = useRef(0);

  const load = useCallback(async () => {
    const rows = await getMyFriends();
    setEntries(rows);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Debounced search; the sequence number drops answers for older queries.
  useEffect(() => {
    const q = query.trim().replace(/^@/, '');
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const seq = ++searchSeq.current;
    const t = setTimeout(async () => {
      const rows = await searchUsers(q);
      if (seq !== searchSeq.current) return;
      setResults(rows);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const relationOf = (userId: string): Relation | null =>
    entries.find(e => e.user_id === userId)?.relation ?? null;

  const withBusy = async (userId: string, fn: () => Promise<boolean>) => {
    setBusyId(userId);
    const ok = await fn();
    if (ok) await load();
    setBusyId(null);
    if (!ok) Alert.alert('Error', 'Something went wrong. Please try again.');
  };

  const handleAdd = (userId: string) =>
    withBusy(userId, async () => (await sendFriendRequest(userId)) !== null);
  const handleRespond = (userId: string, accept: boolean) =>
    withBusy(userId, () => respondToFriendRequest(userId, accept));
  const handleCancel = (userId: string) =>
    withBusy(userId, () => removeFriend(userId));

  const incoming = entries.filter(e => e.relation === 'incoming');
  const friends = entries.filter(e => e.relation === 'friends');
  const outgoing = entries.filter(e => e.relation === 'outgoing');

  const renderAction = (userId: string, relation: Relation | null) => {
    if (busyId === userId) return <ActivityIndicator size="small" color={colors.primary} />;
    if (relation === 'friends') {
      return <Text style={styles.statusText}>Friends</Text>;
    }
    if (relation === 'outgoing') {
      return (
        <TouchableOpacity onPress={() => handleCancel(userId)} activeOpacity={0.7} style={styles.pillBtn}>
          <Text style={styles.pillText}>Requested</Text>
        </TouchableOpacity>
      );
    }
    if (relation === 'incoming') {
      return (
        <TouchableOpacity onPress={() => handleRespond(userId, true)} activeOpacity={0.7} style={[styles.pillBtn, styles.pillPrimary]}>
          <Text style={[styles.pillText, { color: colors.textInverse }]}>Accept</Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        onPress={() => handleAdd(userId)}
        activeOpacity={0.7}
        style={[styles.pillBtn, styles.pillPrimary]}
        accessibilityLabel="Add friend"
      >
        <Ionicons name="person-add-outline" size={14} color={colors.textInverse} />
        <Text style={[styles.pillText, { color: colors.textInverse }]}>Add</Text>
      </TouchableOpacity>
    );
  };

  const showingSearch = query.trim().replace(/^@/, '').length >= 2;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButtonRow}>
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.screenTitle}>Friends</Text>
        {profile?.username && <Text style={styles.myUsername}>You're @{profile.username}</Text>}
        <View style={styles.dividerLine} />

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by username"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searching && <ActivityIndicator size="small" color={colors.textMuted} />}
          {!!query && !searching && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {showingSearch ? (
          <View style={styles.card}>
            {!searching && results.length === 0 ? (
              <Text style={styles.emptyText}>No one found with that username.</Text>
            ) : (
              results.map((u, i) => (
                <View key={u.user_id}>
                  {i > 0 && <View style={styles.rowDivider} />}
                  <View style={styles.row}>
                    <Avatar path={u.avatar_path} name={u.full_name ?? u.username} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>{u.full_name || `@${u.username}`}</Text>
                      <Text style={styles.username} numberOfLines={1}>@{u.username}</Text>
                    </View>
                    {renderAction(u.user_id, relationOf(u.user_id))}
                  </View>
                </View>
              ))
            )}
          </View>
        ) : loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <>
            {incoming.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Requests ({incoming.length})</Text>
                <View style={styles.card}>
                  {incoming.map((u, i) => (
                    <View key={u.user_id}>
                      {i > 0 && <View style={styles.rowDivider} />}
                      <View style={styles.row}>
                        <Avatar path={u.avatar_path} name={u.full_name ?? u.username} size={36} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.name} numberOfLines={1}>{displayName(u)}</Text>
                          {u.username && <Text style={styles.username} numberOfLines={1}>@{u.username}</Text>}
                        </View>
                        {busyId === u.user_id ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <View style={styles.actionGroup}>
                            <TouchableOpacity onPress={() => handleRespond(u.user_id, true)} activeOpacity={0.7} style={[styles.pillBtn, styles.pillPrimary]}>
                              <Text style={[styles.pillText, { color: colors.textInverse }]}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleRespond(u.user_id, false)}
                              activeOpacity={0.7}
                              style={styles.iconBtn}
                              accessibilityLabel={`Decline request from ${displayName(u)}`}
                            >
                              <Ionicons name="close" size={16} color={colors.textMuted} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.sectionTitle}>Your friends ({friends.length})</Text>
            <View style={styles.card}>
              {friends.length === 0 ? (
                <Text style={styles.emptyText}>
                  No friends yet. Search by username above, or tap ••• next to someone on the leaderboard.
                </Text>
              ) : (
                friends.map((u, i) => (
                  <View key={u.user_id}>
                    {i > 0 && <View style={styles.rowDivider} />}
                    <TouchableOpacity
                      style={styles.row}
                      onPress={() => router.push({ pathname: '/friend-profile', params: { id: u.user_id } })}
                      activeOpacity={0.7}
                    >
                      <Avatar path={u.avatar_path} name={u.full_name ?? u.username} size={36} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name} numberOfLines={1}>{displayName(u)}</Text>
                        {u.username && <Text style={styles.username} numberOfLines={1}>@{u.username}</Text>}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            {outgoing.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Sent requests</Text>
                <View style={styles.card}>
                  {outgoing.map((u, i) => (
                    <View key={u.user_id}>
                      {i > 0 && <View style={styles.rowDivider} />}
                      <View style={styles.row}>
                        <Avatar path={u.avatar_path} name={u.full_name ?? u.username} size={36} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.name} numberOfLines={1}>{displayName(u)}</Text>
                          {u.username && <Text style={styles.username} numberOfLines={1}>@{u.username}</Text>}
                        </View>
                        {busyId === u.user_id ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <TouchableOpacity onPress={() => handleCancel(u.user_id)} activeOpacity={0.7} style={styles.pillBtn}>
                            <Text style={styles.pillText}>Cancel</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
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
      marginBottom: SPACING.xs,
    },
    myUsername: { fontSize: FONT_SIZES.sm, color: colors.textMuted, marginBottom: SPACING.sm },
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
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      backgroundColor: colors.bgSecondary,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      marginBottom: SPACING.lg,
    },
    searchInput: { flex: 1, fontSize: FONT_SIZES.md, color: colors.textPrimary, paddingVertical: SPACING.md },
    loadingWrap: { paddingVertical: SPACING.xxxl, alignItems: 'center' },
    emptyText: { fontSize: FONT_SIZES.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20, padding: SPACING.sm },
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
    name: { fontSize: FONT_SIZES.sm, color: colors.textPrimary, fontWeight: FONT_WEIGHTS.medium },
    username: { fontSize: FONT_SIZES.xs, color: colors.textMuted, marginTop: 1 },
    actionGroup: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
    pillBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      borderRadius: RADIUS.full,
      paddingVertical: SPACING.xs,
      paddingHorizontal: SPACING.md,
    },
    pillPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
    pillText: { fontSize: FONT_SIZES.xs, color: colors.textPrimary, fontWeight: FONT_WEIGHTS.bold },
    iconBtn: {
      width: 30, height: 30, borderRadius: RADIUS.full,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: colors.borderDefault,
    },
    statusText: { fontSize: FONT_SIZES.xs, color: colors.neonGreen, fontWeight: FONT_WEIGHTS.bold },
  });
}
