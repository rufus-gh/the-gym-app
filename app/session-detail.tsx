import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { format } from 'date-fns';
import { colors } from '../src/constants/colors';
import { spacing, radius } from '../src/constants/spacing';
import { typography } from '../src/constants/typography';
import { useSettingsStore } from '../src/stores/settingsStore';
import { formatWeight } from '../src/utils/units';
import { PRBadge } from '../src/components/ui/PRBadge';
import type { WorkoutSession } from '../src/db/models/WorkoutSession';
import type { SessionExercise } from '../src/db/models/SessionExercise';
import type { SetModel } from '../src/db/models/Set';
import type { ExerciseModel } from '../src/db/models/Exercise';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetDetail {
  id: string;
  setNumber: number;
  setType: 'working' | 'warmup' | 'dropset' | 'failure';
  weightKgActual: number | null;
  reps: number | null;
  rpe: number | null;
  isPersonalRecord: boolean;
  isWarmup: boolean;
  notes: string | null;
}

interface ExerciseSection {
  id: string;
  exerciseId: string;
  exerciseName: string;
  orderIndex: number;
  sets: SetDetail[];
  prCount: number;
}

interface SessionDetail {
  id: string;
  name: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  totalVolumeKg: number | null;
  totalSets: number | null;
  totalReps: number | null;
  bodyweightKg: number | null;
  notes: string | null;
  exerciseSections: ExerciseSection[];
  prCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function setTypeLabel(setType: SetDetail['setType'], isWarmup: boolean): string {
  if (isWarmup || setType === 'warmup') return 'W';
  if (setType === 'dropset') return 'D';
  if (setType === 'failure') return 'F';
  return '';
}

function setTypeLabelColor(setType: SetDetail['setType'], isWarmup: boolean): string {
  if (isWarmup || setType === 'warmup') return colors.label.secondary.dark;
  if (setType === 'dropset') return colors.system.orange;
  if (setType === 'failure') return colors.system.red;
  return colors.label.tertiary.dark;
}

// ─── Stat Cell ────────────────────────────────────────────────────────────────

interface StatCellProps {
  icon: string;
  value: string;
  label: string;
}

const StatCell = memo(({ icon, value, label }: StatCellProps) => (
  <View style={statStyles.cell}>
    <Text style={statStyles.icon}>{icon}</Text>
    <Text style={statStyles.value}>{value}</Text>
    <Text style={statStyles.label}>{label}</Text>
  </View>
));
StatCell.displayName = 'StatCell';

const statStyles = StyleSheet.create({
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
  },
  icon: {
    fontSize: 18,
    marginBottom: 2,
  },
  value: {
    ...typography.title3,
    color: colors.label.primary.dark,
  },
  label: {
    ...typography.caption,
    color: colors.label.secondary.dark,
    textAlign: 'center',
  },
});

// ─── Set Detail Row ───────────────────────────────────────────────────────────

interface SetRowProps {
  set: SetDetail;
  unit: 'kg' | 'lb';
  editMode: boolean;
  onEdit: (setId: string, field: 'weightKgActual' | 'reps', value: number) => void;
}

const SetDetailRow = memo(
  ({ set, unit, editMode, onEdit }: SetRowProps) => {
    const isWarmup = set.isWarmup || set.setType === 'warmup';
    const typeLabel = setTypeLabel(set.setType, set.isWarmup);
    const typeLabelColor = setTypeLabelColor(set.setType, set.isWarmup);

    const weightStr =
      set.weightKgActual != null
        ? formatWeight(set.weightKgActual, unit, 1)
        : '— ';
    const repsStr = set.reps != null ? `${set.reps} reps` : '—';

    return (
      <View style={[setRowStyles.row, isWarmup && setRowStyles.warmupRow]}>
        {/* Set number / type label */}
        <View style={setRowStyles.numContainer}>
          {typeLabel ? (
            <Text style={[setRowStyles.typeLabel, { color: typeLabelColor }]}>
              {typeLabel}
            </Text>
          ) : (
            <Text style={[setRowStyles.setNum, isWarmup && setRowStyles.setNumMuted]}>
              {set.setNumber}
            </Text>
          )}
        </View>

        {/* Weight */}
        {editMode ? (
          <TextInput
            style={setRowStyles.editInput}
            defaultValue={
              set.weightKgActual != null
                ? (unit === 'lb'
                    ? (set.weightKgActual * 2.20462).toFixed(1)
                    : set.weightKgActual.toFixed(1))
                : ''
            }
            keyboardType="decimal-pad"
            onEndEditing={(e) => {
              const val = parseFloat(e.nativeEvent.text);
              if (!isNaN(val)) {
                const kg = unit === 'lb' ? val * 0.453592 : val;
                onEdit(set.id, 'weightKgActual', kg);
              }
            }}
            accessibilityLabel={`Weight for set ${set.setNumber}`}
          />
        ) : (
          <Text style={[setRowStyles.weight, isWarmup && setRowStyles.muted]}>
            {weightStr}
          </Text>
        )}

        <Text style={[setRowStyles.separator, isWarmup && setRowStyles.muted]}>{'×'}</Text>

        {/* Reps */}
        {editMode ? (
          <TextInput
            style={setRowStyles.editInput}
            defaultValue={set.reps != null ? String(set.reps) : ''}
            keyboardType="number-pad"
            onEndEditing={(e) => {
              const val = parseInt(e.nativeEvent.text, 10);
              if (!isNaN(val)) onEdit(set.id, 'reps', val);
            }}
            accessibilityLabel={`Reps for set ${set.setNumber}`}
          />
        ) : (
          <Text style={[setRowStyles.reps, isWarmup && setRowStyles.muted]}>{repsStr}</Text>
        )}

        {/* RPE */}
        {set.rpe != null && (
          <Text style={setRowStyles.rpe}>RPE {set.rpe}</Text>
        )}

        {/* PR badge */}
        {set.isPersonalRecord && !isWarmup && (
          <PRBadge size="sm" />
        )}
      </View>
    );
  },
  (prev, next) =>
    prev.set.id === next.set.id &&
    prev.unit === next.unit &&
    prev.editMode === next.editMode,
);
SetDetailRow.displayName = 'SetDetailRow';

const setRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    minHeight: 44,
  },
  warmupRow: {
    opacity: 0.7,
  },
  numContainer: {
    width: 24,
    alignItems: 'center',
  },
  setNum: {
    ...typography.footnote,
    color: colors.label.secondary.dark,
    fontWeight: '600',
  },
  setNumMuted: {
    color: colors.label.tertiary.dark,
  },
  typeLabel: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  weight: {
    ...typography.body,
    color: colors.label.primary.dark,
    minWidth: 80,
  },
  separator: {
    ...typography.body,
    color: colors.label.secondary.dark,
  },
  reps: {
    ...typography.body,
    color: colors.label.primary.dark,
    flex: 1,
  },
  rpe: {
    ...typography.caption,
    color: colors.label.secondary.dark,
    backgroundColor: colors.background.tertiary.dark,
    borderRadius: radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  muted: {
    color: colors.label.secondary.dark,
  },
  editInput: {
    ...typography.body,
    color: colors.label.primary.dark,
    backgroundColor: colors.background.elevated.dark,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    minWidth: 64,
    borderWidth: 1,
    borderColor: colors.system.blue,
  },
});

// ─── Exercise Section ─────────────────────────────────────────────────────────

interface ExerciseSectionCardProps {
  section: ExerciseSection;
  unit: 'kg' | 'lb';
  editMode: boolean;
  onEdit: (setId: string, field: 'weightKgActual' | 'reps', value: number) => void;
}

const ExerciseSectionCard = memo(({ section, unit, editMode, onEdit }: ExerciseSectionCardProps) => (
  <View style={exerciseStyles.card}>
    <View style={exerciseStyles.header}>
      <Text style={exerciseStyles.name}>{section.exerciseName}</Text>
      {section.prCount > 0 && (
        <PRBadge size="sm" />
      )}
    </View>
    <View style={exerciseStyles.separator} />
    {section.sets.map((set, idx) => (
      <React.Fragment key={set.id}>
        <SetDetailRow set={set} unit={unit} editMode={editMode} onEdit={onEdit} />
        {idx < section.sets.length - 1 && (
          <View style={exerciseStyles.setDivider} />
        )}
      </React.Fragment>
    ))}
  </View>
));
ExerciseSectionCard.displayName = 'ExerciseSectionCard';

const exerciseStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  name: {
    ...typography.headline,
    color: colors.label.primary.dark,
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator.dark,
  },
  setDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator.dark,
    marginLeft: spacing.md + 24 + spacing.sm,
  },
});

// ─── Notes Editor ─────────────────────────────────────────────────────────────

interface NotesEditorProps {
  value: string;
  onSave: (notes: string) => void;
}

const NotesEditor = memo(({ value, onSave }: NotesEditorProps) => {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);

  return (
    <View style={notesStyles.container}>
      <Text style={notesStyles.label}>SESSION NOTES</Text>
      <TextInput
        style={[notesStyles.input, focused && notesStyles.inputFocused]}
        value={text}
        onChangeText={setText}
        multiline
        placeholder="Add notes…"
        placeholderTextColor={colors.label.tertiary.dark}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          if (text !== value) onSave(text);
        }}
        accessibilityLabel="Session notes"
      />
    </View>
  );
});
NotesEditor.displayName = 'NotesEditor';

const notesStyles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.label.secondary.dark,
    letterSpacing: 0.5,
    paddingHorizontal: spacing.xs,
  },
  input: {
    ...typography.body,
    color: colors.label.primary.dark,
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 80,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator.dark,
    textAlignVertical: 'top',
  },
  inputFocused: {
    borderColor: colors.system.blue,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SessionDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const database = useDatabase();
  const { unitPreference } = useSettingsStore();

  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [pendingEdits, setPendingEdits] = useState<
    Map<string, { weightKgActual?: number; reps?: number }>
  >(new Map());

  const loadDetail = useCallback(async () => {
    if (!sessionId) return;

    try {
      const session = await database
        .get<WorkoutSession>('workout_sessions')
        .find(sessionId);

      const sessionExercises = await database
        .get<SessionExercise>('session_exercises')
        .query(
          Q.where('session_id', sessionId),
          Q.sortBy('order_index', Q.asc),
        )
        .fetch();

      // Fetch exercise names + sets for all session exercises in parallel
      const sections = await Promise.all(
        sessionExercises.map(async (se) => {
          const exercise = await database
            .get<ExerciseModel>('exercises')
            .find(se.exerciseId)
            .catch(() => null);

          const sets = await database
            .get<SetModel>('sets')
            .query(
              Q.where('session_exercise_id', se.id),
              Q.sortBy('set_number', Q.asc),
            )
            .fetch();

          const setDetails: SetDetail[] = sets.map((s) => ({
            id: s.id,
            setNumber: s.setNumber,
            setType: s.setType,
            weightKgActual: s.weightKgActual,
            reps: s.reps,
            rpe: s.rpe,
            isPersonalRecord: s.isPersonalRecord,
            isWarmup: s.isWarmup,
            notes: s.notes,
          }));

          return {
            id: se.id,
            exerciseId: se.exerciseId,
            exerciseName: exercise?.name ?? 'Unknown exercise',
            orderIndex: se.orderIndex,
            sets: setDetails,
            prCount: setDetails.filter((s) => s.isPersonalRecord).length,
          } satisfies ExerciseSection;
        }),
      );

      const totalPRs = sections.reduce((acc, sec) => acc + sec.prCount, 0);

      setDetail({
        id: session.id,
        name: session.name ?? 'Untitled workout',
        startedAt: session.startedAt,
        endedAt: session.endedAt ?? null,
        durationSeconds: session.durationSeconds ?? null,
        totalVolumeKg: session.totalVolumeKg ?? null,
        totalSets: session.totalSets ?? null,
        totalReps: session.totalReps ?? null,
        bodyweightKg: session.bodyweightKg ?? null,
        notes: session.notes ?? null,
        exerciseSections: sections,
        prCount: totalPRs,
      });
    } finally {
      setLoading(false);
    }
  }, [database, sessionId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleSetEdit = useCallback(
    (setId: string, field: 'weightKgActual' | 'reps', value: number) => {
      setPendingEdits((prev) => {
        const next = new Map(prev);
        const existing = next.get(setId) ?? {};
        next.set(setId, { ...existing, [field]: value });
        return next;
      });
    },
    [],
  );

  const handleSaveEdits = useCallback(async () => {
    if (pendingEdits.size === 0) {
      setEditMode(false);
      return;
    }

    try {
      await database.write(async () => {
        for (const [setId, changes] of Array.from(pendingEdits.entries())) {
          const set = await database.get<SetModel>('sets').find(setId);
          await set.update((s) => {
            if (changes.weightKgActual !== undefined) {
              s.weightKgActual = changes.weightKgActual;
              // Keep weightKg in sync when no plate rounding is in play
              if (s.weightKg === s.weightKgActual || s.weightKg == null) {
                s.weightKg = changes.weightKgActual;
              }
            }
            if (changes.reps !== undefined) {
              s.reps = changes.reps;
            }
          });
        }
      });

      setPendingEdits(new Map());
      setEditMode(false);
      void loadDetail(); // refresh display
    } catch {
      Alert.alert('Save Failed', 'Could not save your edits. Please try again.');
    }
  }, [database, pendingEdits, loadDetail]);

  const handleCancelEdit = useCallback(() => {
    setPendingEdits(new Map());
    setEditMode(false);
  }, []);

  const handleSaveNotes = useCallback(
    async (notes: string) => {
      if (!sessionId) return;
      try {
        await database.write(async () => {
          const session = await database
            .get<WorkoutSession>('workout_sessions')
            .find(sessionId);
          await session.update((s) => {
            s.notes = notes || null;
          });
        });
      } catch {
        // Silently fail — notes are non-critical
      }
    },
    [database, sessionId],
  );

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!sessionId) return;
            try {
              await database.write(async () => {
                const session = await database
                  .get<WorkoutSession>('workout_sessions')
                  .find(sessionId);
                await session.update((s) => {
                  (s as unknown as { is_deleted: boolean }).is_deleted = true;
                });
              });
              router.back();
            } catch {
              Alert.alert('Error', 'Could not delete the session. Please try again.');
            }
          },
        },
      ],
    );
  }, [database, sessionId]);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const statsRow = useMemo(() => {
    if (!detail) return null;
    const duration =
      detail.durationSeconds != null ? formatDuration(detail.durationSeconds) : '—';
    const volume =
      detail.totalVolumeKg != null && detail.totalVolumeKg > 0
        ? formatWeight(detail.totalVolumeKg, unitPreference, 0)
        : '—';
    const sets = detail.totalSets != null ? String(detail.totalSets) : '—';
    const prs = detail.prCount > 0 ? String(detail.prCount) : '—';
    return { duration, volume, sets, prs };
  }, [detail, unitPreference]);

  // ─────────────────────────────────────────────────────────────────────────

  if (loading || !detail) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading session…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dateLabel = format(detail.startedAt, 'EEEE, MMMM d, yyyy');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── Navigation Header ── */}
      <View style={styles.navHeader}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <Text style={styles.backChevron}>{'‹'}</Text>
        </Pressable>

        <View style={styles.navTitle}>
          <Text style={styles.navTitleText} numberOfLines={1}>
            {detail.name}
          </Text>
        </View>

        {editMode ? (
          <View style={styles.editActions}>
            <Pressable onPress={handleCancelEdit} hitSlop={8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => void handleSaveEdits()} hitSlop={8}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.editButton}
            onPress={() => setEditMode(true)}
            accessibilityRole="button"
            accessibilityLabel="Edit session"
            hitSlop={8}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        {/* ── Session Title + Date ── */}
        <View style={styles.titleBlock}>
          <Text style={styles.sessionTitle}>{detail.name}</Text>
          <Text style={styles.sessionDate}>{dateLabel}</Text>
        </View>

        {/* ── Stats Row ── */}
        {statsRow != null && (
          <View style={styles.statsCard}>
            <StatCell icon={'⏱'} value={statsRow.duration} label="Duration" />
            <View style={styles.statDivider} />
            <StatCell icon={'⚡'} value={statsRow.volume} label="Volume" />
            <View style={styles.statDivider} />
            <StatCell icon={'◼'} value={statsRow.sets} label="Sets" />
            <View style={styles.statDivider} />
            <StatCell icon={'🏆'} value={statsRow.prs} label="PRs" />
          </View>
        )}

        {/* ── Bodyweight ── */}
        {detail.bodyweightKg != null && (
          <View style={styles.bodyweightRow}>
            <Text style={styles.bodyweightIcon}>{'⚖️'}</Text>
            <Text style={styles.bodyweightLabel}>Bodyweight</Text>
            <Text style={styles.bodyweightValue}>
              {formatWeight(detail.bodyweightKg, unitPreference, 1)}
            </Text>
          </View>
        )}

        {/* ── Exercise Sections ── */}
        {detail.exerciseSections.length > 0 && (
          <View style={styles.exercisesSectionHeader}>
            <Text style={styles.exercisesSectionTitle}>EXERCISES</Text>
          </View>
        )}

        {detail.exerciseSections.map((section) => (
          <ExerciseSectionCard
            key={section.id}
            section={section}
            unit={unitPreference}
            editMode={editMode}
            onEdit={handleSetEdit}
          />
        ))}

        {/* ── Session Notes ── */}
        <View style={styles.notesSection}>
          <NotesEditor
            value={detail.notes ?? ''}
            onSave={(n) => void handleSaveNotes(n)}
          />
        </View>

        {/* ── Danger Zone ── */}
        <View style={styles.dangerSection}>
          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.deleteButtonPressed,
            ]}
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel="Delete session"
          >
            <Text style={styles.deleteButtonText}>Delete Session</Text>
          </Pressable>
        </View>

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

  // Navigation header
  navHeader: {
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
  navTitle: {
    flex: 1,
    alignItems: 'center',
  },
  navTitleText: {
    ...typography.headline,
    color: colors.label.primary.dark,
  },
  editButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  editButtonText: {
    ...typography.body,
    color: colors.system.blue,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    ...typography.body,
    color: colors.label.secondary.dark,
  },
  saveText: {
    ...typography.headline,
    color: colors.system.blue,
  },

  // Title block
  titleBlock: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 4,
  },
  sessionTitle: {
    ...typography.title1,
    color: colors.label.primary.dark,
  },
  sessionDate: {
    ...typography.subheadline,
    color: colors.label.secondary.dark,
  },

  // Stats
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator.dark,
    alignSelf: 'stretch',
    marginVertical: spacing.sm,
  },

  // Bodyweight
  bodyweightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  bodyweightIcon: {
    fontSize: 18,
  },
  bodyweightLabel: {
    ...typography.body,
    color: colors.label.secondary.dark,
    flex: 1,
  },
  bodyweightValue: {
    ...typography.body,
    color: colors.label.primary.dark,
    fontWeight: '600',
  },

  // Exercise sections header
  exercisesSectionHeader: {
    paddingHorizontal: spacing.md + spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  exercisesSectionTitle: {
    ...typography.caption,
    color: colors.label.secondary.dark,
    letterSpacing: 0.5,
  },

  // Notes section
  notesSection: {
    marginTop: spacing.md,
  },

  // Danger zone
  dangerSection: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  deleteButton: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.semantic.error,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  deleteButtonPressed: {
    backgroundColor: colors.semantic.error + '1A',
  },
  deleteButtonText: {
    ...typography.headline,
    color: colors.semantic.error,
  },

  bottomPadding: {
    height: 48,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {},
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
