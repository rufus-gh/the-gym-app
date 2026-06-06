import { Model, Query, Q } from '@nozbe/watermelondb';
import { field, text, date, readonly, json, children } from '@nozbe/watermelondb/decorators';
import lazy from '@nozbe/watermelondb/decorators/lazy';
import type { TemplateExerciseModel } from './TemplateExercise';

const sanitiseStringArray = (raw: unknown): string[] =>
  Array.isArray(raw) ? (raw as unknown[]).filter((v): v is string => typeof v === 'string') : [];

export class WorkoutTemplateModel extends Model {
  static table = 'workout_templates';

  static associations = {
    template_exercises: { type: 'has_many' as const, foreignKey: 'template_id' },
  };

  @text('name') name!: string;
  @text('description') description!: string | null;
  @text('program_id') programId!: string | null;
  @field('estimated_duration_minutes') estimatedDurationMinutes!: number | null;
  @json('target_muscle_groups', sanitiseStringArray) targetMuscleGroups!: string[];
  @field('is_built_in') isBuiltIn!: boolean;
  @field('is_archived') isArchived!: boolean;
  @field('usage_count') usageCount!: number;
  @field('last_used_at') lastUsedAt!: number | null;
  @field('synced_at') syncedAt!: number | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  /**
   * Reactive ordered query of all TemplateExercise rows for this template.
   * Use this when you need a live-updating list during template editing.
   * Sorted by order_index ascending.
   */
  @lazy exercises: Query<TemplateExerciseModel> = this.collections
    .get<TemplateExerciseModel>('template_exercises')
    .query(Q.where('template_id', this.id), Q.sortBy('order_index', Q.asc));

  /**
   * WatermelonDB @children association shortcut.
   * Equivalent to exercises but without the sort order guarantee.
   * Prefer the `exercises` getter for UI rendering.
   */
  @children('template_exercises') templateExercises!: Query<TemplateExerciseModel>;
}
