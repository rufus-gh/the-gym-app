import { Model } from '@nozbe/watermelondb';
import {
  field,
  date,
  readonly,
  relation,
  text,
  nochange,
} from '@nozbe/watermelondb/decorators';
import type { SessionExercise } from './SessionExercise';
import type { Exercise } from './Exercise';

/**
 * IMPORTANT: weightKgActual is the authoritative value for all PR detection
 * and analytics calculations. weightKg is the user's intended target weight.
 * When the plate calculator is not used, both values are identical.
 * When a plate rounding shortfall is resolved, weightKg holds the original
 * target and weightKgActual holds the achievable weight.
 *
 * Never use weightKg for PR detection or volume totals — always use weightKgActual.
 */
export class SetModel extends Model {
  static table = 'sets';

  static associations = {
    session_exercises: { type: 'belongs_to' as const, key: 'session_exercise_id' },
    exercises: { type: 'belongs_to' as const, key: 'exercise_id' },
  };

  @nochange @field('user_id') userId!: string;
  @field('session_exercise_id') sessionExerciseId!: string;
  @field('exercise_id') exerciseId!: string;
  @field('set_number') setNumber!: number;

  /**
   * One of: 'working' | 'warmup' | 'dropset' | 'failure'
   * Warmup sets are excluded from volume totals, PR detection, and e1RM calculations.
   */
  @field('set_type') setType!: 'working' | 'warmup' | 'dropset' | 'failure';

  /** User's intended target weight in kg. Use weightKgActual for analytics. */
  @field('weight_kg') weightKg!: number | null;

  /**
   * Authoritative weight in kg after plate rounding resolution.
   * ALWAYS use this field for PR detection and all analytics.
   * Equals weightKg when plate calculator is not used or no rounding occurred.
   */
  @field('weight_kg_actual') weightKgActual!: number | null;

  @field('reps') reps!: number | null;

  /** Rate of Perceived Exertion (1–10 scale) */
  @field('rpe') rpe!: number | null;

  /** Reps In Reserve */
  @field('rir') rir!: number | null;

  /** Duration in seconds (for timed sets) */
  @field('duration') duration!: number | null;

  /** Distance in metres (for cardio-style sets) */
  @field('distance') distance!: number | null;

  @field('is_amrap') isAmrap!: boolean;

  /**
   * Redundant with setType === 'warmup' but kept for query convenience.
   * Both are kept in sync on write. Warmup sets are excluded from PR detection
   * and volume totals — the detectPersonalRecords function handles exclusion
   * internally; callers do not need to pre-filter.
   */
  @field('is_warmup') isWarmup!: boolean;

  @field('is_personal_record') isPersonalRecord!: boolean;
  @date('completed_at') completedAt!: Date | null;
  @text('notes') notes!: string | null;
  @date('synced_at') syncedAt!: Date | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('session_exercises', 'session_exercise_id') sessionExercise!: SessionExercise;
  @relation('exercises', 'exercise_id') exercise!: Exercise;
}
