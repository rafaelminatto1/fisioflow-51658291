import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useColors } from '@/hooks/useColorScheme';
import type { Evolution } from '@/types';
import { format } from 'date-fns';

interface PainProgressChartProps {
  evolutions: Evolution[];
}

export const PainProgressChart = ({ evolutions }: PainProgressChartProps) => {
  const colors = useColors();
  const screenWidth = Dimensions.get('window').width - 64; // Padding adjustments

  // Filter evolutions that have painLevel and sort them by date (oldest to newest)
  const chartData = evolutions
    .filter(ev => ev.painLevel !== undefined)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-7); // Last 7 sessions

  if (chartData.length < 2) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Dados insuficientes para gerar o gráfico de evolução (mínimo 2 sessões com nível de dor).
        </Text>
      </View>
    );
  }

  const data = {
    labels: chartData.map(ev => format(new Date(ev.date), 'dd/MM')),
    datasets: [
      {
        data: chartData.map(ev => ev.painLevel || 0),
        color: (opacity = 1) => colors.primary,
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => colors.primary,
    labelColor: (opacity = 1) => colors.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: colors.primary,
    },
    fillShadowGradient: colors.primary,
    fillShadowGradientOpacity: 0.2,
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Evolução do Nível de Dor</Text>
      <LineChart
        data={data}
        width={screenWidth}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        fromZero
        yAxisInterval={1}
        segments={5}
        yAxisLabel=""
        yAxisSuffix=""
      />
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Histórico das últimas {chartData.length} sessões
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  emptyContainer: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  footerText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
