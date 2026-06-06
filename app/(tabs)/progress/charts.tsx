import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import {
  subMonths,
  startOfDay,
  startOfWeek,
  format,
  isAfter,
} from 'date-fns';
import { colors } from '../../../src/constants/colors';
import { spacing, radius } from '../../../src/constants/spacing';
import { typography } from '../../../src/constants/typography';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { FilterChip } from '../../../src/components/ui/FilterChip';
import { VolumeLoadChart } from '../../../src/components/charts/VolumeLoadChart';
import { OneRMChart } from '../../../src/components/charts/OneRMChart';
import { lttb } from '../../../src/utils/lttb';
import { maxPerPeriod } from '../../../src/utils/max-per-period';
import { calculateOneRM } from '../../../src/services/one-rm-calculator';
import type { ExerciseModel } from '../../../src/db/models/Exercise';
import type { Set as SetModel } from '../../../src/db/models/Set';

// ─── Types ────────────────────────────────────────────────────────────────────

type DateRange = '1M' | '3M' | '6M' | '1Y' | 'All';
type ChartTab = 'Volume' | '1RM' | 'Max Weight' | 'Reps';

interface ExerciseSuggestion {
  id: string;
  name: string;
}

interface SetRow {
  date: Date;
  weightKgActual: number | null;
  reps: number | null;
  isWarmup: boolean;
  setType: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateRangeCutoff(range: DateRange): Date | null {
  const now = new Date();
  switch (range) {
    case '1M': return subMonths(now, 1);
    case '3M': return subMonths(now, 3);
    case '6M': return subMonths(now, 6);
    case '1Y': return subMonths(now, 12);
    case 'All': return null;
  }
}

function weekStart(date: Date): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

// ─── Exercise Selector ────────────────────────────────────────────────────────

interface ExerciseSelectorProps {
  selectedId: string | null;
  selectedName: string;
  onSelect: (ex: ExerciseSuggestion) => void;
}

const ExerciseSelector = memo(({ selectedId, selectedName, onSelect }: ExerciseSelectorProps) => {
  const database = useDatabase();
  const [query, setQuery] = useState(selectedName);
  const [suggestions, setSuggestions] = useState<ExerciseSuggestion[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(selectedName);
  }, [selectedName]);

  const search = useCallback(async (text: string) => {
    if (text.trim().length < 1) { setSuggestions([]); return; }
    const results = await database
      .get<ExerciseModel>('exercises')
      .query(
        Q.where('is_archived', false),
        Q.where('name', Q.like(`%${Q.sanitizeLikeString(text)}%`)),
        Q.take(8),
      )
      .fetch();
    setSuggestions(results.map((e) => ({ id: e.id, name: e.name })));
  }, [database]);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
    setOpen(true);
    void search(text);
  }, [search]);

  const handleSelect = useCallback((ex: ExerciseSuggestion) => {
    setQuery(ex.name);
    setSuggestions([]);
    setOpen(false);
    onSelect(ex);
  }, [onSelect]);

  return (
    <View style={selectorStyles.container}>
      <View style={selectorStyles.inputRow}>
        <Text style={selectorStyles.icon}>{'🔍'}</Text>
        <TextInput
          style={selectorStyles.input}
          value={query}
          onChangeText={handleChangeText}
          onFocus={() => setOpen(true)}
          placeholder="Select an exercise…"
          placeholderTextColor="#8E8E93"
          returnKeyType="search"
          accessibilityLabel="Select exercise for charts"
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => { setQuery(''); setSuggestions([]); setOpen(false); }}
            hitSlop={8}
            accessibilityLabel="Clear"
          >
            <Text style={selectorStyles.clear}>{'✕'}</Text>
          </Pressable>
        )}
      </View>
      {open && suggestions.length > 0 && (
        <View style={selectorStyles.dropdown}>
          {suggestions.map((ex) => (
            <Pressable
              key={ex.id}
              style={({ pressed }) => [
                selectorStyles.suggestion,
                ex.id === selectedId && selectorStyles.suggestionSelected,
                pressed && selectorStyles.suggestionPressed,
              ]}
              onPress={() => handleSelect(ex)}
              accessibilityRole="button"
            >
              <Text style={selectorStyles.suggestionText}>{ex.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
});

ExerciseSelector.displayName = 'ExerciseSelector';

const selectorStyles = StyleSheet.create({
  container: { position: 'relative', zIndex: 10 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: spacing.sm,
  },
  icon: { fontSize: 15 },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.label.primary.dark,
  },
  clear: {
    fontSize: 14,
    color: colors.label.secondary.dark,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.background.elevated.dark,
    borderRadius: radius.md,
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 20,
  },
  suggestion: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator.dark,
  },
  suggestionSelected: {
    backgroundColor: 'rgba(0,122,255,0.15)',
  },
  suggestionPressed: {
    backgroundColor: colors.background.secondary.dark,
  },
  suggestionText: {
    ...typography.subheadline,
    color: colors.label.primary.dark,
  },
});

// ─── PR Annotation ────────────────────────────────────────────────────────────

interface PRAnnotationProps {
  label: string;
  date: string;
}

const PRAnnotation = memo(({ label, date }: PRAnnotationProps) => (
  <View style={annotationStyles.container}>
    <View style={annotationStyles.line} />
    <View style={annotationStyles.labelBox}>
      <Text style={annotationStyles.prText}>PR</Text>
      <Text style={annotationStyles.dateText}>{date}</Text>
    </View>
  </View>
));

PRAnnotation.displayName = 'PRAnnotation';

const annotationStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    alignItems: 'center',
  },
  line: {
    flex: 1,
    width: 1,
    backgroundColor: colors.semantic.pr,
    opacity: 0.6,
  },
  labelBox: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignItems: 'center',
  },
  prText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.semantic.pr,
    letterSpacing: 0.3,
  },
  dateText: {
    fontSize: 8,
    color: colors.label.secondary.dark,
  },
});

// ─── Max Weight / Reps Chart (simple) ─────────────────────────────────────────

interface SimpleLineChartProps {
  data: { date: string; value: number }[];
  unit?: string;
  emptyMessage: string;
  title: string;
  color?: string;
}

const SimpleLineChart = memo(({
  data,
  unit = '',
  emptyMessage,
  title,
  color = colors.system.orange,
}: SimpleLineChartProps) => {
  const empty = data.length === 0;
  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);
  const minValue = useMemo(() => Math.min(...data.map((d) => d.value), 0), [data]);
  const range = maxValue - minValue || 1;
  const chartHeight = 120;

  const points = useMemo(() => {
    if (data.length < 2) return [];
    return data.map((d, i) => ({
      x: (i / (data.length - 1)) * 100,
      y: chartHeight - ((d.value - minValue) / range) * (chartHeight - 12) - 6,
      value: d.value,
      dateLabel: (() => {
        const dt = new Date(d.date);
        return `${dt.getMonth() + 1}/${dt.getDate()}`;
      })(),
    }));
  }, [data, minValue, range]);

  return (
    <View style={simpleChartStyles.wrapper}>
      <Text style={simpleChartStyles.title}>{title}{unit ? ` (${unit})` : ''}</Text>
      {empty ? (
        <Text style={simpleChartStyles.empty}>{emptyMessage}</Text>
      ) : (
        <View style={[simpleChartStyles.chart, { height: chartHeight + 28 }]}>
          <View style={{ height: chartHeight, position: 'relative' }}>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <View
                key={ratio}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: `${(1 - ratio) * 100}%` as unknown as number,
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: 'rgba(235,235,245,0.06)',
                }}
              />
            ))}
            {points.slice(0, -1).map((pt, i) => {
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
                    backgroundColor: color,
                    opacity: 0.7,
                    transformOrigin: 'left center' as unknown as undefined,
                    transform: [{ rotate: `${angle}deg` }],
                  }}
                />
              );
            })}
            {points.map((pt, i) => (
              <View
                key={`pt-${i}`}
                style={{
                  position: 'absolute',
                  left: `${pt.x}%` as unknown as number,
                  top: pt.y - 4,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: color,
                    borderWidth: 2,
                    borderColor: '#1C1C1E',
                  }}
                />
              </View>
            ))}
          </View>
          {points.length > 0 && (
            <View style={simpleChartStyles.xAxis}>
              <Text style={simpleChartStyles.axisLabel}>{points[0].dateLabel}</Text>
              {points.length > 2 && (
                <Text style={simpleChartStyles.axisLabel}>
                  {points[Math.floor(points.length / 2)].dateLabel}
                </Text>
              )}
              <Text style={simpleChartStyles.axisLabel}>
                {points[points.length - 1].dateLabel}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

SimpleLineChart.displayName = 'SimpleLineChart';

const simpleChartStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.footnote,
    color: colors.label.secondary.dark,
    fontWeight: '600',
  },
  chart: {
    paddingTop: 8,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  axisLabel: {
    ...typography.caption,
    color: 'rgba(235,235,245,0.4)',
  },
  empty: {
    ...typography.subheadline,
    color: colors.label.secondary.dark,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const DATE_RANGES: DateRange[] = ['1M', '3M', '6M', '1Y', 'All'];
const CHART_TABS: ChartTab[] = ['Volume', '1RM', 'Max Weight', 'Reps'];

export default function ChartsScreen() {
  const database = useDatabase();
  const { unitPreference, oneRmFormula } = useSettingsStore();

  const [selectedExercise, setSelectedExercise] = useState<ExerciseSuggestion | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('3M');
  const [activeTab, setActiveTab] = useState<ChartTab>('Volume');
  const [sets, setSets] = useState<SetRow[]>([]);
  const [loadingSets, setLoadingSets] = useState(false);

  const loadSets = useCallback(async (exerciseId: string) => {
    setLoadingSets(true);
    try {
      const raw = await database
        .get<SetModel>('sets')
        .query(
          Q.where('exercise_id', exerciseId),
          Q.where('is_warmup', false),
          Q.where('set_type', Q.notEq('warmup')),
          Q.where('completed_at', Q.notEq(null)),
          Q.sortBy('completed_at', Q.asc),
        )
        .fetch();

      setSets(raw.map((s) => ({
        date: s.completedAt ? new Date(s.completedAt as unknown as number) : new Date(),
        weightKgActual: s.weightKgActual,
        reps: s.reps,
        isWarmup: s.isWarmup,
        setType: s.setType,
      })));
    } finally {
      setLoadingSets(false);
    }
  }, [database]);

  useEffect(() => {
    if (selectedExercise) {
      void loadSets(selectedExercise.id);
    } else {
      setSets([]);
    }
  }, [selectedExercise, loadSets]);

  // Apply date range filter
  const filteredSets = useMemo(() => {
    const cutoff = dateRangeCutoff(dateRange);
    if (!cutoff) return sets;
    return sets.filter((s) => isAfter(s.date, cutoff));
  }, [sets, dateRange]);

  // Build volume chart data (weekly totals, LTTB-downsampled to 200)
  const volumeData = useMemo(() => {
    const weekMap = new Map<string, number>();
    for (const s of filteredSets) {
      if (s.weightKgActual == null || s.reps == null) continue;
      const key = weekStart(s.date);
      weekMap.set(key, (weekMap.get(key) ?? 0) + s.weightKgActual * s.reps);
    }
    const points = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, volumeKg]) => ({ weekStart, volumeKg }));

    // Apply LTTB downsampling for > 200 points
    if (points.length <= 200) return points;
    const lttbInput = points.map((p) => ({ x: new Date(p.weekStart).getTime(), y: p.volumeKg }));
    const downsampled = lttb(lttbInput, 200);
    return downsampled.map((p) => ({
      weekStart: format(new Date(p.x), 'yyyy-MM-dd'),
      volumeKg: p.y,
    }));
  }, [filteredSets]);

  // Build e1RM chart data (max-per-period by week)
  const oneRmData = useMemo(() => {
    const pointsByDate: { date: string; estimatedOneRmKg: number }[] = [];
    for (const s of filteredSets) {
      if (s.weightKgActual == null || s.reps == null || s.reps <= 0) continue;
      const e1rm = calculateOneRM(s.weightKgActual, s.reps, oneRmFormula ?? 'epley');
      if (e1rm > 0) {
        pointsByDate.push({
          date: format(s.date, 'yyyy-MM-dd'),
          estimatedOneRmKg: e1rm,
        });
      }
    }
    // Max-per-period (weekly) — never use mean
    const weekMap = new Map<string, number>();
    for (const p of pointsByDate) {
      const key = weekStart(new Date(p.date));
      const prev = weekMap.get(key) ?? 0;
      if (p.estimatedOneRmKg > prev) weekMap.set(key, p.estimatedOneRmKg);
    }
    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, estimatedOneRmKg]) => ({ date, estimatedOneRmKg }));
  }, [filteredSets, oneRmFormula]);

  // Max weight per day
  const maxWeightData = useMemo(() => {
    const dayMap = new Map<string, number>();
    for (const s of filteredSets) {
      if (s.weightKgActual == null) continue;
      const key = format(startOfDay(s.date), 'yyyy-MM-dd');
      const prev = dayMap.get(key) ?? 0;
      if (s.weightKgActual > prev) dayMap.set(key, s.weightKgActual);
    }
    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));
  }, [filteredSets]);

  // Max reps per day
  const maxRepsData = useMemo(() => {
    const dayMap = new Map<string, number>();
    for (const s of filteredSets) {
      if (s.reps == null) continue;
      const key = format(startOfDay(s.date), 'yyyy-MM-dd');
      const prev = dayMap.get(key) ?? 0;
      if (s.reps > prev) dayMap.set(key, s.reps);
    }
    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));
  }, [filteredSets]);

  const unitLabel = unitPreference === 'lb' ? 'lb' : 'kg';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <Text style={styles.backChevron}>{'‹'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Exercise Selector ──────────────────────────────────────── */}
        <View style={styles.section}>
          <ExerciseSelector
            selectedId={selectedExercise?.id ?? null}
            selectedName={selectedExercise?.name ?? ''}
            onSelect={setSelectedExercise}
          />
        </View>

        {selectedExercise == null ? (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderIcon}>{'📊'}</Text>
            <Text style={styles.placeholderTitle}>Select an exercise</Text>
            <Text style={styles.placeholderBody}>
              Search for an exercise above to view your analytics charts.
            </Text>
          </View>
        ) : (
          <>
            {/* ── Date Range Picker ─────────────────────────────────── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {DATE_RANGES.map((range) => (
                <FilterChip
                  key={range}
                  label={range}
                  selected={dateRange === range}
                  onPress={() => setDateRange(range)}
                />
              ))}
            </ScrollView>

            {/* ── Chart Tab Row ─────────────────────────────────────── */}
            <View style={styles.tabRow}>
              {CHART_TABS.map((tab) => (
                <Pressable
                  key={tab}
                  style={[styles.tab, activeTab === tab && styles.tabActive]}
                  onPress={() => setActiveTab(tab)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeTab === tab }}
                >
                  <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                    {tab}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* ── Chart Area ────────────────────────────────────────── */}
            <View style={styles.section}>
              {loadingSets ? (
                <View style={styles.loadingChart}>
                  <Text style={styles.loadingText}>Loading data…</Text>
                </View>
              ) : (
                <>
                  {activeTab === 'Volume' && (
                    <VolumeLoadChart
                      data={volumeData}
                      unitPreference={unitPreference}
                    />
                  )}
                  {activeTab === '1RM' && (
                    <OneRMChart
                      data={oneRmData}
                      exerciseName={selectedExercise.name}
                      unitPreference={unitPreference}
                    />
                  )}
                  {activeTab === 'Max Weight' && (
                    <SimpleLineChart
                      data={maxWeightData}
                      unit={unitLabel}
                      title={`Max Weight — ${selectedExercise.name}`}
                      emptyMessage="No weight data for the selected period"
                      color={colors.system.orange}
                    />
                  )}
                  {activeTab === 'Reps' && (
                    <SimpleLineChart
                      data={maxRepsData}
                      title={`Max Reps — ${selectedExercise.name}`}
                      emptyMessage="No rep data for the selected period"
                      color={colors.system.purple}
                    />
                  )}
                </>
              )}
            </View>

            {/* ── Summary Stats ─────────────────────────────────────── */}
            {!loadingSets && filteredSets.length > 0 && (
              <View style={[styles.section, styles.summaryRow]}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{filteredSets.length}</Text>
                  <Text style={styles.summaryLabel}>sets logged</Text>
                </View>
                <View style={styles.summarySep} />
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{volumeData.length}</Text>
                  <Text style={styles.summaryLabel}>active weeks</Text>
                </View>
                <View style={styles.summarySep} />
                <View style={styles.summaryCard}>
                  {oneRmData.length > 0 ? (
                    <>
                      <Text style={styles.summaryValue}>
                        {Math.round(oneRmData[oneRmData.length - 1].estimatedOneRmKg)}{unitLabel}
                      </Text>
                      <Text style={styles.summaryLabel}>latest e1RM</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.summaryValue}>—</Text>
                      <Text style={styles.summaryLabel}>e1RM</Text>
                    </>
                  )}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary.dark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator.dark,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backChevron: {
    fontSize: 28,
    lineHeight: 32,
    color: colors.system.blue,
    fontWeight: '300',
  },
  headerTitle: {
    ...typography.headline,
    color: colors.label.primary.dark,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 48,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },

  // Tab row
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    padding: 4,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.background.elevated.dark,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.label.secondary.dark,
  },
  tabLabelActive: {
    color: colors.label.primary.dark,
    fontWeight: '600',
  },

  // Placeholder
  placeholderContainer: {
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  placeholderTitle: {
    ...typography.title3,
    color: colors.label.primary.dark,
    textAlign: 'center',
  },
  placeholderBody: {
    ...typography.subheadline,
    color: colors.label.secondary.dark,
    textAlign: 'center',
  },

  // Loading
  loadingChart: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
  },
  loadingText: {
    ...typography.subheadline,
    color: colors.label.secondary.dark,
  },

  // Summary stats
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary.dark,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summarySep: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    backgroundColor: colors.separator.dark,
  },
  summaryValue: {
    ...typography.title3,
    color: colors.label.primary.dark,
  },
  summaryLabel: {
    ...typography.footnote,
    color: colors.label.secondary.dark,
    textAlign: 'center',
  },
});
