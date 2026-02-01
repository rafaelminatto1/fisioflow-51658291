/**
 * Sync Status Indicator Component
 * Shows current offline/sync status to the user
 */

import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { useTheme } from '@/hooks/useTheme';
import { useSyncStatus, useSync } from '@/lib/offline/offlineHooks';
import { useOnlineStatus } from '@/utils/network';
import { HapticFeedback } from '@/lib/haptics';

interface SyncStatusIndicatorProps {
  position?: 'top' | 'bottom';
  showPendingCount?: boolean;
  onPress?: () => void;
}

export function SyncStatusIndicator({
  position = 'top',
  showPendingCount = true,
  onPress,
}: SyncStatusIndicatorProps) {
  const { colors } = useTheme();
  const syncStatus = useSyncStatus();
  const { sync, isSyncing } = useSync();
  const isOnline = useOnlineStatus();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(position === 'top' ? -50 : 50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePress = async () => {
    HapticFeedback.light();
    if (onPress) {
      onPress();
    } else if (!isOnline && syncStatus.pendingOperations > 0) {
      // Trigger sync when coming back online
      await sync();
    }
  };

  if (isOnline && syncStatus.pendingOperations === 0 && !syncStatus.isSyncing) {
    // Everything is synced - don't show indicator
    return null;
  }

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: 'wifi-off',
        text: 'Offline',
        subtext: syncStatus.pendingOperations > 0
          ? `${syncStatus.pendingOperations} alterações pendentes`
          : 'Trabalhando offline',
        color: colors.warning,
        bgColor: `${colors.warning}10`,
      };
    }

    if (syncStatus.isSyncing || isSyncing) {
      return {
        icon: 'refresh-cw',
        text: 'Sincronizando...',
        subtext: syncStatus.pendingOperations > 0
          ? `${syncStatus.pendingOperations} itens restantes`
          : undefined,
        color: colors.primary,
        bgColor: `${colors.primary}10`,
        spinning: true,
      };
    }

    if (syncStatus.pendingOperations > 0) {
      return {
        icon: 'cloud-off',
        text: 'Pendente de sincronização',
        subtext: `${syncStatus.pendingOperations} alterações`,
        color: colors.warning,
        bgColor: `${colors.warning}10`,
      };
    }

    return {
      icon: 'check-circle',
      text: 'Sincronizado',
      subtext: undefined,
      color: colors.success,
      bgColor: `${colors.success}10`,
    };
  };

  const config = getStatusConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        position === 'top' ? styles.containerTop : styles.containerBottom,
        {
          backgroundColor: config.bgColor,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.content,
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
          <Icon
            name={config.icon as any}
            size={16}
            color={config.color}
            style={config.spinning ? styles.spinning : undefined}
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.text, { color: config.color }]}>{config.text}</Text>
          {config.subtext && showPendingCount && (
            <Text style={[styles.subtext, { color: colors.textSecondary }]}>
              {config.subtext}
            </Text>
          )}
        </View>

        {isOnline && syncStatus.pendingOperations > 0 && !syncStatus.isSyncing && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              handlePress();
            }}
            style={[styles.syncButton, { backgroundColor: config.color }]}
          >
            <Icon name="refresh-cw" size={14} color="#fff" />
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

/**
 * Offline Banner - shows prominent banner when offline
 */
export function OfflineBanner() {
  const { colors } = useTheme();
  const isOnline = useOnlineStatus();
  const syncStatus = useSyncStatus();

  if (isOnline && syncStatus.pendingOperations === 0) {
    return null;
  }

  return (
    <View style={[styles.banner, { backgroundColor: colors.warning }]}>
      <Icon name="wifi-off" size={16} color="#fff" />
      <Text style={styles.bannerText}>
        {!isOnline ? 'Você está offline' : 'Alterações pendentes de sincronização'}
      </Text>
    </View>
  );
}

/**
 * Sync Status Badge - small badge for screens
 */
export function SyncStatusBadge({ showLabel = false }: { showLabel?: boolean }) {
  const { colors } = useTheme();
  const syncStatus = useSyncStatus();
  const isOnline = useOnlineStatus();

  if (isOnline && syncStatus.pendingOperations === 0) {
    return showLabel ? (
      <View style={styles.badgeContainer}>
        <View style={[styles.badgeDot, { backgroundColor: colors.success }]} />
        <Text style={[styles.badgeText, { color: colors.success }]}>Sincronizado</Text>
      </View>
    ) : (
      <View style={[styles.badgeDot, { backgroundColor: colors.success }]} />
    );
  }

  return (
    <View style={styles.badgeContainer}>
      <View style={[styles.badgeDot, { backgroundColor: colors.warning }]} />
      {showLabel && (
        <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
          {syncStatus.pendingOperations} pendentes
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  containerTop: {
    top: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  containerBottom: {
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  subtext: {
    fontSize: 11,
    marginTop: 1,
  },
  syncButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinning: {
    // Animation handled by parent
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  bannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
