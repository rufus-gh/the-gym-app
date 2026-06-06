import { startOfISOWeek, subWeeks, formatISO } from 'date-fns';
import type { AIContextPayload } from '@/types/api';
import type { User, PersonalRecord, BodyMeasurement } from '@/types/models';
import type { MoodRating } from '@/types/enums';
import type { PRRecordType } from '@/types/enums';

// ─── Input interfaces ────────────────────────────────────────────────────────

/**
 * Per-exercise aggregation for a single calendar week.
 * Callers compute these from WatermelonDB queries — raw Set rows must NEVER
 * appear in this structure or in the final AIContextPayload.
 */
export interface WeeklyExerciseSummary {
  exerciseId: string;
  exerciseName: string;
  /** Number of sessions in which this exercise was trained that week. */
  sessionCount: number;
  /** Highest estimated 1RM recorded across all working sets that week (kg). */
  weeklyMaxE1rmKg: number;
  /** Mean RPE across all working sets, or null if no RPE was logged. */
  avgRpe: number | null;
  /**
   * Total volume for the week in kg (sum of weightKgActual × reps for all
   * working sets). Warmup sets are excluded by the caller.
   */
  totalVolumeKg: number;
  /** Count of working sets performed. */
  setCount: number;
}

/**
 * All exercise data for one ISO calendar week, plus session-level metadata.
 */
export interface WeeklySummaryInput {
  /** ISO 8601 date string (YYYY-MM-DD) for the Monday of the week. */
  weekStart: string;
  exercises: WeeklyExerciseSummary[];
  /**
   * Preworkout mood ratings recorded across sessions that week.
   * Used for fatigue / deload signal — do NOT use postworkout mood here.
   */
  preworkoutMoods: MoodRating[];
  totalSessionCount: number;
}

// ─── Builder params ───────────────────────────────────────────────────────────

interface UserProfile {
  experienceLevel: User['experienceLevel'];
  trainingGoal: User['trainingGoal'];
  activeProgramName: string | null;
  unitPreference: User['unitPreference'];
}

interface BodyMetricsSummary {
  /** Trend derived from body weight measurements: 'gaining', 'losing', 'stable'. */
  weightTrend: string;
  /** Most recent logged body weight in kg, or null if no measurements exist. */
  currentWeightKg: number | null;
}

interface BuildAIContextParams {
  userProfile: UserProfile;
  /** All available weekly summaries, in any order. Sliced to last 12 internally. */
  weeklySummaries: WeeklySummaryInput[];
  /**
   * Personal records keyed by exercise name.
   * Only `estimated_1rm` type records are included in the payload (see spec §7o.3).
   * Callers should pass the full PR list and let the builder filter.
   */
  personalRecords: (PersonalRecord & { exerciseName: string })[];
  /** Exercise names currently flagged as plateaued. */
  plateauFlags: string[];
  bodyMetrics: BodyMetricsSummary;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_WEEKS = 12;

// ─── Builder ─────────────────────────────────────────────────────────────────

/**
 * Builds the aggregated context payload sent to the Claude API.
 *
 * IMPORTANT: This function intentionally does not accept raw Set data.
 * All exercise data must be pre-aggregated into WeeklySummaryInput before
 * calling this function. See spec §7o.3 and the AI Context coding rule.
 */
export function buildAIContext(params: BuildAIContextParams): AIContextPayload {
  const { userProfile, weeklySummaries, personalRecords, plateauFlags, bodyMetrics } = params;

  // Determine the window: the 12 most recent ISO weeks up to and including
  // the current week, so that weeks with no training activity are represented
  // by empty arrays rather than being silently omitted from the payload.
  const now = new Date();
  const currentWeekStart = startOfISOWeek(now);

  const windowStarts = Array.from({ length: MAX_WEEKS }, (_, i) => {
    const weekStart = subWeeks(currentWeekStart, MAX_WEEKS - 1 - i);
    return formatISO(weekStart, { representation: 'date' });
  });

  // Index the incoming summaries by week start for O(1) lookup.
  const summaryByWeek = new Map<string, WeeklySummaryInput>();
  for (const summary of weeklySummaries) {
    summaryByWeek.set(summary.weekStart, summary);
  }

  const weeks: AIContextPayload['training_summary']['weeks'] = windowStarts.map((weekStart) => {
    const summary = summaryByWeek.get(weekStart);

    if (!summary) {
      return {
        week_start: weekStart,
        exercises: [],
        preworkout_moods: [],
        total_session_count: 0,
      };
    }

    return {
      week_start: summary.weekStart,
      exercises: summary.exercises.map((ex) => ({
        name: ex.exerciseName,
        sessions: ex.sessionCount,
        weekly_max_e1rm_kg: ex.weeklyMaxE1rmKg,
        avg_rpe: ex.avgRpe,
        total_volume_kg: ex.totalVolumeKg,
        set_count: ex.setCount,
      })),
      preworkout_moods: summary.preworkoutMoods,
      total_session_count: summary.totalSessionCount,
    };
  });

  // Personal records: only include estimated_1rm records in the payload.
  const e1rmRecordType: PRRecordType = 'estimated_1rm';
  const personalRecordsMap: AIContextPayload['personal_records'] = {};

  for (const pr of personalRecords) {
    if (pr.recordType !== e1rmRecordType) {
      continue;
    }
    const existing = personalRecordsMap[pr.exerciseName];
    // Keep the highest e1RM per exercise if duplicates exist.
    if (!existing || pr.value > existing.estimated_1rm_kg) {
      personalRecordsMap[pr.exerciseName] = { estimated_1rm_kg: pr.value };
    }
  }

  return {
    user_profile: {
      experience_level: userProfile.experienceLevel,
      training_goal: userProfile.trainingGoal,
      active_program: userProfile.activeProgramName,
      unit_preference: userProfile.unitPreference,
    },
    training_summary: {
      weeks,
    },
    personal_records: personalRecordsMap,
    plateau_flags: plateauFlags,
    body_metrics: {
      weight_trend: bodyMetrics.weightTrend,
      current_weight_kg: bodyMetrics.currentWeightKg,
    },
  };
}
