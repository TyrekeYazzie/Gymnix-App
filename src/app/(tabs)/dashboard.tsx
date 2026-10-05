import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import Svg, { Circle } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/context/ProfileContext';
import { useTheme } from '@/context/ThemeContext';
import { xpProgress } from '@/lib/xp';
import { getRank } from '@/constants/ranks';
import { getMyLevelRank, MyLevelRank } from '@/lib/leaderboard';
import { getMyWorkoutStreak } from '@/lib/streaks';
import { onLogsChanged } from '@/lib/logEvents';
import ProgressPreviewCard from '@/components/ProgressPreviewCard';
import DailyQuote from '@/components/DailyQuote';
import RankMedallion from '@/components/RankMedallion';
import WorkoutLog from '@/components/logs/WorkoutLog';
import CardioLog from '@/components/logs/CardioLog';
import WaterLog from '@/components/logs/WaterLog';
import CaloriesLog from '@/components/logs/CaloriesLog';
import { nutritionTargetsOrDefault } from '@/lib/nutrition';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useTabBarInset } from '@/hooks/useTabBarInset';
import {
  FONT_SIZES, FONT_WEIGHTS,
  SPACING, RADIUS, Theme, Colors
} from '@/constants/theme';

const HERO_SIZE = 220;
const HERO_STROKE = 14;
const HERO_RADIUS = (HERO_SIZE - HERO_STROKE) / 2;
const HERO_CIRCUMFERENCE = 2 * Math.PI * HERO_RADIUS;

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getTasks(colors: Colors): { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] {
  return [
    { key: 'workout',  label: 'Log Workout',  icon: 'barbell-outline',   color: colors.primary },
    { key: 'cardio',   label: 'Log Cardio',   icon: 'heart-outline',     color: colors.neonGreen },
    { key: 'water',    label: 'Log Water',    icon: 'water-outline',     color: colors.neonBlue },
    { key: 'calories', label: 'Log Meal',     icon: 'nutrition-outline', color: colors.neonYellow },
  ];
}

interface RecentWorkout {
  id: string;
  name: string;
  category: string;
  created_at: string;
}

interface WeekDay {
  label: string;
  isToday: boolean;
  isFuture: boolean;
  percent: number;
}

function localMidnight(daysAgo = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function startOfWeek(): Date {
  const d = localMidnight();
  const dayOfWeek = d.getDay(); // 0 = Sun ... 6 = Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

function formatRelativeDate(dateStr: string): string {
  const logDate = new Date(dateStr);
  const logMidnight = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());
  const days = Math.round((localMidnight().getTime() - logMidnight.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
  return initials || '?';
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { theme, isDark } = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const refreshControl = usePullToRefresh(() => loadDashboard());
  const tabBarInset = useTabBarInset();
  const TASKS = useMemo(() => getTasks(colors), [colors]);
  const CALORIE_GOAL = useMemo(() => nutritionTargetsOrDefault(profile).calorieGoal, [profile]);

  const [todayCalories, setTodayCalories] = useState(0);
  const [streak, setStreak] = useState(0);
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [myRank, setMyRank] = useState<MyLevelRank | null>(null);

  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [cardioOpen, setCardioOpen] = useState(false);
  const [waterOpen, setWaterOpen] = useState(false);
  const [caloriesOpen, setCaloriesOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!user) return;

    const weekStart = startOfWeek();

    const { data: calorieRows, error: calorieError } = await supabase
      .from('calorie_logs')
      .select('calories, created_at')
      .eq('user_id', user.id)
      .gte('created_at', weekStart.toISOString());
    if (calorieError) {
      console.error('Failed to load calories:', calorieError.message);
    } else {
      const rows = calorieRows ?? [];

      const todayTotal = rows
        .filter(r => new Date(r.created_at) >= localMidnight())
        .reduce((sum, r) => sum + r.calories, 0);
      setTodayCalories(todayTotal);

      const totalsByDay = new Map<string, number>();
      rows.forEach(r => {
        const key = new Date(r.created_at).toDateString();
        totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + r.calories);
      });

      const today = localMidnight();
      const days: WeekDay[] = DAY_LABELS.map((label, i) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const isFuture = date > today;
        const isToday = date.toDateString() === today.toDateString();
        const total = totalsByDay.get(date.toDateString()) ?? 0;
        const percent = isFuture ? 0 : Math.min(Math.round((total / CALORIE_GOAL) * 100), 100);
        return { label, isToday, isFuture, percent };
      });
      setWeekDays(days);
    }

    // Server-side, unbounded (see supabase/migrations/20260814010000_workout_streak.sql) —
    // the old version here only ever queried the last 7 days, so it could
    // never report a streak longer than 7.
    getMyWorkoutStreak().then(s => setStreak(s?.current_streak ?? 0));

    const { data: recent, error: recentError } = await supabase
      .from('workouts')
      .select('id, name, category, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8);
    if (recentError) console.error('Failed to load recent workouts:', recentError.message);
    else setRecentWorkouts(recent ?? []);

    // Fire-and-forget — the leaderboard teaser is a nice-to-have, not
    // something the rest of the dashboard should wait on.
    getMyLevelRank().then(setMyRank);
  }, [user, CALORIE_GOAL]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );
  useEffect(() => onLogsChanged(loadDashboard), [loadDashboard]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const calorieProgress = Math.min((todayCalories / CALORIE_GOAL) * 100, 100);
  const heroDashOffset = HERO_CIRCUMFERENCE * (1 - calorieProgress / 100);

  const swipeHandlers = useSwipeTabs();

  return (
    <SafeAreaView style={styles.container} edges={['top']} {...swipeHandlers}>
      <ScrollView
        refreshControl={refreshControl}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarInset }]}
        showsVerticalScrollIndicator={false}
      >

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <Text style={styles.avatarText}>{getInitials(profile?.full_name)}</Text>
          </TouchableOpacity>
        </View>

        {(profile?.daily_quotes_enabled ?? false) && <DailyQuote />}

        {/* Hero circle */}
        <View style={styles.heroWrapper}>
          <Svg width={HERO_SIZE} height={HERO_SIZE}>
            <Circle
              cx={HERO_SIZE / 2}
              cy={HERO_SIZE / 2}
              r={HERO_RADIUS}
              stroke={colors.circleTrack}
              strokeWidth={HERO_STROKE}
              fill="none"
            />
            <Circle
              cx={HERO_SIZE / 2}
              cy={HERO_SIZE / 2}
              r={HERO_RADIUS}
              stroke={colors.primary}
              strokeWidth={HERO_STROKE}
              strokeDasharray={`${HERO_CIRCUMFERENCE} ${HERO_CIRCUMFERENCE}`}
              strokeDashoffset={heroDashOffset}
              strokeLinecap="round"
              fill="none"
              rotation={-90}
              origin={`${HERO_SIZE / 2}, ${HERO_SIZE / 2}`}
            />
          </Svg>
          <View style={styles.heroCenter}>
            <Text style={styles.heroNumber}>{todayCalories}</Text>
            <Text style={styles.heroSubtitle}>kcal today</Text>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{Math.round(calorieProgress)}% of goal</Text>
            </View>
          </View>
        </View>

        {/* Week row */}
        <View style={styles.weekRow}>
          {weekDays.map((day, i) => (
            <View key={i} style={styles.weekDayWrapper}>
              {day.isToday ? (
                <View style={[styles.weekCircle, styles.weekCircleToday]}>
                  <Text style={[styles.weekPercent, styles.weekPercentToday]}>{day.percent}%</Text>
                </View>
              ) : (
                <BlurView
                  intensity={30}
                  tint={isDark ? 'dark' : 'light'}
                  style={[styles.weekCircle, day.isFuture && styles.weekCircleFuture]}
                >
                  {!day.isFuture && (
                    <Text style={styles.weekPercent}>{day.percent}%</Text>
                  )}
                </BlurView>
              )}
              <Text style={styles.weekLabel}>{day.label}</Text>
            </View>
          ))}
        </View>

        {/* Streak card */}
        <View style={styles.tipCard}>
          <Ionicons name="flame" size={26} color={colors.neonOrange} style={styles.tipIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle}>{streak} day streak</Text>
            <Text style={styles.tipBody}>
              {streak > 0
                ? 'Keep logging workouts daily to build your streak.'
                : 'Log a workout today to start a new streak.'}
            </Text>
          </View>
        </View>

        {/* XP / Level card */}
        {(() => {
          const totalXP = profile?.total_xp ?? 0;
          const xp = xpProgress(totalXP);
          const rank = getRank(xp.level, colors);
          return (
            <TouchableOpacity
              style={[styles.xpCard, { borderColor: rank.color + '55' }]}
              onPress={() => router.push('/rank-chart')}
              activeOpacity={0.8}
            >
              <View style={styles.xpHeader}>
                <RankMedallion rank={rank} size={40} />
                <View style={styles.xpHeaderText}>
                  <Text style={styles.xpLevelLabel}>Level {xp.level}</Text>
                  <Text style={[styles.xpRankNameText, { color: rank.color }]} numberOfLines={1}>
                    {rank.name}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.xpLevelLabel}>Total XP</Text>
                  <Text style={styles.xpTotalText}>{totalXP.toLocaleString()}</Text>
                </View>
              </View>
              <View style={styles.xpBarTrack}>
                <View style={[styles.xpBarFill, { width: `${xp.percent}%` as any, backgroundColor: rank.color }]} />
              </View>
              <View style={styles.xpBarFooter}>
                <Text style={styles.xpBarLabel}>{xp.current} XP</Text>
                <Text style={styles.xpBarLabel}>{xp.needed} XP to Lv {xp.level + 1}</Text>
              </View>
            </TouchableOpacity>
          );
        })()}

        {/* Leaderboard teaser */}
        <TouchableOpacity
          style={styles.leaderboardCard}
          onPress={() => router.push('/leaderboard')}
          activeOpacity={0.8}
        >
          <View style={styles.leaderboardIcon}>
            <Ionicons name="trophy" size={18} color={colors.neonYellow} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.leaderboardTitle}>Leaderboard</Text>
            <Text style={styles.leaderboardSubtitle}>
              {myRank ? `You're #${myRank.rnk} by level` : 'See how you rank'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Progress preview — mini trend for Body Weight / Strength / Cardio */}
        <ProgressPreviewCard />

        {/* Daily Tasks */}
        <Text style={styles.sectionTitle}>Daily tasks</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.lg }}>
          <View style={styles.taskRow}>
            {TASKS.map((task) => (
              <TouchableOpacity
                key={task.key}
                style={[styles.taskCard, { borderColor: task.color }]}
                activeOpacity={0.7}
                onPress={() => {
                  if (task.key === 'workout') setWorkoutOpen(true);
                  if (task.key === 'cardio') setCardioOpen(true);
                  if (task.key === 'water') setWaterOpen(true);
                  if (task.key === 'calories') setCaloriesOpen(true);
                }}
              >
                <Ionicons name={task.icon} size={22} color={task.color} style={styles.taskIcon} />
                <Text style={[styles.taskLabel, { color: task.color }]}>{task.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Recent Workouts — bounded height with its own inner scroll, so a
            growing list never pushes the rest of the dashboard down further;
            everything else on this page keeps scrolling normally as one page. */}
        <Text style={styles.sectionTitle}>Recent workouts</Text>

        {recentWorkouts.length === 0 ? (
          <BlurView intensity={25} tint={isDark ? 'dark' : 'light'} style={styles.workoutCard}>
            <Text style={styles.workoutCategory}>No workouts logged yet</Text>
          </BlurView>
        ) : (
          <View style={styles.recentWorkoutsBox}>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {recentWorkouts.map((workout) => (
                <BlurView key={workout.id} intensity={25} tint={isDark ? 'dark' : 'light'} style={styles.workoutCard}>
                  <View style={styles.workoutLeft}>
                    <Text style={styles.workoutName}>{workout.name}</Text>
                    <Text style={styles.workoutCategory}>{workout.category}</Text>
                  </View>
                  <Text style={styles.workoutDate}>{formatRelativeDate(workout.created_at)}</Text>
                </BlurView>
              ))}
            </ScrollView>
          </View>
        )}

      </ScrollView>

      <WorkoutLog visible={workoutOpen} onClose={() => setWorkoutOpen(false)} onSaved={() => { setWorkoutOpen(false); loadDashboard(); }} />
      <CardioLog visible={cardioOpen} onClose={() => setCardioOpen(false)} onSaved={() => { setCardioOpen(false); loadDashboard(); }} />
      <WaterLog visible={waterOpen} onClose={() => setWaterOpen(false)} onSaved={() => { setWaterOpen(false); loadDashboard(); }} />
      <CaloriesLog visible={caloriesOpen} onClose={() => setCaloriesOpen(false)} onSaved={() => { setCaloriesOpen(false); loadDashboard(); }} />
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, CARD, SHADOWS } = theme;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: SPACING.lg,
      paddingBottom: SPACING.xxxl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: SPACING.lg,
    },
    greeting: {
      fontSize: FONT_SIZES.xxxl,
      fontWeight: FONT_WEIGHTS.black,
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    date: {
      fontSize: FONT_SIZES.sm,
      color: colors.textSecondary,
      marginTop: SPACING.xs,
      letterSpacing: 0,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: RADIUS.full,
      backgroundColor: colors.bgElevated,
      borderWidth: 1.5,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOWS.purple,
    },
    avatarText: {
      color: colors.primary,
      fontSize: FONT_SIZES.md,
      fontWeight: FONT_WEIGHTS.black,
    },

    // Hero circle
    heroWrapper: {
      alignSelf: 'center',
      width: HERO_SIZE,
      height: HERO_SIZE,
      marginBottom: SPACING.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroCenter: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroNumber: {
      fontSize: FONT_SIZES.xxxl,
      fontWeight: FONT_WEIGHTS.black,
      color: colors.textPrimary,
    },
    heroSubtitle: {
      fontSize: FONT_SIZES.sm,
      color: colors.textSecondary,
      letterSpacing: 1,
      marginTop: SPACING.xs,
    },
    heroBadge: {
      marginTop: SPACING.md,
      borderColor: colors.borderDefault,
      borderWidth: 1,
      borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
    },
    heroBadgeText: {
      color: colors.textMuted,
      fontSize: FONT_SIZES.xs,
      letterSpacing: 1,
    },

    // Week row
    weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: SPACING.lg,
    },
    weekDayWrapper: {
      alignItems: 'center',
    },
    weekCircle: {
      width: 38,
      height: 38,
      borderRadius: RADIUS.full,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(74, 107, 90, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.xs,
    },
    weekCircleToday: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      ...SHADOWS.purple,
    },
    weekCircleFuture: {
      opacity: 0.4,
    },
    weekPercent: {
      fontSize: 9,
      color: colors.textSecondary,
      fontWeight: FONT_WEIGHTS.bold,
    },
    weekPercentToday: {
      color: colors.textInverse,
    },
    weekLabel: {
      fontSize: FONT_SIZES.xs,
      color: colors.textMuted,
    },

    // Tip / streak card
    tipCard: {
      ...CARD.glowing,
      ...SHADOWS.purple,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      marginBottom: SPACING.lg,
    },
    tipIcon: {},
    tipTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: FONT_WEIGHTS.bold,
      color: colors.textPrimary,
      marginBottom: SPACING.xs,
    },
    tipBody: {
      fontSize: FONT_SIZES.xs,
      color: colors.textSecondary,
    },

    // XP card
    xpCard: {
      backgroundColor: colors.bgSecondary,
      borderWidth: 1,
      borderRadius: RADIUS.md,
      padding: SPACING.lg,
      marginBottom: SPACING.lg,
    },
    xpHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.md,
    },
    xpHeaderText: {
      flex: 1,
    },
    xpLevelLabel: {
      fontSize: FONT_SIZES.xs,
      color: colors.textMuted,
      letterSpacing: 0.3,
    },
    xpRankNameText: {
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.black,
      letterSpacing: 0.3,
      marginTop: 2,
    },
    xpTotalText: {
      fontSize: FONT_SIZES.lg,
      fontWeight: FONT_WEIGHTS.bold,
      color: colors.textPrimary,
    },
    xpBarTrack: {
      height: 8,
      backgroundColor: colors.bgTertiary,
      borderRadius: RADIUS.full,
      overflow: 'hidden',
      marginBottom: SPACING.xs,
    },
    xpBarFill: {
      height: '100%',
      borderRadius: RADIUS.full,
    },
    xpBarFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    xpBarLabel: {
      fontSize: FONT_SIZES.xs,
      color: colors.textMuted,
      letterSpacing: 1,
    },

    // Leaderboard teaser
    leaderboardCard: {
      ...CARD.default,
      ...SHADOWS.purple,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      marginBottom: SPACING.lg,
    },
    leaderboardIcon: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.full,
      backgroundColor: colors.neonYellow + '18',
      borderWidth: 1,
      borderColor: colors.neonYellow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    leaderboardTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: FONT_WEIGHTS.bold,
      color: colors.textPrimary,
    },
    leaderboardSubtitle: {
      fontSize: FONT_SIZES.xs,
      color: colors.textMuted,
      marginTop: 2,
    },

    sectionTitle: {
      fontSize: FONT_SIZES.xs,
      fontWeight: FONT_WEIGHTS.bold,
      color: colors.textMuted,
      letterSpacing: 0.5,
      marginBottom: SPACING.md,
    },

    // Daily tasks
    taskRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
      paddingBottom: SPACING.xs,
    },
    taskCard: {
      width: 110,
      backgroundColor: colors.bgTertiary,
      borderWidth: 1,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      paddingVertical: SPACING.lg,
    },
    taskIcon: {
      marginBottom: SPACING.sm,
    },
    taskLabel: {
      fontSize: FONT_SIZES.xs,
      fontWeight: FONT_WEIGHTS.bold,
      textAlign: 'center',
      letterSpacing: 1,
    },

    // Recent workouts — fixed height shows ~3 cards with a peek of the next
    // one, so it visually reads as scrollable rather than just short.
    recentWorkoutsBox: {
      height: 240,
    },
    workoutCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(74, 107, 90, 0.15)',
      borderRadius: RADIUS.md,
      padding: SPACING.lg,
      overflow: 'hidden',
      marginBottom: SPACING.sm,
    },
    workoutLeft: {
      flex: 1,
    },
    workoutName: {
      fontSize: FONT_SIZES.lg,
      fontWeight: FONT_WEIGHTS.bold,
      color: colors.textPrimary,
      letterSpacing: 1,
      marginBottom: SPACING.xs,
    },
    workoutCategory: {
      fontSize: FONT_SIZES.sm,
      color: colors.primary,
      letterSpacing: 1,
    },
    workoutDate: {
      fontSize: FONT_SIZES.xs,
      color: colors.textMuted,
      letterSpacing: 1,
    },
  });
}
