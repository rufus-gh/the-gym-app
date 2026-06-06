import { Model } from '@nozbe/watermelondb';
import {
  field,
  date,
  readonly,
  text,
  nochange,
} from '@nozbe/watermelondb/decorators';

/**
 * SyncMetadata tracks per-table sync state for a given user.
 * One row per (userId, tableName) pair.
 *
 * The sync queue is bounded at 10,000 pending changes. Writes are wrapped in
 * transactions with FK constraints enforced at the application layer.
 * Sync is always async and best-effort — never block the UX on sync operations.
 */
export class SyncMetadata extends Model {
  static table = 'sync_metadata';

  @nochange @field('user_id') userId!: string;

  /**
   * The WatermelonDB table name this row tracks, e.g. 'workout_sessions', 'sets'.
   */
  @field('table_name') tableName!: string;

  /** Timestamp of the last successful pull from the server for this table. */
  @date('last_pulled_at') lastPulledAt!: Date | null;

  /** Timestamp of the last successful push to the server for this table. */
  @date('last_pushed_at') lastPushedAt!: Date | null;

  /**
   * Count of local changes queued for upload. Bounded at 10,000 per the sync
   * queue limit. The sync service enforces this cap before enqueuing new changes.
   */
  @field('pending_changes') pendingChanges!: number;

  /**
   * Number of conflicts encountered during the last sync cycle for this table.
   * Reset to 0 at the start of each sync cycle.
   */
  @field('conflict_count') conflictCount!: number;

  /**
   * One of: 'idle' | 'syncing' | 'error' | 'conflict'
   * Used by the SyncIndicator component to show per-table health at a glance.
   */
  @field('status') status!: 'idle' | 'syncing' | 'error' | 'conflict';

  /**
   * Last error message from the sync layer. Null when status is 'idle' or 'syncing'.
   * Not logged server-side — stored locally for diagnostics only.
   */
  @text('error_message') errorMessage!: string | null;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
