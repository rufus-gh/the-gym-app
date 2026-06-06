import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type BadgeType = 'working' | 'warmup' | 'dropset' | 'failure' | 'pr';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  type: BadgeType;
  size?: BadgeSize;
}

export const Badge = memo(({ type, size = 'md' }: BadgeProps) => {
  return (
    <View style={[styles.base, sizeStyles[size], typeStyles[type]]}>
      <Text style={[styles.text, textSizeStyles[size], typeTextStyles[type]]}>
        {LABELS[type]}
      </Text>
    </View>
  );
});

Badge.displayName = 'Badge';

const LABELS: Record<BadgeType, string> = {
  working: 'WORK',
  warmup: 'WARM',
  dropset: 'DROP',
  failure: 'FAIL',
  pr: 'PR',
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

const sizeStyles = StyleSheet.create({
  sm: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    minHeight: 18,
  },
  md: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    minHeight: 22,
  },
});

const textSizeStyles = StyleSheet.create({
  sm: {
    fontSize: 10,
    lineHeight: 14,
  },
  md: {
    fontSize: 12,
    lineHeight: 16,
  },
});

const typeStyles = StyleSheet.create({
  working: { backgroundColor: '#007AFF' },
  warmup: { backgroundColor: '#3A3A3C' },
  dropset: { backgroundColor: '#AF52DE' },
  failure: { backgroundColor: '#FF3B30' },
  pr: { backgroundColor: '#FFD700' },
});

const typeTextStyles = StyleSheet.create({
  working: { color: '#FFFFFF' },
  warmup: { color: '#EBEBF5' },
  dropset: { color: '#FFFFFF' },
  failure: { color: '#FFFFFF' },
  pr: { color: '#000000' },
});
