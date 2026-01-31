import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { Card } from '@/components';

export default function HomeScreen() {
  const colors = useColors();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

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
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            {getGreeting()},
          </Text>
          <Text style={[styles.name, { color: colors.text }]}>
            {user?.name || 'Paciente'}
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.primaryLight + '20' }]}>
              <Ionicons name="fitness" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>5</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Exercicios Hoje
            </Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.successLight }]}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>3</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Concluidos
            </Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.warningLight }]}>
              <Ionicons name="calendar" size={24} color={colors.warning} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>1</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Proxima Consulta
            </Text>
          </Card>
        </View>

        {/* Next Appointment Card */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Proxima Consulta
        </Text>
        <Card style={styles.appointmentCard}>
          <View style={styles.appointmentHeader}>
            <View style={[styles.appointmentIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="medical" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.appointmentInfo}>
              <Text style={[styles.appointmentTitle, { color: colors.text }]}>
                Fisioterapia
              </Text>
              <Text style={[styles.appointmentDoctor, { color: colors.textSecondary }]}>
                Dr. Silva
              </Text>
            </View>
          </View>
          <View style={[styles.appointmentTime, { borderTopColor: colors.border }]}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.appointmentTimeText, { color: colors.textSecondary }]}>
              Amanha, 14:00
            </Text>
          </View>
        </Card>

        {/* Today's Exercises */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Exercicios de Hoje
        </Text>
        <Card style={styles.exerciseCard}>
          <View style={styles.exerciseItem}>
            <View style={[styles.exerciseIcon, { backgroundColor: colors.successLight }]}>
              <Ionicons name="checkmark" size={20} color={colors.success} />
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={[styles.exerciseName, { color: colors.text }]}>
                Alongamento Cervical
              </Text>
              <Text style={[styles.exerciseDetails, { color: colors.textSecondary }]}>
                3 series x 10 repeticoes
              </Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.exerciseItem}>
            <View style={[styles.exerciseIcon, { backgroundColor: colors.successLight }]}>
              <Ionicons name="checkmark" size={20} color={colors.success} />
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={[styles.exerciseName, { color: colors.text }]}>
                Fortalecimento Lombar
              </Text>
              <Text style={[styles.exerciseDetails, { color: colors.textSecondary }]}>
                2 series x 15 repeticoes
              </Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.exerciseItem}>
            <View style={[styles.exerciseIcon, { backgroundColor: colors.border }]}>
              <Ionicons name="ellipse-outline" size={20} color={colors.textMuted} />
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={[styles.exerciseName, { color: colors.text }]}>
                Mobilidade de Quadril
              </Text>
              <Text style={[styles.exerciseDetails, { color: colors.textSecondary }]}>
                2 series x 12 repeticoes
              </Text>
            </View>
          </View>
        </Card>
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
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
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
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  appointmentCard: {
    marginBottom: 24,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  appointmentDoctor: {
    fontSize: 14,
  },
  appointmentTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 6,
  },
  appointmentTimeText: {
    fontSize: 14,
  },
  exerciseCard: {
    marginBottom: 24,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '500',
  },
  exerciseDetails: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
});
