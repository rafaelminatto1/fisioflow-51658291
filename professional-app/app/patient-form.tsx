import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import { Button, Card, Input } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { useQuery } from '@tanstack/react-query';
import { format, parse, isValid } from 'date-fns';
import { usePatients, getPatientByIdHook } from '@/hooks/usePatients';
import type { Patient } from '@/types';

interface FormData {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  condition: string;
  diagnosis: string;
  notes: string;
  status: 'active' | 'inactive';
}

interface FormErrors {
  name?: string;
  phone?: string;
  birthDate?: string;
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
  const { medium, success, error } = useHaptics();

  const patientId = params.id as string | undefined;
  const isEditing = !!patientId;

  const { createAsync, updateAsync, isCreating, isUpdating } = usePatients();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    condition: '',
    diagnosis: '',
    notes: '',
    status: 'active',
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Fetch patient data for editing
  const { data: patient, isLoading: isLoadingPatient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => (patientId ? getPatientByIdHook(patientId) : null),
    enabled: !!patientId,
  });

  useEffect(() => {
    if (patient) {
      setFormData({
        name: patient.name || '',
        email: patient.email || '',
        phone: patient.phone || '',
        birthDate: patient.birthDate ? format(new Date(patient.birthDate), 'dd/MM/yyyy') : '',
        condition: patient.condition || '',
        diagnosis: patient.diagnosis || '',
        notes: patient.notes || '',
        status: patient.status,
      });
    }
  }, [patient]);

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

    if (formData.birthDate && formData.birthDate.length > 0) {
        const parsedDate = parse(formData.birthDate, 'dd/MM/yyyy', new Date());
        if (!isValid(parsedDate) || formData.birthDate.length !== 10) {
            newErrors.birthDate = 'Data deve estar no formato DD/MM/AAAA';
        }
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    medium();

    if (!validateForm()) {
      error();
      return;
    }

    try {
      const submitData: Partial<Patient> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        condition: formData.condition,
        notes: formData.notes,
        status: formData.status,
        birthDate: formData.birthDate ? parse(formData.birthDate, 'dd/MM/yyyy', new Date()) : null,
      };

      if (isEditing && patientId) {
        await updateAsync({ id: patientId, data: submitData });
        success();
        Alert.alert('Sucesso', 'Paciente atualizado com sucesso!');
      } else {
        await createAsync(submitData as Omit<Patient, 'id'>);
        success();
        Alert.alert('Sucesso', 'Paciente cadastrado com sucesso!');
      }
      router.back();
    } catch (err: any) {
      error();
      const errorMessage = err?.message || 'Não foi possível salvar os dados do paciente.';
      Alert.alert('Erro', errorMessage);
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

            <Input
              label="Nome Completo *"
              value={formData.name}
              onChangeText={(value) => updateField('name', value)}
              placeholder="Nome do paciente"
              error={formErrors.name}
              autoCapitalize="words"
            />

            <Input
              label="Email"
              value={formData.email}
              onChangeText={(value) => updateField('email', value)}
              placeholder="email@exemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Telefone *"
              value={formData.phone}
              onChangeText={(value) => updateField('phone', maskPhone(value))}
              placeholder="(00) 00000-0000"
              keyboardType="phone-pad"
              maxLength={15}
              error={formErrors.phone}
            />

            <Input
              label="Data de Nascimento"
              value={formData.birthDate}
              onChangeText={(value) => updateField('birthDate', maskDate(value))}
              placeholder="DD/MM/AAAA"
              keyboardType="numeric"
              maxLength={10}
              error={formErrors.birthDate}
            />
            <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
              Formato DD/MM/AAAA. Deixe em branco para remover a data.
            </Text>
          </Card>

          {/* Clinical Info Section */}
          <Card style={styles.sectionCard} padding="sm">
            <View style={styles.sectionHeader}>
              <Ionicons name="medkit" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Informações Clínicas</Text>
            </View>

            <Input
              label="Condição/Queixa Principal"
              value={formData.condition}
              onChangeText={(value) => updateField('condition', value)}
              placeholder="Ex: Dor lombar, Lesão no joelho..."
            />

            <Input
              label="Diagnóstico"
              value={formData.diagnosis}
              onChangeText={(value) => updateField('diagnosis', value)}
              placeholder="Diagnóstico médico (se houver)"
            />

            <Input
              label="Observações"
              value={formData.notes}
              onChangeText={(value) => updateField('notes', value)}
              placeholder="Observações adicionais sobre o paciente..."
              multiline
              numberOfLines={4}
            />
          </Card>

          {/* Save Button */}
          <Button
            title={isEditing ? 'Salvar Alterações' : 'Cadastrar Paciente'}
            onPress={handleSave}
            loading={isCreating || isUpdating}
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
                          await updateAsync({ id: patientId, data: { status: 'inactive' } });
                          success();
                          router.back();
                        } catch (err: any) {
                          error();
                          Alert.alert('Erro', err.message || 'Não foi possível desativar o paciente.');
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
  fieldHint: {
    fontSize: 12,
    marginTop: 6,
  },
});
