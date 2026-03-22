import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import type { SyncStatus } from '@/hooks/useSyncStatus';

interface Props {
  status: SyncStatus;
  isOnline: boolean;
  pendingChanges?: number;
  compact?: boolean;
}

export function SyncStatus({ status, isOnline, pendingChanges = 0, compact = false }: Props) {
  const colors = useColors();

  if (compact && status === 'synced' && pendingChanges === 0) {
    return null;
  }

  const getStatusInfo = () => {
    switch (status) {
      case 'syncing':
        return {
          icon: 'sync' as const,
          color: colors.warning,
          text: 'Sincronizando...',
        };
      case 'synced':
        return {
          icon: 'checkmark-circle' as const,
          color: pendingChanges > 0 ? colors.warning : colors.success,
          text: pendingChanges > 0 ? `${pendingChanges} alterações pendentes` : 'Sincronizado',
        };
      case 'error':
        return {
          icon: 'alert-circle' as const,
          color: colors.error,
          text: 'Erro de sincronização',
        };
      case 'offline':
        return {
          icon: 'cloud-offline' as const,
          color: colors.textMuted,
          text: 'Modo offline',
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={[styles.iconContainer, { backgroundColor: statusInfo.color + '20' }]}>
        {status === 'syncing' ? (
          <Ionicons name="sync" size={16} color={statusInfo.color} />
        ) : (
          <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
        )}
      </View>
      {!compact && (
        <Text style={[styles.text, { color: statusInfo.color }]}>{statusInfo.text}</Text>
      )}
      {compact && status === 'syncing' && (
        <Ionicons name="sync" size={16} color={statusInfo.color} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compact: {
    marginLeft: 'auto',
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});
