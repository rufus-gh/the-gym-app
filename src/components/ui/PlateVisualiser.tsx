import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PlateSlot {
  weightKg: number;
  count: number;
}

interface PlateVisualiserProps {
  platesPerSide: PlateSlot[];
  barWeightKg: number;
  unitPreference?: 'kg' | 'lb';
}

const LB_PER_KG = 2.20462;

/**
 * Plate colour coding matches standard international plate colour conventions.
 * Each weight maps to one colour; unknown sizes fall back to a neutral grey.
 */
const PLATE_COLORS: Record<number, { bg: string; text: string }> = {
  25: { bg: '#C0392B', text: '#FFFFFF' },    // red
  20: { bg: '#2471A3', text: '#FFFFFF' },    // blue
  15: { bg: '#D4AC0D', text: '#000000' },    // yellow
  10: { bg: '#1E8449', text: '#FFFFFF' },    // green
  5: { bg: '#F0F0F0', text: '#000000' },     // white
  2.5: { bg: '#BDC3C7', text: '#000000' },   // light grey
  1.25: { bg: '#626567', text: '#FFFFFF' },  // dark grey
};

const FALLBACK_PLATE_COLOR = { bg: '#4A4A4C', text: '#FFFFFF' };

/** Visual height of each plate, proportional to its weight */
function plateHeightForWeight(weightKg: number): number {
  if (weightKg >= 25) return 72;
  if (weightKg >= 20) return 64;
  if (weightKg >= 15) return 56;
  if (weightKg >= 10) return 48;
  if (weightKg >= 5) return 36;
  if (weightKg >= 2.5) return 26;
  return 20;
}

/** Width of each plate in the diagram */
const PLATE_WIDTH = 20;
/** Width of the barbell sleeve */
const SLEEVE_WIDTH = 48;
/** Height of the central barbell collar/bar area */
const BAR_HEIGHT = 12;

interface PlateBlockProps {
  weightKg: number;
  count: number;
  unitPreference: 'kg' | 'lb';
}

function PlateBlock({ weightKg, count, unitPreference }: PlateBlockProps) {
  const color = PLATE_COLORS[weightKg] ?? FALLBACK_PLATE_COLOR;
  const plateHeight = plateHeightForWeight(weightKg);
  const displayWeight =
    unitPreference === 'lb'
      ? `${Math.round(weightKg * LB_PER_KG * 2) / 2}`
      : `${weightKg}`;

  return (
    <View style={styles.plateGroup}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.plate,
            {
              width: PLATE_WIDTH,
              height: plateHeight,
              backgroundColor: color.bg,
              marginLeft: i === 0 ? 0 : 2,
            },
          ]}
        >
          {/* Only label the first plate in each group to avoid crowding */}
          {i === 0 && (
            <Text
              style={[styles.plateLabel, { color: color.text }]}
              numberOfLines={1}
            >
              {displayWeight}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

export function PlateVisualiser({
  platesPerSide,
  barWeightKg,
  unitPreference = 'kg',
}: PlateVisualiserProps) {
  const totalWeightKg = useMemo(() => {
    const platesWeight = platesPerSide.reduce(
      (sum, slot) => sum + slot.weightKg * slot.count * 2,
      0,
    );
    return barWeightKg + platesWeight;
  }, [platesPerSide, barWeightKg]);

  const displayTotal =
    unitPreference === 'lb'
      ? `${Math.round(totalWeightKg * LB_PER_KG * 10) / 10} lb`
      : `${totalWeightKg} kg`;

  const displayBar =
    unitPreference === 'lb'
      ? `${Math.round(barWeightKg * LB_PER_KG)} lb bar`
      : `${barWeightKg} kg bar`;

  // Plates are rendered from inside (closest to the collar) outward.
  // The prop array is assumed to be in the correct order already (heaviest inside).
  const sortedPlates = useMemo(
    () => [...platesPerSide].sort((a, b) => b.weightKg - a.weightKg),
    [platesPerSide],
  );

  return (
    <View style={styles.container}>
      {/* Total weight label */}
      <Text style={styles.totalLabel}>{displayTotal}</Text>

      {/* Diagram */}
      <View style={styles.diagram}>
        {/* Left sleeve end cap */}
        <View style={[styles.endCap, styles.endCapLeft]} />

        {/* Left plates (mirrored — same as right) */}
        <View style={styles.platesRow}>
          {[...sortedPlates].reverse().map((slot, i) => (
            <PlateBlock
              key={`left-${slot.weightKg}-${i}`}
              weightKg={slot.weightKg}
              count={slot.count}
              unitPreference={unitPreference}
            />
          ))}
        </View>

        {/* Central collar + bar */}
        <View style={styles.barSection}>
          <View style={[styles.collar, styles.collarLeft]} />
          <View style={styles.barCenter}>
            <Text style={styles.barLabel}>{displayBar}</Text>
          </View>
          <View style={[styles.collar, styles.collarRight]} />
        </View>

        {/* Right plates */}
        <View style={styles.platesRow}>
          {sortedPlates.map((slot, i) => (
            <PlateBlock
              key={`right-${slot.weightKg}-${i}`}
              weightKg={slot.weightKg}
              count={slot.count}
              unitPreference={unitPreference}
            />
          ))}
        </View>

        {/* Right sleeve end cap */}
        <View style={[styles.endCap, styles.endCapRight]} />
      </View>

      {/* Plate legend */}
      {sortedPlates.length > 0 && (
        <View style={styles.legend}>
          {sortedPlates.map((slot) => {
            const color = PLATE_COLORS[slot.weightKg] ?? FALLBACK_PLATE_COLOR;
            const displayWeight =
              unitPreference === 'lb'
                ? `${Math.round(slot.weightKg * LB_PER_KG * 2) / 2} lb`
                : `${slot.weightKg} kg`;
            return (
              <View key={slot.weightKg} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendSwatch,
                    { backgroundColor: color.bg },
                  ]}
                />
                <Text style={styles.legendText}>
                  {displayWeight} × {slot.count}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  totalLabel: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  diagram: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  platesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plate: {
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 1,
  },
  plateLabel: {
    fontSize: 8,
    fontWeight: '700',
    transform: [{ rotate: '-90deg' }],
    textAlign: 'center',
  },
  barSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collar: {
    width: 10,
    height: BAR_HEIGHT + 8,
    backgroundColor: '#8E8E93',
    borderRadius: 2,
  },
  collarLeft: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  collarRight: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  barCenter: {
    width: 80,
    height: BAR_HEIGHT,
    backgroundColor: '#636366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  barLabel: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 9,
    fontWeight: '500',
  },
  endCap: {
    width: SLEEVE_WIDTH / 3,
    height: BAR_HEIGHT - 4,
    backgroundColor: '#48484A',
    borderRadius: 2,
  },
  endCapLeft: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  endCapRight: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 14,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginRight: 4,
  },
  legendText: {
    color: 'rgba(235,235,245,0.6)',
    fontSize: 12,
  },
});
