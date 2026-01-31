import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { Card } from '@/components';

export default function DashboardScreen() {
  const colors = useColors();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const stats = [
    { label: 'Pacientes Ativos', value: '24', icon: 'people', color: colors.primary },
    { label: 'Consultas Hoje', value: '8', icon: 'calendar', color: colors.success },
    { label: 'Pendentes', value: '3', icon: 'time', color: colors.warning },
    { label: 'Concluidas', value: '5', icon: 'checkmark-circle', color: colors.info },
  ];

  const todayAppointments = [
    { id: '1', patient: 'Maria Silva', time: '08:00', type: 'Avaliacao', status: 'confirmed' },
    { id: '2', patient: 'Joao Santos', time: '09:00', type: 'Fisioterapia', status: 'confirmed' },
    { id: '3', patient: 'Ana Costa', time: '10:00', type: 'Retorno', status: 'pending' },
    { id: '4', patient: 'Pedro Lima', time: '11:00', type: 'Fisioterapia', status: 'confirmed' },
    { id: '5', patient: 'Lucia Oliveira', time: '14:00', type: 'Fisioterapia', status: 'pending' },
  ];

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
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {getGreeting()},
            </Text>
            <Text style={[styles.name, { color: colors.text }]}>
              Dr. {user?.name?.split(' ')[0] || 'Profissional'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.notificationBtn, { backgroundColor: colors.surface }]}
            onPress={() => {}}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            <View style={[styles.notificationBadge, { backgroundColor: colors.error }]}>
              <Text style={styles.notificationCount}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

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
          <TouchableOpacity onPress={() => router.push('/(tabs)/agenda')}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>Ver tudo</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.appointmentsCard} padding="none">
          {todayAppointments.map((appointment, index) => (
            <TouchableOpacity
              key={appointment.id}
              style={[
                styles.appointmentItem,
                index < todayAppointments.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => {}}
            >
              <View style={styles.appointmentTime}>
                <Text style={[styles.timeText, { color: colors.primary }]}>
                  {appointment.time}
                </Text>
              </View>
              <View style={styles.appointmentInfo}>
                <Text style={[styles.patientName, { color: colors.text }]}>
                  {appointment.patient}
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
                      appointment.status === 'confirmed'
                        ? colors.success
                        : colors.warning,
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </Card>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
          Acoes Rapidas
        </Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/patients')}
          >
            <Ionicons name="person-add" size={28} color={colors.primary} />
            <Text style={[styles.actionLabel, { color: colors.text }]}>Novo Paciente</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/agenda')}
          >
            <Ionicons name="add-circle" size={28} color={colors.success} />
            <Text style={[styles.actionLabel, { color: colors.text }]}>Nova Consulta</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => {}}
          >
            <Ionicons name="fitness" size={28} color={colors.warning} />
            <Text style={[styles.actionLabel, { color: colors.text }]}>Exercicios</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => {}}
          >
            <Ionicons name="document-text" size={28} color={colors.info} />
            <Text style={[styles.actionLabel, { color: colors.text }]}>Relatorios</Text>
          </TouchableOpacity>
        </View>
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
    alignItems: 'center',
    marginBottom: 24,
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
