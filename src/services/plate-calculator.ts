/**
 * Plate Calculator Service
 *
 * Computes the optimal plate loading for a target weight given a bar weight
 * and a set of available plate denominations.
 *
 * Key rules from CLAUDE.md:
 * - weightKg  = user's target weight (stored as-is)
 * - weightKgActual = closest achievable weight with available plates
 * - Analytics and PR detection always use weightKgActual
 */

export interface PlateSet {
  weightKg: number;
  count: number;
}

export interface PlateCalculatorResult {
  targetWeightKg: number;
  achievableWeightKg: number;
  barWeightKg: number;
  /** Plates loaded on each side of the bar */
  platesPerSide: PlateSet[];
  isExactMatch: boolean;
  /** Positive when achievable < target; zero when exact */
  shortfallKg: number;
  totalLoadKg: number;
}

export interface PlateCalculatorInput {
  targetWeightKg: number;
  barWeightKg: number;
  /** Full list of available plate denominations in kg (may contain duplicates) */
  availablePlates: number[];
}

/**
 * Standard bar options available in the plate calculator UI.
 * Stored as { label, weightKg } tuples so the UI can display names.
 */
export const BAR_WEIGHTS = [
  { label: "Men's Olympic", weightKg: 20 },
  { label: "Women's Olympic", weightKg: 15 },
  { label: 'EZ Bar', weightKg: 10 },
  { label: 'Trap Bar', weightKg: 30 },
  { label: 'Custom', weightKg: 0 },
] as const;

/**
 * Default plate denominations (kg) shipped with the app.
 * The user can customise this set in Settings.
 */
export function getDefaultPlates(): number[] {
  return [25, 20, 15, 10, 5, 2.5, 1.25];
}

/**
 * Greedy algorithm: sorts available plates descending, then fills each side
 * as greedily as possible without exceeding the remaining weight budget.
 *
 * Returns the closest achievable weight that is ≤ the target (never rounds up,
 * because adding more weight than requested is unsafe).
 */
export function calculatePlates(input: PlateCalculatorInput): PlateCalculatorResult {
  const { targetWeightKg, barWeightKg, availablePlates } = input;

  if (targetWeightKg < barWeightKg) {
    // Cannot load less than the bare bar — return bar-only result.
    return {
      targetWeightKg,
      achievableWeightKg: barWeightKg,
      barWeightKg,
      platesPerSide: [],
      isExactMatch: targetWeightKg === barWeightKg,
      shortfallKg: Math.max(0, targetWeightKg - barWeightKg),
      totalLoadKg: barWeightKg,
    };
  }

  // Weight that needs to be distributed across both sides.
  const totalPlateWeight = targetWeightKg - barWeightKg;
  let remainingPerSide = totalPlateWeight / 2;

  // Build a frequency map of available plates so we know how many of each we have.
  const plateInventory = buildPlateInventory(availablePlates);

  // Sort denominations descending — greedy fills heaviest first.
  const sortedDenominations = Array.from(plateInventory.keys()).sort((a, b) => b - a);

  const platesPerSide: PlateSet[] = [];
  let loadedPerSide = 0;

  for (const denomination of sortedDenominations) {
    const available = plateInventory.get(denomination) ?? 0;
    if (available === 0) continue;

    // How many of this plate fit within the remaining budget?
    const maxCanFit = Math.floor(remainingPerSide / denomination);
    const countToAdd = Math.min(maxCanFit, available);

    if (countToAdd > 0) {
      platesPerSide.push({ weightKg: denomination, count: countToAdd });
      const added = denomination * countToAdd;
      loadedPerSide += added;
      remainingPerSide -= added;

      // Floating-point guard: if remainder is negligibly small, treat as exact.
      if (Math.abs(remainingPerSide) < 0.001) {
        remainingPerSide = 0;
        break;
      }
    }
  }

  const achievableWeightKg = roundToThreeDecimals(barWeightKg + loadedPerSide * 2);
  const isExactMatch = Math.abs(achievableWeightKg - targetWeightKg) < 0.001;
  const shortfallKg = isExactMatch ? 0 : roundToThreeDecimals(targetWeightKg - achievableWeightKg);

  return {
    targetWeightKg,
    achievableWeightKg,
    barWeightKg,
    platesPerSide,
    isExactMatch,
    shortfallKg,
    totalLoadKg: achievableWeightKg,
  };
}

/**
 * Returns a human-readable description of the plates loaded per side.
 * Example: "2×25kg + 1×10kg per side"
 * Returns "Bar only" when no plates are needed.
 */
export function formatPlateDescription(result: PlateCalculatorResult): string {
  if (result.platesPerSide.length === 0) {
    return 'Bar only';
  }

  const parts = result.platesPerSide.map(
    ({ count, weightKg }) => `${count}×${formatWeight(weightKg)}kg`,
  );

  return `${parts.join(' + ')} per side`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Builds a map of { plateWeightKg → count } from an array that may contain
 * duplicates (e.g. the user owns four 20 kg plates → [20, 20, 20, 20]).
 */
function buildPlateInventory(availablePlates: number[]): Map<number, number> {
  const inventory = new Map<number, number>();
  for (const plate of availablePlates) {
    inventory.set(plate, (inventory.get(plate) ?? 0) + 1);
  }
  return inventory;
}

/** Strip trailing zeroes but keep up to one decimal place for display. */
function formatWeight(kg: number): string {
  return kg % 1 === 0 ? kg.toFixed(0) : kg.toString();
}

function roundToThreeDecimals(value: number): number {
  return Math.round(value * 1000) / 1000;
}
