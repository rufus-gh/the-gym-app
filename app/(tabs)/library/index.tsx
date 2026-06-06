import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

// ─── Types ────────────────────────────────────────────────────────────────────

type LibraryTab = 'exercises' | 'templates' | 'programs';

interface TabConfig {
  key: LibraryTab;
  label: string;
  route: string;
  description: string;
  icon: string;
}

const TABS: TabConfig[] = [
  {
    key: 'exercises',
    label: 'Exercises',
    route: '/(tabs)/library/exercises',
    description: 'Browse 510+ exercises or create your own',
    icon: '💪',
  },
  {
    key: 'templates',
    label: 'Templates',
    route: '/(tabs)/library/templates',
    description: 'Saved workout templates for quick starts',
    icon: '📋',
  },
  {
    key: 'programs',
    label: 'Programs',
    route: '/(tabs)/library/programs',
    description: 'Multi-week training programs',
    icon: '📆',
  },
];

// ─── SegmentedControl ─────────────────────────────────────────────────────────

interface SegmentedControlProps {
  tabs: TabConfig[];
  selected: LibraryTab;
  onSelect: (tab: LibraryTab) => void;
}

const SegmentedControl = ({ tabs, selected, onSelect }: SegmentedControlProps) => (
  <View style={styles.segmentedWrapper}>
    <View style={styles.segmented}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.segment, selected === tab.key && styles.segmentActive]}
          onPress={() => onSelect(tab.key)}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, selected === tab.key && styles.segmentTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

// ─── LibraryCard ──────────────────────────────────────────────────────────────

interface LibraryCardProps {
  config: TabConfig;
  onPress: () => void;
}

const LibraryCard = ({ config, onPress }: LibraryCardProps) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.cardIconWrapper}>
      <Text style={styles.cardIcon}>{config.icon}</Text>
    </View>
    <View style={styles.cardContent}>
      <Text style={styles.cardTitle}>{config.label}</Text>
      <Text style={styles.cardDescription}>{config.description}</Text>
    </View>
    <Text style={styles.cardChevron}>›</Text>
  </TouchableOpacity>
);

// ─── LibraryScreen ────────────────────────────────────────────────────────────

export default function LibraryScreen() {
  const [selectedTab, setSelectedTab] = useState<LibraryTab>('exercises');

  const handleTabSelect = useCallback((tab: LibraryTab) => {
    setSelectedTab(tab);
    const config = TABS.find((t) => t.key === tab);
    if (config) {
      router.push(config.route as Parameters<typeof router.push>[0]);
    }
  }, []);

  const selectedConfig = TABS.find((t) => t.key === selectedTab) ?? TABS[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
      </View>

      {/* Segmented control — tapping a tab navigates to its sub-route */}
      <SegmentedControl tabs={TABS} selected={selectedTab} onSelect={handleTabSelect} />

      {/* Quick-access cards for each section */}
      <View style={styles.cardList}>
        {TABS.map((tab) => (
          <LibraryCard
            key={tab.key}
            config={tab}
            onPress={() => router.push(tab.route as Parameters<typeof router.push>[0])}
          />
        ))}
      </View>

      {/* Recent section placeholder */}
      <View style={styles.recentSection}>
        <Text style={styles.recentHeader}>Recently Viewed</Text>
        <View style={styles.recentEmpty}>
          <Text style={styles.recentEmptyText}>
            Exercises, templates, and programs you view will appear here.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  segmentedWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: '#2C2C2E',
  },
  segmentText: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 14,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cardList: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  cardIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    fontSize: 22,
  },
  cardContent: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cardDescription: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 13,
    lineHeight: 18,
  },
  cardChevron: {
    color: 'rgba(235,235,245,0.3)',
    fontSize: 22,
    lineHeight: 24,
  },
  recentSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  recentHeader: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  recentEmpty: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  recentEmptyText: {
    color: 'rgba(235,235,245,0.4)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
