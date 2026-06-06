import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { colors } from '../../constants/colors';
import { SET_ROW_HEIGHT, spacing } from '../../constants/spacing';
import { SetType } from '../../types/enums';
import { formatWeight } from '../../utils/units';
import { PRBadge } from '../ui/PRBadge';
import { NumericKeypad } from '../ui/NumericKeypad';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface SetRowProps {
  setId: string;
  exerciseId: string;
  setNumber: number;
  setType: SetType;
  weightKg: number | null;
  weightKgActual: number | null;
  reps: number | null;
  rpe: number | null;
  isWarmup: boolean;
  isPersonalRecord: boolean;
  isCompleted: boolean;
  isActive: boolean;
  previousWeightKg?: number | null;
  previousReps?: number | null;
  onComplete: (setId: string) => void;
  onEdit: (setId: string) => void;
  unitPreference: 'kg' | 'lb';
}

type RowState = 'pending' | 'active' | 'completing' | 'completed';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function deriveRowState(
  isCompleted: boolean,
  isActive: boolean,
): RowState {
  if (isCompleted) return 'completed';
  if (isActive) return 'active';
  return 'pending';
}

function formatDisplayWeight(
  weightKgActual: number | null,
  weightKg: number | null,
  unit: 'kg' | 'lb',
): string {
  const value = weightKgActual ?? weightKg;
  if (value === null) return '--';

  const isRounded =
    weightKgActual !== null &&
    weightKg !== null &&
    weightKgActual !== weightKg;

  const formatted = formatWeight(value, unit);
  return isRounded ? `≈${formatted}` : formatted;
}

function formatReps(reps: number | null): string {
  return reps !== null ? String(reps) : '--';
}

function formatPrevious(
  weightKg: number | null | undefined,
  reps: number | null | undefined,
  unit: 'kg' | 'lb',
): string {
  if (weightKg == null || reps == null) return '--';
  const w = formatWeight(weightKg, unit);
  return `${w} × ${reps}`;
}

// ----------------------------------------------------------------------------
// Spring config — tuned for 80ms feel
// ----------------------------------------------------------------------------

const SPRING_UP: Parameters<typeof withSpring>[1] = {
  damping: 8,
  stiffness: 600,
  mass: 0.4,
};

const SPRING_DOWN: Parameters<typeof withSpring>[1] = {
  damping: 12,
  stiffness: 400,
  mass: 0.5,
};

// ----------------------------------------------------------------------------
// SetRow
// ----------------------------------------------------------------------------

export const SetRow = memo(
  ({
    setId,
    setNumber,
    setType,
    weightKg,
    weightKgActual,
    reps,
    isPersonalRecord,
    isCompleted,
    isActive,
    previousWeightKg,
    previousReps,
    onComplete,
    onEdit,
    unitPreference,
  }: SetRowProps) => {
    // ------------------------------------------------------------------
    // State machine
    // ------------------------------------------------------------------
    const [rowState, setRowState] = useState<RowState>(() =>
      deriveRowState(isCompleted, isActive),
    );

    // Inline keypad visibility
    const [keypadTarget, setKeypadTarget] = useState<'weight' | 'reps' | null>(null);
    const [keypadValue, setKeypadValue] = useState('');

    // Keep row state in sync when props change (e.g. optimistic rollback)
    useEffect(() => {
      setRowState(deriveRowState(isCompleted, isActive));
    }, [isCompleted, isActive]);

    // ------------------------------------------------------------------
    // Animation
    // ------------------------------------------------------------------
    const scale = useSharedValue(1);

    const transitionToCompleted = useCallback(() => {
      setRowState('completed');
    }, []);

    const handleComplete = useCallback(() => {
      if (rowState === 'completed' || rowState === 'completing') return;

      // Optimistic update fires immediately
      onComplete(setId);

      setRowState('completing');
      scale.value = withSpring(1.2, SPRING_UP, () => {
        scale.value = withSpring(1, SPRING_DOWN, () => {
          runOnJS(transitionToCompleted)();
        });
      });
    }, [rowState, onComplete, setId, scale, transitionToCompleted]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    // ------------------------------------------------------------------
    // Inline keypad handlers
    // ------------------------------------------------------------------
    const handleWeightTap = useCallback(() => {
      const current = weightKgActual ?? weightKg;
      setKeypadValue(current !== null ? String(current) : '');
      setKeypadTarget('weight');
    }, [weightKg, weightKgActual]);

    const handleRepsTap = useCallback(() => {
      setKeypadValue(reps !== null ? String(reps) : '');
      setKeypadTarget('reps');
    }, [reps]);

    const handleKeypadConfirm = useCallback(() => {
      setKeypadTarget(null);
      // Parent handles the actual DB write via onEdit — signal it to open the
      // set editor with the already-modified value. For simple inline edits the
      // parent store should be updated before this; here we just close.
      onEdit(setId);
    }, [onEdit, setId]);

    const handleKeypadDismiss = useCallback(() => {
      setKeypadTarget(null);
    }, []);

    // ------------------------------------------------------------------
    // Derived display values
    // ------------------------------------------------------------------
    const displayWeight = formatDisplayWeight(weightKgActual, weightKg, unitPreference);
    const displayReps = formatReps(reps);
    const displayPrev = formatPrevious(previousWeightKg, previousReps, unitPreference);

    const isWarmupRow = setType === 'warmup';
    const completed = rowState === 'completed' || rowState === 'completing';

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------
    return (
      <>
        <Animated.View
          style={[
            styles.row,
            isWarmupRow && styles.rowWarmup,
            isActive && !completed && styles.rowActive,
            completed && styles.rowCompleted,
            animatedStyle,
          ]}
        >
          {/* Left border accent */}
          <View
            style={[
              styles.leftBorder,
              isWarmupRow
                ? styles.leftBorderWarmup
                : isActive && !completed
                ? styles.leftBorderActive
                : completed
                ? styles.leftBorderCompleted
                : styles.leftBorderPending,
            ]}
          />

          {/* SET col */}
          <View style={styles.colSet}>
            <Text
              style={[
                styles.setLabel,
                isWarmupRow && styles.textMuted,
                completed && styles.textMuted,
              ]}
            >
              {isWarmupRow ? 'W' : String(setNumber)}
            </Text>
          </View>

          {/* PREV col */}
          <View style={styles.colPrev}>
            <Text style={styles.prevText} numberOfLines={1}>
              {displayPrev}
            </Text>
          </View>

          {/* KG col */}
          <TouchableOpacity
            style={styles.colWeight}
            onPress={handleWeightTap}
            activeOpacity={0.6}
            accessibilityLabel={`Weight: ${displayWeight}. Tap to edit.`}
          >
            <Text
              style={[
                styles.valueText,
                isWarmupRow && styles.textMuted,
                completed && styles.textCompleted,
              ]}
            >
              {displayWeight}
            </Text>
          </TouchableOpacity>

          {/* REPS col */}
          <TouchableOpacity
            style={styles.colReps}
            onPress={handleRepsTap}
            activeOpacity={0.6}
            accessibilityLabel={`Reps: ${displayReps}. Tap to edit.`}
          >
            <Text
              style={[
                styles.valueText,
                isWarmupRow && styles.textMuted,
                completed && styles.textCompleted,
              ]}
            >
              {displayReps}
            </Text>
          </TouchableOpacity>

          {/* CHECK col */}
          <TouchableOpacity
            style={styles.colCheck}
            onPress={handleComplete}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={completed ? 'Set completed' : 'Complete set'}
            accessibilityState={{ checked: completed }}
          >
            <View
              style={[
                styles.checkCircle,
                completed ? styles.checkCircleCompleted : styles.checkCircleEmpty,
              ]}
            >
              {completed && (
                <Text style={styles.checkmark}>{'✓'}</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* PR badge — shown inline after checkmark when completed */}
          {completed && isPersonalRecord && (
            <View style={styles.prBadgeContainer}>
              <PRBadge size="sm" />
            </View>
          )}
        </Animated.View>

        {/* Inline NumericKeypad modal */}
        {keypadTarget !== null && (
          <Modal
            transparent
            animationType="slide"
            visible
            onRequestClose={handleKeypadDismiss}
          >
            <Pressable style={styles.keypadBackdrop} onPress={handleKeypadDismiss} />
            <View style={styles.keypadSheet}>
              <View style={styles.keypadHandle} />
              <Text style={styles.keypadTitle}>
                {keypadTarget === 'weight' ? 'Weight' : 'Reps'}
              </Text>
              <NumericKeypad
                value={keypadValue}
                onChange={setKeypadValue}
                onConfirm={handleKeypadConfirm}
                allowDecimal={keypadTarget === 'weight'}
                maxValue={keypadTarget === 'weight' ? 9999 : 999}
              />
            </View>
          </Modal>
        )}
      </>
    );
  },
  (prev, next) =>
    prev.setId === next.setId &&
    prev.isCompleted === next.isCompleted &&
    prev.isActive === next.isActive &&
    prev.isPersonalRecord === next.isPersonalRecord &&
    prev.weightKg === next.weightKg &&
    prev.reps === next.reps,
);

SetRow.displayName = 'SetRow';

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------

const LEFT_BORDER_WIDTH = 3;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: SET_ROW_HEIGHT,
    backgroundColor: colors.background.secondary.dark,
    overflow: 'hidden',
  },
  rowWarmup: {
    backgroundColor: colors.background.tertiary.dark,
    opacity: 0.85,
  },
  rowActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.06)',
  },
  rowCompleted: {
    backgroundColor: 'rgba(52, 199, 89, 0.06)',
  },

  // Left border accent strip
  leftBorder: {
    width: LEFT_BORDER_WIDTH,
    alignSelf: 'stretch',
  },
  leftBorderPending: {
    backgroundColor: 'transparent',
  },
  leftBorderActive: {
    backgroundColor: colors.system.blue,
  },
  leftBorderWarmup: {
    backgroundColor: colors.system.orange,
  },
  leftBorderCompleted: {
    backgroundColor: colors.system.green,
  },

  // Columns
  colSet: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colPrev: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  colWeight: {
    flex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    height: '100%',
  },
  colReps: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    height: '100%',
  },
  colCheck: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Text
  setLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.label.secondary.dark,
  },
  prevText: {
    fontSize: 12,
    color: colors.label.tertiary.dark,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.label.primary.dark,
  },
  textMuted: {
    color: colors.label.secondary.dark,
  },
  textCompleted: {
    color: colors.label.secondary.dark,
  },

  // Checkmark
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  checkCircleEmpty: {
    borderColor: colors.label.tertiary.dark,
    backgroundColor: 'transparent',
  },
  checkCircleCompleted: {
    borderColor: colors.system.green,
    backgroundColor: colors.system.green,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 16,
  },

  // PR badge
  prBadgeContainer: {
    position: 'absolute',
    right: 56,
    top: '50%',
    marginTop: -10,
  },

  // Inline keypad
  keypadBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keypadSheet: {
    backgroundColor: colors.background.secondary.dark,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: spacing.sm,
  },
  keypadHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.label.tertiary.dark,
    marginBottom: spacing.sm,
  },
  keypadTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.label.secondary.dark,
    textAlign: 'center',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
