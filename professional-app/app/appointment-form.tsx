import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@/components';
import { useColors } from '@/hooks/useColorScheme';
import { useAppointments, getAppointmentByIdHook } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import { useHaptics } from '@/hooks/useHaptics';
import type { AppointmentStatus } from '@/types';
import { format } from 'date-fns';

const APPOINTMENT_TYPES = [
  'Avaliação Inicial',
  'Fisioterapia',
  'Osteopatia',
  'Pilates',
  'Reabilitação',
  'Drenagem Linfática',
  'Massagem',
  ' RPG',
  'Outro',
];

const DURATIONS = [30, 45, 60, 90, 120];

const STATUS_OPTIONS: { label: string; value: AppointmentStatus }[] = [
  { label: 'Agendado', value: 'scheduled' },
  { label: 'Confirmado', value: 'confirmed' },
  { label: 'Em Atendimento', value: 'in_progress' },
  { label: 'Concluído', value: 'completed' },
  { label: 'Cancelado', value: 'cancelled' },
  { label: 'Faltou', value: 'no_show' },
];

export default function AppointmentFormScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const appointmentId = params.id as string | undefined;


  const { create, update, delete: deleteAppointment, isCreating, isUpdating, isDeleting } = useAppointments();
  const { data: patients } = usePatients({ status: 'active' });
  const { medium, success, error: hapticError } = useHaptics();

  const [isLoadingData, setIsLoadingData] = useState(!!appointmentId);
  const [selectedPatient, setSelectedPatient] = useState<string>(params.patientId as string || '');
  const [date, setDate] = useState(params.date as string || '');
  const [time, setTime] = useState(params.time as string || '');
  const [type, setType] = useState('Fisioterapia');
  const [duration, setDuration] = useState(60);
  const [status, setStatus] = useState<AppointmentStatus>('scheduled');
  const [notes, setNotes] = useState('');

  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const isEditing = !!appointmentId;

  useEffect(() => {
    if (appointmentId) {
      loadAppointmentData();
    }
  }, [appointmentId]);

  const loadAppointmentData = async () => {
    try {
      const data = await getAppointmentByIdHook(appointmentId!);
      if (data) {
        setSelectedPatient(data.patientId);
        const appointmentDate = new Date(data.date);
        setDate(format(appointmentDate, 'dd/MM/yyyy'));
        setTime(data.time || format(appointmentDate, 'HH:mm'));
        setType(data.type);
        setDuration(data.duration);
        setStatus(data.status);
        setNotes(data.notes || '');
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível carregar os dados do agendamento.');
    } finally {
      setIsLoadingData(false);
    }
  };

  const selectedPatientData = patients?.find((p) => p.id === selectedPatient);
  const selectedStatusData = STATUS_OPTIONS.find((s) => s.value === status);

  const validateForm = () => {
    if (!selectedPatient) {
      Alert.alert('Erro', 'Selecione o paciente');
      return false;
    }
    if (!date) {
      Alert.alert('Erro', 'Digite a data da consulta');
      return false;
    }
    if (!time) {
      Alert.alert('Erro', 'Digite o horário da consulta');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    medium();

    if (!validateForm()) return;

    try {
      // Parse date and time to create Date object
      const [day, month, year] = date.split('/');
      const [hour, minute] = time.split(':');

      const appointmentDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );

      const appointmentData = {
        patientId: selectedPatient,
        patientName: selectedPatientData?.name || '',
        professionalId: '', // Will be set in the create function
        type,
        date: appointmentDate,
        duration,
        status,
        notes: notes.trim() || undefined,
      };

      if (isEditing && appointmentId) {
        await update({ id: appointmentId, data: appointmentData });
        success();
        Alert.alert('Sucesso', 'Agendamento atualizado com sucesso');
      } else {
        await create(appointmentData);
        success();
        Alert.alert('Sucesso', 'Agendamento criado com sucesso');
      }

      router.back();
    } catch (err) {
      hapticError();
      Alert.alert('Erro', 'Não foi possível salvar o agendamento. Tente novamente.');
    }
  };

  const handleDelete = () => {
    medium();
    Alert.alert(
      'Excluir Agendamento',
      'Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAppointment(appointmentId!);
              success();
              Alert.alert('Sucesso', 'Agendamento excluído com sucesso');
              router.back();
            } catch (err) {
              hapticError();
              Alert.alert('Erro', 'Não foi possível excluir o agendamento.');
            }
          },
        },
      ]
    );
  };

  if (isLoadingData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Carregando dados...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {isEditing ? 'Editar Agendamento' : 'Novo Agendamento'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Patient Selection */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Paciente *</Text>
        <TouchableOpacity
          style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            medium();
            setShowPatientModal(true);
          }}
          disabled={isEditing}
        >
          <Text style={[styles.selectorText, { color: selectedPatientData ? colors.text : colors.textMuted }]}>
            {selectedPatientData?.name || (params.patientName as string) || 'Selecione o paciente'}
          </Text>
          {!isEditing && <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />}
        </TouchableOpacity>

        {/* Date and Time */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Data *</Text>
            <Input
              placeholder="DD/MM/AAAA"
              value={date}
              onChangeText={setDate}
              keyboardType="numeric"
              maxLength={10}
              leftIcon="calendar-outline"
            />
          </View>
          <View style={styles.col}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Horário *</Text>
            <Input
              placeholder="HH:MM"
              value={time}
              onChangeText={setTime}
              keyboardType="numeric"
              maxLength={5}
              leftIcon="time-outline"
            />
          </View>
        </View>

        {/* Type Selection */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Tipo de Atendimento</Text>
        <TouchableOpacity
          style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            medium();
            setShowTypeModal(true);
          }}
        >
          <Text style={[styles.selectorText, { color: colors.text }]}>{type}</Text>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.row}>
          <View style={styles.col}>
            {/* Duration Selection */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Duração</Text>
            <TouchableOpacity
              style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                medium();
                setShowDurationModal(true);
              }}
            >
              <Text style={[styles.selectorText, { color: colors.text }]}>{duration} min</Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.col}>
            {/* Status Selection */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
            <TouchableOpacity
              style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                medium();
                setShowStatusModal(true);
              }}
            >
              <Text style={[styles.selectorText, { color: colors.text }]}>{selectedStatusData?.label}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Observações</Text>
        <View style={[styles.notesContainer, { backgroundColor: colors.surface }]}>
          <Input
            placeholder="Observações sobre o atendimento..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={{ minHeight: 80 }}
          />
        </View>

        {/* Save Button */}
        <Button
          title={isEditing ? 'Salvar Alterações' : 'Agendar'}
          onPress={handleSave}
          loading={isCreating || isUpdating}
          style={styles.saveButton}
        />

        {isEditing && (
          <Button
            title="Excluir Agendamento"
            onPress={handleDelete}
            variant="outline"
            loading={isDeleting}
            style={[styles.deleteButton, { borderColor: colors.error }]}
            textStyle={{ color: colors.error }}
          />
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Patient Selection Modal */}
      <Modal
        visible={showPatientModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPatientModal(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Selecionar Paciente</Text>
              <TouchableOpacity onPress={() => setShowPatientModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {patients.map((patient) => (
                <TouchableOpacity
                  key={patient.id}
                  style={[styles.modalItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    medium();
                    setSelectedPatient(patient.id);
                    setShowPatientModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: colors.text }]}>{patient.name}</Text>
                  <Text style={[styles.modalItemSub, { color: colors.textSecondary }]}>{patient.condition || 'Sem condição'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Type Selection Modal */}
      <Modal
        visible={showTypeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTypeModal(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Tipo de Atendimento</Text>
              <TouchableOpacity onPress={() => setShowTypeModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {APPOINTMENT_TYPES.map((appointmentType) => (
                <TouchableOpacity
                  key={appointmentType}
                  style={[styles.modalItem, { borderBottomColor: colors.border, backgroundColor: type === appointmentType ? colors.primaryLight : 'transparent' }]}
                  onPress={() => {
                    medium();
                    setType(appointmentType);
                    setShowTypeModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: colors.text }]}>{appointmentType}</Text>
                  {type === appointmentType && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Duration Selection Modal */}
      <Modal
        visible={showDurationModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDurationModal(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Duração</Text>
              <TouchableOpacity onPress={() => setShowDurationModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {DURATIONS.map((dur) => (
                <TouchableOpacity
                  key={dur}
                  style={[styles.modalItem, styles.durationItem, { borderBottomColor: colors.border, backgroundColor: duration === dur ? colors.primaryLight : 'transparent' }]}
                  onPress={() => {
                    medium();
                    setDuration(dur);
                    setShowDurationModal(false);
                  }}
                >
                  <Text style={[styles.durationText, { color: colors.text }]}>{dur} minutos</Text>
                  {duration === dur && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Status Selection Modal */}
      <Modal
        visible={showStatusModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowStatusModal(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Status do Agendamento</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {STATUS_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.modalItem, { borderBottomColor: colors.border, backgroundColor: status === s.value ? colors.primaryLight : 'transparent' }]}
                  onPress={() => {
                    medium();
                    setStatus(s.value);
                    setShowStatusModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: colors.text }]}>{s.label}</Text>
                  {status === s.value && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  selectorText: {
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  notesContainer: {
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 8,
  },
  deleteButton: {
    marginTop: 12,
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalList: {
    paddingVertical: 8,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 16,
  },
  modalItemSub: {
    fontSize: 14,
    marginTop: 2,
  },
  durationItem: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  durationText: {
    fontSize: 18,
    fontWeight: '500',
  },
});
