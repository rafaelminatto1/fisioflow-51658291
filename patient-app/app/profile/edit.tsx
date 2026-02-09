/**
 * Profile Edit Screen
 *
 * Tela de edição de perfil do paciente com formulário completo,
 * validação e upload de foto de avatar.
 */

import { useState, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { Card, Button, Input } from '@/components';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { validators } from '@/lib/validation';

interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate: string;
  address: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birthDate?: string;
}

const states = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function ProfileEditScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuthStore();

  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    birthDate: '',
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
    },
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadUserData();
    }
  }, [user?.id]);

  const loadUserData = async () => {
    if (!user?.id) return;

    try {
      // Buscar dados adicionais do Firestore
      const userDoc = await doc(db, 'users', user.id);
      // TODO: Implementar busca real dos dados
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: '',
        cpf: '',
        birthDate: '',
        address: {
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: '',
          zipCode: '',
        },
      });
      setAvatarUrl(user.avatarUrl || null);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const updateFormField = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (field in errors) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const updateAddressField = (field: keyof ProfileFormData['address'], value: string) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    }

    // Validate email
    const emailError = validators.email(formData.email);
    if (emailError) {
      newErrors.email = emailError;
    }

    // Validate phone (optional but if provided, must be valid)
    if (formData.phone && !validators.phone(formData.phone)) {
      newErrors.phone = 'Telefone inválido';
    }

    // Validate CPF (optional but if provided, must be valid)
    if (formData.cpf && !validators.cpf(formData.cpf)) {
      newErrors.cpf = 'CPF inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!user?.id) return;

    if (!validateForm()) {
      Alert.alert('Erro', 'Por favor, corrija os erros no formulário');
      return;
    }

    setSaving(true);

    try {
      await updateDoc(doc(db, 'users', user.id), {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone || null,
        cpf: formData.cpf || null,
        birthDate: formData.birthDate || null,
        address: formData.address,
        updatedAt: serverTimestamp(),
      });

      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Erro', 'Não foi possível salvar o perfil. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permissão Necessária',
          'Precisamos de acesso à galeria para alterar sua foto de perfil.'
        );
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingAvatar(true);
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking avatar:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!user?.id) return;

    try {
      // Convert to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to Firebase Storage
      const storageRef = ref(storage, `avatars/${user.id}`);
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Update user document
      await updateDoc(doc(db, 'users', user.id), {
        avatarUrl: downloadURL,
        updatedAt: serverTimestamp(),
      });

      setAvatarUrl(downloadURL);
      Alert.alert('Sucesso', 'Foto de perfil atualizada!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a foto de perfil.');
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.id) return;

    Alert.alert(
      'Remover Foto',
      'Deseja remover sua foto de perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'users', user.id), {
                avatarUrl: null,
                updatedAt: serverTimestamp(),
              });
              setAvatarUrl(null);
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível remover a foto.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Editar Perfil</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.7}>
              <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '20' }]}>
                {uploadingAvatar ? (
                  <ActivityIndicator size="large" color={colors.primary} />
                ) : avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                    <Text style={styles.avatarText}>
                      {formData.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={[styles.editAvatarBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>
            {avatarUrl && (
              <TouchableOpacity onPress={handleRemoveAvatar} style={styles.removeAvatarButton}>
                <Text style={[styles.removeAvatarText, { color: colors.error }]}>
                  Remover foto
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Personal Information */}
          <Card style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Informações Pessoais</Text>

            <Input
              label="Nome Completo"
              placeholder="Seu nome completo"
              value={formData.name}
              onChangeText={(value) => updateFormField('name', value)}
              error={errors.name}
              leftIcon="person-outline"
              autoCapitalize="words"
            />

            <Input
              label="Email"
              placeholder="seu@email.com"
              value={formData.email}
              onChangeText={(value) => updateFormField('email', value)}
              error={errors.email}
              leftIcon="mail-outline"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Input
              label="Telefone"
              placeholder="(11) 98765-4321"
              value={formData.phone}
              onChangeText={(value) => updateFormField('phone', value)}
              error={errors.phone}
              leftIcon="call-outline"
              keyboardType="phone-pad"
              mask="phone"
            />

            <Input
              label="CPF"
              placeholder="000.000.000-00"
              value={formData.cpf}
              onChangeText={(value) => updateFormField('cpf', value)}
              error={errors.cpf}
              leftIcon="card-outline"
              keyboardType="number-pad"
              mask="cpf"
            />

            <Input
              label="Data de Nascimento"
              placeholder="DD/MM/AAAA"
              value={formData.birthDate}
              onChangeText={(value) => updateFormField('birthDate', value)}
              error={errors.birthDate}
              leftIcon="calendar-outline"
              mask="date"
            />
          </Card>

          {/* Address */}
          <Card style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Endereço</Text>

            <Input
              label="Rua"
              placeholder="Nome da rua"
              value={formData.address.street}
              onChangeText={(value) => updateAddressField('street', value)}
              leftIcon="location-outline"
            />

            <View style={styles.row}>
              <View style={styles.half}>
                <Input
                  label="Número"
                  placeholder="123"
                  value={formData.address.number}
                  onChangeText={(value) => updateAddressField('number', value)}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.half}>
                <Input
                  label="Complemento"
                  placeholder="Apto, Bloco"
                  value={formData.address.complement}
                  onChangeText={(value) => updateAddressField('complement', value)}
                />
              </View>
            </View>

            <Input
              label="Bairro"
              placeholder="Nome do bairro"
              value={formData.address.neighborhood}
              onChangeText={(value) => updateAddressField('neighborhood', value)}
              leftIcon="home-outline"
            />

            <View style={styles.row}>
              <View style={styles.twoThirds}>
                <Input
                  label="Cidade"
                  placeholder="Nome da cidade"
                  value={formData.address.city}
                  onChangeText={(value) => updateAddressField('city', value)}
                  leftIcon="business-outline"
                />
              </View>
              <View style={styles.oneThird}>
                <Input
                  label="UF"
                  placeholder="SP"
                  value={formData.address.state}
                  onChangeText={(value) => updateAddressField('state', value)}
                  maxLength={2}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <Input
              label="CEP"
              placeholder="00000-000"
              value={formData.address.zipCode}
              onChangeText={(value) => updateAddressField('zipCode', value)}
              leftIcon="bookmark-outline"
              keyboardType="number-pad"
              mask="cep"
            />
          </Card>

          {/* Save Button */}
          <Button
            title="Salvar Alterações"
            onPress={handleSave}
            loading={saving}
            style={styles.saveButton}
          />

          <View style={styles.bottomSpacing} />
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
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 12,
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
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  removeAvatarButton: {
    marginTop: 8,
  },
  removeAvatarText: {
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  twoThirds: {
    flex: 2,
  },
  oneThird: {
    flex: 1,
  },
  saveButton: {
    marginTop: 8,
  },
  bottomSpacing: {
    height: 16,
  },
});
