/**
 * Notification Center Component
 * Displays recent notifications and allows management
 */

import { useEffect, useState, useCallback } from 'react';

  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  Badge,
} from 'react-native';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card } from './Card';
import { Icon } from './Icon';
import { Button } from './Button';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { HapticFeedback } from '@/lib/haptics';
import {
  getNotificationManager,
  NotificationSettings,
} from '@/lib/notifications/notificationManager';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
  writeBatch,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: 'appointment' | 'patient_message' | 'protocol_update' | 'system' | 'reminder';
  read: boolean;
  createdAt: any;
  data?: Record<string, any>;
}

interface NotificationCenterProps {
  limit?: number;
  showHeader?: boolean;
  onNotificationPress?: (notification: NotificationItem) => void;
}

export function NotificationCenter({
  limit,
  showHeader = true,
  onNotificationPress,
}: NotificationCenterProps) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'users', profile.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(limit || 50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as NotificationItem[];

      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.read).length);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.uid, limit]);

  const handleNotificationPress = useCallback(
    async (notification: NotificationItem) => {
      HapticFeedback.selection();

      // Mark as read
      if (!notification.read) {
        await updateDoc(
          doc(db, 'users', profile.uid, 'notifications', notification.id),
          { read: true }
        );
      }

      if (onNotificationPress) {
        onNotificationPress(notification);
      } else {
        // Default navigation based on type
        handleNavigation(notification);
      }
    },
    [profile?.uid, onNotificationPress]
  );

  const handleNavigation = (notification: NotificationItem) => {
    switch (notification.type) {
      case 'appointment':
        if (notification.data?.appointmentId) {
          router.push(`/agenda/${notification.data.appointmentId}`);
        }
        break;
      case 'patient_message':
        if (notification.data?.patientId) {
          router.push(`/patients/${notification.data.patientId}`);
        }
        break;
      case 'protocol_update':
        if (notification.data?.protocolId) {
          router.push(`/exercise-plans/${notification.data.protocolId}`);
        }
        break;
      default:
        // Navigate to notifications list
        router.push('/notifications');
    }
  };

  const markAllAsRead = async () => {
    HapticFeedback.medium();
    const batch = writeBatch(db);

    notifications
      .filter((n) => !n.read)
      .forEach((notification) => {
        batch.update(
          doc(db, 'users', profile.uid, 'notifications', notification.id),
          { read: true }
        );
      });

    await batch.commit();
  };

  const clearAll = async () => {
    HapticFeedback.medium();
    // Note: In production, you might want to archive rather than delete
    const batch = writeBatch(db);

    notifications.forEach((notification) => {
      batch.delete(doc(db, 'users', profile.uid, 'notifications', notification.id));
    });

    await batch.commit();
  };

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'appointment':
        return 'calendar';
      case 'patient_message':
        return 'message-circle';
      case 'protocol_update':
        return 'activity';
      case 'reminder':
        return 'bell';
      default:
        return 'info';
    }
  };

  const getNotificationColor = (type: NotificationItem['type']) => {
    switch (type) {
      case 'appointment':
        return colors.primary;
      case 'patient_message':
        return colors.info;
      case 'protocol_update':
        return colors.success;
      case 'reminder':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notificações</Text>
          {unreadCount > 0 && (
            <View style={styles.headerActions}>
              <Button variant="ghost" size="sm" onPress={markAllAsRead}>
                Marcar todas como lidas
              </Button>
              <Button variant="ghost" size="sm" onPress={clearAll}>
                Limpar
              </Button>
            </View>
          )}
        </View>
      )}

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="bell-off" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhuma notificação
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <Pressable
              key={notification.id}
              onPress={() => handleNotificationPress(notification)}
              style={({ pressed }) => [
                styles.notificationItem,
                {
                  backgroundColor: notification.read ? 'transparent' : `${colors.primary}05`,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.notificationIcon,
                  { backgroundColor: `${getNotificationColor(notification.type)}20` },
                ]}
              >
                <Icon
                  name={getNotificationIcon(notification.type) as any}
                  size={20}
                  color={getNotificationColor(notification.type)}
                />
              </View>

              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <Text
                    style={[
                      styles.notificationTitle,
                      { color: colors.text },
                      !notification.read && styles.unreadTitle,
                    ]}
                    numberOfLines={1}
                  >
                    {notification.title}
                  </Text>
                  {!notification.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                </View>

                <Text
                  style={[styles.notificationBody, { color: colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {notification.body}
                </Text>

                <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
                  {notification.createdAt?.toDate
                    ? formatDistanceToNow(notification.createdAt.toDate(), {
                        addSuffix: true,
                        locale: ptBR,
                      })
                    : 'Agora'}
                </Text>
              </View>

              <Icon name="chevron-right" size={16} color={colors.textSecondary} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

/**
 * Notification Bell with Badge
 */
export function NotificationBell() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'users', profile.uid, 'notifications'),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  const handlePress = () => {
    HapticFeedback.selection();
    router.push('/notifications');
  };

  return (
    <Pressable onPress={handlePress} style={styles.bellContainer}>
      <Icon name="bell" size={24} color={colors.text} />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.error }]}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Notification Settings Screen Component
 */
export function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [profile?.uid]);

  const loadSettings = async () => {
    if (!profile?.uid) return;

    const manager = getNotificationManager();
    const userSettings = await manager.getNotificationSettings(profile.uid);
    setSettings(userSettings);
    setLoading(false);
  };

  const updateSetting = async (key: keyof NotificationSettings, value: any) => {
    if (!profile?.uid || !settings) return;

    HapticFeedback.selection();
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    const manager = getNotificationManager();
    await manager.updateNotificationSettings(profile.uid, { [key]: value });
  };

  if (loading || !settings) {
    return null;
  }

  return (
    <ScrollView style={styles.settingsContainer}>
      <Text style={[styles.settingsSection, { color: colors.text }]}>Tipos de Notificação</Text>

      <SettingItem
        icon="calendar"
        label="Consultas"
        description="Lembretes de consultas e alterações"
        value={settings.appointments}
        onValueChange={(v) => updateSetting('appointments', v)}
        colors={colors}
      />

      <SettingItem
        icon="bell"
        label="Lembretes"
        description="Notificações de lembretes gerais"
        value={settings.reminders}
        onValueChange={(v) => updateSetting('reminders', v)}
        colors={colors}
      />

      <SettingItem
        icon="message-circle"
        label="Mensagens de Pacientes"
        description="Comunicações de pacientes"
        value={settings.patientMessages}
        onValueChange={(v) => updateSetting('patientMessages', v)}
        colors={colors}
      />

      <SettingItem
        icon="activity"
        label="Atualizações de Protocolos"
        description="Alterações em planos de exercícios"
        value={settings.protocolUpdates}
        onValueChange={(v) => updateSetting('protocolUpdates', v)}
        colors={colors}
      />

      <SettingItem
        icon="info"
        label="Sistema"
        description="Notificações do sistema"
        value={settings.system}
        onValueChange={(v) => updateSetting('system', v)}
        colors={colors}
      />

      <Text style={[styles.settingsSection, { color: colors.text, marginTop: 24 }]}>
        Horário de Silêncio
      </Text>

      <Card style={styles.quietHoursCard}>
        <View style={styles.quietHoursHeader}>
          <Icon name="moon" size={20} color={colors.text} />
          <Text style={[styles.quietHoursLabel, { color: colors.text }]}>
            Horário de Silêncio
          </Text>
        </View>

        <SettingItem
          icon="power"
          label="Ativar horário de silêncio"
          description="Silenciar notificações em horários específicos"
          value={settings.quietHours.enabled}
          onValueChange={(v) =>
            updateSetting('quietHours', { ...settings.quietHours, enabled: v })
          }
          colors={colors}
        />

        {settings.quietHours.enabled && (
          <>
            <View style={[styles.timeRangeRow, { borderTopColor: colors.border }]}>
              <View style={styles.timeRangeItem}>
                <Text style={[styles.timeRangeLabel, { color: colors.textSecondary }]}>Início</Text>
                <Text style={[styles.timeRangeValue, { color: colors.text }]}>
                  {settings.quietHours.start}
                </Text>
              </View>
              <View style={[styles.timeRangeDivider, { backgroundColor: colors.border }]} />
              <View style={styles.timeRangeItem}>
                <Text style={[styles.timeRangeLabel, { color: colors.textSecondary }]}>Fim</Text>
                <Text style={[styles.timeRangeValue, { color: colors.text }]}>
                  {settings.quietHours.end}
                </Text>
              </View>
            </View>
          </>
        )}
      </Card>
    </ScrollView>
  );
}

function SettingItem({
  icon,
  label,
  description,
  value,
  onValueChange,
  colors,
}: {
  icon: string;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  colors: any;
}) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [
        styles.settingItem,
        { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={styles.settingItemLeft}>
        <View style={[styles.settingIcon, { backgroundColor: `${colors.primary}10` }]}>
          <Icon name={icon as any} size={18} color={colors.primary} />
        </View>
        <View style={styles.settingItemText}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
            {description}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.toggle,
          { backgroundColor: value ? colors.primary : `${colors.textSecondary}40` },
        ]}
      >
        <View
          style={[
            styles.toggleKnob,
            { transform: [{ translateX: value ? 20 : 0 }] },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    marginTop: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    gap: 2,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notificationBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    marginTop: 2,
  },
  bellContainer: {
    position: 'relative',
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  settingsContainer: {
    flex: 1,
    padding: 16,
  },
  settingsSection: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingItemText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  quietHoursCard: {
    padding: 16,
  },
  quietHoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  quietHoursLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  timeRangeItem: {
    flex: 1,
    alignItems: 'center',
  },
  timeRangeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  timeRangeValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  timeRangeDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 16,
  },
});
