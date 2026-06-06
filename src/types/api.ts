import type { PersonalRecord, WorkoutSession, Set as GymSet } from './models';
import type { PRRecordType, OneRMFormula } from './enums';

export interface SyncPushPayload {
  changes: {
    tableName: string;
    created: unknown[];
    updated: unknown[];
    deleted: string[];
  }[];
  lastPulledAt: number | null;
}

export interface SyncPullResponse {
  changes: {
    tableName: string;
    created: unknown[];
    updated: unknown[];
    deleted: string[];
  }[];
  timestamp: number;
}

export interface AIContextPayload {
  user_profile: {
    experience_level: string;
    training_goal: string;
    active_program: string | null;
    unit_preference: string;
  };
  training_summary: {
    weeks: {
      week_start: string;
      exercises: {
        name: string;
        sessions: number;
        weekly_max_e1rm_kg: number;
        avg_rpe: number | null;
        total_volume_kg: number;
        set_count: number;
      }[];
      preworkout_moods: string[];
      total_session_count: number;
    }[];
  };
  personal_records: Record<string, { estimated_1rm_kg: number }>;
  plateau_flags: string[];
  body_metrics: {
    weight_trend: string;
    current_weight_kg: number | null;
  };
}

export interface AIResponse {
  message: string;
  program_adjustments?: {
    exerciseName: string;
    action: string;
    newWeightKg?: number;
    newReps?: number;
    reason: string;
  }[];
}
