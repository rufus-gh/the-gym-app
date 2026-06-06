import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export const FilterChip = React.memo(
  ({ label, selected, onPress }: FilterChipProps) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
      ]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
    </Pressable>
  ),
);

FilterChip.displayName = 'FilterChip';

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: '#2C2C2E',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#007AFF',
  },
  chipPressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(235,235,245,0.6)',
  },
  labelSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
