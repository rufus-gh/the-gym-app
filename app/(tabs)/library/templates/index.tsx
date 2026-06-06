import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  ListRenderItemInfo,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { format, formatDistanceToNow } from 'date-fns';

import type { WorkoutTemplateModel } from '../../../../src/db/models/WorkoutTemplate';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLATE_CARD_HEIGHT = 88;
const SWIPE_THRESHOLD = 72;
const SWIPE_FULL = 80;

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateRow {
  id: string;
  name: string;
  exerciseCount: number;
  estimatedDurationMinutes: number | null;
  lastUsedAt: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(minutes: number | null): string {
  if (minutes === null) return '';
  if (minutes < 60) return `~${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `~${h}h` : `~${h}h ${m}m`;
}

function formatLastUsed(lastUsedAt: number | null): string {
  if (lastUsedAt === null) return 'Never used';
  const date = new Date(lastUsedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return 'Used today';
  if (diffDays === 1) return 'Used yesterday';
  if (diffDays < 7) return `Used ${diffDays} days ago`;
  if (diffDays < 30) return `Used ${Math.floor(diffDays / 7)}w ago`;
  return `Used ${format(date, 'MMM d')}`;
}

// ─── SwipeableTemplateCard ────────────────────────────────────────────────────

interface TemplateCardProps {
  item: TemplateRow;
  onPress: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

const TemplateCard = memo(
  ({ item, onPress, onDelete }: TemplateCardProps) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const [swiped, setSwiped] = useState(false);

    const handlePress = useCallback(() => {
      if (swiped) {
        // Snap back first
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 200,
          friction: 20,
        }).start(() => setSwiped(false));
      } else {
        onPress(item.id);
      }
    }, [swiped, translateX, onPress, item.id]);

    const handleSwipeLeft = useCallback(() => {
      Animated.spring(translateX, {
        toValue: -SWIPE_FULL,
        useNativeDriver: true,
        tension: 200,
        friction: 20,
      }).start(() => setSwiped(true));
    }, [translateX]);

    const handleDelete = useCallback(() => {
      onDelete(item.id, item.name);
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 200,
        friction: 20,
      }).start(() => setSwiped(false));
    }, [item.id, item.name, onDelete, translateX]);

    // Simple pan tracking
    const dragStart = useRef(0);
    const isDragging = useRef(false);

    return (
      <View style={styles.cardWrapper}>
        {/* Delete action revealed on swipe */}
        <View style={styles.deleteAction}>
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteButton}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>

        <Animated.View
          style={[styles.cardContainer, { transform: [{ translateX }] }]}
          onStartShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            dragStart.current = e.nativeEvent.pageX;
            isDragging.current = false;
          }}
          onResponderMove={(e) => {
            const dx = e.nativeEvent.pageX - dragStart.current;
            if (Math.abs(dx) > 5) isDragging.current = true;
            if (dx < 0) {
              translateX.setValue(Math.max(dx, -SWIPE_FULL));
            }
          }}
          onResponderRelease={(e) => {
            const dx = e.nativeEvent.pageX - dragStart.current;
            if (!isDragging.current) {
              handlePress();
              return;
            }
            if (dx < -SWIPE_THRESHOLD) {
              handleSwipeLeft();
            } else {
              Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
                tension: 200,
                friction: 20,
              }).start(() => setSwiped(false));
            }
          }}
        >
          <TouchableOpacity
            style={styles.card}
            onPress={handlePress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${item.name} template`}
          >
            <View style={styles.cardContent}>
              <Text style={styles.templateName} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.cardMeta}>
                <Text style={styles.metaText}>
                  {item.exerciseCount} exercise{item.exerciseCount !== 1 ? 's' : ''}
                  {item.estimatedDurationMinutes !== null
                    ? `  ·  ${formatDuration(item.estimatedDurationMinutes)}`
                    : ''}
                </Text>
                <Text style={styles.lastUsedText}>{formatLastUsed(item.lastUsedAt)}</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.name === next.item.name &&
    prev.item.exerciseCount === next.item.exerciseCount &&
    prev.item.lastUsedAt === next.item.lastUsedAt,
);

TemplateCard.displayName = 'TemplateCard';

// ─── TemplatesScreen ──────────────────────────────────────────────────────────

export default function TemplatesScreen() {
  const database = useDatabase();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    try {
      const templateModels = await database
        .get<WorkoutTemplateModel>('workout_templates')
        .query(Q.where('is_archived', false), Q.sortBy('updated_at', Q.desc))
        .fetch();

      // For each template, count its exercises
      const rows: TemplateRow[] = await Promise.all(
        templateModels.map(async (t) => {
          let exerciseCount = 0;
          try {
            const exs = await t.exercises.fetch();
            exerciseCount = exs.length;
          } catch {
            exerciseCount = 0;
          }
          return {
            id: t.id,
            name: t.name,
            exerciseCount,
            estimatedDurationMinutes: t.estimatedDurationMinutes,
            lastUsedAt: t.lastUsedAt,
          };
        }),
      );

      setTemplates(rows);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [database]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const handlePress = useCallback((id: string) => {
    router.push(`/(tabs)/library/templates/${id}`);
  }, []);

  const handleDelete = useCallback(
    (id: string, name: string) => {
      Alert.alert(
        'Delete Template',
        `Delete "${name}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                const model = await database
                  .get<WorkoutTemplateModel>('workout_templates')
                  .find(id);
                await database.write(async () => {
                  await model.update((m) => {
                    m.isArchived = true;
                  });
                });
                setTemplates((prev) => prev.filter((t) => t.id !== id));
              } catch {
                Alert.alert('Error', 'Could not delete template. Please try again.');
              }
            },
          },
        ],
      );
    },
    [database],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: TEMPLATE_CARD_HEIGHT,
      offset: TEMPLATE_CARD_HEIGHT * index,
      index,
    }),
    [],
  );

  const keyExtractor = useCallback((item: TemplateRow) => item.id, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<TemplateRow>) => (
      <TemplateCard item={item} onPress={handlePress} onDelete={handleDelete} />
    ),
    [handlePress, handleDelete],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Templates</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/(tabs)/library/templates/create')}
          activeOpacity={0.7}
        >
          <Text style={styles.createButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          renderItem={renderItem}
          maxToRenderPerBatch={12}
          windowSize={5}
          removeClippedSubviews
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={templates.length === 0 ? styles.emptyContainer : undefined}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const Separator = () => <View style={styles.separator} />;

const EmptyState = () => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyTitle}>No templates yet</Text>
    <Text style={styles.emptySubtitle}>
      Create one to speed up your workouts.
    </Text>
    <TouchableOpacity
      style={styles.emptyCreateButton}
      onPress={() => router.push('/(tabs)/library/templates/create')}
      activeOpacity={0.7}
    >
      <Text style={styles.emptyCreateButtonText}>Create Template</Text>
    </TouchableOpacity>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'rgba(235,235,245,0.4)',
    fontSize: 16,
  },
  cardWrapper: {
    height: TEMPLATE_CARD_HEIGHT,
    overflow: 'hidden',
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SWIPE_FULL,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
  },
  deleteButton: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cardContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#000000',
  },
  cardContent: {
    flex: 1,
    gap: 5,
  },
  templateName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaText: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 13,
  },
  lastUsedText: {
    color: 'rgba(235,235,245,0.35)',
    fontSize: 13,
  },
  chevron: {
    color: 'rgba(235,235,245,0.3)',
    fontSize: 22,
    lineHeight: 24,
    paddingLeft: 8,
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
    paddingHorizontal: 40,
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyCreateButton: {
    marginTop: 8,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  emptyCreateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
