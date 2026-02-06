import { View, Text, ScrollView, StyleSheet, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { format, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { AppointmentCard } from '@/components/ui/AppointmentCard';
import { QuickActionCard } from '@/components/ui/QuickActionCard';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { useAppointments } from '@/hooks/useAppointments';
import { useAuth } from '@/hooks/useAuth';
import { HapticFeedback } from '@/lib/haptics';
import { EmptyState } from '@/components/ui/EmptyState';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

type QuickAction = {
  id: string;
  label: string;
  icon: string;
  route: string;
  color: string;
};

const quickActions: QuickAction[] = [
  { id: '1', label: 'Novo Paciente', icon: 'user-plus', route: '/patients/new', color: '' }, // Will use theme primary
  { id: '2', label: 'Agendar', icon: 'calendar-plus', route: '/agenda/new', color: '' }, // Will use theme success
  { id: '3', label: 'Avaliação', icon: 'clipboard-list', route: '/evaluations/new', color: '' }, // Will use theme warning
  { id: '4', label: 'Evolução', icon: 'file-text', route: '/evolutions/new', color: '' }, // Will use theme notification
];

export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { data: appointments, isLoading } = useAppointments();

  // Calculate today's appointments
  const todayAppointments = appointments?.filter(apt => {
    const aptDate = new Date(apt.date);
    return isSameDay(aptDate, new Date()) && apt.therapistId === profile?.id;
  }) || [];

  // Stats calculations
  const stats = {
    occupancyRate: Math.min(Math.round((todayAppointments.length / 8) * 100), 100), // Assuming 8 hour day
    completedSessions: todayAppointments.filter(a => a.status === 'concluido').length,
    nextPatient: todayAppointments.find(a => a.status === 'agendado' || a.status === 'confirmado'),
  };

  const handleQuickAction = useCallback((action: QuickAction) => {
    HapticFeedback.light();
    router.push(action.route);
  }, [router]);

  const handleAppointmentPress = useCallback((appointmentId: string) => {
    HapticFeedback.light();
    router.push(`/agenda/${appointmentId}`);
  }, [router]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const getFirstName = () => {
    return profile?.full_name?.split(' ')[0] || 'Doutor(a)';
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar style="auto" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.header}
        >
          <LinearGradient
            colors={[colors.primary, `${colors.primary}dd`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.greeting}>{getGreeting()},</Text>
                <Text style={styles.userName}>Dr(a). {getFirstName()}!</Text>
              </View>
              <Pressable
                onPress={() => router.push('/notifications')}
                style={({ pressed }) => [
                  styles.notificationButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                hitSlop={8}
              >
                <Icon name="bell" size={24} color="#fff" />
                <View style={styles.notificationBadge} />
              </Pressable>
            </View>

            <View style={styles.dateContainer}>
              <Icon name="calendar" size={16} color="#fff" />
              <Text style={styles.dateText}>
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats Cards */}
        <Animated.View
          entering={FadeInUp.delay(200).springify()}
          style={styles.statsContainer}
        >
          <StatCard
            title="Taxa de Ocupação"
            value={`${stats.occupancyRate}%`}
            icon="trending-up"
            color={colors.primary}
            trend={{ value: '+12%', positive: true }}
            style={styles.statCard}
          />
          <StatCard
            title="Sessões Hoje"
            value={`${stats.completedSessions}/${todayAppointments.length}`}
            icon="check-circle"
            color="#22c55e"
            subtitle="Concluídas"
            style={styles.statCard}
          />
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View
          entering={FadeInUp.delay(300).springify()}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Ações Rápidas
          </Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => {
              // Use theme colors for quick actions
              const actionColors = [colors.primary, colors.success, colors.warning, colors.notification];
              return (
                <QuickActionCard
                  key={action.id}
                  label={action.label}
                  icon={action.icon}
                  color={actionColors[index]}
                  onPress={() => handleQuickAction(action)}
                  style={styles.quickActionCard}
                />
              );
            })}
          </View>
        </Animated.View>

        {/* Next Appointment Highlight */}
        {stats.nextPatient && (
          <Animated.View
            entering={FadeInUp.delay(400).springify()}
            style={styles.section}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Próximo Paciente
            </Text>
            <Pressable
              onPress={() => handleAppointmentPress(stats.nextPatient!.id)}
              style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
            >
              <Card style={styles.nextAppointmentCard}>
                <LinearGradient
                  colors={[colors.primary, `${colors.primary}ee`]}
                  style={styles.nextAppointmentGradient}
                >
                  <View style={styles.nextAppointmentContent}>
                    <View style={styles.nextAppointmentInfo}>
                      <Text style={styles.nextAppointmentTime}>
                        {stats.nextPatient.time}
                      </Text>
                      <Text style={styles.nextAppointmentName}>
                        {stats.nextPatient.patientName}
                      </Text>
                      <Text style={styles.nextAppointmentType}>
                        {stats.nextPatient.type}
                      </Text>
                    </View>
                    <View style={styles.nextAppointmentActions}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={() => router.push(`/agenda/${stats.nextPatient!.id}/start`)}
                      >
                        Iniciar
                      </Button>
                    </View>
                  </View>
                </LinearGradient>
              </Card>
            </Pressable>
          </Animated.View>
        )}

        {/* Today's Appointments */}
        <Animated.View
          entering={FadeInUp.delay(500).springify()}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Agenda de Hoje
            </Text>
            <Pressable onPress={() => router.push('/agenda')}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>
                Ver todos
              </Text>
            </Pressable>
          </View>

          {todayAppointments.length === 0 ? (
            <EmptyState
              icon="calendar-x"
              title="Nenhum agendamento para hoje"
              message="Aproveite para revisar prontuários ou planejar tratamentos"
              actionLabel="Novo Agendamento"
              onAction={() => router.push('/agenda/new')}
            />
          ) : (
            <View style={styles.appointmentsList}>
              {todayAppointments.map((appointment, index) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onPress={() => handleAppointmentPress(appointment.id)}
                  style={styles.appointmentCard}
                />
              ))}
            </View>
          )}
        </Animated.View>

        {/* Bottom spacing for tab bar */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerGradient: {
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 14,
    color: '#ffffffcc',
    fontWeight: '500',
  },
  userName: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '700',
    marginTop: 4,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: CARD_WIDTH,
  },
  nextAppointmentCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0,
  },
  nextAppointmentGradient: {
    padding: 20,
  },
  nextAppointmentContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextAppointmentInfo: {
    flex: 1,
  },
  nextAppointmentTime: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  nextAppointmentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  nextAppointmentType: {
    fontSize: 14,
    color: '#ffffffcc',
  },
  nextAppointmentActions: {
    marginLeft: 12,
  },
  appointmentsList: {
    gap: 12,
  },
  appointmentCard: {
    marginHorizontal: 0,
  },
  bottomSpacing: {
    height: 100,
  },
});
