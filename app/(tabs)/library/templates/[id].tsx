import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  ListRenderItemInfo,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';

import { useActiveSessionStore } from '../../../../src/stores/activeSessionStore';
import { generateId } from '../../../../src/utils/nanoid';
import { BUILT_IN_EXERCISES } from '../../../../src/constants/exercises';
import type { WorkoutTemplateModel } from '../../../../src/db/models/WorkoutTemplate';
import type { TemplateExerciseModel } from '../../../../src/db/models/TemplateExercise';
import type { TemplateSetModel } from '../../../../src/db/models/TemplateSet';
import type { SetType } from '../../../../src/types/enums';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateSetRow {
  id: string;
  orderIndex: number;
  setType: SetType;
  targetWeight: number | null;
  targetReps: number | null;
  targetRpe: number | null;
  isAmrap: boolean;
}

interface TemplateExerciseRow {
  id: string;
  exerciseId: string;
  exerciseName: string;
  orderIndex: number;
  restSeconds: number | null;
  sets: TemplateSetRow[];
}

interface TemplateDetail {
  id: string;
  name: string;
  description: string | null;
  estimatedDurationMinutes: number | null;
  restSeconds: number | null;
  exercises: TemplateExerciseRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SET_TYPE_LABEL: Record<SetType, string> = {
  working: 'W',
  warmup: 'WU',
  dropset: 'D',
  failure: 'F',
};

const SET_TYPE_COLOR: Record<SetType, string> = {
  working: '#007AFF',
  warmup: '#FF9500',
  dropset: '#AF52DE',
  failure: '#FF3B30',
};

function formatWeight(kg: number | null): string {
  if (kg === null) return '—';
  return `${kg} kg`;
}

function formatReps(reps: number | null, isAmrap: boolean): string {
  if (isAmrap) return 'AMRAP';
  if (reps === null) return '—';
  return `${reps}`;
}

function formatRest(seconds: number | null): string {
  if (seconds === null) return 'Default';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function getExerciseName(exerciseId: string): string {
  const found = BUILT_IN_EXERCISES.find((e) => e.id === exerciseId);
  return found?.name ?? 'Unknown Exercise';
}

// ─── SetTypeBadge ─────────────────────────────────────────────────────────────

const SetTypeBadge = ({ setType }: { setType: SetType }) => {
  const color = SET_TYPE_COLOR[setType] ?? '#3A3A3C';
  const label = SET_TYPE_LABEL[setType] ?? setType;
  return (
    <View style={[styles.setTypeBadge, { backgroundColor: color + '28' }]}>
      <Text style={[styles.setTypeBadgeText, { color }]}>{label}</Text>
    </View>
  );
};

// ─── SetReadonlyRow ───────────────────────────────────────────────────────────

const SetReadonlyRow = ({
  set,
  index,
}: {
  set: TemplateSetRow;
  index: number;
}) => (
  <View style={styles.setRow}>
    <Text style={styles.setIndex}>{index + 1}</Text>
    <SetTypeBadge setType={set.setType} />
    <Text style={styles.setWeight}>{formatWeight(set.targetWeight)}</Text>
    <Text style={styles.setReps}>{formatReps(set.targetReps, set.isAmrap)} reps</Text>
    {set.targetRpe !== null && (
      <Text style={styles.setRpe}>RPE {set.targetRpe}</Text>
    )}
  </View>
);

// ─── ExerciseSection ──────────────────────────────────────────────────────────

const ExerciseSection = ({
  exercise,
  index,
}: {
  exercise: TemplateExerciseRow;
  index: number;
}) => (
  <View style={styles.exerciseSection}>
    <View style={styles.exerciseHeader}>
      <View style={styles.exerciseHeaderLeft}>
        <Text style={styles.exerciseIndex}>{index + 1}</Text>
        <View style={styles.exerciseMeta}>
          <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
          {exercise.restSeconds !== null && (
            <Text style={styles.exerciseRest}>
              Rest: {formatRest(exercise.restSeconds)}
            </Text>
          )}
        </View>
      </View>
      <Text style={styles.setCount}>
        {exercise.sets.length} set{exercise.sets.length !== 1 ? 's' : ''}
      </Text>
    </View>

    {/* Sets */}
    <View style={styles.setsContainer}>
      <View style={styles.setsHeader}>
        <Text style={[styles.setHeaderCell, styles.setHeaderIndex]}>#</Text>
        <Text style={[styles.setHeaderCell, styles.setHeaderType]}>Type</Text>
        <Text style={[styles.setHeaderCell, styles.setHeaderWeight]}>Weight</Text>
        <Text style={[styles.setHeaderCell, styles.setHeaderReps]}>Reps</Text>
      </View>
      {exercise.sets.map((set, i) => (
        <SetReadonlyRow key={set.id} set={set} index={i} />
      ))}
      {exercise.sets.length === 0 && (
        <Text style={styles.noSetsText}>No sets configured</Text>
      )}
    </View>
  </View>
);

// ─── TemplateDetailScreen ─────────────────────────────────────────────────────

export default function TemplateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const database = useDatabase();
  const startSession = useActiveSessionStore((s) => s.startSession);
  const addExercise = useActiveSessionStore((s) => s.addExercise);

  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [nameEditing, setNameEditing] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const nameInputRef = useRef<TextInput>(null);

  const loadTemplate = useCallback(async () => {
    if (!id) return;
    try {
      const model = await database
        .get<WorkoutTemplateModel>('workout_templates')
        .find(id);

      const exerciseModels = await model.exercises.fetch();

      const exercises: TemplateExerciseRow[] = await Promise.all(
        exerciseModels.map(async (ex) => {
          const setModels = await ex.sets.fetch();
          const sets: TemplateSetRow[] = setModels.map((s) => ({
            id: s.id,
            orderIndex: s.orderIndex,
            setType: (s.setType as SetType) ?? 'working',
            targetWeight: s.targetWeight,
            targetReps: s.targetReps,
            targetRpe: s.targetRpe,
            isAmrap: s.isAmrap,
          }));

          return {
            id: ex.id,
            exerciseId: ex.exerciseId,
            exerciseName: getExerciseName(ex.exerciseId),
            orderIndex: ex.orderIndex,
            restSeconds: ex.restSeconds,
            sets,
          };
        }),
      );

      setTemplate({
        id: model.id,
        name: model.name,
        description: model.description,
        estimatedDurationMinutes: model.estimatedDurationMinutes,
        restSeconds: null, // template-level rest override stored in model if added later
        exercises,
      });
      setNameValue(model.name);
    } catch {
      setTemplate(null);
    } finally {
      setLoading(false);
    }
  }, [id, database]);

  useEffect(() => {
    void loadTemplate();
  }, [loadTemplate]);

  // ─── Inline name edit ─────────────────────────────────────────────────────

  const handleNamePress = useCallback(() => {
    setNameEditing(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }, []);

  const handleNameSubmit = useCallback(async () => {
    setNameEditing(false);
    const trimmed = nameValue.trim();
    if (!trimmed || !id || !template) return;
    if (trimmed === template.name) return;
    try {
      const model = await database
        .get<WorkoutTemplateModel>('workout_templates')
        .find(id);
      await database.write(async () => {
        await model.update((m) => {
          m.name = trimmed;
        });
      });
      setTemplate((prev) => (prev ? { ...prev, name: trimmed } : prev));
    } catch {
      setNameValue(template.name);
      Alert.alert('Error', 'Could not save name. Please try again.');
    }
  }, [nameValue, id, template, database]);

  // ─── Start from template ──────────────────────────────────────────────────

  const handleStartWorkout = useCallback(async () => {
    if (!template) return;
    const sessionId = generateId();
    const sessionName = template.name;

    try {
      await database.write(async () => {
        // Create WorkoutSession
        const session = await database
          .get('workout_sessions')
          .create((s: Record<string, unknown>) => {
            s['id'] = sessionId;
            s['template_id'] = template.id;
            s['name'] = sessionName;
            s['started_at'] = Date.now();
            s['is_archived'] = false;
          });

        for (const ex of template.exercises) {
          const sessionExerciseId = generateId();
          await database
            .get('session_exercises')
            .create((se: Record<string, unknown>) => {
              se['id'] = sessionExerciseId;
              se['session_id'] = sessionId;
              se['exercise_id'] = ex.exerciseId;
              se['order_index'] = ex.orderIndex;
            });

          for (const set of ex.sets) {
            const setId = generateId();
            await database.get('sets').create((s: Record<string, unknown>) => {
              s['id'] = setId;
              s['session_id'] = sessionId;
              s['session_exercise_id'] = sessionExerciseId;
              s['exercise_id'] = ex.exerciseId;
              s['order_index'] = set.orderIndex;
              s['set_type'] = set.setType;
              s['weight_kg'] = set.targetWeight;
              s['weight_kg_actual'] = set.targetWeight;
              s['reps_target'] = set.targetReps;
              s['is_amrap'] = set.isAmrap;
              s['rpe'] = set.targetRpe;
              s['is_warmup'] = set.setType === 'warmup';
              s['is_personal_record'] = false;
            });
          }
        }

        // Update template usage
        const templateModel = await database
          .get<WorkoutTemplateModel>('workout_templates')
          .find(template.id);
        await templateModel.update((m) => {
          m.lastUsedAt = Date.now();
          m.usageCount = (m.usageCount ?? 0) + 1;
        });
      });

      // Populate Zustand store (optimistic, after DB write succeeds)
      startSession({ sessionId, name: sessionName });
      for (const ex of template.exercises) {
        addExercise({
          id: generateId(),
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          orderIndex: ex.orderIndex,
          setIds: ex.sets.map(() => generateId()),
        });
      }

      router.push(`/session-detail`);
    } catch {
      Alert.alert('Error', 'Could not start workout. Please try again.');
    }
  }, [template, database, startSession, addExercise]);

  // ─── Menu actions ─────────────────────────────────────────────────────────

  const handleMenuPress = useCallback(() => {
    if (!template) return;

    const options = ['Duplicate', 'Archive', 'Delete', 'Cancel'];
    const destructiveIndex = 2;
    const cancelIndex = 3;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex: destructiveIndex, cancelButtonIndex: cancelIndex },
        async (buttonIndex) => {
          if (buttonIndex === 0) await handleDuplicate();
          if (buttonIndex === 1) await handleArchive();
          if (buttonIndex === 2) handleDeleteConfirm();
        },
      );
    } else {
      Alert.alert('Template Options', undefined, [
        { text: 'Duplicate', onPress: handleDuplicate },
        { text: 'Archive', onPress: handleArchive },
        { text: 'Delete', style: 'destructive', onPress: handleDeleteConfirm },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [template]);

  const handleDuplicate = useCallback(async () => {
    if (!template) return;
    const newId = generateId();
    const newName = `${template.name} (Copy)`;
    try {
      await database.write(async () => {
        await database
          .get('workout_templates')
          .create((m: Record<string, unknown>) => {
            m['id'] = newId;
            m['name'] = newName;
            m['description'] = template.description;
            m['estimated_duration_minutes'] = template.estimatedDurationMinutes;
            m['is_archived'] = false;
            m['is_built_in'] = false;
            m['usage_count'] = 0;
            m['last_used_at'] = null;
          });

        for (const ex of template.exercises) {
          const newExId = generateId();
          await database
            .get('template_exercises')
            .create((m: Record<string, unknown>) => {
              m['id'] = newExId;
              m['template_id'] = newId;
              m['exercise_id'] = ex.exerciseId;
              m['order_index'] = ex.orderIndex;
              m['rest_seconds'] = ex.restSeconds;
            });

          for (const set of ex.sets) {
            await database
              .get('template_sets')
              .create((m: Record<string, unknown>) => {
                m['id'] = generateId();
                m['template_exercise_id'] = newExId;
                m['order_index'] = set.orderIndex;
                m['set_type'] = set.setType;
                m['target_weight'] = set.targetWeight;
                m['target_reps'] = set.targetReps;
                m['target_rpe'] = set.targetRpe;
                m['is_amrap'] = set.isAmrap;
              });
          }
        }
      });

      router.replace(`/(tabs)/library/templates/${newId}`);
    } catch {
      Alert.alert('Error', 'Could not duplicate template.');
    }
  }, [template, database]);

  const handleArchive = useCallback(async () => {
    if (!template) return;
    try {
      const model = await database
        .get<WorkoutTemplateModel>('workout_templates')
        .find(template.id);
      await database.write(async () => {
        await model.update((m) => {
          m.isArchived = true;
        });
      });
      router.back();
    } catch {
      Alert.alert('Error', 'Could not archive template.');
    }
  }, [template, database]);

  const handleDeleteConfirm = useCallback(() => {
    if (!template) return;
    Alert.alert(
      'Delete Template',
      `Delete "${template.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const model = await database
                .get<WorkoutTemplateModel>('workout_templates')
                .find(template.id);
              await database.write(async () => {
                await model.update((m) => {
                  m.isArchived = true;
                });
              });
              router.back();
            } catch {
              Alert.alert('Error', 'Could not delete template.');
            }
          },
        },
      ],
    );
  }, [template, database]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!template) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Template not found.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBack} activeOpacity={0.7}>
          <Text style={styles.navBackText}>‹ Templates</Text>
        </TouchableOpacity>
        <View style={styles.navActions}>
          <TouchableOpacity
            style={styles.editNavButton}
            onPress={() => router.push(`/(tabs)/library/templates/create?editId=${template.id}`)}
            activeOpacity={0.7}
          >
            <Text style={styles.editNavButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton} activeOpacity={0.7}>
            <Text style={styles.menuButtonText}>•••</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Template name — tap to edit inline */}
        <View style={styles.nameContainer}>
          {nameEditing ? (
            <TextInput
              ref={nameInputRef}
              style={styles.nameInput}
              value={nameValue}
              onChangeText={setNameValue}
              onBlur={handleNameSubmit}
              onSubmitEditing={handleNameSubmit}
              returnKeyType="done"
              autoCorrect={false}
              selectTextOnFocus
            />
          ) : (
            <TouchableOpacity onPress={handleNamePress} activeOpacity={0.8}>
              <Text style={styles.templateName}>{template.name}</Text>
              <Text style={styles.tapToEditHint}>Tap to rename</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Meta row */}
        <View style={styles.metaRow}>
          {template.estimatedDurationMinutes !== null && (
            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>
                ~{template.estimatedDurationMinutes}m
              </Text>
            </View>
          )}
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>
              {template.exercises.length} exercise{template.exercises.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>
              {template.exercises.reduce((acc, ex) => acc + ex.sets.length, 0)} sets
            </Text>
          </View>
        </View>

        {/* Description */}
        {template.description !== null && template.description.length > 0 && (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionText}>{template.description}</Text>
          </View>
        )}

        {/* Section header */}
        <Text style={styles.sectionHeader}>Exercises</Text>

        {/* Exercise list */}
        {template.exercises.length === 0 ? (
          <View style={styles.noExercisesCard}>
            <Text style={styles.noExercisesText}>No exercises. Tap Edit to add some.</Text>
          </View>
        ) : (
          template.exercises.map((ex, i) => (
            <ExerciseSection key={ex.id} exercise={ex} index={i} />
          ))
        )}

        {/* Spacer for CTA */}
        <View style={styles.ctaSpacer} />
      </ScrollView>

      {/* Start Workout CTA */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleStartWorkout}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaButtonText}>Start Workout from Template</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    color: 'rgba(235,235,245,0.4)',
    fontSize: 16,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  navBack: {
    paddingVertical: 6,
  },
  navBackText: {
    color: '#007AFF',
    fontSize: 17,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editNavButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  editNavButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '500',
  },
  menuButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  menuButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    letterSpacing: 2,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  nameContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  templateName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  nameInput: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
    paddingBottom: 2,
    paddingTop: 0,
  },
  tapToEditHint: {
    color: 'rgba(235,235,245,0.3)',
    fontSize: 12,
    marginTop: 3,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  metaPill: {
    backgroundColor: '#1C1C1E',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaPillText: {
    color: 'rgba(235,235,245,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  descriptionCard: {
    marginHorizontal: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  descriptionText: {
    color: 'rgba(235,235,245,0.7)',
    fontSize: 15,
    lineHeight: 22,
  },
  sectionHeader: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  noExercisesCard: {
    marginHorizontal: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  noExercisesText: {
    color: 'rgba(235,235,245,0.4)',
    fontSize: 15,
    textAlign: 'center',
  },
  exerciseSection: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
  },
  exerciseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  exerciseIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3A3A3C',
    color: 'rgba(235,235,245,0.6)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  exerciseMeta: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  exerciseRest: {
    color: 'rgba(235,235,245,0.4)',
    fontSize: 12,
  },
  setCount: {
    color: 'rgba(235,235,245,0.4)',
    fontSize: 13,
  },
  setsContainer: {
    paddingBottom: 4,
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#161618',
  },
  setHeaderCell: {
    color: 'rgba(235,235,245,0.35)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  setHeaderIndex: { width: 24 },
  setHeaderType: { width: 36 },
  setHeaderWeight: { flex: 1 },
  setHeaderReps: { flex: 1 },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2C2C2E',
  },
  setIndex: {
    width: 24,
    color: 'rgba(235,235,245,0.35)',
    fontSize: 13,
  },
  setTypeBadge: {
    width: 36,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
    marginRight: 4,
  },
  setTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  setWeight: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  setReps: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  setRpe: {
    color: 'rgba(235,235,245,0.45)',
    fontSize: 12,
    marginLeft: 4,
  },
  noSetsText: {
    color: 'rgba(235,235,245,0.3)',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  ctaSpacer: {
    height: 80,
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 12,
    backgroundColor: '#000000',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#38383A',
  },
  ctaButton: {
    backgroundColor: '#34C759',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
