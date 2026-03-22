import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { Card } from '@/components';
import { StatGrid } from './StatGrid';

interface PatientsTabProps {
  patients: any[];
  topPatients: any[];
}

export function PatientsTab({ patients, topPatients }: PatientsTabProps) {
  const colors = useColors();

  const patientStats = useMemo(() => {
    const newPatients = patients.filter(p => {
      const createdAt = p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdAt >= thirtyDaysAgo;
    }).length;

    return [
      { label: 'Novos (30d)', value: newPatients, color: colors.success },
      { label: 'Total', value: patients.length, color: colors.primary },
      { label: 'Inativos', value: patients.filter(p => p.status === 'inactive').length, color: colors.textMuted },
    ];
  }, [patients, colors]);

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Métricas de Pacientes</Text>
      <StatGrid stats={patientStats} />

      <Card style={styles.topPatientsCard} padding="md">
        <Text style={[styles.chartTitle, { color: colors.text }]}>Mais Frequentes</Text>
        {topPatients.length > 0 ? (
          topPatients.map((patient, idx) => (
            <View key={patient.id} style={[styles.topPatientItem, idx === topPatients.length - 1 && { borderBottomWidth: 0 }, { borderBottomColor: colors.border }]}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{idx + 1}</Text>
              </View>
              <Text style={[styles.patientName, { color: colors.text }]}>{patient.name}</Text>
              <Text style={[styles.visitCount, { color: colors.textSecondary }]}>
                {patient.count} visitas
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.chartPlaceholder}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
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
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
  },
  topPatientsCard: {
    marginBottom: 16,
  },
  topPatientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  patientName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
  },
  visitCount: {
    fontSize: 14,
    fontWeight: '600',
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
