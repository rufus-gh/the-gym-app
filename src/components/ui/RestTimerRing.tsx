import React, { memo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RestTimerRingProps {
  totalSeconds: number;
  remainingSeconds: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const RestTimerRing = memo(({
  totalSeconds,
  remainingSeconds,
  size = 160,
  strokeWidth = 8,
  color = '#30D158',
}: RestTimerRingProps) => {
  const reducedMotion = useReducedMotion();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  // progress: 1 = full ring (timer just started), 0 = empty (timer done)
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const progressShared = useSharedValue(progress);

  useEffect(() => {
    const target = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
    if (reducedMotion) {
      progressShared.value = target;
    } else {
      progressShared.value = withTiming(target, {
        duration: 1000,
        easing: Easing.linear,
      });
    }
  }, [remainingSeconds, totalSeconds, reducedMotion, progressShared]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progressShared.value);
    return {
      strokeDashoffset,
    };
  });

  const timeLabel = formatTime(remainingSeconds);
  const isUrgent = remainingSeconds <= 10 && remainingSeconds > 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="#3A3A3C"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress arc — starts at top (rotated -90 deg via transform) */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={isUrgent ? '#FF453A' : color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          // Rotate so arc starts at 12 o'clock
          transform={`rotate(-90 ${cx} ${cy})`}
        />

        {/* Time label */}
        <SvgText
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fill={isUrgent ? '#FF453A' : '#FFFFFF'}
          fontSize={size < 100 ? 18 : 28}
          fontWeight="300"
        >
          {timeLabel}
        </SvgText>

        {/* "REST" sub-label */}
        <SvgText
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fill="#8E8E93"
          fontSize={size < 100 ? 8 : 11}
          fontWeight="500"
          letterSpacing={1}
        >
          REST
        </SvgText>
      </Svg>
    </View>
  );
});

RestTimerRing.displayName = 'RestTimerRing';
