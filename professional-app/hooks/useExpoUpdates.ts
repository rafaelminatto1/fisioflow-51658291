/**
 * useExpoUpdates Hook
 *
 * Hook para gerenciar atualizações OTA (Over-The-Air) do Expo.
 * Verifica, baixa e aplica atualizações de forma automática.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Updates from 'expo-updates';
import * as Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import { useColors } from './useColorScheme';
import { addBreadcrumb, captureException } from '@/lib/sentry';

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error';
export type UpdateType = 'normal' | 'urgent' | 'optional';

export interface UpdateInfo {
  version: string;
  description?: string;
  type: UpdateType;
  isMandatory: boolean;
  downloadUrl?: string;
  publishedAt?: string;
}

interface UseExpoUpdatesOptions {
  /**
   * Verifica updates automaticamente ao montar
   * Padrão: true
   */
  autoCheck?: boolean;

  /**
   * Mostra alerta quando há uma atualização disponível
   * Padrão: true
   */
  showAlert?: boolean;

  /**
   * Força atualização se for urgente
   * Padrão: true
   */
  forceUrgentUpdates?: boolean;

  /**
   * Intervalo para verificar updates em ms (0 = apenas na inicialização)
   * Padrão: 0
   */
  checkInterval?: number;

  /**
   * Callback quando há uma atualização disponível
   */
  onAvailable?: (info: UpdateInfo) => void;

  /**
   * Callback quando o update falha
   */
  onError?: (error: Error) => void;
}

/**
 * Hook para gerenciar atualizações do Expo
 */
export function useExpoUpdates(options: UseExpoUpdatesOptions = {}) {
  const {
    autoCheck = true,
    showAlert = true,
    forceUrgentUpdates = true,
    checkInterval = 0,
    onAvailable,
    onError,
  } = options;

  const colors = useColors();
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isEmbedded, setIsEmbedded] = useState(false);

  const updateCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Verifica se está rodando em produção ou dev
   */
  const isProduction = Updates.channel !== 'development';
  const isRunningExpoGo = Constants.appOwnership === 'expo';

  /**
   * Obtém a versão atual do app
   */
  const getCurrentVersion = useCallback(() => {
    const nativeVersion = Constants.expoConfig?.version || '0.0.0';
    const runtimeVersion = Updates.runtimeVersion || nativeVersion;
    return runtimeVersion;
  }, []);

  /**
   * Verifica se há atualizações disponíveis
   */
  const checkForUpdates = useCallback(async (): Promise<Updates.UpdateCheckResult | null> => {
    if (!isProduction || isRunningExpoGo) {
      return null;
    }

    setStatus('checking');

    try {
      addBreadcrumb({
        category: 'updates',
        message: 'Checking for OTA updates',
        level: 'info',
      });

      const update = await Updates.checkForUpdateAsync();

      if (update.isNew) {
        setStatus('available');

        const version = update.manifest?.version || 'Unknown';
        setAvailableVersion(version);
        setUpdateInfo({
          version,
          description: update.manifest?.description,
          type: 'normal', // Pode ser determinado por metadados no futuro
          isMandatory: false, // Pode ser determinado por metadados no futuro
          publishedAt: update.manifest?.createdAt,
        });

        onAvailable?.(updateInfo as UpdateInfo);

        // Mostra alerta se configurado
        if (showAlert) {
          showUpdateAlert(version);
        }
      } else {
        setStatus('idle');
      }

      return update;
    } catch (error) {
      setStatus('error');
      const err = error as Error;
      console.error('[useExpoUpdates] Erro ao verificar updates:', error);
      onError?.(err);
      captureException(err, { context: 'expo-updates' });
      return null;
    }
  }, [isProduction, isRunningExpoGo, showAlert, onAvailable, onError, updateInfo]);

  /**
   * Baixa a atualização disponível
   */
  const downloadUpdate = useCallback(async (): Promise<void> => {
    if (status !== 'available') {
      console.warn('[useExpoUpdates] Nenhuma atualização disponível para download');
      return;
    }

    setStatus('downloading');

    try {
      const result = await Updates.fetchUpdateAsync();

      if (result.isNew) {
        setStatus('ready');

        addBreadcrumb({
          category: 'updates',
          message: 'Update downloaded and ready to install',
          level: 'info',
        });

        // Reinicia para aplicar o update
        if (showAlert) {
          showUpdateReadyAlert();
        } else {
          await Updates.reloadAsync();
        }
      }
    } catch (error) {
      setStatus('error');
      const err = error as Error;
      console.error('[useExpoUpdates] Erro ao baixar update:', error);
      onError?.(err);
      captureException(err, { context: 'expo-updates' });
    }
  }, [status, showAlert, onError]);

  /**
   * Reinicia o app para aplicar a atualização
   */
  const applyUpdate = useCallback(async (): Promise<void> => {
    if (status !== 'ready') {
      console.warn('[useExpoUpdates] Nenhum update pronto para aplicar');
      return;
    }

    try {
      await Updates.reloadAsync();
    } catch (error) {
      console.error('[useExpoUpdates] Erro ao reiniciar:', error);
      const err = error as Error;
      onError?.(err);
      captureException(err, { context: 'expo-updates' });
    }
  }, [status, onError]);

  /**
   * Mostra alerta de atualização disponível
   */
  const showUpdateAlert = (version: string) => {
    Alert.alert(
      'Atualização Disponível',
      `Uma nova versão (${version}) do FisioFlow Pro está disponível. Deseja atualizar agora?`,
      [
        {
          text: 'Depois',
          style: 'cancel',
        },
        {
          text: 'Atualizar',
          onPress: downloadUpdate,
        },
      ]
    );
  };

  /**
   * Mostra alerta de update pronto para instalar
   */
  const showUpdateReadyAlert = () => {
    Alert.alert(
      'Atualização Pronta',
      'A atualização foi baixada. O app será reiniciado para aplicar as mudanças.',
      [
        {
          text: 'Agora',
          onPress: applyUpdate,
        },
      ],
      { cancelable: false }
    );
  };

  /**
   * Força uma atualização imediata (para updates urgentes)
   */
  const forceUpdate = useCallback(async (): Promise<void> => {
    setIsUpdating(true);

    try {
      const update = await checkForUpdates();

      if (update?.isNew) {
        await downloadUpdate();
      }
    } finally {
      setIsUpdating(false);
    }
  }, [checkForUpdates, downloadUpdate]);

  /**
   * Inicializa o hook
   */
  useEffect(() => {
    const initialize = async () => {
      setIsEmbedded(Updates.isEmbeddedLaunch);
      setCurrentVersion(getCurrentVersion());

      // Verifica updates automaticamente se configurado
      if (autoCheck) {
        await checkForUpdates();
      }

      // Configura verificação periódica
      if (checkInterval > 0 && isProduction) {
        updateCheckIntervalRef.current = setInterval(
          checkForUpdates,
          checkInterval
        );

        return () => {
          if (updateCheckIntervalRef.current) {
            clearInterval(updateCheckIntervalRef.current);
          }
        };
      }
    };

    initialize();
  }, [
    autoCheck,
    checkInterval,
    isProduction,
    getCurrentVersion,
    checkForUpdates,
  ]);

  return {
    // Estado
    status,
    isUpdating,
    currentVersion,
    availableVersion,
    updateInfo,
    isEmbedded,
    isProduction,
    isRunningExpoGo,
    hasUpdate: status === 'available' || status === 'ready',

    // Ações
    checkForUpdates,
    downloadUpdate,
    applyUpdate,
    forceUpdate,
  };
}

/**
 * Hook simplificado para atualizações silenciosas
 */
export function useSilentUpdates() {
  const { checkForUpdates, downloadUpdate, applyUpdate, status } = useExpoUpdates({
    autoCheck: true,
    showAlert: false,
    forceUrgentUpdates: false,
  });

  // Aplica automaticamente quando o update está pronto
  useEffect(() => {
    if (status === 'ready') {
      // Pequeno delay para dar tempo de salvar qualquer estado
      const timer = setTimeout(() => {
        applyUpdate();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [status, applyUpdate]);

  return {
    checkForUpdates,
    downloadUpdate,
    status,
  };
}

/**
 * Hook para exibir banner de atualização
 */
export function useUpdateBanner() {
  const { hasUpdate, status, downloadUpdate, applyUpdate, availableVersion } = useExpoUpdates({
    autoCheck: true,
    showAlert: false,
  });

  return {
    showBanner: hasUpdate,
    status,
    availableVersion,
    onDownload: downloadUpdate,
    onApply: applyUpdate,
  };
}

/**
 * Hook para informações de atualização
 */
export function useUpdateInfo() {
  const { currentVersion, availableVersion, status, isEmbedded, isProduction } = useExpoUpdates({
    autoCheck: false,
    showAlert: false,
  });

  return {
    currentVersion,
    availableVersion,
    status,
    isEmbedded,
    isProduction,
    isUpToDate: status === 'idle' || status === 'checking',
    hasPendingUpdate: status === 'available' || status === 'ready',
    isUpdateReady: status === 'ready',
  };
}
