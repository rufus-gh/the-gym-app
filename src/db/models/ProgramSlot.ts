import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import { ProgramModel } from './Program';
import { WorkoutTemplateModel } from './WorkoutTemplate';

export class ProgramSlotModel extends Model {
  static table = 'program_slots';

  static associations = {
    programs: { type: 'belongs_to' as const, key: 'program_id' },
    workout_templates: { type: 'belongs_to' as const, key: 'template_id' },
  };

  @relation('programs', 'program_id') program!: ProgramModel;
  @relation('workout_templates', 'template_id') template!: WorkoutTemplateModel;
  @field('week_number') weekNumber!: number;
  @field('day_number') dayNumber!: number;
  @field('synced_at') syncedAt!: number | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
