/**
 * Simple Weekly Chart Component
 * Bar chart showing daily values for a week
 */

import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { format, startOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 32;
const BAR_WIDTH = 24;
const GAP = (CHART_WIDTH - 40 - BAR_WIDTH * 7) / 6;

interface WeeklyChartData {
  date: Date;
  value: number;
  label?: string;
}

interface WeeklyChartProps {
  data: WeeklyChartData[];
  color: string;
  maxValue?: number;
  title?: string;
  subtitle?: string;
  colors?: any;
}

export function WeeklyChart({
  data,
  color,
  maxValue,
  title,
  subtitle,
  colors,
}: WeeklyChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);

  return (
    <View style={styles.container}>
      {title && (
        <Text style={[styles.title, { color: colors?.text || '#111827' }]}>
          {title}
        </Text>
      )}
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors?.textSecondary || '#6B7280' }]}>
          {subtitle}
        </Text>
      )}

      <View style={styles.chartContainer}>
        {data.map((item, index) => {
          const barHeight = (item.value / max) * 120;
          const isToday = index === 6; // Assuming last item is today

          return (
            <View key={index} style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: isToday ? color : `${color}80`,
                  },
                ]}
              />
              <Text
                style={[
                  styles.value,
                  { color: colors?.text || '#111827' },
                ]}
              >
                {item.value}
              </Text>
              <Text
                style={[
                  styles.label,
                  { color: isToday ? color : colors?.textSecondary || '#6B7280' },
                ]}
              >
                {item.label || format(item.date, 'EEE', { locale: ptBR }).slice(0, 3)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// Generate sample week data
export function generateWeekData(baseDate: Date = new Date(), values?: number[]): WeeklyChartData[] {
  const start = startOfWeek(baseDate, { weekStartsOn: 0 });

  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return {
      date,
      value: values?.[i] || Math.floor(Math.random() * 10) + 1,
    };
  });
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
    paddingHorizontal: 8,
  },
  barContainer: {
    alignItems: 'center',
    width: BAR_WIDTH,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: 8,
    marginBottom: 4,
  },
  value: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
});
