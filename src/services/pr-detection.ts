import type { OneRMFormula, PRRecordType } from '../types/enums';
import type { Set as GymSet, PersonalRecord } from '../types/models';
import { computeOneRM } from './one-rm-calculator';
import { generateId } from '../utils/nanoid';

// ─── Interfaces ───────────────────────────────────────────────────────────────

/**
 * The best values achieved historically for a given exercise.
 * Built from all historical sets by computeHistoricalBest().
 * Warmup sets are excluded internally — callers do not pre-filter.
 */
export interface HistoricalBest {
  /** Heaviest single-rep weight lifted (kg), using weightKgActual. */
  maxWeightKg: number;
  /**
   * Maximum reps achieved at each weight (kg).
   * Key = weightKgActual, value = highest rep count at that weight.
   */
  maxRepsAtWeight: Map<number, number>;
  /** Highest single-set volume (weightKgActual × reps) achieved. */
  maxVolume: number;
  /** Highest estimated 1RM value achieved. */
  maxEstimated1RM: number;
}

/**
 * A detected PR with enough information to write a PersonalRecord row.
 */
export interface DetectedPR {
  recordType: PRRecordType;
  /** New record value (kg for weight/volume/e1RM; raw count for reps). */
  value: number;
  /** Previous best value, or null if this is the first ever record. */
  previousValue: number | null;
}

export interface PRCheckResult {
  /** All newly detected PR types for this set. Empty array = no PRs. */
  newPRs: DetectedPR[];
  /** Convenience flag: true when newPRs.length > 0. */
  isPersonalRecord: boolean;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Returns true for any set that should be excluded from PR and analytics
 * calculations: warmup sets, and sets with null/zero weightKgActual or reps.
 */
function isExcluded(set: GymSet): boolean {
  if (set.setType === 'warmup' || set.isWarmup === true) return true;
  if (set.weightKgActual === null || set.weightKgActual <= 0) return true;
  if (set.reps === null || set.reps <= 0) return true;
  return false;
}

// ─── computeHistoricalBest ────────────────────────────────────────────────────

/**
 * Aggregate all historical sets for an exercise into a HistoricalBest snapshot.
 *
 * Warmup sets are excluded internally — callers do NOT need to pre-filter.
 * All weight comparisons use weightKgActual as the authoritative value.
 *
 * @param historicalSets - All previously completed sets for the exercise.
 * @param formula        - OneRM formula used for estimated 1RM comparisons.
 */
export function computeHistoricalBest(
  historicalSets: GymSet[],
  formula: OneRMFormula,
): HistoricalBest {
  let maxWeightKg = 0;
  const maxRepsAtWeight = new Map<number, number>();
  let maxVolume = 0;
  let maxEstimated1RM = 0;

  for (const set of historicalSets) {
    if (isExcluded(set)) continue;

    // At this point weightKgActual and reps are guaranteed non-null by isExcluded
    const weight = set.weightKgActual as number;
    const reps = set.reps as number;

    // Max weight
    if (weight > maxWeightKg) {
      maxWeightKg = weight;
    }

    // Max reps at this weight
    const prevRepsAtWeight = maxRepsAtWeight.get(weight) ?? 0;
    if (reps > prevRepsAtWeight) {
      maxRepsAtWeight.set(weight, reps);
    }

    // Max single-set volume
    const volume = weight * reps;
    if (volume > maxVolume) {
      maxVolume = volume;
    }

    // Max estimated 1RM
    const e1rm = computeOneRM(weight, reps, formula);
    if (e1rm > maxEstimated1RM) {
      maxEstimated1RM = e1rm;
    }
  }

  return { maxWeightKg, maxRepsAtWeight, maxVolume, maxEstimated1RM };
}

// ─── detectPersonalRecords ────────────────────────────────────────────────────

interface DetectPRParams {
  /** The set just completed. */
  set: GymSet;
  /** Pre-computed historical best for this exercise. */
  historicalBest: HistoricalBest;
  /** OneRM formula to use for estimated 1RM comparison. */
  formula: OneRMFormula;
}

/**
 * Check whether the just-completed set beats any historical best.
 *
 * Warmup sets (setType === 'warmup' || isWarmup === true) never trigger PRs.
 * This is enforced inside this function — callers do NOT need to pre-filter.
 *
 * All weight comparisons use weightKgActual as the authoritative value.
 *
 * Checks three PR types:
 *   - weight        : heaviest weight ever lifted (per weightKgActual)
 *   - volume        : highest single-set volume (weightKgActual × reps)
 *   - estimated_1rm : highest estimated 1RM using the configured formula
 *
 * The 'reps' PR type is intentionally omitted here because reps-at-weight
 * comparisons are context-dependent (same exercise, same weight).
 * To detect reps PRs use historicalBest.maxRepsAtWeight directly.
 */
export function detectPersonalRecords({
  set,
  historicalBest,
  formula,
}: DetectPRParams): PRCheckResult {
  // Warmup and incomplete sets never trigger PRs
  if (isExcluded(set)) {
    return { newPRs: [], isPersonalRecord: false };
  }

  const weight = set.weightKgActual as number;
  const reps = set.reps as number;
  const newPRs: DetectedPR[] = [];

  // ── Weight PR ──────────────────────────────────────────────────────────────
  if (weight > historicalBest.maxWeightKg) {
    newPRs.push({
      recordType: 'weight',
      value: weight,
      previousValue: historicalBest.maxWeightKg > 0 ? historicalBest.maxWeightKg : null,
    });
  }

  // ── Volume PR ─────────────────────────────────────────────────────────────
  const volume = weight * reps;
  if (volume > historicalBest.maxVolume) {
    newPRs.push({
      recordType: 'volume',
      value: volume,
      previousValue: historicalBest.maxVolume > 0 ? historicalBest.maxVolume : null,
    });
  }

  // ── Estimated 1RM PR ──────────────────────────────────────────────────────
  const e1rm = computeOneRM(weight, reps, formula);
  if (e1rm > historicalBest.maxEstimated1RM) {
    newPRs.push({
      recordType: 'estimated_1rm',
      value: e1rm,
      previousValue:
        historicalBest.maxEstimated1RM > 0 ? historicalBest.maxEstimated1RM : null,
    });
  }

  return {
    newPRs,
    isPersonalRecord: newPRs.length > 0,
  };
}

// ─── buildPersonalRecordRows ──────────────────────────────────────────────────

/**
 * Convert DetectedPR results into PersonalRecord model objects ready to be
 * written to WatermelonDB.
 *
 * @param detectedPRs - The newPRs array from detectPersonalRecords().
 * @param set         - The set that triggered the PRs.
 * @param now         - Unix timestamp (ms) for achievedAt / createdAt / updatedAt.
 */
export function buildPersonalRecordRows(
  detectedPRs: DetectedPR[],
  set: GymSet,
  now: number = Date.now(),
): PersonalRecord[] {
  return detectedPRs.map((pr) => ({
    id: generateId(),
    userId: set.userId,
    exerciseId: set.exerciseId,
    setId: set.id,
    sessionId: set.sessionId,
    recordType: pr.recordType,
    value: pr.value,
    previousValue: pr.previousValue,
    achievedAt: now,
    createdAt: now,
    updatedAt: now,
    syncedAt: null,
  }));
}
