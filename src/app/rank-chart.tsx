import React, { useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useProfile } from '@/context/ProfileContext';
import { xpProgress } from '@/lib/xp';
import { XP_MEAL, XP_WATER, XP_WEIGHT } from '@/lib/xp';
import { RANKS, getRankIndex } from '@/constants/ranks';
import RankMedallion from '@/components/RankMedallion';
import {
  COLORS, FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, SHADOWS, CARD
} from '@/constants/theme';

const ITEM_WIDTH = 92;

const XP_SOURCES = [
  { icon: 'barbell-outline' as const, label: 'Workouts', detail: '10 XP per set, plus up to +20 more for heavier sets', color: COLORS.primary },
  { icon: 'heart-outline' as const, label: 'Cardio', detail: '15–75 XP based on session duration', color: COLORS.neonGreen },
  { icon: 'water-outline' as const, label: 'Water', detail: `${XP_WATER} XP per log`, color: COLORS.neonBlue },
  { icon: 'nutrition-outline' as const, label: 'Meals', detail: `${XP_MEAL} XP per log`, color: COLORS.neonYellow },
  { icon: 'body-outline' as const, label: 'Weigh-ins', detail: `${XP_WEIGHT} XP per log`, color: COLORS.accent },
];

export default function RankChartScreen() {
  const router = useRouter();
  const { profile } = useProfile();

  const totalXP = profile?.total_xp ?? 0;
  const xp = xpProgress(totalXP);
  const currentIndex = getRankIndex(xp.level);
  const currentRank = RANKS[currentIndex];
  const isMaxRank = currentIndex === RANKS.length - 1;

  const [selectedIndex, setSelectedIndex] = useState(currentIndex);
  const selectedRank = RANKS[selectedIndex];
  const selectedLocked = selectedIndex > currentIndex;

  const scrollRef = useRef<ScrollView>(null);
  const didCenter = useRef(false);

  const handleStripLayout = (e: LayoutChangeEvent) => {
    if (didCenter.current) return;
    didCenter.current = true;
    const viewportWidth = e.nativeEvent.layout.width;
    const targetX = ITEM_WIDTH * currentIndex - (viewportWidth - ITEM_WIDTH) / 2;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: Math.max(targetX, 0), animated: false });
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backRow}>
          <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Your Rank</Text>
        <View style={styles.dividerLine} />

        {/* Hero — current rank */}
        <View style={styles.heroCard}>
          <RankMedallion rank={currentRank} size={96} emphasized />
          <Text style={[styles.heroRankName, { color: currentRank.color }]}>{currentRank.name}</Text>
          <Text style={styles.heroLevel}>Level {xp.level}</Text>
          <Text style={styles.heroDescription}>{currentRank.description}</Text>

          {isMaxRank ? (
            <View style={styles.maxBadge}>
              <Ionicons name="trophy" size={14} color={COLORS.neonYellow} />
              <Text style={styles.maxBadgeText}>Max rank reached</Text>
            </View>
          ) : (
            <>
              <View style={styles.heroXpTrack}>
                <View style={[styles.heroXpFill, { width: `${xp.percent}%` as any, backgroundColor: currentRank.color }]} />
              </View>
              <Text style={styles.heroXpFooter}>
                {xp.current.toLocaleString()} / {xp.needed.toLocaleString()} XP to {RANKS[currentIndex + 1].name}
              </Text>
            </>
          )}
        </View>

        {/* Rank strip — previous rank to the left, next to the right of current */}
        <Text style={styles.sectionTitle}>All ranks</Text>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={handleStripLayout}
          style={styles.stripScroll}
        >
          {RANKS.map((rank, i) => {
            const locked = i > currentIndex;
            const isCurrent = i === currentIndex;
            const isSelected = i === selectedIndex;
            return (
              <TouchableOpacity
                key={rank.name}
                style={[styles.stripItem, { width: ITEM_WIDTH }]}
                onPress={() => setSelectedIndex(i)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.stripMedallionWrap,
                  isSelected && { backgroundColor: (locked ? COLORS.borderDefault : rank.color) + '14' },
                ]}>
                  <RankMedallion rank={rank} size={60} locked={locked} emphasized={isCurrent} />
                </View>
                <Text
                  style={[
                    styles.stripLabel,
                    isCurrent && { color: rank.color, fontWeight: FONT_WEIGHTS.bold },
                  ]}
                  numberOfLines={2}
                >
                  {rank.name}
                </Text>
                {isCurrent && <Text style={styles.stripYouAre}>YOU ARE HERE</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Selected rank detail */}
        <View style={[styles.detailCard, { borderColor: selectedLocked ? COLORS.borderDefault : selectedRank.color }]}>
          <RankMedallion rank={selectedRank} size={44} locked={selectedLocked} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.detailName, { color: selectedLocked ? COLORS.textMuted : selectedRank.color }]}>
              {selectedRank.name}
            </Text>
            <Text style={styles.detailDescription}>{selectedRank.description}</Text>
            <Text style={styles.detailMeta}>
              {selectedLocked
                ? `Unlocks at Level ${selectedRank.minLevel}`
                : selectedIndex === currentIndex
                  ? 'Your current rank'
                  : 'Already unlocked'}
            </Text>
          </View>
        </View>

        {/* How to earn XP */}
        <Text style={styles.sectionTitle}>How to earn XP</Text>
        <View style={styles.xpCard}>
          {XP_SOURCES.map((s, i) => (
            <View key={s.label}>
              {i > 0 && <View style={styles.rowDivider} />}
              <View style={styles.xpRow}>
                <View style={[styles.xpIcon, { borderColor: s.color }]}>
                  <Ionicons name={s.icon} size={16} color={s.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.xpLabel}>{s.label}</Text>
                  <Text style={styles.xpDetail}>{s.detail}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.footnote}>
          Levels take real, sustained effort — rank climbs with consistent logging over weeks and months, not a single big session.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: SPACING.sm, alignSelf: 'flex-start' },
  backText: { color: COLORS.primary, fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, letterSpacing: 1 },
  screenTitle: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.black, color: COLORS.textPrimary, letterSpacing: 0.5, marginBottom: SPACING.sm },
  dividerLine: { height: 1, backgroundColor: COLORS.primary, width: 40, marginBottom: SPACING.xl },

  sectionTitle: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textMuted, letterSpacing: 0.5, marginBottom: SPACING.md },

  heroCard: {
    ...CARD.default, ...SHADOWS.purple,
    alignItems: 'center', paddingVertical: SPACING.xl, marginBottom: SPACING.xl,
  },
  heroRankName: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.black, letterSpacing: 0.5, marginTop: SPACING.md, textAlign: 'center' },
  heroLevel: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginTop: 2 },
  heroDescription: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm, marginBottom: SPACING.lg, paddingHorizontal: SPACING.md },
  heroXpTrack: { width: '100%', height: 8, backgroundColor: COLORS.bgTertiary, borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: SPACING.xs },
  heroXpFill: { height: '100%', borderRadius: RADIUS.full },
  heroXpFooter: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, letterSpacing: 0.3 },
  maxBadge: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.neonYellow, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
  },
  maxBadgeText: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold, color: COLORS.neonYellow, letterSpacing: 0.5 },

  stripScroll: { marginBottom: SPACING.lg },
  stripItem: { alignItems: 'center', paddingVertical: SPACING.sm },
  stripMedallionWrap: { borderRadius: RADIUS.full, padding: 4, marginBottom: SPACING.xs },
  stripLabel: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center', letterSpacing: 0.2, lineHeight: 13 },
  stripYouAre: { fontSize: 8, color: COLORS.textMuted, letterSpacing: 0.5, marginTop: 2 },

  detailCard: {
    ...CARD.default, ...SHADOWS.subtle,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    borderWidth: 1.5, marginBottom: SPACING.xl,
  },
  detailName: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.black, letterSpacing: 0.3, marginBottom: 2 },
  detailDescription: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginBottom: 4 },
  detailMeta: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, fontWeight: FONT_WEIGHTS.bold, letterSpacing: 0.3 },

  xpCard: { ...CARD.default, ...SHADOWS.purple, marginBottom: SPACING.md, padding: SPACING.sm },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm },
  xpIcon: { width: 32, height: 32, borderRadius: RADIUS.full, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  xpLabel: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
  xpDetail: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: COLORS.borderDefault },

  footnote: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, textAlign: 'center', lineHeight: 16, paddingHorizontal: SPACING.md },
});
