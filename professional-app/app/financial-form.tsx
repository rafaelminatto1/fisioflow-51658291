import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useHaptics } from '@/hooks/useHaptics';
import { useCreateFinancialRecord, useUpdateFinancialRecord } from '@/hooks/usePatientFinancial';
import { usePatients } from '@/hooks/usePatients';
import { Button } from '@/components';
import { format } from 'date-fns';

export default function FinancialFormScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { light, medium, success, error } = useHaptics();

  // Mode: Create or Edit
  const isEditing = !!params.id;
  const recordId = params.id as string;

  // Form State
  const [patientId, setPatientId] = useState(params.patientId as string || '');
  const [amount, setAmount] = useState(params.amount ? String(params.amount) : '');
  const [date, setDate] = useState(params.date ? new Date(params.date as string) : new Date());
  const [description, setDescription] = useState(params.description as string || '');
  const [paymentMethod, setPaymentMethod] = useState(params.paymentMethod as string || 'pix');
  const [status, setStatus] = useState<'pending' | 'paid'>(params.status as 'pending' | 'paid' || 'pending');
  
  // Pickers State
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  // Hooks
  const { data: patients, isLoading: isLoadingPatients } = usePatients({ status: 'active' });
  const createMutation = useCreateFinancialRecord();
  const updateMutation = useUpdateFinancialRecord();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Helpers
  const formatCurrency = (value: string) => {
    // Remove non-numeric chars
    const numericValue = value.replace(/\D/g, '');
    const floatValue = parseFloat(numericValue) / 100;
    return floatValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleAmountChange = (text: string) => {
    // Keep only numbers for raw value, but display formatted
    const rawText = text.replace(/\D/g, '');
    setAmount(rawText);
  };

  const getDisplayAmount = () => {
    if (!amount) return '';
    const val = parseFloat(amount) / 100;
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const validateForm = () => {
    if (!patientId) {
      Alert.alert('Erro', 'Selecione um paciente.');
      return false;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Erro', 'Insira um valor válido.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    light();
    if (!validateForm()) {
      error();
      return;
    }

    medium();
    try {
      const finalAmount = parseFloat(amount) / 100;
      
      const payload = {
        patient_id: patientId,
        session_date: date.toISOString().split('T')[0], // YYYY-MM-DD
        session_value: finalAmount,
        payment_method: paymentMethod,
        payment_status: status,
        notes: description,
        paid_amount: status === 'paid' ? finalAmount : 0,
        paid_date: status === 'paid' ? new Date().toISOString() : undefined,
      };

      if (isEditing) {
        await updateMutation.mutateAsync({ 
          recordId, 
          data: {
            ...payload,
            final_value: finalAmount, // Ensure consistency
          } 
        });
        Alert.alert('Sucesso', 'Registro atualizado!');
      } else {
        await createMutation.mutateAsync(payload);
        Alert.alert('Sucesso', 'Registro criado!');
      }
      
      success();
      router.back();
    } catch (err) {
      error();
      console.error(err);
      Alert.alert('Erro', 'Falha ao salvar registro.');
    }
  };

  const getPatientName = () => {
    const p = patients?.find(p => p.id === patientId);
    return p ? p.name : 'Selecione um paciente';
  };

  const paymentMethods = [
    { label: 'Pix', value: 'pix' },
    { label: 'Cartão de Crédito', value: 'credit_card' },
    { label: 'Cartão de Débito', value: 'debit_card' },
    { label: 'Dinheiro', value: 'cash' },
    { label: 'Transferência', value: 'transfer' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditing ? 'Editar Registro' : 'Novo Registro'}
          </Text>
          <TouchableOpacity 
            onPress={handleSubmit} 
            disabled={isSubmitting}
            style={[styles.saveButton, { opacity: isSubmitting ? 0.5 : 1 }]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.saveButtonText, { color: colors.primary }]}>Salvar</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Patient Selector */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Paciente</Text>
            <TouchableOpacity
              style={[styles.selector, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={() => setShowPatientPicker(true)}
            >
              <Text style={[styles.selectorText, { color: patientId ? colors.text : colors.textMuted }]}>
                {isLoadingPatients ? 'Carregando...' : getPatientName()}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Valor (R$)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, fontSize: 18, fontWeight: '600' }]}
              value={getDisplayAmount()}
              onChangeText={handleAmountChange}
              placeholder="R$ 0,00"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>

          {/* Date Input (Simple Text for MVP, better with DatePicker) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Data</Text>
            <TouchableOpacity style={[styles.selector, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                 <Text style={[styles.selectorText, { color: colors.text }]}>
                    {format(date, 'dd/MM/yyyy')}
                 </Text>
                 <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {/* Note: In a real app, integrate a DatePicker modal here */}
          </View>

          {/* Payment Method */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Forma de Pagamento</Text>
            <TouchableOpacity
              style={[styles.selector, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={() => setShowPaymentPicker(true)}
            >
              <Text style={[styles.selectorText, { color: colors.text }]}>
                {paymentMethods.find(m => m.value === paymentMethod)?.label}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Status */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Status</Text>
            <View style={styles.statusRow}>
                <TouchableOpacity 
                    style={[
                        styles.statusOption, 
                        { borderColor: colors.border },
                        status === 'pending' && { backgroundColor: colors.warning + '20', borderColor: colors.warning }
                    ]}
                    onPress={() => setStatus('pending')}
                >
                    <Ionicons name="time-outline" size={20} color={status === 'pending' ? colors.warning : colors.textSecondary} />
                    <Text style={[styles.statusText, { color: status === 'pending' ? colors.warning : colors.textSecondary }]}>Pendente</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[
                        styles.statusOption, 
                        { borderColor: colors.border },
                        status === 'paid' && { backgroundColor: colors.success + '20', borderColor: colors.success }
                    ]}
                    onPress={() => setStatus('paid')}
                >
                    <Ionicons name="checkmark-circle-outline" size={20} color={status === 'paid' ? colors.success : colors.textSecondary} />
                    <Text style={[styles.statusText, { color: status === 'paid' ? colors.success : colors.textSecondary }]}>Pago</Text>
                </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Descrição (Opcional)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, height: 80, textAlignVertical: 'top' }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Sessão extra de avaliação"
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Patient Picker Modal */}
      <Modal visible={showPatientPicker} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Selecione o Paciente</Text>
                    <TouchableOpacity onPress={() => setShowPatientPicker(false)}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
                <ScrollView>
                    {patients?.map(p => (
                        <TouchableOpacity
                            key={p.id}
                            style={[styles.modalItem, { borderBottomColor: colors.border }]}
                            onPress={() => {
                                setPatientId(p.id);
                                setShowPatientPicker(false);
                            }}
                        >
                            <Text style={[styles.modalItemText, { color: colors.text }]}>{p.name}</Text>
                            {patientId === p.id && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </SafeAreaView>
      </Modal>

      {/* Payment Method Picker Modal */}
      <Modal visible={showPaymentPicker} animationType="fade" transparent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPaymentPicker(false)}>
            <View style={[styles.pickerModalContent, { backgroundColor: colors.surface }]}>
                {paymentMethods.map(m => (
                    <TouchableOpacity
                        key={m.value}
                        style={styles.pickerItem}
                        onPress={() => {
                            setPaymentMethod(m.value);
                            setShowPaymentPicker(false);
                        }}
                    >
                        <Text style={[styles.pickerItemText, { color: colors.text }]}>{m.label}</Text>
                        {paymentMethod === m.value && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                    </TouchableOpacity>
                ))}
            </View>
        </TouchableOpacity>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    padding: 8,
    marginRight: -8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 50,
  },
  selectorText: {
    fontSize: 16,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  statusText: {
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 16,
  },
  pickerModalContent: {
    margin: 20,
    borderRadius: 12,
    padding: 8,
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  pickerItemText: {
    fontSize: 16,
  },
});
