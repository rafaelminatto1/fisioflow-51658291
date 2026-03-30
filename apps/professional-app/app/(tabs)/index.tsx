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
import { useProtocols } from '@/hooks/useProtocols';
import { useExercisesLibrary } from '@/hooks/useExercises';

export default function DashboardScreen() {
  const colors = useColors();
  const { user } = useAuthStore();
  const { light } = useHaptics();
  const [refreshing, setRefreshing] = useState(false);

  // Use new hook for stats
  const { data: stats, refetch: refetchStats, isLoading: isLoadingStats, error: statsError } = useDashboardStats();
  const { data: appointments, refetch: refetchAppointments, isLoading: isLoadingAppointments, error: appointmentsError } = useAppointments();
  const { data: recentPatients, isLoading: isLoadingPatients, error: patientsError } = usePatients({ limit: 5 });
  const { protocols } = useProtocols();
  const { data: exercises } = useExercisesLibrary();

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

            {/* Quick Actions Grid */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[styles.quickActionCard, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(app)/biomechanics')}
                activeOpacity={0.8}
              >
                <View style={styles.quickActionIcon}>
                  <Ionicons name="film" size={28} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickActionTitle}>Lab. Biomecânico</Text>
                  <Text style={styles.quickActionSub}>Análise & Tracking AI</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>

              <View style={styles.quickActionsRow}>
                <TouchableOpacity
                  style={[styles.quickActionMini, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => router.push('/protocols' as any)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.miniIcon, { backgroundColor: '#6366F1' + '20' }]}>
                    <Ionicons name="clipboard" size={22} color="#6366F1" />
                  </View>
                  <Text style={[styles.miniTitle, { color: colors.text }]}>Protocolos</Text>
                  <Text style={[styles.miniSub, { color: colors.textSecondary }]}>{protocols.length > 0 ? `${protocols.length} disponíveis` : 'Carregando...'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionMini, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => router.push('/exercises' as any)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.miniIcon, { backgroundColor: '#10B981' + '20' }]}>
                    <Ionicons name="fitness" size={22} color="#10B981" />
                  </View>
                  <Text style={[styles.miniTitle, { color: colors.text }]}>Exercícios</Text>
                  <Text style={[styles.miniSub, { color: colors.textSecondary }]}>{exercises && exercises.length > 0 ? `${exercises.length} exercícios` : 'Carregando...'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionMini, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => router.push('/leaderboard' as any)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.miniIcon, { backgroundColor: '#F59E0B' + '20' }]}>
                    <Ionicons name="trophy" size={22} color="#F59E0B" />
                  </View>
                  <Text style={[styles.miniTitle, { color: colors.text }]}>Ranking</Text>
                  <Text style={[styles.miniSub, { color: colors.textSecondary }]}>Gamificação</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionMini, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => router.push('/telemedicine' as any)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.miniIcon, { backgroundColor: '#10B981' + '20' }]}>
                    <Ionicons name="videocam" size={22} color="#10B981" />
                  </View>
                  <Text style={[styles.miniTitle, { color: colors.text }]}>Teleconsulta</Text>
                  <Text style={[styles.miniSub, { color: colors.textSecondary }]}>Atendimento online</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionMini, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => router.push('/protocols?tab=tests' as any)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.miniIcon, { backgroundColor: '#8B5CF6' + '20' }]}>
                    <Ionicons name="analytics" size={22} color="#8B5CF6" />
                  </View>
                  <Text style={[styles.miniTitle, { color: colors.text }]}>Testes</Text>
                  <Text style={[styles.miniSub, { color: colors.textSecondary }]}>Escalas clínicas</Text>
                </TouchableOpacity>
              </View>
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
  quickActions: { marginBottom: 24, gap: 12 },
  quickActionCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  quickActionIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  quickActionTitle: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: -0.4 },
  quickActionSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '500', marginTop: 2 },
  quickActionsRow: { flexDirection: 'row', gap: 10 },
  quickActionMini: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, gap: 6 },
  miniIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  miniTitle: { fontSize: 13, fontWeight: '700' },
  miniSub: { fontSize: 11, textAlign: 'center' },
});
