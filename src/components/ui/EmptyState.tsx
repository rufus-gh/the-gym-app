import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  cta?: {
    label: string;
    onPress: () => void;
  };
}

export const EmptyState = memo(({ icon, title, subtitle, cta }: EmptyStateProps) => {
  return (
    <View style={styles.container}>
      {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}

      <Text style={styles.title}>{title}</Text>

      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {cta ? (
        <View style={styles.ctaWrapper}>
          <Button variant="primary" size="md" onPress={cta.onPress}>
            {cta.label}
          </Button>
        </View>
      ) : null}
    </View>
  );
});

EmptyState.displayName = 'EmptyState';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrapper: {
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 25,
    textAlign: 'center',
    letterSpacing: 0.38,
  },
  subtitle: {
    color: '#EBEBF5',
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.6,
  },
  ctaWrapper: {
    marginTop: 24,
  },
});
