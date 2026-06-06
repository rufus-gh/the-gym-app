import type { OneRMFormula } from '../types/enums';

// ─── RPE → % 1RM lookup table ─────────────────────────────────────────────────
// Rows = reps in set (1–10), columns = RPE (6.0–10.0 in 0.5 steps)
// Source: Reactive Training Systems RPE chart
// Indexed as RPE_TABLE[reps - 1][rpeIndex], where rpeIndex = (rpe - 6.0) / 0.5

const RPE_TABLE: readonly (readonly number[])[] = [
  // reps = 1
  [0.78, 0.80, 0.82, 0.84, 0.86, 0.88, 0.90, 0.92, 0.95, 1.00],
  // reps = 2
  [0.72, 0.75, 0.77, 0.79, 0.81, 0.83, 0.85, 0.88, 0.92, 0.97],
  // reps = 3
  [0.68, 0.70, 0.72, 0.74, 0.76, 0.79, 0.82, 0.85, 0.89, 0.94],
  // reps = 4
  [0.64, 0.66, 0.68, 0.70, 0.73, 0.76, 0.79, 0.82, 0.86, 0.91],
  // reps = 5
  [0.60, 0.62, 0.64, 0.67, 0.70, 0.73, 0.76, 0.79, 0.83, 0.88],
  // reps = 6
  [0.56, 0.58, 0.61, 0.64, 0.67, 0.70, 0.73, 0.76, 0.80, 0.85],
  // reps = 7
  [0.52, 0.55, 0.58, 0.61, 0.64, 0.67, 0.70, 0.73, 0.77, 0.82],
  // reps = 8
  [0.49, 0.52, 0.55, 0.58, 0.61, 0.64, 0.67, 0.70, 0.74, 0.79],
  // reps = 9
  [0.46, 0.49, 0.52, 0.55, 0.58, 0.61, 0.64, 0.68, 0.72, 0.77],
  // reps = 10
  [0.43, 0.46, 0.49, 0.52, 0.55, 0.58, 0.61, 0.65, 0.69, 0.74],
] as const;

// ─── Individual formula implementations ──────────────────────────────────────

/**
 * Epley formula: weight × (1 + reps / 30)
 * Returns weight unchanged when reps === 1 (already at 1RM).
 */
export function epley(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Brzycki formula: weight × 36 / (37 − reps)
 * Guard: returns weight when reps >= 37 (denominator would be zero or negative).
 */
export function brzycki(weight: number, reps: number): number {
  if (reps >= 37) return weight;
  return (weight * 36) / (37 - reps);
}

/**
 * Lombardi formula: weight × reps^0.10
 */
export function lombardi(weight: number, reps: number): number {
  return weight * Math.pow(reps, 0.10);
}

/**
 * O'Conner formula: weight × (1 + reps / 40)
 */
export function oconner(weight: number, reps: number): number {
  return weight * (1 + reps / 40);
}

/**
 * Mayhew formula: (100 × weight) / (52.2 + 41.9 × e^(−0.055 × reps))
 */
export function mayhew(weight: number, reps: number): number {
  return (100 * weight) / (52.2 + 41.9 * Math.exp(-0.055 * reps));
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

/**
 * Compute estimated 1RM for a given weight (kg) and reps using the
 * specified formula.
 */
export function computeOneRM(
  weight: number,
  reps: number,
  formula: OneRMFormula,
): number {
  switch (formula) {
    case 'epley':
      return epley(weight, reps);
    case 'brzycki':
      return brzycki(weight, reps);
    case 'lombardi':
      return lombardi(weight, reps);
    case 'oconner':
      return oconner(weight, reps);
    case 'mayhew':
      return mayhew(weight, reps);
  }
}

// ─── All-formulas result ─────────────────────────────────────────────────────

export interface OneRMResult {
  formula: OneRMFormula;
  estimatedOneRM: number;
}

/**
 * Compute estimated 1RM using all five formulas and return the results as an
 * array ordered: epley, brzycki, lombardi, oconner, mayhew.
 */
export function computeAllFormulas(weight: number, reps: number): OneRMResult[] {
  const formulas: OneRMFormula[] = ['epley', 'brzycki', 'lombardi', 'oconner', 'mayhew'];
  return formulas.map((formula) => ({
    formula,
    estimatedOneRM: computeOneRM(weight, reps, formula),
  }));
}

// ─── RPE-based 1RM estimate ──────────────────────────────────────────────────

/**
 * Estimate 1RM from a set performed at a given RPE using the RTS RPE chart.
 *
 * @param weight  - Weight lifted in kg
 * @param rpe     - RPE value (6.0–10.0 in 0.5 increments). Values below 6 or
 *                  above 10 are clamped to the table boundaries.
 * @param reps    - Number of reps performed. Values outside 1–10 are clamped.
 * @returns Estimated 1RM in kg, or the input weight when the lookup yields a
 *          percentage of zero (should not occur with valid inputs).
 */
export function computeOneRMFromRPE(weight: number, rpe: number, reps: number = 1): number {
  // Clamp reps to table range [1, 10]
  const clampedReps = Math.min(Math.max(Math.round(reps), 1), 10);

  // Snap RPE to the nearest 0.5 step, then clamp to [6.0, 10.0]
  const snappedRpe = Math.round(rpe * 2) / 2;
  const clampedRpe = Math.min(Math.max(snappedRpe, 6.0), 10.0);

  const rpeIndex = Math.round((clampedRpe - 6.0) / 0.5);
  const percentage = RPE_TABLE[clampedReps - 1][rpeIndex];

  if (percentage === 0) return weight;
  return weight / percentage;
}
