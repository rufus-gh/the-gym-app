import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { colors } from '@/constants/colors';
import { spacing, radius } from '@/constants/spacing';

type UnitPreference = 'kg' | 'lb';

interface UnitOptionProps {
  value: UnitPreference;
  label: string;
  description: string;
  selected: boolean;
  onSelect: (value: UnitPreference) => void;
}

function UnitOption({ value, label, description, selected, onSelect }: UnitOptionProps) {
  return (
    <Pressable
      style={[styles.optionCard, selected && styles.optionCardSelected]}
      onPress={() => onSelect(value)}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
    >
      <View style={styles.optionContent}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
    </Pressable>
  );
}

export default function UnitsScreen() {
  const [selected, setSelected] = useState<UnitPreference>('kg');
  const setUnitPreference = useSettingsStore((s) => s.setUnitPreference);

  function handleContinue() {
    setUnitPreference(selected);
    router.push('/(auth)/onboarding/bar-weight');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.step}>Step 1 of 3</Text>
        <Text style={styles.title}>Choose your units</Text>
        <Text style={styles.subtitle}>
          All weights are stored in kg internally. We will convert for display.
        </Text>
      </View>

      <View style={styles.options}>
        <UnitOption
          value="kg"
          label="Kilograms (kg)"
          description="Used in most countries and gyms worldwide"
          selected={selected === 'kg'}
          onSelect={setSelected}
        />
        <UnitOption
          value="lb"
          label="Pounds (lb)"
          description="Common in the US and Canada"
          selected={selected === 'lb'}
          onSelect={setSelected}
        />
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.primaryBtn} onPress={handleContinue}>
          <Text style={styles.primaryBtnText}>Continue</Text>
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
    paddingBottom: spacing.xl,
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
  options: {
    gap: spacing.md,
  },
  optionCard: {
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: colors.system.blue,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.label.primary.dark,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: colors.label.secondary.dark,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.label.tertiary.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.system.blue,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.system.blue,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: spacing.lg,
    right: spacing.lg,
    paddingBottom: spacing.xl,
  },
  primaryBtn: {
    backgroundColor: colors.system.blue,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
