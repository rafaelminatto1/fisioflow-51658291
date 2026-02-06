/**
 * SyncIndicator Component
 * Shows offline/sync status at the top of the screen
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SyncIndicator() {
  const colors = useColors();
  const {isOnline, isSyncing, pendingOperations, lastSync, syncNow} = useOfflineSync();

  if (isOnline && !isSyncing && pendingOperations === 0) {
    return null; // Don't show indicator when everything is fine
  }

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Sincronizando...';
    if (pendingOperations > 0) return `${pendingOperations} alterações pendentes`;
    return 'Sincronizado';
  };

  const getStatusIcon = () => {
    if (!isOnline) return 'cloud-offline';
    if (isSyncing) return 'sync';
    if (pendingOperations > 0) return 'time';
    return 'checkmark-circle';
  };

  const getStatusColor = () => {
    if (!isOnline) return colors.warning;
    if (isSyncing) return colors.primary;
    if (pendingOperations > 0) return colors.info;
    return colors.success;
  };

  const showSyncButton = isOnline && pendingOperations > 0 && !isSyncing;

  return (
    <TouchableOpacity
      style={[styles.container, {backgroundColor: getStatusColor() + '20'}]}
      onPress={() => showSyncButton && syncNow()}
      activeOpacity={showSyncButton ? 0.7 : 1}
      disabled={!showSyncButton}
    >
      <View style={styles.content}>
        <View style={styles.leftContent}>
          {isSyncing ? (
            <View style={styles.spinner}>
              <View style={[styles.spinnerDot, {backgroundColor: getStatusColor()}]} />
              <View style={[styles.spinnerDot, {backgroundColor: getStatusColor()}, styles.spinnerDot2]} />
              <View style={[styles.spinnerDot, {backgroundColor: getStatusColor()}, styles.spinnerDot3]} />
            </View>
          ) : (
            <Ionicons name={getStatusIcon() as any} size={16} color={getStatusColor()} />
          )}
          <Text style={[styles.text, {color: getStatusColor()}]}>{getStatusText()}</Text>
        </View>

        {lastSync && isOnline && !isSyncing && (
          <Text style={[styles.lastSync, {color: getStatusColor()}]}>
            {format(lastSync, "HH:mm", {locale: ptBR})}
          </Text>
        )}

        {showSyncButton && (
          <View style={[styles.syncButton, {backgroundColor: getStatusColor()}]}>
            <Ionicons name="refresh" size={14} color="#FFFFFF" />
            <Text style={styles.syncButtonText}>Sincronizar</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  lastSync: {
    fontSize: 11,
    marginRight: 8,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  spinner: {
    flexDirection: 'row',
    width: 16,
    height: 16,
  },
  spinnerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  spinnerDot2: {
    opacity: 0.6,
  },
  spinnerDot3: {
    opacity: 0.3,
  },
});
