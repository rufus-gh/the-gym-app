import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ListRenderItemInfo,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BUILT_IN_EXERCISES } from '../../../src/constants/exercises';
import { FilterChip } from '../../../src/components/ui/FilterChip';
import type { ExerciseCategory } from '../../../src/types/enums';

const EXERCISE_ROW_HEIGHT = 72;
const MAX_SUPERSET_SIZE = 6;

// Category display labels
const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  band: 'Band',
  cardio: 'Cardio',
  other: 'Other',
};

const ALL_CATEGORIES: ExerciseCategory[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'band',
  'cardio',
  'other',
];

interface ExerciseItem {
  id: string;
  name: string;
  category: ExerciseCategory;
  primaryMuscles: string[];
  isCompound: boolean;
}

interface ExerciseRowProps {
  item: ExerciseItem;
  isSelected: boolean;
  isSupersetMode: boolean;
  selectionIndex: number; // -1 when not selected
  onPress: (id: string) => void;
}

const ExerciseRow = memo(
  ({ item, isSelected, isSupersetMode, selectionIndex, onPress }: ExerciseRowProps) => {
    const handlePress = useCallback(() => onPress(item.id), [item.id, onPress]);

    const primaryMuscleLabel = item.primaryMuscles
      .slice(0, 2)
      .map((m) => m.replace(/_/g, ' '))
      .join(', ');

    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.exerciseRow,
          isSelected && styles.exerciseRowSelected,
          pressed && styles.exerciseRowPressed,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${item.name}, ${primaryMuscleLabel}`}
      >
        <View style={styles.exerciseRowLeft}>
          <Text style={[styles.exerciseName, isSelected && styles.exerciseNameSelected]}>
            {item.name}
          </Text>
          <Text style={styles.exerciseMeta}>
            {CATEGORY_LABELS[item.category]} · {primaryMuscleLabel}
            {item.isCompound ? ' · Compound' : ''}
          </Text>
        </View>

        <View style={styles.exerciseRowRight}>
          {isSelected && isSupersetMode && selectionIndex >= 0 && (
            <View style={styles.orderBadge}>
              <Text style={styles.orderBadgeText}>{selectionIndex + 1}</Text>
            </View>
          )}
          {isSelected && !isSupersetMode && (
            <View style={styles.checkCircle}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
          )}
          {!isSelected && (
            <View style={styles.emptyCircle} />
          )}
        </View>
      </Pressable>
    );
  },
  (prev, next) =>
    prev.isSelected === next.isSelected &&
    prev.selectionIndex === next.selectionIndex &&
    prev.item.id === next.item.id,
);

ExerciseRow.displayName = 'ExerciseRow';

export default function ExercisePickerModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    supersetMode?: string;
    maxSelections?: string;
    alreadySelectedIds?: string; // JSON array of exercise IDs already in the session
  }>();

  const isSupersetMode = params.supersetMode === 'true';
  const maxSelections = isSupersetMode
    ? Math.min(parseInt(params.maxSelections ?? '6', 10), MAX_SUPERSET_SIZE)
    : 1;
  const alreadySelected: string[] = useMemo(() => {
    if (!params.alreadySelectedIds) return [];
    try {
      const parsed: unknown = JSON.parse(params.alreadySelectedIds);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }, [params.alreadySelectedIds]);

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Normalise exercises to a flat list
  const exercises = useMemo<ExerciseItem[]>(
    () =>
      BUILT_IN_EXERCISES.filter((e) => !e.isArchived).map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        primaryMuscles: e.primaryMuscles,
        isCompound: e.isCompound,
      })),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((e) => {
      const matchesQuery =
        q === '' || e.name.toLowerCase().includes(q);
      const matchesCategory =
        selectedCategory === null || e.category === selectedCategory;
      return matchesQuery && matchesCategory;
    });
  }, [exercises, query, selectedCategory]);

  const handleToggle = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        if (prev.includes(id)) {
          return prev.filter((x) => x !== id);
        }
        if (isSupersetMode) {
          if (prev.length >= maxSelections) return prev; // at capacity
          return [...prev, id];
        }
        // Single-select: replace selection
        return [id];
      });
    },
    [isSupersetMode, maxSelections],
  );

  const handleConfirm = useCallback(() => {
    router.back();
    router.setParams({ selectedExerciseIds: JSON.stringify(selectedIds) });
  }, [router, selectedIds]);

  const handleCategoryPress = useCallback(
    (cat: ExerciseCategory) => {
      setSelectedCategory((prev) => (prev === cat ? null : cat));
    },
    [],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: EXERCISE_ROW_HEIGHT,
      offset: EXERCISE_ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ExerciseItem>) => {
      const isSelected = selectedIds.includes(item.id);
      const selectionIndex = selectedIds.indexOf(item.id);
      return (
        <ExerciseRow
          item={item}
          isSelected={isSelected}
          isSupersetMode={isSupersetMode}
          selectionIndex={selectionIndex}
          onPress={handleToggle}
        />
      );
    },
    [selectedIds, isSupersetMode, handleToggle],
  );

  const confirmLabel = useMemo(() => {
    if (selectedIds.length === 0) return 'Select an Exercise';
    if (selectedIds.length === 1) return 'Add 1 Exercise';
    return `Add ${selectedIds.length} Exercises`;
  }, [selectedIds.length]);

  const isConfirmDisabled = selectedIds.length === 0;

  const ListHeader = useMemo(
    () => (
      <View style={styles.listHeaderContainer}>
        <FlatList
          data={ALL_CATEGORIES}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
          renderItem={({ item: cat }) => (
            <FilterChip
              label={CATEGORY_LABELS[cat]}
              selected={selectedCategory === cat}
              onPress={() => handleCategoryPress(cat)}
            />
          )}
        />
      </View>
    ),
    [selectedCategory, handleCategoryPress],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.cancelButton}
          hitSlop={12}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>
          {isSupersetMode ? 'Add to Superset' : 'Add Exercise'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search exercises"
            placeholderTextColor="rgba(235,235,245,0.3)"
            clearButtonMode="while-editing"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Superset mode notice */}
      {isSupersetMode && (
        <View style={styles.supersetBanner}>
          <Text style={styles.supersetBannerText}>
            Select up to {maxSelections} exercises for the superset
          </Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        ListHeaderComponent={ListHeader}
        stickyHeaderIndices={[0]}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No exercises match your search
            </Text>
          </View>
        }
      />

      {/* Confirm bar */}
      <View style={styles.confirmBar}>
        <Pressable
          style={[styles.confirmButton, isConfirmDisabled && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={isConfirmDisabled}
        >
          <Text
            style={[
              styles.confirmButtonText,
              isConfirmDisabled && styles.confirmButtonTextDisabled,
            ]}
          >
            {confirmLabel}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
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
  headerRight: {
    minWidth: 60,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 18,
    color: 'rgba(235,235,245,0.4)',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  supersetBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  supersetBannerText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  listHeaderContainer: {
    backgroundColor: '#000000',
    paddingBottom: 4,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: EXERCISE_ROW_HEIGHT,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1C1C1E',
  },
  exerciseRowSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  exerciseRowPressed: {
    backgroundColor: '#2C2C2E',
  },
  exerciseRowLeft: {
    flex: 1,
    marginRight: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  exerciseNameSelected: {
    color: '#007AFF',
  },
  exerciseMeta: {
    fontSize: 13,
    color: 'rgba(235,235,245,0.5)',
  },
  exerciseRowRight: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  orderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(235,235,245,0.25)',
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
  },
  confirmBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#38383A',
    backgroundColor: '#000000',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#2C2C2E',
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmButtonTextDisabled: {
    color: 'rgba(235,235,245,0.3)',
  },
});
