import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../../src/hooks/useReducedMotion';
import { PRBadge } from '../../../src/components/ui/PRBadge';
import { BUILT_IN_EXERCISES } from '../../../src/constants/exercises';
import { useSettings } from '../../../src/hooks/useSettings';
import type { PRRecordType } from '../../../src/types/enums';

const KG_TO_LB = 2.20462;
const AUTO_DISMISS_MS = 5000;

const RECORD_TYPE_LABELS: Record<PRRecordType, string> = {
  weight: 'Weight',
  reps: 'Reps',
  volume: 'Volume',
  estimated_1rm: 'Estimated 1RM',
};

const RECORD_TYPE_UNITS: Record<PRRecordType, string> = {
  weight: 'kg', // overridden based on user preference
  reps: 'reps',
  volume: 'kg', // overridden
  estimated_1rm: 'kg', // overridden
};

const SPRING_CONFIG = { damping: 12, stiffness: 280, mass: 0.8 };
const TROPHY_SPRING = { damping: 8, stiffness: 200, mass: 1.2 };

export default function PRCelebrationModal() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { unitPreference } = useSettings();

  const params = useLocalSearchParams<{
    exerciseId: string;
    recordType: string;
    newValue: string;
    previousValue?: string;
    unit?: string;
  }>();

  const exerciseId = params.exerciseId ?? '';
  const recordType = (params.recordType ?? 'weight') as PRRecordType;
  const newValue = parseFloat(params.newValue ?? '0');
  const previousValue = params.previousValue != null ? parseFloat(params.previousValue) : null;

  // Resolve exercise name
  const exerciseName = BUILT_IN_EXERCISES.find((e) => e.id === exerciseId)?.name ?? 'Exercise';

  // Determine display unit
  const isWeightType =
    recordType === 'weight' || recordType === 'volume' || recordType === 'estimated_1rm';
  const displayValue = (kg: number) => {
    if (!isWeightType) return String(Math.round(kg));
    if (unitPreference === 'lb') return `${Math.round(kg * KG_TO_LB * 10) / 10} lb`;
    return `${Math.round(kg * 100) / 100} kg`;
  };

  const deltaPercent =
    previousValue !== null && previousValue > 0
      ? Math.round(((newValue - previousValue) / previousValue) * 1000) / 10
      : null;

  // Animations
  const containerOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const cardScale = useSharedValue(reducedMotion ? 1 : 0.7);
  const trophyScale = useSharedValue(reducedMotion ? 1 : 0);

  const handleDismiss = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    if (reducedMotion) return;

    containerOpacity.value = withTiming(1, { duration: 200 });
    cardScale.value = withDelay(80, withSpring(1, SPRING_CONFIG));
    trophyScale.value = withDelay(
      300,
      withSequence(
        withSpring(1.3, TROPHY_SPRING),
        withSpring(1, { damping: 14, stiffness: 300 }),
      ),
    );
  }, [reducedMotion, containerOpacity, cardScale, trophyScale]);

  // Auto-dismiss timer
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    dismissTimer.current = setTimeout(handleDismiss, AUTO_DISMISS_MS);
    return () => {
      if (dismissTimer.current !== null) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, [handleDismiss]);

  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const trophyAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: trophyScale.value }],
  }));

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Animated.View style={[styles.backdrop, containerAnimStyle]}>
          <Pressable style={styles.backdropTouchable} onPress={handleDismiss}>
            <Animated.View
              style={[styles.card, cardAnimStyle]}
              // Prevent backdrop press from propagating through the card
              onStartShouldSetResponder={() => true}
            >
              {/* Trophy icon */}
              <Animated.View style={[styles.trophyWrapper, trophyAnimStyle]}>
                <Text style={styles.trophyEmoji}>🏆</Text>
              </Animated.View>

              {/* Headline */}
              <Text style={styles.headline}>New Personal Record!</Text>

              {/* PR badge */}
              <View style={styles.badgeWrapper}>
                <PRBadge recordType={recordType} size="md" />
              </View>

              {/* Exercise name */}
              <Text style={styles.exerciseName}>{exerciseName}</Text>
              <Text style={styles.recordTypeLabel}>
                {RECORD_TYPE_LABELS[recordType]}
              </Text>

              {/* Values */}
              <View style={styles.valuesRow}>
                {previousValue !== null && (
                  <View style={styles.valueBlock}>
                    <Text style={styles.valueLabelSmall}>Previous</Text>
                    <Text style={styles.valuePrevious}>{displayValue(previousValue)}</Text>
                  </View>
                )}

                {previousValue !== null && (
                  <View style={styles.arrowWrapper}>
                    <Text style={styles.arrow}>→</Text>
                  </View>
                )}

                <View style={styles.valueBlock}>
                  <Text style={styles.valueLabelSmall}>
                    {previousValue !== null ? 'New' : 'Personal Record'}
                  </Text>
                  <Text style={styles.valueNew}>{displayValue(newValue)}</Text>
                </View>
              </View>

              {/* Delta */}
              {deltaPercent !== null && (
                <View style={styles.deltaBadge}>
                  <Text style={styles.deltaText}>
                    +{deltaPercent}% improvement
                  </Text>
                </View>
              )}

              {/* Dismiss button */}
              <Pressable style={styles.dismissButton} onPress={handleDismiss}>
                <Text style={styles.dismissButtonText}>Awesome!</Text>
              </Pressable>

              {/* Auto-dismiss hint */}
              <Text style={styles.autoDismissHint}>
                Dismisses automatically in 5 seconds
              </Text>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safeArea: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 20,
  },
  trophyWrapper: {
    marginBottom: 16,
  },
  trophyEmoji: {
    fontSize: 72,
  },
  headline: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  badgeWrapper: {
    marginBottom: 20,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  recordTypeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(235,235,245,0.5)',
    marginBottom: 24,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  valueBlock: {
    alignItems: 'center',
  },
  valueLabelSmall: {
    fontSize: 12,
    color: 'rgba(235,235,245,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  valuePrevious: {
    fontSize: 22,
    fontWeight: '600',
    color: 'rgba(235,235,245,0.5)',
    letterSpacing: -0.5,
  },
  valueNew: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: -0.5,
  },
  arrowWrapper: {
    marginTop: 16,
  },
  arrow: {
    fontSize: 20,
    color: 'rgba(235,235,245,0.4)',
  },
  deltaBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 24,
  },
  deltaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
  },
  dismissButton: {
    width: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  dismissButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  autoDismissHint: {
    fontSize: 12,
    color: 'rgba(235,235,245,0.3)',
  },
});
