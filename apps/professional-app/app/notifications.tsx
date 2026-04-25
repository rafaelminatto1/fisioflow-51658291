import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColorScheme";
import { Card } from "@/components";
import { useHaptics } from "@/hooks/useHaptics";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNotifications, useNotificationMutations, Notification } from "@/hooks/useNotifications";

export default function NotificationsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { light, medium } = useHaptics();
  const [refreshing, setRefreshing] = useState(false);

  // Use real notifications hook
  const { data, isLoading, error, refetch } = useNotifications();
  const {
    markAsRead: markAsReadMutation,
    markAllAsRead,
    deleteNotification: deleteMutation,
  } = useNotificationMutations();

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    light();
    await refetch();
    setRefreshing(false);
  }, [refetch, light]);

  const handleMarkAsRead = (id: string) => {
    medium();
    markAsReadMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    medium();
    deleteMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    medium();
    markAllAsRead.mutate();
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "appointment":
        return "calendar";
      case "payment":
        return "cash";
      case "whatsapp":
        return "logo-whatsapp";
      case "waitlist":
        return "time";
      case "success":
        return "checkmark-circle";
      case "warning":
        return "warning";
      case "error":
        return "alert-circle";
      default:
        return "notifications";
    }
  };

  const getIconColor = (type: Notification["type"]) => {
    switch (type) {
      case "appointment":
        return colors.primary;
      case "payment":
        return colors.success;
      case "whatsapp":
        return "#25D366";
      case "waitlist":
        return colors.warning;
      case "success":
        return colors.success;
      case "warning":
        return colors.warning;
      case "error":
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const formatNotificationDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 24) {
        return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
      }
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return "";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["left", "right"]}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => {
              light();
              router.back();
            }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notificações</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["left", "right"]}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => {
              light();
              router.back();
            }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notificações</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color={colors.error} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Erro ao carregar</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Não foi possível carregar as notificações.
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["left", "right"]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => {
            light();
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Notificações {unreadCount > 0 && `(${unreadCount})`}
        </Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={[styles.markAll, { color: colors.primary }]}>Ler todas</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
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
              onPress={() => handleMarkAsRead(notification.id)}
              onLongPress={() => handleDelete(notification.id)}
              activeOpacity={0.7}
            >
              <Card
                style={
                  [
                    styles.notificationCard,
                    !notification.is_read && {
                      backgroundColor: colors.primary + "08",
                      borderColor: colors.primary + "40",
                    },
                  ] as any
                }
                padding="none"
              >
                <View style={styles.cardContent}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: getIconColor(notification.type) + "15" },
                    ]}
                  >
                    <Ionicons
                      name={getIcon(notification.type) as any}
                      size={22}
                      color={getIconColor(notification.type)}
                    />
                  </View>
                  <View style={styles.textContainer}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[
                          styles.title,
                          { color: colors.text },
                          !notification.is_read && { fontWeight: "700" },
                        ]}
                      >
                        {notification.title}
                      </Text>
                      <Text style={[styles.date, { color: colors.textSecondary }]}>
                        {formatNotificationDate(notification.created_at)}
                      </Text>
                    </View>
                    <Text
                      style={[styles.message, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {notification.message}
                    </Text>
                  </View>
                  {!notification.is_read && (
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  markAll: {
    fontSize: 14,
    fontWeight: "500",
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
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
