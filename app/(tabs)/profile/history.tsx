import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { format, startOfWeek, addDays, subWeeks, isSameDay } from 'date-fns';
import { colors } from '../../../src/constants/colors';
import { spacing, radius } from '../../../src/constants/spacing';
import { typography } from '../../../src/constants/typography';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { formatWeight } from '../../../src/utils/units';
import { PRBadge } from '../../../src/components/ui/PRBadge';
import type { WorkoutSession } from '../../../src/db/models/WorkoutSession';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionRow {
  id: string;
  name: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  totalVolumeKg: number | null;
  totalSets: number | null;
  exerciseCount: number | null;
  isPersonalRecord: boolean;
}

interface Section {
  title: string;           // "June 2026"
  monthVolumeKg: number;
  data: SessionRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function buildSections(sessions: SessionRow[]): Section[] {
  const map = new Map<string, SessionRow[]>();
  for (const s of sessions) {
    const key = format(s.startedAt, 'MMMM yyyy');
    const arr = map.get(key) ?? [];
    arr.push(s);
    map.set(key, arr);
  }
  const sections: Section[] = [];
  for (const [title, data] of Array.from(map.entries())) {
    const monthVolumeKg = data.reduce((acc, s) => acc + (s.totalVolumeKg ?? 0), 0);
    sections.push({ title, monthVolumeKg, data });
  }
  return sections;
}

// ─── Calendar Heatmap ────────────────────────────────────────────────────────

const HEATMAP_WEEKS = 52;
const CELL_SIZE = 11;
const CELL_GAP = 2;
const DAYS_PER_COL = 7;

interface HeatmapDay {
  date: Date;
  volumeKg: number;
  sessionId: string | null;
}

function buildHeatmapData(sessions: SessionRow[]): HeatmapDay[] {
  const today = new Date();
  const startDate = startOfWeek(subWeeks(today, HEATMAP_WEEKS - 1), { weekStartsOn: 1 });
  const totalDays = HEATMAP_WEEKS * 7;
  const days: HeatmapDay[] = [];

  for (let i = 0; i < totalDays; i++) {
    const date = addDays(startDate, i);
    const match = sessions.find((s) => isSameDay(s.startedAt, date));
    days.push({
      date,
      volumeKg: match?.totalVolumeKg ?? 0,
      sessionId: match?.id ?? null,
    });
  }
  return days;
}

function heatmapColor(volumeKg: number, maxVolume: number): string {
  if (volumeKg === 0 || maxVolume === 0) return '#1C1C2E';
  const intensity = Math.min(volumeKg / maxVolume, 1);
  // Interpolate from dim blue to primary accent
  if (intensity < 0.25) return '#1A3A5C';
  if (intensity < 0.5) return '#1A5CBF';
  if (intensity < 0.75) return '#0A84FF';
  return '#007AFF';
}

interface CalendarHeatmapProps {
  sessions: SessionRow[];
  onDayPress: (sessionId: string) => void;
}

const CalendarHeatmap = memo(({ sessions, onDayPress }: CalendarHeatmapProps) => {
  const days = useMemo(() => buildHeatmapData(sessions), [sessions]);
  const maxVolume = useMemo(
    () => Math.max(...days.map((d) => d.volumeKg), 1),
    [days],
  );

  // Group into columns (weeks), each column = 7 days Mon→Sun
  const columns = useMemo(() => {
    const cols: HeatmapDay[][] = [];
    for (let i = 0; i < HEATMAP_WEEKS; i++) {
      cols.push(days.slice(i * 7, i * 7 + 7));
    }
    return cols;
  }, [days]);

  // Month label positions: find first day of each month within the grid
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

  const cellStep = CELL_SIZE + CELL_GAP;
  const gridWidth = HEATMAP_WEEKS * cellStep - CELL_GAP;

  return (
    <View style={heatmapStyles.container}>
      <Text style={heatmapStyles.heading}>Training Activity</Text>
      <View style={[heatmapStyles.grid, { width: gridWidth }]}>
        {/* Month labels */}
        <View style={heatmapStyles.monthRow}>
          {monthLabels.map(({ label, colIndex }) => (
            <View
              key={`${label}-${colIndex}`}
              style={[heatmapStyles.monthLabel, { left: colIndex * cellStep }]}
            >
              <Text style={heatmapStyles.monthLabelText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Day cells */}
        <View style={heatmapStyles.columnsRow}>
          {columns.map((col, colIndex) => (
            <View key={colIndex} style={heatmapStyles.column}>
              {col.map((day, rowIndex) => (
                <Pressable
                  key={rowIndex}
                  style={[
                    heatmapStyles.cell,
                    { backgroundColor: heatmapColor(day.volumeKg, maxVolume) },
                  ]}
                  onPress={() => {
                    if (day.sessionId) onDayPress(day.sessionId);
                  }}
                  accessibilityLabel={`${format(day.date, 'MMM d')}: ${day.volumeKg > 0 ? `${Math.round(day.volumeKg)} kg volume` : 'rest day'}`}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
});

CalendarHeatmap.displayName = 'CalendarHeatmap';

const heatmapStyles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  heading: {
    ...typography.headline,
    color: colors.label.primary.dark,
    marginBottom: spacing.sm,
  },
  grid: {
    overflow: 'hidden',
  },
  monthRow: {
    height: 16,
    position: 'relative',
    marginBottom: CELL_GAP,
  },
  monthLabel: {
    position: 'absolute',
    top: 0,
  },
  monthLabelText: {
    ...typography.caption,
    color: colors.label.secondary.dark,
    fontSize: 9,
  },
  columnsRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
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
});

// ─── Session Card ─────────────────────────────────────────────────────────────

interface SessionCardProps {
  session: SessionRow;
  unit: 'kg' | 'lb';
  onPress: () => void;
}

const SessionCard = memo(({ session, unit, onPress }: SessionCardProps) => {
  const dateLabel = format(session.startedAt, 'EEEE, d MMM');
  const durationLabel =
    session.durationSeconds != null ? formatDuration(session.durationSeconds) : null;
  const volumeLabel =
    session.totalVolumeKg != null && session.totalVolumeKg > 0
      ? formatWeight(session.totalVolumeKg, unit, 0)
      : null;
  const exerciseLabel =
    session.exerciseCount != null
      ? `${session.exerciseCount} exercise${session.exerciseCount !== 1 ? 's' : ''}`
      : null;

  return (
    <Pressable
      style={({ pressed }) => [
        cardStyles.card,
        pressed && cardStyles.cardPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${session.name}, ${dateLabel}`}
    >
      <View style={cardStyles.row}>
        <View style={cardStyles.left}>
          <Text style={cardStyles.name} numberOfLines={1}>
            {session.name || 'Untitled workout'}
          </Text>
          <Text style={cardStyles.date}>{dateLabel}</Text>
        </View>
        {session.isPersonalRecord && (
          <PRBadge size="sm" />
        )}
      </View>

      <View style={cardStyles.meta}>
        {durationLabel != null && (
          <View style={cardStyles.metaChip}>
            <Text style={cardStyles.metaIcon}>{'⏱'}</Text>
            <Text style={cardStyles.metaText}>{durationLabel}</Text>
          </View>
        )}
        {volumeLabel != null && (
          <View style={cardStyles.metaChip}>
            <Text style={cardStyles.metaIcon}>{'⚡'}</Text>
            <Text style={cardStyles.metaText}>{volumeLabel}</Text>
          </View>
        )}
        {exerciseLabel != null && (
          <View style={cardStyles.metaChip}>
            <Text style={cardStyles.metaIcon}>{'◼'}</Text>
            <Text style={cardStyles.metaText}>{exerciseLabel}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}, (prev, next) => prev.session.id === next.session.id && prev.unit === next.unit);

SessionCard.displayName = 'SessionCard';

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cardPressed: {
    backgroundColor: colors.background.elevated.dark,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  left: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.headline,
    color: colors.label.primary.dark,
  },
  date: {
    ...typography.footnote,
    color: colors.label.secondary.dark,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background.tertiary.dark,
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaIcon: {
    fontSize: 11,
  },
  metaText: {
    ...typography.footnote,
    color: colors.label.secondary.dark,
  },
});

// ─── Section Header ───────────────────────────────────────────────────────────

interface MonthHeaderProps {
  title: string;
  monthVolumeKg: number;
  unit: 'kg' | 'lb';
}

const MonthHeader = memo(({ title, monthVolumeKg, unit }: MonthHeaderProps) => (
  <View style={monthStyles.header}>
    <Text style={monthStyles.title}>{title}</Text>
    {monthVolumeKg > 0 && (
      <Text style={monthStyles.volume}>{formatWeight(monthVolumeKg, unit, 0)}</Text>
    )}
  </View>
));

MonthHeader.displayName = 'MonthHeader';

const monthStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.title3,
    color: colors.label.primary.dark,
  },
  volume: {
    ...typography.subheadline,
    color: colors.label.secondary.dark,
  },
});

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyHistory() {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>{'📋'}</Text>
      <Text style={emptyStyles.title}>No sessions yet</Text>
      <Text style={emptyStyles.body}>Complete your first workout to see your history here.</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title3,
    color: colors.label.primary.dark,
    textAlign: 'center',
  },
  body: {
    ...typography.subheadline,
    color: colors.label.secondary.dark,
    textAlign: 'center',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const database = useDatabase();
  const { unitPreference } = useSettingsStore();
  const sectionListRef = useRef<SectionList<SessionRow, Section>>(null);

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const rawSessions = await database
        .get<WorkoutSession>('workout_sessions')
        .query(
          Q.where('is_deleted', false),
          Q.sortBy('started_at', Q.desc),
        )
        .fetch();

      // Fetch session exercise counts in parallel
      const rows = await Promise.all(
        rawSessions.map(async (s) => {
          const exCount = await database
            .get('session_exercises')
            .query(Q.where('session_id', s.id))
            .fetchCount();

          // A session is a PR if any of its sets was a PR
          const prCount = await database
            .get('sets')
            .query(
              Q.where('session_id', s.id),
              Q.where('is_personal_record', true),
            )
            .fetchCount()
            .catch(() => 0);

          return {
            id: s.id,
            name: s.name ?? 'Untitled workout',
            startedAt: s.startedAt,
            endedAt: s.endedAt ?? null,
            durationSeconds: s.durationSeconds ?? null,
            totalVolumeKg: s.totalVolumeKg ?? null,
            totalSets: s.totalSets ?? null,
            exerciseCount: exCount,
            isPersonalRecord: prCount > 0,
          } satisfies SessionRow;
        }),
      );

      setSessions(rows);
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

  const sections = useMemo(() => buildSections(sessions), [sessions]);

  const handleSessionPress = useCallback((id: string) => {
    router.push({ pathname: '/session-detail', params: { sessionId: id } });
  }, []);

  const handleHeatmapDayPress = useCallback(
    (sessionId: string) => {
      // Find the section that contains the session and scroll to it
      for (let si = 0; si < sections.length; si++) {
        const itemIndex = sections[si].data.findIndex((s) => s.id === sessionId);
        if (itemIndex !== -1) {
          sectionListRef.current?.scrollToLocation({
            sectionIndex: si,
            itemIndex,
            animated: true,
          });
          return;
        }
      }
    },
    [sections],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => (
      <MonthHeader
        title={section.title}
        monthVolumeKg={section.monthVolumeKg}
        unit={unitPreference}
      />
    ),
    [unitPreference],
  );

  const renderItem = useCallback(
    ({ item }: { item: SessionRow }) => (
      <SessionCard
        session={item}
        unit={unitPreference}
        onPress={() => handleSessionPress(item.id)}
      />
    ),
    [unitPreference, handleSessionPress],
  );

  const keyExtractor = useCallback((item: SessionRow) => item.id, []);

  const ListHeader = useMemo(
    () => (
      <CalendarHeatmap
        sessions={sessions}
        onDayPress={handleHeatmapDayPress}
      />
    ),
    [sessions, handleHeatmapDayPress],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading history…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <Text style={styles.backChevron}>{'‹'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Workout History</Text>
        <View style={styles.headerRight} />
      </View>

      <SectionList<SessionRow, Section>
        ref={sectionListRef}
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={sessions.length > 0 ? ListHeader : null}
        ListEmptyComponent={<EmptyHistory />}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.system.blue}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator.dark,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backChevron: {
    fontSize: 28,
    lineHeight: 32,
    color: colors.system.blue,
    fontWeight: '300',
  },
  headerTitle: {
    ...typography.headline,
    color: colors.label.primary.dark,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
  },
  listContent: {
    paddingBottom: 32,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.subheadline,
    color: colors.label.secondary.dark,
  },
});
