import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export class UserModel extends Model {
  static table = 'users';

  @text('email') email!: string;
  @text('display_name') displayName!: string;
  @text('avatar_url') avatarUrl!: string | null;
  @text('unit_preference') unitPreference!: string;
  @text('theme_preference') themePreference!: string;
  @text('accent_colour') accentColour!: string;
  @field('default_rest_seconds') defaultRestSeconds!: number;
  @text('one_rm_formula') oneRmFormula!: string;
  @text('training_goal') trainingGoal!: string;
  @text('experience_level') experienceLevel!: string;
  @text('date_of_birth') dateOfBirth!: string | null;
  @text('subscription_tier') subscriptionTier!: string;
  @text('subscription_expires_at') subscriptionExpiresAt!: string | null;
  @field('apple_health_linked') appleHealthLinked!: boolean;
  @field('is_local_only') isLocalOnly!: boolean;
  @field('synced_at') syncedAt!: number | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
