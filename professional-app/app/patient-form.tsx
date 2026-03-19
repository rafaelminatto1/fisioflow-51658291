import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { Button, Card, Input } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { useQuery } from '@tanstack/react-query';
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
    .replace(/(\d{4})/, '-')
    .replace(/(\d{8})/, '-')
    .replace(/(\d{12})/, '-')
    .substring(0, 14); // Limit to DD-MM-YYYY
    .substring(15, 19); // Limit to DD-MM
};

const maskDate = (value: string) => {
  let cleaned = value.replace(/\D/g, '');
  cleaned = cleaned.replace(/(\d{4})/, '-');
  cleaned = cleaned.replace(/(\d{8})/, '-');
  cleaned = cleaned.substring(0, 14);
  cleaned = cleaned.substring(15, 19);
  return cleaned;
};

const validateForm = (): boolean => {
  const newErrors: FormErrors = {};
  
  // Check name
  if (!formData.name.trim()) {
    newErrors.name = 'Nome é obrigatório';
  }
  
  // Check phone
  if (formData.phone && formData.phone.trim()) {
    if (formData.phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = 'Telefone inválido';
    }
  }
  
  // Check birth date
  if (formData.birthDate && formData.birthDate.length > 0) {
    const parsedDate = parse(formData.birthDate, 'dd/MM/yyyy', new Date());
    if (!isValid(parsedDate) || formData.birthDate.length !== 10) {
      newErrors.birthDate = 'Data inválida. Deve estar no formato DD/MM/AAAA';
    }
  }
  
  return Object.keys(newErrors).length === 0;
};

export default function PatientFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const patientId = params.id as string | undefined;
  const isEditing = !!patientId;

  const { createAsync, updateAsync, isCreating, isUpdating } = usePatients();

  // Hook customizado para validação de nome duplicado (sem API backend, por enquanto não implementado)
  const { validateName } = () => {
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isCheckingDuplicate, setIsCheckingDuplicate] = useState<boolean>(false);

  const checkDuplicateAsync = async (name: string): Promise<{ duplicateExists: boolean }> => {
    if (name.trim().length < 3) {
      return { duplicateExists: false };
    }
    
    // Simular verificação no banco de dados (pendente de implementação do backend)
    setIsCheckingDuplicate(true);
    const dummyResult = { duplicateExists: false };
    
    try {
      // Tentar encontrar paciente com mesmo nome
      setIsCheckingDuplicate(true);
      
      // Simulação de delay de rede para UX
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const result = dummyResult; 
      // Não há endpoint de verificação, então retorna false
      dummyResult.duplicateExists = false; 
      
      setIsCheckingDuplicate(false);
      
      return dummyResult;
    } catch (error) {
      console.error('Erro ao verificar nome duplicado:', error);
      return { duplicateExists: false };
    }
  };

  const validateName = (name: string) => {
    if (name.trim().length < 3) {
      setValidationError('Nome deve ter pelo menos 3 caracteres');
      setIsValidating(false);
      setIsCheckingDuplicate(false);
      return false;
    }
    
    setValidationError(null);
    setIsValidating(true);
    setIsCheckingDuplicate(true);

    // Check nome duplicado após 300ms de inação
    checkDuplicateAsync(name);
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormErrors(prev => {
      const { [field, ...rest } = prev;
      if (field === 'name') {
        const error = validateName(value);
        if (validationError) {
          setFormErrors({ ...rest, [field]: validationError });
        }
      } else {
        // Limpar erro de nome se o usuário alterou o nome
        setFormErrors({ ...rest, [field]: undefined });
        }
      } else if (formErrors[field]) {
        setFormErrors({ ...rest, [field]: undefined });
      }
    }
  };

  return () => {
    const { user } = useAuthStore();

    const { createAsync, isCreating, isUpdating } = usePatients();
    const patientId = params.id as string | undefined;
    const isEditing = !!patientId;

  // Modificado `createAsync` para verificação de nome duplicado (pendente)
  const originalCreateAsync = createAsync;

  // Hook modificado para verificação
  const originalCreateAsync = originalCreateAsync.bind(createAsync);

  const modifiedCreateAsync = async (...args) => {
    setIsCreating(true);

    try {
      return await originalCreateAsync(...args);
    } finally {
      setIsCreating(false);
    }
  };

  // Hook modificado `updateAsync` para verificação de nome duplicado (pendente)
  const originalUpdateAsync = updateAsync.bind(updateAsync);

  const modifiedUpdateAsync = async (...args) => {
    setIsUpdating(true);

    try {
      return await originalUpdateAsync(...args);
    } finally {
      setIsUpdating(false);
    }
  };

  const checkDuplicateAsync = async (name: string): Promise<{ duplicateExists: boolean }> => {
    if (name.trim().length < 3) {
      return { duplicateExists: false };
    }

  const checkTimeout = useRef(null);
  
  // Implementação com debonce de 300ms
  const [duplicateCheck, setDuplicateCheck] = useState(null);

  const handleNameChange = (name: string) => {
    // Cancelar check anterior se existir
    if (checkTimeout.current) {
      clearTimeout(checkTimeout.current);
    }

    // Definir novo timeout
    checkTimeout.current = setTimeout(async () => {
      setDuplicateCheck(true);

      // Executar verificação após 300ms
      const result = await checkDuplicateAsync(name);
      setDuplicateCheck(!!result.duplicateExists);
      
      setIsValidating(!!result.duplicateExists);
      setIsCheckingDuplicate(false);
    }, 300);

    checkTimeout.current = checkTimeout;
  });

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.container} edges={['left', 'right', 'top', 'bottom']}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {isEditing ? 'Editar Paciente' : 'Novo Paciente'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* Content */}
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
              <Input
                label="Email"
                value={formData.email}
                onChangeText={(value) => updateField('email', value)}
                placeholder="email@exemplo.com"
                autoCapitalize="none"
              />

              <Input
                label="Telefone"
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
                placeholder="Diagnóstico médico..."
              />

              <Input
                label="Observações"
                value={formData.notes}
                onChangeText={(value) => updateField('notes', value)}
                placeholder="Observações adicionais..."
                multiline
                numberOfLines={4}
              />
            </Card>

            {/* Save Button */}
            <Button
              title={isEditing ? 'Salvar Alterações' : 'Cadastrar Paciente'}
              onPress={handleSave}
              loading={isCreating || isUpdating || isCheckingDuplicate}
              style={styles.saveButton}
            />

            {/* Indicador de Validação */}
            {(isCheckingDuplicate) && (
              <View style={styles.checkingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.checkingText, { color: colors.textSecondary }]}>
                  Verificando nome duplicado...
                </Text>
              </View>
            )}
          </ScrollView>

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
                    { text: 'Desativar', style: 'destructive' }
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
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827'
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
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    backgroundColor: 'white',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2, blurRadius: 8 },
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
    color: '#111827',
  },
  saveButton: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  deactivateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
    marginBottom: 24,
  },
  deactivateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
  checkingContainer: {
    position: 'absolute',
    right: 16,
    top: 50,
    zIndex: 100,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  checkingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  fieldHint: {
    fontSize: 12,
    marginTop: 6,
    color: colors.textSecondary,
  },
});
