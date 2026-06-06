import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { z } from 'zod';

import type {
  ExerciseCategory,
  Equipment,
  MuscleGroup,
  MovementPattern,
} from '../../../../src/types/enums';
import type { ExerciseModel } from '../../../../src/db/models/Exercise';

// ─── Zod validation schema ────────────────────────────────────────────────────

const CreateExerciseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  category: z.enum([
    'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight',
    'kettlebell', 'band', 'cardio', 'other',
  ]),
  primaryMuscles: z.array(z.string()).min(1, 'Select at least 1 primary muscle').max(3),
  secondaryMuscles: z.array(z.string()).max(5),
  equipment: z.array(z.string()),
  movementPattern: z.enum([
    'squat', 'hinge', 'push_horizontal', 'push_vertical',
    'pull_horizontal', 'pull_vertical', 'carry', 'rotation', 'isolation', 'cardio',
  ]),
  isCompound: z.boolean(),
  isUnilateral: z.boolean(),
  instructions: z.string(),
  defaultRestSeconds: z.number().nullable(),
});

type CreateExerciseInput = z.infer<typeof CreateExerciseSchema>;

// ─── Option lists ─────────────────────────────────────────────────────────────

const CATEGORIES: { label: string; value: ExerciseCategory }[] = [
  { label: 'Barbell', value: 'barbell' },
  { label: 'Dumbbell', value: 'dumbbell' },
  { label: 'Machine', value: 'machine' },
  { label: 'Cable', value: 'cable' },
  { label: 'Bodyweight', value: 'bodyweight' },
  { label: 'Kettlebell', value: 'kettlebell' },
  { label: 'Band', value: 'band' },
  { label: 'Cardio', value: 'cardio' },
  { label: 'Other', value: 'other' },
];

const MUSCLE_GROUPS: { label: string; value: MuscleGroup }[] = [
  { label: 'Chest', value: 'chest' },
  { label: 'Upper Back', value: 'upper_back' },
  { label: 'Lats', value: 'lats' },
  { label: 'Shoulders', value: 'shoulders' },
  { label: 'Front Delt', value: 'front_delt' },
  { label: 'Rear Delt', value: 'rear_delt' },
  { label: 'Biceps', value: 'biceps' },
  { label: 'Triceps', value: 'triceps' },
  { label: 'Forearms', value: 'forearms' },
  { label: 'Quads', value: 'quads' },
  { label: 'Hamstrings', value: 'hamstrings' },
  { label: 'Glutes', value: 'glutes' },
  { label: 'Calves', value: 'calves' },
  { label: 'Abs', value: 'abs' },
  { label: 'Obliques', value: 'obliques' },
  { label: 'Lower Back', value: 'lower_back' },
  { label: 'Traps', value: 'traps' },
  { label: 'Neck', value: 'neck' },
];

const EQUIPMENT_OPTIONS: { label: string; value: Equipment }[] = [
  { label: 'Barbell', value: 'barbell' },
  { label: 'Dumbbell', value: 'dumbbell' },
  { label: 'Machine', value: 'machine' },
  { label: 'Cable', value: 'cable' },
  { label: 'Kettlebell', value: 'kettlebell' },
  { label: 'Band', value: 'band' },
  { label: 'EZ Bar', value: 'ez_bar' },
  { label: 'Pull-up Bar', value: 'pull_up_bar' },
  { label: 'Dip Bar', value: 'dip_bar' },
  { label: 'Bench', value: 'bench' },
  { label: 'Smith Machine', value: 'smith_machine' },
  { label: 'Bodyweight', value: 'bodyweight' },
  { label: 'Other', value: 'other' },
];

const MOVEMENT_PATTERNS: { label: string; value: MovementPattern }[] = [
  { label: 'Squat', value: 'squat' },
  { label: 'Hinge', value: 'hinge' },
  { label: 'Push Horizontal', value: 'push_horizontal' },
  { label: 'Push Vertical', value: 'push_vertical' },
  { label: 'Pull Horizontal', value: 'pull_horizontal' },
  { label: 'Pull Vertical', value: 'pull_vertical' },
  { label: 'Carry', value: 'carry' },
  { label: 'Rotation', value: 'rotation' },
  { label: 'Isolation', value: 'isolation' },
  { label: 'Cardio', value: 'cardio' },
];

const REST_PRESETS = [
  { label: 'None', value: null },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '2m', value: 120 },
  { label: '3m', value: 180 },
  { label: '5m', value: 300 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

interface PickerRowProps<T extends string> {
  options: { label: string; value: T }[];
  selected: T | null;
  onSelect: (value: T) => void;
}

function PickerRow<T extends string>({ options, selected, onSelect }: PickerRowProps<T>) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.selChip, selected === opt.value && styles.selChipActive]}
          onPress={() => onSelect(opt.value)}
          activeOpacity={0.7}
        >
          <Text style={[styles.selChipText, selected === opt.value && styles.selChipTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

interface MultiSelectRowProps<T extends string> {
  options: { label: string; value: T }[];
  selected: T[];
  onToggle: (value: T) => void;
  max?: number;
}

function MultiSelectRow<T extends string>({
  options,
  selected,
  onToggle,
  max,
}: MultiSelectRowProps<T>) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt.value);
        const isDisabled = !isSelected && max !== undefined && selected.length >= max;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.selChip,
              isSelected && styles.selChipActive,
              isDisabled && styles.selChipDisabled,
            ]}
            onPress={() => !isDisabled && onToggle(opt.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.selChipText,
                isSelected && styles.selChipTextActive,
                isDisabled && styles.selChipTextDisabled,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  category: ExerciseCategory | null;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment[];
  movementPattern: MovementPattern | null;
  isCompound: boolean;
  isUnilateral: boolean;
  instructions: string;
  defaultRestSeconds: number | null;
}

const initialFormState: FormState = {
  name: '',
  category: null,
  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: [],
  movementPattern: null,
  isCompound: false,
  isUnilateral: false,
  instructions: '',
  defaultRestSeconds: 90,
};

// ─── CreateExerciseScreen ─────────────────────────────────────────────────────

export default function CreateExerciseScreen() {
  const database = useDatabase();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const toggleMulti = useCallback(
    <T extends MuscleGroup | Equipment>(
      key: 'primaryMuscles' | 'secondaryMuscles' | 'equipment',
      value: T,
    ) => {
      setForm((prev) => {
        const current = prev[key] as T[];
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        return { ...prev, [key]: next };
      });
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    const payload = {
      name: form.name.trim(),
      category: form.category ?? '',
      primaryMuscles: form.primaryMuscles,
      secondaryMuscles: form.secondaryMuscles,
      equipment: form.equipment,
      movementPattern: form.movementPattern ?? '',
      isCompound: form.isCompound,
      isUnilateral: form.isUnilateral,
      instructions: form.instructions.trim(),
      defaultRestSeconds: form.defaultRestSeconds,
    };

    const result = CreateExerciseSchema.safeParse(payload);

    if (!result.success) {
      const newErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormState;
        if (!newErrors[field]) {
          newErrors[field] = issue.message;
        }
      }
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      const validated: CreateExerciseInput = result.data;
      await database.write(async () => {
        await database.get<ExerciseModel>('exercises').create((record) => {
          record.name = validated.name;
          record.category = validated.category;
          // @ts-expect-error — json decorator accepts array
          record.primaryMuscles = validated.primaryMuscles;
          // @ts-expect-error — json decorator accepts array
          record.secondaryMuscles = validated.secondaryMuscles;
          record.equipment = validated.equipment.join(',');
          record.movementPattern = validated.movementPattern;
          record.isCompound = validated.isCompound;
          record.isUnilateral = validated.isUnilateral;
          record.instructions = validated.instructions;
          record.defaultRestSeconds = validated.defaultRestSeconds;
          record.isCustom = true;
          record.isArchived = false;
          record.videoUrl = null;
          record.thumbnailUrl = null;
          record.createdByUserId = null;
          record.defaultRpeTarget = null;
          record.syncedAt = null;
        });
      });
      router.back();
    } catch (err) {
      Alert.alert('Error', 'Failed to save exercise. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, database]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Nav bar */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.navCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>New Exercise</Text>
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.7}
            disabled={saving}
          >
            <Text style={[styles.navSave, saving && styles.navSaveDisabled]}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Name */}
          <SectionHeader title="Name *" />
          <View style={styles.card}>
            <TextInput
              style={styles.nameInput}
              placeholder="e.g. Close-Grip Bench Press"
              placeholderTextColor="rgba(235,235,245,0.3)"
              value={form.name}
              onChangeText={(t) => update('name', t)}
              autoCorrect={false}
              maxLength={100}
              returnKeyType="done"
            />
          </View>
          {errors.name && <Text style={styles.fieldError}>{errors.name}</Text>}

          {/* Category */}
          <SectionHeader title="Category *" />
          <View style={styles.card}>
            <PickerRow
              options={CATEGORIES}
              selected={form.category}
              onSelect={(v) => update('category', v)}
            />
          </View>
          {errors.category && <Text style={styles.fieldError}>{errors.category}</Text>}

          {/* Primary Muscles */}
          <SectionHeader title="Primary Muscles * (max 3)" />
          <View style={styles.card}>
            <MultiSelectRow
              options={MUSCLE_GROUPS}
              selected={form.primaryMuscles}
              onToggle={(v) => toggleMulti('primaryMuscles', v)}
              max={3}
            />
          </View>
          {errors.primaryMuscles && (
            <Text style={styles.fieldError}>{errors.primaryMuscles}</Text>
          )}

          {/* Secondary Muscles */}
          <SectionHeader title="Secondary Muscles (max 5)" />
          <View style={styles.card}>
            <MultiSelectRow
              options={MUSCLE_GROUPS}
              selected={form.secondaryMuscles}
              onToggle={(v) => toggleMulti('secondaryMuscles', v)}
              max={5}
            />
          </View>

          {/* Equipment */}
          <SectionHeader title="Equipment" />
          <View style={styles.card}>
            <MultiSelectRow
              options={EQUIPMENT_OPTIONS}
              selected={form.equipment}
              onToggle={(v) => toggleMulti('equipment', v)}
            />
          </View>

          {/* Movement Pattern */}
          <SectionHeader title="Movement Pattern" />
          <View style={styles.card}>
            <PickerRow
              options={MOVEMENT_PATTERNS}
              selected={form.movementPattern}
              onSelect={(v) => update('movementPattern', v)}
            />
          </View>

          {/* Toggles */}
          <SectionHeader title="Attributes" />
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabel}>
                <Text style={styles.toggleTitle}>Compound movement</Text>
                <Text style={styles.toggleSubtitle}>Works multiple muscle groups simultaneously</Text>
              </View>
              <Switch
                value={form.isCompound}
                onValueChange={(v) => update('isCompound', v)}
                trackColor={{ false: '#3A3A3C', true: '#007AFF' }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.toggleSeparator} />
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabel}>
                <Text style={styles.toggleTitle}>Unilateral</Text>
                <Text style={styles.toggleSubtitle}>Trains one side of the body at a time</Text>
              </View>
              <Switch
                value={form.isUnilateral}
                onValueChange={(v) => update('isUnilateral', v)}
                trackColor={{ false: '#3A3A3C', true: '#007AFF' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Default Rest */}
          <SectionHeader title="Default Rest" />
          <View style={styles.card}>
            <View style={styles.chipRow}>
              {REST_PRESETS.map((p) => (
                <TouchableOpacity
                  key={String(p.value)}
                  style={[
                    styles.selChip,
                    form.defaultRestSeconds === p.value && styles.selChipActive,
                  ]}
                  onPress={() => update('defaultRestSeconds', p.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.selChipText,
                      form.defaultRestSeconds === p.value && styles.selChipTextActive,
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Instructions */}
          <SectionHeader title="Instructions" />
          <View style={styles.card}>
            <TextInput
              style={styles.instructionsInput}
              placeholder="Describe the setup and movement cues…"
              placeholderTextColor="rgba(235,235,245,0.3)"
              value={form.instructions}
              onChangeText={(t) => update('instructions', t)}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
            />
          </View>

          <View style={{ height: 32 }} />
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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
  },
  navCancel: {
    color: '#007AFF',
    fontSize: 17,
  },
  navTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  navSave: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
  },
  navSaveDisabled: {
    color: 'rgba(0,122,255,0.4)',
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
  card: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  nameInput: {
    color: '#FFFFFF',
    fontSize: 17,
    paddingVertical: 4,
  },
  instructionsInput: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
    paddingTop: 4,
  },
  fieldError: {
    color: '#FF3B30',
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
  },
  selChipActive: {
    backgroundColor: '#007AFF',
  },
  selChipDisabled: {
    opacity: 0.35,
  },
  selChipText: {
    color: 'rgba(235,235,245,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  selChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  selChipTextDisabled: {
    color: 'rgba(235,235,245,0.3)',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleLabel: {
    flex: 1,
    marginRight: 16,
  },
  toggleTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  toggleSubtitle: {
    color: 'rgba(235,235,245,0.4)',
    fontSize: 13,
    marginTop: 2,
  },
  toggleSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#38383A',
    marginVertical: 8,
  },
});
