import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ChartContainer } from './ChartContainer';

interface MuscleFrequencyEntry {
  muscleGroup: string;
  /** ISO date strings for each session that trained this muscle */
  sessionDates: string[];
}

interface MuscleFrequencyHeatmapProps {
  data: MuscleFrequencyEntry[];
  /** Number of weeks to show. Default: 8 */
  weeksBack?: number;
  loading?: boolean;
}

const CELL_SIZE = 14;
const CELL_GAP = 3;
const MUSCLE_LABEL_WIDTH = 88;

/** Returns an array of ISO date strings (Monday of each week) going back weeksBack weeks */
function buildWeekStarts(weeksBack: number): string[] {
  const result: string[] = [];
  const now = new Date();
  // Align to Monday
  const dayOfWeek = now.getDay(); // 0=Sun
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - daysToMonday);
  thisMonday.setHours(0, 0, 0, 0);

  for (let i = weeksBack - 1; i >= 0; i--) {
    const d = new Date(thisMonday);
    d.setDate(thisMonday.getDate() - i * 7);
    result.push(d.toISOString().split('T')[0]);
  }
  return result;
}

function isoWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(date);
  monday.setDate(date.getDate() - daysToMonday);
  return monday.toISOString().split('T')[0];
}

function intensityColor(count: number): string {
  if (count === 0) return '#2C2C2E';
  if (count === 1) return '#0A4A2A';
  if (count === 2) return '#0D7A44';
  if (count === 3) return '#1AAD5E';
  return '#30D158'; // 4+
}

function weekLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function MuscleFrequencyHeatmap({
  data,
  weeksBack = 8,
  loading,
}: MuscleFrequencyHeatmapProps) {
  const empty = data.length === 0;

  const weekStarts = useMemo(() => buildWeekStarts(weeksBack), [weeksBack]);

  const heatmapData = useMemo(() => {
    return data.map((entry) => {
      const countByWeek: Record<string, number> = {};
      for (const ws of weekStarts) {
        countByWeek[ws] = 0;
      }
      for (const sessionDate of entry.sessionDates) {
        const ws = isoWeekStart(sessionDate);
        if (ws in countByWeek) {
          countByWeek[ws] += 1;
        }
      }
      return { muscleGroup: entry.muscleGroup, countByWeek };
    });
  }, [data, weekStarts]);

  const chartHeight = Math.max(data.length * (CELL_SIZE + CELL_GAP) + 28, 80);

  return (
    <ChartContainer
      title="Muscle Frequency"
      loading={loading}
      empty={empty}
      emptyMessage="Log workouts to see muscle training frequency"
      height={chartHeight}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Column headers (week labels) */}
          <View
            style={{
              flexDirection: 'row',
              marginLeft: MUSCLE_LABEL_WIDTH,
              marginBottom: 4,
            }}
          >
            {weekStarts.map((ws) => (
              <View
                key={ws}
                style={{ width: CELL_SIZE + CELL_GAP, alignItems: 'center' }}
              >
                <Text
                  style={{
                    color: 'rgba(235,235,245,0.3)',
                    fontSize: 9,
                    transform: [{ rotate: '-45deg' }],
                  }}
                >
                  {weekLabel(ws)}
                </Text>
              </View>
            ))}
          </View>

          {/* Rows */}
          {heatmapData.map((row) => (
            <View
              key={row.muscleGroup}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: CELL_GAP,
              }}
            >
              <Text
                style={{
                  width: MUSCLE_LABEL_WIDTH,
                  color: 'rgba(235,235,245,0.6)',
                  fontSize: 11,
                  textAlign: 'right',
                  paddingRight: 8,
                }}
                numberOfLines={1}
              >
                {row.muscleGroup}
              </Text>
              {weekStarts.map((ws) => {
                const count = row.countByWeek[ws] ?? 0;
                return (
                  <View
                    key={ws}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      borderRadius: 3,
                      backgroundColor: intensityColor(count),
                      marginRight: CELL_GAP,
                    }}
                  />
                );
              })}
            </View>
          ))}

          {/* Legend */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginLeft: MUSCLE_LABEL_WIDTH,
              marginTop: 6,
            }}
          >
            <Text
              style={{ color: 'rgba(235,235,245,0.3)', fontSize: 9, marginRight: 4 }}
            >
              0
            </Text>
            {[0, 1, 2, 3, 4].map((count) => (
              <View
                key={count}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  borderRadius: 3,
                  backgroundColor: intensityColor(count),
                  marginRight: 2,
                }}
              />
            ))}
            <Text
              style={{ color: 'rgba(235,235,245,0.3)', fontSize: 9, marginLeft: 2 }}
            >
              4+ sessions
            </Text>
          </View>
        </View>
      </ScrollView>
    </ChartContainer>
  );
}
