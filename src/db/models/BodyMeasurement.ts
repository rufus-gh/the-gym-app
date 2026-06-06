import { Model } from '@nozbe/watermelondb';
import {
  field,
  date,
  readonly,
  json,
  text,
  nochange,
} from '@nozbe/watermelondb/decorators';

/**
 * The measurements JSON column stores typed measurement values.
 * It is validated on every read and write using the Zod schema pinned to
 * MEASUREMENT_SCHEMA_VERSION. When new measurement types are added, increment
 * the version and provide a migration function.
 *
 * Minimum shape: { _version: number }
 * Full shape: see src/utils/zod-schemas.ts MeasurementValues schema.
 */
export type MeasurementValues = {
  _version: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  thighCm?: number;
  calfCm?: number;
  upperArmCm?: number;
  forearmCm?: number;
  neckCm?: number;
  shouldersCm?: number;
  [key: string]: unknown;
};

const CURRENT_MEASUREMENT_VERSION = 1;

/**
 * Sanitiser for the @json decorator.
 * Validates that the stored value is an object with a numeric _version field.
 * Falls back to a safe default with the current version if the data is malformed.
 * Full Zod schema validation happens in src/utils/zod-schemas.ts — this sanitiser
 * is a lightweight guard at the model boundary.
 */
function sanitiseMeasurements(rawJson: unknown): MeasurementValues {
  if (
    rawJson !== null &&
    typeof rawJson === 'object' &&
    !Array.isArray(rawJson) &&
    typeof (rawJson as Record<string, unknown>)['_version'] === 'number'
  ) {
    return rawJson as MeasurementValues;
  }
  return { _version: CURRENT_MEASUREMENT_VERSION };
}

export class BodyMeasurement extends Model {
  static table = 'body_measurements';

  @nochange @field('user_id') userId!: string;
  @date('measured_at') measuredAt!: Date;
  @field('weight_kg') weightKg!: number | null;
  @field('body_fat_percent') bodyFatPercent!: number | null;
  @field('lean_mass_kg') leanMassKg!: number | null;

  /**
   * JSON column for circumference and other measurements.
   * Validated via sanitiseMeasurements on every read. Must include _version.
   * Use src/utils/zod-schemas.ts MeasurementValues Zod schema for full validation.
   */
  @json('measurements', sanitiseMeasurements) measurements!: MeasurementValues;

  @text('notes') notes!: string | null;
  @text('photo_front_url') photoFrontUrl!: string | null;
  @text('photo_side_url') photoSideUrl!: string | null;
  @text('photo_back_url') photoBackUrl!: string | null;

  /**
   * One of: 'manual' | 'healthkit' | 'google_fit' | 'import'
   */
  @field('source') source!: string | null;

  @date('synced_at') syncedAt!: Date | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
