import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';

import { FilterChip } from '../../../../src/components/ui/FilterChip';
import { BUILT_IN_EXERCISES } from '../../../../src/constants/exercises';
import { useActiveSessionStore } from '../../../../src/stores/activeSessionStore';
import type { ExerciseCategory, MuscleGroup } from '../../../../src/types/enums';
import type { ExerciseModel } from '../../../../src/db/models/Exercise';

// ─── Constants ───────────────────────────────────────────────────────────────

const EXERCISE_ITEM_HEIGHT = 72;

type CategoryFilter = ExerciseCategory | 'all';

const FILTER_CHIPS: { label: string; value: CategoryFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Barbell', value: 'barbell' },
  { label: 'Dumbbell', value: 'dumbbell' },
  { label: 'Machine', value: 'machine' },
  { label: 'Cable', value: 'cable' },
  { label: 'Bodyweight', value: 'bodyweight' },
  { label: 'Kettlebell', value: 'kettlebell' },
];

const CATEGORY_LABEL: Record<ExerciseCategory, string> = {
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

const CATEGORY_COLOR: Record<ExerciseCategory, string> = {
  barbell: '#FF9500',
  dumbbell: '#007AFF',
  machine: '#5AC8FA',
  cable: '#AF52DE',
  bodyweight: '#34C759',
  kettlebell: '#FF2D55',
  band: '#FFCC00',
  cardio: '#FF3B30',
  other: '#3A3A3C',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExerciseRow {
  id: string;
  name: string;
  category: ExerciseCategory;
  primaryMuscles: MuscleGroup[];
}

// ─── ExerciseListItem ─────────────────────────────────────────────────────────

interface ExerciseListItemProps {
  item: ExerciseRow;
  sessionActive: boolean;
  onPress: (id: string) => void;
  onLongPress: (id: string, name: string) => void;
}

const ExerciseListItem = memo(
  ({ item, sessionActive, onPress, onLongPress }: ExerciseListItemProps) => {
    const muscleLabel = item.primaryMuscles
      .slice(0, 2)
      .map((m) => m.replace(/_/g, ' '))
      .join(', ');

    const categoryColor = CATEGORY_COLOR[item.category] ?? '#3A3A3C';

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => onPress(item.id)}
        onLongPress={() => onLongPress(item.id, item.name)}
        delayLongPress={350}
        activeOpacity={0.7}
      >
        <View style={styles.rowContent}>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.rowMeta}>
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '33' }]}>
              <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>
                {CATEGORY_LABEL[item.category] ?? item.category}
              </Text>
            </View>
            {muscleLabel.length > 0 && (
              <Text style={styles.muscleText} numberOfLines={1}>
                {muscleLabel}
              </Text>
            )}
          </View>
        </View>
        {sessionActive && (
          <View style={styles.addHint}>
            <Text style={styles.addHintText}>Hold to add</Text>
          </View>
        )}
        <View style={styles.chevron}>
          <Text style={styles.chevronText}>›</Text>
        </View>
      </TouchableOpacity>
    );
  },
  (prev, next) => prev.item.id === next.item.id && prev.sessionActive === next.sessionActive,
);

ExerciseListItem.displayName = 'ExerciseListItem';

// ─── ExercisesScreen ──────────────────────────────────────────────────────────

export default function ExercisesScreen() {
  const database = useDatabase();
  const sessionId = useActiveSessionStore((s) => s.sessionId);
  const addExercise = useActiveSessionStore((s) => s.addExercise);
  const sessionActive = sessionId !== null;

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [dbExercises, setDbExercises] = useState<ExerciseRow[]>([]);

  // Debounce search input 150ms
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(text), 150);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Load custom exercises from WatermelonDB
  useEffect(() => {
    let cancelled = false;
    database
      .get<ExerciseModel>('exercises')
      .query(Q.where('is_archived', false))
      .fetch()
      .then((models) => {
        if (cancelled) return;
        setDbExercises(
          models.map((m) => ({
            id: m.id,
            name: m.name,
            category: m.category as ExerciseCategory,
            primaryMuscles: m.primaryMuscles as MuscleGroup[],
          })),
        );
      })
      .catch(() => {
        // DB may not be seeded yet — fall through to built-in list
      });
    return () => {
      cancelled = true;
    };
  }, [database]);

  // Merge built-in + custom, deduplicate by id
  const allExercises = useMemo<ExerciseRow[]>(() => {
    const builtIn: ExerciseRow[] = BUILT_IN_EXERCISES.map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      primaryMuscles: e.primaryMuscles,
    }));
    const dbIds = new Set(dbExercises.map((e) => e.id));
    return [...dbExercises, ...builtIn.filter((e) => !dbIds.has(e.id))];
  }, [dbExercises]);

  // Filter by category and search query
  const filteredExercises = useMemo<ExerciseRow[]>(() => {
    let result = allExercises;
    if (selectedCategory !== 'all') {
      result = result.filter((e) => e.category === selectedCategory);
    }
    if (debouncedQuery.trim().length > 0) {
      const q = debouncedQuery.trim().toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(q));
    }
    return result;
  }, [allExercises, selectedCategory, debouncedQuery]);

  const handlePress = useCallback((id: string) => {
    router.push(`/(tabs)/library/exercises/${id}`);
  }, []);

  const handleLongPress = useCallback(
    (id: string, name: string) => {
      if (!sessionActive || !sessionId) return;
      const nanoid = require('../../../../src/utils/nanoid').nanoid;
      addExercise({
        id: nanoid(),
        exerciseId: id,
        exerciseName: name,
        orderIndex: 0,
        setIds: [],
      });
    },
    [sessionActive, sessionId, addExercise],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<ExerciseRow> | null | undefined, index: number) => ({
      length: EXERCISE_ITEM_HEIGHT,
      offset: EXERCISE_ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const keyExtractor = useCallback((item: ExerciseRow) => item.id, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ExerciseRow>) => (
      <ExerciseListItem
        item={item}
        sessionActive={sessionActive}
        onPress={handlePress}
        onLongPress={handleLongPress}
      />
    ),
    [sessionActive, handlePress, handleLongPress],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises…"
            placeholderTextColor="rgba(235,235,245,0.3)"
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/(tabs)/library/exercises/create')}
          activeOpacity={0.7}
        >
          <Text style={styles.createButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Category filter chips */}
      <FlatList
        data={FILTER_CHIPS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.value}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <FilterChip
            label={item.label}
            selected={selectedCategory === item.value}
            onPress={() => setSelectedCategory(item.value)}
          />
        )}
      />

      {/* Count label */}
      <Text style={styles.countLabel}>
        {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''}
      </Text>

      {/* Exercise list */}
      <FlatList
        data={filteredExercises}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        maxToRenderPerBatch={15}
        windowSize={7}
        removeClippedSubviews
        initialNumToRender={20}
        renderItem={renderItem}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={<EmptyState query={debouncedQuery} />}
        contentContainerStyle={filteredExercises.length === 0 ? styles.emptyContainer : undefined}
      />
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const Separator = () => <View style={styles.separator} />;

const EmptyState = ({ query }: { query: string }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyTitle}>
      {query.length > 0 ? `No results for "${query}"` : 'No exercises found'}
    </Text>
    <Text style={styles.emptySubtitle}>
      {query.length > 0
        ? 'Try a different search term or category'
        : 'Tap "+ New" to create a custom exercise'}
    </Text>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    gap: 6,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 0,
  },
  clearIcon: {
    color: 'rgba(235,235,245,0.3)',
    fontSize: 14,
    paddingLeft: 4,
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  countLabel: {
    color: 'rgba(235,235,245,0.4)',
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  row: {
    height: EXERCISE_ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#000000',
  },
  rowContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  rowName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  muscleText: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 13,
    textTransform: 'capitalize',
    flex: 1,
  },
  addHint: {
    marginRight: 8,
  },
  addHintText: {
    color: 'rgba(235,235,245,0.3)',
    fontSize: 11,
  },
  chevron: {
    paddingLeft: 8,
  },
  chevronText: {
    color: 'rgba(235,235,245,0.3)',
    fontSize: 22,
    lineHeight: 24,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#38383A',
    marginLeft: 16,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
