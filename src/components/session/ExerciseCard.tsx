import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ListRenderItem,
  Alert,
} from 'react-native';
import { colors } from '../../constants/colors';
import { SET_ROW_HEIGHT, spacing, radius } from '../../constants/spacing';
import { SetRow, SetRowProps } from './SetRow';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface ExerciseCardProps {
  exerciseId: string;
  exerciseName: string;
  sets: SetRowProps[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAddSet: (exerciseId: string) => void;
  onEditExercise: (exerciseId: string) => void;
  onRemoveExercise: (exerciseId: string) => void;
  unitPreference: 'kg' | 'lb';
}

// ----------------------------------------------------------------------------
// FlatList helpers — fixed-height rows required for getItemLayout
// ----------------------------------------------------------------------------

const keyExtractor = (item: SetRowProps) => item.setId;

const getItemLayout = (
  _: ArrayLike<SetRowProps> | null | undefined,
  index: number,
) => ({
  length: SET_ROW_HEIGHT,
  offset: SET_ROW_HEIGHT * index,
  index,
});

// Column header heights
const COLUMN_HEADER_HEIGHT = 28;

// ----------------------------------------------------------------------------
// ExerciseCard
// ----------------------------------------------------------------------------

export const ExerciseCard = memo(({
  exerciseId,
  exerciseName,
  sets,
  isExpanded,
  onToggleExpand,
  onAddSet,
  onEditExercise,
  onRemoveExercise,
  unitPreference,
}: ExerciseCardProps) => {
  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  const handleAddSet = useCallback(() => {
    onAddSet(exerciseId);
  }, [onAddSet, exerciseId]);

  const handleEditExercise = useCallback(() => {
    onEditExercise(exerciseId);
  }, [onEditExercise, exerciseId]);

  const handleRemoveExercise = useCallback(() => {
    Alert.alert(
      'Remove Exercise',
      `Remove ${exerciseName} from this session?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemoveExercise(exerciseId),
        },
      ],
    );
  }, [exerciseId, exerciseName, onRemoveExercise]);

  const handleMenuPress = useCallback(() => {
    Alert.alert(exerciseName, undefined, [
      {
        text: 'Edit Exercise',
        onPress: handleEditExercise,
      },
      {
        text: 'Remove from Session',
        style: 'destructive',
        onPress: handleRemoveExercise,
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [exerciseName, handleEditExercise, handleRemoveExercise]);

  // ------------------------------------------------------------------
  // Render set row — stable reference via useCallback
  // ------------------------------------------------------------------
  const renderSet: ListRenderItem<SetRowProps> = useCallback(
    ({ item }) => (
      <SetRow
        {...item}
        unitPreference={unitPreference}
      />
    ),
    [unitPreference],
  );

  // ------------------------------------------------------------------
  // Derived
  // ------------------------------------------------------------------
  const completedCount = sets.filter((s) => s.isCompleted).length;
  const totalCount = sets.length;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <View style={styles.card}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={onToggleExpand}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${exerciseName}. ${completedCount} of ${totalCount} sets completed. Tap to ${isExpanded ? 'collapse' : 'expand'}.`}
        accessibilityState={{ expanded: isExpanded }}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.exerciseName} numberOfLines={1}>
            {exerciseName}
          </Text>
          <Text style={styles.setProgress}>
            {completedCount}/{totalCount} sets
          </Text>
        </View>

        <View style={styles.headerRight}>
          {/* Expand / collapse chevron */}
          <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>

          {/* Menu button */}
          <TouchableOpacity
            style={styles.menuButton}
            onPress={handleMenuPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Options for ${exerciseName}`}
          >
            <Text style={styles.menuDots}>{'•••'}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Expanded content */}
      {isExpanded && (
        <>
          {/* Column labels */}
          <View style={styles.columnHeader}>
            <View style={styles.colHeaderSet}>
              <Text style={styles.columnLabel}>SET</Text>
            </View>
            <View style={styles.colHeaderPrev}>
              <Text style={styles.columnLabel}>PREV</Text>
            </View>
            <View style={styles.colHeaderWeight}>
              <Text style={styles.columnLabel}>
                {unitPreference.toUpperCase()}
              </Text>
            </View>
            <View style={styles.colHeaderReps}>
              <Text style={styles.columnLabel}>REPS</Text>
            </View>
            {/* Spacer matching check column */}
            <View style={styles.colHeaderCheck} />
          </View>

          {/* Set rows */}
          <FlatList<SetRowProps>
            data={sets}
            keyExtractor={keyExtractor}
            renderItem={renderSet}
            getItemLayout={getItemLayout}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
            scrollEnabled={false}
            style={styles.setList}
          />

          {/* Add set button */}
          <TouchableOpacity
            style={styles.addSetButton}
            onPress={handleAddSet}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Add set to ${exerciseName}`}
          >
            <Text style={styles.addSetIcon}>{'+'}</Text>
            <Text style={styles.addSetLabel}>Add Set</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
});

ExerciseCard.displayName = 'ExerciseCard';

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary.dark,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 48,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.label.primary.dark,
  },
  setProgress: {
    fontSize: 12,
    color: colors.label.secondary.dark,
  },
  chevron: {
    fontSize: 10,
    color: colors.label.tertiary.dark,
  },
  menuButton: {
    padding: 4,
  },
  menuDots: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.label.secondary.dark,
    letterSpacing: 1,
  },

  // Column header row
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: COLUMN_HEADER_HEIGHT,
    paddingLeft: 3, // align with left border
    backgroundColor: colors.background.tertiary.dark,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator.dark,
  },
  colHeaderSet: {
    width: 36,
    alignItems: 'center',
  },
  colHeaderPrev: {
    flex: 2,
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  colHeaderWeight: {
    flex: 3,
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  colHeaderReps: {
    flex: 2,
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  colHeaderCheck: {
    width: 48,
  },
  columnLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.label.tertiary.dark,
    letterSpacing: 0.6,
  },

  // Set list
  setList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator.dark,
  },

  // Add set
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator.dark,
  },
  addSetIcon: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.system.blue,
    lineHeight: 20,
  },
  addSetLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.system.blue,
  },
});
