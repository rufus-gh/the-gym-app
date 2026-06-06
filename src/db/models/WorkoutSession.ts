import { Model } from '@nozbe/watermelondb';
import {
  field,
  date,
  readonly,
  children,
  text,
  nochange,
} from '@nozbe/watermelondb/decorators';

export class WorkoutSession extends Model {
  static table = 'workout_sessions';

  static associations = {
    session_exercises: { type: 'has_many' as const, foreignKey: 'session_id' },
  };

  @nochange @field('user_id') userId!: string;
  @field('template_id') templateId!: string | null;
  @field('program_id') programId!: string | null;
  @field('program_week') programWeek!: number | null;
  @field('program_day') programDay!: number | null;
  @text('name') name!: string;
  @date('started_at') startedAt!: Date;
  @date('ended_at') endedAt!: Date | null;
  @field('duration_seconds') durationSeconds!: number | null;
  @text('notes') notes!: string | null;
  @field('bodyweight_kg') bodyweightKg!: number | null;
  @text('preworkout_mood') preworkoutMood!: string | null;
  @text('mood') mood!: string | null;
  @field('perceived_exertion') perceivedExertion!: number | null;
  @text('location') location!: string | null;
  @field('total_volume_kg') totalVolumeKg!: number | null;
  @field('total_sets') totalSets!: number | null;
  @field('total_reps') totalReps!: number | null;
  @field('is_deleted') isDeleted!: boolean;
  @date('synced_at') syncedAt!: Date | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('session_exercises') sessionExercises!: any;
}
