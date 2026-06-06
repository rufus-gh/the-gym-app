import Papa from 'papaparse';
import { lbToKg } from '../utils/units';
import { generateId } from '../utils/nanoid';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface StrongCSVRow {
  date: string;
  workoutName: string;
  duration: string;
  exerciseName: string;
  setOrder: string;
  weight: string;
  reps: string;
  distance: string;
  seconds: string;
  notes: string;
  workoutNotes: string;
  rpe: string;
}

export interface ImportedSet {
  id: string;
  exerciseName: string;
  /** Matched library exercise ID, or null if no match found. */
  exerciseId: string | null;
  setOrder: number;
  /** Weight in kg, already converted from lb if necessary. */
  weightKg: number;
  reps: number;
  distanceMetres: number | null;
  durationSeconds: number | null;
  notes: string | null;
  rpe: number | null;
}

export interface ImportedSession {
  id: string;
  date: string;
  workoutName: string;
  duration: string;
  workoutNotes: string | null;
  sets: ImportedSet[];
}

export interface SkippedRow {
  rowIndex: number;
  rawRow: Record<string, string>;
  reason: string;
}

export interface ImportResult {
  sessions: ImportedSession[];
  skippedRows: SkippedRow[];
  totalRowsProcessed: number;
  unit: 'kg' | 'lb';
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Compute the Levenshtein edit distance between two strings.
 * Uses the standard iterative two-row DP approach.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  // prev[j] = edit distance between a[0..i-1] and b[0..j-1]
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);

  for (let j = 0; j <= n; j++) {
    prev[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
      }
    }
    // Swap buffers
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return prev[n];
}

/** Expected column headers in the Strong CSV export (case-insensitive matching). */
const EXPECTED_HEADERS: ReadonlyArray<string> = [
  'Date',
  'Workout Name',
  'Duration',
  'Exercise Name',
  'Set Order',
  'Weight',
  'Reps',
  'Distance',
  'Seconds',
  'Notes',
  'Workout Notes',
  'RPE',
];

/**
 * Map a raw papaparse row (keyed by header) to a StrongCSVRow.
 * Returns null if any mandatory field is missing from the headers entirely.
 */
function mapRawRow(raw: Record<string, string>): StrongCSVRow {
  // papaparse returns empty string for missing optional fields
  return {
    date: (raw['Date'] ?? '').trim(),
    workoutName: (raw['Workout Name'] ?? '').trim(),
    duration: (raw['Duration'] ?? '').trim(),
    exerciseName: (raw['Exercise Name'] ?? '').trim(),
    setOrder: (raw['Set Order'] ?? '').trim(),
    weight: (raw['Weight'] ?? '').trim(),
    reps: (raw['Reps'] ?? '').trim(),
    distance: (raw['Distance'] ?? '').trim(),
    seconds: (raw['Seconds'] ?? '').trim(),
    notes: (raw['Notes'] ?? '').trim(),
    workoutNotes: (raw['Workout Notes'] ?? '').trim(),
    rpe: (raw['RPE'] ?? '').trim(),
  };
}

/** Parse a numeric string, returning null for empty / non-numeric strings. */
function parseOptionalFloat(value: string): number | null {
  if (value === '' || value === '-') return null;
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

/** Parse a numeric string, returning null for empty / non-numeric strings. */
function parseOptionalInt(value: string): number | null {
  if (value === '' || value === '-') return null;
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}

/** Stable session key derived from date + workout name. */
function sessionKey(date: string, workoutName: string): string {
  return `${date}::${workoutName}`;
}

// ---------------------------------------------------------------------------
// Public utilities
// ---------------------------------------------------------------------------

/**
 * Normalise an exercise name for fuzzy matching:
 * - Lowercase
 * - Strip punctuation (keep letters, digits, spaces)
 * - Collapse consecutive whitespace to a single space
 * - Trim leading/trailing whitespace
 */
export function normaliseExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match imported exercise names against a library of exercises.
 *
 * @param importedNames - Array of raw exercise names from the CSV
 * @param libraryExercises - Array of library exercise objects with `id` and `name`
 * @returns Map from each imported name to a library exercise ID (or null if no
 *   match within Levenshtein distance <= 3)
 */
export function matchExerciseNames(
  importedNames: readonly string[],
  libraryExercises: ReadonlyArray<{ id: string; name: string }>,
): Map<string, string | null> {
  const result = new Map<string, string | null>();

  // Pre-normalise library names once
  const normalisedLibrary = libraryExercises.map((ex) => ({
    id: ex.id,
    normalised: normaliseExerciseName(ex.name),
  }));

  for (const importedName of importedNames) {
    if (result.has(importedName)) continue; // already resolved

    const normalisedImport = normaliseExerciseName(importedName);

    let bestId: string | null = null;
    let bestDistance = Infinity;

    for (const lib of normalisedLibrary) {
      // Exact match shortcut
      if (lib.normalised === normalisedImport) {
        bestId = lib.id;
        bestDistance = 0;
        break;
      }
      const dist = levenshtein(normalisedImport, lib.normalised);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestId = lib.id;
      }
    }

    // Accept only if within threshold
    result.set(importedName, bestDistance <= 3 ? bestId : null);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Parse a Strong CSV export into structured ImportedSession objects.
 *
 * @param csvText - Raw CSV string from the Strong export file
 * @param unit - Unit the CSV was exported in. Caller MUST present a unit
 *   selection screen before calling this function. If 'lb', all weights are
 *   converted to kg before being stored.
 * @returns ImportResult containing sessions, skipped rows, and metadata
 */
export function parseStrongCSV(
  csvText: string,
  unit: 'kg' | 'lb',
): ImportResult {
  const skippedRows: SkippedRow[] = [];
  const sessions: ImportedSession[] = [];

  // Parse with papaparse — header: true uses the first row as column keys
  const parseResult = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
  });

  const rawRows = parseResult.data;
  const totalRowsProcessed = rawRows.length;

  // Validate that expected columns exist (warn, do not crash)
  if (parseResult.meta.fields) {
    const presentHeaders = new Set(parseResult.meta.fields);
    for (const expected of EXPECTED_HEADERS) {
      if (!presentHeaders.has(expected)) {
        // Log a single warning — we continue and treat missing fields as empty
        skippedRows.push({
          rowIndex: -1,
          rawRow: {},
          reason: `Missing expected column: "${expected}". Rows with no value for this column will have it treated as empty.`,
        });
      }
    }
  }

  // Keyed by sessionKey → session being built
  const sessionMap = new Map<string, ImportedSession>();
  // Keyed by sessionKey → insertion-order index in `sessions` array
  const sessionOrder: string[] = [];

  rawRows.forEach((raw, rowIndex) => {
    // Skip rows that papaparse errors flagged
    if (parseResult.errors.some((e) => e.row === rowIndex)) {
      skippedRows.push({
        rowIndex,
        rawRow: raw,
        reason: 'Parse error reported by papaparse for this row.',
      });
      return;
    }

    let row: StrongCSVRow;
    try {
      row = mapRawRow(raw);
    } catch {
      skippedRows.push({
        rowIndex,
        rawRow: raw,
        reason: 'Failed to map raw row to StrongCSVRow structure.',
      });
      return;
    }

    // Mandatory fields: date, exercise name
    if (!row.date) {
      skippedRows.push({ rowIndex, rawRow: raw, reason: 'Missing Date field.' });
      return;
    }
    if (!row.exerciseName) {
      skippedRows.push({ rowIndex, rawRow: raw, reason: 'Missing Exercise Name field.' });
      return;
    }

    // Parse setOrder — must be a positive integer
    const setOrder = parseOptionalInt(row.setOrder);
    if (setOrder === null || setOrder < 1) {
      skippedRows.push({
        rowIndex,
        rawRow: raw,
        reason: `Invalid or missing Set Order value: "${row.setOrder}".`,
      });
      return;
    }

    // Parse weight — treat empty as 0 (bodyweight exercises)
    const rawWeight = parseOptionalFloat(row.weight) ?? 0;
    if (isNaN(rawWeight) || rawWeight < 0) {
      skippedRows.push({
        rowIndex,
        rawRow: raw,
        reason: `Invalid Weight value: "${row.weight}".`,
      });
      return;
    }
    const weightKg = unit === 'lb' ? lbToKg(rawWeight) : rawWeight;

    // Parse reps — treat empty as 0 (time-based sets)
    const reps = parseOptionalInt(row.reps) ?? 0;
    if (reps < 0) {
      skippedRows.push({
        rowIndex,
        rawRow: raw,
        reason: `Invalid Reps value: "${row.reps}".`,
      });
      return;
    }

    // Parse optional numeric fields
    const rawDistance = parseOptionalFloat(row.distance);
    const durationSeconds = parseOptionalInt(row.seconds);

    // RPE must be null or in range [1, 10]
    const rpeRaw = parseOptionalFloat(row.rpe);
    let rpe: number | null = null;
    if (rpeRaw !== null) {
      if (rpeRaw < 1 || rpeRaw > 10) {
        // Not fatal — skip the RPE value but keep the set
        rpe = null;
      } else {
        rpe = rpeRaw;
      }
    }

    // Build the set
    const importedSet: ImportedSet = {
      id: generateId(),
      exerciseName: row.exerciseName,
      exerciseId: null, // resolved later via matchExerciseNames
      setOrder,
      weightKg,
      reps,
      distanceMetres: rawDistance,
      durationSeconds,
      notes: row.notes !== '' ? row.notes : null,
      rpe,
    };

    // Find or create session
    const key = sessionKey(row.date, row.workoutName);
    if (!sessionMap.has(key)) {
      const newSession: ImportedSession = {
        id: generateId(),
        date: row.date,
        workoutName: row.workoutName,
        duration: row.duration,
        workoutNotes: row.workoutNotes !== '' ? row.workoutNotes : null,
        sets: [],
      };
      sessionMap.set(key, newSession);
      sessionOrder.push(key);
    }

    const session = sessionMap.get(key)!;
    session.sets.push(importedSet);

    // Update workoutNotes from last non-empty occurrence in this session
    if (row.workoutNotes !== '') {
      session.workoutNotes = row.workoutNotes;
    }
    // Update duration from last non-empty occurrence (Strong repeats it per row)
    if (row.duration !== '') {
      session.duration = row.duration;
    }
  });

  // Preserve insertion order
  for (const key of sessionOrder) {
    const session = sessionMap.get(key);
    if (session) {
      sessions.push(session);
    }
  }

  return {
    sessions,
    skippedRows,
    totalRowsProcessed,
    unit,
  };
}
