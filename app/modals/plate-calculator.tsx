import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../../src/hooks/useSettings';
import {
  calculatePlates,
  formatPlateDescription,
  BAR_WEIGHTS,
  getDefaultPlates,
} from '../../../src/services/plate-calculator';
import { PlateVisualiser } from '../../../src/components/ui/PlateVisualiser';

const KG_TO_LB = 2.20462;
const LB_TO_KG = 0.453592;

type BarPreset = (typeof BAR_WEIGHTS)[number]['label'];

interface PlateCalculatorRouteParams {
  initialTargetKg?: string;
  onSelectWeight?: string; // JSON-encoded callback key for router params
}

export default function PlateCalculatorModal() {
  const router = useRouter();
  const { unitPreference, setUnitPreference, availablePlates } = useSettings();

  const [selectedBar, setSelectedBar] = useState<BarPreset>("Men's Olympic");
  const [customBarText, setCustomBarText] = useState('20');
  const [targetText, setTargetText] = useState('');

  // Derive bar weight in kg
  const barWeightKg = useMemo(() => {
    const preset = BAR_WEIGHTS.find((b) => b.label === selectedBar);
    if (!preset) return 20;
    if (preset.label === 'Custom') {
      const parsed = parseFloat(customBarText);
      if (isNaN(parsed) || parsed <= 0) return 0;
      return unitPreference === 'lb' ? parsed * LB_TO_KG : parsed;
    }
    return preset.weightKg;
  }, [selectedBar, customBarText, unitPreference]);

  // Parse target weight from input (user's display unit → kg)
  const targetWeightKg = useMemo(() => {
    const parsed = parseFloat(targetText);
    if (isNaN(parsed) || parsed <= 0) return null;
    return unitPreference === 'lb' ? parsed * LB_TO_KG : parsed;
  }, [targetText, unitPreference]);

  // Run plate calculation
  const result = useMemo(() => {
    if (targetWeightKg === null) return null;
    return calculatePlates({
      targetWeightKg,
      barWeightKg,
      availablePlates: availablePlates ?? getDefaultPlates(),
    });
  }, [targetWeightKg, barWeightKg, availablePlates]);

  const displayWeight = useCallback(
    (kg: number) => {
      if (unitPreference === 'lb') {
        return `${Math.round(kg * KG_TO_LB * 10) / 10} lb`;
      }
      return `${Math.round(kg * 100) / 100} kg`;
    },
    [unitPreference],
  );

  const handleUseAchievable = useCallback(() => {
    if (!result) return;
    // Pass the achievable weight back to the calling screen via router params
    router.back();
    // Callers should read the achievable weight from route state if needed.
    // Since Expo Router doesn't have a direct return-value API, the modal
    // sets a global param that the caller reads on focus.
    router.setParams({ selectedWeightKg: String(result.achievableWeightKg) });
  }, [result, router]);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  const BAR_PRESETS = BAR_WEIGHTS.filter((b) => b.label !== 'Trap Bar');

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Plate Calculator</Text>
          <Pressable onPress={handleCancel} style={styles.closeButton} hitSlop={12}>
            <Text style={styles.closeText}>Done</Text>
          </Pressable>
        </View>

        {/* Unit toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Units</Text>
          <View style={styles.segmentedControl}>
            {(['kg', 'lb'] as const).map((unit) => (
              <Pressable
                key={unit}
                onPress={() => setUnitPreference(unit)}
                style={[
                  styles.segment,
                  unitPreference === unit && styles.segmentSelected,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    unitPreference === unit && styles.segmentTextSelected,
                  ]}
                >
                  {unit.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Bar weight selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Bar</Text>
          <View style={styles.segmentedControl}>
            {BAR_PRESETS.map((bar) => (
              <Pressable
                key={bar.label}
                onPress={() => setSelectedBar(bar.label)}
                style={[
                  styles.segment,
                  selectedBar === bar.label && styles.segmentSelected,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    selectedBar === bar.label && styles.segmentTextSelected,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {bar.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {selectedBar === 'Custom' && (
            <View style={styles.customBarRow}>
              <Text style={styles.inputLabel}>
                Custom bar weight ({unitPreference})
              </Text>
              <TextInput
                style={styles.input}
                value={customBarText}
                onChangeText={setCustomBarText}
                keyboardType="decimal-pad"
                placeholder="20"
                placeholderTextColor="rgba(235,235,245,0.3)"
                selectTextOnFocus
              />
            </View>
          )}

          {selectedBar !== 'Custom' && (
            <Text style={styles.barWeightHint}>
              {displayWeight(barWeightKg)} bar
            </Text>
          )}
        </View>

        {/* Target weight input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Target Weight ({unitPreference})
          </Text>
          <TextInput
            style={styles.largeInput}
            value={targetText}
            onChangeText={setTargetText}
            keyboardType="decimal-pad"
            placeholder={unitPreference === 'kg' ? '100' : '225'}
            placeholderTextColor="rgba(235,235,245,0.3)"
            selectTextOnFocus
          />
        </View>

        {/* Results */}
        {result !== null && (
          <View style={styles.resultSection}>
            {/* Plate visualiser */}
            <View style={styles.visualiserContainer}>
              <PlateVisualiser
                platesPerSide={result.platesPerSide}
                barWeightKg={result.barWeightKg}
                unitPreference={unitPreference}
              />
            </View>

            {/* Text summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Plates per side</Text>
                <Text style={styles.summaryValue}>
                  {formatPlateDescription(result)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Total load</Text>
                <Text style={styles.summaryValue}>
                  {displayWeight(result.achievableWeightKg)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Bar</Text>
                <Text style={styles.summaryValue}>
                  {displayWeight(result.barWeightKg)}
                </Text>
              </View>
            </View>

            {/* Shortfall warning */}
            {!result.isExactMatch && (
              <View style={styles.shortfallCard}>
                <Text style={styles.shortfallTitle}>Shortfall</Text>
                <Text style={styles.shortfallBody}>
                  Closest loadable:{' '}
                  <Text style={styles.shortfallHighlight}>
                    {displayWeight(result.achievableWeightKg)}
                  </Text>{' '}
                  (target was {displayWeight(result.targetWeightKg)})
                </Text>
                <View style={styles.shortfallActions}>
                  <Pressable
                    style={styles.useButton}
                    onPress={handleUseAchievable}
                  >
                    <Text style={styles.useButtonText}>
                      Use {displayWeight(result.achievableWeightKg)}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.cancelButton} onPress={handleCancel}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Empty state */}
        {result === null && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Enter a target weight to calculate plates
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  closeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(235,235,245,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: '#48484A',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(235,235,245,0.6)',
  },
  segmentTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  barWeightHint: {
    marginTop: 8,
    fontSize: 13,
    color: 'rgba(235,235,245,0.4)',
  },
  customBarRow: {
    marginTop: 12,
  },
  inputLabel: {
    fontSize: 13,
    color: 'rgba(235,235,245,0.6)',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 17,
    color: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
  },
  largeInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 32,
    fontWeight: '300',
    color: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
    letterSpacing: -0.5,
    textAlign: 'right',
  },
  resultSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  visualiserContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  summaryCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  summaryKey: {
    fontSize: 15,
    color: 'rgba(235,235,245,0.6)',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    maxWidth: '60%',
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#38383A',
  },
  shortfallCard: {
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
    padding: 16,
    marginBottom: 16,
  },
  shortfallTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF9500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  shortfallBody: {
    fontSize: 15,
    color: 'rgba(235,235,245,0.8)',
    lineHeight: 22,
    marginBottom: 16,
  },
  shortfallHighlight: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  shortfallActions: {
    flexDirection: 'row',
    gap: 12,
  },
  useButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  useButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(235,235,245,0.6)',
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 15,
    color: 'rgba(235,235,245,0.4)',
    textAlign: 'center',
    lineHeight: 22,
  },
});
