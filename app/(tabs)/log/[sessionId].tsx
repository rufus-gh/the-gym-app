import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  TextInput,
  AppState,
  AppStateStatus,
  ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { useActiveSessionStore } from '../../../src/stores/activeSessionStore';
import { useRestTimerStore } from '../../../src/stores/restTimerStore';
import { useSettings } from '../../../src/hooks/useSettings';
import {
  detectPersonalRecords,
  computeHistoricalBest,
} from '../../../src/services/pr-detection';
import { ExerciseCard, ExerciseCardProps } from '../../../src/components/session/ExerciseCard';
import { SetRowProps } from '../../../src/components/session/SetRow';
import { colors } from '../../../src/constants/colors';
import { spacing, radius, TAB_BAR_HEIGHT } from '../../../src/constants/spacing';
import { generateId } from '../../../src/utils/nanoid';
import { WorkoutSession } from '../../../src/db/models/WorkoutSession';
import { SessionExercise } from '../../../src/db/models/SessionExercise';
import { SetModel } from '../../../src/db/models/Set';
import type { Set as GymSet } from '../../../src/types/models';
import type { SetType } from '../../../src/types/enums';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatVolumeDisplay(kg: number, unit: 'kg' | 'lb'): string {
  const value = unit === 'lb' ? kg * 2.20462 : kg;
  return `${value.toFixed(0)} ${unit}`;
}

// Convert a WatermelonDB SetModel into the plain GymSet interface used by
// pr-detection (avoids passing WatermelonDB model instances outside the DB layer).
// Note: GymSet.setNumber maps to SetModel.setNumber (orderIndex in the type
// interface is the same concept for PR detection purposes).
function setModelToPlain(s: SetModel): GymSet {
  return {
    id: s.id,
    userId: s.userId,
    sessionId: '',        // not needed for PR detection
    sessionExerciseId: s.sessionExerciseId,
    exerciseId: s.exerciseId,
    orderIndex: s.setNumber,
    setType: s.setType as SetType,
    weightKg: s.weightKg,
    weightKgActual: s.weightKgActual,
    reps: s.reps,
    repsTarget: null,
    isAmrap: s.isAmrap,
    rpe: s.rpe,
    rir: s.rir,
    durationSeconds: s.duration,
    distanceMetres: s.distance,
    isWarmup: s.isWarmup,
    isPersonalRecord: s.isPersonalRecord,
    completedAt: s.completedAt ? s.completedAt.getTime() : null,
    syncedAt: s.syncedAt ? s.syncedAt.getTime() : null,
    createdAt: s.createdAt.getTime(),
    updatedAt: s.updatedAt.getTime(),
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExerciseWithSets {
  sessionExerciseId: string;
  exerciseId: string;
  exerciseName: string;
  orderIndex: number;
  sets: SetModel[];
}

// ---------------------------------------------------------------------------
// ActiveSessionScreen
// ---------------------------------------------------------------------------

export default function ActiveSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const database = useDatabase();

  // ── Stores ──────────────────────────────────────────────────────────────
  const storeSessionId = useActiveSessionStore((s) => s.sessionId);
  const sessionName = useActiveSessionStore((s) => s.sessionName);
  const elapsedSeconds = useActiveSessionStore((s) => s.elapsedSeconds);
  const completedSetIds = useActiveSessionStore((s) => s.completedSetIds);
  const prSetIds = useActiveSessionStore((s) => s.prSetIds);
  const {
    startSession,
    endSession,
    markSetComplete,
    rollbackSetComplete,
    markSetAsPR,
    tickElapsed,
  } = useActiveSessionStore();

  const { startTimer } = useRestTimerStore();
  const settings = useSettings();

  // ── Local state ──────────────────────────────────────────────────────────
  const [sessionRecord, setSessionRecord] = useState<WorkoutSession | null>(null);
  const [exercisesWithSets, setExercisesWithSets] = useState<ExerciseWithSets[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);

  const nameInputRef = useRef<TextInput>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Rehydrate Zustand if session is not already active ───────────────────
  useEffect(() => {
    if (storeSessionId === sessionId) return;

    async function rehydrate() {
      if (!sessionId) return;
      try {
        const session = await database
          .get<WorkoutSession>('workout_sessions')
          .find(sessionId);
        startSession({ sessionId: session.id, name: session.name });
      } catch {
        // Session not found — navigate back
        router.back();
      }
    }

    void rehydrate();
  }, [sessionId, storeSessionId, database, startSession]);

  // ── Load session record ──────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function loadSession() {
      try {
        const session = await database
          .get<WorkoutSession>('workout_sessions')
          .find(sessionId);
        if (!cancelled) {
          setSessionRecord(session);
          setNameValue(session.name);
        }
      } catch {
        if (!cancelled) router.back();
      }
    }

    void loadSession();
    return () => { cancelled = true; };
  }, [sessionId, database]);

  // ── Load exercises and sets (reactive-style: poll on mount + AppState) ───
  // In a full implementation this would use WatermelonDB .observe() subscriptions.
  // We load on mount and on app foreground to stay current.
  const loadExercisesAndSets = useCallback(async () => {
    if (!sessionId) return;

    try {
      const sessionExercises = await database
        .get<SessionExercise>('session_exercises')
        .query(
          Q.where('session_id', sessionId),
          Q.sortBy('order_index', Q.asc),
        )
        .fetch();

      const exerciseData: ExerciseWithSets[] = await Promise.all(
        sessionExercises.map(async (se) => {
          const sets = await database
            .get<SetModel>('sets')
            .query(
              Q.where('session_exercise_id', se.id),
              Q.sortBy('set_number', Q.asc),
            )
            .fetch();

          // Resolve exercise name
          let exerciseName = 'Exercise';
          try {
            const exercise = await se.exercise;
            exerciseName = exercise.name;
          } catch {
            exerciseName = 'Exercise';
          }

          return {
            sessionExerciseId: se.id,
            exerciseId: se.exerciseId,
            exerciseName,
            orderIndex: se.orderIndex,
            sets,
          };
        }),
      );

      setExercisesWithSets(exerciseData);

      // Auto-expand all exercises on first load
      if (exerciseData.length > 0) {
        setExpandedIds((prev) => {
          if (prev.size === 0) {
            return new Set(exerciseData.map((e) => e.sessionExerciseId));
          }
          return prev;
        });
      }
    } catch {
      // Non-fatal — data was already loaded or will retry
    }
  }, [sessionId, database]);

  useEffect(() => {
    void loadExercisesAndSets();
  }, [loadExercisesAndSets]);

  // Reload on app foreground
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          void loadExercisesAndSets();
        }
      },
    );
    return () => subscription.remove();
  }, [loadExercisesAndSets]);

  // ── Elapsed timer ────────────────────────────────────────────────────────
  useEffect(() => {
    elapsedIntervalRef.current = setInterval(() => {
      tickElapsed();
    }, 1000);

    return () => {
      if (elapsedIntervalRef.current !== null) {
        clearInterval(elapsedIntervalRef.current);
      }
    };
  }, [tickElapsed]);

  // ── Derived stats ────────────────────────────────────────────────────────
  const { totalVolumeKg, totalSets } = useMemo(() => {
    let vol = 0;
    let sets = 0;

    for (const ex of exercisesWithSets) {
      for (const s of ex.sets) {
        if (s.setType === 'warmup' || s.isWarmup) continue;
        if (completedSetIds.has(s.id)) {
          vol += (s.weightKgActual ?? 0) * (s.reps ?? 0);
          sets += 1;
        }
      }
    }

    return { totalVolumeKg: vol, totalSets: sets };
  }, [exercisesWithSets, completedSetIds]);

  // ── Session name editing ─────────────────────────────────────────────────
  const handleNamePress = useCallback(() => {
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }, []);

  const handleNameBlur = useCallback(async () => {
    setEditingName(false);
    const trimmed = nameValue.trim();
    if (!trimmed || !sessionRecord) return;

    try {
      await database.write(async () => {
        await sessionRecord.update((s) => {
          s.name = trimmed;
        });
      });
    } catch {
      // Revert on failure
      setNameValue(sessionRecord.name);
    }
  }, [nameValue, sessionRecord, database]);

  // ── Set complete handler ─────────────────────────────────────────────────
  const handleSetComplete = useCallback(
    async (setId: string, exerciseId: string) => {
      // Step 1: Optimistic Zustand update — must happen before any await
      markSetComplete(setId);

      try {
        // Step 2: Write to WatermelonDB
        const setRecord = await database
          .get<SetModel>('sets')
          .find(setId);

        await database.write(async () => {
          await setRecord.update((s) => {
            (s as unknown as Record<string, unknown>)['_raw']['completed_at'] = Date.now();
          });
        });

        // Step 3: PR detection using weightKgActual
        const plainSet = setModelToPlain(setRecord);

        // Fetch all historical sets for this exercise (excluding current session)
        const historicalSetModels = await database
          .get<SetModel>('sets')
          .query(
            Q.where('exercise_id', exerciseId),
            Q.where('completed_at', Q.notEq(null as unknown as number)),
            Q.where('id', Q.notEq(setId)),
          )
          .fetch();

        const historicalSets = historicalSetModels.map(setModelToPlain);
        const historicalBest = computeHistoricalBest(
          historicalSets,
          settings.oneRmFormula,
        );
        const prResult = detectPersonalRecords({
          set: plainSet,
          historicalBest,
          formula: settings.oneRmFormula,
        });

        if (prResult.isPersonalRecord) {
          // Mark in Zustand
          markSetAsPR(setId);

          // Write PR flag to set record
          await database.write(async () => {
            await setRecord.update((s) => {
              s.isPersonalRecord = true;
            });
          });

          // Navigate to PR celebration modal
          router.push({
            pathname: '/modals/pr-celebration',
            params: {
              setId,
              exerciseId,
              prTypes: prResult.newPRs.map((p) => p.recordType).join(','),
            },
          });
        }

        // Step 4: Auto-start rest timer if enabled
        if (settings.restTimerAutoStart) {
          startTimer(settings.defaultRestSeconds, {
            exerciseName: exercisesWithSets.find((e) => e.exerciseId === exerciseId)
              ?.exerciseName,
          });
        }

        // Refresh the exercise list to reflect new state
        await loadExercisesAndSets();
      } catch {
        // Rollback optimistic update on failure
        rollbackSetComplete(setId);
        Alert.alert(
          'Set Not Saved',
          'Could not save this set. Please try again.',
          [{ text: 'OK' }],
        );
      }
    },
    [
      database,
      markSetComplete,
      markSetAsPR,
      rollbackSetComplete,
      settings.oneRmFormula,
      settings.restTimerAutoStart,
      settings.defaultRestSeconds,
      startTimer,
      exercisesWithSets,
      loadExercisesAndSets,
    ],
  );

  // ── Set edit handler ─────────────────────────────────────────────────────
  const handleSetEdit = useCallback(
    (setId: string) => {
      router.push({
        pathname: '/modals/set-editor',
        params: { setId },
      });
    },
    [],
  );

  // ── Add set handler ──────────────────────────────────────────────────────
  const handleAddSet = useCallback(
    async (exerciseId: string) => {
      const exerciseEntry = exercisesWithSets.find((e) => e.exerciseId === exerciseId);
      if (!exerciseEntry) return;

      const nextSetNumber = exerciseEntry.sets.length + 1;
      const lastSet = exerciseEntry.sets[exerciseEntry.sets.length - 1];
      const newSetId = generateId();

      try {
        await database.write(async () => {
          await database.get<SetModel>('sets').create((s) => {
            (s as unknown as Record<string, unknown>)['_raw']['id'] = newSetId;
            (s as unknown as Record<string, unknown>)['_raw']['user_id'] = 'local';
            s.sessionExerciseId = exerciseEntry.sessionExerciseId;
            s.exerciseId = exerciseId;
            s.setNumber = nextSetNumber;
            s.setType = (lastSet?.setType ?? 'working') as SetType;
            s.weightKg = lastSet?.weightKg ?? null;
            s.weightKgActual = lastSet?.weightKgActual ?? null;
            s.reps = lastSet?.reps ?? null;
            s.isWarmup = (lastSet?.setType ?? 'working') === 'warmup';
            s.isAmrap = false;
            s.isPersonalRecord = false;
          });
        });

        await loadExercisesAndSets();
      } catch {
        Alert.alert('Error', 'Could not add set. Please try again.');
      }
    },
    [database, exercisesWithSets, loadExercisesAndSets],
  );

  // ── Edit exercise handler ────────────────────────────────────────────────
  const handleEditExercise = useCallback(
    (exerciseId: string) => {
      router.push({
        pathname: '/modals/exercise-picker',
        params: { replaceExerciseId: exerciseId, sessionId: sessionId ?? '' },
      });
    },
    [sessionId],
  );

  // ── Remove exercise handler ──────────────────────────────────────────────
  const handleRemoveExercise = useCallback(
    async (exerciseId: string) => {
      const exerciseEntry = exercisesWithSets.find((e) => e.exerciseId === exerciseId);
      if (!exerciseEntry) return;

      try {
        await database.write(async () => {
          // Delete all sets for this session exercise
          for (const s of exerciseEntry.sets) {
            await s.destroyPermanently();
          }

          // Delete the session exercise record
          const seRecord = await database
            .get<SessionExercise>('session_exercises')
            .find(exerciseEntry.sessionExerciseId);
          await seRecord.destroyPermanently();
        });

        await loadExercisesAndSets();
      } catch {
        Alert.alert('Error', 'Could not remove exercise. Please try again.');
      }
    },
    [database, exercisesWithSets, loadExercisesAndSets],
  );

  // ── Toggle expand ────────────────────────────────────────────────────────
  const handleToggleExpand = useCallback((sessionExerciseId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionExerciseId)) {
        next.delete(sessionExerciseId);
      } else {
        next.add(sessionExerciseId);
      }
      return next;
    });
  }, []);

  // ── Add exercise ─────────────────────────────────────────────────────────
  const handleAddExercise = useCallback(() => {
    router.push({
      pathname: '/modals/exercise-picker',
      params: { sessionId: sessionId ?? '' },
    });
  }, [sessionId]);

  // ── Finish workout ───────────────────────────────────────────────────────
  const handleFinishWorkout = useCallback(() => {
    Alert.alert(
      'Finish Workout',
      'End this session and save your results?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            if (!sessionRecord || isFinishing) return;
            setIsFinishing(true);

            try {
              const endedAt = Date.now();
              const durationSeconds = elapsedSeconds;

              await database.write(async () => {
                await sessionRecord.update((s) => {
                  (s as unknown as Record<string, unknown>)['_raw']['ended_at'] = endedAt;
                  s.durationSeconds = durationSeconds;
                  s.totalVolumeKg = totalVolumeKg;
                  s.totalSets = totalSets;
                });
              });

              // Navigate to workout summary modal
              router.push({
                pathname: '/modals/workout-summary',
                params: { sessionId: sessionId ?? '' },
              });
            } catch {
              setIsFinishing(false);
              Alert.alert('Error', 'Could not save session. Please try again.');
            }
          },
        },
      ],
    );
  }, [
    sessionRecord,
    isFinishing,
    database,
    elapsedSeconds,
    totalVolumeKg,
    totalSets,
    sessionId,
  ]);

  // ── Overflow menu ────────────────────────────────────────────────────────
  const handleOverflowMenu = useCallback(() => {
    Alert.alert('Session Options', undefined, [
      {
        text: 'Discard Workout',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Discard Workout',
            'This will permanently delete this session and all logged sets.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Discard',
                style: 'destructive',
                onPress: async () => {
                  if (!sessionRecord) return;
                  try {
                    await database.write(async () => {
                      // Delete all sets and session exercises
                      for (const ex of exercisesWithSets) {
                        for (const s of ex.sets) {
                          await s.destroyPermanently();
                        }
                        const se = await database
                          .get<SessionExercise>('session_exercises')
                          .find(ex.sessionExerciseId);
                        await se.destroyPermanently();
                      }
                      await sessionRecord.destroyPermanently();
                    });

                    endSession();
                    router.replace('/(tabs)');
                  } catch {
                    Alert.alert('Error', 'Could not discard session.');
                  }
                },
              },
            ],
          );
        },
      },
      {
        text: 'Plate Calculator',
        onPress: () => router.push('/modals/plate-calculator'),
      },
      {
        text: '1RM Calculator',
        onPress: () => router.push('/modals/one-rm-calculator'),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [sessionRecord, database, exercisesWithSets, endSession]);

  // ── Build ExerciseCard props ─────────────────────────────────────────────
  const exerciseCardData = useMemo<ExerciseCardProps[]>(() => {
    return exercisesWithSets.map((ex) => {
      const setRowProps: SetRowProps[] = ex.sets.map((s) => ({
        setId: s.id,
        exerciseId: ex.exerciseId,
        setNumber: s.setNumber,
        setType: s.setType as import('../../../src/types/enums').SetType,
        weightKg: s.weightKg,
        weightKgActual: s.weightKgActual,
        reps: s.reps,
        rpe: s.rpe,
        isWarmup: s.isWarmup,
        isPersonalRecord: prSetIds.has(s.id) || s.isPersonalRecord,
        isCompleted: completedSetIds.has(s.id) || s.completedAt !== null,
        isActive:
          !completedSetIds.has(s.id) &&
          s.completedAt === null &&
          ex.sets
            .filter((ss) => !completedSetIds.has(ss.id) && ss.completedAt === null)
            .findIndex((ss) => ss.id === s.id) === 0,
        previousWeightKg: null, // TODO: populate from exercise history
        previousReps: null,
        onComplete: (setId) => void handleSetComplete(setId, ex.exerciseId),
        onEdit: handleSetEdit,
        unitPreference: settings.unitPreference,
      }));

      return {
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        sets: setRowProps,
        isExpanded: expandedIds.has(ex.sessionExerciseId),
        onToggleExpand: () => handleToggleExpand(ex.sessionExerciseId),
        onAddSet: handleAddSet,
        onEditExercise: handleEditExercise,
        onRemoveExercise: handleRemoveExercise,
        unitPreference: settings.unitPreference,
      };
    });
  }, [
    exercisesWithSets,
    completedSetIds,
    prSetIds,
    expandedIds,
    settings.unitPreference,
    handleSetComplete,
    handleSetEdit,
    handleAddSet,
    handleEditExercise,
    handleRemoveExercise,
    handleToggleExpand,
  ]);

  // ── FlatList helpers ─────────────────────────────────────────────────────
  const renderExerciseCard: ListRenderItem<ExerciseCardProps> = useCallback(
    ({ item }) => <ExerciseCard {...item} />,
    [],
  );

  const keyExtractor = useCallback((item: ExerciseCardProps) => item.exerciseId, []);

  // ── Empty state ──────────────────────────────────────────────────────────
  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateIcon}>{'💪'}</Text>
        <Text style={styles.emptyStateTitle}>No exercises yet</Text>
        <Text style={styles.emptyStateBody}>
          Tap "Add Exercise" below to get started.
        </Text>
      </View>
    ),
    [],
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backIcon}>{'‹'}</Text>
        </TouchableOpacity>

        {/* Session name — tappable to edit */}
        <TouchableOpacity
          style={styles.nameContainer}
          onPress={handleNamePress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Session name: ${sessionName}. Tap to edit.`}
        >
          {editingName ? (
            <TextInput
              ref={nameInputRef}
              style={styles.nameInput}
              value={nameValue}
              onChangeText={setNameValue}
              onBlur={handleNameBlur}
              onSubmitEditing={handleNameBlur}
              returnKeyType="done"
              maxLength={80}
              selectTextOnFocus
            />
          ) : (
            <Text style={styles.sessionName} numberOfLines={1}>
              {sessionName || nameValue || 'Workout'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <Text style={styles.elapsedTimer}>{formatElapsed(elapsedSeconds)}</Text>
          <TouchableOpacity
            style={styles.overflowButton}
            onPress={handleOverflowMenu}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Session options"
          >
            <Text style={styles.overflowIcon}>{'⋮'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Stats bar ──────────────────────────────────────────────────── */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Volume</Text>
          <Text style={styles.statValue}>
            {formatVolumeDisplay(totalVolumeKg, settings.unitPreference)}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Sets</Text>
          <Text style={styles.statValue}>{totalSets}</Text>
        </View>
      </View>

      {/* ── Exercise list ──────────────────────────────────────────────── */}
      <FlatList<ExerciseCardProps>
        data={exerciseCardData}
        keyExtractor={keyExtractor}
        renderItem={renderExerciseCard}
        contentContainerStyle={styles.listContent}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
        ListEmptyComponent={ListEmptyComponent}
        keyboardShouldPersistTaps="handled"
      />

      {/* ── Bottom actions ──────────────────────────────────────────────── */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={handleAddExercise}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Add exercise"
        >
          <Text style={styles.addExerciseIcon}>{'+'}</Text>
          <Text style={styles.addExerciseLabel}>Add Exercise</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.finishButton, isFinishing && styles.finishButtonDisabled]}
          onPress={handleFinishWorkout}
          activeOpacity={0.8}
          disabled={isFinishing}
          accessibilityRole="button"
          accessibilityLabel="Finish workout"
        >
          <Text style={styles.finishButtonLabel}>
            {isFinishing ? 'Saving...' : 'Finish'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const HEADER_HEIGHT = 56;
const STATS_BAR_HEIGHT = 48;
const BOTTOM_ACTIONS_HEIGHT = 72;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.primary.dark,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: HEADER_HEIGHT,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator.dark,
  },
  backButton: {
    marginRight: spacing.sm,
    minWidth: 32,
    alignItems: 'flex-start',
  },
  backIcon: {
    fontSize: 28,
    color: colors.system.blue,
    lineHeight: 32,
    fontWeight: '300',
  },
  nameContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  sessionName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.label.primary.dark,
    textAlign: 'center',
  },
  nameInput: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.label.primary.dark,
    textAlign: 'center',
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.system.blue,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 80,
    justifyContent: 'flex-end',
  },
  elapsedTimer: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.label.secondary.dark,
    fontVariant: ['tabular-nums'],
  },
  overflowButton: {
    paddingLeft: spacing.xs,
  },
  overflowIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.label.secondary.dark,
    lineHeight: 22,
  },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: STATS_BAR_HEIGHT,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background.secondary.dark,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator.dark,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.label.secondary.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.label.primary.dark,
    fontVariant: ['tabular-nums'],
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: colors.separator.dark,
  },

  // List
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: BOTTOM_ACTIONS_HEIGHT + spacing.md + TAB_BAR_HEIGHT,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.label.primary.dark,
    textAlign: 'center',
  },
  emptyStateBody: {
    fontSize: 15,
    color: colors.label.secondary.dark,
    textAlign: 'center',
  },

  // Bottom actions
  bottomActions: {
    position: 'absolute',
    bottom: TAB_BAR_HEIGHT,
    left: 0,
    right: 0,
    height: BOTTOM_ACTIONS_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background.primary.dark,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator.dark,
  },
  addExerciseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  addExerciseIcon: {
    fontSize: 20,
    fontWeight: '300',
    color: colors.system.blue,
    lineHeight: 22,
  },
  addExerciseLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.system.blue,
  },
  finishButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    backgroundColor: colors.system.green,
    borderRadius: radius.md,
  },
  finishButtonDisabled: {
    opacity: 0.6,
  },
  finishButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
