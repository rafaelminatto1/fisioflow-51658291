import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Pressable, TextInput } from 'react-native';
import { useState, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAppointments } from '@fisioflow/shared-api';
import { useAuth } from '../../hooks/useAuth';

type ViewMode = 'day' | 'week' | 'month';
type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientAvatar?: string;
  startTime: string; // HH:mm format
  endTime: string;
  date: string; // ISO date string
  status: AppointmentStatus;
  type: 'evaluation' | 'follow_up' | 'discharge';
  notes?: string;
}

interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
}

const TIME_SLOTS: TimeSlot[] = [
  { hour: 6, minute: 0, label: '06:00' },
  { hour: 7, minute: 0, label: '07:00' },
  { hour: 8, minute: 0, label: '08:00' },
  { hour: 9, minute: 0, label: '09:00' },
  { hour: 10, minute: 0, label: '10:00' },
  { hour: 11, minute: 0, label: '11:00' },
  { hour: 12, minute: 0, label: '12:00' },
  { hour: 13, minute: 0, label: '13:00' },
  { hour: 14, minute: 0, label: '14:00' },
  { hour: 15, minute: 0, label: '15:00' },
  { hour: 16, minute: 0, label: '16:00' },
  { hour: 17, minute: 0, label: '17:00' },
  { hour: 18, minute: 0, label: '18:00' },
  { hour: 19, minute: 0, label: '19:00' },
  { hour: 20, minute: 0, label: '20:00' },
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Mock patients for selection
const MOCK_PATIENTS = [
  { id: '1', name: 'João Silva', avatar: '' },
  { id: '2', name: 'Maria Santos', avatar: '' },
  { id: '3', name: 'Pedro Costa', avatar: '' },
  { id: '4', name: 'Ana Oliveira', avatar: '' },
  { id: '5', name: 'Carlos Lima', avatar: '' },
];

export default function CalendarScreen() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<typeof MOCK_PATIENTS[0] | null>(null);
  const [appointmentType, setAppointmentType] = useState<'evaluation' | 'follow_up' | 'discharge'>('follow_up');
  const [notes, setNotes] = useState('');

  // Get week dates based on selected date
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [selectedDate]);

  // Get month dates
  const monthDates = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const dates: Date[] = [];

    // Add days from previous month
    const startDay = firstDay.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      dates.push(date);
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      dates.push(new Date(year, month, i));
    }

    // Add days from next month to complete 42 cells (6 weeks)
    const remaining = 42 - dates.length;
    for (let i = 1; i <= remaining; i++) {
      dates.push(new Date(year, month + 1, i));
    }

    return dates;
  }, [selectedDate]);

  // Mock appointments - will be replaced with real-time hooks
  const appointments: Appointment[] = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return [
      {
        id: '1',
        patientId: '1',
        patientName: 'João Silva',
        startTime: '09:00',
        endTime: '10:00',
        date: today,
        status: 'confirmed',
        type: 'follow_up',
      },
      {
        id: '2',
        patientId: '2',
        patientName: 'Maria Santos',
        startTime: '10:30',
        endTime: '11:30',
        date: today,
        status: 'pending',
        type: 'evaluation',
      },
      {
        id: '3',
        patientId: '3',
        patientName: 'Pedro Costa',
        startTime: '14:00',
        endTime: '15:00',
        date: today,
        status: 'confirmed',
        type: 'follow_up',
      },
    ];
  }, []);

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const formatDateRange = () => {
    if (viewMode === 'day') {
      return selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    } else if (viewMode === 'week') {
      const start = weekDates[0];
      const end = weekDates[6];
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} - ${end.getDate()} de ${MONTHS[start.getMonth()]}`;
      }
      return `${start.getDate()} de ${MONTHS[start.getMonth()]} - ${end.getDate()} de ${MONTHS[end.getMonth()]}`;
    } else {
      return `${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    }
  };

  const getAppointmentsForSlot = (slot: TimeSlot, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter(apt => {
      const [aptHour, aptMin] = apt.startTime.split(':').map(Number);
      return apt.date === dateStr && aptHour === slot.hour && aptMin === slot.minute;
    });
  };

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed': return { bg: '#DCFCE7', text: '#166534', border: '#22C55E' };
      case 'pending': return { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' };
      case 'completed': return { bg: '#E0F2FE', text: '#0369A1', border: '#0EA5E9' };
      case 'cancelled': return { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' };
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'evaluation': return 'Avaliação';
      case 'follow_up': return 'Retorno';
      case 'discharge': return 'Alta';
    }
  };

  const handleSlotPress = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setShowNewAppointmentModal(true);
  };

  const handleCreateAppointment = () => {
    if (!selectedSlot || !selectedPatient) return;

    const newAppointment: Appointment = {
      id: Date.now().toString(),
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      startTime: selectedSlot.label,
      endTime: `${String(selectedSlot.hour + 1).padStart(2, '0')}:00`,
      date: selectedDate.toISOString().split('T')[0],
      status: 'pending',
      type: appointmentType,
      notes,
    };

    console.log('Creating appointment:', newAppointment);
    // TODO: Save to Firestore using appointment service

    // Reset modal
    setShowNewAppointmentModal(false);
    setSelectedSlot(null);
    setSelectedPatient(null);
    setNotes('');
  };

  const renderDayView = () => (
    <ScrollView style={styles.timeSlotsContainer}>
      {TIME_SLOTS.map((slot) => {
        const slotAppointments = getAppointmentsForSlot(slot, selectedDate);
        return (
          <TouchableOpacity
            key={slot.label}
            style={styles.timeSlot}
            onPress={() => handleSlotPress(slot)}
          >
            <Text style={styles.slotTime}>{slot.label}</Text>
            <View style={styles.slotContent}>
              {slotAppointments.map((apt) => {
                const colors = getStatusColor(apt.status);
                return (
                  <View
                    key={apt.id}
                    style={[styles.appointmentCard, { borderLeftColor: colors.border }]}
                  >
                    <View style={styles.appointmentHeader}>
                      <Text style={styles.appointmentPatient}>{apt.patientName}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                        <Text style={[styles.statusText, { color: colors.text }]}>
                          {apt.status === 'confirmed' ? 'Confirmado' :
                           apt.status === 'pending' ? 'Pendente' :
                           apt.status === 'completed' ? 'Concluído' : 'Cancelado'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.appointmentDetails}>
                      <View style={styles.detailBadge}>
                        <Ionicons name="time-outline" size={12} color="#64748B" />
                        <Text style={styles.detailText}>{apt.startTime} - {apt.endTime}</Text>
                      </View>
                      <View style={[styles.detailBadge, { backgroundColor: '#F1F5F9' }]}>
                        <Text style={styles.detailText}>{getTypeLabel(apt.type)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
              {slotAppointments.length === 0 && (
                <View style={styles.emptySlot}>
                  <Ionicons name="add-circle-outline" size={20} color="#CBD5E1" />
                  <Text style={styles.emptySlotText}>Disponível</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderWeekView = () => (
    <ScrollView horizontal style={styles.weekContainer}>
      <View style={styles.weekGrid}>
        {/* Header row */}
        <View style={styles.weekHeaderRow}>
          <View style={styles.weekTimeColumn} />
          {weekDates.map((date) => {
            const isToday = date.toDateString() === new Date().toDateString();
            const isSelected = date.toDateString() === selectedDate.toDateString();
            return (
              <TouchableOpacity
                key={date.toISOString()}
                style={[styles.weekDayColumn, isSelected && styles.selectedDayColumn]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[styles.weekDayName, isToday && styles.todayText]}>
                  {WEEKDAYS[date.getDay()]}
                </Text>
                <View style={[styles.weekDayNumber, isToday && styles.todayDayNumber]}>
                  <Text style={[styles.weekDayNumberText, isToday && styles.todayText]}>
                    {date.getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Time slots */}
        {TIME_SLOTS.map((slot) => (
          <View key={slot.label} style={styles.weekRow}>
            <View style={styles.weekTimeColumn}>
              <Text style={styles.weekSlotTime}>{slot.label}</Text>
            </View>
            {weekDates.map((date) => {
              const slotAppointments = getAppointmentsForSlot(slot, date);
              return (
                <TouchableOpacity
                  key={date.toISOString()}
                  style={styles.weekCell}
                  onPress={() => {
                    setSelectedDate(date);
                    handleSlotPress(slot);
                  }}
                >
                  {slotAppointments.map((apt) => {
                    const colors = getStatusColor(apt.status);
                    return (
                      <View
                        key={apt.id}
                        style={[styles.miniAppointment, { backgroundColor: colors.bg }]}
                      >
                        <Text style={[styles.miniAppointmentText, { color: colors.text }]} numberOfLines={1}>
                          {apt.patientName.split(' ')[0]}
                        </Text>
                      </View>
                    );
                  })}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderMonthView = () => (
    <View style={styles.monthContainer}>
      <View style={styles.monthHeader}>
        {WEEKDAYS.map((day) => (
          <View key={day} style={styles.monthDayHeader}>
            <Text style={styles.monthDayHeaderText}>{day}</Text>
          </View>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {monthDates.map((date, index) => {
          const isToday = date.toDateString() === new Date().toDateString();
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
          const dateStr = date.toISOString().split('T')[0];
          const dayAppointments = appointments.filter(apt => apt.date === dateStr);

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.monthCell,
                isSelected && styles.selectedMonthCell,
                !isCurrentMonth && styles.otherMonthCell
              ]}
              onPress={() => setSelectedDate(date)}
            >
              <Text style={[
                styles.monthCellText,
                isToday && styles.todayCellText,
                !isCurrentMonth && styles.otherMonthCellText
              ]}>
                {date.getDate()}
              </Text>
              {dayAppointments.length > 0 && (
                <View style={styles.monthDots}>
                  {dayAppointments.slice(0, 3).map((apt, i) => (
                    <View
                      key={i}
                      style={[
                        styles.monthDot,
                        { backgroundColor: getStatusColor(apt.status).border }
                      ]}
                    />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.dateNavigation}>
            <TouchableOpacity style={styles.navButton} onPress={() => navigateDate('prev')}>
              <Ionicons name="chevron-back" size={24} color="#1E293B" />
            </TouchableOpacity>
            <TouchableOpacity onPress={goToToday}>
              <Text style={styles.dateRange}>{formatDateRange()}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton} onPress={() => navigateDate('next')}>
              <Ionicons name="chevron-forward" size={24} color="#1E293B" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.todayButton} onPress={goToToday}>
            <Text style={styles.todayButtonText}>Hoje</Text>
          </TouchableOpacity>
        </View>

        {/* View Mode Toggle */}
        <View style={styles.viewModeToggle}>
          {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.viewModeButton, viewMode === mode && styles.viewModeButtonActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.viewModeButtonText, viewMode === mode && styles.viewModeButtonTextActive]}>
                {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : 'Mês'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={16} color="#64748B" />
            <Text style={styles.statText}>{appointments.length} agendamentos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.statText}>
              {appointments.filter(a => a.status === 'confirmed').length} confirmados
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={16} color="#F59E0B" />
            <Text style={styles.statText}>
              {appointments.filter(a => a.status === 'pending').length} pendentes
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      {viewMode === 'day' && renderDayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}

      {/* New Appointment Modal */}
      <Modal
        visible={showNewAppointmentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewAppointmentModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNewAppointmentModal(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Novo Agendamento</Text>
            <TouchableOpacity onPress={handleCreateAppointment}>
              <Text style={[styles.modalSave, !selectedPatient && styles.modalSaveDisabled]}>
                Salvar
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Date and Time */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Data e Horário</Text>
              <View style={styles.datetimeRow}>
                <View style={styles.datetimeBox}>
                  <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
                  <Text style={styles.datetimeText}>
                    {selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                  </Text>
                </View>
                <View style={styles.datetimeBox}>
                  <Ionicons name="time-outline" size={20} color="#3B82F6" />
                  <Text style={styles.datetimeText}>{selectedSlot?.label}</Text>
                </View>
              </View>
            </View>

            {/* Patient Selection */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Paciente</Text>
              <ScrollView horizontal style={styles.patientsScroll} showsHorizontalScrollIndicator={false}>
                {MOCK_PATIENTS.map((patient) => (
                  <TouchableOpacity
                    key={patient.id}
                    style={[
                      styles.patientOption,
                      selectedPatient?.id === patient.id && styles.patientOptionSelected
                    ]}
                    onPress={() => setSelectedPatient(patient)}
                  >
                    <View style={styles.patientAvatar}>
                      <Text style={styles.patientAvatarText}>
                        {patient.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </Text>
                    </View>
                    <Text style={[
                      styles.patientName,
                      selectedPatient?.id === patient.id && styles.patientNameSelected
                    ]}>
                      {patient.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Appointment Type */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Tipo de Atendimento</Text>
              <View style={styles.typeButtons}>
                {([
                  { value: 'evaluation', label: 'Avaliação', icon: 'clipboard-outline' },
                  { value: 'follow_up', label: 'Retorno', icon: 'refresh-outline' },
                  { value: 'discharge', label: 'Alta', icon: 'exit-outline' },
                ] as const).map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeButton,
                      appointmentType === type.value && styles.typeButtonSelected
                    ]}
                    onPress={() => setAppointmentType(type.value as any)}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={20}
                      color={appointmentType === type.value ? '#3B82F6' : '#64748B'}
                    />
                    <Text style={[
                      styles.typeButtonText,
                      appointmentType === type.value && styles.typeButtonTextSelected
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Observações</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Adicione observações sobre este agendamento..."
                placeholderTextColor="#94A3B8"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRange: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  todayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
    padding: 4,
    borderRadius: 12,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  viewModeButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewModeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  viewModeButtonTextActive: {
    color: '#1E293B',
    fontWeight: '600',
  },
  quickStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#64748B',
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
  },
  // Day View
  timeSlotsContainer: {
    flex: 1,
  },
  timeSlot: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    minHeight: 80,
  },
  slotTime: {
    width: 70,
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    paddingTop: 12,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  slotContent: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  appointmentCard: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentPatient: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  appointmentDetails: {
    flexDirection: 'row',
    gap: 8,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#64748B',
  },
  emptySlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  emptySlotText: {
    fontSize: 13,
    color: '#CBD5E1',
  },
  // Week View
  weekContainer: {
    flex: 1,
  },
  weekGrid: {
    flexDirection: 'column',
  },
  weekHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  weekTimeColumn: {
    width: 50,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  weekDayColumn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  selectedDayColumn: {
    backgroundColor: '#EFF6FF',
  },
  weekDayName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 4,
  },
  weekDayNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  todayText: {
    color: '#3B82F6',
  },
  todayDayNumber: {
    backgroundColor: '#3B82F6',
  },
  weekRow: {
    flexDirection: 'row',
    minHeight: 60,
  },
  weekSlotTime: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    paddingTop: 8,
  },
  weekCell: {
    flex: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#fff',
    padding: 4,
    gap: 2,
  },
  miniAppointment: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  miniAppointmentText: {
    fontSize: 10,
    fontWeight: '600',
  },
  // Month View
  monthContainer: {
    flex: 1,
    padding: 16,
  },
  monthHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  monthDayHeader: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  monthDayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthCell: {
    width: '14.28%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  selectedMonthCell: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  otherMonthCell: {
    backgroundColor: '#F8FAFC',
  },
  monthCellText: {
    fontSize: 14,
    color: '#1E293B',
  },
  todayCellText: {
    fontWeight: '700',
    color: '#3B82F6',
  },
  otherMonthCellText: {
    color: '#CBD5E1',
  },
  monthDots: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  monthDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalCancel: {
    fontSize: 16,
    color: '#64748B',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  modalSaveDisabled: {
    color: '#CBD5E1',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  datetimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  datetimeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  datetimeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  patientsScroll: {
    flexDirection: 'row',
  },
  patientOption: {
    alignItems: 'center',
    marginRight: 12,
    width: 80,
  },
  patientOptionSelected: {
    opacity: 1,
  },
  patientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  patientOptionSelected: {
    borderColor: '#3B82F6',
  },
  patientAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  patientName: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  patientNameSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  typeButtonTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1E293B',
    minHeight: 100,
  },
});
