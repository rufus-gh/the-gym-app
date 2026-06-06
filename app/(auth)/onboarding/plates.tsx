import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { colors } from '@/constants/colors';
import { spacing, radius } from '@/constants/spacing';

interface PlateSize {
  kg: number;
  defaultEnabled: boolean;
}

const PLATE_SIZES: PlateSize[] = [
  { kg: 25, defaultEnabled: true },
  { kg: 20, defaultEnabled: true },
  { kg: 15, defaultEnabled: true },
  { kg: 10, defaultEnabled: true },
  { kg: 5, defaultEnabled: true },
  { kg: 2.5, defaultEnabled: true },
  { kg: 1.25, defaultEnabled: true },
  { kg: 0.5, defaultEnabled: false },
  { kg: 0.25, defaultEnabled: false },
];

function buildDefaultEnabled(): Set<number> {
  return new Set(PLATE_SIZES.filter((p) => p.defaultEnabled).map((p) => p.kg));
}

interface PlateRowProps {
  plateKg: number;
  enabled: boolean;
  displayLabel: string;
  onToggle: (kg: number) => void;
}

function PlateRow({ plateKg, enabled, displayLabel, onToggle }: PlateRowProps) {
  return (
    <Pressable
      style={styles.plateRow}
      onPress={() => onToggle(plateKg)}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      accessibilityLabel={`${displayLabel} plate`}
    >
      <View style={[styles.plateSwatch, { opacity: enabled ? 1 : 0.35 }]}>
        <Text style={styles.plateSwatchText}>{displayLabel}</Text>
      </View>
      <Text style={[styles.plateLabel, !enabled && styles.plateLabelDisabled]}>
        {displayLabel}
      </Text>
      <View style={[styles.toggle, enabled && styles.toggleEnabled]}>
        <View style={[styles.toggleThumb, enabled && styles.toggleThumbEnabled]} />
      </View>
    </Pressable>
  );
}

export default function PlatesScreen() {
  const [enabledPlates, setEnabledPlates] = useState<Set<number>>(buildDefaultEnabled);
  const setAvailablePlates = useSettingsStore((s) => s.setAvailablePlates);
  const unitPreference = useSettingsStore((s) => s.unitPreference);

  function formatWeight(kg: number): string {
    if (unitPreference === 'lb') {
      const lb = kg / 0.453592;
      // Show clean numbers for common lb plates
      const rounded = Math.round(lb * 4) / 4;
      return `${rounded} lb`;
    }
    return `${kg} kg`;
  }

  function togglePlate(kg: number) {
    setEnabledPlates((prev) => {
      const next = new Set(prev);
      if (next.has(kg)) {
        next.delete(kg);
      } else {
        next.add(kg);
      }
      return next;
    });
  }

  function handleConfirm() {
    const selectedPlates = PLATE_SIZES.filter((p) => enabledPlates.has(p.kg)).map((p) => p.kg);
    setAvailablePlates(selectedPlates);
    router.replace('/(tabs)/');
  }

  const enabledCount = enabledPlates.size;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.step}>Step 3 of 3</Text>
        <Text style={styles.title}>Available plates</Text>
        <Text style={styles.subtitle}>
          The plate calculator uses these to find the closest achievable weight.
        </Text>
      </View>

      <FlatList
        data={PLATE_SIZES}
        keyExtractor={(item) => String(item.kg)}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <PlateRow
            plateKg={item.kg}
            enabled={enabledPlates.has(item.kg)}
            displayLabel={formatWeight(item.kg)}
            onToggle={togglePlate}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        scrollEnabled={false}
      />

      <View style={styles.footer}>
        {enabledCount === 0 && (
          <Text style={styles.warningText}>Select at least one plate size to continue</Text>
        )}
        <Pressable
          style={[styles.primaryBtn, enabledCount === 0 && styles.primaryBtnDisabled]}
          onPress={handleConfirm}
          disabled={enabledCount === 0}
          accessibilityState={{ disabled: enabledCount === 0 }}
        >
          <Text style={styles.primaryBtnText}>Start Training</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary.dark,
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  step: {
    fontSize: 13,
    color: colors.label.secondary.dark,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.label.primary.dark,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: colors.label.secondary.dark,
    lineHeight: 22,
  },
  list: {
    flex: 1,
  },
  listContent: {
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.lg,
    overflow: 'hidden',
    paddingBottom: 120,
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  plateSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.tertiary.dark,
    borderWidth: 2,
    borderColor: colors.separator.dark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  plateSwatchText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.label.secondary.dark,
    textAlign: 'center',
  },
  plateLabel: {
    flex: 1,
    fontSize: 17,
    color: colors.label.primary.dark,
  },
  plateLabelDisabled: {
    color: colors.label.secondary.dark,
  },
  toggle: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    backgroundColor: colors.background.tertiary.dark,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleEnabled: {
    backgroundColor: colors.system.green,
  },
  toggleThumb: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  toggleThumbEnabled: {
    alignSelf: 'flex-end',
  },
  separator: {
    height: 1,
    backgroundColor: colors.separator.dark,
    marginLeft: spacing.md,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: spacing.lg,
    right: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  warningText: {
    fontSize: 13,
    color: colors.semantic.warning,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: colors.system.blue,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
