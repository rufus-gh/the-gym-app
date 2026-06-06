import React, { memo, useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { Toast } from '@/stores/uiStore';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface ToastMessageProps {
  toast: Toast;
  onDismiss: () => void;
}

const SPRING_IN: Parameters<typeof withSpring>[1] = {
  damping: 20,
  stiffness: 300,
  mass: 0.9,
};

const SPRING_OUT: Parameters<typeof withSpring>[1] = {
  damping: 25,
  stiffness: 400,
  mass: 0.8,
};

const DEFAULT_DURATION = 4000;

export const ToastMessage = memo(({ toast, onDismiss }: ToastMessageProps) => {
  const reducedMotion = useReducedMotion();
  const translateY = useSharedValue(reducedMotion ? 0 : -100);
  const opacity = useSharedValue(reducedMotion ? 1 : 0);

  const dismiss = useCallback(() => {
    if (reducedMotion) {
      onDismiss();
      return;
    }
    translateY.value = withSpring(-100, SPRING_OUT, (finished) => {
      if (finished) {
        runOnJS(onDismiss)();
      }
    });
    opacity.value = withSpring(0, SPRING_OUT);
  }, [reducedMotion, translateY, opacity, onDismiss]);

  useEffect(() => {
    if (!reducedMotion) {
      translateY.value = withSpring(0, SPRING_IN);
      opacity.value = withSpring(1, SPRING_IN);
    }

    const duration = toast.duration ?? DEFAULT_DURATION;
    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, [toast.duration, dismiss, reducedMotion, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const borderColor = borderColors[toast.type];

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={[styles.inner, { borderLeftColor: borderColor }]}>
        <Text style={styles.message} numberOfLines={3}>
          {toast.message}
        </Text>

        <View style={styles.actions}>
          {toast.action ? (
            <Pressable
              onPress={toast.action.onPress}
              style={styles.actionButton}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={[styles.actionLabel, { color: borderColor }]}>
                {toast.action.label}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={dismiss}
            style={styles.dismissButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          >
            <Text style={styles.dismissLabel}>✕</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
});

ToastMessage.displayName = 'ToastMessage';

const borderColors: Record<Toast['type'], string> = {
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  info: '#007AFF',
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  inner: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    flex: 1,
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    gap: 8,
  },
  actionButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  dismissButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissLabel: {
    color: '#8E8E93',
    fontSize: 15,
  },
});
