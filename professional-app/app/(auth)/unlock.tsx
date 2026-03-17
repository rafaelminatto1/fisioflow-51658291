/**
 * Session Unlock Screen
 *
 * Displayed when:
 * - App returns from background after 5 minutes (Requirement 5.4)
 * - Session is locked and requires re-authentication
 *
 * Supports:
 * - Biometric authentication (Face ID/Touch ID)
 * - PIN fallback
 * - Auto-logout after failed attempts
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, unlockSessionWithPIN } from '@/store/auth';
import { biometricAuthService } from '@/lib/services/biometricAuthService';
import { useColors } from '@/hooks/useColorScheme';

const MAX_PIN_ATTEMPTS = 5;

export default function UnlockScreen() {
  const router = useRouter();
  const colors = useColors();
  const { unlockSession, clearSession, isLocked } = useAuthStore();

  const [pin, setPin] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkBiometric = async () => {
      try {
        const currentUserId = useAuthStore.getState().user?.id ?? null;
        setUserId(currentUserId);

        const config = await biometricAuthService.getConfig(currentUserId || '');
        setBiometricAvailable(config.isEnabled);

        if (config.isEnabled) {
          handleBiometricAuth(currentUserId as string);
        }
      } catch {
        // Silent — biometric unavailable, PIN fallback shown
      }
    };

    checkBiometric();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBiometricAuth = async (currentUserId: string) => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    try {
      await unlockSession();
      router.back();
    } catch {
      Alert.alert(
        'Erro',
        'Falha na autenticação biométrica. Por favor, use seu PIN.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePinInput = (digit: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 6) {
      handlePinSubmit(newPin);
    }
  };

  const handlePinSubmit = async (pinToVerify: string) => {
    if (!userId) {
      Alert.alert('Erro', 'Usuário não identificado. Por favor, faça login novamente.');
      handleLogout();
      return;
    }

    setIsAuthenticating(true);
    try {
      const ok = await unlockSessionWithPIN(pinToVerify);

      if (ok) {
        setPin('');
        setFailedAttempts(0);
        router.back();
      } else {
        const newFailed = failedAttempts + 1;
        setFailedAttempts(newFailed);
        setPin('');

        if (newFailed >= MAX_PIN_ATTEMPTS) {
          Alert.alert(
            'Muitas Tentativas Falhas',
            'Você excedeu o número máximo de tentativas. Por favor, faça login novamente.',
            [{ text: 'OK', onPress: handleLogout }]
          );
        } else {
          Alert.alert(
            'PIN Incorreto',
            `Tentativa ${newFailed} de ${MAX_PIN_ATTEMPTS}. Por favor, tente novamente.`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch {
      Alert.alert('Erro', 'Falha ao verificar PIN. Por favor, tente novamente.');
      setPin('');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    clearSession();
    try {
      await useAuthStore.getState().signOut();
    } catch {
      // Ensure navigation even if signOut fails
    }
    router.replace('/(auth)/login');
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleRetryBiometric = () => {
    if (userId && biometricAvailable) {
      handleBiometricAuth(userId);
    }
  };

  if (!isLocked) {
    router.back();
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Sessão Bloqueada</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Autentique para continuar usando o aplicativo
        </Text>
      </View>

      {/* PIN Display */}
      <View style={styles.pinContainer}>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              { borderColor: colors.border },
              pin.length > index && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
          />
        ))}
      </View>

      {/* Biometric Button */}
      {biometricAvailable && (
        <TouchableOpacity
          style={[styles.biometricButton, { backgroundColor: colors.primary }]}
          onPress={handleRetryBiometric}
          disabled={isAuthenticating}
        >
          <Text style={styles.biometricButtonText}>Usar Autenticação Biométrica</Text>
        </TouchableOpacity>
      )}

      {/* PIN Keypad */}
      <View style={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <TouchableOpacity
            key={digit}
            style={[styles.keypadButton, { backgroundColor: colors.surface }]}
            onPress={() => handlePinInput(digit.toString())}
            disabled={isAuthenticating}
          >
            <Text style={[styles.keypadButtonText, { color: colors.text }]}>{digit}</Text>
          </TouchableOpacity>
        ))}

        {/* Empty space */}
        <View style={styles.keypadButton} />

        {/* Zero */}
        <TouchableOpacity
          style={[styles.keypadButton, { backgroundColor: colors.surface }]}
          onPress={() => handlePinInput('0')}
          disabled={isAuthenticating}
        >
          <Text style={[styles.keypadButtonText, { color: colors.text }]}>0</Text>
        </TouchableOpacity>

        {/* Backspace */}
        <TouchableOpacity
          style={[styles.keypadButton, { backgroundColor: colors.surface }]}
          onPress={handleBackspace}
          disabled={isAuthenticating || pin.length === 0}
        >
          <Text style={[styles.keypadButtonText, { color: colors.text }]}>⌫</Text>
        </TouchableOpacity>
      </View>

      {/* Loading Overlay */}
      {isAuthenticating && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* Logout Link */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        disabled={isAuthenticating}
      >
        <Text style={[styles.logoutButtonText, { color: colors.error }]}>
          Sair e Fazer Login Novamente
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  biometricButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  biometricButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  keypadButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  keypadButtonText: {
    fontSize: 28,
    fontWeight: '600',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
