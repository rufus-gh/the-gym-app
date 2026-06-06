import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { useObservable } from '@nozbe/watermelondb/react';
import type { Set } from '@/db/models/Set';

export function useExerciseHistory(exerciseId: string): Set[] {
  const database = useDatabase();

  const query = database
    .get<Set>('sets')
    .query(
      Q.where('exercise_id', exerciseId),
      Q.where('is_warmup', false),
      Q.sortBy('created_at', Q.desc),
      Q.take(50),
    )
    .observe();

  return useObservable(query, [], [exerciseId]);
}
