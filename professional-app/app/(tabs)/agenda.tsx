import { useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { Card, CheckInButton } from '@/components';
import { SyncStatus } from '@/components';
import { useAppointments } from '@/hooks/useAppointments';
import { useRealtimeAppointments } from '@/hooks/useRealtimeAppointments';
import { useHaptics } from '@/hooks/useHaptics';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import type { AppointmentBase } from '@/types';

export default function AgendaScreen() {
  const colors = useColors();
  const { medium, success, error, light } = useHaptics();
  const { status: syncStatus, isOnline, setSyncing, setSynced } = useSyncStatus();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Ativar Sincronização em Tempo Real (RTDB)
  useRealtimeAppointments();

  // Buscar Agendamentos Reais (Postgres)
  const { data: realAppointments, refetch, isLoading, update } = useAppointments();

  const onRefresh = async () => {
    setRefreshing(true);
    setSyncing();
    light();
    await refetch();
    setSynced();
    setRefreshing(false);
  };

  const handleConfirmAppointment = async (appointmentId: string) => {
    medium();
    try {
      await update({ id: appointmentId, data: { status: 'confirmed' } });
      success();
    } catch {
      error();
      Alert.alert('Erro', 'Não foi possível confirmar o agendamento');
    }
  };

  const handleStartAppointment = async (appointmentId: string) => {
    medium();
    try {
      await update({ id: appointmentId, data: { status: 'in_progress' } });
      success();
      // Navigate to patient details or SOAP form
      // router.push(`/appointment/${appointmentId}/soap`);
    } catch {
      error();
      Alert.alert('Erro', 'Não foi possível iniciar o atendimento');
    }
  };

  const handleCheckedIn = (appointmentId: string) => {
    success();
    Alert.alert('Check-in realizado', 'Sua presença foi registrada com sucesso');
  };

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i - 1));

  const dateKey = format(selectedDate, 'yyyy-MM-dd');

  // Filtrar agendamentos reais pela data selecionada
  const appointments = (realAppointments || []).filter(apt => {
    const aptDate = apt.date instanceof Date ? apt.date : new Date(apt.date);
    return isSameDay(aptDate, selectedDate);
  });

  const getStatusColor = (status: AppointmentBase['status']) => {
    switch (status) {
      case 'confirmed':
      case 'confirmado':
        return colors.success;
      case 'scheduled':
      case 'agendado':
        return colors.warning;
      case 'in_progress':
      case 'em_atendimento':
        return colors.info;
      case 'completed':
      case 'concluido':
        return colors.textMuted;
      case 'cancelled':
      case 'cancelado':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: AppointmentBase['status']) => {
    switch (status) {
      case 'confirmed':
      case 'confirmado':
        return 'Confirmado';
      case 'scheduled':
      case 'agendado':
        return 'Agendado';
      case 'in_progress':
      case 'em_atendimento':
        return 'Em andamento';
      case 'completed':
      case 'concluido':
        return 'Concluido';
      case 'cancelled':
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      {/* Week Selector */}
      <View style={[styles.weekContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.weekHeader}>
          <SyncStatus status={syncStatus} isOnline={isOnline} compact />
        </View>
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
                onPress={() => {
                  light();
                  setSelectedDate(day);
                }}
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
          onPress={() => {
            light();
            router.push('/appointment-form' as any);
          }}
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
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Carregando agenda...
            </Text>
          </View>
        ) : appointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Nenhuma consulta
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Não há consultas agendadas para este dia
            </Text>
          </View>
        ) : (
          appointments.map((appointment) => (
            <TouchableOpacity
              key={appointment.id}
              onPress={() => {
                light();
                router.push(`/appointment-form?id=${appointment.id}` as any);
              }}
            >
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
                  {(appointment.status === 'scheduled' || appointment.status === 'agendado') && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleConfirmAppointment(appointment.id)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
                      <Text style={[styles.actionText, { color: colors.success }]}>Confirmar</Text>
                    </TouchableOpacity>
                  )}
                  {(appointment.status === 'confirmed' || appointment.status === 'confirmado') && (
                    <>
                      <CheckInButton
                        appointmentId={appointment.id}
                        patientId={appointment.patientId}
                        appointmentDate={appointment.date instanceof Date ? appointment.date : new Date(appointment.date)}
                        onCheckedIn={() => handleCheckedIn(appointment.id)}
                      />
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleStartAppointment(appointment.id)}
                      >
                        <Ionicons name="play-circle-outline" size={20} color={colors.info} />
                        <Text style={[styles.actionText, { color: colors.info }]}>Iniciar</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => router.push(`/patient/${appointment.patientId}` as any)}
                  >
                    <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
                    <Text style={[styles.actionText, { color: colors.textSecondary }]}>Paciente</Text>
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
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 8,
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
  loadingState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 16,
  },
});
