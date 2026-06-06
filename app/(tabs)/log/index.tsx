import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ListRenderItem,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { useActiveSessionStore } from '../../../src/stores/activeSessionStore';
import { generateId } from '../../../src/utils/nanoid';
import { WorkoutSession } from '../../../src/db/models/WorkoutSession';
import { WorkoutTemplateModel } from '../../../src/db/models/WorkoutTemplate';
import { colors } from '../../../src/constants/colors';
import { spacing, radius } from '../../../src/constants/spacing';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate an auto session name based on time of day and day of week.
 * e.g. "Monday Morning Workout"
 */
function autoSessionName(): string {
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = days[now.getDay()];

  const hour = now.getHours();
  let timeOfDay: string;
  if (hour < 12) {
    timeOfDay = 'Morning';
  } else if (hour < 17) {
    timeOfDay = 'Afternoon';
  } else {
    timeOfDay = 'Evening';
  }

  return `${day} ${timeOfDay} Workout`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecentTemplate {
  id: string;
  name: string;
  lastUsedAt: number | null;
  exerciseCount: number;
}

// ---------------------------------------------------------------------------
// RecentTemplateItem
// ---------------------------------------------------------------------------

interface RecentTemplateItemProps {
  template: RecentTemplate;
  onPress: (templateId: string, templateName: string) => void;
}

const RecentTemplateItem = React.memo(({ template, onPress }: RecentTemplateItemProps) => {
  const handlePress = useCallback(() => {
    onPress(template.id, template.name);
  }, [template.id, template.name, onPress]);

  return (
    <TouchableOpacity
      style={styles.templateItem}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Start workout from template: ${template.name}`}
    >
      <View style={styles.templateItemLeft}>
        <Text style={styles.templateItemName} numberOfLines={1}>
          {template.name}
        </Text>
        <Text style={styles.templateItemMeta}>
          {template.exerciseCount} exercise{template.exerciseCount !== 1 ? 's' : ''}
        </Text>
      </View>
      <Text style={styles.templateItemChevron}>{'›'}</Text>
    </TouchableOpacity>
  );
});

RecentTemplateItem.displayName = 'RecentTemplateItem';

// ---------------------------------------------------------------------------
// LogScreen
// ---------------------------------------------------------------------------

export default function LogScreen() {
  const database = useDatabase();

  // Zustand store — session state
  const sessionId = useActiveSessionStore((s) => s.sessionId);
  const sessionName = useActiveSessionStore((s) => s.sessionName);
  const startSession = useActiveSessionStore((s) => s.startSession);

  const [recentTemplates, setRecentTemplates] = useState<RecentTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [startingSession, setStartingSession] = useState(false);

  // -------------------------------------------------------------------------
  // Load recent templates (last 3 used)
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadRecent() {
      try {
        const templates = await database
          .get<WorkoutTemplateModel>('workout_templates')
          .query(
            Q.where('is_archived', false),
            Q.sortBy('last_used_at', Q.desc),
            Q.take(3),
          )
          .fetch();

        if (cancelled) return;

        const enriched: RecentTemplate[] = await Promise.all(
          templates.map(async (t) => {
            const exercises = await t.templateExercises.fetch();
            return {
              id: t.id,
              name: t.name,
              lastUsedAt: t.lastUsedAt,
              exerciseCount: exercises.length,
            };
          }),
        );

        if (!cancelled) {
          setRecentTemplates(enriched);
        }
      } catch {
        // Non-fatal — template list is optional
        if (!cancelled) {
          setRecentTemplates([]);
        }
      } finally {
        if (!cancelled) {
          setTemplatesLoading(false);
        }
      }
    }

    void loadRecent();
    return () => {
      cancelled = true;
    };
  }, [database]);

  // -------------------------------------------------------------------------
  // Check for unfinished sessions on mount (device restart recovery)
  // -------------------------------------------------------------------------
  useEffect(() => {
    // If Zustand has no active session but WatermelonDB has an incomplete one,
    // rehydrate. This handles the case where the user killed the app mid-session.
    if (sessionId !== null) return;

    async function checkIncomplete() {
      try {
        // Find sessions started but never ended — these are orphaned mid-sessions
        // from app kills or device restarts.
        const activeSessions = await database
          .get<WorkoutSession>('workout_sessions')
          .query(
            Q.where('is_deleted', false),
            Q.where('ended_at', null),
          )
          .fetch();

        const inProgressSession = activeSessions[0] ?? null;
        if (inProgressSession) {
          // Rehydrate Zustand store with the incomplete session
          startSession({
            sessionId: inProgressSession.id,
            name: inProgressSession.name,
          });
        }
      } catch {
        // No-op — recovery is best-effort
      }
    }

    void checkIncomplete();
  }, [database, sessionId, startSession]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleStartEmpty = useCallback(async () => {
    if (startingSession) return;
    setStartingSession(true);

    try {
      const newSessionId = generateId();
      const name = autoSessionName();

      await database.write(async () => {
        await database.get<WorkoutSession>('workout_sessions').create((session) => {
          // userId placeholder — will be replaced with real user ID once auth is implemented
          (session as unknown as Record<string, unknown>)['_raw']['user_id'] = 'local';
          session.name = name;
          (session as unknown as Record<string, unknown>)['_raw']['started_at'] =
            Date.now();
          session.isDeleted = false;
          (session as unknown as Record<string, unknown>)['_raw']['id'] = newSessionId;
        });
      });

      startSession({ sessionId: newSessionId, name });
      router.push(`/(tabs)/log/${newSessionId}`);
    } catch (error) {
      // In a real app: show error toast
      // For now, still navigate — Zustand is the source of truth for active session
      const fallbackId = generateId();
      const fallbackName = autoSessionName();
      startSession({ sessionId: fallbackId, name: fallbackName });
      router.push(`/(tabs)/log/${fallbackId}`);
    } finally {
      setStartingSession(false);
    }
  }, [database, startSession, startingSession]);

  const handleContinueSession = useCallback(() => {
    if (sessionId === null) return;
    router.push(`/(tabs)/log/${sessionId}`);
  }, [sessionId]);

  const handleStartFromTemplate = useCallback(
    async (templateId: string, templateName: string) => {
      if (startingSession) return;
      setStartingSession(true);

      try {
        const newSessionId = generateId();

        await database.write(async () => {
          await database.get<WorkoutSession>('workout_sessions').create((session) => {
            (session as unknown as Record<string, unknown>)['_raw']['user_id'] = 'local';
            session.name = templateName;
            (session as unknown as Record<string, unknown>)['_raw']['template_id'] =
              templateId;
            (session as unknown as Record<string, unknown>)['_raw']['started_at'] =
              Date.now();
            session.isDeleted = false;
            (session as unknown as Record<string, unknown>)['_raw']['id'] = newSessionId;
          });

          // Update template lastUsedAt
          const template = await database
            .get<WorkoutTemplateModel>('workout_templates')
            .find(templateId);
          await template.update((t) => {
            (t as unknown as Record<string, unknown>)['_raw']['last_used_at'] = Date.now();
            t.usageCount = t.usageCount + 1;
          });
        });

        startSession({ sessionId: newSessionId, name: templateName });
        router.push(`/(tabs)/log/${newSessionId}`);
      } catch {
        // Fallback: start empty session with template name
        const fallbackId = generateId();
        startSession({ sessionId: fallbackId, name: templateName });
        router.push(`/(tabs)/log/${fallbackId}`);
      } finally {
        setStartingSession(false);
      }
    },
    [database, startSession, startingSession],
  );

  const handleBrowseTemplates = useCallback(() => {
    router.push('/(tabs)/library/');
  }, []);

  // -------------------------------------------------------------------------
  // FlatList render
  // -------------------------------------------------------------------------

  const renderTemplate: ListRenderItem<RecentTemplate> = useCallback(
    ({ item }) => (
      <RecentTemplateItem template={item} onPress={handleStartFromTemplate} />
    ),
    [handleStartFromTemplate],
  );

  const keyExtractor = useCallback((item: RecentTemplate) => item.id, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const hasActiveSession = sessionId !== null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Page title */}
        <Text style={styles.pageTitle}>Log</Text>

        {/* ── Active Session Banner ──────────────────────────────────────── */}
        {hasActiveSession && (
          <TouchableOpacity
            style={styles.activeSessionBanner}
            onPress={handleContinueSession}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Continue active session: ${sessionName}`}
          >
            <View style={styles.activeSessionLeft}>
              <View style={styles.activeDot} />
              <View>
                <Text style={styles.activeSessionLabel}>Active Session</Text>
                <Text style={styles.activeSessionName} numberOfLines={1}>
                  {sessionName}
                </Text>
              </View>
            </View>
            <Text style={styles.activeSessionCta}>Continue {'›'}</Text>
          </TouchableOpacity>
        )}

        {/* ── Start Empty Workout ───────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.primaryButton, startingSession && styles.primaryButtonDisabled]}
          onPress={handleStartEmpty}
          activeOpacity={0.8}
          disabled={startingSession}
          accessibilityRole="button"
          accessibilityLabel="Start empty workout"
        >
          {startingSession ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.primaryButtonIcon}>{'+'}</Text>
              <Text style={styles.primaryButtonLabel}>Start Empty Workout</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── Recent Templates ──────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Start</Text>
          <TouchableOpacity
            onPress={handleBrowseTemplates}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Browse all templates"
          >
            <Text style={styles.sectionAction}>Browse Templates</Text>
          </TouchableOpacity>
        </View>

        {templatesLoading ? (
          <View style={styles.templatesLoading}>
            <ActivityIndicator color={colors.label.secondary.dark} size="small" />
          </View>
        ) : recentTemplates.length === 0 ? (
          <View style={styles.emptyTemplates}>
            <Text style={styles.emptyTemplatesText}>
              No templates yet. Create one in the Library.
            </Text>
            <TouchableOpacity
              style={styles.browseTemplatesButton}
              onPress={handleBrowseTemplates}
              activeOpacity={0.7}
            >
              <Text style={styles.browseTemplatesLabel}>Go to Library</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList<RecentTemplate>
            data={recentTemplates}
            keyExtractor={keyExtractor}
            renderItem={renderTemplate}
            scrollEnabled={false}
            style={styles.templateList}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.primary.dark,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },

  pageTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.label.primary.dark,
    marginBottom: spacing.lg,
  },

  // Active session banner
  activeSessionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.25)',
  },
  activeSessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.system.green,
  },
  activeSessionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.system.green,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  activeSessionName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.label.primary.dark,
  },
  activeSessionCta: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.system.green,
    marginLeft: spacing.sm,
  },

  // Primary CTA button
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.system.blue,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    gap: spacing.sm,
    marginBottom: spacing.xl,
    minHeight: 56,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonIcon: {
    fontSize: 22,
    fontWeight: '300',
    color: '#FFFFFF',
    lineHeight: 24,
  },
  primaryButtonLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.label.primary.dark,
  },
  sectionAction: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.system.blue,
  },

  // Template list
  templateList: {
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  templateItemLeft: {
    flex: 1,
    gap: 3,
  },
  templateItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.label.primary.dark,
  },
  templateItemMeta: {
    fontSize: 13,
    color: colors.label.secondary.dark,
  },
  templateItemChevron: {
    fontSize: 20,
    color: colors.label.tertiary.dark,
    marginLeft: spacing.sm,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator.dark,
    marginLeft: spacing.md,
  },

  // Empty / loading states
  templatesLoading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyTemplates: {
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTemplatesText: {
    fontSize: 14,
    color: colors.label.secondary.dark,
    textAlign: 'center',
  },
  browseTemplatesButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.tertiary.dark,
    borderRadius: radius.sm,
  },
  browseTemplatesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.system.blue,
  },
});
