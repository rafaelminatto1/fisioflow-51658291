import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useColors } from '@/hooks/useColorScheme';
import { Card } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { useAppointments } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import { getProfessionalStats } from '@/lib/firestore';
import { useQuery } from '@tanstack/react-query';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type PeriodType = 'week' | 'month' | 'quarter' | 'year';

interface StatCard {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

// Simple Bar component for charts
const Bar = ({ label, value, maxValue, color }: { label: string, value: number, maxValue: number, color: string }) => {
  const colors = useColors();
  const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
  
  return (
    <View style={styles.barContainer}>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { height: `${height}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.barLabel, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
    </View>
  );
};

export default function ReportsScreen() {
  const colors = useColors();
  const { light } = useHaptics();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'patients' | 'financial'>('overview');

  const { data: appointments } = useAppointments();
  const { data: patients } = usePatients();

  // Buscar estatísticas do Firestore
  const { data: stats, isLoading } = useQuery({
    queryKey: ['professionalStats'],
    queryFn: () => getProfessionalStats('current-professional'),
  });

  // Calcular dados para o gráfico de tipos
  const appointmentsByType = useMemo(() => {
    const types: Record<string, number> = {};
    appointments.forEach(apt => {
      const type = apt.type || 'Outro';
      types[type] = (types[type] || 0) + 1;
    });
    
    return Object.entries(types)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [appointments]);

  const maxTypeValue = useMemo(() => 
    Math.max(...appointmentsByType.map(t => t.value), 0), 
  [appointmentsByType]);

  // Calcular pacientes mais frequentes
  const topPatients = useMemo(() => {
    const counts: Record<string, { name: string, count: number }> = {};
    appointments.forEach(apt => {
      if (apt.patientId) {
        if (!counts[apt.patientId]) {
          counts[apt.patientId] = { name: apt.patientName || 'Paciente', count: 0 };
        }
        counts[apt.patientId].count++;
      }
    });

    return Object.entries(counts)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [appointments]);

  // Calcular estatísticas baseadas nos dados reais
  const overviewStats = useMemo<StatCard[]>(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Consultas do mês
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
      {
        label: 'Consultas Realizadas',
        value: completedThisMonth,
        change: stats ? `${stats.completedAppointmentsThisMonth} este mês` : undefined,
        changeType: 'up',
        icon: 'checkmark-circle',
        color: colors.success,
      },
      {
        label: 'Taxa de Confirmação',
        value: `${confirmedRate}%`,
        change: confirmedRate >= 70 ? 'Boa' : 'Atenção',
        changeType: confirmedRate >= 70 ? 'up' : 'neutral',
        icon: 'calendar',
        color: colors.primary,
      },
      {
        label: 'Duração Média',
        value: `${avgDuration} min`,
        icon: 'time',
        color: colors.info,
      },
      {
        label: 'Pacientes Ativos',
        value: patients.length,
        change: 'Total',
        changeType: 'neutral',
        icon: 'people',
        color: colors.warning,
      },
    ];
  }, [appointments, patients, stats, colors]);

  const patientStats = useMemo<StatCard[]>(() => {
    const newPatients = patients.filter(p => {
      const createdAt = p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdAt >= thirtyDaysAgo;
    }).length;

    return [
      {
        label: 'Novos Pacientes',
        value: newPatients,
        change: 'Últimos 30 dias',
        changeType: 'up',
        icon: 'person-add',
        color: colors.success,
      },
      {
        label: 'Total de Pacientes',
        value: patients.length,
        icon: 'people',
        color: colors.primary,
      },
      {
        label: 'Pacientes Inativos',
        value: patients.filter(p => p.status === 'inactive').length,
        change: 'Podem ser reativados',
        changeType: 'neutral',
        icon: 'person-outline',
        color: colors.textMuted,
      },
    ];
  }, [patients, colors]);

  const renderStatCard = (stat: StatCard) => (
    <Card key={stat.label} style={styles.statCard}>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
          <Ionicons name={stat.icon} size={24} color={stat.color} />
        </View>
        {stat.change && (
          <View style={[
            styles.changeBadge,
            stat.changeType === 'up' && { backgroundColor: colors.success + '20' },
            stat.changeType === 'down' && { backgroundColor: colors.error + '20' },
          ]}>
            <Ionicons
              name={stat.changeType === 'up' ? 'trending-up' : stat.changeType === 'down' ? 'trending-down' : 'remove'}
              size={14}
              color={stat.changeType === 'up' ? colors.success : stat.changeType === 'down' ? colors.error : colors.textSecondary}
            />
            <Text style={[styles.changeText, { color: stat.changeType === 'up' ? colors.success : stat.changeType === 'down' ? colors.error : colors.textSecondary }]}>
              {stat.change}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => { light(); router.back(); }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Relatórios</Text>
        <TouchableOpacity onPress={() => { light(); /* Export functionality */ }}>
          <Ionicons name="download-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.periodScroll}
        contentContainerStyle={styles.periodContent}
      >
        {(['week', 'month', 'quarter', 'year'] as PeriodType[]).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodChip,
              selectedPeriod === period && { backgroundColor: colors.primary },
            ]}
            onPress={() => {
              light();
              setSelectedPeriod(period);
            }}
          >
            <Text
              style={[
                styles.periodText,
                selectedPeriod === period ? { color: '#FFFFFF' } : { color: colors.textSecondary },
              ]}
            >
              {period === 'week' ? 'Semana' : period === 'month' ? 'Mês' : period === 'quarter' ? 'Trimestre' : 'Ano'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {[
          { key: 'overview' as const, label: 'Visão Geral' },
          { key: 'patients' as const, label: 'Pacientes' },
          { key: 'financial' as const, label: 'Financeiro' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, selectedTab === tab.key && { borderBottomColor: colors.primary }]}
            onPress={() => setSelectedTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab.key ? { color: colors.primary } : { color: colors.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollPadding}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Carregando relatórios...
            </Text>
          </View>
        ) : (
          <>
            {selectedTab === 'overview' && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Resumo do Período
                </Text>
                <View style={styles.statsGrid}>
                  {overviewStats.map(renderStatCard)}
                </View>

                {/* Appointments by Type Chart */}
                <Card style={styles.chartCard} padding="md">
                  <Text style={[styles.chartTitle, { color: colors.text }]}>
                    Consultas por Tipo
                  </Text>
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
                        Nenhum dado disponível para este período
                      </Text>
                    </View>
                  )}
                </Card>
              </>
            )}

            {selectedTab === 'patients' && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Métricas de Pacientes
                </Text>
                <View style={styles.statsGrid}>
                  {patientStats.map(renderStatCard)}
                </View>

                {/* Top Patients */}
                <Card style={styles.topPatientsCard} padding="md">
                  <Text style={[styles.chartTitle, { color: colors.text }]}>
                    Pacientes Mais Frequentes
                  </Text>
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
              </>
            )}

            {selectedTab === 'financial' && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Resumo Financeiro
                </Text>
                <View style={styles.statsGrid}>
                  {([
                    { label: 'Faturamento', value: 'R$ 0,00', icon: 'cash', color: colors.success },
                    { label: 'Consultas', value: appointments.length, icon: 'calendar', color: colors.primary },
                    { label: 'Pendente', value: 'R$ 0,00', icon: 'time', color: colors.warning },
                  ] as StatCard[]).map(renderStatCard)}
                </View>

                <Card style={styles.infoCard} padding="md">
                  <View style={styles.infoContent}>
                    <Ionicons name="information-circle" size={20} color={colors.info} />
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                      Módulo financeiro em desenvolvimento. Configure seus valores e planos de tratamento no perfil de cada paciente.
                    </Text>
                  </View>
                </Card>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  periodScroll: {
    maxHeight: 50,
    marginTop: 8,
  },
  periodContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  periodChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    flex: 1,
  },
  scrollPadding: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    padding: 16,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
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
  barContainer: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - 64) / 5,
  },
  barTrack: {
    width: 24,
    height: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 12,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
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
  infoCard: {
    marginBottom: 16,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
  },
});
