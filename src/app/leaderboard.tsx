import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
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
  MyLevelRank, MyLogCountRank,
} from '@/lib/leaderboard';
import { LevelLeaderboardEntry, LogCountLeaderboardEntry } from '@/types';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS, CARD
} from '@/constants/theme';

type TabKey = 'level' | 'strength' | 'cardio';
type Row = LevelLeaderboardEntry | LogCountLeaderboardEntry;

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'level',    label: 'Level',    icon: 'trophy-outline',  color: COLORS.primary },
  { key: 'strength', label: 'Strength', icon: 'barbell-outline', color: COLORS.accent },
  { key: 'cardio',   label: 'Cardio',   icon: 'heart-outline',   color: COLORS.neonGreen },
];

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
}

// Gold/silver/bronze for the podium, muted for everyone else.
function medalColor(rnk: number): string {
  if (rnk === 1) return COLORS.neonYellow;
  if (rnk === 2) return COLORS.textSecondary;
  if (rnk === 3) return COLORS.neonOrange;
  return COLORS.textMuted;
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile();

  const [tab, setTab] = useState<TabKey>('level');
  const [loading, setLoading] = useState(true);

  const [levelEntries, setLevelEntries] = useState<LevelLeaderboardEntry[]>([]);
  const [strengthEntries, setStrengthEntries] = useState<LogCountLeaderboardEntry[]>([]);
  const [cardioEntries, setCardioEntries] = useState<LogCountLeaderboardEntry[]>([]);

  const [myLevelRank, setMyLevelRank] = useState<MyLevelRank | null>(null);
  const [myStrengthRank, setMyStrengthRank] = useState<MyLogCountRank | null>(null);
  const [myCardioRank, setMyCardioRank] = useState<MyLogCountRank | null>(null);

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
    } else {
      const [entries, mine] = await Promise.all([getCardioLeaderboard(50), getMyCardioRank()]);
      setCardioEntries(entries);
      setMyCardioRank(mine);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(tab); }, [tab, load]));

  const activeTabDef = TABS.find(t => t.key === tab)!;
  const rows: Row[] = tab === 'level' ? levelEntries : tab === 'strength' ? strengthEntries : cardioEntries;
  const myRank = tab === 'level' ? myLevelRank : tab === 'strength' ? myStrengthRank : myCardioRank;
  const myRankInList = rows.some(r => r.user_id === user?.id);

  const renderValue = (row: Row) => {
    if (tab === 'level') {
      const r = row as LevelLeaderboardEntry;
      return `Lv ${r.level} · ${r.total_xp.toLocaleString()} XP`;
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
    const r = myRank as MyLogCountRank;
    return `${r.log_count.toLocaleString()} ${r.log_count === 1 ? 'session' : 'sessions'}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButtonRow}>
            <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
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
                <Ionicons name={t.icon} size={16} color={active ? t.color : COLORS.textMuted} />
                <Text style={[styles.tabLabel, active && { color: t.color, fontWeight: FONT_WEIGHTS.bold }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {tab !== 'level' && (
          <Text style={styles.explainer}>
            Ranked by sessions logged, not weight lifted or pace — consistency wins.
          </Text>
        )}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={COLORS.primary} />
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
                    <Text style={[styles.rank, { color: medalColor(row.rnk) }]}>#{row.rnk}</Text>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{getInitials(row.full_name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>
                        {row.full_name || 'Anonymous'}{isMe ? ' (You)' : ''}
                      </Text>
                    </View>
                    <Text style={styles.value}>{renderValue(row)}</Text>
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
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(profile?.full_name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{profile?.full_name || 'You'} (You)</Text>
                </View>
                <Text style={styles.value}>{myRankValue()}</Text>
              </View>
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  header: { marginBottom: SPACING.sm },
  backButtonRow: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  backButton: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 1,
  },
  screenTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.black,
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  dividerLine: {
    height: 1,
    backgroundColor: COLORS.primary,
    width: 40,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textMuted,
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
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
  },
  tabLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted },
  explainer: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
    lineHeight: 16,
  },

  loadingWrap: { paddingVertical: SPACING.xxxl, alignItems: 'center' },
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, textAlign: 'center' },

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
  rowDivider: { height: 1, backgroundColor: COLORS.borderDefault },
  rank: {
    width: 34,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.black,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgTertiary,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.black,
  },
  name: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  value: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.bold,
  },
});
