import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { useHaptics } from '@/hooks/useHaptics';
import { useAppointments } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import { getDashboardStats } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { OverviewTab } from '@/components/reports/OverviewTab';
import { PatientsTab } from '@/components/reports/PatientsTab';
import { FinancialTab } from '@/components/reports/FinancialTab';

type PeriodType = 'week' | 'month' | 'quarter' | 'year';

export default function ReportsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { light } = useHaptics();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'patients' | 'financial'>('overview');

  const { data: appointments } = useAppointments();
  const { data: patients } = usePatients();
  const { user } = useAuthStore();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['professionalStats', user?.id],
    queryFn: () => (user?.id ? getDashboardStats(user.id) : Promise.resolve(null)),
    enabled: !!user?.id,
  });

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => { light(); router.back(); }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Relatórios</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodScroll} contentContainerStyle={styles.periodContent}>
        {(['week', 'month', 'quarter', 'year'] as PeriodType[]).map((period) => (
          <TouchableOpacity
            key={period}
            style={[styles.periodChip, selectedPeriod === period && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => { light(); setSelectedPeriod(period); }}
          >
            <Text style={[styles.periodText, selectedPeriod === period ? { color: '#FFFFFF' } : { color: colors.textSecondary }]}>
              {period === 'week' ? 'Semana' : period === 'month' ? 'Mês' : period === 'quarter' ? 'Trimestre' : 'Ano'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
            <Text style={[styles.tabText, selectedTab === tab.key ? { color: colors.primary } : { color: colors.textSecondary }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollPadding}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary, marginTop: 12 }]}>Carregando relatórios...</Text>
          </View>
        ) : (
          <>
            {selectedTab === 'overview' && (
              <OverviewTab 
                appointments={appointments} 
                patients={patients} 
                stats={stats} 
                appointmentsByType={appointmentsByType} 
                maxTypeValue={maxTypeValue} 
              />
            )}

            {selectedTab === 'patients' && (
              <PatientsTab 
                patients={patients} 
                topPatients={topPatients} 
              />
            )}

            {selectedTab === 'financial' && (
              <FinancialTab selectedPeriod={selectedPeriod} />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  periodScroll: { maxHeight: 50, marginTop: 8 },
  periodContent: { paddingHorizontal: 16, gap: 8 },
  periodChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  periodText: { fontSize: 14, fontWeight: '500' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '500' },
  scrollContent: { flex: 1 },
  scrollPadding: { padding: 16 },
  loadingContainer: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { fontSize: 14 },
});

