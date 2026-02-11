import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format, isSameDay, addHours, isBefore } from 'date-fns';
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
  const { data: stats, refetch: refetchStats, isLoading: isLoadingStats } = useDashboardStats();
  const { data: appointments, refetch: refetchAppointments, isLoading: isLoadingAppointments } = useAppointments();
  const { data: recentPatients, isLoading: isLoadingPatients } = usePatients({ limit: 5 }); // Fetch 5 most recent patients

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    light();
    await Promise.all([refetchStats(), refetchAppointments()]);
    setRefreshing(false);
  }, [refetchStats, refetchAppointments, light]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const statCards = useMemo(() => {
    return [
      { label: 'Pacientes Ativos', value: stats?.activePatients ?? '...', icon: 'people', color: colors.primary },
      { label: 'Consultas Hoje', value: stats?.todayAppointments ?? '...', icon: 'calendar', color: colors.success },
      { label: 'Aguardando Conf.', value: stats?.pendingAppointments ?? '...', icon: 'time', color: colors.warning },
      { label: 'Concluídas Hoje', value: stats?.completedAppointments ?? '...', icon: 'checkmark-circle', color: colors.info },
    ];
  }, [stats, colors]);

  // Filter next 5 upcoming appointments in the next 24 hours
  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    const in24Hours = addHours(now, 24);
    return appointments
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
  }, [appointments]);

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
              <TouchableOpacity onPress={() => router.push('/(tabs)/agenda')}><Text style={[styles.seeAll, { color: colors.primary }]}>Ver Agenda</Text></TouchableOpacity>
            </View>
            
            {upcomingAppointments.length === 0 ? (
                <Card style={styles.emptyCard}><Text style={[styles.emptyText, {color: colors.textSecondary}]}>Nenhuma consulta nas próximas 24h.</Text></Card>
            ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                    {upcomingAppointments.map(apt => (
                        <TouchableOpacity key={apt.id} onPress={() => router.push(`/appointment-form?id=${apt.id}`)}>
                            <Card style={[styles.appointmentCard, {backgroundColor: colors.surface}]}>
                                <Text style={[styles.appointmentTime, {color: colors.primary}]}>{format(new Date(apt.date), 'HH:mm')}</Text>
                                <Text style={[styles.patientName, {color: colors.text}]} numberOfLines={1}>{apt.patientName}</Text>
                                <Text style={[styles.appointmentType, {color: colors.textSecondary}]} numberOfLines={1}>{apt.type}</Text>
                            </Card>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Pacientes Recentes</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/patients')}><Text style={[styles.seeAll, { color: colors.primary }]}>Ver Todos</Text></TouchableOpacity>
            </View>
            
            {recentPatients.length === 0 ? (
                 <Card style={styles.emptyCard}><Text style={[styles.emptyText, {color: colors.textSecondary}]}>Nenhum paciente encontrado.</Text></Card>
            ) : (
                <View>
                    {recentPatients.map(p => (
                        <TouchableOpacity key={p.id} onPress={() => router.push(`/patient/${p.id}`)}>
                            <Card style={[styles.patientListItem, {backgroundColor: colors.surface}]}>
                                <View style={[styles.patientAvatar, {backgroundColor: colors.primary + '20'}]}>
                                    <Text style={[styles.patientAvatarText, {color: colors.primary}]}>{p.name.charAt(0)}</Text>
                                </View>
                                <View>
                                    <Text style={[styles.patientName, {color: colors.text}]}>{p.name}</Text>
                                    <Text style={[styles.patientCondition, {color: colors.textSecondary}]}>{p.condition}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={24} color={colors.textMuted} style={styles.patientArrow} />
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
  greeting: { fontSize: 16 },
  name: { fontSize: 28, fontWeight: 'bold' },
  notificationBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', flex: 1, paddingVertical: 60 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: '48%', flexGrow: 1, alignItems: 'center', padding: 16, borderRadius: 16 },
  statIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { fontSize: 12, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  seeAll: { fontSize: 14, fontWeight: '500' },
  emptyCard: { alignItems: 'center', paddingVertical: 32, gap: 12, borderRadius: 16 },
  emptyText: { fontSize: 14 },
  hScroll: { gap: 12, paddingRight: 16 },
  appointmentCard: { width: 140, padding: 16, borderRadius: 16 },
  appointmentTime: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  patientName: { fontSize: 15, fontWeight: '500' },
  appointmentType: { fontSize: 13, marginTop: 4 },
  patientListItem: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 8, borderRadius: 16 },
  patientAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  patientAvatarText: { fontSize: 18, fontWeight: '600' },
  patientCondition: { fontSize: 13, marginTop: 2 },
  patientArrow: { position: 'absolute', right: 16 },
});
