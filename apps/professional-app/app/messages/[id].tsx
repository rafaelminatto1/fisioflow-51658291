import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { useAuthStore } from "@/store/auth";
import { useHaptics } from "@/hooks/useHaptics";
import { getConversationMessages, sendMessage, markAsRead, ApiMessage } from "@/lib/api";
import { format } from "date-fns";

export default function ChatDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { light, success } = useHaptics();

  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [participantName] = useState("Paciente");

  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = useCallback(
    async (showLoading = false) => {
      if (showLoading) setIsLoading(true);
      try {
        const data = await getConversationMessages(id);
        setMessages(data);
        if (data.length > 0) {
          // Find participant name from messages where I am NOT the sender
          const otherMsg = data.find((message: ApiMessage) => message.senderId !== user?.id);
          if (otherMsg) {
            // In a real scenario, we'd fetch the patient's profile
            // For now, we rely on the list view passing the name or a separate fetch
          }
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [id, user?.id],
  );

  useEffect(() => {
    fetchMessages(true);
    markAsRead(id).catch(console.error);

    const interval = setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchMessages, id]);

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;

    const content = inputText.trim();
    setInputText("");
    setIsSending(true);
    light();

    try {
      await sendMessage(id, content);
      await fetchMessages();
      success();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Erro", "Não foi possível enviar a mensagem.");
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ApiMessage }) => {
    const isOwn = item.senderId === user?.id;
    const createdAt = new Date(item.createdAt ?? item.created_at);

    return (
      <View style={[styles.messageWrapper, isOwn ? styles.ownMessage : styles.otherMessage]}>
        <View
          style={[
            styles.messageBubble,
            isOwn
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.messageText, { color: isOwn ? "#FFFFFF" : colors.text }]}>
            {item.content}
          </Text>
          <View style={styles.messageMeta}>
            <Text
              style={[
                styles.messageTime,
                { color: isOwn ? "rgba(255,255,255,0.7)" : colors.textMuted },
              ]}
            >
              {format(createdAt, "HH:mm")}
            </Text>
            {isOwn && (
              <Ionicons
                name={item.readAt ? "checkmark-done" : "checkmark"}
                size={14}
                color={item.readAt ? "#4ade80" : "rgba(255,255,255,0.7)"}
                style={styles.statusIcon}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {participantName.charAt(0)}
            </Text>
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{participantName}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.success }]}>Online</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="call-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Inicie a conversa com o paciente.
              </Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add" size={28} color={colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
            placeholder="Mensagem..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: inputText.trim() ? colors.primary : colors.border },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  headerAction: {
    padding: 8,
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageWrapper: {
    flexDirection: "row",
    marginBottom: 12,
  },
  ownMessage: {
    justifyContent: "flex-end",
  },
  otherMessage: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 10,
  },
  statusIcon: {
    marginLeft: 2,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: {
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  attachButton: {
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    height: 44,
    width: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
