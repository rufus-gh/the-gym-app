import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSettings } from '../../../src/hooks/useSettings';
import { useReducedMotion } from '../../../src/hooks/useReducedMotion';
import { PRBadge } from '../../../src/components/ui/PRBadge';
import type { PRRecordType } from '../../../src/types/enums';

const KG_TO_LB = 2.20462;
const RPE_MIN = 1;
const RPE_MAX = 10;

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

interface PREntry {
  exerciseName: string;
  recordType: PRRecordType;
  newValue: number;
  previousValue: number | null;
}

const RECORD_TYPE_LABELS: Record<PRRecordType, string> = {
  weight: 'Weight PR',
  reps: 'Reps PR',
  volume: 'Volume PR',
  estimated_1rm: 'e1RM PR',
};

interface RPESliderProps {
  value: number;
  onChange: (v: number) => void;
}

function RPESlider({ value, onChange }: RPESliderProps) {
  const steps = Array.from({ length: RPE_MAX - RPE_MIN + 1 }, (_, i) => i + RPE_MIN);

  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.track}>
        {steps.map((step) => {
          const selected = value === step;
          return (
            <Pressable
              key={step}
              onPress={() => onChange(step)}
              style={[sliderStyles.step, selected && sliderStyles.stepSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`RPE ${step}`}
            >
              <Text style={[sliderStyles.stepText, selected && sliderStyles.stepTextSelected]}>
                {step}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={sliderStyles.labels}>
        <Text style={sliderStyles.labelText}>Easy</Text>
        <Text style={sliderStyles.labelText}>Max Effort</Text>
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  track: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  step: {
    flex: 1,
    height: 36,
    borderRadius: 8,
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
    color: 'rgba(235,235,245,0.5)',
  },
  stepTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  labelText: {
    fontSize: 11,
    color: 'rgba(235,235,245,0.4)',
  },
});

export default function WorkoutSummaryModal() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { unitPreference } = useSettings();

  const params = useLocalSearchParams<{
    sessionId: string;
    durationSeconds?: string;
    totalVolumeKg?: string;
    totalSets?: string;
    totalReps?: string;
    prsJson?: string; // JSON array of PREntry
    previousVolumeKg?: string;
    sessionName?: string;
  }>();

  const durationSeconds = parseInt(params.durationSeconds ?? '0', 10);
  const totalVolumeKg = parseFloat(params.totalVolumeKg ?? '0');
  const totalSets = parseInt(params.totalSets ?? '0', 10);
  const totalReps = parseInt(params.totalReps ?? '0', 10);
  const previousVolumeKg = params.previousVolumeKg != null
    ? parseFloat(params.previousVolumeKg)
    : null;
  const sessionName = params.sessionName ?? 'Workout';

  const prs = useMemo<PREntry[]>(() => {
    if (!params.prsJson) return [];
    try {
      const parsed: unknown = JSON.parse(params.prsJson);
      return Array.isArray(parsed) ? (parsed as PREntry[]) : [];
    } catch {
      return [];
    }
  }, [params.prsJson]);

  const [overallRpe, setOverallRpe] = useState(7);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Entry animation
  const cardOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const cardTranslateY = useSharedValue(reducedMotion ? 0 : 40);

  useEffect(() => {
    if (reducedMotion) return;
    cardOpacity.value = withSpring(1, { damping: 20, stiffness: 200 });
    cardTranslateY.value = withSpring(0, { damping: 18, stiffness: 180 });
  }, [reducedMotion, cardOpacity, cardTranslateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const displayVolume = useCallback(
    (kg: number) => {
      if (unitPreference === 'lb') {
        return `${Math.round(kg * KG_TO_LB).toLocaleString()} lb`;
      }
      return `${Math.round(kg).toLocaleString()} kg`;
    },
    [unitPreference],
  );

  const volumeDeltaPercent = useMemo(() => {
    if (previousVolumeKg === null || previousVolumeKg <= 0) return null;
    return Math.round(((totalVolumeKg - previousVolumeKg) / previousVolumeKg) * 1000) / 10;
  }, [totalVolumeKg, previousVolumeKg]);

  const handleDone = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    // In a real implementation this would write the RPE and notes to WatermelonDB.
    // For now we pass the values back via route params so the calling screen can persist them.
    router.back();
    router.setParams({
      savedRpe: String(overallRpe),
      savedNotes: notes,
    });
  }, [isSaving, router, overallRpe, notes]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Workout Complete</Text>
          <Text style={styles.sessionName}>{sessionName}</Text>
        </View>

        <Animated.View style={animStyle}>
          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatDuration(durationSeconds)}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{displayVolume(totalVolumeKg)}</Text>
                {volumeDeltaPercent !== null && (
                  <View
                    style={[
                      styles.deltaPill,
                      volumeDeltaPercent >= 0 ? styles.deltaPillPositive : styles.deltaPillNegative,
                    ]}
                  >
                    <Text
                      style={[
                        styles.deltaPillText,
                        volumeDeltaPercent >= 0 ? styles.deltaPillTextPositive : styles.deltaPillTextNegative,
                      ]}
                    >
                      {volumeDeltaPercent >= 0 ? '+' : ''}{volumeDeltaPercent}%
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.statLabel}>Total Volume</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalSets}</Text>
              <Text style={styles.statLabel}>Sets</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalReps}</Text>
              <Text style={styles.statLabel}>Reps</Text>
            </View>
          </View>

          {/* PRs */}
          {prs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                Personal Records ({prs.length})
              </Text>
              <View style={styles.card}>
                {prs.map((pr, index) => (
                  <React.Fragment key={`${pr.exerciseName}-${pr.recordType}`}>
                    <View style={styles.prRow}>
                      <View style={styles.prLeft}>
                        <Text style={styles.prExercise}>{pr.exerciseName}</Text>
                        <Text style={styles.prType}>{RECORD_TYPE_LABELS[pr.recordType]}</Text>
                      </View>
                      <View style={styles.prRight}>
                        <PRBadge recordType={pr.recordType} size="sm" />
                        <Text style={styles.prValue}>
                          {pr.recordType === 'reps'
                            ? `${pr.newValue} reps`
                            : displayVolume(pr.newValue)}
                        </Text>
                      </View>
                    </View>
                    {index < prs.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                ))}
              </View>
            </View>
          )}

          {/* RPE */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>How hard was this session?</Text>
            <View style={styles.rpeCard}>
              <View style={styles.rpeHeader}>
                <Text style={styles.rpeTitle}>Overall RPE</Text>
                <View style={styles.rpeBadge}>
                  <Text style={styles.rpeBadgeText}>{overallRpe}/10</Text>
                </View>
              </View>
              <RPESlider value={overallRpe} onChange={setOverallRpe} />
            </View>
          </View>

          {/* Session notes */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Session Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="How did it go? Any notes for next time..."
              placeholderTextColor="rgba(235,235,245,0.3)"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit
            />
          </View>

          {/* Done button */}
          <View style={styles.section}>
            <Pressable
              style={[styles.doneButton, isSaving && styles.doneButtonSaving]}
              onPress={handleDone}
              disabled={isSaving}
            >
              <Text style={styles.doneButtonText}>
                {isSaving ? 'Saving...' : 'Done'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
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
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.7,
    marginBottom: 4,
  },
  sessionName: {
    fontSize: 15,
    color: 'rgba(235,235,245,0.5)',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(235,235,245,0.5)',
  },
  deltaPill: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  deltaPillPositive: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  deltaPillNegative: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
  },
  deltaPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deltaPillTextPositive: {
    color: '#34C759',
  },
  deltaPillTextNegative: {
    color: '#FF3B30',
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
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  prLeft: {
    flex: 1,
    marginRight: 12,
  },
  prExercise: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  prType: {
    fontSize: 13,
    color: 'rgba(235,235,245,0.5)',
  },
  prRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  prValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFD700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#38383A',
  },
  rpeCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
  },
  rpeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rpeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rpeBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rpeBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notesInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
    minHeight: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
  },
  doneButton: {
    backgroundColor: '#34C759',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  doneButtonSaving: {
    opacity: 0.6,
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
