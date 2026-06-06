import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';

import { BUILT_IN_PROGRAMS } from '../../../../src/constants/programs';
import type { ProgramModel } from '../../../../src/db/models/Program';
import type { ProgramSlotModel } from '../../../../src/db/models/ProgramSlot';
import type { WorkoutTemplateModel } from '../../../../src/db/models/WorkoutTemplate';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlotData {
  weekNumber: number;
  dayNumber: number;
  templateId: string | null;
  templateName: string | null;
}

interface ProgramData {
  id: string;
  name: string;
  description: string;
  authorName: string | null;
  durationWeeks: number;
  daysPerWeek: number;
  goal: string;
  experienceLevel: string;
  deloadWeek: number | null;
  isBuiltIn: boolean;
  isActive: boolean;
  currentWeek: number;
  currentDay: number;
  slots: SlotData[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GOAL_LABEL: Record<string, string> = {
  strength: 'Strength',
  hypertrophy: 'Hypertrophy',
  powerbuilding: 'Powerbuilding',
  endurance: 'Endurance',
  general: 'General',
};

const GOAL_COLOR: Record<string, string> = {
  strength: '#FF9500',
  hypertrophy: '#AF52DE',
  powerbuilding: '#007AFF',
  endurance: '#34C759',
  general: '#5AC8FA',
};

const EXPERIENCE_LABEL: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── WeekGrid ─────────────────────────────────────────────────────────────────

interface WeekGridProps {
  week: number;
  daysPerWeek: number;
  deloadWeek: number | null;
  slots: SlotData[];
  currentWeek: number;
  currentDay: number;
  isActive: boolean;
  onDayPress: (weekNumber: number, dayNumber: number, templateId: string | null) => void;
}

const WeekGrid = ({
  week,
  daysPerWeek,
  deloadWeek,
  slots,
  currentWeek,
  currentDay,
  isActive,
  onDayPress,
}: WeekGridProps) => {
  const isDeload = deloadWeek === week;
  const isCurrentWeek = isActive && currentWeek === week;

  return (
    <View style={styles.weekRow}>
      {/* Week label */}
      <View style={styles.weekLabelCol}>
        <Text style={[styles.weekLabel, isCurrentWeek && styles.weekLabelActive]}>
          W{week}
        </Text>
        {isDeload && (
          <View style={styles.deloadPip}>
            <Text style={styles.deloadPipText}>D</Text>
          </View>
        )}
      </View>

      {/* Day cells */}
      <View style={styles.dayCells}>
        {Array.from({ length: daysPerWeek }, (_, i) => {
          const dayNumber = i + 1;
          const slot = slots.find(
            (s) => s.weekNumber === week && s.dayNumber === dayNumber,
          );
          const templateName = slot?.templateName ?? null;
          const isCurrent = isCurrentWeek && currentDay === dayNumber;

          return (
            <TouchableOpacity
              key={dayNumber}
              style={[
                styles.dayCell,
                templateName ? styles.dayCellFilled : styles.dayCellEmpty,
                isDeload && styles.dayCellDeload,
                isCurrent && styles.dayCellCurrent,
              ]}
              onPress={() =>
                onDayPress(week, dayNumber, slot?.templateId ?? null)
              }
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={
                templateName
                  ? `Week ${week} day ${dayNumber}: ${templateName}`
                  : `Week ${week} day ${dayNumber}: Rest`
              }
            >
              <Text
                style={[
                  styles.dayCellLabel,
                  !templateName && styles.dayCellLabelEmpty,
                  isCurrent && styles.dayCellLabelCurrent,
                ]}
                numberOfLines={2}
              >
                {templateName ?? 'Rest'}
              </Text>
              {isCurrent && <View style={styles.currentDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ─── MetaStat ─────────────────────────────────────────────────────────────────

const MetaStat = ({ value, label }: { value: string; label: string }) => (
  <View style={styles.metaStat}>
    <Text style={styles.metaStatValue}>{value}</Text>
    <Text style={styles.metaStatLabel}>{label}</Text>
  </View>
);

// ─── ProgramDetailScreen ──────────────────────────────────────────────────────

export default function ProgramDetailScreen() {
  const { id, builtin, start } = useLocalSearchParams<{
    id: string;
    builtin?: string;
    start?: string;
  }>();
  const database = useDatabase();

  const isBuiltIn = builtin === '1';
  const [programData, setProgramData] = useState<ProgramData | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [loading, setLoading] = useState(true);

  // Load program data
  useEffect(() => {
    if (!id) return;

    if (isBuiltIn) {
      // Built-in programs have no DB record — use static data
      const builtIn = BUILT_IN_PROGRAMS.find((p) => p.id === id);
      if (builtIn) {
        setProgramData({
          id: builtIn.id,
          name: builtIn.name,
          description: builtIn.description,
          authorName: null,
          durationWeeks: builtIn.totalWeeks,
          daysPerWeek: builtIn.daysPerWeek,
          goal: builtIn.goal,
          experienceLevel: builtIn.experienceLevel,
          deloadWeek: builtIn.deloadWeek,
          isBuiltIn: true,
          isActive: false,
          currentWeek: 1,
          currentDay: 1,
          slots: [],
        });
      }
      setLoading(false);
      return;
    }

    // User-created program — load from WatermelonDB
    let cancelled = false;
    (async () => {
      try {
        const program = await database.get<ProgramModel>('programs').find(id);
        const slotModels = await database
          .get<ProgramSlotModel>('program_slots')
          .query(Q.where('program_id', id))
          .fetch();

        // Resolve template names
        const templateIds = [...new Set(slotModels.map((s) => (s as unknown as { templateId: string }).templateId))];
        const templateMap = new Map<string, string>();
        if (templateIds.length > 0) {
          const templates = await database
            .get<WorkoutTemplateModel>('workout_templates')
            .query(Q.where('id', Q.oneOf(templateIds)))
            .fetch();
          templates.forEach((t) => templateMap.set(t.id, t.name));
        }

        if (cancelled) return;

        const slots: SlotData[] = slotModels.map((s) => {
          const templateId = (s as unknown as { templateId: string }).templateId;
          return {
            weekNumber: s.weekNumber,
            dayNumber: s.dayNumber,
            templateId,
            templateName: templateMap.get(templateId) ?? null,
          };
        });

        const progAsAny = program as unknown as {
          isActive?: boolean;
          currentWeek?: number;
          currentDay?: number;
        };

        setProgramData({
          id: program.id,
          name: program.name,
          description: program.description ?? '',
          authorName: program.author,
          durationWeeks: program.durationWeeks,
          daysPerWeek: program.daysPerWeek,
          goal: program.targetGoal,
          experienceLevel: program.experienceLevel,
          deloadWeek: program.deloadWeek,
          isBuiltIn: false,
          isActive: progAsAny.isActive ?? false,
          currentWeek: progAsAny.currentWeek ?? 1,
          currentDay: progAsAny.currentDay ?? 1,
          slots,
        });
        setSelectedWeek(progAsAny.currentWeek ?? 1);
      } catch {
        // program not found
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, isBuiltIn, database]);

  // Auto-open start flow if navigated with ?start=1
  useEffect(() => {
    if (start === '1' && programData && !programData.isActive) {
      handleStartStop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, programData?.isActive]);

  const handleStartStop = useCallback(async () => {
    if (!programData) return;

    if (programData.isBuiltIn) {
      // Built-in programs: navigate to create screen pre-filled or just mark active
      // For now show a placeholder toast-like update
      setProgramData((prev) =>
        prev ? { ...prev, isActive: !prev.isActive } : prev,
      );
      return;
    }

    try {
      const program = await database.get<ProgramModel>('programs').find(programData.id);
      const nextActive = !programData.isActive;
      await database.write(() =>
        program.update((m) => {
          (m as unknown as { isActive: boolean }).isActive = nextActive;
          if (nextActive) {
            (m as unknown as { startedAt: number }).startedAt = Date.now();
            (m as unknown as { currentWeek: number }).currentWeek = 1;
            (m as unknown as { currentDay: number }).currentDay = 1;
          }
        }),
      );
      setProgramData((prev) =>
        prev
          ? {
              ...prev,
              isActive: nextActive,
              currentWeek: nextActive ? 1 : prev.currentWeek,
              currentDay: nextActive ? 1 : prev.currentDay,
            }
          : prev,
      );
    } catch {
      // write failed — leave state unchanged
    }
  }, [programData, database]);

  const handleDayPress = useCallback(
    (weekNumber: number, dayNumber: number, templateId: string | null) => {
      if (templateId) {
        router.push(`/(tabs)/library/templates/${templateId}`);
      }
      // Rest days: no navigation
    },
    [],
  );

  // Week tabs — only show if more than 1 week
  const weekNumbers = useMemo(
    () =>
      programData
        ? Array.from({ length: programData.durationWeeks }, (_, i) => i + 1)
        : [],
    [programData],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!programData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>Program not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const goalColor = GOAL_COLOR[programData.goal] ?? '#5AC8FA';
  const goalLabel = GOAL_LABEL[programData.goal] ?? programData.goal;
  const expLabel = EXPERIENCE_LABEL[programData.experienceLevel] ?? programData.experienceLevel;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backButtonText}>‹ Programs</Text>
        </TouchableOpacity>

        {/* Program name + goal badge */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>{programData.name}</Text>
          <View style={[styles.goalBadge, { backgroundColor: goalColor + '26' }]}>
            <Text style={[styles.goalBadgeText, { color: goalColor }]}>{goalLabel}</Text>
          </View>
        </View>

        {/* Author */}
        {programData.authorName ? (
          <Text style={styles.author}>by {programData.authorName}</Text>
        ) : null}

        {/* Meta stats */}
        <View style={styles.metaRow}>
          <MetaStat value={`${programData.durationWeeks}`} label="weeks" />
          <View style={styles.metaDivider} />
          <MetaStat value={`${programData.daysPerWeek}`} label="days/wk" />
          <View style={styles.metaDivider} />
          <MetaStat value={expLabel} label="level" />
          {programData.deloadWeek !== null && (
            <>
              <View style={styles.metaDivider} />
              <MetaStat value={`Wk ${programData.deloadWeek}`} label="deload" />
            </>
          )}
        </View>

        {/* Description */}
        <Text style={styles.description}>{programData.description}</Text>

        {/* Active program progress */}
        {programData.isActive && (
          <View style={styles.progressCard}>
            <Text style={styles.progressLabel}>Current position</Text>
            <Text style={styles.progressValue}>
              Week {programData.currentWeek}, Day {programData.currentDay}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${
                      Math.round(
                        ((programData.currentWeek - 1) / programData.durationWeeks) * 100,
                      )
                    }%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressSub}>
              {programData.currentWeek - 1} of {programData.durationWeeks} weeks complete
            </Text>
          </View>
        )}

        {/* Deload legend */}
        {programData.deloadWeek !== null && (
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: '#FF9500' + '33' }]} />
              <Text style={styles.legendText}>Deload week (Wk {programData.deloadWeek})</Text>
            </View>
          </View>
        )}

        {/* Week selector (multi-week programs) */}
        {weekNumbers.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekTabs}
            style={styles.weekTabsScroll}
          >
            {weekNumbers.map((w) => (
              <TouchableOpacity
                key={w}
                style={[
                  styles.weekTab,
                  selectedWeek === w && styles.weekTabActive,
                  programData.deloadWeek === w && styles.weekTabDeload,
                ]}
                onPress={() => setSelectedWeek(w)}
                accessibilityRole="tab"
                accessibilityLabel={`Week ${w}${programData.deloadWeek === w ? ' (deload)' : ''}`}
                accessibilityState={{ selected: selectedWeek === w }}
              >
                <Text
                  style={[
                    styles.weekTabText,
                    selectedWeek === w && styles.weekTabTextActive,
                  ]}
                >
                  Wk {w}
                </Text>
                {programData.deloadWeek === w && <View style={styles.deloadDot} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Day column headers */}
        <View style={styles.gridSection}>
          <View style={styles.dayHeaderRow}>
            <View style={styles.weekLabelCol} />
            <View style={styles.dayCells}>
              {Array.from({ length: programData.daysPerWeek }, (_, i) => (
                <View key={i} style={styles.dayHeaderCell}>
                  <Text style={styles.dayHeaderText}>
                    {DAY_LABELS[i] ?? `D${i + 1}`}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Show only the selected week's grid row */}
          <WeekGrid
            week={selectedWeek}
            daysPerWeek={programData.daysPerWeek}
            deloadWeek={programData.deloadWeek}
            slots={programData.slots}
            currentWeek={programData.currentWeek}
            currentDay={programData.currentDay}
            isActive={programData.isActive}
            onDayPress={handleDayPress}
          />
        </View>

        {/* Note about built-in program slots */}
        {programData.isBuiltIn && (
          <View style={styles.builtInNote}>
            <Text style={styles.builtInNoteText}>
              Template assignments are configured when you start this program.
            </Text>
          </View>
        )}

        {/* Start / Stop button */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            programData.isActive && styles.primaryButtonStop,
          ]}
          onPress={handleStartStop}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={programData.isActive ? 'Stop program' : 'Start program'}
        >
          <Text style={styles.primaryButtonText}>
            {programData.isActive ? 'Stop Program' : 'Start Program'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CELL_MIN_WIDTH = 56;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
    gap: 16,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'rgba(235,235,245,0.4)',
    fontSize: 16,
  },
  backButton: {
    marginBottom: -4,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flexWrap: 'wrap',
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  goalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  goalBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  author: {
    color: 'rgba(235,235,245,0.45)',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: -8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  metaStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metaStatValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  metaStatLabel: {
    color: 'rgba(235,235,245,0.45)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metaDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#38383A',
  },
  description: {
    color: 'rgba(235,235,245,0.65)',
    fontSize: 14,
    lineHeight: 21,
  },
  // ── Active progress
  progressCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 14,
    gap: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#34C759',
  },
  progressLabel: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  progressValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#2C2C2E',
    borderRadius: 2,
    marginTop: 4,
  },
  progressFill: {
    height: 4,
    backgroundColor: '#34C759',
    borderRadius: 2,
  },
  progressSub: {
    color: 'rgba(235,235,245,0.4)',
    fontSize: 12,
  },
  // ── Legend
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 12,
  },
  // ── Week tabs
  weekTabsScroll: {
    marginHorizontal: -16,
  },
  weekTabs: {
    paddingHorizontal: 16,
    gap: 8,
  },
  weekTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
    gap: 4,
  },
  weekTabActive: {
    backgroundColor: '#007AFF',
  },
  weekTabDeload: {
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  weekTabText: {
    color: 'rgba(235,235,245,0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
  weekTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  deloadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF9500',
  },
  // ── Grid
  gridSection: {
    gap: 2,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  weekLabelCol: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  weekLabel: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 12,
    fontWeight: '600',
  },
  weekLabelActive: {
    color: '#34C759',
  },
  deloadPip: {
    backgroundColor: '#FF9500',
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  deloadPipText: {
    color: '#000000',
    fontSize: 8,
    fontWeight: '800',
  },
  dayCells: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  dayHeaderCell: {
    flex: 1,
    minWidth: CELL_MIN_WIDTH,
    alignItems: 'center',
  },
  dayHeaderText: {
    color: 'rgba(235,235,245,0.4)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    minHeight: 60,
  },
  dayCell: {
    flex: 1,
    minWidth: CELL_MIN_WIDTH,
    minHeight: 56,
    borderRadius: 8,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellFilled: {
    backgroundColor: '#1C1C1E',
  },
  dayCellEmpty: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderStyle: 'dashed',
  },
  dayCellDeload: {
    borderWidth: 1,
    borderColor: '#FF9500' + '66',
    backgroundColor: '#FF9500' + '11',
  },
  dayCellCurrent: {
    borderWidth: 2,
    borderColor: '#34C759',
    backgroundColor: '#34C759' + '15',
  },
  dayCellLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },
  dayCellLabelEmpty: {
    color: 'rgba(235,235,245,0.2)',
    fontStyle: 'italic',
  },
  dayCellLabelCurrent: {
    color: '#34C759',
    fontWeight: '700',
  },
  currentDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#34C759',
    marginTop: 3,
  },
  // ── Built-in note
  builtInNote: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  builtInNoteText: {
    color: 'rgba(235,235,245,0.6)',
    fontSize: 13,
    lineHeight: 19,
  },
  // ── Primary button
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonStop: {
    backgroundColor: '#FF3B30',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
