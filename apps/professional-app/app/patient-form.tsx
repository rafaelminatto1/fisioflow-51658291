import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Input } from '@/components';
import { useColors } from '@/hooks/useColorScheme';
import { useHaptics } from '@/hooks/useHaptics';
import { usePatients } from '@/hooks/usePatients';
import { getPatientById } from '@/lib/api';
import type { Patient } from '@/types';

interface FormData {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  condition: string;
  diagnosis: string;
  notes: string;
  status: Patient['status'];
}

interface FormErrors {
  name?: string;
  phone?: string;
  birthDate?: string;
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatDateForInput(value?: string | Date) {
  if (!value) return '';

  const date =
    value instanceof Date
      ? value
      : /^\d{4}-\d{2}-\d{2}/.test(value)
        ? new Date(`${value}T00:00:00`)
        : new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function maskDate(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function normalizeDateForApi(value: string) {
  if (!value.trim()) return undefined;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  return `${year}-${month}-${day}`;
}

export default function PatientFormScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { medium, success, error } = useHaptics();
  const { createAsync, updateAsync, isCreating, isUpdating } = usePatients();

  const patientId = typeof params.id === 'string' ? params.id : undefined;
  const isEditing = Boolean(patientId);

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

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient-form', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      return getPatientById(patientId);
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (!patient) return;

    setFormData({
      name: patient.name ?? patient.full_name ?? '',
      email: patient.email ?? '',
      phone: patient.phone ?? '',
      birthDate: formatDateForInput(patient.birth_date),
      condition: patient.main_condition ?? '',
      diagnosis: '',
      notes: patient.observations ?? '',
      status: patient.is_active === false ? 'inactive' : 'active',
    });
  }, [patient]);

  const submitLabel = useMemo(
    () => (isEditing ? 'Salvar Alterações' : 'Cadastrar Paciente'),
    [isEditing],
  );

  function updateField(field: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = 'Nome é obrigatório';
    }

    if (formData.phone.trim() && formData.phone.replace(/\D/g, '').length < 10) {
      nextErrors.phone = 'Telefone inválido';
    }

    if (formData.birthDate.trim()) {
      const normalized = normalizeDateForApi(formData.birthDate);
      if (normalized === null) {
        nextErrors.birthDate = 'Data inválida. Use DD/MM/AAAA';
      }
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSave() {
    medium();

    if (!validateForm()) {
      error();
      Alert.alert('Erro', 'Corrija os campos destacados antes de salvar.');
      return;
    }

    const normalizedBirthDate = normalizeDateForApi(formData.birthDate);
    const payload: Partial<Patient> = {
      name: formData.name.trim(),
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      birthDate: normalizedBirthDate || undefined,
      condition: formData.condition.trim() || undefined,
      diagnosis: formData.diagnosis.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      status: formData.status,
    };

    try {
      if (isEditing && patientId) {
        await updateAsync({ id: patientId, data: payload });
      } else {
        await createAsync(payload as Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'clinicId'>);
      }

      success();
      Alert.alert('Sucesso', `Paciente ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso.`, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      error();
      Alert.alert('Erro', err?.message || 'Não foi possível salvar o paciente.');
    }
  }

  function handleDeactivate() {
    if (!patientId) return;

    medium();
    Alert.alert(
      'Desativar Paciente',
      'Tem certeza que deseja desativar este paciente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desativar',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateAsync({ id: patientId, data: { status: 'inactive' } });
              success();
              Alert.alert('Sucesso', 'Paciente desativado com sucesso.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (err: any) {
              error();
              Alert.alert('Erro', err?.message || 'Não foi possível desativar o paciente.');
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditing ? 'Editar Paciente' : 'Novo Paciente'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Card style={styles.sectionCard} padding="sm">
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Dados Pessoais</Text>
            </View>

            <Input
              label="Nome Completo *"
              value={formData.name}
              onChangeText={(value) => updateField('name', value)}
              placeholder="Nome do paciente"
              autoCapitalize="words"
              error={formErrors.name}
            />
            <Input
              label="Email"
              value={formData.email}
              onChangeText={(value) => updateField('email', value)}
              placeholder="email@exemplo.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Input
              label="Telefone"
              value={formData.phone}
              onChangeText={(value) => updateField('phone', maskPhone(value))}
              placeholder="(11) 99999-9999"
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
              Deixe em branco se não quiser informar a data.
            </Text>
          </Card>

          <Card style={styles.sectionCard} padding="sm">
            <View style={styles.sectionHeader}>
              <Ionicons name="medkit-outline" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Informações Clínicas</Text>
            </View>

            <Input
              label="Condição / Queixa Principal"
              value={formData.condition}
              onChangeText={(value) => updateField('condition', value)}
              placeholder="Ex: dor lombar, pós-operatório, tendinopatia..."
            />
            <Input
              label="Diagnóstico"
              value={formData.diagnosis}
              onChangeText={(value) => updateField('diagnosis', value)}
              placeholder="Diagnóstico funcional ou médico"
            />
            <Input
              label="Observações"
              value={formData.notes}
              onChangeText={(value) => updateField('notes', value)}
              placeholder="Observações adicionais"
              multiline
              numberOfLines={4}
            />
          </Card>

          <Button
            title={submitLabel}
            onPress={handleSave}
            loading={isCreating || isUpdating || isLoading}
            style={styles.saveButton}
          />

          {isEditing && (
            <TouchableOpacity
              style={[styles.deactivateButton, { borderColor: colors.error }]}
              onPress={handleDeactivate}
            >
              <Ionicons name="person-remove-outline" size={20} color={colors.error} />
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
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  fieldHint: {
    fontSize: 12,
    marginTop: -8,
  },
  saveButton: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  deactivateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 16,
  },
  deactivateButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
