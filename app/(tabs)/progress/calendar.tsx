import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isSameDay,
  startOfWeek,
  subWeeks,
  isToday,
  subDays,
} from 'date-fns';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '../../../src/constants/colors';
import { spacing, radius } from '../../../src/constants/spacing';
import { typography } from '../../../src/constants/typography';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { formatWeight } from '../../../src/utils/units';
import { useReducedMotion } from '../../../src/hooks/useReducedMotion';
import type { WorkoutSession } from '../../../src/db/models/WorkoutSession';

// ─── Constants ────────────────────────────────────────────────────────────────

const HEATMAP_WEEKS = 52;
const CELL_SIZE = 13;
const CELL_GAP = 3;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const GRID_WIDTH = HEATMAP_WEEKS * CELL_STEP - CELL_GAP;
const DAYS_IN_WEEK = 7;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionSummary {
  id: string;
  name: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  totalVolumeKg: number | null;
  totalSets: number | null;
}

interface HeatmapDay {
  date: Date;
  volumeKg: number;
  session: SessionSummary | null;
  isFuture: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function buildHeatmapGrid(sessions: SessionSummary[]): HeatmapDay[][] {
  const today = new Date();
  const gridStart = startOfWeek(subWeeks(today, HEATMAP_WEEKS - 1), { weekStartsOn: 1 });
  const totalDays = HEATMAP_WEEKS * DAYS_IN_WEEK;

  const days: HeatmapDay[] = [];
  for (let i = 0; i < totalDays; i++) {
    const date = addDays(gridStart, i);
    const match = sessions.find((s) => isSameDay(s.startedAt, date)) ?? null;
    days.push({
      date,
      volumeKg: match?.totalVolumeKg ?? 0,
      session: match,
      isFuture: date > today,
    });
  }

  // Group into columns of 7 (weeks)
  const columns: HeatmapDay[][] = [];
  for (let i = 0; i < HEATMAP_WEEKS; i++) {
    columns.push(days.slice(i * DAYS_IN_WEEK, (i + 1) * DAYS_IN_WEEK));
  }
  return columns;
}

function cellColor(volumeKg: number, maxVolume: number, isFuture: boolean): string {
  if (isFuture) return 'transparent';
  if (volumeKg === 0 || maxVolume === 0) return '#1C1C2E';
  const t = Math.min(volumeKg / maxVolume, 1);
  // 4-stop gradient: dim → low blue → mid → accent
  if (t < 0.2) return '#162840';
  if (t < 0.45) return '#1A4A8C';
  if (t < 0.7) return '#1A6FE0';
  return colors.system.blue;
}

function computeStreak(sessions: SessionSummary[]): number {
  if (sessions.length === 0) return 0;

  const today = new Date();
  const uniqueDays = [
    ...Array.from(new Set(sessions.map((s) => format(s.startedAt, 'yyyy-MM-dd')))),
  ].sort().reverse();

  // Streak can start from today or yesterday (if not trained today yet)
  let streak = 0;
  let expected = format(today, 'yyyy-MM-dd');
  if (!uniqueDays.includes(expected)) {
    expected = format(subDays(today, 1), 'yyyy-MM-dd');
    if (!uniqueDays.includes(expected)) return 0;
    streak = 1;
    expected = format(subDays(today, 2), 'yyyy-MM-dd');
  } else {
    streak = 1;
    expected = format(subDays(today, 1), 'yyyy-MM-dd');
  }

  for (let i = 1; i < uniqueDays.length; i++) {
    if (uniqueDays[i] === expected) {
      streak++;
      const prevDate = new Date(expected);
      expected = format(subDays(prevDate, 1), 'yyyy-MM-dd');
    } else {
      break;
    }
  }

  return streak;
}

function computeYearTotal(sessions: SessionSummary[]): number {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  return sessions.filter((s) => s.startedAt >= yearStart).length;
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

interface TooltipProps {
  session: SessionSummary | null;
  date: Date | null;
  unit: 'kg' | 'lb';
  onNavigate: (sessionId: string) => void;
  onDismiss: () => void;
}

const Tooltip = memo(({ session, date, unit, onNavigate, onDismiss }: TooltipProps) => {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(reducedMotion ? 0 : 6);

  useEffect(() => {
    if (date != null) {
      opacity.value = withSpring(1, { damping: 20, stiffness: 400 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 400 });
    } else {
      opacity.value = withSpring(0, { damping: 20, stiffness: 400 });
    }
  }, [date, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (date == null) {
    return <Animated.View style={[tooltipStyles.placeholder, animStyle]} />;
  }

  return (
    <Animated.View style={[tooltipStyles.container, animStyle]}>
      <Pressable style={tooltipStyles.inner} onPress={onDismiss}>
        <View style={tooltipStyles.dateRow}>
          <Text style={tooltipStyles.dateText}>{format(date, 'EEEE, MMMM d')}</Text>
          {session != null && (
            <Pressable
              style={tooltipStyles.viewButton}
              onPress={() => onNavigate(session.id)}
              accessibilityRole="button"
              accessibilityLabel="View session"
            >
              <Text style={tooltipStyles.viewButtonText}>View →</Text>
            </Pressable>
          )}
        </View>

        {session != null ? (
          <View style={tooltipStyles.sessionInfo}>
            <Text style={tooltipStyles.sessionName}>{session.name || 'Workout'}</Text>
            <View style={tooltipStyles.metaRow}>
              {session.totalVolumeKg != null && session.totalVolumeKg > 0 && (
                <Text style={tooltipStyles.meta}>
                  {formatWeight(session.totalVolumeKg, unit, 0)} volume
                </Text>
              )}
              {session.durationSeconds != null && (
                <Text style={tooltipStyles.meta}>
                  {formatDuration(session.durationSeconds)}
                </Text>
              )}
              {session.totalSets != null && (
                <Text style={tooltipStyles.meta}>{session.totalSets} sets</Text>
              )}
            </View>
          </View>
        ) : (
          <Text style={tooltipStyles.restDay}>Rest day</Text>
        )}
      </Pressable>
    </Animated.View>
  );
});
Tooltip.displayName = 'Tooltip';

const tooltipStyles = StyleSheet.create({
  placeholder: {
    height: 72,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  inner: {
    backgroundColor: colors.background.elevated.dark,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator.dark,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    ...typography.footnote,
    color: colors.label.secondary.dark,
  },
  viewButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  viewButtonText: {
    ...typography.footnote,
    color: colors.system.blue,
    fontWeight: '600',
  },
  sessionName: {
    ...typography.headline,
    color: colors.label.primary.dark,
  },
  sessionInfo: {
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  meta: {
    ...typography.caption,
    color: colors.label.secondary.dark,
  },
  restDay: {
    ...typography.subheadline,
    color: colors.label.tertiary.dark,
  },
});

// ─── Heatmap Grid ─────────────────────────────────────────────────────────────

interface HeatmapGridProps {
  columns: HeatmapDay[][];
  maxVolume: number;
  selectedDate: Date | null;
  onDayPress: (day: HeatmapDay) => void;
}

const HeatmapGrid = memo(({ columns, maxVolume, selectedDate, onDayPress }: HeatmapGridProps) => {
  // Month labels: deduplicated by month change across columns
  const monthLabels = useMemo(() => {
    const labels: { label: string; colIndex: number }[] = [];
    let lastMonth = -1;
    columns.forEach((col, colIndex) => {
      const firstDay = col[0];
      if (!firstDay) return;
      const month = firstDay.date.getMonth();
      if (month !== lastMonth) {
        labels.push({ label: format(firstDay.date, 'MMM'), colIndex });
        lastMonth = month;
      }
    });
    return labels;
  }, [columns]);

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={heatmapStyles.scrollContent}
    >
      <View style={heatmapStyles.wrapper}>
        {/* Month labels row */}
        <View style={[heatmapStyles.monthRow, { width: GRID_WIDTH }]}>
          {monthLabels.map(({ label, colIndex }) => (
            <View
              key={`${label}-${colIndex}`}
              style={[heatmapStyles.monthLabelPos, { left: DAYS_IN_WEEK * 0 + colIndex * CELL_STEP }]}
            >
              <Text style={heatmapStyles.monthLabelText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Grid: day labels + columns */}
        <View style={heatmapStyles.gridRow}>
          {/* Day-of-week labels */}
          <View style={heatmapStyles.dayLabelCol}>
            {dayLabels.map((d, i) => (
              <View key={i} style={heatmapStyles.dayLabelCell}>
                {(i === 0 || i === 2 || i === 4) && (
                  <Text style={heatmapStyles.dayLabelText}>{d}</Text>
                )}
              </View>
            ))}
          </View>

          {/* Columns */}
          {columns.map((col, colIndex) => (
            <View key={colIndex} style={heatmapStyles.column}>
              {col.map((day, rowIndex) => {
                const isSelected =
                  selectedDate != null && isSameDay(day.date, selectedDate);
                const bg = cellColor(day.volumeKg, maxVolume, day.isFuture);
                return (
                  <Pressable
                    key={rowIndex}
                    style={[
                      heatmapStyles.cell,
                      { backgroundColor: bg },
                      isSelected && heatmapStyles.cellSelected,
                      isToday(day.date) && heatmapStyles.cellToday,
                    ]}
                    onPress={() => onDayPress(day)}
                    disabled={day.isFuture}
                    accessibilityLabel={`${format(day.date, 'MMM d')}${day.session ? `: ${day.session.name}` : ': rest day'}`}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
});
HeatmapGrid.displayName = 'HeatmapGrid';

const heatmapStyles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  wrapper: {
    gap: CELL_GAP,
  },
  monthRow: {
    height: 16,
    position: 'relative',
    marginLeft: 16 + CELL_GAP, // offset for day labels
  },
  monthLabelPos: {
    position: 'absolute',
    top: 0,
  },
  monthLabelText: {
    ...typography.caption,
    color: colors.label.secondary.dark,
    fontSize: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  dayLabelCol: {
    width: 16,
    flexDirection: 'column',
    gap: CELL_GAP,
  },
  dayLabelCell: {
    height: CELL_SIZE,
    justifyContent: 'center',
  },
  dayLabelText: {
    fontSize: 8,
    color: colors.label.tertiary.dark,
    lineHeight: CELL_SIZE,
  },
  column: {
    flexDirection: 'column',
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 2,
  },
  cellSelected: {
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  cellToday: {
    borderWidth: 1,
    borderColor: colors.system.blue,
  },
});

// ─── Stat Banner ──────────────────────────────────────────────────────────────

interface StatBannerProps {
  streak: number;
  yearTotal: number;
  yearVolume: string;
}

const StatBanner = memo(({ streak, yearTotal, yearVolume }: StatBannerProps) => (
  <View style={bannerStyles.row}>
    <View style={bannerStyles.cell}>
      <Text style={bannerStyles.value}>{streak}</Text>
      <Text style={bannerStyles.label}>Day streak</Text>
    </View>
    <View style={bannerStyles.divider} />
    <View style={bannerStyles.cell}>
      <Text style={bannerStyles.value}>{yearTotal}</Text>
      <Text style={bannerStyles.label}>Sessions this year</Text>
    </View>
    <View style={bannerStyles.divider} />
    <View style={bannerStyles.cell}>
      <Text style={bannerStyles.value}>{yearVolume}</Text>
      <Text style={bannerStyles.label}>Volume this year</Text>
    </View>
  </View>
));
StatBanner.displayName = 'StatBanner';

const bannerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 4,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator.dark,
    alignSelf: 'stretch',
    marginVertical: spacing.sm,
  },
  value: {
    ...typography.title2,
    color: colors.label.primary.dark,
  },
  label: {
    ...typography.caption,
    color: colors.label.secondary.dark,
    textAlign: 'center',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const database = useDatabase();
  const { unitPreference } = useSettingsStore();

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const raw = await database
        .get<WorkoutSession>('workout_sessions')
        .query(
          Q.where('is_deleted', false),
          Q.sortBy('started_at', Q.desc),
        )
        .fetch();

      setSessions(
        raw.map((s) => ({
          id: s.id,
          name: s.name ?? 'Workout',
          startedAt: s.startedAt,
          endedAt: s.endedAt ?? null,
          durationSeconds: s.durationSeconds ?? null,
          totalVolumeKg: s.totalVolumeKg ?? null,
          totalSets: s.totalSets ?? null,
        })),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [database]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadSessions();
  }, [loadSessions]);

  const columns = useMemo(() => buildHeatmapGrid(sessions), [sessions]);

  const maxVolume = useMemo(
    () => Math.max(...columns.flat().map((d) => d.volumeKg), 1),
    [columns],
  );

  const streak = useMemo(() => computeStreak(sessions), [sessions]);
  const yearTotal = useMemo(() => computeYearTotal(sessions), [sessions]);
  const yearVolume = useMemo(() => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const total = sessions
      .filter((s) => s.startedAt >= yearStart)
      .reduce((acc, s) => acc + (s.totalVolumeKg ?? 0), 0);
    return total > 0 ? formatWeight(total, unitPreference, 0) : '—';
  }, [sessions, unitPreference]);

  const handleDayPress = useCallback((day: HeatmapDay) => {
    setSelectedDay((prev) =>
      prev != null && isSameDay(prev.date, day.date) ? null : day,
    );
  }, []);

  const handleDismissTooltip = useCallback(() => setSelectedDay(null), []);

  const handleNavigateToSession = useCallback((sessionId: string) => {
    router.push({ pathname: '/session-detail', params: { sessionId } });
  }, []);

  const selectedDate = selectedDay?.date ?? null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.system.blue}
          />
        }
      >
        {/* ── Page Header ── */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Training Calendar</Text>
        </View>

        {/* ── Stat Banner ── */}
        <StatBanner streak={streak} yearTotal={yearTotal} yearVolume={yearVolume} />

        {/* ── Heatmap ── */}
        <View style={styles.heatmapSection}>
          <Text style={styles.sectionLabel}>LAST 52 WEEKS</Text>
          {loading ? (
            <View style={styles.heatmapPlaceholder}>
              <Text style={styles.loadingText}>Loading…</Text>
            </View>
          ) : (
            <HeatmapGrid
              columns={columns}
              maxVolume={maxVolume}
              selectedDate={selectedDate}
              onDayPress={handleDayPress}
            />
          )}
        </View>

        {/* ── Color Legend ── */}
        <View style={styles.legend}>
          <Text style={styles.legendLabel}>Less</Text>
          {['#1C1C2E', '#162840', '#1A4A8C', '#1A6FE0', colors.system.blue].map(
            (color, i) => (
              <View
                key={i}
                style={[heatmapStyles.cell, { backgroundColor: color }]}
              />
            ),
          )}
          <Text style={styles.legendLabel}>More</Text>
        </View>

        {/* ── Selected Day Tooltip ── */}
        <Tooltip
          session={selectedDay?.session ?? null}
          date={selectedDate}
          unit={unitPreference}
          onNavigate={handleNavigateToSession}
          onDismiss={handleDismissTooltip}
        />

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scroll: {
    flex: 1,
  },
  pageHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  pageTitle: {
    ...typography.title1,
    color: colors.label.primary.dark,
  },
  heatmapSection: {
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.label.secondary.dark,
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  heatmapPlaceholder: {
    height: DAYS_IN_WEEK * CELL_STEP + 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.subheadline,
    color: colors.label.tertiary.dark,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: CELL_GAP + 1,
  },
  legendLabel: {
    ...typography.caption,
    color: colors.label.tertiary.dark,
    fontSize: 10,
  },
  bottomPadding: {
    height: 32,
  },
});
