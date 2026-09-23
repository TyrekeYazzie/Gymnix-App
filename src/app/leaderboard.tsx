import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import {
  getLevelLeaderboard, getMyLevelRank,
  getStrengthLeaderboard, getMyStrengthRank,
  getCardioLeaderboard, getMyCardioRank,
  getStreakLeaderboard, getMyStreakRank,
  MyLevelRank, MyLogCountRank, MyStreakRank,
} from '@/lib/leaderboard';
import { LevelLeaderboardEntry, LogCountLeaderboardEntry, StreakLeaderboardEntry } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import Avatar from '@/components/Avatar';
import { REPORT_REASONS, ReportReason, reportUser, blockUser } from '@/lib/moderation';
import {
  FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, Theme, Colors
} from '@/constants/theme';

type TabKey = 'level' | 'strength' | 'cardio' | 'streak';
type Row = LevelLeaderboardEntry | LogCountLeaderboardEntry | StreakLeaderboardEntry;

function getTabs(colors: Colors): { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] {
  return [
    { key: 'level',    label: 'Level',    icon: 'trophy-outline',  color: colors.primary },
    { key: 'strength', label: 'Strength', icon: 'barbell-outline', color: colors.accent },
    { key: 'cardio',   label: 'Cardio',   icon: 'heart-outline',   color: colors.neonGreen },
    { key: 'streak',   label: 'Streak',   icon: 'flame-outline',   color: colors.neonOrange },
  ];
}

// Gold/silver/bronze for the podium, muted for everyone else.
function medalColor(colors: Colors, rnk: number): string {
  if (rnk === 1) return colors.neonYellow;
  if (rnk === 2) return colors.textSecondary;
  if (rnk === 3) return colors.neonOrange;
  return colors.textMuted;
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const TABS = useMemo(() => getTabs(colors), [colors]);

  const [tab, setTab] = useState<TabKey>('level');
  const [loading, setLoading] = useState(true);

  const [levelEntries, setLevelEntries] = useState<LevelLeaderboardEntry[]>([]);
  const [strengthEntries, setStrengthEntries] = useState<LogCountLeaderboardEntry[]>([]);
  const [cardioEntries, setCardioEntries] = useState<LogCountLeaderboardEntry[]>([]);
  const [streakEntries, setStreakEntries] = useState<StreakLeaderboardEntry[]>([]);

  const [myLevelRank, setMyLevelRank] = useState<MyLevelRank | null>(null);
  const [myStrengthRank, setMyStrengthRank] = useState<MyLogCountRank | null>(null);
  const [myCardioRank, setMyCardioRank] = useState<MyLogCountRank | null>(null);
  const [myStreakRank, setMyStreakRank] = useState<MyStreakRank | null>(null);

  // Report/block sheet for another user's row (Guideline 1.2).
  const [actionRow, setActionRow] = useState<Row | null>(null);
  const [actionStep, setActionStep] = useState<'menu' | 'report'>('menu');
  const [actionBusy, setActionBusy] = useState(false);

  const openActions = (row: Row) => { setActionRow(row); setActionStep('menu'); };
  const closeActions = () => { if (!actionBusy) setActionRow(null); };

  // Blocks hide in both directions server-side; drop the row from every
  // cached tab now so it disappears without a refetch.
  const removeFromLists = (userId: string) => {
    setLevelEntries(p => p.filter(r => r.user_id !== userId));
    setStrengthEntries(p => p.filter(r => r.user_id !== userId));
    setCardioEntries(p => p.filter(r => r.user_id !== userId));
    setStreakEntries(p => p.filter(r => r.user_id !== userId));
  };

  const confirmBlock = (row: Row) => {
    const name = row.full_name || 'this user';
    Alert.alert(
      `Block ${name}?`,
      "You won't see each other on the leaderboards. You can unblock them in Settings.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setActionBusy(true);
            const ok = await blockUser(row.user_id);
            setActionBusy(false);
            if (!ok) { Alert.alert('Error', 'Could not block this user. Please try again.'); return; }
            setActionRow(null);
            removeFromLists(row.user_id);
          },
        },
      ]
    );
  };

  const submitReport = async (reason: ReportReason) => {
    if (!actionRow) return;
    const row = actionRow;
    setActionBusy(true);
    const ok = await reportUser(row.user_id, reason, { name: row.full_name, avatarPath: row.avatar_path });
    setActionBusy(false);
    if (!ok) { Alert.alert('Error', 'Could not send your report. Please try again.'); return; }
    setActionRow(null);
    Alert.alert(
      'Report sent',
      "Thanks — we review reports within 24 hours. Do you also want to block this user?",
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: () => confirmBlock(row) },
      ]
    );
  };

  const load = useCallback(async (which: TabKey) => {
    setLoading(true);
    if (which === 'level') {
      const [entries, mine] = await Promise.all([getLevelLeaderboard(50), getMyLevelRank()]);
      setLevelEntries(entries);
      setMyLevelRank(mine);
    } else if (which === 'strength') {
      const [entries, mine] = await Promise.all([getStrengthLeaderboard(50), getMyStrengthRank()]);
      setStrengthEntries(entries);
      setMyStrengthRank(mine);
    } else if (which === 'cardio') {
      const [entries, mine] = await Promise.all([getCardioLeaderboard(50), getMyCardioRank()]);
      setCardioEntries(entries);
      setMyCardioRank(mine);
    } else {
      const [entries, mine] = await Promise.all([getStreakLeaderboard(50), getMyStreakRank()]);
      setStreakEntries(entries);
      setMyStreakRank(mine);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(tab); }, [tab, load]));

  const activeTabDef = TABS.find(t => t.key === tab)!;
  const rows: Row[] =
    tab === 'level' ? levelEntries :
    tab === 'strength' ? strengthEntries :
    tab === 'cardio' ? cardioEntries : streakEntries;
  const myRank =
    tab === 'level' ? myLevelRank :
    tab === 'strength' ? myStrengthRank :
    tab === 'cardio' ? myCardioRank : myStreakRank;
  const myRankInList = rows.some(r => r.user_id === user?.id);

  const renderValue = (row: Row) => {
    if (tab === 'level') {
      const r = row as LevelLeaderboardEntry;
      return `Lv ${r.level} · ${r.total_xp.toLocaleString()} XP`;
    }
    if (tab === 'streak') {
      const r = row as StreakLeaderboardEntry;
      return `${r.current_streak} day${r.current_streak === 1 ? '' : 's'}`;
    }
    const r = row as LogCountLeaderboardEntry;
    return `${r.log_count.toLocaleString()} ${r.log_count === 1 ? 'session' : 'sessions'}`;
  };

  const myRankValue = () => {
    if (!myRank) return '';
    if (tab === 'level') {
      const r = myRank as MyLevelRank;
      return `Lv ${r.level} · ${r.total_xp.toLocaleString()} XP`;
    }
    if (tab === 'streak') {
      const r = myRank as MyStreakRank;
      return `${r.current_streak} day${r.current_streak === 1 ? '' : 's'}`;
    }
    const r = myRank as MyLogCountRank;
    return `${r.log_count.toLocaleString()} ${r.log_count === 1 ? 'session' : 'sessions'}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButtonRow}>
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.screenTitle}>Leaderboard</Text>
        <View style={styles.dividerLine} />

        {/* Tabs */}
        <View style={styles.tabRow}>
          {TABS.map(t => {
            const active = t.key === tab;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabButton, active && { borderColor: t.color, backgroundColor: t.color + '14' }]}
                onPress={() => setTab(t.key)}
                activeOpacity={0.7}
              >
                <Ionicons name={t.icon} size={16} color={active ? t.color : colors.textMuted} />
                <Text style={[styles.tabLabel, active && { color: t.color, fontWeight: FONT_WEIGHTS.bold }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {(tab === 'strength' || tab === 'cardio') && (
          <Text style={styles.explainer}>
            Ranked by sessions logged, not weight lifted or pace — consistency wins.
          </Text>
        )}
        {tab === 'streak' && (
          <Text style={styles.explainer}>
            Ranked by current streak, not longest ever — miss a day and you're back at 0.
          </Text>
        )}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No entries yet — be the first to log one.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {rows.map((row, i) => {
              const isMe = row.user_id === user?.id;
              return (
                <View key={row.user_id}>
                  {i > 0 && <View style={styles.rowDivider} />}
                  <View style={[styles.row, isMe && { backgroundColor: activeTabDef.color + '10' }]}>
                    <Text style={[styles.rank, { color: medalColor(colors, row.rnk) }]}>#{row.rnk}</Text>
                    <Avatar path={row.avatar_path} name={row.full_name} size={32} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>
                        {row.full_name || 'Anonymous'}{isMe ? ' (You)' : ''}
                      </Text>
                    </View>
                    <Text style={styles.value}>{renderValue(row)}</Text>
                    {!isMe && (
                      <TouchableOpacity
                        onPress={() => openActions(row)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityRole="button"
                        accessibilityLabel={`More options for ${row.full_name || 'this user'}`}
                      >
                        <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Pinned "your rank" card when you're outside the visible top 50 */}
        {!loading && myRank && !myRankInList && (
          <>
            <Text style={styles.sectionTitle}>Your rank</Text>
            <View style={[styles.card, { borderColor: activeTabDef.color }]}>
              <View style={styles.row}>
                <Text style={[styles.rank, { color: activeTabDef.color }]}>#{myRank.rnk}</Text>
                <Avatar path={profile?.avatar_path} name={profile?.full_name} size={32} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{profile?.full_name || 'You'} (You)</Text>
                </View>
                <Text style={styles.value}>{myRankValue()}</Text>
              </View>
            </View>
          </>
        )}

      </ScrollView>

      <Modal visible={!!actionRow} transparent animationType="fade" onRequestClose={closeActions}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={closeActions}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {actionStep === 'menu' ? (actionRow?.full_name || 'Anonymous') : 'Why are you reporting?'}
            </Text>
            {actionStep === 'menu' ? (
              <>
                <TouchableOpacity style={styles.sheetOption} onPress={() => setActionStep('report')} activeOpacity={0.7} disabled={actionBusy}>
                  <Ionicons name="flag-outline" size={18} color={colors.textPrimary} />
                  <Text style={styles.sheetOptionText}>Report</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetOption} onPress={() => actionRow && confirmBlock(actionRow)} activeOpacity={0.7} disabled={actionBusy}>
                  <Ionicons name="ban-outline" size={18} color={colors.accent} />
                  <Text style={[styles.sheetOptionText, { color: colors.accent }]}>Block</Text>
                </TouchableOpacity>
              </>
            ) : (
              REPORT_REASONS.map(r => (
                <TouchableOpacity key={r.key} style={styles.sheetOption} onPress={() => submitReport(r.key)} activeOpacity={0.7} disabled={actionBusy}>
                  <Text style={styles.sheetOptionText}>{r.label}</Text>
                </TouchableOpacity>
              ))
            )}
            {actionBusy
              ? <ActivityIndicator style={{ marginTop: SPACING.md }} color={colors.primary} />
              : (
                <TouchableOpacity style={styles.sheetCancel} onPress={closeActions} activeOpacity={0.7}>
                  <Text style={styles.sheetCancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },

  tabRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
  },
  tabLabel: { fontSize: FONT_SIZES.sm, color: colors.textMuted },
  explainer: {
    fontSize: FONT_SIZES.xs,
    color: colors.textMuted,
    marginBottom: SPACING.lg,
    lineHeight: 16,
  },

  loadingWrap: { paddingVertical: SPACING.xxxl, alignItems: 'center' },
  emptyText: { fontSize: FONT_SIZES.sm, color: colors.textMuted, textAlign: 'center' },

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
    borderRadius: RADIUS.sm,
  },
  rowDivider: { height: 1, backgroundColor: colors.borderDefault },
  rank: {
    width: 34,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.black,
  },
  name: {
    fontSize: FONT_SIZES.sm,
    color: colors.textPrimary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  value: {
    fontSize: FONT_SIZES.xs,
    color: colors.textSecondary,
    fontWeight: FONT_WEIGHTS.bold,
  },

  sheetOverlay: { flex: 1, backgroundColor: colors.bgOverlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgSecondary,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  sheetTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.black,
    color: colors.textPrimary,
    marginBottom: SPACING.md,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  sheetOptionText: { fontSize: FONT_SIZES.md, color: colors.textPrimary },
  sheetCancel: { padding: SPACING.lg, alignItems: 'center', marginTop: SPACING.sm },
  sheetCancelText: { color: colors.textMuted, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.sm },
  });
}
