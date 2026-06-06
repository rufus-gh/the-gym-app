import React, { useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  useAnimatedGestureHandler,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.8,
};

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  snapPoints: number[];
  children: React.ReactNode;
  title?: string;
}

type GestureContext = {
  startY: number;
};

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  snapPoints,
  children,
  title,
}) => {
  const reducedMotion = useReducedMotion();

  // Sort snap points ascending (smallest height first = lowest position)
  const sortedSnapPoints = [...snapPoints].sort((a, b) => a - b);
  const maxHeight = sortedSnapPoints[sortedSnapPoints.length - 1];
  const minHeight = sortedSnapPoints[0];

  // translateY: 0 = fully visible at maxHeight, positive = sliding down/hidden
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const snapToPoint = useCallback(
    (targetHeight: number) => {
      'worklet';
      const targetTranslateY = maxHeight - targetHeight;
      if (reducedMotion) {
        translateY.value = targetTranslateY;
        backdropOpacity.value = targetHeight / maxHeight;
      } else {
        translateY.value = withSpring(targetTranslateY, SPRING_CONFIG);
        backdropOpacity.value = withSpring(
          targetHeight / maxHeight,
          SPRING_CONFIG
        );
      }
    },
    [maxHeight, reducedMotion, translateY, backdropOpacity]
  );

  const closeSheet = useCallback(() => {
    'worklet';
    if (reducedMotion) {
      translateY.value = SCREEN_HEIGHT;
      backdropOpacity.value = 0;
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, SPRING_CONFIG);
      backdropOpacity.value = withSpring(0, SPRING_CONFIG);
    }
    runOnJS(onClose)();
  }, [reducedMotion, translateY, backdropOpacity, onClose]);

  useEffect(() => {
    if (visible) {
      snapToPoint(maxHeight);
    } else {
      if (reducedMotion) {
        translateY.value = SCREEN_HEIGHT;
        backdropOpacity.value = 0;
      } else {
        translateY.value = withSpring(SCREEN_HEIGHT, SPRING_CONFIG);
        backdropOpacity.value = withSpring(0, SPRING_CONFIG);
      }
    }
  }, [visible, maxHeight, reducedMotion, snapToPoint, translateY, backdropOpacity]);

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    GestureContext
  >({
    onStart: (_, ctx) => {
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      const newY = ctx.startY + event.translationY;
      // Clamp: don't allow dragging above maxHeight snap point
      translateY.value = Math.max(0, newY);

      const currentHeight = maxHeight - translateY.value;
      backdropOpacity.value = interpolate(
        currentHeight,
        [0, maxHeight],
        [0, 1],
        Extrapolate.CLAMP
      );
    },
    onEnd: (event) => {
      const currentHeight = maxHeight - translateY.value;
      const velocity = event.velocityY;

      // If dragged below the lowest snap point or fast downward swipe, close
      if (currentHeight < minHeight * 0.5 || velocity > 1200) {
        closeSheet();
        return;
      }

      // Find the nearest snap point
      let nearest = sortedSnapPoints[0];
      let minDiff = Math.abs(currentHeight - sortedSnapPoints[0]);

      for (const point of sortedSnapPoints) {
        const diff = Math.abs(currentHeight - point);
        if (diff < minDiff) {
          minDiff = diff;
          nearest = point;
        }
      }

      snapToPoint(nearest);
    },
  });

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    pointerEvents: backdropOpacity.value > 0 ? 'auto' : 'none',
  }));

  if (!visible && translateY.value >= SCREEN_HEIGHT) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, backdropAnimatedStyle]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View
          style={[styles.sheet, { height: maxHeight + 40 }, sheetAnimatedStyle]}
        >
          {/* Drag handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Title */}
          {title !== undefined && title.length > 0 ? (
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{title}</Text>
            </View>
          ) : null}

          {/* Content */}
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34, // Safe area bottom
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A3A3C',
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#3A3A3C',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
});
