import { Model } from '@nozbe/watermelondb';
import {
  field,
  date,
  readonly,
} from '@nozbe/watermelondb/decorators';

/**
 * SupersetGroup links two to six SessionExercise rows (or TemplateExercise rows)
 * that should be performed back-to-back with minimal rest between exercises.
 *
 * Dissolution rule: if removing an exercise from a superset leaves only one
 * exercise in the group, the group is dissolved and the remaining exercise
 * becomes standalone. Enforce this at the UI layer before writing.
 *
 * Maximum group size: 6 exercises. Enforced at the UI layer before writing.
 *
 * Either sessionId or templateId will be set, not both. A SupersetGroup that
 * belongs to a live session has sessionId set; one that belongs to a template
 * has templateId set.
 */
export class SupersetGroup extends Model {
  static table = 'superset_groups';

  /**
   * Foreign key to workout_sessions. Null when this group belongs to a template.
   */
  @field('session_id') sessionId!: string | null;

  /**
   * Foreign key to workout_templates. Null when this group belongs to a session.
   */
  @field('template_id') templateId!: string | null;

  /**
   * One of: 'superset' | 'giant_set' | 'circuit'
   * 'superset'   — two exercises, alternate sets
   * 'giant_set'  — three or more exercises, rotate through all
   * 'circuit'    — same as giant_set but with explicit timed rest between rounds
   */
  @field('group_type') groupType!: 'superset' | 'giant_set' | 'circuit';

  /**
   * Maximum number of exercises allowed in this group (2–6).
   * Stored explicitly so the UI can show capacity without querying child exercises.
   */
  @field('max_size') maxSize!: number;

  @date('synced_at') syncedAt!: Date | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
