import React from 'react';
import { View, Text, ActivityIndicator, ViewStyle } from 'react-native';

interface ChartContainerProps {
  title?: string;
  children: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  style?: ViewStyle;
  height?: number;
}

export function ChartContainer({
  title,
  children,
  loading,
  empty,
  emptyMessage = 'No data yet',
  style,
  height = 220,
}: ChartContainerProps) {
  return (
    <View
      style={[
        {
          backgroundColor: '#1C1C1E',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        },
        style,
      ]}
    >
      {title && (
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: '600',
            marginBottom: 12,
          }}
        >
          {title}
        </Text>
      )}
      <View style={{ height }}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color="#007AFF" />
          </View>
        ) : empty ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'rgba(235,235,245,0.6)', fontSize: 13 }}>
              {emptyMessage}
            </Text>
          </View>
        ) : (
          children
        )}
      </View>
    </View>
  );
}
