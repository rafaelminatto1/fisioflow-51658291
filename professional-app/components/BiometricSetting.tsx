/**
 * BiometricSetting Component
 *
 * Componente de configuração para habilitar/desabilitar autenticação biométrica.
 * Pode ser usado na tela de configurações do app.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { captureException } from '@/lib/sentry';

interface BiometricSettingProps {
  onEnabledChange?: (enabled: boolean) => void;
}

export function BiometricSetting({ onEnabledChange }: BiometricSettingProps) {
  const colors = useColors();
  const {
    isAvailable,
    isEnabled,
    enable,
    disable,
    checkAvailability,
    isLoading: biometricLoading,
    error,
    clearError,
    biometricTypeName,
  } = useBiometricAuth();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showSetupPrompt, setShowSetupPrompt] = useState(false);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  const handleToggle = async (value: boolean) => {
    clearError();
    setIsProcessing(true);

    try {
      if (value) {
        // Prompt do usuário para confirmar habilitação
        const success = await enable();
        if (success) {
          onEnabledChange?.(true);
        }
      } else {
        await disable();
        onEnabledChange?.(false);
      }
    } catch (err) {
      console.error('Erro ao alternar biometria:', err);
      captureException(err as Error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetup = async () => {
    setShowSetupPrompt(true);
    try {
      const success = await enable();
      if (success) {
        onEnabledChange?.(true);
        setShowSetupPrompt(false);
      }
    } catch (err) {
      console.error('Erro ao configurar biometria:', err);
      captureException(err as Error);
    }
  };

  // Se o dispositivo não suporta biometria
  if (!isAvailable) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.content}>
          <View style={styles.iconWrapper}>
            <Text style={styles.icon}>🔒</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.text }]}>
              Biometria não disponível
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Este dispositivo não suporta autenticação biométrica
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Text style={styles.icon}>🔐</Text>
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>
            Login com {biometricTypeName}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Use {biometricTypeName} para entrar no app de forma rápida e segura
          </Text>

          {error && (
            <Text style={[styles.error, { color: colors.danger }]}>
              {error}
            </Text>
          )}
        </View>

        <Switch
          value={isEnabled}
          onValueChange={handleToggle}
          disabled={isProcessing || biometricLoading}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={isEnabled ? '#FFFFFF' : colors.border}
          ios_backgroundColor={colors.border}
        />
      </View>

      {isProcessing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      )}

      {/* Info Box quando biometria está desabilitada */}
      {!isEnabled && isAvailable && !isProcessing && (
        <View style={[styles.infoBox, { backgroundColor: `${colors.primary}10` }]}>
          <Text style={[styles.infoText, { color: colors.primary }]}>
            💡 Ao habilitar, você precisará usar {biometricTypeName} uma vez para confirmar
          </Text>
        </View>
      )}

      {/* Security info */}
      <View style={styles.securityInfo}>
        <Text style={[styles.securityText, { color: colors.textMuted }]}>
          🔒 Seus dados biométricos são armazenados apenas no seu dispositivo
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  securityInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  securityText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
