import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { StatCard } from '@/components/ui/StatCard';
import { DateRangePicker } from '@/components/DateRangePicker';
import { WeeklyChart, generateWeekData } from '@/components/ui/WeeklyChart';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { HapticFeedback } from '@/lib/haptics';
import { collection, query, where, getDocs, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 32;

type ReportPeriod = 'week' | 'month' | 'quarter' | 'year';
type ReportTab = 'overview' | 'financial' | 'patients' | 'performance';

interface ReportData {
  totalRevenue: number;
  completedSessions: number;
  cancelledSessions: number;
  newPatients: number;
  activePatients: number;
  averageRating: number;
  totalAppointments: number;
  noShowRate: number;
  occupancyRate: number;
}

export default function ReportsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [period, setPeriod] = useState<ReportPeriod>('month');

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const [reportData, setReportData] = useState<ReportData>({
    totalRevenue: 0,
    completedSessions: 0,
    cancelledSessions: 0,
    newPatients: 0,
    activePatients: 0,
    averageRating: 0,
    totalAppointments: 0,
    noShowRate: 0,
    occupancyRate: 0,
  });

  useEffect(() => {
    loadReportData();
  }, [startDate, endDate, period]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      // Load appointments for the period
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('therapist_id', '==', profile?.id),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(appointmentsQuery);

      const appointments: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const aptDate = data.date?.toDate?.() || new Date();
        if (aptDate >= startDate && aptDate <= endDate) {
          appointments.push({ id: doc.id, ...data });
        }
      });

      // Calculate metrics
      const completedSessions = appointments.filter(a => a.status === 'concluido').length;
      const cancelledSessions = appointments.filter(a => a.status === 'cancelado' || a.status === 'faltou').length;
      const noShowSessions = appointments.filter(a => a.status === 'faltou').length;

      // Calculate revenue (would need pricing info)
      const totalRevenue = completedSessions * 150; // Average session price

      // Load patients stats
      const patientsSnapshot = await getDocs(collection(db, 'patients'));
      const activePatients = patientsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.status === 'Em Tratamento' || data.status === 'Recuperação';
      }).length;

      const newPatients = patientsSnapshot.docs.filter(doc => {
        const data = doc.data();
        const createdAt = data.created_at?.toDate?.() || new Date();
        return createdAt >= startDate && createdAt <= endDate;
      }).length;

      setReportData({
        totalRevenue,
        completedSessions,
        cancelledSessions,
        newPatients,
        activePatients,
        averageRating: 4.8, // Would need to calculate from reviews
        totalAppointments: appointments.length,
        noShowRate: appointments.length > 0 ? (noShowSessions / appointments.length) * 100 : 0,
        occupancyRate: completedSessions / 160 * 100, // Assuming 160 monthly capacity
      });
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = useCallback((format: 'pdf' | 'excel') => {
    HapticFeedback.light();
    Alert.alert('Exportar', `Relatório será exportado em ${format.toUpperCase()}. Esta funcionalidade será implementada em breve.`);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Relatórios</Text>
        <Pressable onPress={() => handleExport('pdf')} style={styles.exportButton}>
          <Icon name="download" size={24} color={colors.primary} />
        </Pressable>
      </View>

      {/* Period Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodScroll}>
        {(['week', 'month', 'quarter', 'year'] as ReportPeriod[]).map((periodOption) => (
          <Pressable
            key={periodOption}
            onPress={() => {
              HapticFeedback.selection();
              setPeriod(periodOption);
            }}
            style={({ pressed }) => [
              styles.periodChip,
              {
                backgroundColor: period === periodOption ? colors.primary : colors.card,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.periodText,
                { color: period === periodOption ? '#fff' : colors.text },
              ]}
            >
              {periodOption === 'week' ? 'Semana' : periodOption === 'month' ? 'Mês' : periodOption === 'quarter' ? 'Trimestre' : 'Ano'}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Date Range Display */}
      <View style={styles.dateRangeContainer}>
        <Icon name="calendar" size={16} color={colors.textSecondary} />
        <Text style={[styles.dateRangeText, { color: colors.text }]}>
          {format(startDate, "dd/MM/yyyy")} - {format(endDate, "dd/MM/yyyy")}
        </Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        <TabButton label="Visão Geral" active={activeTab === 'overview'} onPress={() => setActiveTab('overview')} colors={colors} />
        <TabButton label="Financeiro" active={activeTab === 'financial'} onPress={() => setActiveTab('financial')} colors={colors} />
        <TabButton label="Pacientes" active={activeTab === 'patients'} onPress={() => setActiveTab('patients')} colors={colors} />
        <TabButton label="Performance" active={activeTab === 'performance'} onPress={() => setActiveTab('performance')} colors={colors} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando dados...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab reportData={reportData} colors={colors} />
            )}

            {activeTab === 'financial' && (
              <FinancialTab reportData={reportData} formatCurrency={formatCurrency} colors={colors} />
            )}

            {activeTab === 'patients' && (
              <PatientsTab reportData={reportData} colors={colors} />
            )}

            {activeTab === 'performance' && (
              <PerformanceTab reportData={reportData} colors={colors} />
            )}
          </>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress, colors }: any) {
  return (
    <Pressable onPress={onPress} style={styles.tabButton}>
      <Text style={[styles.tabButtonText, { color: active ? colors.primary : colors.textSecondary }]}>
        {label}
      </Text>
      {active && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
    </Pressable>
  );
}

function OverviewTab({ reportData, colors }: { reportData: ReportData; colors: any }) {
  // Sample week data - in real app would be fetched from database
  const weekSessionsData = generateWeekData(new Date(), [3, 5, 4, 6, 4, 7, 5]);
  const weekRevenueData = generateWeekData(new Date(), [450, 750, 600, 900, 600, 1050, 750]);

  return (
    <View style={styles.tabContent}>
      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        <StatCard
          title="Faturamento"
          value={formatCurrency(reportData.totalRevenue)}
          icon="dollar-sign"
          color="#22c55e"
          trend={{ value: '+15%', positive: true }}
        />
        <StatCard
          title="Sessões"
          value={reportData.completedSessions}
          icon="check-circle"
          color="#3b82f6"
          subtitle="Concluídas"
        />
        <StatCard
          title="Pacientes Ativos"
          value={reportData.activePatients}
          icon="users"
          color="#8b5cf6"
        />
        <StatCard
          title="Taxa de Ocupação"
          value={`${Math.round(reportData.occupancyRate)}%`}
          icon="trending-up"
          color={reportData.occupancyRate >= 70 ? '#22c55e' : reportData.occupancyRate >= 40 ? '#f59e0b' : '#ef4444'}
        />
      </View>

      {/* Weekly Sessions Chart */}
      <WeeklyChart
        data={weekSessionsData}
        color="#3b82f6"
        title="Sessões Esta Semana"
        subtitle="Número de sessões realizadas por dia"
        colors={colors}
      />

      {/* Weekly Revenue Chart */}
      <WeeklyChart
        data={weekRevenueData}
        color="#22c55e"
        title="Faturamento Semanal"
        subtitle="Receita diária (R$)"
        colors={colors}
      />

      {/* Appointments Breakdown */}
      <Card style={styles.chartCard}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>Agendamentos</Text>
        <View style={styles.breakdown}>
          <BreakdownItem label="Concluídos" value={reportData.completedSessions} color="#22c55e" total={reportData.totalAppointments} colors={colors} />
          <BreakdownItem label="Cancelados" value={reportData.cancelledSessions} color="#ef4444" total={reportData.totalAppointments} colors={colors} />
          <BreakdownItem label="Faltas" value={reportData.totalAppointments - reportData.completedSessions - reportData.cancelledSessions} color="#f59e0b" total={reportData.totalAppointments} colors={colors} />
        </View>
      </Card>

      {/* Insights */}
      <Card style={styles.insightsCard}>
        <View style={styles.insightsHeader}>
          <Icon name="lightbulb" size={20} color={colors.warning} />
          <Text style={[styles.insightsTitle, { color: colors.text }]}>Insights</Text>
        </View>
        <InsightItem
          icon="users"
          title="Novos Pacientes"
          description={`${reportData.newPatients} novos pacientes este período`}
          positive={reportData.newPatients > 0}
          colors={colors}
        />
        <InsightItem
          icon="alert-triangle"
          title="Taxa de Não Comparecimento"
          description={`${Math.round(reportData.noShowRate)}% dos agendamentos`}
          positive={reportData.noShowRate < 15}
          colors={colors}
        />
      </Card>
    </View>
  );
}

function FinancialTab({ reportData, formatCurrency, colors }: any) {
  // Sample week data - in real app would be fetched from database
  const weekRevenueData = generateWeekData(new Date(), [450, 750, 600, 900, 600, 1050, 750]);
  const weekSessionsData = generateWeekData(new Date(), [3, 5, 4, 6, 4, 7, 5]);

  return (
    <View style={styles.tabContent}>
      <View style={styles.metricsGrid}>
        <StatCard
          title="Faturamento Total"
          value={formatCurrency(reportData.totalRevenue)}
          icon="dollar-sign"
          color="#22c55e"
        />
        <StatCard
          title="Sessões Cobradas"
          value={reportData.completedSessions}
          icon="check-circle"
          color="#3b82f6"
        />
      </View>

      {/* Weekly Revenue Chart */}
      <WeeklyChart
        data={weekRevenueData}
        color="#22c55e"
        title="Faturamento da Semana"
        subtitle="Receita diária (R$)"
        colors={colors}
      />

      {/* Weekly Sessions Chart */}
      <WeeklyChart
        data={weekSessionsData}
        color="#3b82f6"
        title="Sessões da Semana"
        subtitle="Número de sessões cobradas por dia"
        colors={colors}
      />

      {/* Payment Breakdown */}
      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Média por Sessão</Text>
        <Text style={[styles.bigValue, { color: colors.text }]}>
          {formatCurrency(reportData.completedSessions > 0 ? reportData.totalRevenue / reportData.completedSessions : 0)}
        </Text>
        <Text style={[styles.valueLabel, { color: colors.textSecondary }]}>por sessão concluída</Text>
      </Card>
    </View>
  );
}

function PatientsTab({ reportData, colors }: any) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.metricsGrid}>
        <StatCard
          title="Pacientes Ativos"
          value={reportData.activePatients}
          icon="users"
          color="#3b82f6"
          subtitle="Em tratamento"
        />
        <StatCard
          title="Novos Pacientes"
          value={reportData.newPatients}
          icon="user-plus"
          color="#22c55e"
          subtitle="Este período"
        />
      </View>

      {/* Patient Engagement */}
      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Engajamento</Text>
        <ProgressRow label="Alta adesão" value={75} colors={colors} />
        <ProgressRow label="Média adesão" value={60} colors={colors} />
        <ProgressRow label="Baixa adesão" value={15} colors={colors} />
      </Card>
    </View>
  );
}

function PerformanceTab({ reportData, colors }: any) {
  // Sample week data - in real app would be fetched from database
  const weekPerformanceData = generateWeekData(new Date(), [85, 90, 88, 95, 92, 98, 94]);
  const weekCompletionData = generateWeekData(new Date(), [3, 5, 4, 6, 4, 7, 5]);

  return (
    <View style={styles.tabContent}>
      <View style={styles.metricsGrid}>
        <StatCard
          title="Sessões Realizadas"
          value={reportData.completedSessions}
          icon="check-circle"
          color="#22c55e"
        />
        <StatCard
          title="Taxa de Ocupação"
          value={`${Math.round(reportData.occupancyRate)}%`}
          icon="trending-up"
          color={reportData.occupancyRate >= 70 ? '#22c55e' : '#f59e0b'}
        />
        <StatCard
          title="Avaliação Média"
          value={reportData.averageRating}
          icon="star"
          color="#f59e0b"
          subtitle="de 5.0"
        />
      </View>

      {/* Weekly Performance Chart */}
      <WeeklyChart
        data={weekPerformanceData}
        color="#22c55e"
        title="Desempenho Semanal"
        subtitle="Taxa de conclusão diária (%)"
        maxValue={100}
        colors={colors}
      />

      {/* Weekly Completion Chart */}
      <WeeklyChart
        data={weekCompletionData}
        color="#3b82f6"
        title="Sessões Concluídas"
        subtitle="Número de sessões por dia"
        colors={colors}
      />

      {/* Session Completion Rate */}
      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Taxa de Conclusão</Text>
        <View style={styles.circularProgress}>
          <View style={[styles.circularProgressFill, { width: `${reportData.completedSessions / reportData.totalAppointments * 100}%`, backgroundColor: colors.success }]} />
        </View>
        <Text style={[styles.circularProgressText, { color: colors.text }]}>
          {Math.round(reportData.completedSessions / reportData.totalAppointments * 100)}%
        </Text>
        <Text style={[styles.circularProgressLabel, { color: colors.textSecondary }]}>
          dos agendamentos concluídos
        </Text>
      </Card>
    </View>
  );
}

function BreakdownItem({ label, value, color, total, colors }: any) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <View style={styles.breakdownItem}>
      <View style={[styles.breakdownIndicator, { backgroundColor: color }]} />
      <View style={styles.breakdownInfo}>
        <Text style={[styles.breakdownLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.breakdownValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.breakdownPercentage, { color: colors.textSecondary }]}>
          {Math.round(percentage)}%
        </Text>
      </View>
      <Text style={[styles.breakdownTotal, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function InsightItem({ icon, title, description, positive, colors }: any) {
  return (
    <View style={styles.insightItem}>
      <View style={[styles.insightIcon, { backgroundColor: positive ? '#dcfce7' : '#fee2e2' }]}>
        <Icon name={icon} size={20} color={positive ? '#22c55e' : '#ef4444'} />
      </View>
      <View style={styles.insightContent}>
        <Text style={[styles.insightTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.insightDescription, { color: colors.textSecondary }]}>{description}</Text>
      </View>
    </View>
  );
}

function ProgressRow({ label, value, colors }: any) {
  return (
    <View style={styles.progressRow}>
      <Text style={[styles.progressLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarBackground, { backgroundColor: colors.border }]}>
          <View style={[styles.progressBarFill, { width: `${value}%`, backgroundColor: value >= 70 ? colors.success : value >= 40 ? colors.warning : colors.error }]} />
        </View>
        <Text style={[styles.progressValue, { color: colors.text }]}>{value}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  exportButton: {
    padding: 8,
  },
  periodScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  periodChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  dateRangeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    position: 'relative',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  tabContent: {
    gap: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    gap: 12,
  },
  chartCard: {
    padding: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  breakdown: {
    gap: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  breakdownInfo: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 13,
  },
  breakdownPercentage: {
    fontSize: 12,
  },
  breakdownTotal: {
    fontSize: 18,
    fontWeight: '700',
  },
  insightsCard: {
    padding: 16,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  insightDescription: {
    fontSize: 13,
  },
  sectionCard: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  bigValue: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 4,
  },
  valueLabel: {
    fontSize: 14,
  },
  chartPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPlaceholderText: {
    fontSize: 14,
    marginTop: 12,
  },
  progressRow: {
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  circularProgress: {
    alignItems: 'center',
    padding: 20,
  },
  circularProgressFill: {
    width: '100%',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 16,
  },
  circularProgressText: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 4,
  },
  circularProgressLabel: {
    fontSize: 13,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 40,
  },
});
