import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format, isSameDay } from 'date-fns';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { Card } from '@/components';
import { SyncStatus } from '@/components';
import { useAppointments } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useHaptics } from '@/hooks/useHaptics';

export default function DashboardScreen() {
  const colors = useColors();
  const { user } = useAuthStore();
  const { light } = useHaptics();
  const [refreshing, setRefreshing] = useState(false);

  // Buscar dados reais
  const { data: appointments, refetch: refetchAppointments, isLoading: isLoadingAppointments } = useAppointments();
  const { data: patients, refetch: refetchPatients, isLoading: isLoadingPatients } = usePatients({ status: 'active' });
  const { status: syncStatus, isOnline, setSyncing, setSynced } = useSyncStatus();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setSyncing();
    light();
    await Promise.all([refetchAppointments(), refetchPatients()]);
    setSynced();
    setRefreshing(false);
  }, [refetchAppointments, refetchPatients, setSyncing, setSynced, light]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Calcular estatísticas reais
  const stats = useMemo(() => {
    const today = new Date();
    const todayAppointments = appointments.filter(apt => {
      const aptDate = apt.date instanceof Date ? apt.date : new Date(apt.date);
      return isSameDay(aptDate, today);
    });

    const confirmed = todayAppointments.filter(apt => apt.status === 'confirmed').length;
    const pending = todayAppointments.filter(apt => apt.status === 'scheduled').length;
    const completed = todayAppointments.filter(apt => apt.status === 'completed').length;

    return [
      { label: 'Pacientes Ativos', value: patients.length.toString(), icon: 'people', color: colors.primary },
      { label: 'Consultas Hoje', value: todayAppointments.length.toString(), icon: 'calendar', color: colors.success },
      { label: 'Pendentes', value: pending.toString(), icon: 'time', color: colors.warning },
      { label: 'Concluidas', value: completed.toString(), icon: 'checkmark-circle', color: colors.info },
    ];
  }, [appointments, patients, colors]);

  // Filtrar agendamentos de hoje
  const todayAppointments = useMemo(() => {
    const today = new Date();
    return appointments
      .filter(apt => {
        const aptDate = apt.date instanceof Date ? apt.date : new Date(apt.date);
        return isSameDay(aptDate, today);
      })
      .sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5); // Mostrar apenas os primeiros 5
  }, [appointments]);

  const isLoading = isLoadingAppointments || isLoadingPatients;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>
                {getGreeting()},
              </Text>
              <Text style={[styles.name, { color: colors.text }]}>
                {user?.name?.split(' ')[0] || 'Profissional'}
              </Text>
            </View>
            <SyncStatus status={syncStatus} isOnline={isOnline} />
          </View>
          <TouchableOpacity
            style={[styles.notificationBtn, { backgroundColor: colors.surface }]}
            onPress={() => {
              light();
              router.push('/notifications');
            }}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {isLoading && refreshing === false ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Carregando dados...
            </Text>
          </View>
        ) : (
          <>
            {/* Sync Warning when offline */}
            {!isOnline && (
              <Card style={[styles.offlineCard, { backgroundColor: colors.warning + '10', borderColor: colors.warning }]}>
                <View style={styles.offlineContent}>
                  <Ionicons name="cloud-offline" size={20} color={colors.warning} />
                  <Text style={[styles.offlineText, { color: colors.warning }]}>
                    Você está offline. As alterações serão sincronizadas quando a conexão retornar.
                  </Text>
                </View>
              </Card>
            )}

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              {stats.map((stat, index) => (
                <Card key={index} style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                    <Ionicons name={stat.icon as any} size={24} color={stat.color} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {stat.label}
                  </Text>
                </Card>
              ))}
            </View>

            {/* Today's Appointments */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Agenda de Hoje
              </Text>
              <TouchableOpacity
                onPress={() => {
                  light();
                  router.push('/(tabs)/agenda');
                }}
              >
                <Text style={[styles.seeAll, { color: colors.primary }]}>Ver tudo</Text>
              </TouchableOpacity>
            </View>

            {todayAppointments.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Nenhuma consulta para hoje
                </Text>
              </Card>
            ) : (
              <Card style={styles.appointmentsCard} padding="none">
                {todayAppointments.map((appointment, index) => {
                  const aptDate = appointment.date instanceof Date ? appointment.date : new Date(appointment.date);
                  const timeStr = format(aptDate, 'HH:mm');
                  return (
                    <TouchableOpacity
                      key={appointment.id}
                      style={[
                        styles.appointmentItem,
                        index < todayAppointments.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                        },
                      ]}
                      onPress={() => {
                        light();
                        router.push(`/appointment-form?id=${appointment.id}`);
                      }}
                    >
                      <View style={styles.appointmentTime}>
                        <Text style={[styles.timeText, { color: colors.primary }]}>
                          {timeStr}
                        </Text>
                      </View>
                      <View style={styles.appointmentInfo}>
                        <Text style={[styles.patientName, { color: colors.text }]}>
                          {appointment.patientName}
                        </Text>
                        <Text style={[styles.appointmentType, { color: colors.textSecondary }]}>
                          {appointment.type}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor:
                              appointment.status === 'confirmed' || appointment.status === 'completed'
                                ? colors.success
                                : appointment.status === 'in_progress'
                                  ? colors.info
                                  : colors.warning,
                          },
                        ]}
                      />
                    </TouchableOpacity>
                  );
                })}
              </Card>
            )}

            {/* Quick Actions */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
              Acoes Rapidas
            </Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  light();
                  router.push('/patient-form');
                }}
              >
                <Ionicons name="person-add" size={28} color={colors.primary} />
                <Text style={[styles.actionLabel, { color: colors.text }]}>Novo Paciente</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  light();
                  router.push('/appointment-form');
                }}
              >
                <Ionicons name="add-circle" size={28} color={colors.success} />
                <Text style={[styles.actionLabel, { color: colors.text }]}>Nova Consulta</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  light();
                  router.push('/exercises' as any);
                }}
              >
                <Ionicons name="fitness" size={28} color={colors.warning} />
                <Text style={[styles.actionLabel, { color: colors.text }]}>Exercicios</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  light();
                  router.push('/reports' as any);
                }}
              >
                <Ionicons name="document-text" size={28} color={colors.info} />
                <Text style={[styles.actionLabel, { color: colors.text }]}>Relatorios</Text>
              </TouchableOpacity>
            </View>
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
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  notificationBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCount: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 16,
  },
  offlineCard: {
    marginBottom: 16,
    borderWidth: 1,
  },
  offlineContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  offlineText: {
    flex: 1,
    fontSize: 13,
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
    alignItems: 'center',
    padding: 16,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '500',
  },
  appointmentsCard: {
    overflow: 'hidden',
  },
  appointmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  appointmentTime: {
    width: 60,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  appointmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '500',
  },
  appointmentType: {
    fontSize: 13,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  actionCard: {
    width: '48%',
    flexGrow: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});
