import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { Card } from '@/components';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Appointment {
  id: string;
  type: string;
  professional: string;
  date: Date;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

// Mock data - will be replaced with Firestore data
const mockAppointments: Appointment[] = [
  {
    id: '1',
    type: 'Fisioterapia',
    professional: 'Dr. Silva',
    date: new Date(Date.now() + 86400000), // Tomorrow
    status: 'confirmed',
    notes: 'Trazer exames anteriores',
  },
  {
    id: '2',
    type: 'Avaliacao',
    professional: 'Dra. Santos',
    date: new Date(Date.now() + 86400000 * 7), // Next week
    status: 'scheduled',
  },
  {
    id: '3',
    type: 'Fisioterapia',
    professional: 'Dr. Silva',
    date: new Date(Date.now() - 86400000 * 2), // 2 days ago
    status: 'completed',
  },
];

export default function AppointmentsScreen() {
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'upcoming' | 'past'>('upcoming');

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const upcomingAppointments = mockAppointments.filter(
    a => a.date >= new Date() && a.status !== 'cancelled'
  );
  const pastAppointments = mockAppointments.filter(
    a => a.date < new Date() || a.status === 'completed'
  );

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return colors.success;
      case 'scheduled':
        return colors.warning;
      case 'completed':
        return colors.textMuted;
      case 'cancelled':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmado';
      case 'scheduled':
        return 'Agendado';
      case 'completed':
        return 'Concluido';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const renderAppointment = (appointment: Appointment) => (
    <Card key={appointment.id} style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <View style={[styles.appointmentIcon, { backgroundColor: colors.primary }]}>
          <Ionicons name="medical" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.appointmentInfo}>
          <Text style={[styles.appointmentType, { color: colors.text }]}>
            {appointment.type}
          </Text>
          <Text style={[styles.appointmentProfessional, { color: colors.textSecondary }]}>
            {appointment.professional}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(appointment.status) + '20' },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(appointment.status) }]}
          >
            {getStatusLabel(appointment.status)}
          </Text>
        </View>
      </View>

      <View style={[styles.appointmentDetails, { borderTopColor: colors.border }]}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {format(appointment.date, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {format(appointment.date, 'HH:mm')}
          </Text>
        </View>
      </View>

      {appointment.notes && (
        <View style={[styles.notesContainer, { backgroundColor: colors.surface }]}>
          <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.notesText, { color: colors.textSecondary }]}>
            {appointment.notes}
          </Text>
        </View>
      )}
    </Card>
  );

  const appointments = selectedTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      {/* Tab Selector */}
      <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'upcoming' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setSelectedTab('upcoming')}
        >
          <Text
            style={[
              styles.tabText,
              { color: selectedTab === 'upcoming' ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            Proximas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'past' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setSelectedTab('past')}
        >
          <Text
            style={[
              styles.tabText,
              { color: selectedTab === 'past' ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            Anteriores
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {appointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Nenhuma consulta
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {selectedTab === 'upcoming'
                ? 'Voce nao tem consultas agendadas'
                : 'Voce ainda nao teve consultas'}
            </Text>
          </View>
        ) : (
          appointments.map(renderAppointment)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
  },
  appointmentCard: {
    marginBottom: 16,
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
  appointmentType: {
    fontSize: 16,
    fontWeight: '600',
  },
  appointmentProfessional: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
});
