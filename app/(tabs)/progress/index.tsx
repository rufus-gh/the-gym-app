import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { colors } from '../../../src/constants/colors';
import { spacing, radius } from '../../../src/constants/spacing';
import { typography } from '../../../src/constants/typography';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { formatWeight } from '../../../src/utils/units';
import type { ExerciseModel } from '../../../src/db/models/Exercise';
import type { PersonalRecord } from '../../../src/db/models/PersonalRecord';
import type { BodyMeasurement } from '../../../src/db/models/BodyMeasurement';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExerciseSuggestion {
  id: string;
  name: string;
  category: string;
  primaryMuscles: string[];
}

interface ExercisePRSummary {
  exerciseId: string;
  exerciseName: string;
  weightPR: number | null;
  repsPR: number | null;
  e1rmPR: number | null;
  mostRecentAt: Date | null;
}

// ─── Exercise Selector ────────────────────────────────────────────────────────

interface ExerciseSelectorProps {
  selectedId: string | null;
  onSelect: (exercise: ExerciseSuggestion) => void;
}

const ExerciseSelector = memo(({ selectedId, onSelect }: ExerciseSelectorProps) => {
  const database = useDatabase();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ExerciseSuggestion[]>([]);
  const [open, setOpen] = useState(false);

  const search = useCallback(async (text: string) => {
    if (text.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    const results = await database
      .get<ExerciseModel>('exercises')
      .query(
        Q.where('is_archived', false),
        Q.where('name', Q.like(`%${Q.sanitizeLikeString(text)}%`)),
        Q.take(8),
      )
      .fetch();

    setSuggestions(
      results.map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        primaryMuscles: e.primaryMuscles,
      })),
    );
  }, [database]);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
    setOpen(true);
    void search(text);
  }, [search]);

  const handleSelect = useCallback((ex: ExerciseSuggestion) => {
    setQuery(ex.name);
    setSuggestions([]);
    setOpen(false);
    onSelect(ex);
  }, [onSelect]);

  return (
    <View style={selectorStyles.container}>
      <View style={selectorStyles.inputRow}>
        <Text style={selectorStyles.searchIcon}>{'🔍'}</Text>
        <TextInput
          style={selectorStyles.input}
          value={query}
          onChangeText={handleChangeText}
          onFocus={() => setOpen(true)}
          placeholder="Search exercise…"
          placeholderTextColor="#8E8E93"
          returnKeyType="search"
          accessibilityLabel="Search exercise for analytics"
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => { setQuery(''); setSuggestions([]); setOpen(false); }}
            hitSlop={8}
            accessibilityLabel="Clear search"
          >
            <Text style={selectorStyles.clearBtn}>{'✕'}</Text>
          </Pressable>
        )}
      </View>

      {open && suggestions.length > 0 && (
        <View style={selectorStyles.dropdown}>
          {suggestions.map((ex) => (
            <Pressable
              key={ex.id}
              style={({ pressed }) => [
                selectorStyles.suggestion,
                pressed && selectorStyles.suggestionPressed,
                ex.id === selectedId && selectorStyles.suggestionSelected,
              ]}
              onPress={() => handleSelect(ex)}
              accessibilityRole="button"
            >
              <Text style={selectorStyles.suggestionName}>{ex.name}</Text>
              {ex.primaryMuscles.length > 0 && (
                <Text style={selectorStyles.suggestionMuscle}>{ex.primaryMuscles[0]}</Text>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
});

ExerciseSelector.displayName = 'ExerciseSelector';

const selectorStyles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: spacing.sm,
  },
  searchIcon: {
    fontSize: 15,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.label.primary.dark,
  },
  clearBtn: {
    fontSize: 14,
    color: colors.label.secondary.dark,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.background.elevated.dark,
    borderRadius: radius.md,
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator.dark,
  },
  suggestionPressed: {
    backgroundColor: colors.background.secondary.dark,
  },
  suggestionSelected: {
    backgroundColor: 'rgba(0,122,255,0.15)',
  },
  suggestionName: {
    ...typography.subheadline,
    color: colors.label.primary.dark,
    flex: 1,
  },
  suggestionMuscle: {
    ...typography.footnote,
    color: colors.label.secondary.dark,
    textTransform: 'capitalize',
  },
});

// ─── Exercise Analytics Inline ────────────────────────────────────────────────

interface ExerciseAnalyticsProps {
  exerciseId: string;
  exerciseName: string;
  unit: 'kg' | 'lb';
}

const ExerciseAnalyticsInline = memo(({ exerciseId, exerciseName, unit }: ExerciseAnalyticsProps) => {
  return (
    <View style={analyticsStyles.container}>
      <View style={analyticsStyles.headerRow}>
        <Text style={analyticsStyles.exerciseName}>{exerciseName}</Text>
        <Pressable
          onPress={() => router.push('/progress/charts')}
          accessibilityRole="button"
        >
          <Text style={analyticsStyles.viewFullLink}>Full Analytics {'›'}</Text>
        </Pressable>
      </View>
      <Text style={analyticsStyles.hint}>
        Tap "Full Analytics" to see volume, 1RM, and max weight charts.
      </Text>
    </View>
  );
});

ExerciseAnalyticsInline.displayName = 'ExerciseAnalyticsInline';

const analyticsStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseName: {
    ...typography.headline,
    color: colors.label.primary.dark,
    flex: 1,
  },
  viewFullLink: {
    ...typography.subheadline,
    color: colors.system.blue,
  },
  hint: {
    ...typography.footnote,
    color: colors.label.secondary.dark,
  },
});

// ─── PR Row ───────────────────────────────────────────────────────────────────

interface PRRowProps {
  summary: ExercisePRSummary;
  unit: 'kg' | 'lb';
}

const PRRow = memo(({ summary, unit }: PRRowProps) => (
  <Pressable
    style={({ pressed }) => [prStyles.row, pressed && prStyles.rowPressed]}
    onPress={() => router.push('/progress/records')}
    accessibilityRole="button"
    accessibilityLabel={`Personal records for ${summary.exerciseName}`}
  >
    <Text style={prStyles.name} numberOfLines={1}>{summary.exerciseName}</Text>
    <View style={prStyles.badges}>
      {summary.weightPR != null && (
        <View style={prStyles.badge}>
          <Text style={prStyles.badgeLabel}>WT</Text>
          <Text style={prStyles.badgeValue}>{formatWeight(summary.weightPR, unit, 1)}</Text>
        </View>
      )}
      {summary.e1rmPR != null && (
        <View style={[prStyles.badge, prStyles.badgeGold]}>
          <Text style={prStyles.badgeLabel}>e1RM</Text>
          <Text style={prStyles.badgeValueGold}>{formatWeight(summary.e1rmPR, unit, 1)}</Text>
        </View>
      )}
      {summary.repsPR != null && (
        <View style={prStyles.badge}>
          <Text style={prStyles.badgeLabel}>REPS</Text>
          <Text style={prStyles.badgeValue}>{summary.repsPR}</Text>
        </View>
      )}
    </View>
  </Pressable>
), (prev, next) => prev.summary.exerciseId === next.summary.exerciseId && prev.unit === next.unit);

PRRow.displayName = 'PRRow';

const prStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator.dark,
    gap: spacing.sm,
  },
  rowPressed: {
    backgroundColor: colors.background.elevated.dark,
  },
  name: {
    ...typography.subheadline,
    color: colors.label.primary.dark,
    flex: 1,
    fontWeight: '500',
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.background.tertiary.dark,
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 56,
  },
  badgeGold: {
    backgroundColor: 'rgba(255,215,0,0.12)',
  },
  badgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.label.secondary.dark,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  badgeValue: {
    ...typography.footnote,
    color: colors.label.primary.dark,
    fontWeight: '600',
  },
  badgeValueGold: {
    ...typography.footnote,
    color: colors.semantic.pr,
    fontWeight: '600',
  },
});

// ─── Body Metrics Quick Summary ───────────────────────────────────────────────

interface BodyMetricsSummaryProps {
  latestWeightKg: number | null;
  unit: 'kg' | 'lb';
}

const BodyMetricsSummary = memo(({ latestWeightKg, unit }: BodyMetricsSummaryProps) => (
  <View style={bodyStyles.container}>
    <View style={bodyStyles.row}>
      <View style={bodyStyles.stat}>
        <Text style={bodyStyles.statValue}>
          {latestWeightKg != null ? formatWeight(latestWeightKg, unit, 1) : '—'}
        </Text>
        <Text style={bodyStyles.statLabel}>Body weight</Text>
      </View>
    </View>
    <Pressable
      style={bodyStyles.viewBtn}
      onPress={() => router.push('/progress/body' as never)}
      accessibilityRole="button"
    >
      <Text style={bodyStyles.viewBtnText}>View Body Metrics {'›'}</Text>
    </Pressable>
  </View>
));

BodyMetricsSummary.displayName = 'BodyMetricsSummary';

const bodyStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    alignItems: 'flex-start',
  },
  statValue: {
    ...typography.title2,
    color: colors.label.primary.dark,
  },
  statLabel: {
    ...typography.footnote,
    color: colors.label.secondary.dark,
  },
  viewBtn: {
    alignSelf: 'flex-start',
  },
  viewBtnText: {
    ...typography.subheadline,
    color: colors.system.blue,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const database = useDatabase();
  const { unitPreference } = useSettingsStore();

  const [selectedExercise, setSelectedExercise] = useState<ExerciseSuggestion | null>(null);
  const [prSummaries, setPrSummaries] = useState<ExercisePRSummary[]>([]);
  const [latestWeightKg, setLatestWeightKg] = useState<number | null>(null);

  const loadPRs = useCallback(async () => {
    const records = await database
      .get<PersonalRecord>('personal_records')
      .query(Q.where('is_current_record', true))
      .fetch();

    // Group by exercise
    const byExercise = new Map<string, PersonalRecord[]>();
    for (const r of records) {
      const arr = byExercise.get(r.exerciseId) ?? [];
      arr.push(r);
      byExercise.set(r.exerciseId, arr);
    }

    // Fetch exercise names
    const exerciseIds = Array.from(byExercise.keys());
    const exercises = await database
      .get<ExerciseModel>('exercises')
      .query(Q.where('id', Q.oneOf(exerciseIds)))
      .fetch();

    const nameMap = new Map(exercises.map((e) => [e.id, e.name]));

    const summaries: ExercisePRSummary[] = exerciseIds.map((exId) => {
      const recs = byExercise.get(exId) ?? [];
      const weightRec = recs.find((r) => r.recordType === 'weight');
      const repsRec = recs.find((r) => r.recordType === 'reps');
      const e1rmRec = recs.find((r) => r.recordType === 'estimated_1rm');
      const mostRecentAt = recs.reduce<Date | null>((acc, r) => {
        if (!acc) return r.achievedAt;
        return r.achievedAt > acc ? r.achievedAt : acc;
      }, null);

      return {
        exerciseId: exId,
        exerciseName: nameMap.get(exId) ?? 'Unknown',
        weightPR: weightRec?.value ?? null,
        repsPR: repsRec?.value ?? null,
        e1rmPR: e1rmRec?.value ?? null,
        mostRecentAt,
      };
    });

    // Sort by most recently achieved
    summaries.sort((a, b) => {
      if (!a.mostRecentAt) return 1;
      if (!b.mostRecentAt) return -1;
      return b.mostRecentAt.getTime() - a.mostRecentAt.getTime();
    });

    setPrSummaries(summaries);
  }, [database]);

  const loadBodyMetrics = useCallback(async () => {
    const records = await database
      .get<BodyMeasurement>('body_measurements')
      .query(
        Q.sortBy('measured_at', Q.desc),
        Q.take(1),
      )
      .fetch();

    if (records.length > 0) {
      const latest = records[0];
      // values is a JSON column parsed by the model decorator
      const values = (latest as unknown as { values: { weightKg?: number } }).values;
      setLatestWeightKg(values?.weightKg ?? null);
    }
  }, [database]);

  useEffect(() => {
    void loadPRs();
    void loadBodyMetrics();
  }, [loadPRs, loadBodyMetrics]);

  const displayedPRs = useMemo(() => prSummaries.slice(0, 5), [prSummaries]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Screen Title ─────────────────────────────────────────────── */}
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Progress</Text>
          <Pressable
            onPress={() => router.push('/progress/charts')}
            accessibilityRole="button"
          >
            <Text style={styles.chartsLink}>Charts {'›'}</Text>
          </Pressable>
        </View>

        {/* ── Exercise Selector ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Exercise Analytics</Text>
          <ExerciseSelector
            selectedId={selectedExercise?.id ?? null}
            onSelect={setSelectedExercise}
          />
          {selectedExercise != null && (
            <ExerciseAnalyticsInline
              exerciseId={selectedExercise.id}
              exerciseName={selectedExercise.name}
              unit={unitPreference}
            />
          )}
        </View>

        {/* ── Personal Records ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Personal Records</Text>
            <Pressable
              onPress={() => router.push('/progress/records')}
              accessibilityRole="button"
            >
              <Text style={styles.sectionAction}>See All {'›'}</Text>
            </Pressable>
          </View>
          {displayedPRs.length > 0 ? (
            <View style={styles.prList}>
              {displayedPRs.map((s) => (
                <PRRow key={s.exerciseId} summary={s} unit={unitPreference} />
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>
              Complete workouts to start tracking personal records.
            </Text>
          )}
        </View>

        {/* ── Body Metrics ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Body Metrics</Text>
          <BodyMetricsSummary latestWeightKg={latestWeightKg} unit={unitPreference} />
        </View>
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
    paddingBottom: 40,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  screenTitle: {
    ...typography.title1,
    color: colors.label.primary.dark,
  },
  chartsLink: {
    ...typography.subheadline,
    color: colors.system.blue,
  },
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
  sectionLabel: {
    ...typography.footnote,
    color: colors.label.secondary.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  sectionAction: {
    ...typography.subheadline,
    color: colors.system.blue,
  },
  prList: {
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  emptyText: {
    ...typography.subheadline,
    color: colors.label.secondary.dark,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
