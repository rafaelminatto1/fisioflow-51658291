import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { Button, Card } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { authApi } from '@/lib/auth-api';
import { config } from '@/lib/config';

export default function ChangePasswordScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuthStore();
  const { light, medium, success, error } = useHaptics();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!currentPassword) {
      newErrors.currentPassword = 'Digite sua senha atual';
    }

    if (!newPassword) {
      newErrors.newPassword = 'Digite a nova senha';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'A senha deve ter pelo menos 8 caracteres';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      newErrors.newPassword = 'A senha deve conter letras maiúsculas, minúsculas e números';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirme a nova senha';
    } else if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = 'As senhas não conferem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    medium();

    if (!validateForm()) {
      error();
      return;
    }

    setIsLoading(true);
    try {
      // Call Neon Auth API to change password
      const token = await authApi.getToken();
      const response = await fetch(`${config.apiUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Erro ao alterar senha');
      }

      success();
      Alert.alert(
        'Sucesso',
        'Sua senha foi alterada com sucesso!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      error();
      Alert.alert('Erro', err.message || 'Não foi possível alterar a senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (): { label: string; color: string } => {
    if (!newPassword) return { label: '', color: colors.textMuted };
    
    let strength = 0;
    if (newPassword.length >= 8) strength++;
    if (newPassword.length >= 12) strength++;
    if (/[a-z]/.test(newPassword)) strength++;
    if (/[A-Z]/.test(newPassword)) strength++;
    if (/\d/.test(newPassword)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) strength++;

    if (strength <= 2) return { label: 'Fraca', color: colors.error };
    if (strength <= 4) return { label: 'Média', color: colors.warning };
    return { label: 'Forte', color: colors.success };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Alterar Senha</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Info Card */}
        <Card style={styles.infoCard} padding="md">
          <View style={styles.infoContent}>
            <Ionicons name="lock-closed" size={24} color={colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>Segurança da Conta</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Crie uma senha forte com pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas e números.
              </Text>
            </View>
          </View>
        </Card>

        {/* Form */}
        <Card style={styles.formCard} padding="md">
          {/* Current Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Senha Atual</Text>
            <View style={[styles.inputContainer, { borderColor: errors.currentPassword ? colors.error : colors.border }]}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                value={currentPassword}
                onChangeText={(value) => {
                  setCurrentPassword(value);
                  if (errors.currentPassword) setErrors(prev => ({ ...prev, currentPassword: undefined }));
                }}
                placeholder="Digite sua senha atual"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                <Ionicons 
                  name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={22} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
            {errors.currentPassword && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.currentPassword}</Text>
            )}
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Nova Senha</Text>
            <View style={[styles.inputContainer, { borderColor: errors.newPassword ? colors.error : colors.border }]}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                value={newPassword}
                onChangeText={(value) => {
                  setNewPassword(value);
                  if (errors.newPassword) setErrors(prev => ({ ...prev, newPassword: undefined }));
                }}
                placeholder="Digite a nova senha"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                <Ionicons 
                  name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={22} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
            {errors.newPassword && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.newPassword}</Text>
            )}
            {/* Password Strength */}
            {newPassword.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBars}>
                  {[1, 2, 3].map((level) => (
                    <View
                      key={level}
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor: passwordStrength.color,
                          opacity: (passwordStrength.label === 'Fraca' && level <= 1) ||
                                   (passwordStrength.label === 'Média' && level <= 2) ||
                                   passwordStrength.label === 'Forte'
                            ? 1 : 0.2
                        }
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                  {passwordStrength.label}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Confirmar Senha</Text>
            <View style={[styles.inputContainer, { borderColor: errors.confirmPassword ? colors.error : colors.border }]}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                }}
                placeholder="Confirme a nova senha"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons 
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={22} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.confirmPassword}</Text>
            )}
          </View>

          {/* Requirements */}
          <View style={styles.requirementsContainer}>
            <Text style={[styles.requirementsTitle, { color: colors.textSecondary }]}>Requisitos:</Text>
            {[
              { text: 'Mínimo 8 caracteres', valid: newPassword.length >= 8 },
              { text: 'Letras maiúsculas e minúsculas', valid: /(?=.*[a-z])(?=.*[A-Z])/.test(newPassword) },
              { text: 'Pelo menos um número', valid: /\d/.test(newPassword) },
            ].map((req, idx) => (
              <View key={idx} style={styles.requirementItem}>
                <Ionicons
                  name={req.valid ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={req.valid ? colors.success : colors.textMuted}
                />
                <Text style={[
                  styles.requirementText,
                  { color: req.valid ? colors.success : colors.textSecondary }
                ]}>
                  {req.text}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Submit Button */}
        <Button
          title="Alterar Senha"
          onPress={handleChangePassword}
          loading={isLoading}
          disabled={!currentPassword || !newPassword || !confirmPassword}
          style={styles.submitButton}
        />
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  infoCard: {
    marginBottom: 16,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  requirementsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  requirementText: {
    fontSize: 13,
  },
  submitButton: {
    marginTop: 8,
  },
});