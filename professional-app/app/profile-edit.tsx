import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { Button, Card } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProfessionalProfile, getProfessionalProfile } from '@/lib/firestore';
import { uploadAvatar } from '@/lib/storage';
import * as ImagePicker from 'expo-image-picker';

interface FormData {
  name: string;
  email: string;
  specialty: string;
  crefito: string;
  phone: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  crefito?: string;
}

export default function ProfileEditScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, updateUserData } = useAuthStore();
  const { light, medium, success, error } = useHaptics();
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: user?.name || '',
    email: user?.email || '',
    specialty: user?.specialty || '',
    crefito: user?.crefito || '',
    phone: user?.phone || '',
    clinicName: user?.clinicName || '',
    clinicAddress: user?.clinicAddress || '',
    clinicPhone: user?.clinicPhone || '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [activeSection, setActiveSection] = useState<'personal' | 'clinic' | 'schedule'>('personal');

  // Buscar perfil completo do profissional
  const { data: profile } = useQuery({
    queryKey: ['professionalProfile', user?.id],
    queryFn: () => user?.id ? getProfessionalProfile(user.id) : null,
    enabled: !!user?.id,
  });

  // Atualizar form quando profile for carregado
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        specialty: profile.specialty || '',
        crefito: profile.licenseNumber || '',
        phone: profile.phone || '',
        clinicName: (profile as any).clinicName || '',
        clinicAddress: (profile as any).clinicAddress || '',
        clinicPhone: (profile as any).clinicPhone || '',
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<FormData>) =>
      updateProfessionalProfile(user!.id, data),
    onSuccess: (updatedData) => {
      // Atualizar store local
      if (updatedData) {
        updateUserData(updatedData as Parameters<typeof updateUserData>[0]);
      }
      queryClient.invalidateQueries({ queryKey: ['professionalProfile'] });
      queryClient.invalidateQueries({ queryKey: ['professionalStats'] });
      success();
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    },
    onError: (err) => {
      error();
      Alert.alert('Erro', 'Não foi possível atualizar o perfil. Tente novamente.');
    },
  });

  useEffect(() => {
    if (user?.avatarUrl) {
      setAvatarUri(user.avatarUrl);
    }
  }, [user?.avatarUrl]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.crefito.trim()) {
      newErrors.crefito = 'CREFITO é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    medium();

    if (!validateForm()) {
      error();
      return;
    }

    setIsSaving(true);
    try {
      await updateMutation.mutateAsync(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    light();
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para alterar sua foto.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedUri = result.assets[0].uri;
        setAvatarUri(selectedUri);
        medium();
        
        try {
          setIsSaving(true);
          const downloadUrl = await uploadAvatar(user!.id, selectedUri);
          await updateMutation.mutateAsync({ avatarUrl: downloadUrl } as any);
          success();
          Alert.alert('Sucesso', 'Foto atualizada!');
        } catch (uploadErr) {
          error();
          Alert.alert('Erro', 'Não foi possível salvar a imagem no servidor.');
        } finally {
          setIsSaving(false);
        }
      }
    } catch (err) {
      error();
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo quando usuário começa a digitar
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const sections = [
    { id: 'personal', label: 'Dados Pessoais', icon: 'person-outline' },
    { id: 'clinic', label: 'Dados da Clínica', icon: 'business-outline' },
    { id: 'schedule', label: 'Horários', icon: 'time-outline' },
  ] as const;

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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Editar Perfil</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, { opacity: isSaving ? 0.5 : 1 }]}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.saveButtonText, { color: colors.primary }]}>Salvar</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Avatar Section */}
          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.8}>
              <View style={[styles.avatarWrapper, { borderColor: colors.border }]}>
                {avatarUri ? (
                  <View style={styles.avatarWithImage}>
                    <Image
                      source={{ uri: avatarUri }}
                      style={styles.avatarImage}
                    />
                    <View style={[styles.avatarEditOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                      <Ionicons name="camera" size={24} color="#FFFFFF" />
                    </View>
                  </View>
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                    <Text style={styles.avatarText}>
                      {formData.name.charAt(0).toUpperCase() || 'P'}
                    </Text>
                    <View style={[styles.avatarEditOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                      <Ionicons name="camera" size={24} color="#FFFFFF" />
                    </View>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <Text style={[styles.avatarHint, { color: colors.textSecondary }]}>
              Toque para alterar foto
            </Text>
          </View>

          {/* Section Tabs */}
          <View style={[styles.tabsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {sections.map((section) => (
              <TouchableOpacity
                key={section.id}
                style={[
                  styles.tab,
                  activeSection === section.id && { backgroundColor: colors.primary + '20' }
                ]}
                onPress={() => {
                  medium();
                  setActiveSection(section.id);
                }}
              >
                <Ionicons
                  name={section.icon}
                  size={20}
                  color={activeSection === section.id ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabText,
                    { color: activeSection === section.id ? colors.primary : colors.textSecondary }
                  ]}
                >
                  {section.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Personal Data Section */}
          {activeSection === 'personal' && (
            <Card style={styles.sectionCard} padding="sm">
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Dados Pessoais</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Nome Completo</Text>
                <TextInput
                  style={[styles.input, { borderColor: errors.name ? colors.error : colors.border, backgroundColor: colors.surface }]}
                  value={formData.name}
                  onChangeText={(value) => updateField('name', value)}
                  placeholder="Seu nome completo"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                />
                {errors.name && <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Email</Text>
                <TextInput
                  style={[styles.input, { borderColor: errors.email ? colors.error : colors.border, backgroundColor: colors.surface }]}
                  value={formData.email}
                  onChangeText={(value) => updateField('email', value)}
                  placeholder="seu@email.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.email && <Text style={[styles.errorText, { color: colors.error }]}>{errors.email}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Especialidade</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={formData.specialty}
                  onChangeText={(value) => updateField('specialty', value)}
                  placeholder="Ex: Fisioterapia Ortopédica"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>CREFITO</Text>
                <TextInput
                  style={[styles.input, { borderColor: errors.crefito ? colors.error : colors.border, backgroundColor: colors.surface }]}
                  value={formData.crefito}
                  onChangeText={(value) => updateField('crefito', value)}
                  placeholder="00000-UF"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                />
                {errors.crefito && <Text style={[styles.errorText, { color: colors.error }]}>{errors.crefito}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Telefone</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={formData.phone}
                  onChangeText={(value) => updateField('phone', value)}
                  placeholder="(00) 00000-0000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
            </Card>
          )}

          {/* Clinic Data Section */}
          {activeSection === 'clinic' && (
            <Card style={styles.sectionCard} padding="sm">
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Dados da Clínica</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Nome da Clínica</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={formData.clinicName}
                  onChangeText={(value) => updateField('clinicName', value)}
                  placeholder="Nome do seu consultório/clínica"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Endereço</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={formData.clinicAddress}
                  onChangeText={(value) => updateField('clinicAddress', value)}
                  placeholder="Rua, número, bairro, cidade"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Telefone da Clínica</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={formData.clinicPhone}
                  onChangeText={(value) => updateField('clinicPhone', value)}
                  placeholder="(00) 0000-0000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
            </Card>
          )}

          {/* Schedule Section */}
          {activeSection === 'schedule' && (
            <Card style={styles.sectionCard} padding="sm">
              <View style={styles.schedulePlaceholder}>
                <Ionicons name="time-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.placeholderTitle, { color: colors.text }]}>
                  Configuração de Horários
                </Text>
                <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                  Configure seus horários de atendimento e dias disponíveis para consulta.
                </Text>
                <Button
                  title="Configurar Horários"
                  onPress={() => {
                    medium();
                    Alert.alert('Em breve', 'Funcionalidade em desenvolvimento');
                  }}
                  variant="outline"
                  style={{ marginTop: 16 }}
                />
              </View>
            </Card>
          )}

          {/* Danger Zone */}
          <Card style={styles.dangerCard} padding="sm">
            <Text style={[styles.dangerTitle, { color: colors.error }]}>Zona de Perigo</Text>
            <Text style={[styles.dangerText, { color: colors.textSecondary }]}>
              Ações abaixo não podem ser desfeitas.
            </Text>
            <TouchableOpacity
              style={[styles.dangerButton, { backgroundColor: colors.error + '10' }]}
              onPress={() => {
                router.push('/(auth)/change-password' as any);
              }}
            >
              <Ionicons name="lock-closed-outline" size={20} color={colors.error} />
              <Text style={[styles.dangerButtonText, { color: colors.error }]}>
                Alterar Senha
              </Text>
            </TouchableOpacity>
          </Card>
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
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    overflow: 'hidden',
  },
  avatarWithImage: {
    width: '100%',
    height: '100%',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  avatarEditOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    fontSize: 13,
    marginTop: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
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
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  schedulePlaceholder: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  placeholderText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 32,
  },
  dangerCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    // @ts-expect-error - dynamic borderColor
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  dangerText: {
    fontSize: 13,
    marginBottom: 12,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
