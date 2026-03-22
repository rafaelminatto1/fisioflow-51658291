import { useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, PasswordStrength } from '@/components';
import { useColors } from '@/hooks/useColorScheme';
import { signUp } from '@/services/authService';
import { validators } from '@/lib/validation';
import { log } from '@/lib/logger';

export default function RegisterScreen() {
  const colors = useColors();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    acceptTerms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate name
    const nameError = validators.name(formData.fullName);
    if (nameError) newErrors.fullName = nameError;

    // Validate email
    const emailError = validators.email(formData.email);
    if (emailError) newErrors.email = emailError;

    // Validate password
    const passwordError = validators.password(formData.password);
    if (passwordError) newErrors.password = passwordError;

    // Validate confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirme sua senha';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    // Validate terms
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'Você deve aceitar os termos de uso';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const result = await signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim() || undefined,
      });

      if (!result.success) {
        throw result.error || new Error('Erro ao criar conta');
      }

      Alert.alert(
        'Conta criada!',
        'Sua conta foi criada com sucesso. Agora você pode vincular seu perfil ao seu fisioterapeuta.',
        [
          {
            text: 'Continuar',
            onPress: () => router.replace('/(auth)/link-professional'),
          },
        ]
      );
    } catch (error: any) {
      log.error('Registration error:', error);

      const message = String(error?.message || '');
      let errorMessage = 'Erro ao criar conta. Tente novamente.';

      if (message.toLowerCase().includes('already')) {
        errorMessage = 'Este email já está cadastrado. Faça login.';
      } else if (message.toLowerCase().includes('email')) {
        errorMessage = 'Email inválido.';
      } else if (message.toLowerCase().includes('password')) {
        errorMessage = 'A senha é muito fraca. Use pelo menos 8 caracteres.';
      } else if (message.toLowerCase().includes('network')) {
        errorMessage = 'Erro de conexão. Verifique sua internet.';
      }

      Alert.alert('Erro', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo/Header */}
          <View style={styles.header}>
            <View style={[styles.logoPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoText}>FF</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Criar Conta</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Preencha seus dados para começar
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Nome Completo"
              placeholder="Seu nome completo"
              value={formData.fullName}
              onChangeText={(text) => {
                setFormData({ ...formData, fullName: text });
                setErrors({ ...errors, fullName: '' });
              }}
              error={errors.fullName}
              autoCapitalize="words"
              leftIcon="person-outline"
              testID="name-input"
              accessibilityLabel="name-input"
            />

            <Input
              label="Email"
              placeholder="seu@email.com"
              value={formData.email}
              onChangeText={(text) => {
                setFormData({ ...formData, email: text });
                setErrors({ ...errors, email: '' });
              }}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon="mail-outline"
              testID="email-input"
              accessibilityLabel="email-input"
            />

            <Input
              label="Telefone (opcional)"
              placeholder="(11) 99999-9999"
              value={formData.phone}
              onChangeText={(text) => {
                setFormData({ ...formData, phone: text });
                setErrors({ ...errors, phone: '' });
              }}
              error={errors.phone}
              keyboardType="phone-pad"
              leftIcon="call-outline"
              testID="phone-input"
              accessibilityLabel="phone-input"
            />

            <Input
              label="Senha"
              placeholder="Mínimo 8 caracteres"
              value={formData.password}
              onChangeText={(text) => {
                setFormData({ ...formData, password: text });
                setErrors({ ...errors, password: '' });
              }}
              error={errors.password}
              secureTextEntry={!showPassword}
              rightIcon={
                showPassword ? 'eye-outline' : 'eye-off-outline'
              }
              onRightIconPress={() => setShowPassword(!showPassword)}
              leftIcon="lock-closed-outline"
              testID="password-input"
              accessibilityLabel="password-input"
            />

            <PasswordStrength password={formData.password} />

            <Input
              label="Confirmar Senha"
              placeholder="Digite a senha novamente"
              value={formData.confirmPassword}
              onChangeText={(text) => {
                setFormData({ ...formData, confirmPassword: text });
                setErrors({ ...errors, confirmPassword: '' });
              }}
              error={errors.confirmPassword}
              secureTextEntry={!showConfirmPassword}
              rightIcon={
                showConfirmPassword ? 'eye-outline' : 'eye-off-outline'
              }
              onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
              leftIcon="lock-closed-outline"
              testID="confirm-password-input"
              accessibilityLabel="confirm-password-input"
            />

            {/* Terms */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() =>
                setFormData({ ...formData, acceptTerms: !formData.acceptTerms })
              }
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: errors.acceptTerms ? colors.error : colors.border,
                    backgroundColor: formData.acceptTerms ? colors.primary : 'transparent',
                  },
                ]}
              >
                {formData.acceptTerms && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
              <View style={styles.termsTextContainer}>
                <Text style={[styles.termsText, { color: colors.text }]}>
                  Eu li e aceito os{' '}
                  <Text style={[styles.termsLink, { color: colors.primary }]}>
                    Termos de Uso
                  </Text>{' '}
                  e{' '}
                  <Text style={[styles.termsLink, { color: colors.primary }]}>
                    Política de Privacidade
                  </Text>
                </Text>
              </View>
            </TouchableOpacity>

            {errors.acceptTerms && (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {errors.acceptTerms}
              </Text>
            )}

            <Button
              title="Criar Conta"
              onPress={handleRegister}
              loading={loading}
              style={styles.registerButton}
            />

            <View style={styles.loginContainer}>
              <Text style={[styles.loginText, { color: colors.textSecondary }]}>
                Já tem uma conta?
              </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={[styles.loginLink, { color: colors.primary }]}>
                  Entrar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  termsTextContainer: {
    flex: 1,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  termsLink: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 40,
  },
  registerButton: {
    marginTop: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 4,
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
