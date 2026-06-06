import React, { memo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import Svg, {
  Path,
  Circle,
  Text as SvgText,
} from 'react-native-svg';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type SyncStatus = 'idle' | 'syncing' | 'error';

interface SyncIndicatorProps {
  status: SyncStatus;
  size?: number;
}

// Simple cloud outline SVG paths (24x24 viewBox)
const CLOUD_PATH =
  'M19 18H6a4 4 0 1 1 .81-7.92A5.5 5.5 0 0 1 17.5 12H19a3 3 0 0 1 0 6z';

const EXCLAMATION_PATHS = {
  line: 'M12 9v4',
  dot: 'M12 15.5v.5',
};

export const SyncIndicator = memo(({ status, size = 20 }: SyncIndicatorProps) => {
  const reducedMotion = useReducedMotion();
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (status === 'syncing' && !reducedMotion) {
      rotation.value = 0;
      rotation.value = withRepeat(
        withTiming(360, { duration: 1200, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = 0;
    }
  }, [status, reducedMotion, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const cloudColor =
    status === 'idle'
      ? '#8E8E93'
      : status === 'syncing'
      ? '#30D158'
      : '#FF453A';

  const scale = size / 24;

  return (
    <Animated.View style={status === 'syncing' ? animatedStyle : undefined}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        accessibilityLabel={
          status === 'idle'
            ? 'Sync up to date'
            : status === 'syncing'
            ? 'Syncing'
            : 'Sync error'
        }
        accessibilityRole="image"
      >
        {/* Cloud body */}
        <Path
          d={CLOUD_PATH}
          stroke={cloudColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Error indicator: exclamation mark */}
        {status === 'error' ? (
          <>
            <Path
              d={EXCLAMATION_PATHS.line}
              stroke="#FF453A"
              strokeWidth={1.8}
              strokeLinecap="round"
            />
            <Circle cx={12} cy={16} r={0.75} fill="#FF453A" />
          </>
        ) : null}

        {/* Syncing indicator: small circular arrows overlay */}
        {status === 'syncing' ? (
          <>
            <Path
              d="M16 12a4 4 0 0 1-6.46 3.15"
              stroke="#30D158"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <Path
              d="M8 12a4 4 0 0 1 6.46-3.15"
              stroke="#30D158"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          </>
        ) : null}
      </Svg>
    </Animated.View>
  );
});

SyncIndicator.displayName = 'SyncIndicator';
