import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../../src/hooks/useSettings';
import type { SetType } from '../../../src/types/enums';

const KG_TO_LB = 2.20462;
const LB_TO_KG = 0.453592;

const SET_TYPES: SetType[] = ['working', 'warmup', 'dropset', 'failure'];
const SET_TYPE_LABELS: Record<SetType, string> = {
  working: 'Working',
  warmup: 'Warm-up',
  dropset: 'Drop Set',
  failure: 'To Failure',
};
const SET_TYPE_DESCRIPTIONS: Record<SetType, string> = {
  working: 'Standard work set',
  warmup: 'Excluded from PRs & volume',
  dropset: 'Immediately reduce weight',
  failure: 'Push to muscular failure',
};

// RPE steps: 0 (not set), 5.0 – 10.0 in 0.5 increments
const RPE_STEPS = [0, ...Array.from({ length: 11 }, (_, i) => 5 + i * 0.5)];

interface RPEPickerProps {
  value: number | null;
  onChange: (v: number | null) => void;
}

function RPEPicker({ value, onChange }: RPEPickerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={rpeStyles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      {RPE_STEPS.map((step) => {
        const isNone = step === 0;
        const isSelected = isNone ? value === null : value === step;
        return (
          <Pressable
            key={step}
            onPress={() => onChange(isNone ? null : step)}
            style={[rpeStyles.step, isSelected && rpeStyles.stepSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={isNone ? 'No RPE' : `RPE ${step}`}
          >
            <Text style={[rpeStyles.stepText, isSelected && rpeStyles.stepTextSelected]}>
              {isNone ? '—' : step.toFixed(1)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const rpeStyles = StyleSheet.create({
  scroll: {
    paddingVertical: 4,
    gap: 8,
    paddingRight: 4,
  },
  step: {
    width: 52,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepSelected: {
    backgroundColor: '#007AFF',
  },
  stepText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(235,235,245,0.6)',
  },
  stepTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={styles.toggleRow}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <View style={styles.toggleLeft}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description !== undefined && (
          <Text style={styles.toggleDescription}>{description}</Text>
        )}
      </View>
      <View style={[styles.toggle, value && styles.toggleOn]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </View>
    </Pressable>
  );
}

export default function SetEditorModal() {
  const router = useRouter();
  const { unitPreference } = useSettings();

  const params = useLocalSearchParams<{
    setId: string;
    exerciseId: string;
    initialWeightKg?: string;
    initialReps?: string;
    initialRpe?: string;
    initialSetType?: string;
    initialIsWarmup?: string;
    initialIsAmrap?: string;
    initialNotes?: string;
  }>();

  const setId = params.setId ?? '';
  const exerciseId = params.exerciseId ?? '';

  // Initialise state from route params
  const [weightText, setWeightText] = useState(() => {
    const kg = parseFloat(params.initialWeightKg ?? '');
    if (isNaN(kg) || kg <= 0) return '';
    if (unitPreference === 'lb') return String(Math.round(kg * KG_TO_LB * 10) / 10);
    return String(kg);
  });

  const [repsText, setRepsText] = useState(params.initialReps ?? '');
  const [rpe, setRpe] = useState<number | null>(() => {
    const v = parseFloat(params.initialRpe ?? '');
    return isNaN(v) ? null : v;
  });
  const [setType, setSetType] = useState<SetType>(
    (params.initialSetType as SetType | undefined) ?? 'working',
  );
  const [isWarmup, setIsWarmup] = useState(params.initialIsWarmup === 'true');
  const [isAmrap, setIsAmrap] = useState(params.initialIsAmrap === 'true');
  const [notes, setNotes] = useState(params.initialNotes ?? '');

  // Keep isWarmup in sync when set type changes to/from 'warmup'
  useEffect(() => {
    if (setType === 'warmup') setIsWarmup(true);
  }, [setType]);

  const weightKg = useMemo(() => {
    const parsed = parseFloat(weightText);
    if (isNaN(parsed) || parsed <= 0) return null;
    return unitPreference === 'lb' ? parsed * LB_TO_KG : parsed;
  }, [weightText, unitPreference]);

  const reps = useMemo(() => {
    const parsed = parseInt(repsText, 10);
    return isNaN(parsed) || parsed < 0 ? null : parsed;
  }, [repsText]);

  const isValid = weightKg !== null && reps !== null;

  const handleSave = useCallback(() => {
    if (!isValid) return;
    // Pass all edited values back to the calling screen via route params.
    // The caller (e.g., active session screen) is responsible for writing to WatermelonDB.
    router.back();
    router.setParams({
      editedSetId: setId,
      editedWeightKg: String(weightKg),
      editedReps: String(reps),
      editedRpe: rpe !== null ? String(rpe) : '',
      editedSetType: setType,
      editedIsWarmup: String(isWarmup),
      editedIsAmrap: String(isAmrap),
      editedNotes: notes,
    });
  }, [isValid, router, setId, weightKg, reps, rpe, setType, isWarmup, isAmrap, notes]);

  const handleOpenPlateCalculator = useCallback(() => {
    router.push({
      pathname: '/modals/plate-calculator',
      params: {
        initialTargetKg: weightKg !== null ? String(weightKg) : undefined,
      },
    });
  }, [router, weightKg]);

  const displayUnit = unitPreference.toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.cancelButton}
            hitSlop={12}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Edit Set</Text>
          <Pressable
            onPress={handleSave}
            style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
            disabled={!isValid}
            hitSlop={12}
          >
            <Text style={[styles.saveText, !isValid && styles.saveTextDisabled]}>
              Save
            </Text>
          </Pressable>
        </View>

        {/* Weight */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Weight ({displayUnit})</Text>
            <Pressable
              onPress={handleOpenPlateCalculator}
              style={styles.plateCalcButton}
            >
              <Text style={styles.plateCalcButtonText}>Open Plate Calculator</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.largeInput}
            value={weightText}
            onChangeText={setWeightText}
            keyboardType="decimal-pad"
            placeholder={unitPreference === 'kg' ? '100.0' : '225.0'}
            placeholderTextColor="rgba(235,235,245,0.3)"
            selectTextOnFocus
          />
          {weightKg !== null && (
            <Text style={styles.inputHint}>
              {unitPreference === 'lb'
                ? `${Math.round(weightKg * 100) / 100} kg`
                : `${Math.round(weightKg * KG_TO_LB * 10) / 10} lb`}
            </Text>
          )}
        </View>

        {/* Reps */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Reps</Text>
          <View style={styles.repsRow}>
            <TextInput
              style={[styles.largeInput, styles.repsInput]}
              value={repsText}
              onChangeText={setRepsText}
              keyboardType="number-pad"
              placeholder="5"
              placeholderTextColor="rgba(235,235,245,0.3)"
              selectTextOnFocus
            />
            <Pressable
              onPress={() => {
                const n = parseInt(repsText, 10);
                if (!isNaN(n) && n > 0) setRepsText(String(n - 1));
              }}
              style={styles.repsStepper}
            >
              <Text style={styles.repsStepperText}>−</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const n = parseInt(repsText, 10);
                setRepsText(isNaN(n) ? '1' : String(n + 1));
              }}
              style={styles.repsStepper}
            >
              <Text style={styles.repsStepperText}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* RPE */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>RPE</Text>
            <Text style={styles.rpeCurrentValue}>
              {rpe !== null ? rpe.toFixed(1) : 'Not set'}
            </Text>
          </View>
          <RPEPicker value={rpe} onChange={setRpe} />
        </View>

        {/* Set type */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Set Type</Text>
          <View style={styles.setTypeGrid}>
            {SET_TYPES.map((type) => {
              const isSelected = setType === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => setSetType(type)}
                  style={[styles.setTypeOption, isSelected && styles.setTypeOptionSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.setTypeLabel,
                      isSelected && styles.setTypeLabelSelected,
                    ]}
                  >
                    {SET_TYPE_LABELS[type]}
                  </Text>
                  <Text
                    style={[
                      styles.setTypeDesc,
                      isSelected && styles.setTypeDescSelected,
                    ]}
                    numberOfLines={2}
                  >
                    {SET_TYPE_DESCRIPTIONS[type]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Toggles */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Options</Text>
          <View style={styles.card}>
            <ToggleRow
              label="Warm-up Set"
              description="Excluded from PRs and volume totals"
              value={isWarmup}
              onChange={setIsWarmup}
            />
            <View style={styles.divider} />
            <ToggleRow
              label="AMRAP"
              description="As Many Reps As Possible"
              value={isAmrap}
              onChange={setIsAmrap}
            />
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Technique cues, form notes..."
            placeholderTextColor="rgba(235,235,245,0.3)"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            returnKeyType="done"
            blurOnSubmit
          />
        </View>

        {/* Save button */}
        <View style={styles.section}>
          <Pressable
            style={[styles.saveActionButton, !isValid && styles.saveActionButtonDisabled]}
            onPress={handleSave}
            disabled={!isValid}
          >
            <Text style={[styles.saveActionButtonText, !isValid && styles.saveActionButtonTextDisabled]}>
              Save Changes
            </Text>
          </Pressable>
          {!isValid && (
            <Text style={styles.validationHint}>Enter a weight and rep count to save</Text>
          )}
        </View>
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
  cancelButton: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    minWidth: 60,
  },
  cancelText: {
    fontSize: 17,
    color: '#007AFF',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButton: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
  saveTextDisabled: {
    color: 'rgba(235,235,245,0.3)',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(235,235,245,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
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
  inputHint: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(235,235,245,0.4)',
    textAlign: 'right',
  },
  plateCalcButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 6,
  },
  plateCalcButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  repsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  repsInput: {
    flex: 1,
    textAlign: 'center',
  },
  repsStepper: {
    width: 60,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repsStepperText: {
    fontSize: 24,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  rpeCurrentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 6,
  },
  setTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  setTypeOption: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  setTypeOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  setTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(235,235,245,0.7)',
    marginBottom: 4,
  },
  setTypeLabelSelected: {
    color: '#007AFF',
  },
  setTypeDesc: {
    fontSize: 12,
    color: 'rgba(235,235,245,0.4)',
    lineHeight: 16,
  },
  setTypeDescSelected: {
    color: 'rgba(0, 122, 255, 0.7)',
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  toggleLeft: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 13,
    color: 'rgba(235,235,245,0.5)',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3A3A3C',
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: '#34C759',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
    alignSelf: 'flex-start',
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#38383A',
  },
  notesInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
    minHeight: 80,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
  },
  saveActionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveActionButtonDisabled: {
    backgroundColor: '#2C2C2E',
  },
  saveActionButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  saveActionButtonTextDisabled: {
    color: 'rgba(235,235,245,0.3)',
  },
  validationHint: {
    marginTop: 8,
    fontSize: 13,
    color: 'rgba(235,235,245,0.4)',
    textAlign: 'center',
  },
});
