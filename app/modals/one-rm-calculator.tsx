import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../../src/hooks/useSettings';
import {
  computeAllFormulas,
  computeOneRMFromRPE,
} from '../../../src/services/one-rm-calculator';
import type { OneRMFormula } from '../../../src/types/enums';

const KG_TO_LB = 2.20462;
const LB_TO_KG = 0.453592;

const FORMULA_LABELS: Record<OneRMFormula, string> = {
  epley: 'Epley',
  brzycki: 'Brzycki',
  lombardi: 'Lombardi',
  oconner: "O'Conner",
  mayhew: 'Mayhew',
};

const FORMULA_DESCRIPTIONS: Record<OneRMFormula, string> = {
  epley: 'w × (1 + r/30)',
  brzycki: 'w × 36/(37−r)',
  lombardi: 'w × r^0.10',
  oconner: 'w × (1 + r/40)',
  mayhew: '100w / (52.2 + 41.9e^(−0.055r))',
};

type InputMode = 'reps' | 'rpe';

export default function OneRMCalculatorModal() {
  const router = useRouter();
  const { unitPreference, oneRmFormula } = useSettings();

  const [weightText, setWeightText] = useState('');
  const [repsText, setRepsText] = useState('');
  const [rpeText, setRpeText] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('reps');

  const weightKg = useMemo(() => {
    const parsed = parseFloat(weightText);
    if (isNaN(parsed) || parsed <= 0) return null;
    return unitPreference === 'lb' ? parsed * LB_TO_KG : parsed;
  }, [weightText, unitPreference]);

  const reps = useMemo(() => {
    const parsed = parseInt(repsText, 10);
    if (isNaN(parsed) || parsed < 1) return null;
    return parsed;
  }, [repsText]);

  const rpe = useMemo(() => {
    const parsed = parseFloat(rpeText);
    if (isNaN(parsed) || parsed < 6 || parsed > 10) return null;
    return parsed;
  }, [rpeText]);

  // Computed 1RM for the RPE mode (single value)
  const rpeBasedOneRM = useMemo(() => {
    if (inputMode !== 'rpe' || weightKg === null || rpe === null) return null;
    const repsForRpe = reps ?? 1;
    return computeOneRMFromRPE(weightKg, rpe, repsForRpe);
  }, [inputMode, weightKg, rpe, reps]);

  // Formula results (reps mode)
  const formulaResults = useMemo(() => {
    if (inputMode !== 'reps' || weightKg === null || reps === null) return null;
    return computeAllFormulas(weightKg, reps);
  }, [inputMode, weightKg, reps]);

  const hasResults =
    (inputMode === 'reps' && formulaResults !== null) ||
    (inputMode === 'rpe' && rpeBasedOneRM !== null);

  const displayOneRM = useCallback(
    (kg: number) => {
      const value =
        unitPreference === 'lb' ? Math.round(kg * KG_TO_LB * 10) / 10 : Math.round(kg * 10) / 10;
      return `${value} ${unitPreference}`;
    },
    [unitPreference],
  );

  // Percentage of 1RM helpers for the results table
  const percentages = [100, 95, 90, 85, 80, 75, 70] as const;

  const preferredFormula = oneRmFormula as OneRMFormula;

  // Preferred formula result (used for percentage table and "Use as PR?" button)
  const preferredOneRM = useMemo(() => {
    if (inputMode === 'reps' && formulaResults) {
      return formulaResults.find((r) => r.formula === preferredFormula)?.estimatedOneRM ?? null;
    }
    if (inputMode === 'rpe') {
      return rpeBasedOneRM;
    }
    return null;
  }, [inputMode, formulaResults, preferredFormula, rpeBasedOneRM]);

  const handleUsePR = useCallback(() => {
    if (preferredOneRM === null) return;
    // Pass the computed 1RM back to the caller via route params
    router.back();
    router.setParams({ recordedOneRMKg: String(preferredOneRM) });
  }, [preferredOneRM, router]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>1RM Calculator</Text>
          <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
            <Text style={styles.closeText}>Done</Text>
          </Pressable>
        </View>

        {/* Mode toggle */}
        <View style={styles.section}>
          <View style={styles.segmentedControl}>
            {(['reps', 'rpe'] as InputMode[]).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setInputMode(mode)}
                style={[
                  styles.segment,
                  inputMode === mode && styles.segmentSelected,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    inputMode === mode && styles.segmentTextSelected,
                  ]}
                >
                  {mode === 'reps' ? 'Reps Mode' : 'RPE Mode'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Inputs */}
        <View style={styles.section}>
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Weight ({unitPreference})
              </Text>
              <TextInput
                style={styles.input}
                value={weightText}
                onChangeText={setWeightText}
                keyboardType="decimal-pad"
                placeholder={unitPreference === 'kg' ? '100' : '225'}
                placeholderTextColor="rgba(235,235,245,0.3)"
                selectTextOnFocus
              />
            </View>

            {inputMode === 'reps' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Reps</Text>
                <TextInput
                  style={styles.input}
                  value={repsText}
                  onChangeText={setRepsText}
                  keyboardType="number-pad"
                  placeholder="5"
                  placeholderTextColor="rgba(235,235,245,0.3)"
                  selectTextOnFocus
                />
              </View>
            ) : (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>RPE (6–10)</Text>
                <TextInput
                  style={styles.input}
                  value={rpeText}
                  onChangeText={setRpeText}
                  keyboardType="decimal-pad"
                  placeholder="8.5"
                  placeholderTextColor="rgba(235,235,245,0.3)"
                  selectTextOnFocus
                />
              </View>
            )}
          </View>

          {inputMode === 'rpe' && (
            <View style={styles.inputGroupFull}>
              <Text style={styles.inputLabel}>Reps (optional, defaults to 1)</Text>
              <TextInput
                style={styles.input}
                value={repsText}
                onChangeText={setRepsText}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor="rgba(235,235,245,0.3)"
                selectTextOnFocus
              />
            </View>
          )}
        </View>

        {/* Results */}
        {hasResults && (
          <>
            {inputMode === 'reps' && formulaResults !== null && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Formula Results</Text>
                <View style={styles.card}>
                  {formulaResults.map((result, index) => {
                    const isPreferred = result.formula === preferredFormula;
                    return (
                      <React.Fragment key={result.formula}>
                        <View
                          style={[
                            styles.formulaRow,
                            isPreferred && styles.formulaRowHighlighted,
                          ]}
                        >
                          <View style={styles.formulaLeft}>
                            <View style={styles.formulaNameRow}>
                              <Text style={[styles.formulaName, isPreferred && styles.formulaNameHighlighted]}>
                                {FORMULA_LABELS[result.formula]}
                              </Text>
                              {isPreferred && (
                                <View style={styles.preferredBadge}>
                                  <Text style={styles.preferredBadgeText}>Preferred</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.formulaDesc}>
                              {FORMULA_DESCRIPTIONS[result.formula]}
                            </Text>
                          </View>
                          <Text style={[styles.formulaResult, isPreferred && styles.formulaResultHighlighted]}>
                            {displayOneRM(result.estimatedOneRM)}
                          </Text>
                        </View>
                        {index < formulaResults.length - 1 && (
                          <View style={styles.divider} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </View>
              </View>
            )}

            {inputMode === 'rpe' && rpeBasedOneRM !== null && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>RPE Estimate (RTS Chart)</Text>
                <View style={styles.rpeResultCard}>
                  <Text style={styles.rpeResultLabel}>Estimated 1RM</Text>
                  <Text style={styles.rpeResultValue}>
                    {displayOneRM(rpeBasedOneRM)}
                  </Text>
                </View>
              </View>
            )}

            {/* Percentage table for preferred formula result */}
            {preferredOneRM !== null && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  Percentage Table
                  {inputMode === 'reps' ? ` (${FORMULA_LABELS[preferredFormula]})` : ' (RPE)'}
                </Text>
                <View style={styles.card}>
                  {percentages.map((pct, index) => (
                    <React.Fragment key={pct}>
                      <View style={styles.pctRow}>
                        <Text style={styles.pctLabel}>{pct}%</Text>
                        <Text style={styles.pctValue}>
                          {displayOneRM((preferredOneRM * pct) / 100)}
                        </Text>
                      </View>
                      {index < percentages.length - 1 && (
                        <View style={styles.divider} />
                      )}
                    </React.Fragment>
                  ))}
                </View>
              </View>
            )}

            {/* Use as PR button */}
            {preferredOneRM !== null && (
              <View style={styles.section}>
                <Pressable style={styles.prButton} onPress={handleUsePR}>
                  <Text style={styles.prButtonText}>
                    Use {displayOneRM(preferredOneRM)} as PR
                  </Text>
                </Pressable>
                <Text style={styles.prButtonHint}>
                  Records this as a manual estimated 1RM personal record
                </Text>
              </View>
            )}
          </>
        )}

        {!hasResults && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Enter a weight and{' '}
              {inputMode === 'reps' ? 'rep count' : 'RPE value'} to estimate
              your 1RM
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
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: '#48484A',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(235,235,245,0.6)',
  },
  segmentTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputGroupFull: {
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
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '300',
    color: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  formulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  formulaRowHighlighted: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    marginHorizontal: -4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  formulaLeft: {
    flex: 1,
    marginRight: 12,
  },
  formulaNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  formulaName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  formulaNameHighlighted: {
    color: '#007AFF',
    fontWeight: '600',
  },
  preferredBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  preferredBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
  },
  formulaDesc: {
    fontSize: 12,
    color: 'rgba(235,235,245,0.4)',
    fontFamily: 'monospace',
  },
  formulaResult: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  formulaResultHighlighted: {
    color: '#007AFF',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#38383A',
  },
  rpeResultCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  rpeResultLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(235,235,245,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  rpeResultValue: {
    fontSize: 40,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  pctRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  pctLabel: {
    fontSize: 15,
    color: 'rgba(235,235,245,0.6)',
    fontWeight: '500',
  },
  pctValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  prButton: {
    backgroundColor: '#34C759',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  prButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  prButtonHint: {
    marginTop: 8,
    fontSize: 13,
    color: 'rgba(235,235,245,0.4)',
    textAlign: 'center',
    lineHeight: 18,
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
