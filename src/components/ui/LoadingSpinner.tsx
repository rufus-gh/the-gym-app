import React, { memo } from 'react';
import { ActivityIndicator } from 'react-native';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  color?: string;
}

const SIZES: Record<SpinnerSize, 'small' | 'large' | number> = {
  sm: 16,
  md: 'small',
  lg: 'large',
};

export const LoadingSpinner = memo(
  ({ size = 'md', color = '#007AFF' }: LoadingSpinnerProps) => {
    return (
      <ActivityIndicator
        size={SIZES[size]}
        color={color}
        accessibilityRole="progressbar"
        accessibilityLabel="Loading"
      />
    );
  },
);

LoadingSpinner.displayName = 'LoadingSpinner';
