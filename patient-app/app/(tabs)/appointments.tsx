import { useState, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { Card, SyncIndicator } from '@/components';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Appointment {
  id: string;
  type: string;
  professional_name: string;
  date: any; // Firestore Timestamp
  time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  professional_id?: string;
}

export default function AppointmentsScreen() {
  const colors = useColors();
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Fetch appointments
    const appointmentsRef = collection(db, 'users', user.id, 'appointments');
    const q = query(
      appointmentsRef,
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appointmentsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date, // Keep as Firestore Timestamp
        } as Appointment;
      });
      setAppointments(appointmentsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching appointments:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Force refresh by re-subscribing
    setRefreshing(false);
  };

  const now = new Date();
  const upcomingAppointments = appointments.filter(
    a => a.date?.toDate() >= now && a.status !== 'cancelled' && a.status !== 'completed'
  );
  const pastAppointments = appointments.filter(
    a => a.date?.toDate() < now || a.status === 'completed' || a.status === 'cancelled'
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
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const renderAppointment = (appointment: Appointment) => {
    const appointmentDate = appointment.date?.toDate() || new Date();
    return (
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
              {appointment.professional_name}
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
              {format(appointmentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {appointment.time}
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
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Carregando consultas...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayAppointments = selectedTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      {/* Sync Indicator */}
      <SyncIndicator />

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
            Próximas ({upcomingAppointments.length})
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
            Anteriores ({pastAppointments.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {displayAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Nenhuma consulta
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {selectedTab === 'upcoming'
                ? 'Você não tem consultas agendadas'
                : 'Você ainda não teve consultas'}
            </Text>
          </View>
        ) : (
          displayAppointments.map(renderAppointment)
        )}
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
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
    padding: 16,
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
    paddingHorizontal: 32,
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
