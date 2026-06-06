import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
} from 'react-native';

interface NumericKeypadProps {
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  allowDecimal?: boolean;
  maxValue?: number;
}

type KeyValue = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '0' | '.' | 'backspace' | 'confirm';

const BUTTON_MIN_SIZE = 64;

export const NumericKeypad = memo(({
  value,
  onChange,
  onConfirm,
  allowDecimal = false,
  maxValue,
}: NumericKeypadProps) => {
  const handleKey = useCallback(
    (key: KeyValue) => {
      Vibration.vibrate(10);

      if (key === 'confirm') {
        onConfirm();
        return;
      }

      if (key === 'backspace') {
        if (value.length <= 1) {
          onChange('');
        } else {
          onChange(value.slice(0, -1));
        }
        return;
      }

      if (key === '.') {
        if (!allowDecimal) return;
        if (value.includes('.')) return;
        const next = value === '' ? '0.' : value + '.';
        onChange(next);
        return;
      }

      // Numeric digit
      const candidate = value === '' ? key : value + key;

      // Enforce decimal precision: only 1 decimal place for weights
      if (allowDecimal && candidate.includes('.')) {
        const parts = candidate.split('.');
        if (parts[1].length > 1) return;
      }

      // Enforce maxValue
      if (maxValue !== undefined) {
        const numeric = parseFloat(candidate);
        if (!isNaN(numeric) && numeric > maxValue) return;
      }

      onChange(candidate);
    },
    [value, onChange, onConfirm, allowDecimal, maxValue]
  );

  const displayValue = value === '' ? '0' : value;

  const rows: KeyValue[][] = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'backspace'],
  ];

  return (
    <View style={styles.container}>
      {/* Value display */}
      <View style={styles.display}>
        <Text style={styles.displayText} numberOfLines={1} adjustsFontSizeToFit>
          {displayValue}
        </Text>
      </View>

      {/* Digit rows */}
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => {
            if (key === '.' && !allowDecimal) {
              // Render empty placeholder to preserve layout
              return <View key={key} style={styles.keyPlaceholder} />;
            }
            return (
              <KeyButton
                key={key}
                keyValue={key}
                onPress={handleKey}
              />
            );
          })}
        </View>
      ))}

      {/* Confirm button — full width */}
      <View style={styles.confirmRow}>
        <KeyButton keyValue="confirm" onPress={handleKey} fullWidth />
      </View>
    </View>
  );
});

NumericKeypad.displayName = 'NumericKeypad';

interface KeyButtonProps {
  keyValue: KeyValue;
  onPress: (key: KeyValue) => void;
  fullWidth?: boolean;
}

const KeyButton = memo(({ keyValue, onPress, fullWidth }: KeyButtonProps) => {
  const handlePress = useCallback(() => {
    onPress(keyValue);
  }, [onPress, keyValue]);

  const isConfirm = keyValue === 'confirm';
  const isBackspace = keyValue === 'backspace';

  let label: React.ReactNode;
  if (isConfirm) {
    label = <Text style={[styles.keyText, styles.confirmText]}>{'✓'}</Text>;
  } else if (isBackspace) {
    label = <Text style={[styles.keyText, styles.backspaceText]}>{'⌫'}</Text>;
  } else {
    label = <Text style={styles.keyText}>{keyValue}</Text>;
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.key,
        fullWidth && styles.keyFullWidth,
        isConfirm && styles.keyConfirm,
        isBackspace && styles.keyBackspace,
      ]}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={
        isConfirm ? 'Confirm' : isBackspace ? 'Delete' : keyValue
      }
    >
      {label}
    </TouchableOpacity>
  );
});

KeyButton.displayName = 'KeyButton';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  display: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#3A3A3C',
    marginBottom: 8,
  },
  displayText: {
    fontSize: 40,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  confirmRow: {
    marginTop: 4,
  },
  key: {
    flex: 1,
    minHeight: BUTTON_MIN_SIZE,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyFullWidth: {
    flex: undefined,
    width: '100%',
    minHeight: BUTTON_MIN_SIZE,
  },
  keyConfirm: {
    backgroundColor: '#30D158',
    minHeight: BUTTON_MIN_SIZE,
  },
  keyBackspace: {
    backgroundColor: '#3A3A3C',
  },
  keyPlaceholder: {
    flex: 1,
    minHeight: BUTTON_MIN_SIZE,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  confirmText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  backspaceText: {
    fontSize: 22,
    color: '#EBEBF5',
  },
});
