import { Model } from '@nozbe/watermelondb';
import {
  field,
  date,
  readonly,
  text,
  nochange,
} from '@nozbe/watermelondb/decorators';

/**
 * NutritionLog records a single day's macronutrient and hydration totals.
 * logDate is stored as a ISO date string ('YYYY-MM-DD') for easy grouping.
 * One record per user per day is the intended shape; deduplication is enforced
 * at the service layer, not the model layer.
 */
export class NutritionLog extends Model {
  static table = 'nutrition_logs';

  @nochange @field('user_id') userId!: string;

  /**
   * ISO date string 'YYYY-MM-DD'. Stored as a plain field (not a date) so that
   * day-level grouping queries work without timestamp truncation arithmetic.
   */
  @field('log_date') logDate!: string;

  @field('calories_kcal') caloriesKcal!: number | null;
  @field('protein_g') proteinG!: number | null;
  @field('carbs_g') carbsG!: number | null;
  @field('fat_g') fatG!: number | null;
  @field('fiber_g') fiberG!: number | null;
  @field('water_ml') waterMl!: number | null;

  /**
   * One of: 'manual' | 'myfitnesspal' | 'cronometer' | 'healthkit' | 'import'
   */
  @field('source') source!: string | null;

  @text('notes') notes!: string | null;
  @date('synced_at') syncedAt!: Date | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
