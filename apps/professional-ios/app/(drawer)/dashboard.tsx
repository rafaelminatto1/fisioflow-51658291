import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useState } from 'react';
import { useAuth } from '@fisioflow/shared-api';
import { getGreeting } from '@fisioflow/shared-utils';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Svg, Circle } from 'react-native-svg';

// Mock data - will be replaced with Firebase data
const mockTodayStats = {
  totalPatients: 24,
  appointmentsToday: 8,
  completedToday: 3,
  pendingToday: 5,
  monthlyRevenue: 3200,
  adherenceRate: 75,
};

const mockAppointments = [
  {
    id: '1',
    patientName: 'João Silva',
    patientAvatar: 'https://i.pravatar.cc/150?img=1',
    time: '14:00',
    type: 'Avaliação Inicial',
    status: 'pending',
    isNew: true,
  },
  {
    id: '2',
    patientName: 'Maria Santos',
    patientAvatar: 'https://i.pravatar.cc/150?img=5',
    time: '15:00',
    type: 'Evolução',
    status: 'pending',
    isNew: false,
  },
  {
    id: '3',
    patientName: 'Pedro Costa',
    patientAvatar: 'https://i.pravatar.cc/150?img=3',
    time: '16:00',
    type: 'Exercícios',
    status: 'completed',
    isNew: false,
  },
];

const mockAlerts = [
  {
    id: '1',
    type: 'low_adherence',
    patientName: 'Ana Oliveira',
    message: 'Adesão baixa (30% esta semana)',
    severity: 'warning',
  },
  {
    id: '2',
    type: 'pain_increase',
    patientName: 'Carlos Souza',
    message: 'Dor aumentou de 3 para 7',
    severity: 'critical',
  },
  {
    id: '3',
    type: 'missed_session',
    patientName: 'Juliana Lima',
    message: 'Faltou ontem',
    severity: 'info',
  },
];

type AlertSeverity = 'info' | 'warning' | 'critical';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'today' | 'week'>('today');

  const getAlertIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return <Ionicons name="warning" size={20} color="#EF4444" />;
      case 'warning':
        return <Ionicons name="alert-circle" size={20} color="#F59E0B" />;
      default:
        return <Ionicons name="information-circle" size={20} color="#3B82F6" />;
    }
  };

  const getAlertColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return '#FEE2E2';
      case 'warning':
        return '#FEF3C7';
      default:
        return '#DBEAFE';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'cancelled':
        return '#EF4444';
      case 'in-progress':
        return '#3B82F6';
      default:
        return '#64748B';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.name || 'Profissional'}</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#1E293B" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

        {/* Date Selector */}
        <View style={styles.dateSelector}>
          <TouchableOpacity style={styles.dateArrow}>
            <Ionicons name="chevron-back" size={20} color="#64748B" />
          </TouchableOpacity>
          <View style={styles.dateInfo}>
            <Text style={styles.dateDay}>Hoje</Text>
            <Text style={styles.dateFull}>24 de janeiro, 2026</Text>
          </View>
          <TouchableOpacity style={styles.dateArrow}>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <TouchableOpacity style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="people" size={20} color="#3B82F6" />
          </View>
          <Text style={styles.statValue}>{mockTodayStats.appointmentsToday}</Text>
          <Text style={styles.statLabel}>Hoje</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </View>
          <Text style={styles.statValue}>{mockTodayStats.completedToday}</Text>
          <Text style={styles.statLabel}>Concluídos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="clock" size={20} color="#EF4444" />
          </View>
          <Text style={styles.statValue}>{mockTodayStats.pendingToday}</Text>
          <Text style={styles.statLabel}>Pendentes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="cash" size={20} color="#F59E0B" />
          </View>
          <Text style={styles.statValue}>R$ {mockTodayStats.monthlyRevenue}</Text>
          <Text style={styles.statLabel}>Mês</Text>
        </TouchableOpacity>
      </View>

      {/* Alerts Section */}
      {mockAlerts.length > 0 && (
        <View style={styles.alertsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Alertas</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.alertsScroll}>
            {mockAlerts.map((alert) => (
              <TouchableOpacity
                key={alert.id}
                style={[
                  styles.alertCard,
                  { backgroundColor: getAlertColor(alert.severity) }
                ]}
              >
                {getAlertIcon(alert.severity)}
                <Text style={styles.alertPatient}>{alert.patientName}</Text>
                <Text style={styles.alertMessage} numberOfLines={2}>
                  {alert.message}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Appointments Section */}
      <View style={styles.appointmentsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Agenda de Hoje</Text>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'today' && styles.tabActive]}
              onPress={() => setSelectedTab('today')}
            >
              <Text style={[styles.tabText, selectedTab === 'today' && styles.tabTextActive]}>
                Hoje
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'week' && styles.tabActive]}
              onPress={() => setSelectedTab('week')}
            >
              <Text style={[styles.tabText, selectedTab === 'week' && styles.tabTextActive]}>
                Semana
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Appointments List */}
        <View style={styles.appointmentsList}>
          {mockAppointments.map((appointment, index) => (
            <TouchableOpacity
              key={appointment.id}
              style={styles.appointmentCard}
              onPress={() => router.push(`/patient/${appointment.id}`)}
            >
              {/* Timeline Line */}
              {index < mockAppointments.length - 1 && (
                <View style={styles.timelineLine} />
              )}

              {/* Time */}
              <View style={styles.appointmentTime}>
                <Text style={styles.appointmentTimeText}>{appointment.time}</Text>
              </View>

              {/* Card */}
              <View style={styles.appointmentContent}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.patientInfo}>
                    <Image
                      source={{ uri: appointment.patientAvatar }}
                      style={styles.patientAvatar}
                    />
                    <View style={styles.patientDetails}>
                      <Text style={styles.patientName}>{appointment.patientName}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(appointment.status)}20` }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
                          {appointment.status === 'completed' ? 'Concluído' :
                           appointment.status === 'in-progress' ? 'Em andamento' : 'Pendente'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.appointmentActions}>
                    {appointment.status === 'pending' && (
                      <TouchableOpacity
                        style={styles.startButton}
                        onPress={() => {/* TODO: Start appointment */}}
                      >
                        <Ionicons name="play" size={16} color="#fff" />
                      </TouchableOpacity>
                    )}
                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                  </View>
                </View>

                <View style={styles.appointmentFooter}>
                  <View style={styles.appointmentType}>
                    <Ionicons name="medical" size={14} color="#64748B" />
                    <Text style={styles.appointmentTypeText}>{appointment.type}</Text>
                  </View>

                  {appointment.isNew && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>Novo</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Empty State (when no appointments) */}
        {mockAppointments.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyStateTitle}>Sem consultas hoje</Text>
            <Text style={styles.emptyStateSubtitle}>
              Aproveite o tempo para atualizar prontuários
            </Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>

        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {/* TODO: Navigate to patients */}}
          >
            <View style={styles.quickActionIconContainer}>
              <Ionicons name="person-add" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.quickActionText}>Novo Paciente</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {/* TODO: Navigate to new appointment */}}
          >
            <View style={[styles.quickActionIconContainer, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="calendar-plus" size={24} color="#10B981" />
            </View>
            <Text style={styles.quickActionText}>Nova Consulta</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {/* TODO: Navigate to exercises */}}
          >
            <View style={[styles.quickActionIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="fitness" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.quickActionText}>Exercícios</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {/* TODO: Navigate to reports */}}
          >
            <View style={[styles.quickActionIconContainer, { backgroundColor: '#E0E7FF' }]}>
              <Ionicons name="stats-chart" size={24} color="#6366F1" />
            </View>
            <Text style={styles.quickActionText}>Relatórios</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter_400',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 4,
    fontFamily: 'Inter_700',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#fff',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateInfo: {
    alignItems: 'center',
  },
  dateDay: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter_500',
  },
  dateFull: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: 'Inter_600',
  },
  quickStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: 'Inter_700',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'Inter_400',
  },
  alertsSection: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: 'Inter_600',
  },
  seeAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontFamily: 'Inter_500',
  },
  alertsScroll: {
    paddingHorizontal: 16,
  },
  alertCard: {
    width: 200,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  alertPatient: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 8,
    fontFamily: 'Inter_600',
  },
  alertMessage: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    fontFamily: 'Inter_400',
  },
  appointmentsSection: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  tabActive: {
    backgroundColor: '#1E293B',
  },
  tabText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter_500',
  },
  tabTextActive: {
    color: '#fff',
  },
  appointmentsList: {
    marginTop: 16,
  },
  appointmentCard: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineLine: {
    position: 'absolute',
    left: 28,
    top: 40,
    bottom: -20,
    width: 2,
    backgroundColor: '#E2E8F0',
  },
  appointmentTime: {
    width: 56,
    alignItems: 'center',
  },
  appointmentTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    fontFamily: 'Inter_600',
  },
  appointmentContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  patientDetails: {
    gap: 4,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: 'Inter_600',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter_600',
  },
  appointmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  startButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appointmentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  appointmentType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  appointmentTypeText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'Inter_400',
  },
  newBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
    fontFamily: 'Inter_600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    fontFamily: 'Inter_600',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontFamily: 'Inter_400',
  },
  quickActionsSection: {
    padding: 16,
    marginTop: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  quickActionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#1E293B',
    textAlign: 'center',
    fontFamily: 'Inter_500',
  },
});
