import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { ChartContainer } from './ChartContainer';

interface OneRMDataPoint {
  /** ISO date string for the session */
  date: string;
  /** Estimated 1RM in kg — always use max-per-period, never mean */
  estimatedOneRmKg: number;
}

interface OneRMChartProps {
  data: OneRMDataPoint[];
  exerciseName?: string;
  loading?: boolean;
  unitPreference?: 'kg' | 'lb';
}

const LB_PER_KG = 2.20462;
const LINE_COLOR = '#30D158';
const POINT_COLOR = '#30D158';
const AXIS_LABEL_COLOR = 'rgba(235,235,245,0.4)';

export function OneRMChart({
  data,
  exerciseName,
  loading,
  unitPreference = 'kg',
}: OneRMChartProps) {
  const empty = data.length === 0;
  const unitLabel = unitPreference === 'lb' ? 'lb' : 'kg';

  const displayData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        displayValue:
          unitPreference === 'lb'
            ? d.estimatedOneRmKg * LB_PER_KG
            : d.estimatedOneRmKg,
      })),
    [data, unitPreference],
  );

  const maxValue = useMemo(
    () => Math.max(...displayData.map((d) => d.displayValue), 1),
    [displayData],
  );

  const minValue = useMemo(
    () => Math.min(...displayData.map((d) => d.displayValue), 0),
    [displayData],
  );

  const range = maxValue - minValue || 1;

  const formatDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatWeight = (v: number): string => `${Math.round(v)}`;

  const title = exerciseName
    ? `Estimated 1RM — ${exerciseName} (${unitLabel})`
    : `Estimated 1RM (${unitLabel})`;

  // Build polyline points for a simple SVG-style path rendered as positioned dots
  // with connecting lines between them using absolute positioning.
  const chartHeight = 140;
  const chartPaddingH = 16;

  const points = useMemo(() => {
    if (displayData.length < 2) return [];
    return displayData.map((d, i) => ({
      x:
        chartPaddingH +
        (i / (displayData.length - 1)) *
          (100 - chartPaddingH * 2),
      // Invert y: higher value = lower y offset (closer to top)
      y: chartHeight - ((d.displayValue - minValue) / range) * (chartHeight - 16) - 8,
      label: formatWeight(d.displayValue),
      dateLabel: formatDateLabel(d.date),
    }));
  }, [displayData, minValue, range]);

  return (
    <ChartContainer
      title={title}
      loading={loading}
      empty={empty}
      emptyMessage="Log enough sets to calculate an estimated 1RM"
      height={200}
    >
      {/* Simple percentage-positioned dot-and-connector chart */}
      <View style={{ flex: 1, paddingBottom: 20 }}>
        <View style={{ flex: 1, position: 'relative' }}>
          {/* Horizontal guide lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <View
              key={ratio}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: `${(1 - ratio) * 100}%` as unknown as number,
                height: 1,
                backgroundColor: 'rgba(235,235,245,0.06)',
              }}
            />
          ))}

          {/* Connecting line segments between points */}
          {points.length > 1 &&
            points.slice(0, -1).map((pt, i) => {
              const next = points[i + 1];
              const dx = next.x - pt.x;
              const dy = next.y - pt.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              return (
                <View
                  key={`line-${i}`}
                  style={{
                    position: 'absolute',
                    left: `${pt.x}%` as unknown as number,
                    top: pt.y,
                    width: `${length}%` as unknown as number,
                    height: 2,
                    backgroundColor: LINE_COLOR,
                    opacity: 0.7,
                    transformOrigin: 'left center',
                    transform: [{ rotate: `${angle}deg` }],
                  }}
                />
              );
            })}

          {/* Data points and labels */}
          {points.map((pt, i) => (
            <View
              key={`pt-${i}`}
              style={{
                position: 'absolute',
                left: `${pt.x}%` as unknown as number,
                top: pt.y - 4,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: POINT_COLOR,
                  borderWidth: 2,
                  borderColor: '#1C1C1E',
                }}
              />
              {/* Show value label on first and last points, and local maxima */}
              {(i === 0 || i === points.length - 1) && (
                <Text
                  style={{
                    color: LINE_COLOR,
                    fontSize: 10,
                    fontWeight: '600',
                    marginTop: 2,
                  }}
                >
                  {pt.label}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* X-axis date labels */}
        {points.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingHorizontal: 4,
              marginTop: 4,
            }}
          >
            <Text style={{ color: AXIS_LABEL_COLOR, fontSize: 10 }}>
              {points[0].dateLabel}
            </Text>
            {points.length > 2 && (
              <Text style={{ color: AXIS_LABEL_COLOR, fontSize: 10 }}>
                {points[Math.floor(points.length / 2)].dateLabel}
              </Text>
            )}
            <Text style={{ color: AXIS_LABEL_COLOR, fontSize: 10 }}>
              {points[points.length - 1].dateLabel}
            </Text>
          </View>
        )}
      </View>
    </ChartContainer>
  );
}
