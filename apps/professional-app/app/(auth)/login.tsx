import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@/components';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';

export default function LoginScreen() {
  const colors = useColors();
  const { signIn, isLoading, error, clearError, } = useAuthStore();
  const {
    authenticate,
    enable,
    isAvailable,
    isEnabled,
    biometricTypeName,
    checkAvailability,
  } = useBiometricAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  // Check biometric availability on mount
  useEffect(() => {
    checkAvailability();
    loadStoredEmail();
  }, []);

  const loadStoredEmail = async () => {
    const storedEmail = await SecureStore.getItemAsync('user_email');
    if (storedEmail) {
      setEmail(storedEmail);
    }
  };

  const handleLogin = async () => {
    clearError();
    setLocalError('');

    if (!email.trim()) {
      setLocalError('Digite seu email');
      return;
    }

    if (!password) {
      setLocalError('Digite sua senha');
      return;
    }

    try {
      await signIn(email.trim(), password);
      // Save for biometrics
      await SecureStore.setItemAsync('user_email', email.trim());
      await SecureStore.setItemAsync('user_password', password);
      
      // Auto-enable biometrics if not yet enabled but available
      if (isAvailable && !isEnabled) {
        await enable();
      }
      router.replace('/(tabs)');
    } catch  {
      // Error handled by store
    }
  };

  const handleBiometricLogin = async () => {
    clearError();
    setLocalError('');

    if (!isEnabled) {
      setLocalError('Habilite a biometria nas configurações');
      return;
    }

    const success = await authenticate('Acesse o FisioFlow Pro');
    if (success) {
      const storedEmail = await SecureStore.getItemAsync('user_email');
      const storedPassword = await SecureStore.getItemAsync('user_password');
      
      if (storedEmail && storedPassword) {
        try {
          await signIn(storedEmail, storedPassword);
          router.replace('/(tabs)');
        } catch  {
          setLocalError('Erro na autenticação. Tente login manual.');
        }
      } else {
        setLocalError('Credenciais não salvas. Faça login manual uma vez.');
      }
    }
  };

  const displayError = localError || error;

  const getBiometricIcon = () => {
    // Ionicons doesn't have 'face-id', use 'person' for Face ID
    if (biometricTypeName === 'Face ID') {
      return 'person';
    }
    return 'finger-print';
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
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: colors.text }]}>FisioFlow Pro</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Portal do Profissional
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {displayError ? (
              <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {displayError}
                </Text>
              </View>
            ) : null}

            <Input
              label="Email"
              placeholder="seu@email.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setLocalError('');
                clearError();
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon="mail-outline"
            />

            <Input
              label="Senha"
              placeholder="Digite sua senha"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setLocalError('');
                clearError();
              }}
              secureTextEntry
              leftIcon="lock-closed-outline"
            />

            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                  Esqueci minha senha
                </Text>
              </TouchableOpacity>
            </Link>

            <Button
              title="Entrar"
              onPress={handleLogin}
              loading={isLoading}
              style={styles.loginButton}
            />

            {/* Biometric Login Button */}
            {isAvailable && isEnabled && (
              <TouchableOpacity
                style={[styles.biometricButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleBiometricLogin}
              >
                <Ionicons
                  name={getBiometricIcon() as any}
                  size={24}
                  color={colors.textSecondary}
                />
                <Text style={[styles.biometricText, { color: colors.textSecondary }]}>
                  Entrar com {biometricTypeName}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Acesso exclusivo para profissionais cadastrados.
            </Text>
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    marginBottom: 24,
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    marginTop: 8,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    gap: 12,
  },
  biometricText: {
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
