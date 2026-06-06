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

import { BUILT_IN_EXERCISES } from '../../../../src/constants/exercises';
import { useActiveSessionStore } from '../../../../src/stores/activeSessionStore';
import type { ExerciseCategory, MuscleGroup, MovementPattern } from '../../../../src/types/enums';
import type { ExerciseModel } from '../../../../src/db/models/Exercise';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExerciseDetail {
  id: string;
  name: string;
  category: ExerciseCategory;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: string[];
  movementPattern: MovementPattern;
  isCompound: boolean;
  isUnilateral: boolean;
  instructions: string;
  defaultRestSeconds: number | null;
  isCustom: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<string, string> = {
  barbell: '#FF9500',
  dumbbell: '#007AFF',
  machine: '#5AC8FA',
  cable: '#AF52DE',
  bodyweight: '#34C759',
  kettlebell: '#FF2D55',
  band: '#FFCC00',
  cardio: '#FF3B30',
  other: '#3A3A3C',
};

function capitalize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRest(seconds: number | null): string {
  if (seconds === null) return 'Not set';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

// ─── MuscleChip ───────────────────────────────────────────────────────────────

const MuscleChip = ({ muscle, dim }: { muscle: string; dim?: boolean }) => (
  <View style={[styles.chip, dim && styles.chipDim]}>
    <Text style={[styles.chipText, dim && styles.chipTextDim]}>{capitalize(muscle)}</Text>
  </View>
);

// ─── InfoRow ──────────────────────────────────────────────────────────────────

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

// ─── SectionHeader ────────────────────────────────────────────────────────────

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

// ─── ExerciseDetailScreen ─────────────────────────────────────────────────────

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const database = useDatabase();
  const sessionId = useActiveSessionStore((s) => s.sessionId);
  const addExercise = useActiveSessionStore((s) => s.addExercise);
  const sessionActive = sessionId !== null;

  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    // First check built-in exercises
    const builtIn = BUILT_IN_EXERCISES.find((e) => e.id === id);
    if (builtIn) {
      setExercise({
        id: builtIn.id,
        name: builtIn.name,
        category: builtIn.category,
        primaryMuscles: builtIn.primaryMuscles,
        secondaryMuscles: builtIn.secondaryMuscles,
        equipment: builtIn.equipment,
        movementPattern: builtIn.movementPattern,
        isCompound: builtIn.isCompound,
        isUnilateral: builtIn.isUnilateral,
        instructions: builtIn.instructions,
        defaultRestSeconds: builtIn.defaultRestSeconds,
        isCustom: false,
      });
      setLoading(false);
      return;
    }

    // Fall back to WatermelonDB custom exercise
    database
      .get<ExerciseModel>('exercises')
      .find(id)
      .then((model) => {
        setExercise({
          id: model.id,
          name: model.name,
          category: model.category as ExerciseCategory,
          primaryMuscles: model.primaryMuscles as MuscleGroup[],
          secondaryMuscles: model.secondaryMuscles as MuscleGroup[],
          equipment: [model.equipment],
          movementPattern: model.movementPattern as MovementPattern,
          isCompound: model.isCompound,
          isUnilateral: model.isUnilateral,
          instructions: model.instructions ?? '',
          defaultRestSeconds: model.defaultRestSeconds,
          isCustom: model.isCustom,
        });
      })
      .catch(() => {
        setExercise(null);
      })
      .finally(() => setLoading(false));
  }, [id, database]);

  const handleAddToWorkout = useCallback(() => {
    if (!exercise || !sessionId) return;
    const nanoid = require('../../../../src/utils/nanoid').nanoid;
    addExercise({
      id: nanoid(),
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      orderIndex: 0,
      setIds: [],
    });
    router.back();
  }, [exercise, sessionId, addExercise]);

  const categoryColor = useMemo(
    () => (exercise ? (CATEGORY_COLOR[exercise.category] ?? '#3A3A3C') : '#3A3A3C'),
    [exercise],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!exercise) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Exercise not found.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Back nav */}
        <TouchableOpacity onPress={() => router.back()} style={styles.navBack} activeOpacity={0.7}>
          <Text style={styles.navBackText}>‹ Exercises</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <View style={styles.headerMeta}>
            <View style={[styles.categoryPill, { backgroundColor: categoryColor + '33' }]}>
              <Text style={[styles.categoryPillText, { color: categoryColor }]}>
                {capitalize(exercise.category)}
              </Text>
            </View>
            {exercise.isCompound && (
              <View style={styles.tagPill}>
                <Text style={styles.tagPillText}>Compound</Text>
              </View>
            )}
            {exercise.isUnilateral && (
              <View style={styles.tagPill}>
                <Text style={styles.tagPillText}>Unilateral</Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick info */}
        <View style={styles.card}>
          <InfoRow label="Movement" value={capitalize(exercise.movementPattern)} />
          <View style={styles.infoSeparator} />
          <InfoRow label="Default rest" value={formatRest(exercise.defaultRestSeconds)} />
          {exercise.equipment.length > 0 && (
            <>
              <View style={styles.infoSeparator} />
              <InfoRow label="Equipment" value={exercise.equipment.map(capitalize).join(', ')} />
            </>
          )}
        </View>

        {/* Muscles */}
        <SectionHeader title="Muscles" />
        <View style={styles.card}>
          {exercise.primaryMuscles.length > 0 && (
            <View style={styles.muscleGroup}>
              <Text style={styles.muscleGroupLabel}>Primary</Text>
              <View style={styles.chipRow}>
                {exercise.primaryMuscles.map((m) => (
                  <MuscleChip key={m} muscle={m} />
                ))}
              </View>
            </View>
          )}
          {exercise.secondaryMuscles.length > 0 && (
            <View style={[styles.muscleGroup, exercise.primaryMuscles.length > 0 && { marginTop: 12 }]}>
              <Text style={styles.muscleGroupLabel}>Secondary</Text>
              <View style={styles.chipRow}>
                {exercise.secondaryMuscles.map((m) => (
                  <MuscleChip key={m} muscle={m} dim />
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Instructions */}
        {exercise.instructions.length > 0 && (
          <>
            <SectionHeader title="Instructions" />
            <View style={styles.card}>
              <Text style={styles.instructionsText}>{exercise.instructions}</Text>
            </View>
          </>
        )}

        {/* PRs — stub */}
        <SectionHeader title="Personal Records" />
        <View style={styles.card}>
          <View style={styles.prRow}>
            <PRStub label="Best Weight" value="—" />
            <PRStub label="Best Reps" value="—" />
            <PRStub label="Est. 1RM" value="—" />
          </View>
        </View>

        {/* History — stub */}
        <SectionHeader title="Recent History" />
        <View style={styles.card}>
          <View style={styles.centered}>
            <Text style={styles.stubText}>No sessions recorded yet.</Text>
          </View>
        </View>

        {/* Spacer so the button doesn't overlap content */}
        {sessionActive && <View style={{ height: 80 }} />}
      </ScrollView>

      {/* Add to Workout CTA */}
      {sessionActive && (
        <View style={styles.ctaContainer}>
          <TouchableOpacity style={styles.ctaButton} onPress={handleAddToWorkout} activeOpacity={0.8}>
            <Text style={styles.ctaButtonText}>Add to Workout</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── PRStub ───────────────────────────────────────────────────────────────────

const PRStub = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.prItem}>
    <Text style={styles.prValue}>{value}</Text>
    <Text style={styles.prLabel}>{label}</Text>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  centered: {
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
  },
  navBack: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navBackText: {
    color: '#007AFF',
    fontSize: 17,
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
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  exerciseName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#2C2C2E',
  },
  tagPillText: {
    color: 'rgba(235,235,245,0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 15,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  infoSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#38383A',
    marginVertical: 4,
  },
  muscleGroup: {
    gap: 8,
  },
  muscleGroupLabel: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#3A3A3C',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  chipDim: {
    backgroundColor: '#2C2C2E',
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextDim: {
    color: 'rgba(235,235,245,0.5)',
  },
  instructionsText: {
    color: 'rgba(235,235,245,0.8)',
    fontSize: 15,
    lineHeight: 22,
  },
  prRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  prItem: {
    alignItems: 'center',
    gap: 4,
  },
  prValue: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: '700',
  },
  prLabel: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 12,
    textAlign: 'center',
  },
  stubText: {
    color: 'rgba(235,235,245,0.4)',
    fontSize: 14,
    textAlign: 'center',
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
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
