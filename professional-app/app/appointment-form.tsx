import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@/components';
import { useColors } from '@/hooks/useColorScheme';
import { useAppointments, getAppointmentByIdHook } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import { useHaptics } from '@/hooks/useHaptics';
import type { AppointmentStatus } from '@/types';
import { format } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PatientAutocomplete } from '@/components/appointment/PatientAutocomplete';
import { OptionSelector } from '@/components/appointment/OptionSelector';

const APPOINTMENT_TYPES = [
  'Avaliação Inicial', 'Fisioterapia', 'Osteopatia', 'Pilates', 
  'Reabilitação', 'Drenagem Linfática', 'Massagem', 'RPG', 'Outro'
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

const appointmentSchema = z.object({
  patientId: z.string().min(1, 'Selecione um paciente'),
  patientName: z.string(),
  date: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Data inválida (DD/MM/AAAA)'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido (HH:MM)'),
  type: z.string().min(1, 'Selecione o tipo'),
  duration: z.number().positive(),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

export default function AppointmentFormScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const appointmentId = params.id as string | undefined;
  const { medium, success, error: hapticError } = useHaptics();

  const { 
    createAsync, 
    updateAsync, 
    deleteAsync, 
    isCreating, 
    isUpdating, 
    isDeleting 
  } = useAppointments();

  const [isLoadingData, setIsLoadingData] = useState(!!appointmentId);

  const { control, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: params.patientId as string || '',
      patientName: params.patientName as string || '',
      date: params.date as string || format(new Date(), 'dd/MM/yyyy'),
      time: params.time as string || format(new Date(), 'HH:mm'),
      type: 'Fisioterapia',
      duration: 60,
      status: 'scheduled',
      notes: '',
    }
  });

  const selectedPatientId = watch('patientId');
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
        const appointmentDate = new Date(data.date);
        reset({
          patientId: data.patientId,
          patientName: data.patientName,
          date: format(appointmentDate, 'dd/MM/yyyy'),
          time: data.time || format(appointmentDate, 'HH:mm'),
          type: data.type,
          duration: data.duration,
          status: data.status as any,
          notes: data.notes || '',
        });
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível carregar os dados do agendamento.');
    } finally {
      setIsLoadingData(false);
    }
  };

  const onSave = async (formData: AppointmentFormData) => {
    medium();
    try {
      const [day, month, year] = formData.date.split('/');
      const [hour, minute] = formData.time.split(':');

      const appointmentDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );

      const appointmentData = {
        ...formData,
        date: appointmentDate,
        professionalId: '', // Set by hook
      };

      if (isEditing && appointmentId) {
        await updateAsync({ id: appointmentId, data: appointmentData });
        success();

        if (formData.status === 'completed') {
          Alert.alert(
            'Consulta Concluída',
            'Deseja criar um registro financeiro para este atendimento agora?',
            [
              { text: 'Não', onPress: () => router.back() },
              {
                text: 'Sim, Criar',
                onPress: () => {
                  router.replace(`/patient/${formData.patientId}?tab=financial&autoCreate=true&date=${year}-${month}-${day}`);
                }
              }
            ]
          );
        } else {
          Alert.alert('Sucesso', 'Agendamento atualizado com sucesso');
          router.back();
        }
      } else {
        await createAsync(appointmentData);
        success();
        Alert.alert('Sucesso', 'Agendamento criado com sucesso');
        router.back();
      }
    } catch (err: any) {
      hapticError();
      Alert.alert('Erro', err?.message || 'Não foi possível salvar.');
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
              await deleteAsync(appointmentId!);
              success();
              router.back();
            } catch (err) {
              hapticError();
              Alert.alert('Erro', 'Não foi possível excluir.');
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
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {isEditing ? 'Editar Agendamento' : 'Novo Agendamento'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        
        {/* Patient Selection */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Paciente *</Text>
        <Controller
          control={control}
          name="patientId"
          render={({ field: { value, onChange } }) => (
            <PatientAutocomplete
              value={watch('patientName')}
              onSelect={(p) => {
                onChange(p.id);
                setValue('patientName', p.name);
              }}
              disabled={isEditing}
            />
          )}
        />
        {errors.patientId && <Text style={styles.errorText}>{errors.patientId.message}</Text>}

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Data *</Text>
            <Controller
              control={control}
              name="date"
              render={({ field: { value, onChange } }) => (
                <Input
                  placeholder="DD/MM/AAAA"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  maxLength={10}
                  leftIcon="calendar-outline"
                />
              )}
            />
            {errors.date && <Text style={styles.errorText}>{errors.date.message}</Text>}
          </View>
          <View style={styles.col}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Horário *</Text>
            <Controller
              control={control}
              name="time"
              render={({ field: { value, onChange } }) => (
                <Input
                  placeholder="HH:MM"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  maxLength={5}
                  leftIcon="time-outline"
                />
              )}
            />
            {errors.time && <Text style={styles.errorText}>{errors.time.message}</Text>}
          </View>
        </View>

        {/* Type Selector */}
        <Controller
          control={control}
          name="type"
          render={({ field: { value, onChange } }) => (
            <OptionSelector
              label="Tipo de Atendimento"
              value={value}
              options={APPOINTMENT_TYPES.map(t => ({ label: t, value: t }))}
              onSelect={onChange}
            />
          )}
        />

        <View style={styles.row}>
          <View style={styles.col}>
            <Controller
              control={control}
              name="duration"
              render={({ field: { value, onChange } }) => (
                <OptionSelector
                  label="Duração"
                  value={value}
                  options={DURATIONS.map(d => ({ label: `${d} min`, value: d }))}
                  onSelect={onChange}
                />
              )}
            />
          </View>
          <View style={styles.col}>
            <Controller
              control={control}
              name="status"
              render={({ field: { value, onChange } }) => (
                <OptionSelector
                  label="Status"
                  value={value}
                  options={STATUS_OPTIONS}
                  onSelect={onChange}
                />
              )}
            />
          </View>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Observações</Text>
        <Controller
          control={control}
          name="notes"
          render={({ field: { value, onChange } }) => (
            <Input
              placeholder="Observações sobre o atendimento..."
              value={value}
              onChangeText={onChange}
              multiline
              numberOfLines={3}
              style={{ minHeight: 80 }}
            />
          )}
        />

        <Button
          title={isEditing ? 'Salvar Alterações' : 'Agendar'}
          onPress={handleSubmit(onSave)}
          loading={isCreating || isUpdating}
          style={styles.saveButton}
        />

        {isEditing && watch('status') !== 'completed' && (
          <Button
            title="Iniciar Atendimento"
            onPress={() => router.push(`/evolution-form?patientId=${selectedPatientId}&appointmentId=${appointmentId}` as any)}
            variant="secondary"
            style={[styles.startButton, { backgroundColor: colors.success }] as any}
            leftIcon="play-circle-outline"
          />
        )}

        {isEditing && (
          <Button
            title="Excluir Agendamento"
            onPress={handleDelete}
            variant="outline"
            loading={isDeleting}
            style={[styles.deleteButton, { borderColor: colors.error }] as any}
            textStyle={{ color: colors.error }}
          />
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  saveButton: { marginTop: 8 },
  startButton: { marginTop: 12 },
  deleteButton: { marginTop: 12, borderWidth: 1 },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: -12, marginBottom: 12 },
});

