import { useState } from 'react';

  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useColors } from '@/hooks/useColorScheme';
import { Card } from '@/components';
import { useAppointments } from '@/hooks/useAppointments';
import { useRealtimeAppointments } from '@/hooks/useRealtimeAppointments';

interface Appointment {
  id: string;
  patientName: string;
  patientId: string;
  time: string;
  duration: number;
  type: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
}

// Mock data
const mockAppointments: { [key: string]: Appointment[] } = {
  '2026-01-31': [
    { id: '1', patientName: 'Maria Silva', patientId: '1', time: '08:00', duration: 60, type: 'Avaliacao', status: 'confirmed' },
    { id: '2', patientName: 'Joao Santos', patientId: '2', time: '09:00', duration: 45, type: 'Fisioterapia', status: 'confirmed' },
    { id: '3', patientName: 'Ana Costa', patientId: '3', time: '10:00', duration: 45, type: 'Retorno', status: 'scheduled' },
    { id: '4', patientName: 'Pedro Lima', patientId: '4', time: '11:00', duration: 45, type: 'Fisioterapia', status: 'confirmed' },
    { id: '5', patientName: 'Lucia Oliveira', patientId: '5', time: '14:00', duration: 45, type: 'Fisioterapia', status: 'scheduled' },
    { id: '6', patientName: 'Carlos Mendes', patientId: '6', time: '15:00', duration: 60, type: 'Avaliacao', status: 'scheduled' },
    { id: '7', patientName: 'Paula Rodrigues', patientId: '7', time: '16:00', duration: 45, type: 'Fisioterapia', status: 'confirmed' },
  ],
  '2026-02-01': [
    { id: '8', patientName: 'Roberto Alves', patientId: '8', time: '08:00', duration: 45, type: 'Fisioterapia', status: 'scheduled' },
    { id: '9', patientName: 'Fernanda Dias', patientId: '9', time: '09:00', duration: 60, type: 'Avaliacao', status: 'scheduled' },
    { id: '10', patientName: 'Marcos Souza', patientId: '10', time: '10:30', duration: 45, type: 'Retorno', status: 'scheduled' },
  ],
};

export default function AgendaScreen() {
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Ativar Sincronização em Tempo Real (RTDB)
  useRealtimeAppointments();

  // Buscar Agendamentos Reais (Postgres)
  const { data: realAppointments, refetch, isLoading } = useAppointments();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i - 1));

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  
  // Filtrar agendamentos reais pela data selecionada
  const appointments = (realAppointments || []).filter(apt => {
    const aptDate = apt.date instanceof Date ? apt.date : new Date(apt.date);
    return isSameDay(aptDate, selectedDate);
  });

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return colors.success;
      case 'scheduled':
        return colors.warning;
      case 'in_progress':
        return colors.info;
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
      case 'in_progress':
        return 'Em andamento';
      case 'completed':
        return 'Concluido';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      {/* Week Selector */}
      <View style={[styles.weekContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekScroll}>
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={[
                  styles.dayButton,
                  isSelected && { backgroundColor: colors.primary },
                ]}
                onPress={() => setSelectedDate(day)}
              >
                <Text
                  style={[
                    styles.dayName,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {format(day, 'EEE', { locale: ptBR })}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    { color: isSelected ? '#FFFFFF' : colors.text },
                    isToday && !isSelected && { color: colors.primary },
                  ]}
                >
                  {format(day, 'd')}
                </Text>
                {isToday && !isSelected && (
                  <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Selected Date Header */}
      <View style={styles.dateHeader}>
        <Text style={[styles.selectedDate, { color: colors.text }]}>
          {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </Text>
        <TouchableOpacity
          style={[styles.addAppointmentBtn, { backgroundColor: colors.primary }]}
          onPress={() => {}}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addAppointmentText}>Nova Consulta</Text>
        </TouchableOpacity>
      </View>

      {/* Appointments List */}
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
              Nao ha consultas agendadas para este dia
            </Text>
          </View>
        ) : (
          appointments.map((appointment) => (
            <TouchableOpacity key={appointment.id} onPress={() => {}}>
              <Card style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.timeContainer}>
                    <Text style={[styles.time, { color: colors.primary }]}>
                      {appointment.time}
                    </Text>
                    <Text style={[styles.duration, { color: colors.textSecondary }]}>
                      {appointment.duration} min
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
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(appointment.status) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(appointment.status) },
                      ]}
                    >
                      {getStatusLabel(appointment.status)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.appointmentActions, { borderTopColor: colors.border }]}>
                  <TouchableOpacity style={styles.actionBtn}>
                    <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
                    <Text style={[styles.actionText, { color: colors.success }]}>Confirmar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn}>
                    <Ionicons name="play-circle-outline" size={20} color={colors.info} />
                    <Text style={[styles.actionText, { color: colors.info }]}>Iniciar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn}>
                    <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                    <Text style={[styles.actionText, { color: colors.textSecondary }]}>Editar</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weekContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  weekScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dayButton: {
    width: 56,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 4,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  selectedDate: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  addAppointmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addAppointmentText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
  },
  appointmentCard: {
    marginBottom: 12,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeContainer: {
    width: 70,
  },
  time: {
    fontSize: 18,
    fontWeight: '600',
  },
  duration: {
    fontSize: 12,
  },
  appointmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  appointmentType: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
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
  },
});
