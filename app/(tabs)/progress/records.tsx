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
import { format } from 'date-fns';
import { colors } from '../../../src/constants/colors';
import { spacing, radius } from '../../../src/constants/spacing';
import { typography } from '../../../src/constants/typography';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { formatWeight } from '../../../src/utils/units';
import { FilterChip } from '../../../src/components/ui/FilterChip';
import type { PersonalRecord } from '../../../src/db/models/PersonalRecord';
import type { ExerciseModel } from '../../../src/db/models/Exercise';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortMode = 'recent' | 'name' | 'improvement';
type MuscleFilter = 'all' | string;

interface ExercisePRGroup {
  exerciseId: string;
  exerciseName: string;
  primaryMuscles: string[];
  records: {
    type: 'weight' | 'reps' | 'volume' | 'estimated_1rm';
    value: number;
    previousValue: number | null;
    achievedAt: Date;
  }[];
  mostRecentAt: Date;
  improvementPct: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcImprovementPct(records: ExercisePRGroup['records']): number | null {
  const weightRec = records.find((r) => r.type === 'weight');
  if (!weightRec || weightRec.previousValue == null || weightRec.previousValue <= 0) return null;
  return Math.round(((weightRec.value - weightRec.previousValue) / weightRec.previousValue) * 100);
}

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest',
  upper_back: 'Upper Back',
  lats: 'Lats',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  abs: 'Abs',
  lower_back: 'Lower Back',
  front_delt: 'Front Delt',
  rear_delt: 'Rear Delt',
  traps: 'Traps',
  forearms: 'Forearms',
};

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'recent', label: 'Most Recent' },
  { id: 'name', label: 'Exercise Name' },
  { id: 'improvement', label: '% Improvement' },
];

// ─── PR Type Badge ────────────────────────────────────────────────────────────

interface PRTypeBadgeProps {
  type: ExercisePRGroup['records'][number]['type'];
  value: number;
  previousValue: number | null;
  unit: 'kg' | 'lb';
}

const PRTypeBadge = memo(({ type, value, previousValue, unit }: PRTypeBadgeProps) => {
  const label = useMemo(() => {
    switch (type) {
      case 'weight': return 'Weight PR';
      case 'reps': return 'Reps PR';
      case 'volume': return 'Volume PR';
      case 'estimated_1rm': return 'e1RM';
    }
  }, [type]);

  const valueLabel = useMemo(() => {
    if (type === 'reps') return `${value} reps`;
    return formatWeight(value, unit, 1);
  }, [type, value, unit]);

  const isGold = type === 'estimated_1rm' || type === 'weight';

  return (
    <View style={[badgeStyles.container, isGold && badgeStyles.containerGold]}>
      <Text style={badgeStyles.typeLabel}>{label}</Text>
      <Text style={[badgeStyles.value, isGold && badgeStyles.valueGold]}>{valueLabel}</Text>
      {previousValue != null && previousValue > 0 && (
        <Text style={badgeStyles.previous}>
          prev {type === 'reps' ? `${previousValue} reps` : formatWeight(previousValue, unit, 1)}
        </Text>
      )}
    </View>
  );
});

PRTypeBadge.displayName = 'PRTypeBadge';

const badgeStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.tertiary.dark,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 80,
  },
  containerGold: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
  },
  typeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.label.secondary.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    ...typography.footnote,
    color: colors.label.primary.dark,
    fontWeight: '600',
    marginTop: 2,
  },
  valueGold: {
    color: colors.semantic.pr,
  },
  previous: {
    fontSize: 10,
    color: colors.label.tertiary.dark,
    marginTop: 1,
  },
});

// ─── Exercise PR Card ─────────────────────────────────────────────────────────

interface ExercisePRCardProps {
  group: ExercisePRGroup;
  unit: 'kg' | 'lb';
}

const ExercisePRCard = memo(({ group, unit }: ExercisePRCardProps) => {
  const dateLabel = format(group.mostRecentAt, 'MMM d, yyyy');

  const handlePress = useCallback(() => {
    router.push({
      pathname: '/library/exercises/[id]' as never,
      params: { id: group.exerciseId },
    });
  }, [group.exerciseId]);

  return (
    <Pressable
      style={({ pressed }) => [cardStyles.card, pressed && cardStyles.cardPressed]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Personal records for ${group.exerciseName}`}
    >
      {/* Header */}
      <View style={cardStyles.header}>
        <View style={cardStyles.headerLeft}>
          <Text style={cardStyles.exerciseName}>{group.exerciseName}</Text>
          {group.primaryMuscles.length > 0 && (
            <Text style={cardStyles.muscleTag}>
              {group.primaryMuscles
                .slice(0, 2)
                .map((m) => MUSCLE_LABELS[m] ?? m)
                .join(' · ')}
            </Text>
          )}
        </View>
        <View style={cardStyles.headerRight}>
          {group.improvementPct != null && (
            <View style={cardStyles.improvementBadge}>
              <Text style={cardStyles.improvementText}>
                {group.improvementPct > 0 ? '+' : ''}{group.improvementPct}%
              </Text>
            </View>
          )}
          <Text style={cardStyles.dateLabel}>{dateLabel}</Text>
        </View>
      </View>

      {/* PR Badges */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={cardStyles.badges}
      >
        {group.records.map((r) => (
          <PRTypeBadge
            key={r.type}
            type={r.type}
            value={r.value}
            previousValue={r.previousValue}
            unit={unit}
          />
        ))}
      </ScrollView>
    </Pressable>
  );
}, (prev, next) => prev.group.exerciseId === next.group.exerciseId && prev.unit === next.unit);

ExercisePRCard.displayName = 'ExercisePRCard';

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cardPressed: {
    backgroundColor: colors.background.elevated.dark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  exerciseName: {
    ...typography.headline,
    color: colors.label.primary.dark,
  },
  muscleTag: {
    ...typography.footnote,
    color: colors.label.secondary.dark,
    textTransform: 'capitalize',
  },
  improvementBadge: {
    backgroundColor: 'rgba(52,199,89,0.15)',
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  improvementText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.system.green,
  },
  dateLabel: {
    ...typography.footnote,
    color: colors.label.secondary.dark,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RecordsScreen() {
  const database = useDatabase();
  const { unitPreference } = useSettingsStore();

  const [groups, setGroups] = useState<ExercisePRGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [muscleFilter, setMuscleFilter] = useState<MuscleFilter>('all');

  const loadRecords = useCallback(async () => {
    try {
      const records = await database
        .get<PersonalRecord>('personal_records')
        .query(Q.where('is_current_record', true))
        .fetch();

      const exerciseIds = Array.from(new Set(records.map((r) => r.exerciseId)));

      const exercises = await database
        .get<ExerciseModel>('exercises')
        .query(Q.where('id', Q.oneOf(exerciseIds)))
        .fetch();

      const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

      const byExercise = new Map<string, PersonalRecord[]>();
      for (const r of records) {
        const arr = byExercise.get(r.exerciseId) ?? [];
        arr.push(r);
        byExercise.set(r.exerciseId, arr);
      }

      const result: ExercisePRGroup[] = [];

      for (const [exId, recs] of Array.from(byExercise.entries())) {
        const exercise = exerciseMap.get(exId);
        if (!exercise) continue;

        const mapped: ExercisePRGroup['records'] = recs.map((r) => ({
          type: r.recordType,
          value: r.value,
          previousValue: r.previousValue,
          achievedAt: r.achievedAt,
        }));

        const mostRecentAt = recs.reduce<Date>((acc, r) => {
          return r.achievedAt > acc ? r.achievedAt : acc;
        }, recs[0].achievedAt);

        result.push({
          exerciseId: exId,
          exerciseName: exercise.name,
          primaryMuscles: exercise.primaryMuscles,
          records: mapped,
          mostRecentAt,
          improvementPct: calcImprovementPct(mapped),
        });
      }

      setGroups(result);
    } finally {
      setLoading(false);
    }
  }, [database]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  // Collect all unique muscle groups for the filter row
  const availableMuscles = useMemo(() => {
    const muscles = new Set<string>();
    for (const g of groups) {
      for (const m of g.primaryMuscles) muscles.add(m);
    }
    return Array.from(muscles).sort();
  }, [groups]);

  // Filter + sort
  const displayGroups = useMemo(() => {
    let filtered = groups;

    if (muscleFilter !== 'all') {
      filtered = filtered.filter((g) => g.primaryMuscles.includes(muscleFilter));
    }

    const sorted = [...filtered];
    switch (sortMode) {
      case 'recent':
        sorted.sort((a, b) => b.mostRecentAt.getTime() - a.mostRecentAt.getTime());
        break;
      case 'name':
        sorted.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
        break;
      case 'improvement':
        sorted.sort((a, b) => {
          const aPct = a.improvementPct ?? -Infinity;
          const bPct = b.improvementPct ?? -Infinity;
          return bPct - aPct;
        });
        break;
    }

    return sorted;
  }, [groups, muscleFilter, sortMode]);

  const renderItem = useCallback(
    ({ item }: { item: ExercisePRGroup }) => (
      <ExercisePRCard group={item} unit={unitPreference} />
    ),
    [unitPreference],
  );

  const keyExtractor = useCallback((item: ExercisePRGroup) => item.exerciseId, []);

  const ListHeader = useMemo(() => (
    <View>
      {/* Sort chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={headerStyles.chipRow}
      >
        {SORT_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.id}
            label={opt.label}
            selected={sortMode === opt.id}
            onPress={() => setSortMode(opt.id)}
          />
        ))}
      </ScrollView>

      {/* Muscle filter */}
      {availableMuscles.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={headerStyles.chipRow}
        >
          <FilterChip
            label="All muscles"
            selected={muscleFilter === 'all'}
            onPress={() => setMuscleFilter('all')}
          />
          {availableMuscles.map((m) => (
            <FilterChip
              key={m}
              label={MUSCLE_LABELS[m] ?? m}
              selected={muscleFilter === m}
              onPress={() => setMuscleFilter(m)}
            />
          ))}
        </ScrollView>
      )}

      <Text style={headerStyles.countLabel}>
        {displayGroups.length} exercise{displayGroups.length !== 1 ? 's' : ''}
      </Text>
    </View>
  ), [sortMode, muscleFilter, availableMuscles, displayGroups.length]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading records…</Text>
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
        <Text style={styles.headerTitle}>Personal Records</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={displayGroups}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'🏆'}</Text>
            <Text style={styles.emptyTitle}>No records yet</Text>
            <Text style={styles.emptyBody}>
              Complete working sets to start setting personal records.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: 130,
          offset: 130 * index,
          index,
        })}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const headerStyles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  countLabel: {
    ...typography.footnote,
    color: colors.label.secondary.dark,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary.dark,
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
  headerSpacer: {
    width: 44,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.subheadline,
    color: colors.label.secondary.dark,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.title3,
    color: colors.label.primary.dark,
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.subheadline,
    color: colors.label.secondary.dark,
    textAlign: 'center',
  },
});
