import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import { Card, SyncStatus, Skeleton, CardSkeleton } from "@/components";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { getConversations, ApiConversation } from "@/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function MessagesSkeletonLoader() {
  return (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} style={styles.convCard}>
          <View style={styles.convContent}>
            <Skeleton width={52} height={52} variant="circular" />
            <View style={styles.skeletonConvInfo}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Skeleton width={120} height={16} variant="text" />
                <Skeleton width={40} height={12} variant="text" />
              </View>
              <Skeleton width="80%" height={14} variant="text" style={{ marginTop: 8 }} />
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

export default function MessagesScreen() {
  const colors = useColors();
  const { light } = useHaptics();
  const { status: syncStatus, isOnline } = useSyncStatus();
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const formatLastMessageTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return format(date, "HH:mm");
    }
    return format(date, "dd/MM", { locale: ptBR });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar conversa..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                light();
                setSearchQuery("");
              }}
            >
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.metaRow}>
        {!isLoading && (
          <View style={styles.statsRow}>
            <View style={[styles.statBadge, { backgroundColor: colors.primaryLight + "40" }]}>
              <Text style={[styles.statBadgeText, { color: colors.primary }]}>
                {conversations.length} conversas
              </Text>
            </View>
            {totalUnread > 0 && (
              <View style={[styles.statBadge, { backgroundColor: colors.errorLight }]}>
                <Text style={[styles.statBadgeText, { color: colors.error }]}>
                  {totalUnread} não lidas
                </Text>
              </View>
            )}
          </View>
        )}
        <SyncStatus status={syncStatus} isOnline={isOnline} compact />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading ? (
          <MessagesSkeletonLoader />
        ) : filteredConversations.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.border }]}>
              <Ionicons
                name={searchQuery ? "search-outline" : "chatbubbles-outline"}
                size={32}
                color={colors.textMuted}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {searchQuery ? "Sem resultados" : "Nenhuma conversa"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery
                ? "Não encontramos conversas com este termo."
                : "Suas conversas com pacientes aparecerão aqui."}
            </Text>
          </Card>
        ) : (
          <View style={styles.listContainer}>
            {filteredConversations.map((conv) => (
              <TouchableOpacity
                key={conv.id}
                onPress={() => {
                  light();
                  router.push(`/messages/${conv.participantId}` as any);
                }}
                activeOpacity={0.7}
              >
                <Card style={styles.convCard}>
                  <View style={styles.convContent}>
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor:
                            conv.unreadCount > 0 ? colors.primary + "20" : colors.primary + "12",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarText,
                          {
                            color: colors.primary,
                            fontWeight: conv.unreadCount > 0 ? "800" : "700",
                          },
                        ]}
                      >
                        {conv.participantName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.convInfo}>
                      <View style={styles.convHeader}>
                        <Text
                          style={[
                            styles.participantName,
                            {
                              color: colors.text,
                              fontWeight: conv.unreadCount > 0 ? "700" : "600",
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {conv.participantName}
                        </Text>
                        <Text
                          style={[
                            styles.lastMessageTime,
                            {
                              color: conv.unreadCount > 0 ? colors.primary : colors.textMuted,
                              fontWeight: conv.unreadCount > 0 ? "600" : "400",
                            },
                          ]}
                        >
                          {formatLastMessageTime(conv.lastMessageAt)}
                        </Text>
                      </View>
                      <View style={styles.convFooter}>
                        <Text
                          style={[
                            styles.lastMessage,
                            {
                              color: conv.unreadCount > 0 ? colors.text : colors.textSecondary,
                            },
                            conv.unreadCount > 0 && styles.unreadText,
                          ]}
                          numberOfLines={1}
                        >
                          {conv.lastMessage || "Nenhuma mensagem ainda"}
                        </Text>
                        {conv.unreadCount > 0 && (
                          <View
                            style={[
                              styles.unreadBadge,
                              {
                                backgroundColor: colors.primary,
                              },
                            ]}
                          >
                            <Text style={styles.unreadCount}>{conv.unreadCount}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 6,
  },
  statBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 14,
    paddingTop: 6,
    paddingBottom: 48,
  },
  listContainer: {
    gap: 8,
  },
  convCard: {
    padding: 14,
    borderRadius: 16,
  },
  convContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 18,
  },
  convInfo: {
    flex: 1,
  },
  convHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  participantName: {
    fontSize: 15,
    maxWidth: "70%",
  },
  lastMessageTime: {
    fontSize: 11,
  },
  convFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: 13,
    flex: 1,
    marginRight: 6,
  },
  unreadText: {
    fontWeight: "600",
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadCount: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 6,
    borderRadius: 14,
    borderStyle: "dashed",
  },
  emptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 28,
    lineHeight: 18,
  },
  skeletonContainer: {
    gap: 8,
  },
  skeletonConvInfo: {
    flex: 1,
    gap: 4,
  },
});
