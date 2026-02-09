import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { Button, Card } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPatient, updatePatient, getPatientById } from '@/lib/firestore';
import { format } from 'date-fns';

interface FormData {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  condition: string;
  diagnosis: string;
  notes: string;
}

interface FormErrors {
  name?: string;
  phone?: string;
}

const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

const maskDate = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\/\d{4})\d+?$/, '$1');
};

export default function PatientFormScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuthStore();
  const { light, medium, success, error } = useHaptics();
  const queryClient = useQueryClient();

  const patientId = params.id as string | undefined;
  const isEditing = !!patientId;

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    condition: '',
    diagnosis: '',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Buscar dados do paciente se for edição
  const { data: patient, isLoading: isLoadingPatient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientId ? getPatientById(patientId) : null,
    enabled: !!patientId,
    onSuccess: (data) => {
      if (data) {
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          birthDate: data.birthDate ? format(new Date(data.birthDate), 'dd/MM/yyyy') : '',
          condition: data.condition || '',
          diagnosis: data.diagnosis || '',
          notes: data.notes || '',
        });
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<FormData, 'birthDate'> & { birthDate?: Date }) =>
      createPatient(user!.id, {
        ...data,
        status: 'active',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      success();
      Alert.alert('Sucesso', 'Paciente cadastrado com sucesso!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    },
    onError: () => {
      error();
      Alert.alert('Erro', 'Não foi possível cadastrar o paciente. Tente novamente.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FormData> & { birthDate?: Date } }) =>
      updatePatient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      success();
      Alert.alert('Sucesso', 'Paciente atualizado com sucesso!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    },
    onError: () => {
      error();
      Alert.alert('Erro', 'Não foi possível atualizar o paciente. Tente novamente.');
    },
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório';
    } else if (formData.phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = 'Telefone inválido';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const parseDate = (dateString: string): Date | undefined => {
    if (!dateString) return undefined;
    const parts = dateString.split('/');
    if (parts.length !== 3) return undefined;
    const [day, month, year] = parts;
    const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isNaN(parsed.getTime()) ? undefined : parsed;
  };

  const handleSave = async () => {
    medium();

    if (!validateForm()) {
      error();
      return;
    }

    try {
      const submitData = {
        ...formData,
        birthDate: parseDate(formData.birthDate),
      };

      if (isEditing && patientId) {
        await updateMutation.mutateAsync({ id: patientId, data: submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }
    } catch (err) {
      // Error handling in mutation
    }
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (isLoadingPatient && isEditing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Carregando dados do paciente...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditing ? 'Editar Paciente' : 'Novo Paciente'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Personal Info Section */}
          <Card style={styles.sectionCard} padding="sm">
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Dados Pessoais</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Nome Completo *</Text>
              <TextInput
                style={[styles.input, { borderColor: formErrors.name ? colors.error : colors.border, backgroundColor: colors.surface, color: colors.text }]}
                value={formData.name}
                onChangeText={(value) => updateField('name', value)}
                placeholder="Nome do paciente"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
              {formErrors.name && <Text style={[styles.errorText, { color: colors.error }]}>{formErrors.name}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={formData.email}
                onChangeText={(value) => updateField('email', value)}
                placeholder="email@exemplo.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Telefone *</Text>
              <TextInput
                style={[styles.input, { borderColor: formErrors.phone ? colors.error : colors.border, backgroundColor: colors.surface, color: colors.text }]}
                value={formData.phone}
                onChangeText={(value) => updateField('phone', maskPhone(value))}
                placeholder="(00) 00000-0000"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                maxLength={15}
              />
              {formErrors.phone && <Text style={[styles.errorText, { color: colors.error }]}>{formErrors.phone}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Data de Nascimento</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={formData.birthDate}
                onChangeText={(value) => updateField('birthDate', maskDate(value))}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          </Card>

          {/* Clinical Info Section */}
          <Card style={styles.sectionCard} padding="sm">
            <View style={styles.sectionHeader}>
              <Ionicons name="medkit" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Informações Clínicas</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Condição/Queixa Principal</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={formData.condition}
                onChangeText={(value) => updateField('condition', value)}
                placeholder="Ex: Dor lombar, Lesão no joelho..."
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Diagnóstico</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={formData.diagnosis}
                onChangeText={(value) => updateField('diagnosis', value)}
                placeholder="Diagnóstico médico (se houver)"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Observações</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={formData.notes}
                onChangeText={(value) => updateField('notes', value)}
                placeholder="Observações adicionais sobre o paciente..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </Card>

          {/* Save Button */}
          <Button
            title={isEditing ? 'Salvar Alterações' : 'Cadastrar Paciente'}
            onPress={handleSave}
            loading={createMutation.isPending || updateMutation.isPending}
            style={styles.saveButton}
          />

          {/* Deactivate Button (only when editing) */}
          {isEditing && (
            <TouchableOpacity
              style={[styles.deactivateButton, { borderColor: colors.error }]}
              onPress={() => {
              medium();
              Alert.alert(
                'Desativar Paciente',
                'Tem certeza que deseja desativar este paciente? Esta ação pode ser revertida.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Desativar',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await updatePatient(patientId!, { status: 'inactive' });
                        queryClient.invalidateQueries({ queryKey: ['patients'] });
                        success();
                        router.back();
                      } catch {
                        error();
                        Alert.alert('Erro', 'Não foi possível desativar o paciente.');
                      }
                    }
                  }
                ]
              );
            }}
            >
              <Ionicons name="person-remove" size={20} color={colors.error} />
              <Text style={[styles.deactivateButtonText, { color: colors.error }]}>
                Desativar Paciente
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  deactivateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  deactivateButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
