import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format, addHours, isBefore } from 'date-fns';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { Card } from '@/components';
import { useAppointments } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import { useHaptics } from '@/hooks/useHaptics';
import { useDashboardStats } from '@/hooks/useDashboard';

export default function DashboardScreen() {
  const colors = useColors();
  const { user } = useAuthStore();
  const { light } = useHaptics();
  const [refreshing, setRefreshing] = useState(false);

  // Use new hook for stats
  const { data: stats, refetch: refetchStats, isLoading: isLoadingStats, error: statsError } = useDashboardStats();
  const { data: appointments, refetch: refetchAppointments, isLoading: isLoadingAppointments, error: appointmentsError } = useAppointments();
  const { data: recentPatients, isLoading: isLoadingPatients, error: patientsError } = usePatients({ limit: 5 }); // Fetch 5 most recent patients

  // Log any errors for debugging
  if (statsError) console.error('[Dashboard] Stats error:', statsError);
  if (appointmentsError) console.error('[Dashboard] Appointments error:', appointmentsError);
  if (patientsError) console.error('[Dashboard] Patients error:', patientsError);

  const onRefresh = async () => {
    setRefreshing(true);
    light();
    await Promise.all([refetchStats(), refetchAppointments()]);
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const statCards = [
    { label: 'Pacientes Ativos', value: stats?.activePatients ?? '...', icon: 'people', color: colors.primary },
    { label: 'Consultas Hoje', value: stats?.todayAppointments ?? '...', icon: 'calendar', color: colors.success },
    { label: 'Aguardando Conf.', value: stats?.pendingAppointments ?? '...', icon: 'time', color: colors.warning },
    { label: 'Concluídas Hoje', value: stats?.completedAppointments ?? '...', icon: 'checkmark-circle', color: colors.info },
  ];

  // Filter next 5 upcoming appointments in the next 24 hours
  const now = new Date();
  const in24Hours = addHours(now, 24);
  const upcomingAppointments = appointments
    .filter(apt => {
      const aptDate = apt.date instanceof Date ? apt.date : new Date(apt.date);
      return isBefore(aptDate, in24Hours) && isBefore(now, aptDate);
    })
    .sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5);

  const isLoading = isLoadingStats || isLoadingAppointments || isLoadingPatients;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>{getGreeting()},</Text>
              <Text style={[styles.name, { color: colors.text }]}>{user?.name?.split(' ')[0] || 'Profissional'}</Text>
            </View>
            <TouchableOpacity style={[styles.notificationBtn, { backgroundColor: colors.surface }]} onPress={() => router.push('/notifications')}>
                <Ionicons name="notifications-outline" size={24} color={colors.text} />
            </TouchableOpacity>
        </View>

        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              {statCards.map((stat, index) => (
                <Card key={index} style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}><Ionicons name={stat.icon as any} size={24} color={stat.color} /></View>
                  <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
                </Card>
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Próximas Consultas</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/agenda')} style={styles.seeAllBtn}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>Ver Agenda</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} style={{marginLeft: 2}} />
              </TouchableOpacity>
            </View>
            
            {upcomingAppointments.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <View style={[styles.emptyIconContainer, { backgroundColor: colors.border }]}>
                    <Ionicons name="calendar-clear-outline" size={32} color={colors.textMuted} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>Agenda Livre</Text>
                  <Text style={[styles.emptyText, {color: colors.textSecondary}]}>Nenhuma consulta nas próximas 24h.</Text>
                </Card>
            ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                    {upcomingAppointments.map(apt => (
                        <TouchableOpacity key={apt.id} onPress={() => router.push(`/appointment-form?id=${apt.id}`)} activeOpacity={0.7}>
                            <Card style={[styles.appointmentCard, {backgroundColor: colors.surface}] as any}>
                                <View style={styles.appointmentHeader}>
                                  <Ionicons name="time-outline" size={16} color={colors.primary} />
                                  <Text style={[styles.appointmentTime, {color: colors.primary}]}>{format(new Date(apt.date), 'HH:mm')}</Text>
                                </View>
                                <Text style={[styles.patientName, {color: colors.text}]} numberOfLines={1}>{apt.patientName || 'Paciente'}</Text>
                                <View style={[styles.typeBadge, { backgroundColor: colors.primary + '15' }]}>
                                  <Text style={[styles.appointmentType, {color: colors.primary}]} numberOfLines={1}>{apt.type}</Text>
                                </View>
                            </Card>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Pacientes Recentes</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/patients')} style={styles.seeAllBtn}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>Ver Todos</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} style={{marginLeft: 2}} />
              </TouchableOpacity>
            </View>
            
            {recentPatients.length === 0 ? (
                 <Card style={styles.emptyCard}>
                    <View style={[styles.emptyIconContainer, { backgroundColor: colors.border }]}>
                      <Ionicons name="people-outline" size={32} color={colors.textMuted} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>Sem Pacientes</Text>
                    <Text style={[styles.emptyText, {color: colors.textSecondary}]}>Comece cadastrando seu primeiro paciente.</Text>
                 </Card>
            ) : (
                <View style={styles.patientListContainer}>
                    {recentPatients.map(p => (
                        <TouchableOpacity key={p.id} onPress={() => router.push(`/patient/${p.id}`)} activeOpacity={0.7}>
                            <Card style={[styles.patientListItem, {backgroundColor: colors.surface}] as any}>
                                <View style={[styles.patientAvatar, {backgroundColor: colors.primary + '15'}]}>
                                    <Text style={[styles.patientAvatarText, {color: colors.primary}]}>{p.name.charAt(0)}</Text>
                                </View>
                                <View style={styles.patientInfo}>
                                    <Text style={[styles.patientNameList, {color: colors.text}]} numberOfLines={1}>{p.name}</Text>
                                    <Text style={[styles.patientCondition, {color: colors.textSecondary}]} numberOfLines={1}>{p.condition || 'Condição não informada'}</Text>
                                </View>
                                <View style={styles.actionArrow}>
                                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                                </View>
                            </Card>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { fontSize: 16, letterSpacing: 0.1 },
  name: { fontSize: 32, fontWeight: '800', letterSpacing: -1, lineHeight: 36 },
  notificationBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', flex: 1, paddingVertical: 60 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: '48%', flexGrow: 1, alignItems: 'center', padding: 16, borderRadius: 16 },
  statIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.6 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', padding: 4 },
  seeAll: { fontSize: 14, fontWeight: '600' },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 8, borderRadius: 16, borderStyle: 'dashed' },
  emptyIconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
  hScroll: { gap: 16, paddingRight: 16, paddingBottom: 8 },
  appointmentCard: { width: 160, padding: 16, borderRadius: 16 },
  appointmentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  appointmentTime: { fontSize: 16, fontWeight: '700' },
  patientName: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  appointmentType: { fontSize: 12, fontWeight: '500' },
  patientListContainer: { gap: 12 },
  patientListItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16 },
  patientAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  patientAvatarText: { fontSize: 18, fontWeight: '700' },
  patientInfo: { flex: 1, marginRight: 16 },
  patientNameList: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  patientCondition: { fontSize: 13 },
  actionArrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.02)' },
});
