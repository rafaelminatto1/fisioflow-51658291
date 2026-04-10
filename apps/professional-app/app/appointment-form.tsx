import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@/components';
import { useColors } from '@/hooks/useColorScheme';
import { useAppointments, getAppointmentByIdHook } from '@/hooks/useAppointments';
import { useHaptics } from '@/hooks/useHaptics';
import { useCreateFinancialRecord, useMarkAsPaid } from '@/hooks/usePatientFinancial';
import type { AppointmentStatus } from '@/types';
import { format } from 'date-fns';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PatientAutocomplete } from '@/components/appointment/PatientAutocomplete';
import { OptionSelector } from '@/components/appointment/OptionSelector';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  isGroup: z.boolean().default(false),
  additionalNames: z.string().optional(),
  isUnlimited: z.boolean().default(false),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

export default function AppointmentFormScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const appointmentId = params.id as string | undefined;
  const { medium, success, error: hapticError } = useHaptics();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [sessionValue, setSessionValue] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [,setFinancialRecordId] = useState<string | null>(null);

  const { 
    createAsync, 
    updateAsync, 
    deleteAsync, 
    isCreating, 
    isDeleting 
  } = useAppointments();

  const createFinancialMutation = useCreateFinancialRecord();
  const markAsPaidMutation = useMarkAsPaid();

  const [isLoadingData, setIsLoadingData] = useState(!!appointmentId);

  const { control, handleSubmit, setValue, reset, watch, formState: { errors, isDirty } } = useForm<AppointmentFormData>({
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
      isGroup: false,
      additionalNames: '',
      isUnlimited: false,
    }
  });

  const selectedPatientId = watch('patientId');
  const isEditing = !!appointmentId;

  const navigateToAgenda = () => {
    router.replace('/(tabs)/agenda');
  };

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
    } catch  {
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
              { text: 'Não', onPress: navigateToAgenda },
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
          navigateToAgenda();
        }
      } else {
        await createAsync(appointmentData);
        success();
        Alert.alert('Sucesso', 'Agendamento criado com sucesso');
        router.back();
      }
    } catch (err: any) {
      hapticError();
      const rawMsg: string = err?.message || String(err) || '';
      const normalizedRawMsg = rawMsg.trim();
      let userMsg = isEditing ? 'Não foi possível atualizar o agendamento.' : 'Não foi possível criar o agendamento.';
      if (rawMsg.includes('date') || rawMsg.includes('data')) userMsg = 'Data inválida. Verifique o campo Data.';
      else if (rawMsg.includes('conflict') || rawMsg.includes('ocupado')) userMsg = 'Horário já ocupado. Escolha outro horário.';
      else if (rawMsg.includes('patient') || rawMsg.includes('paciente')) userMsg = 'Paciente não encontrado. Selecione um paciente válido.';
      else if (rawMsg.includes('401') || rawMsg.includes('auth')) userMsg = 'Sessão expirada. Saia e entre novamente.';
      else if (rawMsg.includes('400') || rawMsg.includes('obrigatório')) userMsg = 'Campos obrigatórios ausentes. Verifique o formulário.';
      else if (rawMsg.includes('500') || rawMsg.includes('SERVER')) userMsg = 'Erro interno do servidor. Tente novamente em instantes.';
      const detailText =
        !normalizedRawMsg ||
        normalizedRawMsg === userMsg ||
        normalizedRawMsg === 'Erro ao criar agendamento' ||
        normalizedRawMsg === 'Erro ao atualizar agendamento'
          ? null
          : `\n\nDetalhe técnico: ${normalizedRawMsg.substring(0, 180)}`;
      Alert.alert(
        isEditing ? 'Erro ao salvar agendamento' : 'Erro ao criar agendamento',
        `${userMsg}${detailText ?? ''}`,
      );
    }
  };

  const onInvalid = (fieldErrors: FieldErrors<AppointmentFormData>) => {
    hapticError();

    const firstMessage =
      fieldErrors.patientId?.message ||
      fieldErrors.date?.message ||
      fieldErrors.time?.message ||
      fieldErrors.type?.message ||
      fieldErrors.duration?.message ||
      fieldErrors.status?.message;

    if (firstMessage) {
      Alert.alert('Campos pendentes', String(firstMessage));
    }
  };

  const submitAppointment = handleSubmit(onSave, onInvalid);

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
              navigateToAgenda();
            } catch  {
              hapticError();
              Alert.alert('Erro', 'Não foi possível excluir.');
            }
          },
        },
      ]
    );
  };

  const parseDateString = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  };

  const parseTimeString = (timeStr: string) => {
    if (!timeStr) return new Date();
    const parts = timeStr.split(':');
    const d = new Date();
    if (parts.length >= 2) {
      const [hour, minute] = parts;
      d.setHours(parseInt(hour, 10));
      d.setMinutes(parseInt(minute, 10));
    }
    return d;
  };

  const PAYMENT_METHODS = [
    { label: 'Pix', value: 'pix' },
    { label: 'Dinheiro', value: 'cash' },
    { label: 'Cartão de Crédito', value: 'credit_card' },
    { label: 'Cartão de Débito', value: 'debit_card' },
    { label: 'Transferência', value: 'transfer' },
  ];

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('pix');

  

  const handleAmountChange = (text: string) => {
    const rawText = text.replace(/\D/g, '');
    setSessionValue(rawText);
  };

  const getDisplayAmount = () => {
    if (!sessionValue) return '';
    const val = parseFloat(sessionValue) / 100;
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handlePayment = async () => {
    if (!sessionValue || parseFloat(sessionValue) <= 0) {
      Alert.alert('Erro', 'Informe o valor da sessão.');
      return;
    }

    medium();
    try {
      const [day, month, year] = watch('date').split('/');
      const sessionDate = `${year}-${month}-${day}`;
      const finalAmount = parseFloat(sessionValue) / 100;

      // Create financial record
      const record = await createFinancialMutation.mutateAsync({
        patient_id: selectedPatientId,
        session_date: sessionDate,
        session_value: finalAmount,
        payment_method: selectedPaymentMethod,
        notes: `Sessão de ${watch('type')} - ${watch('time')}`,
      });

      // Mark as paid
      if (record?.id) {
        await markAsPaidMutation.mutateAsync({
          recordId: record.id,
          paymentMethod: selectedPaymentMethod,
        });
      }

      setIsPaid(true);
      setFinancialRecordId(record?.id || null);
      setShowPaymentModal(false);
      success();
      Alert.alert('Sucesso', 'Pagamento registrado com sucesso!');
    } catch (err) {
      hapticError();
      console.error(err);
      Alert.alert('Erro', 'Não foi possível registrar o pagamento.');
    }
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => {
            if (isEditing && isDirty) {
                  Alert.alert(
                'Salvar alterações?',
                'Você fez alterações neste agendamento.',
                [
                  { text: 'Não', style: 'cancel', onPress: navigateToAgenda },
                  { text: 'Sim', onPress: () => void submitAppointment() },
                ]
              );
            } else {
              if (isEditing) {
                navigateToAgenda();
              } else {
                router.back();
              }
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {isEditing ? 'Editar Agendamento' : 'Novo Agendamento'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        
        {/* Patient Selection */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Paciente *</Text>
        <Controller
          control={control}
          name="patientId"
          render={({ field: { value: _value, onChange } }) => (
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
                <View>
                  {Platform.OS === 'ios' ? (
                    <View style={[styles.pickerButton, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                      <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                      <DateTimePicker
                        value={parseDateString(value)}
                        mode="date"
                        locale="pt-BR"
                        display="compact"
                        style={{ flex: 1 }}
                        onChange={(_e, date) => {
                          if (date) onChange(format(date, 'dd/MM/yyyy'));
                        }}
                      />
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.pickerButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                        onPress={() => setShowDatePicker(true)}
                      >
                        <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                        <Text style={[styles.pickerText, { color: colors.text }]}>{value || 'DD/MM/AAAA'}</Text>
                      </TouchableOpacity>
                      {showDatePicker && (
                        <DateTimePicker
                          value={parseDateString(value)}
                          mode="date"
                          display="default"
                          onChange={(_e, date) => {
                            setShowDatePicker(false);
                            if (date) onChange(format(date, 'dd/MM/yyyy'));
                          }}
                        />
                      )}
                    </>
                  )}
                </View>
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
                <View>
                  {Platform.OS === 'ios' ? (
                    <View style={[styles.pickerButton, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                      <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                      <DateTimePicker
                        value={parseTimeString(value)}
                        mode="time"
                        locale="pt-BR"
                        display="compact"
                        style={{ flex: 1 }}
                        onChange={(_e, date) => {
                          if (date) onChange(format(date, 'HH:mm'));
                        }}
                      />
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.pickerButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                        onPress={() => setShowTimePicker(true)}
                      >
                        <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                        <Text style={[styles.pickerText, { color: colors.text }]}>{value || 'HH:MM'}</Text>
                      </TouchableOpacity>
                      {showTimePicker && (
                        <DateTimePicker
                          value={parseTimeString(value)}
                          mode="time"
                          is24Hour={true}
                          display="default"
                          onChange={(_e, date) => {
                            setShowTimePicker(false);
                            if (date) onChange(format(date, 'HH:mm'));
                          }}
                        />
                      )}
                    </>
                  )}
                </View>
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

        {/* Payment Section - Only for editing */}
        {isEditing && (
          <View style={[styles.paymentSection, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={styles.paymentHeader}>
              <Ionicons name="card-outline" size={24} color={colors.primary} />
              <Text style={[styles.paymentTitle, { color: colors.text }]}>Pagamento</Text>
            </View>
            
            <View style={styles.paymentStatusRow}>
              <View style={styles.paymentInfo}>
                <Text style={[styles.paymentLabel, { color: colors.textSecondary }]}>Status</Text>
                <View style={[styles.statusBadge, { 
                  backgroundColor: isPaid ? colors.success + '20' : colors.warning + '20',
                }]}>
                  <Ionicons 
                    name={isPaid ? 'checkmark-circle' : 'time-outline'} 
                    size={16} 
                    color={isPaid ? colors.success : colors.warning} 
                  />
                  <Text style={[styles.statusText, { color: isPaid ? colors.success : colors.warning }]}>
                    {isPaid ? 'Pago' : 'Pendente'}
                  </Text>
                </View>
              </View>
            </View>

            {!isPaid && (
              <TouchableOpacity
                style={[styles.payButton, { backgroundColor: colors.success }]}
                onPress={() => setShowPaymentModal(true)}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.payButtonText}>Registrar Pagamento</Text>
              </TouchableOpacity>
            )}

            {isPaid && (
              <View style={[styles.paidInfo, { backgroundColor: colors.success + '10' }]}>
                <Ionicons name="checkmark-done-circle" size={20} color={colors.success} />
                <Text style={[styles.paidText, { color: colors.success }]}>
                  Pagamento registrado
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Botão de criar — apenas para novo agendamento. Edição salva via prompt ao voltar. */}
        {!isEditing && (
          <Button
            title="Agendar"
            onPress={() => void submitAppointment()}
            loading={isCreating}
            style={styles.saveButton}
          />
        )}

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

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Registrar Pagamento</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              {/* Valor */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Valor da Sessão *</Text>
              <TextInput
                style={[styles.valueInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
                value={getDisplayAmount()}
                onChangeText={handleAmountChange}
                placeholder="R$ 0,00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />

              {/* Payment Method */}
              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>Forma de Pagamento</Text>
              <View style={styles.paymentMethodsGrid}>
                {PAYMENT_METHODS.map((method) => (
                  <TouchableOpacity
                    key={method.value}
                    style={[
                      styles.paymentMethodButton,
                      { borderColor: colors.border },
                      selectedPaymentMethod === method.value && { 
                        backgroundColor: colors.primary + '20', 
                        borderColor: colors.primary 
                      }
                    ]}
                    onPress={() => setSelectedPaymentMethod(method.value)}
                  >
                    <Ionicons
                      name={
                        method.value === 'pix' ? 'qr-code-outline' :
                        method.value === 'cash' ? 'cash-outline' :
                        method.value === 'credit_card' ? 'card-outline' :
                        method.value === 'debit_card' ? 'card-outline' :
                        'swap-horizontal-outline'
                      }
                      size={24}
                      color={selectedPaymentMethod === method.value ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[
                      styles.paymentMethodText,
                      { color: selectedPaymentMethod === method.value ? colors.primary : colors.textSecondary }
                    ]}>
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Confirm Button */}
              <TouchableOpacity
                style={[styles.confirmPaymentButton, { backgroundColor: colors.success }]}
                onPress={handlePayment}
                disabled={createFinancialMutation.isPending || markAsPaidMutation.isPending}
              >
                {(createFinancialMutation.isPending || markAsPaidMutation.isPending) ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                    <Text style={styles.confirmPaymentText}>Confirmar Pagamento</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
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
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  pickerText: {
    marginLeft: 8,
    fontSize: 15,
  },
  confirmPickerButton: {
    marginTop: -8,
    marginBottom: 16,
  },
  saveButton: { marginTop: 8 },
  startButton: { marginTop: 12 },
  deleteButton: { marginTop: 12, borderWidth: 1 },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: -12, marginBottom: 12 },
  // Payment Section Styles
  paymentSection: {
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  paymentStatusRow: {
    marginBottom: 16,
  },
  paymentInfo: {
    gap: 6,
  },
  paymentLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  paidInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  paidText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  valueInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  paymentMethodButton: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  confirmPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  confirmPaymentText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
