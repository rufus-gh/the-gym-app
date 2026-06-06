import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { format, startOfWeek, endOfWeek, subWeeks, isWithinInterval } from 'date-fns';
import { colors } from '../../src/constants/colors';
import { spacing, radius } from '../../src/constants/spacing';
import { typography } from '../../src/constants/typography';
import { useActiveSessionStore } from '../../src/stores/activeSessionStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { formatWeight } from '../../src/utils/units';
import type { WorkoutSession } from '../../src/db/models/WorkoutSession';
import type { WorkoutTemplateModel } from '../../src/db/models/WorkoutTemplate';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionRow {
  id: string;
  name: string;
  startedAt: Date;
  durationSeconds: number | null;
  totalVolumeKg: number | null;
  totalSets: number | null;
}

interface TemplateRow {
  id: string;
  name: string;
  estimatedDurationMinutes: number | null;
  lastUsedAt: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Active Session Card ──────────────────────────────────────────────────────

interface ActiveSessionCardProps {
  sessionName: string;
  elapsedSeconds: number;
  onPress: () => void;
}

const ActiveSessionCard = memo(({ sessionName, elapsedSeconds, onPress }: ActiveSessionCardProps) => {
  const elapsed = useMemo(() => formatElapsed(elapsedSeconds), [elapsedSeconds]);

  return (
    <Pressable
      style={({ pressed }) => [styles.activeCard, pressed && styles.activeCardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Active session: ${sessionName}. Elapsed: ${elapsed}. Tap to return.`}
    >
      <View style={styles.activeCardHeader}>
        <View style={styles.pulseDotWrapper}>
          <View style={styles.pulseDot} />
        </View>
        <Text style={styles.activeCardLabel}>In Progress</Text>
      </View>
      <Text style={styles.activeCardName} numberOfLines={1}>{sessionName || 'Workout'}</Text>
      <View style={styles.activeCardFooter}>
        <Text style={styles.activeCardElapsed}>{elapsed}</Text>
        <View style={styles.activeCardCta}>
          <Text style={styles.activeCardCtaText}>Return to Workout</Text>
          <Text style={styles.activeCardChevron}>{'›'}</Text>
        </View>
      </View>
    </Pressable>
  );
});

ActiveSessionCard.displayName = 'ActiveSessionCard';

// ─── Template Quick-Start Card ────────────────────────────────────────────────

interface TemplateCardProps {
  template: TemplateRow;
  onPress: () => void;
}

const TemplateCard = memo(({ template, onPress }: TemplateCardProps) => (
  <Pressable
    style={({ pressed }) => [styles.templateCard, pressed && styles.templateCardPressed]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`Start ${template.name}`}
  >
    <Text style={styles.templateName} numberOfLines={2}>{template.name}</Text>
    {template.estimatedDurationMinutes != null && (
      <Text style={styles.templateDuration}>~{template.estimatedDurationMinutes}m</Text>
    )}
    <View style={styles.templateStartBtn}>
      <Text style={styles.templateStartText}>Start</Text>
    </View>
  </Pressable>
), (prev, next) => prev.template.id === next.template.id);

TemplateCard.displayName = 'TemplateCard';

// ─── Session Summary Card ─────────────────────────────────────────────────────

interface SessionSummaryCardProps {
  session: SessionRow;
  unit: 'kg' | 'lb';
  onPress: () => void;
}

const SessionSummaryCard = memo(({ session, unit, onPress }: SessionSummaryCardProps) => {
  const dateLabel = format(session.startedAt, 'EEE, d MMM');
  const durationLabel = session.durationSeconds != null
    ? formatDuration(session.durationSeconds)
    : null;
  const volumeLabel = session.totalVolumeKg != null && session.totalVolumeKg > 0
    ? formatWeight(session.totalVolumeKg, unit, 0)
    : null;

  return (
    <Pressable
      style={({ pressed }) => [styles.sessionCard, pressed && styles.sessionCardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${session.name}, ${dateLabel}`}
    >
      <View style={styles.sessionCardLeft}>
        <Text style={styles.sessionName} numberOfLines={1}>{session.name || 'Workout'}</Text>
        <Text style={styles.sessionDate}>{dateLabel}</Text>
      </View>
      <View style={styles.sessionCardMeta}>
        {durationLabel != null && (
          <Text style={styles.sessionMetaText}>{durationLabel}</Text>
        )}
        {volumeLabel != null && (
          <Text style={styles.sessionMetaText}>{volumeLabel}</Text>
        )}
      </View>
    </Pressable>
  );
}, (prev, next) => prev.session.id === next.session.id && prev.unit === next.unit);

SessionSummaryCard.displayName = 'SessionSummaryCard';

// ─── Weekly Summary ───────────────────────────────────────────────────────────

interface WeeklySummaryProps {
  thisWeekSessions: number;
  thisWeekVolumeKg: number;
  lastWeekSessions: number;
  lastWeekVolumeKg: number;
  unit: 'kg' | 'lb';
}

const WeeklySummary = memo(({
  thisWeekSessions,
  thisWeekVolumeKg,
  lastWeekSessions,
  lastWeekVolumeKg,
  unit,
}: WeeklySummaryProps) => {
  const sessionDelta = thisWeekSessions - lastWeekSessions;
  const volumeDelta = thisWeekVolumeKg - lastWeekVolumeKg;
  const volumeDeltaPct = lastWeekVolumeKg > 0
    ? Math.round((volumeDelta / lastWeekVolumeKg) * 100)
    : null;

  const deltaColor = (delta: number) =>
    delta > 0 ? colors.system.green : delta < 0 ? colors.system.red : colors.label.secondary.dark;

  return (
    <View style={styles.weeklySummary}>
      <View style={styles.weeklyStatBlock}>
        <Text style={styles.weeklyStatValue}>{thisWeekSessions}</Text>
        <Text style={styles.weeklyStatLabel}>sessions this week</Text>
        {sessionDelta !== 0 && (
          <Text style={[styles.weeklyStatDelta, { color: deltaColor(sessionDelta) }]}>
            {sessionDelta > 0 ? `+${sessionDelta}` : sessionDelta} vs last week
          </Text>
        )}
      </View>
      <View style={styles.weeklySeparator} />
      <View style={styles.weeklyStatBlock}>
        <Text style={styles.weeklyStatValue}>
          {formatWeight(thisWeekVolumeKg, unit, 0)}
        </Text>
        <Text style={styles.weeklyStatLabel}>total volume</Text>
        {volumeDeltaPct != null && volumeDelta !== 0 && (
          <Text style={[styles.weeklyStatDelta, { color: deltaColor(volumeDelta) }]}>
            {volumeDelta > 0 ? `+${volumeDeltaPct}%` : `${volumeDeltaPct}%`} vs last week
          </Text>
        )}
      </View>
    </View>
  );
});

WeeklySummary.displayName = 'WeeklySummary';

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const database = useDatabase();
  const { unitPreference } = useSettingsStore();

  const sessionId = useActiveSessionStore((s) => s.sessionId);
  const sessionName = useActiveSessionStore((s) => s.sessionName);
  const elapsedSeconds = useActiveSessionStore((s) => s.elapsedSeconds);

  const [recentSessions, setRecentSessions] = useState<SessionRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [thisWeekSessions, setThisWeekSessions] = useState(0);
  const [thisWeekVolumeKg, setThisWeekVolumeKg] = useState(0);
  const [lastWeekSessions, setLastWeekSessions] = useState(0);
  const [lastWeekVolumeKg, setLastWeekVolumeKg] = useState(0);

  const loadData = useCallback(async () => {
    const now = new Date();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    const [rawSessions, rawTemplates] = await Promise.all([
      database
        .get<WorkoutSession>('workout_sessions')
        .query(
          Q.where('is_deleted', false),
          Q.where('ended_at', Q.notEq(null)),
          Q.sortBy('started_at', Q.desc),
          Q.take(20),
        )
        .fetch(),
      database
        .get<WorkoutTemplateModel>('workout_templates')
        .query(
          Q.where('is_archived', false),
          Q.sortBy('last_used_at', Q.desc),
          Q.take(3),
        )
        .fetch(),
    ]);

    const sessionRows: SessionRow[] = rawSessions.slice(0, 3).map((s) => ({
      id: s.id,
      name: s.name ?? 'Workout',
      startedAt: s.startedAt,
      durationSeconds: s.durationSeconds ?? null,
      totalVolumeKg: s.totalVolumeKg ?? null,
      totalSets: s.totalSets ?? null,
    }));

    const templateRows: TemplateRow[] = rawTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      estimatedDurationMinutes: t.estimatedDurationMinutes,
      lastUsedAt: t.lastUsedAt,
    }));

    // Weekly stats
    let twSessions = 0;
    let twVol = 0;
    let lwSessions = 0;
    let lwVol = 0;

    for (const s of rawSessions) {
      if (isWithinInterval(s.startedAt, { start: thisWeekStart, end: thisWeekEnd })) {
        twSessions += 1;
        twVol += s.totalVolumeKg ?? 0;
      } else if (isWithinInterval(s.startedAt, { start: lastWeekStart, end: lastWeekEnd })) {
        lwSessions += 1;
        lwVol += s.totalVolumeKg ?? 0;
      }
    }

    setRecentSessions(sessionRows);
    setTemplates(templateRows);
    setThisWeekSessions(twSessions);
    setThisWeekVolumeKg(twVol);
    setLastWeekSessions(lwSessions);
    setLastWeekVolumeKg(lwVol);
  }, [database]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleStartEmpty = useCallback(() => {
    router.push('/log');
  }, []);

  const handleStartTemplate = useCallback((templateId: string) => {
    router.push({ pathname: '/log', params: { templateId } });
  }, []);

  const handleReturnToSession = useCallback(() => {
    if (sessionId) {
      router.push({ pathname: '/log/[sessionId]', params: { sessionId } });
    }
  }, [sessionId]);

  const handleSessionPress = useCallback((id: string) => {
    router.push({ pathname: '/session-detail', params: { sessionId: id } });
  }, []);

  const handleViewAllHistory = useCallback(() => {
    router.push('/profile/history');
  }, []);

  const todayLabel = format(new Date(), 'EEEE, d MMMM');
  const greeting = getGreeting();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting Header ─────────────────────────────────────────── */}
        <View style={styles.greetingHeader}>
          <Text style={styles.greetingText}>{greeting}</Text>
          <Text style={styles.dateText}>{todayLabel}</Text>
        </View>

        {/* ── Active Session ──────────────────────────────────────────── */}
        {sessionId != null && (
          <View style={styles.section}>
            <ActiveSessionCard
              sessionName={sessionName}
              elapsedSeconds={elapsedSeconds}
              onPress={handleReturnToSession}
            />
          </View>
        )}

        {/* ── Quick Start ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Start</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.startEmptyBtn, pressed && styles.startEmptyBtnPressed]}
            onPress={handleStartEmpty}
            accessibilityRole="button"
          >
            <Text style={styles.startEmptyIcon}>{'+'}</Text>
            <Text style={styles.startEmptyText}>Start Empty Workout</Text>
          </Pressable>

          {templates.length > 0 && (
            <FlatList
              data={templates}
              horizontal
              keyExtractor={(t) => t.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.templateList}
              renderItem={({ item }) => (
                <TemplateCard
                  template={item}
                  onPress={() => handleStartTemplate(item.id)}
                />
              )}
            />
          )}
        </View>

        {/* ── Weekly Summary ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>This Week</Text>
          </View>
          <WeeklySummary
            thisWeekSessions={thisWeekSessions}
            thisWeekVolumeKg={thisWeekVolumeKg}
            lastWeekSessions={lastWeekSessions}
            lastWeekVolumeKg={lastWeekVolumeKg}
            unit={unitPreference}
          />
        </View>

        {/* ── Recent Activity ──────────────────────────────────────────── */}
        {recentSessions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <Pressable onPress={handleViewAllHistory} accessibilityRole="button">
                <Text style={styles.sectionAction}>See All</Text>
              </Pressable>
            </View>
            {recentSessions.map((s) => (
              <SessionSummaryCard
                key={s.id}
                session={s}
                unit={unitPreference}
                onPress={() => handleSessionPress(s.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary.dark,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },

  // Greeting
  greetingHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  greetingText: {
    ...typography.title1,
    color: colors.label.primary.dark,
  },
  dateText: {
    ...typography.subheadline,
    color: colors.label.secondary.dark,
    marginTop: 2,
  },

  // Sections
  section: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.footnote,
    color: colors.label.secondary.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  sectionAction: {
    ...typography.subheadline,
    color: colors.system.blue,
  },

  // Active session card
  activeCard: {
    backgroundColor: colors.system.blue,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  activeCardPressed: {
    opacity: 0.88,
  },
  activeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pulseDotWrapper: {
    width: 8,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  activeCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeCardName: {
    ...typography.title3,
    color: '#FFFFFF',
  },
  activeCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeCardElapsed: {
    ...typography.numericLg,
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 28,
  },
  activeCardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.full,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  activeCardCtaText: {
    ...typography.headline,
    color: '#FFFFFF',
  },
  activeCardChevron: {
    fontSize: 20,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 24,
  },

  // Quick start
  startEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.system.blue,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  startEmptyBtnPressed: {
    opacity: 0.85,
  },
  startEmptyIcon: {
    fontSize: 22,
    fontWeight: '300',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  startEmptyText: {
    ...typography.headline,
    color: '#FFFFFF',
  },
  templateList: {
    gap: spacing.sm,
  },
  templateCard: {
    width: 140,
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  templateCardPressed: {
    backgroundColor: colors.background.elevated.dark,
  },
  templateName: {
    ...typography.subheadline,
    color: colors.label.primary.dark,
    fontWeight: '600',
    flex: 1,
  },
  templateDuration: {
    ...typography.footnote,
    color: colors.label.secondary.dark,
  },
  templateStartBtn: {
    backgroundColor: colors.system.blue,
    borderRadius: radius.sm,
    paddingVertical: 6,
    alignItems: 'center',
  },
  templateStartText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Weekly summary
  weeklySummary: {
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  weeklyStatBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  weeklySeparator: {
    width: StyleSheet.hairlineWidth,
    height: 48,
    backgroundColor: colors.separator.dark,
  },
  weeklyStatValue: {
    ...typography.title2,
    color: colors.label.primary.dark,
  },
  weeklyStatLabel: {
    ...typography.footnote,
    color: colors.label.secondary.dark,
    textAlign: 'center',
  },
  weeklyStatDelta: {
    ...typography.footnote,
    fontWeight: '500',
  },

  // Session summary cards
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sessionCardPressed: {
    backgroundColor: colors.background.elevated.dark,
  },
  sessionCardLeft: {
    flex: 1,
    gap: 2,
  },
  sessionName: {
    ...typography.headline,
    color: colors.label.primary.dark,
  },
  sessionDate: {
    ...typography.footnote,
    color: colors.label.secondary.dark,
  },
  sessionCardMeta: {
    alignItems: 'flex-end',
    gap: 2,
  },
  sessionMetaText: {
    ...typography.footnote,
    color: colors.label.secondary.dark,
  },
});
