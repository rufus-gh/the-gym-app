import { startOfWeek, format } from 'date-fns';
import type { DataPoint } from './lttb';

interface DateValuePoint {
  date: Date;
  value: number;
}

/**
 * Aggregate a series of date-value pairs by ISO week, retaining only the
 * maximum value observed within each week.
 *
 * Returns DataPoint[] with x = week-start Unix timestamp (ms) and
 * y = maximum value for that week, sorted ascending by date.
 *
 * Using max rather than mean is intentional — for e1RM charts the highest
 * estimated 1RM in a period is the meaningful data point (see CLAUDE.md).
 */
export function maxPerWeek(data: DateValuePoint[]): DataPoint[] {
  if (data.length === 0) return [];

  const weekMap = new Map<string, { timestamp: number; max: number }>();

  for (const point of data) {
    const weekStart = startOfWeek(point.date, { weekStartsOn: 1 }); // Monday
    const key = format(weekStart, 'yyyy-MM-dd');

    const existing = weekMap.get(key);
    if (existing === undefined) {
      weekMap.set(key, { timestamp: weekStart.getTime(), max: point.value });
    } else if (point.value > existing.max) {
      existing.max = point.value;
    }
  }

  return Array.from(weekMap.values())
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(({ timestamp, max }) => ({ x: timestamp, y: max }));
}
