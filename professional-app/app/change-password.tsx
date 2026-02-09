import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { Button } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { updatePassword } from 'firebase/auth';
import { getAuth } from '@/lib/firebase';

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export default function ChangePasswordScreen() {
  const colors = useColors();
  const router = useRouter();
  const { light, medium, success, error } = useHaptics();

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Senha atual é obrigatória';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'Nova senha é obrigatória';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'A senha deve ter pelo menos 6 caracteres';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    light();

    if (!validateForm()) {
      error();
      return;
    }

    medium();
    setIsSubmitting(true);

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      await updatePassword(currentUser, formData.newPassword);

      success();
      Alert.alert(
        'Senha alterada',
        'Sua senha foi alterada com sucesso.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );

      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setErrors({});
    } catch (err: any) {
      error();
      let message = 'Não foi possível alterar a senha.';

      if (err.code === 'auth/requires-recent-login') {
        message = 'Por segurança, você precisa fazer login novamente antes de alterar sua senha.';
      } else if (err.code === 'auth/weak-password') {
        message = 'A senha é muito fraca. Escolha uma senha mais forte.';
      }

      Alert.alert('Erro', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrength = (password: string): { label: string; color: string; percentage: number } => {
    if (!password) {
      return { label: '', color: colors.border, percentage: 0 };
    }

    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) {
      return { label: 'Fraca', color: colors.error, percentage: 33 };
    } else if (strength <= 3) {
      return { label: 'Média', color: colors.warning, percentage: 66 };
    } else {
      return { label: 'Forte', color: colors.success, percentage: 100 };
    }
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => {
            light();
            router.back();
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Alterar Senha</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={20} color={colors.info} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Por segurança, você será desconectado de todos os dispositivos após alterar sua senha.
          </Text>
        </View>

        {/* Current Password */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Senha Atual</Text>
          <View style={[styles.inputContainer, { borderColor: errors.currentPassword ? colors.error : colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Digite sua senha atual"
              placeholderTextColor={colors.textMuted}
              value={formData.currentPassword}
              onChangeText={(text) => {
                setFormData({ ...formData, currentPassword: text });
                if (errors.currentPassword) {
                  setErrors({ ...errors, currentPassword: undefined });
                }
              }}
              secureTextEntry={!showPasswords.current}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />
            <TouchableOpacity
              onPress={() => {
                light();
                setShowPasswords({ ...showPasswords, current: !showPasswords.current });
              }}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPasswords.current ? 'eye-outline' : 'eye-off-outline'}
                size={20}
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
              style={[styles.input, { color: colors.text }]}
              placeholder="Digite sua nova senha"
              placeholderTextColor={colors.textMuted}
              value={formData.newPassword}
              onChangeText={(text) => {
                setFormData({ ...formData, newPassword: text });
                if (errors.newPassword) {
                  setErrors({ ...errors, newPassword: undefined });
                }
              }}
              secureTextEntry={!showPasswords.new}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />
            <TouchableOpacity
              onPress={() => {
                light();
                setShowPasswords({ ...showPasswords, new: !showPasswords.new });
              }}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPasswords.new ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {errors.newPassword && (
            <Text style={[styles.errorText, { color: colors.error }]}>{errors.newPassword}</Text>
          )}

          {/* Password Strength Indicator */}
          {formData.newPassword && (
            <View style={styles.strengthContainer}>
              <View style={[styles.strengthBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.strengthFill,
                    { backgroundColor: passwordStrength.color, width: `${passwordStrength.percentage}%` },
                  ]}
                />
              </View>
              <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                Força: {passwordStrength.label}
              </Text>
            </View>
          )}

          {/* Password Requirements */}
          <View style={styles.requirements}>
            <Text style={[styles.requirementTitle, { color: colors.textSecondary }]}>
              Requisitos mínimos:
            </Text>
            <View style={styles.requirement}>
              <Ionicons
                name={formData.newPassword.length >= 6 ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={formData.newPassword.length >= 6 ? colors.success : colors.textMuted}
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                Pelo menos 6 caracteres
              </Text>
            </View>
            <View style={styles.requirement}>
              <Ionicons
                name={/[A-Z]/.test(formData.newPassword) ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={/[A-Z]/.test(formData.newPassword) ? colors.success : colors.textMuted}
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                Letra maiúscula (recomendado)
              </Text>
            </View>
            <View style={styles.requirement}>
              <Ionicons
                name={/[0-9]/.test(formData.newPassword) ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={/[0-9]/.test(formData.newPassword) ? colors.success : colors.textMuted}
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                Número (recomendado)
              </Text>
            </View>
          </View>
        </View>

        {/* Confirm Password */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Confirmar Nova Senha</Text>
          <View style={[styles.inputContainer, { borderColor: errors.confirmPassword ? colors.error : colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Digite novamente a nova senha"
              placeholderTextColor={colors.textMuted}
              value={formData.confirmPassword}
              onChangeText={(text) => {
                setFormData({ ...formData, confirmPassword: text });
                if (errors.confirmPassword) {
                  setErrors({ ...errors, confirmPassword: undefined });
                }
              }}
              secureTextEntry={!showPasswords.confirm}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />
            <TouchableOpacity
              onPress={() => {
                light();
                setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm });
              }}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPasswords.confirm ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && (
            <Text style={[styles.errorText, { color: colors.error }]}>{errors.confirmPassword}</Text>
          )}
        </View>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <Button
            onPress={handleSubmit}
            disabled={isSubmitting}
            loading={isSubmitting}
            style={styles.submitButton}
          >
            {isSubmitting ? 'Alterando...' : 'Alterar Senha'}
          </Button>
        </View>
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
    paddingVertical: 16,
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
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  eyeButton: {
    padding: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  strengthContainer: {
    marginTop: 12,
  },
  strengthBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
  },
  strengthLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  requirements: {
    marginTop: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 12,
    padding: 12,
  },
  requirementTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  requirementText: {
    fontSize: 13,
  },
  buttonContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
  submitButton: {
    minHeight: 52,
  },
});
