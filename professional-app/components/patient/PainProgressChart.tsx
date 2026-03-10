import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { CartesianChart, Line, Area, Points } from 'victory-native';
import { useColors } from '@/hooks/useColorScheme';
import type { Evolution } from '@/types';
import { format } from 'date-fns';
import { useFont, vec, LinearGradient } from '@shopify/react-native-skia';

interface PainProgressChartProps {
  evolutions: Evolution[];
}

export const PainProgressChart = ({ evolutions }: PainProgressChartProps) => {
  const colors = useColors();
  const screenWidth = Dimensions.get('window').width - 48;

  // Filter evolutions that have painLevel and sort them by date (oldest to newest)
  const chartData = evolutions
    .filter(ev => ev.painLevel !== undefined)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-7) // Last 7 sessions
    .map((ev, index) => ({
      x: index,
      y: ev.painLevel || 0,
      label: format(new Date(ev.date), 'dd/MM'),
    }));

  if (chartData.length < 2) {
    return (
      <View 
        style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
        accessible={true}
        accessibilityLabel="Gráfico de evolução da dor disponível após 2 sessões."
      >
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Dados insuficientes para gerar o gráfico de evolução (mínimo 2 sessões com nível de dor).
        </Text>
      </View>
    );
  }

  return (
    <View 
      style={styles.container}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={`Gráfico de evolução da dor das últimas ${chartData.length} sessões. Nível atual: ${chartData[chartData.length - 1].y} de 10.`}
    >
      <Text style={[styles.title, { color: colors.text }]}>Evolução do Nível de Dor (Skia 60FPS)</Text>
      
      <View style={{ width: screenWidth, height: 220 }}>
        <CartesianChart
          data={chartData}
          xKey="x"
          yKeys={["y"]}
          axisOptions={{
            font: null, // Using default font system if no custom font loaded
            labelColor: colors.textSecondary,
            lineColor: colors.border,
            tickCount: 5,
            formatYLabel: (y) => `${y}`,
            formatXLabel: (x) => chartData[x as number]?.label || '',
          }}
        >
          {({ points, chartBounds }) => (
            <>
              {/* Gradient for the area below the line */}
              <Area
                points={points.y}
                y0={chartBounds.bottom}
                animate={{ type: "timing", duration: 500 }}
                opacity={0.15}
              >
                <LinearGradient
                    start={vec(0, chartBounds.top)}
                    end={vec(0, chartBounds.bottom)}
                    colors={[colors.primary, `${colors.primary}00`]}
                />
              </Area>
              
              {/* The evolution line */}
              <Line 
                points={points.y} 
                color={colors.primary} 
                strokeWidth={3}
                animate={{ type: "timing", duration: 500 }}
              />

              {/* Data points */}
              <Points
                points={points.y}
                color={colors.primary}
                radius={5}
              />
            </>
          )}
        </CartesianChart>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Histórico de alta performance Skia • {chartData.length} sessões
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
    alignSelf: 'flex-start',
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
  footer: {
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  footerText: {
    fontSize: 11,
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
});
