import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { ChartContainer } from './ChartContainer';

interface VolumeDataPoint {
  weekStart: string;
  volumeKg: number;
}

interface VolumeLoadChartProps {
  data: VolumeDataPoint[];
  loading?: boolean;
  unitPreference?: 'kg' | 'lb';
}

const LB_PER_KG = 2.20462;
const BAR_COLOR = '#007AFF';
const AXIS_LABEL_COLOR = 'rgba(235,235,245,0.4)';

export function VolumeLoadChart({
  data,
  loading,
  unitPreference = 'kg',
}: VolumeLoadChartProps) {
  const empty = data.length === 0;

  const displayData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        displayVolume:
          unitPreference === 'lb' ? d.volumeKg * LB_PER_KG : d.volumeKg,
      })),
    [data, unitPreference],
  );

  const maxVolume = useMemo(
    () => Math.max(...displayData.map((d) => d.displayVolume), 1),
    [displayData],
  );

  const unitLabel = unitPreference === 'lb' ? 'lb' : 'kg';

  const formatWeekLabel = (weekStart: string): string => {
    const date = new Date(weekStart);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatVolume = (v: number): string => {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return `${Math.round(v)}`;
  };

  return (
    <ChartContainer
      title={`Weekly Volume (${unitLabel})`}
      loading={loading}
      empty={empty}
      emptyMessage="Log a workout to see your volume trend"
      height={200}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 20 }}>
        {displayData.map((point, index) => {
          const barHeightPct = point.displayVolume / maxVolume;
          return (
            <View
              key={point.weekStart}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}
            >
              <Text
                style={{
                  color: AXIS_LABEL_COLOR,
                  fontSize: 9,
                  marginBottom: 2,
                  textAlign: 'center',
                }}
                numberOfLines={1}
              >
                {formatVolume(point.displayVolume)}
              </Text>
              <View
                style={{
                  width: '70%',
                  height: Math.max(barHeightPct * 140, 2),
                  backgroundColor: BAR_COLOR,
                  borderRadius: 3,
                  opacity: 0.85 + index * 0.01,
                }}
              />
              <Text
                style={{
                  color: AXIS_LABEL_COLOR,
                  fontSize: 9,
                  marginTop: 4,
                  textAlign: 'center',
                }}
                numberOfLines={1}
              >
                {formatWeekLabel(point.weekStart)}
              </Text>
            </View>
          );
        })}
      </View>
    </ChartContainer>
  );
}
