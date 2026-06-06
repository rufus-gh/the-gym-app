import React, { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '../../../src/constants/colors';
import { spacing, radius } from '../../../src/constants/spacing';
import { typography } from '../../../src/constants/typography';

// ─── Mock data — replace with WatermelonDB queries in Phase 1 ─────────────────

const MOCK_USER = {
  displayName: 'Rufus G',
  initials: 'RG',
  isLocalOnly: false,
};

const MOCK_STATS = {
  totalSessions: 0,
  totalVolumeKg: 0,
  streakDays: 0,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
}

function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title.toUpperCase()}</Text>
    </View>
  );
}

interface ActionRowProps {
  icon: string;
  label: string;
  onPress: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  destructive?: boolean;
}

function ActionRow({
  icon,
  label,
  onPress,
  isFirst = false,
  isLast = false,
  destructive = false,
}: ActionRowProps) {
  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.actionRow,
          isFirst && styles.rowFirst,
          isLast && styles.rowLast,
          pressed && styles.rowPressed,
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View style={styles.actionRowIcon}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
        <Text style={[styles.actionRowLabel, destructive && styles.actionRowLabelDestructive]}>
          {label}
        </Text>
        <Text style={styles.chevron}>{'›'}</Text>
      </Pressable>
      {!isLast && <View style={styles.separator} />}
    </>
  );
}

interface StatCellProps {
  value: string;
  label: string;
}

function StatCell({ value, label }: StatCellProps) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const user = MOCK_USER;
  const stats = MOCK_STATS;

  const handleSettings = useCallback(() => {
    router.push('/(tabs)/profile/settings');
  }, []);

  const handleExport = useCallback(() => {
    router.push('/(tabs)/profile/export' as never);
  }, []);

  const handleImport = useCallback(() => {
    // Strong import modal — Phase 1
    router.push('/modals/exercise-picker' as never);
  }, []);

  const handleHistory = useCallback(() => {
    router.push('/(tabs)/profile/history' as never);
  }, []);

  const handleAccount = useCallback(() => {
    router.push('/(tabs)/profile/account' as never);
  }, []);

  const totalVolumeDisplay = (() => {
    const v = stats.totalVolumeKg;
    if (v === 0) return '—';
    if (v >= 1000) return `${(v / 1000).toFixed(1)}t`;
    return `${v.toLocaleString()} kg`;
  })();

  const streakDisplay = stats.streakDays === 0 ? '—' : `${stats.streakDays}d`;
  const sessionsDisplay = stats.totalSessions === 0 ? '—' : `${stats.totalSessions}`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── User Header ── */}
        <View style={styles.userHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarInitials}>{user.initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName}>{user.displayName}</Text>
              {user.isLocalOnly && (
                <View style={styles.localBadge}>
                  <Text style={styles.localBadgeText}>Local Only</Text>
                </View>
              )}
            </View>
            {user.isLocalOnly ? (
              <Text style={styles.userSubtitle}>Data stored on this device only</Text>
            ) : (
              <Text style={styles.userSubtitle}>Synced across devices</Text>
            )}
          </View>
        </View>

        {/* ── Stats Summary ── */}
        <View style={styles.statsCard}>
          <StatCell value={sessionsDisplay} label="Sessions" />
          <View style={styles.statDivider} />
          <StatCell value={totalVolumeDisplay} label="Volume" />
          <View style={styles.statDivider} />
          <StatCell value={streakDisplay} label="Streak" />
        </View>

        {/* ── Quick Actions ── */}
        <SectionHeader title="Quick Actions" />
        <View style={styles.card}>
          <ActionRow
            icon="⚙️"
            label="Settings"
            onPress={handleSettings}
            isFirst
          />
          <ActionRow
            icon="📤"
            label="Export Data"
            onPress={handleExport}
          />
          <ActionRow
            icon="📥"
            label="Import from Strong"
            onPress={handleImport}
            isLast
          />
        </View>

        {/* ── Data Management ── */}
        <SectionHeader title="Data Management" />
        <View style={styles.card}>
          <ActionRow
            icon="📅"
            label="Workout History"
            onPress={handleHistory}
            isFirst
          />
          <ActionRow
            icon="👤"
            label="Account"
            onPress={handleAccount}
            isLast
          />
        </View>

        {/* ── Local-Only Banner ── */}
        {user.isLocalOnly && (
          <View style={styles.localBanner}>
            <Text style={styles.localBannerTitle}>Account not linked</Text>
            <Text style={styles.localBannerBody}>
              Create an account to sync your data across devices and unlock cloud backup.
            </Text>
            <Pressable
              style={styles.localBannerCta}
              onPress={handleAccount}
              accessibilityRole="button"
            >
              <Text style={styles.localBannerCtaText}>Create Account</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },

  // ── User Header ──
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.system.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    ...typography.title2,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  displayName: {
    ...typography.title2,
    color: colors.label.primary.dark,
  },
  localBadge: {
    backgroundColor: colors.semantic.warning + '33',
    borderRadius: radius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.semantic.warning,
  },
  localBadgeText: {
    ...typography.caption,
    color: colors.semantic.warning,
    fontWeight: '600',
  },
  userSubtitle: {
    ...typography.subheadline,
    color: colors.label.secondary.dark,
  },

  // ── Stats ──
  statsCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    ...typography.title2,
    color: colors.label.primary.dark,
  },
  statLabel: {
    ...typography.footnote,
    color: colors.label.secondary.dark,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    backgroundColor: colors.separator.dark,
  },

  // ── Section Header ──
  sectionHeader: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  sectionHeaderText: {
    ...typography.footnote,
    color: colors.label.secondary.dark,
    letterSpacing: 0.5,
  },

  // ── Card + Rows ──
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    minHeight: 44,
    backgroundColor: '#1C1C1E',
    gap: spacing.md,
  },
  rowFirst: {
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
  rowLast: {
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
  },
  rowPressed: {
    backgroundColor: colors.background.elevated.dark,
  },
  actionRowIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  actionRowLabel: {
    ...typography.body,
    color: colors.label.primary.dark,
    flex: 1,
  },
  actionRowLabelDestructive: {
    color: colors.semantic.error,
  },
  chevron: {
    fontSize: 22,
    lineHeight: 24,
    color: colors.label.tertiary.dark,
    fontWeight: '300',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator.dark,
    marginLeft: spacing.md + 28 + spacing.md,
  },

  // ── Local-Only Banner ──
  localBanner: {
    backgroundColor: colors.semantic.warning + '1A',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.semantic.warning + '66',
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  localBannerTitle: {
    ...typography.headline,
    color: colors.semantic.warning,
  },
  localBannerBody: {
    ...typography.subheadline,
    color: colors.label.secondary.dark,
  },
  localBannerCta: {
    backgroundColor: colors.system.blue,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  localBannerCtaText: {
    ...typography.headline,
    color: '#FFFFFF',
  },

  bottomPadding: {
    height: spacing.xl,
  },
});
