import React, { useCallback, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSettings } from '../../../src/hooks/useSettings';
import { colors } from '../../../src/constants/colors';
import { spacing, radius } from '../../../src/constants/spacing';
import { typography } from '../../../src/constants/typography';

// ─── Types ────────────────────────────────────────────────────────────────────

type OneRmFormula = 'epley' | 'brzycki' | 'lombardi' | 'oconner';
type Theme = 'dark' | 'light' | 'oled' | 'system';
type UnitPreference = 'kg' | 'lb';

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

interface RowProps {
  label: string;
  children: React.ReactNode;
  onPress?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

function Row({ label, children, onPress, isFirst = false, isLast = false }: RowProps) {
  const containerStyle = [
    styles.row,
    isFirst && styles.rowFirst,
    isLast && styles.rowLast,
  ];

  if (onPress) {
    return (
      <>
        <Pressable
          style={({ pressed }) => [containerStyle, pressed && styles.rowPressed]}
          onPress={onPress}
          accessibilityRole="button"
        >
          <Text style={styles.rowLabel}>{label}</Text>
          <View style={styles.rowRight}>{children}</View>
        </Pressable>
        {!isLast && <View style={styles.separator} />}
      </>
    );
  }

  return (
    <>
      <View style={containerStyle}>
        <Text style={styles.rowLabel}>{label}</Text>
        <View style={styles.rowRight}>{children}</View>
      </View>
      {!isLast && <View style={styles.separator} />}
    </>
  );
}

function ChevronRight() {
  return <Text style={styles.chevron}>{'›'}</Text>;
}

// ─── Pickers ──────────────────────────────────────────────────────────────────

const ONE_RM_FORMULA_OPTIONS: { label: string; value: OneRmFormula }[] = [
  { label: 'Epley', value: 'epley' },
  { label: 'Brzycki', value: 'brzycki' },
  { label: 'Lombardi', value: 'lombardi' },
  { label: "O'Conner", value: 'oconner' },
];

const THEME_OPTIONS: { label: string; value: Theme }[] = [
  { label: 'Dark', value: 'dark' },
  { label: 'Light', value: 'light' },
  { label: 'OLED Black', value: 'oled' },
  { label: 'System', value: 'system' },
];

const REST_DURATION_OPTIONS = [30, 60, 90, 120, 150, 180, 240, 300];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const {
    unitPreference,
    barWeightKg,
    restTimerAutoStart,
    defaultRestSeconds,
    theme,
    oneRmFormula,
    hapticsEnabled,
    soundAlertsEnabled,
    setUnitPreference,
    setBarWeightKg,
    setRestTimerAutoStart,
    setDefaultRestSeconds,
    setTheme,
    setOneRmFormula,
    setHapticsEnabled,
    setSoundAlertsEnabled,
  } = useSettings();

  // ── Handlers: Units & Defaults ─────────────────────────────────────────────

  const handleToggleUnit = useCallback(() => {
    setUnitPreference(unitPreference === 'kg' ? 'lb' : 'kg');
  }, [unitPreference, setUnitPreference]);

  const handlePickBarWeight = useCallback(() => {
    const kgOptions = [10, 15, 20, 25];
    const lbOptions = [15, 35, 45];
    const isKg = unitPreference === 'kg';
    const options = isKg ? kgOptions : lbOptions;
    const labels = options.map((w) => `${w} ${unitPreference}`);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Default Bar Weight',
          options: [...labels, 'Cancel'],
          cancelButtonIndex: labels.length,
        },
        (index) => {
          if (index < options.length) {
            const weightInKg = isKg
              ? options[index]
              : Math.round(options[index] * 0.453592 * 10) / 10;
            setBarWeightKg(weightInKg);
          }
        },
      );
    } else {
      Alert.alert(
        'Default Bar Weight',
        undefined,
        [
          ...labels.map((label, i) => ({
            text: label,
            onPress: () => {
              const weightInKg = isKg
                ? options[i]
                : Math.round(options[i] * 0.453592 * 10) / 10;
              setBarWeightKg(weightInKg);
            },
          })),
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    }
  }, [unitPreference, setBarWeightKg]);

  const handlePickFormula = useCallback(() => {
    const labels = ONE_RM_FORMULA_OPTIONS.map((o) => o.label);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: '1RM Formula',
          options: [...labels, 'Cancel'],
          cancelButtonIndex: labels.length,
        },
        (index) => {
          if (index < ONE_RM_FORMULA_OPTIONS.length) {
            setOneRmFormula(ONE_RM_FORMULA_OPTIONS[index].value);
          }
        },
      );
    } else {
      Alert.alert(
        '1RM Formula',
        undefined,
        [
          ...ONE_RM_FORMULA_OPTIONS.map((opt) => ({
            text: opt.label,
            onPress: () => setOneRmFormula(opt.value),
          })),
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    }
  }, [setOneRmFormula]);

  // ── Handlers: Rest Timer ───────────────────────────────────────────────────

  const handlePickRestDuration = useCallback(() => {
    const labels = REST_DURATION_OPTIONS.map((s) =>
      s < 60 ? `${s}s` : s % 60 === 0 ? `${s / 60}m` : `${Math.floor(s / 60)}m ${s % 60}s`,
    );
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Default Rest Duration',
          options: [...labels, 'Cancel'],
          cancelButtonIndex: labels.length,
        },
        (index) => {
          if (index < REST_DURATION_OPTIONS.length) {
            setDefaultRestSeconds(REST_DURATION_OPTIONS[index]);
          }
        },
      );
    } else {
      Alert.alert(
        'Default Rest Duration',
        undefined,
        [
          ...REST_DURATION_OPTIONS.map((sec, i) => ({
            text: labels[i],
            onPress: () => setDefaultRestSeconds(sec),
          })),
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    }
  }, [setDefaultRestSeconds]);

  // ── Handlers: Appearance ──────────────────────────────────────────────────

  const handlePickTheme = useCallback(() => {
    const labels = THEME_OPTIONS.map((o) => o.label);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Appearance',
          options: [...labels, 'Cancel'],
          cancelButtonIndex: labels.length,
        },
        (index) => {
          if (index < THEME_OPTIONS.length) {
            setTheme(THEME_OPTIONS[index].value);
          }
        },
      );
    } else {
      Alert.alert(
        'Appearance',
        undefined,
        [
          ...THEME_OPTIONS.map((opt) => ({
            text: opt.label,
            onPress: () => setTheme(opt.value),
          })),
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    }
  }, [setTheme]);

  // ── Handlers: Data ─────────────────────────────────────────────────────────

  const handleManagePlates = useCallback(() => {
    // Navigation to plate management screen (Phase 1)
    Alert.alert('Coming Soon', 'Plate management will be available in a future update.');
  }, []);

  const handleImportStrong = useCallback(() => {
    router.push('/modals/exercise-picker');
  }, []);

  const handleExportData = useCallback(() => {
    router.push('/profile/export' as never);
  }, []);

  // ── Derived display values ─────────────────────────────────────────────────

  const barWeightDisplay =
    unitPreference === 'kg'
      ? `${barWeightKg} kg`
      : `${Math.round(barWeightKg / 0.453592)} lb`;

  const formulaLabel =
    ONE_RM_FORMULA_OPTIONS.find((o) => o.value === oneRmFormula)?.label ?? 'Epley';

  const restDurationLabel = (() => {
    const s = defaultRestSeconds;
    if (s < 60) return `${s}s`;
    if (s % 60 === 0) return `${s / 60}m`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  })();

  const themeLabel = THEME_OPTIONS.find((o) => o.value === theme)?.label ?? 'Dark';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backButtonText}>{'‹'} Profile</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Units & Defaults ── */}
        <SectionHeader title="Units & Defaults" />
        <View style={styles.card}>
          <Row label="Weight Unit" isFirst>
            <View style={styles.segmentedControl}>
              <Pressable
                style={[
                  styles.segment,
                  styles.segmentLeft,
                  unitPreference === 'kg' && styles.segmentActive,
                ]}
                onPress={() => setUnitPreference('kg')}
                accessibilityRole="radio"
                accessibilityState={{ checked: unitPreference === 'kg' }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    unitPreference === 'kg' && styles.segmentTextActive,
                  ]}
                >
                  kg
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.segment,
                  styles.segmentRight,
                  unitPreference === 'lb' && styles.segmentActive,
                ]}
                onPress={() => setUnitPreference('lb')}
                accessibilityRole="radio"
                accessibilityState={{ checked: unitPreference === 'lb' }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    unitPreference === 'lb' && styles.segmentTextActive,
                  ]}
                >
                  lb
                </Text>
              </Pressable>
            </View>
          </Row>

          <Row label="Default Bar Weight" onPress={handlePickBarWeight}>
            <Text style={styles.rowValue}>{barWeightDisplay}</Text>
            <ChevronRight />
          </Row>

          <Row label="1RM Formula" onPress={handlePickFormula} isLast>
            <Text style={styles.rowValue}>{formulaLabel}</Text>
            <ChevronRight />
          </Row>
        </View>

        {/* ── Rest Timer ── */}
        <SectionHeader title="Rest Timer" />
        <View style={styles.card}>
          <Row label="Auto-start After Set" isFirst>
            <Switch
              value={restTimerAutoStart}
              onValueChange={setRestTimerAutoStart}
              trackColor={{ false: colors.background.tertiary.dark, true: colors.system.green }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={colors.background.tertiary.dark}
            />
          </Row>

          <Row label="Default Duration" onPress={handlePickRestDuration}>
            <Text style={styles.rowValue}>{restDurationLabel}</Text>
            <ChevronRight />
          </Row>

          <Row label="Alert Type" onPress={undefined} isLast>
            <Text style={[styles.rowValue, styles.rowValueMuted]}>Vibration + Sound</Text>
            <ChevronRight />
          </Row>
        </View>

        {/* ── Appearance ── */}
        <SectionHeader title="Appearance" />
        <View style={styles.card}>
          <Row label="Theme" onPress={handlePickTheme} isFirst>
            <Text style={styles.rowValue}>{themeLabel}</Text>
            <ChevronRight />
          </Row>

          <Row label="Haptics">
            <Switch
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
              trackColor={{ false: colors.background.tertiary.dark, true: colors.system.green }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={colors.background.tertiary.dark}
            />
          </Row>

          <Row label="Sound Alerts" isLast>
            <Switch
              value={soundAlertsEnabled}
              onValueChange={setSoundAlertsEnabled}
              trackColor={{ false: colors.background.tertiary.dark, true: colors.system.green }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={colors.background.tertiary.dark}
            />
          </Row>
        </View>

        {/* ── Data ── */}
        <SectionHeader title="Data" />
        <View style={styles.card}>
          <Row label="Manage Plates" onPress={handleManagePlates} isFirst>
            <ChevronRight />
          </Row>

          <Row label="Import from Strong" onPress={handleImportStrong}>
            <ChevronRight />
          </Row>

          <Row label="Export Data" onPress={handleExportData} isLast>
            <ChevronRight />
          </Row>
        </View>

        {/* ── About ── */}
        <SectionHeader title="About" />
        <View style={styles.card}>
          <Row label="Version" isFirst>
            <Text style={styles.rowValue}>1.0.0</Text>
          </Row>
          <Row label="Build" isLast>
            <Text style={styles.rowValue}>1</Text>
          </Row>
        </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator.dark,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.label.primary.dark,
  },
  backButton: {
    minWidth: 80,
  },
  backButtonText: {
    ...typography.body,
    color: colors.system.blue,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
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
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    minHeight: 44,
    backgroundColor: '#1C1C1E',
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
  rowLabel: {
    ...typography.body,
    color: colors.label.primary.dark,
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowValue: {
    ...typography.body,
    color: colors.label.secondary.dark,
  },
  rowValueMuted: {
    color: colors.label.tertiary.dark,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator.dark,
    marginLeft: spacing.md,
  },
  chevron: {
    fontSize: 22,
    lineHeight: 24,
    color: colors.label.tertiary.dark,
    fontWeight: '300',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.background.tertiary.dark,
    borderRadius: radius.sm,
    padding: 2,
  },
  segment: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.xs,
  },
  segmentLeft: {
    borderTopLeftRadius: radius.xs,
    borderBottomLeftRadius: radius.xs,
  },
  segmentRight: {
    borderTopRightRadius: radius.xs,
    borderBottomRightRadius: radius.xs,
  },
  segmentActive: {
    backgroundColor: colors.background.elevated.dark,
  },
  segmentText: {
    ...typography.subheadline,
    color: colors.label.secondary.dark,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: colors.label.primary.dark,
  },
  bottomPadding: {
    height: spacing.xl,
  },
});
