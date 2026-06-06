import React from 'react';
import { ScrollView, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  safeAreaEdges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function ScreenContainer({
  children,
  scrollable = true,
  style,
  contentStyle,
  safeAreaEdges = ['top'],
}: ScreenContainerProps) {
  const bg: ViewStyle = { flex: 1, backgroundColor: '#000000' };

  if (scrollable) {
    return (
      <SafeAreaView style={[bg, style]} edges={safeAreaEdges}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[{ padding: 16 }, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[bg, style]} edges={safeAreaEdges}>
      <View style={[{ flex: 1, padding: 16 }, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}
