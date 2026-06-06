import { Model, Query, Q } from '@nozbe/watermelondb';
import { field, text, date, readonly, relation, children } from '@nozbe/watermelondb/decorators';
import lazy from '@nozbe/watermelondb/decorators/lazy';
import type { WorkoutTemplateModel } from './WorkoutTemplate';
import type { TemplateSetModel } from './TemplateSet';

export class TemplateExerciseModel extends Model {
  static table = 'template_exercises';

  static associations = {
    workout_templates: { type: 'belongs_to' as const, key: 'template_id' },
    template_sets: { type: 'has_many' as const, foreignKey: 'template_exercise_id' },
  };

  @relation('workout_templates', 'template_id') template!: WorkoutTemplateModel;
  @text('template_id') templateId!: string;
  @text('exercise_id') exerciseId!: string;
  @field('order_index') orderIndex!: number;
  @text('superset_group_id') supersetGroupId!: string | null;
  @field('rest_seconds') restSeconds!: number | null;
  @text('notes') notes!: string | null;
  @field('synced_at') syncedAt!: number | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  /** WatermelonDB @children association — all TemplateSet rows for this exercise. */
  @children('template_sets') templateSets!: Query<TemplateSetModel>;

  /**
   * Reactive ordered query of TemplateSet rows sorted by order_index.
   * Prefer this over templateSets for UI rendering.
   */
  @lazy sets: Query<TemplateSetModel> = this.collections
    .get<TemplateSetModel>('template_sets')
    .query(Q.where('template_exercise_id', this.id), Q.sortBy('order_index', Q.asc));
}
