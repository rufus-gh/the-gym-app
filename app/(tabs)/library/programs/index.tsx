import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDatabase } from '@nozbe/watermelondb/hooks';

import { BUILT_IN_PROGRAMS } from '../../../../src/constants/programs';
import type { ProgramModel } from '../../../../src/db/models/Program';
import type { TrainingGoal } from '../../../../src/types/enums';

// ─── Constants ────────────────────────────────────────────────────────────────

const GOAL_LABEL: Record<string, string> = {
  strength: 'Strength',
  hypertrophy: 'Hypertrophy',
  powerbuilding: 'Powerbuilding',
  endurance: 'Endurance',
  general: 'General',
};

const GOAL_COLOR: Record<string, string> = {
  strength: '#FF9500',
  hypertrophy: '#AF52DE',
  powerbuilding: '#007AFF',
  endurance: '#34C759',
  general: '#5AC8FA',
};

const EXPERIENCE_LABEL: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgramRow {
  id: string;
  name: string;
  description: string;
  totalWeeks: number;
  daysPerWeek: number;
  goal: string;
  author: string | null;
  experienceLevel: string;
  isBuiltIn: boolean;
  isActive: boolean;
}

// ─── ProgramCard ──────────────────────────────────────────────────────────────

interface ProgramCardProps {
  item: ProgramRow;
  onPress: (id: string, isBuiltIn: boolean) => void;
  onStart: (id: string, isBuiltIn: boolean) => void;
}

const ProgramCard = memo(
  ({ item, onPress, onStart }: ProgramCardProps) => {
    const goalColor = GOAL_COLOR[item.goal] ?? '#5AC8FA';
    const goalLabel = GOAL_LABEL[item.goal] ?? item.goal;
    const expLabel = EXPERIENCE_LABEL[item.experienceLevel] ?? item.experienceLevel;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress(item.id, item.isBuiltIn)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${goalLabel}, ${item.totalWeeks} weeks`}
      >
        {item.isActive && (
          <View style={styles.activeBanner}>
            <Text style={styles.activeBannerText}>Active</Text>
          </View>
        )}

        {/* Header row */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.goalBadge, { backgroundColor: goalColor + '26' }]}>
            <Text style={[styles.goalBadgeText, { color: goalColor }]}>{goalLabel}</Text>
          </View>
        </View>

        {/* Meta row */}
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaValue}>{item.totalWeeks}</Text>
            <Text style={styles.metaLabel}>weeks</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaValue}>{item.daysPerWeek}</Text>
            <Text style={styles.metaLabel}>days/wk</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={[styles.metaValue, styles.metaValueSmall]}>{expLabel}</Text>
          </View>
        </View>

        {/* Author */}
        {item.author ? (
          <Text style={styles.cardAuthor} numberOfLines={1}>
            by {item.author}
          </Text>
        ) : null}

        {/* Description */}
        <Text style={styles.cardDescription} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[styles.startButton, item.isActive && styles.startButtonActive]}
            onPress={() => onStart(item.id, item.isBuiltIn)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={item.isActive ? 'Stop program' : 'Start program'}
          >
            <Text style={[styles.startButtonText, item.isActive && styles.startButtonTextActive]}>
              {item.isActive ? 'Stop' : 'Start'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.isActive === next.item.isActive,
);

ProgramCard.displayName = 'ProgramCard';

// ─── SectionHeader ────────────────────────────────────────────────────────────

const SectionHeader = ({ title, count }: { title: string; count: number }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionCount}>{count}</Text>
  </View>
);

// ─── ProgramsScreen ───────────────────────────────────────────────────────────

export default function ProgramsScreen() {
  const database = useDatabase();
  const [userPrograms, setUserPrograms] = useState<ProgramRow[]>([]);
  const [activeProgramIds, setActiveProgramIds] = useState<Set<string>>(new Set());

  // Load user-created programs from WatermelonDB
  useEffect(() => {
    let cancelled = false;
    database
      .get<ProgramModel>('programs')
      .query()
      .fetch()
      .then((models) => {
        if (cancelled) return;
        const activeIds = new Set<string>();
        const rows: ProgramRow[] = models
          .filter((m) => !m.isBuiltIn)
          .map((m) => {
            const isActive = (m as unknown as { isActive?: boolean }).isActive ?? false;
            if (isActive) activeIds.add(m.id);
            return {
              id: m.id,
              name: m.name,
              description: m.description ?? '',
              totalWeeks: m.durationWeeks,
              daysPerWeek: m.daysPerWeek,
              goal: m.targetGoal,
              author: m.author,
              experienceLevel: m.experienceLevel,
              isBuiltIn: false,
              isActive,
            };
          });
        setUserPrograms(rows);
        setActiveProgramIds(activeIds);
      })
      .catch(() => {
        // DB may not be seeded yet
      });
    return () => {
      cancelled = true;
    };
  }, [database]);

  // Build built-in rows, marking active ones
  const builtInRows: ProgramRow[] = BUILT_IN_PROGRAMS.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    totalWeeks: p.totalWeeks,
    daysPerWeek: p.daysPerWeek,
    goal: p.goal,
    author: null,
    experienceLevel: p.experienceLevel,
    isBuiltIn: true,
    isActive: activeProgramIds.has(p.id),
  }));

  const handlePress = useCallback((id: string, isBuiltIn: boolean) => {
    router.push(`/(tabs)/library/programs/${id}${isBuiltIn ? '?builtin=1' : ''}`);
  }, []);

  const handleStart = useCallback(
    (id: string, _isBuiltIn: boolean) => {
      // If already active, stop it; otherwise navigate to detail with start intent
      if (activeProgramIds.has(id)) {
        // Stop the program — persist via DB update (detail screen handles full flow)
        setActiveProgramIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        // Persist the stop in the DB asynchronously
        database
          .get<ProgramModel>('programs')
          .find(id)
          .then((model) =>
            database.write(() =>
              model.update((m) => {
                (m as unknown as { isActive: boolean }).isActive = false;
              }),
            ),
          )
          .catch(() => {});
      } else {
        router.push(`/(tabs)/library/programs/${id}?start=1`);
      }
    },
    [activeProgramIds, database],
  );

  const renderUserProgram = useCallback(
    ({ item }: ListRenderItemInfo<ProgramRow>) => (
      <ProgramCard item={item} onPress={handlePress} onStart={handleStart} />
    ),
    [handlePress, handleStart],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Page header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Programs</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/(tabs)/library/programs/create')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Create program"
          >
            <Text style={styles.createButtonText}>+ Create</Text>
          </TouchableOpacity>
        </View>

        {/* My Programs section */}
        <SectionHeader title="My Programs" count={userPrograms.length} />
        {userPrograms.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>
              No custom programs yet. Tap "+ Create" to build one.
            </Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {userPrograms.map((item) => (
              <ProgramCard
                key={item.id}
                item={item}
                onPress={handlePress}
                onStart={handleStart}
              />
            ))}
          </View>
        )}

        {/* Built-In section */}
        <SectionHeader title="Built-In" count={builtInRows.length} />
        <View style={styles.cardList}>
          {builtInRows.map((item) => (
            <ProgramCard
              key={item.id}
              item={item}
              onPress={handlePress}
              onStart={handleStart}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  pageTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
  },
  sectionTitle: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionCount: {
    color: 'rgba(235,235,245,0.3)',
    fontSize: 13,
    fontWeight: '500',
  },
  cardList: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 8,
  },
  emptySection: {
    marginHorizontal: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  emptySectionText: {
    color: 'rgba(235,235,245,0.4)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // ── Card
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    overflow: 'hidden',
  },
  activeBanner: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#34C759',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  activeBannerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 56, // make room for active banner
  },
  cardName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  goalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  goalBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  metaValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  metaValueSmall: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(235,235,245,0.7)',
  },
  metaLabel: {
    color: 'rgba(235,235,245,0.4)',
    fontSize: 12,
  },
  metaDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#38383A',
  },
  cardAuthor: {
    color: 'rgba(235,235,245,0.4)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  cardDescription: {
    color: 'rgba(235,235,245,0.6)',
    fontSize: 13,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  startButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  startButtonActive: {
    borderColor: '#FF3B30',
  },
  startButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  startButtonTextActive: {
    color: '#FF3B30',
  },
  chevron: {
    color: 'rgba(235,235,245,0.3)',
    fontSize: 24,
    lineHeight: 26,
  },
});
