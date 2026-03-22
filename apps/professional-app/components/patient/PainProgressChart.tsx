import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import type { Evolution } from '@/types';
import { format } from 'date-fns';

interface PainProgressChartProps {
  evolutions: Evolution[];
}

const CHART_HEIGHT = 160;

export const PainProgressChart = ({ evolutions }: PainProgressChartProps) => {
  const colors = useColors();
  const screenWidth = Dimensions.get('window').width - 48;

  const chartData = evolutions
    .filter((evolution) => evolution.painLevel !== undefined)
    .sort((left, right) => new Date(left.date || '').getTime() - new Date(right.date || '').getTime())
    .slice(-7)
    .map((evolution, index) => ({
      id: `${evolution.id}-${index}`,
      value: Math.max(0, Math.min(10, evolution.painLevel || 0)),
      label: evolution.date ? format(new Date(evolution.date), 'dd/MM') : '',
    }));

  if (chartData.length < 2) {
    return (
      <View
        style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
        accessible
        accessibilityLabel="Gráfico de evolução da dor disponível após 2 sessões."
      >
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Dados insuficientes para gerar o gráfico de evolução da dor.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Gráfico de evolução da dor das últimas ${chartData.length} sessões. Nível atual: ${chartData[chartData.length - 1]?.value ?? 0} de 10.`}
    >
      <Text style={[styles.title, { color: colors.text }]}>Evolução do Nível de Dor</Text>

      <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border, width: screenWidth }]}>
        <View style={styles.yAxis}>
          {[10, 8, 6, 4, 2, 0].map((tick) => (
            <Text key={tick} style={[styles.axisLabel, { color: colors.textMuted }]}>
              {tick}
            </Text>
          ))}
        </View>

        <View style={styles.plotArea}>
          {[0, 1, 2, 3, 4].map((line) => (
            <View
              key={line}
              style={[
                styles.gridLine,
                {
                  borderColor: colors.border,
                  top: (CHART_HEIGHT / 4) * line,
                },
              ]}
            />
          ))}

          <View style={styles.columns}>
            {chartData.map((point) => {
              const height = Math.max(8, (point.value / 10) * CHART_HEIGHT);
              return (
                <View key={point.id} style={styles.columnWrapper}>
                  <Text style={[styles.valueLabel, { color: colors.text }]}>
                    {point.value}
                  </Text>
                  <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          backgroundColor: colors.primary,
                          height,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.xLabel, { color: colors.textMuted }]}>{point.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <Text style={[styles.footerText, { color: colors.textMuted }]}>
        Histórico recente de dor • {chartData.length} sessões
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  chartCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
  },
  yAxis: {
    justifyContent: 'space-between',
    height: CHART_HEIGHT,
    marginRight: 12,
  },
  axisLabel: {
    fontSize: 11,
  },
  plotArea: {
    flex: 1,
    height: CHART_HEIGHT + 34,
    justifyContent: 'flex-end',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: CHART_HEIGHT + 24,
  },
  columnWrapper: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  valueLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  barTrack: {
    width: 24,
    height: CHART_HEIGHT,
    borderRadius: 12,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 12,
  },
  xLabel: {
    fontSize: 10,
  },
  footerText: {
    fontSize: 11,
    marginTop: 8,
    textAlign: 'right',
  },
  emptyContainer: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
});
