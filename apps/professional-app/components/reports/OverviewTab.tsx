import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useColors } from '@/hooks/useColorScheme';
import { Card } from '@/components';
import { Bar } from './BarChart';
import { StatGrid } from './StatGrid';

interface OverviewTabProps {
  appointments: any[];
  patients: any[];
  stats: any;
  appointmentsByType: any[];
  maxTypeValue: number;
}

export function OverviewTab({ 
  appointments, 
  patients, 
  stats: _stats, 
  appointmentsByType, 
  maxTypeValue 
}: OverviewTabProps) {
  const colors = useColors();

  const overviewStats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const monthAppointments = appointments.filter(apt => {
      const aptDate = apt.date instanceof Date ? apt.date : new Date(apt.date);
      return aptDate >= monthStart && aptDate <= monthEnd;
    });

    const completedThisMonth = monthAppointments.filter(apt =>
      apt.status === 'completed' || apt.status === 'concluido'
    ).length;

    const confirmedRate = monthAppointments.length > 0
      ? Math.round((monthAppointments.filter(apt =>
          apt.status === 'confirmed' || apt.status === 'confirmado'
        ).length / monthAppointments.length) * 100)
      : 0;

    const avgDuration = monthAppointments.length > 0
      ? Math.round(monthAppointments.reduce((sum, apt) => sum + apt.duration, 0) / monthAppointments.length)
      : 0;

    return [
      { label: 'Consultas', value: completedThisMonth, color: colors.success },
      { label: 'Confirmação', value: `${confirmedRate}%`, color: colors.primary },
      { label: 'Duração Média', value: `${avgDuration} min`, color: colors.info },
      { label: 'Pacientes Ativos', value: patients.length, color: colors.warning },
    ];
  }, [appointments, patients, colors]);

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Resumo do Período</Text>
      <StatGrid stats={overviewStats} />

      <Card style={styles.chartCard} padding="md">
        <Text style={[styles.chartTitle, { color: colors.text }]}>Consultas por Tipo</Text>
        {appointmentsByType.length > 0 ? (
          <View style={styles.chartContent}>
            {appointmentsByType.map((item, idx) => (
              <Bar 
                key={idx} 
                label={item.label} 
                value={item.value} 
                maxValue={maxTypeValue} 
                color={colors.primary} 
              />
            ))}
          </View>
        ) : (
          <View style={styles.chartPlaceholder}>
            <Ionicons name="bar-chart" size={48} color={colors.textMuted} />
            <Text style={[styles.chartPlaceholderText, { color: colors.textSecondary }]}>
              Nenhum dado disponível
            </Text>
          </View>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  chartCard: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
  },
  chartContent: {
    flexDirection: 'row',
    height: 200,
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 20,
  },
  chartPlaceholder: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  chartPlaceholderText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
