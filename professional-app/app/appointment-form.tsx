import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Card } from '@/components';
import { useColors } from '@/hooks/useColorScheme';
import { useAppointments } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import { useHaptics } from '@/hooks/useHaptics';
import type { AppointmentBase } from '@/types';

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

export default function AppointmentFormScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const appointmentId = params.id as string | undefined;


  const { create, update, isCreating, isUpdating } = useAppointments();
  const { data: patients } = usePatients({ status: 'active' });
  const { medium, success, error: hapticError } = useHaptics();

  const [selectedPatient, setSelectedPatient] = useState<string>('');

  // Use query params for initial state if available
  const initialDate = params.date as string || '';
  const initialTime = params.time as string || '';



  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [type, setType] = useState('Fisioterapia');
  const [duration, setDuration] = useState(45);
  const [notes, setNotes] = useState('');

  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);

  const isEditing = !!appointmentId;

  const selectedPatientData = patients?.find((p) => p.id === selectedPatient);

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
        status: 'scheduled' as const,
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
        >
          <Text style={[styles.selectorText, { color: selectedPatientData ? colors.text : colors.textMuted }]}>
            {selectedPatientData?.name || 'Selecione o paciente'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
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

        {/* Duration Selection */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Duração</Text>
        <TouchableOpacity
          style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            medium();
            setShowDurationModal(true);
          }}
        >
          <Text style={[styles.selectorText, { color: colors.text }]}>{duration} minutos</Text>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

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
