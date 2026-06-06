import { Model } from '@nozbe/watermelondb';
import {
  field,
  date,
  readonly,
  relation,
  nochange,
} from '@nozbe/watermelondb/decorators';
import type { Exercise } from './Exercise';

/**
 * Four record types are tracked: 'weight' | 'reps' | 'volume' | 'estimated_1rm'
 *
 * Sync conflict rule: higher value wins.
 * Tie-break: earlier achievedAt wins.
 *
 * The value stored in PersonalRecord always reflects weightKgActual from the
 * source Set — never weightKg. isCurrentRecord is false for superseded records,
 * which are retained for history.
 */
export class PersonalRecord extends Model {
  static table = 'personal_records';

  static associations = {
    exercises: { type: 'belongs_to' as const, key: 'exercise_id' },
  };

  @field('exercise_id') exerciseId!: string;
  @nochange @field('user_id') userId!: string;
  @field('set_id') setId!: string;
  @field('session_id') sessionId!: string;

  /**
   * One of: 'weight' | 'reps' | 'volume' | 'estimated_1rm'
   */
  @field('record_type') recordType!: 'weight' | 'reps' | 'volume' | 'estimated_1rm';

  /** The PR value. For 'weight', this is always in kg (weightKgActual). */
  @field('value') value!: number;

  /** The previous record value that was beaten. Null if this is the first record. */
  @field('previous_value') previousValue!: number | null;

  /**
   * True when this is the standing current PR for this exercise+recordType.
   * Set to false when a higher value is achieved.
   */
  @field('is_current_record') isCurrentRecord!: boolean;

  @date('achieved_at') achievedAt!: Date;

  /**
   * For 'estimated_1rm' records: the formula used.
   * One of: 'epley' | 'brzycki' | 'lander' | 'lombardi'
   * Null for non-e1RM record types.
   */
  @field('formula') formula!: string | null;

  @date('synced_at') syncedAt!: Date | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('exercises', 'exercise_id') exercise!: Exercise;
}
