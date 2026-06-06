import React, { memo, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant: Variant;
  size: Size;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 300,
  mass: 0.8,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Button = memo(
  ({
    variant,
    size,
    loading = false,
    disabled = false,
    onPress,
    children,
    style,
    testID,
  }: ButtonProps) => {
    const reducedMotion = useReducedMotion();
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePressIn = useCallback(() => {
      if (!reducedMotion) {
        scale.value = withSpring(0.97, SPRING_CONFIG);
      }
    }, [reducedMotion, scale]);

    const handlePressOut = useCallback(() => {
      if (!reducedMotion) {
        scale.value = withSpring(1, SPRING_CONFIG);
      }
    }, [reducedMotion, scale]);

    const isDisabled = disabled || loading;

    return (
      <AnimatedPressable
        testID={testID}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[animatedStyle, style]}
        className={[
          'items-center justify-center rounded-xl flex-row',
          variantClass[variant],
          sizeClass[size],
          isDisabled ? 'opacity-40' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'ghost' ? '#007AFF' : '#FFFFFF'}
          />
        ) : (
          <Text
            className={[
              'font-semibold',
              textClass[variant],
              textSizeClass[size],
            ].join(' ')}
            numberOfLines={1}
          >
            {children}
          </Text>
        )}
      </AnimatedPressable>
    );
  },
);

Button.displayName = 'Button';

const variantClass: Record<Variant, string> = {
  primary: 'bg-[#007AFF]',
  secondary: 'border border-[#38383A] bg-transparent',
  ghost: 'bg-transparent',
  destructive: 'bg-[#FF3B30]',
};

const textClass: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-white',
  ghost: 'text-[#007AFF]',
  destructive: 'text-white',
};

const sizeClass: Record<Size, string> = {
  sm: 'py-2 px-4',
  md: 'py-3 px-6',
  lg: 'py-4 px-8',
};

const textSizeClass: Record<Size, string> = {
  sm: 'text-[14px]',
  md: 'text-[17px]',
  lg: 'text-[17px]',
};

const _styles = StyleSheet.create({
  minTouch: {
    minHeight: 44,
    minWidth: 44,
  },
});
