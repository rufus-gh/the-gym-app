import React, { memo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type RecordType = 'weight' | 'reps' | 'volume' | 'estimated_1rm';
type BadgeSize = 'sm' | 'md';

interface PRBadgeProps {
  recordType?: RecordType;
  size?: BadgeSize;
}

const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  weight: 'Weight',
  reps: 'Reps',
  volume: 'Volume',
  estimated_1rm: 'e1RM',
};

const SPRING_CONFIG = {
  damping: 10,
  stiffness: 300,
  mass: 0.6,
};

export const PRBadge = memo(({ recordType, size = 'md' }: PRBadgeProps) => {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (!reducedMotion) {
      scale.value = withSpring(1, SPRING_CONFIG);
    }
  }, [reducedMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isSmall = size === 'sm';
  const label = recordType !== undefined ? RECORD_TYPE_LABELS[recordType] : undefined;

  return (
    <Animated.View style={animatedStyle}>
      <View style={[styles.badge, isSmall ? styles.badgeSm : styles.badgeMd]}>
        <Text style={isSmall ? styles.trophySm : styles.trophyMd}>{'🏆'}</Text>
        <Text style={[styles.text, isSmall ? styles.textSm : styles.textMd]}>
          PR
        </Text>
        {label !== undefined && !isSmall ? (
          <Text style={styles.recordTypeText}>{label}</Text>
        ) : null}
      </View>
    </Animated.View>
  );
});

PRBadge.displayName = 'PRBadge';

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
    gap: 3,
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 2,
  },
  badgeMd: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trophySm: {
    fontSize: 10,
  },
  trophyMd: {
    fontSize: 13,
  },
  text: {
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 0.5,
  },
  textSm: {
    fontSize: 10,
  },
  textMd: {
    fontSize: 12,
  },
  recordTypeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FFD700',
    opacity: 0.8,
  },
});
