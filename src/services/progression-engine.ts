/**
 * Progression Engine Service
 *
 * Computes the next session's target weights and detects whether a deload is
 * warranted based on recent fatigue signals.
 *
 * Key rules from CLAUDE.md:
 * - Deload detection uses preworkoutMood (NOT post-workout mood).
 * - Suppress deload suggestion if a scheduled deloadWeek falls within the next
 *   2 sessions from the current one (caller passes scheduledDeloadWeek).
 * - Output is idempotent: keyed to (programId, userId, sessionId). Re-running
 *   for the same sessionId overwrites the existing snapshot — no duplicates.
 * - Deload triggers (any one is sufficient):
 *     1. tiredCount >= 3 in the last 5 preworkoutMoods
 *     2. avgRPE > 8.5 across the last session's working sets
 *     3. volumeDrop > 15% compared to the previous equivalent session
 */

// ---------------------------------------------------------------------------
// Mood / RPE types
// ---------------------------------------------------------------------------

/**
 * Subjective pre-workout readiness reported by the user before the session.
 * Only this field is used for deload detection — never post-workout mood.
 */
export type PreworkoutMood = 'great' | 'good' | 'neutral' | 'tired' | 'exhausted';

// ---------------------------------------------------------------------------
// Input / Output interfaces
// ---------------------------------------------------------------------------

export interface ExerciseProgression {
  exerciseId: string;
  exerciseName: string;
  /** Current working weight in kg */
  currentWeightKg: number;
  /** Reps completed in the last session (working sets only, warmups excluded) */
  lastReps: number;
  /** RPE reported for the last top set (null if not recorded) */
  lastRpe: number | null;
  /**
   * Minimum reps required to earn a weight increase.
   * Typically the upper bound of the rep target range.
   */
  minRepsForProgression: number;
  /** Weight increment to add on a successful session (kg) */
  incrementKg: number;
  /**
   * Volume (total kg lifted, working sets only) in the current session.
   * Used for volume-drop deload detection.
   */
  currentVolumeKg: number;
  /**
   * Volume from the most recent prior equivalent session for this exercise.
   * Used for volume-drop comparison. Null if no prior session exists.
   */
  previousVolumeKg: number | null;
}

export interface ProgressionInput {
  /** Unique identifier — used for idempotency key */
  programId: string;
  /** Unique identifier — used for idempotency key */
  userId: string;
  /** Unique identifier — used for idempotency key. One snapshot per session. */
  sessionId: string;

  /** The session number within the current program cycle (1-based) */
  currentSessionNumber: number;

  /** Per-exercise data needed for weight progression decisions */
  exercises: ExerciseProgression[];

  /**
   * preworkoutMood values for the last N sessions (most recent last).
   * Only preworkoutMood is used here — never post-workout mood.
   */
  recentPreworkoutMoods: PreworkoutMood[];

  /**
   * Average RPE across all working sets in the session being processed.
   * Null if the user did not record RPE.
   */
  sessionAvgRpe: number | null;

  /**
   * The program's next scheduled deload week number, if any.
   * If the next scheduled deload is within 2 sessions of currentSessionNumber,
   * the engine suppresses the auto-deload suggestion entirely.
   */
  scheduledDeloadWeek: number | null;

  /**
   * Number of sessions per week for this program.
   * Used to convert week numbers to approximate session offsets.
   */
  sessionsPerWeek: number;
}

export interface ExerciseProgressionResult {
  exerciseId: string;
  exerciseName: string;
  currentWeightKg: number;
  /** Recommended weight for the next session */
  nextWeightKg: number;
  /** True when the weight increased this cycle */
  didProgress: boolean;
  /** True when a deload weight was applied to this exercise */
  isDeloaded: boolean;
  /** Human-readable note explaining the recommendation */
  note: string;
}

export interface ProgressionOutput {
  /** Idempotency key — composite of programId + userId + sessionId */
  snapshotKey: string;
  programId: string;
  userId: string;
  sessionId: string;
  sessionNumber: number;

  exerciseResults: ExerciseProgressionResult[];

  /** Whether a deload was detected and applied */
  deloadTriggered: boolean;
  /** Which deload signal fired (or null when no deload) */
  deloadReason: DeloadReason | null;
  /**
   * True when a deload signal was detected but the suggestion was suppressed
   * because a programmed deload week is within the next 2 sessions.
   */
  deloadSuppressed: boolean;

  /** ISO 8601 timestamp of when this snapshot was computed */
  computedAt: string;
}

export type DeloadReason = 'mood' | 'rpe' | 'volume_drop';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fraction of current weight to use during a deload (80% of working weight) */
const DELOAD_WEIGHT_FACTOR = 0.8;

/** Number of recent preworkoutMood entries to inspect for fatigue */
const MOOD_WINDOW = 5;

/** Minimum number of 'tired' or 'exhausted' entries in the window to flag */
const TIRED_THRESHOLD = 3;

/** RPE above which fatigue is considered excessive */
const RPE_DELOAD_THRESHOLD = 8.5;

/** Volume drop percentage above which fatigue is flagged */
const VOLUME_DROP_THRESHOLD = 0.15; // 15 %

/** Sessions within which a scheduled deload suppresses the auto-suggestion */
const SCHEDULED_DELOAD_PROXIMITY_SESSIONS = 2;

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Computes the progression snapshot for a completed session.
 *
 * Idempotency: callers are expected to persist the returned snapshot keyed on
 * `snapshotKey`. Re-running with the same (programId, userId, sessionId) triple
 * produces deterministic output and should overwrite the stored snapshot.
 */
export function computeProgression(input: ProgressionInput): ProgressionOutput {
  const snapshotKey = buildSnapshotKey(input.programId, input.userId, input.sessionId);

  const { deloadDetected, deloadReason, deloadSuppressed } = evaluateDeload(input);
  const shouldDeload = deloadDetected && !deloadSuppressed;

  const exerciseResults = input.exercises.map((exercise) =>
    computeExerciseProgression(exercise, shouldDeload),
  );

  return {
    snapshotKey,
    programId: input.programId,
    userId: input.userId,
    sessionId: input.sessionId,
    sessionNumber: input.currentSessionNumber,
    exerciseResults,
    deloadTriggered: shouldDeload,
    deloadReason: shouldDeload ? deloadReason : null,
    deloadSuppressed,
    computedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Deload evaluation
// ---------------------------------------------------------------------------

interface DeloadEvaluation {
  deloadDetected: boolean;
  deloadReason: DeloadReason | null;
  deloadSuppressed: boolean;
}

function evaluateDeload(input: ProgressionInput): DeloadEvaluation {
  const { deloadTriggered, reason } = detectDeloadSignal(input);

  if (!deloadTriggered) {
    return { deloadDetected: false, deloadReason: null, deloadSuppressed: false };
  }

  const suppressed = isDeloadSuppressed(
    input.currentSessionNumber,
    input.scheduledDeloadWeek,
    input.sessionsPerWeek,
  );

  return {
    deloadDetected: true,
    deloadReason: reason,
    deloadSuppressed: suppressed,
  };
}

/**
 * Checks the three deload triggers. Returns on the first one that fires,
 * in priority order: mood → RPE → volume drop.
 */
function detectDeloadSignal(
  input: ProgressionInput,
): { deloadTriggered: false; reason: null } | { deloadTriggered: true; reason: DeloadReason } {
  // 1. Mood signal — uses preworkoutMood exclusively
  if (isMoodFatigued(input.recentPreworkoutMoods)) {
    return { deloadTriggered: true, reason: 'mood' };
  }

  // 2. RPE signal
  if (input.sessionAvgRpe !== null && input.sessionAvgRpe > RPE_DELOAD_THRESHOLD) {
    return { deloadTriggered: true, reason: 'rpe' };
  }

  // 3. Volume drop signal — compare against each exercise's previous equivalent session
  if (isVolumeDropExcessive(input.exercises)) {
    return { deloadTriggered: true, reason: 'volume_drop' };
  }

  return { deloadTriggered: false, reason: null };
}

/**
 * Returns true when >= TIRED_THRESHOLD of the last MOOD_WINDOW preworkoutMoods
 * are 'tired' or 'exhausted'.
 *
 * Only preworkoutMood is inspected. Post-workout mood is not used here.
 */
function isMoodFatigued(recentMoods: PreworkoutMood[]): boolean {
  const window = recentMoods.slice(-MOOD_WINDOW);
  const tiredCount = window.filter(
    (m) => m === 'tired' || m === 'exhausted',
  ).length;
  return tiredCount >= TIRED_THRESHOLD;
}

/**
 * Returns true when the average volume drop across exercises with a known
 * previous session exceeds VOLUME_DROP_THRESHOLD.
 *
 * Exercises with no prior session data are excluded from the calculation.
 */
function isVolumeDropExcessive(exercises: ExerciseProgression[]): boolean {
  const comparableExercises = exercises.filter((e) => e.previousVolumeKg !== null);
  if (comparableExercises.length === 0) return false;

  const drops = comparableExercises.map((e) => {
    const prev = e.previousVolumeKg as number; // narrowed above
    if (prev === 0) return 0;
    return (prev - e.currentVolumeKg) / prev;
  });

  const avgDrop = drops.reduce((sum, d) => sum + d, 0) / drops.length;
  return avgDrop > VOLUME_DROP_THRESHOLD;
}

/**
 * Returns true when the scheduled deload week converts to a session number
 * within SCHEDULED_DELOAD_PROXIMITY_SESSIONS of the current session.
 *
 * If scheduledDeloadWeek is null, suppression never fires.
 */
function isDeloadSuppressed(
  currentSessionNumber: number,
  scheduledDeloadWeek: number | null,
  sessionsPerWeek: number,
): boolean {
  if (scheduledDeloadWeek === null) return false;
  if (sessionsPerWeek <= 0) return false;

  // Convert the scheduled deload week to an approximate first-session number
  // for that week. Session numbering is 1-based.
  const deloadStartSession = (scheduledDeloadWeek - 1) * sessionsPerWeek + 1;
  const sessionsUntilDeload = deloadStartSession - currentSessionNumber;

  return sessionsUntilDeload >= 0 && sessionsUntilDeload <= SCHEDULED_DELOAD_PROXIMITY_SESSIONS;
}

// ---------------------------------------------------------------------------
// Per-exercise progression
// ---------------------------------------------------------------------------

function computeExerciseProgression(
  exercise: ExerciseProgression,
  shouldDeload: boolean,
): ExerciseProgressionResult {
  if (shouldDeload) {
    const deloadWeightKg = roundToNearestIncrement(
      exercise.currentWeightKg * DELOAD_WEIGHT_FACTOR,
      exercise.incrementKg,
    );
    return {
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      currentWeightKg: exercise.currentWeightKg,
      nextWeightKg: deloadWeightKg,
      didProgress: false,
      isDeloaded: true,
      note: `Deload week: reduced to ${formatWeight(deloadWeightKg)} kg (80% of working weight).`,
    };
  }

  // Standard linear progression: increase weight if the rep target was met.
  if (exercise.lastReps >= exercise.minRepsForProgression) {
    const nextWeightKg = exercise.currentWeightKg + exercise.incrementKg;
    return {
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      currentWeightKg: exercise.currentWeightKg,
      nextWeightKg,
      didProgress: true,
      isDeloaded: false,
      note: `Rep target met (${exercise.lastReps} reps). Increase to ${formatWeight(nextWeightKg)} kg next session.`,
    };
  }

  // Rep target not met — repeat the same weight.
  return {
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
    currentWeightKg: exercise.currentWeightKg,
    nextWeightKg: exercise.currentWeightKg,
    didProgress: false,
    isDeloaded: false,
    note: `Rep target not met (${exercise.lastReps}/${exercise.minRepsForProgression} reps). Repeat ${formatWeight(exercise.currentWeightKg)} kg.`,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSnapshotKey(programId: string, userId: string, sessionId: string): string {
  return `${programId}__${userId}__${sessionId}`;
}

/**
 * Rounds a weight down to the nearest multiple of the exercise's increment.
 * Ensures deload weights are plate-loadable without remainder.
 */
function roundToNearestIncrement(weightKg: number, incrementKg: number): number {
  if (incrementKg <= 0) return weightKg;
  return Math.floor(weightKg / incrementKg) * incrementKg;
}

function formatWeight(kg: number): string {
  return kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(2).replace(/\.?0+$/, '');
}
