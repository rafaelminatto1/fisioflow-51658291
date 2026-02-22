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
import { useAuthStore, unlockSessionWithPIN } from '../../store/auth';
import { biometricAuthService } from '../../lib/services/biometricAuthService';

const MAX_PIN_ATTEMPTS = 5;

export default function UnlockScreen() {
  const router = useRouter();
  const { unlockSession, clearSession, isLocked } = useAuthStore();
  
  const [pin, setPin] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check if biometric is available and get user ID
    const checkBiometric = async () => {
      try {
        // In a real app, get userId from Firebase Auth or stored session
        // For now, we'll use a placeholder
        const currentUserId = 'current-user-id'; // TODO: Get from auth context
        setUserId(currentUserId);

        const isEnabled = await biometricAuthService.isEnabled(currentUserId);
        setBiometricAvailable(isEnabled);

        // Auto-trigger biometric if available
        if (isEnabled) {
          handleBiometricAuth(currentUserId);
        }
      } catch (error) {
        console.error('[UnlockScreen] Failed to check biometric:', error);
      }
    };

    checkBiometric();
  }, []);

  /**
   * Handle biometric authentication
   */
  const handleBiometricAuth = async (currentUserId: string) => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    try {
      const success = await unlockSession(currentUserId);
      
      if (success) {
        // Session unlocked, navigate back
        router.back();
      } else {
        // Biometric failed, show PIN input
        Alert.alert(
          'Autenticação Biométrica Falhou',
          'Por favor, digite seu PIN para desbloquear.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[UnlockScreen] Biometric auth error:', error);
      Alert.alert(
        'Erro',
        'Falha na autenticação biométrica. Por favor, use seu PIN.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  /**
   * Handle PIN input
   */
  const handlePinInput = (digit: string) => {
    if (pin.length >= 6) return;

    const newPin = pin + digit;
    setPin(newPin);

    // Auto-submit when 6 digits entered
    if (newPin.length === 6) {
      handlePinSubmit(newPin);
    }
  };

  /**
   * Handle PIN submission
   */
  const handlePinSubmit = async (pinToVerify: string) => {
    if (!userId) {
      Alert.alert('Erro', 'Usuário não identificado. Por favor, faça login novamente.');
      handleLogout();
      return;
    }

    setIsAuthenticating(true);
    try {
      const success = await unlockSessionWithPIN(userId, pinToVerify);
      
      if (success) {
        // PIN correct, session unlocked
        setPin('');
        setFailedAttempts(0);
        router.back();
      } else {
        // PIN incorrect
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        setPin('');

        if (newFailedAttempts >= MAX_PIN_ATTEMPTS) {
          // Max attempts reached, logout
          Alert.alert(
            'Muitas Tentativas Falhas',
            'Você excedeu o número máximo de tentativas. Por favor, faça login novamente.',
            [
              {
                text: 'OK',
                onPress: handleLogout,
              },
            ]
          );
        } else {
          Alert.alert(
            'PIN Incorreto',
            `Tentativa ${newFailedAttempts} de ${MAX_PIN_ATTEMPTS}. Por favor, tente novamente.`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('[UnlockScreen] PIN verification error:', error);
      Alert.alert('Erro', 'Falha ao verificar PIN. Por favor, tente novamente.');
      setPin('');
    } finally {
      setIsAuthenticating(false);
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    if (!userId) return;
    
    clearSession();
    // TODO: Call full logout with PHI cleanup
    // await useAuthStore.getState().logout(userId);
    router.replace('/(auth)/login');
  };

  /**
   * Handle backspace
   */
  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  /**
   * Retry biometric
   */
  const handleRetryBiometric = () => {
    if (userId && biometricAvailable) {
      handleBiometricAuth(userId);
    }
  };

  if (!isLocked) {
    // Session is not locked, shouldn't be here
    router.back();
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sessão Bloqueada</Text>
        <Text style={styles.subtitle}>
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
              pin.length > index && styles.pinDotFilled,
            ]}
          />
        ))}
      </View>

      {/* Biometric Button */}
      {biometricAvailable && (
        <TouchableOpacity
          style={styles.biometricButton}
          onPress={handleRetryBiometric}
          disabled={isAuthenticating}
        >
          <Text style={styles.biometricButtonText}>
            Usar Autenticação Biométrica
          </Text>
        </TouchableOpacity>
      )}

      {/* PIN Keypad */}
      <View style={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <TouchableOpacity
            key={digit}
            style={styles.keypadButton}
            onPress={() => handlePinInput(digit.toString())}
            disabled={isAuthenticating}
          >
            <Text style={styles.keypadButtonText}>{digit}</Text>
          </TouchableOpacity>
        ))}
        
        {/* Empty space */}
        <View style={styles.keypadButton} />
        
        {/* Zero */}
        <TouchableOpacity
          style={styles.keypadButton}
          onPress={() => handlePinInput('0')}
          disabled={isAuthenticating}
        >
          <Text style={styles.keypadButtonText}>0</Text>
        </TouchableOpacity>
        
        {/* Backspace */}
        <TouchableOpacity
          style={styles.keypadButton}
          onPress={handleBackspace}
          disabled={isAuthenticating || pin.length === 0}
        >
          <Text style={styles.keypadButtonText}>⌫</Text>
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {isAuthenticating && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0284C7" />
        </View>
      )}

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        disabled={isAuthenticating}
      >
        <Text style={styles.logoutButtonText}>Sair e Fazer Login Novamente</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
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
    color: '#1C1917',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#78716C',
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
    borderColor: '#D6D3D1',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  biometricButton: {
    backgroundColor: '#0284C7',
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
    backgroundColor: '#FFFFFF',
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
    color: '#1C1917',
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
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
