import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItemInfo,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { generateId } from '../../../../src/utils/nanoid';
import { BUILT_IN_EXERCISES } from '../../../../src/constants/exercises';
import type { WorkoutTemplateModel } from '../../../../src/db/models/WorkoutTemplate';
import type { TemplateExerciseModel } from '../../../../src/db/models/TemplateExercise';
import type { TemplateSetModel } from '../../../../src/db/models/TemplateSet';
import type { SetType } from '../../../../src/types/enums';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditableSet {
  id: string;
  orderIndex: number;
  setType: SetType;
  targetWeight: string; // string for TextInput, parsed on save
  targetReps: string;
  targetRpe: string;
  isAmrap: boolean;
}

interface EditableExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  orderIndex: number;
  restSeconds: string; // string for TextInput
  sets: EditableSet[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SET_TYPES: SetType[] = ['working', 'warmup', 'dropset', 'failure'];

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

const SET_TYPE_FULL_LABEL: Record<SetType, string> = {
  working: 'Working',
  warmup: 'Warmup',
  dropset: 'Drop Set',
  failure: 'To Failure',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getExerciseName(exerciseId: string): string {
  return BUILT_IN_EXERCISES.find((e) => e.id === exerciseId)?.name ?? 'Unknown';
}

function makeDefaultSet(orderIndex: number): EditableSet {
  return {
    id: generateId(),
    orderIndex,
    setType: 'working',
    targetWeight: '',
    targetReps: '',
    targetRpe: '',
    isAmrap: false,
  };
}

function parseNullableInt(s: string): number | null {
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

function parseNullableFloat(s: string): number | null {
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// ─── SetTypePicker ────────────────────────────────────────────────────────────

interface SetTypePickerProps {
  value: SetType;
  onChange: (t: SetType) => void;
}

const SetTypePicker = memo(({ value, onChange }: SetTypePickerProps) => (
  <View style={styles.setTypeRow}>
    {SET_TYPES.map((t) => {
      const active = t === value;
      const color = SET_TYPE_COLOR[t];
      return (
        <TouchableOpacity
          key={t}
          style={[
            styles.setTypeChip,
            active && { backgroundColor: color + '28', borderColor: color },
          ]}
          onPress={() => onChange(t)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.setTypeChipText,
              active && { color },
            ]}
          >
            {SET_TYPE_FULL_LABEL[t]}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
));

SetTypePicker.displayName = 'SetTypePicker';

// ─── EditableSetRow ───────────────────────────────────────────────────────────

interface EditableSetRowProps {
  set: EditableSet;
  index: number;
  onUpdate: (id: string, patch: Partial<EditableSet>) => void;
  onRemove: (id: string) => void;
}

const EditableSetRow = memo(
  ({ set, index, onUpdate, onRemove }: EditableSetRowProps) => {
    const color = SET_TYPE_COLOR[set.setType];
    const label = SET_TYPE_LABEL[set.setType];

    const [expanded, setExpanded] = useState(false);

    const handleTypePress = useCallback(() => {
      const currentIndex = SET_TYPES.indexOf(set.setType);
      const nextType = SET_TYPES[(currentIndex + 1) % SET_TYPES.length];
      onUpdate(set.id, { setType: nextType });
    }, [set.id, set.setType, onUpdate]);

    const handleWeightChange = useCallback(
      (v: string) => onUpdate(set.id, { targetWeight: v }),
      [set.id, onUpdate],
    );
    const handleRepsChange = useCallback(
      (v: string) => onUpdate(set.id, { targetReps: v }),
      [set.id, onUpdate],
    );
    const handleRpeChange = useCallback(
      (v: string) => onUpdate(set.id, { targetRpe: v }),
      [set.id, onUpdate],
    );
    const handleAmrapToggle = useCallback(
      (v: boolean) => onUpdate(set.id, { isAmrap: v }),
      [set.id, onUpdate],
    );
    const handleRemove = useCallback(() => onRemove(set.id), [set.id, onRemove]);

    return (
      <View style={styles.editableSetContainer}>
        {/* Main row */}
        <View style={styles.editableSetRow}>
          {/* Set number */}
          <Text style={styles.editableSetIndex}>{index + 1}</Text>

          {/* Set type badge — tap to cycle */}
          <TouchableOpacity
            style={[styles.editableSetTypeBadge, { backgroundColor: color + '28' }]}
            onPress={handleTypePress}
            activeOpacity={0.7}
          >
            <Text style={[styles.editableSetTypeBadgeText, { color }]}>{label}</Text>
          </TouchableOpacity>

          {/* Weight input */}
          <View style={styles.setInputWrapper}>
            <TextInput
              style={styles.setInput}
              value={set.targetWeight}
              onChangeText={handleWeightChange}
              placeholder="kg"
              placeholderTextColor="rgba(235,235,245,0.25)"
              keyboardType="decimal-pad"
              returnKeyType="next"
              selectTextOnFocus
            />
          </View>

          {/* Reps input */}
          {!set.isAmrap ? (
            <View style={styles.setInputWrapper}>
              <TextInput
                style={styles.setInput}
                value={set.targetReps}
                onChangeText={handleRepsChange}
                placeholder="reps"
                placeholderTextColor="rgba(235,235,245,0.25)"
                keyboardType="number-pad"
                returnKeyType="next"
                selectTextOnFocus
              />
            </View>
          ) : (
            <View style={styles.setInputWrapper}>
              <Text style={styles.amrapLabel}>AMRAP</Text>
            </View>
          )}

          {/* Expand toggle */}
          <TouchableOpacity
            style={styles.expandToggle}
            onPress={() => setExpanded((p) => !p)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.expandToggleText}>{expanded ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {/* Remove */}
          <TouchableOpacity
            style={styles.removeSetButton}
            onPress={handleRemove}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.removeSetButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Expanded options */}
        {expanded && (
          <View style={styles.setExpandedOptions}>
            <Text style={styles.expandedSectionLabel}>Type</Text>
            <SetTypePicker
              value={set.setType}
              onChange={(t) => onUpdate(set.id, { setType: t })}
            />

            <View style={styles.expandedRow}>
              <View style={styles.expandedField}>
                <Text style={styles.expandedFieldLabel}>Target RPE</Text>
                <TextInput
                  style={styles.expandedInput}
                  value={set.targetRpe}
                  onChangeText={handleRpeChange}
                  placeholder="—"
                  placeholderTextColor="rgba(235,235,245,0.25)"
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  selectTextOnFocus
                />
              </View>

              <View style={styles.expandedField}>
                <Text style={styles.expandedFieldLabel}>AMRAP</Text>
                <Switch
                  value={set.isAmrap}
                  onValueChange={handleAmrapToggle}
                  trackColor={{ false: '#3A3A3C', true: '#007AFF' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>
        )}
      </View>
    );
  },
  (prev, next) =>
    prev.set.id === next.set.id &&
    prev.set.setType === next.set.setType &&
    prev.set.targetWeight === next.set.targetWeight &&
    prev.set.targetReps === next.set.targetReps &&
    prev.set.targetRpe === next.set.targetRpe &&
    prev.set.isAmrap === next.set.isAmrap &&
    prev.index === next.index,
);

EditableSetRow.displayName = 'EditableSetRow';

// ─── ExerciseEditor ───────────────────────────────────────────────────────────

interface ExerciseEditorProps {
  exercise: EditableExercise;
  index: number;
  isDragHandle?: boolean;
  onUpdateExercise: (id: string, patch: Partial<EditableExercise>) => void;
  onRemoveExercise: (id: string) => void;
  onAddSet: (exerciseId: string) => void;
}

const ExerciseEditor = memo(
  ({
    exercise,
    index,
    onUpdateExercise,
    onRemoveExercise,
    onAddSet,
  }: ExerciseEditorProps) => {
    const handleUpdateSet = useCallback(
      (setId: string, patch: Partial<EditableSet>) => {
        onUpdateExercise(exercise.id, {
          sets: exercise.sets.map((s) =>
            s.id === setId ? { ...s, ...patch } : s,
          ),
        });
      },
      [exercise.id, exercise.sets, onUpdateExercise],
    );

    const handleRemoveSet = useCallback(
      (setId: string) => {
        onUpdateExercise(exercise.id, {
          sets: exercise.sets
            .filter((s) => s.id !== setId)
            .map((s, i) => ({ ...s, orderIndex: i })),
        });
      },
      [exercise.id, exercise.sets, onUpdateExercise],
    );

    const handleAddSet = useCallback(() => {
      onAddSet(exercise.id);
    }, [exercise.id, onAddSet]);

    const handleRemoveExercise = useCallback(() => {
      onRemoveExercise(exercise.id);
    }, [exercise.id, onRemoveExercise]);

    const handleRestChange = useCallback(
      (v: string) => {
        onUpdateExercise(exercise.id, { restSeconds: v });
      },
      [exercise.id, onUpdateExercise],
    );

    return (
      <View style={styles.exerciseEditor}>
        {/* Exercise header */}
        <View style={styles.exerciseEditorHeader}>
          <View style={styles.dragHandle}>
            <Text style={styles.dragHandleIcon}>⠿</Text>
          </View>
          <View style={styles.exerciseEditorMeta}>
            <Text style={styles.exerciseEditorIndex}>{index + 1}</Text>
            <Text style={styles.exerciseEditorName} numberOfLines={1}>
              {exercise.exerciseName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleRemoveExercise}
            style={styles.removeExerciseButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.removeExerciseText}>Remove</Text>
          </TouchableOpacity>
        </View>

        {/* Rest seconds */}
        <View style={styles.restRow}>
          <Text style={styles.restLabel}>Rest (seconds)</Text>
          <TextInput
            style={styles.restInput}
            value={exercise.restSeconds}
            onChangeText={handleRestChange}
            placeholder="Default"
            placeholderTextColor="rgba(235,235,245,0.25)"
            keyboardType="number-pad"
            returnKeyType="done"
          />
        </View>

        {/* Set header */}
        <View style={styles.setListHeader}>
          <Text style={[styles.setListHeaderCell, { width: 24 }]}>#</Text>
          <Text style={[styles.setListHeaderCell, { width: 40 }]}>Type</Text>
          <Text style={[styles.setListHeaderCell, { flex: 1 }]}>Weight</Text>
          <Text style={[styles.setListHeaderCell, { flex: 1 }]}>Reps</Text>
          <Text style={[styles.setListHeaderCell, { width: 24 }]} />
          <Text style={[styles.setListHeaderCell, { width: 24 }]} />
        </View>

        {/* Set rows */}
        {exercise.sets.map((set, i) => (
          <EditableSetRow
            key={set.id}
            set={set}
            index={i}
            onUpdate={handleUpdateSet}
            onRemove={handleRemoveSet}
          />
        ))}

        {/* Add Set */}
        <TouchableOpacity
          style={styles.addSetButton}
          onPress={handleAddSet}
          activeOpacity={0.7}
        >
          <Text style={styles.addSetButtonText}>+ Add Set</Text>
        </TouchableOpacity>
      </View>
    );
  },
  (prev, next) =>
    prev.exercise.id === next.exercise.id &&
    prev.exercise.sets === next.exercise.sets &&
    prev.exercise.exerciseName === next.exercise.exerciseName &&
    prev.exercise.restSeconds === next.exercise.restSeconds &&
    prev.index === next.index,
);

ExerciseEditor.displayName = 'ExerciseEditor';

// ─── CreateTemplateScreen ─────────────────────────────────────────────────────

export default function CreateTemplateScreen() {
  const database = useDatabase();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const isEditing = Boolean(editId);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultRestSeconds, setDefaultRestSeconds] = useState('');
  const [exercises, setExercises] = useState<EditableExercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEditing);

  // Load existing template when editing
  useEffect(() => {
    if (!editId) return;
    void (async () => {
      try {
        const model = await database
          .get<WorkoutTemplateModel>('workout_templates')
          .find(editId);
        setName(model.name);
        setDescription(model.description ?? '');
        setDefaultRestSeconds('');

        const exModels = await model.exercises.fetch();
        const loaded: EditableExercise[] = await Promise.all(
          exModels.map(async (ex) => {
            const setModels = await ex.sets.fetch();
            const sets: EditableSet[] = setModels.map((s) => ({
              id: s.id,
              orderIndex: s.orderIndex,
              setType: (s.setType as SetType) ?? 'working',
              targetWeight: s.targetWeight !== null ? String(s.targetWeight) : '',
              targetReps: s.targetReps !== null ? String(s.targetReps) : '',
              targetRpe: s.targetRpe !== null ? String(s.targetRpe) : '',
              isAmrap: s.isAmrap,
            }));
            return {
              id: ex.id,
              exerciseId: ex.exerciseId,
              exerciseName: getExerciseName(ex.exerciseId),
              orderIndex: ex.orderIndex,
              restSeconds: ex.restSeconds !== null ? String(ex.restSeconds) : '',
              sets,
            };
          }),
        );
        setExercises(loaded);
      } catch {
        Alert.alert('Error', 'Could not load template for editing.');
        router.back();
      } finally {
        setLoadingEdit(false);
      }
    })();
  }, [editId, database]);

  // ─── Exercise picker integration ────────────────────────────────────────

  const handleAddExercise = useCallback(() => {
    // Navigate to exercise picker modal; on return, params carry selected IDs.
    // The exercise picker modal calls router.setParams on confirm.
    router.push('/modals/exercise-picker');
  }, []);

  // Listen for selectedExerciseIds coming back from the picker
  const params = useLocalSearchParams<{ selectedExerciseIds?: string }>();
  const lastPickedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!params.selectedExerciseIds) return;
    if (params.selectedExerciseIds === lastPickedRef.current) return;
    lastPickedRef.current = params.selectedExerciseIds;

    try {
      const ids: unknown = JSON.parse(params.selectedExerciseIds);
      if (!Array.isArray(ids)) return;
      const newExercises: EditableExercise[] = (ids as string[]).map(
        (exerciseId, i) => ({
          id: generateId(),
          exerciseId,
          exerciseName: getExerciseName(exerciseId),
          orderIndex: exercises.length + i,
          restSeconds: '',
          sets: [makeDefaultSet(0)],
        }),
      );
      setExercises((prev) => [
        ...prev,
        ...newExercises.map((e, i) => ({ ...e, orderIndex: prev.length + i })),
      ]);
    } catch {
      // malformed param — ignore
    }
  }, [params.selectedExerciseIds]);

  // ─── Mutations ───────────────────────────────────────────────────────────

  const handleUpdateExercise = useCallback(
    (id: string, patch: Partial<EditableExercise>) => {
      setExercises((prev) =>
        prev.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex)),
      );
    },
    [],
  );

  const handleRemoveExercise = useCallback((id: string) => {
    setExercises((prev) =>
      prev
        .filter((ex) => ex.id !== id)
        .map((ex, i) => ({ ...ex, orderIndex: i })),
    );
  }, []);

  const handleAddSet = useCallback((exerciseId: string) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: [...ex.sets, makeDefaultSet(ex.sets.length)],
            }
          : ex,
      ),
    );
  }, []);

  // ─── Validation ──────────────────────────────────────────────────────────

  const isValid = useMemo(
    () => name.trim().length > 0,
    [name],
  );

  // ─── Save ────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!isValid) {
      Alert.alert('Name required', 'Please enter a template name.');
      return;
    }
    setSaving(true);
    try {
      const trimmedName = name.trim();
      const trimmedDesc = description.trim() || null;
      const restSecsValue = parseNullableInt(defaultRestSeconds);

      await database.write(async () => {
        if (isEditing && editId) {
          // Update existing template
          const model = await database
            .get<WorkoutTemplateModel>('workout_templates')
            .find(editId);
          await model.update((m) => {
            m.name = trimmedName;
            m.description = trimmedDesc;
            m.estimatedDurationMinutes = null;
          });

          // Delete all existing TemplateExercise + TemplateSet rows
          const existingExs = await model.exercises.fetch();
          for (const ex of existingExs) {
            const existingSets = await ex.sets.fetch();
            for (const s of existingSets) {
              await s.destroyPermanently();
            }
            await ex.destroyPermanently();
          }
        }

        const templateId = isEditing && editId ? editId : generateId();

        if (!isEditing) {
          await database
            .get('workout_templates')
            .create((m: Record<string, unknown>) => {
              m['id'] = templateId;
              m['name'] = trimmedName;
              m['description'] = trimmedDesc;
              m['estimated_duration_minutes'] = null;
              m['is_archived'] = false;
              m['is_built_in'] = false;
              m['usage_count'] = 0;
              m['last_used_at'] = null;
            });
        }

        // Write exercises and sets
        for (const ex of exercises) {
          const templateExId = generateId();
          await database
            .get('template_exercises')
            .create((m: Record<string, unknown>) => {
              m['id'] = templateExId;
              m['template_id'] = templateId;
              m['exercise_id'] = ex.exerciseId;
              m['order_index'] = ex.orderIndex;
              m['rest_seconds'] = parseNullableInt(ex.restSeconds);
            });

          for (const set of ex.sets) {
            await database
              .get('template_sets')
              .create((m: Record<string, unknown>) => {
                m['id'] = generateId();
                m['template_exercise_id'] = templateExId;
                m['order_index'] = set.orderIndex;
                m['set_type'] = set.setType;
                m['target_weight'] = parseNullableFloat(set.targetWeight);
                m['target_reps'] = parseNullableInt(set.targetReps);
                m['target_rpe'] = parseNullableFloat(set.targetRpe);
                m['is_amrap'] = set.isAmrap;
                m['target_weight_modifier'] = 'absolute';
              });
          }
        }
      });

      router.back();
    } catch (err) {
      setSaving(false);
      Alert.alert('Error', 'Could not save template. Please try again.');
    }
  }, [isValid, name, description, defaultRestSeconds, exercises, isEditing, editId, database]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loadingEdit) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.navCancel}
          activeOpacity={0.7}
        >
          <Text style={styles.navCancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>{isEditing ? 'Edit Template' : 'New Template'}</Text>
        <TouchableOpacity
          style={[styles.navSave, !isValid && styles.navSaveDisabled]}
          onPress={handleSave}
          disabled={!isValid || saving}
          activeOpacity={0.7}
        >
          <Text style={[styles.navSaveText, !isValid && styles.navSaveTextDisabled]}>
            {saving ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Template details section */}
          <Text style={styles.sectionHeader}>Template Details</Text>
          <View style={styles.formCard}>
            {/* Name */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Name *</Text>
              <TextInput
                style={styles.formInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Push Day A"
                placeholderTextColor="rgba(235,235,245,0.25)"
                returnKeyType="next"
                autoCorrect={false}
              />
            </View>

            <View style={styles.formDivider} />

            {/* Description */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMultiline]}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional notes about this template"
                placeholderTextColor="rgba(235,235,245,0.25)"
                multiline
                numberOfLines={3}
                returnKeyType="done"
                autoCorrect
              />
            </View>

            <View style={styles.formDivider} />

            {/* Default rest */}
            <View style={styles.formFieldInline}>
              <Text style={styles.formLabel}>Default Rest (seconds)</Text>
              <TextInput
                style={styles.formInputInline}
                value={defaultRestSeconds}
                onChangeText={setDefaultRestSeconds}
                placeholder="90"
                placeholderTextColor="rgba(235,235,245,0.25)"
                keyboardType="number-pad"
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Exercises section */}
          <View style={styles.exercisesSectionHeader}>
            <Text style={styles.sectionHeader}>Exercises</Text>
            {exercises.length > 0 && (
              <Text style={styles.exercisesCount}>{exercises.length}</Text>
            )}
          </View>

          {/* Exercise editors */}
          {exercises.map((ex, i) => (
            <ExerciseEditor
              key={ex.id}
              exercise={ex}
              index={i}
              onUpdateExercise={handleUpdateExercise}
              onRemoveExercise={handleRemoveExercise}
              onAddSet={handleAddSet}
            />
          ))}

          {/* Add Exercise button */}
          <TouchableOpacity
            style={styles.addExerciseButton}
            onPress={handleAddExercise}
            activeOpacity={0.8}
          >
            <Text style={styles.addExerciseButtonText}>+ Add Exercise</Text>
          </TouchableOpacity>

          {/* Empty state nudge */}
          {exercises.length === 0 && (
            <View style={styles.exercisesEmptyHint}>
              <Text style={styles.exercisesEmptyText}>
                Add exercises to build your template.
              </Text>
            </View>
          )}

          {/* Bottom padding */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'rgba(235,235,245,0.4)',
    fontSize: 16,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
  },
  navCancel: {
    paddingVertical: 4,
    minWidth: 60,
  },
  navCancelText: {
    color: '#007AFF',
    fontSize: 17,
  },
  navTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  navSave: {
    paddingVertical: 4,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  navSaveDisabled: {},
  navSaveText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
  },
  navSaveTextDisabled: {
    color: 'rgba(235,235,245,0.25)',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  sectionHeader: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  formCard: {
    marginHorizontal: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  formField: {
    paddingVertical: 12,
    gap: 6,
  },
  formFieldInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  formLabel: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  formInput: {
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 0,
    paddingTop: 2,
  },
  formInputMultiline: {
    height: 72,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  formInputInline: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'right',
    minWidth: 60,
  },
  formDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#38383A',
  },
  exercisesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
  },
  exercisesCount: {
    color: 'rgba(235,235,245,0.4)',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 20,
  },
  exerciseEditor: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  exerciseEditorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
    gap: 10,
  },
  dragHandle: {
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  dragHandleIcon: {
    color: 'rgba(235,235,245,0.2)',
    fontSize: 20,
  },
  exerciseEditorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  exerciseEditorIndex: {
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
  exerciseEditorName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  removeExerciseButton: {
    paddingHorizontal: 4,
  },
  removeExerciseText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '500',
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
  },
  restLabel: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 13,
    fontWeight: '500',
  },
  restInput: {
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'right',
    minWidth: 60,
  },
  setListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#161618',
  },
  setListHeaderCell: {
    color: 'rgba(235,235,245,0.35)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  editableSetContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2C2C2E',
  },
  editableSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  editableSetIndex: {
    width: 24,
    color: 'rgba(235,235,245,0.35)',
    fontSize: 13,
    textAlign: 'center',
  },
  editableSetTypeBadge: {
    width: 34,
    paddingVertical: 3,
    borderRadius: 4,
    alignItems: 'center',
  },
  editableSetTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  setInputWrapper: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  setInput: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
    paddingVertical: 0,
  },
  amrapLabel: {
    color: '#FF9500',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  expandToggle: {
    width: 22,
    alignItems: 'center',
  },
  expandToggleText: {
    color: 'rgba(235,235,245,0.3)',
    fontSize: 10,
  },
  removeSetButton: {
    width: 22,
    alignItems: 'center',
  },
  removeSetButtonText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '500',
  },
  setExpandedOptions: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: '#161618',
    gap: 10,
  },
  expandedSectionLabel: {
    color: 'rgba(235,235,245,0.4)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingTop: 8,
  },
  setTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  setTypeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#2C2C2E',
  },
  setTypeChipText: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 12,
    fontWeight: '600',
  },
  expandedRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  expandedField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  expandedFieldLabel: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 13,
  },
  expandedInput: {
    color: '#FFFFFF',
    fontSize: 15,
    backgroundColor: '#2C2C2E',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 60,
    textAlign: 'center',
  },
  addSetButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#38383A',
  },
  addSetButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  addExerciseButton: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38383A',
    borderStyle: 'dashed',
  },
  addExerciseButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  exercisesEmptyHint: {
    marginHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  exercisesEmptyText: {
    color: 'rgba(235,235,245,0.3)',
    fontSize: 14,
    textAlign: 'center',
  },
});
