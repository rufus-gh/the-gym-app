import React, { memo, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { spacing, radius, TAB_BAR_HEIGHT } from '../../constants/spacing';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface ActiveSessionBarProps {
  sessionName: string;
  elapsedSeconds: number;
  onPress: () => void;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');

  if (h > 0) {
    const hh = String(h).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

// Height of the bar itself (content only — safe-area padding added below)
const BAR_HEIGHT = 52;

// ----------------------------------------------------------------------------
// ActiveSessionBar
// ----------------------------------------------------------------------------

export const ActiveSessionBar = memo(({
  sessionName,
  elapsedSeconds,
  onPress,
}: ActiveSessionBarProps) => {
  const insets = useSafeAreaInsets();

  const elapsed = useMemo(
    () => formatElapsed(elapsedSeconds),
    [elapsedSeconds],
  );

  // The bar sits directly above the tab bar. We apply the tab bar height as
  // bottom offset so it floats above it on all devices.
  const bottomOffset = TAB_BAR_HEIGHT + (Platform.OS === 'android' ? insets.bottom : 0);

  return (
    <View
      style={[styles.wrapper, { bottom: bottomOffset }]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={styles.bar}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Active session: ${sessionName}. Elapsed: ${elapsed}. Tap to return.`}
      >
        {/* Animated pulse dot */}
        <View style={styles.pulseContainer}>
          <View style={styles.pulseDot} />
        </View>

        {/* Session info */}
        <View style={styles.info}>
          <Text style={styles.sessionName} numberOfLines={1}>
            {sessionName}
          </Text>
        </View>

        {/* Elapsed timer */}
        <Text style={styles.elapsed}>{elapsed}</Text>

        {/* Return chevron */}
        <Text style={styles.chevron}>{'›'}</Text>
      </TouchableOpacity>
    </View>
  );
});

ActiveSessionBar.displayName = 'ActiveSessionBar';

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    // `bottom` set inline from TAB_BAR_HEIGHT
    zIndex: 100,
    elevation: 8, // Android shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: radius.lg,
    backgroundColor: colors.system.blue,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden',
  },

  // Pulse indicator
  pulseContainer: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },

  // Info
  info: {
    flex: 1,
    overflow: 'hidden',
  },
  sessionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Elapsed
  elapsed: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },

  // Chevron
  chevron: {
    fontSize: 22,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 26,
    flexShrink: 0,
  },
});
