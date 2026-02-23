/**
 * BiometricLockScreen Component
 *
 * Tela de bloqueio que pede autenticação biométrica para desbloquear o app.
 * Usado quando o usuário habilitou biometria e o app está bloqueado.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { addBreadcrumb } from '@/lib/sentry';

interface BiometricLockScreenProps {
  onUnlock: () => void;
  onUsePassword?: () => void;
}

export function BiometricLockScreen({ onUnlock, onUsePassword }: BiometricLockScreenProps) {
  const colors = useColors();
  const { authenticate, isAvailable, isEnabled, biometricTypeName, isLoading, error, clearError } = useBiometricAuth();

  useEffect(() => {
    // Log breadcrumb para Sentry
    addBreadcrumb({
      category: 'auth',
      message: 'Biometric lock screen shown',
      level: 'info',
    });

    // Auto-disparar autenticação biométrica quando disponível
    if (isAvailable && isEnabled && !isLoading) {
      performBiometricAuth();
    }
  }, [isAvailable, isEnabled, isLoading]);

  const performBiometricAuth = async () => {
    clearError();
    const success = await authenticate('Autentique-se para continuar');

    if (success) {
      addBreadcrumb({
        category: 'auth',
        message: 'Biometric authentication successful',
        level: 'info',
      });
      onUnlock();
    }
  };

  const handleBiometricPress = () => {
    performBiometricAuth();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Biometric Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.icon, { color: colors.primary }]}>🔐</Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>
          Bloqueio Ativado
        </Text>

        {/* Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Use {biometricTypeName} para desbloquear o FisioFlow Pro
        </Text>

        {/* Error Message */}
        {error && (
          <Text style={[styles.error, { color: colors.danger }]}>
            {error}
          </Text>
        )}

        {/* Biometric Button */}
        {isAvailable && isEnabled && (
          <Pressable
            style={[styles.biometricButton, { backgroundColor: colors.surface }]}
            onPress={handleBiometricPress}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primary} size="large" />
            ) : (
              <>
                <Text style={styles.biometricIcon}>{biometricTypeName === 'Face ID' ? '👤' : '👆'}</Text>
                <Text style={[styles.biometricButtonText, { color: colors.text }]}>
                  Usar {biometricTypeName}
                </Text>
              </>
            )}
          </Pressable>
        )}

        {/* Fallback to Password */}
        {onUsePassword && (
          <Pressable onPress={onUsePassword} style={styles.passwordButton}>
            <Text style={[styles.passwordButtonText, { color: colors.primary }]}>
              Usar senha
            </Text>
          </Pressable>
        )}

        {/* App Version */}
        <Text style={[styles.version, { color: colors.textMuted }]}>
          FisioFlow Pro v1.0.0
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  biometricButton: {
    width: '100%',
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  biometricIcon: {
    fontSize: 24,
  },
  biometricButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  passwordButton: {
    padding: 12,
    marginBottom: 32,
  },
  passwordButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  version: {
    fontSize: 12,
    textAlign: 'center',
  },
});
