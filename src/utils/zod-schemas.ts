import { z } from 'zod';

// ---------------------------------------------------------------------------
// Versioning
// ---------------------------------------------------------------------------

export const MEASUREMENT_SCHEMA_VERSION = 1 as const;

// ---------------------------------------------------------------------------
// Body measurement values
// ---------------------------------------------------------------------------

/**
 * All body measurement fields are optional floats (stored in kg or cm).
 * The _version field is used for future Zod-validated migrations.
 */
export const measurementValuesSchema = z.object({
  _version: z.literal(MEASUREMENT_SCHEMA_VERSION),

  // Body weight
  weightKg: z.number().positive().optional(),

  // Circumference measurements (cm)
  neckCm: z.number().positive().optional(),
  shouldersCm: z.number().positive().optional(),
  chestCm: z.number().positive().optional(),
  waistCm: z.number().positive().optional(),
  hipsCm: z.number().positive().optional(),
  leftBicepCm: z.number().positive().optional(),
  rightBicepCm: z.number().positive().optional(),
  leftThighCm: z.number().positive().optional(),
  rightThighCm: z.number().positive().optional(),
});

export type MeasurementValues = z.infer<typeof measurementValuesSchema>;

// ---------------------------------------------------------------------------
// Set data
// ---------------------------------------------------------------------------

export type SetType = 'working' | 'warmup' | 'dropset' | 'failure';

export const setDataSchema = z.object({
  /** User's intended target weight in kg. */
  weightKg: z.number().nonnegative(),

  /**
   * Achievable weight after plate rounding. Equals weightKg when the plate
   * calculator is not used. Always use this value for PR detection and
   * analytics.
   */
  weightKgActual: z.number().nonnegative(),

  /** Repetitions performed (integer, min 0). */
  reps: z.number().int().nonnegative(),

  /**
   * Rate of Perceived Exertion on the 1–10 scale.
   * null when the user has not recorded an RPE.
   */
  rpe: z.number().min(1).max(10).nullable(),

  /** Set classification. */
  setType: z.union([
    z.literal('working'),
    z.literal('warmup'),
    z.literal('dropset'),
    z.literal('failure'),
  ]),

  /**
   * Convenience flag mirroring setType === 'warmup'. Kept for backwards
   * compatibility — derive from setType where possible.
   */
  isWarmup: z.boolean(),

  /** Optional free-text notes attached to the set. */
  notes: z.string().max(500).nullable(),
});

export type SetData = z.infer<typeof setDataSchema>;

// ---------------------------------------------------------------------------
// Exercise filter
// ---------------------------------------------------------------------------

export const exerciseFilterSchema = z.object({
  query: z.string().max(200).optional(),

  /** One or more muscle group slugs (e.g. 'chest', 'quads'). */
  muscleGroups: z.array(z.string()).optional(),

  /** One or more exercise category slugs (e.g. 'barbell', 'bodyweight'). */
  categories: z.array(z.string()).optional(),

  /** When true, only return exercises the user has personally created. */
  customOnly: z.boolean().optional(),

  /** When true, only return exercises that appear in the user's history. */
  usedOnly: z.boolean().optional(),

  /** Field to sort results by. */
  sortBy: z.enum(['name', 'recent', 'frequency']).optional(),
});

export type ExerciseFilter = z.infer<typeof exerciseFilterSchema>;
