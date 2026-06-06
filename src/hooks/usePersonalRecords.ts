import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { useObservable } from '@nozbe/watermelondb/react';
import type { PersonalRecord } from '@/db/models/PersonalRecord';

export function usePersonalRecords(exerciseId: string): PersonalRecord[] {
  const database = useDatabase();

  const query = database
    .get<PersonalRecord>('personal_records')
    .query(
      Q.where('exercise_id', exerciseId),
      Q.where('is_current_record', true),
    )
    .observe();

  return useObservable(query, [], [exerciseId]);
}
