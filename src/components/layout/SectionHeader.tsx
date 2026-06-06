import React from 'react';
import { View, Text, Pressable, ViewStyle } from 'react-native';

interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
  style?: ViewStyle;
}

export function SectionHeader({ title, action, style }: SectionHeaderProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 8,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: 'rgba(235,235,245,0.6)',
          fontSize: 13,
          fontWeight: '600',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      {action && (
        <Pressable onPress={action.onPress} accessibilityRole="button">
          <Text style={{ color: '#007AFF', fontSize: 15 }}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}
