import React, { memo } from 'react';
import {
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
  numeric?: boolean;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Input = memo(
  ({
    value,
    onChangeText,
    label,
    error,
    helperText,
    placeholder,
    numeric = false,
    keyboardType,
    maxLength,
    style,
    testID,
  }: InputProps) => {
    const resolvedKeyboardType: KeyboardTypeOptions =
      keyboardType ?? (numeric ? 'decimal-pad' : 'default');

    const hasError = Boolean(error);

    return (
      <View className="w-full" style={style}>
        {label ? (
          <Text className="text-[#EBEBF5] text-[13px] font-medium mb-1.5 opacity-60">
            {label}
          </Text>
        ) : null}

        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8E8E93"
          keyboardType={resolvedKeyboardType}
          maxLength={maxLength}
          className={[
            'bg-[#2C2C2E] text-white text-[17px] rounded-xl px-4 py-3',
            'min-h-[44px]',
            hasError ? 'border border-[#FF3B30]' : 'border border-transparent',
          ].join(' ')}
          accessibilityLabel={label}
          accessibilityHint={helperText}
          accessibilityInvalid={hasError}
        />

        {hasError ? (
          <Text className="text-[#FF3B30] text-[13px] mt-1.5" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        {!hasError && helperText ? (
          <Text className="text-[#EBEBF5] text-[13px] mt-1.5 opacity-40">
            {helperText}
          </Text>
        ) : null}
      </View>
    );
  },
);

Input.displayName = 'Input';
