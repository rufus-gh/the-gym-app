export const KG_TO_LB = 2.20462;
export const LB_TO_KG = 0.453592;

export type WeightUnit = 'kg' | 'lb';

/**
 * Convert kilograms to pounds.
 */
export function kgToLb(kg: number): number {
  return kg * KG_TO_LB;
}

/**
 * Convert pounds to kilograms.
 */
export function lbToKg(lb: number): number {
  return lb * LB_TO_KG;
}

/**
 * Convert a weight value between units.
 * When from === to the value is returned unchanged.
 */
export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  if (from === 'kg' && to === 'lb') return kgToLb(value);
  return lbToKg(value);
}

/**
 * Format a weight stored in kg for display in the given unit.
 * Defaults to 1 decimal place.
 */
export function formatWeight(kg: number, unit: WeightUnit, decimals = 1): string {
  const value = unit === 'lb' ? kgToLb(kg) : kg;
  return `${value.toFixed(decimals)} ${unit}`;
}

/**
 * Round a target weight (kg) down to the nearest achievable weight given an
 * array of available plate sizes (kg). The bar weight is not included — pass
 * the loaded weight only (i.e. target minus bar weight).
 *
 * Returns the highest achievable loaded weight that does not exceed weightKg,
 * or 0 when no combination is possible.
 *
 * Algorithm: greedy largest-first, always pairs plates (×2 per plate added).
 */
export function roundToNearestPlate(weightKg: number, availablePlates: number[]): number {
  if (weightKg <= 0) return 0;

  const sorted = [...availablePlates].sort((a, b) => b - a);
  let remaining = weightKg;

  for (const plate of sorted) {
    const pairWeight = plate * 2;
    if (pairWeight <= remaining) {
      const pairs = Math.floor(remaining / pairWeight);
      remaining -= pairs * pairWeight;
    }
  }

  return parseFloat((weightKg - remaining).toFixed(4));
}
