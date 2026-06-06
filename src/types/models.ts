import type {
  UnitPreference,
  ThemePreference,
  OneRMFormula,
  TrainingGoal,
  ExperienceLevel,
  SubscriptionTier,
  ExerciseCategory,
  MuscleGroup,
  Equipment,
  MovementPattern,
  SetType,
  PRRecordType,
  MoodRating,
  GroupType,
  MeasurementSource,
  TargetWeightModifier,
} from './enums';

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  unitPreference: UnitPreference;
  themePreference: ThemePreference;
  accentColour: string | null;
  defaultRestSeconds: number;
  oneRmFormula: OneRMFormula;
  trainingGoal: TrainingGoal;
  experienceLevel: ExperienceLevel;
  dateOfBirth: string | null; // ISO 8601 date string (YYYY-MM-DD)
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt: number | null; // Unix timestamp (ms)
  appleHealthLinked: boolean;
  isLocalOnly: boolean;
  createdAt: number;
  updatedAt: number;
  syncedAt: number | null;
}

// ─── Exercise ────────────────────────────────────────────────────────────────

export interface Exercise {
  id: string;
  name: string;
  aliases: string[];
  category: ExerciseCategory;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment[];
  movementPattern: MovementPattern;
  isCompound: boolean;
  isUnilateral: boolean;
  instructions: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  isCustom: boolean;
  createdByUserId: string | null;
  isArchived: boolean;
  defaultRestSeconds: number | null;
  defaultRpeTarget: number | null;
  createdAt: number;
  updatedAt: number;
  syncedAt: number | null;
}

// ─── Workout Template ────────────────────────────────────────────────────────

export interface WorkoutTemplate {
  id: string;
  userId: string;
  name: string;
  notes: string | null;
  estimatedDurationMinutes: number | null;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
  syncedAt: number | null;
}

export interface TemplateExercise {
  id: string;
  templateId: string;
  exerciseId: string;
  orderIndex: number;
  supersetGroupId: string | null;
  notes: string | null;
  defaultRestSeconds: number | null;
  createdAt: number;
  updatedAt: number;
  syncedAt: number | null;
}

export interface TemplateSet {
  id: string;
  templateExerciseId: string;
  orderIndex: number;
  setType: SetType;
  targetReps: number | null;
  targetRepsMax: number | null; // upper bound for rep ranges (e.g., 8–12)
  targetWeightKg: number | null;
  targetWeightModifier: TargetWeightModifier | null;
  targetRpe: number | null;
  isAmrap: boolean;
  createdAt: number;
  updatedAt: number;
  syncedAt: number | null;
}

// ─── Program ─────────────────────────────────────────────────────────────────

export interface ProgressionRule {
  type: 'linear' | 'double_progression' | 'percentage_wave' | 'custom';
  incrementKg: number | null;
  minReps: number | null;
  maxReps: number | null;
  deloadWeeks: number[]; // 1-indexed week numbers that are deload weeks
}

export interface Program {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  authorName: string | null;
  durationWeeks: number;
  daysPerWeek: number;
  progressionRule: ProgressionRule | null;
  isActive: boolean;
  currentWeek: number;
  currentDay: number;
  startedAt: number | null;
  isBuiltIn: boolean;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
  syncedAt: number | null;
}

// Junction model: maps a (week, day) slot in a program to a workout template
export interface ProgramSlot {
  id: string;
  programId: string;
  templateId: string;
  weekNumber: number; // 1-indexed
  dayNumber: number;  // 1-indexed
  createdAt: number;
  updatedAt: number;
  syncedAt: number | null;
}

// ─── Workout Session ──────────────────────────────────────────────────────────

export interface WorkoutSession {
  id: string;
  userId: string;
  templateId: string | null;
  programId: string | null;
  programSlotId: string | null;
  name: string | null;
  notes: string | null;
  startedAt: number;
  endedAt: number | null;
  durationSeconds: number | null;
  preworkoutMood: MoodRating | null;
  postworkoutMood: MoodRating | null;
  bodyWeightKg: number | null; // bodyweight logged at session start
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
  syncedAt: number | null;
}

export interface SessionExercise {
  id: string;
  sessionId: string;
  exerciseId: string;
  orderIndex: number;
  supersetGroupId: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  syncedAt: number | null;
}

// ─── Set ─────────────────────────────────────────────────────────────────────

export interface Set {
  id: string;
  sessionId: string;
  sessionExerciseId: string;
  exerciseId: string;
  userId: string;
  orderIndex: number;
  setType: SetType;
  /**
   * The weight the user intended to lift (as entered or prescribed).
   * Do NOT use this field for PR detection or analytics.
   */
  weightKg: number | null;
  /**
   * The weight actually achievable with the user's available plates after
   * rounding. When the plate calculator is not used, this equals weightKg.
   * ALWAYS use this field for PR detection and all analytics.
   */
  weightKgActual: number | null;
  reps: number | null;
  repsTarget: number | null;
  isAmrap: boolean;
  rpe: number | null;
  rir: number | null; // Reps In Reserve
  durationSeconds: number | null; // for timed sets / cardio
  distanceMetres: number | null;  // for cardio exercises
  isWarmup: boolean;
  isPersonalRecord: boolean;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
  syncedAt: number | null;
}

// ─── Personal Record ─────────────────────────────────────────────────────────

export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseId: string;
  setId: string;
  sessionId: string;
  recordType: PRRecordType;
  value: number; // kg for weight/volume/e1RM, raw count for reps
  previousValue: number | null;
  achievedAt: number;
  createdAt: number;
  updatedAt: number;
  syncedAt: number | null;
}

// ─── Body Measurement ─────────────────────────────────────────────────────────

export const MEASUREMENT_SCHEMA_VERSION = 1 as const;

/**
 * Stored as a JSON column in BodyMeasurement.
 * Must be validated on every read and write using the Zod schema pinned to
 * MEASUREMENT_SCHEMA_VERSION. Increment the version and provide a migration
 * function whenever new measurement types are added.
 */
export interface MeasurementValues {
  schemaVersion: typeof MEASUREMENT_SCHEMA_VERSION;
  weightKg?: number;
  bodyFatPercent?: number;
  muscleMassKg?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  neckCm?: number;
  leftBicepCm?: number;
  rightBicepCm?: number;
  leftThighCm?: number;
  rightThighCm?: number;
  leftCalfCm?: number;
  rightCalfCm?: number;
}

export interface BodyMeasurement {
  id: string;
  userId: string;
  measuredAt: number; // Unix timestamp (ms)
  source: MeasurementSource;
  values: MeasurementValues;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  syncedAt: number | null;
}

// ─── Nutrition Log ────────────────────────────────────────────────────────────

export interface NutritionLog {
  id: string;
  userId: string;
  loggedAt: number; // Unix timestamp (ms)
  source: MeasurementSource;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  syncedAt: number | null;
}

// ─── Superset Group ───────────────────────────────────────────────────────────

/**
 * Groups 2–6 SessionExercise (or TemplateExercise) rows into a superset or
 * circuit. If removing a member reduces the count to 1, the group is dissolved
 * and the remaining exercise becomes standalone (supersetGroupId = null).
 */
export interface SupersetGroup {
  id: string;
  sessionId: string | null;    // null when used in a template
  templateId: string | null;   // null when used in a live session
  groupType: GroupType;
  orderIndex: number;
  createdAt: number;
  updatedAt: number;
  syncedAt: number | null;
}

// ─── Sync Metadata ────────────────────────────────────────────────────────────

export interface SyncMetadata {
  id: string;
  userId: string;
  lastPulledAt: number | null;  // Unix timestamp (ms) of last successful pull
  lastPushedAt: number | null;  // Unix timestamp (ms) of last successful push
  pendingChangeCount: number;   // bounded at 10,000
  createdAt: number;
  updatedAt: number;
}
