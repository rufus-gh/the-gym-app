import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';
import migration001 from './migration_001';

export const migrations = schemaMigrations({
  migrations: [migration001],
});
