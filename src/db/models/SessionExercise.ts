import { Model } from '@nozbe/watermelondb';
import {
  field,
  date,
  readonly,
  relation,
  children,
  text,
  nochange,
} from '@nozbe/watermelondb/decorators';
import type { WorkoutSession } from './WorkoutSession';
import type { Exercise } from './Exercise';

export class SessionExercise extends Model {
  static table = 'session_exercises';

  static associations = {
    workout_sessions: { type: 'belongs_to' as const, key: 'session_id' },
    exercises: { type: 'belongs_to' as const, key: 'exercise_id' },
    sets: { type: 'has_many' as const, foreignKey: 'session_exercise_id' },
  };

  @nochange @field('user_id') userId!: string;
  @field('session_id') sessionId!: string;
  @field('exercise_id') exerciseId!: string;
  @field('order_index') orderIndex!: number;
  @field('superset_group_id') supersetGroupId!: string | null;
  @text('notes') notes!: string | null;
  @field('rest_seconds') restSeconds!: number;
  @date('synced_at') syncedAt!: Date | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('workout_sessions', 'session_id') session!: WorkoutSession;
  @relation('exercises', 'exercise_id') exercise!: Exercise;

  @children('sets') sets!: any;
}
