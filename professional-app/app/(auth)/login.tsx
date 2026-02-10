import { useState, useEffect } from 'react';

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
  const { signIn, isLoading, error, clearError, user } = useAuthStore();
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
  const [showBiometric, setShowBiometric] = useState(false);

  // Check biometric availability on mount
  useEffect(() => {
    checkAvailability();
  }, []);

  // Show biometric button if available and not enabled yet
  useEffect(() => {
    if (isAvailable && !isEnabled && !user) {
      setShowBiometric(true);
    } else {
      setShowBiometric(false);
    }
  }, [isAvailable, isEnabled, user]);

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
      // Enable biometric after successful login
      if (isAvailable) {
        await enable();
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      // Error is already handled by the store
    }
  };

  const handleBiometricLogin = async () => {
    clearError();
    setLocalError('');

    const success = await authenticate('Acesse o FisioFlow Pro');
    if (success) {
      // If biometric login succeeds, we need to sign in with stored credentials
      // For now, this is a simplified version - in production, store credentials securely
      setLocalError('Faça login com email e senha primeiro para habilitar biometria');
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
            {showBiometric && (
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
