import { View, Text, Pressable, StyleSheet, TextInput, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { colors } from '@/constants/colors';
import { spacing, radius } from '@/constants/spacing';

interface BarPreset {
  id: string;
  label: string;
  weightKg: number;
  description: string;
}

const BAR_WEIGHTS: BarPreset[] = [
  {
    id: 'mens_olympic',
    label: "Men's Olympic Bar",
    weightKg: 20,
    description: '20 kg — standard competition bar',
  },
  {
    id: 'womens_olympic',
    label: "Women's Olympic Bar",
    weightKg: 15,
    description: '15 kg — shorter, narrower shaft',
  },
  {
    id: 'ez_curl',
    label: 'EZ Curl Bar',
    weightKg: 10,
    description: '10 kg — angled grip bar',
  },
  {
    id: 'safety_squat',
    label: 'Safety Squat Bar',
    weightKg: 25,
    description: '25 kg — cambered yoke bar',
  },
  {
    id: 'hex_trap',
    label: 'Hex / Trap Bar',
    weightKg: 30,
    description: '30 kg — hexagonal deadlift bar',
  },
];

const CUSTOM_ID = 'custom';

export default function BarWeightScreen() {
  const [selectedId, setSelectedId] = useState('mens_olympic');
  const [customInput, setCustomInput] = useState('');
  const [customError, setCustomError] = useState('');
  const setDefaultBarWeight = useSettingsStore((s) => s.setDefaultBarWeight);
  const unitPreference = useSettingsStore((s) => s.unitPreference);

  function displayWeight(kg: number): string {
    if (unitPreference === 'lb') {
      return `${Math.round(kg / 0.453592)} lb`;
    }
    return `${kg} kg`;
  }

  function handleContinue() {
    if (selectedId === CUSTOM_ID) {
      const parsed = parseFloat(customInput);
      if (isNaN(parsed) || parsed <= 0 || parsed > 100) {
        setCustomError('Enter a valid bar weight between 1 and 100 kg');
        return;
      }
      const weightKg = unitPreference === 'lb' ? parsed * 0.453592 : parsed;
      setDefaultBarWeight(weightKg);
    } else {
      const preset = BAR_WEIGHTS.find((b) => b.id === selectedId);
      if (preset) {
        setDefaultBarWeight(preset.weightKg);
      }
    }
    router.push('/(auth)/onboarding/plates');
  }

  function handleSelectPreset(id: string) {
    setSelectedId(id);
    setCustomError('');
  }

  function handleSelectCustom() {
    setSelectedId(CUSTOM_ID);
    setCustomError('');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.step}>Step 2 of 3</Text>
        <Text style={styles.title}>Default bar weight</Text>
        <Text style={styles.subtitle}>
          The bar weight is added automatically when you start a new set.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {BAR_WEIGHTS.map((preset) => {
          const isSelected = selectedId === preset.id;
          return (
            <Pressable
              key={preset.id}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
              onPress={() => handleSelectPreset(preset.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`${preset.label}, ${displayWeight(preset.weightKg)}`}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionLabel}>{preset.label}</Text>
                <Text style={styles.optionDescription}>{preset.description}</Text>
              </View>
              <Text style={[styles.weightBadge, isSelected && styles.weightBadgeSelected]}>
                {displayWeight(preset.weightKg)}
              </Text>
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected && <View style={styles.radioDot} />}
              </View>
            </Pressable>
          );
        })}

        <Pressable
          style={[styles.optionCard, selectedId === CUSTOM_ID && styles.optionCardSelected]}
          onPress={handleSelectCustom}
          accessibilityRole="radio"
          accessibilityState={{ checked: selectedId === CUSTOM_ID }}
          accessibilityLabel="Custom bar weight"
        >
          <View style={styles.optionContent}>
            <Text style={styles.optionLabel}>Custom</Text>
            <Text style={styles.optionDescription}>Enter your own bar weight</Text>
          </View>
          <View style={[styles.radio, selectedId === CUSTOM_ID && styles.radioSelected]}>
            {selectedId === CUSTOM_ID && <View style={styles.radioDot} />}
          </View>
        </Pressable>

        {selectedId === CUSTOM_ID && (
          <View style={styles.customInputWrapper}>
            <TextInput
              style={[styles.customInput, customError ? styles.customInputError : null]}
              value={customInput}
              onChangeText={(v) => {
                setCustomInput(v);
                setCustomError('');
              }}
              placeholder={unitPreference === 'lb' ? 'Weight in lb' : 'Weight in kg'}
              placeholderTextColor={colors.label.tertiary.dark}
              keyboardType="decimal-pad"
              returnKeyType="done"
              accessibilityLabel="Custom bar weight input"
            />
            <Text style={styles.inputUnit}>{unitPreference}</Text>
            {customError ? <Text style={styles.errorText}>{customError}</Text> : null}
          </View>
        )}
      </ScrollView>

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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingBottom: 120,
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
  weightBadge: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.label.secondary.dark,
    marginRight: spacing.sm,
  },
  weightBadgeSelected: {
    color: colors.system.blue,
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
  customInputWrapper: {
    position: 'relative',
  },
  customInput: {
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingRight: 56,
    fontSize: 17,
    color: colors.label.primary.dark,
    borderWidth: 1,
    borderColor: colors.separator.dark,
  },
  customInputError: {
    borderColor: colors.semantic.error,
  },
  inputUnit: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    transform: [{ translateY: -10 }],
    fontSize: 15,
    color: colors.label.secondary.dark,
  },
  errorText: {
    fontSize: 13,
    color: colors.semantic.error,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
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
