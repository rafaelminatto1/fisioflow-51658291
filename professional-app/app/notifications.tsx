import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { Card } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'appointment' | 'system' | 'patient' | 'financial';
  read: boolean;
  createdAt: Date;
}

export default function NotificationsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { light, medium } = useHaptics();
  const [refreshing, setRefreshing] = useState(false);

  // Mock notifications for now (Backend push service TODO)
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Novo Agendamento',
      message: 'Maria Silva agendou uma consulta para amanhã às 14:00.',
      type: 'appointment',
      read: false,
      createdAt: new Date(),
    },
    {
      id: '2',
      title: 'Pagamento Recebido',
      message: 'O pagamento do paciente João Pereira foi confirmado.',
      type: 'financial',
      read: true,
      createdAt: new Date(Date.now() - 3600000 * 2),
    },
    {
      id: '3',
      title: 'Lembrete de Evolução',
      message: 'Você tem 3 evoluções pendentes de preenchimento hoje.',
      type: 'system',
      read: false,
      createdAt: new Date(Date.now() - 3600000 * 24),
    },
  ]);

  const onRefresh = async () => {
    setRefreshing(true);
    light();
    // Simulate fetch
    setTimeout(() => setRefreshing(false), 1000);
  };

  const markAsRead = (id: string) => {
    medium();
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const deleteNotification = (id: string) => {
    medium();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'appointment': return 'calendar';
      case 'financial': return 'cash';
      case 'patient': return 'person';
      default: return 'notifications';
    }
  };

  const getIconColor = (type: Notification['type']) => {
    switch (type) {
      case 'appointment': return colors.primary;
      case 'financial': return colors.success;
      case 'patient': return colors.info;
      default: return colors.warning;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => { light(); router.back(); }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notificações</Text>
        <TouchableOpacity onPress={() => {
          medium();
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }}>
          <Text style={[styles.markAll, { color: colors.primary }]}>Lidas</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Tudo limpo!</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Você não tem nenhuma notificação no momento.
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              onPress={() => markAsRead(notification.id)}
              activeOpacity={0.7}
            >
              <Card
                style={[
                  styles.notificationCard,
                  !notification.read && { backgroundColor: colors.primary + '05', borderColor: colors.primary + '30' }
                ] as any}
                padding="none"
              >
                <View style={styles.cardContent}>
                  <View style={[styles.iconContainer, { backgroundColor: getIconColor(notification.type) + '15' }]}>
                    <Ionicons name={getIcon(notification.type) as any} size={22} color={getIconColor(notification.type)} />
                  </View>
                  <View style={styles.textContainer}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.title, { color: colors.text }, !notification.read && { fontWeight: 'bold' }]}>
                        {notification.title}
                      </Text>
                      <Text style={[styles.date, { color: colors.textSecondary }]}>
                        {format(notification.createdAt, 'HH:mm', { locale: ptBR })}
                      </Text>
                    </View>
                    <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
                      {notification.message}
                    </Text>
                  </View>
                  {!notification.read && (
                    <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
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
    fontWeight: '600',
  },
  markAll: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  notificationCard: {
    marginBottom: 12,
    borderWidth: 1,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
});
