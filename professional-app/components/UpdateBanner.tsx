/**
 * UpdateBanner Component
 *
 * Banner que avisa o usuário sobre uma atualização disponível.
 * Mostra apenas quando há uma atualização OTA disponível.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import { useUpdateBanner } from '@/hooks/useExpoUpdates';
import { X, Download, CheckCircle } from 'lucide-react-native';
import { LucideIcon } from 'lucide-react-native';

/**
 * Ícones para diferentes estados
 */
const icons: Record<string, LucideIcon> = {
  available: Download,
  downloading: Download,
  ready: CheckCircle,
};

/**
 * Componente de banner de atualização
 */
export function UpdateBanner() {
  const colors = useColors();
  const { showBanner, status, availableVersion, onDownload, onApply } = useUpdateBanner();

  // Não mostra se não há atualização ou se está rodando no Expo Go
  if (!showBanner) {
    return null;
  }

  const Icon = icons[status] || Download;
  const isDownloading = status === 'downloading';
  const isReady = status === 'ready';

  const handlePress = () => {
    if (isReady) {
      onApply();
    } else {
      onDownload();
    }
  };

  const handleDismiss = () => {
    // O banner volta a aparecer na próxima inicialização
    // Se quisermos esconder temporariamente, precisamos implementar isso
  };

  const getMessage = () => {
    if (isReady) {
      return 'Atualização pronta! Toque para reiniciar';
    }
    if (isDownloading) {
      return 'Baixando atualização...';
    }
    return `Nova versão disponível: ${availableVersion || 'atualização'}`;
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: isReady ? colors.success : colors.primary,
        },
      ]}
      edges={['top']}
    >
      <View style={styles.content}>
        <View style={styles.leftContent}>
          {isDownloading ? (
            <ActivityIndicator color="#FFFFFF" size="small" style={styles.icon} />
          ) : (
            <Icon size={20} color="#FFFFFF" style={styles.icon} />
          )}
          <Text style={styles.message}>{getMessage()}</Text>
        </View>

        <View style={styles.rightContent}>
          <TouchableOpacity
            onPress={handlePress}
            style={styles.actionButton}
            activeOpacity={0.7}
          >
            <Text style={styles.actionText}>
              {isReady ? 'Reiniciar' : 'Atualizar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.dismissButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <X size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

/**
 * Componente de botão de atualização (para usar em telas de configurações)
 */
interface UpdateButtonProps {
  style?: any;
  variant?: 'primary' | 'secondary';
}

export function UpdateButton({ style, variant = 'primary' }: UpdateButtonProps) {
  const colors = useColors();
  const { hasPendingUpdate, status, checkForUpdates, downloadUpdate, applyUpdate } = useUpdateBanner();

  if (!hasPendingUpdate && status !== 'checking') {
    return null;
  }

  const isChecking = status === 'checking';
  const isDownloading = status === 'downloading';
  const isReady = status === 'ready';

  const handlePress = () => {
    if (isReady) {
      applyUpdate();
    } else if (isDownloading) {
      // Já está baixando
      return;
    } else {
      downloadUpdate();
    }
  };

  return (
    <View style={[styles.updateButtonContainer, style]}>
      {isChecking && (
        <ActivityIndicator color={colors.primary} size="small" style={{ marginRight: 8 }} />
      )}

      <TouchableOpacity
        onPress={handlePress}
        style={[
          styles.updateButton,
          variant === 'primary' ? styles.updateButtonPrimary : styles.updateButtonSecondary,
          {
            backgroundColor: variant === 'primary' ? colors.primary : colors.surface,
            borderColor: colors.border,
          },
        ]}
        disabled={isChecking || isDownloading}
        activeOpacity={0.7}
      >
        {isReady ? (
          <CheckCircle size={16} color={variant === 'primary' ? '#FFFFFF' : colors.primary} style={{ marginRight: 8 }} />
        ) : isDownloading ? (
          <ActivityIndicator size="small" color={variant === 'primary' ? '#FFFFFF' : colors.primary} style={{ marginRight: 8 }} />
        ) : (
          <Download size={16} color={variant === 'primary' ? '#FFFFFF' : colors.primary} style={{ marginRight: 8 }} />
        )}

        <Text
          style={[
            styles.updateButtonText,
            { color: variant === 'primary' ? '#FFFFFF' : colors.text },
          ]}
        >
          {isChecking ? 'Verificando...' : isDownloading ? 'Baixando...' : isReady ? 'Reiniciar para atualizar' : 'Atualizar'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Componente de status de atualização (para tela de sobre)
 */
export function UpdateStatus() {
  const colors = useColors();
  const { currentVersion, availableVersion, status, isProduction, isUpToDate, hasPendingUpdate } = useUpdateBanner();

  return (
    <View style={[styles.statusContainer, { backgroundColor: colors.surface }]}>
      <Text style={[styles.statusTitle, { color: colors.text }]}>
        Informações da Versão
      </Text>

      <View style={styles.statusRow}>
        <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
          Versão Atual:
        </Text>
        <Text style={[styles.statusValue, { color: colors.text }]}>
          {currentVersion || 'Desconhecida'}
        </Text>
      </View>

      <View style={styles.statusRow}>
        <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
          Ambiente:
        </Text>
        <Text
          style={[
            styles.statusValue,
            { color: isProduction ? colors.success : colors.warning },
          ]}
        >
          {isProduction ? 'Produção' : 'Desenvolvimento'}
        </Text>
      </View>

      {hasPendingUpdate && availableVersion && (
        <View style={[styles.updateAvailableContainer, { backgroundColor: `${colors.primary}10` }]}>
          <Download size={16} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.updateAvailableText, { color: colors.primary }]}>
            Nova versão disponível: {availableVersion}
          </Text>
        </View>
      )}

      {isUpToDate && (
        <View style={[styles.updateAvailableContainer, { backgroundColor: `${colors.success}10` }]}>
          <CheckCircle size={16} color={colors.success} style={{ marginRight: 8 }} />
          <Text style={[styles.updateAvailableText, { color: colors.success }]}>
            App atualizado
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={() => {
          // Recarregar a página para verificar novamente
          // Em produção, isso pode chamar checkForUpdates()
        }}
        style={styles.refreshButton}
      >
        <Text style={[styles.refreshButtonText, { color: colors.primary }]}>
          Verificar atualizações
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 4,
  },
  updateButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  updateButtonPrimary: {
    // backgroundColor definido dinamicamente
  },
  updateButtonSecondary: {
    // backgroundColor definido dinamicamente
  },
  updateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  statusLabel: {
    fontSize: 14,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  updateAvailableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  updateAvailableText: {
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
