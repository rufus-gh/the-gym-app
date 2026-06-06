import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, json } from '@nozbe/watermelondb/decorators';

const sanitiseStringArray = (raw: unknown): string[] =>
  Array.isArray(raw) ? (raw as unknown[]).filter((v): v is string => typeof v === 'string') : [];

export class ExerciseModel extends Model {
  static table = 'exercises';

  @text('name') name!: string;
  @json('aliases', sanitiseStringArray) aliases!: string[];
  @text('category') category!: string;
  @json('primary_muscles', sanitiseStringArray) primaryMuscles!: string[];
  @json('secondary_muscles', sanitiseStringArray) secondaryMuscles!: string[];
  @text('equipment') equipment!: string;
  @text('movement_pattern') movementPattern!: string;
  @field('is_compound') isCompound!: boolean;
  @field('is_unilateral') isUnilateral!: boolean;
  @text('instructions') instructions!: string;
  @text('video_url') videoUrl!: string | null;
  @text('thumbnail_url') thumbnailUrl!: string | null;
  @field('is_custom') isCustom!: boolean;
  @text('created_by_user_id') createdByUserId!: string | null;
  @field('is_archived') isArchived!: boolean;
  @field('default_rest_seconds') defaultRestSeconds!: number | null;
  @field('default_rpe_target') defaultRpeTarget!: number | null;
  @field('synced_at') syncedAt!: number | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
