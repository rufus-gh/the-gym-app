import { Model, Query } from '@nozbe/watermelondb';
import { field, text, date, readonly, json, children } from '@nozbe/watermelondb/decorators';
import type { ProgramSlotModel } from './ProgramSlot';

const sanitiseStringArray = (raw: unknown): string[] =>
  Array.isArray(raw) ? (raw as unknown[]).filter((v): v is string => typeof v === 'string') : [];

const sanitiseObject = (raw: unknown): Record<string, unknown> =>
  raw !== null && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};

export class ProgramModel extends Model {
  static table = 'programs';

  static associations = {
    program_slots: { type: 'has_many' as const, foreignKey: 'program_id' },
  };

  @text('name') name!: string;
  @text('description') description!: string;
  @text('author') author!: string | null;
  @field('duration_weeks') durationWeeks!: number;
  @field('days_per_week') daysPerWeek!: number;
  @text('target_goal') targetGoal!: string;
  @text('experience_level') experienceLevel!: string;
  @field('is_built_in') isBuiltIn!: boolean;
  @field('deload_week') deloadWeek!: number | null;
  @json('progression_rules', sanitiseObject) progressionRules!: Record<string, unknown>;
  @json('tags', sanitiseStringArray) tags!: string[];
  @field('synced_at') syncedAt!: number | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('program_slots') slots!: Query<ProgramSlotModel>;
}
