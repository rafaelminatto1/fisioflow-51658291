import { useState, useCallback, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, addMinutes, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { PatientSelector } from '@/components/PatientSelector';
import { DateTimePicker } from '@/components/DateTimePicker';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { HapticFeedback } from '@/lib/haptics';
import { doc, setDoc, serverTimestamp, collection, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppointmentType, AppointmentStatus } from '@/types';

const APPOINTMENT_TYPES: AppointmentType[] = [
  'Consulta Inicial',
  'Fisioterapia',
  'Reavaliação',
  'Consulta de Retorno',
  'Avaliação Funcional',
  'Terapia Manual',
  'Pilates Clínico',
  'RPG',
  'Dry Needling',
  'Liberação Miofascial',
];

const DEFAULT_DURATIONS: Record<AppointmentType, number> = {
  'Consulta Inicial': 60,
  'Fisioterapia': 60,
  'Reavaliação': 45,
  'Consulta de Retorno': 30,
  'Avaliação Funcional': 60,
  'Terapia Manual': 60,
  'Pilates Clínico': 60,
  'RPG': 60,
  'Dry Needling': 45,
  'Liberação Miofascial': 60,
};

const ROOMS = ['Sala 1', 'Sala 2', 'Sala 3', 'Sala 4', 'Pilates', 'Recepção'];

type Params = {
  appointmentId?: string;
  patientId?: string;
  date?: string;
  time?: string;
  room?: string;
};

export default function NewAppointmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams() as unknown as Params;
  const { colors } = useTheme();
  const { profile } = useAuth();

  const [loading, saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form state
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [selectedType, setSelectedType] = useState<AppointmentType>('Fisioterapia');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<AppointmentStatus>('agendado');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing appointment if editing
  useEffect(() => {
    const loadAppointment = async () => {
      if (params.appointmentId) {
        setIsEditMode(true);
        try {
          const docRef = doc(db, 'appointments', params.appointmentId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setSelectedPatient({ id: data.patient_id, name: data.patient_name });
            setSelectedDate(new Date(data.date || data.appointment_date));
            setSelectedTime(data.time || data.appointment_time || data.start_time || '09:00');
            setDuration(data.duration || 60);
            setSelectedType(data.type || 'Fisioterapia');
            setSelectedRoom(data.room || '');
            setNotes(data.notes || '');
            setStatus(data.status || 'agendado');
          }
        } catch (error) {
          console.error('Error loading appointment:', error);
          Alert.alert('Erro', 'Não foi possível carregar o agendamento.');
        }
      }
    };

    loadAppointment();
  }, [params.appointmentId]);

  // Set patient from params
  useEffect(() => {
    if (params.patientId && params.patientId !== 'new') {
      // Load patient data
      getDoc(doc(db, 'patients', params.patientId)).then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSelectedPatient({ id: docSnap.id, name: data.name || data.full_name || '' });
        }
      });
    }
  }, [params.patientId]);

  // Set room from AsyncStorage when screen gains focus (returning from select-room)
  useFocusEffect(
    useCallback(() => {
      const loadSelectedRoom = async () => {
        const savedRoom = await AsyncStorage.getItem('@selected_room');
        if (savedRoom && savedRoom !== selectedRoom) {
          setSelectedRoom(savedRoom);
          // Clear the saved room after loading
          await AsyncStorage.removeItem('@selected_room');
        }
      };

      loadSelectedRoom();
    }, [selectedRoom])
  );

  // Set date/time from params
  useEffect(() => {
    if (params.date) {
      setSelectedDate(new Date(params.date));
    }
    if (params.time) {
      setSelectedTime(params.time);
    }
  }, [params.date, params.time]);

  // Update duration when type changes
  useEffect(() => {
    if (!isEditMode) {
      setDuration(DEFAULT_DURATIONS[selectedType]);
    }
  }, [selectedType, isEditMode]);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!selectedPatient?.id) {
      newErrors.patient = 'Selecione um paciente';
    }
    if (!selectedType) {
      newErrors.type = 'Selecione o tipo de consulta';
    }
    if (!selectedRoom) {
      newErrors.room = 'Selecione a sala';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [selectedPatient, selectedType, selectedRoom]);

  const handleSave = useCallback(async () => {
    if (!validate()) {
      HapticFeedback.error();
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setSaving(true);
      HapticFeedback.medium();

      const appointmentId = params.appointmentId || doc(collection(db, 'appointments')).id;

      // Calculate end time
      const startTime = parse(selectedTime, 'HH:mm', new Date());
      const endTime = addMinutes(startTime, duration);

      const appointmentData = {
        id: appointmentId,
        patient_id: selectedPatient.id,
        patient_name: selectedPatient.name,
        date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: selectedTime,
        end_time: format(endTime, 'HH:mm'),
        time: selectedTime, // Legacy
        appointment_date: format(selectedDate, 'yyyy-MM-dd'), // Legacy
        appointment_time: selectedTime, // Legacy
        duration,
        type: selectedType,
        status,
        notes: notes || null,
        room: selectedRoom,
        therapist_id: profile?.id,
        therapist_name: profile?.full_name,
        created_at: isEditMode ? undefined : serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      await setDoc(doc(db, 'appointments', appointmentId), appointmentData, { merge: true });

      HapticFeedback.success();
      Alert.alert(
        'Sucesso',
        isEditMode ? 'Agendamento atualizado!' : 'Agendamento criado!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving appointment:', error);
      HapticFeedback.error();
      Alert.alert('Erro', 'Não foi possível salvar o agendamento.');
    } finally {
      setSaving(false);
    }
  }, [selectedPatient, selectedDate, selectedTime, duration, selectedType, status, notes, selectedRoom, profile, validate, isEditMode, params.appointmentId, router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="x" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditMode ? 'Editar Agendamento' : 'Novo Agendamento'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Patient Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Paciente</Text>
          <PatientSelector
            selected={selectedPatient}
            onSelect={setSelectedPatient}
            error={errors.patient}
          />
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Data e Horário</Text>
          <Card style={styles.card}>
            <DateTimePicker
              date={selectedDate}
              time={selectedTime}
              onDateChange={setSelectedDate}
              onTimeChange={setSelectedTime}
            />
          </Card>
        </View>

        {/* Appointment Type */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tipo de Consulta</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {APPOINTMENT_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => {
                  HapticFeedback.selection();
                  setSelectedType(type);
                }}
                style={({ pressed }) => [
                  styles.typeChip,
                  {
                    backgroundColor: selectedType === type ? colors.primary : colors.card,
                    opacity: pressed ? 0.8 : 1,
                    borderColor: selectedType === type ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    { color: selectedType === type ? '#fff' : colors.text },
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {errors.type && (
            <Text style={[styles.errorText, { color: colors.error }]}>{errors.type}</Text>
          )}
        </View>

        {/* Duration & Room */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={[styles.label, { color: colors.text }]}>Duração</Text>
              <View style={[styles.picker, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Pressable
                  onPress={() => {
                    HapticFeedback.selection();
                    setDuration(Math.max(15, duration - 15));
                  }}
                  style={styles.durationButton}
                >
                  <Icon name="minus" size={20} color={colors.text} />
                </Pressable>
                <Text style={[styles.durationValue, { color: colors.text }]}>{duration}</Text>
                <Text style={[styles.durationUnit, { color: colors.textSecondary }]}>min</Text>
                <Pressable
                  onPress={() => {
                    HapticFeedback.selection();
                    setDuration(duration + 15);
                  }}
                  style={styles.durationButton}
                >
                  <Icon name="plus" size={20} color={colors.text} />
                </Pressable>
              </View>
            </View>

            <View style={styles.half}>
              <Text style={[styles.label, { color: colors.text }]}>Sala</Text>
              <Pressable onPress={() => router.push('/agenda/select-room')}>
                <View style={[styles.picker, { backgroundColor: colors.card, borderColor: colors.border }, !selectedRoom && styles.pickerError]}>
                  <Text style={[styles.pickerText, { color: selectedRoom ? colors.text : colors.textSecondary }]}>
                    {selectedRoom || 'Selecione'}
                  </Text>
                  <Icon name="chevron-right" size={20} color={colors.textSecondary} />
                </View>
              </Pressable>
              {errors.room && (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.room}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Status */}
        {isEditMode && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Status</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {(['agendado', 'confirmado', 'em_andamento', 'concluido', 'cancelado'] as AppointmentStatus[]).map((statusOption) => (
                <Pressable
                  key={statusOption}
                  onPress={() => {
                    HapticFeedback.selection();
                    setStatus(statusOption);
                  }}
                  style={({ pressed }) => [
                    styles.statusChip,
                    {
                      backgroundColor: status === statusOption ? getStatusColor(statusOption, colors) : colors.card,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      { color: status === statusOption ? '#fff' : colors.text },
                    ]}
                  >
                    {getStatusLabel(statusOption)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Notes */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Observações</Text>
          <Card style={styles.notesCard}>
            <TextInput
              style={[styles.notesInput, { color: colors.text }]}
              placeholder="Adicione observações sobre este agendamento..."
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Card>
        </View>

        {/* Summary */}
        {selectedPatient && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Resumo</Text>
            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Paciente:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedPatient.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Data:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {format(selectedDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Tipo:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedType}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Duração:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{duration} minutos</Text>
              </View>
              {selectedRoom && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Sala:</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedRoom}</Text>
                </View>
              )}
            </Card>
          </View>
        )}

        {/* Save Button */}
        <Button
          variant="primary"
          size="lg"
          onPress={handleSave}
          loading={saving}
          disabled={!selectedPatient}
          style={styles.saveButton}
        >
          {isEditMode ? 'Salvar Alterações' : 'Criar Agendamento'}
        </Button>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getStatusColor(status: AppointmentStatus, colors: any): string {
  switch (status) {
    case 'agendado':
      return colors.primary;
    case 'confirmado':
      return '#22c55e';
    case 'em_andamento':
      return '#f59e0b';
    case 'concluido':
      return '#10b981';
    case 'cancelado':
      return '#ef4444';
    default:
      return '#6b7280';
  }
}

function getStatusLabel(status: AppointmentStatus): string {
  switch (status) {
    case 'agendado':
      return 'Agendado';
    case 'confirmado':
      return 'Confirmado';
    case 'em_andamento':
      return 'Em Andamento';
    case 'concluido':
      return 'Concluído';
    case 'cancelado':
      return 'Cancelado';
    default:
      return status;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  card: {
    padding: 16,
  },
  chipsScroll: {
    gap: 10,
    paddingHorizontal: 1,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerError: {
    borderColor: '#ef4444',
  },
  pickerText: {
    fontSize: 15,
    fontWeight: '500',
  },
  durationButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationValue: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  durationUnit: {
    fontSize: 13,
  },
  notesCard: {
    padding: 16,
  },
  notesInput: {
    fontSize: 15,
    minHeight: 100,
  },
  summaryCard: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
  },
  saveButton: {
    marginTop: 8,
  },
  bottomSpacing: {
    height: 40,
  },
});
