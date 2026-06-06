import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import { TemplateExerciseModel } from './TemplateExercise';

export class TemplateSetModel extends Model {
  static table = 'template_sets';

  static associations = {
    template_exercises: { type: 'belongs_to' as const, key: 'template_exercise_id' },
  };

  @relation('template_exercises', 'template_exercise_id') templateExercise!: TemplateExerciseModel;
  @text('template_exercise_id') templateExerciseId!: string;
  @field('order_index') orderIndex!: number;
  @text('set_type') setType!: string;
  @field('target_reps') targetReps!: number | null;
  @field('target_reps_max') targetRepsMax!: number | null;
  @field('target_weight') targetWeight!: number | null;
  @text('target_weight_modifier') targetWeightModifier!: string;
  @field('target_rpe') targetRpe!: number | null;
  @field('is_amrap') isAmrap!: boolean;
  @field('synced_at') syncedAt!: number | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
